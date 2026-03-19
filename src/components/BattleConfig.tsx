import type { AttackerSide, BattleConfig as BattleConfigType, Terrain, TimeOfDay } from '../engine/types';
import { TERRAIN_MODIFIERS } from '../engine/types';

interface BattleConfigProps {
  config: BattleConfigType;
  onChange: (c: Partial<BattleConfigType>) => void;
}

const selectCls =
  'bg-dark-surface border border-dark-border rounded-md px-2 py-2 text-sm text-parchment w-full focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-colors';

export function BattleConfigPanel({ config, onChange }: BattleConfigProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

      {/* ── Podmínky bitvy ─────────────────────────────── */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4">
        <p className="text-xs font-semibold text-parchment-dark uppercase tracking-wider mb-3">
          Podmínky bitvy
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-xs text-parchment-dark block mb-1">Útočí</label>
            <select
              value={config.attackerSide}
              onChange={e => onChange({ attackerSide: e.target.value as AttackerSide })}
              className={selectCls}
            >
              <option value="army_a">Spojenci</option>
              <option value="army_b">Nepřátelé</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-parchment-dark block mb-1">Terén</label>
            <select
              value={config.terrain}
              onChange={e => onChange({ terrain: e.target.value as Terrain })}
              className={selectCls}
            >
              {Object.entries(TERRAIN_MODIFIERS).map(([key, val]) => (
                <option key={key} value={key}>{val.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-parchment-dark block mb-1">Denní doba</label>
            <select
              value={config.timeOfDay}
              onChange={e => onChange({ timeOfDay: e.target.value as TimeOfDay })}
              className={selectCls}
            >
              <option value="day">☀ Den</option>
              <option value="night">☾ Noc</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2.5 text-sm text-parchment cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.largeBattle}
              onChange={e => onChange({ largeBattle: e.target.checked })}
              className="w-4 h-4 rounded accent-gold"
            />
            <span>Velká bitva <span className="text-parchment-dark text-xs">(&gt;10 000 vojáků)</span></span>
          </label>
          <label className="flex items-center gap-2.5 text-sm text-parchment cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.commanderBonuses}
              onChange={e => onChange({ commanderBonuses: e.target.checked })}
              className="w-4 h-4 rounded accent-gold"
            />
            <span>Velitelské bonusy</span>
          </label>
        </div>
      </div>

      {/* ── Monte Carlo ────────────────────────────────── */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold text-parchment-dark uppercase tracking-wider">
            Monte Carlo
          </p>
          <span className="text-xs text-parchment-dark/60 normal-case tracking-normal font-normal">
            (neplatí pro Hex Bitvu)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-parchment-dark block mb-1">Počet simulací</label>
            <select
              value={config.iterations}
              onChange={e => onChange({ iterations: parseInt(e.target.value) })}
              className={selectCls}
            >
              <option value={1}>1 — krok po kroku</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
            {config.iterations === 1 && (
              <p className="text-xs text-gold/70 mt-1">
                Výsledky zobrazí detailní průběh každého BK
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-parchment-dark block mb-1">Max. bojových kol</label>
            <select
              value={config.maxBK}
              onChange={e => onChange({ maxBK: parseInt(e.target.value) })}
              className={selectCls}
            >
              <option value={15}>15 BK</option>
              <option value={20}>20 BK</option>
              <option value={30}>30 BK</option>
              <option value={50}>50 BK</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-parchment-dark/50 mt-3 leading-relaxed">
          Více simulací = přesnější pravděpodobnosti, delší výpočet.
        </p>
      </div>

    </div>
  );
}
