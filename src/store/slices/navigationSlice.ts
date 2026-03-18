import type { StateCreator } from 'zustand';
import type { BattleStore } from '../types';

export type Screen = 'builder' | 'results' | 'units' | 'hexmap';

export interface NavigationSlice {
  screen: Screen;
  setScreen: (s: Screen) => void;
}

export const createNavigationSlice: StateCreator<BattleStore, [], [], NavigationSlice> = (set) => ({
  screen: 'builder',
  setScreen: (s) => set({ screen: s }),
});
