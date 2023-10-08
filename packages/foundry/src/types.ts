export type StoredDocument<D extends { data: { _source: unknown } }> = D & {
  id: string
  data: D[`data`] & {
    _id: string
    _source: D[`data`][`_source`] & {
      _id: string
    }
  }
}
