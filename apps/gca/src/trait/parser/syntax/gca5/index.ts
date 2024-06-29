import { makeSyntaticComponent } from "../component"
import { GCA5SyntaxNames, SyntaxComponent } from "../types"

export const GCA5_SYNTAX_COMPONENTS = {
  gca5_gives: makeSyntaticComponent(`separator`, `gca5_gives`, `G_gives`, [], {
    prio: 5,
    patterns: [/^ *=/i, / to /i, / ByMode( where)? /i, / UpTo /i, / ListAs /i],
    patternsName: [`equal`, `to`, `byMode`, `upTo`, `listAs`],
    parents: [`string`, `list`],
    specialization: true,
  }),
} as Partial<Record<GCA5SyntaxNames, SyntaxComponent>>
