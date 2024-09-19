import { Processor, Environment } from "@december/tree"

export { Processor, Environment } from "@december/tree"
export type { ProcessedData } from "@december/tree"

export default function makeProcessor() {
  const processor = new Processor()

  const grammar = processor.makeGrammar()

  processor.initialize(grammar)

  return processor
}

// makeProcessor().process(`1 + 2`, new Environment(), {
//   // general
//   scope: { root: `math` },
//   //
//   reducer: {
//     ignoreTypes: [`conditional`],
//   },
// })
