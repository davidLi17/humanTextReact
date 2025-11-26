// 广播消息 Worker 实现
// 展示如何在 Worker 之间进行通信

const { BroadcastChannel } = require('worker_threads');
const { setTimeout } = require('timers/promises');

module.exports = async (threadName) => {
  console.log(`Worker [${process.pid}]: ${threadName} 开始运行`);

  const bc = new BroadcastChannel('worker_communication');

  // 接收消息的处理器
  bc.onmessage = (event) => {
    console.log(`Worker [${process.pid}] (${threadName}): 收到消息 - ${event.data}`);
  };

  // 发送初始化消息
  bc.postMessage(`${threadName} 已就绪`);

  // 模拟工作
  await setTimeout(1000);

  // 发送工作状态消息
  bc.postMessage(`${threadName} 正在处理数据`);

  // 继续模拟工作
  await setTimeout(1000);

  // 发送完成消息
  bc.postMessage(`${threadName} 完成工作`);

  // 关闭广播频道
  bc.close();

  return {
    threadName,
    workerId: process.pid,
    message: `${threadName} 工作完成`,
    timestamp: Date.now()
  };
};