import { sum } from "lodash"
import CharacterSheet from "."

export default class CER {
  private static instance: CER
  target!: CharacterSheet

  constructor() {}

  public static getInstance(): CER {
    if (!CER.instance) CER.instance = new CER()
    return CER.instance
  }

  calculate(target: CharacterSheet) {
    this.target = target

    this._calculate()
  }

  _calculate() {
    this._offensive_rating()
    this._protective_rating()
  }

  _offensive_rating() {
    const traits = this.target.data.traits
    const allTraits = Object.values(traits)
      .map((obj: any) => obj.trait)
      .flat(Infinity)

    const attacks = allTraits.filter(trait => trait?.attackmodes.attackmode.name !== ``)

    debugger

    // Attack Skill
    let attack_skill = NaN

    debugger
    const bestAttack = 0

    //    SL for best attack - 10
    attack_skill = bestAttack - 10
    //    (ranged) + Accuracy + 2
    //    (multiple attacks; Extra Attack, Two-Weapon Fighting) + 5
    //    (multiple Rapid Strike) = min(12, adjusted SL - 10) * number of Rapid Strikes
    //    (Heroic Archer) + 3
    //    (Trained by Master) + 3
    //    (Weapon Master) + 3
    //    (Rapid Fire) + Rapid Fire bonuses
    //    (automatic hit) = 15

    // Affliction
    // Damage
    // Fatigue Points
    // Move

    // Total
    const components = [attack_skill]
    if (components.some(isNaN)) debugger

    return sum(components)
  }

  _protective_rating() {
    // Active Defense
    // Damage Resistance
    // Health
    // Hit Points
    // Will

    // Total
    return 0
  }

  _influence_rating() {
    // Influence
  }

  _influence_resistance_rating() {
    // Influence Resistance
  }
}
