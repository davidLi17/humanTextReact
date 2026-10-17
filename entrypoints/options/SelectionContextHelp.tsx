import { useState } from "react";

export default function SelectionContextHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="selection-context-help" onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <button type="button" className="selection-context-help-trigger"
        aria-label="查看段落解释发送的信息和示例"
        aria-describedby={open ? "selection-context-tooltip" : undefined}>了解发送内容与示例</button>
      {open && <div id="selection-context-tooltip" role="tooltip" className="selection-context-tooltip">
        <strong>1. 会带什么信息</strong>
        <p>开启后，发送选中文字和它所在段落的可见正文。列表、引用、代码块或表格中，取对应列表项、引用块、代码块或单元格。正文最多 2000 个字符，较长时围绕选中文字截取。</p>
        <p>页面标题和 URL 仅用于本地来源预览，不随这份划词上下文发送。跨段选中或无法安全提取时，只发送选中文字。关闭后，新划词请求不再附加段落；已有会话内容仍会保留。</p>
        <strong>2. 具体例子</strong>
        <p>原文：“这个方案要先跑通最小闭环，验证用户愿不愿意付费。”选中“最小闭环”。</p>
        <p>开启：发送“最小闭环”和上面这段原文，帮助 AI 解释从用户体验到付费验证的最简流程。关闭：只发送“最小闭环”，按通用词义解释。</p>
        <p>以上为说明性示例，实际回答由模型生成。</p>
      </div>}
    </div>
  );
}
