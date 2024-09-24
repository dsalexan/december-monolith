import fs from "fs"
import { AnyObject } from "tsdef"
import xml2js from "xml2js"

export async function readXMLFile(path: string): Promise<AnyObject> {
  const content = fs.readFileSync(path, `utf8`)

  const parser = new xml2js.Parser(/* options */)
  const json = await parser.parseStringPromise(content)

  return json
}
