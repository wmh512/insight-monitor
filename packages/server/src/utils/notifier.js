import config from '../config.js'

/**
 * 通知冷却窗口：同一指纹在该窗口内重复出现不再打扰（防轰炸）
 * 方案1：窗口内静默
 */
const COOLDOWN_HOURS = 24

/**
 * 通知决策：这次出现要不要打扰用户？
 *
 * W9-d 的三种打扰场景：
 * - new    首次出现 → 必须推（否则我根本不知道有这回事）
 * - reopen 我标记过"已解决"，它又来了 → 必须推（**这是状态机的核心价值**：
 *          防轰炸不能把"以为修好了却复发"也静默掉）
 * - repeat 已见过但超了冷却窗口 → 推（递增内容：让重复变成信号而非噪音）
 * - null   窗口内的重复 → 静默
 *
 * @param prev 该指纹的上一次状态（首次出现为 null）
 * @returns 'new' | 'reopen' | 'repeat' | null
 */
export function decideNotification(prev) {
  // 首次出现
  if (!prev) return 'new'

  // 标记过已解决又出现 —— 复发告警
  if (prev.status === 'resolved') return 'reopen'

  // 已见过：距上次通知超过冷却窗口才再次提醒
  const lastNotifiedAt = prev.last_notified_at ? new Date(prev.last_notified_at).getTime() : 0
  const hoursSince = (Date.now() - lastNotifiedAt) / 3600000
  if (hoursSince >= COOLDOWN_HOURS) return 'repeat'

  // 窗口内 —— 静默（防轰炸）
  return null
}

/**
 * 推送 issue 通知（fire-and-forget）
 *
 * 三个设计约束（沿用 W9-c）：
 * 1. 配置门（fail-soft）：没配 SCT_SENDKEY 静默关闭
 * 2. 失败隔离：推送异常只记日志，绝不影响上报主链路
 *    ——监控系统的可用性不能依赖通知渠道
 * 3. fire-and-forget：不 await——上报延迟不被通知渠道绑架
 */
export function notifyIssue(type, issue) {
  if (!config.sctSendKey) return

  const prefixes = {
    new: '新错误',
    reopen: '已解决的错误复现',
    repeat: '错误重复出现',
  }
  const title = `${prefixes[type]}: ${truncate(issue.message, 28)}`
  const desp = [
    `- 类型：${issue.kind}`,
    `- 指纹：${issue.fingerprint}`,
    `- 页面：${truncate(issue.pageUrl, 60)}`,
    `- 累计出现：${issue.seenCount} 次`,
    `- 累计通知：${issue.notifyCount} 次`,
    `- 时间：${new Date().toLocaleString('zh-CN')}`,
  ].join('\n')

  push(title, desp).catch((err) => {
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
    console.log(`[notifier] ${title}`)
  }
}

/** 截断过长的文本（微信标题放不下） */
function truncate(str, max) {
  const s = String(str ?? '')
  return s.length > max ? `${s.slice(0, max)}…` : s
}
