import { PropertyReference } from "@december/utils/access"
import { BasePattern, BasePatternOptions } from "@december/utils/match/base"
import { ElementPattern } from "@december/utils/match/element"
import { SetPattern } from "@december/utils/match/set"

import { ObjectReference, UniqueObjectReference, StrictObjectReference } from "."

export type ObjectPropertyReference = PropertyReference<ObjectReference>
export type UniqueObjectPropertyReference = PropertyReference<UniqueObjectReference>
export type StrictObjectPropertyReference = PropertyReference<StrictObjectReference>
