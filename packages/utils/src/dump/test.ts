import { ConsoleLogger } from "../../../logger/src"

const logger = new ConsoleLogger(`xii/dump`, `silly`).builder({ separator: `` })

import { dump } from "."

let object: any

object = { a: 1 }

dump(logger, object)
