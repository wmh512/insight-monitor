/**
 * cyrb53 非加密字符串哈希
 *
 * 选型理由（面试点）：
 * - 零依赖，20 行，对 SDK 体积预算友好（< 1KB）
 * - 53 位输出，碰撞概率在错误指纹场景（单页面几百条错误）可忽略
 * - 不需要加密安全性：MD5/SHA 属于过度设计且体积大
 *
 * 算法：bryc 的 cyrb53（公共领域实现），输出 base36 紧凑字符串
 */

/**
 * 计算字符串的 53 位哈希
 * @param str 输入字符串（错误指纹由 message + 堆栈关键帧拼接而成）
 * @param seed 可选种子，用于生成差异化指纹
 */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }

  // 最终混淆（avalanche）：确保相似输入产生差异较大的输出
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(Math.imul(h1 >>> 13, 3266489909), 2)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(Math.imul(h2 >>> 13, 3266489909), 2)

  // 组合为 53 位整数（最大值恰为 Number.MAX_SAFE_INTEGER），转 base36 缩短表示
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}
