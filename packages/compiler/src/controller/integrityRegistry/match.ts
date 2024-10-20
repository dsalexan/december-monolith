import { Reference } from "@december/utils/access"
import { BasePattern, BasePatternMatch, BasePatternOptions, PatternMatchInfo } from "@december/utils/match/base"
import { ElementPattern, EQUALS } from "@december/utils/match/element"

export interface IntegrityEntryPatternOptions extends BasePatternOptions {}

export interface IntegrityEntryPatternMatchInfo extends PatternMatchInfo {
  idMatch: BasePatternMatch
}

export class IntegrityEntryPattern extends BasePattern<IntegrityEntryPatternMatchInfo> {
  declare type: `integrityEntry`

  keyPattern: ElementPattern<string>
  valuePattern: ElementPattern<string | null>

  constructor(key: ElementPattern<string> | string, value: ElementPattern<string | null> | string | null, options: Partial<IntegrityEntryPatternOptions> = {}) {
    super(`integrityEntry`, options)

    this.keyPattern = key instanceof BasePattern ? key : EQUALS(key)
    this.valuePattern = value instanceof BasePattern ? value : EQUALS(value)
  }

  override _match(integrityEntryKey: string): IntegrityEntryPatternMatchInfo {
    const idMatch = this.keyPattern.match(integrityEntryKey)
    // const valueMatch = this.valuePattern.match(reference.value.value)

    // return idMatch //&& valueMatch
    return {
      isMatch: idMatch.isMatch,
      idMatch,
    }
  }

  override match(integrityEntryKey: string): BasePatternMatch {
    return super.match(integrityEntryKey)
  }

  override _toString() {
    return `(${this.keyPattern.toString()}, ${this.valuePattern.toString()})`
  }
}

export const SIGNATURE = (keyPattern: ElementPattern<string> | string, valuePattern: ElementPattern<string | null> | string | null) => new IntegrityEntryPattern(keyPattern, valuePattern)
