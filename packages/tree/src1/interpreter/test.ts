import util from "util"
import { get } from "lodash"

import churchill, { Block, Paint, paint } from "../logger"
import { SyntaxNode } from "../node"
import TreeParser from "../parser"
import NodePrinter from "../printer"
import SyntaxManager, { DEFAULT_SYNTAXES, MATH_SYNTAXES, Pattern, Separator } from "../syntax/manager"
import { LOGICAL_SYNTAX_NAMES } from "../syntax/separator"

import TreeInterpreter from "./interpreter"
import createUnitIndex from "./units"

const logger = churchill.child(`interpreter`, undefined, { separator: `` })

let originalEntry = `a & b`
originalEntry = `"AD:Claws (Sharp Claws)::level" = 1 & @itemhasmod(AD:Claws (Sharp Claws), Feet Only) = 0 `
originalEntry = `,$if(a THEN b ELSE c) outside`
originalEntry = `@if(me::level = ST:DX then @basethdice(ST:Punch) else @if(me::level > ST:DX then 2 * @basethdice(ST:Punch) else 0))`
originalEntry = `thr + me::level`
originalEntry = `thr-1 + @if(me::level = ST:DX then 10 else 1)`
originalEntry = `thr-1 + @if(me::level = ST:DX then 10 else 1) + @if("AD:Claws (Blunt Claws)::level" = 1 & @itemhasmod(AD:Claws (Blunt Claws), Feet Only) = 0 then @basethdice(ST:Punch) else 2)`
originalEntry = `thr-1 + @if(me::level = ST:DX then @basethdice(ST:Punch) else @if(me::level > ST:DX then 2 * @basethdice(ST:Punch) else 0)) + @if("AD:Claws (Blunt Claws)::level" = 1 & @itemhasmod(AD:Claws (Blunt Claws), Feet Only) = 0 then @basethdice(ST:Punch) else @if("AD:Claws (Long Talons)::level" = 1 & @itemhasmod(AD:Claws (Long Talons), Feet Only) = 0 then @basethdice(ST:Punch) else 0))`
originalEntry = `thr + (me::level * 2 + 1)`
originalEntry = `@if(me::level > ST:DX then 2 * @basethdice(ST:Punch) else 0)`
originalEntry = `@if(me::level = ST:DX then @basethdice(ST:Punch) else @if(me::level > ST:DX then 2 * @basethdice(ST:Punch) else 0))`
// DICE MATH
originalEntry = `1d`
originalEntry = `(1+1)d`
originalEntry = `1 + 2`
originalEntry = `1m + 2`
originalEntry = `1m + 2m` // testing same units
originalEntry = `1m + 3d` // testing different units
originalEntry = `(1+2)d+2`
originalEntry = `(1d+2d)d+5` // not going to do this now
originalEntry = `1d20`
originalEntry = `2d6`
originalEntry = `1d20 + 2d6`
originalEntry = `2*3`
originalEntry = `2*@basethdice(ST:Punch)`
originalEntry = `$if(me::level > ST:DX THEN 2*@basethdice(ST:Punch) ELSE 0)`
originalEntry = `$if(me::level <= ST:DX THEN 2 * @basethdice(ST:Punch) ELSE 0)`
originalEntry = `$eval(20 + 1)d` // (20 + 1) * 1d
// originalEntry = `$eval(20 + 1)d17` // (20 + 1) * 1d17

// const startsWithComma = originalEntry.startsWith(`,`)
// if (!startsWithComma) originalEntry = `,${originalEntry}`
// originalEntry = `⟨${originalEntry.trim()}⟩` // we pretend there is an enclosure around this, as seen when instantiating root node

const manager = new SyntaxManager([...DEFAULT_SYNTAXES, Pattern.IF, Pattern.FUNCTION, Pattern.INVOKER, ...MATH_SYNTAXES, Pattern.EVAL]) // ...LOGICAL_SYNTAX_NAMES
const parser = new TreeParser(manager)
const printer = new NodePrinter()

const tree = parser.parse(originalEntry)

printer.characters(tree.root)

console.log(``)

let targetNode = tree.root as SyntaxNode

printer.horizontal(targetNode)

const interpreter = new TreeInterpreter()
const object = interpreter.process(tree.root.children[0] as SyntaxNode)
interpreter.print(object)

const scope = interpreter.scope({
  me: {
    level: 2,
  },
  "AD:Claws (Sharp Claws)": {
    mods: [`Hand Only`],
    // mods: [`Hand Only`, `Feet Only`],
    level: 1,
  },
  "AD:Claws (Blunt Claws)": {
    mods: [`Hand Only`],
    // mods: [`Hand Only`, `Feet Only`],
    level: 1,
  },
  "AD:Claws (Long Talons)": {
    mods: [`Hand Only`],
    // mods: [`Hand Only`, `Feet Only`],
    level: 1,
  },
  "ST:DX": 2,
  "ST:Punch": 10,
  thr: 15,
  //
  "@itemhasmod": (item: { mods: string[] }, mod: string) => {
    return item?.mods?.includes(mod) ? 1 : 0
  },
  "@basethdice": (stat: string) => {
    return 15
  },
})

const UNITS = createUnitIndex()
const result = interpreter.interpret(object, scope, { validateScope: false, strict: true, mode: `math`, units: UNITS })

logger.add(paint.white(`----`)).debug()
logger.add(paint.gray(originalEntry)).debug()
logger.add(paint.bold.white(`RESULT`)).debug()
logger.add(result).debug()

console.log(util.inspect(scope, { showHidden: false, depth: null, colors: true }))
