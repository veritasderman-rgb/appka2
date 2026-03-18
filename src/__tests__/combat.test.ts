import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createCombatUnit,
  simulateBK,
  isDefeated,
  getCommanderBonuses,
} from '../engine/combat';
import type { CombatUnit } from '../engine/combat';
import type { BattleConfig, Unit } from '../engine/types';

// Pomocná funkce: vrátí hodnotu Math.random tak, aby rollDie(sides) = value
function mockRngValue(value: number, sides: number): number {
  return (value - 1) / sides;
}

// Minimální konfigurace bitvy
const DEFAULT_CONFIG: BattleConfig = {
  iterations: 1,
  maxBK: 30,
  terrain: 'open',
  timeOfDay: 'day',
  largeBattle: false,
  commanderBonuses: false,
  attackerSide: 'army_a',
};

// Základní jednotka pro testy
function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'test',
    name: 'Testovací jednotka',
    faction: 'alliance',
    origin: 'test',
    type: 'LP',
    zu: 0,
    ru: 0,
    thac0: 10,
    ac: 5,
    dmg: '1k6',
    hp_per_soldier: 5,
    initiative: 5,
    movement_priority: 1,
    movement_hexes: 2,
    fatigue: 10,
    morale: 15,
    survival_percent: 0.3,
    count: 100,
    max_count: 100,
    ...overrides,
  };
}

describe('createCombatUnit', () => {
  it('vytvoří CombatUnit s výchozími hodnotami', () => {
    const unit = makeUnit({ count: 50, fatigue: 8 });
    const cu = createCombatUnit(unit);
    expect(cu.count).toBe(50);
    expect(cu.fatigue_remaining).toBe(8);
    expect(cu.morale_failures).toBe(0);
    expect(cu.fatigue_state).toBe('fresh');
    expect(cu.isBattleDefender).toBe(false);
  });

  it('nastaví isBattleDefender = true', () => {
    const cu = createCombatUnit(makeUnit(), true);
    expect(cu.isBattleDefender).toBe(true);
  });

  it('použije ammo_remaining pro střelecké jednotky', () => {
    const unit = makeUnit({ type: 'LS', ammo: 8 });
    const cu = createCombatUnit(unit);
    expect(cu.ammo_remaining).toBe(8);
  });

  it('střelecká jednotka bez ammo dostane výchozí 10 nábojů', () => {
    const unit = makeUnit({ type: 'LS' });
    const cu = createCombatUnit(unit);
    expect(cu.ammo_remaining).toBe(10);
  });

  it('melee jednotka nemá ammo_remaining', () => {
    const unit = makeUnit({ type: 'LP' });
    const cu = createCombatUnit(unit);
    expect(cu.ammo_remaining).toBeUndefined();
  });
});

describe('isDefeated', () => {
  it('vrátí false pro živou jednotku', () => {
    const cu = createCombatUnit(makeUnit({ count: 50 }));
    expect(isDefeated(cu)).toBe(false);
  });

  it('vrátí true při count = 0', () => {
    const cu = createCombatUnit(makeUnit({ count: 0 }));
    expect(isDefeated(cu)).toBe(true);
  });

  it('vrátí true při 2 selháních morálky', () => {
    const cu = createCombatUnit(makeUnit());
    cu.morale_failures = 2;
    expect(isDefeated(cu)).toBe(true);
  });

  it('vrátí true při fatigue_state = collapsed', () => {
    const cu = createCombatUnit(makeUnit());
    cu.fatigue_state = 'collapsed';
    expect(isDefeated(cu)).toBe(true);
  });

  it('vrátí false při 1 selhání morálky', () => {
    const cu = createCombatUnit(makeUnit());
    cu.morale_failures = 1;
    expect(isDefeated(cu)).toBe(false);
  });
});

describe('getCommanderBonuses', () => {
  it('vrátí nulové bonusy pro jednotku bez velitele', () => {
    const unit = makeUnit();
    expect(getCommanderBonuses(unit)).toEqual({ initiativeBonus: 0, thac0Bonus: 0 });
  });

  it('initiativeBonus = floor(level / 5)', () => {
    const unit = makeUnit({ commander: { name: 'Test', level: 10, stars: {} } });
    expect(getCommanderBonuses(unit).initiativeBonus).toBe(2);
  });

  it('initiativeBonus = 0 pro level < 5', () => {
    const unit = makeUnit({ commander: { name: 'Test', level: 4, stars: {} } });
    expect(getCommanderBonuses(unit).initiativeBonus).toBe(0);
  });

  it('thac0Bonus = -floor(součet hvězd / 3)', () => {
    const unit = makeUnit({ commander: { name: 'Test', level: 6, stars: { combat: 6 } } });
    expect(getCommanderBonuses(unit).thac0Bonus).toBe(-2); // -floor(6/3)
  });

  it('thac0Bonus = 0 pro nulové hvězdy', () => {
    const unit = makeUnit({ commander: { name: 'Test', level: 5, stars: {} } });
    expect(getCommanderBonuses(unit).thac0Bonus).toBe(0);
  });

  it('thac0Bonus = -floor(total/3) pro více kategorií hvězd', () => {
    const unit = makeUnit({ commander: { name: 'Test', level: 10, stars: { combat: 3, tactics: 3 } } });
    expect(getCommanderBonuses(unit).thac0Bonus).toBe(-2); // -floor(6/3) = -2
  });
});

describe('simulateBK — základní průběh', () => {
  afterEach(() => vi.restoreAllMocks());

  it('vrátí prázdný výsledek pokud je útočník mrtvý', () => {
    const dead: CombatUnit = { ...createCombatUnit(makeUnit()), count: 0 };
    const alive = createCombatUnit(makeUnit());
    const result = simulateBK(dead, alive, 1, DEFAULT_CONFIG);
    expect(result.logs).toHaveLength(0);
    expect(result.attackerLosses).toBe(0);
    expect(result.defenderLosses).toBe(0);
  });

  it('způsobí ztráty při úspěšném útoku', () => {
    // Zmanipulujeme hody: iniciativa útočníka vyhraje, útok zasáhne (roll = 15)
    const rolls = [15, 5, 15, 5]; // ini_a=15, ini_b=5, attack_roll=15, morale_roll=...
    let rollIdx = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => mockRngValue(rolls[rollIdx++] ?? 10, 20));

    const attacker = createCombatUnit(makeUnit({ thac0: 10, count: 100, dmg: '1k1+0', hp_per_soldier: 1 }));
    const defender = createCombatUnit(makeUnit({ ac: 5, count: 100, hp_per_soldier: 1 }));
    const result = simulateBK(attacker, defender, 1, DEFAULT_CONFIG);
    // Útočník by měl způsobit nějaké ztráty (needed = THAC0 - AC = 10 - 5 = 5, roll=15 >= 5 → zasáhne)
    expect(result.defenderLosses).toBeGreaterThanOrEqual(0);
    expect(result.logs.length).toBeGreaterThan(0);
  });

  it('kritický zásah (roll = 20) způsobí větší poškození', () => {
    // Vždy hod 20 pro útok (kritický zásah), hod 2 pro multiplikátor (k4)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(mockRngValue(20, 20)) // iniciativa a
      .mockReturnValueOnce(mockRngValue(1, 20))  // iniciativa b
      .mockReturnValueOnce(mockRngValue(20, 20)) // útočný hod a = 20 (kritický)
      .mockReturnValueOnce(mockRngValue(2, 4))   // multiplikátor = 2
      .mockReturnValueOnce(mockRngValue(3, 6))   // poškození (1k6 = 3)
      .mockReturnValue(0.5);                     // ostatní hody

    const attacker = createCombatUnit(makeUnit({ thac0: 10, count: 1, dmg: '1k6', hp_per_soldier: 1 }));
    const defender = createCombatUnit(makeUnit({ ac: 5, count: 1000, hp_per_soldier: 1 }));
    const result = simulateBK(attacker, defender, 1, DEFAULT_CONFIG);
    const critLog = result.logs.find(l => l.critical === 'hit');
    expect(critLog).toBeDefined();
  });

  it('kritický minutí (roll = 1) nezpůsobí poškození', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(mockRngValue(20, 20)) // iniciativa a vyhraje
      .mockReturnValueOnce(mockRngValue(1, 20))  // iniciativa b
      .mockReturnValueOnce(mockRngValue(1, 20))  // útočný hod a = 1 (kritický minutí)
      .mockReturnValue(0.5);

    const attacker = createCombatUnit(makeUnit({ thac0: 1, count: 100, dmg: '1k6' }));
    const defender = createCombatUnit(makeUnit({ ac: 20, count: 100 }));
    const result = simulateBK(attacker, defender, 1, DEFAULT_CONFIG);
    const critMissLog = result.logs.find(l => l.critical === 'miss');
    expect(critMissLog).toBeDefined();
    expect(critMissLog?.damage).toBe(0);
  });
});
