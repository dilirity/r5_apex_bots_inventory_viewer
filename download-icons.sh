#!/bin/bash
cd "$(dirname "$0")/public/icons"
BASE="https://apexlegends.wiki.gg/images"

# Equipment
curl -sL "$BASE/Body_Shield.svg" -o equipment/body_shield.svg
curl -sL "$BASE/Helmet.svg" -o equipment/helmet.svg
curl -sL "$BASE/Backpack_lvl2.svg" -o equipment/backpack.svg
curl -sL "$BASE/Knockdown_Shield_white.svg" -o equipment/knockdown_shield.svg

# Weapons
curl -sL "$BASE/HAVOC_Rifle_Icon.svg" -o weapons/mp_weapon_energy_ar.svg
curl -sL "$BASE/VK-47_Flatline_Icon.svg" -o weapons/mp_weapon_vinson.svg
curl -sL "$BASE/Hemlok_Burst_AR_Icon.svg" -o weapons/mp_weapon_hemlok.svg
curl -sL "$BASE/R-301_Carbine_Icon.svg" -o weapons/mp_weapon_rspn101.svg
curl -sL "$BASE/Nemesis_Burst_AR_Icon.svg" -o weapons/mp_weapon_nemesis.svg
curl -sL "$BASE/Alternator_SMG_Icon.svg" -o weapons/mp_weapon_pdw.svg
curl -sL "$BASE/R-99_SMG_Icon.svg" -o weapons/mp_weapon_r97.svg
curl -sL "$BASE/Volt_SMG_Icon.svg" -o weapons/mp_weapon_volt_smg.svg
curl -sL "$BASE/C.A.R._SMG_Icon.svg" -o weapons/mp_weapon_car.svg
curl -sL "$BASE/Devotion_LMG_Icon.svg" -o weapons/mp_weapon_esaw.svg
curl -sL "$BASE/L-STAR_EMG_Icon.svg" -o weapons/mp_weapon_lstar.svg
curl -sL "$BASE/M600_Spitfire_Icon.svg" -o weapons/mp_weapon_lmg.svg
curl -sL "$BASE/G7_Scout_Icon.svg" -o weapons/mp_weapon_g2.svg
curl -sL "$BASE/Triple_Take_Icon.svg" -o weapons/mp_weapon_doubletake.svg
curl -sL "$BASE/30-30_Repeater_Icon.svg" -o weapons/mp_weapon_3030.svg
curl -sL "$BASE/Bocek_Compound_Bow_Icon.svg" -o weapons/mp_weapon_bow.svg
curl -sL "$BASE/Longbow_DMR_Icon.svg" -o weapons/mp_weapon_dmr.svg
curl -sL "$BASE/Kraber_.50-Cal_Sniper_Icon.svg" -o weapons/mp_weapon_sniper.svg
curl -sL "$BASE/Sentinel_ESR_Icon.svg" -o weapons/mp_weapon_sentinel.svg
curl -sL "$BASE/EVA-8_Auto_Icon.svg" -o weapons/mp_weapon_shotgun.svg
curl -sL "$BASE/Mastiff_Shotgun_Icon.svg" -o weapons/mp_weapon_mastiff.svg
curl -sL "$BASE/Mozambique_Shotgun_Icon.svg" -o weapons/mp_weapon_shotgun_pistol.svg
curl -sL "$BASE/Peacekeeper_Icon.svg" -o weapons/mp_weapon_energy_shotgun.svg
curl -sL "$BASE/RE-45_Auto_Icon.svg" -o weapons/mp_weapon_autopistol.svg
curl -sL "$BASE/P2020_Icon.svg" -o weapons/mp_weapon_semipistol.svg
curl -sL "$BASE/Wingman_Icon.svg" -o weapons/mp_weapon_wingman.svg
curl -sL "$BASE/Prowler_Burst_PDW_Icon.svg" -o weapons/mp_weapon_pdw_prowler.svg
curl -sL "$BASE/Charge_Rifle_Icon.svg" -o weapons/mp_weapon_defender.svg
curl -sL "$BASE/Rampage_LMG_Icon.svg" -o weapons/mp_weapon_rampage.svg

# Consumables
curl -sL "$BASE/Shield_Cell_white.svg" -o consumables/health_pickup_combo_small.svg
curl -sL "$BASE/Shield_Battery_white.svg" -o consumables/health_pickup_combo_large.svg
curl -sL "$BASE/Syringe_white.svg" -o consumables/health_pickup_health_small.svg
curl -sL "$BASE/Med_Kit_white.svg" -o consumables/health_pickup_health_large.svg
curl -sL "$BASE/Phoenix_Kit_white.svg" -o consumables/health_pickup_combo_full.svg
curl -sL "$BASE/Ultimate_Accelerant_white.svg" -o consumables/health_pickup_ultimate.svg

# Grenades
curl -sL "$BASE/Frag_Grenade_White.svg" -o consumables/mp_weapon_frag_grenade.svg
curl -sL "$BASE/Arc_Star_white.svg" -o consumables/mp_weapon_grenade_emp.svg
curl -sL "$BASE/Thermite_Grenade_white.svg" -o consumables/mp_weapon_thermite_grenade.svg

# Ammo
curl -sL "$BASE/Light_Rounds.svg" -o ammo/bullet.svg
curl -sL "$BASE/Heavy_Rounds.svg" -o ammo/highcal.svg
curl -sL "$BASE/Energy_Ammo.svg" -o ammo/special.svg
curl -sL "$BASE/Shotgun_Shells.svg" -o ammo/shotgun.svg
curl -sL "$BASE/Sniper_Ammo.svg" -o ammo/sniper.svg

# Attachments - Barrels/Mags/Stocks
curl -sL "$BASE/Barrel_Stabilizer.svg" -o attachments/barrel_stabilizer.svg
curl -sL "$BASE/Extended_Light_Mag.svg" -o attachments/bullets_mag.svg
curl -sL "$BASE/Extended_Heavy_Mag.svg" -o attachments/highcal_mag.svg
curl -sL "$BASE/Extended_Energy_Mag.svg" -o attachments/energy_mag.svg
curl -sL "$BASE/Extended_Sniper_Mag.svg" -o attachments/sniper_mag.svg
curl -sL "$BASE/Shotgun_Bolt.svg" -o attachments/shotgun_bolt.svg
curl -sL "$BASE/Standard_Stock.svg" -o attachments/stock_tactical.svg
curl -sL "$BASE/Sniper_Stock.svg" -o attachments/stock_sniper.svg

# Attachments - Optics
curl -sL "$BASE/1x_HCOG_Classic_white.svg" -o attachments/optic_cq_hcog_classic.svg
curl -sL "$BASE/1x_Holo_white.svg" -o attachments/optic_cq_holosight.svg
curl -sL "$BASE/2x_HCOG_Bruiser_white.svg" -o attachments/optic_cq_hcog_bruiser.svg
curl -sL "$BASE/1x-2x_Variable_Holo_white.svg" -o attachments/optic_cq_holosight_variable.svg
curl -sL "$BASE/3x_HCOG_Ranger_white.svg" -o attachments/optic_ranged_hcog.svg
curl -sL "$BASE/2x-4x_Variable_AOG.svg" -o attachments/optic_ranged_aog_variable.svg
curl -sL "$BASE/6x_Sniper_white.svg" -o attachments/optic_sniper.svg
curl -sL "$BASE/4x-8x_Variable_Sniper_white.svg" -o attachments/optic_sniper_variable.svg
curl -sL "$BASE/4x-10x_Digital_Sniper_Threat.svg" -o attachments/optic_sniper_threat.svg

# Attachments - Hop-ups
curl -sL "$BASE/Turbocharger.svg" -o attachments/hopup_turbocharger.svg
curl -sL "$BASE/Hammerpoint_Rounds.svg" -o attachments/hopup_hammerpoint.svg
curl -sL "$BASE/Boosted_Loader.svg" -o attachments/hopup_boosted_loader.svg

echo "Done! Downloaded $(find . -name '*.svg' | wc -l) SVGs"
