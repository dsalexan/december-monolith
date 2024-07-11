import type { OperatorTokenTypeName } from "./operator"
import type { LiteralTokenTypeName } from "./literal"
import type { SeparatorTokenTypeName } from "./separator"
import type { WhitespacesTokenTypeName } from "./whitespace"

export { TokenTypeID } from "./base"
export { default as TokenType } from "./base"

export type TokenTypeName = LiteralTokenTypeName | WhitespacesTokenTypeName | SeparatorTokenTypeName | OperatorTokenTypeName
