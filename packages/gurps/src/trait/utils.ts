import { isEmpty, uniq } from "lodash"
import { toTag, TraitType } from "./type"

import { isNilOrEmpty } from "@december/utils"
import { Reference } from "@december/utils/access"

/** Returns if name extension is valid (either undefined OR non-empty) */
export function isNameExtensionValid(nameExtension?: string) {
  return !!nameExtension && !isEmpty(nameExtension)
}

export type FullNameType = `comma` | `parentheses`

export function fullName(type: FullNameType, name: string, nameExtension?: string): string
export function fullName(type: FullNameType, namedObject: { name: string; nameExtension?: string }): string
export function fullName(type: FullNameType, nameOrObject: string | { name: string; nameExtension?: string }, nameExtension?: string): string {
  if (typeof nameOrObject === `string`) {
    const hasDistinctFullName = isNameExtensionValid(nameExtension)

    if (hasDistinctFullName) {
      if (type === `parentheses`) return `${nameOrObject} (${nameExtension})`
      else if (type === `comma`) return `${nameOrObject}, ${nameExtension}`
      else throw new Error(`Invalid type: ${type}`)
    }

    return nameOrObject
  }

  return fullName(type, nameOrObject.name, nameOrObject.nameExtension)
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
  if (isNameExtensionValid(nameExtension)) keys.push(`${toTag(type)}:${fullName(`parentheses`, name, nameExtension)}`)

  // from group
  if (!isNilOrEmpty(group)) debugger

  // SPECIAL CASES
  if (type === `attribute`) {
    if ([`ST`, `DX`, `IQ`, `HT`].includes(name)) keys.push(name)
    else if (name === `Perception`) keys.push(`Per`)
    else if (name === `Will`) keys.push(`Will`)
  }

  return uniq(keys)
}

export function isAlias(value: string) {
  return /^("?\w{2}\:[\w" \(\)\,\; \-—\\\/]+!?"?|DX|ST|IQ|HT|Per|Will)$/.test(value)
}

export function isAttributeAlias(value: string) {
  return [`DX`, `ST`, `IQ`, `HT`, `Per`, `Will`].includes(value)
}

export function aliasToReference(value: string, strict = false) {
  if (isAttributeAlias(value)) return new Reference(`alias`, `ST:${value}`)
  if (isAlias(value)) return new Reference(`alias`, value)

  if (strict) throw new Error(`Invalid alias: ${value}`)
  return new Reference(`id`, value)
}
