export function getRawBody(ctx) {
  return new Promise((resolve, reject) => {
    let data = ''
    ctx.req.on('data', (chunk) => {
      data += chunk
    })
    ctx.req.on('end', () => resolve(data))
    ctx.req.on('error', reject)
  })
}
