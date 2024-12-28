import { Nullable } from "tsdef"
import { DamageForm } from "../mechanics/damage/form"
import { DamageType } from "../mechanics/damage/type"

export interface IGURPSTraitModeDamage {
  basedOn: Nullable<string> // source trait for the damage form base value
  form: DamageForm
  type: DamageType
  value: unknown
}

export default interface IGURPSTraitMode {
  name: string
  damage?: IGURPSTraitModeDamage
  rollBasedOn: string[] // traits (usually skills or sense rolls) allowed to be used as "main trait" for rolling this mode
}
