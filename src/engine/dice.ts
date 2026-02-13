export interface DiceRoll {
  count: number;
  sides: number;
  bonus: number;
}

/** Parse dice string like "2k8+8", "1k6", "1k10+4" */
export function parseDice(dmgStr: string): DiceRoll {
  const match = dmgStr.match(/^(\d+)k(\d+)(?:\+(\d+))?$/);
  if (!match) {
    return { count: 1, sides: 6, bonus: 0 };
  }
  return {
    count: parseInt(match[1]),
    sides: parseInt(match[2]),
    bonus: match[3] ? parseInt(match[3]) : 0,
  };
}

/** Roll a single die (1 to sides) */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Roll dice from a DiceRoll spec */
export function rollDice(dice: DiceRoll): number {
  let total = dice.bonus;
  for (let i = 0; i < dice.count; i++) {
    total += rollDie(dice.sides);
  }
  return total;
}

/** Roll from a damage string directly */
export function rollDamage(dmgStr: string): number {
  return rollDice(parseDice(dmgStr));
}

/** Average damage from a dice string */
export function avgDamage(dmgStr: string): number {
  const d = parseDice(dmgStr);
  return d.count * (d.sides + 1) / 2 + d.bonus;
}

/** Roll 1d20 */
export function d20(): number {
  return rollDie(20);
}
