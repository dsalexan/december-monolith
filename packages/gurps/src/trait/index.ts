import { isEmpty } from "lodash"
import IGURPSTraitMode from "./mode"
import { TraitType, toTag } from "./type"

export * as Mode from "./mode"
export * as Type from "./type"

export type { default as IGURPSTraitMode } from "./mode"
export { makeGURPSTraitEnvironment } from "./environment"

export default interface IGURPSTrait {
  name: string
  nameExtension?: string
  type: TraitType
  active: boolean
  //
  points: number
  level: number
  score?: number
  //
  modes: IGURPSTraitMode[]
}

/** Returns if name extension is valid (either undefined OR non-empty) */
export function isNameExtensionValid(nameExtension?: string) {
  return !!nameExtension && !isEmpty(nameExtension)
}

export function fullName(name: string, nameExtension?: string): string {
  const hasDistinctFullName = isNameExtensionValid(nameExtension)

  if (hasDistinctFullName) return `${name} (${nameExtension})`

  return name
}

export function getAliases(type: TraitType, name: string, nameExtension?: string): string[] {
  const keys = [] as string[]

  // from name
  const fromName = `${toTag(type)}:${name}`
  keys.push(fromName)

  // from fullname
  if (isNameExtensionValid(nameExtension)) keys.push(`${toTag(type)}:${fullName(name, nameExtension)}`)

  return keys
}

export function isAlias(value: string) {
  return /^\w{2}\:[\w" \(\)\,\;\s]+$/.test(value)
}
