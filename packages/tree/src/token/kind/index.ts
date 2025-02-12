/** https://en.wikipedia.org/wiki/Lexical_analysis */

import assert from "assert"
import { Nullable } from "tsdef"
import { difference, isString } from "lodash"
import { TokenCategory } from "./categories"

export type { TokenCategory } from "./categories"
export { TOKEN_CATEGORIES } from "./categories"

export type { TokenKind } from "./base"
export { TOKEN_KIND_CATEGORIES } from "./base"

export { getTokenKindBlocks, getTokenKindColor } from "./utils"
