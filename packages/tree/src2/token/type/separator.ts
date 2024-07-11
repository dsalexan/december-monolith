import assert from "assert"
import TokenType, { EvaluateFunction } from "./base"
import type { TokenTypeName } from "."
import { TokenPattern, TokenPatternList, TokenPatternString } from "./pattern"
import { isNil } from "lodash"

class WrapperTokenType extends TokenType {
  declare pattern: TokenPatternList | TokenPatternString

  get openerAndCloserAreTheSame() {
    return this.pattern.type === `list` && this.pattern.values[0] === this.pattern.values[1]
  }

  constructor(name: TokenTypeName, pattern: TokenPatternString | TokenPatternList, priority: number) {
    super(`separator`, name, pattern, priority, (token, options) => {
      let variant: null | `intermediary` | `opener` | `closer` | `opener-and-closer` = null

      const value = token.lexeme

      if (this.pattern.type === `string`) variant = `intermediary`
      else {
        if (this.openerAndCloserAreTheSame && value === this.pattern.values[0]) variant = `opener-and-closer`
        else if (value === this.pattern.values[0]) variant = `opener`
        else if (value === this.pattern.values[1]) variant = `closer`
      }

      assert(!isNil(variant), `Unknown variant for wrapper separator token`)

      return { value, variant }
    })
  }
}

export const COMMA = new WrapperTokenType(`comma`, { type: `string`, value: `,` }, 10)
export const COLON = new WrapperTokenType(`colon`, { type: `string`, value: `;` }, 11)
export const PIPE = new WrapperTokenType(`pipe`, { type: `string`, value: `|` }, 12)

export const PARENTHESIS = new WrapperTokenType(`paranthesis`, { type: `list`, values: [`(`, `)`] }, 100)
export const BRACES = new WrapperTokenType(`braces`, { type: `list`, values: [`{`, `}`] }, 101)
export const BRACKETS = new WrapperTokenType(`brackets`, { type: `list`, values: [`[`, `]`] }, 102)
export const QUOTES = new WrapperTokenType(`quotes`, { type: `list`, values: [`"`, `"`] }, 103)
export const PERCENTAGE = new WrapperTokenType(`percentage`, { type: `list`, values: [`%`, `%`] }, 104)

// WARN: Always update this list when adding a new recipe
export const WRAPPER_SEPARATORS = [PARENTHESIS, BRACES, BRACKETS, QUOTES, PERCENTAGE]
export const WRAPPER_SEPARATOR_NAMES = [`paranthesis`, `braces`, `brackets`, `quotes`, `percentage`] as const
export type WrapperSeparatorTokenTypeName = (typeof WRAPPER_SEPARATOR_NAMES)[number]

export const SEPARATORS = [COMMA, COLON, PIPE, ...WRAPPER_SEPARATORS]
export const SEPARATOR_NAMES = [`comma`, `colon`, `pipe`, ...WRAPPER_SEPARATOR_NAMES] as const
export type SeparatorTokenTypeName = (typeof SEPARATOR_NAMES)[number]

export const SEPARATORS_BY_NAME = SEPARATORS.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

export const DEFAULT_SEPARATORS = [COMMA]
