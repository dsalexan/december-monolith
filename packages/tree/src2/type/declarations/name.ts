import { StructuralTypeName } from "./structural"
import type { WhitespaceTypeName } from "./whitespace"
import type { LiteralTypeName } from "./literal"
import type { OperatorTypeName } from "./operator"
import type { SeparatorTypeName } from "./separator"
import type { CompositeTypeName } from "./composite"
import type { IdentifierTypeName } from "./identifier"

export type TypeName = WhitespaceTypeName | LiteralTypeName | OperatorTypeName | SeparatorTypeName | StructuralTypeName | CompositeTypeName | IdentifierTypeName
