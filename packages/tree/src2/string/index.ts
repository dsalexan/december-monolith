import { v4 as uuidv4 } from "uuid"

export class StringProvider {
  public value: string
  public signature: string

  constructor(value: string) {
    this.update(value)
  }

  update(value: string) {
    this.value = value
    this.signature = uuidv4()
  }
}

/** A partial string from a centralized source */
export interface ProvidedString {
  type: `provided`
  //
  start: number
  length: number
  //
  provider: StringProvider
}

/** Just a string */
export interface ConcreteString {
  type: `concrete`
  //
  value: string
}

export function cloneString(string: ProvidedString | ConcreteString): ProvidedString | ConcreteString {
  if (string.type === `concrete`) return { ...string }
  return {
    type: `provided`,
    //
    start: string.start,
    length: string.length,
    //
    provider: string.provider,
  }
}
