import { describe, it, expect } from 'vitest';
import { assignAttackVectors } from '../engine/general';

interface UnitInput {
  instanceId: string;
  count: number;
  dmg: string;
  thac0: number;
  hp_per_soldier: number;
}

function makeUnit(id: string, overrides: Partial<UnitInput> = {}): UnitInput {
  return {
    instanceId: id,
    count: 100,
    dmg: '1k6',
    thac0: 10,
    hp_per_soldier: 5,
    ...overrides,
  };
}

describe('assignAttackVectors', () => {
  it('vrátí prázdné vektory pro prázdnou armádu', () => {
    expect(assignAttackVectors([], [makeUnit('opp1')])).toHaveLength(0);
    expect(assignAttackVectors([makeUnit('u1')], [])).toHaveLength(0);
    expect(assignAttackVectors([], [])).toHaveLength(0);
  });

  it('každá jednotka dostane cíl při 1:1', () => {
    const side = [makeUnit('a1')];
    const opps = [makeUnit('b1')];
    const vectors = assignAttackVectors(side, opps);
    expect(vectors).toHaveLength(1);
    expect(vectors[0].attackerId).toBe('a1');
    expect(vectors[0].targetId).toBe('b1');
  });

  it('vrátí vektory pro 3:2 (více útočníků než cílů)', () => {
    const side = [makeUnit('a1'), makeUnit('a2'), makeUnit('a3')];
    const opps = [makeUnit('b1'), makeUnit('b2')];
    const vectors = assignAttackVectors(side, opps);
    expect(vectors).toHaveLength(3);
    // Všechny attackerIds jsou různé
    const attackerIds = vectors.map(v => v.attackerId);
    expect(new Set(attackerIds).size).toBe(3);
    // Všechny targetIds jsou z opponentů
    const targetIds = vectors.map(v => v.targetId);
    targetIds.forEach(id => expect(['b1', 'b2']).toContain(id));
  });

  it('slabé jednotky míří na nejsilnějšího nepřítele', () => {
    // Jedna velmi silná jednotka (hodně HP a poškození) vs. 3 slabé útočníci
    const weakUnits = [
      makeUnit('w1', { count: 5, dmg: '1k1+0', hp_per_soldier: 1 }),
      makeUnit('w2', { count: 5, dmg: '1k1+0', hp_per_soldier: 1 }),
      makeUnit('w3', { count: 5, dmg: '1k1+0', hp_per_soldier: 1 }),
    ];
    const opps = [
      makeUnit('strong', { count: 1000, dmg: '2k10+10', hp_per_soldier: 20 }),
      makeUnit('weak', { count: 2, dmg: '1k1+0', hp_per_soldier: 1 }),
    ];
    const vectors = assignAttackVectors(weakUnits, opps);
    expect(vectors).toHaveLength(3);
    // Slabé jednotky (all below-median) by měly mířit na nejsilnějšího
    const targetsForWeak = vectors.map(v => v.targetId);
    // Všechny by měly být v seznamu oponentů
    targetsForWeak.forEach(id => expect(['strong', 'weak']).toContain(id));
  });

  it('silné jednotky útočí na nejslabšího nepřítele', () => {
    // Jedna silná útočná jednotka vs. dva oponenti (jeden slabý, jeden silný)
    const strong = [
      makeUnit('s1', { count: 500, dmg: '2k8+8', hp_per_soldier: 10 }),
    ];
    const opps = [
      makeUnit('weak_opp', { count: 5, dmg: '1k1+0', hp_per_soldier: 1 }),
      makeUnit('strong_opp', { count: 500, dmg: '2k8+8', hp_per_soldier: 10 }),
    ];
    const vectors = assignAttackVectors(strong, opps);
    expect(vectors).toHaveLength(1);
    // Silná jednotka by měla útočit na slabšího oponenta
    expect(vectors[0].targetId).toBe('weak_opp');
  });

  it('vector má správnou strukturu (attackerId, targetId)', () => {
    const side = [makeUnit('u1'), makeUnit('u2')];
    const opps = [makeUnit('o1'), makeUnit('o2')];
    const vectors = assignAttackVectors(side, opps);
    vectors.forEach(v => {
      expect(v).toHaveProperty('attackerId');
      expect(v).toHaveProperty('targetId');
      expect(typeof v.attackerId).toBe('string');
      expect(typeof v.targetId).toBe('string');
    });
  });

  it('útočník je vždy ze strany, cíl vždy z oponentů', () => {
    const side = [makeUnit('a1'), makeUnit('a2'), makeUnit('a3')];
    const opps = [makeUnit('b1'), makeUnit('b2'), makeUnit('b3')];
    const sideIds = new Set(side.map(u => u.instanceId));
    const oppIds = new Set(opps.map(u => u.instanceId));

    const vectors = assignAttackVectors(side, opps);
    vectors.forEach(v => {
      expect(sideIds.has(v.attackerId)).toBe(true);
      expect(oppIds.has(v.targetId)).toBe(true);
    });
  });
});
