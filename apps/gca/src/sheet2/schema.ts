import { z } from "zod"
import { Interpreter } from "../../../../packages/tree/src"
import { Computed } from "@december/compile"

export const MetadataSchema = z.object({
  _: z.object({
    version: z.string().optional(),
    raw: z.any(), // TODO: Should I be validating raw?
    aliases: z.string().optional(),
    // interpreted: z.record(z.string(), z.any()).optional(), // path inside object.data -> interpretedObject (Interpreted.ProcessedObject) [not validated]
    computed: z.record(z.string(), z.any()).optional(), // path inside object.data -> computed value
  }),
})

type ZInferedMetadata = z.infer<typeof MetadataSchema>

// WARN: Be careful with this type. Since I'm manually infering it, any changes on the schema shoud be PRECISELY reflected here.
export type Metadata<TRaw = any> = {
  _: {
    version?: string | undefined
    raw?: TRaw
    aliases?: string[] | undefined
    // interpreted?: Record<string, Interpreter.ProcessedObject> | undefined
    computed?: Record<string, Computed.Object.ComputedObject<any>>
  }
}
