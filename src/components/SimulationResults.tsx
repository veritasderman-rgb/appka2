import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { SimulationResult } from '../engine/types';
import { BattleLog } from './BattleLog';
import { SpellTimeline } from './SpellTimeline';

function exportJSON(result: SimulationResult) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `battle-result-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(result: SimulationResult) {
  const rows: string[][] = [
    ['strana', 'jednotka', 'původní', 'průměr_přeživších', 'průměr_mrtvých', 'zničena_%', 'morálka_%'],
    ...result.avg_losses.army_a.by_unit.map(u => [
      'Aliance', u.name, String(u.original),
      u.avg_remaining.toFixed(1), u.avg_dead.toFixed(1),
      (u.destruction_rate * 100).toFixed(1),
      (u.morale_failure_rate * 100).toFixed(1),
    ]),
    ...result.avg_losses.army_b.by_unit.map(u => [
      'Nepřátelé', u.name, String(u.original),
      u.avg_remaining.toFixed(1), u.avg_dead.toFixed(1),
      (u.destruction_rate * 100).toFixed(1),
      (u.morale_failure_rate * 100).toFixed(1),
    ]),
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `battle-result-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface SimulationResultsProps {
  result: SimulationResult;
  history?: SimulationResult[];
  onSelectHistory?: (r: SimulationResult) => void;
  onBack: () => void;
}

const COLORS = {
  alliance: '#3a9e5f',
  enemy: '#c44040',
  draw: '#a8b0b8',
};

export function SimulationResults({ result, history, onSelectHistory, onBack }: SimulationResultsProps) {
  // Pie chart data
  const pieData = [
    { name: 'Spojenci', value: result.probability.army_a_win, color: COLORS.alliance },
    { name: 'Nepřátelé', value: result.probability.army_b_win, color: COLORS.enemy },
    { name: 'Remíza', value: result.probability.draw, color: COLORS.draw },
  ].filter(d => d.value > 0);

  // Losses bar chart data
  const lossesData = [
    ...result.avg_losses.army_a.by_unit.map(u => ({
      name: u.name,
      Přeživší: u.avg_remaining,
      Mrtví: u.avg_dead,
      side: 'alliance',
    })),
    ...result.avg_losses.army_b.by_unit.map(u => ({
      name: u.name,
      Přeživší: u.avg_remaining,
      Mrtví: u.avg_dead,
      side: 'enemy',
    })),
  ];

  // BK distribution
  const bkData = result.bk_distribution
    .map((count, bk) => ({ bk: `BK ${bk}`, count }))
    .filter(d => d.count > 0);

  const winnerColor = result.probability.army_a_win > result.probability.army_b_win
    ? 'text-alliance-light'
    : result.probability.army_b_win > result.probability.army_a_win
      ? 'text-enemy-light'
      : 'text-silver';

  const winnerText = result.probability.army_a_win > result.probability.army_b_win
    ? 'Spojenci'
    : result.probability.army_b_win > result.probability.army_a_win
      ? 'Nepřátelé'
      : 'Nerozhodně';

  const winPct = Math.max(result.probability.army_a_win, result.probability.army_b_win, result.probability.draw);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={onBack}
          className="text-sm text-parchment-dark hover:text-parchment border border-dark-border rounded px-3 py-1.5"
        >
          Zpět na sestavení
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportJSON(result)}
            className="text-xs text-parchment-dark hover:text-parchment border border-dark-border rounded px-2 py-1"
            title="Exportovat výsledek jako JSON"
          >
            ↓ JSON
          </button>
          <button
            onClick={() => exportCSV(result)}
            className="text-xs text-parchment-dark hover:text-parchment border border-dark-border rounded px-2 py-1"
            title="Exportovat výsledek jako CSV"
          >
            ↓ CSV
          </button>
          <div className="text-sm text-parchment-dark">
            {result.total_simulations} simulací · {result.avg_duration_bk} BK průměrně
          </div>
        </div>
      </div>

      {/* Main result */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-center">
        <div className="text-parchment-dark text-sm mb-1">Nejpravděpodobnější vítěz</div>
        <div className={`text-4xl font-bold ${winnerColor} mb-1`}>{winnerText}</div>
        <div className="text-2xl text-gold">{winPct}%</div>
      </div>

      {/* Key factors — shown right below winner for immediate insight */}
      {result.key_factors.length > 0 && (
        <KeyFactorsPanel factors={result.key_factors} />
      )}

      {/* Probability pie + stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <h3 className="text-gold font-bold mb-3">Pravděpodobnost výsledku</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${String(v)}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <h3 className="text-gold font-bold mb-3">Souhrn</h3>
          <div className="space-y-3">
            <StatRow label="Vítězství Spojenců" value={`${result.wins.army_a}× (${result.probability.army_a_win}%)`} color="text-alliance-light" />
            <StatRow label="Vítězství Nepřátel" value={`${result.wins.army_b}× (${result.probability.army_b_win}%)`} color="text-enemy-light" />
            <StatRow label="Remízy" value={`${result.wins.draw}× (${result.probability.draw}%)`} color="text-silver" />
            <div className="border-t border-dark-border pt-2" />
            <StatRow label="Ztráty Spojenců" value={`${result.avg_losses.army_a.total_soldiers} (${result.avg_losses.army_a.percent}%)`} color="text-alliance-light" />
            <StatRow label="Ztráty Nepřátel" value={`${result.avg_losses.army_b.total_soldiers} (${result.avg_losses.army_b.percent}%)`} color="text-enemy-light" />
            <div className="border-t border-dark-border pt-2" />
            <StatRow label="Prům. trvání" value={`${result.avg_duration_bk} BK`} color="text-parchment" />
            <StatRow label="Min / Max BK" value={`${result.min_duration_bk} / ${result.max_duration_bk} BK`} color="text-parchment-dark" />
            <StatRow label="Std. odchylka BK" value={`±${result.stddev_duration_bk} BK`} color="text-parchment-dark" />
          </div>
        </div>
      </div>

      {/* BK Distribution */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-4">
        <h3 className="text-gold font-bold mb-3">Distribuce délky bitev (BK)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bkData}>
            <XAxis dataKey="bk" tick={{ fill: '#b8a67a', fontSize: 12 }} />
            <YAxis tick={{ fill: '#b8a67a', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#1e2a4a', border: '1px solid #2a3a5e', color: '#d4c5a0' }}
            />
            <Bar dataKey="count" fill="#c9a84c" name="Počet simulací" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Unit losses table */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-4">
        <h3 className="text-gold font-bold mb-3">Ztráty po jednotkách</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-parchment-dark border-b border-dark-border">
                <th className="text-left py-2 px-2">Jednotka</th>
                <th className="text-right py-2 px-2">Původní</th>
                <th className="text-right py-2 px-2">Prům. zbylých</th>
                <th className="text-right py-2 px-2">Prům. mrtvých</th>
                <th className="text-right py-2 px-2" title="Odhad zraněných, kteří se mohou zotavit po bitvě (survival_percent × mrtví)">Obnova</th>
                <th className="text-right py-2 px-2">Nejlepší</th>
                <th className="text-right py-2 px-2">Nejhorší</th>
              </tr>
            </thead>
            <tbody>
              {/* Alliance */}
              {result.avg_losses.army_a.by_unit.map(u => (
                <tr key={u.name} className="border-b border-dark-border/50 hover:bg-dark-hover">
                  <td className="py-1.5 px-2 text-alliance-light">{u.name}</td>
                  <td className="text-right py-1.5 px-2">{u.original}</td>
                  <td className="text-right py-1.5 px-2">{u.avg_remaining}</td>
                  <td className="text-right py-1.5 px-2 text-blood-light">{u.avg_dead}</td>
                  <td className="text-right py-1.5 px-2 text-green-400">{u.estimated_recovery > 0 ? `+${u.estimated_recovery}` : '—'}</td>
                  <td className="text-right py-1.5 px-2 text-parchment-dark">{u.best_remaining}</td>
                  <td className="text-right py-1.5 px-2 text-parchment-dark">{u.worst_remaining}</td>
                </tr>
              ))}
              {/* Separator */}
              <tr><td colSpan={7} className="py-1 border-b-2 border-dark-border" /></tr>
              {/* Enemy */}
              {result.avg_losses.army_b.by_unit.map(u => (
                <tr key={u.name} className="border-b border-dark-border/50 hover:bg-dark-hover">
                  <td className="py-1.5 px-2 text-enemy-light">{u.name}</td>
                  <td className="text-right py-1.5 px-2">{u.original}</td>
                  <td className="text-right py-1.5 px-2">{u.avg_remaining}</td>
                  <td className="text-right py-1.5 px-2 text-blood-light">{u.avg_dead}</td>
                  <td className="text-right py-1.5 px-2 text-green-400">{u.estimated_recovery > 0 ? `+${u.estimated_recovery}` : '—'}</td>
                  <td className="text-right py-1.5 px-2 text-parchment-dark">{u.best_remaining}</td>
                  <td className="text-right py-1.5 px-2 text-parchment-dark">{u.worst_remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed unit stats: destruction, morale, crits */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-4">
        <h3 className="text-gold font-bold mb-3">Detailní statistiky jednotek</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-parchment-dark border-b border-dark-border">
                <th className="text-left py-2 px-2">Jednotka</th>
                <th className="text-right py-2 px-2" title="Kolikrát byla jednotka zcela zničena z celkového počtu simulací">Zničena</th>
                <th className="text-right py-2 px-2" title="Procento simulací, kde jednotka skončila s nulou vojáků">Šance zničení</th>
                <th className="text-right py-2 px-2" title="Průměrný počet hodů na morálku za bitvu">Hody morálky</th>
                <th className="text-right py-2 px-2" title="Průměrný počet neúspěšných hodů na morálku">Selhání morálky</th>
                <th className="text-right py-2 px-2" title="Procento neúspěšných hodů z celkových hodů na morálku">Úsp. morálky</th>
                <th className="text-right py-2 px-2" title="Průměrný počet kritických zásahů za bitvu">Krit. zásahy</th>
                <th className="text-right py-2 px-2" title="Průměrný počet kritických minutí za bitvu">Krit. minutí</th>
              </tr>
            </thead>
            <tbody>
              {result.avg_losses.army_a.by_unit.map(u => (
                <tr key={u.name} className="border-b border-dark-border/50 hover:bg-dark-hover">
                  <td className="py-1.5 px-2 text-alliance-light">{u.name}</td>
                  <td className="text-right py-1.5 px-2">{u.times_destroyed}×</td>
                  <td className={`text-right py-1.5 px-2 font-bold ${u.destruction_rate >= 75 ? 'text-blood-light' : u.destruction_rate >= 40 ? 'text-gold' : 'text-parchment-dark'}`}>
                    {u.destruction_rate}%
                  </td>
                  <td className="text-right py-1.5 px-2 text-parchment-dark">{u.avg_morale_checks}</td>
                  <td className="text-right py-1.5 px-2 text-blood-light">{u.avg_morale_failures}</td>
                  <td className={`text-right py-1.5 px-2 font-bold ${u.morale_failure_rate >= 50 ? 'text-blood-light' : u.morale_failure_rate >= 25 ? 'text-gold' : 'text-parchment'}`}>
                    {u.avg_morale_checks > 0 ? `${100 - u.morale_failure_rate}%` : '—'}
                  </td>
                  <td className="text-right py-1.5 px-2 text-parchment">{u.avg_critical_hits}</td>
                  <td className="text-right py-1.5 px-2 text-parchment-dark">{u.avg_critical_misses}</td>
                </tr>
              ))}
              <tr><td colSpan={8} className="py-1 border-b-2 border-dark-border" /></tr>
              {result.avg_losses.army_b.by_unit.map(u => (
                <tr key={u.name} className="border-b border-dark-border/50 hover:bg-dark-hover">
                  <td className="py-1.5 px-2 text-enemy-light">{u.name}</td>
                  <td className="text-right py-1.5 px-2">{u.times_destroyed}×</td>
                  <td className={`text-right py-1.5 px-2 font-bold ${u.destruction_rate >= 75 ? 'text-blood-light' : u.destruction_rate >= 40 ? 'text-gold' : 'text-parchment-dark'}`}>
                    {u.destruction_rate}%
                  </td>
                  <td className="text-right py-1.5 px-2 text-parchment-dark">{u.avg_morale_checks}</td>
                  <td className="text-right py-1.5 px-2 text-blood-light">{u.avg_morale_failures}</td>
                  <td className={`text-right py-1.5 px-2 font-bold ${u.morale_failure_rate >= 50 ? 'text-blood-light' : u.morale_failure_rate >= 25 ? 'text-gold' : 'text-parchment'}`}>
                    {u.avg_morale_checks > 0 ? `${100 - u.morale_failure_rate}%` : '—'}
                  </td>
                  <td className="text-right py-1.5 px-2 text-parchment">{u.avg_critical_hits}</td>
                  <td className="text-right py-1.5 px-2 text-parchment-dark">{u.avg_critical_misses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-parchment-dark mt-2 opacity-60">Průměry přes {result.total_simulations} simulací. Úsp. morálky = % hodů, kdy jednotka prošla. Šance zničení = % simulací s nulou vojáků.</p>
      </div>

      {/* Spell statistics table */}
      {(() => {
        const allUnits = [...result.avg_losses.army_a.by_unit, ...result.avg_losses.army_b.by_unit];
        const magicUnits = allUnits.filter(u => u.avg_spells_cast > 0);
        if (magicUnits.length === 0) return null;

        const aUnits = result.avg_losses.army_a.by_unit.filter(u => u.avg_spells_cast > 0);
        const bUnits = result.avg_losses.army_b.by_unit.filter(u => u.avg_spells_cast > 0);

        return (
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <h3 className="text-gold font-bold mb-3">🔮 Magické statistiky</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-parchment-dark border-b border-dark-border">
                    <th className="text-left py-2 px-2">Jednotka</th>
                    <th className="text-right py-2 px-2" title="Průměrný počet seslaných kouzel za bitvu">Sesláno</th>
                    <th className="text-right py-2 px-2" title="Průměrný spell damage za bitvu">Spell Dmg</th>
                    <th className="text-right py-2 px-2" title="Průměrný počet zabitých kouzly">Zabito</th>
                    <th className="text-right py-2 px-2" title="Průměrný počet vyléčených vojáků">Vyléčeno</th>
                  </tr>
                </thead>
                <tbody>
                  {aUnits.map(u => (
                    <tr key={u.name} className="border-b border-dark-border/50 hover:bg-dark-hover">
                      <td className="py-1.5 px-2 text-alliance-light">{u.name}</td>
                      <td className="text-right py-1.5 px-2 text-purple-300">{u.avg_spells_cast}</td>
                      <td className="text-right py-1.5 px-2 text-blood-light">{u.avg_spell_damage}</td>
                      <td className="text-right py-1.5 px-2 text-blood-light">{u.avg_spell_kills}</td>
                      <td className="text-right py-1.5 px-2 text-green-400">{u.avg_spell_heals > 0 ? `+${u.avg_spell_heals}` : '—'}</td>
                    </tr>
                  ))}
                  {aUnits.length > 0 && bUnits.length > 0 && (
                    <tr><td colSpan={5} className="py-1 border-b-2 border-dark-border" /></tr>
                  )}
                  {bUnits.map(u => (
                    <tr key={u.name} className="border-b border-dark-border/50 hover:bg-dark-hover">
                      <td className="py-1.5 px-2 text-enemy-light">{u.name}</td>
                      <td className="text-right py-1.5 px-2 text-purple-300">{u.avg_spells_cast}</td>
                      <td className="text-right py-1.5 px-2 text-blood-light">{u.avg_spell_damage}</td>
                      <td className="text-right py-1.5 px-2 text-blood-light">{u.avg_spell_kills}</td>
                      <td className="text-right py-1.5 px-2 text-green-400">{u.avg_spell_heals > 0 ? `+${u.avg_spell_heals}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-parchment-dark mt-2 opacity-60">Průměry přes {result.total_simulations} simulací.</p>
          </div>
        );
      })()}

      {/* Losses bar chart */}
      {lossesData.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <h3 className="text-gold font-bold mb-3">Vizualizace ztrát</h3>
          <ResponsiveContainer width="100%" height={Math.max(300, lossesData.length * 35)}>
            <BarChart data={lossesData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#b8a67a', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#b8a67a', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e2a4a', border: '1px solid #2a3a5e', color: '#d4c5a0' }}
              />
              <Bar dataKey="Přeživší" stackId="a" fill="#3a9e5f" />
              <Bar dataKey="Mrtví" stackId="a" fill="#c44040" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Spell timeline (only when iterations = 1) */}
      {result.detailed_log && (
        <SpellTimeline log={result.detailed_log} />
      )}

      {/* Detailed battle log (only when iterations = 1) */}
      {result.detailed_log && (
        <BattleLog log={result.detailed_log} />
      )}

      {/* Simulation history */}
      {history && history.length > 1 && onSelectHistory && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <h3 className="text-gold font-bold mb-3">Historie simulací</h3>
          <div className="space-y-1">
            {history.map((h, i) => {
              const isCurrent = h === result;
              const winner = h.probability.army_a_win > h.probability.army_b_win
                ? `Spojenci ${h.probability.army_a_win}%`
                : h.probability.army_b_win > h.probability.army_a_win
                  ? `Nepřátelé ${h.probability.army_b_win}%`
                  : `Remíza ${h.probability.draw}%`;
              const winColor = h.probability.army_a_win > h.probability.army_b_win
                ? 'text-alliance-light'
                : h.probability.army_b_win > h.probability.army_a_win
                  ? 'text-enemy-light'
                  : 'text-silver';
              return (
                <button
                  key={i}
                  onClick={() => { if (!isCurrent) onSelectHistory(h); }}
                  className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between gap-2 transition-colors ${
                    isCurrent
                      ? 'bg-dark-surface border border-gold/40 cursor-default'
                      : 'hover:bg-dark-surface border border-transparent'
                  }`}
                >
                  <span className="text-parchment-dark">
                    #{history.length - i} · {h.total_simulations}× · {h.avg_duration_bk} BK
                    {isCurrent && <span className="ml-2 text-gold text-xs">(aktuální)</span>}
                  </span>
                  <span className={`font-bold ${winColor}`}>{winner}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KeyFactorsPanel({ factors }: { factors: string[] }) {
  // Classify each factor by its leading emoji for styling
  const classify = (f: string): { border: string; bg: string; dot: string } => {
    if (f.startsWith('🔮')) return { border: 'border-purple-500/40', bg: 'bg-purple-950/20', dot: 'text-purple-400' };
    if (f.startsWith('⬆') || f.includes('leteck') || f.includes('vzdušn')) return { border: 'border-sky-500/40', bg: 'bg-sky-950/20', dot: 'text-sky-400' };
    if (f.includes('dominuj') || f.includes('jistý') || f.includes('navrch')) return { border: 'border-gold/40', bg: 'bg-gold/5', dot: 'text-gold' };
    if (f.includes('Morální') || f.includes('selhává') || f.includes('útěk')) return { border: 'border-yellow-500/40', bg: 'bg-yellow-950/20', dot: 'text-yellow-400' };
    if (f.includes('zničen') || f.includes('Šance zničen')) return { border: 'border-blood-light/40', bg: 'bg-red-950/20', dot: 'text-blood-light' };
    if (f.includes('bitva') || f.includes('BK') || f.includes('variabilit')) return { border: 'border-blue-500/40', bg: 'bg-blue-950/20', dot: 'text-blue-400' };
    return { border: 'border-dark-border', bg: '', dot: 'text-parchment-dark' };
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-parchment-dark uppercase tracking-wider mb-3">
        Klíčové faktory
      </h3>
      <ul className="space-y-2">
        {factors.map((f, i) => {
          const { border, bg, dot } = classify(f);
          return (
            <li key={i} className={`flex items-start gap-3 text-sm rounded-lg border px-3 py-2.5 ${border} ${bg}`}>
              <span className={`${dot} shrink-0 mt-0.5 text-base leading-none`}>◆</span>
              <span className="text-parchment leading-snug">{f.replace(/^[🔮⬆]\s*/, '')}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-parchment-dark">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}
