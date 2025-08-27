import { useState, useMemo, useCallback } from "react";
import Fuse, { FuseResultMatch } from "fuse.js";
import { HistoryItem } from "../types";

interface FuseSearchOptions {
  keys: string[];
  threshold?: number;
  includeScore?: boolean;
  includeMatches?: boolean;
  minMatchCharLength?: number;
  maxResults?: number;
}

interface SearchResult<T> {
  item: T;
  score?: number;
  matches?: readonly FuseResultMatch[];
}

interface UseFuseSearchReturn<T> {
  search: (query: string) => SearchResult<T>[];
  getSuggestions: (query: string, maxSuggestions?: number) => string[];
  getAutoComplete: (query: string) => string[];
  clearResults: () => void;
  results: SearchResult<T>[];
  isSearching: boolean;
}

const defaultOptions: FuseSearchOptions = {
  keys: ["original", "translated"],
  threshold: 0.3, // 更宽松的匹配阈值
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 1,
  maxResults: 10,
};

export function useFuseSearch<T = HistoryItem>(
  data: T[],
  options: Partial<FuseSearchOptions> = {}
): UseFuseSearchReturn<T> {
  const [results, setResults] = useState<SearchResult<T>[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fuseOptions = useMemo(
    () => ({
      ...defaultOptions,
      ...options,
    }),
    [options]
  );

  // 创建 Fuse 实例
  const fuse = useMemo(() => {
    return new Fuse(data, fuseOptions);
  }, [data, fuseOptions]);

  // 执行搜索
  const search = useCallback(
    (query: string): SearchResult<T>[] => {
      if (!query.trim()) {
        setResults([]);
        setIsSearching(false);
        return [];
      }

      setIsSearching(true);

      const fuseResults = fuse.search(query, {
        limit: fuseOptions.maxResults || 10,
      });

      const searchResults: SearchResult<T>[] = fuseResults.map((result) => ({
        item: result.item,
        score: result.score,
        matches: result.matches,
      }));

      setResults(searchResults);
      setIsSearching(false);

      return searchResults;
    },
    [fuse, fuseOptions.maxResults]
  );

  // 获取搜索建议（基于历史记录的原文）
  const getSuggestions = useCallback(
    (query: string, maxSuggestions = 5): string[] => {
      if (!query.trim()) return [];

      const searchResults = fuse.search(query, { limit: maxSuggestions * 2 });

      const suggestions = new Set<string>();

      searchResults.forEach((result) => {
        if (suggestions.size >= maxSuggestions) return;

        const item = result.item as any;

        // 从原文中提取建议
        if (item.original) {
          const original = item.original.toLowerCase();
          const queryLower = query.toLowerCase();

          // 如果原文包含查询词，添加为建议
          if (original.includes(queryLower)) {
            suggestions.add(item.original);
          }
        }
      });

      return Array.from(suggestions);
    },
    [fuse]
  );

  // 获取自动补全建议（基于部分匹配）
  const getAutoComplete = useCallback(
    (query: string): string[] => {
      if (!query.trim() || query.length < 2) return [];

      const queryLower = query.toLowerCase();
      const completions = new Set<string>();

      // 从数据中找到包含查询词的文本
      data.forEach((item: any) => {
        if (completions.size >= 8) return; // 限制结果数量

        if (item.original) {
          const original = item.original.trim();
          const originalLower = original.toLowerCase();

          // 1. 检查是否以查询开头（完整匹配优先级最高）
          if (
            originalLower.startsWith(queryLower) &&
            original.length > query.length
          ) {
            completions.add(original);
            return;
          }

          // 2. 检查是否包含查询词作为独立单词的开始
          const words = original
            .split(/[\s\n\r,.!?;:]+/)
            .filter((w: string) => w.length > 0);
          for (const word of words) {
            const wordLower = word.toLowerCase();
            if (
              wordLower.startsWith(queryLower) &&
              word.length > query.length
            ) {
              completions.add(original);
              break;
            }
          }

          // 3. 检查是否包含查询词（模糊匹配）
          if (
            originalLower.includes(queryLower) &&
            !completions.has(original)
          ) {
            completions.add(original);
          }
        }
      });

      return Array.from(completions).slice(0, 5);
    },
    [data]
  );

  // 清空搜索结果
  const clearResults = useCallback(() => {
    setResults([]);
    setIsSearching(false);
  }, []);

  return {
    search,
    getSuggestions,
    getAutoComplete,
    clearResults,
    results,
    isSearching,
  };
}

// 专门用于历史记录搜索的 hook
export function useHistorySearch(history: HistoryItem[]) {
  return useFuseSearch(history, {
    keys: ["original", "translated"],
    threshold: 0.4,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 1,
    maxResults: 20,
  });
}

// 专门用于输入建议的 hook
export function useInputSuggestions(history: HistoryItem[]) {
  return useFuseSearch(history, {
    keys: ["original"],
    threshold: 0.2, // 更严格的匹配，提供更准确的建议
    includeScore: true,
    minMatchCharLength: 2,
    maxResults: 10,
  });
}
