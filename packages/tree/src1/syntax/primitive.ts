import { Syntax, SyntaxOptions } from "./syntax"

export interface PrimitiveSyntaxOptions extends SyntaxOptions {}

export class PrimitiveSyntax extends Syntax<never> {
  constructor(name: string, prefix: string, options?: PrimitiveSyntaxOptions) {
    super(`primitive`, name, prefix, options)
  }
}

export const ROOT = new PrimitiveSyntax(`root`, `root`)
export const NIL = new PrimitiveSyntax(`nil`, `⌀`)
export const WHITESPACE = new PrimitiveSyntax(`whitespace`, `w`, { tags: [`text`] })
export const STRING = new PrimitiveSyntax(`string`, `x`, { tags: [`text`] })
export const NUMBER = new PrimitiveSyntax(`number`, `n`, { tags: [`text`, `math`] })
export const LIST = new PrimitiveSyntax(`list`, `l`)

// WARN: Always update this list when adding a new recipe
export const SYNTAXES = [ROOT, NIL, STRING, LIST, NUMBER, WHITESPACE]
export const SYNTAXES_BY_NAME = SYNTAXES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

// WARN: Always update this list when adding a new recipe
export const SYNTAX_NAMES = [`root`, `string`, `nil`, `list`, `number`, `whitespace`] as const
export type PrimitiveSyntaxName = (typeof SYNTAX_NAMES)[number]
