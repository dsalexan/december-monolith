export const MASTER_SCOPES = [`math-enabled`, `text-processing`] as const
export type MasterScope = (typeof MASTER_SCOPES)[number]

export const ISOLATION_SCOPES = [
  // STRING
  `possible-string`,
  `confirmed-string`, // SPREAD DOWN SCOPE
  // LOGICAL
  `logical-expression`,
  // POSSIBLE TYPE
  `possible-operator`,
  // CHILDREN DEPENDENT
  `aggregator`,
  // GENERICS
  `literal`,
  `irrelevant`,
  `n/a`, // mostly for ROOT
] as const
export type IsolationScope = (typeof ISOLATION_SCOPES)[number]

export const SCOPES = [`logical`, `textual`, `derived`] as const
export type Scope = (typeof SCOPES)[number]
