import type { DetailedBattleLog } from '../engine/types';

interface SpellTimelineProps {
  log: DetailedBattleLog;
}

interface TimelineEntry {
  unitName: string;
  spellName: string;
  type: 'buff' | 'cc' | 'debuff';
  startBK: number;
  endBK: number;
}

const TYPE_COLORS: Record<string, string> = {
  buff: 'bg-yellow-600/60 border-yellow-500',
  cc: 'bg-purple-600/60 border-purple-500',
  debuff: 'bg-orange-600/60 border-orange-500',
};

const TYPE_ICONS: Record<string, string> = {
  buff: '✨',
  cc: '🌀',
  debuff: '💀',
};

export function SpellTimeline({ log }: SpellTimelineProps) {
  // Build timeline entries from active effects across snapshots
  const entries = new Map<string, TimelineEntry>();

  for (const snapshot of log.snapshots) {
    for (const unit of snapshot.unit_states) {
      if (!unit.activeEffects) continue;
      for (const eff of unit.activeEffects) {
        const key = `${unit.name}|${eff.spellName}|${eff.type}`;
        const existing = entries.get(key);
        if (existing) {
          // Extend the end BK
          existing.endBK = Math.max(existing.endBK, snapshot.bk);
        } else {
          entries.set(key, {
            unitName: unit.name,
            spellName: eff.spellName,
            type: eff.type,
            startBK: snapshot.bk,
            endBK: snapshot.bk,
          });
        }
      }
    }
  }

  const timeline = [...entries.values()];
  if (timeline.length === 0) return null;

  const maxBK = log.bk_count;
  const bks = Array.from({ length: maxBK }, (_, i) => i + 1);

  // Group by unit
  const byUnit = new Map<string, TimelineEntry[]>();
  for (const entry of timeline) {
    const list = byUnit.get(entry.unitName) ?? [];
    list.push(entry);
    byUnit.set(entry.unitName, list);
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-4">
      <h3 className="text-gold font-bold mb-3">Časová osa aktivních efektů</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          {/* BK header */}
          <div className="flex items-center mb-2">
            <div className="w-36 shrink-0 text-xs text-parchment-dark">Jednotka / Efekt</div>
            <div className="flex-1 flex">
              {bks.map(bk => (
                <div key={bk} className="flex-1 text-center text-xs text-parchment-dark">
                  {bk}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline rows */}
          {[...byUnit.entries()].map(([unitName, unitEntries]) => (
            <div key={unitName} className="mb-1">
              {unitEntries.map((entry, idx) => (
                <div key={idx} className="flex items-center mb-0.5">
                  <div className="w-36 shrink-0 text-xs text-parchment truncate pr-2" title={`${entry.unitName}: ${entry.spellName}`}>
                    {idx === 0 ? entry.unitName : ''}
                    {idx === 0 ? ' · ' : '  '}
                    <span className="text-parchment-dark">{TYPE_ICONS[entry.type]} {entry.spellName}</span>
                  </div>
                  <div className="flex-1 flex h-4">
                    {bks.map(bk => {
                      const active = bk >= entry.startBK && bk <= entry.endBK;
                      const isStart = bk === entry.startBK;
                      const isEnd = bk === entry.endBK;
                      return (
                        <div key={bk} className="flex-1 px-px">
                          {active ? (
                            <div
                              className={`h-full ${TYPE_COLORS[entry.type]} border ${isStart ? 'rounded-l' : ''} ${isEnd ? 'rounded-r' : ''}`}
                              style={{
                                opacity: isEnd ? 0.6 : 1,
                              }}
                            />
                          ) : (
                            <div className="h-full bg-dark-border/20 rounded-sm" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Legend */}
          <div className="flex gap-4 mt-3 text-xs text-parchment-dark">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-600/60 border border-yellow-500 rounded-sm inline-block" /> Buff
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-purple-600/60 border border-purple-500 rounded-sm inline-block" /> CC
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-orange-600/60 border border-orange-500 rounded-sm inline-block" /> Debuff
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
