import type { UnitSpellState } from '../store/battleStore';
import { getSpellById } from '../data/spells';
import type { SpellCombatEffect, SpellEffectType } from '../data/spells';
import type { UnitType } from '../engine/types';

interface SpellSelectorProps {
  spells: UnitSpellState[];
  onToggle: (spellId: string) => void;
  unitCount?: number;
  unitType?: UnitType;
}

function getCastingMultiplier(unitType?: UnitType): number {
  if (unitType === 'BM') return 2;
  if (unitType === 'SP') return 3;
  return 1;
}

function formatScaling(combat: SpellCombatEffect, unitCount: number, unitType?: UnitType): string | null {
  if (!unitCount || unitCount === 0) return null;
  const mult = getCastingMultiplier(unitType);
  const affected = unitCount * mult;
  const multLabel = mult > 1 ? ` (×${mult})` : '';

  switch (combat.type) {
    case 'damage': {
      const totalDmg = (combat.avgDamage ?? 0) * affected;
      return `${unitCount} sesílatelů${multLabel} → ${totalDmg} celkový dmg`;
    }
    case 'heal': {
      const totalHeal = (combat.avgHeal ?? 0) * affected;
      return `${unitCount} sesílatelů${multLabel} → +${totalHeal} ŽP celkem`;
    }
    case 'buff':
      return `${affected} osob pokryto${multLabel} — škáluje s velikostí cíle`;
    case 'cc': {
      const frac = combat.disableFraction ?? 0.1;
      return `${affected} osob${multLabel} → ${Math.round(frac * 100)}% disable (škáluje s cílem)`;
    }
    case 'debuff': {
      const totalDmg = (combat.avgDamage ?? 0) * affected;
      return `${unitCount} sesílatelů${multLabel} → ${totalDmg} dmg + debuff`;
    }
    default:
      return null;
  }
}

const EFFECT_LABELS: Record<SpellEffectType, string> = {
  damage: 'Útok',
  heal: 'Léčení',
  buff: 'Posílení',
  cc: 'Zneschopnění',
  debuff: 'Oslabení',
  utility: 'Podpůrné',
};

const EFFECT_COLORS: Record<SpellEffectType, string> = {
  damage: 'text-blood-light',
  heal: 'text-green-400',
  buff: 'text-gold',
  cc: 'text-purple-400',
  debuff: 'text-orange-400',
  utility: 'text-parchment-dark',
};

const EFFECT_ICONS: Record<SpellEffectType, string> = {
  damage: '🔥',
  heal: '💚',
  buff: '✨',
  cc: '🌀',
  debuff: '💀',
  utility: '⚙',
};

function formatEffect(combat: SpellCombatEffect): string {
  const parts: string[] = [];

  switch (combat.type) {
    case 'damage':
      if (combat.avgDamage) parts.push(`${combat.avgDamage} zr`);
      if (combat.aoe) parts.push('AoE');
      if (combat.autoHit) parts.push('auto-zásah');
      break;
    case 'heal':
      if (combat.avgHeal) parts.push(`+${combat.avgHeal} ŽP`);
      break;
    case 'buff': {
      const buffs: string[] = [];
      if (combat.acBonus) buffs.push(`OČ ${combat.acBonus}`);
      if (combat.thac0Bonus) buffs.push(`ÚT ${combat.thac0Bonus}`);
      if (combat.damageBonus) buffs.push(`+${combat.damageBonus} zr`);
      if (buffs.length) parts.push(buffs.join(', '));
      break;
    }
    case 'cc':
      if (combat.disableFraction) parts.push(`${Math.round(combat.disableFraction * 100)}% zneschopní`);
      if (combat.aoe) parts.push('AoE');
      break;
    case 'debuff': {
      if (combat.avgDamage) parts.push(`${combat.avgDamage} zr`);
      const debuffs: string[] = [];
      if (combat.thac0Bonus) debuffs.push(`ÚT +${combat.thac0Bonus}`);
      if (combat.acBonus) debuffs.push(`OČ +${Math.abs(combat.acBonus)}`);
      if (debuffs.length) parts.push(debuffs.join(', '));
      break;
    }
    case 'utility':
      break;
  }

  if (combat.durationBK) {
    if (combat.durationBK >= 99) parts.push('trvalé');
    else parts.push(`${combat.durationBK} BK`);
  }

  return parts.join(' · ');
}

export function SpellSelector({ spells, onToggle, unitCount, unitType }: SpellSelectorProps) {
  if (spells.length === 0) return null;

  // Group spells by level, include full definition
  const byLevel = new Map<number, Array<UnitSpellState & { name: string; school: string; combat: SpellCombatEffect }>>();
  for (const s of spells) {
    const def = getSpellById(s.spellId);
    if (!def) continue;
    const list = byLevel.get(def.level) ?? [];
    list.push({ ...s, name: def.name, school: def.school, combat: def.combat });
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
              {byLevel.get(level)!.map(spell => {
                const effectText = formatEffect(spell.combat);
                return (
                  <label
                    key={spell.spellId}
                    className="flex items-start gap-2 cursor-pointer py-1 px-1 rounded hover:bg-dark-hover transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={spell.enabled}
                      onChange={() => onToggle(spell.spellId)}
                      className="accent-gold shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs ${spell.enabled ? 'text-parchment' : 'text-parchment-dark line-through'}`}>
                          {spell.name}
                        </span>
                        <span className="text-xs text-parchment-dark shrink-0">{spell.school}</span>
                      </div>
                      <div className={`text-xs mt-0.5 ${EFFECT_COLORS[spell.combat.type]}`}>
                        {EFFECT_ICONS[spell.combat.type]} {EFFECT_LABELS[spell.combat.type]}
                        {effectText ? ` · ${effectText}` : ''}
                      </div>
                      {unitCount != null && unitCount > 0 && (() => {
                        const scaling = formatScaling(spell.combat, unitCount, unitType);
                        return scaling ? (
                          <div className="text-xs mt-0.5 text-parchment-dark opacity-70">
                            ↳ {scaling}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
