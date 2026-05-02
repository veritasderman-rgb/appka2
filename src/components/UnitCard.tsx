import type { Unit } from '../engine/types';
import { UNIT_TYPE_LABELS } from '../engine/types';
import type { ArmyUnit } from '../store/battleStore';
import { SpellSelector } from './SpellSelector';

interface UnitCardProps {
  unit: Unit | ArmyUnit;
  onClick?: () => void;
  onRemove?: () => void;
  onCountChange?: (count: number) => void;
  onStatChange?: (field: string, value: number | string) => void;
  onSpellToggle?: (spellId: string) => void;
  compact?: boolean;
  selected?: boolean;
}

export function UnitCard({ unit, onClick, onRemove, onCountChange, onStatChange, onSpellToggle, compact, selected }: UnitCardProps) {
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

  const editable = !!onStatChange;

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
          <EditableStat label="THAC0" value={unit.thac0} field="thac0" editable={editable} onChange={onStatChange} type="number" />
          <EditableStat label="AC" value={unit.ac} field="ac" editable={editable} onChange={onStatChange} type="number" />
          <EditableStat label="DMG" value={unit.dmg} field="dmg" editable={editable} onChange={onStatChange} type="text" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm mb-2">
          <EditableStat label="INI" value={unit.initiative} field="initiative" editable={editable} onChange={onStatChange} type="number" />
          <EditableStat label="HP/v" value={unit.hp_per_soldier} field="hp_per_soldier" editable={editable} onChange={onStatChange} type="number" />
          <EditableStat label="Morálka" value={unit.morale} field="morale" editable={editable} onChange={onStatChange} type="number" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm mb-2">
          <EditableStat label="Únava" value={unit.fatigue} field="fatigue" editable={editable} onChange={onStatChange} type="number" suffix=" BK" />
          <StatBox label="Pohyb" value={`${unit.movement_hexes} hex`} />
          <StatBox label="Priorita" value={unit.movement_priority} />
        </div>

        {unit.range && (
          <div className="text-xs text-parchment-dark mt-1">
            Dostřel: {unit.range} hex · Střely: {unit.ammo} · Útoky/BK: {unit.attacks_per_bk}
          </div>
        )}

        {(unit.special_abilities?.length || unit.flying) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {unit.flying && (
              <span className="text-xs bg-sky-900/30 px-2 py-0.5 rounded text-sky-300 border border-sky-700/50">
                🦅 Letecká {unit.flyby ? '(Průlet)' : '(Déšť střel)'}
              </span>
            )}
            {unit.special_abilities?.map(a => (
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

        {/* Spell selector for magical army units */}
        {onSpellToggle && 'spells' in unit && unit.spells && unit.spells.length > 0 && (
          <SpellSelector spells={unit.spells} onToggle={onSpellToggle} unitCount={unit.count} unitType={unit.type} />
        )}
      </div>
    </div>
  );
}

function EditableStat({ label, value, field, editable, onChange, type, suffix }: {
  label: string;
  value: string | number;
  field: string;
  editable: boolean;
  onChange?: (field: string, value: number | string) => void;
  type: 'number' | 'text';
  suffix?: string;
}) {
  if (!editable || !onChange) {
    return <StatBox label={label} value={suffix ? `${value}${suffix}` : value} />;
  }

  return (
    <div className="bg-dark-surface rounded px-1 py-1 border border-dark-border">
      <div className="text-xs text-parchment-dark">{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => {
          const v = type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value;
          onChange(field, v);
        }}
        className="w-full bg-transparent text-parchment font-bold text-sm text-center outline-none border-b border-transparent focus:border-gold/50"
      />
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
