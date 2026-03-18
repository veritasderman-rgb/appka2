import type { StateCreator } from 'zustand';
import type { BattleConfig, SimulationResult } from '../../engine/types';
import { DEFAULT_CONFIG } from '../../engine/types';
import { runHexBattle } from '../../engine/hexBattle';
import type { HexBattleResult } from '../../engine/hexBattle';
import type { BattleStore } from '../types';
import type { SimulationRequest } from '../../workers/simulationWorker';

export interface SimulationSlice {
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

/** Response message from simulationWorker */
type WorkerMessage =
  | { type: 'progress'; progress: number }
  | { type: 'result'; result: SimulationResult }
  | { type: 'error'; message: string };

export const createSimulationSlice: StateCreator<BattleStore, [], [], SimulationSlice> = (set, get) => ({
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

    const worker = new Worker(
      new URL('../../workers/simulationWorker.ts', import.meta.url),
      { type: 'module' },
    );

    const request: SimulationRequest = { unitsA: armyA, unitsB: armyB, config };
    worker.postMessage(request);

    worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        set({ simulationProgress: msg.progress });
      } else if (msg.type === 'result') {
        set({ result: msg.result, isSimulating: false, simulationProgress: 100, screen: 'results' });
        worker.terminate();
      } else if (msg.type === 'error') {
        // eslint-disable-next-line no-console
        console.error('[simulationWorker] Chyba simulace:', msg.message);
        set({ isSimulating: false, simulationProgress: 0 });
        worker.terminate();
      }
    });

    worker.addEventListener('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[simulationWorker] Worker error:', err.message);
      set({ isSimulating: false, simulationProgress: 0 });
      worker.terminate();
    });
  },
});
