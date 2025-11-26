// 基础 Piscina Worker 线程池示例
// 展示最基本的 Piscina 使用方法

const path = require('path');
const Piscina = require('piscina');

// 创建 Worker 线程池
const piscina = new Piscina({
  filename: path.resolve(__dirname, '../workers/basic-worker.js'),
  minThreads: 2,                    // 最小线程数
  maxThreads: 4,                    // 最大线程数
  idleTimeout: 1000,               // 空闲超时时间（毫秒）
  maxQueue: 'auto'                 // 自动计算最大队列大小
});

console.log('=== 基础 Piscina Worker 线程池示例 ===');
console.log(`线程池配置:`);
console.log(`- 最小线程数: ${piscina.options.minThreads}`);
console.log(`- 最大线程数: ${piscina.options.maxThreads}`);
console.log(`- 空闲超时: ${piscina.options.idleTimeout}ms`);
console.log(`- 最大队列大小: ${piscina.options.maxQueue}`);
console.log();

async function runBasicExample() {
  console.log('开始执行任务...');

  // 创建一些任务
  const tasks = [
    { a: 4, b: 6 },
    { a: 10, b: 20 },
    { a: 100, b: 200 },
    { a: 7, b: 3 },
    { a: 15, b: 25 },
    { a: 50, b: 50 },
    { a: 1, b: 9 },
    { a: 33, b: 67 }
  ];

  console.log(`准备执行 ${tasks.length} 个任务`);
  console.log();

  // 记录开始时间
  const startTime = Date.now();

  // 并行执行所有任务
  const results = await Promise.all(
    tasks.map((task, index) =>
      piscina.run(task).then(result => {
        console.log(`任务 ${index + 1}: ${task.a} + ${task.b} = ${result}`);
        return result;
      })
    )
  );

  // 记录结束时间
  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log();
  console.log('=== 任务执行完成 ===');
  console.log(`总执行时间: ${duration}ms`);
  console.log(`任务总数: ${tasks.length}`);
  console.log(`平均每个任务: ${(duration / tasks.length).toFixed(2)}ms`);
  console.log(`所有结果: [${results.join(', ')}]`);

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
runBasicExample().catch(console.error);