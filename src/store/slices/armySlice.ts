import type { StateCreator } from 'zustand';
import type { Unit } from '../../engine/types';
import { MAGICAL_UNIT_TYPES } from '../../engine/types';
import { getCasterClassForUnitType, getAvailableSpells, snapCasterLevel } from '../../data/spells';
import type { BattleStore } from '../types';

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
export function nextInstanceId(baseId: string): string {
  return `${baseId}__${++instanceCounter}`;
}

/** Build spell state for a unit if it's a magical type */
export function buildSpellState(unit: Unit): { spells?: UnitSpellState[]; casterLevel?: number } {
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

export interface ArmySlice {
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
  loadAllVsAll: (allianceUnits: Unit[], enemyUnits: Unit[], defaultCount: number) => void;
}

export const createArmySlice: StateCreator<BattleStore, [], [], ArmySlice> = (set, get) => ({
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

  clearArmyA: () => set({ armyA: [] }),
  clearArmyB: () => set({ armyB: [] }),

  loadAllVsAll: (allAlliance, allEnemy, defaultCount) => {
    const toArmy = (units: Unit[]): ArmyUnit[] =>
      units.map(u => ({
        ...u,
        count: u.count > 0 ? u.count : defaultCount,
        instanceId: nextInstanceId(u.id),
        ...buildSpellState(u),
      }));
    set({ armyA: toArmy(allAlliance), armyB: toArmy(allEnemy) });
  },
});
