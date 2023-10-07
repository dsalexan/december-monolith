import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitPerkSchema = BaseTraitSchema.merge(z.object({}).strict())

export type TraitPerk = AbstractTrait<`perks`, z.infer<typeof TraitPerkSchema>>
