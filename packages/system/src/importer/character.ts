import ICharacter from "../character"

export default interface ICharacterImporter {
  import(file: string, character: ICharacter): Promise<void>
}
