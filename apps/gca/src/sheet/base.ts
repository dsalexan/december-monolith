import { z } from "zod"
import { TraitSchema } from "./trait"

export const CharacterDataSchema = z
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
    traits: z.record(z.number().or(z.string()), TraitSchema),
  })
  .strict()

export type CharacterData = z.infer<typeof CharacterDataSchema>
