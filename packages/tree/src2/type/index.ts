import { Arguments } from "tsdef"
import { VariableType } from "@december/utils/typing"

import { BOOLEAN, NUMBER, QUANTITY, STRING, UNKNOWN } from "./declarations/literal"

export function getType(type: VariableType | `quantity`) {
  if (type === `number`) return NUMBER
  else if (type === `string`) return STRING
  else if (type === `boolean`) return BOOLEAN
  else if (type === `quantity`) return QUANTITY

  debugger

  return UNKNOWN
}
