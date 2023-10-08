export const ACTIVE_DEFENSES = [`block`, `dodge`, `parry`] as const
export type ActiveDefense = (typeof ACTIVE_DEFENSES)[number]

// TODO: Spec power defenses

export const DEFENSES = [...ACTIVE_DEFENSES]
export type Defense = ActiveDefense
