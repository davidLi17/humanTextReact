import{r as E,j as l,g as Ue,b as L,a as Ve,R as Ge}from"./browser-CyZrnNHo.js";function ue(t){var e=typeof t;return t!=null&&(e=="object"||e=="function")}var Je=typeof global=="object"&&global&&global.Object===Object&&global,Qe=typeof self=="object"&&self&&self.Object===Object&&self,_e=Je||Qe||Function("return this")(),ge=function(){return _e.Date.now()},Xe=/\s/;function Ze(t){for(var e=t.length;e--&&Xe.test(t.charAt(e)););return e}var qe=/^\s+/;function et(t){return t&&t.slice(0,Ze(t)+1).replace(qe,"")}var le=_e.Symbol,Ne=Object.prototype,tt=Ne.hasOwnProperty,nt=Ne.toString,re=le?le.toStringTag:void 0;function st(t){var e=tt.call(t,re),n=t[re];try{t[re]=void 0;var s=!0}catch{}var r=nt.call(t);return s&&(e?t[re]=n:delete t[re]),r}var rt=Object.prototype,it=rt.toString;function ot(t){return it.call(t)}var at="[object Null]",ct="[object Undefined]",Ae=le?le.toStringTag:void 0;function ut(t){return t==null?t===void 0?ct:at:Ae&&Ae in Object(t)?st(t):ot(t)}function lt(t){return t!=null&&typeof t=="object"}var ht="[object Symbol]";function dt(t){return typeof t=="symbol"||lt(t)&&ut(t)==ht}var Me=NaN,ft=/^[-+]0x[0-9a-f]+$/i,gt=/^0b[01]+$/i,mt=/^0o[0-7]+$/i,pt=parseInt;function $e(t){if(typeof t=="number")return t;if(dt(t))return Me;if(ue(t)){var e=typeof t.valueOf=="function"?t.valueOf():t;t=ue(e)?e+"":e}if(typeof t!="string")return t===0?t:+t;t=et(t);var n=gt.test(t);return n||mt.test(t)?pt(t.slice(2),n?2:8):ft.test(t)?Me:+t}var xt="Expected a function",yt=Math.max,bt=Math.min;function Fe(t,e,n){var s,r,i,a,o,c,u=0,h=!1,f=!1,y=!0;if(typeof t!="function")throw new TypeError(xt);e=$e(e)||0,ue(n)&&(h=!!n.leading,f="maxWait"in n,i=f?yt($e(n.maxWait)||0,e):i,y="trailing"in n?!!n.trailing:y);function b(m){var d=s,M=r;return s=r=void 0,u=m,a=t.apply(M,d),a}function w(m){return u=m,o=setTimeout(F,e),h?b(m):a}function v(m){var d=m-c,M=m-u,I=e-d;return f?bt(I,i-M):I}function T(m){var d=m-c,M=m-u;return c===void 0||d>=e||d<0||f&&M>=i}function F(){var m=ge();if(T(m))return B(m);o=setTimeout(F,v(m))}function B(m){return o=void 0,y&&s?b(m):(s=r=void 0,a)}function R(){o!==void 0&&clearTimeout(o),u=0,s=c=r=o=void 0}function A(){return o===void 0?a:B(ge())}function j(){var m=ge(),d=T(m);if(s=arguments,r=this,c=m,d){if(o===void 0)return w(c);if(f)return clearTimeout(o),o=setTimeout(F,e),b(c)}return o===void 0&&(o=setTimeout(F,e)),a}return j.cancel=R,j.flush=A,j}var wt="Expected a function";function kt(t,e,n){var s=!0,r=!0;if(typeof t!="function")throw new TypeError(wt);return ue(n)&&(s="leading"in n?!!n.leading:s,r="trailing"in n?!!n.trailing:r),Fe(t,e,{leading:s,maxWait:e,trailing:r})}function Be(t){if(!t)return"";let e=t;e=e.replace(/\r\n/g,`
`).replace(/\r/g,`
`),e=e.replace(/</g,"&lt;").replace(/>/g,"&gt;");const n=[];e=e.replace(/```(\w+)?\n([\s\S]*?)```/g,(r,i,a)=>{const o=n.length,c=i||"text";return n.push(`<pre class="code-block"><code class="language-${c}">${a.trim()}</code></pre>`),`__CODE_BLOCK_${o}__`});const s=[];return e=e.replace(/`([^`\n]+)`/g,(r,i)=>{const a=s.length;return s.push(`<code class="inline-code">${i}</code>`),`__INLINE_CODE_${a}__`}),e=Ct(e),e=e.replace(/^#{6}\s+(.*$)/gm,"<h6>$1</h6>"),e=e.replace(/^#{5}\s+(.*$)/gm,"<h5>$1</h5>"),e=e.replace(/^#{4}\s+(.*$)/gm,"<h4>$1</h4>"),e=e.replace(/^#{3}\s+(.*$)/gm,"<h3>$1</h3>"),e=e.replace(/^#{2}\s+(.*$)/gm,"<h2>$1</h2>"),e=e.replace(/^#{1}\s+(.*$)/gm,"<h1>$1</h1>"),e=e.replace(/^(-{3,}|\*{3,}|_{3,})$/gm,'<hr class="markdown-divider">'),e=At(e),e=Mt(e),e=$t(e),e=vt(e),e=Et(e),n.forEach((r,i)=>{e=e.replace(`__CODE_BLOCK_${i}__`,r)}),s.forEach((r,i)=>{e=e.replace(`__INLINE_CODE_${i}__`,r)}),e=e.replace(/\n{3,}/g,`

`),e=e.replace(/^\s+|\s+$/g,""),e}function Ct(t){const e=/^(\|.*\|)\n(\|[-\s|:]*\|)\n((?:\|.*\|\n?)*)/gm;return t.replace(e,(n,s,r,i)=>{const a=s.split("|").slice(1,-1).map(c=>`<th>${c.trim()}</th>`).join(""),o=i.trim().split(`
`).map(c=>`<tr>${c.split("|").slice(1,-1).map(h=>`<td>${h.trim()}</td>`).join("")}</tr>`).join("");return`<table class="markdown-table"><thead><tr>${a}</tr></thead><tbody>${o}</tbody></table>`})}function At(t){const e=t.split(`
`),n=[];let s=!1,r=[];for(const i of e)i.match(/^>\s/)?(s||(s=!0,r=[]),r.push(i.replace(/^>\s?/,""))):(s&&(n.push(`<blockquote class="markdown-quote">${r.join("<br>")}</blockquote>`),s=!1,r=[]),n.push(i));return s&&r.length>0&&n.push(`<blockquote class="markdown-quote">${r.join("<br>")}</blockquote>`),n.join(`
`)}function Mt(t){const e=t.split(`
`),n=[];let s=null;for(const r of e){const i=r.match(/^(\s*)[-*+]\s+(.+)$/),a=r.match(/^(\s*)\d+\.\s+(.+)$/);if(i){const[,o,c]=i,u=Math.floor(o.length/2);(!s||s.type!=="ul")&&(s&&n.push(oe(s)),s={type:"ul",items:[]}),s.items.push(`<li class="list-item level-${u}">${c}</li>`)}else if(a){const[,o,c]=a,u=Math.floor(o.length/2);(!s||s.type!=="ol")&&(s&&n.push(oe(s)),s={type:"ol",items:[]}),s.items.push(`<li class="list-item level-${u}">${c}</li>`)}else s&&(n.push(oe(s)),s=null),n.push(r)}return s&&n.push(oe(s)),n.join(`
`)}function oe(t){return`<${t.type} class="markdown-list">${t.items.join("")}</${t.type}>`}function $t(t){return t=t.replace(/~~(.*?)~~/g,'<del class="strikethrough">$1</del>'),t=t.replace(/\*\*(.*?)\*\*/g,'<strong class="bold">$1</strong>'),t=t.replace(new RegExp("(?<!\\*)\\*(?!\\*)([^*]+)\\*(?!\\*)","g"),'<em class="italic">$1</em>'),t=t.replace(/==(.*?)==/g,'<mark class="highlight">$1</mark>'),t}function vt(t){return t=t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" class="markdown-image" loading="lazy">'),t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>'),t=t.replace(/<(https?:\/\/[^>]+)>/g,'<a href="$1" class="markdown-link auto-link" target="_blank" rel="noopener noreferrer">$1</a>'),t}function Et(t){return t.split(/\n\s*\n/).map(n=>{if(n=n.trim(),!n)return"";if(n.match(/^<(h[1-6]|div|blockquote|ul|ol|table|pre|hr)/))return n;const s=n.split(`
`).filter(r=>r.trim());return s.length===1?`<p class="markdown-paragraph">${s[0]}</p>`:`<p class="markdown-paragraph">${s.join("<br>")}</p>`}).join(`

`)}const jt=`
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
`;function St(t="markdown-styles"){if(!document.querySelector(`#${t}`)){const e=document.createElement("style");e.id=t,e.textContent=jt,document.head.appendChild(e)}}const Dt=({onCopyOriginal:t,onCopyTranslation:e,hasResult:n,hasInput:s})=>{const[r,i]=E.useState("复制原文"),[a,o]=E.useState("复制译文"),[c,u]=E.useState(!1),[h,f]=E.useState(!1),y=async()=>{if(!c){u(!0),i("复制中...");try{await t()?(i("已复制"),setTimeout(()=>i("复制原文"),1500)):(i("复制失败"),setTimeout(()=>i("复制原文"),1500))}catch{i("复制失败"),setTimeout(()=>i("复制原文"),1500)}finally{u(!1)}}},b=async()=>{if(!h){f(!0),o("复制中...");try{await e()?(o("已复制"),setTimeout(()=>o("复制译文"),1500)):(o("复制失败"),setTimeout(()=>o("复制译文"),1500))}catch{o("复制失败"),setTimeout(()=>o("复制译文"),1500)}finally{f(!1)}}};return l.jsxs("div",{className:"copy-footer",children:[l.jsx("button",{className:"copy-footer-btn copy-original-btn",onClick:y,disabled:!s||c,title:s?"复制原文到剪贴板":"请先输入文本",children:r}),l.jsx("button",{className:"copy-footer-btn copy-translation-btn",onClick:b,disabled:!n||h,title:n?"复制译文到剪贴板":"请先进行翻译",children:a})]})};function G(t){return Array.isArray?Array.isArray(t):Oe(t)==="[object Array]"}function Tt(t){if(typeof t=="string")return t;let e=t+"";return e=="0"&&1/t==-1/0?"-0":e}function _t(t){return t==null?"":Tt(t)}function V(t){return typeof t=="string"}function Re(t){return typeof t=="number"}function Nt(t){return t===!0||t===!1||Ft(t)&&Oe(t)=="[object Boolean]"}function Ie(t){return typeof t=="object"}function Ft(t){return Ie(t)&&t!==null}function Y(t){return t!=null}function me(t){return!t.trim().length}function Oe(t){return t==null?t===void 0?"[object Undefined]":"[object Null]":Object.prototype.toString.call(t)}const Bt="Incorrect 'index' type",Rt=t=>`Invalid value for key ${t}`,It=t=>`Pattern length exceeds max of ${t}.`,Ot=t=>`Missing ${t} property in key`,Lt=t=>`Property 'weight' in key '${t}' must be a positive integer`,ve=Object.prototype.hasOwnProperty;class Ht{constructor(e){this._keys=[],this._keyMap={};let n=0;e.forEach(s=>{let r=Le(s);this._keys.push(r),this._keyMap[r.id]=r,n+=r.weight}),this._keys.forEach(s=>{s.weight/=n})}get(e){return this._keyMap[e]}keys(){return this._keys}toJSON(){return JSON.stringify(this._keys)}}function Le(t){let e=null,n=null,s=null,r=1,i=null;if(V(t)||G(t))s=t,e=Ee(t),n=pe(t);else{if(!ve.call(t,"name"))throw new Error(Ot("name"));const a=t.name;if(s=a,ve.call(t,"weight")&&(r=t.weight,r<=0))throw new Error(Lt(a));e=Ee(a),n=pe(a),i=t.getFn}return{path:e,id:n,weight:r,src:s,getFn:i}}function Ee(t){return G(t)?t:t.split(".")}function pe(t){return G(t)?t.join("."):t}function Wt(t,e){let n=[],s=!1;const r=(i,a,o)=>{if(Y(i))if(!a[o])n.push(i);else{let c=a[o];const u=i[c];if(!Y(u))return;if(o===a.length-1&&(V(u)||Re(u)||Nt(u)))n.push(_t(u));else if(G(u)){s=!0;for(let h=0,f=u.length;h<f;h+=1)r(u[h],a,o+1)}else a.length&&r(u,a,o+1)}};return r(t,V(e)?e.split("."):e,0),s?n:n[0]}const Pt={includeMatches:!1,findAllMatches:!1,minMatchCharLength:1},zt={isCaseSensitive:!1,ignoreDiacritics:!1,includeScore:!1,keys:[],shouldSort:!0,sortFn:(t,e)=>t.score===e.score?t.idx<e.idx?-1:1:t.score<e.score?-1:1},Kt={location:0,threshold:.6,distance:100},Yt={useExtendedSearch:!1,getFn:Wt,ignoreLocation:!1,ignoreFieldNorm:!1,fieldNormWeight:1};var $={...zt,...Pt,...Kt,...Yt};const Ut=/[^ ]+/g;function Vt(t=1,e=3){const n=new Map,s=Math.pow(10,e);return{get(r){const i=r.match(Ut).length;if(n.has(i))return n.get(i);const a=1/Math.pow(i,.5*t),o=parseFloat(Math.round(a*s)/s);return n.set(i,o),o},clear(){n.clear()}}}class Ce{constructor({getFn:e=$.getFn,fieldNormWeight:n=$.fieldNormWeight}={}){this.norm=Vt(n,3),this.getFn=e,this.isCreated=!1,this.setIndexRecords()}setSources(e=[]){this.docs=e}setIndexRecords(e=[]){this.records=e}setKeys(e=[]){this.keys=e,this._keysMap={},e.forEach((n,s)=>{this._keysMap[n.id]=s})}create(){this.isCreated||!this.docs.length||(this.isCreated=!0,V(this.docs[0])?this.docs.forEach((e,n)=>{this._addString(e,n)}):this.docs.forEach((e,n)=>{this._addObject(e,n)}),this.norm.clear())}add(e){const n=this.size();V(e)?this._addString(e,n):this._addObject(e,n)}removeAt(e){this.records.splice(e,1);for(let n=e,s=this.size();n<s;n+=1)this.records[n].i-=1}getValueForItemAtKeyId(e,n){return e[this._keysMap[n]]}size(){return this.records.length}_addString(e,n){if(!Y(e)||me(e))return;let s={v:e,i:n,n:this.norm.get(e)};this.records.push(s)}_addObject(e,n){let s={i:n,$:{}};this.keys.forEach((r,i)=>{let a=r.getFn?r.getFn(e):this.getFn(e,r.path);if(Y(a)){if(G(a)){let o=[];const c=[{nestedArrIndex:-1,value:a}];for(;c.length;){const{nestedArrIndex:u,value:h}=c.pop();if(Y(h))if(V(h)&&!me(h)){let f={v:h,i:u,n:this.norm.get(h)};o.push(f)}else G(h)&&h.forEach((f,y)=>{c.push({nestedArrIndex:y,value:f})})}s.$[i]=o}else if(V(a)&&!me(a)){let o={v:a,n:this.norm.get(a)};s.$[i]=o}}}),this.records.push(s)}toJSON(){return{keys:this.keys,records:this.records}}}function He(t,e,{getFn:n=$.getFn,fieldNormWeight:s=$.fieldNormWeight}={}){const r=new Ce({getFn:n,fieldNormWeight:s});return r.setKeys(t.map(Le)),r.setSources(e),r.create(),r}function Gt(t,{getFn:e=$.getFn,fieldNormWeight:n=$.fieldNormWeight}={}){const{keys:s,records:r}=t,i=new Ce({getFn:e,fieldNormWeight:n});return i.setKeys(s),i.setIndexRecords(r),i}function ae(t,{errors:e=0,currentLocation:n=0,expectedLocation:s=0,distance:r=$.distance,ignoreLocation:i=$.ignoreLocation}={}){const a=e/t.length;if(i)return a;const o=Math.abs(s-n);return r?a+o/r:o?1:a}function Jt(t=[],e=$.minMatchCharLength){let n=[],s=-1,r=-1,i=0;for(let a=t.length;i<a;i+=1){let o=t[i];o&&s===-1?s=i:!o&&s!==-1&&(r=i-1,r-s+1>=e&&n.push([s,r]),s=-1)}return t[i-1]&&i-s>=e&&n.push([s,i-1]),n}const q=32;function Qt(t,e,n,{location:s=$.location,distance:r=$.distance,threshold:i=$.threshold,findAllMatches:a=$.findAllMatches,minMatchCharLength:o=$.minMatchCharLength,includeMatches:c=$.includeMatches,ignoreLocation:u=$.ignoreLocation}={}){if(e.length>q)throw new Error(It(q));const h=e.length,f=t.length,y=Math.max(0,Math.min(s,f));let b=i,w=y;const v=o>1||c,T=v?Array(f):[];let F;for(;(F=t.indexOf(e,w))>-1;){let d=ae(e,{currentLocation:F,expectedLocation:y,distance:r,ignoreLocation:u});if(b=Math.min(d,b),w=F+h,v){let M=0;for(;M<h;)T[F+M]=1,M+=1}}w=-1;let B=[],R=1,A=h+f;const j=1<<h-1;for(let d=0;d<h;d+=1){let M=0,I=A;for(;M<I;)ae(e,{errors:d,currentLocation:y+I,expectedLocation:y,distance:r,ignoreLocation:u})<=b?M=I:A=I,I=Math.floor((A-M)/2+M);A=I;let _=Math.max(1,y-I+1),N=a?f:Math.min(y+I,f)+h,z=Array(N+2);z[N+1]=(1<<d)-1;for(let k=N;k>=_;k-=1){let p=k-1,g=n[t.charAt(p)];if(v&&(T[p]=+!!g),z[k]=(z[k+1]<<1|1)&g,d&&(z[k]|=(B[k+1]|B[k])<<1|1|B[k+1]),z[k]&j&&(R=ae(e,{errors:d,currentLocation:p,expectedLocation:y,distance:r,ignoreLocation:u}),R<=b)){if(b=R,w=p,w<=y)break;_=Math.max(1,2*y-w)}}if(ae(e,{errors:d+1,currentLocation:y,expectedLocation:y,distance:r,ignoreLocation:u})>b)break;B=z}const m={isMatch:w>=0,score:Math.max(.001,R)};if(v){const d=Jt(T,o);d.length?c&&(m.indices=d):m.isMatch=!1}return m}function Xt(t){let e={};for(let n=0,s=t.length;n<s;n+=1){const r=t.charAt(n);e[r]=(e[r]||0)|1<<s-n-1}return e}const he=String.prototype.normalize?(t=>t.normalize("NFD").replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g,"")):(t=>t);class We{constructor(e,{location:n=$.location,threshold:s=$.threshold,distance:r=$.distance,includeMatches:i=$.includeMatches,findAllMatches:a=$.findAllMatches,minMatchCharLength:o=$.minMatchCharLength,isCaseSensitive:c=$.isCaseSensitive,ignoreDiacritics:u=$.ignoreDiacritics,ignoreLocation:h=$.ignoreLocation}={}){if(this.options={location:n,threshold:s,distance:r,includeMatches:i,findAllMatches:a,minMatchCharLength:o,isCaseSensitive:c,ignoreDiacritics:u,ignoreLocation:h},e=c?e:e.toLowerCase(),e=u?he(e):e,this.pattern=e,this.chunks=[],!this.pattern.length)return;const f=(b,w)=>{this.chunks.push({pattern:b,alphabet:Xt(b),startIndex:w})},y=this.pattern.length;if(y>q){let b=0;const w=y%q,v=y-w;for(;b<v;)f(this.pattern.substr(b,q),b),b+=q;if(w){const T=y-q;f(this.pattern.substr(T),T)}}else f(this.pattern,0)}searchIn(e){const{isCaseSensitive:n,ignoreDiacritics:s,includeMatches:r}=this.options;if(e=n?e:e.toLowerCase(),e=s?he(e):e,this.pattern===e){let v={isMatch:!0,score:0};return r&&(v.indices=[[0,e.length-1]]),v}const{location:i,distance:a,threshold:o,findAllMatches:c,minMatchCharLength:u,ignoreLocation:h}=this.options;let f=[],y=0,b=!1;this.chunks.forEach(({pattern:v,alphabet:T,startIndex:F})=>{const{isMatch:B,score:R,indices:A}=Qt(e,v,T,{location:i+F,distance:a,threshold:o,findAllMatches:c,minMatchCharLength:u,includeMatches:r,ignoreLocation:h});B&&(b=!0),y+=R,B&&A&&(f=[...f,...A])});let w={isMatch:b,score:b?y/this.chunks.length:1};return b&&r&&(w.indices=f),w}}class Q{constructor(e){this.pattern=e}static isMultiMatch(e){return je(e,this.multiRegex)}static isSingleMatch(e){return je(e,this.singleRegex)}search(){}}function je(t,e){const n=t.match(e);return n?n[1]:null}class Zt extends Q{constructor(e){super(e)}static get type(){return"exact"}static get multiRegex(){return/^="(.*)"$/}static get singleRegex(){return/^=(.*)$/}search(e){const n=e===this.pattern;return{isMatch:n,score:n?0:1,indices:[0,this.pattern.length-1]}}}class qt extends Q{constructor(e){super(e)}static get type(){return"inverse-exact"}static get multiRegex(){return/^!"(.*)"$/}static get singleRegex(){return/^!(.*)$/}search(e){const s=e.indexOf(this.pattern)===-1;return{isMatch:s,score:s?0:1,indices:[0,e.length-1]}}}class en extends Q{constructor(e){super(e)}static get type(){return"prefix-exact"}static get multiRegex(){return/^\^"(.*)"$/}static get singleRegex(){return/^\^(.*)$/}search(e){const n=e.startsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[0,this.pattern.length-1]}}}class tn extends Q{constructor(e){super(e)}static get type(){return"inverse-prefix-exact"}static get multiRegex(){return/^!\^"(.*)"$/}static get singleRegex(){return/^!\^(.*)$/}search(e){const n=!e.startsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[0,e.length-1]}}}class nn extends Q{constructor(e){super(e)}static get type(){return"suffix-exact"}static get multiRegex(){return/^"(.*)"\$$/}static get singleRegex(){return/^(.*)\$$/}search(e){const n=e.endsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[e.length-this.pattern.length,e.length-1]}}}class sn extends Q{constructor(e){super(e)}static get type(){return"inverse-suffix-exact"}static get multiRegex(){return/^!"(.*)"\$$/}static get singleRegex(){return/^!(.*)\$$/}search(e){const n=!e.endsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[0,e.length-1]}}}class Pe extends Q{constructor(e,{location:n=$.location,threshold:s=$.threshold,distance:r=$.distance,includeMatches:i=$.includeMatches,findAllMatches:a=$.findAllMatches,minMatchCharLength:o=$.minMatchCharLength,isCaseSensitive:c=$.isCaseSensitive,ignoreDiacritics:u=$.ignoreDiacritics,ignoreLocation:h=$.ignoreLocation}={}){super(e),this._bitapSearch=new We(e,{location:n,threshold:s,distance:r,includeMatches:i,findAllMatches:a,minMatchCharLength:o,isCaseSensitive:c,ignoreDiacritics:u,ignoreLocation:h})}static get type(){return"fuzzy"}static get multiRegex(){return/^"(.*)"$/}static get singleRegex(){return/^(.*)$/}search(e){return this._bitapSearch.searchIn(e)}}class ze extends Q{constructor(e){super(e)}static get type(){return"include"}static get multiRegex(){return/^'"(.*)"$/}static get singleRegex(){return/^'(.*)$/}search(e){let n=0,s;const r=[],i=this.pattern.length;for(;(s=e.indexOf(this.pattern,n))>-1;)n=s+i,r.push([s,n-1]);const a=!!r.length;return{isMatch:a,score:a?0:1,indices:r}}}const xe=[Zt,ze,en,tn,sn,nn,qt,Pe],Se=xe.length,rn=/ +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/,on="|";function an(t,e={}){return t.split(on).map(n=>{let s=n.trim().split(rn).filter(i=>i&&!!i.trim()),r=[];for(let i=0,a=s.length;i<a;i+=1){const o=s[i];let c=!1,u=-1;for(;!c&&++u<Se;){const h=xe[u];let f=h.isMultiMatch(o);f&&(r.push(new h(f,e)),c=!0)}if(!c)for(u=-1;++u<Se;){const h=xe[u];let f=h.isSingleMatch(o);if(f){r.push(new h(f,e));break}}}return r})}const cn=new Set([Pe.type,ze.type]);class un{constructor(e,{isCaseSensitive:n=$.isCaseSensitive,ignoreDiacritics:s=$.ignoreDiacritics,includeMatches:r=$.includeMatches,minMatchCharLength:i=$.minMatchCharLength,ignoreLocation:a=$.ignoreLocation,findAllMatches:o=$.findAllMatches,location:c=$.location,threshold:u=$.threshold,distance:h=$.distance}={}){this.query=null,this.options={isCaseSensitive:n,ignoreDiacritics:s,includeMatches:r,minMatchCharLength:i,findAllMatches:o,ignoreLocation:a,location:c,threshold:u,distance:h},e=n?e:e.toLowerCase(),e=s?he(e):e,this.pattern=e,this.query=an(this.pattern,this.options)}static condition(e,n){return n.useExtendedSearch}searchIn(e){const n=this.query;if(!n)return{isMatch:!1,score:1};const{includeMatches:s,isCaseSensitive:r,ignoreDiacritics:i}=this.options;e=r?e:e.toLowerCase(),e=i?he(e):e;let a=0,o=[],c=0;for(let u=0,h=n.length;u<h;u+=1){const f=n[u];o.length=0,a=0;for(let y=0,b=f.length;y<b;y+=1){const w=f[y],{isMatch:v,indices:T,score:F}=w.search(e);if(v){if(a+=1,c+=F,s){const B=w.constructor.type;cn.has(B)?o=[...o,...T]:o.push(T)}}else{c=0,a=0,o.length=0;break}}if(a){let y={isMatch:!0,score:c/a};return s&&(y.indices=o),y}}return{isMatch:!1,score:1}}}const ye=[];function ln(...t){ye.push(...t)}function be(t,e){for(let n=0,s=ye.length;n<s;n+=1){let r=ye[n];if(r.condition(t,e))return new r(t,e)}return new We(t,e)}const de={AND:"$and",OR:"$or"},we={PATH:"$path",PATTERN:"$val"},ke=t=>!!(t[de.AND]||t[de.OR]),hn=t=>!!t[we.PATH],dn=t=>!G(t)&&Ie(t)&&!ke(t),De=t=>({[de.AND]:Object.keys(t).map(e=>({[e]:t[e]}))});function Ke(t,e,{auto:n=!0}={}){const s=r=>{let i=Object.keys(r);const a=hn(r);if(!a&&i.length>1&&!ke(r))return s(De(r));if(dn(r)){const c=a?r[we.PATH]:i[0],u=a?r[we.PATTERN]:r[c];if(!V(u))throw new Error(Rt(c));const h={keyId:pe(c),pattern:u};return n&&(h.searcher=be(u,e)),h}let o={children:[],operator:i[0]};return i.forEach(c=>{const u=r[c];G(u)&&u.forEach(h=>{o.children.push(s(h))})}),o};return ke(t)||(t=De(t)),s(t)}function fn(t,{ignoreFieldNorm:e=$.ignoreFieldNorm}){t.forEach(n=>{let s=1;n.matches.forEach(({key:r,norm:i,score:a})=>{const o=r?r.weight:null;s*=Math.pow(a===0&&o?Number.EPSILON:a,(o||1)*(e?1:i))}),n.score=s})}function gn(t,e){const n=t.matches;e.matches=[],Y(n)&&n.forEach(s=>{if(!Y(s.indices)||!s.indices.length)return;const{indices:r,value:i}=s;let a={indices:r,value:i};s.key&&(a.key=s.key.src),s.idx>-1&&(a.refIndex=s.idx),e.matches.push(a)})}function mn(t,e){e.score=t.score}function pn(t,e,{includeMatches:n=$.includeMatches,includeScore:s=$.includeScore}={}){const r=[];return n&&r.push(gn),s&&r.push(mn),t.map(i=>{const{idx:a}=i,o={item:e[a],refIndex:a};return r.length&&r.forEach(c=>{c(i,o)}),o})}class te{constructor(e,n={},s){this.options={...$,...n},this.options.useExtendedSearch,this._keyStore=new Ht(this.options.keys),this.setCollection(e,s)}setCollection(e,n){if(this._docs=e,n&&!(n instanceof Ce))throw new Error(Bt);this._myIndex=n||He(this.options.keys,this._docs,{getFn:this.options.getFn,fieldNormWeight:this.options.fieldNormWeight})}add(e){Y(e)&&(this._docs.push(e),this._myIndex.add(e))}remove(e=()=>!1){const n=[];for(let s=0,r=this._docs.length;s<r;s+=1){const i=this._docs[s];e(i,s)&&(this.removeAt(s),s-=1,r-=1,n.push(i))}return n}removeAt(e){this._docs.splice(e,1),this._myIndex.removeAt(e)}getIndex(){return this._myIndex}search(e,{limit:n=-1}={}){const{includeMatches:s,includeScore:r,shouldSort:i,sortFn:a,ignoreFieldNorm:o}=this.options;let c=V(e)?V(this._docs[0])?this._searchStringList(e):this._searchObjectList(e):this._searchLogical(e);return fn(c,{ignoreFieldNorm:o}),i&&c.sort(a),Re(n)&&n>-1&&(c=c.slice(0,n)),pn(c,this._docs,{includeMatches:s,includeScore:r})}_searchStringList(e){const n=be(e,this.options),{records:s}=this._myIndex,r=[];return s.forEach(({v:i,i:a,n:o})=>{if(!Y(i))return;const{isMatch:c,score:u,indices:h}=n.searchIn(i);c&&r.push({item:i,idx:a,matches:[{score:u,value:i,norm:o,indices:h}]})}),r}_searchLogical(e){const n=Ke(e,this.options),s=(o,c,u)=>{if(!o.children){const{keyId:f,searcher:y}=o,b=this._findMatches({key:this._keyStore.get(f),value:this._myIndex.getValueForItemAtKeyId(c,f),searcher:y});return b&&b.length?[{idx:u,item:c,matches:b}]:[]}const h=[];for(let f=0,y=o.children.length;f<y;f+=1){const b=o.children[f],w=s(b,c,u);if(w.length)h.push(...w);else if(o.operator===de.AND)return[]}return h},r=this._myIndex.records,i={},a=[];return r.forEach(({$:o,i:c})=>{if(Y(o)){let u=s(n,o,c);u.length&&(i[c]||(i[c]={idx:c,item:o,matches:[]},a.push(i[c])),u.forEach(({matches:h})=>{i[c].matches.push(...h)}))}}),a}_searchObjectList(e){const n=be(e,this.options),{keys:s,records:r}=this._myIndex,i=[];return r.forEach(({$:a,i:o})=>{if(!Y(a))return;let c=[];s.forEach((u,h)=>{c.push(...this._findMatches({key:u,value:a[h],searcher:n}))}),c.length&&i.push({idx:o,item:a,matches:c})}),i}_findMatches({key:e,value:n,searcher:s}){if(!Y(n))return[];let r=[];if(G(n))n.forEach(({v:i,i:a,n:o})=>{if(!Y(i))return;const{isMatch:c,score:u,indices:h}=s.searchIn(i);c&&r.push({score:u,key:e,value:i,idx:a,norm:o,indices:h})});else{const{v:i,n:a}=n,{isMatch:o,score:c,indices:u}=s.searchIn(i);o&&r.push({score:c,key:e,value:i,norm:a,indices:u})}return r}}te.version="7.1.0";te.createIndex=He;te.parseIndex=Gt;te.config=$;te.parseQuery=Ke;ln(un);const xn={keys:["original","translated"],threshold:.3,includeScore:!0,includeMatches:!0,minMatchCharLength:1,maxResults:10};function Ye(t,e={}){const[n,s]=E.useState([]),[r,i]=E.useState(!1),a=E.useMemo(()=>({...xn,...e}),[e]),o=E.useMemo(()=>new te(t,a),[t,a]),c=E.useCallback(y=>{if(!y.trim())return s([]),i(!1),[];i(!0);const w=o.search(y,{limit:a.maxResults||10}).map(v=>({item:v.item,score:v.score,matches:v.matches}));return s(w),i(!1),w},[o,a.maxResults]),u=E.useCallback((y,b=5)=>{if(!y.trim())return[];const w=o.search(y,{limit:b*2}),v=new Set;return w.forEach(T=>{if(v.size>=b)return;const F=T.item;if(F.original){const B=F.original.toLowerCase(),R=y.toLowerCase();B.includes(R)&&v.add(F.original)}}),Array.from(v)},[o]),h=E.useCallback(y=>{if(!y.trim()||y.length<2)return[];const b=y.toLowerCase(),w=new Set;return t.forEach(v=>{if(!(w.size>=8)&&v.original){const T=v.original.trim(),F=T.toLowerCase();if(F.startsWith(b)&&T.length>y.length){w.add(T);return}const B=T.split(/[\s\n\r,.!?;:]+/).filter(R=>R.length>0);for(const R of B)if(R.toLowerCase().startsWith(b)&&R.length>y.length){w.add(T);break}F.includes(b)&&!w.has(T)&&w.add(T)}}),Array.from(w).slice(0,5)},[t]),f=E.useCallback(()=>{s([]),i(!1)},[]);return{search:c,getSuggestions:u,getAutoComplete:h,clearResults:f,results:n,isSearching:r}}function yn(t){return Ye(t,{keys:["original","translated"],threshold:.4,includeScore:!0,includeMatches:!0,minMatchCharLength:1,maxResults:20})}function bn(t){return Ye(t,{keys:["original"],threshold:.2,includeScore:!0,minMatchCharLength:2,maxResults:10})}const wn=({value:t,onChange:e,onKeyDown:n,placeholder:s,rows:r=5,history:i,disabled:a=!1})=>{const[o,c]=E.useState(!1),[u,h]=E.useState(-1),[f,y]=E.useState([]),b=E.useRef(null),w=E.useRef(null),{getAutoComplete:v,getSuggestions:T}=bn(i),F=E.useCallback(()=>{if(!b.current)return{word:"",start:0,end:0};const m=b.current,d=m.selectionStart,M=m.value;let I=d,_=d;for(;I>0&&!/[\s\n\r,.!?;:]/.test(M[I-1]);)I--;for(;_<M.length&&!/[\s\n\r,.!?;:]/.test(M[_]);)_++;return{word:M.slice(I,_),start:I,end:_}},[]),B=E.useCallback(()=>{const{word:m}=F();if(m.length>=2){const d=v(m),M=T(m,3),I=Array.from(new Set([...d,...M]));y(I.slice(0,8)),c(I.length>0),h(-1)}else c(!1),y([])},[v,T,F]),R=E.useCallback(m=>{if(!b.current)return;const d=b.current,{start:M,end:I}=F(),_=d.value,N=_.slice(0,M)+m+_.slice(I);e(N),setTimeout(()=>{const z=M+m.length;d.setSelectionRange(z,z),d.focus()},0),c(!1)},[e,F]),A=m=>{e(m.target.value)},j=m=>{if(o&&f.length>0)switch(m.key){case"ArrowDown":m.preventDefault(),h(d=>d<f.length-1?d+1:0);return;case"ArrowUp":m.preventDefault(),h(d=>d>0?d-1:f.length-1);return;case"Tab":if(u>=0){m.preventDefault(),R(f[u]);return}break;case"Enter":if(u>=0){m.preventDefault(),R(f[u]);return}break;case"Escape":m.preventDefault(),c(!1);return}m.key==="Enter"&&(m.ctrlKey||m.metaKey)&&c(!1),n?.(m)};return E.useEffect(()=>{t?B():c(!1)},[t,B]),E.useEffect(()=>{const m=d=>{w.current&&!w.current.contains(d.target)&&!b.current?.contains(d.target)&&c(!1)};return document.addEventListener("mousedown",m),()=>document.removeEventListener("mousedown",m)},[]),l.jsxs("div",{className:"smart-input-container",children:[l.jsx("textarea",{ref:b,value:t,onChange:A,onKeyDown:j,placeholder:s,rows:r,disabled:a,className:"smart-input"}),o&&f.length>0&&l.jsx("div",{ref:w,className:"suggestions-dropdown",children:f.map((m,d)=>l.jsxs("div",{className:`suggestion-item ${d===u?"selected":""}`,onClick:()=>R(m),onMouseEnter:()=>h(d),children:[l.jsx("span",{className:"suggestion-text",children:m}),l.jsx("span",{className:"suggestion-hint",children:"Tab 补全"})]},d))})]})},kn=({reasoningText:t,isTranslating:e})=>{const[n,s]=E.useState(!1),[r,i]=E.useState(!1),a=E.useRef(null),o=E.useRef(null);E.useEffect(()=>{if(a.current&&o.current){const h=a.current.scrollHeight,f=o.current.clientHeight;i(h>f)}},[t]),E.useEffect(()=>{!n&&o.current&&t&&requestAnimationFrame(()=>{o.current&&(o.current.scrollTop=o.current.scrollHeight)})},[t,n]);const c=()=>{s(!n)},u=()=>{const h=t.split(`
`);return h.length>5?h.slice(-5).join(`
`):t};return l.jsxs("div",{className:"collapsible-thinking-chain",children:[l.jsxs("div",{className:"result-label",children:["思维链",!n&&r&&l.jsx("span",{className:"expand-indicator",children:" (点击展开查看完整内容)"}),n&&l.jsx("span",{className:"expand-indicator",children:" (点击收起)"})]}),l.jsx("div",{ref:o,className:`thinking-chain-container ${n?"expanded":"collapsed"}`,onClick:!n&&r?c:void 0,children:l.jsx("div",{ref:a,className:"thinking-chain-content markdown-content",dangerouslySetInnerHTML:{__html:Be(n?t:u())}})}),n&&l.jsx("button",{className:"collapse-btn",onClick:c,children:"收起思维链 ↑"}),e&&l.jsxs("div",{className:"thinking-indicator",children:[l.jsx("span",{className:"thinking-dot"}),l.jsx("span",{className:"thinking-dot"}),l.jsx("span",{className:"thinking-dot"}),"思考中..."]})]})},Cn=({translationState:t,setTranslationState:e,onTranslate:n,onCopy:s,onShowHistory:r,onOpenSettings:i,history:a})=>{const o=E.useRef(!1),c=E.useRef(null),u=E.useRef(null);E.useEffect(()=>{St("popup-markdown-styles")},[]);const h=E.useCallback(()=>{if(c.current){const{scrollHeight:v,scrollTop:T,clientHeight:F}=c.current,B=Math.abs(v-T-F)<10;o.current=!B,B||(u.current&&clearTimeout(u.current),u.current=setTimeout(()=>{if(c.current){const{scrollHeight:R,scrollTop:A,clientHeight:j}=c.current;Math.abs(R-A-j)<10&&(o.current=!1)}},1e3))}},[]),f=E.useCallback(kt(h,16),[h]);E.useEffect(()=>{!o.current&&c.current&&(t.translatedText||t.reasoningText)&&requestAnimationFrame(()=>{c.current&&(c.current.scrollTop=c.current.scrollHeight)})},[t.translatedText,t.reasoningText]),E.useEffect(()=>{t.isTranslating&&(o.current=!1,u.current&&(clearTimeout(u.current),u.current=null))},[t.isTranslating]),E.useEffect(()=>()=>{u.current&&clearTimeout(u.current)},[]);const y=v=>{v.key==="Enter"&&(v.ctrlKey||v.metaKey)&&(v.preventDefault(),t.isTranslating||n())},b=async()=>await s(t.translatedText),w=async()=>t.sourceText.trim()?await s(t.sourceText):(alert("请输入要复制的文本"),!1);return l.jsxs("div",{className:"translation-area",children:[l.jsxs("div",{className:"header-section",children:[l.jsx("h1",{children:"人话翻译器"}),l.jsxs("div",{className:"header-buttons",children:[l.jsx("button",{className:"text-btn",onClick:r,children:"历史记录"}),l.jsx("button",{className:"text-btn",onClick:i,children:"设置"})]})]}),l.jsxs("div",{className:"translation-content",children:[l.jsxs("div",{className:"input-section",children:[l.jsx("div",{className:"input-area",children:l.jsx(wn,{value:t.sourceText,onChange:v=>e(T=>({...T,sourceText:v})),onKeyDown:y,placeholder:"请输入要翻译的文本... Ctrl+Enter (Windows) / Cmd+Enter (Mac) 发送，Enter换行",rows:3,history:a,disabled:t.isTranslating})}),l.jsx("div",{className:"translate-btn-wrapper",children:l.jsx("button",{className:"primary-btn",onClick:n,disabled:t.isTranslating,children:t.isTranslating?"翻译中...":"翻译"})})]}),t.showResult&&l.jsx("div",{className:"result-section-wrapper",ref:c,onScroll:f,children:l.jsxs("div",{className:"result-area",children:[l.jsx("div",{className:"result-header",children:l.jsx("span",{children:"翻译结果"})}),l.jsxs("div",{className:"result-wrapper",children:[t.hasReasoning&&t.reasoningText&&l.jsx(kn,{reasoningText:t.reasoningText,isTranslating:t.isTranslating}),l.jsxs("div",{className:"result-section",children:[l.jsx("div",{className:"result-label",children:"译文"}),l.jsx("div",{className:"result-content markdown-content",dangerouslySetInnerHTML:{__html:Be(t.translatedText)}})]})]})]})})]}),l.jsx(Dt,{onCopyOriginal:w,onCopyTranslation:b,hasResult:t.showResult,hasInput:t.sourceText.trim().length>0})]})};var ce={exports:{}},An=ce.exports,Te;function Mn(){return Te||(Te=1,(function(t,e){(function(n,s){t.exports=s()})(An,(function(){var n=1e3,s=6e4,r=36e5,i="millisecond",a="second",o="minute",c="hour",u="day",h="week",f="month",y="quarter",b="year",w="date",v="Invalid Date",T=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,F=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,B={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(k){var p=["th","st","nd","rd"],g=k%100;return"["+k+(p[(g-20)%10]||p[g]||p[0])+"]"}},R=function(k,p,g){var C=String(k);return!C||C.length>=p?k:""+Array(p+1-C.length).join(g)+k},A={s:R,z:function(k){var p=-k.utcOffset(),g=Math.abs(p),C=Math.floor(g/60),x=g%60;return(p<=0?"+":"-")+R(C,2,"0")+":"+R(x,2,"0")},m:function k(p,g){if(p.date()<g.date())return-k(g,p);var C=12*(g.year()-p.year())+(g.month()-p.month()),x=p.clone().add(C,f),S=g-x<0,D=p.clone().add(C+(S?-1:1),f);return+(-(C+(g-x)/(S?x-D:D-x))||0)},a:function(k){return k<0?Math.ceil(k)||0:Math.floor(k)},p:function(k){return{M:f,y:b,w:h,d:u,D:w,h:c,m:o,s:a,ms:i,Q:y}[k]||String(k||"").toLowerCase().replace(/s$/,"")},u:function(k){return k===void 0}},j="en",m={};m[j]=B;var d="$isDayjsObject",M=function(k){return k instanceof z||!(!k||!k[d])},I=function k(p,g,C){var x;if(!p)return j;if(typeof p=="string"){var S=p.toLowerCase();m[S]&&(x=S),g&&(m[S]=g,x=S);var D=p.split("-");if(!x&&D.length>1)return k(D[0])}else{var O=p.name;m[O]=p,x=O}return!C&&x&&(j=x),x||!C&&j},_=function(k,p){if(M(k))return k.clone();var g=typeof p=="object"?p:{};return g.date=k,g.args=arguments,new z(g)},N=A;N.l=I,N.i=M,N.w=function(k,p){return _(k,{locale:p.$L,utc:p.$u,x:p.$x,$offset:p.$offset})};var z=(function(){function k(g){this.$L=I(g.locale,null,!0),this.parse(g),this.$x=this.$x||g.x||{},this[d]=!0}var p=k.prototype;return p.parse=function(g){this.$d=(function(C){var x=C.date,S=C.utc;if(x===null)return new Date(NaN);if(N.u(x))return new Date;if(x instanceof Date)return new Date(x);if(typeof x=="string"&&!/Z$/i.test(x)){var D=x.match(T);if(D){var O=D[2]-1||0,H=(D[7]||"0").substring(0,3);return S?new Date(Date.UTC(D[1],O,D[3]||1,D[4]||0,D[5]||0,D[6]||0,H)):new Date(D[1],O,D[3]||1,D[4]||0,D[5]||0,D[6]||0,H)}}return new Date(x)})(g),this.init()},p.init=function(){var g=this.$d;this.$y=g.getFullYear(),this.$M=g.getMonth(),this.$D=g.getDate(),this.$W=g.getDay(),this.$H=g.getHours(),this.$m=g.getMinutes(),this.$s=g.getSeconds(),this.$ms=g.getMilliseconds()},p.$utils=function(){return N},p.isValid=function(){return this.$d.toString()!==v},p.isSame=function(g,C){var x=_(g);return this.startOf(C)<=x&&x<=this.endOf(C)},p.isAfter=function(g,C){return _(g)<this.startOf(C)},p.isBefore=function(g,C){return this.endOf(C)<_(g)},p.$g=function(g,C,x){return N.u(g)?this[C]:this.set(x,g)},p.unix=function(){return Math.floor(this.valueOf()/1e3)},p.valueOf=function(){return this.$d.getTime()},p.startOf=function(g,C){var x=this,S=!!N.u(C)||C,D=N.p(g),O=function(Z,K){var J=N.w(x.$u?Date.UTC(x.$y,K,Z):new Date(x.$y,K,Z),x);return S?J:J.endOf(u)},H=function(Z,K){return N.w(x.toDate()[Z].apply(x.toDate("s"),(S?[0,0,0,0]:[23,59,59,999]).slice(K)),x)},W=this.$W,P=this.$M,U=this.$D,ee="set"+(this.$u?"UTC":"");switch(D){case b:return S?O(1,0):O(31,11);case f:return S?O(1,P):O(0,P+1);case h:var X=this.$locale().weekStart||0,ne=(W<X?W+7:W)-X;return O(S?U-ne:U+(6-ne),P);case u:case w:return H(ee+"Hours",0);case c:return H(ee+"Minutes",1);case o:return H(ee+"Seconds",2);case a:return H(ee+"Milliseconds",3);default:return this.clone()}},p.endOf=function(g){return this.startOf(g,!1)},p.$set=function(g,C){var x,S=N.p(g),D="set"+(this.$u?"UTC":""),O=(x={},x[u]=D+"Date",x[w]=D+"Date",x[f]=D+"Month",x[b]=D+"FullYear",x[c]=D+"Hours",x[o]=D+"Minutes",x[a]=D+"Seconds",x[i]=D+"Milliseconds",x)[S],H=S===u?this.$D+(C-this.$W):C;if(S===f||S===b){var W=this.clone().set(w,1);W.$d[O](H),W.init(),this.$d=W.set(w,Math.min(this.$D,W.daysInMonth())).$d}else O&&this.$d[O](H);return this.init(),this},p.set=function(g,C){return this.clone().$set(g,C)},p.get=function(g){return this[N.p(g)]()},p.add=function(g,C){var x,S=this;g=Number(g);var D=N.p(C),O=function(P){var U=_(S);return N.w(U.date(U.date()+Math.round(P*g)),S)};if(D===f)return this.set(f,this.$M+g);if(D===b)return this.set(b,this.$y+g);if(D===u)return O(1);if(D===h)return O(7);var H=(x={},x[o]=s,x[c]=r,x[a]=n,x)[D]||1,W=this.$d.getTime()+g*H;return N.w(W,this)},p.subtract=function(g,C){return this.add(-1*g,C)},p.format=function(g){var C=this,x=this.$locale();if(!this.isValid())return x.invalidDate||v;var S=g||"YYYY-MM-DDTHH:mm:ssZ",D=N.z(this),O=this.$H,H=this.$m,W=this.$M,P=x.weekdays,U=x.months,ee=x.meridiem,X=function(K,J,se,ie){return K&&(K[J]||K(C,S))||se[J].slice(0,ie)},ne=function(K){return N.s(O%12||12,K,"0")},Z=ee||function(K,J,se){var ie=K<12?"AM":"PM";return se?ie.toLowerCase():ie};return S.replace(F,(function(K,J){return J||(function(se){switch(se){case"YY":return String(C.$y).slice(-2);case"YYYY":return N.s(C.$y,4,"0");case"M":return W+1;case"MM":return N.s(W+1,2,"0");case"MMM":return X(x.monthsShort,W,U,3);case"MMMM":return X(U,W);case"D":return C.$D;case"DD":return N.s(C.$D,2,"0");case"d":return String(C.$W);case"dd":return X(x.weekdaysMin,C.$W,P,2);case"ddd":return X(x.weekdaysShort,C.$W,P,3);case"dddd":return P[C.$W];case"H":return String(O);case"HH":return N.s(O,2,"0");case"h":return ne(1);case"hh":return ne(2);case"a":return Z(O,H,!0);case"A":return Z(O,H,!1);case"m":return String(H);case"mm":return N.s(H,2,"0");case"s":return String(C.$s);case"ss":return N.s(C.$s,2,"0");case"SSS":return N.s(C.$ms,3,"0");case"Z":return D}return null})(K)||D.replace(":","")}))},p.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},p.diff=function(g,C,x){var S,D=this,O=N.p(C),H=_(g),W=(H.utcOffset()-this.utcOffset())*s,P=this-H,U=function(){return N.m(D,H)};switch(O){case b:S=U()/12;break;case f:S=U();break;case y:S=U()/3;break;case h:S=(P-W)/6048e5;break;case u:S=(P-W)/864e5;break;case c:S=P/r;break;case o:S=P/s;break;case a:S=P/n;break;default:S=P}return x?S:N.a(S)},p.daysInMonth=function(){return this.endOf(f).$D},p.$locale=function(){return m[this.$L]},p.locale=function(g,C){if(!g)return this.$L;var x=this.clone(),S=I(g,C,!0);return S&&(x.$L=S),x},p.clone=function(){return N.w(this.$d,this)},p.toDate=function(){return new Date(this.valueOf())},p.toJSON=function(){return this.isValid()?this.toISOString():null},p.toISOString=function(){return this.$d.toISOString()},p.toString=function(){return this.$d.toUTCString()},k})(),fe=z.prototype;return _.prototype=fe,[["$ms",i],["$s",a],["$m",o],["$H",c],["$W",u],["$M",f],["$y",b],["$D",w]].forEach((function(k){fe[k[1]]=function(p){return this.$g(p,k[0],k[1])}})),_.extend=function(k,p){return k.$i||(k(p,z,_),k.$i=!0),_},_.locale=I,_.isDayjs=M,_.unix=function(k){return _(1e3*k)},_.en=m[j],_.Ls=m,_.p={},_}))})(ce)),ce.exports}var $n=Mn();const vn=Ue($n);function En(t){return vn(t).format("YYYY-MM-DD HH:mm")}const jn=({history:t,searchTerm:e,onSearchChange:n,onBack:s,onRestore:r,onDelete:i,onClear:a,onExport:o,onImport:c})=>{const u=E.useRef(null),[h,f]=E.useState(!1),{search:y,results:b}=yn(t),w=E.useCallback(Fe(d=>{n(d),d.trim()&&y(d)},300),[n,y]),v=d=>{w(d.target.value)},T=async()=>{if(!h&&confirm("确定要清除所有历史记录吗？此操作不可撤销。")){f(!0);try{await a()}finally{f(!1)}}},F=async(d,M)=>{M.stopPropagation(),confirm("确定要删除这条历史记录吗？")&&await i(d)},B=e.trim()===""?t:b.map(d=>d.item),R=()=>{u.current?.click()},A=d=>{const M=d.target.files?.[0];M&&(c(M),d.target.value="")},j=(d,M)=>{const I=d.original.length>30?d.original.substring(0,30)+"...":d.original;return l.jsxs("div",{className:"history-item",onClick:()=>r(d),children:[l.jsx("div",{className:"history-item-title",children:I}),l.jsxs("div",{className:"history-meta",children:[l.jsx("div",{className:"history-item-time",children:En(d.timestamp)}),l.jsxs("div",{className:"history-actions",children:[l.jsx("button",{className:"history-action-btn history-restore",onClick:_=>{_.stopPropagation(),r(d)},children:"恢复"}),l.jsx("button",{className:"history-action-btn history-delete",onClick:_=>F(d.original,_),children:"删除"})]})]}),d.hasReasoning&&l.jsx("div",{className:"history-tags",children:l.jsx("span",{className:"history-tag",children:"含思维链"})})]},`${d.timestamp}-${M}`)},m=()=>{const d=e.trim()!==""?`没有符合"${e}"的搜索结果`:"暂无翻译历史";return l.jsxs("div",{className:"empty-state-container",children:[l.jsx("p",{className:"empty-history",children:d}),l.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]})};return l.jsxs("div",{className:"history-panel visible",children:[l.jsxs("div",{className:"history-panel-header",children:[l.jsxs("div",{className:"history-panel-title",children:[l.jsx("div",{className:"back-button",onClick:s,children:l.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:l.jsx("path",{d:"M19 12H5M12 19l-7-7 7-7"})})}),l.jsx("h2",{children:"翻译历史"})]}),l.jsx("div",{className:"history-search-container",children:l.jsx("input",{type:"text",className:"history-search",placeholder:"搜索历史记录...",defaultValue:e,onChange:v})})]}),l.jsx("div",{className:"history-panel-content",children:B.length>0?l.jsxs(l.Fragment,{children:[B.map(j),l.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]}):m()}),l.jsxs("div",{className:"history-panel-footer",children:[l.jsxs("button",{className:"footer-btn",onClick:T,disabled:h,children:[l.jsx("div",{className:"footer-btn-icon",children:l.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[l.jsx("polyline",{points:"3 6 5 6 21 6"}),l.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})}),l.jsx("span",{children:h?"清空中...":"清空"})]}),l.jsxs("button",{className:"footer-btn",onClick:o,children:[l.jsx("div",{className:"footer-btn-icon",children:l.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[l.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),l.jsx("polyline",{points:"17 8 12 3 7 8"}),l.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]})}),l.jsx("span",{children:"导出"})]}),l.jsxs("button",{className:"footer-btn",onClick:R,children:[l.jsx("div",{className:"footer-btn-icon",children:l.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[l.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),l.jsx("polyline",{points:"7 10 12 15 17 10"}),l.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]})}),l.jsx("span",{children:"导入"})]})]}),l.jsx("input",{ref:u,type:"file",accept:".json",style:{display:"none"},onChange:A})]})};function Sn(){const[t,e]=E.useState({sourceText:"",translatedText:"",reasoningText:"",isTranslating:!1,hasReasoning:!1,showResult:!1}),[n,s]=E.useState(!1),[r,i]=E.useState([]),[a,o]=E.useState("");E.useEffect(()=>{const A=(j,m,d)=>(j.action==="updateTranslation"&&(j.error?e(M=>({...M,isTranslating:!1,translatedText:`错误: ${j.error}`})):e(M=>({...M,translatedText:j.content||M.translatedText,reasoningText:j.reasoningContent||M.reasoningText,hasReasoning:j.hasReasoning||!1,showResult:!0,isTranslating:!j.done})),d({success:!0})),!1);if(L.runtime.onMessage)return L.runtime.onMessage.addListener(A),()=>{L.runtime.onMessage.removeListener(A)}},[]),E.useEffect(()=>{f()},[]);const c=()=>{},u=async()=>{const A=t.sourceText.trim();if(console.log("LHG:popup/App.tsx text:::",A),!A){alert("请输入要翻译的文本");return}if(!t.isTranslating){e(j=>({...j,isTranslating:!0,showResult:!0,translatedText:"",reasoningText:"",hasReasoning:!1}));try{L?.runtime&&(await L.runtime.sendMessage({action:"cleanup"}),await L.runtime.sendMessage({action:"translate",text:A,source:"popup"}))}catch(j){j.message?.includes("Receiving end does not exist")||e(m=>({...m,isTranslating:!1,translatedText:`发生错误：${j.message}`}))}}},h=async A=>{try{return await navigator.clipboard.writeText(A),!0}catch(j){return console.error("复制失败:",j),!1}},f=()=>{L?.runtime&&L.runtime.sendMessage({action:"getHistory"},A=>{A&&A.success&&i(A.history||[])})},y=()=>{s(!0),o(""),f()},b=()=>{s(!1)},w=A=>{e({sourceText:A.original,translatedText:A.translated,reasoningText:A.reasoning||"",hasReasoning:A.hasReasoning||!1,isTranslating:!1,showResult:!0}),b()},v=A=>{confirm("确定要删除这条历史记录吗？")&&L?.runtime&&L.runtime.sendMessage({action:"deleteHistoryItem",original:A},j=>{j&&j.success?f():alert("删除失败："+(j?.error||"未知错误"))})},T=()=>{confirm("确定要清空所有历史记录吗？此操作不可撤销。")&&L?.runtime&&L.runtime.sendMessage({action:"clearHistory"},A=>{A&&A.success?i([]):alert("清空历史记录失败："+(A?.error||"未知错误"))})},F=()=>{L?.runtime&&L.runtime.sendMessage({action:"getHistory"},A=>{if(A&&A.success&&A.history.length>0){const j=JSON.stringify(A.history,null,2),m=new Blob([j],{type:"application/json"}),d=URL.createObjectURL(m),M=document.createElement("a");M.href=d,M.download=`translation_history_${new Date().toISOString().slice(0,10)}.json`,M.click(),setTimeout(()=>URL.revokeObjectURL(d),100)}else alert("暂无历史记录可导出")})},B=A=>{const j=new FileReader;j.onload=m=>{try{const d=JSON.parse(m.target?.result);Array.isArray(d)?L?.runtime&&L.runtime.sendMessage({action:"importHistory",history:d},M=>{M&&M.success?(alert("历史记录导入成功"),f()):alert("导入失败："+(M?.error||"未知错误"))}):alert("导入的文件格式不正确")}catch(d){alert("导入失败：文件解析错误"),console.error(d)}},j.readAsText(A)},R=()=>{L?.runtime&&L.runtime.openOptionsPage()};return E.useEffect(()=>{const A=()=>{L?.runtime&&L.runtime.sendMessage({action:"cleanup"})};return window.addEventListener("beforeunload",A),()=>{window.removeEventListener("beforeunload",A),L?.runtime&&L.runtime.sendMessage({action:"cleanup"})}},[]),l.jsx("div",{className:"container",onScroll:c,children:n?l.jsx(jn,{history:r,searchTerm:a,onSearchChange:o,onBack:b,onRestore:w,onDelete:v,onClear:T,onExport:F,onImport:B}):l.jsx(Cn,{translationState:t,setTranslationState:e,onTranslate:u,onCopy:h,onShowHistory:y,onOpenSettings:R,onScroll:()=>{},history:r})})}Ve.createRoot(document.getElementById("root")).render(l.jsx(Ge.StrictMode,{children:l.jsx(Sn,{})}));
