import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { SimulationResult } from '../engine/types';

interface SimulationResultsProps {
  result: SimulationResult;
  onBack: () => void;
}

const COLORS = {
  alliance: '#3a9e5f',
  enemy: '#c44040',
  draw: '#a8b0b8',
};

export function SimulationResults({ result, onBack }: SimulationResultsProps) {
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
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-parchment-dark hover:text-parchment border border-dark-border rounded px-3 py-1.5"
        >
          Zpět na sestavení
        </button>
        <div className="text-sm text-parchment-dark">
          {result.total_simulations} simulací · {result.avg_duration_bk} BK průměrně
        </div>
      </div>

      {/* Main result */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-center">
        <div className="text-parchment-dark text-sm mb-1">Nejpravděpodobnější vítěz</div>
        <div className={`text-4xl font-bold ${winnerColor} mb-1`}>{winnerText}</div>
        <div className="text-2xl text-gold">{winPct}%</div>
      </div>

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
              <Tooltip formatter={(v) => `${v}%`} />
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
                  <td className="text-right py-1.5 px-2 text-parchment-dark">{u.best_remaining}</td>
                  <td className="text-right py-1.5 px-2 text-parchment-dark">{u.worst_remaining}</td>
                </tr>
              ))}
              {/* Separator */}
              <tr><td colSpan={6} className="py-1 border-b-2 border-dark-border" /></tr>
              {/* Enemy */}
              {result.avg_losses.army_b.by_unit.map(u => (
                <tr key={u.name} className="border-b border-dark-border/50 hover:bg-dark-hover">
                  <td className="py-1.5 px-2 text-enemy-light">{u.name}</td>
                  <td className="text-right py-1.5 px-2">{u.original}</td>
                  <td className="text-right py-1.5 px-2">{u.avg_remaining}</td>
                  <td className="text-right py-1.5 px-2 text-blood-light">{u.avg_dead}</td>
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

      {/* Key factors */}
      {result.key_factors.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <h3 className="text-gold font-bold mb-3">Klíčové faktory</h3>
          <ul className="space-y-2">
            {result.key_factors.map((f, i) => (
              <li key={i} className="text-sm text-parchment flex items-start gap-2">
                <span className="text-gold shrink-0">&#9670;</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
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
