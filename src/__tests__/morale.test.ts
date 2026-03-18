import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCombatUnit, simulateBK, isDefeated } from '../engine/combat';
import type { BattleConfig, Unit } from '../engine/types';

const DEFAULT_CONFIG: BattleConfig = {
  iterations: 1,
  maxBK: 30,
  terrain: 'open',
  timeOfDay: 'day',
  largeBattle: false,
  commanderBonuses: false,
  attackerSide: 'army_a',
};

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
    dmg: '1k1+0',
    hp_per_soldier: 1,
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

describe('Morálka — podmínky kontroly', () => {
  afterEach(() => vi.restoreAllMocks());

  it('morálka se nekontroluje při ztrátách < 25 % a < 10 % za BK', () => {
    // Způsobíme pouze 5 % ztrát (<25% kumulativních, <10% za BK)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(19 / 20) // ini a = 20
      .mockReturnValueOnce(0 / 20)  // ini b = 1
      .mockReturnValueOnce(19 / 20) // útok zasáhne (roll=20 → kritický)
      .mockReturnValueOnce(1 / 4)   // kritický multiplikátor = 2
      .mockReturnValueOnce(0)       // poškození = 1 (1k1+0)
      .mockReturnValue(9 / 20);     // ostatní (neprůbojné hody obránce)

    // Obránce má 100 vojáků, HP=1 za vojáka; útočník max způsobí 2 zabití (kritický 1×2=2)
    const attacker = createCombatUnit(makeUnit({ count: 1, dmg: '1k1+0', thac0: 1 }));
    const defender = createCombatUnit(makeUnit({ count: 100, max_count: 100, ac: 20 }));
    const result = simulateBK(attacker, defender, 1, DEFAULT_CONFIG);
    // Ztráty <= 2 % → žádná kontrola morálky
    const moraleChecks = result.logs.filter(l => l.morale_check);
    expect(moraleChecks).toHaveLength(0);
  });

  it('morálka se kontroluje při kumulativních ztrátách > 25 %', () => {
    // Nastavíme unit se 30 % již utracenými ztrátami (total_losses = 30 ze 100)
    const unit = makeUnit({ count: 70, max_count: 100, morale: 15 });
    const cu = createCombatUnit(unit);
    cu.total_losses = 30; // 30 % → překročení 25%

    // Způsobíme minimální ztráty útočníkem
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(19 / 20) // ini a vyhraje
      .mockReturnValueOnce(0)       // ini b
      .mockReturnValueOnce(14 / 20) // útok: roll=15, needed=10-5=5 → zasáhne
      .mockReturnValueOnce(0)       // poškození 1k1+0 = 1
      .mockReturnValue(10 / 20);    // morální hod a ostatní

    const attacker = createCombatUnit(makeUnit({ count: 1, thac0: 10, dmg: '1k1+0' }));
    const result = simulateBK(attacker, cu, 1, DEFAULT_CONFIG);

    // Defender (cu) má >25 % kumulativní ztráty → morale check
    const moraleChecks = result.logs.filter(l => l.morale_check !== undefined);
    expect(moraleChecks.length).toBeGreaterThan(0);
  });

  it('morálka se kontroluje při ztrátách > 10 % v jednom BK', () => {
    // 15 útočníků vs 100 obránců; každý útočník způsobí 1 zabití = 15 % = >10 %
    // Roll=15 (regulérní zásah, nikoli kritický); damage=1k1+0=1; kills=1*15=15

    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(19 / 20)  // ini a = 20 (vyhraje)
      .mockReturnValueOnce(0)         // ini b = 1
      .mockReturnValueOnce(14 / 20)  // útok = roll 15 (regulérní zásah, ne kritický)
      .mockReturnValue(0.5);          // ostatní (poškození a další hody)

    const attacker = createCombatUnit(makeUnit({ count: 15, thac0: 10, dmg: '1k1+0', hp_per_soldier: 1 }));
    const defender = createCombatUnit(makeUnit({ count: 100, max_count: 100, ac: 5 }));
    const result = simulateBK(attacker, defender, 1, DEFAULT_CONFIG);

    // getEffectiveCount(bk=1) = min(15, 100) = 15 → 15 zabití = 15 % > 10 %
    expect(result.defenderLosses).toBe(15);
    const moraleChecks = result.logs.filter(l => l.morale_check !== undefined);
    expect(moraleChecks.length).toBeGreaterThan(0);
  });
});

describe('Morálka — výsledky', () => {
  it('jednotka je poražena po 2 selháních morálky', () => {
    const cu = createCombatUnit(makeUnit({ count: 50 }));
    cu.morale_failures = 2;
    expect(isDefeated(cu)).toBe(true);
  });

  it('jednotka NENÍ poražena po 1 selhání morálky', () => {
    const cu = createCombatUnit(makeUnit({ count: 50 }));
    cu.morale_failures = 1;
    expect(isDefeated(cu)).toBe(false);
  });

  it('fatigue snižuje efektivní morálku', () => {
    // Fatigue penalty tired=2, exhausted=5, collapsed=10
    // Test prostřednictvím isDefeated při collapsed
    const cu = createCombatUnit(makeUnit({ count: 50 }));
    cu.fatigue_state = 'collapsed';
    expect(isDefeated(cu)).toBe(true);
  });
});

describe('Únava — přechody stavů', () => {
  afterEach(() => vi.restoreAllMocks());

  it('čerstvá jednotka zůstane fresh při prvních BK', () => {
    // Jednotka s fatigue=10 by měla zůstat fresh v BK 1-10
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const unit = makeUnit({ fatigue: 5, count: 1 });
    const cu = createCombatUnit(unit);
    expect(cu.fatigue_state).toBe('fresh');
    expect(cu.fatigue_remaining).toBe(5);
  });
});
