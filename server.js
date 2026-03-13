import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { RconClient } from "./rcon.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "3000", 10);
const RCON_HOST = process.env.RCON_HOST || "127.0.0.1";
const RCON_PORT = parseInt(process.env.RCON_PORT || "37015", 10);
const RCON_PASS = process.env.RCON_PASS || "botaidebug";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "1000", 10);

// State
let rcon = null;
let rconConnected = false;
let pollTimer = null;
let browserClients = new Set();
let latestData = null;

// Collect multi-line console output from the inventory dump command.
// Lines matching our JSON marker are buffered and parsed.
let collectingJson = false;
let jsonLines = [];

// --- HTTP server (serves static frontend) ---
const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

const httpServer = http.createServer((req, res) => {
  let filePath = req.url === "/" ? "/index.html" : req.url;
  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || "application/octet-stream";
  const fullPath = path.join(__dirname, "public", filePath);

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

// --- WebSocket server (pushes data to browser) ---
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  browserClients.add(ws);
  // Send latest snapshot immediately
  if (latestData) {
    ws.send(JSON.stringify({ type: "inventory", data: latestData }));
  }
  ws.send(
    JSON.stringify({
      type: "status",
      rcon: rconConnected,
    })
  );

  ws.on("message", (msg) => {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === "exec" && rcon && rcon.authenticated) {
        rcon.exec(parsed.command);
      }
    } catch {}
  });

  ws.on("close", () => browserClients.delete(ws));
});

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const ws of browserClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// --- RCON connection ---
function parseInventoryLine(line) {
  // Detect our structured JSON output markers
  // Format: ##BOTINV_START## ... ##BOTINV_END##
  if (line.includes("##BOTINV_START##")) {
    collectingJson = true;
    jsonLines = [];
    // Check if start and end are on the same line
    const startIdx = line.indexOf("##BOTINV_START##");
    const endIdx = line.indexOf("##BOTINV_END##");
    if (endIdx > startIdx) {
      const jsonStr = line.substring(startIdx + 16, endIdx);
      tryParseInventory(jsonStr);
      collectingJson = false;
    }
    return;
  }
  if (collectingJson) {
    if (line.includes("##BOTINV_END##")) {
      const endIdx = line.indexOf("##BOTINV_END##");
      if (endIdx > 0) jsonLines.push(line.substring(0, endIdx));
      tryParseInventory(jsonLines.join(""));
      collectingJson = false;
      jsonLines = [];
    } else {
      jsonLines.push(line);
    }
  }
}

function tryParseInventory(str) {
  try {
    const data = JSON.parse(str.trim());
    latestData = data;
    broadcast({ type: "inventory", data });
  } catch (e) {
    console.error("[parse] Failed to parse inventory JSON:", e.message);
    console.error("[parse] Raw:", str.substring(0, 200));
  }
}

async function connectRcon() {
  rcon = new RconClient();

  rcon.on("connected", () => {
    console.log(`[rcon] Connected to ${RCON_HOST}:${RCON_PORT}`);
    rcon.authenticate(RCON_PASS);
  });

  rcon.on("authenticated", () => {
    console.log("[rcon] Authenticated");
    rconConnected = true;
    broadcast({ type: "status", rcon: true });
    startPolling();
  });

  rcon.on("authfailed", (msg) => {
    console.error("[rcon] Auth failed:", msg);
  });

  rcon.on("consolelog", (msg) => {
    // Log raw messages that contain our markers for debugging
    if (msg.includes("BOTINV") || collectingJson) {
      console.log("[rcon:raw]", JSON.stringify(msg).substring(0, 200));
    }
    // Process each line for inventory markers
    const lines = msg.split("\n");
    for (const line of lines) {
      parseInventoryLine(line);
    }
  });

  rcon.on("error", (err) => {
    console.error("[rcon] Error:", err.message);
  });

  rcon.on("close", () => {
    console.log("[rcon] Disconnected");
    rconConnected = false;
    broadcast({ type: "status", rcon: false });
    stopPolling();
    // Reconnect after delay
    setTimeout(connectRcon, 5000);
  });

  try {
    await rcon.connect(RCON_HOST, RCON_PORT);
  } catch (err) {
    console.error("[rcon] Connection failed:", err.message);
    console.log("[rcon] Make sure these are set in the game console:");
    console.log("[rcon]   sv_rcon_password \"botaidebug\"");
    console.log("[rcon]   rcon_encryptframes 0");
    console.log("[rcon]   sv_rcon_sendlogs 1");
    console.log("[rcon] Retrying in 5s...");
    setTimeout(connectRcon, 5000);
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (rcon && rcon.authenticated) {
      rcon.exec("script bot_inventory_json()");
    }
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// --- Start ---
httpServer.listen(HTTP_PORT, () => {
  console.log(`[http] Listening on http://localhost:${HTTP_PORT}`);
  console.log(`[rcon] Connecting to ${RCON_HOST}:${RCON_PORT}...`);
  connectRcon();
});
