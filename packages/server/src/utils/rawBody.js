import config from '../config.js'

export function getRawBody(ctx, maxBytes = config.maxBodyBytes) {
  return new Promise((resolve, reject) => {
    let data = ''
    let size = 0
    let finished = false

    const fail = (error) => {
      if (finished) return
      finished = true
      // 停止接收并消费剩余数据，避免超限后继续拼接字符串占用内存。
      ctx.req.removeAllListeners('data')
      ctx.req.on('data', () => {})
      reject(error)
    }

    ctx.req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk)
      if (size > maxBytes) {
        fail(new Error('BODY_TOO_LARGE'))
        return
      }
      data += chunk
    })
    ctx.req.on('end', () => {
      if (finished) return
      finished = true
      resolve(data)
    })
    ctx.req.on('error', fail)
  })
}
