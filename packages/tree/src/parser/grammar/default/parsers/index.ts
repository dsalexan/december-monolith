import { parseBinaryExpression, parseCallExpression, parseExpression, parseGroupingExpression, parseMemberExpression, parsePrefixExpression, parsePrimaryExpression, parseConcatenatedExpression } from "./expression"
import { parseStatement, parseExpressionStatement, parseIfStatement } from "./statement"

export const DEFAULT_PARSERS = {
  parseStatement,
  parseExpressionStatement,
  parseIfStatement,
  //
  parseExpression,
  parsePrefixExpression,
  parseBinaryExpression,
  parseConcatenatedExpression,
  parsePrimaryExpression,
  parseMemberExpression,
  parseGroupingExpression,
  parseCallExpression,
}
