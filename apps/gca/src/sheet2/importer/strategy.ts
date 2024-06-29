import { Builder, ILogger } from "@december/logger"

import type CharacterSheet from ".."
import { RawCharacter } from "../character/schema"

export type CharacterImportStrategyReturn = { character: RawCharacter; traits: Record<string, unknown>; stats: Record<string, unknown> }
export type CharacterImportStrategy = (content: any, logger: Builder) => CharacterImportStrategyReturn
