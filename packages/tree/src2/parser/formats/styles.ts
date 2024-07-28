import { Grid, paint, Paint } from "@december/logger"

import type { TypeName } from "../../type/declarations/name"
import type { TypeID } from "../../type/base"

export interface Style {
  foreground: Paint
  background: Paint
}

export const BY_TYPE_ID: Partial<Record<TypeID, Paint>> = {
  literal: paint.blue,
  separator: paint.green,
  operator: paint.white,
}

export const BY_TYPE_NAME: Partial<Record<TypeName, Paint>> = {
  unknown: paint.yellow,
  whitespace: paint.bgGray,
}
