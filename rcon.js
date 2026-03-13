import net from "net";
import { EventEmitter } from "events";
import protobuf from "protobufjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Frame header: 4 bytes magic + 4 bytes length (big-endian / network byte order)
// Magic = 'R' + ('C'<<8) + ('o'<<16) + ('n'<<24) = 0x6E6F4352
// Written with htonl() in C++, so writeUInt32BE(0x6E6F4352) gives wire bytes: 6E 6F 43 52
const FRAME_MAGIC = 0x6E6F4352;

let proto = null;

async function loadProto() {
  if (proto) return proto;
  const root = await protobuf.load(path.join(__dirname, "netcon.proto"));
  proto = {
    Envelope: root.lookupType("netcon.envelope"),
    Request: root.lookupType("netcon.request"),
    Response: root.lookupType("netcon.response"),
    RequestType: root.lookupEnum("netcon.request_e"),
    ResponseType: root.lookupEnum("netcon.response_e"),
  };
  return proto;
}

function packFrame(envelopeBytes) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(FRAME_MAGIC, 0);
  header.writeUInt32BE(envelopeBytes.length, 4);
  return Buffer.concat([header, envelopeBytes]);
}

export class RconClient extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.proto = null;
    this.authenticated = false;
    this.recvBuf = Buffer.alloc(0);
  }

  async connect(host = "127.0.0.1", port = 37015) {
    this.proto = await loadProto();

    return new Promise((resolve, reject) => {
      this.socket = net.createConnection({ host, port }, () => {
        this.emit("connected");
        resolve();
      });

      this.socket.on("data", (data) => this._onData(data));
      this.socket.on("error", (err) => {
        this.emit("error", err);
        reject(err);
      });
      this.socket.on("close", () => {
        this.authenticated = false;
        this.emit("close");
      });
    });
  }

  _onData(data) {
    this.recvBuf = Buffer.concat([this.recvBuf, data]);
    this._processBuffer();
  }

  _processBuffer() {
    while (this.recvBuf.length >= 8) {
      const magic = this.recvBuf.readUInt32BE(0);
      if (magic !== FRAME_MAGIC) {
        // Desync - try to find next magic
        const idx = this.recvBuf.indexOf(
          Buffer.from([0x52, 0x43, 0x6f, 0x6e]),
          1
        );
        if (idx === -1) {
          this.recvBuf = Buffer.alloc(0);
          return;
        }
        this.recvBuf = this.recvBuf.subarray(idx);
        continue;
      }

      const envelopeLen = this.recvBuf.readUInt32BE(4);
      const totalLen = 8 + envelopeLen;

      if (this.recvBuf.length < totalLen) {
        return; // Need more data
      }

      const envelopeBytes = this.recvBuf.subarray(8, totalLen);
      this.recvBuf = this.recvBuf.subarray(totalLen);

      try {
        const envelope = this.proto.Envelope.decode(envelopeBytes);

        if (envelope.encrypted) {
          this.emit("error", new Error("Encrypted frames not supported - set rcon_encryptframes 0"));
          continue;
        }

        const response = this.proto.Response.decode(envelope.data);
        this._handleResponse(response);
      } catch (err) {
        this.emit("error", err);
      }
    }
  }

  _handleResponse(response) {
    const type = response.responseType;

    if (type === this.proto.ResponseType.values.SERVERDATA_RESPONSE_AUTH) {
      const msg = response.responseMsg || "";
      if (msg.includes("successful")) {
        this.authenticated = true;
        this.emit("authenticated");

        // Request console log streaming
        this._sendRequest(
          this.proto.RequestType.values.SERVERDATA_REQUEST_SEND_CONSOLE_LOG,
          "",
          "1"
        );
      } else {
        this.emit("authfailed", msg.trim());
      }
    } else if (
      type === this.proto.ResponseType.values.SERVERDATA_RESPONSE_CONSOLE_LOG
    ) {
      this.emit("consolelog", response.responseMsg || "", response);
    }
  }

  _sendRequest(requestType, msg, val = "") {
    const reqObj = {
      messageId: -1,
      requestType,
      requestMsg: msg,
      requestVal: val,
    };

    const reqBytes = this.proto.Request.encode(reqObj).finish();

    const envelope = {
      encrypted: false,
      nonce: Buffer.alloc(0),
      data: reqBytes,
    };

    const envBytes = this.proto.Envelope.encode(envelope).finish();
    const frame = packFrame(envBytes);
    this.socket.write(frame);
  }

  authenticate(password) {
    this._sendRequest(
      this.proto.RequestType.values.SERVERDATA_REQUEST_AUTH,
      password
    );
  }

  exec(command) {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }
    // requestMsg = first token (command name), requestVal = full command string
    // Matches how the reference netconsole client sends commands
    const firstToken = command.split(/\s+/)[0];
    this._sendRequest(
      this.proto.RequestType.values.SERVERDATA_REQUEST_EXECCOMMAND,
      firstToken,
      command
    );
  }

  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.authenticated = false;
  }
}
