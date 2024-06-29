// "You take half *damage.* Damage is the roll before DR. "Half injury" would be after DR."

export * as DamageForm from "./form"
export * as DamageType from "./type"

import { DamageType, woundingMultiplier } from "./type"

// #region Calculations

/**
 * Damage has two categories: Basic Damage and Penetrating Damage.
 * The former is used to determine Knockback and the latter is used to determine Injury.
 */

/**
 * Returns minimum basic damage (damage rolled before subtracting DR), as per B 378
 * @param type
 * @returns
 */
export function minimumBasicDamage(type: DamageType) {
  if (type === `crushing`) return 0

  return 1
}

/**
 * Calculates penetrating damage (used to determined injury)
 * @param basicDamage
 * @param dr
 * @returns
 */
export function calculatePenetratingDamage(basicDamage: number, dr: number) {
  // TODO: Implement roll with a blow against crushing attack
  return basicDamage - dr
}

/**
 * Calculates injury (lost HP) from damage taken (basic damage, being specific, before subtracting DR)
 * @param basicDamage
 * @param type
 * @param dr
 * @returns
 */
export function calculateInjury(damage: number, type: DamageType, dr: number) {
  const basicDamage = Math.max(minimumBasicDamage(type), damage) // damage has a floor of 1 (unless if crushing)
  const penetratingDamage = calculatePenetratingDamage(basicDamage, dr)

  const multipler = woundingMultiplier(type)

  const injury = penetratingDamage * multipler

  return injury
}

// #endregion
