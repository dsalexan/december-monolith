import { DamageForm } from "../mechanics/damage/form"
import { DamageType } from "../mechanics/damage/type"

export default interface IGURPSTraitMode {
  name: string
  damage: {
    basedOn: string // source trait for the damage form base value
    form: DamageForm
    type: DamageType
    value: unknown
  }
}
