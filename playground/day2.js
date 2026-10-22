// ============================================
// 识字课 Day 2 · 练习卷（答案已预填）
// 三步练习法：1 跑通看输出 → 2 注释掉答案行 → 3 凭记忆重写
// 运行：node playground/day2.js
// ============================================

// —— 第 1 题：typeof 类型探测器 ——
const a = 42
const b = '北京'
const c = true
const d = undefined
console.log(typeof a) // number
console.log(typeof b) // string
console.log(typeof c) // boolean
console.log(typeof d) // undefined

// —— 第 2 题：模板字符串 ——
const myName = '王钰赫'
const myAge = 22
console.log(`我是${myName}，今年${myAge}岁`) // 我是王钰赫，今年22岁

// —— 第 3 题：可选链 ?. ——
const user = { name: '王钰赫' }
console.log(user.address?.city) // undefined（注意：不报错）
// 进阶体验：把下面这行的注释取消，会直接炸，对比体会 ?. 的价值
// console.log(user.address.city)

// —— 第 4 题：空值合并 ?? ——
const config = { timeout: 0 }
console.log(config.timeout ?? 3000) // 0（0 不是空值，?? 不换）
console.log(config.retry ?? 3) // 3（retry 不存在，用兜底）

// —— 第 5 题：try / catch ——
try {
  JSON.parse('坏数据') // 这行会炸
} catch (e) {
  console.log('抓住了：' + e.message) // JSON 的具体报错信息
}

// —— 第 6 题：throw ——
function checkAge(age) {
  if (age < 18) {
    throw new Error('未成年')
  }
}
try {
  checkAge(15) // 里面会 throw
} catch (e) {
  console.log(e.message) // 未成年
}

// —— 第 7 题：箭头函数 ——
function oldAdd(x, y) {
  return x + y
}
const add2 = (x, y) => x + y
console.log(add2(2, 3)) // 5

// —— 第 8 题：map 加工流水线 ——
const nums = [1, 2, 3]
console.log(nums.map(n => n * 2)) // [ 2, 4, 6 ]

// —— 第 9 题：filter 筛子 ——
const scores = [55, 72, 90, 48, 88]
console.log(scores.filter(n => n >= 60)) // [ 72, 90, 88 ]

// —— 第 10 题：slice 切片刀 ——
const fruits = ['苹果', '香蕉', '橙子', '葡萄']
console.log(fruits.slice(0, 3)) // [ '苹果', '香蕉', '橙子' ]
console.log('hello world'.slice(0, 5)) // hello
