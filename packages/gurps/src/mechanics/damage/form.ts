/**
 * Thrust is the basic form of ST based damage, inferior to swing and easier to defend against,
 *    but which has better drawing and stop hit contest performance.
 * There are also penalties to defend against swing attacks if defending unarmed.
 *    Swing damage is higher than Thrust damage.
 *    TODO: GURPS Martial Arts page 111 mentions swing attacks get -1 to Quick Contests for Who Draws First and Cascading Waits, and also in the Margin of Success for Stop Hits.
 */

export const DAMAGE_FORMS = [`thr`, `sw`] as const
export type DamageForm = (typeof DAMAGE_FORMS)[number]

export function label(form: DamageForm) {
  return form === `thr` ? `Thrust` : `Swing`
}

export function fromGCA(dmg: string): DamageForm {
  const tag = dmg.toLowerCase()

  if (tag === `thr` || tag === `thrust`) return `thr`
  if (tag === `sw` || tag === `swing`) return `sw`

  throw new Error(`Parsing for "${dmg}" tag is not implemented`)
}
