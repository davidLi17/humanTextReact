// 可取消任务 Worker 实现
// 展示如何实现可以取消的任务

const { setTimeout } = require('timers/promises');

module.exports = async ({ id, duration = 5000 }) => {
  console.log(`Worker [${process.pid}]: 开始长时间任务 ${id} (预计耗时 ${duration}ms)`);

  const startTime = Date.now();

  // 模拟一个长时间运行的任务
  for (let i = 0; i < 10; i++) {
    // 检查是否被取消
    if (process.abortController && process.abortController.signal.aborted) {
      console.log(`Worker [${process.pid}]: 任务 ${id} 被取消`);
      throw new Error('任务被取消');
    }

    // 模拟工作
    await setTimeout(duration / 10);

    const elapsed = Date.now() - startTime;
    console.log(`Worker [${process.pid}]: 任务 ${id} 进度 ${((i + 1) * 10)}% (${elapsed}ms)`);
  }

  const result = {
    id,
    duration,
    workerId: process.pid,
    completedAt: Date.now()
  };

  console.log(`Worker [${process.pid}]: 任务 ${id} 完成`);
  return result;
};