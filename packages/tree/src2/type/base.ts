import { isString, identity, isArrayLike } from "lodash"

import { Nullable } from "@december/utils/typing"

import type { InOrderBehaviour } from "./../node/traversal"
import { Stage } from "../stage"
import { TypeName } from "./declarations/name"
import LexicalRule, { LexicalRuleAdder, LexicalRuleDeriver } from "./rules/lexical"
import SyntacticalRule, { defaultSyntacticalRule, SyntacticalRuleAdder, SyntacticalRuleDeriver } from "./rules/syntactical"
import SemanticalRule, { SemanticalRuleAdder, SemanticalRuleDeriver } from "./rules/semantical"
import ReduceRule, { ReduceRuleAdder } from "./rules/reducer"
import assert from "assert"
import { MaybeUndefined } from "tsdef"

type Maybe<T> = T | undefined

export type TypeID = `structural` | `literal` | `whitespace` | `separator` | `enclosure` | `operator` | `identifier` | `composite` | `keyword`

export type TypeModule = `default` | `operand` | `literal:like` | `logical` | `arithmetic` | `inequality` | `wrapper` | `context:break` | `identifier` | `numeric` | `quantity:numerical-value`

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
  public _reduce?: ReduceRule

  public inOrderBehaviour: InOrderBehaviour

  declare addLexical: typeof LexicalRuleAdder
  declare deriveLexical: typeof LexicalRuleDeriver
  declare addSyntactical: typeof SyntacticalRuleAdder
  declare deriveSyntactical: typeof SyntacticalRuleDeriver
  declare addSemantical: typeof SemanticalRuleAdder
  declare deriveSemantical: typeof SemanticalRuleDeriver
  declare addReduce: typeof ReduceRuleAdder

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
    this.addReduce = ReduceRuleAdder
  }

  get lexical(): MaybeUndefined<LexicalRule> {
    return this._lexical
  }

  get syntactical(): MaybeUndefined<SyntacticalRule> {
    return this._syntactical ?? defaultSyntacticalRule(this)
  }

  get semantical(): MaybeUndefined<SemanticalRule> {
    return this._semantical
  }

  get reduce(): MaybeUndefined<ReduceRule> {
    return this._reduce
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

  /** Compares priority between two types. -1: this < other; 1: other < this */
  comparePriority(this: Type, other: Type, rule: `lexical` | `syntactical` | `semantical`): 1 | 0 | -1 {
    const A = this[rule]!
    const B = other[rule]!

    if (A.priority < B.priority) return -1

    if (A.priority === B.priority) return 0

    if (A.priority > B.priority) return 1

    throw new Error(`Shouldn't reach here`)
  }

  static orderByPriority<TItem = Type>(rule: `lexical` | `syntactical` | `semantical`, collection: TItem[], iteratees: Nullable<Iteratee<Type, TItem>[]> = null, orders: Nullable<(`asc` | `desc`)[]> = null): TItem[] {
    iteratees ??= [type => type as Type]
    orders ??= [`asc`]

    assert(iteratees?.length === orders?.length, `Iteratees and orders must have the same length`)

    let sorted = [...collection]

    for (let i = iteratees.length - 1; i >= 0; i--) {
      const iteratee = iteratees[i]
      const order = orders[i]

      sorted = sorted
        .map((item, index) => ({ item, index })) // map index
        .sort((a, b) => iteratee(a.item).comparePriority(iteratee(b.item), rule) * (order === `desc` ? -1 : 1) || a.index - b.index) // sort by priority
        .map(({ item }) => item)
    }

    return sorted
  }

  // UTILS
  isLiteralLike() {
    return this.id === `literal` || this.modules.includes(`literal:like`)
  }
}

type Iteratee<R, T> = (item: T) => R
