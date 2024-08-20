import type { InOrderBehaviour } from "./../node/traversal"
import { Stage } from "../stage"
import { isString } from "lodash"
import { TypeName } from "./declarations/name"
import LexicalRule, { LexicalRuleAdder } from "./rules/lexical"
import SyntacticalRule, { SyntacticalRuleAdder, SyntacticalRuleDeriver } from "./rules/syntactical"
import SemanticalRule, { SemanticalRuleAdder, SemanticalRuleDeriver } from "./rules/semantical"

export type TypeID = `structural` | `literal` | `whitespace` | `separator` | `operator` | `identifier` | `composite`

export default class Type {
  public id: TypeID
  public name: TypeName
  public modules: string[]

  getFullName() {
    return `${this.id}:${this.name}`
  }

  public lexical?: LexicalRule
  public syntactical?: SyntacticalRule
  public semantical?: SemanticalRule

  public inOrderBehaviour: InOrderBehaviour

  declare addLexical: typeof LexicalRuleAdder
  declare addSyntactical: typeof SyntacticalRuleAdder
  declare deriveSyntactical: typeof SyntacticalRuleDeriver
  declare addSemantical: typeof SemanticalRuleAdder
  declare deriveSemantical: typeof SemanticalRuleDeriver

  // debug/printing shit
  public prefix: string

  constructor(id: TypeID, name: TypeName, prefix: string, modules: string[] = [`default`]) {
    this.id = id
    this.name = name
    this.prefix = prefix
    this.modules = modules

    // inject adders
    this.addLexical = LexicalRuleAdder
    this.addSyntactical = SyntacticalRuleAdder
    this.deriveSyntactical = SyntacticalRuleDeriver
    this.addSemantical = SemanticalRuleAdder
    this.deriveSemantical = SemanticalRuleDeriver
  }

  setInOrderBehaviour(behaviour: InOrderBehaviour) {
    this.inOrderBehaviour = behaviour

    return this
  }

  toString() {
    return `${this.id}:${this.name}`
  }
}

export function isOperand(id: TypeID): id is `literal` | `identifier` {
  return [`literal`, `identifier`, `whitespace`].includes(id)
}
