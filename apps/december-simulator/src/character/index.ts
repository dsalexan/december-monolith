import { ObjectManager } from "@december/compiler"
import GenericImporter from "../importer"

export default class BaseCharacter {
  manager: ObjectManager
  //
  system: string
  name: string

  constructor() {
    this.manager = new ObjectManager()
  }
}
