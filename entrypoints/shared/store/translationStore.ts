/**
 * 翻译状态 Store
 *
 * 管理翻译过程中的状态：
 * - 源文本
 * - 翻译结果
 * - 思维链内容
 * - 翻译状态
 */
import { create } from "zustand";

export interface TranslationState {
  // 状态
  sourceText: string;
  translatedText: string;
  reasoningText: string;
  isTranslating: boolean;
  hasReasoning: boolean;
  showResult: boolean;
  error: string | null;

  // Actions
  setSourceText: (text: string) => void;
  setTranslationResult: (result: {
    translatedText: string;
    reasoningText?: string;
    hasReasoning?: boolean;
  }) => void;
  startTranslation: () => void;
  finishTranslation: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
  updateFromMessage: (message: {
    content?: string;
    reasoningContent?: string;
    hasReasoning?: boolean;
    done?: boolean;
    error?: string;
  }) => void;
}

const initialState = {
  sourceText: "",
  translatedText: "",
  reasoningText: "",
  isTranslating: false,
  hasReasoning: false,
  showResult: false,
  error: null,
};

export const useTranslationStore = create<TranslationState>((set) => ({
  ...initialState,

  setSourceText: (text) => set({ sourceText: text }),

  setTranslationResult: (result) =>
    set({
      translatedText: result.translatedText,
      reasoningText: result.reasoningText || "",
      hasReasoning: result.hasReasoning || false,
      showResult: true,
    }),

  startTranslation: () =>
    set({
      isTranslating: true,
      showResult: true,
      translatedText: "",
      reasoningText: "",
      hasReasoning: false,
      error: null,
    }),

  finishTranslation: () => set({ isTranslating: false }),

  setError: (error) => set({ error, isTranslating: false }),

  reset: () => set(initialState),

  // 处理来自 background 的消息更新
  updateFromMessage: (message) =>
    set((state) => {
      if (message.error) {
        return {
          ...state,
          isTranslating: false,
          error: message.error,
          translatedText: `错误: ${message.error}`,
        };
      }

      return {
        ...state,
        translatedText: message.content ?? state.translatedText,
        reasoningText: message.reasoningContent ?? state.reasoningText,
        hasReasoning: message.hasReasoning ?? state.hasReasoning,
        showResult: true,
        isTranslating: !message.done,
      };
    }),
}));

export const TRANSLATION_STORE_NAME = "translation";

export default useTranslationStore;
