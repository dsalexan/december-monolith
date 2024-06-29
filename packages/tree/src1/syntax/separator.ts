import { makeSyntaxRestriction } from "./restriction"
import { all, some } from "./restriction/reorganize"
import { Syntax, SyntaxOptions, SyntaxSymbol } from "./syntax"

export interface SeparatorSyntaxOptions extends SyntaxOptions {
  binary?: boolean
}

export class SeparatorSyntax extends Syntax<string | RegExp> {
  binary: boolean = false

  constructor(name: string, prefix: string, token: string | RegExp, options?: SeparatorSyntaxOptions) {
    super(`separator`, name, prefix, options)

    this.binary = options?.binary ?? false
    this.symbols = [new SyntaxSymbol<string | RegExp>(name, token)]
  }

  token() {
    const patterns = this.symbols[0].patterns

    // ERROR: Separator must be a unique symbol
    if (patterns.length !== 1) debugger

    return patterns[0]
  }

  // getRelevant(node: Node, additional?: ([number, number] | number)[]) {
  //   let relevant = super.getRelevant(node, additional)

  //   // when closed, a separator node has only one relevant, itself (since every instance is later reorganized into a single node)
  //   relevant.splice(0, 0, node.start)

  //   return relevant
  // }
}

export const COMMA = new SeparatorSyntax(`comma`, `C`, `,`, { priority: 10 })
export const COLON = new SeparatorSyntax(`colon`, `N`, `:`, { priority: 11 })
export const PIPE = new SeparatorSyntax(`pipe`, `P`, `|`, { priority: 12 })

export const _EQUALS = new SeparatorSyntax(`equals`, `=`, `=`, { priority: 1010, binary: true, restrictions: { up2Generations: [some(`intersects`, { tags: [`accepts_logical`] })] }, tags: [`accepts_logical`] })
export const _AND = new SeparatorSyntax(`and`, `&`, `&`, { priority: 1002, binary: true, restrictions: { up2Generations: [some(`intersects`, { tags: [`accepts_logical`] })] }, tags: [`accepts_logical`] })
export const _OR = new SeparatorSyntax(`or`, `|`, `|`, { priority: 1001, binary: true, restrictions: { up2Generations: [some(`intersects`, { tags: [`accepts_logical`] })] }, tags: [`accepts_logical`] })

export const _GREATER = new SeparatorSyntax(`greater`, `>`, `>`, { priority: 1012, binary: true, restrictions: { up2Generations: [some(`intersects`, { tags: [`accepts_logical`] })] }, tags: [`accepts_logical`] })
export const _SMALLER = new SeparatorSyntax(`smaller`, `<`, `<`, { priority: 1012, binary: true, restrictions: { up2Generations: [some(`intersects`, { tags: [`accepts_logical`] })] }, tags: [`accepts_logical`] })
export const _GREATER_THAN = new SeparatorSyntax(`greater_than`, `>=`, `>=`, { priority: 1011, binary: true, restrictions: { up2Generations: [some(`intersects`, { tags: [`accepts_logical`] })] }, tags: [`accepts_logical`] })
export const _SMALLER_THAN = new SeparatorSyntax(`smaller_than`, `<=`, `<=`, { priority: 1011, binary: true, restrictions: { up2Generations: [some(`intersects`, { tags: [`accepts_logical`] })] }, tags: [`accepts_logical`] })

// MATH
export const MULTIPLICATION = new SeparatorSyntax(`multiplication`, `×`, `*`, { priority: 10007, binary: true, tags: [`math`] })
export const DIVISION = new SeparatorSyntax(`division`, `÷`, `/`, { priority: 10007, binary: true, tags: [`math`] })
export const ADDITION = new SeparatorSyntax(`addition`, `+`, `+`, { priority: 10005, binary: true, tags: [`math`] })
export const SUBTRACTION = new SeparatorSyntax(`subtraction`, `-`, `-`, { priority: 10005, binary: true, tags: [`math`] })

// GURPS
// export const INVOKER = new SeparatorSyntax(`invoker`, `::`, /(::)/g, { priority: 100005, binary: true })

// WARN: Always update this list when adding a new syntax
export const SYNTAXES = [COMMA, COLON, PIPE, _AND, _OR, _EQUALS, _GREATER, _SMALLER, _GREATER_THAN, _SMALLER_THAN, MULTIPLICATION, DIVISION, ADDITION, SUBTRACTION]
export const SYNTAXES_BY_NAME = SYNTAXES.reduce((acc, syntax) => ({ ...acc, [syntax.name]: syntax }), {})

// WARN: Always update this list when adding a new recipe

export const DEFAULT_SYNTAX_NAMES = [`comma`] as const
export const LOGICAL_SYNTAX_NAMES = [`and`, `or`, `equals`, `greater`, `smaller`, `greater_than`, `smaller_than`] as const
export const SEPARATOR_MATH_AND_LOGICAL_SYNTAX_NAMES = [`multiplication`, `division`, `addition`, `subtraction`, ...LOGICAL_SYNTAX_NAMES] as const

export const SYNTAX_NAMES = [`comma`, `colon`, `pipe`, ...LOGICAL_SYNTAX_NAMES, `multiplication`, `division`, `addition`, `subtraction`] as const
export type SeparatorSyntaxName = (typeof SYNTAX_NAMES)[number]
