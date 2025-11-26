// 压力测试 Worker 实现
// 模拟 CPU 密集型任务来测试线程池性能

const crypto = require('crypto');

// CPU 密集型任务：计算斐波那契数列
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// CPU 密集型任务：计算质数
function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;

  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
}

function findPrimes(start, end) {
  const primes = [];
  for (let i = start; i <= end; i++) {
    if (isPrime(i)) {
      primes.push(i);
    }
  }
  return primes;
}

// 内存密集型任务：创建大数组
function memoryIntensive(size) {
  const array = new Array(size).fill(0);
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.random() * 1000;
  }

  // 计算统计信息
  const sum = array.reduce((a, b) => a + b, 0);
  const avg = sum / array.length;
  const max = Math.max(...array);
  const min = Math.min(...array);

  return { size, sum, avg, max, min };
}

// 混合任务：包含 CPU 和内存操作
function mixedTask({ complexity = 1000, dataSize = 10000 }) {
  const startTime = process.hrtime.bigint();

  // CPU 操作
  const fibResult = fibonacci(complexity);

  // 内存操作
  const memoryResult = memoryIntensive(dataSize);

  // 密码学操作
  const hash = crypto.createHash('sha256').update(`${fibResult}${memoryResult.avg}`).digest('hex');

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒

  return {
    fibResult,
    memoryResult,
    hash,
    duration,
    complexity,
    dataSize,
    workerId: process.pid
  };
}

// 快速任务
function quickTask({ id }) {
  const result = Math.random() * 1000;
  return {
    id,
    result,
    type: 'quick',
    workerId: process.pid,
    timestamp: Date.now()
  };
}

// 中等任务
function mediumTask({ id, iterations = 100000 }) {
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += Math.sqrt(i);
  }
  return {
    id,
    result: sum,
    iterations,
    type: 'medium',
    workerId: process.pid,
    timestamp: Date.now()
  };
}

// 重型任务
function heavyTask({ id, complexity = 35 }) {
  const fibResult = fibonacci(complexity);
  const primes = findPrimes(1000, 2000);

  return {
    id,
    fibResult,
    primeCount: primes.length,
    type: 'heavy',
    complexity,
    workerId: process.pid,
    timestamp: Date.now()
  };
}

module.exports = ({ id, type = 'mixed', ...options }) => {
  console.log(`Worker [${process.pid}]: 执行 ${type} 任务 ${id}`);

  switch (type) {
    case 'quick':
      return quickTask({ id, ...options });
    case 'medium':
      return mediumTask({ id, ...options });
    case 'heavy':
      return heavyTask({ id, ...options });
    case 'mixed':
      return mixedTask({ id, ...options });
    default:
      throw new Error(`未知的任务类型: ${type}`);
  }
};