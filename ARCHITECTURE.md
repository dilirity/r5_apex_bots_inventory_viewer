# Web Tracker — Architecture

A real-time web app that displays bot inventory from a running game instance. Connects to the game via RCON, polls for inventory data, and renders it in a browser UI styled after the in-game inventory screen.

## How it works

```
Game (rSquirrel scripts)
    │
    │  print("##BOTINV_START##...json...##BOTINV_END##")
    │
    ▼
RCON Server (built into r5sdk engine, TCP on port 37015)
    │
    │  Console log streaming (protobuf frames)
    │
    ▼
Node.js Backend (server.js)
    │
    │  Parses JSON between markers, pushes via WebSocket
    │
    ▼
Browser Frontend (public/)
    │
    │  Renders inventory UI
    ▼
```

## Game-side setup

The game server needs these console commands to enable RCON:
```
sv_rcon_password "botaidebug"
rcon_encryptframes 0
sv_rcon_sendlogs 1
```

## RCON Protocol

The r5sdk RCON protocol uses TCP with a custom binary framing:

### Wire format
```
[4 bytes] magic   = 0x6E6F4352 (big-endian, written with htonl)
[4 bytes] length  = envelope size (big-endian)
[N bytes] protobuf-encoded netcon.envelope
```

### Protobuf schema (`netcon.proto`)
```protobuf
message envelope {
    bool  encrypted = 1;
    bytes nonce     = 2;
    bytes data      = 3;  // contains serialized request or response
}

message request {
    int32     messageId   = 1;
    int32     messageType = 2;
    request_e requestType = 3;  // AUTH=1, EXECCOMMAND=0, SEND_CONSOLE_LOG=2
    string    requestMsg  = 4;  // command name (first token)
    string    requestVal  = 5;  // full command string
}

message response {
    int32      messageId    = 1;
    int32      messageType  = 2;
    response_e responseType = 3;  // AUTH=0, CONSOLE_LOG=1
    string     responseMsg  = 4;
    string     responseVal  = 5;
}
```

### Auth flow
1. Connect TCP to port 37015
2. Send `request` with `requestType=AUTH`, `requestMsg=<password>`
3. Server responds with `responseType=AUTH`, `responseMsg="Authentication successful.\n"`
4. Send `requestType=SEND_CONSOLE_LOG`, `requestVal="1"` to enable log streaming
5. All `print()` output from game scripts arrives as `CONSOLE_LOG` responses

### Important: command execution
When sending `EXECCOMMAND`, `requestMsg` must be the **first token only** (e.g., `"script"`) and `requestVal` must be the **full command string** (e.g., `"script bot_inventory_json()"`). This matches how the reference netconsole client works.

## Data flow

### Game-side (`_botai_debug.nut` → `bot_inventory_json()`)

Called every second via `script bot_inventory_json()` RCON command. Outputs a single `print()` with JSON wrapped in markers:

```
##BOTINV_START##{"players":[...]}##BOTINV_END##
```

JSON structure (keys are shortened to reduce payload size):
```json
{
  "players": [{
    "name": "TestBot",
    "hp": 100, "hpMax": 100,
    "shields": 50, "shieldsMax": 50,
    "armorTier": 2, "helmetTier": 1,
    "backpackTier": 1, "incapshieldTier": 1,
    "weapons": [{
      "n": "mp_weapon_r97",      // weapon class name
      "cl": 20, "cm": 20,        // clip ammo / clip max
      "rs": 80,                   // reserve ammo
      "at": "bullet",             // ammo type ref
      "a": 1,                     // active weapon (0/1)
      "m": [{                     // equipped mods (attachments)
        "r": "barrel_stabilizer_l2",  // mod ref
        "t": 2                        // mod tier
      }]
    }],
    "i": [{                       // inventory (backpack items)
      "r": "health_pickup_combo_small",  // item ref
      "c": 4,                            // current count (stack size)
      "t": 1,                            // tier
      "m": 6,                            // max stack size (inventorySlotCount)
      "d": 6                             // countPerDrop (units per sub-stack)
    }]
  }]
}
```

Key APIs used in `bot_inventory_json()`:
- `BotAI_GetBots()` — returns array of tracked bot entities
- `GetWeaponClassName()` — weapon ref string
- `GetMods()` — server-side method for equipped weapon mods (NOT `GetWeaponMods()` which is client-only)
- `SURVIVAL_GetPrimaryWeapons(bot)` — equipped weapons
- `SURVIVAL_GetPlayerInventory(bot)` — backpack items as `array<ConsumableInventoryItem>`
- `SURVIVAL_Loot_GetLootDataByIndex(type)` — get `LootData` from inventory item type
- `SURVIVAL_Loot_GetLootDataByRef(ref)` — get `LootData` from ref string
- `SURVIVAL_Loot_IsRefValid(ref)` — check if ref exists in loot table
- `EquipmentSlot_GetEquipmentTier(bot, slotName)` — armor/helmet/backpack/incapshield tier
- `AmmoType_GetRefFromIndex(poolType)` — ammo type ref from pool index

### Server-side (`server.js`)

- HTTP server serves static files from `public/`
- RCON client (`rcon.js`) connects to game, authenticates, enables console log streaming
- Polls `script bot_inventory_json()` every 1 second
- Parses `##BOTINV_START##...##BOTINV_END##` markers from console log stream
- Pushes parsed JSON to browser via WebSocket

### Frontend (`public/`)

- `index.html` — layout structure
- `style.css` — all styling including the unified slot system
- `app.js` — WebSocket connection, data rendering
- `icons/` — SVG icons organized by category

## File structure

```
web-tracker/
├── server.js           # Node.js backend (HTTP + RCON + WebSocket)
├── rcon.js             # RCON client library
├── netcon.proto         # Protobuf schema for RCON protocol
├── package.json
├── download-icons.sh    # Script to fetch SVG icons from Apex wiki
└── public/
    ├── index.html
    ├── style.css
    ├── app.js
    └── icons/
        ├── equipment/   # body_shield.svg, helmet.svg, backpack.svg, knockdown_shield.svg
        ├── weapons/     # mp_weapon_r97.svg, mp_weapon_rspn101.svg, etc.
        ├── consumables/ # health_pickup_*.svg, grenade SVGs
        ├── ammo/        # bullet.svg, highcal.svg, special.svg, shotgun.svg, sniper.svg
        └── attachments/ # barrel_stabilizer.svg, optic_*.svg, stock_*.svg, hopup_*.svg
```

## UI design

The frontend mimics the Apex Legends inventory screen:

### Layout (top to bottom)
1. **HP/Shield bars** — horizontal bars with values
2. **Weapons row** — two 510px weapon cards side by side
3. **Backpack grid** — 8-column grid, 2 rows (16 max slots)
4. **Equipment row** — 4 equipment slots centered

### Unified slot system (`.slot` CSS class)

All inventory cells, equipment slots, and weapon attachment slots share a common base:

- **Cut corners**: `clip-path: polygon(...)` with `--corner-cut: 6px` (configurable via CSS var)
- **Border**: The slot `background` IS the border color (rgba white). `::before` pseudo-element fills the inside with `--bg-slot`, inset by `--border-w`. This creates a proper border that follows the clipped shape.
- **Tier gradient tint**: `::after` pseudo-element overlays a gradient from bottom (tier color, opaque) to middle (transparent). Covers the full slot including the border, so the tint blends with the border.
- **Thick bottom border** (`.has-border`): Equipment and attachment slots get a thicker colored bottom via gradient on the background.

Size variants:
- `.slot-inv` — inventory: 92x92, icon 70x70
- `.slot-equip` — equipment: 94x94, icon 60x60
- `.slot-mod` — weapon attachment: 75x75, icon 50x50

### Locked slots

Slots beyond the backpack capacity are shown as locked. They use inline SVG to draw corner brackets (L-shaped with diagonal cut matching the regular slot corners). A lock icon SVG is centered inside.

### Weapon cards

- Clipped bottom-right corner at ~70 degrees
- Border uses same technique as slots (background = border, `::after` = fill)
- Active weapon gets a yellow triangle in the upper-left corner (`::before`)
- Layout: weapon icon (centered, 80px) → name (uppercase) → bottom row (attachment slots left, ammo icon + count right)

### Stack pips

Horizontal dash indicators at the bottom of inventory slots:
- **Consumables**: 1 pip per max stack unit (e.g., 6 pips for shield cells max 6)
- **Ammo**: pips based on sub-stacks (`max / countPerDrop`), count number shown bottom-right
- Filled pips colored by tier, unfilled pips are dim

### Icon system

SVG icons from the Apex wiki, normalized to white fills. Stored in `public/icons/` organized by category. Icon path resolution in `app.js`:
- Weapons: `icons/weapons/{ref}.svg`
- Ammo: `icons/ammo/{ammoType}.svg`
- Consumables: `icons/consumables/{ref}.svg`
- Attachments: `icons/attachments/{base_ref}.svg` (strips `_l1`/`_l2`/`_l3`/`_l4` tier suffix)

Tiered items (attachments in backpack/weapon slots, equipment) get a `tier-icon-N` CSS class. Currently these are empty (SVGs are already white). If SVGs were dark, you'd add `filter: invert(100%) hue-rotate(180deg)` as the base, then sepia/saturate/hue-rotate for tier coloring.

## Item dropping

The web UI supports dropping items from a bot's inventory back into the game world.

### Flow
1. **Right-click** an inventory slot in the browser
2. Frontend sends WebSocket message: `{type: "exec", command: "script bot_drop_item(0, \"health_pickup_combo_small\", 1)"}`
3. Server forwards as RCON `EXECCOMMAND`
4. Game-side `bot_drop_item(botIdx, ref, count)` calls `SURVIVAL_DropBackpackItem(bot, ref, count)`
5. Item is removed from bot's inventory and spawned as a loot entity on the ground

### What can be dropped
- **Backpack items**: right-click an inventory slot. Drops 1 unit for consumables/attachments, or one sub-stack for ammo (`countPerDrop` units).
- **Weapons**: right-click the weapon icon in a weapon card. Drops the weapon with all its attachments.
- **Weapon attachments**: right-click an attachment slot on a weapon card. Removes just that attachment and drops it.
- **Equipment**: right-click an equipment slot (armor, helmet, backpack, KD shield). Drops the equipment piece.

### Game-side functions (`_botai_debug.nut`)

```squirrel
// Drop backpack item
void function bot_drop_item( int botIdx, string ref, int count = 1 )
// Uses: SURVIVAL_DropBackpackItem (global, survival_loot.gnut)

// Drop weapon (weaponIdx: 0 or 1)
void function bot_drop_weapon( int botIdx, int weaponIdx )
// Uses: SURVIVAL_DropMainWeapon (global, survival_loot.gnut)
// Equipment slot refs: "main_weapon0", "main_weapon1"

// Drop equipment (slotName: "armor", "helmet", "backpack", "incapshield")
void function bot_drop_equip( int botIdx, string slotName )
// Uses: SpawnGenericLoot + Inventory_SetPlayerEquipment (globals)

// Drop weapon attachment (weaponIdx: 0 or 1)
void function bot_drop_mod( int botIdx, int weaponIdx, string modRef )
// Uses: EquipAttachments_Internal (global, survival_loot.gnut)
// Called with modToAdd="", modToRemove=modRef to remove and drop to ground
```

### Equipment slot refs (from `sh_survival_equipment_slot.gnut`)
- Equipment: `"armor"`, `"helmet"`, `"backpack"`, `"incapshield"`
- Weapons: `"main_weapon0"`, `"main_weapon1"`
- Weapon sub-slots: `"main_weapon0_sight"`, `"main_weapon0_mag"`, `"main_weapon0_grip"`, `"main_weapon0_barrel"`, `"main_weapon0_hopup"` (same pattern for weapon1)

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_PORT` | 3000 | Web server port |
| `RCON_HOST` | 127.0.0.1 | Game server address |
| `RCON_PORT` | 37015 | RCON port (same as game server port) |
| `RCON_PASS` | botaidebug | RCON password |
| `POLL_INTERVAL` | 1000 | Inventory poll interval in ms |

## Running

```bash
cd web-tracker
npm install
npm start
# Open http://localhost:3000
```

## Known issues / limitations

- `BotAI_Spawn()` resets the bot tracking array, so only the last spawned bot shows. Use `BotAI_SpawnSquad()` for multiple bots, or fix `BotAI_Spawn()` to not reset.
- JSON payload can get truncated if too long for RCON frame buffer. Run `rcon_maxframesize 4096` in game console if data is cut off.
- Some weapon class names in the game may not match the downloaded SVG filenames (e.g., `mp_weapon_alternator_smg` vs `mp_weapon_pdw`). Add aliases to `WEAPON_NAMES` map in `app.js` as needed.
- RCON server resets on map reload — need to re-run `sv_rcon_password` etc.
