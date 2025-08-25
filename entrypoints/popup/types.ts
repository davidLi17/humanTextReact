export interface TranslationState {
  sourceText: string;
  translatedText: string;
  reasoningText: string;
  isTranslating: boolean;
  hasReasoning: boolean;
  showResult: boolean;
}

export interface HistoryItem {
  original: string;
  translated: string;
  reasoning?: string;
  hasReasoning?: boolean;
  timestamp: number;
}

export interface TranslationAreaProps {
  translationState: TranslationState;
  setTranslationState: React.Dispatch<React.SetStateAction<TranslationState>>;
  onTranslate: () => void;
  onCopy: (text: string) => Promise<boolean>;
  onShowHistory: () => void;
  onOpenSettings: () => void;
  onScroll: () => void;
  resultAreaRef: React.RefObject<HTMLDivElement | null>;
}

export interface HistoryPanelProps {
  history: HistoryItem[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onBack: () => void;
  onRestore: (item: HistoryItem) => void;
  onDelete: (original: string) => void;
  onClear: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export interface MessageRequest {
  action: string;
  text?: string;
  source?: string;
  content?: string;
  reasoningContent?: string;
  hasReasoning?: boolean;
  done?: boolean;
  error?: string;
}

export interface MessageResponse {
  success: boolean;
  history?: HistoryItem[];
  error?: string;
}
