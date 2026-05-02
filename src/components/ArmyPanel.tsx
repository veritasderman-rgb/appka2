import type { ArmyUnit } from '../store/battleStore';
import { useBattleStore } from '../store/battleStore';
import type { ArmyPreset } from '../store/slices/armyPresetsSlice';
import type { Unit } from '../engine/types';
import { UnitCard } from './UnitCard';
import { avgDamage } from '../engine/dice';
import { useState } from 'react';

interface ArmyPanelProps {
  units: ArmyUnit[];
  onRemove: (instanceId: string) => void;
  onCountChange: (instanceId: string, count: number) => void;
  onStatChange: (instanceId: string, field: string, value: number | string) => void;
  onSpellToggle: (instanceId: string, spellId: string) => void;
  onClear: () => void;
  title: string;
  side: 'alliance' | 'enemy';
  isAttacker?: boolean;
  availableUnits: Unit[];
}

export function ArmyPanel({ units, onRemove, onCountChange, onStatChange, onSpellToggle, onClear, title, side, isAttacker, availableUnits }: ArmyPanelProps) {
  const { presetsA, presetsB, savePreset, loadPreset, deletePreset } = useBattleStore();
  const presets: ArmyPreset[] = side === 'alliance' ? presetsA : presetsB;
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const totalSoldiers = units.reduce((s, u) => s + u.count, 0);
  const avgZU = totalSoldiers > 0
    ? (units.reduce((s, u) => s + u.zu * u.count, 0) / totalSoldiers).toFixed(1)
    : '0';

  const totalDmgPerBK = units.reduce((s, u) => {
    const dmg = avgDamage(u.dmg) * u.count;
    return s + dmg;
  }, 0);

  const sideColor = side === 'alliance' ? 'alliance' : 'enemy';

  const handleSave = () => {
    const name = presetName.trim();
    if (!name || units.length === 0) return;
    savePreset(side, name);
    setPresetName('');
  };

  const handleLoad = (name: string) => {
    loadPreset(side, name, availableUnits);
    setShowPresets(false);
  };

  const handleDelete = (name: string) => {
    deletePreset(side, name);
  };

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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="text-xs text-parchment-dark hover:text-gold border border-dark-border rounded px-2 py-1"
            title="Uložená uskupení"
          >
            Uskupení ({presets.length})
          </button>
          {units.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-blood-light hover:text-red-400 border border-blood/30 rounded px-2 py-1"
            >
              Vyčistit
            </button>
          )}
        </div>
      </div>

      {/* Presets panel */}
      {showPresets && (
        <div className="mb-3 bg-dark-surface border border-dark-border rounded-lg p-2 space-y-2">
          {/* Save */}
          <div className="flex gap-1">
            <input
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Název uskupení…"
              className="flex-1 px-2 py-1 rounded bg-dark-card border border-dark-border text-parchment text-xs"
            />
            <button
              onClick={handleSave}
              disabled={!presetName.trim() || units.length === 0}
              className="text-xs px-2 py-1 rounded border border-gold/40 text-gold hover:bg-gold/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Uložit
            </button>
          </div>

          {/* List */}
          {presets.length === 0 ? (
            <p className="text-xs text-parchment-dark text-center py-1">Žádná uložená uskupení</p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {presets.map(p => (
                <div key={p.name} className="flex items-center justify-between bg-dark-card rounded px-2 py-1 border border-dark-border">
                  <button
                    onClick={() => handleLoad(p.name)}
                    className="text-xs text-parchment hover:text-gold truncate flex-1 text-left"
                    title={`Načíst: ${p.units.length} jednotek`}
                  >
                    {p.name} <span className="text-parchment-dark">({p.units.length})</span>
                  </button>
                  <button
                    onClick={() => handleDelete(p.name)}
                    className="text-xs text-blood-light hover:text-red-400 ml-2 shrink-0"
                    title="Smazat"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              onStatChange={(f, v) => onStatChange(unit.instanceId, f, v)}
              onSpellToggle={sid => onSpellToggle(unit.instanceId, sid)}
            />
          ))
        )}
      </div>
    </div>
  );
}
