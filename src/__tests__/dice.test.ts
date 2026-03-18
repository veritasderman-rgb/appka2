import { describe, it, expect } from 'vitest';
import { parseDice, avgDamage, rollDamage, rollDie, d20 } from '../engine/dice';

describe('parseDice', () => {
  it('parsuje "2k8+8"', () => {
    expect(parseDice('2k8+8')).toEqual({ count: 2, sides: 8, bonus: 8 });
  });

  it('parsuje "1k6" (bez bonusu)', () => {
    expect(parseDice('1k6')).toEqual({ count: 1, sides: 6, bonus: 0 });
  });

  it('parsuje "1k10+4"', () => {
    expect(parseDice('1k10+4')).toEqual({ count: 1, sides: 10, bonus: 4 });
  });

  it('parsuje "3k4+0"', () => {
    expect(parseDice('3k4+0')).toEqual({ count: 3, sides: 4, bonus: 0 });
  });

  it('vrátí výchozí hodnoty pro neplatný řetězec', () => {
    expect(parseDice('invalid')).toEqual({ count: 1, sides: 6, bonus: 0 });
  });

  it('vrátí výchozí hodnoty pro prázdný řetězec', () => {
    expect(parseDice('')).toEqual({ count: 1, sides: 6, bonus: 0 });
  });
});

describe('avgDamage', () => {
  it('avgDamage("1k1+0") = 1', () => {
    expect(avgDamage('1k1+0')).toBe(1);
  });

  it('avgDamage("1k6") = 3.5', () => {
    expect(avgDamage('1k6')).toBe(3.5);
  });

  it('avgDamage("2k8+8") = 2*(8+1)/2 + 8 = 17', () => {
    expect(avgDamage('2k8+8')).toBe(17);
  });

  it('avgDamage("1k10+4") = (10+1)/2 + 4 = 9.5', () => {
    expect(avgDamage('1k10+4')).toBe(9.5);
  });

  it('avgDamage("3k6") = 3 * 3.5 = 10.5', () => {
    expect(avgDamage('3k6')).toBe(10.5);
  });
});

describe('rollDamage', () => {
  it('výsledek rollDamage("1k6") je v rozsahu 1–6', () => {
    for (let i = 0; i < 100; i++) {
      const r = rollDamage('1k6');
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });

  it('výsledek rollDamage("2k8+8") je v rozsahu 10–24', () => {
    for (let i = 0; i < 100; i++) {
      const r = rollDamage('2k8+8');
      expect(r).toBeGreaterThanOrEqual(10);
      expect(r).toBeLessThanOrEqual(24);
    }
  });
});

describe('rollDie', () => {
  it('rollDie(20) vrací hodnoty 1–20', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollDie(20);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(20);
    }
  });
});

describe('d20', () => {
  it('d20() vrací hodnoty 1–20', () => {
    for (let i = 0; i < 200; i++) {
      const r = d20();
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(20);
    }
  });
});
