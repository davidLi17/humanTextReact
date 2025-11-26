// 多函数导出 Piscina Worker 线程池示例
// 展示如何在单个 Worker 文件中导出多个函数

const path = require('path');
const Piscina = require('piscina');

// 创建 Worker 线程池
const piscina = new Piscina({
  filename: path.resolve(__dirname, '../workers/multi-function-worker.js'),
  minThreads: 2,
  maxThreads: 4,
  idleTimeout: 1500,
  maxQueue: 'auto'
});

console.log('=== 多函数导出 Piscina Worker 线程池示例 ===');
console.log(`线程池配置:`);
console.log(`- 最小线程数: ${piscina.options.minThreads}`);
console.log(`- 最大线程数: ${piscina.options.maxThreads}`);
console.log();

async function runMultipleFunctionsExample() {
  console.log('开始执行多函数任务...');

  // 创建不同类型的任务
  const tasks = [
    { name: 'add', data: { a: 10, b: 5 }, expected: 15 },
    { name: 'multiply', data: { a: 7, b: 8 }, expected: 56 },
    { name: 'subtract', data: { a: 20, b: 3 }, expected: 17 },
    { name: 'divide', data: { a: 100, b: 4 }, expected: 25 },
    { name: 'add', data: { a: 15, b: 25 }, expected: 40 },
    { name: 'multiply', data: { a: 12, b: 12 }, expected: 144 },
    { name: 'subtract', data: { a: 50, b: 30 }, expected: 20 },
    { name: 'divide', data: { a: 81, b: 9 }, expected: 9 }
  ];

  console.log(`准备执行 ${tasks.length} 个不同类型的任务`);
  console.log();

  // 记录开始时间
  const startTime = Date.now();

  // 并行执行所有任务，使用 name 参数指定要调用的函数
  const results = await Promise.all(
    tasks.map((task, index) =>
      piscina.run(task.data, { name: task.name }).then(result => {
        const status = result === task.expected ? '✓' : '✗';
        console.log(`任务 ${index + 1} (${task.name}): ${JSON.stringify(task.data)} = ${result} ${status}`);
        return { ...task, result, status: result === task.expected };
      })
    )
  );

  // 记录结束时间
  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log();
  console.log('=== 多函数任务执行完成 ===');
  console.log(`总执行时间: ${duration}ms`);
  console.log(`任务总数: ${tasks.length}`);

  // 统计各种函数的调用情况
  const functionStats = {};
  results.forEach(result => {
    if (!functionStats[result.name]) {
      functionStats[result.name] = { count: 0, success: 0 };
    }
    functionStats[result.name].count++;
    if (result.status) {
      functionStats[result.name].success++;
    }
  });

  console.log();
  console.log('=== 函数调用统计 ===');
  Object.entries(functionStats).forEach(([func, stats]) => {
    const successRate = (stats.success / stats.count * 100).toFixed(1);
    console.log(`${func.padEnd(10)}: ${stats.count} 次调用, 成功率: ${successRate}%`);
  });

  // 测试异步函数
  console.log();
  console.log('=== 测试异步函数 ===');

  const asyncTasks = [
    { name: 'asyncCalculate', data: { data: 5, operation: 'square' }, expected: 25 },
    { name: 'asyncCalculate', data: { data: 3, operation: 'cube' }, expected: 27 },
    { name: 'asyncCalculate', data: { data: 16, operation: 'sqrt' }, expected: 4 },
    { name: 'asyncCalculate', data: { data: 5, operation: 'factorial' }, expected: 120 },
    { name: 'factorial', data: 6, expected: 720 }
  ];

  const asyncResults = await Promise.all(
    asyncTasks.map((task, index) =>
      piscina.run(task.data, { name: task.name }).then(result => {
        const status = result === task.expected ? '✓' : '✗';
        console.log(`异步任务 ${index + 1} (${task.name}): ${JSON.stringify(task.data)} = ${result} ${status}`);
        return { ...task, result, status: result === task.expected };
      })
    )
  );

  // 测试错误处理
  console.log();
  console.log('=== 测试错误处理 ===');

  try {
    await piscina.run({ a: 10, b: 0 }, { name: 'divide' });
  } catch (error) {
    console.log(`除零错误测试: ${error.message}`);
  }

  try {
    await piscina.run({ data: -5, operation: 'factorial' }, { name: 'asyncCalculate' });
  } catch (error) {
    console.log(`负数阶乘错误测试: ${error.message}`);
  }

  // 显示性能统计信息
  console.log();
  console.log('=== 性能统计 ===');
  console.log(`完成的任务数: ${piscina.completed}`);
  console.log(`当前队列大小: ${piscina.queueSize}`);
  console.log(`运行时间统计:`);
  console.log(`  - 平均运行时间: ${piscina.runTime.average.toFixed(2)}ms`);
  console.log(`  - 最小运行时间: ${piscina.runTime.min}ms`);
  console.log(`  - 最大运行时间: ${piscina.runTime.max}ms`);
  console.log(`等待时间统计:`);
  console.log(`  - 平均等待时间: ${piscina.waitTime.average.toFixed(2)}ms`);
  console.log(`  - 最小等待时间: ${piscina.waitTime.min}ms`);
  console.log(`  - 最大等待时间: ${piscina.waitTime.max}ms`);

  // 关闭线程池
  await piscina.close();
  console.log('线程池已关闭');
}

// 处理错误
process.on('unhandledRejection', (error) => {
  console.error('未处理的 Promise 拒绝:', error);
  process.exit(1);
});

// 运行示例
runMultipleFunctionsExample().catch(console.error);