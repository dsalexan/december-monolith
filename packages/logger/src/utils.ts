/* eslint-disable no-debugger */
// eslint-disable-next-line no-control-regex
export const ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
export function removeANSI(string: string) {
  return string.replace(ANSI, ``)
}

export function getTimestamp() {
  // https://stackoverflow.com/a/69044670/20358783 more detailLocaleString
  const timestamp = formatTimestamp(new Date())

  return timestamp
}

export function formatTimestamp(date: Date, format: `hash` | `nice` = `hash`) {
  const yyyy = date.getFullYear()

  // month is zero-based
  let MM = (date.getMonth() + 1) as any
  let dd = date.getDate() as any

  if (dd < 10) dd = `0` + dd
  if (MM < 10) MM = `0` + MM

  const HH = date.getHours()
  const mm = date.getMinutes()
  const ss = date.getSeconds()

  if (format === `nice`) return `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss}` // `yyyy/MM/dd HH:mm:ss`

  return `${yyyy}-${MM}-${dd}_${HH}-${mm}-${ss}`
}

export function isNil(value: any): value is null | undefined {
  return value === undefined || value === null
}

export function isString(value: any): value is string {
  return typeof value === `string`
}

export function isNilOrEmpty(value: any): value is null | undefined | `` {
  return isNil(value) || value === ``
}
