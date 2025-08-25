# 人话翻译器 React 版本

基于 React + WXT 框架开发的 Chrome 扩展，提供智能文本翻译功能。

## ✨ 功能特性

### 🎯 核心翻译功能

- 支持 DeepSeek API 的智能翻译
- 流式响应显示，实时查看翻译过程
- 支持思维链模式（deepseek-reasoner 模型）
- 智能错误处理和重试机制

### 🖱️ 多种使用方式

- **右键菜单翻译**: 选中文本右键即可翻译
- **快捷键翻译**: 使用 Alt+H 快速翻译选中文本
- **弹窗翻译**: 点击扩展图标打开翻译界面
- **一键复制**: 支持输入和结果的快速复制

### 📖 历史记录管理

- 自动保存翻译历史（最多 100 条）
- 支持历史记录搜索和过滤
- 历史记录导出/导入功能
- 单条删除或批量清空

### ⚙️ 灵活设置

- 自定义 API 密钥和地址
- 多模型选择（deepseek-reasoner/deepseek-chat）
- 可调节 Temperature 参数
- 自定义提示词模板
- 云端同步设置

## 🚀 技术栈

- **React 19** - 现代 UI 框架
- **TypeScript** - 类型安全
- **WXT** - 扩展开发框架
- **Vite** - 构建工具
- **Chrome Extension Manifest V3** - 最新扩展标准

## 🛠️ 开发指南

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

开发模式会启动热重载，修改代码后扩展会自动重新加载。

### 生产构建

```bash
npm run build
```

构建产物会输出到 `.output/chrome-mv3/` 目录。

### 安装扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `.output/chrome-mv3/` 目录

## 📋 使用说明

### 初次使用

1. 安装扩展后，点击扩展图标
2. 进入设置页面配置 API 密钥
3. 选择合适的模型和参数

### 翻译文本

- **方式一**: 选中网页文本，右键选择"人话翻译"
- **方式二**: 选中文本后按 Alt+H 快捷键
- **方式三**: 点击扩展图标，在弹窗中输入文本

### 查看历史

点击弹窗中的"历史记录"标签页，可以查看、搜索和管理翻译历史。

## 📁 项目结构

```
humanTextReact/
├── entrypoints/
│   ├── background.ts        # 后台服务
│   ├── content.ts          # 内容脚本
│   ├── popup/              # 弹窗界面
│   │   ├── App.tsx         # 主应用
│   │   ├── components/     # React组件
│   │   ├── utils/          # 工具函数
│   │   └── types.ts        # 类型定义
│   └── options/            # 设置页面
├── public/                 # 静态资源
├── wxt.config.ts          # WXT配置
└── package.json
```

## 🔧 配置说明

### API 配置

- **API 地址**: DeepSeek API 的 Base URL
- **API 密钥**: 从 DeepSeek 获取的 API Key
- **模型选择**:
  - `deepseek-reasoner`: 支持思维链，推理能力强
  - `deepseek-chat`: 响应速度快，成本低

### 提示词模板

可以自定义翻译提示词，使用`{text}`作为待翻译文本的占位符。

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支
3. 提交你的修改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 🔗 相关链接

- [WXT 文档](https://wxt.dev/)
- [Chrome 扩展开发文档](https://developer.chrome.com/docs/extensions/)
- [DeepSeek API 文档](https://platform.deepseek.com/api-docs/)

## ❓ 常见问题

### Q: 翻译失败怎么办？

A: 请检查 API 密钥是否正确，网络连接是否正常，API 余额是否充足。

### Q: 如何修改快捷键？

A: 在设置页面点击"快捷键设置"会跳转到 Chrome 扩展快捷键管理页面。

### Q: 历史记录存储在哪里？

A: 历史记录同时保存在本地和云端，换设备登录 Chrome 账号后会自动同步。
