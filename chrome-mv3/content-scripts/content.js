var content=(function(){"use strict";function Pt(r){return r}const k=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,S={TRANSLATE:"translate",CLEANUP:"cleanup",GET_HISTORY:"getHistory",CLEAR_HISTORY:"clearHistory",DELETE_HISTORY_ITEM:"deleteHistoryItem",IMPORT_HISTORY:"importHistory",UPDATE_TRANSLATION:"updateTranslation",UPDATE_CONTENT_TRANSLATION:"updateContentTranslation",UPDATE_POPUP_TRANSLATION:"updatePopupTranslation",SHOW_TRANSLATION_POPUP:"showTranslationPopup",GET_SELECTED_TEXT:"getSelectedText"},v={OFF:"off",ERROR:"error",WARN:"warn",INFO:"info",DEBUG:"debug"},J={SYSTEM:"system"},p={baseUrl:"https://api.deepseek.com/v1/chat/completions",model:"deepseek-chat",temperature:.7,promptTemplate:`System Prompt: 
1. 用通俗易懂的中文解释以下内容(就是说人话,如果遇到英文缩写记得解释)(例子:OKR说成OKR(Objective Key Results)
2. 而且输出内容一定要带合乎情理的 Emoji 优化我的阅读体验.
3. 输出内容的时候不要出现系统提示词的内容，润物细无声
4. 输出内容注重结论先行,把最重要的东西放到最前面输出.(结论先行!!!)
5. 以下是内容:{text}`,apiKey:"your_api_key",thinkingEnabled:!1,logLevel:v.OFF,theme:J.SYSTEM};function Z(r){return r&&r.__esModule&&Object.prototype.hasOwnProperty.call(r,"default")?r.default:r}var F={exports:{}},_,H;function q(){if(H)return _;H=1;var r=1e3,t=r*60,e=t*60,n=e*24,o=n*7,i=n*365.25;_=function(c,a){a=a||{};var s=typeof c;if(s==="string"&&c.length>0)return h(c);if(s==="number"&&isFinite(c))return a.long?l(c):u(c);throw new Error("val is not a non-empty string or a valid number. val="+JSON.stringify(c))};function h(c){if(c=String(c),!(c.length>100)){var a=/^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(c);if(a){var s=parseFloat(a[1]),d=(a[2]||"ms").toLowerCase();switch(d){case"years":case"year":case"yrs":case"yr":case"y":return s*i;case"weeks":case"week":case"w":return s*o;case"days":case"day":case"d":return s*n;case"hours":case"hour":case"hrs":case"hr":case"h":return s*e;case"minutes":case"minute":case"mins":case"min":case"m":return s*t;case"seconds":case"second":case"secs":case"sec":case"s":return s*r;case"milliseconds":case"millisecond":case"msecs":case"msec":case"ms":return s;default:return}}}}function u(c){var a=Math.abs(c);return a>=n?Math.round(c/n)+"d":a>=e?Math.round(c/e)+"h":a>=t?Math.round(c/t)+"m":a>=r?Math.round(c/r)+"s":c+"ms"}function l(c){var a=Math.abs(c);return a>=n?g(c,a,n,"day"):a>=e?g(c,a,e,"hour"):a>=t?g(c,a,t,"minute"):a>=r?g(c,a,r,"second"):c+" ms"}function g(c,a,s,d){var f=a>=s*1.5;return Math.round(c/s)+" "+d+(f?"s":"")}return _}var D,j;function Q(){if(j)return D;j=1;function r(t){n.debug=n,n.default=n,n.coerce=g,n.disable=u,n.enable=i,n.enabled=l,n.humanize=q(),n.destroy=c,Object.keys(t).forEach(a=>{n[a]=t[a]}),n.names=[],n.skips=[],n.formatters={};function e(a){let s=0;for(let d=0;d<a.length;d++)s=(s<<5)-s+a.charCodeAt(d),s|=0;return n.colors[Math.abs(s)%n.colors.length]}n.selectColor=e;function n(a){let s,d=null,f,L;function y(...C){if(!y.enabled)return;const E=y,A=Number(new Date),Tt=A-(s||A);E.diff=Tt,E.prev=s,E.curr=A,s=A,C[0]=n.coerce(C[0]),typeof C[0]!="string"&&C.unshift("%O");let N=0;C[0]=C[0].replace(/%([a-zA-Z%])/g,(U,Lt)=>{if(U==="%%")return"%";N++;const V=n.formatters[Lt];if(typeof V=="function"){const Ft=C[N];U=V.call(E,Ft),C.splice(N,1),N--}return U}),n.formatArgs.call(E,C),(E.log||n.log).apply(E,C)}return y.namespace=a,y.useColors=n.useColors(),y.color=n.selectColor(a),y.extend=o,y.destroy=n.destroy,Object.defineProperty(y,"enabled",{enumerable:!0,configurable:!1,get:()=>d!==null?d:(f!==n.namespaces&&(f=n.namespaces,L=n.enabled(a)),L),set:C=>{d=C}}),typeof n.init=="function"&&n.init(y),y}function o(a,s){const d=n(this.namespace+(typeof s>"u"?":":s)+a);return d.log=this.log,d}function i(a){n.save(a),n.namespaces=a,n.names=[],n.skips=[];const s=(typeof a=="string"?a:"").trim().replace(/\s+/g,",").split(",").filter(Boolean);for(const d of s)d[0]==="-"?n.skips.push(d.slice(1)):n.names.push(d)}function h(a,s){let d=0,f=0,L=-1,y=0;for(;d<a.length;)if(f<s.length&&(s[f]===a[d]||s[f]==="*"))s[f]==="*"?(L=f,y=d,f++):(d++,f++);else if(L!==-1)f=L+1,y++,d=y;else return!1;for(;f<s.length&&s[f]==="*";)f++;return f===s.length}function u(){const a=[...n.names,...n.skips.map(s=>"-"+s)].join(",");return n.enable(""),a}function l(a){for(const s of n.skips)if(h(a,s))return!1;for(const s of n.names)if(h(a,s))return!0;return!1}function g(a){return a instanceof Error?a.stack||a.message:a}function c(){console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.")}return n.enable(n.load()),n}return D=r,D}var K;function tt(){return K||(K=1,(function(r,t){t.formatArgs=n,t.save=o,t.load=i,t.useColors=e,t.storage=h(),t.destroy=(()=>{let l=!1;return()=>{l||(l=!0,console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."))}})(),t.colors=["#0000CC","#0000FF","#0033CC","#0033FF","#0066CC","#0066FF","#0099CC","#0099FF","#00CC00","#00CC33","#00CC66","#00CC99","#00CCCC","#00CCFF","#3300CC","#3300FF","#3333CC","#3333FF","#3366CC","#3366FF","#3399CC","#3399FF","#33CC00","#33CC33","#33CC66","#33CC99","#33CCCC","#33CCFF","#6600CC","#6600FF","#6633CC","#6633FF","#66CC00","#66CC33","#9900CC","#9900FF","#9933CC","#9933FF","#99CC00","#99CC33","#CC0000","#CC0033","#CC0066","#CC0099","#CC00CC","#CC00FF","#CC3300","#CC3333","#CC3366","#CC3399","#CC33CC","#CC33FF","#CC6600","#CC6633","#CC9900","#CC9933","#CCCC00","#CCCC33","#FF0000","#FF0033","#FF0066","#FF0099","#FF00CC","#FF00FF","#FF3300","#FF3333","#FF3366","#FF3399","#FF33CC","#FF33FF","#FF6600","#FF6633","#FF9900","#FF9933","#FFCC00","#FFCC33"];function e(){if(typeof window<"u"&&window.process&&(window.process.type==="renderer"||window.process.__nwjs))return!0;if(typeof navigator<"u"&&navigator.userAgent&&navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))return!1;let l;return typeof document<"u"&&document.documentElement&&document.documentElement.style&&document.documentElement.style.WebkitAppearance||typeof window<"u"&&window.console&&(window.console.firebug||window.console.exception&&window.console.table)||typeof navigator<"u"&&navigator.userAgent&&(l=navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/))&&parseInt(l[1],10)>=31||typeof navigator<"u"&&navigator.userAgent&&navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)}function n(l){if(l[0]=(this.useColors?"%c":"")+this.namespace+(this.useColors?" %c":" ")+l[0]+(this.useColors?"%c ":" ")+"+"+r.exports.humanize(this.diff),!this.useColors)return;const g="color: "+this.color;l.splice(1,0,g,"color: inherit");let c=0,a=0;l[0].replace(/%[a-zA-Z%]/g,s=>{s!=="%%"&&(c++,s==="%c"&&(a=c))}),l.splice(a,0,g)}t.log=console.debug||console.log||(()=>{});function o(l){try{l?t.storage.setItem("debug",l):t.storage.removeItem("debug")}catch{}}function i(){let l;try{l=t.storage.getItem("debug")||t.storage.getItem("DEBUG")}catch{}return!l&&typeof process<"u"&&"env"in process&&(l=process.env.DEBUG),l}function h(){try{return localStorage}catch{}}r.exports=Q()(t);const{formatters:u}=r.exports;u.j=function(l){try{return JSON.stringify(l)}catch(g){return"[UnexpectedJSONParseError]: "+g.message}}})(F,F.exports)),F.exports}var et=tt();const R=Z(et);class nt{debugger;emoji;namespace;constructor(t,e="🔧"){this.namespace=t,this.debugger=R(`human-text:${t}`),this.emoji=e}log(...t){T("log")&&this.debugger(`${this.emoji}`,...t)}info(...t){T("info")&&this.debugger(`${this.emoji} ℹ️`,...t)}warn(...t){T("warn")&&this.debugger(`${this.emoji} ⚠️`,...t)}error(...t){T("error")&&this.debugger(`${this.emoji} ❌`,...t)}success(...t){T("success")&&this.debugger(`${this.emoji} ✅`,...t)}trace(...t){T("trace")&&this.debugger(`${this.emoji} 🐛`,...t)}getNamespace(){return this.namespace}getFullNamespace(){return`human-text:${this.namespace}`}}function x(r,t){return new nt(r,t)}function W(){try{return typeof localStorage<"u"&&localStorage!==null}catch{return!1}}async function rt(){try{const r=await k.storage.sync.get(["logLevel","settings"]);let t=v.OFF;if(r?.settings?.logLevel)t=r.settings.logLevel;else if(r?.logLevel)t=r.logLevel;else{const e=await k.storage.local.get(["logLevel","settings"]);e?.settings?.logLevel?t=e.settings.logLevel:e?.logLevel&&(t=e.logLevel)}if(st(t),t===v.OFF)R.disable(),W()&&localStorage.removeItem("debug");else{const e=ot(t);R.enable(e),W()&&localStorage.setItem("debug",e)}console.log(`[日志系统] 已初始化，级别: ${t}`)}catch(r){console.error("初始化日志系统失败:",r)}}function ot(r){switch(r){case v.ERROR:case v.WARN:case v.INFO:case v.DEBUG:return"human-text:*";default:return""}}function T(r){const t=at();if(t===v.OFF)return!1;switch(t){case v.ERROR:return r==="error";case v.WARN:return r==="error"||r==="warn";case v.INFO:return r==="error"||r==="warn"||r==="info"||r==="success";case v.DEBUG:return!0;default:return!1}}let Y=v.OFF;function at(){return Y}function st(r){Y=r}x("background","🔙");const B=x("content","📄");x("popup","🔽"),x("options","⚙️"),x("translation","🌐"),x("message","📨"),x("settings","⚙️");const w=x("shared-settings-utils","⚙️");class X{static cache={settings:null,timestamp:0,ttl:3e5};static async getSettings(){if(this.cache.settings&&Date.now()-this.cache.timestamp<this.cache.ttl)return w.log("📦 [SettingsUtils] 使用缓存的设置"),this.cache.settings;try{w.log("🔄 [SettingsUtils] 从 Chrome Storage 获取设置");const t=globalThis.browser||k,n=(await t.storage.sync.get("settings")).settings||{};if(Object.keys(n).length>0){const o={baseUrl:n.baseUrl||p.baseUrl,model:n.model||p.model,temperature:n.temperature??p.temperature,promptTemplate:n.promptTemplate||p.promptTemplate,apiKey:n.apiKey||p.apiKey,thinkingEnabled:n.thinkingEnabled??p.thinkingEnabled,logLevel:n.logLevel||p.logLevel,theme:n.theme||p.theme};return this.cache={settings:o,timestamp:Date.now(),ttl:this.cache.ttl},w.log("✅ [SettingsUtils] 新格式设置获取成功",{hasApiKey:!!o.apiKey,thinkingEnabled:o.thinkingEnabled,fromCache:!1}),o}else return w.log("🔄 [SettingsUtils] 新格式无数据，尝试旧格式"),this.getSettingsLegacyFormat(t)}catch(t){return w.error("❌ [SettingsUtils] 获取设置失败:",t),{baseUrl:p.baseUrl,model:p.model,temperature:p.temperature,promptTemplate:p.promptTemplate,apiKey:p.apiKey,thinkingEnabled:p.thinkingEnabled,logLevel:p.logLevel,theme:p.theme}}}static async getSettingsLegacyFormat(t){try{const e=await t.storage.sync.get(["apiKey","baseUrl","model","temperature","promptTemplate","thinkingEnabled","logLevel","theme"]);if(Object.keys(e).length>0){await t.storage.local.set(e),w.success("从云端获取旧格式设置成功",e);const i={...p,...e};return this.cache={settings:i,timestamp:Date.now(),ttl:this.cache.ttl},i}w.warn("云端没有旧格式设置，尝试从本地获取");const n=await t.storage.local.get(["apiKey","baseUrl","model","temperature","promptTemplate","thinkingEnabled","logLevel","theme"]);if(Object.keys(n).length>0){w.success("从本地获取旧格式设置成功",n);const i={...p,...n};return this.cache={settings:i,timestamp:Date.now(),ttl:this.cache.ttl},i}w.info("使用默认设置",p);const o={...p};return this.cache={settings:o,timestamp:Date.now(),ttl:this.cache.ttl},o}catch(e){w.error("获取旧格式设置失败:",e),w.warn("所有设置获取失败，使用默认设置",p);const n={...p};return this.cache={settings:n,timestamp:Date.now(),ttl:this.cache.ttl},n}}static async getSetting(t){return(await this.getSettings())[t]}static async hasApiKey(){const t=await this.getSettings();return!!t.apiKey&&t.apiKey!=="your_api_key"}static async getThinkingEnabled(){return this.getSetting("thinkingEnabled")}static clearCache(){w.log("🧹 [SettingsUtils] 清除设置缓存"),this.cache.settings=null,this.cache.timestamp=0}static async setSettings(t){try{const e=globalThis.browser||k,{settings:n={}}=await e.storage.sync.get("settings"),o={...p,...n,...t};await Promise.all([e.storage.sync.set({settings:o}),e.storage.local.set({settings:o})]),this.clearCache(),w.success("✅ [SettingsUtils] 设置已更新",{keys:Object.keys(t)})}catch(e){throw w.error("❌ [SettingsUtils] 更新设置失败:",e),e}}static async setSetting(t,e){return this.setSettings({[t]:e})}static onSettingsChanged(t){const e=o=>{o.settings&&(w.log("🔄 [SettingsUtils] 检测到设置变化"),this.clearCache(),this.getSettings().then(t))};return(globalThis.browser||k).storage.onChanged.addListener(e),()=>{(globalThis.browser||k).storage.onChanged.removeListener(e)}}}const b=x("content-message","📨");class it{constructor(t){this.popupManager=t}handleMessage=(t,e,n)=>{b.log("收到消息",{action:t.action,hasText:!!t.text,hasContent:!!t.content,hasReasoning:!!t.reasoningContent,done:t.done,timestamp:new Date().toISOString()});try{switch(t.action){case S.SHOW_TRANSLATION_POPUP:return b.info("处理显示弹窗消息"),this.handleShowTranslationPopup(t,n),!0;case S.UPDATE_CONTENT_TRANSLATION:return b.info("处理content翻译更新"),this.handleUpdateTranslation(t,n);case S.GET_SELECTED_TEXT:return b.info("处理获取选中文本"),this.handleGetSelectedText(n);default:return b.warn("未知操作:",t.action),n({success:!1,error:"未知操作"}),!0}}catch(o){return b.error("处理消息错误:",o),n({success:!1,error:o.message}),!0}};handleShowTranslationPopup=async(t,e)=>{if(b.info("开始处理显示弹窗",{hasText:!!t.text,textLength:t.text?.length||0,textPreview:t.text?.substring(0,50)+"..."}),!t.text)return b.log("❌ [Content MessageHandler] 缺少文本参数"),e({success:!1,error:"缺少文本参数"}),!0;const n=await X.getSettings();b.log("⚙️ [Content MessageHandler] 获取用户设置",{thinkingEnabled:n.thinkingEnabled,hasApiKey:!!n.apiKey});const o=document.querySelector(".translator-popup");return o?(b.log("🔄 [Content MessageHandler] 发现旧的翻译弹窗，先移除"),k.runtime.sendMessage({action:S.CLEANUP},()=>{o.remove(),b.log("✅ [Content MessageHandler] 显示新弹窗"),this.popupManager.showPopup(t.text),k.runtime.sendMessage({action:S.TRANSLATE,text:t.text,thinkingEnabled:n.thinkingEnabled,temperature:n.temperature,promptTemplate:n.promptTemplate,apiKey:n.apiKey})})):(b.log("✅ [Content MessageHandler] 显示弹窗"),this.popupManager.showPopup(t.text),k.runtime.sendMessage({action:S.TRANSLATE,text:t.text,thinkingEnabled:n.thinkingEnabled,temperature:n.temperature,promptTemplate:n.promptTemplate,apiKey:n.apiKey})),e({success:!0}),!0};handleUpdateTranslation(t,e){b.log("🔄 [Content MessageHandler] 处理翻译更新",{hasContent:!!t.content,contentLength:t.content?.length||0,hasReasoning:!!t.reasoningContent,reasoningLength:t.reasoningContent?.length||0,done:t.done,error:t.error});const n=this.popupManager.updateTranslation(t);return b.log("📊 [Content MessageHandler] 更新结果:",{success:n}),e({success:n}),!0}handleGetSelectedText(t){b.log("📝 [Content MessageHandler] 收到获取选中文本的消息");const e=window.getSelection()?.toString().trim();return b.log("📋 [Content MessageHandler] 选中的文本",{hasText:!!e,textLength:e?.length||0,textPreview:e?.substring(0,50)+"..."}),t({success:!0,selectedText:e||null}),!0}}function G(r){if(!r)return"";let t=r;t=t.replace(/\r\n/g,`
`).replace(/\r/g,`
`),t=t.replace(/</g,"&lt;").replace(/>/g,"&gt;");const e=[];t=t.replace(/```(\w+)?\n([\s\S]*?)```/g,(o,i,h)=>{const u=e.length,l=i||"text",g=h.trim();return e.push(`<div class="code-block-container">
        <div class="code-block-header">
          <span class="code-language">${l}</span>
          <button class="copy-button" data-code="${g}" title="复制代码">
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
      </div>`),`__CODE_BLOCK_${u}__`});const n=[];return t=t.replace(/`([^`\n]+)`/g,(o,i)=>{const h=n.length;return n.push(`<code class="inline-code">${i}</code>`),`__INLINE_CODE_${h}__`}),t=lt(t),t=t.replace(/^#{6}\s+(.*$)/gm,"<h6>$1</h6>"),t=t.replace(/^#{5}\s+(.*$)/gm,"<h5>$1</h5>"),t=t.replace(/^#{4}\s+(.*$)/gm,"<h4>$1</h4>"),t=t.replace(/^#{3}\s+(.*$)/gm,"<h3>$1</h3>"),t=t.replace(/^#{2}\s+(.*$)/gm,"<h2>$1</h2>"),t=t.replace(/^#{1}\s+(.*$)/gm,"<h1>$1</h1>"),t=t.replace(/^(-{3,}|\*{3,}|_{3,})$/gm,'<hr class="markdown-divider">'),t=ct(t),t=dt(t),t=pt(t),t=ut(t),t=gt(t),e.forEach((o,i)=>{t=t.replace(`__CODE_BLOCK_${i}__`,o)}),n.forEach((o,i)=>{t=t.replace(`__INLINE_CODE_${i}__`,o)}),t=t.replace(/\n{3,}/g,`

`),t=t.replace(/^\s+|\s+$/g,""),t}function lt(r){const t=/^(\|.*\|)\n(\|[-\s|:]*\|)\n((?:\|.*\|\n?)*)/gm;return r.replace(t,(e,n,o,i)=>{const h=n.split("|").slice(1,-1).map(l=>`<th>${l.trim()}</th>`).join(""),u=i.trim().split(`
`).map(l=>`<tr>${l.split("|").slice(1,-1).map(c=>`<td>${c.trim()}</td>`).join("")}</tr>`).join("");return`<table class="markdown-table"><thead><tr>${h}</tr></thead><tbody>${u}</tbody></table>`})}function ct(r){const t=r.split(`
`),e=[];let n=!1,o=[];for(const i of t)i.match(/^>\s/)?(n||(n=!0,o=[]),o.push(i.replace(/^>\s?/,""))):(n&&(e.push(`<blockquote class="markdown-quote">${o.join("<br>")}</blockquote>`),n=!1,o=[]),e.push(i));return n&&o.length>0&&e.push(`<blockquote class="markdown-quote">${o.join("<br>")}</blockquote>`),e.join(`
`)}function dt(r){const t=r.split(`
`),e=[];let n=null;for(const o of t){const i=o.match(/^(\s*)[-*+]\s+(.+)$/),h=o.match(/^(\s*)\d+\.\s+(.+)$/);if(i){const[,u,l]=i,g=Math.floor(u.length/2);(!n||n.type!=="ul")&&(n&&e.push(P(n)),n={type:"ul",items:[]}),n.items.push(`<li class="list-item level-${g}">${l}</li>`)}else if(h){const[,u,l]=h,g=Math.floor(u.length/2);(!n||n.type!=="ol")&&(n&&e.push(P(n)),n={type:"ol",items:[]}),n.items.push(`<li class="list-item level-${g}">${l}</li>`)}else n&&(e.push(P(n)),n=null),e.push(o)}return n&&e.push(P(n)),e.join(`
`)}function P(r){return`<${r.type} class="markdown-list">${r.items.join("")}</${r.type}>`}function pt(r){return r=r.replace(/~~(.*?)~~/g,'<del class="strikethrough">$1</del>'),r=r.replace(/\*\*(.*?)\*\*/g,'<strong class="bold">$1</strong>'),r=r.replace(new RegExp("(?<!\\*)\\*(?!\\*)([^*]+)\\*(?!\\*)","g"),'<em class="italic">$1</em>'),r=r.replace(/==(.*?)==/g,'<mark class="highlight">$1</mark>'),r}function ut(r){return r=r.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" class="markdown-image" loading="lazy">'),r=r.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>'),r=r.replace(/<(https?:\/\/[^>]+)>/g,'<a href="$1" class="markdown-link auto-link" target="_blank" rel="noopener noreferrer">$1</a>'),r}function gt(r){return r.split(/\n\s*\n/).map(e=>{if(e=e.trim(),!e)return"";if(e.match(/^<(h[1-6]|div|blockquote|ul|ol|table|pre|hr)/))return e;const n=e.split(`
`).filter(o=>o.trim());return n.length===1?`<p class="markdown-paragraph">${n[0]}</p>`:`<p class="markdown-paragraph">${n.join("<br>")}</p>`}).join(`

`)}async function ht(r){const t=r.getAttribute("data-code");if(!t)return;const e=r.querySelector(".copy-icon"),n=r.querySelector(".check-icon");try{await navigator.clipboard.writeText(t),e&&n&&(e.style.display="none",n.style.display="block",setTimeout(()=>{e.style.display="block",n.style.display="none"},2e3))}catch{const i=document.createElement("textarea");i.value=t,i.style.position="fixed",i.style.opacity="0",document.body.appendChild(i),i.select();try{await navigator.clipboard.writeText(t)}catch{const u=document.createElement("textarea");u.value=t,u.style.position="fixed",u.style.opacity="0",u.style.left="-9999px",document.body.appendChild(u),u.select();try{document.execCommand("copy")}finally{document.body.removeChild(u)}}document.body.removeChild(i),e&&n&&(e.style.display="none",n.style.display="block",setTimeout(()=>{e.style.display="block",n.style.display="none"},2e3))}}function mt(){document.addEventListener("click",r=>{const e=r.target.closest(".copy-button");e&&e.classList.contains("copy-button")&&(r.preventDefault(),ht(e))})}const ft=x("快捷键+右键PopUp","😘");class bt{constructor(t,e){this.popup=t,this.onStateChange=e,this.initializeEvents()}isDragging=!1;isResizing=!1;resizeDirection=null;startX=0;startY=0;startWidth=0;initialX=0;initialY=0;startLeft=0;cleanup=null;initializeEvents(){this.popup.querySelector(".translator-header").addEventListener("mousedown",this.handleHeaderMouseDown,!0),this.popup.addEventListener("mousedown",this.handlePopupMouseDown,!0),this.setupCopyButtons(),document.addEventListener("mousemove",this.handleMouseMove,!0),document.addEventListener("mouseup",this.handleMouseUp,!0),this.cleanup=()=>{document.removeEventListener("mousemove",this.handleMouseMove,!0),document.removeEventListener("mouseup",this.handleMouseUp,!0)}}handleHeaderMouseDown=t=>{this.isDragging=!0,this.startX=t.clientX,this.startY=t.clientY,this.initialX=this.popup.offsetLeft,this.initialY=this.popup.offsetTop,t.preventDefault(),t.stopPropagation()};handlePopupMouseDown=t=>{if(t.target.closest(".translator-header"))return;const e=this.popup.getBoundingClientRect(),n=t.clientX-e.left,o=e.right-t.clientX;n<=15?(this.isResizing=!0,this.resizeDirection="left",this.startWidth=this.popup.offsetWidth,this.startX=t.clientX,this.startLeft=this.popup.offsetLeft,this.popup.classList.add("resizing-left"),t.preventDefault(),t.stopPropagation()):o<=15&&(this.isResizing=!0,this.resizeDirection="right",this.startWidth=this.popup.offsetWidth,this.startX=t.clientX,this.popup.classList.add("resizing-right"),t.preventDefault(),t.stopPropagation())};handleMouseMove=t=>{this.isResizing?this.handleResize(t):this.isDragging&&this.handleDrag(t)};handleResize(t){let e;if(this.resizeDirection==="right"){const n=t.clientX-this.startX;e=this.startWidth+n}else if(this.resizeDirection==="left"){const n=this.startX-t.clientX;e=this.startWidth+n}else return;if(e=Math.min(Math.max(300,e),1200),this.popup.style.width=`${e}px`,this.resizeDirection==="left"){const n=this.startLeft-(e-this.startWidth);this.popup.style.left=`${n}px`}t.preventDefault(),t.stopPropagation()}handleDrag(t){const e=t.clientX-this.startX,n=t.clientY-this.startY;this.popup.style.left=`${this.initialX+e}px`,this.popup.style.top=`${this.initialY+n}px`,t.preventDefault(),t.stopPropagation()}handleMouseUp=t=>{this.isResizing&&(this.isResizing=!1,this.resizeDirection=null,this.popup.classList.remove("resizing-left","resizing-right"),this.savePopupState(),t.preventDefault(),t.stopPropagation()),this.isDragging&&(this.isDragging=!1,this.savePopupState())};setupCopyButtons(){const t=this.popup.querySelector(".translator-copy-btn");t?.addEventListener("click",()=>{const n=this.popup.querySelector(".translator-translated-text")?.textContent||"";this.copyToClipboard(n,t,"复制译文")});const e=this.popup.querySelector(".translator-copy-original-btn");e?.addEventListener("click",()=>{const n=this.popup.querySelector(".translator-text")?.textContent||"";this.copyToClipboard(n,e,"复制")})}async copyToClipboard(t,e,n){try{await navigator.clipboard.writeText(t),e.textContent="已复制",setTimeout(()=>e.textContent=n,1500)}catch(o){ft.error("复制失败:",o),alert("复制失败，请重试")}}savePopupState(){const t=parseInt(this.popup.style.left),e=parseInt(this.popup.style.top),n=parseInt(this.popup.style.width);!isNaN(t)&&!isNaN(e)&&!isNaN(n)&&this.onStateChange({left:t,top:e,width:n})}destroy(){this.cleanup&&this.cleanup()}}const wt=`
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


  /* 显式暗色主题，父元素设置 data-theme=dark 时启用 */
  [data-theme="dark"] .markdown-content {
    color: #e5e5e5;
  }
  [data-theme="dark"] .markdown-paragraph,
  [data-theme="dark"] .markdown-content h1,
  [data-theme="dark"] .markdown-content h2,
  [data-theme="dark"] .markdown-content h3,
  [data-theme="dark"] .markdown-content h4,
  [data-theme="dark"] .markdown-content h5,
  [data-theme="dark"] .markdown-content h6 { color: #e5e5e5; }
  [data-theme="dark"] .code-block-container { border-color: #444; background: linear-gradient(135deg, #2a2a2a 0%, #333 100%); }
  [data-theme="dark"] .code-block-header { background: linear-gradient(135deg, #333 0%, #444 100%); border-bottom-color: #444; }
  [data-theme="dark"] .code-language, [data-theme="dark"] .copy-button { color: #9ca3af; }
  [data-theme="dark"] .copy-button:hover { background: #444; color: #e5e5e5; }
  [data-theme="dark"] .copy-button:active { background: #555; }
  [data-theme="dark"] .code-block { background: transparent; }
  [data-theme="dark"] .code-block code { color: #e5e5e5; }
  [data-theme="dark"] .inline-code { background: rgba(255,255,255,0.1); color: #ff6b9d; }
  [data-theme="dark"] .markdown-quote { background: linear-gradient(135deg, #2d1b0a 0%, #3d2a0f 100%); color: #d97706; }
  [data-theme="dark"] .markdown-table th { background: linear-gradient(135deg, #2a2a2a 0%, #333 100%); color: #e5e5e5; border-bottom-color: #444; }
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

  /* 明确支持通过 data-theme=dark 触发暗色（优先于系统） */
  .translator-popup[data-theme="dark"] {
    background: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
    color: #e5e5e5;
  }
  .translator-popup[data-theme="dark"] .translator-header {
    background: rgba(26, 26, 26, 0.95);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  .translator-popup[data-theme="dark"] .translator-title,
  .translator-popup[data-theme="dark"] .translator-text,
  .translator-popup[data-theme="dark"] .translator-translated-text {
    color: #e5e5e5;
  }
  .translator-popup[data-theme="dark"] .translator-reasoning-text {
    background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
    color: #b0b0b0;
    border-left-color: #666;
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
`;function yt(){if(!document.querySelector("#translator-popup-style")){const r=document.createElement("style");r.id="translator-popup-style",r.textContent=wt,document.head.appendChild(r)}}function kt(r,t){const e=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)"),n=t==="system"?e?.matches?"dark":"light":t;r.setAttribute("data-theme",n)}const m=x("content-popup","🔽");class vt{lastPopupState={left:null,top:null,width:null};currentPopup=null;eventHandler=null;userHasScrolled=!1;showPopup(t){m.log("显示弹窗",{textLength:t?.length||0,textPreview:t?.substring(0,50)+"...",hasCurrentPopup:!!this.currentPopup,timestamp:new Date().toISOString()}),this.removeCurrentPopup();const e=this.createPopupElement(t);return this.currentPopup=e,document.body.appendChild(e),mt(),this.positionPopup(e),this.setupEventHandlers(e),this.setupScrollDetection(e),m.log("✅ [PopupManager] 弹窗创建完成",{popupElement:e.className,parentElement:e.parentElement?.tagName}),e}updateTranslation(t){if(m.log("🔄 [PopupManager] 更新翻译",{hasPopup:!!this.currentPopup,hasContent:!!t.content,contentLength:t.content?.length||0,hasReasoning:!!t.reasoningContent,reasoningLength:t.reasoningContent?.length||0,done:t.done,error:t.error}),!this.currentPopup)return m.log("❌ [PopupManager] 翻译弹窗不存在，可能已关闭"),!1;const e=this.getPopupElements();return!e.translatedTextEl||!e.reasoningTextEl||!e.loadingEl?(m.log("❌ [PopupManager] 弹窗元素不完整",{hasTranslatedEl:!!e.translatedTextEl,hasReasoningEl:!!e.reasoningTextEl,hasLoadingEl:!!e.loadingEl}),!1):(t.error?(m.log("❌ [PopupManager] 处理翻译错误"),this.handleTranslationError(t.error,e.loadingEl)):(m.log("✅ [PopupManager] 处理翻译更新"),this.handleTranslationUpdate(t,e)),!0)}removeCurrentPopup(){this.currentPopup&&(this.savePopupState(this.currentPopup),this.eventHandler&&(this.eventHandler.destroy(),this.eventHandler=null),this.currentPopup.remove(),this.currentPopup=null)}createPopupElement(t){const e=document.createElement("div");return e.className="translator-popup",e.innerHTML=`
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
    `,X.getSettings().then(n=>{try{kt(e,n.theme||"system")}catch{}}).catch(()=>{}),e}positionPopup(t){const e=window.innerWidth,n=window.innerHeight;let o=e-420,i=20,h=400;this.lastPopupState.left!==null&&this.lastPopupState.top!==null&&(o=Math.min(Math.max(0,this.lastPopupState.left),e-300),i=Math.min(Math.max(0,this.lastPopupState.top),n-100)),this.lastPopupState.width!==null&&(h=Math.min(Math.max(300,this.lastPopupState.width),1200)),t.style.left=`${o}px`,t.style.top=`${i}px`,t.style.width=`${h}px`}setupEventHandlers(t){this.eventHandler=new bt(t,e=>{this.lastPopupState=e,m.log("保存弹窗状态:",e)}),t.querySelector(".translator-close-btn")?.addEventListener("click",()=>{k.runtime.sendMessage({action:S.CLEANUP}),this.removeCurrentPopup()}),t.querySelector(".translator-copy-original-btn")?.addEventListener("click",async()=>{const e=t.querySelector(".translator-text")?.textContent;if(e)try{await navigator.clipboard.writeText(e),m.log("原文已复制")}catch(n){m.error("复制原文失败:",n)}}),t.querySelector(".translator-copy-btn")?.addEventListener("click",async()=>{const e=t.querySelector(".translator-translated-text")?.textContent;if(e)try{await navigator.clipboard.writeText(e),m.log("译文已复制")}catch(n){m.error("复制译文失败:",n)}})}setupScrollDetection(t){const e=t.querySelector(".translator-content");this.userHasScrolled=!1,e.addEventListener("scroll",()=>{const n=e.scrollHeight-e.scrollTop<=e.clientHeight+1;this.userHasScrolled=!n}),t.userHasScrolled=()=>this.userHasScrolled}getPopupElements(){return this.currentPopup?{translatedTextEl:this.currentPopup.querySelector(".translator-translated-text"),reasoningSectionEl:this.currentPopup.querySelector(".translator-section-reasoning"),reasoningTextEl:this.currentPopup.querySelector(".translator-reasoning-text"),loadingEl:this.currentPopup.querySelector(".translator-loading"),contentEl:this.currentPopup.querySelector(".translator-content")}:{}}handleTranslationError(t,e){m.log("翻译发生错误:",t),t.includes("API Key")||t.includes("API 请求失败")||t.includes("rate limit")?e.textContent="翻译失败："+t:e.textContent="翻译失败，请重试"}handleTranslationUpdate(t,e){m.log("更新翻译结果",{hasContent:!!t.content,hasReasoning:t.hasReasoning,reasoningContentLength:t.reasoningContent?.length||0,done:t.done}),t.content&&(e.translatedTextEl.innerHTML=G(t.content)),e.reasoningSectionEl&&e.reasoningTextEl&&(m.log("处理思维链内容:",{hasReasoning:t.hasReasoning,reasoningContent:t.reasoningContent}),t.hasReasoning&&t.reasoningContent?(e.reasoningSectionEl.style.display="block",e.reasoningTextEl.innerHTML=G(t.reasoningContent),m.log("思维链已显示")):t.hasReasoning||(e.reasoningSectionEl.style.display="none")),t.done&&(m.log("翻译完成"),e.loadingEl.style.display="none"),!this.userHasScrolled&&e.contentEl&&(e.contentEl.scrollTop=e.contentEl.scrollHeight)}savePopupState(t){const e=parseInt(t.style.left),n=parseInt(t.style.top),o=parseInt(t.style.width);!isNaN(e)&&!isNaN(n)&&!isNaN(o)&&(this.lastPopupState={left:e,top:n,width:o})}}const Ct={matches:["<all_urls>"],main(){rt(),B.info("人话翻译器 content script 启动"),yt();const r=new vt,t=new it(r);k.runtime.onMessage.addListener(t.handleMessage),B.success("Content script 初始化完成")}};function M(r,...t){}const xt={debug:(...r)=>M(console.debug,...r),log:(...r)=>M(console.log,...r),warn:(...r)=>M(console.warn,...r),error:(...r)=>M(console.error,...r)};class O extends Event{constructor(t,e){super(O.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=e}static EVENT_NAME=z("wxt:locationchange")}function z(r){return`${k?.runtime?.id}:content:${r}`}function St(r){let t,e;return{run(){t==null&&(e=new URL(location.href),t=r.setInterval(()=>{let n=new URL(location.href);n.href!==e.href&&(window.dispatchEvent(new O(n,e)),e=n)},1e3))}}}class ${constructor(t,e){this.contentScriptName=t,this.options=e,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}static SCRIPT_STARTED_MESSAGE_TYPE=z("wxt:content-script-started");isTopFrame=window.self===window.top;abortController;locationWatcher=St(this);receivedMessageIds=new Set;get signal(){return this.abortController.signal}abort(t){return this.abortController.abort(t)}get isInvalid(){return k.runtime.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(t){return this.signal.addEventListener("abort",t),()=>this.signal.removeEventListener("abort",t)}block(){return new Promise(()=>{})}setInterval(t,e){const n=setInterval(()=>{this.isValid&&t()},e);return this.onInvalidated(()=>clearInterval(n)),n}setTimeout(t,e){const n=setTimeout(()=>{this.isValid&&t()},e);return this.onInvalidated(()=>clearTimeout(n)),n}requestAnimationFrame(t){const e=requestAnimationFrame((...n)=>{this.isValid&&t(...n)});return this.onInvalidated(()=>cancelAnimationFrame(e)),e}requestIdleCallback(t,e){const n=requestIdleCallback((...o)=>{this.signal.aborted||t(...o)},e);return this.onInvalidated(()=>cancelIdleCallback(n)),n}addEventListener(t,e,n,o){e==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),t.addEventListener?.(e.startsWith("wxt:")?z(e):e,n,{...o,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),xt.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:$.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:Math.random().toString(36).slice(2)},"*")}verifyScriptStartedEvent(t){const e=t.data?.type===$.SCRIPT_STARTED_MESSAGE_TYPE,n=t.data?.contentScriptName===this.contentScriptName,o=!this.receivedMessageIds.has(t.data?.messageId);return e&&n&&o}listenForNewerScripts(t){let e=!0;const n=o=>{if(this.verifyScriptStartedEvent(o)){this.receivedMessageIds.add(o.data.messageId);const i=e;if(e=!1,i&&t?.ignoreFirstEvent)return;this.notifyInvalidated()}};addEventListener("message",n),this.onInvalidated(()=>removeEventListener("message",n))}}function It(){}function I(r,...t){}const Et={debug:(...r)=>I(console.debug,...r),log:(...r)=>I(console.log,...r),warn:(...r)=>I(console.warn,...r),error:(...r)=>I(console.error,...r)};return(async()=>{try{const{main:r,...t}=Ct,e=new $("content",t);return await r(e)}catch(r){throw Et.error('The content script "content" crashed on startup!',r),r}})()})();
content;