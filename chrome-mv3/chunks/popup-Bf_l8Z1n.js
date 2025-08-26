import{r as H,j as n,g as fe,b as S,a as he,R as me}from"./browser-BI4HpL5I.js";function te(e){var t=typeof e;return e!=null&&(t=="object"||t=="function")}var ge=typeof global=="object"&&global&&global.Object===Object&&global,pe=typeof self=="object"&&self&&self.Object===Object&&self,de=ge||pe||Function("return this")(),re=function(){return de.Date.now()},be=/\s/;function xe(e){for(var t=e.length;t--&&be.test(e.charAt(t)););return t}var ye=/^\s+/;function we(e){return e&&e.slice(0,xe(e)+1).replace(ye,"")}var ne=de.Symbol,ue=Object.prototype,ke=ue.hasOwnProperty,$e=ue.toString,Z=ne?ne.toStringTag:void 0;function ve(e){var t=ke.call(e,Z),a=e[Z];try{e[Z]=void 0;var i=!0}catch{}var f=$e.call(e);return i&&(t?e[Z]=a:delete e[Z]),f}var je=Object.prototype,Te=je.toString;function Me(e){return Te.call(e)}var Ce="[object Null]",Se="[object Undefined]",oe=ne?ne.toStringTag:void 0;function Ne(e){return e==null?e===void 0?Se:Ce:oe&&oe in Object(e)?ve(e):Me(e)}function _e(e){return e!=null&&typeof e=="object"}var Oe="[object Symbol]";function De(e){return typeof e=="symbol"||_e(e)&&Ne(e)==Oe}var ie=NaN,He=/^[-+]0x[0-9a-f]+$/i,Le=/^0b[01]+$/i,Re=/^0o[0-7]+$/i,Ee=parseInt;function ae(e){if(typeof e=="number")return e;if(De(e))return ie;if(te(e)){var t=typeof e.valueOf=="function"?e.valueOf():e;e=te(t)?t+"":t}if(typeof e!="string")return e===0?e:+e;e=we(e);var a=Le.test(e);return a||Re.test(e)?Ee(e.slice(2),a?2:8):He.test(e)?ie:+e}var Ie="Expected a function",Ae=Math.max,We=Math.min;function Be(e,t,a){var i,f,y,w,d,b,k=0,O=!1,j=!1,Y=!0;if(typeof e!="function")throw new TypeError(Ie);t=ae(t)||0,te(a)&&(O=!!a.leading,j="maxWait"in a,y=j?Ae(ae(a.maxWait)||0,t):y,Y="trailing"in a?!!a.trailing:Y);function _(h){var M=i,C=f;return i=f=void 0,k=h,w=e.apply(C,M),w}function A(h){return k=h,d=setTimeout(L,t),O?_(h):w}function p(h){var M=h-b,C=h-k,R=t-M;return j?We(R,y-C):R}function I(h){var M=h-b,C=h-k;return b===void 0||M>=t||M<0||j&&C>=y}function L(){var h=re();if(I(h))return B(h);d=setTimeout(L,p(h))}function B(h){return d=void 0,Y&&i?_(h):(i=f=void 0,w)}function U(){d!==void 0&&clearTimeout(d),k=0,i=b=f=d=void 0}function x(){return d===void 0?w:B(re())}function l(){var h=re(),M=I(h);if(i=arguments,f=this,b=h,M){if(d===void 0)return A(b);if(j)return clearTimeout(d),d=setTimeout(L,t),_(b)}return d===void 0&&(d=setTimeout(L,t)),w}return l.cancel=U,l.flush=x,l}var Ye="Expected a function";function Fe(e,t,a){var i=!0,f=!0;if(typeof e!="function")throw new TypeError(Ye);return te(a)&&(i="leading"in a?!!a.leading:i,f="trailing"in a?!!a.trailing:f),Be(e,t,{leading:i,maxWait:t,trailing:f})}function ce(e){if(!e)return"";let t=e;t=t.replace(/\r\n/g,`
`).replace(/\r/g,`
`),t=t.replace(/</g,"&lt;").replace(/>/g,"&gt;");const a=[];t=t.replace(/```(\w+)?\n([\s\S]*?)```/g,(f,y,w)=>{const d=a.length,b=y||"text";return a.push(`<pre class="code-block"><code class="language-${b}">${w.trim()}</code></pre>`),`__CODE_BLOCK_${d}__`});const i=[];return t=t.replace(/`([^`\n]+)`/g,(f,y)=>{const w=i.length;return i.push(`<code class="inline-code">${y}</code>`),`__INLINE_CODE_${w}__`}),t=Ue(t),t=t.replace(/^#{6}\s+(.*$)/gm,"<h6>$1</h6>"),t=t.replace(/^#{5}\s+(.*$)/gm,"<h5>$1</h5>"),t=t.replace(/^#{4}\s+(.*$)/gm,"<h4>$1</h4>"),t=t.replace(/^#{3}\s+(.*$)/gm,"<h3>$1</h3>"),t=t.replace(/^#{2}\s+(.*$)/gm,"<h2>$1</h2>"),t=t.replace(/^#{1}\s+(.*$)/gm,"<h1>$1</h1>"),t=t.replace(/^(-{3,}|\*{3,}|_{3,})$/gm,'<hr class="markdown-divider">'),t=Pe(t),t=ze(t),t=qe(t),t=Ke(t),t=Je(t),a.forEach((f,y)=>{t=t.replace(`__CODE_BLOCK_${y}__`,f)}),i.forEach((f,y)=>{t=t.replace(`__INLINE_CODE_${y}__`,f)}),t=t.replace(/\n{3,}/g,`

`),t=t.replace(/^\s+|\s+$/g,""),t}function Ue(e){const t=/^(\|.*\|)\n(\|[-\s|:]*\|)\n((?:\|.*\|\n?)*)/gm;return e.replace(t,(a,i,f,y)=>{const w=i.split("|").slice(1,-1).map(b=>`<th>${b.trim()}</th>`).join(""),d=y.trim().split(`
`).map(b=>`<tr>${b.split("|").slice(1,-1).map(O=>`<td>${O.trim()}</td>`).join("")}</tr>`).join("");return`<table class="markdown-table"><thead><tr>${w}</tr></thead><tbody>${d}</tbody></table>`})}function Pe(e){const t=e.split(`
`),a=[];let i=!1,f=[];for(const y of t)y.match(/^>\s/)?(i||(i=!0,f=[]),f.push(y.replace(/^>\s?/,""))):(i&&(a.push(`<blockquote class="markdown-quote">${f.join("<br>")}</blockquote>`),i=!1,f=[]),a.push(y));return i&&f.length>0&&a.push(`<blockquote class="markdown-quote">${f.join("<br>")}</blockquote>`),a.join(`
`)}function ze(e){const t=e.split(`
`),a=[];let i=null;for(const f of t){const y=f.match(/^(\s*)[-*+]\s+(.+)$/),w=f.match(/^(\s*)\d+\.\s+(.+)$/);if(y){const[,d,b]=y,k=Math.floor(d.length/2);(!i||i.type!=="ul")&&(i&&a.push(X(i)),i={type:"ul",items:[]}),i.items.push(`<li class="list-item level-${k}">${b}</li>`)}else if(w){const[,d,b]=w,k=Math.floor(d.length/2);(!i||i.type!=="ol")&&(i&&a.push(X(i)),i={type:"ol",items:[]}),i.items.push(`<li class="list-item level-${k}">${b}</li>`)}else i&&(a.push(X(i)),i=null),a.push(f)}return i&&a.push(X(i)),a.join(`
`)}function X(e){return`<${e.type} class="markdown-list">${e.items.join("")}</${e.type}>`}function qe(e){return e=e.replace(/~~(.*?)~~/g,'<del class="strikethrough">$1</del>'),e=e.replace(/\*\*(.*?)\*\*/g,'<strong class="bold">$1</strong>'),e=e.replace(new RegExp("(?<!\\*)\\*(?!\\*)([^*]+)\\*(?!\\*)","g"),'<em class="italic">$1</em>'),e=e.replace(/==(.*?)==/g,'<mark class="highlight">$1</mark>'),e}function Ke(e){return e=e.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" class="markdown-image" loading="lazy">'),e=e.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>'),e=e.replace(/<(https?:\/\/[^>]+)>/g,'<a href="$1" class="markdown-link auto-link" target="_blank" rel="noopener noreferrer">$1</a>'),e}function Je(e){return e.split(/\n\s*\n/).map(a=>{if(a=a.trim(),!a)return"";if(a.match(/^<(h[1-6]|div|blockquote|ul|ol|table|pre|hr)/))return a;const i=a.split(`
`).filter(f=>f.trim());return i.length===1?`<p class="markdown-paragraph">${i[0]}</p>`:`<p class="markdown-paragraph">${i.join("<br>")}</p>`}).join(`

`)}const Ve=`
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
`;function Ze(e="markdown-styles"){if(!document.querySelector(`#${e}`)){const t=document.createElement("style");t.id=e,t.textContent=Ve,document.head.appendChild(t)}}const Ge=({onCopyOriginal:e,onCopyTranslation:t,hasResult:a,hasInput:i})=>{const[f,y]=H.useState("复制原文"),[w,d]=H.useState("复制译文"),b=async()=>{await e()&&(y("已复制"),setTimeout(()=>y("复制原文"),1500))},k=async()=>{await t()&&(d("已复制"),setTimeout(()=>d("复制译文"),1500))};return n.jsxs("div",{className:"copy-footer",children:[n.jsx("button",{className:"copy-footer-btn copy-original-btn",onClick:b,disabled:!i,title:i?"复制原文到剪贴板":"请先输入文本",children:f}),n.jsx("button",{className:"copy-footer-btn copy-translation-btn",onClick:k,disabled:!a,title:a?"复制译文到剪贴板":"请先进行翻译",children:w})]})},Qe=({translationState:e,setTranslationState:t,onTranslate:a,onCopy:i,onShowHistory:f,onOpenSettings:y})=>{const w=H.useRef(!1),d=H.useRef(null),b=H.useRef(null);H.useEffect(()=>{Ze("popup-markdown-styles")},[]);const k=H.useCallback(()=>{if(d.current){const{scrollHeight:p,scrollTop:I,clientHeight:L}=d.current,B=Math.abs(p-I-L)<10;w.current=!B,B||(b.current&&clearTimeout(b.current),b.current=setTimeout(()=>{if(d.current){const{scrollHeight:U,scrollTop:x,clientHeight:l}=d.current;Math.abs(U-x-l)<10&&(w.current=!1)}},1e3))}},[]),O=H.useCallback(Fe(k,16),[k]);H.useEffect(()=>{!w.current&&d.current&&(e.translatedText||e.reasoningText)&&requestAnimationFrame(()=>{d.current&&(d.current.scrollTop=d.current.scrollHeight)})},[e.translatedText,e.reasoningText]),H.useEffect(()=>{e.isTranslating&&(w.current=!1,b.current&&(clearTimeout(b.current),b.current=null))},[e.isTranslating]),H.useEffect(()=>()=>{b.current&&clearTimeout(b.current)},[]);const j=p=>{const I=p.target.value;t(L=>({...L,sourceText:I}))},Y=p=>{p.key==="Enter"&&(p.ctrlKey||p.metaKey)&&(p.preventDefault(),a())},_=async()=>await i(e.translatedText),A=async()=>e.sourceText.trim()?await i(e.sourceText):(alert("请输入要复制的文本"),!1);return n.jsxs("div",{className:"translation-area",children:[n.jsxs("div",{className:"header-section",children:[n.jsx("h1",{children:"人话翻译器"}),n.jsxs("div",{className:"header-buttons",children:[n.jsx("button",{className:"text-btn",onClick:f,children:"历史记录"}),n.jsx("button",{className:"text-btn",onClick:y,children:"设置"})]})]}),n.jsxs("div",{className:"translation-content",children:[n.jsxs("div",{className:"input-section",children:[n.jsx("div",{className:"input-area",children:n.jsx("textarea",{value:e.sourceText,onChange:j,onKeyDown:Y,placeholder:"请输入要翻译的文本... Ctrl+Enter (Windows) / Cmd+Enter (Mac) 发送，Enter换行",rows:5})}),n.jsx("div",{className:"translate-btn-wrapper",children:n.jsx("button",{className:"primary-btn",onClick:a,disabled:e.isTranslating,children:e.isTranslating?"翻译中...":"翻译"})})]}),e.showResult&&n.jsx("div",{className:"result-section-wrapper",ref:d,onScroll:O,children:n.jsxs("div",{className:"result-area",children:[n.jsx("div",{className:"result-header",children:n.jsx("span",{children:"翻译结果"})}),n.jsxs("div",{className:"result-wrapper",children:[e.hasReasoning&&e.reasoningText&&n.jsxs("div",{className:"result-section result-section-reasoning",children:[n.jsx("div",{className:"result-label",children:"思维链"}),n.jsx("div",{className:"result-content markdown-content",dangerouslySetInnerHTML:{__html:ce(e.reasoningText)}})]}),n.jsxs("div",{className:"result-section",children:[n.jsx("div",{className:"result-label",children:"译文"}),n.jsx("div",{className:"result-content markdown-content",dangerouslySetInnerHTML:{__html:ce(e.translatedText)}})]})]})]})})]}),n.jsx(Ge,{onCopyOriginal:A,onCopyTranslation:_,hasResult:e.showResult,hasInput:e.sourceText.trim().length>0})]})};var ee={exports:{}},Xe=ee.exports,le;function et(){return le||(le=1,(function(e,t){(function(a,i){e.exports=i()})(Xe,(function(){var a=1e3,i=6e4,f=36e5,y="millisecond",w="second",d="minute",b="hour",k="day",O="week",j="month",Y="quarter",_="year",A="date",p="Invalid Date",I=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,L=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,B={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(u){var o=["th","st","nd","rd"],r=u%100;return"["+u+(o[(r-20)%10]||o[r]||o[0])+"]"}},U=function(u,o,r){var c=String(u);return!c||c.length>=o?u:""+Array(o+1-c.length).join(r)+u},x={s:U,z:function(u){var o=-u.utcOffset(),r=Math.abs(o),c=Math.floor(r/60),s=r%60;return(o<=0?"+":"-")+U(c,2,"0")+":"+U(s,2,"0")},m:function u(o,r){if(o.date()<r.date())return-u(r,o);var c=12*(r.year()-o.year())+(r.month()-o.month()),s=o.clone().add(c,j),m=r-s<0,g=o.clone().add(c+(m?-1:1),j);return+(-(c+(r-s)/(m?s-g:g-s))||0)},a:function(u){return u<0?Math.ceil(u)||0:Math.floor(u)},p:function(u){return{M:j,y:_,w:O,d:k,D:A,h:b,m:d,s:w,ms:y,Q:Y}[u]||String(u||"").toLowerCase().replace(/s$/,"")},u:function(u){return u===void 0}},l="en",h={};h[l]=B;var M="$isDayjsObject",C=function(u){return u instanceof G||!(!u||!u[M])},R=function u(o,r,c){var s;if(!o)return l;if(typeof o=="string"){var m=o.toLowerCase();h[m]&&(s=m),r&&(h[m]=r,s=m);var g=o.split("-");if(!s&&g.length>1)return u(g[0])}else{var v=o.name;h[v]=o,s=v}return!c&&s&&(l=s),s||!c&&l},T=function(u,o){if(C(u))return u.clone();var r=typeof o=="object"?o:{};return r.date=u,r.args=arguments,new G(r)},$=x;$.l=R,$.i=C,$.w=function(u,o){return T(u,{locale:o.$L,utc:o.$u,x:o.$x,$offset:o.$offset})};var G=(function(){function u(r){this.$L=R(r.locale,null,!0),this.parse(r),this.$x=this.$x||r.x||{},this[M]=!0}var o=u.prototype;return o.parse=function(r){this.$d=(function(c){var s=c.date,m=c.utc;if(s===null)return new Date(NaN);if($.u(s))return new Date;if(s instanceof Date)return new Date(s);if(typeof s=="string"&&!/Z$/i.test(s)){var g=s.match(I);if(g){var v=g[2]-1||0,N=(g[7]||"0").substring(0,3);return m?new Date(Date.UTC(g[1],v,g[3]||1,g[4]||0,g[5]||0,g[6]||0,N)):new Date(g[1],v,g[3]||1,g[4]||0,g[5]||0,g[6]||0,N)}}return new Date(s)})(r),this.init()},o.init=function(){var r=this.$d;this.$y=r.getFullYear(),this.$M=r.getMonth(),this.$D=r.getDate(),this.$W=r.getDay(),this.$H=r.getHours(),this.$m=r.getMinutes(),this.$s=r.getSeconds(),this.$ms=r.getMilliseconds()},o.$utils=function(){return $},o.isValid=function(){return this.$d.toString()!==p},o.isSame=function(r,c){var s=T(r);return this.startOf(c)<=s&&s<=this.endOf(c)},o.isAfter=function(r,c){return T(r)<this.startOf(c)},o.isBefore=function(r,c){return this.endOf(c)<T(r)},o.$g=function(r,c,s){return $.u(r)?this[c]:this.set(s,r)},o.unix=function(){return Math.floor(this.valueOf()/1e3)},o.valueOf=function(){return this.$d.getTime()},o.startOf=function(r,c){var s=this,m=!!$.u(c)||c,g=$.p(r),v=function(q,W){var P=$.w(s.$u?Date.UTC(s.$y,W,q):new Date(s.$y,W,q),s);return m?P:P.endOf(k)},N=function(q,W){return $.w(s.toDate()[q].apply(s.toDate("s"),(m?[0,0,0,0]:[23,59,59,999]).slice(W)),s)},D=this.$W,E=this.$M,F=this.$D,K="set"+(this.$u?"UTC":"");switch(g){case _:return m?v(1,0):v(31,11);case j:return m?v(1,E):v(0,E+1);case O:var z=this.$locale().weekStart||0,J=(D<z?D+7:D)-z;return v(m?F-J:F+(6-J),E);case k:case A:return N(K+"Hours",0);case b:return N(K+"Minutes",1);case d:return N(K+"Seconds",2);case w:return N(K+"Milliseconds",3);default:return this.clone()}},o.endOf=function(r){return this.startOf(r,!1)},o.$set=function(r,c){var s,m=$.p(r),g="set"+(this.$u?"UTC":""),v=(s={},s[k]=g+"Date",s[A]=g+"Date",s[j]=g+"Month",s[_]=g+"FullYear",s[b]=g+"Hours",s[d]=g+"Minutes",s[w]=g+"Seconds",s[y]=g+"Milliseconds",s)[m],N=m===k?this.$D+(c-this.$W):c;if(m===j||m===_){var D=this.clone().set(A,1);D.$d[v](N),D.init(),this.$d=D.set(A,Math.min(this.$D,D.daysInMonth())).$d}else v&&this.$d[v](N);return this.init(),this},o.set=function(r,c){return this.clone().$set(r,c)},o.get=function(r){return this[$.p(r)]()},o.add=function(r,c){var s,m=this;r=Number(r);var g=$.p(c),v=function(E){var F=T(m);return $.w(F.date(F.date()+Math.round(E*r)),m)};if(g===j)return this.set(j,this.$M+r);if(g===_)return this.set(_,this.$y+r);if(g===k)return v(1);if(g===O)return v(7);var N=(s={},s[d]=i,s[b]=f,s[w]=a,s)[g]||1,D=this.$d.getTime()+r*N;return $.w(D,this)},o.subtract=function(r,c){return this.add(-1*r,c)},o.format=function(r){var c=this,s=this.$locale();if(!this.isValid())return s.invalidDate||p;var m=r||"YYYY-MM-DDTHH:mm:ssZ",g=$.z(this),v=this.$H,N=this.$m,D=this.$M,E=s.weekdays,F=s.months,K=s.meridiem,z=function(W,P,V,Q){return W&&(W[P]||W(c,m))||V[P].slice(0,Q)},J=function(W){return $.s(v%12||12,W,"0")},q=K||function(W,P,V){var Q=W<12?"AM":"PM";return V?Q.toLowerCase():Q};return m.replace(L,(function(W,P){return P||(function(V){switch(V){case"YY":return String(c.$y).slice(-2);case"YYYY":return $.s(c.$y,4,"0");case"M":return D+1;case"MM":return $.s(D+1,2,"0");case"MMM":return z(s.monthsShort,D,F,3);case"MMMM":return z(F,D);case"D":return c.$D;case"DD":return $.s(c.$D,2,"0");case"d":return String(c.$W);case"dd":return z(s.weekdaysMin,c.$W,E,2);case"ddd":return z(s.weekdaysShort,c.$W,E,3);case"dddd":return E[c.$W];case"H":return String(v);case"HH":return $.s(v,2,"0");case"h":return J(1);case"hh":return J(2);case"a":return q(v,N,!0);case"A":return q(v,N,!1);case"m":return String(N);case"mm":return $.s(N,2,"0");case"s":return String(c.$s);case"ss":return $.s(c.$s,2,"0");case"SSS":return $.s(c.$ms,3,"0");case"Z":return g}return null})(W)||g.replace(":","")}))},o.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},o.diff=function(r,c,s){var m,g=this,v=$.p(c),N=T(r),D=(N.utcOffset()-this.utcOffset())*i,E=this-N,F=function(){return $.m(g,N)};switch(v){case _:m=F()/12;break;case j:m=F();break;case Y:m=F()/3;break;case O:m=(E-D)/6048e5;break;case k:m=(E-D)/864e5;break;case b:m=E/f;break;case d:m=E/i;break;case w:m=E/a;break;default:m=E}return s?m:$.a(m)},o.daysInMonth=function(){return this.endOf(j).$D},o.$locale=function(){return h[this.$L]},o.locale=function(r,c){if(!r)return this.$L;var s=this.clone(),m=R(r,c,!0);return m&&(s.$L=m),s},o.clone=function(){return $.w(this.$d,this)},o.toDate=function(){return new Date(this.valueOf())},o.toJSON=function(){return this.isValid()?this.toISOString():null},o.toISOString=function(){return this.$d.toISOString()},o.toString=function(){return this.$d.toUTCString()},u})(),se=G.prototype;return T.prototype=se,[["$ms",y],["$s",w],["$m",d],["$H",b],["$W",k],["$M",j],["$y",_],["$D",A]].forEach((function(u){se[u[1]]=function(o){return this.$g(o,u[0],u[1])}})),T.extend=function(u,o){return u.$i||(u(o,G,T),u.$i=!0),T},T.locale=R,T.isDayjs=C,T.unix=function(u){return T(1e3*u)},T.en=h[l],T.Ls=h,T.p={},T}))})(ee)),ee.exports}var tt=et();const nt=fe(tt);function rt(e){return nt(e).format("YYYY-MM-DD HH:mm")}const st=({history:e,searchTerm:t,onSearchChange:a,onBack:i,onRestore:f,onDelete:y,onClear:w,onExport:d,onImport:b})=>{const k=H.useRef(null),O=t.trim()===""?e:e.filter(p=>p.original.toLowerCase().includes(t.toLowerCase())||p.translated.toLowerCase().includes(t.toLowerCase())),j=()=>{var p;(p=k.current)==null||p.click()},Y=p=>{var L;const I=(L=p.target.files)==null?void 0:L[0];I&&(b(I),p.target.value="")},_=(p,I)=>{const L=p.original.length>30?p.original.substring(0,30)+"...":p.original;return n.jsxs("div",{className:"history-item",onClick:()=>f(p),children:[n.jsx("div",{className:"history-item-title",children:L}),n.jsxs("div",{className:"history-meta",children:[n.jsx("div",{className:"history-item-time",children:rt(p.timestamp)}),n.jsxs("div",{className:"history-actions",children:[n.jsx("button",{className:"history-action-btn history-restore",onClick:B=>{B.stopPropagation(),f(p)},children:"恢复"}),n.jsx("button",{className:"history-action-btn history-delete",onClick:B=>{B.stopPropagation(),y(p.original)},children:"删除"})]})]}),p.hasReasoning&&n.jsx("div",{className:"history-tags",children:n.jsx("span",{className:"history-tag",children:"含思维链"})})]},`${p.timestamp}-${I}`)},A=()=>{const p=t.trim()!==""?`没有符合"${t}"的搜索结果`:"暂无翻译历史";return n.jsxs("div",{className:"empty-state-container",children:[n.jsx("p",{className:"empty-history",children:p}),n.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]})};return n.jsxs("div",{className:"history-panel visible",children:[n.jsxs("div",{className:"history-panel-header",children:[n.jsxs("div",{className:"history-panel-title",children:[n.jsx("div",{className:"back-button",onClick:i,children:n.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:n.jsx("path",{d:"M19 12H5M12 19l-7-7 7-7"})})}),n.jsx("h2",{children:"翻译历史"})]}),n.jsx("div",{className:"history-search-container",children:n.jsx("input",{type:"text",className:"history-search",placeholder:"搜索历史记录...",value:t,onChange:p=>a(p.target.value)})})]}),n.jsx("div",{className:"history-panel-content",children:O.length>0?n.jsxs(n.Fragment,{children:[O.map(_),n.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]}):A()}),n.jsxs("div",{className:"history-panel-footer",children:[n.jsxs("button",{className:"footer-btn",onClick:w,children:[n.jsx("div",{className:"footer-btn-icon",children:n.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[n.jsx("polyline",{points:"3 6 5 6 21 6"}),n.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})}),n.jsx("span",{children:"清空"})]}),n.jsxs("button",{className:"footer-btn",onClick:d,children:[n.jsx("div",{className:"footer-btn-icon",children:n.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[n.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),n.jsx("polyline",{points:"17 8 12 3 7 8"}),n.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]})}),n.jsx("span",{children:"导出"})]}),n.jsxs("button",{className:"footer-btn",onClick:j,children:[n.jsx("div",{className:"footer-btn-icon",children:n.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[n.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),n.jsx("polyline",{points:"7 10 12 15 17 10"}),n.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]})}),n.jsx("span",{children:"导入"})]})]}),n.jsx("input",{ref:k,type:"file",accept:".json",style:{display:"none"},onChange:Y})]})};function ot(){const[e,t]=H.useState({sourceText:"",translatedText:"",reasoningText:"",isTranslating:!1,hasReasoning:!1,showResult:!1}),[a,i]=H.useState(!1),[f,y]=H.useState([]),[w,d]=H.useState("");H.useEffect(()=>{const x=(l,h,M)=>(l.action==="updateTranslation"&&(l.error?t(C=>({...C,isTranslating:!1,translatedText:`错误: ${l.error}`})):t(C=>({...C,translatedText:l.content||C.translatedText,reasoningText:l.reasoningContent||C.reasoningText,hasReasoning:l.hasReasoning||!1,showResult:!0,isTranslating:!l.done})),M({success:!0})),!1);if(S.runtime.onMessage)return S.runtime.onMessage.addListener(x),()=>{S.runtime.onMessage.removeListener(x)}},[]);const b=()=>{},k=async()=>{var l,h;const x=e.sourceText.trim();if(console.log("LHG:popup/App.tsx text:::",x),!x){alert("请输入要翻译的文本");return}t(M=>({...M,isTranslating:!0,showResult:!0,translatedText:"",reasoningText:"",hasReasoning:!1}));try{(l=S)!=null&&l.runtime&&(await S.runtime.sendMessage({action:"cleanup"}),await S.runtime.sendMessage({action:"translate",text:x,source:"popup"}))}catch(M){(h=M.message)!=null&&h.includes("Receiving end does not exist")||t(C=>({...C,isTranslating:!1,translatedText:`发生错误：${M.message}`}))}},O=async x=>{try{return await navigator.clipboard.writeText(x),!0}catch(l){return console.error("复制失败:",l),!1}},j=()=>{var x;(x=S)!=null&&x.runtime&&S.runtime.sendMessage({action:"getHistory"},l=>{l&&l.success&&y(l.history||[])})},Y=()=>{i(!0),d(""),j()},_=()=>{i(!1)},A=x=>{t({sourceText:x.original,translatedText:x.translated,reasoningText:x.reasoning||"",hasReasoning:x.hasReasoning||!1,isTranslating:!1,showResult:!0}),_()},p=x=>{var l;confirm("确定要删除这条历史记录吗？")&&(l=S)!=null&&l.runtime&&S.runtime.sendMessage({action:"deleteHistoryItem",original:x},h=>{h&&h.success?j():alert("删除失败："+((h==null?void 0:h.error)||"未知错误"))})},I=()=>{var x;confirm("确定要清空所有历史记录吗？此操作不可撤销。")&&(x=S)!=null&&x.runtime&&S.runtime.sendMessage({action:"clearHistory"},l=>{l&&l.success?y([]):alert("清空历史记录失败："+((l==null?void 0:l.error)||"未知错误"))})},L=()=>{var x;(x=S)!=null&&x.runtime&&S.runtime.sendMessage({action:"getHistory"},l=>{if(l&&l.success&&l.history.length>0){const h=JSON.stringify(l.history,null,2),M=new Blob([h],{type:"application/json"}),C=URL.createObjectURL(M),R=document.createElement("a");R.href=C,R.download=`translation_history_${new Date().toISOString().slice(0,10)}.json`,R.click(),setTimeout(()=>URL.revokeObjectURL(C),100)}else alert("暂无历史记录可导出")})},B=x=>{const l=new FileReader;l.onload=h=>{var M,C;try{const R=JSON.parse((M=h.target)==null?void 0:M.result);Array.isArray(R)?(C=S)!=null&&C.runtime&&S.runtime.sendMessage({action:"importHistory",history:R},T=>{T&&T.success?(alert("历史记录导入成功"),j()):alert("导入失败："+((T==null?void 0:T.error)||"未知错误"))}):alert("导入的文件格式不正确")}catch(R){alert("导入失败：文件解析错误"),console.error(R)}},l.readAsText(x)},U=()=>{var x;(x=S)!=null&&x.runtime&&S.runtime.openOptionsPage()};return H.useEffect(()=>{const x=()=>{var l;(l=S)!=null&&l.runtime&&S.runtime.sendMessage({action:"cleanup"})};return window.addEventListener("beforeunload",x),()=>{var l;window.removeEventListener("beforeunload",x),(l=S)!=null&&l.runtime&&S.runtime.sendMessage({action:"cleanup"})}},[]),n.jsx("div",{className:"container",onScroll:b,children:a?n.jsx(st,{history:f,searchTerm:w,onSearchChange:d,onBack:_,onRestore:A,onDelete:p,onClear:I,onExport:L,onImport:B}):n.jsx(Qe,{translationState:e,setTranslationState:t,onTranslate:k,onCopy:O,onShowHistory:Y,onOpenSettings:U,onScroll:()=>{}})})}he.createRoot(document.getElementById("root")).render(n.jsx(me.StrictMode,{children:n.jsx(ot,{})}));
