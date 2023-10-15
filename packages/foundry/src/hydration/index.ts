export { default as HTMLHydrationManager } from "./manager"

export { default as Hydrator } from "./hydrator"
export type { HydratorProperties } from "./hydrator"

// all hydrators
export * as Hydrators from "./hydrators"

// individual hydrators
export { default as TabsHydrator } from "./hydrators/tabs"
export type { TabsHydratorProperties } from "./hydrators/tabs"

export { default as AutocompleteHydrator } from "./hydrators/autocomplete"
export type { AutocompleteHydratorProperties } from "./hydrators/autocomplete"
