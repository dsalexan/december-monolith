import { z } from "zod"
import { AbstractTrait, TraitSectionsSchema, TraitSection } from "./types"
import { BaseTraitSchema } from "./base"

export const TraitEquipmentSchema = BaseTraitSchema.merge(
  z
    .object({
      baseweight: z.number().or(z.literal(`neg.`)).optional(),
    })
    .strict(),
)

export type TraitEquipment = AbstractTrait<`equipment`, z.infer<typeof TraitEquipmentSchema>>
