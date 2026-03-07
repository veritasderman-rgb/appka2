import { useState } from 'react';
import type { ActiveEffectInfo, BKSnapshot, DetailedBattleLog } from '../engine/types';

interface BattleLogProps {
  log: DetailedBattleLog;
}

const FATIGUE_LABELS: Record<string, string> = {
  fresh: 'svěží',
  tired: 'unavený',
  exhausted: 'vyčerpaný',
  collapsed: 'zhroucený',
};

const SPELL_EFFECT_ICON: Record<string, string> = {
  heal: '💚',
  buff: '✨',
  cc: '🌀',
  debuff: '💀',
  damage: '🔥',
};

function parseSpellEffectType(spellEffect?: string, attacker?: string): string {
  if (!spellEffect) {
    // If no explicit effect, it's a damage spell (has kills/damage)
    return 'damage';
  }
  if (spellEffect.startsWith('heal:')) return 'heal';
  if (spellEffect.startsWith('buff:')) return 'buff';
  if (spellEffect.startsWith('cc:') && spellEffect.includes('thac0')) return 'debuff';
  if (spellEffect.startsWith('cc:')) return 'cc';
  return 'damage';
}

function formatSpellEffectDescription(spellEffect: string | undefined, damage: number, kills: number): string {
  if (!spellEffect) {
    // Pure damage spell
    const parts: string[] = [];
    if (damage > 0) parts.push(`${damage} zranění`);
    if (kills > 0) parts.push(`${kills} zabitých`);
    return parts.join(', ') || 'žádný efekt';
  }

  if (spellEffect.startsWith('heal:')) {
    const healed = spellEffect.split(':')[1];
    return `+${healed} vojáků vyléčeno`;
  }
  if (spellEffect.startsWith('buff:')) {
    const frac = parseFloat(spellEffect.split(':')[1]);
    return `posílení ${Math.round(frac * 100)}% jednotky`;
  }
  if (spellEffect.startsWith('cc:')) {
    // Could be "cc:0.15" or "cc:0.15,thac0:+2"
    const parts = spellEffect.split(',');
    const ccPart = parts[0].split(':')[1];
    const desc: string[] = [];
    if (parseFloat(ccPart) > 0) {
      desc.push(`${Math.round(parseFloat(ccPart) * 100)}% zneschopněno`);
    }
    for (const p of parts.slice(1)) {
      const [key, val] = p.split(':');
      if (key === 'thac0') desc.push(`ÚT ${val}`);
      if (key === 'ac') desc.push(`OČ ${val}`);
    }
    // Add damage if present
    if (damage > 0) desc.unshift(`${damage} zranění, ${kills} zabitých`);
    return desc.join(', ');
  }

  return spellEffect;
}

const EFFECT_BADGE_COLORS: Record<string, string> = {
  buff: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50',
  cc: 'bg-purple-900/30 text-purple-300 border-purple-700/50',
  debuff: 'bg-orange-900/30 text-orange-300 border-orange-700/50',
};

const EFFECT_BADGE_ICONS: Record<string, string> = {
  buff: '✨',
  cc: '🌀',
  debuff: '💀',
};

function ActiveEffectBadge({ effect }: { effect: ActiveEffectInfo }) {
  const colors = EFFECT_BADGE_COLORS[effect.type] ?? 'bg-dark-border text-parchment-dark';
  const icon = EFFECT_BADGE_ICONS[effect.type] ?? '⚙';
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${colors}`}>
      {icon} {effect.spellName}: {effect.description}
      <span className="opacity-60">({effect.remainingBK} BK)</span>
    </span>
  );
}

function BKRound({ snapshot }: { snapshot: BKSnapshot }) {
  const [expanded, setExpanded] = useState(snapshot.bk <= 3);

  const aLosses = snapshot.unit_states
    .filter(u => u.side === 'army_a')
    .reduce((s, u) => s + Math.max(0, u.count_before - u.count_after), 0);
  const bLosses = snapshot.unit_states
    .filter(u => u.side === 'army_b')
    .reduce((s, u) => s + Math.max(0, u.count_before - u.count_after), 0);

  // Separate spell events from combat events
  const spellEvents = snapshot.events.filter(e => e.attacker.includes('['));
  const combatEvents = snapshot.events.filter(e => !e.attacker.includes('[') && !e.morale_check);
  const rangedEvents = combatEvents.filter(e => e.ranged);
  const meleeEvents = combatEvents.filter(e => !e.ranged);
  const moraleEvents = snapshot.events.filter(e => !!e.morale_check);

  // Count active effects for summary
  const totalActiveEffects = snapshot.unit_states.reduce(
    (s, u) => s + (u.activeEffects?.length ?? 0), 0
  );

  return (
    <div className="border border-dark-border rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-dark-surface hover:bg-dark-hover text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-gold font-bold text-sm">BK {snapshot.bk}</span>
          <span className="text-xs text-parchment-dark">
            {spellEvents.length > 0 && `🔮 ${spellEvents.length} · `}
            {rangedEvents.length > 0 && `🏹 ${rangedEvents.length} · `}
            {meleeEvents.length > 0 && `⚔ ${meleeEvents.length}`}
            {spellEvents.length === 0 && combatEvents.length === 0 && '—'}
            {moraleEvents.length > 0 ? ` · ${moraleEvents.length} morálka` : ''}
            {totalActiveEffects > 0 ? ` · ✨ ${totalActiveEffects}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {aLosses > 0 && (
            <span className="text-xs text-alliance-light">
              Spojenci −{aLosses}
            </span>
          )}
          {bLosses > 0 && (
            <span className="text-xs text-enemy-light">
              Nepřátelé −{bLosses}
            </span>
          )}
          <span className="text-parchment-dark text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-dark-border/40">
          {/* Spell events */}
          {spellEvents.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              <div className="text-xs text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                🔮 Kouzla
              </div>
              {spellEvents.map((ev, i) => {
                const effectType = parseSpellEffectType(ev.spellEffect, ev.attacker);
                const icon = SPELL_EFFECT_ICON[effectType] ?? '🔮';
                const effectColor = effectType === 'damage' ? 'text-blood-light'
                  : effectType === 'heal' ? 'text-green-400'
                  : effectType === 'buff' ? 'text-gold'
                  : effectType === 'cc' ? 'text-purple-400'
                  : effectType === 'debuff' ? 'text-orange-400'
                  : 'text-parchment-dark';
                const desc = formatSpellEffectDescription(ev.spellEffect, ev.damage, ev.kills);

                return (
                  <div key={i} className="text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-parchment font-semibold">
                        {icon} {ev.attacker}
                      </span>
                      <span className="text-parchment-dark">→</span>
                      <span className="text-parchment">{ev.defender}</span>
                    </div>
                    <div className={`text-xs mt-0.5 ml-6 ${effectColor}`}>
                      {desc}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Attack events */}
          {combatEvents.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              <div className="text-xs text-parchment-dark uppercase tracking-wider mb-2">
                {rangedEvents.length > 0 && meleeEvents.length > 0 ? 'Střelba & Melee' : rangedEvents.length > 0 ? 'Střelba (pre-kolo)' : 'Melee'}
              </div>
              {combatEvents.map((ev, i) => (
                <div key={i} className="text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Attacker name + arrow */}
                    <span className={ev.hit ? 'text-parchment font-semibold' : 'text-parchment-dark'}>
                      {ev.ranged ? '🏹' : '⚔'} {ev.attacker}
                    </span>
                    <span className="text-parchment-dark">→</span>
                    <span className={ev.hit ? 'text-parchment font-semibold' : 'text-parchment-dark'}>
                      {ev.defender}
                    </span>

                    {/* Fatigue badge */}
                    {ev.fatigue_state && ev.fatigue_state !== 'fresh' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-dark-border text-gold">
                        {FATIGUE_LABELS[ev.fatigue_state]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-0.5 ml-4 flex-wrap">
                    {/* Roll info */}
                    <span className="text-xs text-parchment-dark">
                      Hod: <span className="text-parchment font-mono">{ev.roll}</span>
                      {' / Potřeba: '}
                      <span className="text-parchment font-mono">{ev.needed}</span>
                    </span>

                    {/* Result badge */}
                    {ev.critical === 'hit' ? (
                      <span className="text-xs font-bold text-yellow-300 bg-yellow-900/30 px-2 py-0.5 rounded">
                        KRITICKÝ ZÁSAH
                      </span>
                    ) : ev.critical === 'miss' ? (
                      <span className="text-xs font-bold text-parchment-dark bg-dark-border px-2 py-0.5 rounded">
                        KRITICKÉ MINUTÍ
                      </span>
                    ) : ev.hit ? (
                      <span className="text-xs font-bold text-alliance-light">ZÁSAH</span>
                    ) : (
                      <span className="text-xs text-parchment-dark">minutí</span>
                    )}

                    {/* Damage & kills */}
                    {ev.hit && (
                      <>
                        <span className="text-xs text-parchment-dark">
                          Dmg: <span className="text-parchment font-mono">{ev.damage}</span>
                        </span>
                        <span className={`text-xs font-bold ${ev.kills > 0 ? 'text-blood-light' : 'text-parchment-dark'}`}>
                          Padlo: {ev.kills} vojáků
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Morale events */}
          {moraleEvents.length > 0 && (
            <div className="px-4 py-3 space-y-1.5">
              <div className="text-xs text-parchment-dark uppercase tracking-wider mb-2">Morálka</div>
              {moraleEvents.map((ev, i) => {
                const mc = ev.morale_check!;
                return (
                  <div key={i} className="text-sm flex items-center gap-2 flex-wrap">
                    <span className="text-parchment">🛡 {ev.attacker}</span>
                    <span className="text-parchment-dark text-xs">
                      hod <span className="font-mono">{mc.rolled}</span>
                      {' / morálka '}
                      <span className="font-mono">{mc.needed}</span>
                    </span>
                    {mc.passed ? (
                      <span className="text-xs font-bold text-alliance-light">PROŠLA</span>
                    ) : (
                      <span className="text-xs font-bold text-blood-light">SELHALA</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Unit state after BK */}
          <div className="px-4 py-3">
            <div className="text-xs text-parchment-dark uppercase tracking-wider mb-2">Stav jednotek po BK {snapshot.bk}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              {snapshot.unit_states.map((u, i) => {
                const losses = Math.max(0, u.count_before - u.count_after);
                const isAlliance = u.side === 'army_a';
                return (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className={isAlliance ? 'text-alliance-light' : 'text-enemy-light'}>
                        {u.name}
                      </span>
                      <span className="text-parchment-dark font-mono text-xs ml-2">
                        {u.count_before} → {u.count_after}
                        {losses > 0 && (
                          <span className="text-blood-light ml-1">(−{losses})</span>
                        )}
                        {u.count_after === 0 && (
                          <span className="text-blood-light ml-1 font-bold"> ZNIČENA</span>
                        )}
                      </span>
                    </div>
                    {/* Active effect badges */}
                    {u.activeEffects && u.activeEffects.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-2">
                        {u.activeEffects.map((eff, j) => (
                          <ActiveEffectBadge key={j} effect={eff} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BattleLog({ log }: BattleLogProps) {
  const [showAll, setShowAll] = useState(false);
  if (!log.snapshots || log.snapshots.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-4 text-parchment-dark text-sm">
        Žádná kola nebyla odehrána — armáda mohla být prázdná nebo bitva okamžitě skončila.
      </div>
    );
  }
  const visibleSnapshots = showAll ? log.snapshots : log.snapshots.slice(0, 10);

  const winnerLabel = log.winner === 'army_a' ? 'Spojenci' : log.winner === 'army_b' ? 'Nepřátelé' : 'Remíza';
  const winnerColor = log.winner === 'army_a' ? 'text-alliance-light' : log.winner === 'army_b' ? 'text-enemy-light' : 'text-silver';

  // Compute spell summary across all BKs
  const allSpellEvents = log.snapshots.flatMap(s => s.events.filter(e => e.attacker.includes('[')));
  const totalSpellDamage = allSpellEvents.reduce((s, e) => s + e.damage, 0);
  const totalSpellKills = allSpellEvents.reduce((s, e) => s + e.kills, 0);
  const totalHealEvents = allSpellEvents.filter(e => e.spellEffect?.startsWith('heal:'));
  const totalHealed = totalHealEvents.reduce((s, e) => {
    const val = parseInt(e.spellEffect?.split(':')[1] ?? '0');
    return s + val;
  }, 0);
  const totalMeleeDamage = log.snapshots.flatMap(s => s.events.filter(e => !e.attacker.includes('[') && !e.morale_check && e.hit)).reduce((s, e) => s + e.damage, 0);

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-gold font-bold">Průběh bitvy kolo po kole</h3>
        <div className="text-sm">
          Vítěz: <span className={`font-bold ${winnerColor}`}>{winnerLabel}</span>
          <span className="text-parchment-dark ml-2">· {log.bk_count} BK</span>
        </div>
      </div>

      {/* Spell summary (step 6) */}
      {allSpellEvents.length > 0 && (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-3">
          <div className="text-xs text-purple-400 uppercase tracking-wider mb-2">🔮 Souhrn magie</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-parchment-dark">Sesláno kouzel</div>
              <div className="text-sm font-bold text-purple-300">{allSpellEvents.length}</div>
            </div>
            <div>
              <div className="text-xs text-parchment-dark">Spell damage</div>
              <div className="text-sm font-bold text-blood-light">{totalSpellDamage} ({totalSpellKills} zabitých)</div>
            </div>
            <div>
              <div className="text-xs text-parchment-dark">Vyléčeno</div>
              <div className="text-sm font-bold text-green-400">{totalHealed > 0 ? `+${totalHealed} vojáků` : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-parchment-dark">Melee vs Magie</div>
              <div className="text-sm font-bold text-parchment">
                {totalMeleeDamage > 0 || totalSpellDamage > 0 ? (
                  <>
                    <span className="text-gold">{Math.round(totalMeleeDamage / (totalMeleeDamage + totalSpellDamage) * 100)}%</span>
                    {' / '}
                    <span className="text-purple-300">{Math.round(totalSpellDamage / (totalMeleeDamage + totalSpellDamage) * 100)}%</span>
                  </>
                ) : '—'}
              </div>
            </div>
          </div>

          {/* Damage comparison bar */}
          {(totalMeleeDamage > 0 || totalSpellDamage > 0) && (
            <div className="mt-2">
              <div className="flex h-2 rounded overflow-hidden">
                <div
                  className="bg-gold"
                  style={{ width: `${totalMeleeDamage / (totalMeleeDamage + totalSpellDamage) * 100}%` }}
                  title={`Melee: ${totalMeleeDamage}`}
                />
                <div
                  className="bg-purple-500"
                  style={{ width: `${totalSpellDamage / (totalMeleeDamage + totalSpellDamage) * 100}%` }}
                  title={`Magie: ${totalSpellDamage}`}
                />
              </div>
              <div className="flex justify-between text-xs text-parchment-dark mt-0.5">
                <span>⚔ Melee {totalMeleeDamage}</span>
                <span>🔮 Magie {totalSpellDamage}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-parchment-dark">
        Kliknutím na BK rozbalíte / sbalíte detail. První 3 kola jsou rozbalena automaticky.
      </p>

      <div className="space-y-2">
        {visibleSnapshots.map(snapshot => (
          <BKRound key={snapshot.bk} snapshot={snapshot} />
        ))}
      </div>

      {log.snapshots.length > 10 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-sm text-parchment-dark border border-dark-border rounded py-1.5 hover:text-parchment hover:border-gold/40 transition-colors"
        >
          Zobrazit všechna kola ({log.snapshots.length - 10} dalších)
        </button>
      )}
    </div>
  );
}
