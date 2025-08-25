# 🗣️ 人话翻译器 - Chrome 扩展

基于 React + WXT 框架开发的现代化 Chrome 扩展，提供智能文本翻译功能，将专业术语转化为通俗易懂的"人话"。

## ✨ 核心特性

### 🎯 智能翻译能力
- **DeepSeek API 集成**: 支持最新的 AI 翻译模型
- **流式响应**: 实时显示翻译过程，提升用户体验
- **思维链模式**: 可选 `deepseek-reasoner` 模型展示推理过程
- **智能错误处理**: 完善的错误处理和自动重试机制

### 🖱️ 多样化使用方式
- **右键菜单翻译**: 选中文本右键即可快速翻译
- **快捷键操作**: 默认 `Alt+H` 快捷键快速触发翻译
- **弹窗界面**: 点击扩展图标打开完整翻译界面
- **一键复制**: 支持源文本和翻译结果的快速复制

### 📚 历史记录管理
- **自动保存**: 最多保存 100 条翻译历史
- **智能搜索**: 支持历史记录的全文搜索和过滤
- **数据持久化**: 本地存储 + 云端同步双重保障
- **批量管理**: 支持单条删除和批量清空操作

### ⚙️ 灵活配置选项
- **API 配置**: 自定义 API 密钥和接口地址
- **模型选择**: 多模型支持（deepseek-reasoner/deepseek-chat）
- **参数调优**: 可调节 Temperature 等模型参数
- **提示词定制**: 支持自定义翻译提示词模板
- **设置同步**: Chrome 账号云端同步配置

## 🏗️ 技术架构

### 🧩 模块化设计
项目采用高度模块化的架构设计，遵循单一职责原则：

```
background/
├── apiService.ts        # API 交互服务
├── constants.ts         # 常量定义
├── contextMenuHandler.ts # 右键菜单事件处理
├── contextMenuManager.ts # 右键菜单管理
├── historyManager.ts    # 历史记录管理
├── messageHandler.ts    # 消息路由处理
├── messageUtils.ts      # 消息发送工具
├── requestManager.ts    # 请求生命周期管理
├── settingsManager.ts   # 设置管理
├── shortcutManager.ts   # 快捷键管理
└── translationService.ts # 翻译核心服务
```

### 🛠️ 技术栈
- **React 19**: 现代化的 UI 框架
- **TypeScript**: 类型安全的开发体验
- **WXT 0.20.6**: 专业的浏览器扩展开发框架
- **Vite**: 快速的构建工具
- **Chrome Extension MV3**: 最新的扩展标准
- **Less**: CSS 预处理器用于样式管理

## 🚀 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn 包管理器

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```
开发模式支持热重载，修改代码后扩展会自动重新加载。

### 生产构建
```bash
npm run build
```
构建产物输出到 `.output/chrome-mv3/` 目录。

### 安装扩展
1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `.output/chrome-mv3/` 目录

## 📖 使用指南

### 初次配置
1. 安装扩展后点击工具栏图标
2. 进入设置页面配置 API 密钥
3. 根据需求选择合适的模型和参数

### 翻译操作
- **网页翻译**: 选中任意文本，右键选择"人话翻译"
- **快捷键**: 选中文本后按 `Alt+H`
- **弹窗翻译**: 点击扩展图标，在界面中输入文本

### 历史管理
点击弹窗中的"历史记录"标签页，可以进行：
- 查看所有翻译历史
- 搜索特定翻译内容
- 删除单条或批量记录
- 导出/导入历史数据

## 📁 项目结构

```
humanTextReact/
├── entrypoints/
│   ├── background/          # 后台服务模块
│   │   ├── apiService.ts    # API 服务
│   │   ├── constants.ts     # 常量定义
│   │   ├── contextMenuHandler.ts # 菜单事件
│   │   ├── contextMenuManager.ts # 菜单管理
│   │   ├── historyManager.ts # 历史管理
│   │   ├── messageHandler.ts # 消息处理
│   │   ├── messageUtils.ts  # 消息工具
│   │   ├── requestManager.ts # 请求管理
│   │   ├── settingsManager.ts # 设置管理
│   │   ├── shortcutManager.ts # 快捷键管理
│   │   └── translationService.ts # 翻译服务
│   ├── content/            # 内容脚本
│   │   ├── index.ts        # 主入口
│   │   ├── markdown.ts     # Markdown 处理
│   │   ├── messageHandler.ts # 消息处理
│   │   ├── popupEventHandler.ts # 弹窗事件
│   │   ├── popupManager.ts # 弹窗管理
│   │   └── styles.tsx      # 样式文件
│   ├── options/            # 设置页面
│   │   ├── Options.less    # 设置页面样式
│   │   ├── Options.tsx     # 设置页面组件
│   │   ├── config/         # 配置相关
│   │   ├── index.html      # HTML 模板
│   │   └── main.tsx        # 入口文件
│   ├── popup/              # 弹窗界面
│   │   ├── App.less        # 主应用样式
│   │   ├── App.tsx         # 主应用组件
│   │   ├── components/     # 子组件
│   │   ├── index.html      # HTML 模板
│   │   ├── main.tsx        # 入口文件
│   │   ├── style.less      # 样式文件
│   │   ├── types.ts        # 类型定义
│   │   └── utils/          # 工具函数
│   └── shared/             # 共享资源
│       └── constants.ts    # 共享常量
├── public/                 # 静态资源
│   └── icon/              # 图标文件
├── shared/                # 共享模块
│   ├── styles/            # 共享样式
│   └── utils/             # 共享工具
├── wxt.config.ts          # WXT 配置
└── package.json           # 项目配置
```

## ⚙️ 配置说明

### API 配置
- **API 地址**: DeepSeek API 的基础 URL
- **API 密钥**: 从 DeepSeek 平台获取的有效密钥
- **模型选项**: 
  - `deepseek-reasoner`: 支持思维链推理，适合复杂文本
  - `deepseek-chat`: 响应速度快，适合简单翻译

### 提示词模板
支持自定义翻译提示词，使用 `{text}` 作为文本占位符：
```
请将以下专业文本翻译成通俗易懂的中文：{text}
```

## 🎨 设计理念

### 架构优势
1. **可维护性**: 模块职责单一，修改影响范围小
2. **可测试性**: 独立模块便于单元测试
3. **可扩展性**: 新功能可以模块化添加
4. **错误隔离**: 问题定位精确，调试简单
5. **团队协作**: 并行开发不同模块

### 用户体验
- 流式响应提供实时反馈
- 错误处理保证功能稳定性
- 历史管理增强实用性
- 多操作方式满足不同场景

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关资源

- [WXT 官方文档](https://wxt.dev/)
- [Chrome 扩展开发指南](https://developer.chrome.com/docs/extensions/)
- [DeepSeek API 文档](https://platform.deepseek.com/api-docs/)
- [React 官方文档](https://react.dev/)

## ❓ 常见问题

### Q: 翻译失败如何处理？
A: 检查 API 密钥有效性、网络连接状态和 API 余额情况。

### Q: 如何修改快捷键？
A: 在设置页面点击"快捷键设置"，会跳转到 Chrome 扩展的快捷键管理页面。

### Q: 历史记录存储在哪里？
A: 历史记录同时存储在本地和云端，登录 Chrome 账号后可跨设备同步。

### Q: 支持哪些浏览器？
A: 主要支持 Chrome，也可通过 `npm run dev:firefox` 开发 Firefox 版本。

---

如有其他问题，请提交 [Issue](https://github.com/your-repo/issues) 或查看详细文档。