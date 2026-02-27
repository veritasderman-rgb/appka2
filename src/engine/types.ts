export type Faction = 'alliance' | 'enemy';

export type UnitType =
  | 'LP' | 'TP' | 'LS' | 'TS' | 'HR' | 'OS'
  | 'LJ' | 'TJ' | 'SJ' | 'LL' | 'TL'
  | 'DR' | 'KN' | 'MG' | 'BM'
  | 'SP' | 'ZEN' | 'FEL' | 'VS';

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  LP: 'Lehká pěchota',
  TP: 'Těžká pěchota',
  LS: 'Lehcí střelci',
  TS: 'Těžcí střelci',
  HR: 'Hraničáři',
  OS: 'Ostrostřelci',
  LJ: 'Lehká jízda',
  TJ: 'Těžká jízda',
  SJ: 'Střelecká jízda',
  LL: 'Lehká letka',
  TL: 'Těžká letka',
  DR: 'Druidi',
  KN: 'Kněží',
  MG: 'Mágové',
  BM: 'Bitevní mágové',
  SP: 'Speciální',
  ZEN: 'Ženisté',
  FEL: 'Felčaři',
  VS: 'Válečné stroje',
};

export interface Commander {
  name: string;
  level: number;
  skills?: string[];
  stars?: Record<string, number>;
}

export interface Unit {
  id: string;
  name: string;
  faction: Faction;
  origin: string;
  type: UnitType;

  // Combat stats
  zu: number;
  ru: number;
  thac0: number;
  ac: number;
  dmg: string;
  hp_per_soldier: number;
  initiative: number;
  initiative_secondary?: number;

  // Movement & endurance
  movement_priority: number;
  movement_hexes: number;
  fatigue: number;

  // Morale
  morale: number;
  survival_percent: number;

  // Counts
  count: number;
  max_count: number;

  // Ranged (optional)
  range?: number;
  ammo?: number;
  attacks_per_bk?: number;

  // Commander
  commander?: Commander;

  // Special
  special_abilities?: string[];
  notes?: string;
}

export type Terrain = 'open' | 'forest' | 'hills' | 'walls' | 'ford';
export type TimeOfDay = 'day' | 'night';

export type AttackerSide = 'army_a' | 'army_b';

export interface BattleConfig {
  iterations: number;
  maxBK: number;
  terrain: Terrain;
  timeOfDay: TimeOfDay;
  largeBattle: boolean;
  commanderBonuses: boolean;
  attackerSide: AttackerSide;
}

export interface UnitResult {
  name: string;
  original: number;
  avg_remaining: number;
  avg_dead: number;
  best_remaining: number;
  worst_remaining: number;
}

export interface ArmyLosses {
  total_soldiers: number;
  percent: number;
  by_unit: UnitResult[];
}

export interface SimulationResult {
  total_simulations: number;
  wins: {
    army_a: number;
    army_b: number;
    draw: number;
  };
  probability: {
    army_a_win: number;
    army_b_win: number;
    draw: number;
  };
  avg_duration_bk: number;
  avg_losses: {
    army_a: ArmyLosses;
    army_b: ArmyLosses;
  };
  bk_distribution: number[];
  key_factors: string[];
}

export interface BattleLogEntry {
  bk: number;
  attacker: string;
  defender: string;
  roll: number;
  needed: number;
  hit: boolean;
  damage: number;
  kills: number;
  critical?: 'hit' | 'miss';
  morale_check?: { rolled: number; needed: number; passed: boolean };
  fatigue_state?: 'fresh' | 'tired' | 'exhausted' | 'collapsed';
}

export const DEFAULT_CONFIG: BattleConfig = {
  iterations: 100,
  maxBK: 30,
  terrain: 'open',
  timeOfDay: 'day',
  largeBattle: false,
  commanderBonuses: true,
  attackerSide: 'army_a',
};

export const TERRAIN_MODIFIERS: Record<Terrain, { ac_bonus: number; thac0_penalty: number; description: string }> = {
  open: { ac_bonus: 0, thac0_penalty: 0, description: 'Otevřené pole' },
  forest: { ac_bonus: 2, thac0_penalty: 1, description: 'Les (+2 AC, +1 THAC0)' },
  hills: { ac_bonus: 1, thac0_penalty: 0, description: 'Kopce (+1 AC obránci)' },
  walls: { ac_bonus: 4, thac0_penalty: 2, description: 'Hradby (+4 AC, +2 THAC0)' },
  ford: { ac_bonus: 0, thac0_penalty: 2, description: 'Brod (+2 THAC0 útočníkovi)' },
};
