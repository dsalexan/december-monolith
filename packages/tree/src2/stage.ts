export const STAGES = [`lexical_analysis`, `syntax_analysis`, `semantic_analysis`, `simplification`, `execution`] as const
export type Stage = (typeof STAGES)[number]
