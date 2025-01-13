import assert from "assert"
import { MaybeNull } from "tsdef"
import { isString } from "lodash"

import { Reference } from "@december/utils/access"
import { MutableObject, ObjectController } from "@december/compiler"
import { ObjectID, MUTABLE_OBJECT_RANDOM_ID } from "@december/compiler/object"
import { IGURPSCharacter, IGURPSTrait } from "@december/gurps"

export type GURPSCharacterTag = keyof GURPSCharacter[`tags`]

export default class GURPSCharacter extends ObjectController {
  system: `GURPS` = `GURPS`
  //
  id: string
  name: string
  //
  private tags: { data: ObjectID; traits: ObjectID[]; stats: ObjectID[] }

  // #region Objects

  // eslint-disable-next-line prettier/prettier
  get traits() { return this.tags.traits.map(id => this.store.getByID(id) as MutableObject<IGURPSTrait>) }
  // eslint-disable-next-line prettier/prettier
  get stats() { return this.tags.stats.map(id => this.store.getByID(id) as MutableObject<IGURPSTrait>) }

  // eslint-disable-next-line prettier/prettier
  public trait(idOrReference: string | Reference<`alias` | `id`>): MaybeNull<IGURPSTrait> { return this.getTrait(idOrReference) }
  // eslint-disable-next-line prettier/prettier
  public stat(idOrReference: string | Reference<`alias` | `id`>): MaybeNull<IGURPSTrait> { return this.getTrait(idOrReference) }

  get data(): MutableObject<IGURPSCharacter, GURPSCharacter> {
    return this.store.getByID(this.tags.data) as MutableObject<IGURPSCharacter, GURPSCharacter>
  }

  // #endregion

  constructor(id: string, name: string) {
    super()
    this.id = id
    this.name = name
    this.tags = { traits: [], stats: [] } as any
  }

  protected getTrait(idOrReference: string | Reference<`alias` | `id`>): MaybeNull<IGURPSTrait> {
    const reference = isString(idOrReference) ? new Reference(`id`, idOrReference) : idOrReference
    const objects = this.store.getByReference(reference, false) as MutableObject<IGURPSTrait>[]

    assert(objects.length <= 1, `Multiple objects found for reference`)

    const [object] = objects
    return object ? object.getData() : null
  }

  public tagObject(object: MutableObject, tag: GURPSCharacterTag) {
    if (tag === `data`) {
      assert(this.tags.data === undefined, `data already tagged`)
      this.tags.data = object.id
    } else {
      assert(!this.tags[tag].includes(object.id), `Object already tagged`)
      this.tags[tag].push(object.id)
    }
  }
}
