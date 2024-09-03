import type { InOrderBehaviour } from "./../node/traversal"
import { Stage } from "../stage"
import { isString } from "lodash"
import { TypeName } from "./declarations/name"
import LexicalRule, { LexicalRuleAdder, LexicalRuleDeriver } from "./rules/lexical"
import SyntacticalRule, { defaultSyntacticalRule, SyntacticalRuleAdder, SyntacticalRuleDeriver } from "./rules/syntactical"
import SemanticalRule, { SemanticalRuleAdder, SemanticalRuleDeriver } from "./rules/semantical"
import assert from "assert"

type Maybe<T> = T | undefined

export type TypeID = `structural` | `literal` | `whitespace` | `separator` | `enclosure` | `operator` | `identifier` | `composite` | `keyword`

export type TypeModule = `default` | `operand` | `logical` | `arithmetic` | `wrapper` | `context:break` | `identifier`

export default class Type {
  public id: TypeID
  public name: TypeName
  public modules: TypeModule[]

  getFullName() {
    return `${this.id}:${this.name}`
  }

  public _lexical?: LexicalRule
  public _syntactical?: SyntacticalRule
  public _semantical?: SemanticalRule

  public inOrderBehaviour: InOrderBehaviour

  declare addLexical: typeof LexicalRuleAdder
  declare deriveLexical: typeof LexicalRuleDeriver
  declare addSyntactical: typeof SyntacticalRuleAdder
  declare deriveSyntactical: typeof SyntacticalRuleDeriver
  declare addSemantical: typeof SemanticalRuleAdder
  declare deriveSemantical: typeof SemanticalRuleDeriver

  // debug/printing shit
  public prefix: string

  constructor(id: TypeID, name: TypeName, prefix: string, modules: TypeModule[] = [`default`]) {
    this.id = id
    this.name = name
    this.prefix = prefix
    this.modules = modules

    // inject adders
    this.addLexical = LexicalRuleAdder
    this.deriveLexical = LexicalRuleDeriver
    this.addSyntactical = SyntacticalRuleAdder
    this.deriveSyntactical = SyntacticalRuleDeriver
    this.addSemantical = SemanticalRuleAdder
    this.deriveSemantical = SemanticalRuleDeriver
  }

  get lexical() {
    return this._lexical
  }

  get syntactical() {
    return this._syntactical ?? defaultSyntacticalRule(this)
  }

  get semantical() {
    return this._semantical
  }

  setInOrderBehaviour(behaviour: InOrderBehaviour) {
    this.inOrderBehaviour = behaviour

    return this
  }

  toString() {
    return `${this.id}:${this.name}`
  }

  makeIdentifier(name: string): symbol {
    return Symbol.for(`${this.getFullName()}:${name}`)
  }
}
