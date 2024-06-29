import { z } from "zod"
import { DiceSchema } from "../../dice/old_index"
import { da } from "date-fns/locale"

export const DamageTableSchema = z.record(z.number(), z.object({ thr: DiceSchema, sw: DiceSchema }))
export type DamageTable = z.infer<typeof DamageTableSchema>

export const RawCharacterSchema = z
  .object({
    player: z.string(),
    name: z.string(),
    body: z.literal(`Humanoid`),
    vitals: z.object({
      race: z.string(),
      height: z.string(),
      weight: z.string(),
      age: z.number(),
      appearance: z.string(),
    }),
    transforms: z.object({
      current: z.string(),
      list: z.array(
        z.object({
          name: z.string(),
          points: z.number(),
          items: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
            }),
          ),
        }),
      ),
    }),
    //
    damageTable: DamageTableSchema, // ST Score -> {thr, sw}
  })
  .strict()

export type RawCharacter = z.infer<typeof RawCharacterSchema>

// =================================================================================================

export const TransformSchema = z.object({
  name: z.string(),
  points: z.number(),
})

export const CharacterSchema = z
  .object({
    player: z.string(),
    name: z.string(),
    body: z.literal(`Humanoid`),
    //
    transforms: z
      .object({
        current: z.string(),
        list: z.array(TransformSchema),
      })
      .or(z.null()),
    //
    damageTable: DamageTableSchema, // ST Score -> {thr, sw}
  })
  .strict()

export type Transform = z.infer<typeof TransformSchema>
export type Character = z.infer<typeof CharacterSchema>
