import { isNil } from "lodash"
import { isNilOrEmpty } from "../../../../../packages/utils/src"
import { TraitParser } from "../../trait/parser"
import INode from "../../trait/parser/node/interface"
import { DEFAULT_SYNTAX_COMPONENTS, SYNTAX_COMPONENTS, SeparatorSyntaxComponent } from "../../trait/parser/syntax"
import { TraitModifierGivesSchema, TraitModifierSchema } from "../trait"
import { z } from "zod"

export type Modifier = z.infer<typeof TraitModifierSchema>
export type Gives = z.infer<typeof TraitModifierGivesSchema> // math-enabled

export default function parseGCA5Modifier(_modifier: any): Modifier {
  const name = _modifier.name?.[0]
  const nameext = _modifier.nameext?.[0]

  const parsedGives = [] as Gives[]

  const gives = _modifier.gives?.[0] ?? ``
  if (!isNilOrEmpty(gives)) {
    const entry = `⟨,${gives.trim()}⟩` // we pretend there is an enclosure around this, as seen when instantiating root node
    const parser = new TraitParser(entry, [...DEFAULT_SYNTAX_COMPONENTS, SYNTAX_COMPONENTS.gca5_gives])
    parser.parse()

    // extract node array
    let nodes = [] as INode[]
    if (parser.root.children[0].syntax.name === `comma`) nodes = parser.root.children[0].children
    else nodes = parser.root.children

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (node.syntax.name === `nil`) continue

      const _gives = parseGivesNode(node)
      parsedGives.push(_gives)
    }

    if (parsedGives.length === 0) debugger
  }

  const parsedModifier = { name } as Modifier
  if (!isNilOrEmpty(nameext)) parsedModifier.nameext = nameext
  if (parsedGives.length > 0) parsedModifier.gives = parsedGives

  return parsedModifier
}

function parseGivesNode(node: INode): Gives {
  const gives = { _: node.substring } as Gives
  const markers = (node as any).meta.markers as { name: string; siblings: [number, number] }[]

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]

    if (marker.name === `to`) {
      const [bonusNode, traitNode] = marker.siblings.map(index => node.children[index])

      gives.bonus = bonusNode.substring.trim()
      const _trait = traitNode.substring.split(`::`)
      gives.trait = _trait[0].trim()
      if (_trait[1]) gives.tagname = _trait[1].trim()
    } else if ([`listAs`].includes(marker.name)) {
      const listAsNode = node.children[marker.siblings[1]]

      gives.listAs = listAsNode.substring.trim()
    } else if (marker.name === `equal`) {
      gives.singleBonus = true
    } else {
      // ERROR: Marker not implemented
      debugger
    }
  }

  if (isNil(gives.bonus)) debugger
  if (isNil(gives.trait)) debugger

  return gives
}
