import assert from "assert"

export const DAMAGE_TYPES = [
  //
  `affliction`,
  `burn`,
  `corrosion`,
  `crushing`,
  `cutting`,
  `fatigue`,
  `impaling`,
  `piercing`, // NOT REALLY A FINAL TYPE, MUST BE ONE OF SUB-PIERCING TYPES
  `small_piercing`,
  `normal_piercing`,
  `large_piercing`,
  `huge_piercing`,
  `toxic`,
  `special`,
  // composite types
  `radiation`,
] as const

export type DamageType = (typeof DAMAGE_TYPES)[number]

export function fromGCA(damtype: string): DamageType {
  const tag = damtype.toLowerCase()

  debugger

  if (tag === `aff`) return `affliction`
  if (tag === `burn`) return `burn`
  if (tag === `cor`) return `corrosion`
  if (tag === `cr`) return `crushing`
  if (tag === `cut`) return `cutting`
  if (tag === `fat`) return `fatigue`
  if (tag === `imp`) return `impaling`
  if (tag === `pi`) return `piercing`
  if (tag === `pi-`) return `small_piercing`
  if (tag === `pi`) return `normal_piercing`
  if (tag === `pi+`) return `large_piercing`
  if (tag === `pi++`) return `huge_piercing`
  if (tag === `tox`) return `toxic`
  if (tag === `spec`) return `special`

  if (tag === `rad`) return `radiation`

  throw new Error(`Unimplemented GCA parsing for damtype "${damtype}"`)
}

export function woundingMultiplier(type: DamageType, strict = false): number {
  if (type === `piercing`) {
    if (strict) throw new Error(`Piercing damage must be one of the sub-types (small, normal, large, huge)`)
    return 1
  }

  if (type === `small_piercing`) return 0.5
  if ([`burning`, `corrosion`, `crushing`, `fatigue`, `piercing`, `toxic`].includes(type)) return 1
  if ([`cutting`, `large_piercing`].includes(type)) return 1.5
  if ([`impaling`, `huge_piercing`].includes(type)) return 2

  // Radiation (rad): a damage modifier of either Burning (+25%) or Toxic {+100%) with its own special effects.

  throw new Error(`Unimplemented woundingMultiplier for "${type}"`)
}
