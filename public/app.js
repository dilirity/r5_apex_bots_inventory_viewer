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

// --- WebSocket ---
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "status") {
    updateStatus(msg.rcon);
  } else if (msg.type === "inventory") {
    inventoryData = msg.data;
    renderPlayerList();
    if (selectedPlayer !== null) renderDetail();
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
    li.innerHTML = `${esc(p.name)}<span class="player-hp">HP ${p.hp}/${p.hpMax} | SH ${p.shields}/${p.shieldsMax}</span>`;
    li.onclick = () => { selectedPlayer = i; renderPlayerList(); renderDetail(); };
    playersEl.appendChild(li);
  });
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
  document.getElementById("player-name").textContent = p.name;

  // Vitals
  const hpPct = p.hpMax > 0 ? (p.hp / p.hpMax) * 100 : 0;
  document.getElementById("hp-bar").style.width = hpPct + "%";
  document.getElementById("hp-text").textContent = `${p.hp} / ${p.hpMax}`;
  const shPct = p.shieldsMax > 0 ? (p.shields / p.shieldsMax) * 100 : 0;
  document.getElementById("shield-bar").style.width = shPct + "%";
  document.getElementById("shield-text").textContent = `${p.shields} / ${p.shieldsMax}`;

  // Equipment slots
  renderEquipSlot("slot-armor", "Armor", p.armorTier);
  renderEquipSlot("slot-helmet", "Helmet", p.helmetTier);
  renderEquipSlot("slot-backpack", "Backpack", p.backpackTier);
  renderEquipSlot("slot-knockdown", "KD Shield", p.incapshieldTier);

  // Weapons
  renderWeapon("weapon-0", p.weapons?.[0], 1);
  renderWeapon("weapon-1", p.weapons?.[1], 2);

  // Backpack grid
  renderBackpack(p);
}

function renderEquipSlot(id, label, tier) {
  const el = document.getElementById(id);
  el.className = "equip-slot t" + (tier || 0);
  el.querySelector(".slot-value").textContent = tier > 0 ? `T${tier}` : "-";
}

function renderWeapon(id, w, slotNum) {
  const card = document.getElementById(id);
  const nameEl = card.querySelector(".weapon-name");
  const ammoEl = card.querySelector(".weapon-ammo");
  const modsEl = card.querySelector(".weapon-mods");
  const labelEl = card.querySelector(".weapon-slot-label");

  labelEl.textContent = `Weapon ${slotNum}`;

  // Remove old ammo bar
  const oldBar = card.querySelector(".ammo-bar");
  if (oldBar) oldBar.remove();

  if (!w || !w.n) {
    card.className = "weapon-card empty";
    nameEl.textContent = "Empty";
    ammoEl.innerHTML = "";
    modsEl.innerHTML = "";
    return;
  }

  card.className = "weapon-card" + (w.a ? " active" : "");
  nameEl.textContent = friendlyName(w.n, WEAPON_NAMES);
  ammoEl.innerHTML = `<span class="clip">${w.cl}/${w.cm}</span><span class="sep"> + </span><span class="reserve">${w.rs}</span>`;

  // Ammo type color bar
  const bar = document.createElement("div");
  bar.className = "ammo-bar " + (w.at || "");
  card.insertBefore(bar, card.firstChild);

  // Mods
  modsEl.innerHTML = "";
  if (w.m && w.m.length > 0) {
    w.m.forEach((mod) => {
      const chip = document.createElement("span");
      chip.className = "mod-slot t" + (mod.t || 0);
      chip.textContent = friendlyName(mod.r, MOD_NAMES);
      modsEl.appendChild(chip);
    });
  }
}

function renderBackpack(p) {
  const grid = document.getElementById("backpack-grid");
  const countEl = document.getElementById("backpack-count");
  const capacity = BACKPACK_SLOTS[p.backpackTier] || 10;
  const items = p.i || [];

  countEl.textContent = `${items.length} / ${capacity}`;
  grid.innerHTML = "";

  // Each inventory entry = one backpack slot (c = stack count, t = tier)
  items.forEach((item) => {
    const cell = document.createElement("div");
    cell.className = `bp-cell has-item t${item.t || 0}`;
    const name = friendlyName(item.r, ITEM_NAMES);
    cell.innerHTML = `<span class="item-name">${esc(name)}</span>`;
    if (item.c > 1) {
      cell.innerHTML += `<span class="item-count">x${item.c}</span>`;
    }
    grid.appendChild(cell);
  });

  // Fill remaining with empty/locked cells
  for (let i = items.length; i < MAX_BACKPACK_SLOTS; i++) {
    const cell = document.createElement("div");
    cell.className = i < capacity ? "bp-cell" : "bp-cell locked";
    grid.appendChild(cell);
  }
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
