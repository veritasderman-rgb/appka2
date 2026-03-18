import { describe, it, expect } from 'vitest';
import { createCombatUnit, getCommanderBonuses } from '../engine/combat';
import type { Unit } from '../engine/types';

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'test',
    name: 'Testovací velitel',
    faction: 'alliance',
    origin: 'test',
    type: 'TP',
    zu: 0,
    ru: 0,
    thac0: 8,
    ac: 4,
    dmg: '1k8+4',
    hp_per_soldier: 8,
    initiative: 6,
    movement_priority: 2,
    movement_hexes: 2,
    fatigue: 12,
    morale: 16,
    survival_percent: 0.4,
    count: 200,
    max_count: 200,
    ...overrides,
  };
}

describe('getCommanderBonuses — initiativeBonus', () => {
  it('level 0–4: initiativeBonus = 0', () => {
    for (let level = 0; level <= 4; level++) {
      const unit = makeUnit({ commander: { name: 'V', level, stars: {} } });
      expect(getCommanderBonuses(unit).initiativeBonus).toBe(0);
    }
  });

  it('level 5–9: initiativeBonus = 1', () => {
    for (let level = 5; level <= 9; level++) {
      const unit = makeUnit({ commander: { name: 'V', level, stars: {} } });
      expect(getCommanderBonuses(unit).initiativeBonus).toBe(1);
    }
  });

  it('level 10–14: initiativeBonus = 2', () => {
    for (let level = 10; level <= 14; level++) {
      const unit = makeUnit({ commander: { name: 'V', level, stars: {} } });
      expect(getCommanderBonuses(unit).initiativeBonus).toBe(2);
    }
  });

  it('level 15: initiativeBonus = 3', () => {
    const unit = makeUnit({ commander: { name: 'V', level: 15, stars: {} } });
    expect(getCommanderBonuses(unit).initiativeBonus).toBe(3);
  });

  it('level 20: initiativeBonus = 4', () => {
    const unit = makeUnit({ commander: { name: 'V', level: 20, stars: {} } });
    expect(getCommanderBonuses(unit).initiativeBonus).toBe(4);
  });
});

describe('getCommanderBonuses — thac0Bonus', () => {
  it('0 hvězd: thac0Bonus = 0', () => {
    const unit = makeUnit({ commander: { name: 'V', level: 5, stars: {} } });
    expect(getCommanderBonuses(unit).thac0Bonus).toBe(0);
  });

  it('1–2 hvězd celkem: thac0Bonus = 0 (floor(1–2 / 3) = 0)', () => {
    for (let stars = 1; stars <= 2; stars++) {
      const unit = makeUnit({ commander: { name: 'V', level: 5, stars: { combat: stars } } });
      expect(getCommanderBonuses(unit).thac0Bonus).toBe(0);
    }
  });

  it('3 hvězdy celkem: thac0Bonus = -1', () => {
    const unit = makeUnit({ commander: { name: 'V', level: 5, stars: { combat: 3 } } });
    expect(getCommanderBonuses(unit).thac0Bonus).toBe(-1);
  });

  it('6 hvězd celkem: thac0Bonus = -2', () => {
    const unit = makeUnit({ commander: { name: 'V', level: 5, stars: { combat: 6 } } });
    expect(getCommanderBonuses(unit).thac0Bonus).toBe(-2);
  });

  it('9 hvězd celkem: thac0Bonus = -3', () => {
    const unit = makeUnit({ commander: { name: 'V', level: 5, stars: { combat: 4, tactics: 5 } } });
    expect(getCommanderBonuses(unit).thac0Bonus).toBe(-3);
  });

  it('hvězdy ze dvou kategorií se sčítají', () => {
    const unit = makeUnit({ commander: { name: 'V', level: 5, stars: { combat: 3, tactics: 3 } } });
    expect(getCommanderBonuses(unit).thac0Bonus).toBe(-2); // floor(6/3) = 2
  });
});

describe('createCombatUnit s velitelskými bonusy', () => {
  it('bez velitele: thac0 a initiative zůstanou původní', () => {
    const unit = makeUnit({ thac0: 8, initiative: 6 });
    const cu = createCombatUnit(unit, false, true); // applyCommanderBonuses = true
    expect(cu.unit.thac0).toBe(8);
    expect(cu.unit.initiative).toBe(6);
  });

  it('s velitelem level=10, stars=combat:3: thac0 -1, initiative +2', () => {
    const unit = makeUnit({
      thac0: 8,
      initiative: 6,
      commander: { name: 'Valdris', level: 10, stars: { combat: 3 } },
    });
    const cu = createCombatUnit(unit, false, true);
    expect(cu.unit.initiative).toBe(8); // 6 + floor(10/5) = 6 + 2
    expect(cu.unit.thac0).toBe(7);     // 8 + (-floor(3/3)) = 8 - 1
  });

  it('bez applyCommanderBonuses=true: velitel nemá efekt', () => {
    const unit = makeUnit({
      thac0: 8,
      initiative: 6,
      commander: { name: 'Valdris', level: 10, stars: { combat: 3 } },
    });
    const cu = createCombatUnit(unit, false, false); // nezapnuto
    expect(cu.unit.thac0).toBe(8);
    expect(cu.unit.initiative).toBe(6);
  });
});
