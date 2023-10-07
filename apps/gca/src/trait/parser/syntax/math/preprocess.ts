/**
 * Converts special syntatic characters specific to GCA math expressions into MathJS-compatible prefixes
 * @param expression
 * @returns
 */
export default function preprocessExpression(expression: string) {
  const treated = expression
    .replaceAll(/∂/g, `VAR_`)
    .replaceAll(/@/g, `AT_`)
    .replaceAll(/%/g, `P_`)
    .replaceAll(/me::/g, `ME_`)
    .replaceAll(/ST:/g, `STAT_`)
    .replaceAll(/(?<!=)=(?!=)/g, `==`)
    .replaceAll(/ then /gi, `,`)
    .replaceAll(/ else /gi, `,`)
    .replaceAll(/(AT_hasmod\()([\w\d\-"'\[\] ]+)(\))/gi, `$1"$2"$3`)

  // ERROR: Unimplemented replacement for string
  if (treated.match(/:/)) debugger

  return treated
}
