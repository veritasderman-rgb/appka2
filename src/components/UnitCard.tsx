import type { Unit } from '../engine/types';
import { UNIT_TYPE_LABELS } from '../engine/types';
import type { ArmyUnit } from '../store/battleStore';

interface UnitCardProps {
  unit: Unit | ArmyUnit;
  onClick?: () => void;
  onRemove?: () => void;
  onCountChange?: (count: number) => void;
  compact?: boolean;
  selected?: boolean;
}

export function UnitCard({ unit, onClick, onRemove, onCountChange, compact, selected }: UnitCardProps) {
  if (compact) {
    return (
      <div
        className={`border rounded-lg p-2 cursor-pointer transition-all ${
          selected
            ? 'border-gold bg-dark-hover'
            : 'border-dark-border bg-dark-card hover:border-gold/50 hover:bg-dark-hover'
        }`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold text-gold truncate">{unit.name}</div>
            <div className="text-xs text-parchment-dark">
              {UNIT_TYPE_LABELS[unit.type]} · {unit.origin} · ZU {unit.zu}
            </div>
          </div>
          <div className="text-right shrink-0 text-xs">
            <div>{unit.count} mužů</div>
            <div className="text-parchment-dark">
              T{unit.thac0} AC{unit.ac}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-dark-border rounded-lg bg-dark-card overflow-hidden">
      {/* Header */}
      <div className="bg-dark-surface px-3 py-2 border-b border-dark-border flex items-center justify-between">
        <div>
          <h3 className="text-gold font-bold">{unit.name}</h3>
          <div className="text-xs text-parchment-dark">
            {UNIT_TYPE_LABELS[unit.type]} · {unit.origin} · ZU {unit.zu}
          </div>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-blood-light hover:text-red-400 text-lg px-2"
            title="Odebrat"
          >
            ×
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="p-3">
        {unit.commander && (
          <div className="text-xs text-parchment mb-2">
            Velitel: <span className="text-gold-light">{unit.commander.name}</span> (úr. {unit.commander.level})
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center text-sm mb-2">
          <StatBox label="THAC0" value={unit.thac0} />
          <StatBox label="AC" value={unit.ac} />
          <StatBox label="DMG" value={unit.dmg} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm mb-2">
          <StatBox label="INI" value={unit.initiative_secondary ? `${unit.initiative}/${unit.initiative_secondary}` : unit.initiative} />
          <StatBox label="HP/v" value={unit.hp_per_soldier} />
          <StatBox label="Morálka" value={unit.morale} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm mb-2">
          <StatBox label="Únava" value={`${unit.fatigue} BK`} />
          <StatBox label="Pohyb" value={`${unit.movement_hexes} hex`} />
          <StatBox label="Priorita" value={unit.movement_priority} />
        </div>

        {unit.range && (
          <div className="text-xs text-parchment-dark mt-1">
            Dostřel: {unit.range} hex · Střely: {unit.ammo} · Útoky/BK: {unit.attacks_per_bk}
          </div>
        )}

        {unit.special_abilities && unit.special_abilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {unit.special_abilities.map(a => (
              <span key={a} className="text-xs bg-dark-surface px-2 py-0.5 rounded text-gold-light border border-dark-border">
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Count control */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-parchment-dark">Počet:</span>
          {onCountChange ? (
            <input
              type="number"
              value={unit.count}
              min={0}
              onChange={e => onCountChange(parseInt(e.target.value) || 0)}
              className="bg-dark-surface border border-dark-border rounded px-2 py-1 w-24 text-sm text-parchment"
            />
          ) : (
            <span className="text-sm font-bold text-parchment">{unit.count}</span>
          )}
          <span className="text-xs text-parchment-dark">(výchozí: {unit.max_count})</span>
        </div>

        {unit.notes && (
          <div className="text-xs text-parchment-dark mt-2 italic">{unit.notes}</div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-dark-surface rounded px-2 py-1 border border-dark-border">
      <div className="text-xs text-parchment-dark">{label}</div>
      <div className="text-parchment font-bold text-sm">{value}</div>
    </div>
  );
}
