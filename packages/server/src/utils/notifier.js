import config from '../config.js'

/**
 * 新错误微信通知（W9-c，Server酱）
 *
 * 三个设计决策：
 * 1. 配置门（fail-soft）：没配 SCT_SENDKEY 静默关闭——通知是可选增强，不配不报错
 *    （对比鉴权的 fail-closed：那是个防线必须配，这是个增强随意）
 * 2. 失败隔离：推送异常只记日志绝不外抛——**监控系统的可用性不能依赖通知渠道**，
 *    Server酱挂了照常收数据，最多丢一条通知
 * 3. fire-and-forget：不 await——上报接口的响应延迟不被通知渠道绑架
 *    （客户端用 sendBeacon 发数据，根本不关心响应快慢）
 */
export function notifyNewError(error) {
  if (!config.sctSendKey) return

  const title = `新错误: ${truncate(error.message, 30)}`
  const desp = [
    `- 类型：${error.kind}`,
    `- 指纹：${error.fingerprint}`,
    `- 页面：${error.pageUrl}`,
    `- 时间：${new Date().toLocaleString('zh-CN')}`,
  ].join('\n')

  push(title, desp).catch((err) => {
    // 通知失败只记日志，绝不往上抛——上报主链路不受影响
    console.warn('[notifier] 推送失败（不影响上报）:', err.message)
  })
}

/** 实际发送（抽成 async 方便统一 catch） */
async function push(title, desp) {
  const res = await fetch(`https://sctapi.ftqq.com/${config.sctSendKey}.send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, desp }),
  })
  const data = await res.json()
  if (data.code !== 0) {
    console.warn('[notifier] Server酱返回异常:', data)
  } else {
    console.log(`[notifier] 新错误已推送: ${title}`)
  }
}

/** 截断过长的错误信息（微信标题放不下） */
function truncate(str, max) {
  const s = String(str ?? '')
  return s.length > max ? `${s.slice(0, max)}…` : s
}
