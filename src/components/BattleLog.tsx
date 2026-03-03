import { useState } from 'react';
import type { BKSnapshot, DetailedBattleLog } from '../engine/types';

interface BattleLogProps {
  log: DetailedBattleLog;
}

const FATIGUE_LABELS: Record<string, string> = {
  fresh: 'svěží',
  tired: 'unavený',
  exhausted: 'vyčerpaný',
  collapsed: 'zhroucený',
};

function BKRound({ snapshot }: { snapshot: BKSnapshot }) {
  const [expanded, setExpanded] = useState(snapshot.bk <= 3);

  const aLosses = snapshot.unit_states
    .filter(u => u.side === 'army_a')
    .reduce((s, u) => s + Math.max(0, u.count_before - u.count_after), 0);
  const bLosses = snapshot.unit_states
    .filter(u => u.side === 'army_b')
    .reduce((s, u) => s + Math.max(0, u.count_before - u.count_after), 0);

  const rangedEvents = snapshot.events.filter(e => !e.morale_check && e.ranged);
  const meleeEvents = snapshot.events.filter(e => !e.morale_check && !e.ranged);
  const attackEvents = snapshot.events.filter(e => !e.morale_check);
  const moraleEvents = snapshot.events.filter(e => !!e.morale_check);

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
            {rangedEvents.length > 0 && `🏹 ${rangedEvents.length} · `}
            {meleeEvents.length > 0 && `⚔ ${meleeEvents.length}`}
            {attackEvents.length === 0 && '—'}
            {moraleEvents.length > 0 ? ` · ${moraleEvents.length} morálka` : ''}
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
          {/* Attack events */}
          {attackEvents.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              <div className="text-xs text-parchment-dark uppercase tracking-wider mb-2">
                {rangedEvents.length > 0 && meleeEvents.length > 0 ? 'Střelba & Melee' : rangedEvents.length > 0 ? 'Střelba (pre-kolo)' : 'Melee'}
              </div>
              {attackEvents.map((ev, i) => (
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
                  <div key={i} className="flex items-center justify-between text-sm">
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

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-gold font-bold">Průběh bitvy kolo po kole</h3>
        <div className="text-sm">
          Vítěz: <span className={`font-bold ${winnerColor}`}>{winnerLabel}</span>
          <span className="text-parchment-dark ml-2">· {log.bk_count} BK</span>
        </div>
      </div>

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
