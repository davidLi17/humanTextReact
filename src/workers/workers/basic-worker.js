// 基础 Worker 实现 - 简单的加法运算
// 这是最简单的 Worker 示例

module.exports = ({ a, b }) => {
  console.log(`Worker [${process.pid}]: 接收到任务 ${a} + ${b}`);

  // 模拟一些计算工作
  const result = a + b;

  console.log(`Worker [${process.pid}]: 计算结果 ${a} + ${b} = ${result}`);

  return result;
};