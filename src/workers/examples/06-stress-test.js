// 压力测试 Piscina Worker 线程池示例
// 展示 Piscina 在高负载下的性能表现

const path = require('path');
const Piscina = require('piscina');
const { setTimeout } = require('timers/promises');
const os = require('os');

// 系统信息
const cpuCount = os.cpus().length;
const totalMemory = os.totalmem();
const freeMemory = os.freemem();

console.log('=== 压力测试 Piscina Worker 线程池示例 ===');
console.log(`系统信息:`);
console.log(`- CPU 核心数: ${cpuCount}`);
console.log(`- 总内存: ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`- 可用内存: ${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log();

// 创建 Worker 线程池
const piscina = new Piscina({
  filename: path.resolve(__dirname, '../workers/stress-worker.js'),
  minThreads: Math.max(2, Math.floor(cpuCount / 2)),
  maxThreads: Math.min(8, cpuCount * 2),
  idleTimeout: 5000,
  maxQueue: 100,
  concurrentTasksPerWorker: 1
});

console.log(`线程池配置:`);
console.log(`- 最小线程数: ${piscina.options.minThreads}`);
console.log(`- 最大线程数: ${piscina.options.maxThreads}`);
console.log(`- 最大队列大小: ${piscina.options.maxQueue}`);
console.log();

async function runStressTest() {
  console.log('开始执行压力测试...');

  // 测试 1: 快速任务测试
  console.log();
  console.log('=== 测试 1: 快速任务测试 ===');

  const quickTaskCount = 1000;
  console.log(`执行 ${quickTaskCount} 个快速任务...`);

  const quickStartTime = Date.now();
  const quickTasks = Array.from({ length: quickTaskCount }, (_, i) => ({
    id: i + 1,
    type: 'quick'
  }));

  const quickResults = await Promise.all(
    quickTasks.map(task =>
      piscina.run(task).then(result => ({ ...task, ...result }))
    )
  );

  const quickEndTime = Date.now();
  const quickDuration = quickEndTime - quickStartTime;

  console.log(`快速任务完成:`);
  console.log(`  - 总时间: ${quickDuration}ms`);
  console.log(`  - 平均每个任务: ${(quickDuration / quickTaskCount).toFixed(2)}ms`);
  console.log(`  - 吞吐量: ${(quickTaskCount / quickDuration * 1000).toFixed(2)} 任务/秒`);

  // 测试 2: 混合任务测试
  console.log();
  console.log('=== 测试 2: 混合任务测试 ===');

  const mixedTaskCount = 100;
  console.log(`执行 ${mixedTaskCount} 个混合任务...`);

  const mixedStartTime = Date.now();
  const mixedTasks = Array.from({ length: mixedTaskCount }, (_, i) => ({
    id: i + 1,
    type: 'mixed',
    complexity: Math.floor(Math.random() * 10) + 20,
    dataSize: Math.floor(Math.random() * 5000) + 5000
  }));

  const mixedResults = await Promise.all(
    mixedTasks.map(task =>
      piscina.run(task).then(result => ({ ...task, ...result }))
    )
  );

  const mixedEndTime = Date.now();
  const mixedDuration = mixedEndTime - mixedStartTime;

  console.log(`混合任务完成:`);
  console.log(`  - 总时间: ${mixedDuration}ms`);
  console.log(`  - 平均每个任务: ${(mixedDuration / mixedTaskCount).toFixed(2)}ms`);
  console.log(`  - 吞吐量: ${(mixedTaskCount / mixedDuration * 1000).toFixed(2)} 任务/秒`);

  // 分析混合任务结果
  const avgProcessingTime = mixedResults.reduce((sum, r) => sum + r.duration, 0) / mixedResults.length;
  console.log(`  - 平均处理时间: ${avgProcessingTime.toFixed(2)}ms`);

  // 测试 3: 重型任务测试
  console.log();
  console.log('=== 测试 3: 重型任务测试 ===');

  const heavyTaskCount = 20;
  console.log(`执行 ${heavyTaskCount} 个重型任务...`);

  const heavyStartTime = Date.now();
  const heavyTasks = Array.from({ length: heavyTaskCount }, (_, i) => ({
    id: i + 1,
    type: 'heavy',
    complexity: Math.floor(Math.random() * 5) + 35
  }));

  const heavyResults = await Promise.all(
    heavyTasks.map(task =>
      piscina.run(task).then(result => ({ ...task, ...result }))
    )
  );

  const heavyEndTime = Date.now();
  const heavyDuration = heavyEndTime - heavyStartTime;

  console.log(`重型任务完成:`);
  console.log(`  - 总时间: ${heavyDuration}ms`);
  console.log(`  - 平均每个任务: ${(heavyDuration / heavyTaskCount).toFixed(2)}ms`);
  console.log(`  - 吞吐量: ${(heavyTaskCount / heavyDuration * 1000).toFixed(2)} 任务/秒`);

  // 测试 4: 队列压力测试
  console.log();
  console.log('=== 测试 4: 队列压力测试 ===');

  const queueTaskCount = 50;
  console.log(`执行 ${queueTaskCount} 个任务（测试队列性能）...`);

  const queueStartTime = Date.now();
  const queueTasks = Array.from({ length: queueTaskCount }, (_, i) => ({
    id: i + 1,
    type: 'medium',
    iterations: Math.floor(Math.random() * 50000) + 50000
  }));

  // 监听队列事件
  let drainEventCount = 0;
  let needsDrainEventCount = 0;

  piscina.on('drain', () => {
    drainEventCount++;
    console.log(`队列排水事件 #${drainEventCount}`);
  });

  piscina.on('needsDrain', () => {
    needsDrainEventCount++;
    console.log(`队列需要排水事件 #${needsDrainEventCount}，队列大小: ${piscina.queueSize}`);
  });

  const queueResults = await Promise.all(
    queueTasks.map(task =>
      piscina.run(task).then(result => ({ ...task, ...result }))
    )
  );

  const queueEndTime = Date.now();
  const queueDuration = queueEndTime - queueStartTime;

  console.log(`队列测试完成:`);
  console.log(`  - 总时间: ${queueDuration}ms`);
  console.log(`  - 平均每个任务: ${(queueDuration / queueTaskCount).toFixed(2)}ms`);
  console.log(`  - 吞吐量: ${(queueTaskCount / queueDuration * 1000).toFixed(2)} 任务/秒`);
  console.log(`  - 排水事件次数: ${drainEventCount}`);
  console.log(`  - 需要排水事件次数: ${needsDrainEventCount}`);

  // 测试 5: 内存使用测试
  console.log();
  console.log('=== 测试 5: 内存使用测试 ===');

  const memoryTaskCount = 50;
  console.log(`执行 ${memoryTaskCount} 个内存密集型任务...`);

  const memoryStartUsage = process.memoryUsage();
  const memoryStartTime = Date.now();

  const memoryTasks = Array.from({ length: memoryTaskCount }, (_, i) => ({
    id: i + 1,
    type: 'mixed',
    complexity: 25,
    dataSize: 20000
  }));

  const memoryResults = await Promise.all(
    memoryTasks.map(task =>
      piscina.run(task).then(result => ({ ...task, ...result }))
    )
  );

  const memoryEndTime = Date.now();
  const memoryEndUsage = process.memoryUsage();

  console.log(`内存测试完成:`);
  console.log(`  - 总时间: ${memoryEndTime - memoryStartTime}ms`);
  console.log(`  - 内存使用变化:`);
  console.log(`    - RSS: ${(memoryEndUsage.rss - memoryStartUsage.rss) / 1024 / 1024} MB`);
  console.log(`    - 堆内存: ${(memoryEndUsage.heapUsed - memoryStartUsage.heapUsed) / 1024 / 1024} MB`);
  console.log(`    - 外部内存: ${(memoryEndUsage.external - memoryStartUsage.external) / 1024 / 1024} MB`);

  // 最终统计
  console.log();
  console.log('=== 最终性能统计 ===');
  console.log(`完成的任务总数: ${piscina.completed}`);
  console.log(`当前队列大小: ${piscina.queueSize}`);
  console.log(`运行时间统计:`);
  console.log(`  - 平均运行时间: ${piscina.runTime.average.toFixed(2)}ms`);
  console.log(`  - 最小运行时间: ${piscina.runTime.min}ms`);
  console.log(`  - 最大运行时间: ${piscina.runTime.max}ms`);
  console.log(`  - 95% 分位数: ${piscina.runTime.p95?.toFixed(2) || 'N/A'}ms`);
  console.log(`  - 99% 分位数: ${piscina.runTime.p99?.toFixed(2) || 'N/A'}ms`);
  console.log(`等待时间统计:`);
  console.log(`  - 平均等待时间: ${piscina.waitTime.average.toFixed(2)}ms`);
  console.log(`  - 最小等待时间: ${piscina.waitTime.min}ms`);
  console.log(`  - 最大等待时间: ${piscina.waitTime.max}ms`);
  console.log(`资源利用率: ${piscina.utilization.toFixed(2)}`);

  // Worker 使用统计
  console.log();
  console.log('=== Worker 使用统计 ===');
  const allResults = [...quickResults, ...mixedResults, ...heavyResults, ...queueResults, ...memoryResults];
  const workerStats = {};
  allResults.forEach(result => {
    if (!workerStats[result.workerId]) {
      workerStats[result.workerId] = { count: 0, types: {} };
    }
    workerStats[result.workerId].count++;
    if (!workerStats[result.workerId].types[result.type]) {
      workerStats[result.workerId].types[result.type] = 0;
    }
    workerStats[result.workerId].types[result.type]++;
  });

  Object.entries(workerStats).forEach(([workerId, stats]) => {
    console.log(`Worker ${workerId}: ${stats.count} 个任务`);
    Object.entries(stats.types).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} 个`);
    });
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

// 运行压力测试
runStressTest().catch(console.error);