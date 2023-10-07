import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitAdvantageSchema = BaseTraitSchema.merge(z.object({}).strict())

export type TraitAdvantage = AbstractTrait<`advantages`, z.infer<typeof TraitAdvantageSchema>>
