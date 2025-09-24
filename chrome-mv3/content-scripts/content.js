var Nt=Object.defineProperty;var _t=(P,S,m)=>S in P?Nt(P,S,{enumerable:!0,configurable:!0,writable:!0,value:m}):P[S]=m;var d=(P,S,m)=>_t(P,typeof S!="symbol"?S+"":S,m);var content=(function(){"use strict";var tt,et;function P(r){return r}const m=(et=(tt=globalThis.browser)==null?void 0:tt.runtime)!=null&&et.id?globalThis.browser:globalThis.chrome,T={TRANSLATE:"translate",CLEANUP:"cleanup",GET_HISTORY:"getHistory",CLEAR_HISTORY:"clearHistory",DELETE_HISTORY_ITEM:"deleteHistoryItem",IMPORT_HISTORY:"importHistory",UPDATE_TRANSLATION:"updateTranslation",UPDATE_CONTENT_TRANSLATION:"updateContentTranslation",UPDATE_POPUP_TRANSLATION:"updatePopupTranslation",SHOW_TRANSLATION_POPUP:"showTranslationPopup",GET_SELECTED_TEXT:"getSelectedText"},v={OFF:"off",ERROR:"error",WARN:"warn",INFO:"info",DEBUG:"debug"},h={baseUrl:"https://ark.cn-beijing.volces.com/api/v3/chat/completions",model:"kimi-k2-250905",temperature:.7,promptTemplate:"System Prompt(系统提示词): 1. 用通俗易懂的中文解释以下内容(就是说人话,如果遇到英文缩写记得解释,比如OKR说成OKR(Object Key Value))。2. 而且输出内容一定要带合乎情理的 Emoji 优化我的阅读体验。",apiKey:"your_api_key",thinkingEnabled:!1,logLevel:v.OFF};function rt(r){return r&&r.__esModule&&Object.prototype.hasOwnProperty.call(r,"default")?r.default:r}var I={exports:{}},z,X;function ot(){if(X)return z;X=1;var r=1e3,t=r*60,n=t*60,e=n*24,o=e*7,a=e*365.25;z=function(c,s){s=s||{};var i=typeof c;if(i==="string"&&c.length>0)return p(c);if(i==="number"&&isFinite(c))return s.long?l(c):f(c);throw new Error("val is not a non-empty string or a valid number. val="+JSON.stringify(c))};function p(c){if(c=String(c),!(c.length>100)){var s=/^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(c);if(s){var i=parseFloat(s[1]),u=(s[2]||"ms").toLowerCase();switch(u){case"years":case"year":case"yrs":case"yr":case"y":return i*a;case"weeks":case"week":case"w":return i*o;case"days":case"day":case"d":return i*e;case"hours":case"hour":case"hrs":case"hr":case"h":return i*n;case"minutes":case"minute":case"mins":case"min":case"m":return i*t;case"seconds":case"second":case"secs":case"sec":case"s":return i*r;case"milliseconds":case"millisecond":case"msecs":case"msec":case"ms":return i;default:return}}}}function f(c){var s=Math.abs(c);return s>=e?Math.round(c/e)+"d":s>=n?Math.round(c/n)+"h":s>=t?Math.round(c/t)+"m":s>=r?Math.round(c/r)+"s":c+"ms"}function l(c){var s=Math.abs(c);return s>=e?g(c,s,e,"day"):s>=n?g(c,s,n,"hour"):s>=t?g(c,s,t,"minute"):s>=r?g(c,s,r,"second"):c+" ms"}function g(c,s,i,u){var w=s>=i*1.5;return Math.round(c/i)+" "+u+(w?"s":"")}return z}var U,B;function at(){if(B)return U;B=1;function r(t){e.debug=e,e.default=e,e.coerce=g,e.disable=f,e.enable=a,e.enabled=l,e.humanize=ot(),e.destroy=c,Object.keys(t).forEach(s=>{e[s]=t[s]}),e.names=[],e.skips=[],e.formatters={};function n(s){let i=0;for(let u=0;u<s.length;u++)i=(i<<5)-i+s.charCodeAt(u),i|=0;return e.colors[Math.abs(i)%e.colors.length]}e.selectColor=n;function e(s){let i,u=null,w,M;function C(...k){if(!C.enabled)return;const F=C,R=Number(new Date),$t=R-(i||R);F.diff=$t,F.prev=i,F.curr=R,i=R,k[0]=e.coerce(k[0]),typeof k[0]!="string"&&k.unshift("%O");let O=0;k[0]=k[0].replace(/%([a-zA-Z%])/g,(Y,It)=>{if(Y==="%%")return"%";O++;const nt=e.formatters[It];if(typeof nt=="function"){const At=k[O];Y=nt.call(F,At),k.splice(O,1),O--}return Y}),e.formatArgs.call(F,k),(F.log||e.log).apply(F,k)}return C.namespace=s,C.useColors=e.useColors(),C.color=e.selectColor(s),C.extend=o,C.destroy=e.destroy,Object.defineProperty(C,"enabled",{enumerable:!0,configurable:!1,get:()=>u!==null?u:(w!==e.namespaces&&(w=e.namespaces,M=e.enabled(s)),M),set:k=>{u=k}}),typeof e.init=="function"&&e.init(C),C}function o(s,i){const u=e(this.namespace+(typeof i>"u"?":":i)+s);return u.log=this.log,u}function a(s){e.save(s),e.namespaces=s,e.names=[],e.skips=[];const i=(typeof s=="string"?s:"").trim().replace(/\s+/g,",").split(",").filter(Boolean);for(const u of i)u[0]==="-"?e.skips.push(u.slice(1)):e.names.push(u)}function p(s,i){let u=0,w=0,M=-1,C=0;for(;u<s.length;)if(w<i.length&&(i[w]===s[u]||i[w]==="*"))i[w]==="*"?(M=w,C=u,w++):(u++,w++);else if(M!==-1)w=M+1,C++,u=C;else return!1;for(;w<i.length&&i[w]==="*";)w++;return w===i.length}function f(){const s=[...e.names,...e.skips.map(i=>"-"+i)].join(",");return e.enable(""),s}function l(s){for(const i of e.skips)if(p(s,i))return!1;for(const i of e.names)if(p(s,i))return!0;return!1}function g(s){return s instanceof Error?s.stack||s.message:s}function c(){console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.")}return e.enable(e.load()),e}return U=r,U}var G;function st(){return G||(G=1,(function(r,t){t.formatArgs=e,t.save=o,t.load=a,t.useColors=n,t.storage=p(),t.destroy=(()=>{let l=!1;return()=>{l||(l=!0,console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."))}})(),t.colors=["#0000CC","#0000FF","#0033CC","#0033FF","#0066CC","#0066FF","#0099CC","#0099FF","#00CC00","#00CC33","#00CC66","#00CC99","#00CCCC","#00CCFF","#3300CC","#3300FF","#3333CC","#3333FF","#3366CC","#3366FF","#3399CC","#3399FF","#33CC00","#33CC33","#33CC66","#33CC99","#33CCCC","#33CCFF","#6600CC","#6600FF","#6633CC","#6633FF","#66CC00","#66CC33","#9900CC","#9900FF","#9933CC","#9933FF","#99CC00","#99CC33","#CC0000","#CC0033","#CC0066","#CC0099","#CC00CC","#CC00FF","#CC3300","#CC3333","#CC3366","#CC3399","#CC33CC","#CC33FF","#CC6600","#CC6633","#CC9900","#CC9933","#CCCC00","#CCCC33","#FF0000","#FF0033","#FF0066","#FF0099","#FF00CC","#FF00FF","#FF3300","#FF3333","#FF3366","#FF3399","#FF33CC","#FF33FF","#FF6600","#FF6633","#FF9900","#FF9933","#FFCC00","#FFCC33"];function n(){if(typeof window<"u"&&window.process&&(window.process.type==="renderer"||window.process.__nwjs))return!0;if(typeof navigator<"u"&&navigator.userAgent&&navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))return!1;let l;return typeof document<"u"&&document.documentElement&&document.documentElement.style&&document.documentElement.style.WebkitAppearance||typeof window<"u"&&window.console&&(window.console.firebug||window.console.exception&&window.console.table)||typeof navigator<"u"&&navigator.userAgent&&(l=navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/))&&parseInt(l[1],10)>=31||typeof navigator<"u"&&navigator.userAgent&&navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)}function e(l){if(l[0]=(this.useColors?"%c":"")+this.namespace+(this.useColors?" %c":" ")+l[0]+(this.useColors?"%c ":" ")+"+"+r.exports.humanize(this.diff),!this.useColors)return;const g="color: "+this.color;l.splice(1,0,g,"color: inherit");let c=0,s=0;l[0].replace(/%[a-zA-Z%]/g,i=>{i!=="%%"&&(c++,i==="%c"&&(s=c))}),l.splice(s,0,g)}t.log=console.debug||console.log||(()=>{});function o(l){try{l?t.storage.setItem("debug",l):t.storage.removeItem("debug")}catch{}}function a(){let l;try{l=t.storage.getItem("debug")||t.storage.getItem("DEBUG")}catch{}return!l&&typeof process<"u"&&"env"in process&&(l=process.env.DEBUG),l}function p(){try{return localStorage}catch{}}r.exports=at()(t);const{formatters:f}=r.exports;f.j=function(l){try{return JSON.stringify(l)}catch(g){return"[UnexpectedJSONParseError]: "+g.message}}})(I,I.exports)),I.exports}var it=st();const H=rt(it);class lt{constructor(t,n="🔧"){d(this,"debugger");d(this,"emoji");d(this,"namespace");this.namespace=t,this.debugger=H(`human-text:${t}`),this.emoji=n}log(...t){L("log")&&this.debugger(`${this.emoji}`,...t)}info(...t){L("info")&&this.debugger(`${this.emoji} ℹ️`,...t)}warn(...t){L("warn")&&this.debugger(`${this.emoji} ⚠️`,...t)}error(...t){L("error")&&this.debugger(`${this.emoji} ❌`,...t)}success(...t){L("success")&&this.debugger(`${this.emoji} ✅`,...t)}trace(...t){L("trace")&&this.debugger(`${this.emoji} 🐛`,...t)}getNamespace(){return this.namespace}getFullNamespace(){return`human-text:${this.namespace}`}}function E(r,t){return new lt(r,t)}function V(){try{return typeof localStorage<"u"&&localStorage!==null}catch{return!1}}async function ct(){try{const t=(await m.storage.sync.get(["logLevel"])).logLevel||v.OFF;if(ut(t),t===v.OFF)H.disable(),V()&&localStorage.removeItem("debug");else{const n=dt(t);H.enable(n),V()&&localStorage.setItem("debug",n)}console.log(`[日志系统] 已初始化，级别: ${t}`)}catch(r){console.error("初始化日志系统失败:",r)}}function dt(r){switch(r){case v.ERROR:case v.WARN:case v.INFO:case v.DEBUG:return"human-text:*";default:return""}}function L(r){const t=pt();if(t===v.OFF)return!1;switch(t){case v.ERROR:return r==="error";case v.WARN:return r==="error"||r==="warn";case v.INFO:return r==="error"||r==="warn"||r==="info"||r==="success";case v.DEBUG:return!0;default:return!1}}let J=v.OFF;function pt(){return J}function ut(r){J=r}E("background","🔙");const Z=E("content","📄");E("popup","🔽"),E("options","⚙️"),E("translation","🌐"),E("message","📨"),E("settings","⚙️");const x=E("shared-settings-utils","⚙️");class q{static async getSettings(){if(this.cache.settings&&Date.now()-this.cache.timestamp<this.cache.ttl)return x.log("📦 [SettingsUtils] 使用缓存的设置"),this.cache.settings;try{x.log("🔄 [SettingsUtils] 从 Chrome Storage 获取设置");const t=globalThis.browser||m,e=(await t.storage.sync.get("settings")).settings||{};if(Object.keys(e).length>0){const o={baseUrl:e.baseUrl||h.baseUrl,model:e.model||h.model,temperature:e.temperature??h.temperature,promptTemplate:e.promptTemplate||h.promptTemplate,apiKey:e.apiKey||h.apiKey,thinkingEnabled:e.thinkingEnabled??h.thinkingEnabled,logLevel:e.logLevel||h.logLevel};return this.cache={settings:o,timestamp:Date.now(),ttl:this.cache.ttl},x.log("✅ [SettingsUtils] 新格式设置获取成功",{hasApiKey:!!o.apiKey,thinkingEnabled:o.thinkingEnabled,fromCache:!1}),o}else return x.log("🔄 [SettingsUtils] 新格式无数据，尝试旧格式"),this.getSettingsLegacyFormat(t)}catch(t){return x.error("❌ [SettingsUtils] 获取设置失败:",t),{baseUrl:h.baseUrl,model:h.model,temperature:h.temperature,promptTemplate:h.promptTemplate,apiKey:h.apiKey,thinkingEnabled:h.thinkingEnabled,logLevel:h.logLevel}}}static async getSettingsLegacyFormat(t){try{const n=await t.storage.sync.get(["apiKey","baseUrl","model","temperature","promptTemplate","thinkingEnabled","logLevel"]);if(Object.keys(n).length>0){await t.storage.local.set(n),x.success("从云端获取旧格式设置成功",n);const a={...h,...n};return this.cache={settings:a,timestamp:Date.now(),ttl:this.cache.ttl},a}x.warn("云端没有旧格式设置，尝试从本地获取");const e=await t.storage.local.get(["apiKey","baseUrl","model","temperature","promptTemplate","thinkingEnabled","logLevel"]);if(Object.keys(e).length>0){x.success("从本地获取旧格式设置成功",e);const a={...h,...e};return this.cache={settings:a,timestamp:Date.now(),ttl:this.cache.ttl},a}x.info("使用默认设置",h);const o={...h};return this.cache={settings:o,timestamp:Date.now(),ttl:this.cache.ttl},o}catch(n){x.error("获取旧格式设置失败:",n),x.warn("所有设置获取失败，使用默认设置",h);const e={...h};return this.cache={settings:e,timestamp:Date.now(),ttl:this.cache.ttl},e}}static async getSetting(t){return(await this.getSettings())[t]}static async hasApiKey(){const t=await this.getSettings();return!!t.apiKey&&t.apiKey!=="your_api_key"}static async getThinkingEnabled(){return this.getSetting("thinkingEnabled")}static clearCache(){x.log("🧹 [SettingsUtils] 清除设置缓存"),this.cache.settings=null,this.cache.timestamp=0}static onSettingsChanged(t){const n=o=>{o.settings&&(x.log("🔄 [SettingsUtils] 检测到设置变化"),this.clearCache(),this.getSettings().then(t))};return(globalThis.browser||m).storage.onChanged.addListener(n),()=>{(globalThis.browser||m).storage.onChanged.removeListener(n)}}}d(q,"cache",{settings:null,timestamp:0,ttl:3e5});const y=E("content-message","📨");class gt{constructor(t){d(this,"handleMessage",(t,n,e)=>{y.log("收到消息",{action:t.action,hasText:!!t.text,hasContent:!!t.content,hasReasoning:!!t.reasoningContent,done:t.done,timestamp:new Date().toISOString()});try{switch(t.action){case T.SHOW_TRANSLATION_POPUP:return y.info("处理显示弹窗消息"),this.handleShowTranslationPopup(t,e),!0;case T.UPDATE_CONTENT_TRANSLATION:return y.info("处理content翻译更新"),this.handleUpdateTranslation(t,e);case T.GET_SELECTED_TEXT:return y.info("处理获取选中文本"),this.handleGetSelectedText(e);default:return y.warn("未知操作:",t.action),e({success:!1,error:"未知操作"}),!0}}catch(o){return y.error("处理消息错误:",o),e({success:!1,error:o.message}),!0}});d(this,"handleShowTranslationPopup",async(t,n)=>{var a,p;if(y.info("开始处理显示弹窗",{hasText:!!t.text,textLength:((a=t.text)==null?void 0:a.length)||0,textPreview:((p=t.text)==null?void 0:p.substring(0,50))+"..."}),!t.text)return y.log("❌ [Content MessageHandler] 缺少文本参数"),n({success:!1,error:"缺少文本参数"}),!0;const e=await q.getSettings();y.log("⚙️ [Content MessageHandler] 获取用户设置",{thinkingEnabled:e.thinkingEnabled,hasApiKey:!!e.apiKey});const o=document.querySelector(".translator-popup");return o?(y.log("🔄 [Content MessageHandler] 发现旧的翻译弹窗，先移除"),m.runtime.sendMessage({action:T.CLEANUP},()=>{o.remove(),y.log("✅ [Content MessageHandler] 显示新弹窗"),this.popupManager.showPopup(t.text),m.runtime.sendMessage({action:T.TRANSLATE,text:t.text,thinkingEnabled:e.thinkingEnabled,temperature:e.temperature,promptTemplate:e.promptTemplate,apiKey:e.apiKey})})):(y.log("✅ [Content MessageHandler] 显示弹窗"),this.popupManager.showPopup(t.text),m.runtime.sendMessage({action:T.TRANSLATE,text:t.text,thinkingEnabled:e.thinkingEnabled,temperature:e.temperature,promptTemplate:e.promptTemplate,apiKey:e.apiKey})),n({success:!0}),!0});this.popupManager=t}handleUpdateTranslation(t,n){var o,a;y.log("🔄 [Content MessageHandler] 处理翻译更新",{hasContent:!!t.content,contentLength:((o=t.content)==null?void 0:o.length)||0,hasReasoning:!!t.reasoningContent,reasoningLength:((a=t.reasoningContent)==null?void 0:a.length)||0,done:t.done,error:t.error});const e=this.popupManager.updateTranslation(t);return y.log("📊 [Content MessageHandler] 更新结果:",{success:e}),n({success:e}),!0}handleGetSelectedText(t){var e;y.log("📝 [Content MessageHandler] 收到获取选中文本的消息");const n=(e=window.getSelection())==null?void 0:e.toString().trim();return y.log("📋 [Content MessageHandler] 选中的文本",{hasText:!!n,textLength:(n==null?void 0:n.length)||0,textPreview:(n==null?void 0:n.substring(0,50))+"..."}),t({success:!0,selectedText:n||null}),!0}}function Q(r){if(!r)return"";let t=r;t=t.replace(/\r\n/g,`
`).replace(/\r/g,`
`),t=t.replace(/</g,"&lt;").replace(/>/g,"&gt;");const n=[];t=t.replace(/```(\w+)?\n([\s\S]*?)```/g,(o,a,p)=>{const f=n.length,l=a||"text",g=p.trim().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");return n.push(`<div class="code-block-container">
        <div class="code-block-header">
          <span class="code-language">${l}</span>
          <button class="copy-button" onclick="copyCode(this)" data-code="${g}" title="复制代码">
            <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
        <pre class="code-block"><code class="language-${l}">${g}</code></pre>
      </div>`),`__CODE_BLOCK_${f}__`});const e=[];return t=t.replace(/`([^`\n]+)`/g,(o,a)=>{const p=e.length;return e.push(`<code class="inline-code">${a}</code>`),`__INLINE_CODE_${p}__`}),t=ht(t),t=t.replace(/^#{6}\s+(.*$)/gm,"<h6>$1</h6>"),t=t.replace(/^#{5}\s+(.*$)/gm,"<h5>$1</h5>"),t=t.replace(/^#{4}\s+(.*$)/gm,"<h4>$1</h4>"),t=t.replace(/^#{3}\s+(.*$)/gm,"<h3>$1</h3>"),t=t.replace(/^#{2}\s+(.*$)/gm,"<h2>$1</h2>"),t=t.replace(/^#{1}\s+(.*$)/gm,"<h1>$1</h1>"),t=t.replace(/^(-{3,}|\*{3,}|_{3,})$/gm,'<hr class="markdown-divider">'),t=ft(t),t=mt(t),t=bt(t),t=wt(t),t=yt(t),n.forEach((o,a)=>{t=t.replace(`__CODE_BLOCK_${a}__`,o)}),e.forEach((o,a)=>{t=t.replace(`__INLINE_CODE_${a}__`,o)}),t=t.replace(/\n{3,}/g,`

`),t=t.replace(/^\s+|\s+$/g,""),t}function ht(r){const t=/^(\|.*\|)\n(\|[-\s|:]*\|)\n((?:\|.*\|\n?)*)/gm;return r.replace(t,(n,e,o,a)=>{const p=e.split("|").slice(1,-1).map(l=>`<th>${l.trim()}</th>`).join(""),f=a.trim().split(`
`).map(l=>`<tr>${l.split("|").slice(1,-1).map(c=>`<td>${c.trim()}</td>`).join("")}</tr>`).join("");return`<table class="markdown-table"><thead><tr>${p}</tr></thead><tbody>${f}</tbody></table>`})}function ft(r){const t=r.split(`
`),n=[];let e=!1,o=[];for(const a of t)a.match(/^>\s/)?(e||(e=!0,o=[]),o.push(a.replace(/^>\s?/,""))):(e&&(n.push(`<blockquote class="markdown-quote">${o.join("<br>")}</blockquote>`),e=!1,o=[]),n.push(a));return e&&o.length>0&&n.push(`<blockquote class="markdown-quote">${o.join("<br>")}</blockquote>`),n.join(`
`)}function mt(r){const t=r.split(`
`),n=[];let e=null;for(const o of t){const a=o.match(/^(\s*)[-*+]\s+(.+)$/),p=o.match(/^(\s*)\d+\.\s+(.+)$/);if(a){const[,f,l]=a,g=Math.floor(f.length/2);(!e||e.type!=="ul")&&(e&&n.push(A(e)),e={type:"ul",items:[]}),e.items.push(`<li class="list-item level-${g}">${l}</li>`)}else if(p){const[,f,l]=p,g=Math.floor(f.length/2);(!e||e.type!=="ol")&&(e&&n.push(A(e)),e={type:"ol",items:[]}),e.items.push(`<li class="list-item level-${g}">${l}</li>`)}else e&&(n.push(A(e)),e=null),n.push(o)}return e&&n.push(A(e)),n.join(`
`)}function A(r){return`<${r.type} class="markdown-list">${r.items.join("")}</${r.type}>`}function bt(r){return r=r.replace(/~~(.*?)~~/g,'<del class="strikethrough">$1</del>'),r=r.replace(/\*\*(.*?)\*\*/g,'<strong class="bold">$1</strong>'),r=r.replace(new RegExp("(?<!\\*)\\*(?!\\*)([^*]+)\\*(?!\\*)","g"),'<em class="italic">$1</em>'),r=r.replace(/==(.*?)==/g,'<mark class="highlight">$1</mark>'),r}function wt(r){return r=r.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" class="markdown-image" loading="lazy">'),r=r.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>'),r=r.replace(/<(https?:\/\/[^>]+)>/g,'<a href="$1" class="markdown-link auto-link" target="_blank" rel="noopener noreferrer">$1</a>'),r}function yt(r){return r.split(/\n\s*\n/).map(n=>{if(n=n.trim(),!n)return"";if(n.match(/^<(h[1-6]|div|blockquote|ul|ol|table|pre|hr)/))return n;const e=n.split(`
`).filter(o=>o.trim());return e.length===1?`<p class="markdown-paragraph">${e[0]}</p>`:`<p class="markdown-paragraph">${e.join("<br>")}</p>`}).join(`

`)}async function Ct(r){const t=r.getAttribute("data-code");if(!t)return;const n=r.querySelector(".copy-icon"),e=r.querySelector(".check-icon");try{await navigator.clipboard.writeText(t),n&&e&&(n.style.display="none",e.style.display="block",setTimeout(()=>{n.style.display="block",e.style.display="none"},2e3))}catch{const a=document.createElement("textarea");a.value=t,a.style.position="fixed",a.style.opacity="0",document.body.appendChild(a),a.select(),document.execCommand("copy"),document.body.removeChild(a),n&&e&&(n.style.display="none",e.style.display="block",setTimeout(()=>{n.style.display="block",e.style.display="none"},2e3))}}function vt(){window.copyCode=Ct}const xt=E("快捷键+右键PopUp","😘");class kt{constructor(t,n){d(this,"isDragging",!1);d(this,"isResizing",!1);d(this,"resizeDirection",null);d(this,"startX",0);d(this,"startY",0);d(this,"startWidth",0);d(this,"initialX",0);d(this,"initialY",0);d(this,"startLeft",0);d(this,"cleanup",null);d(this,"handleHeaderMouseDown",t=>{this.isDragging=!0,this.startX=t.clientX,this.startY=t.clientY,this.initialX=this.popup.offsetLeft,this.initialY=this.popup.offsetTop,t.preventDefault(),t.stopPropagation()});d(this,"handlePopupMouseDown",t=>{if(t.target.closest(".translator-header"))return;const n=this.popup.getBoundingClientRect(),e=t.clientX-n.left,o=n.right-t.clientX;e<=15?(this.isResizing=!0,this.resizeDirection="left",this.startWidth=this.popup.offsetWidth,this.startX=t.clientX,this.startLeft=this.popup.offsetLeft,this.popup.classList.add("resizing-left"),t.preventDefault(),t.stopPropagation()):o<=15&&(this.isResizing=!0,this.resizeDirection="right",this.startWidth=this.popup.offsetWidth,this.startX=t.clientX,this.popup.classList.add("resizing-right"),t.preventDefault(),t.stopPropagation())});d(this,"handleMouseMove",t=>{this.isResizing?this.handleResize(t):this.isDragging&&this.handleDrag(t)});d(this,"handleMouseUp",t=>{this.isResizing&&(this.isResizing=!1,this.resizeDirection=null,this.popup.classList.remove("resizing-left","resizing-right"),this.savePopupState(),t.preventDefault(),t.stopPropagation()),this.isDragging&&(this.isDragging=!1,this.savePopupState())});this.popup=t,this.onStateChange=n,this.initializeEvents()}initializeEvents(){this.popup.querySelector(".translator-header").addEventListener("mousedown",this.handleHeaderMouseDown,!0),this.popup.addEventListener("mousedown",this.handlePopupMouseDown,!0),this.setupCopyButtons(),document.addEventListener("mousemove",this.handleMouseMove,!0),document.addEventListener("mouseup",this.handleMouseUp,!0),this.cleanup=()=>{document.removeEventListener("mousemove",this.handleMouseMove,!0),document.removeEventListener("mouseup",this.handleMouseUp,!0)}}handleResize(t){let n;if(this.resizeDirection==="right"){const e=t.clientX-this.startX;n=this.startWidth+e}else if(this.resizeDirection==="left"){const e=this.startX-t.clientX;n=this.startWidth+e}else return;if(n=Math.min(Math.max(300,n),1200),this.popup.style.width=`${n}px`,this.resizeDirection==="left"){const e=this.startLeft-(n-this.startWidth);this.popup.style.left=`${e}px`}t.preventDefault(),t.stopPropagation()}handleDrag(t){const n=t.clientX-this.startX,e=t.clientY-this.startY;this.popup.style.left=`${this.initialX+n}px`,this.popup.style.top=`${this.initialY+e}px`,t.preventDefault(),t.stopPropagation()}setupCopyButtons(){const t=this.popup.querySelector(".translator-copy-btn");t==null||t.addEventListener("click",()=>{var o;const e=((o=this.popup.querySelector(".translator-translated-text"))==null?void 0:o.textContent)||"";this.copyToClipboard(e,t,"复制译文")});const n=this.popup.querySelector(".translator-copy-original-btn");n==null||n.addEventListener("click",()=>{var o;const e=((o=this.popup.querySelector(".translator-text"))==null?void 0:o.textContent)||"";this.copyToClipboard(e,n,"复制")})}async copyToClipboard(t,n,e){try{await navigator.clipboard.writeText(t),n.textContent="已复制",setTimeout(()=>n.textContent=e,1500)}catch(o){xt.error("复制失败:",o),alert("复制失败，请重试")}}savePopupState(){const t=parseInt(this.popup.style.left),n=parseInt(this.popup.style.top),e=parseInt(this.popup.style.width);!isNaN(t)&&!isNaN(n)&&!isNaN(e)&&this.onStateChange({left:t,top:n,width:e})}destroy(){this.cleanup&&this.cleanup()}}const b=E("content-popup","🔽");class Et{constructor(){d(this,"lastPopupState",{left:null,top:null,width:null});d(this,"currentPopup",null);d(this,"eventHandler",null);d(this,"userHasScrolled",!1)}showPopup(t){var e;b.log("显示弹窗",{textLength:(t==null?void 0:t.length)||0,textPreview:(t==null?void 0:t.substring(0,50))+"...",hasCurrentPopup:!!this.currentPopup,timestamp:new Date().toISOString()}),this.removeCurrentPopup();const n=this.createPopupElement(t);return this.currentPopup=n,document.body.appendChild(n),vt(),this.positionPopup(n),this.setupEventHandlers(n),this.setupScrollDetection(n),b.log("✅ [PopupManager] 弹窗创建完成",{popupElement:n.className,parentElement:(e=n.parentElement)==null?void 0:e.tagName}),n}updateTranslation(t){var e,o;if(b.log("🔄 [PopupManager] 更新翻译",{hasPopup:!!this.currentPopup,hasContent:!!t.content,contentLength:((e=t.content)==null?void 0:e.length)||0,hasReasoning:!!t.reasoningContent,reasoningLength:((o=t.reasoningContent)==null?void 0:o.length)||0,done:t.done,error:t.error}),!this.currentPopup)return b.log("❌ [PopupManager] 翻译弹窗不存在，可能已关闭"),!1;const n=this.getPopupElements();return!n.translatedTextEl||!n.reasoningTextEl||!n.loadingEl?(b.log("❌ [PopupManager] 弹窗元素不完整",{hasTranslatedEl:!!n.translatedTextEl,hasReasoningEl:!!n.reasoningTextEl,hasLoadingEl:!!n.loadingEl}),!1):(t.error?(b.log("❌ [PopupManager] 处理翻译错误"),this.handleTranslationError(t.error,n.loadingEl)):(b.log("✅ [PopupManager] 处理翻译更新"),this.handleTranslationUpdate(t,n)),!0)}removeCurrentPopup(){this.currentPopup&&(this.savePopupState(this.currentPopup),this.eventHandler&&(this.eventHandler.destroy(),this.eventHandler=null),this.currentPopup.remove(),this.currentPopup=null)}createPopupElement(t){const n=document.createElement("div");return n.className="translator-popup",n.innerHTML=`
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
    `,n}positionPopup(t){const n=window.innerWidth,e=window.innerHeight;let o=n-420,a=20,p=400;this.lastPopupState.left!==null&&this.lastPopupState.top!==null&&(o=Math.min(Math.max(0,this.lastPopupState.left),n-300),a=Math.min(Math.max(0,this.lastPopupState.top),e-100)),this.lastPopupState.width!==null&&(p=Math.min(Math.max(300,this.lastPopupState.width),1200)),t.style.left=`${o}px`,t.style.top=`${a}px`,t.style.width=`${p}px`}setupEventHandlers(t){var n,e,o;this.eventHandler=new kt(t,a=>{this.lastPopupState=a,b.log("保存弹窗状态:",a)}),(n=t.querySelector(".translator-close-btn"))==null||n.addEventListener("click",()=>{m.runtime.sendMessage({action:T.CLEANUP}),this.removeCurrentPopup()}),(e=t.querySelector(".translator-copy-original-btn"))==null||e.addEventListener("click",async()=>{var p;const a=(p=t.querySelector(".translator-text"))==null?void 0:p.textContent;if(a)try{await navigator.clipboard.writeText(a),b.log("原文已复制")}catch(f){b.error("复制原文失败:",f)}}),(o=t.querySelector(".translator-copy-btn"))==null||o.addEventListener("click",async()=>{var p;const a=(p=t.querySelector(".translator-translated-text"))==null?void 0:p.textContent;if(a)try{await navigator.clipboard.writeText(a),b.log("译文已复制")}catch(f){b.error("复制译文失败:",f)}})}setupScrollDetection(t){const n=t.querySelector(".translator-content");this.userHasScrolled=!1,n.addEventListener("scroll",()=>{const e=n.scrollHeight-n.scrollTop<=n.clientHeight+1;this.userHasScrolled=!e}),t.userHasScrolled=()=>this.userHasScrolled}getPopupElements(){return this.currentPopup?{translatedTextEl:this.currentPopup.querySelector(".translator-translated-text"),reasoningSectionEl:this.currentPopup.querySelector(".translator-section-reasoning"),reasoningTextEl:this.currentPopup.querySelector(".translator-reasoning-text"),loadingEl:this.currentPopup.querySelector(".translator-loading"),contentEl:this.currentPopup.querySelector(".translator-content")}:{}}handleTranslationError(t,n){b.log("翻译发生错误:",t),t.includes("API Key")||t.includes("API 请求失败")||t.includes("rate limit")?n.textContent="翻译失败："+t:n.textContent="翻译失败，请重试"}handleTranslationUpdate(t,n){var e;b.log("更新翻译结果",{hasContent:!!t.content,hasReasoning:t.hasReasoning,reasoningContentLength:((e=t.reasoningContent)==null?void 0:e.length)||0,done:t.done}),t.content&&(n.translatedTextEl.innerHTML=Q(t.content)),n.reasoningSectionEl&&n.reasoningTextEl&&(b.log("处理思维链内容:",{hasReasoning:t.hasReasoning,reasoningContent:t.reasoningContent}),t.hasReasoning&&t.reasoningContent?(n.reasoningSectionEl.style.display="block",n.reasoningTextEl.innerHTML=Q(t.reasoningContent),b.log("思维链已显示")):t.hasReasoning||(n.reasoningSectionEl.style.display="none")),t.done&&(b.log("翻译完成"),n.loadingEl.style.display="none"),!this.userHasScrolled&&n.contentEl&&(n.contentEl.scrollTop=n.contentEl.scrollHeight)}savePopupState(t){const n=parseInt(t.style.left),e=parseInt(t.style.top),o=parseInt(t.style.width);!isNaN(n)&&!isNaN(e)&&!isNaN(o)&&(this.lastPopupState={left:n,top:e,width:o})}}const St=`
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
  .code-block-container {
    position: relative;
    margin: 1em 0;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    overflow: hidden;
  }

  .code-block-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5em 1em;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border-bottom: 1px solid #e2e8f0;
  }

  .code-language {
    font-size: 0.85em;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 500;
  }

  .copy-button {
    background: transparent;
    border: none;
    padding: 0.25em;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    transition: all 0.2s ease;
  }

  .copy-button:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  .copy-button:active {
    background: #cbd5e1;
  }

  .copy-icon, .check-icon {
    stroke-width: 2;
  }

  .check-icon {
    color: #10b981;
  }

  .code-block {
    margin: 0;
    padding: 0;
    background: transparent;
    overflow-x: auto;
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

    .code-block-container {
      border-color: #444;
      background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
    }

    .code-block-header {
      background: linear-gradient(135deg, #333 0%, #444 100%);
      border-bottom-color: #444;
    }

    .code-language {
      color: #9ca3af;
    }

    .copy-button {
      color: #9ca3af;
    }

    .copy-button:hover {
      background: #444;
      color: #e5e5e5;
    }

    .copy-button:active {
      background: #555;
    }

    .code-block {
      background: transparent;
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
`;function Tt(){if(!document.querySelector("#translator-popup-style")){const r=document.createElement("style");r.id="translator-popup-style",r.textContent=St,document.head.appendChild(r)}}const Ft={matches:["<all_urls>"],main(){ct(),Z.info("人话翻译器 content script 启动"),Tt();const r=new Et,t=new gt(r);m.runtime.onMessage.addListener(t.handleMessage),Z.success("Content script 初始化完成")}};function N(r,...t){}const Pt={debug:(...r)=>N(console.debug,...r),log:(...r)=>N(console.log,...r),warn:(...r)=>N(console.warn,...r),error:(...r)=>N(console.error,...r)},D=class D extends Event{constructor(t,n){super(D.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=n}};d(D,"EVENT_NAME",K("wxt:locationchange"));let j=D;function K(r){var t;return`${(t=m==null?void 0:m.runtime)==null?void 0:t.id}:content:${r}`}function Lt(r){let t,n;return{run(){t==null&&(n=new URL(location.href),t=r.setInterval(()=>{let e=new URL(location.href);e.href!==n.href&&(window.dispatchEvent(new j(e,n)),n=e)},1e3))}}}const $=class ${constructor(t,n){d(this,"isTopFrame",window.self===window.top);d(this,"abortController");d(this,"locationWatcher",Lt(this));d(this,"receivedMessageIds",new Set);this.contentScriptName=t,this.options=n,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(t){return this.abortController.abort(t)}get isInvalid(){return m.runtime.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(t){return this.signal.addEventListener("abort",t),()=>this.signal.removeEventListener("abort",t)}block(){return new Promise(()=>{})}setInterval(t,n){const e=setInterval(()=>{this.isValid&&t()},n);return this.onInvalidated(()=>clearInterval(e)),e}setTimeout(t,n){const e=setTimeout(()=>{this.isValid&&t()},n);return this.onInvalidated(()=>clearTimeout(e)),e}requestAnimationFrame(t){const n=requestAnimationFrame((...e)=>{this.isValid&&t(...e)});return this.onInvalidated(()=>cancelAnimationFrame(n)),n}requestIdleCallback(t,n){const e=requestIdleCallback((...o)=>{this.signal.aborted||t(...o)},n);return this.onInvalidated(()=>cancelIdleCallback(e)),e}addEventListener(t,n,e,o){var a;n==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),(a=t.addEventListener)==null||a.call(t,n.startsWith("wxt:")?K(n):n,e,{...o,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),Pt.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:$.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:Math.random().toString(36).slice(2)},"*")}verifyScriptStartedEvent(t){var a,p,f;const n=((a=t.data)==null?void 0:a.type)===$.SCRIPT_STARTED_MESSAGE_TYPE,e=((p=t.data)==null?void 0:p.contentScriptName)===this.contentScriptName,o=!this.receivedMessageIds.has((f=t.data)==null?void 0:f.messageId);return n&&e&&o}listenForNewerScripts(t){let n=!0;const e=o=>{if(this.verifyScriptStartedEvent(o)){this.receivedMessageIds.add(o.data.messageId);const a=n;if(n=!1,a&&(t!=null&&t.ignoreFirstEvent))return;this.notifyInvalidated()}};addEventListener("message",e),this.onInvalidated(()=>removeEventListener("message",e))}};d($,"SCRIPT_STARTED_MESSAGE_TYPE",K("wxt:content-script-started"));let W=$;function Rt(){}function _(r,...t){}const Mt={debug:(...r)=>_(console.debug,...r),log:(...r)=>_(console.log,...r),warn:(...r)=>_(console.warn,...r),error:(...r)=>_(console.error,...r)};return(async()=>{try{const{main:r,...t}=Ft,n=new W("content",t);return await r(n)}catch(r){throw Mt.error('The content script "content" crashed on startup!',r),r}})()})();
content;