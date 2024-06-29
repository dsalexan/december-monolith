const APPLICABLE_TARGETS = [`traits`, `traits_with_damage_modes`]
type ApplicableTarget = (typeof APPLICABLE_TARGETS)[number]

interface TagDefinition {
  key: string
  display: string
  appliesTo: ApplicableTarget[]
  notes?: string[]
  math?: boolean
  mode?: boolean
}

export const TAGS: Record<TagDefinition[`key`], TagDefinition> = {
  damage: {
    key: `damage`,
    display: `Damage`,
    appliesTo: [`traits_with_damage_modes`],
    notes: [`Written as standard GURPS damage code, such as damage(2d-1) or damage(thr)`],
    math: true, // math enabled
    mode: true, // mode specific
  },
  damtype: {
    key: `damtype`,
    display: `DamType`,
    appliesTo: [`traits_with_damage_modes`],
    notes: [`This is the type of damage applied by the attack. This is generally a text value specifying the standard damage types, such as damtype(cut) or damtype(imp).`],
    mode: true, // mode specific
  },
}
