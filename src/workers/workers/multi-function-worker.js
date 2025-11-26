// 多函数导出 Worker 实现
// 展示如何在单个 Worker 文件中导出多个函数

// 加法函数
function add({ a, b }) {
  console.log(`Worker [${process.pid}]: 执行加法 ${a} + ${b}`);
  return a + b;
}

// 乘法函数
function multiply({ a, b }) {
  console.log(`Worker [${process.pid}]: 执行乘法 ${a} * ${b}`);
  return a * b;
}

// 减法函数
function subtract({ a, b }) {
  console.log(`Worker [${process.pid}]: 执行减法 ${a} - ${b}`);
  return a - b;
}

// 除法函数
function divide({ a, b }) {
  console.log(`Worker [${process.pid}]: 执行除法 ${a} / ${b}`);
  if (b === 0) {
    throw new Error('除数不能为零');
  }
  return a / b;
}

// 异步计算函数
async function asyncCalculate({ data, operation }) {
  console.log(`Worker [${process.pid}]: 执行异步计算 - ${operation}`);

  // 模拟异步操作
  await new Promise(resolve => setTimeout(resolve, 100));

  switch (operation) {
    case 'square':
      return data * data;
    case 'cube':
      return data * data * data;
    case 'sqrt':
      return Math.sqrt(data);
    case 'factorial':
      return factorial(data);
    default:
      throw new Error(`未知的操作: ${operation}`);
  }
}

// 阶乘函数
function factorial(n) {
  if (n < 0) throw new Error('阶乘仅支持非负整数');
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}

// 导出主要函数，并添加其他函数作为属性
const mainFunction = add;
mainFunction.add = add;
mainFunction.multiply = multiply;
mainFunction.subtract = subtract;
mainFunction.divide = divide;
mainFunction.asyncCalculate = asyncCalculate;
mainFunction.factorial = factorial;

module.exports = mainFunction;