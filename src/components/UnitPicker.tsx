import { useState, useMemo } from 'react';
import type { Unit, UnitType } from '../engine/types';
import { UNIT_TYPE_LABELS } from '../engine/types';
import { getOrigins } from '../data/alliance_units';
import { UnitCard } from './UnitCard';

interface UnitPickerProps {
  units: Unit[];
  onAdd: (unit: Unit) => void;
  selectedIds: string[];
  title: string;
  side: 'alliance' | 'enemy';
}

export function UnitPicker({ units, onAdd, selectedIds, title, side }: UnitPickerProps) {
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const origins = useMemo(() => getOrigins(units), [units]);
  const types = useMemo(() => [...new Set(units.map(u => u.type))].sort(), [units]);

  const filtered = useMemo(() => {
    return units.filter(u => {
      if (selectedIds.includes(u.id)) return false;
      if (originFilter !== 'all' && u.origin !== originFilter) return false;
      if (typeFilter !== 'all' && u.type !== typeFilter) return false;
      if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [units, selectedIds, originFilter, typeFilter, search]);

  const sideColor = side === 'alliance' ? 'alliance' : 'enemy';

  return (
    <div className="flex flex-col h-full">
      <h2 className={`text-lg font-bold mb-3 text-${sideColor}-light`}>{title}</h2>

      {/* Search */}
      <input
        type="text"
        placeholder="Hledat jednotku..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="bg-dark-surface border border-dark-border rounded px-3 py-2 text-sm text-parchment mb-2 w-full"
      />

      {/* Filters */}
      <div className="flex gap-2 mb-3">
        <select
          value={originFilter}
          onChange={e => setOriginFilter(e.target.value)}
          className="bg-dark-surface border border-dark-border rounded px-2 py-1 text-xs text-parchment flex-1"
        >
          <option value="all">Všechny frakce</option>
          {origins.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-dark-surface border border-dark-border rounded px-2 py-1 text-xs text-parchment flex-1"
        >
          <option value="all">Všechny typy</option>
          {types.map(t => (
            <option key={t} value={t}>{UNIT_TYPE_LABELS[t as UnitType] || t}</option>
          ))}
        </select>
      </div>

      {/* Unit list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 ? (
          <div className="text-center text-parchment-dark text-sm py-8">
            Žádné dostupné jednotky
          </div>
        ) : (
          filtered.map(unit => (
            <UnitCard
              key={unit.id}
              unit={unit}
              compact
              onClick={() => onAdd(unit)}
            />
          ))
        )}
      </div>

      <div className="text-xs text-parchment-dark mt-2 text-center">
        {filtered.length} jednotek · klikni pro přidání
      </div>
    </div>
  );
}
