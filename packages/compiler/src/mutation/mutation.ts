export interface BaseMutation<TValue = unknown> {
  type: string
  property: string
  value: TValue
}

export interface SetMutation<TValue = unknown> extends BaseMutation<TValue> {
  type: `SET`
}

export type Mutation = SetMutation

// #region PROXIES

export const SET = <TValue = unknown>(property: string, value: TValue): SetMutation<TValue> => ({ type: `SET`, property, value })

// #endregion
