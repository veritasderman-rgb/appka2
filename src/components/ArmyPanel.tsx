import type { ArmyUnit } from '../store/battleStore';
import { UnitCard } from './UnitCard';
import { avgDamage } from '../engine/dice';

interface ArmyPanelProps {
  units: ArmyUnit[];
  onRemove: (instanceId: string) => void;
  onCountChange: (instanceId: string, count: number) => void;
  onSpellToggle: (instanceId: string, spellId: string) => void;
  onClear: () => void;
  title: string;
  side: 'alliance' | 'enemy';
  isAttacker?: boolean;
}

export function ArmyPanel({ units, onRemove, onCountChange, onSpellToggle, onClear, title, side, isAttacker }: ArmyPanelProps) {
  const totalSoldiers = units.reduce((s, u) => s + u.count, 0);
  const avgZU = totalSoldiers > 0
    ? (units.reduce((s, u) => s + u.zu * u.count, 0) / totalSoldiers).toFixed(1)
    : '0';

  const totalDmgPerBK = units.reduce((s, u) => {
    const dmg = avgDamage(u.dmg) * u.count;
    return s + dmg;
  }, 0);

  const sideColor = side === 'alliance' ? 'alliance' : 'enemy';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className={`text-lg font-bold text-${sideColor}-light`}>{title}</h2>
          {isAttacker !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded border ${
              isAttacker
                ? 'border-blood/40 text-blood-light bg-blood/10'
                : 'border-alliance/40 text-parchment-dark bg-dark-surface'
            }`}>
              {isAttacker ? '⚔ útočník' : '🛡 obránce'}
            </span>
          )}
        </div>
        {units.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-blood-light hover:text-red-400 border border-blood/30 rounded px-2 py-1"
          >
            Vyčistit
          </button>
        )}
      </div>

      {/* Summary */}
      {units.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm">
          <div className="bg-dark-surface rounded p-2 border border-dark-border">
            <div className="text-xs text-parchment-dark">Vojáků</div>
            <div className="text-gold font-bold">{totalSoldiers.toLocaleString()}</div>
          </div>
          <div className="bg-dark-surface rounded p-2 border border-dark-border">
            <div className="text-xs text-parchment-dark">Prům. ZU</div>
            <div className="text-gold font-bold">{avgZU}</div>
          </div>
          <div className="bg-dark-surface rounded p-2 border border-dark-border">
            <div className="text-xs text-parchment-dark">DMG/BK</div>
            <div className="text-gold font-bold">{Math.round(totalDmgPerBK)}</div>
          </div>
        </div>
      )}

      {/* Units */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {units.length === 0 ? (
          <div className="text-center text-parchment-dark text-sm py-12 border border-dashed border-dark-border rounded-lg">
            Přidej jednotky z panelu vlevo
          </div>
        ) : (
          units.map(unit => (
            <UnitCard
              key={unit.instanceId}
              unit={unit}
              onRemove={() => onRemove(unit.instanceId)}
              onCountChange={c => onCountChange(unit.instanceId, c)}
              onSpellToggle={sid => onSpellToggle(unit.instanceId, sid)}
            />
          ))
        )}
      </div>
    </div>
  );
}
