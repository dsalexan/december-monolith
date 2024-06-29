import { z } from "zod"
import { isNilOrEmpty } from "@december/utils"

export class MathEnabledValue {
  value: string

  constructor(value: string) {
    // if (isNilOrEmpty(value)) throw new Error(`Value cannot be empty`)

    this.value = value
  }

  calc() {
    throw new Error(`Method not implemented.`)
    return 0
  }
}

export const MathEnabledValueSchema = z.instanceof(MathEnabledValue)
