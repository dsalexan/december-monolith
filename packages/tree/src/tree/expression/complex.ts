import { NodeType } from "../type"
import { Expression } from "./expression"

import { Token } from "../../token/core"
import { Node } from "../node"

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

  constructor(object: Expression, property: Token) {
    super()
    this.tokens = [property]

    this.addChild(object, 0, `object`)
  }

  public override constructClone(options): this {
    return new MemberExpression(this.object.clone(options), this.property.clone(options)) as this
  }

  public get property(): Token {
    return this.tokens[0]
  }

  public get object(): Expression {
    return this.children[0]
  }

  public getObjectVariableName(): string {
    return this.object.getContent()
  }

  public getPropertyName(): string {
    return this.property.content
  }

  public override getContent(): string {
    return `${this.getObjectVariableName()}->${this.getPropertyName()}`
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

  public get alternative(): Expression {
    return this.children[2]
  }

  public override getContent({ depth, separator, wrap }: { depth?: number; separator?: string; wrap?: boolean } = {}): string {
    const condition = this.condition.getContent({ depth, separator, wrap })
    const consequent = this.consequent.getContent({ depth, separator, wrap })
    const alternative = this.alternative?.getContent({ depth, separator, wrap })

    return `@if(${condition} then ${consequent} else ${alternative})`
  }
}
