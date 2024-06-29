import { z } from "zod"

// MODE
export const TraitModeSchema = z.object({
  name: z.string(),
  acc: z.string().optional(),
  damage: z.string().optional(),
  dmg: z.string().optional(),
  damtype: z.string().optional(),
  rangehalfdam: z.string().optional(),
  rangemax: z.string().optional(),
  reachbasedon: z.string().optional(),
  rcl: z.string().optional(),
  rof: z.string().optional(),
  skillused: z.string(),
  minimode_damage: z.string().optional(),
  minimode_damtype: z.string().optional(),
})

// MODIFIER
export const TraitModifierGivesSchema = z.object({
  _: z.string(),
  singleBonus: z.boolean().optional(),
  bonus: z.string().or(z.number()),
  trait: z.string(),
  tagname: z.string().optional(),
  listAs: z.string().optional(),
})

export const TraitModifierSchema = z.object({
  name: z.string(),
  nameext: z.string().optional(),
  gives: z.array(TraitModifierGivesSchema).optional(),
})

// GENERAL
export const CalculatedTraitSchema = z.object({
  syslevels: z.number(),
})

export const TraitMetadataSchema = z.object({
  calculated: CalculatedTraitSchema,
})

export const TraitSchema = z
  .object({
    _: TraitMetadataSchema,
    id: z.number(),
    name: z.string(),
    type: z.string(),
    modifiers: z.array(TraitModifierSchema).optional(),
    modes: z.array(TraitModeSchema).optional(),
    level: z.number().optional(),
  })
  .strict()

export type TraitModifier = z.infer<typeof TraitModifierSchema>
export type Trait = z.infer<typeof TraitSchema>
