export { GCACharacterImporter } from "./importer"
export { default as GCACharacter } from "./character"

export type { GCATrait, GCATraitMode } from "./trait"

function isPropertyInvoker(value: string) {
  const split = value.split(`::`)

  const propertyAccessor = split.length === 2

  if (propertyAccessor) return { target: split[0], property: split[1] }

  return false
}
