import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitSkillSchema = BaseTraitSchema.merge(z.object({}).strict())

export type TraitSkill = AbstractTrait<`skills`, z.infer<typeof TraitSkillSchema>>
