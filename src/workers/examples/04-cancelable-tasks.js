// 可取消任务 Piscina Worker 线程池示例
// 展示如何使用 AbortController 取消正在执行的任务

const path = require('path');
const Piscina = require('piscina');
const { setTimeout } = require('timers/promises');

// 创建 Worker 线程池
const piscina = new Piscina({
  filename: path.resolve(__dirname, '../workers/cancelable-worker.js'),
  minThreads: 2,
  maxThreads: 4,
  idleTimeout: 1000,
  maxQueue: 10
});

console.log('=== 可取消任务 Piscina Worker 线程池示例 ===');
console.log(`线程池配置:`);
console.log(`- 最小线程数: ${piscina.options.minThreads}`);
console.log(`- 最大线程数: ${piscina.options.maxThreads}`);
console.log();

async function runCancelableTasksExample() {
  console.log('开始执行可取消任务示例...');

  // 示例 1: 使用 AbortController 取消任务
  console.log();
  console.log('=== 示例 1: 使用 AbortController 取消任务 ===');

  const abortController1 = new AbortController();
  const task1 = piscina.run({ id: 1, duration: 3000 }, { signal: abortController1.signal });

  // 在任务执行一段时间后取消
  setTimeout(1500, () => {
    console.log('取消任务 1...');
    abortController1.abort();
  });

  try {
    const result = await task1;
    console.log(`任务 1 完成: ${JSON.stringify(result)}`);
  } catch (error) {
    console.log(`任务 1 被取消: ${error.message}`);
  }

  // 示例 2: 使用 EventEmitter 取消任务
  console.log();
  console.log('=== 示例 2: 使用 EventEmitter 取消任务 ===');

  const EventEmitter = require('events');
  const eventEmitter = new EventEmitter();

  const task2 = piscina.run({ id: 2, duration: 3000 }, { signal: eventEmitter });

  // 在任务执行一段时间后取消
  setTimeout(1000, () => {
    console.log('使用 EventEmitter 取消任务 2...');
    eventEmitter.emit('abort');
  });

  try {
    const result = await task2;
    console.log(`任务 2 完成: ${JSON.stringify(result)}`);
  } catch (error) {
    console.log(`任务 2 被取消: ${error.message}`);
  }

  // 示例 3: 批量任务，部分取消
  console.log();
  console.log('=== 示例 3: 批量任务，部分取消 ===');

  const abortController3 = new AbortController();
  const abortController4 = new AbortController();

  const tasks = [
    { id: 3, duration: 2000, abortController: null },
    { id: 4, duration: 2000, abortController: abortController3 },
    { id: 5, duration: 2000, abortController: null },
    { id: 6, duration: 2000, abortController: abortController4 }
  ];

  console.log('启动 4 个任务，将在 1 秒后取消任务 4 和 6...');

  const taskPromises = tasks.map(task => {
    const options = task.abortController
      ? { signal: task.abortController.signal }
      : {};

    return piscina.run(
      { id: task.id, duration: task.duration },
      options
    ).then(result => {
      console.log(`任务 ${task.id} 完成: ${result.duration}ms`);
      return { id: task.id, status: 'completed', result };
    }).catch(error => {
      console.log(`任务 ${task.id} 被取消: ${error.message}`);
      return { id: task.id, status: 'cancelled', error: error.message };
    });
  });

  // 1 秒后取消部分任务
  setTimeout(1000, () => {
    console.log('取消任务 4 和 6...');
    abortController3.abort();
    abortController4.abort();
  });

  const batchResults = await Promise.all(taskPromises);

  // 统计批量任务结果
  console.log();
  console.log('=== 批量任务统计 ===');
  const completed = batchResults.filter(r => r.status === 'completed');
  const cancelled = batchResults.filter(r => r.status === 'cancelled');
  console.log(`完成的任务: ${completed.length}`);
  console.log(`取消的任务: ${cancelled.length}`);

  // 示例 4: 检查 needsDrain 和队列状态
  console.log();
  console.log('=== 示例 4: 队列管理和背压 ===');

  const maxTasks = 15;
  console.log(`提交 ${maxTasks} 个任务到队列中...`);

  const largeBatchTasks = [];
  const largeBatchControllers = [];

  for (let i = 0; i < maxTasks; i++) {
    const controller = new AbortController();
    largeBatchControllers.push(controller);

    const task = piscina.run(
      { id: 7 + i, duration: 1000 },
      { signal: controller.signal }
    );

    largeBatchTasks.push(task);
  }

  // 显示队列状态
  console.log(`队列大小: ${piscina.queueSize}`);
  console.log(`需要排水: ${piscina.needsDrain}`);

  // 监听 drain 事件
  piscina.once('drain', () => {
    console.log('队列已排空，所有任务已开始处理');
  });

  // 监听 needsDrain 事件
  piscina.on('needsDrain', () => {
    console.log('队列达到容量限制，需要背压控制');
  });

  // 等待一些任务完成
  await setTimeout(500);

  // 取消剩余的所有任务
  console.log('取消所有剩余任务...');
  largeBatchControllers.forEach(controller => {
    controller.abort();
  });

  try {
    await Promise.all(largeBatchTasks);
  } catch (error) {
    // 预期会有取消错误
  }

  // 显示最终性能统计
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
runCancelableTasksExample().catch(console.error);