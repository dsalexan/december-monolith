import { MathJsStatic, OperatorNode } from "mathjs"

function _if(args: OperatorNode[], math: MathJsStatic, scope: Map<string, any>) {
  const expressions = args.map(arg => arg.toString())

  // ERROR: Unimplemented
  if (expressions.length !== 3 && expressions.length !== 2) debugger

  // const pattern = condition.match(/(.*) ?THEN ?(.*) ?ELSE ?(.*)/i) as RegExpMatchArray
  const condition = expressions[0]
  const _then = expressions[1]
  const _else = expressions[2]

  // ERROR: Unimplemented
  if (!condition) debugger

  const ternary = math.evaluate(condition, scope)

  let result: any
  if (ternary) {
    result = math.evaluate(_then, scope)
  } else {
    result = math.evaluate(_else ?? `0`, scope)
  }

  return result
}

_if.rawArgs = true // mark the function as "rawArgs", so it will be called with unevaluated arguments

export default _if
