import { orderBy } from "lodash"
import { RECOGNIZED_DIRECTIVES, SYNTAX_COMPONENTS, SyntaxComponent, SyntaxName } from "."
import { LOGIC_FUNCTION_NAMES } from "./logic"

export const FUNCTION_LIKE_PRIORITY = {
  directive: 2,
} as Record<SyntaxName, number>
