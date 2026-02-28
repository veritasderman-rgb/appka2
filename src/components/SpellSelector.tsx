import type { UnitSpellState } from '../store/battleStore';
import { getSpellById } from '../data/spells';

interface SpellSelectorProps {
  spells: UnitSpellState[];
  onToggle: (spellId: string) => void;
}

export function SpellSelector({ spells, onToggle }: SpellSelectorProps) {
  if (spells.length === 0) return null;

  // Group spells by level
  const byLevel = new Map<number, Array<UnitSpellState & { name: string; school: string }>>();
  for (const s of spells) {
    const def = getSpellById(s.spellId);
    if (!def) continue;
    const list = byLevel.get(def.level) ?? [];
    list.push({ ...s, name: def.name, school: def.school });
    byLevel.set(def.level, list);
  }

  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const enabledCount = spells.filter(s => s.enabled).length;

  return (
    <div className="mt-3 border-t border-dark-border pt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gold-light">Kouzla</span>
        <span className="text-xs text-parchment-dark">{enabledCount}/{spells.length} aktivních</span>
      </div>
      <div className="space-y-2">
        {levels.map(level => (
          <div key={level}>
            <div className="text-xs text-parchment-dark font-bold mb-1">Úroveň {level}</div>
            <div className="space-y-0.5">
              {byLevel.get(level)!.map(spell => (
                <label
                  key={spell.spellId}
                  className="flex items-center gap-2 cursor-pointer py-0.5 px-1 rounded hover:bg-dark-hover transition-all"
                >
                  <input
                    type="checkbox"
                    checked={spell.enabled}
                    onChange={() => onToggle(spell.spellId)}
                    className="accent-gold shrink-0"
                  />
                  <span className={`text-xs ${spell.enabled ? 'text-parchment' : 'text-parchment-dark line-through'}`}>
                    {spell.name}
                  </span>
                  <span className="text-xs text-parchment-dark ml-auto shrink-0">
                    {spell.school}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
