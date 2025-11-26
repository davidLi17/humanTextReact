/**
 * 历史记录 Store
 *
 * 管理翻译历史：
 * - 历史列表
 * - 搜索过滤
 * - CRUD 操作
 */
import { create } from "zustand";

export interface HistoryItem {
  original: string;
  translated: string;
  reasoning?: string;
  hasReasoning: boolean;
  timestamp: number;
}

export interface HistoryState {
  // 状态
  history: HistoryItem[];
  searchTerm: string;
  isLoading: boolean;

  // Actions
  setHistory: (history: HistoryItem[]) => void;
  addHistoryItem: (item: HistoryItem) => void;
  deleteHistoryItem: (original: string) => void;
  clearHistory: () => void;
  setSearchTerm: (term: string) => void;
  setLoading: (loading: boolean) => void;

  // Computed (通过 selector 实现)
  getFilteredHistory: () => HistoryItem[];
}

const MAX_HISTORY_COUNT = 100;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  searchTerm: "",
  isLoading: false,

  setHistory: (history) => set({ history }),

  addHistoryItem: (item) =>
    set((state) => {
      // 检查是否已存在相同原文
      const existingIndex = state.history.findIndex(
        (h) => h.original === item.original
      );

      let newHistory: HistoryItem[];

      if (existingIndex !== -1) {
        // 更新已存在的记录并移到最前
        newHistory = [
          item,
          ...state.history.slice(0, existingIndex),
          ...state.history.slice(existingIndex + 1),
        ];
      } else {
        // 添加新记录到最前
        newHistory = [item, ...state.history];
      }

      // 限制最大数量
      if (newHistory.length > MAX_HISTORY_COUNT) {
        newHistory = newHistory.slice(0, MAX_HISTORY_COUNT);
      }

      return { history: newHistory };
    }),

  deleteHistoryItem: (original) =>
    set((state) => ({
      history: state.history.filter((h) => h.original !== original),
    })),

  clearHistory: () => set({ history: [] }),

  setSearchTerm: (term) => set({ searchTerm: term }),

  setLoading: (loading) => set({ isLoading: loading }),

  getFilteredHistory: () => {
    const { history, searchTerm } = get();
    if (!searchTerm.trim()) {
      return history;
    }
    const lowerSearch = searchTerm.toLowerCase();
    return history.filter(
      (item) =>
        item.original.toLowerCase().includes(lowerSearch) ||
        item.translated.toLowerCase().includes(lowerSearch)
    );
  },
}));

export const HISTORY_STORE_NAME = "history";

export default useHistoryStore;
