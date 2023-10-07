import { z } from "zod"

export const GCANumberSchema = z.number().or(z.literal(`neg.`))

export type GCANumber = z.infer<typeof GCANumberSchema>
//            ^?
