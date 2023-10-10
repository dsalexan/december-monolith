import type { ManeuverName } from "gurps/module/actor/maneuver"

export const GENERAL_MANEUVERS = [`do_nothing`, `move`, `ready`, `wait`, `concentrate`, `change_posture`] as const
export type GeneralManeuver = (typeof GENERAL_MANEUVERS)[number]

export const AGGRESSIVE_MANEUVERS = [`evaluate`, `aim`, `feint`, `attack`, `move_and_attack`] as const
export type AggressiveManeuver = (typeof AGGRESSIVE_MANEUVERS)[number]

export const ALLOUT_ATTACK_MANEUVERS = [`allout_attack`, `aoa_determined`, `aoa_double`, `aoa_feint`, `aoa_strong`, `aoa_suppress`] as const
export type AllOutAttackManeuver = (typeof ALLOUT_ATTACK_MANEUVERS)[number]

export const ALLOUT_DEFENSE_MANEUVERS = [`allout_defense`, `aod_block`, `aod_dodge`, `aod_parry`, `aod_double`, `aod_mental`] as const
export type AllOutDefenseManeuver = (typeof ALLOUT_DEFENSE_MANEUVERS)[number]

export const ALLOUT_MANEUVERS = [`allout_concentrate`, ...ALLOUT_ATTACK_MANEUVERS, ...ALLOUT_DEFENSE_MANEUVERS] as const
export type AllOutManeuvers = (typeof ALLOUT_MANEUVERS)[number]

export const MANEUVERS = [...GENERAL_MANEUVERS, ...AGGRESSIVE_MANEUVERS, ...ALLOUT_MANEUVERS] as const
export type Maneuver = GeneralManeuver | AggressiveManeuver | AllOutManeuvers | ManeuverName
