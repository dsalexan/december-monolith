import { StructuralTypeName } from "./structural"
import type { WhitespaceTypeName } from "./whitespace"
import type { LiteralTypeName } from "./literal"
import type { OperatorTypeName } from "./operator"
import type { SeparatorTypeName } from "./separator"

export type TypeName = WhitespaceTypeName | LiteralTypeName | OperatorTypeName | SeparatorTypeName | StructuralTypeName
