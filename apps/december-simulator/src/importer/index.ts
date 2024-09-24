import { Builder, WithLogger } from "../logger"
import BaseCharacter from "../character"

export default class GenericImporter extends WithLogger {
  constructor(logger: Builder) {
    super(logger)
  }

  async import(file: string, character: BaseCharacter) {
    throw new Error(`Method not implemented.`)
  }
}
