import{r as S,j as n,g as he,b as C,a as me,R as ge}from"./browser-BI4HpL5I.js";function te(e){var t=typeof e;return e!=null&&(t=="object"||t=="function")}var pe=typeof global=="object"&&global&&global.Object===Object&&global,ye=typeof self=="object"&&self&&self.Object===Object&&self,ue=pe||ye||Function("return this")(),re=function(){return ue.Date.now()},be=/\s/;function xe(e){for(var t=e.length;t--&&be.test(e.charAt(t)););return t}var we=/^\s+/;function ke(e){return e&&e.slice(0,xe(e)+1).replace(we,"")}var ne=ue.Symbol,de=Object.prototype,$e=de.hasOwnProperty,ve=de.toString,Z=ne?ne.toStringTag:void 0;function je(e){var t=$e.call(e,Z),c=e[Z];try{e[Z]=void 0;var a=!0}catch{}var h=ve.call(e);return a&&(t?e[Z]=c:delete e[Z]),h}var Te=Object.prototype,Me=Te.toString;function Ce(e){return Me.call(e)}var Se="[object Null]",Ne="[object Undefined]",ie=ne?ne.toStringTag:void 0;function Oe(e){return e==null?e===void 0?Ne:Se:ie&&ie in Object(e)?je(e):Ce(e)}function _e(e){return e!=null&&typeof e=="object"}var De="[object Symbol]";function He(e){return typeof e=="symbol"||_e(e)&&Oe(e)==De}var oe=NaN,Le=/^[-+]0x[0-9a-f]+$/i,Re=/^0b[01]+$/i,Ee=/^0o[0-7]+$/i,Ie=parseInt;function ae(e){if(typeof e=="number")return e;if(He(e))return oe;if(te(e)){var t=typeof e.valueOf=="function"?e.valueOf():e;e=te(t)?t+"":t}if(typeof e!="string")return e===0?e:+e;e=ke(e);var c=Re.test(e);return c||Ee.test(e)?Ie(e.slice(2),c?2:8):Le.test(e)?oe:+e}var Ae="Expected a function",We=Math.max,Be=Math.min;function fe(e,t,c){var a,h,m,x,u,y,w=0,_=!1,k=!1,I=!0;if(typeof e!="function")throw new TypeError(Ae);t=ae(t)||0,te(c)&&(_=!!c.leading,k="maxWait"in c,m=k?We(ae(c.maxWait)||0,t):m,I="trailing"in c?!!c.trailing:I);function N(d){var $=a,j=h;return a=h=void 0,w=d,x=e.apply(j,$),x}function H(d){return w=d,u=setTimeout(A,t),_?N(d):x}function D(d){var $=d-y,j=d-w,R=t-$;return k?Be(R,m-j):R}function B(d){var $=d-y,j=d-w;return y===void 0||$>=t||$<0||k&&j>=m}function A(){var d=re();if(B(d))return F(d);u=setTimeout(A,D(d))}function F(d){return u=void 0,I&&a?N(d):(a=h=void 0,x)}function U(){u!==void 0&&clearTimeout(u),w=0,a=y=h=u=void 0}function b(){return u===void 0?x:F(re())}function r(){var d=re(),$=B(d);if(a=arguments,h=this,y=d,$){if(u===void 0)return H(y);if(k)return clearTimeout(u),u=setTimeout(A,t),N(y)}return u===void 0&&(u=setTimeout(A,t)),x}return r.cancel=U,r.flush=b,r}var Ye="Expected a function";function Fe(e,t,c){var a=!0,h=!0;if(typeof e!="function")throw new TypeError(Ye);return te(c)&&(a="leading"in c?!!c.leading:a,h="trailing"in c?!!c.trailing:h),fe(e,t,{leading:a,maxWait:t,trailing:h})}function ce(e){if(!e)return"";let t=e;t=t.replace(/\r\n/g,`
`).replace(/\r/g,`
`),t=t.replace(/</g,"&lt;").replace(/>/g,"&gt;");const c=[];t=t.replace(/```(\w+)?\n([\s\S]*?)```/g,(h,m,x)=>{const u=c.length,y=m||"text";return c.push(`<pre class="code-block"><code class="language-${y}">${x.trim()}</code></pre>`),`__CODE_BLOCK_${u}__`});const a=[];return t=t.replace(/`([^`\n]+)`/g,(h,m)=>{const x=a.length;return a.push(`<code class="inline-code">${m}</code>`),`__INLINE_CODE_${x}__`}),t=Ue(t),t=t.replace(/^#{6}\s+(.*$)/gm,"<h6>$1</h6>"),t=t.replace(/^#{5}\s+(.*$)/gm,"<h5>$1</h5>"),t=t.replace(/^#{4}\s+(.*$)/gm,"<h4>$1</h4>"),t=t.replace(/^#{3}\s+(.*$)/gm,"<h3>$1</h3>"),t=t.replace(/^#{2}\s+(.*$)/gm,"<h2>$1</h2>"),t=t.replace(/^#{1}\s+(.*$)/gm,"<h1>$1</h1>"),t=t.replace(/^(-{3,}|\*{3,}|_{3,})$/gm,'<hr class="markdown-divider">'),t=Pe(t),t=ze(t),t=qe(t),t=Ke(t),t=Je(t),c.forEach((h,m)=>{t=t.replace(`__CODE_BLOCK_${m}__`,h)}),a.forEach((h,m)=>{t=t.replace(`__INLINE_CODE_${m}__`,h)}),t=t.replace(/\n{3,}/g,`

`),t=t.replace(/^\s+|\s+$/g,""),t}function Ue(e){const t=/^(\|.*\|)\n(\|[-\s|:]*\|)\n((?:\|.*\|\n?)*)/gm;return e.replace(t,(c,a,h,m)=>{const x=a.split("|").slice(1,-1).map(y=>`<th>${y.trim()}</th>`).join(""),u=m.trim().split(`
`).map(y=>`<tr>${y.split("|").slice(1,-1).map(_=>`<td>${_.trim()}</td>`).join("")}</tr>`).join("");return`<table class="markdown-table"><thead><tr>${x}</tr></thead><tbody>${u}</tbody></table>`})}function Pe(e){const t=e.split(`
`),c=[];let a=!1,h=[];for(const m of t)m.match(/^>\s/)?(a||(a=!0,h=[]),h.push(m.replace(/^>\s?/,""))):(a&&(c.push(`<blockquote class="markdown-quote">${h.join("<br>")}</blockquote>`),a=!1,h=[]),c.push(m));return a&&h.length>0&&c.push(`<blockquote class="markdown-quote">${h.join("<br>")}</blockquote>`),c.join(`
`)}function ze(e){const t=e.split(`
`),c=[];let a=null;for(const h of t){const m=h.match(/^(\s*)[-*+]\s+(.+)$/),x=h.match(/^(\s*)\d+\.\s+(.+)$/);if(m){const[,u,y]=m,w=Math.floor(u.length/2);(!a||a.type!=="ul")&&(a&&c.push(X(a)),a={type:"ul",items:[]}),a.items.push(`<li class="list-item level-${w}">${y}</li>`)}else if(x){const[,u,y]=x,w=Math.floor(u.length/2);(!a||a.type!=="ol")&&(a&&c.push(X(a)),a={type:"ol",items:[]}),a.items.push(`<li class="list-item level-${w}">${y}</li>`)}else a&&(c.push(X(a)),a=null),c.push(h)}return a&&c.push(X(a)),c.join(`
`)}function X(e){return`<${e.type} class="markdown-list">${e.items.join("")}</${e.type}>`}function qe(e){return e=e.replace(/~~(.*?)~~/g,'<del class="strikethrough">$1</del>'),e=e.replace(/\*\*(.*?)\*\*/g,'<strong class="bold">$1</strong>'),e=e.replace(new RegExp("(?<!\\*)\\*(?!\\*)([^*]+)\\*(?!\\*)","g"),'<em class="italic">$1</em>'),e=e.replace(/==(.*?)==/g,'<mark class="highlight">$1</mark>'),e}function Ke(e){return e=e.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" class="markdown-image" loading="lazy">'),e=e.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>'),e=e.replace(/<(https?:\/\/[^>]+)>/g,'<a href="$1" class="markdown-link auto-link" target="_blank" rel="noopener noreferrer">$1</a>'),e}function Je(e){return e.split(/\n\s*\n/).map(c=>{if(c=c.trim(),!c)return"";if(c.match(/^<(h[1-6]|div|blockquote|ul|ol|table|pre|hr)/))return c;const a=c.split(`
`).filter(h=>h.trim());return a.length===1?`<p class="markdown-paragraph">${a[0]}</p>`:`<p class="markdown-paragraph">${a.join("<br>")}</p>`}).join(`

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
`;function Ze(e="markdown-styles"){if(!document.querySelector(`#${e}`)){const t=document.createElement("style");t.id=e,t.textContent=Ve,document.head.appendChild(t)}}const Ge=({onCopyOriginal:e,onCopyTranslation:t,hasResult:c,hasInput:a})=>{const[h,m]=S.useState("复制原文"),[x,u]=S.useState("复制译文"),[y,w]=S.useState(!1),[_,k]=S.useState(!1),I=async()=>{if(!y){w(!0),m("复制中...");try{await e()?(m("已复制"),setTimeout(()=>m("复制原文"),1500)):(m("复制失败"),setTimeout(()=>m("复制原文"),1500))}catch{m("复制失败"),setTimeout(()=>m("复制原文"),1500)}finally{w(!1)}}},N=async()=>{if(!_){k(!0),u("复制中...");try{await t()?(u("已复制"),setTimeout(()=>u("复制译文"),1500)):(u("复制失败"),setTimeout(()=>u("复制译文"),1500))}catch{u("复制失败"),setTimeout(()=>u("复制译文"),1500)}finally{k(!1)}}};return n.jsxs("div",{className:"copy-footer",children:[n.jsx("button",{className:"copy-footer-btn copy-original-btn",onClick:I,disabled:!a||y,title:a?"复制原文到剪贴板":"请先输入文本",children:h}),n.jsx("button",{className:"copy-footer-btn copy-translation-btn",onClick:N,disabled:!c||_,title:c?"复制译文到剪贴板":"请先进行翻译",children:x})]})},Qe=({translationState:e,setTranslationState:t,onTranslate:c,onCopy:a,onShowHistory:h,onOpenSettings:m})=>{const x=S.useRef(!1),u=S.useRef(null),y=S.useRef(null);S.useEffect(()=>{Ze("popup-markdown-styles")},[]);const w=S.useCallback(()=>{if(u.current){const{scrollHeight:D,scrollTop:B,clientHeight:A}=u.current,F=Math.abs(D-B-A)<10;x.current=!F,F||(y.current&&clearTimeout(y.current),y.current=setTimeout(()=>{if(u.current){const{scrollHeight:U,scrollTop:b,clientHeight:r}=u.current;Math.abs(U-b-r)<10&&(x.current=!1)}},1e3))}},[]),_=S.useCallback(Fe(w,16),[w]);S.useEffect(()=>{!x.current&&u.current&&(e.translatedText||e.reasoningText)&&requestAnimationFrame(()=>{u.current&&(u.current.scrollTop=u.current.scrollHeight)})},[e.translatedText,e.reasoningText]),S.useEffect(()=>{e.isTranslating&&(x.current=!1,y.current&&(clearTimeout(y.current),y.current=null))},[e.isTranslating]),S.useEffect(()=>()=>{y.current&&clearTimeout(y.current)},[]);const k=D=>{const B=D.target.value;t(A=>({...A,sourceText:B}))},I=D=>{D.key==="Enter"&&(D.ctrlKey||D.metaKey)&&(D.preventDefault(),e.isTranslating||c())},N=async()=>await a(e.translatedText),H=async()=>e.sourceText.trim()?await a(e.sourceText):(alert("请输入要复制的文本"),!1);return n.jsxs("div",{className:"translation-area",children:[n.jsxs("div",{className:"header-section",children:[n.jsx("h1",{children:"人话翻译器"}),n.jsxs("div",{className:"header-buttons",children:[n.jsx("button",{className:"text-btn",onClick:h,children:"历史记录"}),n.jsx("button",{className:"text-btn",onClick:m,children:"设置"})]})]}),n.jsxs("div",{className:"translation-content",children:[n.jsxs("div",{className:"input-section",children:[n.jsx("div",{className:"input-area",children:n.jsx("textarea",{value:e.sourceText,onChange:k,onKeyDown:I,placeholder:"请输入要翻译的文本... Ctrl+Enter (Windows) / Cmd+Enter (Mac) 发送，Enter换行",rows:5})}),n.jsx("div",{className:"translate-btn-wrapper",children:n.jsx("button",{className:"primary-btn",onClick:c,disabled:e.isTranslating,children:e.isTranslating?"翻译中...":"翻译"})})]}),e.showResult&&n.jsx("div",{className:"result-section-wrapper",ref:u,onScroll:_,children:n.jsxs("div",{className:"result-area",children:[n.jsx("div",{className:"result-header",children:n.jsx("span",{children:"翻译结果"})}),n.jsxs("div",{className:"result-wrapper",children:[e.hasReasoning&&e.reasoningText&&n.jsxs("div",{className:"result-section result-section-reasoning",children:[n.jsx("div",{className:"result-label",children:"思维链"}),n.jsx("div",{className:"result-content markdown-content",dangerouslySetInnerHTML:{__html:ce(e.reasoningText)}})]}),n.jsxs("div",{className:"result-section",children:[n.jsx("div",{className:"result-label",children:"译文"}),n.jsx("div",{className:"result-content markdown-content",dangerouslySetInnerHTML:{__html:ce(e.translatedText)}})]})]})]})})]}),n.jsx(Ge,{onCopyOriginal:H,onCopyTranslation:N,hasResult:e.showResult,hasInput:e.sourceText.trim().length>0})]})};var ee={exports:{}},Xe=ee.exports,le;function et(){return le||(le=1,(function(e,t){(function(c,a){e.exports=a()})(Xe,(function(){var c=1e3,a=6e4,h=36e5,m="millisecond",x="second",u="minute",y="hour",w="day",_="week",k="month",I="quarter",N="year",H="date",D="Invalid Date",B=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,A=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,F={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(f){var o=["th","st","nd","rd"],s=f%100;return"["+f+(o[(s-20)%10]||o[s]||o[0])+"]"}},U=function(f,o,s){var l=String(f);return!l||l.length>=o?f:""+Array(o+1-l.length).join(s)+f},b={s:U,z:function(f){var o=-f.utcOffset(),s=Math.abs(o),l=Math.floor(s/60),i=s%60;return(o<=0?"+":"-")+U(l,2,"0")+":"+U(i,2,"0")},m:function f(o,s){if(o.date()<s.date())return-f(s,o);var l=12*(s.year()-o.year())+(s.month()-o.month()),i=o.clone().add(l,k),g=s-i<0,p=o.clone().add(l+(g?-1:1),k);return+(-(l+(s-i)/(g?i-p:p-i))||0)},a:function(f){return f<0?Math.ceil(f)||0:Math.floor(f)},p:function(f){return{M:k,y:N,w:_,d:w,D:H,h:y,m:u,s:x,ms:m,Q:I}[f]||String(f||"").toLowerCase().replace(/s$/,"")},u:function(f){return f===void 0}},r="en",d={};d[r]=F;var $="$isDayjsObject",j=function(f){return f instanceof G||!(!f||!f[$])},R=function f(o,s,l){var i;if(!o)return r;if(typeof o=="string"){var g=o.toLowerCase();d[g]&&(i=g),s&&(d[g]=s,i=g);var p=o.split("-");if(!i&&p.length>1)return f(p[0])}else{var T=o.name;d[T]=o,i=T}return!l&&i&&(r=i),i||!l&&r},M=function(f,o){if(j(f))return f.clone();var s=typeof o=="object"?o:{};return s.date=f,s.args=arguments,new G(s)},v=b;v.l=R,v.i=j,v.w=function(f,o){return M(f,{locale:o.$L,utc:o.$u,x:o.$x,$offset:o.$offset})};var G=(function(){function f(s){this.$L=R(s.locale,null,!0),this.parse(s),this.$x=this.$x||s.x||{},this[$]=!0}var o=f.prototype;return o.parse=function(s){this.$d=(function(l){var i=l.date,g=l.utc;if(i===null)return new Date(NaN);if(v.u(i))return new Date;if(i instanceof Date)return new Date(i);if(typeof i=="string"&&!/Z$/i.test(i)){var p=i.match(B);if(p){var T=p[2]-1||0,O=(p[7]||"0").substring(0,3);return g?new Date(Date.UTC(p[1],T,p[3]||1,p[4]||0,p[5]||0,p[6]||0,O)):new Date(p[1],T,p[3]||1,p[4]||0,p[5]||0,p[6]||0,O)}}return new Date(i)})(s),this.init()},o.init=function(){var s=this.$d;this.$y=s.getFullYear(),this.$M=s.getMonth(),this.$D=s.getDate(),this.$W=s.getDay(),this.$H=s.getHours(),this.$m=s.getMinutes(),this.$s=s.getSeconds(),this.$ms=s.getMilliseconds()},o.$utils=function(){return v},o.isValid=function(){return this.$d.toString()!==D},o.isSame=function(s,l){var i=M(s);return this.startOf(l)<=i&&i<=this.endOf(l)},o.isAfter=function(s,l){return M(s)<this.startOf(l)},o.isBefore=function(s,l){return this.endOf(l)<M(s)},o.$g=function(s,l,i){return v.u(s)?this[l]:this.set(i,s)},o.unix=function(){return Math.floor(this.valueOf()/1e3)},o.valueOf=function(){return this.$d.getTime()},o.startOf=function(s,l){var i=this,g=!!v.u(l)||l,p=v.p(s),T=function(q,W){var P=v.w(i.$u?Date.UTC(i.$y,W,q):new Date(i.$y,W,q),i);return g?P:P.endOf(w)},O=function(q,W){return v.w(i.toDate()[q].apply(i.toDate("s"),(g?[0,0,0,0]:[23,59,59,999]).slice(W)),i)},L=this.$W,E=this.$M,Y=this.$D,K="set"+(this.$u?"UTC":"");switch(p){case N:return g?T(1,0):T(31,11);case k:return g?T(1,E):T(0,E+1);case _:var z=this.$locale().weekStart||0,J=(L<z?L+7:L)-z;return T(g?Y-J:Y+(6-J),E);case w:case H:return O(K+"Hours",0);case y:return O(K+"Minutes",1);case u:return O(K+"Seconds",2);case x:return O(K+"Milliseconds",3);default:return this.clone()}},o.endOf=function(s){return this.startOf(s,!1)},o.$set=function(s,l){var i,g=v.p(s),p="set"+(this.$u?"UTC":""),T=(i={},i[w]=p+"Date",i[H]=p+"Date",i[k]=p+"Month",i[N]=p+"FullYear",i[y]=p+"Hours",i[u]=p+"Minutes",i[x]=p+"Seconds",i[m]=p+"Milliseconds",i)[g],O=g===w?this.$D+(l-this.$W):l;if(g===k||g===N){var L=this.clone().set(H,1);L.$d[T](O),L.init(),this.$d=L.set(H,Math.min(this.$D,L.daysInMonth())).$d}else T&&this.$d[T](O);return this.init(),this},o.set=function(s,l){return this.clone().$set(s,l)},o.get=function(s){return this[v.p(s)]()},o.add=function(s,l){var i,g=this;s=Number(s);var p=v.p(l),T=function(E){var Y=M(g);return v.w(Y.date(Y.date()+Math.round(E*s)),g)};if(p===k)return this.set(k,this.$M+s);if(p===N)return this.set(N,this.$y+s);if(p===w)return T(1);if(p===_)return T(7);var O=(i={},i[u]=a,i[y]=h,i[x]=c,i)[p]||1,L=this.$d.getTime()+s*O;return v.w(L,this)},o.subtract=function(s,l){return this.add(-1*s,l)},o.format=function(s){var l=this,i=this.$locale();if(!this.isValid())return i.invalidDate||D;var g=s||"YYYY-MM-DDTHH:mm:ssZ",p=v.z(this),T=this.$H,O=this.$m,L=this.$M,E=i.weekdays,Y=i.months,K=i.meridiem,z=function(W,P,V,Q){return W&&(W[P]||W(l,g))||V[P].slice(0,Q)},J=function(W){return v.s(T%12||12,W,"0")},q=K||function(W,P,V){var Q=W<12?"AM":"PM";return V?Q.toLowerCase():Q};return g.replace(A,(function(W,P){return P||(function(V){switch(V){case"YY":return String(l.$y).slice(-2);case"YYYY":return v.s(l.$y,4,"0");case"M":return L+1;case"MM":return v.s(L+1,2,"0");case"MMM":return z(i.monthsShort,L,Y,3);case"MMMM":return z(Y,L);case"D":return l.$D;case"DD":return v.s(l.$D,2,"0");case"d":return String(l.$W);case"dd":return z(i.weekdaysMin,l.$W,E,2);case"ddd":return z(i.weekdaysShort,l.$W,E,3);case"dddd":return E[l.$W];case"H":return String(T);case"HH":return v.s(T,2,"0");case"h":return J(1);case"hh":return J(2);case"a":return q(T,O,!0);case"A":return q(T,O,!1);case"m":return String(O);case"mm":return v.s(O,2,"0");case"s":return String(l.$s);case"ss":return v.s(l.$s,2,"0");case"SSS":return v.s(l.$ms,3,"0");case"Z":return p}return null})(W)||p.replace(":","")}))},o.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},o.diff=function(s,l,i){var g,p=this,T=v.p(l),O=M(s),L=(O.utcOffset()-this.utcOffset())*a,E=this-O,Y=function(){return v.m(p,O)};switch(T){case N:g=Y()/12;break;case k:g=Y();break;case I:g=Y()/3;break;case _:g=(E-L)/6048e5;break;case w:g=(E-L)/864e5;break;case y:g=E/h;break;case u:g=E/a;break;case x:g=E/c;break;default:g=E}return i?g:v.a(g)},o.daysInMonth=function(){return this.endOf(k).$D},o.$locale=function(){return d[this.$L]},o.locale=function(s,l){if(!s)return this.$L;var i=this.clone(),g=R(s,l,!0);return g&&(i.$L=g),i},o.clone=function(){return v.w(this.$d,this)},o.toDate=function(){return new Date(this.valueOf())},o.toJSON=function(){return this.isValid()?this.toISOString():null},o.toISOString=function(){return this.$d.toISOString()},o.toString=function(){return this.$d.toUTCString()},f})(),se=G.prototype;return M.prototype=se,[["$ms",m],["$s",x],["$m",u],["$H",y],["$W",w],["$M",k],["$y",N],["$D",H]].forEach((function(f){se[f[1]]=function(o){return this.$g(o,f[0],f[1])}})),M.extend=function(f,o){return f.$i||(f(o,G,M),f.$i=!0),M},M.locale=R,M.isDayjs=j,M.unix=function(f){return M(1e3*f)},M.en=d[r],M.Ls=d,M.p={},M}))})(ee)),ee.exports}var tt=et();const nt=he(tt);function rt(e){return nt(e).format("YYYY-MM-DD HH:mm")}const st=({history:e,searchTerm:t,onSearchChange:c,onBack:a,onRestore:h,onDelete:m,onClear:x,onExport:u,onImport:y})=>{const w=S.useRef(null),[_,k]=S.useState(!1),I=S.useCallback(fe(r=>{c(r)},300),[c]),N=r=>{I(r.target.value)},H=async()=>{if(!_&&confirm("确定要清除所有历史记录吗？此操作不可撤销。")){k(!0);try{await x()}finally{k(!1)}}},D=async(r,d)=>{d.stopPropagation(),confirm("确定要删除这条历史记录吗？")&&await m(r)},B=t.trim()===""?e:e.filter(r=>r.original.toLowerCase().includes(t.toLowerCase())||r.translated.toLowerCase().includes(t.toLowerCase())),A=()=>{var r;(r=w.current)==null||r.click()},F=r=>{var $;const d=($=r.target.files)==null?void 0:$[0];d&&(y(d),r.target.value="")},U=(r,d)=>{const $=r.original.length>30?r.original.substring(0,30)+"...":r.original;return n.jsxs("div",{className:"history-item",onClick:()=>h(r),children:[n.jsx("div",{className:"history-item-title",children:$}),n.jsxs("div",{className:"history-meta",children:[n.jsx("div",{className:"history-item-time",children:rt(r.timestamp)}),n.jsxs("div",{className:"history-actions",children:[n.jsx("button",{className:"history-action-btn history-restore",onClick:j=>{j.stopPropagation(),h(r)},children:"恢复"}),n.jsx("button",{className:"history-action-btn history-delete",onClick:j=>D(r.original,j),children:"删除"})]})]}),r.hasReasoning&&n.jsx("div",{className:"history-tags",children:n.jsx("span",{className:"history-tag",children:"含思维链"})})]},`${r.timestamp}-${d}`)},b=()=>{const r=t.trim()!==""?`没有符合"${t}"的搜索结果`:"暂无翻译历史";return n.jsxs("div",{className:"empty-state-container",children:[n.jsx("p",{className:"empty-history",children:r}),n.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]})};return n.jsxs("div",{className:"history-panel visible",children:[n.jsxs("div",{className:"history-panel-header",children:[n.jsxs("div",{className:"history-panel-title",children:[n.jsx("div",{className:"back-button",onClick:a,children:n.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:n.jsx("path",{d:"M19 12H5M12 19l-7-7 7-7"})})}),n.jsx("h2",{children:"翻译历史"})]}),n.jsx("div",{className:"history-search-container",children:n.jsx("input",{type:"text",className:"history-search",placeholder:"搜索历史记录...",defaultValue:t,onChange:N})})]}),n.jsx("div",{className:"history-panel-content",children:B.length>0?n.jsxs(n.Fragment,{children:[B.map(U),n.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]}):b()}),n.jsxs("div",{className:"history-panel-footer",children:[n.jsxs("button",{className:"footer-btn",onClick:H,disabled:_,children:[n.jsx("div",{className:"footer-btn-icon",children:n.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[n.jsx("polyline",{points:"3 6 5 6 21 6"}),n.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})}),n.jsx("span",{children:_?"清空中...":"清空"})]}),n.jsxs("button",{className:"footer-btn",onClick:u,children:[n.jsx("div",{className:"footer-btn-icon",children:n.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[n.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),n.jsx("polyline",{points:"17 8 12 3 7 8"}),n.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]})}),n.jsx("span",{children:"导出"})]}),n.jsxs("button",{className:"footer-btn",onClick:A,children:[n.jsx("div",{className:"footer-btn-icon",children:n.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[n.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),n.jsx("polyline",{points:"7 10 12 15 17 10"}),n.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]})}),n.jsx("span",{children:"导入"})]})]}),n.jsx("input",{ref:w,type:"file",accept:".json",style:{display:"none"},onChange:F})]})};function it(){const[e,t]=S.useState({sourceText:"",translatedText:"",reasoningText:"",isTranslating:!1,hasReasoning:!1,showResult:!1}),[c,a]=S.useState(!1),[h,m]=S.useState([]),[x,u]=S.useState("");S.useEffect(()=>{const b=(r,d,$)=>(r.action==="updateTranslation"&&(r.error?t(j=>({...j,isTranslating:!1,translatedText:`错误: ${r.error}`})):t(j=>({...j,translatedText:r.content||j.translatedText,reasoningText:r.reasoningContent||j.reasoningText,hasReasoning:r.hasReasoning||!1,showResult:!0,isTranslating:!r.done})),$({success:!0})),!1);if(C.runtime.onMessage)return C.runtime.onMessage.addListener(b),()=>{C.runtime.onMessage.removeListener(b)}},[]);const y=()=>{},w=async()=>{var r,d;const b=e.sourceText.trim();if(console.log("LHG:popup/App.tsx text:::",b),!b){alert("请输入要翻译的文本");return}if(!e.isTranslating){t($=>({...$,isTranslating:!0,showResult:!0,translatedText:"",reasoningText:"",hasReasoning:!1}));try{(r=C)!=null&&r.runtime&&(await C.runtime.sendMessage({action:"cleanup"}),await C.runtime.sendMessage({action:"translate",text:b,source:"popup"}))}catch($){(d=$.message)!=null&&d.includes("Receiving end does not exist")||t(j=>({...j,isTranslating:!1,translatedText:`发生错误：${$.message}`}))}}},_=async b=>{try{return await navigator.clipboard.writeText(b),!0}catch(r){return console.error("复制失败:",r),!1}},k=()=>{var b;(b=C)!=null&&b.runtime&&C.runtime.sendMessage({action:"getHistory"},r=>{r&&r.success&&m(r.history||[])})},I=()=>{a(!0),u(""),k()},N=()=>{a(!1)},H=b=>{t({sourceText:b.original,translatedText:b.translated,reasoningText:b.reasoning||"",hasReasoning:b.hasReasoning||!1,isTranslating:!1,showResult:!0}),N()},D=b=>{var r;confirm("确定要删除这条历史记录吗？")&&(r=C)!=null&&r.runtime&&C.runtime.sendMessage({action:"deleteHistoryItem",original:b},d=>{d&&d.success?k():alert("删除失败："+((d==null?void 0:d.error)||"未知错误"))})},B=()=>{var b;confirm("确定要清空所有历史记录吗？此操作不可撤销。")&&(b=C)!=null&&b.runtime&&C.runtime.sendMessage({action:"clearHistory"},r=>{r&&r.success?m([]):alert("清空历史记录失败："+((r==null?void 0:r.error)||"未知错误"))})},A=()=>{var b;(b=C)!=null&&b.runtime&&C.runtime.sendMessage({action:"getHistory"},r=>{if(r&&r.success&&r.history.length>0){const d=JSON.stringify(r.history,null,2),$=new Blob([d],{type:"application/json"}),j=URL.createObjectURL($),R=document.createElement("a");R.href=j,R.download=`translation_history_${new Date().toISOString().slice(0,10)}.json`,R.click(),setTimeout(()=>URL.revokeObjectURL(j),100)}else alert("暂无历史记录可导出")})},F=b=>{const r=new FileReader;r.onload=d=>{var $,j;try{const R=JSON.parse(($=d.target)==null?void 0:$.result);Array.isArray(R)?(j=C)!=null&&j.runtime&&C.runtime.sendMessage({action:"importHistory",history:R},M=>{M&&M.success?(alert("历史记录导入成功"),k()):alert("导入失败："+((M==null?void 0:M.error)||"未知错误"))}):alert("导入的文件格式不正确")}catch(R){alert("导入失败：文件解析错误"),console.error(R)}},r.readAsText(b)},U=()=>{var b;(b=C)!=null&&b.runtime&&C.runtime.openOptionsPage()};return S.useEffect(()=>{const b=()=>{var r;(r=C)!=null&&r.runtime&&C.runtime.sendMessage({action:"cleanup"})};return window.addEventListener("beforeunload",b),()=>{var r;window.removeEventListener("beforeunload",b),(r=C)!=null&&r.runtime&&C.runtime.sendMessage({action:"cleanup"})}},[]),n.jsx("div",{className:"container",onScroll:y,children:c?n.jsx(st,{history:h,searchTerm:x,onSearchChange:u,onBack:N,onRestore:H,onDelete:D,onClear:B,onExport:A,onImport:F}):n.jsx(Qe,{translationState:e,setTranslationState:t,onTranslate:w,onCopy:_,onShowHistory:I,onOpenSettings:U,onScroll:()=>{}})})}me.createRoot(document.getElementById("root")).render(n.jsx(ge.StrictMode,{children:n.jsx(it,{})}));
