/**
 * @description 表示翻译过程的状态。
 */
export interface TranslationState {
  /**
   * @description 要翻译的文本。
   */
  sourceText: string;
  /**
   * @description 翻译后的文本。
   */
  translatedText: string;
  /**
   * @description 翻译的推理过程。
   */
  reasoningText: string;
  /**
   * @description 是否正在翻译。
   */
  isTranslating: boolean;
  /**
   * @description 翻译是否有推理过程。
   */
  hasReasoning: boolean;
  /**
   * @description 是否显示翻译结果。
   */
  showResult: boolean;
}

/**
 * @description 表示翻译历史中的单个项目。
 */
export interface HistoryItem {
  /**
   * @description 原始文本。
   */
  original: string;
  /**
   * @description 翻译后的文本。
   */
  translated: string;
  /**
   * @description 翻译的推理过程。
   */
  reasoning?: string;
  /**
   * @description 翻译是否有推理过程。
   */
  hasReasoning?: boolean;
  /**
   * @description 翻译的时间戳。
   */
  timestamp: number;
}

/**
 * @description 表示 TranslationArea 组件的 props。
 */
export interface TranslationAreaProps {
  /**
   * @description 翻译过程的状态。
   */
  translationState: TranslationState;
  /**
   * @description 设置翻译状态的函数。
   */
  setTranslationState: React.Dispatch<React.SetStateAction<TranslationState>>;
  /**
   * @description 触发翻译的函数。
   */
  onTranslate: () => void;
  /**
   * @description 将文本复制到剪贴板的函数。
   */
  onCopy: (text: string) => Promise<boolean>;
  /**
   * @description 显示历史记录面板的函数。
   */
  onShowHistory: () => void;
  /**
   * @description 打开设置面板的函数。
   */
  onOpenSettings: () => void;
  /**
   * @description 处理滚动的函数。
   */
  onScroll: () => void;
  /**
   * @description 历史记录数据，用于智能补全。
   */
  history: HistoryItem[];
}

/**
 * @description 表示 HistoryPanel 组件的 props。
 */
export interface HistoryPanelProps {
  /**
   * @description 历史项目列表。
   */
  history: HistoryItem[];
  /**
   * @description 用于筛选历史记录的搜索词。
   */
  searchTerm: string;
  /**
   * @description 处理搜索词更改的函数。
   */
  onSearchChange: (term: string) => void;
  /**
   * @description 返回主视图的函数。
   */
  onBack: () => void;
  /**
   * @description 恢复历史项目的函数。
   */
  onRestore: (item: HistoryItem) => void;
  /**
   * @description 删除历史项目的函数。
   */
  onDelete: (original: string) => void;
  /**
   * @description 清除整个历史记录的函数。
   */
  onClear: () => void;
  /**
   * @description 导出历史记录的函数。
   */
  onExport: () => void;
  /**
   * @description 从文件导入历史记录的函数。
   */
  onImport: (file: File) => void;
}

/**
 * @description 表示在扩展的不同部分之间发送的消息请求。
 */
export interface MessageRequest {
  /**
   * @description 要执行的操作。
   */
  action: string;
  /**
   * @description 消息的文本内容。
   */
  text?: string;
  /**
   * @description 消息的来源。
   */
  source?: string;
  /**
   * @description 消息的内容。
   */
  content?: string;
  /**
   * @description 消息的推理内容。
   */
  reasoningContent?: string;
  /**
   * @description 消息是否有推理过程。
   */
  hasReasoning?: boolean;
  /**
   * @description 操作是否完成。
   */
  done?: boolean;
  /**
   * @description 发生的任何错误。
   */
  error?: string;
}

/**
 * @description 表示在扩展的不同部分之间发送的消息响应。
 */
export interface MessageResponse {
  /**
   * @description 操作是否成功。
   */
  success: boolean;
  /**
   * @description 历史项目。
   */
  history?: HistoryItem[];
  /**
   * @description 发生的任何错误。
   */
  error?: string;
}
