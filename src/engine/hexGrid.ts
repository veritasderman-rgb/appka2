/**
 * Hex grid utilities using pointy-top hexagons with odd-r offset coordinates.
 * Visual layout: rectangular grid, odd rows shifted right by half a hex width.
 */

export const COLS = 15;
export const ROWS = 9;
export const HEX_SIZE = 28; // pointy-top: radius (center to vertex)
export const HEX_W = HEX_SIZE * Math.sqrt(3); // full hex width
export const HEX_H = HEX_SIZE * 2; // full hex height

export interface HexCoord {
  col: number;
  row: number;
}

export function hexKey(h: HexCoord): string {
  return `${h.col},${h.row}`;
}

export function hexEqual(a: HexCoord, b: HexCoord): boolean {
  return a.col === b.col && a.row === b.row;
}

export function isInBounds(h: HexCoord): boolean {
  return h.col >= 0 && h.col < COLS && h.row >= 0 && h.row < ROWS;
}

/** Pixel center of hex in SVG space (origin at top-left, y increases downward). */
export function hexCenter(h: HexCoord): { x: number; y: number } {
  return {
    x: h.col * HEX_W + (h.row % 2 === 1 ? HEX_W / 2 : 0),
    y: h.row * HEX_SIZE * 1.5 + HEX_SIZE,
  };
}

/** SVG polygon points string for a pointy-top hex centered at (cx, cy). */
export function hexPolygonPoints(cx: number, cy: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30); // pointy-top, first vertex at top
    pts.push(`${(cx + HEX_SIZE * Math.cos(angle)).toFixed(1)},${(cy + HEX_SIZE * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * Six neighbors for odd-r offset coordinates.
 * Even rows: E,W,NE-left,NW-left,SE-left,SW-left
 * Odd rows:  E,W,NE-right,NW-right,SE-right,SW-right
 */
export function hexNeighbors(h: HexCoord): HexCoord[] {
  const evenRowDirs = [
    { col: 1, row: 0 }, { col: -1, row: 0 },
    { col: 0, row: -1 }, { col: -1, row: -1 },
    { col: 0, row: 1 }, { col: -1, row: 1 },
  ];
  const oddRowDirs = [
    { col: 1, row: 0 }, { col: -1, row: 0 },
    { col: 1, row: -1 }, { col: 0, row: -1 },
    { col: 1, row: 1 }, { col: 0, row: 1 },
  ];
  const dirs = h.row % 2 === 0 ? evenRowDirs : oddRowDirs;
  return dirs
    .map(d => ({ col: h.col + d.col, row: h.row + d.row }))
    .filter(isInBounds);
}

/** Convert odd-r offset → axial coordinates for distance calculation. */
function toAxial(h: HexCoord): { q: number; r: number } {
  return {
    q: h.col - (h.row - (h.row & 1)) / 2,
    r: h.row,
  };
}

/** Hex distance between two offset coordinates. */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = toAxial(a);
  const bc = toAxial(b);
  return (
    Math.abs(ac.q - bc.q) +
    Math.abs(ac.q + ac.r - bc.q - bc.r) +
    Math.abs(ac.r - bc.r)
  ) / 2;
}

/**
 * Move up to `steps` hexes toward `to` using a greedy approach
 * (each step picks the neighbor closest to the destination).
 */
export function moveToward(from: HexCoord, to: HexCoord, steps: number): HexCoord {
  let current = from;
  for (let i = 0; i < steps; i++) {
    if (hexEqual(current, to)) break;
    const neighbors = hexNeighbors(current);
    if (neighbors.length === 0) break;
    const best = neighbors.reduce((prev, n) =>
      hexDistance(n, to) < hexDistance(prev, to) ? n : prev,
      neighbors[0],
    );
    if (hexDistance(best, to) < hexDistance(current, to)) {
      current = best;
    } else {
      break; // can't get closer (blocked by map edge)
    }
  }
  return current;
}
