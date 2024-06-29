import { Syntax, SyntaxOptions, SyntaxSymbol } from "./syntax"

export interface EnclosureSyntaxOptions extends SyntaxOptions {}

export class EnclosureSyntax extends Syntax<string> {
  constructor(name: string, prefix: string, opener: string, closer: string, options?: EnclosureSyntaxOptions) {
    super(`enclosure`, name, prefix, options)

    this.symbols.push(new SyntaxSymbol(`opener`, opener))
    this.symbols.push(new SyntaxSymbol(`closer`, closer))
  }

  get opener() {
    return this.symbols[0].patterns[0]
  }

  get closer() {
    return this.symbols[1].patterns[0]
  }

  sameSymbolForOpenerAndCloser() {
    return this.opener === this.closer
  }

  // getRelevant(node: Node, additional?: ([number, number] | number)[]) {
  //   let relevant = super.getRelevant(node, additional)

  //   // first and last characters (opener and closer) are the relevant ones
  //   relevant.splice(0, 0, [node.start, node.start + node.length - 1])

  //   return relevant
  // }
}

export const IMAGINARY = new EnclosureSyntax(`imaginary`, `ι`, `⟨`, `⟩`, { tags: [`accepts_logical`, `math`] })
export const PARENTHESIS = new EnclosureSyntax(`parenthesis`, `ρ`, `(`, `)`, { tags: [`math`] })
export const BRACES = new EnclosureSyntax(`braces`, `γ`, `{`, `}`)
export const BRACKETS = new EnclosureSyntax(`brackets`, `β`, `[`, `]`)
export const QUOTES = new EnclosureSyntax(`quotes`, `κ`, `"`, `"`)
export const PERCENTAGE = new EnclosureSyntax(`percentage`, `τ`, `%`, `%`)

// WARN: Always update this list when adding a new syntax
export const SYNTAXES = [IMAGINARY, PARENTHESIS, BRACES, BRACKETS, QUOTES, PERCENTAGE]
export const SYNTAXES_BY_NAME = SYNTAXES.reduce((acc, syntax) => ({ ...acc, [syntax.name]: syntax }), {})

// WARN: Always update this list when adding a new syntax
export const SYNTAX_NAMES = [`imaginary`, `parenthesis`, `braces`, `brackets`, `quotes`, `percentage`] as const
export type EnclosureSyntaxName = (typeof SYNTAX_NAMES)[number]
