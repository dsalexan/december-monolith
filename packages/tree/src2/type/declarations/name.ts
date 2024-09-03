import { StructuralTypeName } from "./structural"
import type { WhitespaceTypeName } from "./whitespace"
import type { LiteralTypeName } from "./literal"
import type { OperatorTypeName } from "./operator"
import type { SeparatorTypeName } from "./separator"
import type { EnclosureTypeName } from "./enclosure"
import type { IdentifierTypeName } from "./identifier"
import type { KeywordTypeName } from "./keyword"

export type TypeName = WhitespaceTypeName | LiteralTypeName | OperatorTypeName | SeparatorTypeName | StructuralTypeName | EnclosureTypeName | IdentifierTypeName | KeywordTypeName
