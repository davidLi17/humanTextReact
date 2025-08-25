import{r as w,j as t,b as d,a as I,R as B}from"./browser-BCb2jFuL.js";function S(n){if(!n)return"";let e=n;e=e.replace(/\r\n/g,`
`).replace(/\r/g,`
`),e=e.replace(/</g,"&lt;").replace(/>/g,"&gt;");const a=[];e=e.replace(/```(\w+)?\n([\s\S]*?)```/g,(i,c,p)=>{const g=a.length,h=c||"text";return a.push(`<pre class="code-block"><code class="language-${h}">${p.trim()}</code></pre>`),`__CODE_BLOCK_${g}__`});const o=[];return e=e.replace(/`([^`\n]+)`/g,(i,c)=>{const p=o.length;return o.push(`<code class="inline-code">${c}</code>`),`__INLINE_CODE_${p}__`}),e=D(e),e=e.replace(/^#{6}\s+(.*$)/gm,"<h6>$1</h6>"),e=e.replace(/^#{5}\s+(.*$)/gm,"<h5>$1</h5>"),e=e.replace(/^#{4}\s+(.*$)/gm,"<h4>$1</h4>"),e=e.replace(/^#{3}\s+(.*$)/gm,"<h3>$1</h3>"),e=e.replace(/^#{2}\s+(.*$)/gm,"<h2>$1</h2>"),e=e.replace(/^#{1}\s+(.*$)/gm,"<h1>$1</h1>"),e=e.replace(/^(-{3,}|\*{3,}|_{3,})$/gm,'<hr class="markdown-divider">'),e=O(e),e=A(e),e=z(e),e=F(e),e=K(e),a.forEach((i,c)=>{e=e.replace(`__CODE_BLOCK_${c}__`,i)}),o.forEach((i,c)=>{e=e.replace(`__INLINE_CODE_${c}__`,i)}),e=e.replace(/\n{3,}/g,`

`),e=e.replace(/^\s+|\s+$/g,""),e}function D(n){const e=/^(\|.*\|)\n(\|[-\s|:]*\|)\n((?:\|.*\|\n?)*)/gm;return n.replace(e,(a,o,i,c)=>{const p=o.split("|").slice(1,-1).map(h=>`<th>${h.trim()}</th>`).join(""),g=c.trim().split(`
`).map(h=>`<tr>${h.split("|").slice(1,-1).map(f=>`<td>${f.trim()}</td>`).join("")}</tr>`).join("");return`<table class="markdown-table"><thead><tr>${p}</tr></thead><tbody>${g}</tbody></table>`})}function O(n){const e=n.split(`
`),a=[];let o=!1,i=[];for(const c of e)c.match(/^>\s/)?(o||(o=!0,i=[]),i.push(c.replace(/^>\s?/,""))):(o&&(a.push(`<blockquote class="markdown-quote">${i.join("<br>")}</blockquote>`),o=!1,i=[]),a.push(c));return o&&i.length>0&&a.push(`<blockquote class="markdown-quote">${i.join("<br>")}</blockquote>`),a.join(`
`)}function A(n){const e=n.split(`
`),a=[];let o=null;for(const i of e){const c=i.match(/^(\s*)[-*+]\s+(.+)$/),p=i.match(/^(\s*)\d+\.\s+(.+)$/);if(c){const[,g,h]=c,k=Math.floor(g.length/2);(!o||o.type!=="ul")&&(o&&a.push(R(o)),o={type:"ul",items:[]}),o.items.push(`<li class="list-item level-${k}">${h}</li>`)}else if(p){const[,g,h]=p,k=Math.floor(g.length/2);(!o||o.type!=="ol")&&(o&&a.push(R(o)),o={type:"ol",items:[]}),o.items.push(`<li class="list-item level-${k}">${h}</li>`)}else o&&(a.push(R(o)),o=null),a.push(i)}return o&&a.push(R(o)),a.join(`
`)}function R(n){return`<${n.type} class="markdown-list">${n.items.join("")}</${n.type}>`}function z(n){return n=n.replace(/~~(.*?)~~/g,'<del class="strikethrough">$1</del>'),n=n.replace(/\*\*(.*?)\*\*/g,'<strong class="bold">$1</strong>'),n=n.replace(new RegExp("(?<!\\*)\\*(?!\\*)([^*]+)\\*(?!\\*)","g"),'<em class="italic">$1</em>'),n=n.replace(/==(.*?)==/g,'<mark class="highlight">$1</mark>'),n}function F(n){return n=n.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" class="markdown-image" loading="lazy">'),n=n.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>'),n=n.replace(/<(https?:\/\/[^>]+)>/g,'<a href="$1" class="markdown-link auto-link" target="_blank" rel="noopener noreferrer">$1</a>'),n}function K(n){return n.split(/\n\s*\n/).map(a=>{if(a=a.trim(),!a)return"";if(a.match(/^<(h[1-6]|div|blockquote|ul|ol|table|pre|hr)/))return a;const o=a.split(`
`).filter(i=>i.trim());return o.length===1?`<p class="markdown-paragraph">${o[0]}</p>`:`<p class="markdown-paragraph">${o.join("<br>")}</p>`}).join(`

`)}const P=`
  /* Markdown 基础样式 */
  .markdown-content {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
  }

  .markdown-paragraph {
    margin: 0.8em 0;
    color: #1a1a1a;
  }

  .markdown-paragraph:first-child {
    margin-top: 0;
  }

  .markdown-paragraph:last-child {
    margin-bottom: 0;
  }

  /* 标题样式 */
  .markdown-content h1,
  .markdown-content h2,
  .markdown-content h3,
  .markdown-content h4,
  .markdown-content h5,
  .markdown-content h6 {
    margin: 1.2em 0 0.6em 0;
    font-weight: 600;
    line-height: 1.3;
    color: #1a1a1a;
  }

  .markdown-content h1 {
    font-size: 1.5em;
  }
  .markdown-content h2 {
    font-size: 1.3em;
  }
  .markdown-content h3 {
    font-size: 1.2em;
  }
  .markdown-content h4 {
    font-size: 1.1em;
  }
  .markdown-content h5 {
    font-size: 1em;
  }
  .markdown-content h6 {
    font-size: 0.95em;
  }

  /* 代码块样式 */
  .code-block {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin: 1em 0;
    overflow: hidden;
  }

  .code-block code {
    display: block;
    padding: 16px;
    overflow-x: auto;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
      "Courier New", monospace;
    font-size: 13px;
    line-height: 1.5;
    color: #2d3748;
    background: transparent;
  }

  .inline-code {
    background: rgba(107, 114, 126, 0.1);
    color: #d63384;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
      "Courier New", monospace;
    font-weight: 500;
  }

  /* 列表样式 */
  .markdown-list {
    margin: 1em 0;
    padding-left: 0;
  }

  .list-item {
    margin: 0.4em 0;
    padding-left: 1.5em;
    position: relative;
  }

  ul.markdown-list .list-item::before {
    content: "•";
    position: absolute;
    left: 0.5em;
    color: #64748b;
    font-weight: bold;
  }

  ol.markdown-list {
    counter-reset: list-counter;
  }

  ol.markdown-list .list-item {
    counter-increment: list-counter;
  }

  ol.markdown-list .list-item::before {
    content: counter(list-counter) ".";
    position: absolute;
    left: 0;
    color: #64748b;
    font-weight: 600;
    min-width: 1.2em;
  }

  .list-item.level-1 {
    padding-left: 2.5em;
  }
  .list-item.level-2 {
    padding-left: 3.5em;
  }
  .list-item.level-3 {
    padding-left: 4.5em;
  }

  /* 引用样式 */
  .markdown-quote {
    margin: 1em 0;
    padding: 12px 16px;
    background: linear-gradient(135deg, #fef7cd 0%, #fef3c7 100%);
    border-left: 4px solid #f59e0b;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #92400e;
  }

  /* 表格样式 */
  .markdown-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

  .markdown-table th {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #1a1a1a;
    border-bottom: 2px solid #e2e8f0;
  }

  .markdown-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;
  }

  .markdown-table tr:last-child td {
    border-bottom: none;
  }

  .markdown-table tr:nth-child(even) {
    background: rgba(248, 250, 252, 0.5);
  }

  /* 链接样式 */
  .markdown-link {
    color: #3b82f6;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .markdown-link:hover {
    color: #1d4ed8;
    border-bottom-color: #3b82f6;
  }

  /* 图片样式 */
  .markdown-image {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  /* 文本样式 */
  .bold {
    font-weight: 600;
    color: #1a1a1a;
  }

  .italic {
    font-style: italic;
  }

  .strikethrough {
    text-decoration: line-through;
    color: #6b7280;
  }

  .highlight {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    padding: 2px 4px;
    border-radius: 4px;
    color: #92400e;
  }

  /* 分割线样式 */
  .markdown-divider {
    border: none;
    border-top: 2px solid #e2e8f0;
    margin: 2em 0;
    opacity: 0.8;
    background: linear-gradient(
      90deg,
      transparent 0%,
      #e2e8f0 50%,
      transparent 100%
    );
    height: 1px;
  }

  /* 暗黑模式支持 */
  @media (prefers-color-scheme: dark) {
    .markdown-content {
      color: #e5e5e5;
    }

    .markdown-paragraph,
    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3,
    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
      color: #e5e5e5;
    }

    .code-block {
      background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
      border-color: #444;
    }

    .code-block code {
      color: #e5e5e5;
    }

    .inline-code {
      background: rgba(255, 255, 255, 0.1);
      color: #ff6b9d;
    }

    .markdown-quote {
      background: linear-gradient(135deg, #2d1b0a 0%, #3d2a0f 100%);
      color: #d97706;
    }

    .markdown-table th {
      background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
      color: #e5e5e5;
      border-bottom-color: #444;
    }

    .markdown-table {
      border-color: #444;
    }

    .markdown-table td {
      border-bottom-color: #333;
    }

    .markdown-table tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.05);
    }

    .bold {
      color: #e5e5e5;
    }
  }
`;function q(n="markdown-styles"){if(!document.querySelector(`#${n}`)){const e=document.createElement("style");e.id=n,e.textContent=P,document.head.appendChild(e)}}const U=({translationState:n,setTranslationState:e,onTranslate:a,onCopy:o,onShowHistory:i,onOpenSettings:c,onScroll:p,resultAreaRef:g})=>{const[h,k]=w.useState("复制"),[f,N]=w.useState("复制输入");w.useEffect(()=>{q("popup-markdown-styles")},[]);const C=u=>{const y=u.target.value;e($=>({...$,sourceText:y}))},T=u=>{u.key==="Enter"&&(u.ctrlKey||u.metaKey)&&(u.preventDefault(),a())},v=async()=>{await o(n.translatedText)?(k("已复制"),setTimeout(()=>k("复制"),1500)):alert("复制失败，请重试")},l=async()=>{if(!n.sourceText.trim()){alert("请输入要复制的文本");return}await o(n.sourceText)?(N("已复制"),setTimeout(()=>N("复制输入"),1500)):alert("复制失败，请重试")};return t.jsxs("div",{className:"translation-area",children:[t.jsxs("div",{className:"header-section",children:[t.jsx("h1",{children:"人话翻译器"}),t.jsxs("div",{className:"header-buttons",children:[t.jsx("button",{className:"text-btn",onClick:i,children:"历史记录"}),t.jsx("button",{className:"text-btn",onClick:c,children:"设置"})]})]}),t.jsxs("div",{className:"translation-content",children:[t.jsxs("div",{className:"input-section",children:[t.jsxs("div",{className:"input-area",children:[t.jsx("textarea",{value:n.sourceText,onChange:C,onKeyDown:T,placeholder:"请输入要翻译的文本... Ctrl+Enter (Windows) / Cmd+Enter (Mac) 发送，Enter换行",rows:5}),t.jsx("button",{className:"icon-btn input-copy-btn",onClick:l,title:"复制输入文本",children:f})]}),t.jsx("button",{className:"primary-btn",onClick:a,disabled:n.isTranslating,children:n.isTranslating?"翻译中...":"翻译"})]}),n.showResult&&t.jsx("div",{className:"result-section-wrapper",children:t.jsxs("div",{className:"result-area",ref:g,children:[t.jsxs("div",{className:"result-header",children:[t.jsx("span",{children:"翻译结果"}),t.jsx("button",{className:"icon-btn",onClick:v,children:h})]}),t.jsxs("div",{className:"result-wrapper",children:[n.hasReasoning&&n.reasoningText&&t.jsxs("div",{className:"result-section result-section-reasoning",children:[t.jsx("div",{className:"result-label",children:"思维链"}),t.jsx("div",{className:"result-content markdown-content",dangerouslySetInnerHTML:{__html:S(n.reasoningText)}})]}),t.jsxs("div",{className:"result-section",children:[t.jsx("div",{className:"result-label",children:"译文"}),t.jsx("div",{className:"result-content markdown-content",dangerouslySetInnerHTML:{__html:S(n.translatedText)}})]})]})]})})]})]})};function W(n){const e=new Date(n);return`${e.getFullYear()}-${(e.getMonth()+1).toString().padStart(2,"0")}-${e.getDate().toString().padStart(2,"0")} ${e.getHours().toString().padStart(2,"0")}:${e.getMinutes().toString().padStart(2,"0")}`}const J=({history:n,searchTerm:e,onSearchChange:a,onBack:o,onRestore:i,onDelete:c,onClear:p,onExport:g,onImport:h})=>{const k=w.useRef(null),f=e.trim()===""?n:n.filter(l=>l.original.toLowerCase().includes(e.toLowerCase())||l.translated.toLowerCase().includes(e.toLowerCase())),N=()=>{var l;(l=k.current)==null||l.click()},C=l=>{var y;const u=(y=l.target.files)==null?void 0:y[0];u&&(h(u),l.target.value="")},T=(l,u)=>{const y=l.original.length>30?l.original.substring(0,30)+"...":l.original;return t.jsxs("div",{className:"history-item",onClick:()=>i(l),children:[t.jsx("div",{className:"history-item-title",children:y}),t.jsxs("div",{className:"history-meta",children:[t.jsx("div",{className:"history-item-time",children:W(l.timestamp)}),t.jsxs("div",{className:"history-actions",children:[t.jsx("button",{className:"history-action-btn history-restore",onClick:$=>{$.stopPropagation(),i(l)},children:"恢复"}),t.jsx("button",{className:"history-action-btn history-delete",onClick:$=>{$.stopPropagation(),c(l.original)},children:"删除"})]})]}),l.hasReasoning&&t.jsx("div",{className:"history-tags",children:t.jsx("span",{className:"history-tag",children:"含思维链"})})]},`${l.timestamp}-${u}`)},v=()=>{const l=e.trim()!==""?`没有符合"${e}"的搜索结果`:"暂无翻译历史";return t.jsxs("div",{className:"empty-state-container",children:[t.jsx("p",{className:"empty-history",children:l}),t.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]})};return t.jsxs("div",{className:"history-panel visible",children:[t.jsxs("div",{className:"history-panel-header",children:[t.jsxs("div",{className:"history-panel-title",children:[t.jsx("div",{className:"back-button",onClick:o,children:t.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:t.jsx("path",{d:"M19 12H5M12 19l-7-7 7-7"})})}),t.jsx("h2",{children:"翻译历史"})]}),t.jsx("div",{className:"history-search-container",children:t.jsx("input",{type:"text",className:"history-search",placeholder:"搜索历史记录...",value:e,onChange:l=>a(l.target.value)})})]}),t.jsx("div",{className:"history-panel-content",children:f.length>0?t.jsxs(t.Fragment,{children:[f.map(T),t.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]}):v()}),t.jsxs("div",{className:"history-panel-footer",children:[t.jsxs("button",{className:"footer-btn",onClick:p,children:[t.jsx("div",{className:"footer-btn-icon",children:t.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("polyline",{points:"3 6 5 6 21 6"}),t.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})}),t.jsx("span",{children:"清空"})]}),t.jsxs("button",{className:"footer-btn",onClick:g,children:[t.jsx("div",{className:"footer-btn-icon",children:t.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),t.jsx("polyline",{points:"17 8 12 3 7 8"}),t.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]})}),t.jsx("span",{children:"导出"})]}),t.jsxs("button",{className:"footer-btn",onClick:N,children:[t.jsx("div",{className:"footer-btn-icon",children:t.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[t.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),t.jsx("polyline",{points:"7 10 12 15 17 10"}),t.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]})}),t.jsx("span",{children:"导入"})]})]}),t.jsx("input",{ref:k,type:"file",accept:".json",style:{display:"none"},onChange:C})]})};function V(){const[n,e]=w.useState({sourceText:"",translatedText:"",reasoningText:"",isTranslating:!1,hasReasoning:!1,showResult:!1}),[a,o]=w.useState(!1),[i,c]=w.useState([]),[p,g]=w.useState(""),h=w.useRef(!1),k=w.useRef(null),f=w.useRef(null);w.useEffect(()=>{const s=(r,m,x)=>(r.action==="updateTranslation"&&(r.error?e(b=>({...b,isTranslating:!1,translatedText:`错误: ${r.error}`})):(e(b=>({...b,translatedText:r.content||b.translatedText,reasoningText:r.reasoningContent||b.reasoningText,hasReasoning:r.hasReasoning||!1,showResult:!0,isTranslating:!r.done})),!h.current&&f.current&&(f.current.scrollTop=f.current.scrollHeight)),x({success:!0})),!1);if(d.runtime.onMessage)return d.runtime.onMessage.addListener(s),()=>{d.runtime.onMessage.removeListener(s)}},[]);const N=()=>{if(f.current){const{scrollHeight:s,scrollTop:r,clientHeight:m}=f.current,x=s-r<=m+1;h.current=!x}},C=async()=>{var r,m;const s=n.sourceText.trim();if(console.log("LHG:popup/App.tsx text:::",s),!s){alert("请输入要翻译的文本");return}e(x=>({...x,isTranslating:!0,showResult:!0,translatedText:"",reasoningText:"",hasReasoning:!1})),h.current=!1;try{(r=d)!=null&&r.runtime&&(await d.runtime.sendMessage({action:"cleanup"}),await d.runtime.sendMessage({action:"translate",text:s,source:"popup"}))}catch(x){(m=x.message)!=null&&m.includes("Receiving end does not exist")||e(b=>({...b,isTranslating:!1,translatedText:`发生错误：${x.message}`}))}},T=async s=>{try{return await navigator.clipboard.writeText(s),!0}catch(r){return console.error("复制失败:",r),!1}},v=()=>{var s;(s=d)!=null&&s.runtime&&d.runtime.sendMessage({action:"getHistory"},r=>{r&&r.success&&c(r.history||[])})},l=()=>{o(!0),g(""),v()},u=()=>{o(!1)},y=s=>{e({sourceText:s.original,translatedText:s.translated,reasoningText:s.reasoning||"",hasReasoning:s.hasReasoning||!1,isTranslating:!1,showResult:!0}),u()},$=s=>{var r;confirm("确定要删除这条历史记录吗？")&&(r=d)!=null&&r.runtime&&d.runtime.sendMessage({action:"deleteHistoryItem",original:s},m=>{m&&m.success?v():alert("删除失败："+((m==null?void 0:m.error)||"未知错误"))})},H=()=>{var s;confirm("确定要清空所有历史记录吗？此操作不可撤销。")&&(s=d)!=null&&s.runtime&&d.runtime.sendMessage({action:"clearHistory"},r=>{r&&r.success?c([]):alert("清空历史记录失败："+((r==null?void 0:r.error)||"未知错误"))})},_=()=>{var s;(s=d)!=null&&s.runtime&&d.runtime.sendMessage({action:"getHistory"},r=>{if(r&&r.success&&r.history.length>0){const m=JSON.stringify(r.history,null,2),x=new Blob([m],{type:"application/json"}),b=URL.createObjectURL(x),j=document.createElement("a");j.href=b,j.download=`translation_history_${new Date().toISOString().slice(0,10)}.json`,j.click(),setTimeout(()=>URL.revokeObjectURL(b),100)}else alert("暂无历史记录可导出")})},L=s=>{const r=new FileReader;r.onload=m=>{var x,b;try{const j=JSON.parse((x=m.target)==null?void 0:x.result);Array.isArray(j)?(b=d)!=null&&b.runtime&&d.runtime.sendMessage({action:"importHistory",history:j},M=>{M&&M.success?(alert("历史记录导入成功"),v()):alert("导入失败："+((M==null?void 0:M.error)||"未知错误"))}):alert("导入的文件格式不正确")}catch(j){alert("导入失败：文件解析错误"),console.error(j)}},r.readAsText(s)},E=()=>{var s;(s=d)!=null&&s.runtime&&d.runtime.openOptionsPage()};return w.useEffect(()=>{const s=()=>{var r;(r=d)!=null&&r.runtime&&d.runtime.sendMessage({action:"cleanup"})};return window.addEventListener("beforeunload",s),()=>{var r;window.removeEventListener("beforeunload",s),(r=d)!=null&&r.runtime&&d.runtime.sendMessage({action:"cleanup"})}},[]),t.jsx("div",{className:"container",ref:f,onScroll:N,children:a?t.jsx(J,{history:i,searchTerm:p,onSearchChange:g,onBack:u,onRestore:y,onDelete:$,onClear:H,onExport:_,onImport:L}):t.jsx(U,{translationState:n,setTranslationState:e,onTranslate:C,onCopy:T,onShowHistory:l,onOpenSettings:E,onScroll:()=>{},resultAreaRef:k})})}I.createRoot(document.getElementById("root")).render(t.jsx(B.StrictMode,{children:t.jsx(V,{})}));
