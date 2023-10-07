import logform from "logform"

export default logform.format((info, opts = {}) => {
  const timestamp = new Date()

  if (!info.timestamp) {
    info.timestamp = new Date()
  }

  info.lastTimestamp = opts.store?.lastTimestamp
  if (opts.store !== undefined) opts.store.lastTimestamp = timestamp

  return info
})
