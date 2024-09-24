export interface BaseMutation<TValue = unknown> {
  type: string
  property: string
  value: TValue
}

export interface DeleteMutation extends Omit<BaseMutation<any>, `value`> {
  type: `DELETE`
}

export interface SetMutation<TValue = unknown> extends BaseMutation<TValue> {
  type: `SET`
}

export interface OverrideMutation<TValue = unknown> extends BaseMutation<TValue> {
  type: `OVERRIDE`
}

export type Mutation = DeleteMutation | SetMutation | OverrideMutation
export type ValuedMutation = SetMutation | OverrideMutation

// #region PROXIES

export const DELETE = (property: string): DeleteMutation => ({ type: `DELETE`, property })
export const SET = <TValue = unknown>(property: string, value: TValue): SetMutation<TValue> => ({ type: `SET`, property, value })
export const OVERRIDE = <TValue = unknown>(property: string, value: TValue): OverrideMutation<TValue> => ({ type: `OVERRIDE`, property, value })

// #endregion

export function doesMutationHaveValue(mutation: Mutation): mutation is ValuedMutation {
  return ![`DELETE`].includes(mutation.type)
}
