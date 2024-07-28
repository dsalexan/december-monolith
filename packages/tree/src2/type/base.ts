import { Stage } from "../stage"
import { isString } from "lodash"
import { TypeName } from "./declarations/name"
import LexicalRule, { LexicalRuleAdder } from "./rules/lexical"
import SyntacticalRule, { SyntacticalRuleAdder, SyntacticalRuleDeriver } from "./rules/syntactical"

export type TypeID = `structural` | `literal` | `whitespace` | `separator` | `operator` | `identifier`

export default class Type {
  public id: TypeID
  public name: TypeName

  public lexical?: LexicalRule
  public syntactical?: SyntacticalRule

  declare addLexical: typeof LexicalRuleAdder
  declare addSyntactical: typeof SyntacticalRuleAdder
  declare deriveSyntactical: typeof SyntacticalRuleDeriver

  // debug/printing shit
  public prefix: string

  constructor(id: TypeID, name: TypeName, prefix: string) {
    this.id = id
    this.name = name
    this.prefix = prefix

    // inject adders
    this.addLexical = LexicalRuleAdder
    this.addSyntactical = SyntacticalRuleAdder
    this.deriveSyntactical = SyntacticalRuleDeriver
  }
}

export function isOperand(id: TypeID): id is `literal` | `identifier` {
  return [`literal`, `identifier`, `whitespace`].includes(id)
}
