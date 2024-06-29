import { sum, get } from "lodash"

import { Builder, paint } from "@december/logger"
import { arrayJoin } from "@december/utils"

import type { CompilationInstruction } from "./newInstruction"
import { Trace } from "../reactive/reaction/utils"
import { CompilationStack } from "./stack"

export function changedKeys(logger: Builder) {
  return (keys: string[]) => {
    const _keys = keys.length === 0 ? [`—`] : keys

    const c_keys = arrayJoin(
      _keys.map(k => paint.white(k)),
      `, `,
    )

    logger.add(`  `)
    logger.add(...paint.grey(paint.italic(`(${keys.length} changed keys) `), ...c_keys))

    logger.debug()
  }
}

export function stack(logger: Builder) {
  return (stack: CompilationStack) => {
    const N = sum(
      Object.values(stack._.byTarget.byStrategy)
        .map(v => Object.values(v).map(v2 => v2.length))
        .flat(Infinity),
    )

    const _tags = stack.tags.length === 0 ? `` : ` (${stack.tags.join(`, `)})`
    logger.add(`Stack `, paint.bold.white(stack.index), paint.grey(_tags), `, `, N, ` targets`)

    logger.debug()
  }
}

export function instruction(logger: Builder) {
  return (order: number, instructionIndex: number, instructions: string[], instruction: CompilationInstruction, valid: boolean) => {
    // const { object, strategy } = instruction
    const target = instruction.stack.manager.objects[instruction.reaction.target.id]
    const strategy = instruction.reaction.definition.strategy

    // 0. get object readable information
    const name = get(target.data, `name`) ?? get(target.data, `_.raw.name`, `<Unnamed>`)
    const type = get(target.data, `type`) ?? get(target.data, `_.raw.type`, `<Untyped>`)

    // 1. explain cause of reaction
    const explanation: string[] = []
    for (const { trace, context } of instruction.reaction.parallels) {
      const _trace = Trace.toString(trace, context)
      explanation.push(_trace)
    }

    // 2. build iterator to identify instruction
    //                          order                                       instruction within (object, strategy)
    const _order = `[${order}/${instruction.stack.order.length - 1}]`
    const iterator = `${instructionIndex === 0 ? _order : ` `.repeat(_order.length)} [${instructionIndex}/${instructions.length - 1}] `

    // 3. log instruction
    if (!valid) {
      this.logger.add(
        //
        paint.italic.grey(iterator),
        `Skipping `,
        paint.blue(`strategy:`),
        paint.blue.bold(strategy),
        ` to `,
        paint.grey.dim(`${type.toLowerCase()}: `),
        paint.grey(`${target.id} :`),
        paint.grey.bold(`${name}`),
        paint.grey(` ${explanation.join(`, `)}`),
      )
    } else {
      logger.add(
        paint.italic.grey(iterator),
        `Apply `, //
        paint.blue(`strategy:`),
        paint.blue.bold(strategy),
        ` to `,
        paint.green.dim(`${type.toLowerCase()}: `),
        paint.green(`${target.id} :`),
        paint.green.bold(`${name}`),
        paint.grey(` ${explanation.join(`, `)}`),
      )
    }

    logger.debug()
  }
}
