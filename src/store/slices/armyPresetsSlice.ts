import type { StateCreator } from 'zustand';
import type { BattleStore } from '../types';
import type { ArmyUnit } from './armySlice';
import { nextInstanceId, buildSpellState } from './armySlice';

export interface ArmyPresetEntry {
  id: string;
  name: string;
  count: number;
}

export interface ArmyPreset {
  name: string;
  units: ArmyPresetEntry[];
}

const STORAGE_KEY_A = 'army_presets_alliance';
const STORAGE_KEY_B = 'army_presets_enemy';

function loadPresets(key: string): ArmyPreset[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as ArmyPreset[];
  } catch {
    return [];
  }
}

function savePresets(key: string, presets: ArmyPreset[]) {
  localStorage.setItem(key, JSON.stringify(presets));
}

function armyToPresetEntries(army: ArmyUnit[]): ArmyPresetEntry[] {
  return army.map(u => ({ id: u.id, name: u.name, count: u.count }));
}

export interface ArmyPresetsSlice {
  presetsA: ArmyPreset[];
  presetsB: ArmyPreset[];
  savePreset: (side: 'alliance' | 'enemy', name: string) => void;
  loadPreset: (side: 'alliance' | 'enemy', presetName: string, availableUnits: import('../../engine/types').Unit[]) => void;
  deletePreset: (side: 'alliance' | 'enemy', presetName: string) => void;
}

export const createArmyPresetsSlice: StateCreator<BattleStore, [], [], ArmyPresetsSlice> = (set, get) => ({
  presetsA: loadPresets(STORAGE_KEY_A),
  presetsB: loadPresets(STORAGE_KEY_B),

  savePreset: (side, name) => {
    const army = side === 'alliance' ? get().armyA : get().armyB;
    const entries = armyToPresetEntries(army);
    const preset: ArmyPreset = { name, units: entries };
    const key = side === 'alliance' ? 'presetsA' : 'presetsB';
    const storageKey = side === 'alliance' ? STORAGE_KEY_A : STORAGE_KEY_B;

    set(s => {
      const existing = s[key].filter(p => p.name !== name);
      const updated = [...existing, preset];
      savePresets(storageKey, updated);
      return { [key]: updated };
    });
  },

  loadPreset: (side, presetName, availableUnits) => {
    const key = side === 'alliance' ? 'presetsA' : 'presetsB';
    const preset = get()[key].find(p => p.name === presetName);
    if (!preset) return;

    const unitMap = new Map(availableUnits.map(u => [u.id, u]));
    const army: ArmyUnit[] = [];

    for (const entry of preset.units) {
      const base = unitMap.get(entry.id);
      if (!base) continue;
      army.push({
        ...base,
        count: entry.count,
        instanceId: nextInstanceId(base.id),
        ...buildSpellState(base),
      });
    }

    if (side === 'alliance') {
      set({ armyA: army });
    } else {
      set({ armyB: army });
    }
  },

  deletePreset: (side, presetName) => {
    const key = side === 'alliance' ? 'presetsA' : 'presetsB';
    const storageKey = side === 'alliance' ? STORAGE_KEY_A : STORAGE_KEY_B;

    set(s => {
      const updated = s[key].filter(p => p.name !== presetName);
      savePresets(storageKey, updated);
      return { [key]: updated };
    });
  },
});
