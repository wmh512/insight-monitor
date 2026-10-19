// ============================================
// 识字课 Day 2 · 练习卷
// 规则：每个 TODO 自己写，旁边标注了预期输出，跑完对照
// 运行：node playground/day2.js
// 注意：这次没有预填答案，写不出来回去看单词本 Day 2
// ============================================

// —— 第 1 题：typeof 类型探测器 ——
const a = 42
const b = '北京'
const c = true
const d = undefined
// TODO 1：写 4 行 console.log，分别打印 typeof a、typeof b、typeof c、typeof d
//   预期输出：number / string / boolean / undefined

// —— 第 2 题：模板字符串 ——
const myName = '王钰赫'
const myAge = 22
// TODO 2：用反引号拼出「我是王钰赫，今年22岁」并打印
//   提示：反引号在键盘 Esc 下面；写法 `我是${myName}，今年${myAge}岁`
//   预期输出：我是王钰赫，今年22岁

// —— 第 3 题：可选链 ?. ——
const user = { name: '王钰赫' }
// TODO 3：打印 user.address?.city
//   预期输出：undefined（注意：不报错）
//   进阶：把下面这行注释取消会报错，体会 ?. 的价值
// console.log(user.address.city)

// —— 第 4 题：空值合并 ?? ——
const config = { timeout: 0 }
// TODO 4-1：打印 config.timeout ?? 3000
//   预期输出：0（0 不是空值，?? 不换）
// TODO 4-2：打印 config.retry ?? 3
//   预期输出：3（retry 不存在，用兜底）

// —— 第 5 题：try / catch ——
// TODO 5：try 里执行 JSON.parse('坏数据')，catch 里打印 '抓住了：' + e.message
//   预期输出：抓住了：（JSON 的具体报错信息）

// —— 第 6 题：throw ——
function checkAge(age) {
  // TODO 6-1：如果 age < 18，throw new Error('未成年')
  // TODO 6-2：在 try 里调用 checkAge(15)，catch 里打印 e.message
  //   预期输出：未成年
}

// —— 第 7 题：箭头函数 ——
function oldAdd(x, y) {
  return x + y
}
// TODO 7：用箭头函数写法定义 add2 = (x, y) => x + y，并打印 add2(2, 3)
//   预期输出：5

// —— 第 8 题：map 加工流水线 ——
const nums = [1, 2, 3]
// TODO 8：用 map 把每个数乘 2，打印结果
//   提示：nums.map(n => n * 2)
//   预期输出：[ 2, 4, 6 ]

// —— 第 9 题：filter 筛子 ——
const scores = [55, 72, 90, 48, 88]
// TODO 9：用 filter 筛出 >= 60 的，打印结果
//   提示：scores.filter(n => n >= 60)
//   预期输出：[ 72, 90, 88 ]

// —— 第 10 题：slice 切片刀 ——
const fruits = ['苹果', '香蕉', '橙子', '葡萄']
// TODO 10-1：打印 fruits.slice(0, 3)
//   预期输出：[ '苹果', '香蕉', '橙子' ]
// TODO 10-2：打印 'hello world'.slice(0, 5)
//   预期输出：hello
