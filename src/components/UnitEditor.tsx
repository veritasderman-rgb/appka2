import { useState } from 'react';
import type { Unit, UnitType, Faction } from '../engine/types';
import { UNIT_TYPE_LABELS } from '../engine/types';
import { useBattleStore } from '../store/battleStore';

const UNIT_TYPES = Object.keys(UNIT_TYPE_LABELS) as UnitType[];

function createEmptyUnit(faction: Faction): Unit {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    faction,
    origin: '',
    type: 'LP',
    zu: 2,
    ru: 4,
    thac0: 16,
    ac: 7,
    dmg: '1k6',
    hp_per_soldier: 10,
    initiative: 4,
    movement_priority: 12,
    movement_hexes: 1,
    fatigue: 8,
    morale: 9,
    survival_percent: 10,
    count: 100,
    max_count: 100,
  };
}

interface UnitFormProps {
  unit: Unit;
  onChange: (unit: Unit) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
}

function UnitForm({ unit, onChange, onSave, onCancel, isNew }: UnitFormProps) {
  const update = <K extends keyof Unit>(key: K, value: Unit[K]) => {
    onChange({ ...unit, [key]: value });
  };

  const canSave = unit.name.trim() !== '' && unit.origin.trim() !== '';

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-4">
      <h3 className="text-gold font-bold text-lg">
        {isNew ? 'Nová jednotka' : `Upravit: ${unit.name}`}
      </h3>

      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Název *">
          <input
            type="text"
            value={unit.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Např. Elfí lučištníci"
            className="input-field"
          />
        </Field>

        <Field label="Frakce">
          <select
            value={unit.faction}
            onChange={e => update('faction', e.target.value as Faction)}
            className="input-field"
          >
            <option value="alliance">Spojenci</option>
            <option value="enemy">Nepřátelé</option>
          </select>
        </Field>

        <Field label="Původ *">
          <input
            type="text"
            value={unit.origin}
            onChange={e => update('origin', e.target.value)}
            placeholder="Např. Tethyr, Cormyr..."
            className="input-field"
          />
        </Field>

        <Field label="Typ jednotky">
          <select
            value={unit.type}
            onChange={e => update('type', e.target.value as UnitType)}
            className="input-field"
          >
            {UNIT_TYPES.map(t => (
              <option key={t} value={t}>{t} – {UNIT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </Field>

        <Field label="Počet vojáků">
          <input
            type="number"
            value={unit.count}
            min={1}
            onChange={e => {
              const v = parseInt(e.target.value) || 1;
              update('count', v);
              if (v > unit.max_count) update('max_count', v);
            }}
            className="input-field"
          />
        </Field>

        <Field label="Max. počet">
          <input
            type="number"
            value={unit.max_count}
            min={1}
            onChange={e => update('max_count', parseInt(e.target.value) || 1)}
            className="input-field"
          />
        </Field>
      </div>

      {/* Combat stats */}
      <div>
        <h4 className="text-parchment font-bold text-sm mb-2 border-b border-dark-border pb-1">Bojové statistiky</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Field label="ZU">
            <input type="number" value={unit.zu} onChange={e => update('zu', parseInt(e.target.value) || 0)} className="input-field" />
          </Field>
          <Field label="RU">
            <input type="number" value={unit.ru} onChange={e => update('ru', parseInt(e.target.value) || 0)} className="input-field" />
          </Field>
          <Field label="THAC0">
            <input type="number" value={unit.thac0} onChange={e => update('thac0', parseInt(e.target.value) || 0)} className="input-field" />
          </Field>
          <Field label="AC">
            <input type="number" value={unit.ac} onChange={e => update('ac', parseInt(e.target.value) || 0)} className="input-field" />
          </Field>
          <Field label="DMG">
            <input type="text" value={unit.dmg} onChange={e => update('dmg', e.target.value)} placeholder="1k6+2" className="input-field" />
          </Field>
          <Field label="HP/voják">
            <input type="number" value={unit.hp_per_soldier} min={1} onChange={e => update('hp_per_soldier', parseInt(e.target.value) || 1)} className="input-field" />
          </Field>
        </div>
      </div>

      {/* Movement & other stats */}
      <div>
        <h4 className="text-parchment font-bold text-sm mb-2 border-b border-dark-border pb-1">Pohyb a vytrvalost</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Field label="Iniciativa">
            <input type="number" value={unit.initiative} onChange={e => update('initiative', parseInt(e.target.value) || 0)} className="input-field" />
          </Field>
          <Field label="Ini. sekundární">
            <input type="number" value={unit.initiative_secondary ?? ''} onChange={e => {
              const v = e.target.value;
              update('initiative_secondary', v === '' ? undefined : parseInt(v) || 0);
            }} className="input-field" placeholder="-" />
          </Field>
          <Field label="Priorita pohybu">
            <input type="number" value={unit.movement_priority} onChange={e => update('movement_priority', parseInt(e.target.value) || 0)} className="input-field" />
          </Field>
          <Field label="Pohyb (hex)">
            <input type="number" value={unit.movement_hexes} min={0} onChange={e => update('movement_hexes', parseInt(e.target.value) || 0)} className="input-field" />
          </Field>
          <Field label="Únava (BK)">
            <input type="number" value={unit.fatigue} min={1} onChange={e => update('fatigue', parseInt(e.target.value) || 1)} className="input-field" />
          </Field>
          <Field label="Morálka">
            <input type="number" value={unit.morale} onChange={e => update('morale', parseInt(e.target.value) || 0)} className="input-field" />
          </Field>
        </div>
      </div>

      {/* Ranged */}
      <div>
        <h4 className="text-parchment font-bold text-sm mb-2 border-b border-dark-border pb-1">Střelba (volitelné)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Dostřel (hex)">
            <input type="number" value={unit.range ?? ''} onChange={e => {
              const v = e.target.value;
              update('range', v === '' ? undefined : parseInt(v) || 0);
            }} className="input-field" placeholder="Žádný" />
          </Field>
          <Field label="Střely">
            <input type="number" value={unit.ammo ?? ''} onChange={e => {
              const v = e.target.value;
              update('ammo', v === '' ? undefined : parseInt(v) || 0);
            }} className="input-field" placeholder="-" />
          </Field>
          <Field label="Útoky/BK">
            <input type="number" value={unit.attacks_per_bk ?? ''} onChange={e => {
              const v = e.target.value;
              update('attacks_per_bk', v === '' ? undefined : parseInt(v) || 0);
            }} className="input-field" placeholder="-" />
          </Field>
        </div>
      </div>

      {/* Survival % and special */}
      <div>
        <h4 className="text-parchment font-bold text-sm mb-2 border-b border-dark-border pb-1">Další</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="% přežití (survival)">
            <input type="number" value={unit.survival_percent} min={0} max={100} onChange={e => update('survival_percent', parseInt(e.target.value) || 0)} className="input-field" />
          </Field>
          <Field label="Speciální schopnosti (čárkou)">
            <input
              type="text"
              value={(unit.special_abilities ?? []).join(', ')}
              onChange={e => update('special_abilities', e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined)}
              placeholder="Hradba kopí, Želva..."
              className="input-field"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Poznámky">
            <input
              type="text"
              value={unit.notes ?? ''}
              onChange={e => update('notes', e.target.value || undefined)}
              placeholder="Volitelné poznámky..."
              className="input-field"
            />
          </Field>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-dark-border">
        <button
          onClick={onSave}
          disabled={!canSave}
          className={`px-4 py-2 rounded font-bold text-sm transition-all ${
            canSave
              ? 'bg-gold text-dark-bg hover:bg-gold-light'
              : 'bg-dark-surface text-parchment-dark cursor-not-allowed'
          }`}
        >
          {isNew ? 'Vytvořit jednotku' : 'Uložit změny'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded font-bold text-sm border border-dark-border text-parchment-dark hover:text-parchment transition-all"
        >
          Zrušit
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-parchment-dark block mb-1">{label}</span>
      {children}
    </label>
  );
}

export function UnitEditor() {
  const { customAllianceUnits, customEnemyUnits, addCustomUnit, updateCustomUnit, removeCustomUnit } = useBattleStore();
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [factionFilter, setFactionFilter] = useState<'all' | 'alliance' | 'enemy'>('all');

  const allCustomUnits = [...customAllianceUnits, ...customEnemyUnits];
  const filteredUnits = factionFilter === 'all'
    ? allCustomUnits
    : allCustomUnits.filter(u => u.faction === factionFilter);

  const handleNew = (faction: Faction) => {
    setEditingUnit(createEmptyUnit(faction));
    setIsNew(true);
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit({ ...unit });
    setIsNew(false);
  };

  const handleSave = () => {
    if (!editingUnit) return;
    if (isNew) {
      addCustomUnit(editingUnit);
    } else {
      updateCustomUnit(editingUnit);
    }
    setEditingUnit(null);
    setIsNew(false);
  };

  const handleDelete = (unit: Unit) => {
    if (confirm(`Opravdu smazat jednotku "${unit.name}"?`)) {
      removeCustomUnit(unit.id);
      if (editingUnit?.id === unit.id) {
        setEditingUnit(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gold">Správa vlastních jednotek</h2>
          <p className="text-sm text-parchment-dark">Vytvářej a upravuj vlastní jednotky, které budou dostupné v sestavovači armád.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleNew('alliance')}
            className="px-3 py-2 rounded text-sm font-bold bg-alliance/20 border border-alliance text-alliance-light hover:bg-alliance/30 transition-all"
          >
            + Spojenec
          </button>
          <button
            onClick={() => handleNew('enemy')}
            className="px-3 py-2 rounded text-sm font-bold bg-enemy/20 border border-enemy text-enemy-light hover:bg-enemy/30 transition-all"
          >
            + Nepřítel
          </button>
        </div>
      </div>

      {/* Editor form */}
      {editingUnit && (
        <UnitForm
          unit={editingUnit}
          onChange={setEditingUnit}
          onSave={handleSave}
          onCancel={() => { setEditingUnit(null); setIsNew(false); }}
          isNew={isNew}
        />
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFactionFilter('all')}
          className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${
            factionFilter === 'all'
              ? 'bg-gold/10 border-gold text-gold'
              : 'border-dark-border text-parchment-dark hover:text-parchment'
          }`}
        >
          Všechny ({allCustomUnits.length})
        </button>
        <button
          onClick={() => setFactionFilter('alliance')}
          className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${
            factionFilter === 'alliance'
              ? 'bg-alliance/20 border-alliance text-alliance-light'
              : 'border-dark-border text-parchment-dark hover:text-parchment'
          }`}
        >
          Spojenci ({customAllianceUnits.length})
        </button>
        <button
          onClick={() => setFactionFilter('enemy')}
          className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${
            factionFilter === 'enemy'
              ? 'bg-enemy/20 border-enemy text-enemy-light'
              : 'border-dark-border text-parchment-dark hover:text-parchment'
          }`}
        >
          Nepřátelé ({customEnemyUnits.length})
        </button>
      </div>

      {/* Unit list */}
      {filteredUnits.length === 0 ? (
        <div className="text-center text-parchment-dark text-sm py-12 border border-dashed border-dark-border rounded-lg">
          {allCustomUnits.length === 0
            ? 'Zatím nemáš žádné vlastní jednotky. Klikni na tlačítko výše a vytvoř první!'
            : 'Žádné jednotky pro vybraný filtr.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredUnits.map(unit => (
            <div
              key={unit.id}
              className="border border-dark-border rounded-lg bg-dark-card overflow-hidden"
            >
              {/* Header */}
              <div className={`px-3 py-2 border-b border-dark-border flex items-center justify-between ${
                unit.faction === 'alliance' ? 'bg-alliance/10' : 'bg-enemy/10'
              }`}>
                <div>
                  <h3 className="text-gold font-bold">{unit.name}</h3>
                  <div className="text-xs text-parchment-dark">
                    {UNIT_TYPE_LABELS[unit.type]} · {unit.origin} · {unit.faction === 'alliance' ? 'Spojenec' : 'Nepřítel'}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(unit)}
                    className="text-gold hover:text-gold-light text-sm px-2 py-1 border border-dark-border rounded hover:bg-dark-hover transition-all"
                    title="Upravit"
                  >
                    Upravit
                  </button>
                  <button
                    onClick={() => handleDelete(unit)}
                    className="text-blood-light hover:text-red-400 text-sm px-2 py-1 border border-dark-border rounded hover:bg-dark-hover transition-all"
                    title="Smazat"
                  >
                    Smazat
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="p-3">
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <StatBox label="THAC0" value={unit.thac0} />
                  <StatBox label="AC" value={unit.ac} />
                  <StatBox label="DMG" value={unit.dmg} />
                  <StatBox label="Počet" value={unit.count} />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-sm mt-2">
                  <StatBox label="ZU" value={unit.zu} />
                  <StatBox label="HP/v" value={unit.hp_per_soldier} />
                  <StatBox label="INI" value={unit.initiative} />
                  <StatBox label="Morálka" value={unit.morale} />
                </div>
                {unit.range && (
                  <div className="text-xs text-parchment-dark mt-2">
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
              </div>
            </div>
          ))}
        </div>
      )}
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
