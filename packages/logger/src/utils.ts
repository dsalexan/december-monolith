import { format } from "date-fns"

// eslint-disable-next-line no-control-regex
export const ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
export function removeANSI(string: string) {
  return string.replace(ANSI, ``)
}

export function getTimestamp() {
  // https://stackoverflow.com/a/69044670/20358783 more detailLocaleString
  const timestamp = format(new Date(), `yyyy-MM-dd_HH-mm-ss`)

  return timestamp
}
