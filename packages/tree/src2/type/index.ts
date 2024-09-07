import { VariableType } from "@december/utils/typing"

import { BOOLEAN, NUMBER, STRING, UNKNOWN } from "./declarations/literal"

export function getType(type: VariableType) {
  if (type === `number`) return NUMBER
  else if (type === `string`) return STRING
  else if (type === `boolean`) return BOOLEAN

  debugger

  return UNKNOWN
}
