import { Grid, paint, Paint } from "@december/logger"

import type { TypeName } from "./declarations/name"
import type { TypeID } from "./base"
import type Type from "./base"

export interface Style {
  foreground: Paint
  background: Paint
}

export const BY_TYPE_ID: Partial<Record<TypeID, Paint>> = {
  literal: paint.blue,
  separator: paint.green,
  operator: paint.white,
  composite: paint.magenta,
}

export const BY_TYPE_NAME: Partial<Record<TypeName, Paint>> = {
  unknown: paint.yellow,
  whitespace: paint.bgGray,
  nil: paint.gray,
}

export function BY_TYPE(type: Type): Paint {
  let color = BY_TYPE_NAME[type.name] ?? BY_TYPE_ID[type.id] ?? paint.white

  return color
}

export function BY_ALTERNATING_NUMBER_AND_TYPE(number: number, type: TypeName): Paint {
  if (type === `whitespace`) return paint.bgGray
  else if (type === `nil`) return paint.grey
  else if (type === `root`) return paint.white

  return number % 2 === 0 ? paint.blue : paint.green
}
