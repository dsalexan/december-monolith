import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitSpellSchema = BaseTraitSchema.merge(
  z
    .object({
      castingcost: z.number().or(z.literal(`Varies`)).optional(),
    })
    .strict(),
)

export type TraitSpell = AbstractTrait<`spells`, z.infer<typeof TraitSpellSchema>>
