import BaseCharacter from "../character"
import { Builder, WithLogger } from "../logger"

export default class BaseSystem extends WithLogger {
  constructor(logger: Builder) {
    super(logger)
  }

  /** Method creates a new character */
  makeCharacter() {
    return new BaseCharacter()
  }
}
