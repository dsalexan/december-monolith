import assert from "assert"
import { isString } from "lodash"

import { Match } from "@december/utils"
import { EQUALS, REGEX } from "@december/utils/match/element"

import { createEntry } from "@december/tree/lexer/grammar"
import { TokenCategory, TokenKind } from "@december/tree/token/kind"
import { MaybeUndefined } from "tsdef"
import { Merge } from "type-fest"

// #region TOKEN KIND

export type GCABonusModularTokenKind =
  | `singleBonus` //
  | `to`
  | `byMode`
  | `from`
  | `upTo`
  | `unless`
  | `onlyIf`
  | `when`
  | `listAs`

export const GCA_BONUS_MODULAR_TOKEN_KIND_CATEGORIES: Record<GCABonusModularTokenKind, TokenCategory> = {
  singleBonus: `keyword`,
  to: `keyword`,
  byMode: `keyword`,
  from: `keyword`,
  upTo: `keyword`,
  unless: `keyword`,
  onlyIf: `keyword`,
  when: `keyword`,
  listAs: `keyword`,
}

// #endregion

// #region LEXICAL GRAMMAR

export const GCA_BONUS_KEYWORD_PRIORITY = 10 ** 21

// export const SINGLE_BONUS = createEntry<GCABonusModularTokenKind>(GCA_BONUS_KEYWORD_PRIORITY + 1, `singleBonus`, EQUALS(`=`))
export const TO = createEntry<GCABonusModularTokenKind>(GCA_BONUS_KEYWORD_PRIORITY + 2, `to`, EQUALS(`To`, true))
export const BY_MODE = createEntry<GCABonusModularTokenKind>(GCA_BONUS_KEYWORD_PRIORITY + 3, `byMode`, EQUALS(`ByMode`, true))
export const FROM = createEntry<GCABonusModularTokenKind>(GCA_BONUS_KEYWORD_PRIORITY + 4, `from`, EQUALS(`From`, true))
export const UP_TO = createEntry<GCABonusModularTokenKind>(GCA_BONUS_KEYWORD_PRIORITY + 5, `upTo`, EQUALS(`UpTo`, true))
export const UNLESS = createEntry<GCABonusModularTokenKind>(GCA_BONUS_KEYWORD_PRIORITY + 6, `unless`, EQUALS(`Unless`, true))
export const ONLY_IF = createEntry<GCABonusModularTokenKind>(GCA_BONUS_KEYWORD_PRIORITY + 7, `onlyIf`, EQUALS(`OnlyIf`, true))
export const WHEN = createEntry<GCABonusModularTokenKind>(GCA_BONUS_KEYWORD_PRIORITY + 8, `when`, EQUALS(`When`, true))
export const LIST_AS = createEntry<GCABonusModularTokenKind>(GCA_BONUS_KEYWORD_PRIORITY + 9, `listAs`, EQUALS(`ListAs`, true))

export const GCA_BONUS_MODULAR_LEXICAL_GRAMMAR = [TO, BY_MODE, FROM, UP_TO, UNLESS, ONLY_IF, WHEN, LIST_AS]

// #endregion
