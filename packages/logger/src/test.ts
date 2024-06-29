// import chalk from "chalk"
import ConsoleLogger from "./console"
import paint from "./paint"
import BrowserLogger from "./browser"
// import createLogger from "./_index"

const logger = new ConsoleLogger(`december`, `silly`).builder()
// const logger = new BrowserLogger(`december`, `silly`).builder()

logger.add(`This is a message from a builder.`).info()
logger.add(`This is a message from a builder.`).error()

logger.add(`This is a ${paint.bold.red(`message from a`)} builder.`).warn()
logger.add(`This is a`, paint.bold.red(`message from a`), `builder.`).warn()
logger.add(`This is a`, paint.bold.red(`message from a`), `builder. Also adding boolean`, true, `and number`, 10).warn()

logger.group(true).add(`_render`)
logger.add(`(after group open)`).verbose()
logger.add(`Inside render group`, true).verbose()

logger.openGroup(false).add(`(open group 2)`).verbose()
logger.add(`Inside GRIOUP #2`, true).verbose()

logger.openGroup(false).add(`(open group 3)`).verbose()
logger.add(`Inside GRIOUP #3`, true).verbose().group()

logger.group()

logger.add(`closing 1`).verbose().group()

const timer = logger.add(`Making timer`).verbose().timer()
logger.add(`between timer`).verbose()
timer.done(duration => logger.add(`It took`, paint.green.bold(duration), `ms to create this message.`).verbose())

const timer2 = logger.add(`Making timer 2`).verbose().timer()
logger.add(`between timer`).verbose()
setTimeout(() => {
  timer2.done(duration => logger.add(`It took`, paint.green.bold(duration), `ms to create this message from timer 2.`).verbose())
}, 100)

const timer3 = logger.add(`Making timer 3`).verbose().timer()
logger.add(`between timer`).verbose()
setTimeout(() => {
  timer3.done(true).add(`It took`, paint.green.bold(`??`), `ms to create this message from timer 3.`).verbose()
}, 50)

logger.add(`Making timer 4`).verbose().timer(`4`)
logger.add(`between timer`).verbose()
setTimeout(() => {
  logger.profiler(`4`).done(true)
  logger.add(`It took`, paint.green.bold(`??`), `ms to create this message from timer 4.`).verbose()
}, 800)

logger.add(`Making timer 5`).verbose().timer(`5`)
logger.add(`between timer`).verbose()
setTimeout(() => {
  logger.profiler(`5`).done()
  logger.add(`It took`, paint.green.bold(`??`), `ms to create this message from timer 5.`).duration(`5`).verbose()
}, 1500)

// const logger = createLogger({ name: `december`, level: `silly` })

// const timer = logger.startTimer()

// logger.silly(`This is a silly message.`)
// logger.debug(`This is a debug message.`)
// logger.verbose(`This is a verbose message.`)
// logger.data(`This is a data message.`)
// logger.info(`This is an information message.`)
// logger.warn(`This is a warning message.`)
// logger.error(`This is an error message.`)

// timer.done({ message: `This is a message with a timer.` })

// const timer2 = logger.startTimer()

// const child = logger.child(`january`)

// timer2.done({ message: `Took ∂duration to create a child logger` })

// child.log(`warn`, `This is a warning message from a child logger.`)

// const timer3 = logger.startTimer()

// setTimeout(() => {
//   timer3.done({ message: `Timer donning after timeout` })
// }, 250)

// const timer4 = logger.startTimer()

// setTimeout(() => {
//   timer4.done({ message: `Timer donning after timeout` })
// }, 1000)

// const timer5 = logger.startTimer()

// setTimeout(() => {
//   timer5.done({ message: `Timer donning after timeout` })
// }, 2000)

// logger.builder().add(`This is a message from a builder.`).data()
// logger.builder().add(chalk.red(`This is a red message from a builder.`)).data()
// logger.builder().add(`This is a green message from a builder, by style.`, [chalk.green]).data()

// const timerBuilder = logger.builder().startTimer()
// timerBuilder.done(`warn`, `This is a message from a builder with a timer. It took ${chalk.red(`∂duration`)}`)

// const timerBuilder2 = logger.builder().startTimer()
// timerBuilder2.done(`warn`, `This is another message from a builder with a timer.`)

// const builder = logger.builder().startTimer(`test`).add(`This is a message from a builder with a timer inline.`)
// setTimeout(() => builder.add(`It took ${chalk.bold(builder.profiler(`test`).done())}ms to create this message.`).verbose(), 500)

// const builder2 = logger.builder().startTimer(`test2`)
// builder2.add(`This is a message from a builder starting with a timer`).verbose()
// setTimeout(() => {
//   builder2.add(`Something hapenned here in between`).verbose()
//   setTimeout(() => builder2.add(`Builder2's timer finished.`).info({ profiler: `test2` }), 500)
// }, 100)
