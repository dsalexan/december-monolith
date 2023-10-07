import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitDisadvantageSchema = BaseTraitSchema.merge(z.object({}).strict())

export type TraitDisadvantage = AbstractTrait<`disadvantages`, z.infer<typeof TraitDisadvantageSchema>>
