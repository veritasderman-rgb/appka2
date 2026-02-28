import type { AttackerSide, BattleConfig as BattleConfigType, Terrain, TimeOfDay } from '../engine/types';
import { TERRAIN_MODIFIERS } from '../engine/types';

interface BattleConfigProps {
  config: BattleConfigType;
  onChange: (c: Partial<BattleConfigType>) => void;
}

export function BattleConfigPanel({ config, onChange }: BattleConfigProps) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-4">
      <h3 className="text-gold font-bold mb-3">Nastavení simulace</h3>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Attacker side */}
        <div>
          <label className="text-xs text-parchment-dark block mb-1">Útočník</label>
          <select
            value={config.attackerSide}
            onChange={e => onChange({ attackerSide: e.target.value as AttackerSide })}
            className="bg-dark-surface border border-dark-border rounded px-2 py-1.5 text-sm text-parchment w-full"
          >
            <option value="army_a">Spojenci útočí</option>
            <option value="army_b">Nepřátelé útočí</option>
          </select>
        </div>

        {/* Iterations */}
        <div>
          <label className="text-xs text-parchment-dark block mb-1">Iterací</label>
          <select
            value={config.iterations}
            onChange={e => onChange({ iterations: parseInt(e.target.value) })}
            className="bg-dark-surface border border-dark-border rounded px-2 py-1.5 text-sm text-parchment w-full"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>

        {/* Max BK */}
        <div>
          <label className="text-xs text-parchment-dark block mb-1">Max BK</label>
          <select
            value={config.maxBK}
            onChange={e => onChange({ maxBK: parseInt(e.target.value) })}
            className="bg-dark-surface border border-dark-border rounded px-2 py-1.5 text-sm text-parchment w-full"
          >
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Terrain */}
        <div>
          <label className="text-xs text-parchment-dark block mb-1">Terén</label>
          <select
            value={config.terrain}
            onChange={e => onChange({ terrain: e.target.value as Terrain })}
            className="bg-dark-surface border border-dark-border rounded px-2 py-1.5 text-sm text-parchment w-full"
          >
            {Object.entries(TERRAIN_MODIFIERS).map(([key, val]) => (
              <option key={key} value={key}>{val.description}</option>
            ))}
          </select>
        </div>

        {/* Time */}
        <div>
          <label className="text-xs text-parchment-dark block mb-1">Denní doba</label>
          <select
            value={config.timeOfDay}
            onChange={e => onChange({ timeOfDay: e.target.value as TimeOfDay })}
            className="bg-dark-surface border border-dark-border rounded px-2 py-1.5 text-sm text-parchment w-full"
          >
            <option value="day">Den</option>
            <option value="night">Noc</option>
          </select>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-4 mt-3">
        <label className="flex items-center gap-2 text-sm text-parchment cursor-pointer">
          <input
            type="checkbox"
            checked={config.largeBattle}
            onChange={e => onChange({ largeBattle: e.target.checked })}
            className="accent-gold"
          />
          Velká bitva (&gt;10000)
        </label>
        <label className="flex items-center gap-2 text-sm text-parchment cursor-pointer">
          <input
            type="checkbox"
            checked={config.commanderBonuses}
            onChange={e => onChange({ commanderBonuses: e.target.checked })}
            className="accent-gold"
          />
          Velitelské bonusy
        </label>
      </div>
    </div>
  );
}
