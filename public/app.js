const ws = new WebSocket(`ws://${location.host}`);

let inventoryData = null;
let selectedPlayer = null;

const statusEl = document.getElementById("status");
const playersEl = document.getElementById("players");
const noSelectionEl = document.getElementById("no-selection");
const detailEl = document.getElementById("player-detail");

// --- Friendly names ---
const WEAPON_NAMES = {
  mp_weapon_r97: "R-99",
  mp_weapon_pdw: "Alternator",
  mp_weapon_car: "C.A.R.",
  mp_weapon_esaw: "Devotion",
  mp_weapon_lstar: "L-STAR",
  mp_weapon_volt_smg: "Volt",
  mp_weapon_energy_ar: "Havoc",
  mp_weapon_hemlok: "Hemlok",
  mp_weapon_vinson: "Flatline",
  mp_weapon_rspn101: "R-301",
  mp_weapon_g2: "G7 Scout",
  mp_weapon_doubletake: "Triple Take",
  mp_weapon_dmr: "Longbow",
  mp_weapon_sniper: "Kraber",
  mp_weapon_sentinel: "Sentinel",
  mp_weapon_mastiff: "Mastiff",
  mp_weapon_energy_shotgun: "Peacekeeper",
  mp_weapon_shotgun: "EVA-8",
  mp_weapon_shotgun_pistol: "Mozambique",
  mp_weapon_wingman: "Wingman",
  mp_weapon_semipistol: "P2020",
  mp_weapon_autopistol: "RE-45",
  mp_weapon_3030: "30-30 Repeater",
  mp_weapon_bow: "Bocek",
  mp_weapon_nemesis: "Nemesis",
};

const MOD_NAMES = {
  barrel_stabilizer_l1: "Barrel L1",
  barrel_stabilizer_l2: "Barrel L2",
  barrel_stabilizer_l3: "Barrel L3",
  barrel_stabilizer_l4: "Barrel L4",
  bullets_mag_l1: "Light Mag L1",
  bullets_mag_l2: "Light Mag L2",
  bullets_mag_l3: "Light Mag L3",
  bullets_mag_l4: "Light Mag L4",
  highcal_mag_l1: "Heavy Mag L1",
  highcal_mag_l2: "Heavy Mag L2",
  highcal_mag_l3: "Heavy Mag L3",
  highcal_mag_l4: "Heavy Mag L4",
  energy_mag_l1: "Energy Mag L1",
  energy_mag_l2: "Energy Mag L2",
  energy_mag_l3: "Energy Mag L3",
  energy_mag_l4: "Energy Mag L4",
  sniper_mag_l1: "Sniper Mag L1",
  sniper_mag_l2: "Sniper Mag L2",
  sniper_mag_l3: "Sniper Mag L3",
  sniper_mag_l4: "Sniper Mag L4",
  shotgun_bolt_l1: "Bolt L1",
  shotgun_bolt_l2: "Bolt L2",
  shotgun_bolt_l3: "Bolt L3",
  shotgun_bolt_l4: "Bolt L4",
  optic_cq_hcog_classic: "1x HCOG",
  optic_cq_holosight: "1x Holo",
  optic_cq_hcog_bruiser: "2x HCOG",
  optic_cq_holosight_variable: "1-2x Holo",
  optic_ranged_hcog: "3x HCOG",
  optic_ranged_aog_variable: "2-4x AOG",
  optic_sniper: "6x Sniper",
  optic_sniper_variable: "4-8x Sniper",
  optic_sniper_threat: "4-10x Digi",
  optic_cq_threat: "1x Digi",
  stock_tactical_l1: "Stock L1",
  stock_tactical_l2: "Stock L2",
  stock_tactical_l3: "Stock L3",
  stock_sniper_l1: "Sniper Stock L1",
  stock_sniper_l2: "Sniper Stock L2",
  stock_sniper_l3: "Sniper Stock L3",
  hopup_turbocharger: "Turbocharger",
  hopup_selectfire: "Selectfire",
  hopup_skullpiercer: "Skullpiercer",
  hopup_hammerpoint: "Hammerpoints",
  hopup_anvil_receiver: "Anvil Receiver",
  hopup_quickdraw_holster: "Quickdraw",
  hopup_double_tap: "Double Tap",
  hopup_tempo: "Tempo",
  hopup_boosted_loader: "Boosted Loader",
  hopup_deadeyes_tempo: "Deadeye Tempo",
  hopup_shatter_caps: "Shatter Caps",
  hopup_kinetic_feeder: "Kinetic Feeder",
};

const ITEM_NAMES = {
  health_pickup_combo_small: "Shield Cell",
  health_pickup_combo_large: "Shield Batt",
  health_pickup_health_small: "Syringe",
  health_pickup_health_large: "Med Kit",
  health_pickup_combo_full: "Phoenix Kit",
  health_pickup_ultimate: "Ult Accel",
  mp_weapon_frag_grenade: "Frag Grenade",
  mp_weapon_grenade_emp: "Arc Star",
  mp_weapon_thermite_grenade: "Thermite",
  bullet: "Light Ammo",
  highcal: "Heavy Ammo",
  special: "Energy Ammo",
  shotgun: "Shotgun Ammo",
  sniper: "Sniper Ammo",
  arrows: "Arrows",
};

// Backpack capacity by tier
const BACKPACK_SLOTS = { 0: 10, 1: 12, 2: 14, 3: 16, 4: 16 };
const MAX_BACKPACK_SLOTS = 16; // Always show 16 cells, lock extras

function friendlyName(ref, map) {
  if (!ref) return "???";
  return map[ref] || ref.replace(/^mp_weapon_/, "").replace(/_/g, " ");
}

// --- Icon paths ---
// Resolve a game ref to an SVG icon path. Returns null if no icon available.
function iconPath(ref) {
  if (!ref) return null;

  // Weapons: icons/weapons/{ref}.svg
  if (ref.startsWith("mp_weapon_")) return `icons/weapons/${ref}.svg`;

  // Ammo types
  if (["bullet", "highcal", "special", "shotgun", "sniper", "arrows"].includes(ref))
    return `icons/ammo/${ref}.svg`;

  // Consumables / healing
  if (ref.startsWith("health_pickup_")) return `icons/consumables/${ref}.svg`;

  // Grenades
  if (ref === "mp_weapon_frag_grenade" || ref === "mp_weapon_grenade_emp" || ref === "mp_weapon_thermite_grenade")
    return `icons/consumables/${ref}.svg`;

  // Attachments: strip the _l1/_l2/_l3/_l4 suffix for icon lookup
  const attachBase = ref.replace(/_l\d$/, "");
  return `icons/attachments/${attachBase}.svg`;
}

// Returns an <img> tag string, or empty string if no icon
function iconImg(ref, cls = "item-icon") {
  const p = iconPath(ref);
  if (!p) return "";
  return `<img src="${p}" class="${cls}" onerror="this.style.display='none'">`;
}

// For attachments, strip tier suffix for icon file
function attachmentIconPath(ref) {
  if (!ref) return null;
  const base = ref.replace(/_l\d$/, "");
  return `icons/attachments/${base}.svg`;
}

function attachmentIconImg(ref, cls = "item-icon") {
  const p = attachmentIconPath(ref);
  if (!p) return "";
  return `<img src="${p}" class="${cls}" onerror="this.style.display='none'">`;
}

let debugData = null;

// --- WebSocket ---
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "status") {
    updateStatus(msg.rcon);
  } else if (msg.type === "inventory") {
    inventoryData = msg.data;
    renderPlayerList();
    if (selectedPlayer !== null) renderDetail();
  } else if (msg.type === "debug") {
    debugData = msg.data;
    if (selectedPlayer !== null) renderDebug();
  }
};

ws.onclose = () => updateStatus(false);

function updateStatus(connected) {
  statusEl.textContent = connected ? "RCON Connected" : "RCON Disconnected";
  statusEl.className = "status " + (connected ? "connected" : "disconnected");
}

// --- Player list ---
function renderPlayerList() {
  if (!inventoryData?.players?.length) {
    playersEl.innerHTML = '<li style="color:var(--text-muted);padding:14px">No data</li>';
    return;
  }
  playersEl.innerHTML = "";
  inventoryData.players.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = selectedPlayer === i ? "selected" : "";
    const legendRef = (p.legend || "").replace(/^character_/, "").replace(/\s+/g, "_").toLowerCase();
    const avatarSrc = legendRef ? `icons/legends/${legendRef}.png` : "";
    const avatarImg = avatarSrc
      ? `<img class="player-avatar" src="${avatarSrc}" onerror="this.style.display='none'">`
      : `<div class="player-avatar"></div>`;
    li.innerHTML = `${avatarImg}<div class="player-info">
      <div class="player-name-row">
        <span class="player-name-text">${esc(p.name)}</span>
        <span class="player-team">T${p.team || "?"}</span>
      </div>
      <div class="player-hp">HP ${p.hp}/${p.hpMax} | SH ${p.shields}/${p.shieldsMax}</div>
    </div>`;
    li.onclick = () => { selectedPlayer = i; renderPlayerList(); renderDetail(); };
    playersEl.appendChild(li);
  });
}

function getSelectedBotIdx() {
  if (selectedPlayer === null || !inventoryData?.players) return -1;
  return inventoryData.players[selectedPlayer]?.botIdx ?? -1;
}

// --- Detail rendering ---
function renderDetail() {
  if (!inventoryData?.players || selectedPlayer === null || selectedPlayer >= inventoryData.players.length) {
    noSelectionEl.classList.remove("hidden");
    detailEl.classList.add("hidden");
    return;
  }
  noSelectionEl.classList.add("hidden");
  detailEl.classList.remove("hidden");

  const p = inventoryData.players[selectedPlayer];
  const legendDisplay = (p.legend || "").replace(/^character_/, "");
  const legendInfo = legendDisplay ? `${legendDisplay} — Team ${p.team || "?"}` : `Team ${p.team || "?"}`;
  document.getElementById("player-name").textContent = `${p.name}`;
  document.getElementById("player-legend").textContent = legendInfo;

  // HP bar
  const hpPct = p.hpMax > 0 ? (p.hp / p.hpMax) * 100 : 0;
  document.getElementById("hp-bar").style.width = hpPct + "%";
  document.getElementById("hp-text").textContent = `${p.hp} / ${p.hpMax}`;

  // Shield pips — each pip = 25 shield points, partially filled supported
  const shieldPips = document.getElementById("shield-pips");
  const shieldsMax = p.shieldsMax || 0;
  const shieldsCur = p.shields || 0;
  const totalPips = Math.ceil(shieldsMax / 25);
  const tier = p.armorTier || 0;
  let remaining = shieldsCur;
  let pipsHtml = "";
  for (let i = 0; i < totalPips; i++) {
    const pipMax = Math.min(25, shieldsMax - i * 25);
    const pipFill = Math.min(pipMax, Math.max(0, remaining));
    remaining -= pipFill;
    const pct = pipMax > 0 ? (pipFill / pipMax) * 100 : 0;
    if (pct >= 100) {
      pipsHtml += `<div class="shield-pip t${tier}"></div>`;
    } else if (pct > 0) {
      pipsHtml += `<div class="shield-pip empty"><div class="shield-pip-fill t${tier}" style="width:${pct}%"></div></div>`;
    } else {
      pipsHtml += `<div class="shield-pip empty"></div>`;
    }
  }
  shieldPips.innerHTML = pipsHtml;
  document.getElementById("shield-text").textContent = `${shieldsCur} / ${shieldsMax}`;

  // Abilities
  const tac = p.tac || [0, 0];
  const ult = p.ult || [0, 0];
  const tacPct = tac[1] > 0 ? (tac[0] / tac[1]) * 100 : 0;
  const ultPct = ult[1] > 0 ? (ult[0] / ult[1]) * 100 : 0;
  document.getElementById("tac-bar").style.width = tacPct + "%";
  document.getElementById("tac-text").textContent = `${tac[0]} / ${tac[1]}`;
  document.getElementById("ult-bar").style.width = ultPct + "%";
  document.getElementById("ult-text").textContent = `${ult[0]} / ${ult[1]}`;

  // Equipment slots
  renderEquipSlot("slot-armor", p.armorTier, "icons/equipment/body_shield.svg", "armor");
  renderEquipSlot("slot-helmet", p.helmetTier, "icons/equipment/helmet.svg", "helmet");
  renderEquipSlot("slot-backpack", p.backpackTier, "icons/equipment/backpack.svg", "backpack");
  renderEquipSlot("slot-knockdown", p.incapshieldTier, "icons/equipment/knockdown_shield.svg", "incapshield");

  // Weapons
  renderWeapon("weapon-0", p.weapons?.[0], 1);
  renderWeapon("weapon-1", p.weapons?.[1], 2);

  // Backpack grid
  renderBackpack(p);

  // Debug panel
  renderDebug();
}

function renderEquipSlot(id, tier, icon, slotName) {
  const el = document.getElementById(id);
  el.className = `slot slot-equip has-border t${tier || 0}`;
  const val = el.querySelector(".slot-value");
  if (icon) {
    val.innerHTML = `<img src="${icon}" class="slot-icon tier-icon-${tier || 0}">`;
  } else {
    val.textContent = tier > 0 ? `T${tier}` : "-";
  }

  // Right-click to drop equipment
  el.oncontextmenu = (e) => {
    e.preventDefault();
    const bi = getSelectedBotIdx();
    if (bi < 0 || tier === 0) return;
    ws.send(JSON.stringify({
      type: "exec",
      command: `script bot_drop_equip(${bi}, "${slotName}")`
    }));
  };
}

function renderWeapon(id, w, slotNum) {
  const card = document.getElementById(id);
  const iconArea = card.querySelector(".weapon-icon-area");
  const nameEl = card.querySelector(".weapon-name");
  const ammoEl = card.querySelector(".weapon-ammo");
  const modsEl = card.querySelector(".weapon-mods");

  if (!w || !w.n) {
    card.className = "weapon-card empty";
    iconArea.innerHTML = "";
    nameEl.textContent = "Empty";
    ammoEl.innerHTML = "";
    modsEl.innerHTML = "";
    return;
  }

  card.className = "weapon-card" + (w.a ? " active" : "");

  const weaponIdx = slotNum - 1; // 0 or 1

  // Big weapon icon centered
  const iPath = iconPath(w.n);
  iconArea.innerHTML = iPath
    ? `<img src="${iPath}" class="weapon-icon" onerror="this.style.display='none'">`
    : "";

  // Right-click weapon icon to drop weapon
  iconArea.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const bi = getSelectedBotIdx();
    if (bi < 0) return;
    ws.send(JSON.stringify({
      type: "exec",
      command: `script bot_drop_weapon(${bi}, ${weaponIdx})`
    }));
  });

  // Weapon name
  nameEl.textContent = friendlyName(w.n, WEAPON_NAMES);

  // Bottom row: mods left, ammo type dot + count right
  modsEl.innerHTML = "";
  if (w.m && w.m.length > 0) {
    w.m.forEach((mod) => {
      const s = document.createElement("span");
      s.className = `slot slot-mod has-border t${mod.t || 0}`;
      s.title = friendlyName(mod.r, MOD_NAMES);
      const aPath = attachmentIconPath(mod.r);
      if (aPath) {
        s.innerHTML = `<img src="${aPath}" class="slot-icon tier-icon-${mod.t || 0}" onerror="this.style.display='none'">`;
      }
      // Right-click attachment to drop it
      s.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const bi = getSelectedBotIdx();
        if (bi < 0) return;
        ws.send(JSON.stringify({
          type: "exec",
          command: `script bot_drop_mod(${bi}, ${weaponIdx}, "${mod.r}")`
        }));
      });
      modsEl.appendChild(s);
    });
  }

  const ammoIcon = iconPath(w.at);
  const ammoImg = ammoIcon ? `<img src="${ammoIcon}" class="ammo-icon" onerror="this.style.display='none'">` : "";
  ammoEl.innerHTML = `<span class="clip">${w.cl}/${w.cm}</span>${ammoImg}`;
}

function buildInvCell(item) {
  const cell = document.createElement("div");
  const isAmmo = ["bullet", "highcal", "special", "shotgun", "sniper", "arrows"].includes(item.r);
  const isTiered = item.r && !item.r.startsWith("health_pickup_") && !isAmmo && !item.r.startsWith("mp_weapon_");
  cell.className = `slot slot-inv has-border t${item.t || 0}`;
  const tierCls = isTiered ? `tier-icon-${item.t}` : "";
  const icon = iconPath(item.r);
  const maxStack = item.m || item.c;
  const count = item.c;

  let html = "";
  if (icon) {
    html += `<img src="${icon}" class="slot-icon ${tierCls}" onerror="this.style.display='none'">`;
  }

  if (isAmmo) {
    html += `<span class="stack-count">${count}</span>`;
  } else if (count > 1) {
    html += `<span class="stack-count">${count}</span>`;
  }

  if (isAmmo) {
    const perDrop = item.d || 1;
    const totalPips = Math.max(1, Math.round(maxStack / perDrop));
    const filledPips = Math.ceil(count / perDrop);
    html += '<div class="stack-pips">';
    for (let p = 0; p < totalPips; p++) {
      html += `<span class="pip${p < filledPips ? " filled" : ""}"></span>`;
    }
    html += '</div>';
  } else {
    const totalPips = Math.max(1, maxStack);
    html += '<div class="stack-pips">';
    for (let p = 0; p < totalPips; p++) {
      html += `<span class="pip${p < count ? " filled" : ""}"></span>`;
    }
    html += '</div>';
  }

  cell.innerHTML = html;

  // Right-click to drop one sub-stack
  cell.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const bi = getSelectedBotIdx();
    if (bi < 0) return;
    const perDrop = item.d || item.c;
    const dropCount = isAmmo ? perDrop : 1;
    ws.send(JSON.stringify({
      type: "exec",
      command: `script bot_drop_item(${bi}, "${item.r}", ${dropCount})`
    }));
  });

  return cell;
}

function renderBackpack(p) {
  const grid = document.getElementById("backpack-grid");
  const capacity = BACKPACK_SLOTS[p.backpackTier] || 10;
  const items = p.i || [];
  grid.innerHTML = "";

  const COLS = 8;
  const ROWS = 2;
  const lockedCols = (MAX_BACKPACK_SLOTS - capacity) / ROWS;
  const activeCols = COLS - lockedCols;

  let itemIdx = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (col >= activeCols) {
        const cell = document.createElement("div");
        cell.className = "slot slot-inv locked";
        const s = 92, c = 6, a = 14; // slot size, corner cut, arm length
        cell.innerHTML = `<svg class="corner-brackets" viewBox="0 0 ${s} ${s}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2">
          <polyline points="${c},0 ${a},0"/>
          <polyline points="${c},0 0,${c}"/>
          <polyline points="0,${c} 0,${a}"/>
          <polyline points="${s-a},0 ${s-c},0"/>
          <polyline points="${s-c},0 ${s},${c}"/>
          <polyline points="${s},${c} ${s},${a}"/>
          <polyline points="0,${s-a} 0,${s-c}"/>
          <polyline points="0,${s-c} ${c},${s}"/>
          <polyline points="${c},${s} ${a},${s}"/>
          <polyline points="${s},${s-a} ${s},${s-c}"/>
          <polyline points="${s},${s-c} ${s-c},${s}"/>
          <polyline points="${s-c},${s} ${s-a},${s}"/>
        </svg>
        <svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
        grid.appendChild(cell);
      } else if (itemIdx < items.length) {
        // Item slot
        grid.appendChild(buildInvCell(items[itemIdx]));
        itemIdx++;
      } else {
        // Empty available slot
        const cell = document.createElement("div");
        cell.className = "slot slot-inv";
        grid.appendChild(cell);
      }
    }
  }
}

const LOOT_PHASE_NAMES = {
  NONE: "Idle", APPROACH: "Approaching", INTERACT: "Opening Bin",
  PICKUP: "Picking Up", DISCARD: "Discarding", DONE: "Done"
};

function renderDebug() {
  const panel = document.getElementById("debug-panel");
  if (!debugData || !debugData.bots || selectedPlayer === null) {
    panel.innerHTML = "";
    return;
  }

  // Match by player name
  const playerName = inventoryData?.players?.[selectedPlayer]?.name;
  const bot = debugData.bots.find(b => b.name === playerName);
  if (!bot) {
    panel.innerHTML = '<div class="debug-card"><h4>No debug data</h4></div>';
    return;
  }

  const stateClass = `state-${(bot.task || "idle").toLowerCase()}`;

  let html = "";

  // Brain & Task card
  html += `<div class="debug-card">
    <h4>Brain</h4>
    <div class="debug-row"><span class="label">Task</span><span class="value ${stateClass}">${bot.task || "?"}</span></div>
    <div class="debug-row"><span class="label">Intent</span><span class="value">${bot.intent || "HOLD"}</span></div>
    <div class="debug-row"><span class="label">Movement</span><span class="value">${bot.move || "?"}</span></div>
    <div class="debug-row"><span class="label">Next Traverse</span><span class="value">${bot.nextTrav || "NONE"}</span></div>
  </div>`;

  // Scores card
  const lootScore = bot.lootScore || 0;
  const healScore = bot.healScore || 0;
  const combatScore = bot.combatScore || 0;
  let combatTargetName = "";
  if (typeof bot.combatTarget === "number" && bot.playerList) {
    const tgt = bot.playerList.find(p => p.ei === bot.combatTarget);
    if (tgt) combatTargetName = tgt.n;
  }
  html += `<div class="debug-card">
    <h4>Evaluation</h4>
    <div class="debug-row"><span class="label">Combat Urgency</span><span class="value">${combatScore}</span></div>
    <div class="score-bar"><div class="score-bar-bg"><div class="score-bar-fill combat" style="width:${combatScore * 100}%"></div></div></div>
    ${combatTargetName ? `<div class="debug-row"><span class="label">Combat Target</span><span class="value">${esc(combatTargetName)}</span></div>` : ""}
    <div class="debug-row"><span class="label">Loot Urgency</span><span class="value">${lootScore}</span></div>
    <div class="score-bar"><div class="score-bar-bg"><div class="score-bar-fill loot" style="width:${lootScore * 100}%"></div></div></div>
    <div class="debug-row"><span class="label">Heal Urgency</span><span class="value">${healScore}</span></div>
    <div class="score-bar"><div class="score-bar-bg"><div class="score-bar-fill heal" style="width:${healScore * 100}%"></div></div></div>
    ${bot.healItem ? `<div class="debug-row"><span class="label">Heal Item</span><span class="value">${friendlyName(bot.healItem, ITEM_NAMES)}</span></div>` : ""}
  </div>`;

  // Loot State card
  html += `<div class="debug-card">
    <h4>Loot</h4>
    <div class="debug-row"><span class="label">Phase</span><span class="value">${LOOT_PHASE_NAMES[bot.lootPhase] || bot.lootPhase || "Idle"}</span></div>
    ${bot.lootEntIdx >= 0 ? `<div class="debug-row"><span class="label">Target</span><span class="value">#${bot.lootEntIdx}</span></div>` : ""}
    <div class="debug-row"><span class="label">Memory</span><span class="value">${bot.lootMemory || 0} items</span></div>
    <div class="debug-row"><span class="label">Visited</span><span class="value">${bot.lootVisited || 0}</span></div>`;

  if (bot.lootItems && bot.lootItems.length > 0) {
    html += `<div class="loot-memory-list">`;
    bot.lootItems.forEach(item => {
      html += `<div class="loot-memory-item">T${item.t} ${friendlyName(item.ref, ITEM_NAMES)}</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;

  // Players card
  if (bot.playerMem !== undefined) {
    const visE = bot.visEnemies || 0;
    const visF = bot.visFriends || 0;
    const mem = bot.playerMem || 0;
    html += `<div class="debug-card">
      <h4>Players</h4>
      <div class="debug-row"><span class="label">Visible Enemies</span><span class="value" style="color:${visE > 0 ? '#ff4444' : 'inherit'}">${visE}</span></div>
      <div class="debug-row"><span class="label">Visible Friends</span><span class="value" style="color:${visF > 0 ? '#44bb44' : 'inherit'}">${visF}</span></div>
      <div class="debug-row"><span class="label">Memory</span><span class="value">${mem} players</span></div>`;

    if (bot.playerList && bot.playerList.length > 0) {
      html += `<div class="loot-memory-list">`;
      bot.playerList.forEach(p => {
        const icon = p.f ? "F" : "E";
        const color = p.f ? "#44bb44" : "#ff4444";
        const vis = p.v ? "visible" : "memory";
        const isTarget = typeof bot.combatTarget === "number" && p.ei === bot.combatTarget;
        const targetSuffix = isTarget ? ` <span style="color:#fbbf24;font-weight:bold">← TARGET</span>` : "";
        html += `<div class="loot-memory-item"><span style="color:${color}">[${icon}]</span> ${esc(p.n)} — ${p.d}u (${vis})${targetSuffix}</div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  }

  // Traverse card (only if active)
  if (bot.travPhase) {
    html += `<div class="debug-card">
      <h4>Traversal</h4>
      <div class="debug-row"><span class="label">Phase</span><span class="value">${bot.travPhase}</span></div>
      ${bot.travType ? `<div class="debug-row"><span class="label">Type</span><span class="value">${bot.travType}</span></div>` : ""}
    </div>`;
  }

  // Position card
  if (bot.pos) {
    html += `<div class="debug-card">
      <h4>Position</h4>
      <div class="debug-row"><span class="value">${bot.pos[0]}, ${bot.pos[1]}, ${bot.pos[2]}</span></div>
    </div>`;
  }

  panel.innerHTML = html;
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
