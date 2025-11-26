# Piscina Worker Pool 教程

本文件夹包含 Piscina Node.js Worker 线程池的完整示例教程。

## 文件结构

```
src/workers/
├── README.md                     # 本文档
├── package.json                  # 依赖配置
├── examples/                     # 示例文件夹
│   ├── 01-basic-worker.js        # 基础 Worker 示例
│   ├── 02-async-worker.js        # 异步 Worker 示例
│   ├── 03-multiple-functions.js  # 多函数导出示例
│   ├── 04-cancelable-tasks.js    # 可取消任务示例
│   ├── 05-broadcast-message.js   # 广播消息示例
│   └── 06-stress-test.js         # 压力测试示例
└── workers/                      # Worker 文件夹
    ├── basic-worker.js            # 基础 Worker 实现
    ├── async-worker.js            # 异步 Worker 实现
    ├── multi-function-worker.js  # 多函数 Worker 实现
    ├── cancelable-worker.js       # 可取消任务 Worker
    └── broadcast-worker.js        # 广播消息 Worker
```

## 快速开始

1. 安装依赖：
```bash
npm install piscina
```

2. 运行示例：
```bash
# 基础示例
node src/workers/examples/01-basic-worker.js

# 异步示例
node src/workers/examples/02-async-worker.js

# 多函数示例
node src/workers/examples/03-multiple-functions.js

# 可取消任务示例
node src/workers/examples/04-cancelable-tasks.js

# 广播消息示例
node src/workers/examples/05-broadcast-message.js

# 压力测试示例
node src/workers/examples/06-stress-test.js
```

## 核心概念

### Worker 线程池
Piscina 创建一个 Worker 线程池，可以并行执行任务。

### 任务队列
任务被添加到队列中，当有可用的 Worker 时会被执行。

### 资源管理
自动管理 Worker 的创建和销毁，优化资源使用。

### 性能监控
提供详细的性能统计信息，包括运行时间、等待时间等。

## 示例说明

### 1. 基础 Worker 示例
展示了最基本的 Piscina 使用方法，包括创建线程池和提交任务。

### 2. 异步 Worker 示例
展示了如何在 Worker 中处理异步操作。

### 3. 多函数导出示例
展示了如何在单个 Worker 文件中导出多个函数。

### 4. 可取消任务示例
展示了如何使用 AbortController 取消正在执行的任务。

### 5. 广播消息示例
展示了如何在 Worker 之间进行通信。

### 6. 压力测试示例
展示了 Piscina 在高负载下的性能表现。

## 注意事项

- Node.js 版本要求：20.x 或更高
- Worker 代码应该尽量避免全局状态
- 合理配置线程池大小以获得最佳性能
- 注意内存使用和资源限制

## 更多信息

- [Piscina 官方文档](https://piscinajs.github.io/piscina/)
- [Node.js Worker Threads 文档](https://nodejs.org/api/worker_threads.html)