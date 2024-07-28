export { Gives } from "./schema"

import { isNil } from "lodash"
import { expect } from "earl"

import { Parser, Printer, Syntax, SyntaxNode, Utils } from "../../../../../../packages/tree/src2"

import { Gives } from "./schema"
import { MathEnabledValue } from "../../core"

export function parseGives(_gives: string): Gives[] {
  // parse string into tree
  const syntaxManager = new Syntax.Manager([...Syntax.DEFAULT_SYNTAXES, Syntax.Pattern.GIVES])
  const parser = new Parser(syntaxManager)

  const tree = parser.parse(_gives)

  new Printer().characters(tree.root).horizontal(tree.root as any) // COMMENT Debug printing tree

  // get individual bonuses
  const imaginary = tree.root.children[0]
  if (imaginary.children.length !== 1) debugger

  const firstChild = imaginary.children[0] as SyntaxNode // root -> imaginary -> children[0]
  const lists = (firstChild.syntax.name !== `comma` ? [imaginary.children] : firstChild.children.map(list => list.children)) as SyntaxNode[][]

  // GIVES([=] BONUS TO TRAIT[::TAGNAME ] [BYMODE [WHERE] TAG COMPARISON VALUE] [ UPTO LIMIT ][ LISTAS “BONUS TEXT” ])
  const listOfGives = [] as Gives[]

  for (const givesNodes of lists) {
    if (givesNodes.length !== 1) debugger
    const [node] = givesNodes

    const symbols = node.groupChildrenBySyntaxSymbol(node.syntax.name)
    // TODO: check if it has all required pattern tokens
    // TODO: Implement other properties

    expect(symbols.bonus).toHaveLength(1)
    expect(symbols.trait).toHaveLength(1)

    const gives: Gives = {
      bonus: new MathEnabledValue(symbols.bonus[0].repr()),
      trait: symbols.trait[0].repr().trim(),
    }

    listOfGives.push(gives)
  }

  return listOfGives
}
