import { Token } from "../../token/core"
import { Node } from "../../tree"
import { RuntimeEvaluation } from "./evaluation"

export const RUNTIME_VALUE_TYPES = [`undefined`, `boolean`, `number`, `string`, `function`, `variable`, `unit`, `quantity`, `object`, `expression`, `property`] as const
export type RuntimeValueType = (typeof RUNTIME_VALUE_TYPES)[number]

export class RuntimeValue<TValue> {
  __runtimeValue: true = true as const
  type: RuntimeValueType
  value: TValue

  constructor(value: TValue) {
    this.value = value
  }

  public static isRuntimeValue(value: any): value is RuntimeValue<any> {
    return value?.__runtimeValue === true
  }

  public getEvaluation(node: Node) {
    return new RuntimeEvaluation(this, node)
  }

  public getContent() {
    return String(this.value)
  }

  public toString() {
    return `<${this.type}> ${this.getContent()}`
  }

  public toToken(): Token {
    throw new Error(`Unsupported operation for "${this.type}"`)
  }

  public isEquals(value: RuntimeValue<any>) {
    return this.type === value.type && this.value === value.value
  }

  public hasNumericRepresentation(): boolean {
    return false
  }

  public hasStringRepresentation(): boolean {
    return false
  }

  public asNumber(): number {
    throw new Error(`Unsupported operation`)
  }

  public asString(): string {
    throw new Error(`Unsupported operation`)
  }
}