import { z } from "zod"

export const TraitMetadataSchema = z.object({
  _: z.object({
    calculated: z.object({
      syslevels: z.number(),
    }),
  }),
})
// export const TraitMetadataSchema = _TraitMetadataSchema.merge(MetadataSchema)

export type TraitMetadata = z.infer<typeof TraitMetadataSchema>
