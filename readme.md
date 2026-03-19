# Bot Inventory tracker

## Preview (latest)

<img width="1379" height="1105" alt="image" src="https://github.com/user-attachments/assets/f5f1175d-1c00-42d2-8b73-a9bdea96a190" />

## Preview (older version)

<img title="UI preview" alt="UI preview" src="preview.jpg">

## Setup

in game console after loading map:

```
sv_rcon_password "botaidebug"; rcon_encryptframes 0; sv_rcon_sendlogs 1; rcon_maxframesize 4096
```

run tracker:

```sh
npm i
npm start
```

load tracker in browser via http://localhost:3000/
