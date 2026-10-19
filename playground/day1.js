// ============================================
// 识字课 Day 1 · 练习卷
// 规则：填完每个 TODO，在 PowerShell 运行：
//   node playground/day1.js
// 把输出结果贴给我（跑不通就贴报错原文）
// ============================================

// —— 第 1 题：let（可变的变量）——
let score = 60
// TODO 1-1：把 score 改成 90
score = 90
// TODO 1-2：打印 score，确认输出 90
console.log(score)

// —— 第 2 题：const（不可变的变量）——
const name = '王钰赫'
// TODO 2：打印 name
console.log(name)

// —— 第 3 题：三种数据类型 + typeof ——
const myString = '北京' // string 文字
const myNumber = 22 // number 数字
const myBoolean = true // boolean 真假
// TODO 3：分别打印三个值的类型，如 console.log(typeof myString)
console.log(typeof myString)
console.log(typeof myNumber)
console.log(typeof myBoolean)

// —— 第 4 题：function + return（机器）——
function add(a, b) {
  // TODO 4-1：返回 a + b 的和（用 return）
  return a + b
}
// TODO 4-2：调用 add(3, 5) 并打印，应该输出 8
console.log(add(3, 5))

// —— 第 5 题：if / else（岔路口）——
// TODO 5：如果 score >= 60 打印 '及格'，否则打印 '补考'
if (score >= 60) {
  console.log('及格')
} else {
  console.log('补考')
}

// —— 第 6 题：for 循环（重复）——
// TODO 6：用 for 循环依次打印 0、1、2
for (let i = 0; i < 3; i++) {
  console.log(i)
}

// —— 第 7 题：数组 ——
const fruits = ['苹果', '香蕉']
// TODO 7-1：往 fruits 里 push 一个 '橙子'
fruits.push('橙子')
// TODO 7-2：打印 fruits.length 和 fruits[0]
console.log(fruits.length)
console.log(fruits[0])

// —— 第 8 题：对象 ——
const me = { name: '王钰赫', city: '北京' }
// TODO 8：打印 me.name
console.log(me.name)

// —— 第 9 题：=== 严格相等 ——
// TODO 9：打印 ('42' === 42) 和 (42 === 42)，观察区别
console.log('42' === 42)
console.log(42 === 42)

// —— 第 10 题：&& || !（组合条件）——
const hasProxy = true
const hasServer = false
// TODO 10：打印三个表达式的结果
console.log(hasProxy && hasServer)
console.log(hasProxy || hasServer)
console.log(!hasServer)
