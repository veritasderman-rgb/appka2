import React, { useState, useMemo } from 'react';
import type { HexBattleResult, HexBKSnapshot, SnapshotUnit } from '../engine/hexBattle';
import { hexCenter, hexPolygonPoints, COLS, ROWS, HEX_W, HEX_SIZE } from '../engine/hexGrid';

// -------------------------------------------------------------------
// Layout constants
// -------------------------------------------------------------------
const MARGIN_X = 30;
const MARGIN_Y = 16;

// SVG viewport dimensions (units)
const SVG_W = Math.ceil((COLS - 1) * HEX_W + HEX_W / 2 + MARGIN_X * 2 + HEX_SIZE);
const SVG_H = Math.ceil((ROWS - 1) * HEX_SIZE * 1.5 + HEX_SIZE * 2 + MARGIN_Y * 2);

const UNIT_RADIUS = 13;
const DEPLOY_A_COLS = new Set([0, 1]);
const DEPLOY_B_COLS = new Set([COLS - 2, COLS - 1]);

// -------------------------------------------------------------------
// Colour helpers
// -------------------------------------------------------------------
const SIDE_COLOR: Record<string, string> = { a: '#3B82F6', b: '#EF4444' };
const SIDE_DARK: Record<string, string>  = { a: '#1e3a6e', b: '#6b1414' };

function hexBgFill(col: number): string {
  if (DEPLOY_A_COLS.has(col)) return '#162847';
  if (DEPLOY_B_COLS.has(col)) return '#3a1010';
  return '#1c2128';
}

function hexBgStroke(col: number): string {
  if (DEPLOY_A_COLS.has(col)) return '#1e40af55';
  if (DEPLOY_B_COLS.has(col)) return '#99121255';
  return '#2d3748';
}

// -------------------------------------------------------------------
// SVG hex grid sub-component
// -------------------------------------------------------------------
interface GridProps {
  snapshot: HexBKSnapshot;
  showVectors: boolean;
}

function HexGrid({ snapshot, showVectors }: GridProps) {
  const unitsByKey = useMemo(() => {
    const m = new Map<string, SnapshotUnit[]>();
    for (const u of snapshot.units) {
      const k = `${u.pos.col},${u.pos.row}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    }
    return m;
  }, [snapshot]);

  const engagedIds = useMemo(
    () => new Set(snapshot.engagements.flatMap(e => [e.attackerInstanceId, e.defenderInstanceId])),
    [snapshot],
  );

  const unitById = useMemo(
    () => new Map(snapshot.units.map(u => [u.instanceId, u])),
    [snapshot],
  );

  // Center of a hex in SVG space (includes margins)
  function cx(u: SnapshotUnit): number {
    return hexCenter(u.pos).x + MARGIN_X;
  }
  function cy(u: SnapshotUnit): number {
    return hexCenter(u.pos).y + MARGIN_Y;
  }

  // Attack vector lines: draw behind units
  const vectorLines = useMemo(() => {
    if (!showVectors) return [];
    const lines: React.ReactElement[] = [];
    const processVectors = (vectors: typeof snapshot.vectorsA, side: 'a' | 'b') => {
      vectors.forEach((vec, i) => {
        const attacker = unitById.get(vec.attackerId);
        const target   = unitById.get(vec.targetId);
        if (!attacker?.alive || !target?.alive) return;
        const ax = hexCenter(attacker.pos).x + MARGIN_X;
        const ay = hexCenter(attacker.pos).y + MARGIN_Y;
        const tx = hexCenter(target.pos).x   + MARGIN_X;
        const ty = hexCenter(target.pos).y   + MARGIN_Y;
        lines.push(
          <line
            key={`${side}-${i}`}
            x1={ax} y1={ay} x2={tx} y2={ty}
            stroke={SIDE_COLOR[side]}
            strokeWidth={1.2}
            strokeDasharray="5 3"
            opacity={0.5}
          />,
        );
      });
    };
    processVectors(snapshot.vectorsA, 'a');
    processVectors(snapshot.vectorsB, 'b');
    return lines;
  }, [snapshot, unitById, showVectors]);

  // Engagement markers (sword icon at midpoint)
  const engagementMarkers = useMemo(() => {
    return snapshot.engagements.map((eng, i) => {
      const a = unitById.get(eng.attackerInstanceId);
      const d = unitById.get(eng.defenderInstanceId);
      if (!a || !d) return null;
      const mx = (hexCenter(a.pos).x + hexCenter(d.pos).x) / 2 + MARGIN_X;
      const my = (hexCenter(a.pos).y + hexCenter(d.pos).y) / 2 + MARGIN_Y;
      return (
        <text key={i} x={mx} y={my} textAnchor="middle" dominantBaseline="middle" fontSize={11} opacity={0.85}>
          ⚔
        </text>
      );
    });
  }, [snapshot.engagements, unitById]);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', maxWidth: SVG_W, background: '#0d1117', borderRadius: 8, border: '1px solid #2d3748' }}
      aria-label="Hexová bojová mapa"
    >
      {/* Hex tiles */}
      {Array.from({ length: COLS }, (_, col) =>
        Array.from({ length: ROWS }, (_, row) => {
          const { x, y } = hexCenter({ col, row });
          const px = x + MARGIN_X;
          const py = y + MARGIN_Y;
          return (
            <polygon
              key={`${col},${row}`}
              points={hexPolygonPoints(px, py)}
              fill={hexBgFill(col)}
              stroke={hexBgStroke(col)}
              strokeWidth={0.8}
            />
          );
        }),
      )}

      {/* Deployment zone labels */}
      <text x={MARGIN_X + HEX_W * 0.5} y={MARGIN_Y - 4} fontSize={9} fill="#3B82F6" textAnchor="middle" opacity={0.7}>
        ALIANCE
      </text>
      <text x={MARGIN_X + (COLS - 1.5) * HEX_W} y={MARGIN_Y - 4} fontSize={9} fill="#EF4444" textAnchor="middle" opacity={0.7}>
        NEPŘÁTELÉ
      </text>

      {/* Attack vector lines (behind units) */}
      {vectorLines}

      {/* Units */}
      {snapshot.units.map(u => {
        const unitX = cx(u);
        const unitY = cy(u);
        const color     = u.alive ? SIDE_COLOR[u.side] : '#4B5563';
        const darkColor = u.alive ? SIDE_DARK[u.side] : '#1f2937';
        const isEngaged = engagedIds.has(u.instanceId);
        const pct = Math.round((u.count / Math.max(1, u.maxCount)) * 100);
        // Stack offset if multiple units share a hex
        const sameHexUnits = unitsByKey.get(`${u.pos.col},${u.pos.row}`) ?? [];
        const stackIdx = sameHexUnits.findIndex(x => x.instanceId === u.instanceId);
        const offsetX = stackIdx * 5;
        const offsetY = stackIdx * -5;

        return (
          <g key={u.instanceId} transform={`translate(${offsetX},${offsetY})`} opacity={u.alive ? 1 : 0.35}>
            {/* Engagement glow */}
            {isEngaged && (
              <circle cx={unitX} cy={unitY} r={UNIT_RADIUS + 4} fill="none" stroke="#F59E0B" strokeWidth={1.5} opacity={0.7} />
            )}
            {/* Main circle */}
            <circle cx={unitX} cy={unitY} r={UNIT_RADIUS} fill={darkColor} stroke={color} strokeWidth={isEngaged ? 2 : 1.2} />
            {/* Unit type label */}
            <text
              x={unitX} y={unitY - 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={8.5} fontWeight="600"
              fill={u.alive ? '#fff' : '#9CA3AF'}
            >
              {u.unitType}
            </text>
            {/* Count badge */}
            {u.alive && (
              <text
                x={unitX} y={unitY + 9}
                textAnchor="middle"
                fontSize={6.5}
                fill={pct < 40 ? '#FCA5A5' : pct < 70 ? '#FCD34D' : '#86EFAC'}
              >
                {u.count >= 1000 ? `${(u.count / 1000).toFixed(1)}k` : u.count}
              </text>
            )}
            {/* Dead skull */}
            {!u.alive && (
              <text x={unitX} y={unitY + 8} textAnchor="middle" fontSize={8} fill="#6B7280">
                ✕
              </text>
            )}
          </g>
        );
      })}

      {/* Engagement markers */}
      {engagementMarkers}
    </svg>
  );
}

// -------------------------------------------------------------------
// Engagement log sub-component
// -------------------------------------------------------------------
function EngagementLog({ snapshot }: { snapshot: HexBKSnapshot }) {
  if (snapshot.engagements.length === 0) {
    return (
      <p className="text-parchment-dark text-xs italic">
        {snapshot.bk === 0 ? 'Počáteční rozmístění. Žádné boje.' : 'V tomto BK žádné střety (jednotky se přibližují).'}
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {snapshot.engagements.map((eng, i) => {
        const a = snapshot.units.find(u => u.instanceId === eng.attackerInstanceId);
        const d = snapshot.units.find(u => u.instanceId === eng.defenderInstanceId);
        if (!a || !d) return null;
        return (
          <li key={i} className="text-xs flex gap-1 items-start">
            <span className="text-blue-400 font-medium shrink-0">{a.unitType}</span>
            <span className="text-parchment-dark shrink-0">vs</span>
            <span className="text-red-400 font-medium shrink-0">{d.unitType}</span>
            <span className="text-parchment-dark text-xs">
              — <span className="text-red-300">−{eng.defenderLosses}</span>/{' '}
              <span className="text-blue-300">−{eng.attackerLosses}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// -------------------------------------------------------------------
// Unit list panel
// -------------------------------------------------------------------
interface PanelProps {
  snapshot: HexBKSnapshot;
  engagedIds: Set<string>;
  label: string;
  side: 'a' | 'b';
}

function UnitPanel({ snapshot, engagedIds, label, side }: PanelProps) {
  const units = snapshot.units.filter(u => u.side === side);
  const alive = units.filter(u => u.alive);
  const color = side === 'a' ? 'text-blue-400' : 'text-red-400';
  const border = side === 'a' ? 'border-blue-800' : 'border-red-900';

  return (
    <div className={`bg-dark-surface border ${border} rounded p-2 flex-1 min-w-0`}>
      <div className={`font-semibold text-sm ${color} mb-1.5 flex justify-between`}>
        <span>{label}</span>
        <span className="text-parchment-dark font-normal text-xs">
          {alive.length}/{units.length} jednotek
        </span>
      </div>
      <div className="space-y-0.5 max-h-52 overflow-y-auto">
        {units.map(u => {
          const pct = Math.round((u.count / Math.max(1, u.maxCount)) * 100);
          const engaged = engagedIds.has(u.instanceId);
          return (
            <div
              key={u.instanceId}
              className={`flex items-center gap-1.5 text-xs px-1 py-0.5 rounded ${
                !u.alive ? 'opacity-30' : engaged ? 'bg-yellow-900/20' : ''
              }`}
            >
              <span className={`w-6 text-center font-mono font-bold ${color} text-[10px]`}>{u.unitType}</span>
              <span className="text-parchment truncate flex-1" title={u.unitName}>{u.unitName}</span>
              {u.alive ? (
                <>
                  <span className={`text-[10px] font-mono ${pct < 40 ? 'text-red-400' : pct < 70 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {pct}%
                  </span>
                  {engaged && <span title="Bojuje">⚔</span>}
                  {u.fatigueState !== 'fresh' && (
                    <span className="text-yellow-600 text-[10px]" title={`Únava: ${u.fatigueState}`}>
                      {u.fatigueState === 'tired' ? '~' : u.fatigueState === 'exhausted' ? '!' : '✕'}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-parchment-dark text-[10px]">✕ zničena</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// General vectors info
// -------------------------------------------------------------------
function GeneralStrategy({ snapshot }: { snapshot: HexBKSnapshot }) {
  if (snapshot.bk === 0 || (snapshot.vectorsA.length === 0 && snapshot.vectorsB.length === 0)) {
    return null;
  }
  return (
    <div className="text-xs text-parchment-dark space-y-0.5">
      <p className="font-semibold text-parchment">Rozkazy generála:</p>
      <p>
        <span className="text-blue-400">Aliance</span>: {snapshot.vectorsA.length} útočných vektorů
        {snapshot.vectorsA.length > 0 && (
          <span> · silné na slabé, slabé na 1 silný cíl</span>
        )}
      </p>
      <p>
        <span className="text-red-400">Nepřátelé</span>: {snapshot.vectorsB.length} útočných vektorů
      </p>
    </div>
  );
}

// -------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------
interface HexMapViewProps {
  result: HexBattleResult;
  armyALabel?: string;
  armyBLabel?: string;
  onBack?: () => void;
}

export function HexMapView({ result, armyALabel = 'Aliance', armyBLabel = 'Nepřátelé', onBack }: HexMapViewProps) {
  const [bkIndex, setBkIndex] = useState(0);
  const [showVectors, setShowVectors] = useState(true);

  const maxIdx = result.snapshots.length - 1;
  const snapshot = result.snapshots[bkIndex];

  const engagedIds = useMemo(
    () => new Set(snapshot.engagements.flatMap(e => [e.attackerInstanceId, e.defenderInstanceId])),
    [snapshot],
  );

  const isLastBk = bkIndex === maxIdx;
  const winnerLabel =
    result.winner === 'a' ? armyALabel
    : result.winner === 'b' ? armyBLabel
    : 'Remíza';
  const winnerColor =
    result.winner === 'a' ? 'text-blue-400'
    : result.winner === 'b' ? 'text-red-400'
    : 'text-yellow-400';

  return (
    <div className="space-y-3">

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-sm border border-dark-border text-parchment-dark hover:text-parchment rounded transition-all"
            >
              ← Zpět
            </button>
          )}
          <h2 className="text-gold font-bold text-lg">Hexová bitevní mapa</h2>
        </div>
        {isLastBk && (
          <div className={`text-sm font-semibold px-3 py-1 rounded border ${
            result.winner === 'a' ? 'border-blue-700 bg-blue-900/20' :
            result.winner === 'b' ? 'border-red-700 bg-red-900/20' :
            'border-yellow-700 bg-yellow-900/20'
          }`}>
            <span className="text-parchment-dark mr-1">Výsledek:</span>
            <span className={winnerColor}>{winnerLabel} vítězí</span>
          </div>
        )}
        <label className="flex items-center gap-1.5 text-xs text-parchment-dark cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showVectors}
            onChange={e => setShowVectors(e.target.checked)}
            className="accent-gold"
          />
          Zobrazit vektory útoku
        </label>
      </div>

      {/* BK controls */}
      <div className="bg-dark-surface border border-dark-border rounded p-3 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => setBkIndex(i => Math.max(0, i - 1))}
          disabled={bkIndex === 0}
          className="px-3 py-1.5 text-sm border border-dark-border rounded disabled:opacity-30 hover:border-gold/50 transition-all"
        >
          ← Předchozí
        </button>

        <div className="flex-1 min-w-32">
          <input
            type="range"
            min={0}
            max={maxIdx}
            value={bkIndex}
            onChange={e => setBkIndex(Number(e.target.value))}
            className="w-full accent-gold"
          />
        </div>

        <button
          onClick={() => setBkIndex(i => Math.min(maxIdx, i + 1))}
          disabled={bkIndex === maxIdx}
          className="px-3 py-1.5 text-sm border border-dark-border rounded disabled:opacity-30 hover:border-gold/50 transition-all"
        >
          Další →
        </button>

        <div className="text-sm font-mono text-gold font-semibold min-w-20 text-center">
          {snapshot.bk === 0 ? 'Rozmístění' : `BK ${snapshot.bk} / ${result.bkCount}`}
        </div>

        <button
          onClick={() => setBkIndex(maxIdx)}
          className="px-2 py-1.5 text-xs border border-dark-border rounded hover:border-gold/50 transition-all text-parchment-dark"
        >
          Konec »
        </button>
      </div>

      {/* Main content: map + side panels */}
      <div className="flex gap-3 items-start flex-wrap lg:flex-nowrap">

        {/* SVG map (takes most space) */}
        <div className="flex-1 min-w-0">
          <HexGrid snapshot={snapshot} showVectors={showVectors} />

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-parchment-dark px-1">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full border border-blue-500 bg-blue-900" />
              {armyALabel} (Aliance)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full border border-red-500 bg-red-900" />
              {armyBLabel} (Nepřátelé)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0 border-t border-dashed border-blue-500 opacity-60" />
              Vektor útoku Aliance
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0 border-t border-dashed border-red-500 opacity-60" />
              Vektor útoku Nepřátel
            </span>
            <span>⚔ = Střet v tomto BK</span>
            <span className="flex items-center gap-1">
              <span className="text-[10px] text-green-400">■</span>
              &gt;70%
              <span className="text-[10px] text-yellow-400">■</span>
              40–70%
              <span className="text-[10px] text-red-400">■</span>
              &lt;40%
              (bojeschopnost)
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-64 xl:w-72 shrink-0 space-y-2">

          {/* General strategy */}
          <div className="bg-dark-surface border border-dark-border rounded p-2">
            <GeneralStrategy snapshot={snapshot} />
          </div>

          {/* Unit panels */}
          <div className="flex lg:flex-col gap-2">
            <UnitPanel
              snapshot={snapshot}
              engagedIds={engagedIds}
              label={armyALabel}
              side="a"
            />
            <UnitPanel
              snapshot={snapshot}
              engagedIds={engagedIds}
              label={armyBLabel}
              side="b"
            />
          </div>

          {/* Engagement log */}
          <div className="bg-dark-surface border border-dark-border rounded p-2">
            <p className="text-xs font-semibold text-parchment mb-1">
              {snapshot.bk === 0 ? 'Rozmístění' : `Střety BK ${snapshot.bk}`}
            </p>
            <EngagementLog snapshot={snapshot} />
          </div>
        </div>
      </div>
    </div>
  );
}
