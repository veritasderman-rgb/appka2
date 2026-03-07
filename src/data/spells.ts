/**
 * Spell catalog for magical units in the battle simulator.
 * Based on AD&D / D&D 5e rules (Czech localization).
 */

export type CasterClass = 'mage' | 'battleMage' | 'cleric' | 'battleCleric';

/** Spell slots per caster level bracket */
export const SPELL_SLOTS: Record<'mage' | 'cleric', Record<number, Record<number, number>>> = {
  mage: {
    6:  { 1: 4, 2: 2, 3: 2, 4: 0, 5: 0, 6: 0 },
    9:  { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1, 6: 0 },
    12: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 1 },
  },
  cleric: {
    6:  { 1: 3, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0 },
    9:  { 1: 4, 2: 4, 3: 3, 4: 2, 5: 1, 6: 0 },
    12: { 1: 6, 2: 5, 3: 5, 4: 3, 5: 2, 6: 2 },
  },
};

export type SpellEffectType = 'damage' | 'heal' | 'buff' | 'cc' | 'debuff' | 'utility';

export interface SpellCombatEffect {
  type: SpellEffectType;
  /** Average damage dealt to enemy unit */
  avgDamage?: number;
  /** Whether the spell hits an area (affects more soldiers) */
  aoe?: boolean;
  /** Auto-hit (no roll needed) */
  autoHit?: boolean;
  /** Average HP healed (restores soldiers) */
  avgHeal?: number;
  /** AC bonus for the buffed unit (negative = better AC) */
  acBonus?: number;
  /** THAC0 bonus for the buffed unit (negative = better THAC0) */
  thac0Bonus?: number;
  /** Damage bonus string */
  damageBonus?: string;
  /** Duration in BKs */
  durationBK?: number;
  /** For CC: fraction of enemy unit disabled (0-1) */
  disableFraction?: number;
}

export interface SpellDefinition {
  id: string;
  name: string;
  level: number;
  school: string;
  casterClasses: CasterClass[];
  description: string;
  combat: SpellCombatEffect;
}

// ============================================================
// SPELL CATALOG
// ============================================================

export const SPELL_CATALOG: SpellDefinition[] = [
  // ===================== MAGE LEVEL 1 =====================
  {
    id: 'magicka_strela',
    name: 'Magická střela',
    level: 1, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Tři zářící šipky magické síly. Každá automaticky zasáhne a způsobí 1k4+1 silového zranění.',
    combat: { type: 'damage', avgDamage: 10.5, autoHit: true },
  },
  {
    id: 'horici_ruce',
    name: 'Hořící ruce',
    level: 1, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Kužel plamenů 4,5 m. Každý tvor musí uspět v záchraně na OBR, nebo utrpí 3k6 ohnivého zranění.',
    combat: { type: 'damage', avgDamage: 10.5, aoe: true },
  },
  {
    id: 'zbroj',
    name: 'Zbroj',
    level: 1, school: 'vymítání',
    casterClasses: ['mage', 'battleMage'],
    description: 'Neviditelná silová ochrana. OČ se stane 13 + modifikátor Obratnosti na 8 hodin.',
    combat: { type: 'buff', acBonus: -3, durationBK: 99 },
  },
  {
    id: 'stit',
    name: 'Štít',
    level: 1, school: 'vymítání',
    casterClasses: ['mage', 'battleMage'],
    description: 'Bariéra magické síly. Bonus +5 k OČ jako reakce na útok.',
    combat: { type: 'buff', acBonus: -5, durationBK: 1 },
  },
  {
    id: 'sadlo',
    name: 'Sádlo',
    level: 1, school: 'transmutace',
    casterClasses: ['mage'],
    description: 'Kluzký povrch v okruhu 3 m. Tvorové musí uspět v záchraně na OBR nebo upadnou.',
    combat: { type: 'cc', disableFraction: 0.15, durationBK: 1, aoe: true },
  },
  {
    id: 'barevna_sprska',
    name: 'Barevná sprška',
    level: 1, school: 'iluze',
    casterClasses: ['mage'],
    description: 'Záplava oslnivých paprsků v kuželu. Tvorové s nejnižšími životy jsou oslepeni.',
    combat: { type: 'cc', disableFraction: 0.2, durationBK: 1, aoe: true },
  },
  {
    id: 'desive_sevreni',
    name: 'Děsivé sevření',
    level: 1, school: 'nekromancie',
    casterClasses: ['mage'],
    description: 'Jeden tvor musí uspět v záchraně na MOU nebo je paralyzován.',
    combat: { type: 'cc', disableFraction: 0.05, durationBK: 2 },
  },
  {
    id: 'hypnoza',
    name: 'Hypnóza',
    level: 1, school: 'okouzlení',
    casterClasses: ['mage'],
    description: 'Skupina tvorů v okruhu 6 m upadne do transu. Záchrana na MOU.',
    combat: { type: 'cc', disableFraction: 0.2, durationBK: 2, aoe: true },
  },
  {
    id: 'okouzli_osobu',
    name: 'Okouzli osobu',
    level: 1, school: 'okouzlení',
    casterClasses: ['mage'],
    description: 'Humanoid musí uspět v záchraně na MOU, jinak je okouzlen.',
    combat: { type: 'cc', disableFraction: 0.05, durationBK: 3 },
  },
  {
    id: 'vysmech',
    name: 'Výsměch',
    level: 1, school: 'okouzlení',
    casterClasses: ['mage'],
    description: 'Tři tvorové utrpí 1k4 psychického zranění a mají nevýhodu k útoku.',
    combat: { type: 'debuff', avgDamage: 7.5, thac0Bonus: 2, durationBK: 1 },
  },

  // ===================== MAGE LEVEL 2 =====================
  {
    id: 'neviditelnost',
    name: 'Neviditelnost',
    level: 2, school: 'iluze',
    casterClasses: ['mage', 'battleMage'],
    description: 'Tvor se stane neviditelným. Končí útokem nebo sesláním kouzla.',
    combat: { type: 'buff', acBonus: -4, durationBK: 1 },
  },
  {
    id: 'odhal_neviditelnost',
    name: 'Odhal neviditelnost',
    level: 2, school: 'vymítání',
    casterClasses: ['mage', 'battleMage'],
    description: 'Vidíš neviditelné tvory a předměty.',
    combat: { type: 'utility' },
  },
  {
    id: 'melfuv_kyselinovy_sip',
    name: 'Melfův kyselinový šíp',
    level: 2, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Šíp kyseliny způsobí 4k4 ihned a 2k4 na konci tahu cíle.',
    combat: { type: 'damage', avgDamage: 15 },
  },
  {
    id: 'zrcadlovy_obraz',
    name: 'Zrcadlový obraz',
    level: 2, school: 'iluze',
    casterClasses: ['mage', 'battleMage'],
    description: 'Tři iluzorní duplikáty. Útočník míří na duplikáta místo na tebe.',
    combat: { type: 'buff', acBonus: -3, durationBK: 2 },
  },
  {
    id: 'smrduty_mrak',
    name: 'Smrdutý mrak',
    level: 2, school: 'odvolávání',
    casterClasses: ['mage', 'battleMage'],
    description: 'Koule jedovatých plynů. Tvorové musí uspět v záchraně na ODO nebo zvrací.',
    combat: { type: 'cc', disableFraction: 0.25, durationBK: 2, aoe: true },
  },
  {
    id: 'zvetseni_zmenseni',
    name: 'Zvětšení/Zmenšení',
    level: 2, school: 'transmutace',
    casterClasses: ['mage'],
    description: 'Tvor roste nebo se zmenšuje. Zvětšení: +1k4 zranění, výhoda na Sílu.',
    combat: { type: 'buff', damageBonus: '1k4', durationBK: 2 },
  },

  // ===================== MAGE LEVEL 3 =====================
  {
    id: 'blesk',
    name: 'Blesk',
    level: 3, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Čára 27 m. Každý tvor v čáře utrpí 8k6 bleskového zranění (záchrana OBR, polovina).',
    combat: { type: 'damage', avgDamage: 28, aoe: true },
  },
  {
    id: 'ohniva_koule',
    name: 'Ohnivá koule',
    level: 3, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Exploze v kouli 6 m. 8k6 ohnivého zranění (záchrana OBR, polovina).',
    combat: { type: 'damage', avgDamage: 28, aoe: true },
  },
  {
    id: 'let',
    name: 'Leť',
    level: 3, school: 'transmutace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Cíl získá rychlost létání 18 m.',
    combat: { type: 'utility' },
  },
  {
    id: 'rozptyl_magii_mage',
    name: 'Rozptyl magii',
    level: 3, school: 'vymítání',
    casterClasses: ['mage', 'battleMage'],
    description: 'Ukončí kouzla 3. úrovně nebo nižší na cíli.',
    combat: { type: 'utility' },
  },
  {
    id: 'spech',
    name: 'Spěch',
    level: 3, school: 'transmutace',
    casterClasses: ['mage'],
    description: 'Rychlost ×2, +2 OČ, výhoda na OBR záchranné hody, extra akce.',
    combat: { type: 'buff', acBonus: -2, thac0Bonus: -2, durationBK: 2 },
  },
  {
    id: 'melfovy_ohnive_meteory',
    name: 'Melfovy ohnivé meteory',
    level: 3, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Dvě ohnivé kuličky, každá způsobí 2k6 ohnivého zranění.',
    combat: { type: 'damage', avgDamage: 14, aoe: true },
  },
  {
    id: 'ochrana_pred_strelami',
    name: 'Ochrana proti normálním střelám',
    level: 3, school: 'vymítání',
    casterClasses: ['mage'],
    description: 'Odolnost vůči nemagickým střelám na 8 hodin.',
    combat: { type: 'buff', acBonus: -4, durationBK: 99 },
  },

  // ===================== MAGE LEVEL 4 =====================
  {
    id: 'kamenna_kuze',
    name: 'Kamenná kůže',
    level: 4, school: 'vymítání',
    casterClasses: ['mage', 'battleMage'],
    description: 'Odolnost vůči nemagickému bodavému, sekavému a drtivému zranění.',
    combat: { type: 'buff', acBonus: -4, durationBK: 3 },
  },
  {
    id: 'stena_ohne',
    name: 'Stěna ohně',
    level: 4, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Zeď ohně. Tvor procházející zdí utrpí 5k8 ohnivého zranění.',
    combat: { type: 'damage', avgDamage: 22.5, aoe: true },
  },
  {
    id: 'ledova_boure',
    name: 'Ledová bouře',
    level: 4, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Kroupy ve válci 6 m. 2k8 drtivé + 4k6 chladné zranění.',
    combat: { type: 'damage', avgDamage: 23, aoe: true },
  },
  {
    id: 'mensi_koule_nezranitelnosti',
    name: 'Menší koule nezranitelnosti',
    level: 4, school: 'vymítání',
    casterClasses: ['mage'],
    description: 'Kouzla ze slotů 3. úrovně a nižší nemohou ovlivnit nikoho v kouli.',
    combat: { type: 'buff', acBonus: -3, durationBK: 2 },
  },
  {
    id: 'ohnivy_stit',
    name: 'Ohnivý štít',
    level: 4, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Odolnost vůči chladu/ohni. Útočník do 1,5 m utrpí 2k8 zranění.',
    combat: { type: 'buff', acBonus: -2, durationBK: 3 },
  },
  {
    id: 'pevna_mlha',
    name: 'Pevná mlha',
    level: 4, school: 'odvolávání',
    casterClasses: ['mage'],
    description: 'Koule hustého mlžného oblaku. Tvorové v mlze jsou slepí.',
    combat: { type: 'cc', disableFraction: 0.3, durationBK: 3, aoe: true },
  },

  // ===================== MAGE LEVEL 5 =====================
  {
    id: 'kuzel_mrazu',
    name: 'Kužel mrazu',
    level: 5, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Kužel 18 m. 8k8 chladného zranění + zadržení při neúspěchu záchranného hodu.',
    combat: { type: 'damage', avgDamage: 36, aoe: true },
  },
  {
    id: 'mrak_smrti',
    name: 'Mrak smrti',
    level: 5, school: 'nekromancie',
    casterClasses: ['mage', 'battleMage'],
    description: 'Válec fialové mlhy ø30 m. 5k8 nekrotického zranění za kolo.',
    combat: { type: 'damage', avgDamage: 22.5, aoe: true, durationBK: 3 },
  },
  {
    id: 'teleportace',
    name: 'Teleportace',
    level: 5, school: 'odvolávání',
    casterClasses: ['mage', 'battleMage'],
    description: 'Teleportace sebe a až 8 tvorů na známé místo.',
    combat: { type: 'utility' },
  },
  {
    id: 'pruchodna_stena',
    name: 'Průchodná stěna',
    level: 5, school: 'transmutace',
    casterClasses: ['mage'],
    description: 'Vytvoří průchod skrz zeď/strop.',
    combat: { type: 'utility' },
  },
  {
    id: 'telekineze',
    name: 'Telekineze',
    level: 5, school: 'transmutace',
    casterClasses: ['mage'],
    description: 'Telekineticky pohybuje cílem 9 m/kolo. Záchranný hod na SIL.',
    combat: { type: 'cc', disableFraction: 0.1, durationBK: 3 },
  },
  {
    id: 'vyvolej_elementala',
    name: 'Vyvolej elementála',
    level: 5, school: 'odvolávání',
    casterClasses: ['mage'],
    description: 'Vyvolá elementála ohně, vzduchu, vody nebo země.',
    combat: { type: 'damage', avgDamage: 20, durationBK: 3 },
  },
  {
    id: 'tvaruj_kamen',
    name: 'Tvaruj kámen',
    level: 5, school: 'transmutace',
    casterClasses: ['mage'],
    description: 'Tvaruje kámen dle potřeby.',
    combat: { type: 'utility' },
  },

  // ===================== MAGE LEVEL 6 =====================
  {
    id: 'koule_nezranitelnosti',
    name: 'Koule nezranitelnosti',
    level: 6, school: 'vymítání',
    casterClasses: ['mage'],
    description: 'Kouzla ze slotů 5. úrovně a nižší nemohou proniknout do koule.',
    combat: { type: 'buff', acBonus: -5, durationBK: 2 },
  },
  {
    id: 'retezovy_blesk',
    name: 'Řetězový blesk',
    level: 6, school: 'evokace',
    casterClasses: ['mage', 'battleMage'],
    description: 'Blesk na primární cíl + 3 sekundární cíle. 10k8 bleskového zranění.',
    combat: { type: 'damage', avgDamage: 45, aoe: true },
  },

  // ===================== CLERIC LEVEL 1 =====================
  {
    id: 'uzdrav_lehka_zraneni',
    name: 'Uzdrav lehká zranění',
    level: 1, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Tvor si obnoví 1k8 + sesílací modifikátor životů.',
    combat: { type: 'heal', avgHeal: 8 },
  },
  {
    id: 'pozehnani',
    name: 'Požehnání',
    level: 1, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Až tři tvorové získají bonus +1k4 k útokům a záchranám.',
    combat: { type: 'buff', thac0Bonus: -2, durationBK: 2 },
  },
  {
    id: 'spojeni',
    name: 'Spojení',
    level: 1, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Přenáší 50% utrpěného zranění cíle na sesilatele.',
    combat: { type: 'utility' },
  },
  {
    id: 'zbav_strachu',
    name: 'Zbav strachu',
    level: 1, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Tvor je imunní vůči vystrašení.',
    combat: { type: 'buff', durationBK: 2 },
  },
  {
    id: 'ochrana_pred_zlem',
    name: 'Ochrana před zlem',
    level: 1, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Ochranná bariéra proti zlým tvorům. Nevýhoda na útoky, imunita ovládání mysli.',
    combat: { type: 'buff', acBonus: -2, durationBK: 3 },
  },
  {
    id: 'utociste',
    name: 'Útočiště',
    level: 1, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Útočníci musí uspět v záchranném hodu na MOU, jinak musí zvolit jiný cíl.',
    combat: { type: 'buff', acBonus: -3, durationBK: 2 },
  },

  // ===================== CLERIC LEVEL 2 =====================
  {
    id: 'posileni_svatou_moci',
    name: 'Posílení svatou mocí',
    level: 2, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Zbraň se stane magickou a způsobí 2k6 zářivého zranění navíc.',
    combat: { type: 'buff', damageBonus: '2k6', durationBK: 3 },
  },
  {
    id: 'vyjmuti',
    name: 'Vyjmutí',
    level: 2, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Ukončí jednu nemoc nebo stav postihu na tvorovi.',
    combat: { type: 'utility' },
  },
  {
    id: 'polap_bytost',
    name: 'Polap bytost',
    level: 2, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Cíl musí uspět v záchraně na SIL nebo je zadržen.',
    combat: { type: 'cc', disableFraction: 0.05, durationBK: 2 },
  },
  {
    id: 'chvalozpev',
    name: 'Chvalozpěv',
    level: 2, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Až tři tvorové v okruhu 18 m získají +1 k útokům a záchranám.',
    combat: { type: 'buff', thac0Bonus: -1, durationBK: 2 },
  },
  {
    id: 'duchovni_kladivo',
    name: 'Duchovní kladivo',
    level: 2, school: 'evokace',
    casterClasses: ['cleric'],
    description: 'Plující kladivo útočí jako bonusová akce. 1k8 + sesílací modifikátor zranění.',
    combat: { type: 'damage', avgDamage: 9 },
  },
  {
    id: 'najdi_ocarovani',
    name: 'Najdi očarování',
    level: 2, school: 'věštění',
    casterClasses: ['cleric'],
    description: 'Detekuje kouzla v 9 m.',
    combat: { type: 'utility' },
  },

  // ===================== CLERIC LEVEL 3 =====================
  {
    id: 'svaty_uder',
    name: 'Svatý úder',
    level: 3, school: 'evokace',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'První útok způsobí navíc 4k6 zářivého zranění. Cíl může být oslepen.',
    combat: { type: 'damage', avgDamage: 14 },
  },
  {
    id: 'modlitba',
    name: 'Modlitba',
    level: 3, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Spojenci +1 k útokům a záchranám, nepřátelé -1.',
    combat: { type: 'buff', thac0Bonus: -1, acBonus: -1, durationBK: 2 },
  },
  {
    id: 'rozptyl_magii_cleric',
    name: 'Rozptyl magii',
    level: 3, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Ukončí kouzla 3. úrovně nebo nižší na cíli.',
    combat: { type: 'utility' },
  },
  {
    id: 'uzdrav_nemoc',
    name: 'Uzdrav nemoc',
    level: 3, school: 'vymítání',
    casterClasses: ['cleric'],
    description: 'Ukončí všechny nemoci na tvorovi.',
    combat: { type: 'utility' },
  },
  {
    id: 'odstran_paralyzu',
    name: 'Odstraň paralýzu',
    level: 3, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Ukončí paralyzovaný stav.',
    combat: { type: 'utility' },
  },
  {
    id: 'sesli_blesk',
    name: 'Sešli blesk',
    level: 3, school: 'evokace',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Blesk zasáhne tvora. 3k6 bleskového zranění (záchrana OBR, polovina).',
    combat: { type: 'damage', avgDamage: 10.5 },
  },

  // ===================== CLERIC LEVEL 4 =====================
  {
    id: 'uzdrav_vazna_zraneni',
    name: 'Uzdrav vážná zranění',
    level: 4, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Tvor si obnoví 4k8 + sesílací modifikátor životů.',
    combat: { type: 'heal', avgHeal: 22 },
  },
  {
    id: 'magicka_imunita',
    name: 'Magická imunita',
    level: 4, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Ochrana vůči kouzlům 4. úrovně a nižší.',
    combat: { type: 'buff', acBonus: -4, durationBK: 3 },
  },
  {
    id: 'ochrana_pred_blesky',
    name: 'Ochrana před blesky',
    level: 4, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Odolnost vůči bleskům.',
    combat: { type: 'buff', durationBK: 99 },
  },

  // ===================== CLERIC LEVEL 5 =====================
  {
    id: 'uzdrav_kriticka_zraneni',
    name: 'Uzdrav kritická zranění',
    level: 5, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Tvor si obnoví 5k8 + sesílací modifikátor životů.',
    combat: { type: 'heal', avgHeal: 27 },
  },
  {
    id: 'plamenný_uder',
    name: 'Plamenný úder',
    level: 5, school: 'evokace',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Sloup božského ohně. 4k6 ohnivé + 4k6 zářivé zranění.',
    combat: { type: 'damage', avgDamage: 28, aoe: true },
  },
  {
    id: 'zamoreni_hmyzem',
    name: 'Zamoření hmyzem',
    level: 5, school: 'odvolávání',
    casterClasses: ['cleric'],
    description: 'Oblak hmyzu v okruhu 6 m. 4k10 bodavého zranění.',
    combat: { type: 'damage', avgDamage: 22, aoe: true, durationBK: 3 },
  },

  // ===================== CLERIC LEVEL 6 =====================
  {
    id: 'leceni',
    name: 'Léčení',
    level: 6, school: 'vymítání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Tvor si obnoví až 70 životů. Ukončí slepotu, hluchotu a nemoci.',
    combat: { type: 'heal', avgHeal: 70 },
  },
  {
    id: 'stena_cepeli',
    name: 'Stěna čepelí',
    level: 6, school: 'odvolávání',
    casterClasses: ['cleric', 'battleCleric'],
    description: 'Zeď točících se čepelí. 6k10 sekavého zranění tvorům procházejícím zdí.',
    combat: { type: 'damage', avgDamage: 33, aoe: true, durationBK: 3 },
  },
  {
    id: 'trnita_stena',
    name: 'Trnitá stěna',
    level: 6, school: 'odvolávání',
    casterClasses: ['cleric'],
    description: 'Zeď ostrých trnů. 7k8 bodavého zranění + zadržení.',
    combat: { type: 'damage', avgDamage: 31.5, aoe: true, durationBK: 3 },
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Map unit type to caster class */
export function getCasterClassForUnitType(unitType: string): CasterClass | undefined {
  switch (unitType) {
    case 'MG': return 'mage';
    case 'BM': return 'battleMage';
    case 'KN': return 'cleric';
    case 'DR': return 'cleric';
    default: return undefined;
  }
}

/** Get the slot table key ('mage' or 'cleric') for a caster class */
export function getSlotTableKey(cc: CasterClass): 'mage' | 'cleric' {
  return cc === 'mage' || cc === 'battleMage' ? 'mage' : 'cleric';
}

/** Snap a caster level to the nearest bracket (6, 9, or 12) */
export function snapCasterLevel(level: number): 6 | 9 | 12 {
  if (level >= 11) return 12;
  if (level >= 8) return 9;
  return 6;
}

/** Get spell slots for a caster class and level */
export function getSlotsForCaster(cc: CasterClass, level: number): Record<number, number> {
  const tableKey = getSlotTableKey(cc);
  const snapped = snapCasterLevel(level);
  return { ...SPELL_SLOTS[tableKey][snapped] };
}

/** Get available spells for a caster class and level */
export function getAvailableSpells(cc: CasterClass, level: number): SpellDefinition[] {
  const slots = getSlotsForCaster(cc, level);
  const maxSpellLevel = Math.max(...Object.entries(slots)
    .filter(([, v]) => v > 0)
    .map(([k]) => parseInt(k)), 0);

  return SPELL_CATALOG.filter(s =>
    s.level <= maxSpellLevel && s.casterClasses.includes(cc)
  );
}

/** Get a spell by id */
export function getSpellById(id: string): SpellDefinition | undefined {
  return SPELL_CATALOG.find(s => s.id === id);
}

/** Sort spells by combat priority: highest level first, then by effect type */
const MAGE_EFFECT_PRIORITY: Record<SpellEffectType, number> = {
  damage: 0,
  debuff: 1,
  cc: 2,
  buff: 3,
  heal: 4,
  utility: 5,
};

/** Clerics prioritize support: buff > heal > cc > debuff > damage */
const CLERIC_EFFECT_PRIORITY: Record<SpellEffectType, number> = {
  buff: 0,
  heal: 1,
  cc: 2,
  debuff: 3,
  damage: 4,
  utility: 5,
};

export function sortSpellsByCombatPriority(spells: SpellDefinition[], casterClass?: CasterClass): SpellDefinition[] {
  const isCleric = casterClass === 'cleric' || casterClass === 'battleCleric';
  const priorityMap = isCleric ? CLERIC_EFFECT_PRIORITY : MAGE_EFFECT_PRIORITY;

  return [...spells].sort((a, b) => {
    // Higher level first
    if (b.level !== a.level) return b.level - a.level;
    // By effect priority (depends on caster class)
    const pa = priorityMap[a.combat.type] ?? 5;
    const pb = priorityMap[b.combat.type] ?? 5;
    if (pa !== pb) return pa - pb;
    // Higher damage first
    return (b.combat.avgDamage ?? 0) - (a.combat.avgDamage ?? 0);
  });
}
