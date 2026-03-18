import type { StateCreator } from 'zustand';
import type { Unit } from '../../engine/types';
import { validateUnits } from '../../engine/unitSchema';
import type { BattleStore } from '../types';

const STORAGE_VERSION = 1;

interface StorageWrapper {
  version: number;
  data: Unit[];
}

/** Load custom units from localStorage with version checking */
export function loadCustomUnits(faction: 'alliance' | 'enemy'): Unit[] {
  try {
    const raw = localStorage.getItem(`custom_${faction}_units`);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    // Support both old format (plain array) and new versioned format
    if (Array.isArray(parsed)) {
      // Legacy format — validate and migrate in-place
      const valid = validateUnits(parsed as unknown[]);
      saveCustomUnits(faction, valid);
      return valid;
    }

    const wrapper = parsed as StorageWrapper;
    if (wrapper.version !== STORAGE_VERSION) {
      // Future: run migrations here
      return wrapper.data ?? [];
    }
    return validateUnits(wrapper.data as unknown[]);
  } catch {
    return [];
  }
}

/** Save custom units to localStorage with versioning */
export function saveCustomUnits(faction: 'alliance' | 'enemy', units: Unit[]) {
  const wrapper: StorageWrapper = { version: STORAGE_VERSION, data: units };
  localStorage.setItem(`custom_${faction}_units`, JSON.stringify(wrapper));
}

export interface CustomUnitsSlice {
  customAllianceUnits: Unit[];
  customEnemyUnits: Unit[];
  addCustomUnit: (unit: Unit) => void;
  updateCustomUnit: (unit: Unit) => void;
  removeCustomUnit: (id: string) => void;
}

export const createCustomUnitsSlice: StateCreator<BattleStore, [], [], CustomUnitsSlice> = (set) => ({
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
});
