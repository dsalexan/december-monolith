import { isEmpty } from "lodash"
import { toTag, TraitType } from "./type"

import { isNilOrEmpty } from "@december/utils"

/** Returns if name extension is valid (either undefined OR non-empty) */
export function isNameExtensionValid(nameExtension?: string) {
  return !!nameExtension && !isEmpty(nameExtension)
}

export function fullName(name: string, nameExtension?: string): string {
  const hasDistinctFullName = isNameExtensionValid(nameExtension)

  if (hasDistinctFullName) return `${name} (${nameExtension})`

  return name
}

export interface AliasOptions {
  nameExtension: string
  group: string
}

export function getAliases(type: TraitType, name: string, { nameExtension, group }: Partial<AliasOptions> = {}): string[] {
  const keys = [] as string[]

  // from name
  const fromName = `${toTag(type)}:${name}`
  keys.push(fromName)

  // from fullname
  if (isNameExtensionValid(nameExtension)) keys.push(`${toTag(type)}:${fullName(name, nameExtension)}`)

  // from group
  if (!isNilOrEmpty(group)) debugger

  return keys
}

export function isAlias(value: string) {
  return /^"?\w{2}\:[\w" \(\)\,\;\s]+"?$/.test(value)
}
