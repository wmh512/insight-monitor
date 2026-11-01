import { ElMessage } from 'element-plus'
import axios from 'axios'

let lastMessage = ''
let lastMessageAt = 0

export function notifyError(error: unknown, fallback = '操作失败，请稍后重试') {
  const message = axios.isAxiosError(error)
    ? (error.response?.data?.message as string | undefined) || (error.code === 'ECONNABORTED' ? '请求超时，请检查网络后重试' : fallback)
    : fallback
  const now = Date.now()
  if (message === lastMessage && now - lastMessageAt < 1500) return
  lastMessage = message
  lastMessageAt = now
  ElMessage.error(message)
}
