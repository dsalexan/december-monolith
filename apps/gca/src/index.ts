// read index (.fstndx)
// read library (.fst)

import logger from "./logger"

import * as FastIndex from "./fstndx"
import * as Fast from "./fst"

const DATA_DIRECTORY = `D:/Code/foundry/december/monorep-attempts/mk3/december/data/gca`
const OUTPUT_DIRECTORY = `D:/Code/foundry/december/gurps-mobile/static/js`

// const LIBRARY_DIRECTORY = `C:/Users/dsale/Documents/GURPS Character Assistant 5` // GCA
const LIBRARY_DIRECTORY = `D:\\Code\\foundry\\december\\monorep-attempts\\mk3\\december\\data\\gca/libraries` // quasar, pc
// const LIBRARY_DIRECTORY = `D:/dsalexan/Code/foundry/gurps-mobile/data` // pulsar, notebook

const LIBRARY_NAME = `Basic Set`
// const LIBRARY_NAME = `default`

function extract() {
  logger.debug(`Extracting GCA libraries...`)

  // instantiating objects
  const fstndx = new FastIndex.FastIndex()
  const fst = new Fast.Fast(fstndx)

  // extracting fast index
  const fstndxLogger = FastIndex.logger.builder().startTimer(`extract`)
  fstndxLogger.add(`Extracting fast index...`).debug()

  const sectionsExtractedFromFSTIDX = fstndx.extract(`${LIBRARY_NAME}.gds.fstndx`, LIBRARY_DIRECTORY)
  fstndx.index(sectionsExtractedFromFSTIDX)
  fstndx.save(`sections.txt`, DATA_DIRECTORY)

  fstndxLogger.add(`Fast Index extracted.`).debug({ profiler: `extract` })

  // extracting fast
  const fstLogger = Fast.logger.builder().startTimer(`extract`)
  fstLogger.add(`Extracting fast...`).verbose()

  const traits = fst.extract(`${LIBRARY_NAME}.gds.fst`, LIBRARY_DIRECTORY)
  fst.analysis(traits, [])

  fstLogger.add(`Fast extracted.`).verbose({ profiler: `extract` })

  // saving gca data
  const saveLogger = Fast.logger.builder().startTimer(`save`)
  saveLogger.add(`Saving GCA data...`).verbose()

  // debugger
  // fst.save(`traits.js`, OUTPUT_DIRECTORY)

  saveLogger.add(`Saved to .`).verbose({ profiler: `save` })
}

extract()
