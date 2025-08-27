import React, { useState, useRef, useEffect, useCallback } from "react";
import { useInputSuggestions } from "../hooks/useFuseSearch";
import { HistoryItem } from "../types";
import "./SmartInput.less";

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  history: HistoryItem[];
  disabled?: boolean;
}

const SmartInput: React.FC<SmartInputProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
  rows = 5,
  history,
  disabled = false,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { getAutoComplete, getSuggestions } = useInputSuggestions(history);

  // 获取当前光标位置的单词
  const getCurrentWord = useCallback(() => {
    if (!textareaRef.current) return { word: "", start: 0, end: 0 };

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;

    // 找到当前单词的边界（这里改为更智能的边界检测）
    let start = cursorPos;
    let end = cursorPos;

    // 向前找到单词开始（遇到换行符、空格或标点符号停止）
    while (start > 0 && !/[\s\n\r,.!?;:]/.test(text[start - 1])) {
      start--;
    }

    // 向后找到单词结束（遇到换行符、空格或标点符号停止）
    while (end < text.length && !/[\s\n\r,.!?;:]/.test(text[end])) {
      end++;
    }

    return {
      word: text.slice(start, end),
      start,
      end,
    };
  }, []);

  // 更新建议列表
  const updateSuggestions = useCallback(() => {
    const { word } = getCurrentWord();

    if (word.length >= 2) {
      const autoComplete = getAutoComplete(word);
      const searchSuggestions = getSuggestions(word, 3);

      // 合并并去重建议
      const allSuggestions = Array.from(
        new Set([...autoComplete, ...searchSuggestions])
      );
      setSuggestions(allSuggestions.slice(0, 8));
      setShowSuggestions(allSuggestions.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [getAutoComplete, getSuggestions, getCurrentWord]);

  // 应用建议
  const applySuggestion = useCallback(
    (suggestion: string) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const { start, end } = getCurrentWord();
      const text = textarea.value;

      // 替换当前单词或插入建议
      const newText = text.slice(0, start) + suggestion + text.slice(end);
      onChange(newText);

      // 设置光标位置
      setTimeout(() => {
        const newCursorPos = start + suggestion.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);

      setShowSuggestions(false);
    },
    [onChange, getCurrentWord]
  );

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          return; // 阻止原始事件处理
        case "ArrowUp":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          return; // 阻止原始事件处理
        case "Tab":
          if (selectedSuggestionIndex >= 0) {
            e.preventDefault();
            applySuggestion(suggestions[selectedSuggestionIndex]);
            return; // 阻止原始事件处理
          }
          break;
        case "Enter":
          if (selectedSuggestionIndex >= 0) {
            e.preventDefault();
            applySuggestion(suggestions[selectedSuggestionIndex]);
            return; // 阻止原始事件处理
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          return; // 阻止原始事件处理
      }
    }

    // 如果是 Ctrl/Cmd+Enter，先关闭建议框再调用原始处理器
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      setShowSuggestions(false);
    }

    // 调用原始的 onKeyDown 处理器
    onKeyDown?.(e);
  };

  // 监听输入变化，更新建议
  useEffect(() => {
    if (value) {
      updateSuggestions();
    } else {
      setShowSuggestions(false);
    }
  }, [value, updateSuggestions]);

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !textareaRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="smart-input-container">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="smart-input"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="suggestions-dropdown">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`suggestion-item ${
                index === selectedSuggestionIndex ? "selected" : ""
              }`}
              onClick={() => applySuggestion(suggestion)}
              onMouseEnter={() => setSelectedSuggestionIndex(index)}
            >
              <span className="suggestion-text">{suggestion}</span>
              <span className="suggestion-hint">Tab 补全</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartInput;
