import { NodeType } from "../type"
import { Expression } from "./expression"

import { Token } from "../../token/core"
import { Node } from "../node"
import { SyntacticalContext } from "../../parser"
import { cloneDeep, isString } from "lodash"
import { MaybeUndefined, Nullable } from "tsdef"
import assert from "assert"
import { Identifier, StringLiteral } from "./basic"
import { makeConstantLiteral } from "../../utils/factories"

export class BinaryExpression extends Expression {
  type: NodeType = `BinaryExpression`

  constructor(left: Expression, operator: Token, right: Expression) {
    super()
    this.tokens = [operator]

    this.addChild(left, 0, `left`)
    this.addChild(right, 1, `right`)
  }

  public override constructClone(options): this {
    return new BinaryExpression(this.left.clone(options), this.operator.clone(options), this.right.clone(options)) as this
  }

  public get operator(): Token {
    return this.tokens[0]
  }

  public get left(): Expression {
    return this.children[0] as Expression
  }

  public get right(): Expression {
    return this.children[1]
  }
}

export class CallExpression extends Expression {
  type: NodeType = `CallExpression`

  constructor(callee: Expression, args: Expression[]) {
    super()

    this.addChild(callee, 0, `callee`)
    for (const [i, arg] of args.entries()) this.addChild(arg, i + 1, `arg${i}`)
  }

  public override constructClone(options): this {
    return new CallExpression(
      this.callee.clone(options),
      this.arguments.map(arg => arg.clone(options)),
    ) as this
  }

  public get callee(): Expression {
    return this.children[0]
  }

  public get arguments(): Expression[] {
    return this.children.slice(1)
  }

  public override getContent({ depth, separator, wrap }: { depth?: number; separator?: string; wrap?: boolean } = {}): string {
    const callee = this.callee.getContent({ depth, separator, wrap })
    const args = this.arguments.map(arg => arg.getContent({ depth, separator, wrap }))

    return `${callee}(${args.join(`, `)})`
  }
}

export class MemberExpression extends Expression {
  type: NodeType = `MemberExpression`
  public quoted: boolean = false

  constructor(object: Expression, property: Expression) {
    super()

    this.addChild(object, 0, `object`)
    this.addChild(property, 1, `property`)
  }

  public override constructClone(options): this {
    const clone = new MemberExpression(this.object.clone(options), this.property.clone(options)) as this
    clone.quoted = this.quoted
    return clone
  }
  public get object(): Expression {
    return this.children[0]
  }

  public get property(): Expression {
    return this.children[1]
  }

  public override getWrappers(): [string, string] {
    return [`"`, `"`]
  }

  public override forceWrap(): boolean {
    return false
  }

  public getObjectVariableName(): string {
    return this.object.getContent()
  }

  public getPropertyName(): string {
    return this.property.getContent()
  }

  public override getContent(): string {
    const [opener, closer] = this.forceWrap() ? this.getWrappers() : [``, ``]
    return `${opener}${this.getObjectVariableName()}->${this.getPropertyName()}${closer}`
  }

  public static makeChain(object: Expression, ...accessChain: (string | Expression)[]): MemberExpression {
    // 1. Start buffer with root object
    let buffer: MemberExpression = object as any

    // 2. Iterate over accessChain array, nesting member expressions to buffer
    for (const access of accessChain) {
      let accessor: StringLiteral | Identifier

      if (Node.isNode(access)) {
        if (access.type === `Identifier`) accessor = access as Identifier
        else if (access.type === `StringLiteral`) accessor = access as StringLiteral
        //
        else throw new Error(`Invalid accessor type "${access.type}"`)
      } else if (isString(access)) accessor = makeConstantLiteral(access)
      //
      else throw new Error(`Invalid accessor type "${access}" (${typeof access})`)

      buffer = new MemberExpression(buffer, accessor)
    }

    return buffer
  }
}

export class PrefixExpression extends Expression {
  type: NodeType = `PrefixExpression`

  constructor(operator: Token, right: Expression) {
    super()
    this.tokens = [operator]

    this.addChild(right, 0, `right`)
  }

  public override constructClone(options): this {
    return new PrefixExpression(this.operator.clone(options), this.right.clone(options)) as this
  }

  public get operator(): Token {
    return this.tokens[0]
  }

  public get right(): Expression {
    return this.children[0]
  }

  public override getContent(): string {
    return super.getContent({ injectTokenBeforeFirstChild: true })
  }
}

export class IfExpression extends Expression {
  type: NodeType = `IfExpression`

  constructor(condition: Expression, consequent: Expression, alternative?: Expression) {
    super()

    this.addChild(condition, 0, `condition`)
    this.addChild(consequent, 1, `consequent`)
    if (alternative) this.addChild(alternative, 2, `alternative`)
  }

  public override constructClone(options): this {
    return new IfExpression(this.condition.clone(options), this.consequent.clone(options), this.alternative ? this.alternative.clone(options) : undefined) as this
  }

  public get condition(): Expression {
    return this.children[0]
  }

  public get consequent(): Expression {
    return this.children[1]
  }

  public get alternative(): MaybeUndefined<Expression> {
    return this.children[2]
  }

  public override getContent({ depth, separator, wrap }: { depth?: number; separator?: string; wrap?: boolean } = {}): string {
    const condition = this.condition.getContent({ depth, separator, wrap })
    const consequent = this.consequent.getContent({ depth, separator, wrap })
    const alternative = this.alternative?.getContent({ depth, separator, wrap })

    return `@if(${condition} then ${consequent} else ${alternative})`
  }
}

/** Basically changes the syntactical context for parsing down. More of a parsing device. */
export class SyntacticalContextExpression extends Expression {
  type: NodeType = `SyntacticalContextExpression`
  public context: Nullable<SyntacticalContext>

  public get expression(): Expression {
    return this.children[0]
  }

  constructor(context: Nullable<SyntacticalContext>, expression: Expression) {
    super()
    this.context = context ? cloneDeep(context) : null
    this.addChild(expression, 0, `expression`)
  }

  public override constructClone(options): this {
    assert(this.context, `No context, what`)
    return new SyntacticalContextExpression(this.context, this.expression.clone(options)) as this
  }

  public override getDebug(): string {
    assert(this.context, `No context, what`)
    return `{${this.context.mode.toUpperCase()}} ${this.expression.getDebug()}`
  }
}
