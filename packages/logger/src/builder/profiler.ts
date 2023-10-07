import Builder from "."

function genRandonString(length: number) {
  let chars = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()`
  let charLength = chars.length
  let result = ``
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * charLength))
  }
  return result
}

export class Profiler {
  builder: Builder
  name: string // identifier to recall profiler later

  start: number // Date.now()
  end!: number

  constructor(builder: Builder, name?: string) {
    this.builder = builder

    this.start = Date.now()
    this.name = name ?? genRandonString(20)
  }

  stop() {
    if (this.end === undefined) this.end = Date.now()
    return this.end - this.start
  }

  duration() {
    const latest = this.end === undefined ? Date.now() : this.end
    return latest - this.start
  }

  done(): Builder
  done(showDuration: true): Builder
  done(doneCallback: (duration: number) => void): Builder
  done(doneCallback?: ((duration: number) => void) | true) {
    const duration = this.stop()

    if (doneCallback) {
      if (doneCallback !== true) doneCallback(duration)
      else if (doneCallback === true) this.builder.duration(this.name)
    }

    return this.builder
  }

  destroy() {
    delete this.builder.profilers[this.name]
  }
}

/**
 * builder.timer('prfl1')
 * builder.stopTimer('prfl1')
 * builder.add('It took <profiler:prfl1> seconds...').warn()
 *
 * const timer = builder.timer()
 * timer.done(true).add('Profiler1 finished').warn()
 * //   WARN Profiler1 finished  +15ms
 *
 * const timer = builder.timer()
 * timer.done(duration => builder.add(`It took ${duration} seconds...`).warn())
 *
 * builder.timer('prfl1')
 * builder.profiler('prfl1').done()
 * ...
 * builder.duration('prfl1').add('Profiler1 finished').warn()
 *
 * const timer = builder.timer()
 * timer.done()
 * ...
 * builder.duration(timer).add('Profiler1 finished').warn()
 *
 * builder.timer('prfl1')
 * ...
 * builder.duration('plf1').add('Profiler1 finished').warn()
 */
