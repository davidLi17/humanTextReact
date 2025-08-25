import React, { useRef } from "react";
import { HistoryPanelProps } from "../types";
import { formatDateTime } from "../utils/helpers";

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  searchTerm,
  onSearchChange,
  onBack,
  onRestore,
  onDelete,
  onClear,
  onExport,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 过滤历史记录
  const filteredHistory =
    searchTerm.trim() === ""
      ? history
      : history.filter(
          (item) =>
            item.original.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.translated.toLowerCase().includes(searchTerm.toLowerCase())
        );

  // 处理文件导入
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = ""; // 清空文件选择
    }
  };

  // 渲染历史记录项
  const renderHistoryItem = (item: any, index: number) => {
    const title =
      item.original.length > 30
        ? item.original.substring(0, 30) + "..."
        : item.original;

    return (
      <div
        key={`${item.timestamp}-${index}`}
        className="history-item"
        onClick={() => onRestore(item)}
      >
        <div className="history-item-title">{title}</div>
        <div className="history-meta">
          <div className="history-item-time">
            {formatDateTime(item.timestamp)}
          </div>
          <div className="history-actions">
            <button
              className="history-action-btn history-restore"
              onClick={(e) => {
                e.stopPropagation();
                onRestore(item);
              }}
            >
              恢复
            </button>
            <button
              className="history-action-btn history-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.original);
              }}
            >
              删除
            </button>
          </div>
        </div>
        {item.hasReasoning && (
          <div className="history-tags">
            <span className="history-tag">含思维链</span>
          </div>
        )}
      </div>
    );
  };

  // 渲染空状态
  const renderEmptyState = () => {
    const message =
      searchTerm.trim() !== ""
        ? `没有符合"${searchTerm}"的搜索结果`
        : "暂无翻译历史";

    return (
      <div className="empty-state-container">
        <p className="empty-history">{message}</p>
        <div className="history-limit-hint">
          注意：系统最多保留100条最近的历史记录
        </div>
      </div>
    );
  };

  return (
    <div className="history-panel visible">
      <div className="history-panel-header">
        <div className="history-panel-title">
          <div className="back-button" onClick={onBack}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <h2>翻译历史</h2>
        </div>
        <div className="history-search-container">
          <input
            type="text"
            className="history-search"
            placeholder="搜索历史记录..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="history-panel-content">
        {filteredHistory.length > 0 ? (
          <>
            {filteredHistory.map(renderHistoryItem)}
            <div className="history-limit-hint">
              注意：系统最多保留100条最近的历史记录
            </div>
          </>
        ) : (
          renderEmptyState()
        )}
      </div>

      <div className="history-panel-footer">
        <button className="footer-btn" onClick={onClear}>
          <div className="footer-btn-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </div>
          <span>清空</span>
        </button>

        <button className="footer-btn" onClick={onExport}>
          <div className="footer-btn-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <span>导出</span>
        </button>

        <button className="footer-btn" onClick={handleImportClick}>
          <div className="footer-btn-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <span>导入</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default HistoryPanel;
