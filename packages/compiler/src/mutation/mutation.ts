export interface BaseMutation<TValue = unknown> {
  type: string
  property: string
  value: TValue
}

export interface SetMutation<TValue = unknown> extends BaseMutation<TValue> {
  type: `SET`
}

export interface OverrideMutation<TValue = unknown> extends BaseMutation<TValue> {
  type: `OVERRIDE`
}

export type Mutation = SetMutation | OverrideMutation

// #region PROXIES

export const SET = <TValue = unknown>(property: string, value: TValue): SetMutation<TValue> => ({ type: `SET`, property, value })
export const OVERRIDE = <TValue = unknown>(property: string, value: TValue): OverrideMutation<TValue> => ({ type: `OVERRIDE`, property, value })

// #endregion
