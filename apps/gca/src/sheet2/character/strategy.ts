import { Metadata } from "./../schema"
import { Instruction, Strategy } from "@december/compile"
import { Character, RawCharacter, Transform } from "./schema"

const StrategyFactory = new Strategy.Factory<Metadata<RawCharacter>>()

const CharacterReactiveStrategy = StrategyFactory.strategy(`character`).push(
  StrategyFactory.reaction(`_.raw`) //
    .name(`raw`)
    .process(({ _: { raw } }) => {
      if (!raw) return null

      let transforms = null as Character[`transforms`]
      if (raw.transforms) {
        transforms = {
          current: raw.transforms.current,
          list: raw.transforms.list.map((transform: any) => ({
            name: transform.name,
            points: transform.points,
          })),
        }
      }

      return {
        player: raw.player,
        name: raw.name,
        body: raw.body,
        //
        transforms,
        //
        damageTable: raw.damageTable,
      }
    }),
)

export default CharacterReactiveStrategy
