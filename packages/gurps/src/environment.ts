import { Environment, Node, NodeFactory, ObjectSource } from "@december/tree"
import assert from "assert"
import { isNil, maxBy, range, uniq } from "lodash"

import { MutableObject, ObjectController } from "@december/compiler"
import { Reference } from "@december/utils/access"

import { Quantity } from "@december/utils/unit"
import { typing } from "@december/utils"

import { NON_RESOLVED_VALUE } from "@december/tree/environment"

import { DamageTable } from "./character"

export function makeGURPSEnvironment(character: MutableObject) {
  const environment = new Environment()

  const source = ObjectSource.fromDictionary(`global:gurps`, {
    character: { type: `simple`, value: character },
    // This function takes a value and returns the base Thrust damage dice that would result if the value was a ST score.
    [`@basethdice`]: {
      type: `function`,
      value: (context, options) => (level: number) => {
        const damageTable: DamageTable = character.getProperty(`damageTable`)
        if (!damageTable) return NON_RESOLVED_VALUE

        const damage = damageTable[level]
        if (!damage) return NON_RESOLVED_VALUE

        const dice = damage.thr.clone({ refreshID: true })
        assert(dice.root.children.length === 1, `Tree root should have only one child`)

        const firstChild = dice.root.children.remove(0)

        const parenthesis = NodeFactory.abstract.ENCLOSURE(`parenthesis`, firstChild.range)
        parenthesis.children.add(firstChild, 0, { refreshIndexing: false })

        return parenthesis
      },
    },
    [`@itemhasmod`]: {
      type: `simple`,
      value: () => {
        debugger
        return undefined
      },
    },
    [`@max`]: {
      type: `simple`,
      value: (...args: any[]) => {
        const types = args.map(entry => {
          if (entry instanceof Node) return `node`
          else if (entry instanceof Quantity) {
            const quantity = entry as Quantity
            return `quantity:${quantity.unit.getSymbol()}`
          } else {
            const type = typing.guessType(entry)

            if (type === `number` && parseInt(entry) === 0) return `zero`
            return type
          }
        })

        const sameAlgebraicType = uniq(types).filter(type => type !== `zero`)
        assert(sameAlgebraicType.length > 0, `Zero thing is probably messing things up`)
        assert(sameAlgebraicType.length === 1, `All arguments must be of the same type`)

        if (sameAlgebraicType[0]?.startsWith(`quantity:`)) {
          // 1. Same quantity UNIT, so we should just compare max number
          const maxValue = maxBy(args, arg => (parseInt(arg) === 0 ? 0 : (arg as Quantity).value))
          return maxValue
        }

        throw new Error(`Not implemented yet for type "${sameAlgebraicType[0]}"`)
      },
    },
  })

  environment.addSource(source)
  return environment
}
