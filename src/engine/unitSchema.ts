/**
 * Zod schema for validating Unit objects.
 * Used when loading custom units from localStorage or user input.
 */
import { z } from 'zod';
import type { Unit } from './types';

const UNIT_TYPES = [
  'LP', 'TP', 'LS', 'TS', 'HR', 'OS',
  'LJ', 'TJ', 'SJ', 'LL', 'TL',
  'DR', 'KN', 'MG', 'BM',
  'SP', 'ZEN', 'FEL', 'VS',
] as const;

const FACTIONS = ['alliance', 'enemy'] as const;

/** Regex for dice string format: "2k8+8", "1k6", "1k10+4" */
const DICE_REGEX = /^\d+k\d+(\+\d+)?$/;

export const UnitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  faction: z.enum(FACTIONS),
  origin: z.string().min(1),
  type: z.enum(UNIT_TYPES),

  // Combat stats
  zu: z.number().int().min(0).max(100),
  ru: z.number().int().min(0).max(100),
  thac0: z.number().int().min(-10).max(30),
  ac: z.number().int().min(-10).max(20),
  dmg: z.string().regex(DICE_REGEX, 'Musí být ve formátu kostky (např. 2k8+4)'),
  hp_per_soldier: z.number().int().min(1).max(1000),
  initiative: z.number().int().min(0).max(30),
  initiative_secondary: z.number().int().min(0).max(30).optional(),

  // Movement & endurance
  movement_priority: z.number().int().min(1).max(20),
  movement_hexes: z.number().int().min(0).max(10),
  fatigue: z.number().int().min(1).max(100),

  // Morale
  morale: z.number().int().min(1).max(20),
  survival_percent: z.number().min(0).max(1),

  // Counts
  count: z.number().int().min(0),
  max_count: z.number().int().min(1),

  // Ranged (optional)
  range: z.number().int().min(0).optional(),
  ammo: z.number().int().min(0).optional(),
  attacks_per_bk: z.number().int().min(1).optional(),

  // Commander (optional)
  commander: z.object({
    name: z.string().min(1),
    level: z.number().int().min(1).max(20),
    skills: z.array(z.string()).optional(),
    stars: z.record(z.string(), z.number().int().min(0).max(10)).optional(),
  }).optional(),

  // Special
  special_abilities: z.array(z.string()).optional(),
  notes: z.string().optional(),

  // Aerial
  flying: z.boolean().optional(),
  flyby: z.boolean().optional(),
  canTargetFlying: z.boolean().optional(),
  flyingACBonus: z.number().int().min(0).max(10).optional(),
}) satisfies z.ZodType<Unit>;

export type UnitInput = z.input<typeof UnitSchema>;
export type UnitOutput = z.output<typeof UnitSchema>;

/**
 * Validate a unit and return the parsed result or null on error.
 * Logs a warning to console in development when validation fails.
 */
export function validateUnit(raw: unknown): Unit | null {
  const result = UnitSchema.safeParse(raw);
  if (!result.success) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[unitSchema] Validace jednotky selhala:', result.error.flatten());
    }
    return null;
  }
  return result.data;
}

/**
 * Validate an array of units, filtering out invalid entries.
 * Returns only successfully validated units.
 */
export function validateUnits(raws: unknown[]): Unit[] {
  return raws.flatMap(raw => {
    const unit = validateUnit(raw);
    return unit ? [unit] : [];
  });
}
