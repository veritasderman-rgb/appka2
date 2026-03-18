import { create } from 'zustand';
import type { BattleConfig, SimulationResult, Unit } from '../engine/types';
import { DEFAULT_CONFIG, MAGICAL_UNIT_TYPES } from '../engine/types';
import { runSimulation } from '../engine/simulation';
import { runHexBattle } from '../engine/hexBattle';
import type { HexBattleResult } from '../engine/hexBattle';
import { getCasterClassForUnitType, getAvailableSpells, snapCasterLevel } from '../data/spells';

type Screen = 'builder' | 'results' | 'units' | 'hexmap';

/** Spell state for a magical unit in an army */
export interface UnitSpellState {
  spellId: string;
  enabled: boolean;
}

/** Each army entry gets a unique instanceId so the same unit can be added multiple times. */
export interface ArmyUnit extends Unit {
  instanceId: string;
  /** Spell configuration (only for magical units) */
  spells?: UnitSpellState[];
  /** Resolved caster level for spell slots */
  casterLevel?: number;
}

let instanceCounter = 0;
function nextInstanceId(baseId: string): string {
  return `${baseId}__${++instanceCounter}`;
}

interface BattleState {
  screen: Screen;
  setScreen: (s: Screen) => void;

  armyA: ArmyUnit[];
  armyB: ArmyUnit[];
  addToArmyA: (unit: Unit) => void;
  addToArmyB: (unit: Unit) => void;
  removeFromArmyA: (instanceId: string) => void;
  removeFromArmyB: (instanceId: string) => void;
  updateUnitCount: (faction: 'alliance' | 'enemy', instanceId: string, count: number) => void;
  toggleSpell: (faction: 'alliance' | 'enemy', instanceId: string, spellId: string) => void;
  clearArmyA: () => void;
  clearArmyB: () => void;

  // Custom units
  customAllianceUnits: Unit[];
  customEnemyUnits: Unit[];
  addCustomUnit: (unit: Unit) => void;
  updateCustomUnit: (unit: Unit) => void;
  removeCustomUnit: (id: string) => void;

  config: BattleConfig;
  setConfig: (c: Partial<BattleConfig>) => void;

  result: SimulationResult | null;
  isSimulating: boolean;
  simulationProgress: number;

  hexResult: HexBattleResult | null;
  isHexSimulating: boolean;

  runBattle: () => void;
  runHexBattleAction: () => void;
}

// Load custom units from localStorage
function loadCustomUnits(faction: 'alliance' | 'enemy'): Unit[] {
  try {
    const data = localStorage.getItem(`custom_${faction}_units`);
    return data ? (JSON.parse(data) as Unit[]) : [];
  } catch {
    return [];
  }
}

function saveCustomUnits(faction: 'alliance' | 'enemy', units: Unit[]) {
  localStorage.setItem(`custom_${faction}_units`, JSON.stringify(units));
}

/** Build spell state for a unit if it's a magical type */
function buildSpellState(unit: Unit): { spells?: UnitSpellState[]; casterLevel?: number } {
  if (!MAGICAL_UNIT_TYPES.includes(unit.type)) return {};
  const cc = getCasterClassForUnitType(unit.type);
  if (!cc) return {};
  const level = unit.commander?.level ?? 6;
  const casterLevel = snapCasterLevel(level);
  const available = getAvailableSpells(cc, casterLevel);
  return {
    casterLevel,
    spells: available.map(s => ({ spellId: s.id, enabled: true })),
  };
}

export const useBattleStore = create<BattleState>((set, get) => ({
  screen: 'builder',
  setScreen: (s) => set({ screen: s }),

  armyA: [],
  armyB: [],

  addToArmyA: (unit) => {
    const { armyA } = get();
    const spellState = buildSpellState(unit);
    set({ armyA: [...armyA, { ...unit, instanceId: nextInstanceId(unit.id), ...spellState }] });
  },
  addToArmyB: (unit) => {
    const { armyB } = get();
    const spellState = buildSpellState(unit);
    set({ armyB: [...armyB, { ...unit, instanceId: nextInstanceId(unit.id), ...spellState }] });
  },
  removeFromArmyA: (instanceId) => set(s => ({ armyA: s.armyA.filter(u => u.instanceId !== instanceId) })),
  removeFromArmyB: (instanceId) => set(s => ({ armyB: s.armyB.filter(u => u.instanceId !== instanceId) })),

  updateUnitCount: (faction, instanceId, count) => {
    const clampedCount = Math.max(0, count);
    if (faction === 'alliance') {
      set(s => ({
        armyA: s.armyA.map(u => u.instanceId === instanceId ? { ...u, count: clampedCount } : u),
      }));
    } else {
      set(s => ({
        armyB: s.armyB.map(u => u.instanceId === instanceId ? { ...u, count: clampedCount } : u),
      }));
    }
  },

  toggleSpell: (faction, instanceId, spellId) => {
    const key = faction === 'alliance' ? 'armyA' : 'armyB';
    set(s => ({
      [key]: s[key].map(u =>
        u.instanceId === instanceId && u.spells
          ? { ...u, spells: u.spells.map(sp => sp.spellId === spellId ? { ...sp, enabled: !sp.enabled } : sp) }
          : u
      ),
    }));
  },

  // Custom units
  customAllianceUnits: loadCustomUnits('alliance'),
  customEnemyUnits: loadCustomUnits('enemy'),

  addCustomUnit: (unit) => {
    if (unit.faction === 'alliance') {
      set(s => {
        const updated = [...s.customAllianceUnits, unit];
        saveCustomUnits('alliance', updated);
        return { customAllianceUnits: updated };
      });
    } else {
      set(s => {
        const updated = [...s.customEnemyUnits, unit];
        saveCustomUnits('enemy', updated);
        return { customEnemyUnits: updated };
      });
    }
  },

  updateCustomUnit: (unit) => {
    if (unit.faction === 'alliance') {
      set(s => {
        const updated = s.customAllianceUnits.map(u => u.id === unit.id ? unit : u);
        saveCustomUnits('alliance', updated);
        return { customAllianceUnits: updated };
      });
    } else {
      set(s => {
        const updated = s.customEnemyUnits.map(u => u.id === unit.id ? unit : u);
        saveCustomUnits('enemy', updated);
        return { customEnemyUnits: updated };
      });
    }
  },

  removeCustomUnit: (id) => {
    set(s => {
      const updatedAlliance = s.customAllianceUnits.filter(u => u.id !== id);
      const updatedEnemy = s.customEnemyUnits.filter(u => u.id !== id);
      saveCustomUnits('alliance', updatedAlliance);
      saveCustomUnits('enemy', updatedEnemy);
      return { customAllianceUnits: updatedAlliance, customEnemyUnits: updatedEnemy };
    });
  },

  clearArmyA: () => set({ armyA: [] }),
  clearArmyB: () => set({ armyB: [] }),

  config: DEFAULT_CONFIG,
  setConfig: (c) => set(s => ({ config: { ...s.config, ...c } })),

  result: null,
  isSimulating: false,
  simulationProgress: 0,

  hexResult: null,
  isHexSimulating: false,

  runHexBattleAction: () => {
    const { armyA, armyB, config } = get();
    if (armyA.length === 0 || armyB.length === 0) return;
    set({ isHexSimulating: true });
    setTimeout(() => {
      const hexResult = runHexBattle(armyA, armyB, config);
      set({ hexResult, isHexSimulating: false, screen: 'hexmap' });
    }, 50);
  },

  runBattle: () => {
    const { armyA, armyB, config } = get();
    if (armyA.length === 0 || armyB.length === 0) return;

    set({ isSimulating: true, simulationProgress: 0 });

    // Use setTimeout to not block UI
    setTimeout(() => {
      const result = runSimulation(armyA, armyB, config, (p) => {
        set({ simulationProgress: p });
      });
      set({ result, isSimulating: false, simulationProgress: 100, screen: 'results' });
    }, 50);
  },
}));
