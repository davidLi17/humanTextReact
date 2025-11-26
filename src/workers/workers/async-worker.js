// 异步 Worker 实现 - 模拟异步操作
// 展示如何在 Worker 中处理异步任务

const { setTimeout } = require('timers/promises');

module.exports = async ({ id, data, delay = 100 }) => {
  console.log(`Worker [${process.pid}]: 开始处理异步任务 ${id}`);

  // 模拟一些异步工作（比如数据库查询、API 调用等）
  await setTimeout(delay);

  // 模拟数据处理
  const result = {
    id,
    input: data,
    processed: data * 2,
    processingTime: delay,
    workerId: process.pid,
    timestamp: Date.now()
  };

  console.log(`Worker [${process.pid}]: 完成异步任务 ${id}`);

  return result;
};