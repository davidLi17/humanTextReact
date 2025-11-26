// 异步 Piscina Worker 线程池示例
// 展示如何在 Worker 中处理异步操作

const path = require('path');
const Piscina = require('piscina');

// 创建 Worker 线程池
const piscina = new Piscina({
  filename: path.resolve(__dirname, '../workers/async-worker.js'),
  minThreads: 3,
  maxThreads: 6,
  idleTimeout: 2000,
  maxQueue: 50,
  concurrentTasksPerWorker: 2  // 每个 Worker 可以同时处理 2 个任务
});

console.log('=== 异步 Piscina Worker 线程池示例 ===');
console.log(`线程池配置:`);
console.log(`- 最小线程数: ${piscina.options.minThreads}`);
console.log(`- 最大线程数: ${piscina.options.maxThreads}`);
console.log(`- 每个Worker并发任务数: ${piscina.options.concurrentTasksPerWorker}`);
console.log();

async function runAsyncExample() {
  console.log('开始执行异步任务...');

  // 创建一些异步任务
  const tasks = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    data: Math.floor(Math.random() * 100),
    delay: Math.floor(Math.random() * 200) + 50  // 随机延迟 50-250ms
  }));

  console.log(`准备执行 ${tasks.length} 个异步任务`);
  console.log();

  // 记录开始时间
  const startTime = Date.now();

  // 使用 Promise.all 并行执行所有任务
  const results = await Promise.all(
    tasks.map(task =>
      piscina.run(task).then(result => {
        console.log(`任务 ${result.id}: ${result.input} -> ${result.processed} (${result.processingTime}ms)`);
        return result;
      })
    )
  );

  // 记录结束时间
  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  console.log();
  console.log('=== 异步任务执行完成 ===');
  console.log(`总执行时间: ${totalDuration}ms`);
  console.log(`任务总数: ${tasks.length}`);
  console.log(`平均每个任务: ${(totalDuration / tasks.length).toFixed(2)}ms`);

  // 计算统计信息
  const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
  console.log(`总处理时间: ${totalProcessingTime}ms`);
  console.log(`并行加速比: ${(totalProcessingTime / totalDuration).toFixed(2)}x`);

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

  // 显示线程使用情况
  console.log();
  console.log('=== 线程使用情况 ===');
  const workerIds = [...new Set(results.map(r => r.workerId))];
  console.log(`使用的 Worker 数量: ${workerIds.length}`);
  workerIds.forEach((workerId, index) => {
    const workerTasks = results.filter(r => r.workerId === workerId);
    console.log(`  Worker ${index + 1} (PID: ${workerId}): ${workerTasks.length} 个任务`);
  });

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
runAsyncExample().catch(console.error);