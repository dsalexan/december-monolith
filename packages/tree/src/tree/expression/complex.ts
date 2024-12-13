import { NodeType } from "../type"
import { Expression } from "./expression"

import { Token } from "../../token/core"

export class BinaryExpression extends Expression {
  type: NodeType = `BinaryExpression`
  public operator: Token

  constructor(left: Expression, operator: Token, right: Expression) {
    super()
    this.operator = operator

    this.addChild(left, 0, `left`)
    this.addChild(right, 1, `right`)
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

  public get callee(): Expression {
    return this.children[0]
  }

  public get arguments(): Expression[] {
    return this.children.slice(1)
  }
}

export class MemberExpression extends Expression {
  type: NodeType = `MemberExpression`
  public property: Token

  constructor(object: Expression, property: Token) {
    super()
    this.property = property

    this.addChild(object, 0, `object`)
  }

  public get object(): Expression {
    return this.children[0]
  }
}

export class PrefixExpression extends Expression {
  type: NodeType = `PrefixExpression`
  public operator: Token

  constructor(operator: Token, right: Expression) {
    super()
    this.operator = operator

    this.addChild(right, 0, `right`)
  }

  public get right(): Expression {
    return this.children[0]
  }
}
