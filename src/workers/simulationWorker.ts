/**
 * Web Worker pro Monte Carlo simulaci.
 * Spouští runSimulation() mimo hlavní vlákno, takže neblokuje UI.
 *
 * Protokol:
 * - Worker přijme zprávu typu SimulationRequest
 * - Posílá průběžné zprávy typu { type: 'progress', progress: number }
 * - Po dokončení pošle { type: 'result', result: SimulationResult }
 * - V případě chyby pošle { type: 'error', message: string }
 */

import { runSimulation } from '../engine/simulation';
import type { BattleConfig, Unit } from '../engine/types';

export interface SimulationRequest {
  unitsA: Unit[];
  unitsB: Unit[];
  config: BattleConfig;
}

self.addEventListener('message', (event: MessageEvent<SimulationRequest>) => {
  const { unitsA, unitsB, config } = event.data;
  try {
    const result = runSimulation(unitsA, unitsB, config, (progress) => {
      self.postMessage({ type: 'progress', progress });
    });
    self.postMessage({ type: 'result', result });
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
});
