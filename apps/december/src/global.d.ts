import * as _ from "lodash"

declare global {
  let get: typeof _.get

  interface Window {
    get: typeof _.get
  }
}
