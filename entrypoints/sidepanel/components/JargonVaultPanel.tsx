import {
  deleteJargonItem,
  downloadJargonJsonFile,
  exportJargonAsMarkdown,
  getJargonList,
  importJargonItems,
  JARGON_CATEGORIES,
  JARGON_FILTER_CATEGORIES,
  JargonCategory,
  JargonFilterCategory,
  JargonItem,
  saveJargonItem,
  toggleStarJargon,
  updateJargonItem,
} from "@/entrypoints/shared/jargonStorage";
import { parseMarkdown } from "@/shared/utils/markdown";
import {
  Add,
  BookOne,
  CheckOne,
  Clear,
  Copy,
  Delete,
  Download,
  Edit,
  Search,
  Star,
  Tag,
  Tips,
  Upload,
} from "@icon-park/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./JargonVaultPanel.less";

interface JargonVaultPanelProps {
  onSwitchToChat?: () => void;
}

interface JargonFormData {
  id?: string;
  term: string;
  explanation: string;
  analogy: string;
  category: JargonCategory;
  tagsString: string;
  isStarred: boolean;
}

const INITIAL_FORM: JargonFormData = {
  term: "",
  explanation: "",
  analogy: "",
  category: "大厂黑话",
  tagsString: "",
  isStarred: false,
};

export default function JargonVaultPanel({ onSwitchToChat }: JargonVaultPanelProps) {
  const [items, setItems] = useState<JargonItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] =
    useState<JargonFilterCategory>("全部");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 弹窗与交互状态
  const [showModal, setShowModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<JargonFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // 加载数据
  const loadVaultData = async () => {
    setIsLoading(true);
    try {
      const list = await getJargonList();
      setItems(list);
    } catch (error) {
      console.error("加载生词本失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadVaultData();
  }, []);

  // 提示 Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // 点击外部关闭导出下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 各分类数量统计
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      全部: items.length,
      "⭐ 星标": items.filter((i) => i.isStarred).length,
    };
    JARGON_CATEGORIES.forEach((cat) => {
      counts[cat] = items.filter((i) => i.category === cat).length;
    });
    return counts;
  }, [items]);

  // 过滤后的词条列表
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      // 1. 分类过滤
      if (selectedCategory === "⭐ 星标") {
        if (!item.isStarred) return false;
      } else if (selectedCategory !== "全部") {
        if (item.category !== selectedCategory) return false;
      }

      // 2. 搜索词过滤
      if (!query) return true;

      const termMatch = item.term.toLowerCase().includes(query);
      const explanationMatch = item.explanation.toLowerCase().includes(query);
      const analogyMatch = Boolean(item.analogy?.toLowerCase().includes(query));
      const tagsMatch = item.tags.some((t) => t.toLowerCase().includes(query));

      return termMatch || explanationMatch || analogyMatch || tagsMatch;
    });
  }, [items, selectedCategory, searchQuery]);

  // 星标切换
  const handleToggleStar = async (item: JargonItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStarred = await toggleStarJargon(item.id);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isStarred: nextStarred } : i))
    );
    showToast(nextStarred ? `已星标 "${item.term}"` : `已取消星标 "${item.term}"`);
  };

  // 复制单个词条
  const handleCopyItem = async (item: JargonItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const parts = [`【${item.term}】`];
    if (item.category) parts.push(`[分类: ${item.category}]`);
    if (item.analogy) parts.push(`💡 生活比喻: ${item.analogy}`);
    parts.push(`📖 人话解释:\n${item.explanation}`);

    try {
      await navigator.clipboard.writeText(parts.join("\n"));
      setCopiedId(item.id);
      showToast(`已复制 "${item.term}" 词条内容`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  // 删除词条
  const handleDeleteItem = async (item: JargonItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定要从生词本中删除 "${item.term}" 吗？`)) {
      return;
    }
    const ok = await deleteJargonItem(item.id);
    if (ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`已删除 "${item.term}"`);
    }
  };

  // 打开添加弹窗
  const handleOpenAddModal = () => {
    setFormData(INITIAL_FORM);
    setFormError(null);
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleOpenEditModal = (item: JargonItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({
      id: item.id,
      term: item.term,
      explanation: item.explanation,
      analogy: item.analogy || "",
      category: item.category,
      tagsString: (item.tags || []).join(", "),
      isStarred: item.isStarred,
    });
    setFormError(null);
    setShowModal(true);
  };

  // 保存表单
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.term.trim()) {
      setFormError("请输入黑话术语名称");
      return;
    }
    if (!formData.explanation.trim()) {
      setFormError("请输入人话解释内容");
      return;
    }

    const tags = formData.tagsString
      .split(/[,，\s]+/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    try {
      if (formData.id) {
        const updated = await updateJargonItem(formData.id, {
          term: formData.term.trim(),
          explanation: formData.explanation.trim(),
          analogy: formData.analogy.trim() || undefined,
          category: formData.category,
          tags,
          isStarred: formData.isStarred,
        });
        if (updated) {
          setItems((prev) =>
            prev.map((i) => (i.id === formData.id ? updated : i))
          );
          showToast(`已更新 "${formData.term}"`);
        }
      } else {
        const saved = await saveJargonItem({
          term: formData.term.trim(),
          explanation: formData.explanation.trim(),
          analogy: formData.analogy.trim() || undefined,
          category: formData.category,
          tags,
          isStarred: formData.isStarred,
        });
        setItems((prev) => [saved, ...prev.filter((i) => i.id !== saved.id)]);
        showToast(`已添加 "${formData.term}" 到生词本`);
      }
      setShowModal(false);
    } catch (err: any) {
      setFormError(err?.message || "保存失败，请重试");
    }
  };

  // 导出 Markdown
  const handleExportMarkdown = async () => {
    const md = exportJargonAsMarkdown(items);
    try {
      await navigator.clipboard.writeText(md);
      showToast(`已复制 ${items.length} 条词库 Markdown 到剪贴板`);
    } catch (err) {
      console.error("复制 Markdown 失败:", err);
    }
    setShowExportMenu(false);
  };

  // 导出 JSON
  const handleExportJson = () => {
    downloadJargonJsonFile(items);
    showToast(`已开始下载 ${items.length} 条词库 JSON 文件`);
    setShowExportMenu(false);
  };

  // 触发导入文件选择
  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  // 处理文件导入
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importJargonItems(text);
      if (result.success) {
        await loadVaultData();
        showToast(`🎉 成功导入 ${result.count} 条黑话词条！`);
      } else {
        alert(result.error || "导入失败，请检查 JSON 格式");
      }
    } catch (err: any) {
      alert("读取导入文件失败: " + (err?.message || ""));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 获取分类色彩类名
  const getCategoryClass = (category: JargonCategory) => {
    switch (category) {
      case "AI技术":
        return "badge-ai";
      case "大厂黑话":
        return "badge-biz";
      case "职场":
        return "badge-workplace";
      default:
        return "badge-other";
    }
  };

  // 格式化时间戳
  const formatDate = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}-${day}`;
  };

  return (
    <div className="jargon-vault-panel">
      {/* 隐藏的导入文件 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* 顶部操作工具栏 */}
      <div className="vault-toolbar">
        <div className="vault-meta-info">
          <div className="vault-icon-title">
            <BookOne theme="filled" size="18" className="vault-primary-icon" />
            <span className="vault-title">黑话生词本</span>
          </div>
          <span className="vault-count-badge">共 {items.length} 词</span>
        </div>

        <div className="vault-actions-group">
          <button
            type="button"
            className="vault-btn primary-btn"
            title="手动录入新黑话"
            onClick={handleOpenAddModal}
          >
            <Add theme="outline" size="15" />
            <span>添加黑话</span>
          </button>

          {/* 导出菜单 */}
          <div className="export-menu-wrapper" ref={exportMenuRef}>
            <button
              type="button"
              className="vault-btn secondary-btn"
              title="导出词库"
              onClick={() => setShowExportMenu((prev) => !prev)}
            >
              <Download theme="outline" size="14" />
              <span>导出</span>
            </button>

            {showExportMenu && (
              <div className="export-dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleExportMarkdown}
                >
                  <Copy theme="outline" size="13" />
                  <span>复制 Markdown 格式</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleExportJson}
                >
                  <Download theme="outline" size="13" />
                  <span>下载 JSON 词库文件</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="vault-btn secondary-btn"
            title="导入 JSON 词库"
            onClick={handleTriggerImport}
          >
            <Upload theme="outline" size="14" />
            <span>导入</span>
          </button>
        </div>
      </div>

      {/* 搜索与过滤区 */}
      <div className="vault-filter-section">
        <div className="vault-search-box">
          <Search theme="outline" size="15" className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="搜索黑话术语、人话解释、标签或比喻..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              title="清空搜索"
              onClick={() => setSearchQuery("")}
            >
              <Clear theme="outline" size="13" />
            </button>
          )}
        </div>

        {/* 分类筛选 Pills */}
        <div className="category-pills-row">
          {JARGON_FILTER_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] ?? 0;
            const isActive = selectedCategory === cat;
            return (
              <button
                type="button"
                key={cat}
                className={`category-pill ${isActive ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <span>{cat}</span>
                <span className="pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast 提示条 */}
      {toastMessage && (
        <div className="vault-toast-banner">
          <Tips theme="outline" size="14" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 词条卡片列表区 */}
      <div className="vault-card-list">
        {filteredItems.length === 0 ? (
          <div className="vault-empty-container">
            {items.length === 0 ? (
              <>
                <div className="empty-book-icon">
                  <BookOne theme="two-tone" size="48" fill={["#6366f1", "#e0e7ff"]} />
                </div>
                <h3 className="empty-title">生词本空空如也</h3>
                <p className="empty-desc">
                  在侧边栏对话回复、网页划词浮窗或 Popup 窗口中点击
                  <strong>【⭐ 存入生词本】</strong>
                  ，即可一键沉淀行业黑话与通俗人话解释。
                </p>
                <div className="empty-actions">
                  <button
                    type="button"
                    className="empty-cta-btn primary"
                    onClick={handleOpenAddModal}
                  >
                    <Add theme="outline" size="16" />
                    <span>手动录入第一条黑话</span>
                  </button>
                  {onSwitchToChat && (
                    <button
                      type="button"
                      className="empty-cta-btn secondary"
                      onClick={onSwitchToChat}
                    >
                      <span>前往对话翻译</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="empty-book-icon">
                  <Search theme="outline" size="36" />
                </div>
                <h3 className="empty-title">未找到匹配词条</h3>
                <p className="empty-desc">
                  没有找到与 "{searchQuery || selectedCategory}" 相关的黑话词条。
                </p>
                <button
                  type="button"
                  className="empty-cta-btn secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("全部");
                  }}
                >
                  <span>清除筛选条件</span>
                </button>
              </>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`jargon-card ${item.isStarred ? "starred-card" : ""}`}
            >
              {/* 卡片头部 */}
              <div className="card-header">
                <div className="card-term-row">
                  <span className="card-term-title">{item.term}</span>
                  <span
                    className={`card-category-badge ${getCategoryClass(
                      item.category
                    )}`}
                  >
                    {item.category}
                  </span>
                </div>

                <div className="card-header-actions">
                  <button
                    type="button"
                    className={`star-toggle-btn ${item.isStarred ? "active" : ""}`}
                    title={item.isStarred ? "取消星标" : "加入星标"}
                    onClick={(e) => handleToggleStar(item, e)}
                  >
                    <Star
                      theme={item.isStarred ? "filled" : "outline"}
                      size="16"
                      fill={item.isStarred ? "#f59e0b" : "currentColor"}
                    />
                  </button>
                </div>
              </div>

              {/* 标签行 */}
              {item.tags && item.tags.length > 0 && (
                <div className="card-tags-row">
                  {item.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="card-tag-pill">
                      <Tag theme="outline" size="10" />
                      <span>{tag}</span>
                    </span>
                  ))}
                  {Boolean(item.createdAt) && (
                    <span className="card-date-text">
                      {formatDate(item.createdAt)}
                    </span>
                  )}
                </div>
              )}

              {/* 生活比喻引用块 */}
              {item.analogy && (
                <div className="card-analogy-box">
                  <div className="analogy-header">
                    <span className="analogy-label">💡 生活比喻</span>
                  </div>
                  <div className="analogy-content">{item.analogy}</div>
                </div>
              )}

              {/* 人话详细解释 */}
              <div className="card-explanation-box">
                <div
                  className="card-explanation-markdown markdown-content"
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdown(item.explanation),
                  }}
                />
              </div>

              {/* 卡片底部操作栏 */}
              <div className="card-footer-toolbar">
                <button
                  type="button"
                  className="card-tool-btn"
                  title="复制词条"
                  onClick={(e) => handleCopyItem(item, e)}
                >
                  {copiedId === item.id ? (
                    <>
                      <CheckOne theme="filled" size="13" fill="#10b981" />
                      <span style={{ color: "#10b981" }}>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy theme="outline" size="13" />
                      <span>复制</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="card-tool-btn"
                  title="编辑词条"
                  onClick={(e) => handleOpenEditModal(item, e)}
                >
                  <Edit theme="outline" size="13" />
                  <span>编辑</span>
                </button>

                <button
                  type="button"
                  className="card-tool-btn delete-tool-btn"
                  title="删除词条"
                  onClick={(e) => handleDeleteItem(item, e)}
                >
                  <Delete theme="outline" size="13" />
                  <span>删除</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 手动添加 / 编辑黑话弹窗 */}
      {showModal && (
        <div className="vault-modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="vault-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <span className="modal-title">
                {formData.id ? "✏️ 编辑黑话词条" : "➕ 添加黑话词条"}
              </span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="modal-form">
              {formError && (
                <div className="form-error-banner">
                  <Tips theme="outline" size="14" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-row">
                <label className="form-label">
                  核心黑话术语 <span className="required-mark">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：抓手 / OKR / RAG / 赋能"
                  value={formData.term}
                  autoFocus
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, term: e.target.value }))
                  }
                />
              </div>

              <div className="form-row">
                <label className="form-label">分类所属</label>
                <div className="category-select-pills">
                  {JARGON_CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      className={`form-cat-pill ${
                        formData.category === cat ? "active" : ""
                      }`}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, category: cat }))
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">生活生动比喻（选填）</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="用生动的生活常识打个比方，例如：就像合唱团演出前定基准音调..."
                  value={formData.analogy}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, analogy: e.target.value }))
                  }
                />
              </div>

              <div className="form-row">
                <label className="form-label">
                  人话详细解释 <span className="required-mark">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="通俗易懂的白话人话解释，支持 Markdown 格式..."
                  value={formData.explanation}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      explanation: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-row">
                <label className="form-label">标签（选填，逗号或空格分隔）</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：大厂, 沟通, 重点"
                  value={formData.tagsString}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tagsString: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-row checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isStarred}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isStarred: e.target.checked,
                      }))
                    }
                  />
                  <span>⭐ 设为星标收藏词条</span>
                </label>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  取消
                </button>
                <button type="submit" className="modal-submit-btn">
                  {formData.id ? "保存修改" : "确认添加"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
