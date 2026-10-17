import { useEffect, useRef, useState } from "react";
import {
  elementSnapshotText,
  type ElementSnapshot,
} from "../../shared/elementSnapshot";
import { getActiveTab } from "../../shared/sidepanelUtils";
import "./ElementMarks.less";

export function ElementMarks({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (items: ElementSnapshot[]) => boolean;
}) {
  const [items, setItems] = useState<ElementSnapshot[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState("");
  const tab = useRef<number | undefined>(undefined);
  const signature = useRef("");
  const sending = useRef(false);
  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const current = await getActiveTab();
    if (typeof current?.id !== "number") throw new Error("请先打开普通网页");
    if (
      tab.current !== undefined &&
      tab.current !== current.id &&
      !["elementState", "elementStart"].includes(action)
    ) {
      throw new Error("页面已切换，请检查当前网页的标记后重试");
    }
    if (tab.current !== current.id) {
      tab.current = current.id;
      signature.current = "";
      setItems([]);
      setDrafts({});
    }
    const result = await browser.tabs.sendMessage(current.id, {
      action,
      ...extra,
      ...(action === "elementState" ? { revision: signature.current } : {}),
    });
    if (tab.current !== current.id)
      throw new Error("页面已切换，已忽略旧页面响应");
    if (!result?.success) throw new Error(result?.error || "请刷新网页后重试");
    if (result.items) {
      const next = result.revision;
      if (signature.current !== next) {
        signature.current = next;
        setItems(result.items);
      }
    }
    setActive(result.active);
    return result;
  };
  useEffect(() => {
    let disposed = false;
    const poll = () => {
      if (!disposed) void call("elementState").catch(() => {});
    };
    poll();
    const timer = setInterval(poll, 1500);
    const listener = (req: any, sender: any) => {
      if (req.action === "elementFocus" && sender.tab?.id === tab.current)
        setFocused(req.id);
      return false;
    };
    browser.runtime.onMessage.addListener(listener);
    return () => {
      disposed = true;
      clearInterval(timer);
      browser.runtime.onMessage.removeListener(listener);
    };
  }, []);
  const run = (action: string, extra: Record<string, unknown> = {}) =>
    void call(action, extra)
      .then(() => setError(""))
      .catch((e) => setError(e.message));
  const pendingItems = items.filter(
    (item) =>
      !item.sent || (drafts[item.id] ?? item.question).trim() !== item.question,
  );
  return (
    <section className="element-marks" aria-label="网页标记">
      <header className="marks-header"><span className="marks-heading">网页标记 <span className="marks-count">{items.length}/6</span></span><span className="marks-help" tabIndex={0} aria-label="截图与模型说明">?<span role="tooltip">截图随问题发送，请使用支持图片的模型。首次截图前，点击当前页的扩展图标或右键「打开人话侧边栏」授予临时访问。</span></span></header>
      <button
        className="marks-select"
        type="button"
        onClick={() => run(active ? "elementStop" : "elementStart")}
      >
        {active ? "退出元素选择" : "选择网页元素"}
      </button>
      {error && <p role="alert">{error}</p>}
      {items.map((item) => (
        <article
          key={item.id}
          className={focused === item.id ? "focused" : ""}
          onMouseEnter={() => run("elementHover", { id: item.id })}
          onMouseLeave={() => run("elementHover", { id: "" })}
        >
          <div className="mark-heading"><span className="mark-number">{item.number}</span><strong title={item.title}>{item.title}</strong><span className="mark-status">{item.sent ? "已发送" : "待发送"}</span></div>
          {item.invalid && (
            <p role="alert">目标已失效，请删除后重新选择。快照仍是原内容。</p>
          )}
          <label className="mark-label" htmlFor={`mark-question-${item.id}`}>给 AI 的问题</label>
          <textarea
            id={`mark-question-${item.id}`}
            aria-label={`标记${item.number}的问题`}
            maxLength={2000}
            value={drafts[item.id] ?? item.question}
            onChange={(e) =>
              setDrafts((previous) => ({
                ...previous,
                [item.id]: e.target.value,
              }))
            }
            onBlur={(e) =>
              run("elementEdit", { id: item.id, question: e.target.value })
            }
          />
          <details>
            <summary>
              查看实际发送快照{item.truncated ? " · 文本已截断" : ""}
            </summary>
            <img src={item.image} alt={`标记${item.number}的实际发送截图`} />
            <pre>
              {elementSnapshotText([
                { ...item, question: drafts[item.id] ?? item.question },
              ])}
            </pre>
          </details>
          <button
            className="mark-delete"
            type="button"
            onClick={() => run("elementDelete", { id: item.id })}
          >
            删除标记
          </button>
        </article>
      ))}
      {!!pendingItems.length && (
        <button
          className="marks-send"
          type="button"
          disabled={
            disabled ||
            pendingItems.some(
              (x) => x.invalid || !(drafts[x.id] ?? x.question).trim(),
            )
          }
          onClick={async () => {
            if (sending.current) return;
            sending.current = true;
            try {
              for (const [id, question] of Object.entries(drafts))
                await call("elementEdit", { id, question });
              const state = await call("elementValidate");
              const pending = state.items.filter(
                (item: ElementSnapshot) => !item.sent,
              );
              if (
                pending.length !== pendingItems.length ||
                pending.some(
                  (entry: ElementSnapshot) =>
                    !pendingItems.some(
                      (preview) =>
                        preview.id === entry.id &&
                        (drafts[entry.id] ?? preview.question).trim() ===
                          entry.question,
                    ),
                )
              ) {
                throw new Error("标记清单已变化，请检查最新预览后重新发送");
              }
              if (
                pending.some(
                  (x: ElementSnapshot) => x.invalid || !x.question.trim(),
                )
              )
                throw new Error("请重新选择失效目标并填写问题");
              if (onSend(pending)) {
                await call("elementSent", {
                  ids: pending.map((item: ElementSnapshot) => item.id),
                });
                // Keep confirmed page markers after sending; user can edit/delete them explicitly.
                await call("elementStop");
                setError("已发送；标记保留，可修改问题后再次发送。");
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            } finally {
              sending.current = false;
            }
          }}
        >
          发送给AI（{pendingItems.length}个标记）
        </button>
      )}
    </section>
  );
}
