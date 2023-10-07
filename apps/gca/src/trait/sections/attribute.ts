import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitAttributeSchema = BaseTraitSchema.merge(z.object({}).strict())

export type TraitAttribute = AbstractTrait<`attributes`, z.infer<typeof TraitAttributeSchema>>
