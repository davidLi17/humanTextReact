// 广播消息 Piscina Worker 线程池示例
// 展示如何在 Worker 之间进行通信

const path = require('path');
const Piscina = require('piscina');
const { BroadcastChannel } = require('worker_threads');
const { setTimeout } = require('timers/promises');

// 创建 Worker 线程池，禁用 atomics 以支持 BroadcastChannel
const piscina = new Piscina({
  filename: path.resolve(__dirname, '../workers/broadcast-worker.js'),
  minThreads: 3,
  maxThreads: 6,
  idleTimeout: 2000,
  maxQueue: 10,
  atomics: 'disabled'  // 禁用 atomics 以支持 BroadcastChannel
});

console.log('=== 广播消息 Piscina Worker 线程池示例 ===');
console.log(`线程池配置:`);
console.log(`- 最小线程数: ${piscina.options.minThreads}`);
console.log(`- 最大线程数: ${piscina.options.maxThreads}`);
console.log(`- Atomics: ${piscina.options.atomics}`);
console.log();

async function runBroadcastMessageExample() {
  console.log('开始执行广播消息示例...');

  // 创建主线程的广播频道
  const mainChannel = new BroadcastChannel('worker_communication');

  // 监听来自 Worker 的消息
  const messages = [];
  mainChannel.onmessage = (event) => {
    messages.push({
      data: event.data,
      timestamp: Date.now(),
      source: 'worker'
    });
    console.log(`主线程收到消息: ${event.data}`);
  };

  // 示例 1: 基本广播通信
  console.log();
  console.log('=== 示例 1: 基本 Worker 间通信 ===');

  // 启动多个 Worker
  const workerTasks = [
    piscina.run('Worker A'),
    piscina.run('Worker B'),
    piscina.run('Worker C')
  ];

  // 等待所有 Worker 完成
  const results = await Promise.all(workerTasks);

  console.log();
  console.log('Worker 任务完成:');
  results.forEach(result => {
    console.log(`- ${result.threadName} (PID: ${result.workerId}): ${result.message}`);
  });

  // 等待一段时间以接收所有消息
  await setTimeout(1000);

  // 示例 2: 主线程向 Worker 广播消息
  console.log();
  console.log('=== 示例 2: 主线程向 Worker 广播消息 ===');

  // 启动另一组 Worker
  const secondBatchTasks = [
    piscina.run('Worker D'),
    piscina.run('Worker E'),
    piscina.run('Worker F')
  ];

  // 等待 Worker 初始化
  await setTimeout(500);

  // 主线程发送广播消息
  console.log('主线程发送广播消息...');
  mainChannel.postMessage('主线程: 所有 Worker 请注意！');

  // 再次发送消息
  await setTimeout(500);
  mainChannel.postMessage('主线程: 即将开始新的任务...');

  // 等待所有 Worker 完成
  const secondBatchResults = await Promise.all(secondBatchTasks);

  console.log();
  console.log('第二批 Worker 任务完成:');
  secondBatchResults.forEach(result => {
    console.log(`- ${result.threadName} (PID: ${result.workerId}): ${result.message}`);
  });

  // 等待最后一批消息
  await setTimeout(1000);

  // 示例 3: 消息统计和分析
  console.log();
  console.log('=== 示例 3: 消息统计和分析 ===');

  console.log(`总共收到 ${messages.length} 条消息:`);
  messages.forEach((msg, index) => {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    console.log(`  ${index + 1}. [${time}] ${msg.data}`);
  });

  // 按发送者分类消息
  const messageStats = {};
  messages.forEach(msg => {
    const sender = msg.data.split(' ')[0];
    if (!messageStats[sender]) {
      messageStats[sender] = 0;
    }
    messageStats[sender]++;
  });

  console.log();
  console.log('消息发送者统计:');
  Object.entries(messageStats).forEach(([sender, count]) => {
    console.log(`  ${sender}: ${count} 条消息`);
  });

  // 示例 4: 消息传递时间分析
  console.log();
  console.log('=== 示例 4: 消息传递时间分析 ===');

  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];

  if (firstMessage && lastMessage) {
    const totalTime = lastMessage.timestamp - firstMessage.timestamp;
    console.log(`第一条消息: ${new Date(firstMessage.timestamp).toLocaleTimeString()}`);
    console.log(`最后一条消息: ${new Date(lastMessage.timestamp).toLocaleTimeString()}`);
    console.log(`消息传递总时长: ${totalTime}ms`);
    console.log(`平均消息间隔: ${(totalTime / (messages.length - 1)).toFixed(2)}ms`);
  }

  // 关闭主线程广播频道
  mainChannel.close();

  // 显示性能统计
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
runBroadcastMessageExample().catch(console.error);