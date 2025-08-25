var X=Object.defineProperty;var W=(h,d,i)=>d in h?X(h,d,{enumerable:!0,configurable:!0,writable:!0,value:i}):h[d]=i;var s=(h,d,i)=>W(h,typeof d!="symbol"?d+"":d,i);var content=(function(){"use strict";var y,T;function h(r){return r}const i=(T=(y=globalThis.browser)==null?void 0:y.runtime)!=null&&T.id?globalThis.browser:globalThis.chrome,P=`
  .translator-popup {
    position: fixed;
    z-index: 10000;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    max-width: none;
    min-width: 320px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    max-height: 85vh;
    cursor: default;
    width: 420px;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(8px);
  }

  .translator-popup::after {
    content: "";
    position: absolute;
    top: 0; 
    right: 0;
    width: 15px;
    height: 100%;
    cursor: e-resize;
    z-index: 2;
  }

  .translator-popup::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 15px;
    height: 100%;
    cursor: w-resize;
    z-index: 2;
  }

  .translator-popup .translator-header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.95);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 12px 12px 0 0;
    cursor: grab;
    user-select: none;
    backdrop-filter: blur(8px);
  }

  .translator-popup .translator-header:active {
    cursor: grabbing;
  }

  .translator-popup .translator-title {
    font-weight: 600;
    color: #1a1a1a;
    font-size: 15px;
  }

  .translator-popup .translator-close-btn {
    cursor: pointer;
    padding: 6px;
    color: #666;
    border-radius: 6px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .translator-popup .translator-close-btn:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #333;
  }

  .translator-popup .translator-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    scroll-behavior: smooth;
    max-height: calc(85vh - 120px);
    cursor: auto;
    line-height: 1.6;
  }

  .translator-popup .translator-section {
    margin-bottom: 16px;
    padding: 16px;
    border-radius: 8px;
    background: #fff;
    position: relative;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .translator-popup .translator-section:last-child {
    margin-bottom: 0;
    padding-bottom: 40px;
  }

  .translator-popup .translator-copy-original-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(52, 199, 89, 0.1);
    color: #34c759;
    border: 1px solid rgba(52, 199, 89, 0.3);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    opacity: 0.8;
    transition: all 0.2s ease;
  }

  .translator-popup .translator-copy-original-btn:hover {
    opacity: 1;
    background: rgba(52, 199, 89, 0.15);
    transform: translateY(-1px);
  }

  .translator-popup .translator-label {
    font-size: 13px;
    color: #666;
    margin-bottom: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .translator-popup .translator-text {
    color: #1a1a1a;
    line-height: 1.6;
    overflow-wrap: break-word;
    font-size: 14px;
  }

  .translator-popup .translator-reasoning-text {
    color: #4a5568;
    line-height: 1.6;
    overflow-wrap: break-word;
    font-size: 13px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 16px;
    border-radius: 8px;
    border-left: 4px solid #64748b;
    margin: 12px 0;
  }

  .translator-popup .translator-translated-text {
    color: #1a1a1a;
    line-height: 1.6;
    overflow-wrap: break-word;
    font-weight: 500;
    font-size: 14px;
  }

  .translator-popup .translator-loading {
    display: inline-block;
    margin-left: 8px;
    color: #64748b;
    font-size: 13px;
  }

  .translator-popup .translator-copy-btn {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #34c759 0%, #30d158 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    width: 100%;
    cursor: pointer;
    border-radius: 0 0 12px 12px;
    margin-top: auto;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .translator-popup .translator-copy-btn:hover {
    background: linear-gradient(135deg, #30b454 0%, #2bc653 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3);
  }

  .translator-popup.resizing-left {
    cursor: w-resize;
    user-select: none;
  }

  .translator-popup.resizing-right {
    cursor: e-resize;
    user-select: none;
  }

  .translator-popup .translator-content::-webkit-scrollbar {
    width: 6px;
  }

  .translator-popup .translator-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 3px;
  }

  .translator-popup .translator-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    transition: background 0.2s ease;
  }

  .translator-popup .translator-content::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  /* 集成共享 Markdown 样式，添加 .translator-popup 前缀 */
  ${`
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
`.replace(/(\.[a-zA-Z])/g,".translator-popup $1")}

  /* 暗黑模式支持 */
  @media (prefers-color-scheme: dark) {
    .translator-popup {
      background: #1a1a1a;
      border-color: rgba(255, 255, 255, 0.1);
      color: #e5e5e5;
    }

    .translator-popup .translator-header {
      background: rgba(26, 26, 26, 0.95);
      border-bottom-color: rgba(255, 255, 255, 0.1);
    }

    .translator-popup .translator-title {
      color: #e5e5e5;
    }

    .translator-popup .translator-text,
    .translator-popup .translator-translated-text {
      color: #e5e5e5;
    }

    .translator-popup .translator-reasoning-text {
      background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
      color: #b0b0b0;
      border-left-color: #666;
    }
  }

  /* 响应式设计 */
  @media (max-width: 480px) {
    .translator-popup {
      width: calc(100vw - 40px);
      max-width: none;
      left: 20px !important;
      right: 20px !important;
    }
  }
`;function M(){if(!document.querySelector("#translator-popup-style")){const r=document.createElement("style");r.id="translator-popup-style",r.textContent=P,document.head.appendChild(r)}}const u={TRANSLATE:"translate",CLEANUP:"cleanup",GET_HISTORY:"getHistory",CLEAR_HISTORY:"clearHistory",DELETE_HISTORY_ITEM:"deleteHistoryItem",IMPORT_HISTORY:"importHistory",UPDATE_TRANSLATION:"updateTranslation",SHOW_TRANSLATION_POPUP:"showTranslationPopup",GET_SELECTED_TEXT:"getSelectedText"};class ${constructor(t,e){s(this,"isDragging",!1);s(this,"isResizing",!1);s(this,"resizeDirection",null);s(this,"startX",0);s(this,"startY",0);s(this,"startWidth",0);s(this,"initialX",0);s(this,"initialY",0);s(this,"startLeft",0);s(this,"cleanup",null);s(this,"handleHeaderMouseDown",t=>{this.isDragging=!0,this.startX=t.clientX,this.startY=t.clientY,this.initialX=this.popup.offsetLeft,this.initialY=this.popup.offsetTop,t.preventDefault(),t.stopPropagation()});s(this,"handlePopupMouseDown",t=>{if(t.target.closest(".translator-header"))return;const e=this.popup.getBoundingClientRect(),o=t.clientX-e.left,n=e.right-t.clientX;o<=15?(this.isResizing=!0,this.resizeDirection="left",this.startWidth=this.popup.offsetWidth,this.startX=t.clientX,this.startLeft=this.popup.offsetLeft,this.popup.classList.add("resizing-left"),t.preventDefault(),t.stopPropagation()):n<=15&&(this.isResizing=!0,this.resizeDirection="right",this.startWidth=this.popup.offsetWidth,this.startX=t.clientX,this.popup.classList.add("resizing-right"),t.preventDefault(),t.stopPropagation())});s(this,"handleMouseMove",t=>{this.isResizing?this.handleResize(t):this.isDragging&&this.handleDrag(t)});s(this,"handleMouseUp",t=>{this.isResizing&&(this.isResizing=!1,this.resizeDirection=null,this.popup.classList.remove("resizing-left","resizing-right"),this.savePopupState(),t.preventDefault(),t.stopPropagation()),this.isDragging&&(this.isDragging=!1,this.savePopupState())});this.popup=t,this.onStateChange=e,this.initializeEvents()}initializeEvents(){this.popup.querySelector(".translator-header").addEventListener("mousedown",this.handleHeaderMouseDown,!0),this.popup.addEventListener("mousedown",this.handlePopupMouseDown,!0),this.setupCopyButtons(),document.addEventListener("mousemove",this.handleMouseMove,!0),document.addEventListener("mouseup",this.handleMouseUp,!0),this.cleanup=()=>{document.removeEventListener("mousemove",this.handleMouseMove,!0),document.removeEventListener("mouseup",this.handleMouseUp,!0)}}handleResize(t){let e;if(this.resizeDirection==="right"){const o=t.clientX-this.startX;e=this.startWidth+o}else if(this.resizeDirection==="left"){const o=this.startX-t.clientX;e=this.startWidth+o}else return;if(e=Math.min(Math.max(300,e),1200),this.popup.style.width=`${e}px`,this.resizeDirection==="left"){const o=this.startLeft-(e-this.startWidth);this.popup.style.left=`${o}px`}t.preventDefault(),t.stopPropagation()}handleDrag(t){const e=t.clientX-this.startX,o=t.clientY-this.startY;this.popup.style.left=`${this.initialX+e}px`,this.popup.style.top=`${this.initialY+o}px`,t.preventDefault(),t.stopPropagation()}setupCopyButtons(){const t=this.popup.querySelector(".translator-copy-btn");t==null||t.addEventListener("click",()=>{var n;const o=((n=this.popup.querySelector(".translator-translated-text"))==null?void 0:n.textContent)||"";this.copyToClipboard(o,t,"复制译文")});const e=this.popup.querySelector(".translator-copy-original-btn");e==null||e.addEventListener("click",()=>{var n;const o=((n=this.popup.querySelector(".translator-text"))==null?void 0:n.textContent)||"";this.copyToClipboard(o,e,"复制")})}async copyToClipboard(t,e,o){try{await navigator.clipboard.writeText(t),e.textContent="已复制",setTimeout(()=>e.textContent=o,1500)}catch(n){console.error("复制失败:",n),alert("复制失败，请重试")}}savePopupState(){const t=parseInt(this.popup.style.left),e=parseInt(this.popup.style.top),o=parseInt(this.popup.style.width);!isNaN(t)&&!isNaN(e)&&!isNaN(o)&&this.onStateChange({left:t,top:e,width:o})}destroy(){this.cleanup&&this.cleanup()}}function E(r){if(!r)return"";let t=r;t=t.replace(/\r\n/g,`
`).replace(/\r/g,`
`),t=t.replace(/</g,"&lt;").replace(/>/g,"&gt;");const e=[];t=t.replace(/```(\w+)?\n([\s\S]*?)```/g,(n,a,l)=>{const c=e.length,p=a||"text";return e.push(`<pre class="code-block"><code class="language-${p}">${l.trim()}</code></pre>`),`__CODE_BLOCK_${c}__`});const o=[];return t=t.replace(/`([^`\n]+)`/g,(n,a)=>{const l=o.length;return o.push(`<code class="inline-code">${a}</code>`),`__INLINE_CODE_${l}__`}),t=C(t),t=t.replace(/^#{6}\s+(.*$)/gm,"<h6>$1</h6>"),t=t.replace(/^#{5}\s+(.*$)/gm,"<h5>$1</h5>"),t=t.replace(/^#{4}\s+(.*$)/gm,"<h4>$1</h4>"),t=t.replace(/^#{3}\s+(.*$)/gm,"<h3>$1</h3>"),t=t.replace(/^#{2}\s+(.*$)/gm,"<h2>$1</h2>"),t=t.replace(/^#{1}\s+(.*$)/gm,"<h1>$1</h1>"),t=t.replace(/^(-{3,}|\*{3,}|_{3,})$/gm,'<hr class="markdown-divider">'),t=L(t),t=N(t),t=_(t),t=I(t),t=z(t),e.forEach((n,a)=>{t=t.replace(`__CODE_BLOCK_${a}__`,n)}),o.forEach((n,a)=>{t=t.replace(`__INLINE_CODE_${a}__`,n)}),t=t.replace(/\n{3,}/g,`

`),t=t.replace(/^\s+|\s+$/g,""),t}function C(r){const t=/^(\|.*\|)\n(\|[-\s|:]*\|)\n((?:\|.*\|\n?)*)/gm;return r.replace(t,(e,o,n,a)=>{const l=o.split("|").slice(1,-1).map(p=>`<th>${p.trim()}</th>`).join(""),c=a.trim().split(`
`).map(p=>`<tr>${p.split("|").slice(1,-1).map(Y=>`<td>${Y.trim()}</td>`).join("")}</tr>`).join("");return`<table class="markdown-table"><thead><tr>${l}</tr></thead><tbody>${c}</tbody></table>`})}function L(r){const t=r.split(`
`),e=[];let o=!1,n=[];for(const a of t)a.match(/^>\s/)?(o||(o=!0,n=[]),n.push(a.replace(/^>\s?/,""))):(o&&(e.push(`<blockquote class="markdown-quote">${n.join("<br>")}</blockquote>`),o=!1,n=[]),e.push(a));return o&&n.length>0&&e.push(`<blockquote class="markdown-quote">${n.join("<br>")}</blockquote>`),e.join(`
`)}function N(r){const t=r.split(`
`),e=[];let o=null;for(const n of t){const a=n.match(/^(\s*)[-*+]\s+(.+)$/),l=n.match(/^(\s*)\d+\.\s+(.+)$/);if(a){const[,c,p]=a,x=Math.floor(c.length/2);(!o||o.type!=="ul")&&(o&&e.push(f(o)),o={type:"ul",items:[]}),o.items.push(`<li class="list-item level-${x}">${p}</li>`)}else if(l){const[,c,p]=l,x=Math.floor(c.length/2);(!o||o.type!=="ol")&&(o&&e.push(f(o)),o={type:"ol",items:[]}),o.items.push(`<li class="list-item level-${x}">${p}</li>`)}else o&&(e.push(f(o)),o=null),e.push(n)}return o&&e.push(f(o)),e.join(`
`)}function f(r){return`<${r.type} class="markdown-list">${r.items.join("")}</${r.type}>`}function _(r){return r=r.replace(/~~(.*?)~~/g,'<del class="strikethrough">$1</del>'),r=r.replace(/\*\*(.*?)\*\*/g,'<strong class="bold">$1</strong>'),r=r.replace(new RegExp("(?<!\\*)\\*(?!\\*)([^*]+)\\*(?!\\*)","g"),'<em class="italic">$1</em>'),r=r.replace(/==(.*?)==/g,'<mark class="highlight">$1</mark>'),r}function I(r){return r=r.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" class="markdown-image" loading="lazy">'),r=r.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>'),r=r.replace(/<(https?:\/\/[^>]+)>/g,'<a href="$1" class="markdown-link auto-link" target="_blank" rel="noopener noreferrer">$1</a>'),r}function z(r){return r.split(/\n\s*\n/).map(e=>{if(e=e.trim(),!e)return"";if(e.match(/^<(h[1-6]|div|blockquote|ul|ol|table|pre|hr)/))return e;const o=e.split(`
`).filter(n=>n.trim());return o.length===1?`<p class="markdown-paragraph">${o[0]}</p>`:`<p class="markdown-paragraph">${o.join("<br>")}</p>`}).join(`

`)}class A{constructor(){s(this,"lastPopupState",{left:null,top:null,width:null});s(this,"currentPopup",null);s(this,"eventHandler",null);s(this,"userHasScrolled",!1)}showPopup(t){this.removeCurrentPopup();const e=this.createPopupElement(t);return this.currentPopup=e,document.body.appendChild(e),this.positionPopup(e),this.setupEventHandlers(e),this.setupScrollDetection(e),e}updateTranslation(t){if(!this.currentPopup)return console.log("翻译弹窗不存在，可能已关闭"),!1;const e=this.getPopupElements();return!e.translatedTextEl||!e.reasoningTextEl||!e.loadingEl?!1:(t.error?this.handleTranslationError(t.error,e.loadingEl):this.handleTranslationUpdate(t,e),!0)}removeCurrentPopup(){this.currentPopup&&(this.savePopupState(this.currentPopup),this.eventHandler&&(this.eventHandler.destroy(),this.eventHandler=null),this.currentPopup.remove(),this.currentPopup=null)}createPopupElement(t){const e=document.createElement("div");return e.className="translator-popup",e.innerHTML=`
      <div class="translator-header">
        <div class="translator-title">人话翻译器</div>
        <div class="translator-close-btn">✕</div>
      </div>
      <div class="translator-content">
        <div class="translator-section">
          <div class="translator-label">原文</div>
          <div class="translator-text">${t}</div>
          <button class="translator-copy-original-btn">复制</button>
        </div>
        <div class="translator-section translator-section-reasoning" style="display: none;">
          <div class="translator-label">思维链</div>
          <div class="translator-reasoning-text"></div>
        </div>
        <div class="translator-section">
          <div class="translator-label">译文</div>
          <div class="translator-translated-text"></div>
          <div class="translator-loading">正在翻译...</div>
        </div>
      </div>
      <button class="translator-copy-btn">复制译文</button>
    `,e}positionPopup(t){const e=window.innerWidth,o=window.innerHeight;let n=e-420,a=20,l=400;this.lastPopupState.left!==null&&this.lastPopupState.top!==null&&(n=Math.min(Math.max(0,this.lastPopupState.left),e-300),a=Math.min(Math.max(0,this.lastPopupState.top),o-100)),this.lastPopupState.width!==null&&(l=Math.min(Math.max(300,this.lastPopupState.width),1200)),t.style.left=`${n}px`,t.style.top=`${a}px`,t.style.width=`${l}px`}setupEventHandlers(t){var e;this.eventHandler=new $(t,o=>{this.lastPopupState=o,console.log("保存弹窗状态:",o)}),(e=t.querySelector(".translator-close-btn"))==null||e.addEventListener("click",()=>{i.runtime.sendMessage({action:u.CLEANUP}),this.removeCurrentPopup()})}setupScrollDetection(t){const e=t.querySelector(".translator-content");this.userHasScrolled=!1,e.addEventListener("scroll",()=>{const o=e.scrollHeight-e.scrollTop<=e.clientHeight+1;this.userHasScrolled=!o}),t.userHasScrolled=()=>this.userHasScrolled}getPopupElements(){return this.currentPopup?{translatedTextEl:this.currentPopup.querySelector(".translator-translated-text"),reasoningSectionEl:this.currentPopup.querySelector(".translator-section-reasoning"),reasoningTextEl:this.currentPopup.querySelector(".translator-reasoning-text"),loadingEl:this.currentPopup.querySelector(".translator-loading"),contentEl:this.currentPopup.querySelector(".translator-content")}:{}}handleTranslationError(t,e){console.log("翻译发生错误:",t),t.includes("API Key")||t.includes("API 请求失败")||t.includes("rate limit")?e.textContent="翻译失败："+t:e.textContent="翻译失败，请重试"}handleTranslationUpdate(t,e){console.log("更新翻译结果"),t.content&&(e.translatedTextEl.innerHTML=E(t.content)),e.reasoningSectionEl&&(e.reasoningSectionEl.style.display=t.hasReasoning?"block":"none",t.hasReasoning&&t.reasoningContent&&(e.reasoningTextEl.innerHTML=E(t.reasoningContent))),t.done&&(console.log("翻译完成"),e.loadingEl.style.display="none"),!this.userHasScrolled&&e.contentEl&&(e.contentEl.scrollTop=e.contentEl.scrollHeight)}savePopupState(t){const e=parseInt(t.style.left),o=parseInt(t.style.top),n=parseInt(t.style.width);!isNaN(e)&&!isNaN(o)&&!isNaN(n)&&(this.lastPopupState={left:e,top:o,width:n})}}class D{constructor(t){s(this,"handleMessage",(t,e,o)=>{console.log("Content script收到消息:",t.action);try{switch(t.action){case u.SHOW_TRANSLATION_POPUP:return this.handleShowTranslationPopup(t,o);case u.UPDATE_TRANSLATION:return this.handleUpdateTranslation(t,o);case u.GET_SELECTED_TEXT:return this.handleGetSelectedText(o);default:return o({success:!1,error:"未知操作"}),!0}}catch(n){return console.error("处理消息错误:",n),o({success:!1,error:n.message}),!0}});this.popupManager=t}handleShowTranslationPopup(t,e){if(!t.text)return e({success:!1,error:"缺少文本参数"}),!0;const o=document.querySelector(".translator-popup");return o?(console.log("发现旧的翻译弹窗，先移除"),i.runtime.sendMessage({action:u.CLEANUP},()=>{o.remove(),console.log("显示新弹窗"),this.popupManager.showPopup(t.text),i.runtime.sendMessage({action:u.TRANSLATE,text:t.text})})):(console.log("显示弹窗"),this.popupManager.showPopup(t.text),i.runtime.sendMessage({action:u.TRANSLATE,text:t.text})),e({success:!0}),!0}handleUpdateTranslation(t,e){const o=this.popupManager.updateTranslation(t);return e({success:o}),!0}handleGetSelectedText(t){var o;console.log("收到获取选中文本的消息");const e=(o=window.getSelection())==null?void 0:o.toString().trim();return console.log("选中的文本:",e),e?(console.log("直接显示弹框并开始翻译"),this.popupManager.showPopup(e),i.runtime.sendMessage({action:u.TRANSLATE,text:e})):console.log("没有选中文本"),t({success:!0}),!0}}const H={matches:["<all_urls>"],main(){console.log("人话翻译器 content script 启动"),M();const r=new A,t=new D(r);i.runtime.onMessage.addListener(t.handleMessage),console.log("Content script 初始化完成")}};function m(r,...t){}const R={debug:(...r)=>m(console.debug,...r),log:(...r)=>m(console.log,...r),warn:(...r)=>m(console.warn,...r),error:(...r)=>m(console.error,...r)},w=class w extends Event{constructor(t,e){super(w.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=e}};s(w,"EVENT_NAME",k("wxt:locationchange"));let v=w;function k(r){var t;return`${(t=i==null?void 0:i.runtime)==null?void 0:t.id}:content:${r}`}function U(r){let t,e;return{run(){t==null&&(e=new URL(location.href),t=r.setInterval(()=>{let o=new URL(location.href);o.href!==e.href&&(window.dispatchEvent(new v(o,e)),e=o)},1e3))}}}const g=class g{constructor(t,e){s(this,"isTopFrame",window.self===window.top);s(this,"abortController");s(this,"locationWatcher",U(this));s(this,"receivedMessageIds",new Set);this.contentScriptName=t,this.options=e,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(t){return this.abortController.abort(t)}get isInvalid(){return i.runtime.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(t){return this.signal.addEventListener("abort",t),()=>this.signal.removeEventListener("abort",t)}block(){return new Promise(()=>{})}setInterval(t,e){const o=setInterval(()=>{this.isValid&&t()},e);return this.onInvalidated(()=>clearInterval(o)),o}setTimeout(t,e){const o=setTimeout(()=>{this.isValid&&t()},e);return this.onInvalidated(()=>clearTimeout(o)),o}requestAnimationFrame(t){const e=requestAnimationFrame((...o)=>{this.isValid&&t(...o)});return this.onInvalidated(()=>cancelAnimationFrame(e)),e}requestIdleCallback(t,e){const o=requestIdleCallback((...n)=>{this.signal.aborted||t(...n)},e);return this.onInvalidated(()=>cancelIdleCallback(o)),o}addEventListener(t,e,o,n){var a;e==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),(a=t.addEventListener)==null||a.call(t,e.startsWith("wxt:")?k(e):e,o,{...n,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),R.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:g.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:Math.random().toString(36).slice(2)},"*")}verifyScriptStartedEvent(t){var a,l,c;const e=((a=t.data)==null?void 0:a.type)===g.SCRIPT_STARTED_MESSAGE_TYPE,o=((l=t.data)==null?void 0:l.contentScriptName)===this.contentScriptName,n=!this.receivedMessageIds.has((c=t.data)==null?void 0:c.messageId);return e&&o&&n}listenForNewerScripts(t){let e=!0;const o=n=>{if(this.verifyScriptStartedEvent(n)){this.receivedMessageIds.add(n.data.messageId);const a=e;if(e=!1,a&&(t!=null&&t.ignoreFirstEvent))return;this.notifyInvalidated()}};addEventListener("message",o),this.onInvalidated(()=>removeEventListener("message",o))}};s(g,"SCRIPT_STARTED_MESSAGE_TYPE",k("wxt:content-script-started"));let S=g;function q(){}function b(r,...t){}const O={debug:(...r)=>b(console.debug,...r),log:(...r)=>b(console.log,...r),warn:(...r)=>b(console.warn,...r),error:(...r)=>b(console.error,...r)};return(async()=>{try{const{main:r,...t}=H,e=new S("content",t);return await r(e)}catch(r){throw O.error('The content script "content" crashed on startup!',r),r}})()})();
content;