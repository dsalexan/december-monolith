import { Builder } from "../../logger"
import BaseSystem from "../system"
import GURPSCharacter from "./character"

export default class GURPS extends BaseSystem {
  constructor(logger: Builder) {
    super(logger)
  }

  /** Method creates a new character */
  override makeCharacter(): GURPSCharacter {
    return new GURPSCharacter()
  }
}
