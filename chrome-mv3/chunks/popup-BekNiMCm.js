var qe=Object.defineProperty;var et=(t,e,n)=>e in t?qe(t,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[e]=n;var je=(t,e,n)=>et(t,typeof e!="symbol"?e+"":e,n);import{g as tt,c as ce,r as S,j as h,I as ue,b as O,D as P,a as nt,R as st}from"./index-BXAuhc5c.js";var ge={exports:{}},rt=ge.exports,Te;function it(){return Te||(Te=1,(function(t,e){(function(n,s){t.exports=s()})(rt,(function(){var n=1e3,s=6e4,r=36e5,i="millisecond",c="second",o="minute",a="hour",l="day",g="week",m="month",b="quarter",w="year",C="date",N="Invalid Date",F=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,R=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,E={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(v){var y=["th","st","nd","rd"],p=v%100;return"["+v+(y[(p-20)%10]||y[p]||y[0])+"]"}},j=function(v,y,p){var A=String(v);return!A||A.length>=y?v:""+Array(y+1-A.length).join(p)+v},k={s:j,z:function(v){var y=-v.utcOffset(),p=Math.abs(y),A=Math.floor(p/60),x=p%60;return(y<=0?"+":"-")+j(A,2,"0")+":"+j(x,2,"0")},m:function v(y,p){if(y.date()<p.date())return-v(p,y);var A=12*(p.year()-y.year())+(p.month()-y.month()),x=y.clone().add(A,m),D=p-x<0,_=y.clone().add(A+(D?-1:1),m);return+(-(A+(p-x)/(D?x-_:_-x))||0)},a:function(v){return v<0?Math.ceil(v)||0:Math.floor(v)},p:function(v){return{M:m,y:w,w:g,d:l,D:C,h:a,m:o,s:c,ms:i,Q:b}[v]||String(v||"").toLowerCase().replace(/s$/,"")},u:function(v){return v===void 0}},u="en",f={};f[u]=E;var d="$isDayjsObject",M=function(v){return v instanceof J||!(!v||!v[d])},T=function v(y,p,A){var x;if(!y)return u;if(typeof y=="string"){var D=y.toLowerCase();f[D]&&(x=D),p&&(f[D]=p,x=D);var _=y.split("-");if(!x&&_.length>1)return v(_[0])}else{var B=y.name;f[B]=y,x=B}return!A&&x&&(u=x),x||!A&&u},I=function(v,y){if(M(v))return v.clone();var p=typeof y=="object"?y:{};return p.date=v,p.args=arguments,new J(p)},L=k;L.l=T,L.i=M,L.w=function(v,y){return I(v,{locale:y.$L,utc:y.$u,x:y.$x,$offset:y.$offset})};var J=(function(){function v(p){this.$L=T(p.locale,null,!0),this.parse(p),this.$x=this.$x||p.x||{},this[d]=!0}var y=v.prototype;return y.parse=function(p){this.$d=(function(A){var x=A.date,D=A.utc;if(x===null)return new Date(NaN);if(L.u(x))return new Date;if(x instanceof Date)return new Date(x);if(typeof x=="string"&&!/Z$/i.test(x)){var _=x.match(F);if(_){var B=_[2]-1||0,H=(_[7]||"0").substring(0,3);return D?new Date(Date.UTC(_[1],B,_[3]||1,_[4]||0,_[5]||0,_[6]||0,H)):new Date(_[1],B,_[3]||1,_[4]||0,_[5]||0,_[6]||0,H)}}return new Date(x)})(p),this.init()},y.init=function(){var p=this.$d;this.$y=p.getFullYear(),this.$M=p.getMonth(),this.$D=p.getDate(),this.$W=p.getDay(),this.$H=p.getHours(),this.$m=p.getMinutes(),this.$s=p.getSeconds(),this.$ms=p.getMilliseconds()},y.$utils=function(){return L},y.isValid=function(){return this.$d.toString()!==N},y.isSame=function(p,A){var x=I(p);return this.startOf(A)<=x&&x<=this.endOf(A)},y.isAfter=function(p,A){return I(p)<this.startOf(A)},y.isBefore=function(p,A){return this.endOf(A)<I(p)},y.$g=function(p,A,x){return L.u(p)?this[A]:this.set(x,p)},y.unix=function(){return Math.floor(this.valueOf()/1e3)},y.valueOf=function(){return this.$d.getTime()},y.startOf=function(p,A){var x=this,D=!!L.u(A)||A,_=L.p(p),B=function(te,W){var Z=L.w(x.$u?Date.UTC(x.$y,W,te):new Date(x.$y,W,te),x);return D?Z:Z.endOf(l)},H=function(te,W){return L.w(x.toDate()[te].apply(x.toDate("s"),(D?[0,0,0,0]:[23,59,59,999]).slice(W)),x)},U=this.$W,K=this.$M,V=this.$D,se="set"+(this.$u?"UTC":"");switch(_){case w:return D?B(1,0):B(31,11);case m:return D?B(1,K):B(0,K+1);case g:var ee=this.$locale().weekStart||0,ie=(U<ee?U+7:U)-ee;return B(D?V-ie:V+(6-ie),K);case l:case C:return H(se+"Hours",0);case a:return H(se+"Minutes",1);case o:return H(se+"Seconds",2);case c:return H(se+"Milliseconds",3);default:return this.clone()}},y.endOf=function(p){return this.startOf(p,!1)},y.$set=function(p,A){var x,D=L.p(p),_="set"+(this.$u?"UTC":""),B=(x={},x[l]=_+"Date",x[C]=_+"Date",x[m]=_+"Month",x[w]=_+"FullYear",x[a]=_+"Hours",x[o]=_+"Minutes",x[c]=_+"Seconds",x[i]=_+"Milliseconds",x)[D],H=D===l?this.$D+(A-this.$W):A;if(D===m||D===w){var U=this.clone().set(C,1);U.$d[B](H),U.init(),this.$d=U.set(C,Math.min(this.$D,U.daysInMonth())).$d}else B&&this.$d[B](H);return this.init(),this},y.set=function(p,A){return this.clone().$set(p,A)},y.get=function(p){return this[L.p(p)]()},y.add=function(p,A){var x,D=this;p=Number(p);var _=L.p(A),B=function(K){var V=I(D);return L.w(V.date(V.date()+Math.round(K*p)),D)};if(_===m)return this.set(m,this.$M+p);if(_===w)return this.set(w,this.$y+p);if(_===l)return B(1);if(_===g)return B(7);var H=(x={},x[o]=s,x[a]=r,x[c]=n,x)[_]||1,U=this.$d.getTime()+p*H;return L.w(U,this)},y.subtract=function(p,A){return this.add(-1*p,A)},y.format=function(p){var A=this,x=this.$locale();if(!this.isValid())return x.invalidDate||N;var D=p||"YYYY-MM-DDTHH:mm:ssZ",_=L.z(this),B=this.$H,H=this.$m,U=this.$M,K=x.weekdays,V=x.months,se=x.meridiem,ee=function(W,Z,oe,le){return W&&(W[Z]||W(A,D))||oe[Z].slice(0,le)},ie=function(W){return L.s(B%12||12,W,"0")},te=se||function(W,Z,oe){var le=W<12?"AM":"PM";return oe?le.toLowerCase():le};return D.replace(R,(function(W,Z){return Z||(function(oe){switch(oe){case"YY":return String(A.$y).slice(-2);case"YYYY":return L.s(A.$y,4,"0");case"M":return U+1;case"MM":return L.s(U+1,2,"0");case"MMM":return ee(x.monthsShort,U,V,3);case"MMMM":return ee(V,U);case"D":return A.$D;case"DD":return L.s(A.$D,2,"0");case"d":return String(A.$W);case"dd":return ee(x.weekdaysMin,A.$W,K,2);case"ddd":return ee(x.weekdaysShort,A.$W,K,3);case"dddd":return K[A.$W];case"H":return String(B);case"HH":return L.s(B,2,"0");case"h":return ie(1);case"hh":return ie(2);case"a":return te(B,H,!0);case"A":return te(B,H,!1);case"m":return String(H);case"mm":return L.s(H,2,"0");case"s":return String(A.$s);case"ss":return L.s(A.$s,2,"0");case"SSS":return L.s(A.$ms,3,"0");case"Z":return _}return null})(W)||_.replace(":","")}))},y.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},y.diff=function(p,A,x){var D,_=this,B=L.p(A),H=I(p),U=(H.utcOffset()-this.utcOffset())*s,K=this-H,V=function(){return L.m(_,H)};switch(B){case w:D=V()/12;break;case m:D=V();break;case b:D=V()/3;break;case g:D=(K-U)/6048e5;break;case l:D=(K-U)/864e5;break;case a:D=K/r;break;case o:D=K/s;break;case c:D=K/n;break;default:D=K}return x?D:L.a(D)},y.daysInMonth=function(){return this.endOf(m).$D},y.$locale=function(){return f[this.$L]},y.locale=function(p,A){if(!p)return this.$L;var x=this.clone(),D=T(p,A,!0);return D&&(x.$L=D),x},y.clone=function(){return L.w(this.$d,this)},y.toDate=function(){return new Date(this.valueOf())},y.toJSON=function(){return this.isValid()?this.toISOString():null},y.toISOString=function(){return this.$d.toISOString()},y.toString=function(){return this.$d.toUTCString()},v})(),xe=J.prototype;return I.prototype=xe,[["$ms",i],["$s",c],["$m",o],["$H",a],["$W",l],["$M",m],["$y",w],["$D",C]].forEach((function(v){xe[v[1]]=function(y){return this.$g(y,v[0],v[1])}})),I.extend=function(v,y){return v.$i||(v(y,J,I),v.$i=!0),I},I.locale=T,I.isDayjs=M,I.unix=function(v){return I(1e3*v)},I.en=f[u],I.Ls=f,I.p={},I}))})(ge)),ge.exports}var ot=it();const at=tt(ot);function me(t){var e=typeof t;return t!=null&&(e=="object"||e=="function")}var ct=typeof global=="object"&&global&&global.Object===Object&&global,lt=typeof self=="object"&&self&&self.Object===Object&&self,Oe=ct||lt||Function("return this")(),we=function(){return Oe.Date.now()},ut=/\s/;function ht(t){for(var e=t.length;e--&&ut.test(t.charAt(e)););return e}var dt=/^\s+/;function gt(t){return t&&t.slice(0,ht(t)+1).replace(dt,"")}var pe=Oe.Symbol,He=Object.prototype,ft=He.hasOwnProperty,mt=He.toString,ae=pe?pe.toStringTag:void 0;function pt(t){var e=ft.call(t,ae),n=t[ae];try{t[ae]=void 0;var s=!0}catch{}var r=mt.call(t);return s&&(e?t[ae]=n:delete t[ae]),r}var yt=Object.prototype,bt=yt.toString;function xt(t){return bt.call(t)}var wt="[object Null]",kt="[object Undefined]",De=pe?pe.toStringTag:void 0;function Ct(t){return t==null?t===void 0?kt:wt:De&&De in Object(t)?pt(t):xt(t)}function vt(t){return t!=null&&typeof t=="object"}var At="[object Symbol]";function Et(t){return typeof t=="symbol"||vt(t)&&Ct(t)==At}var _e=NaN,Mt=/^[-+]0x[0-9a-f]+$/i,St=/^0b[01]+$/i,$t=/^0o[0-7]+$/i,jt=parseInt;function Ie(t){if(typeof t=="number")return t;if(Et(t))return _e;if(me(t)){var e=typeof t.valueOf=="function"?t.valueOf():t;t=me(e)?e+"":e}if(typeof t!="string")return t===0?t:+t;t=gt(t);var n=St.test(t);return n||$t.test(t)?jt(t.slice(2),n?2:8):Mt.test(t)?_e:+t}var Tt="Expected a function",Dt=Math.max,_t=Math.min;function Pe(t,e,n){var s,r,i,c,o,a,l=0,g=!1,m=!1,b=!0;if(typeof t!="function")throw new TypeError(Tt);e=Ie(e)||0,me(n)&&(g=!!n.leading,m="maxWait"in n,i=m?Dt(Ie(n.maxWait)||0,e):i,b="trailing"in n?!!n.trailing:b);function w(f){var d=s,M=r;return s=r=void 0,l=f,c=t.apply(M,d),c}function C(f){return l=f,o=setTimeout(R,e),g?w(f):c}function N(f){var d=f-a,M=f-l,T=e-d;return m?_t(T,i-M):T}function F(f){var d=f-a,M=f-l;return a===void 0||d>=e||d<0||m&&M>=i}function R(){var f=we();if(F(f))return E(f);o=setTimeout(R,N(f))}function E(f){return o=void 0,b&&s?w(f):(s=r=void 0,c)}function j(){o!==void 0&&clearTimeout(o),l=0,s=a=r=o=void 0}function k(){return o===void 0?c:E(we())}function u(){var f=we(),d=F(f);if(s=arguments,r=this,a=f,d){if(o===void 0)return C(a);if(m)return clearTimeout(o),o=setTimeout(R,e),w(a)}return o===void 0&&(o=setTimeout(R,e)),c}return u.cancel=j,u.flush=k,u}var It="Expected a function";function Nt(t,e,n){var s=!0,r=!0;if(typeof t!="function")throw new TypeError(It);return me(n)&&(s="leading"in n?!!n.leading:s,r="trailing"in n?!!n.trailing:r),Pe(t,e,{leading:s,maxWait:e,trailing:r})}ce("popup-helpers","🛠️");function Ft(t){return at(t).format("YYYY-MM-DD HH:mm")}function X(t){return Array.isArray?Array.isArray(t):We(t)==="[object Array]"}function Lt(t){if(typeof t=="string")return t;let e=t+"";return e=="0"&&1/t==-1/0?"-0":e}function Rt(t){return t==null?"":Lt(t)}function Q(t){return typeof t=="string"}function Ue(t){return typeof t=="number"}function Bt(t){return t===!0||t===!1||Ot(t)&&We(t)=="[object Boolean]"}function Ke(t){return typeof t=="object"}function Ot(t){return Ke(t)&&t!==null}function Y(t){return t!=null}function ke(t){return!t.trim().length}function We(t){return t==null?t===void 0?"[object Undefined]":"[object Null]":Object.prototype.toString.call(t)}const Ht="Incorrect 'index' type",Pt=t=>`Invalid value for key ${t}`,Ut=t=>`Pattern length exceeds max of ${t}.`,Kt=t=>`Missing ${t} property in key`,Wt=t=>`Property 'weight' in key '${t}' must be a positive integer`,Ne=Object.prototype.hasOwnProperty;class zt{constructor(e){this._keys=[],this._keyMap={};let n=0;e.forEach(s=>{let r=ze(s);this._keys.push(r),this._keyMap[r.id]=r,n+=r.weight}),this._keys.forEach(s=>{s.weight/=n})}get(e){return this._keyMap[e]}keys(){return this._keys}toJSON(){return JSON.stringify(this._keys)}}function ze(t){let e=null,n=null,s=null,r=1,i=null;if(Q(t)||X(t))s=t,e=Fe(t),n=Ce(t);else{if(!Ne.call(t,"name"))throw new Error(Kt("name"));const c=t.name;if(s=c,Ne.call(t,"weight")&&(r=t.weight,r<=0))throw new Error(Wt(c));e=Fe(c),n=Ce(c),i=t.getFn}return{path:e,id:n,weight:r,src:s,getFn:i}}function Fe(t){return X(t)?t:t.split(".")}function Ce(t){return X(t)?t.join("."):t}function Yt(t,e){let n=[],s=!1;const r=(i,c,o)=>{if(Y(i))if(!c[o])n.push(i);else{let a=c[o];const l=i[a];if(!Y(l))return;if(o===c.length-1&&(Q(l)||Ue(l)||Bt(l)))n.push(Rt(l));else if(X(l)){s=!0;for(let g=0,m=l.length;g<m;g+=1)r(l[g],c,o+1)}else c.length&&r(l,c,o+1)}};return r(t,Q(e)?e.split("."):e,0),s?n:n[0]}const Vt={includeMatches:!1,findAllMatches:!1,minMatchCharLength:1},Gt={isCaseSensitive:!1,ignoreDiacritics:!1,includeScore:!1,keys:[],shouldSort:!0,sortFn:(t,e)=>t.score===e.score?t.idx<e.idx?-1:1:t.score<e.score?-1:1},Jt={location:0,threshold:.6,distance:100},Qt={useExtendedSearch:!1,getFn:Yt,ignoreLocation:!1,ignoreFieldNorm:!1,fieldNormWeight:1};var $={...Gt,...Vt,...Jt,...Qt};const Xt=/[^ ]+/g;function Zt(t=1,e=3){const n=new Map,s=Math.pow(10,e);return{get(r){const i=r.match(Xt).length;if(n.has(i))return n.get(i);const c=1/Math.pow(i,.5*t),o=parseFloat(Math.round(c*s)/s);return n.set(i,o),o},clear(){n.clear()}}}class $e{constructor({getFn:e=$.getFn,fieldNormWeight:n=$.fieldNormWeight}={}){this.norm=Zt(n,3),this.getFn=e,this.isCreated=!1,this.setIndexRecords()}setSources(e=[]){this.docs=e}setIndexRecords(e=[]){this.records=e}setKeys(e=[]){this.keys=e,this._keysMap={},e.forEach((n,s)=>{this._keysMap[n.id]=s})}create(){this.isCreated||!this.docs.length||(this.isCreated=!0,Q(this.docs[0])?this.docs.forEach((e,n)=>{this._addString(e,n)}):this.docs.forEach((e,n)=>{this._addObject(e,n)}),this.norm.clear())}add(e){const n=this.size();Q(e)?this._addString(e,n):this._addObject(e,n)}removeAt(e){this.records.splice(e,1);for(let n=e,s=this.size();n<s;n+=1)this.records[n].i-=1}getValueForItemAtKeyId(e,n){return e[this._keysMap[n]]}size(){return this.records.length}_addString(e,n){if(!Y(e)||ke(e))return;let s={v:e,i:n,n:this.norm.get(e)};this.records.push(s)}_addObject(e,n){let s={i:n,$:{}};this.keys.forEach((r,i)=>{let c=r.getFn?r.getFn(e):this.getFn(e,r.path);if(Y(c)){if(X(c)){let o=[];const a=[{nestedArrIndex:-1,value:c}];for(;a.length;){const{nestedArrIndex:l,value:g}=a.pop();if(Y(g))if(Q(g)&&!ke(g)){let m={v:g,i:l,n:this.norm.get(g)};o.push(m)}else X(g)&&g.forEach((m,b)=>{a.push({nestedArrIndex:b,value:m})})}s.$[i]=o}else if(Q(c)&&!ke(c)){let o={v:c,n:this.norm.get(c)};s.$[i]=o}}}),this.records.push(s)}toJSON(){return{keys:this.keys,records:this.records}}}function Ye(t,e,{getFn:n=$.getFn,fieldNormWeight:s=$.fieldNormWeight}={}){const r=new $e({getFn:n,fieldNormWeight:s});return r.setKeys(t.map(ze)),r.setSources(e),r.create(),r}function qt(t,{getFn:e=$.getFn,fieldNormWeight:n=$.fieldNormWeight}={}){const{keys:s,records:r}=t,i=new $e({getFn:e,fieldNormWeight:n});return i.setKeys(s),i.setIndexRecords(r),i}function he(t,{errors:e=0,currentLocation:n=0,expectedLocation:s=0,distance:r=$.distance,ignoreLocation:i=$.ignoreLocation}={}){const c=e/t.length;if(i)return c;const o=Math.abs(s-n);return r?c+o/r:o?1:c}function en(t=[],e=$.minMatchCharLength){let n=[],s=-1,r=-1,i=0;for(let c=t.length;i<c;i+=1){let o=t[i];o&&s===-1?s=i:!o&&s!==-1&&(r=i-1,r-s+1>=e&&n.push([s,r]),s=-1)}return t[i-1]&&i-s>=e&&n.push([s,i-1]),n}const ne=32;function tn(t,e,n,{location:s=$.location,distance:r=$.distance,threshold:i=$.threshold,findAllMatches:c=$.findAllMatches,minMatchCharLength:o=$.minMatchCharLength,includeMatches:a=$.includeMatches,ignoreLocation:l=$.ignoreLocation}={}){if(e.length>ne)throw new Error(Ut(ne));const g=e.length,m=t.length,b=Math.max(0,Math.min(s,m));let w=i,C=b;const N=o>1||a,F=N?Array(m):[];let R;for(;(R=t.indexOf(e,C))>-1;){let d=he(e,{currentLocation:R,expectedLocation:b,distance:r,ignoreLocation:l});if(w=Math.min(d,w),C=R+g,N){let M=0;for(;M<g;)F[R+M]=1,M+=1}}C=-1;let E=[],j=1,k=g+m;const u=1<<g-1;for(let d=0;d<g;d+=1){let M=0,T=k;for(;M<T;)he(e,{errors:d,currentLocation:b+T,expectedLocation:b,distance:r,ignoreLocation:l})<=w?M=T:k=T,T=Math.floor((k-M)/2+M);k=T;let I=Math.max(1,b-T+1),L=c?m:Math.min(b+T,m)+g,J=Array(L+2);J[L+1]=(1<<d)-1;for(let v=L;v>=I;v-=1){let y=v-1,p=n[t.charAt(y)];if(N&&(F[y]=+!!p),J[v]=(J[v+1]<<1|1)&p,d&&(J[v]|=(E[v+1]|E[v])<<1|1|E[v+1]),J[v]&u&&(j=he(e,{errors:d,currentLocation:y,expectedLocation:b,distance:r,ignoreLocation:l}),j<=w)){if(w=j,C=y,C<=b)break;I=Math.max(1,2*b-C)}}if(he(e,{errors:d+1,currentLocation:b,expectedLocation:b,distance:r,ignoreLocation:l})>w)break;E=J}const f={isMatch:C>=0,score:Math.max(.001,j)};if(N){const d=en(F,o);d.length?a&&(f.indices=d):f.isMatch=!1}return f}function nn(t){let e={};for(let n=0,s=t.length;n<s;n+=1){const r=t.charAt(n);e[r]=(e[r]||0)|1<<s-n-1}return e}const ye=String.prototype.normalize?(t=>t.normalize("NFD").replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g,"")):(t=>t);class Ve{constructor(e,{location:n=$.location,threshold:s=$.threshold,distance:r=$.distance,includeMatches:i=$.includeMatches,findAllMatches:c=$.findAllMatches,minMatchCharLength:o=$.minMatchCharLength,isCaseSensitive:a=$.isCaseSensitive,ignoreDiacritics:l=$.ignoreDiacritics,ignoreLocation:g=$.ignoreLocation}={}){if(this.options={location:n,threshold:s,distance:r,includeMatches:i,findAllMatches:c,minMatchCharLength:o,isCaseSensitive:a,ignoreDiacritics:l,ignoreLocation:g},e=a?e:e.toLowerCase(),e=l?ye(e):e,this.pattern=e,this.chunks=[],!this.pattern.length)return;const m=(w,C)=>{this.chunks.push({pattern:w,alphabet:nn(w),startIndex:C})},b=this.pattern.length;if(b>ne){let w=0;const C=b%ne,N=b-C;for(;w<N;)m(this.pattern.substr(w,ne),w),w+=ne;if(C){const F=b-ne;m(this.pattern.substr(F),F)}}else m(this.pattern,0)}searchIn(e){const{isCaseSensitive:n,ignoreDiacritics:s,includeMatches:r}=this.options;if(e=n?e:e.toLowerCase(),e=s?ye(e):e,this.pattern===e){let N={isMatch:!0,score:0};return r&&(N.indices=[[0,e.length-1]]),N}const{location:i,distance:c,threshold:o,findAllMatches:a,minMatchCharLength:l,ignoreLocation:g}=this.options;let m=[],b=0,w=!1;this.chunks.forEach(({pattern:N,alphabet:F,startIndex:R})=>{const{isMatch:E,score:j,indices:k}=tn(e,N,F,{location:i+R,distance:c,threshold:o,findAllMatches:a,minMatchCharLength:l,includeMatches:r,ignoreLocation:g});E&&(w=!0),b+=j,E&&k&&(m=[...m,...k])});let C={isMatch:w,score:w?b/this.chunks.length:1};return w&&r&&(C.indices=m),C}}class q{constructor(e){this.pattern=e}static isMultiMatch(e){return Le(e,this.multiRegex)}static isSingleMatch(e){return Le(e,this.singleRegex)}search(){}}function Le(t,e){const n=t.match(e);return n?n[1]:null}class sn extends q{constructor(e){super(e)}static get type(){return"exact"}static get multiRegex(){return/^="(.*)"$/}static get singleRegex(){return/^=(.*)$/}search(e){const n=e===this.pattern;return{isMatch:n,score:n?0:1,indices:[0,this.pattern.length-1]}}}class rn extends q{constructor(e){super(e)}static get type(){return"inverse-exact"}static get multiRegex(){return/^!"(.*)"$/}static get singleRegex(){return/^!(.*)$/}search(e){const s=e.indexOf(this.pattern)===-1;return{isMatch:s,score:s?0:1,indices:[0,e.length-1]}}}class on extends q{constructor(e){super(e)}static get type(){return"prefix-exact"}static get multiRegex(){return/^\^"(.*)"$/}static get singleRegex(){return/^\^(.*)$/}search(e){const n=e.startsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[0,this.pattern.length-1]}}}class an extends q{constructor(e){super(e)}static get type(){return"inverse-prefix-exact"}static get multiRegex(){return/^!\^"(.*)"$/}static get singleRegex(){return/^!\^(.*)$/}search(e){const n=!e.startsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[0,e.length-1]}}}class cn extends q{constructor(e){super(e)}static get type(){return"suffix-exact"}static get multiRegex(){return/^"(.*)"\$$/}static get singleRegex(){return/^(.*)\$$/}search(e){const n=e.endsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[e.length-this.pattern.length,e.length-1]}}}class ln extends q{constructor(e){super(e)}static get type(){return"inverse-suffix-exact"}static get multiRegex(){return/^!"(.*)"\$$/}static get singleRegex(){return/^!(.*)\$$/}search(e){const n=!e.endsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[0,e.length-1]}}}class Ge extends q{constructor(e,{location:n=$.location,threshold:s=$.threshold,distance:r=$.distance,includeMatches:i=$.includeMatches,findAllMatches:c=$.findAllMatches,minMatchCharLength:o=$.minMatchCharLength,isCaseSensitive:a=$.isCaseSensitive,ignoreDiacritics:l=$.ignoreDiacritics,ignoreLocation:g=$.ignoreLocation}={}){super(e),this._bitapSearch=new Ve(e,{location:n,threshold:s,distance:r,includeMatches:i,findAllMatches:c,minMatchCharLength:o,isCaseSensitive:a,ignoreDiacritics:l,ignoreLocation:g})}static get type(){return"fuzzy"}static get multiRegex(){return/^"(.*)"$/}static get singleRegex(){return/^(.*)$/}search(e){return this._bitapSearch.searchIn(e)}}class Je extends q{constructor(e){super(e)}static get type(){return"include"}static get multiRegex(){return/^'"(.*)"$/}static get singleRegex(){return/^'(.*)$/}search(e){let n=0,s;const r=[],i=this.pattern.length;for(;(s=e.indexOf(this.pattern,n))>-1;)n=s+i,r.push([s,n-1]);const c=!!r.length;return{isMatch:c,score:c?0:1,indices:r}}}const ve=[sn,Je,on,an,ln,cn,rn,Ge],Re=ve.length,un=/ +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/,hn="|";function dn(t,e={}){return t.split(hn).map(n=>{let s=n.trim().split(un).filter(i=>i&&!!i.trim()),r=[];for(let i=0,c=s.length;i<c;i+=1){const o=s[i];let a=!1,l=-1;for(;!a&&++l<Re;){const g=ve[l];let m=g.isMultiMatch(o);m&&(r.push(new g(m,e)),a=!0)}if(!a)for(l=-1;++l<Re;){const g=ve[l];let m=g.isSingleMatch(o);if(m){r.push(new g(m,e));break}}}return r})}const gn=new Set([Ge.type,Je.type]);class fn{constructor(e,{isCaseSensitive:n=$.isCaseSensitive,ignoreDiacritics:s=$.ignoreDiacritics,includeMatches:r=$.includeMatches,minMatchCharLength:i=$.minMatchCharLength,ignoreLocation:c=$.ignoreLocation,findAllMatches:o=$.findAllMatches,location:a=$.location,threshold:l=$.threshold,distance:g=$.distance}={}){this.query=null,this.options={isCaseSensitive:n,ignoreDiacritics:s,includeMatches:r,minMatchCharLength:i,findAllMatches:o,ignoreLocation:c,location:a,threshold:l,distance:g},e=n?e:e.toLowerCase(),e=s?ye(e):e,this.pattern=e,this.query=dn(this.pattern,this.options)}static condition(e,n){return n.useExtendedSearch}searchIn(e){const n=this.query;if(!n)return{isMatch:!1,score:1};const{includeMatches:s,isCaseSensitive:r,ignoreDiacritics:i}=this.options;e=r?e:e.toLowerCase(),e=i?ye(e):e;let c=0,o=[],a=0;for(let l=0,g=n.length;l<g;l+=1){const m=n[l];o.length=0,c=0;for(let b=0,w=m.length;b<w;b+=1){const C=m[b],{isMatch:N,indices:F,score:R}=C.search(e);if(N){if(c+=1,a+=R,s){const E=C.constructor.type;gn.has(E)?o=[...o,...F]:o.push(F)}}else{a=0,c=0,o.length=0;break}}if(c){let b={isMatch:!0,score:a/c};return s&&(b.indices=o),b}}return{isMatch:!1,score:1}}}const Ae=[];function mn(...t){Ae.push(...t)}function Ee(t,e){for(let n=0,s=Ae.length;n<s;n+=1){let r=Ae[n];if(r.condition(t,e))return new r(t,e)}return new Ve(t,e)}const be={AND:"$and",OR:"$or"},Me={PATH:"$path",PATTERN:"$val"},Se=t=>!!(t[be.AND]||t[be.OR]),pn=t=>!!t[Me.PATH],yn=t=>!X(t)&&Ke(t)&&!Se(t),Be=t=>({[be.AND]:Object.keys(t).map(e=>({[e]:t[e]}))});function Qe(t,e,{auto:n=!0}={}){const s=r=>{let i=Object.keys(r);const c=pn(r);if(!c&&i.length>1&&!Se(r))return s(Be(r));if(yn(r)){const a=c?r[Me.PATH]:i[0],l=c?r[Me.PATTERN]:r[a];if(!Q(l))throw new Error(Pt(a));const g={keyId:Ce(a),pattern:l};return n&&(g.searcher=Ee(l,e)),g}let o={children:[],operator:i[0]};return i.forEach(a=>{const l=r[a];X(l)&&l.forEach(g=>{o.children.push(s(g))})}),o};return Se(t)||(t=Be(t)),s(t)}function bn(t,{ignoreFieldNorm:e=$.ignoreFieldNorm}){t.forEach(n=>{let s=1;n.matches.forEach(({key:r,norm:i,score:c})=>{const o=r?r.weight:null;s*=Math.pow(c===0&&o?Number.EPSILON:c,(o||1)*(e?1:i))}),n.score=s})}function xn(t,e){const n=t.matches;e.matches=[],Y(n)&&n.forEach(s=>{if(!Y(s.indices)||!s.indices.length)return;const{indices:r,value:i}=s;let c={indices:r,value:i};s.key&&(c.key=s.key.src),s.idx>-1&&(c.refIndex=s.idx),e.matches.push(c)})}function wn(t,e){e.score=t.score}function kn(t,e,{includeMatches:n=$.includeMatches,includeScore:s=$.includeScore}={}){const r=[];return n&&r.push(xn),s&&r.push(wn),t.map(i=>{const{idx:c}=i,o={item:e[c],refIndex:c};return r.length&&r.forEach(a=>{a(i,o)}),o})}class re{constructor(e,n={},s){this.options={...$,...n},this.options.useExtendedSearch,this._keyStore=new zt(this.options.keys),this.setCollection(e,s)}setCollection(e,n){if(this._docs=e,n&&!(n instanceof $e))throw new Error(Ht);this._myIndex=n||Ye(this.options.keys,this._docs,{getFn:this.options.getFn,fieldNormWeight:this.options.fieldNormWeight})}add(e){Y(e)&&(this._docs.push(e),this._myIndex.add(e))}remove(e=()=>!1){const n=[];for(let s=0,r=this._docs.length;s<r;s+=1){const i=this._docs[s];e(i,s)&&(this.removeAt(s),s-=1,r-=1,n.push(i))}return n}removeAt(e){this._docs.splice(e,1),this._myIndex.removeAt(e)}getIndex(){return this._myIndex}search(e,{limit:n=-1}={}){const{includeMatches:s,includeScore:r,shouldSort:i,sortFn:c,ignoreFieldNorm:o}=this.options;let a=Q(e)?Q(this._docs[0])?this._searchStringList(e):this._searchObjectList(e):this._searchLogical(e);return bn(a,{ignoreFieldNorm:o}),i&&a.sort(c),Ue(n)&&n>-1&&(a=a.slice(0,n)),kn(a,this._docs,{includeMatches:s,includeScore:r})}_searchStringList(e){const n=Ee(e,this.options),{records:s}=this._myIndex,r=[];return s.forEach(({v:i,i:c,n:o})=>{if(!Y(i))return;const{isMatch:a,score:l,indices:g}=n.searchIn(i);a&&r.push({item:i,idx:c,matches:[{score:l,value:i,norm:o,indices:g}]})}),r}_searchLogical(e){const n=Qe(e,this.options),s=(o,a,l)=>{if(!o.children){const{keyId:m,searcher:b}=o,w=this._findMatches({key:this._keyStore.get(m),value:this._myIndex.getValueForItemAtKeyId(a,m),searcher:b});return w&&w.length?[{idx:l,item:a,matches:w}]:[]}const g=[];for(let m=0,b=o.children.length;m<b;m+=1){const w=o.children[m],C=s(w,a,l);if(C.length)g.push(...C);else if(o.operator===be.AND)return[]}return g},r=this._myIndex.records,i={},c=[];return r.forEach(({$:o,i:a})=>{if(Y(o)){let l=s(n,o,a);l.length&&(i[a]||(i[a]={idx:a,item:o,matches:[]},c.push(i[a])),l.forEach(({matches:g})=>{i[a].matches.push(...g)}))}}),c}_searchObjectList(e){const n=Ee(e,this.options),{keys:s,records:r}=this._myIndex,i=[];return r.forEach(({$:c,i:o})=>{if(!Y(c))return;let a=[];s.forEach((l,g)=>{a.push(...this._findMatches({key:l,value:c[g],searcher:n}))}),a.length&&i.push({idx:o,item:c,matches:a})}),i}_findMatches({key:e,value:n,searcher:s}){if(!Y(n))return[];let r=[];if(X(n))n.forEach(({v:i,i:c,n:o})=>{if(!Y(i))return;const{isMatch:a,score:l,indices:g}=s.searchIn(i);a&&r.push({score:l,key:e,value:i,idx:c,norm:o,indices:g})});else{const{v:i,n:c}=n,{isMatch:o,score:a,indices:l}=s.searchIn(i);o&&r.push({score:a,key:e,value:i,norm:c,indices:l})}return r}}re.version="7.1.0";re.createIndex=Ye;re.parseIndex=qt;re.config=$;re.parseQuery=Qe;mn(fn);const Cn={keys:["original","translated"],threshold:.3,includeScore:!0,includeMatches:!0,minMatchCharLength:1,maxResults:10};function Xe(t,e={}){const[n,s]=S.useState([]),[r,i]=S.useState(!1),c=S.useMemo(()=>({...Cn,...e}),[e]),o=S.useMemo(()=>new re(t,c),[t,c]),a=S.useCallback(b=>{if(!b.trim())return s([]),i(!1),[];i(!0);const C=o.search(b,{limit:c.maxResults||10}).map(N=>({item:N.item,score:N.score,matches:N.matches}));return s(C),i(!1),C},[o,c.maxResults]),l=S.useCallback((b,w=5)=>{if(!b.trim())return[];const C=o.search(b,{limit:w*2}),N=new Set;return C.forEach(F=>{if(N.size>=w)return;const R=F.item;if(R.original){const E=R.original.toLowerCase(),j=b.toLowerCase();E.includes(j)&&N.add(R.original)}}),Array.from(N)},[o]),g=S.useCallback(b=>{if(!b.trim()||b.length<2)return[];const w=b.toLowerCase(),C=new Set;return t.forEach(N=>{if(!(C.size>=8)&&N.original){const F=N.original.trim(),R=F.toLowerCase();if(R.startsWith(w)&&F.length>b.length){C.add(F);return}const E=F.split(/[\s\n\r,.!?;:]+/).filter(j=>j.length>0);for(const j of E)if(j.toLowerCase().startsWith(w)&&j.length>b.length){C.add(F);break}R.includes(w)&&!C.has(F)&&C.add(F)}}),Array.from(C).slice(0,5)},[t]),m=S.useCallback(()=>{s([]),i(!1)},[]);return{search:a,getSuggestions:l,getAutoComplete:g,clearResults:m,results:n,isSearching:r}}function vn(t){return Xe(t,{keys:["original","translated"],threshold:.4,includeScore:!0,includeMatches:!0,minMatchCharLength:1,maxResults:20})}function An(t){return Xe(t,{keys:["original"],threshold:.2,includeScore:!0,minMatchCharLength:2,maxResults:10})}const En=({history:t,searchTerm:e,onSearchChange:n,onBack:s,onRestore:r,onDelete:i,onClear:c,onExport:o,onImport:a})=>{const l=S.useRef(null),[g,m]=S.useState(!1),{search:b,results:w}=vn(t),C=S.useCallback(Pe(d=>{n(d),d.trim()&&b(d)},300),[n,b]),N=d=>{C(d.target.value)},F=async()=>{if(!g&&confirm("确定要清除所有历史记录吗？此操作不可撤销。")){m(!0);try{await c()}finally{m(!1)}}},R=async(d,M)=>{M.stopPropagation(),confirm("确定要删除这条历史记录吗？")&&await i(d)},E=e.trim()===""?t:w.map(d=>d.item),j=()=>{var d;(d=l.current)==null||d.click()},k=d=>{var T;const M=(T=d.target.files)==null?void 0:T[0];M&&(a(M),d.target.value="")},u=(d,M)=>{const T=d.original.length>30?d.original.substring(0,30)+"...":d.original;return h.jsxs("div",{className:"history-item",onClick:()=>r(d),children:[h.jsx("div",{className:"history-item-title",children:T}),h.jsxs("div",{className:"history-meta",children:[h.jsx("div",{className:"history-item-time",children:Ft(d.timestamp)}),h.jsxs("div",{className:"history-actions",children:[h.jsx("button",{className:"history-action-btn history-restore",onClick:I=>{I.stopPropagation(),r(d)},children:"恢复"}),h.jsx("button",{className:"history-action-btn history-delete",onClick:I=>R(d.original,I),children:"删除"})]})]}),d.hasReasoning&&h.jsx("div",{className:"history-tags",children:h.jsx("span",{className:"history-tag",children:"含思维链"})})]},`${d.timestamp}-${M}`)},f=()=>{const d=e.trim()!==""?`没有符合"${e}"的搜索结果`:"暂无翻译历史";return h.jsxs("div",{className:"empty-state-container",children:[h.jsx("p",{className:"empty-history",children:d}),h.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]})};return h.jsxs("div",{className:"history-panel visible",children:[h.jsxs("div",{className:"history-panel-header",children:[h.jsxs("div",{className:"history-panel-title",children:[h.jsx("div",{className:"back-button",onClick:s,children:h.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:h.jsx("path",{d:"M19 12H5M12 19l-7-7 7-7"})})}),h.jsx("h2",{children:"翻译历史"})]}),h.jsx("div",{className:"history-search-container",children:h.jsx("input",{type:"text",className:"history-search",placeholder:"搜索历史记录...",defaultValue:e,onChange:N})})]}),h.jsx("div",{className:"history-panel-content",children:E.length>0?h.jsxs(h.Fragment,{children:[E.map(u),h.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]}):f()}),h.jsxs("div",{className:"history-panel-footer",children:[h.jsxs("button",{className:"footer-btn",onClick:F,disabled:g,children:[h.jsx("div",{className:"footer-btn-icon",children:h.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("polyline",{points:"3 6 5 6 21 6"}),h.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})}),h.jsx("span",{children:g?"清空中...":"清空"})]}),h.jsxs("button",{className:"footer-btn",onClick:o,children:[h.jsx("div",{className:"footer-btn-icon",children:h.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),h.jsx("polyline",{points:"17 8 12 3 7 8"}),h.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]})}),h.jsx("span",{children:"导出"})]}),h.jsxs("button",{className:"footer-btn",onClick:j,children:[h.jsx("div",{className:"footer-btn-icon",children:h.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),h.jsx("polyline",{points:"7 10 12 15 17 10"}),h.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]})}),h.jsx("span",{children:"导入"})]})]}),h.jsx("input",{ref:l,type:"file",accept:".json",style:{display:"none"},onChange:k})]})},Mn=ce("popup-image","🖼️");class Sn{static compressImage(e,n=ue.COMPRESSION_QUALITY){return new Promise((s,r)=>{const i=document.createElement("canvas"),c=i.getContext("2d"),o=new Image;o.onload=()=>{let{width:a,height:l}=o;const g=ue.MAX_DIMENSION;(a>g||l>g)&&(a>l?(l=l*g/a,a=g):(a=a*g/l,l=g)),i.width=a,i.height=l,c==null||c.drawImage(o,0,0,a,l);const m=i.toDataURL("image/jpeg",n);s(m)},o.onerror=()=>r(new Error("图片加载失败")),o.src=URL.createObjectURL(e)})}static isValidImageType(e){return ue.SUPPORTED_FORMATS.includes(e)}static isValidImageSize(e){return e<=ue.MAX_SIZE}static async getImageFromClipboard(){try{const e=await navigator.clipboard.read();for(const n of e)for(const s of n.types)if(this.isValidImageType(s)){const r=await n.getType(s);if(!this.isValidImageSize(r.size))throw new Error("图片大小超过限制（10MB）");const i=new File([r],"clipboard-image",{type:s});return{data:await this.compressImage(i),mimeType:s,fileName:`clipboard-image-${Date.now()}`}}return null}catch(e){throw Mn.error("从剪贴板获取图片失败:",e),e}}static formatImageForAPI(e){return{type:"image_url",image_url:{url:e.data}}}}const $n=`
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
`;function jn(t="markdown-styles"){if(!document.querySelector(`#${t}`)){const e=document.createElement("style");e.id=t,e.textContent=$n,document.head.appendChild(e)}}function Ze(t){if(!t)return"";let e=t;e=e.replace(/\r\n/g,`
`).replace(/\r/g,`
`),e=e.replace(/</g,"&lt;").replace(/>/g,"&gt;");const n=[];e=e.replace(/```(\w+)?\n([\s\S]*?)```/g,(r,i,c)=>{const o=n.length,a=i||"text",l=c.trim().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");return n.push(`<div class="code-block-container">
        <div class="code-block-header">
          <span class="code-language">${a}</span>
          <button class="copy-button" onclick="copyCode(this)" data-code="${l}" title="复制代码">
            <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
        <pre class="code-block"><code class="language-${a}">${l}</code></pre>
      </div>`),`__CODE_BLOCK_${o}__`});const s=[];return e=e.replace(/`([^`\n]+)`/g,(r,i)=>{const c=s.length;return s.push(`<code class="inline-code">${i}</code>`),`__INLINE_CODE_${c}__`}),e=Tn(e),e=e.replace(/^#{6}\s+(.*$)/gm,"<h6>$1</h6>"),e=e.replace(/^#{5}\s+(.*$)/gm,"<h5>$1</h5>"),e=e.replace(/^#{4}\s+(.*$)/gm,"<h4>$1</h4>"),e=e.replace(/^#{3}\s+(.*$)/gm,"<h3>$1</h3>"),e=e.replace(/^#{2}\s+(.*$)/gm,"<h2>$1</h2>"),e=e.replace(/^#{1}\s+(.*$)/gm,"<h1>$1</h1>"),e=e.replace(/^(-{3,}|\*{3,}|_{3,})$/gm,'<hr class="markdown-divider">'),e=Dn(e),e=_n(e),e=In(e),e=Nn(e),e=Fn(e),n.forEach((r,i)=>{e=e.replace(`__CODE_BLOCK_${i}__`,r)}),s.forEach((r,i)=>{e=e.replace(`__INLINE_CODE_${i}__`,r)}),e=e.replace(/\n{3,}/g,`

`),e=e.replace(/^\s+|\s+$/g,""),e}function Tn(t){const e=/^(\|.*\|)\n(\|[-\s|:]*\|)\n((?:\|.*\|\n?)*)/gm;return t.replace(e,(n,s,r,i)=>{const c=s.split("|").slice(1,-1).map(a=>`<th>${a.trim()}</th>`).join(""),o=i.trim().split(`
`).map(a=>`<tr>${a.split("|").slice(1,-1).map(g=>`<td>${g.trim()}</td>`).join("")}</tr>`).join("");return`<table class="markdown-table"><thead><tr>${c}</tr></thead><tbody>${o}</tbody></table>`})}function Dn(t){const e=t.split(`
`),n=[];let s=!1,r=[];for(const i of e)i.match(/^>\s/)?(s||(s=!0,r=[]),r.push(i.replace(/^>\s?/,""))):(s&&(n.push(`<blockquote class="markdown-quote">${r.join("<br>")}</blockquote>`),s=!1,r=[]),n.push(i));return s&&r.length>0&&n.push(`<blockquote class="markdown-quote">${r.join("<br>")}</blockquote>`),n.join(`
`)}function _n(t){const e=t.split(`
`),n=[];let s=null;for(const r of e){const i=r.match(/^(\s*)[-*+]\s+(.+)$/),c=r.match(/^(\s*)\d+\.\s+(.+)$/);if(i){const[,o,a]=i,l=Math.floor(o.length/2);(!s||s.type!=="ul")&&(s&&n.push(de(s)),s={type:"ul",items:[]}),s.items.push(`<li class="list-item level-${l}">${a}</li>`)}else if(c){const[,o,a]=c,l=Math.floor(o.length/2);(!s||s.type!=="ol")&&(s&&n.push(de(s)),s={type:"ol",items:[]}),s.items.push(`<li class="list-item level-${l}">${a}</li>`)}else s&&(n.push(de(s)),s=null),n.push(r)}return s&&n.push(de(s)),n.join(`
`)}function de(t){return`<${t.type} class="markdown-list">${t.items.join("")}</${t.type}>`}function In(t){return t=t.replace(/~~(.*?)~~/g,'<del class="strikethrough">$1</del>'),t=t.replace(/\*\*(.*?)\*\*/g,'<strong class="bold">$1</strong>'),t=t.replace(new RegExp("(?<!\\*)\\*(?!\\*)([^*]+)\\*(?!\\*)","g"),'<em class="italic">$1</em>'),t=t.replace(/==(.*?)==/g,'<mark class="highlight">$1</mark>'),t}function Nn(t){return t=t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" class="markdown-image" loading="lazy">'),t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>'),t=t.replace(/<(https?:\/\/[^>]+)>/g,'<a href="$1" class="markdown-link auto-link" target="_blank" rel="noopener noreferrer">$1</a>'),t}function Fn(t){return t.split(/\n\s*\n/).map(n=>{if(n=n.trim(),!n)return"";if(n.match(/^<(h[1-6]|div|blockquote|ul|ol|table|pre|hr)/))return n;const s=n.split(`
`).filter(r=>r.trim());return s.length===1?`<p class="markdown-paragraph">${s[0]}</p>`:`<p class="markdown-paragraph">${s.join("<br>")}</p>`}).join(`

`)}async function Ln(t){const e=t.getAttribute("data-code");if(!e)return;const n=t.querySelector(".copy-icon"),s=t.querySelector(".check-icon");try{await navigator.clipboard.writeText(e),n&&s&&(n.style.display="none",s.style.display="block",setTimeout(()=>{n.style.display="block",s.style.display="none"},2e3))}catch{const i=document.createElement("textarea");i.value=e,i.style.position="fixed",i.style.opacity="0",document.body.appendChild(i),i.select(),document.execCommand("copy"),document.body.removeChild(i),n&&s&&(n.style.display="none",s.style.display="block",setTimeout(()=>{n.style.display="block",s.style.display="none"},2e3))}}function Rn(){window.copyCode=Ln}const Bn=({reasoningText:t,isTranslating:e})=>{const[n,s]=S.useState(!1),[r,i]=S.useState(!1),c=S.useRef(null),o=S.useRef(null);S.useEffect(()=>{if(c.current&&o.current){const g=c.current.scrollHeight,m=o.current.clientHeight;i(g>m)}},[t]),S.useEffect(()=>{!n&&o.current&&t&&requestAnimationFrame(()=>{o.current&&(o.current.scrollTop=o.current.scrollHeight)})},[t,n]);const a=()=>{s(!n)},l=()=>{const g=t.split(`
`);return g.length>5?g.slice(-5).join(`
`):t};return h.jsxs("div",{className:"collapsible-thinking-chain",children:[h.jsxs("div",{className:"result-label",children:["思维链",!n&&r&&h.jsx("span",{className:"expand-indicator",children:" (点击展开查看完整内容)"}),n&&h.jsx("span",{className:"expand-indicator",children:" (点击收起)"})]}),h.jsx("div",{ref:o,className:`thinking-chain-container ${n?"expanded":"collapsed"}`,onClick:!n&&r?a:void 0,children:h.jsx("div",{ref:c,className:"thinking-chain-content markdown-content",dangerouslySetInnerHTML:{__html:Ze(n?t:l())}})}),n&&h.jsx("button",{className:"collapse-btn",onClick:a,children:"收起思维链 ↑"}),e&&h.jsxs("div",{className:"thinking-indicator",children:[h.jsx("span",{className:"thinking-dot"}),h.jsx("span",{className:"thinking-dot"}),h.jsx("span",{className:"thinking-dot"}),"思考中..."]})]})},On=({onCopyOriginal:t,onCopyTranslation:e,hasResult:n,hasInput:s})=>{const[r,i]=S.useState("复制原文"),[c,o]=S.useState("复制译文"),[a,l]=S.useState(!1),[g,m]=S.useState(!1),b=async()=>{if(!a){l(!0),i("复制中...");try{await t()?(i("已复制"),setTimeout(()=>i("复制原文"),1500)):(i("复制失败"),setTimeout(()=>i("复制原文"),1500))}catch{i("复制失败"),setTimeout(()=>i("复制原文"),1500)}finally{l(!1)}}},w=async()=>{if(!g){m(!0),o("复制中...");try{await e()?(o("已复制"),setTimeout(()=>o("复制译文"),1500)):(o("复制失败"),setTimeout(()=>o("复制译文"),1500))}catch{o("复制失败"),setTimeout(()=>o("复制译文"),1500)}finally{m(!1)}}};return h.jsxs("div",{className:"copy-footer",children:[h.jsx("button",{className:"copy-footer-btn copy-original-btn",onClick:b,disabled:!s||a,title:s?"复制原文到剪贴板":"请先输入文本",children:r}),h.jsx("button",{className:"copy-footer-btn copy-translation-btn",onClick:w,disabled:!n||g,title:n?"复制译文到剪贴板":"请先进行翻译",children:c})]})},Hn=({value:t,onChange:e,onKeyDown:n,placeholder:s,rows:r=5,history:i,disabled:c=!1})=>{const[o,a]=S.useState(!1),[l,g]=S.useState(-1),[m,b]=S.useState([]),w=S.useRef(null),C=S.useRef(null),{getAutoComplete:N,getSuggestions:F}=An(i),R=S.useCallback(()=>{if(!w.current)return{word:"",start:0,end:0};const u=w.current,f=u.selectionStart,d=u.value;let M=f,T=f;for(;M>0&&!/[\s\n\r,.!?;:]/.test(d[M-1]);)M--;for(;T<d.length&&!/[\s\n\r,.!?;:]/.test(d[T]);)T++;return{word:d.slice(M,T),start:M,end:T}},[]);S.useCallback(()=>{if(!w.current)return;const{word:u}=R();if(u.length>=2){const f=N(u),d=F(u,3),M=Array.from(new Set([...f,...d]));b(M.slice(0,8)),a(M.length>0),g(-1)}else a(!1),b([])},[]);const E=S.useCallback(u=>{if(!w.current)return;const f=w.current,{start:d,end:M}=R(),T=f.value,I=T.slice(0,d)+u+T.slice(M);e(I),setTimeout(()=>{const L=d+u.length;f.setSelectionRange(L,L),f.focus()},0),a(!1)},[e,R]),j=u=>{e(u.target.value)},k=u=>{if(o&&m.length>0)switch(u.key){case"ArrowDown":u.preventDefault(),g(f=>f<m.length-1?f+1:0);return;case"ArrowUp":u.preventDefault(),g(f=>f>0?f-1:m.length-1);return;case"Tab":if(l>=0){u.preventDefault(),E(m[l]);return}break;case"Enter":if(l>=0){u.preventDefault(),E(m[l]);return}break;case"Escape":u.preventDefault(),a(!1);return}u.key==="Enter"&&(u.ctrlKey||u.metaKey)&&a(!1),n==null||n(u)};return S.useEffect(()=>{if(t){const{word:u}=R();if(u.length>=2){const f=N(u),d=F(u,3),M=Array.from(new Set([...f,...d]));b(M.slice(0,8)),a(M.length>0),g(-1)}else a(!1),b([])}else a(!1)},[t]),S.useEffect(()=>{const u=f=>{var d;C.current&&!C.current.contains(f.target)&&!((d=w.current)!=null&&d.contains(f.target))&&a(!1)};return document.addEventListener("mousedown",u),()=>document.removeEventListener("mousedown",u)},[]),h.jsxs("div",{className:"smart-input-container",children:[h.jsx("textarea",{ref:w,value:t,onChange:j,onKeyDown:k,placeholder:s,rows:r,disabled:c,className:"smart-input"}),o&&m.length>0&&h.jsx("div",{ref:C,className:"suggestions-dropdown",children:m.map((u,f)=>h.jsxs("div",{className:`suggestion-item ${f===l?"selected":""}`,onClick:()=>E(u),onMouseEnter:()=>g(f),children:[h.jsx("span",{className:"suggestion-text",children:u}),h.jsx("span",{className:"suggestion-hint",children:"Tab 补全"})]},f))})]})},Pn=ce("popup-translation-area","📝"),Un=({translationState:t,setTranslationState:e,onTranslate:n,onCopy:s,onShowHistory:r,onOpenSettings:i,history:c})=>{const o=S.useRef(!1),a=S.useRef(null),l=S.useRef(null);S.useEffect(()=>{jn("popup-markdown-styles"),Rn()},[]);const g=S.useCallback(()=>{if(a.current){const{scrollHeight:E,scrollTop:j,clientHeight:k}=a.current,u=Math.abs(E-j-k)<10;o.current=!u,u||(l.current&&clearTimeout(l.current),l.current=setTimeout(()=>{if(a.current){const{scrollHeight:f,scrollTop:d,clientHeight:M}=a.current;Math.abs(f-d-M)<10&&(o.current=!1)}},1e3))}},[]),m=S.useCallback(Nt(g,16),[g]);S.useEffect(()=>{!o.current&&a.current&&(t.translatedText||t.reasoningText)&&requestAnimationFrame(()=>{a.current&&(a.current.scrollTop=a.current.scrollHeight)})},[t.translatedText,t.reasoningText]),S.useEffect(()=>{t.isTranslating&&(o.current=!1,l.current&&(clearTimeout(l.current),l.current=null))},[t.isTranslating]),S.useEffect(()=>()=>{l.current&&clearTimeout(l.current)},[]);const b=E=>{E.key==="Enter"&&(E.ctrlKey||E.metaKey)&&(E.preventDefault(),t.isTranslating||n())},w=async()=>await s(t.translatedText),C=async()=>t.sourceText.trim()?await s(t.sourceText):(alert("请输入要复制的文本"),!1),N=()=>{e(E=>({...E,thinkingEnabled:!E.thinkingEnabled})),localStorage.setItem("thinkingEnabled",(!t.thinkingEnabled).toString())};S.useEffect(()=>{const E=localStorage.getItem("thinkingEnabled");E!==null&&e(j=>({...j,thinkingEnabled:E==="true"}))},[e]);const F=async E=>{try{const j=await Sn.getImageFromClipboard();j&&e(k=>({...k,images:[...k.images,j]}))}catch(j){Pn.error("粘贴图片失败:",j),alert("粘贴图片失败: "+j.message)}},R=E=>{e(j=>({...j,images:j.images.filter((k,u)=>u!==E)}))};return S.useEffect(()=>{const E=j=>{var k;(k=document.activeElement)!=null&&k.closest(".translation-area")&&F()};return document.addEventListener("paste",E),()=>{document.removeEventListener("paste",E)}},[]),h.jsxs("div",{className:"translation-area",children:[h.jsxs("div",{className:"header-section",children:[h.jsx("h1",{children:"人话翻译器"}),h.jsxs("div",{className:"header-buttons",children:[h.jsxs("button",{className:`thinking-toggle-btn ${t.thinkingEnabled?"enabled":"disabled"}`,onClick:N,title:t.thinkingEnabled?"点击关闭深度思考":"点击开启深度思考",children:["🧠 ",t.thinkingEnabled?"深度思考":"快速回复"]}),h.jsx("button",{className:"text-btn",onClick:r,children:"历史记录"}),h.jsx("button",{className:"text-btn",onClick:i,children:"设置"})]})]}),t.images.length>0&&h.jsxs("div",{className:"image-preview-section",children:[h.jsxs("div",{className:"image-preview-header",children:[h.jsxs("span",{children:["已选择的图片 (",t.images.length,")"]}),h.jsx("span",{className:"image-hint",children:"💡 支持 Ctrl+V 粘贴剪贴板图片"})]}),h.jsx("div",{className:"image-preview-list",children:t.images.map((E,j)=>h.jsxs("div",{className:"image-preview-item",children:[h.jsx("img",{src:E.data,alt:`预览图 ${j+1}`}),h.jsx("button",{className:"remove-image-btn",onClick:()=>R(j),title:"删除图片",children:"✕"})]},j))})]}),h.jsxs("div",{className:"translation-content",children:[h.jsxs("div",{className:"input-section",children:[h.jsx("div",{className:"input-area",children:h.jsx(Hn,{value:t.sourceText,onChange:E=>e(j=>({...j,sourceText:E})),onKeyDown:b,placeholder:`请输入要翻译的文本... ${t.images.length>0?"(已选择"+t.images.length+"张图片) ":""}Ctrl+V可粘贴图片，Ctrl+Enter发送`,rows:3,history:c,disabled:t.isTranslating})}),h.jsx("div",{className:"translate-btn-wrapper",children:h.jsx("button",{className:"primary-btn",onClick:n,disabled:t.isTranslating,children:t.isTranslating?"翻译中...":"翻译"})})]}),t.showResult&&h.jsx("div",{className:"result-section-wrapper",ref:a,onScroll:m,children:h.jsxs("div",{className:"result-area",children:[h.jsx("div",{className:"result-header",children:h.jsx("span",{children:"翻译结果"})}),h.jsxs("div",{className:"result-wrapper",children:[t.hasReasoning&&t.reasoningText&&h.jsx(Bn,{reasoningText:t.reasoningText,isTranslating:t.isTranslating}),h.jsxs("div",{className:"result-section",children:[h.jsx("div",{className:"result-label",children:"译文"}),h.jsx("div",{className:"result-content markdown-content",dangerouslySetInnerHTML:{__html:Ze(t.translatedText)}})]})]})]})})]}),h.jsx(On,{onCopyOriginal:C,onCopyTranslation:w,hasResult:t.showResult,hasInput:t.sourceText.trim().length>0})]})},z=ce("shared-settings-utils","⚙️");class fe{static async getSettings(){if(this.cache.settings&&Date.now()-this.cache.timestamp<this.cache.ttl)return z.log("📦 [SettingsUtils] 使用缓存的设置"),this.cache.settings;try{z.log("🔄 [SettingsUtils] 从 Chrome Storage 获取设置");const e=globalThis.browser||O,s=(await e.storage.sync.get("settings")).settings||{};if(Object.keys(s).length>0){const r={baseUrl:s.baseUrl||P.baseUrl,model:s.model||P.model,temperature:s.temperature??P.temperature,promptTemplate:s.promptTemplate||P.promptTemplate,apiKey:s.apiKey||P.apiKey,thinkingEnabled:s.thinkingEnabled??P.thinkingEnabled,logLevel:s.logLevel||P.logLevel};return this.cache={settings:r,timestamp:Date.now(),ttl:this.cache.ttl},z.log("✅ [SettingsUtils] 新格式设置获取成功",{hasApiKey:!!r.apiKey,thinkingEnabled:r.thinkingEnabled,fromCache:!1}),r}else return z.log("🔄 [SettingsUtils] 新格式无数据，尝试旧格式"),this.getSettingsLegacyFormat(e)}catch(e){return z.error("❌ [SettingsUtils] 获取设置失败:",e),{baseUrl:P.baseUrl,model:P.model,temperature:P.temperature,promptTemplate:P.promptTemplate,apiKey:P.apiKey,thinkingEnabled:P.thinkingEnabled,logLevel:P.logLevel}}}static async getSettingsLegacyFormat(e){try{const n=await e.storage.sync.get(["apiKey","baseUrl","model","temperature","promptTemplate","thinkingEnabled","logLevel"]);if(Object.keys(n).length>0){await e.storage.local.set(n),z.success("从云端获取旧格式设置成功",n);const i={...P,...n};return this.cache={settings:i,timestamp:Date.now(),ttl:this.cache.ttl},i}z.warn("云端没有旧格式设置，尝试从本地获取");const s=await e.storage.local.get(["apiKey","baseUrl","model","temperature","promptTemplate","thinkingEnabled","logLevel"]);if(Object.keys(s).length>0){z.success("从本地获取旧格式设置成功",s);const i={...P,...s};return this.cache={settings:i,timestamp:Date.now(),ttl:this.cache.ttl},i}z.info("使用默认设置",P);const r={...P};return this.cache={settings:r,timestamp:Date.now(),ttl:this.cache.ttl},r}catch(n){z.error("获取旧格式设置失败:",n),z.warn("所有设置获取失败，使用默认设置",P);const s={...P};return this.cache={settings:s,timestamp:Date.now(),ttl:this.cache.ttl},s}}static async getSetting(e){return(await this.getSettings())[e]}static async hasApiKey(){const e=await this.getSettings();return!!e.apiKey&&e.apiKey!=="your_api_key"}static async getThinkingEnabled(){return this.getSetting("thinkingEnabled")}static clearCache(){z.log("🧹 [SettingsUtils] 清除设置缓存"),this.cache.settings=null,this.cache.timestamp=0}static onSettingsChanged(e){const n=r=>{r.settings&&(z.log("🔄 [SettingsUtils] 检测到设置变化"),this.clearCache(),this.getSettings().then(e))};return(globalThis.browser||O).storage.onChanged.addListener(n),()=>{(globalThis.browser||O).storage.onChanged.removeListener(n)}}}je(fe,"cache",{settings:null,timestamp:0,ttl:300*1e3});const G=ce("popup-app","🔽");function Kn(){const[t,e]=S.useState({sourceText:"",translatedText:"",reasoningText:"",isTranslating:!1,hasReasoning:!1,showResult:!1,thinkingEnabled:!1,images:[]}),[n,s]=S.useState(!1),[r,i]=S.useState([]),[c,o]=S.useState("");S.useEffect(()=>{const k=(u,f,d)=>{var M,T;return G.log("📨 [Popup App] 收到消息",{action:u.action,hasContent:!!u.content,contentLength:((M=u.content)==null?void 0:M.length)||0,hasReasoning:!!u.reasoningContent,reasoningLength:((T=u.reasoningContent)==null?void 0:T.length)||0,done:u.done,error:u.error,timestamp:new Date().toISOString()}),u.action==="updatePopupTranslation"?(G.log("🔄 [Popup App] 处理popup翻译更新"),u.error?(G.log("❌ [Popup App] 翻译错误:",u.error),e(I=>({...I,isTranslating:!1,translatedText:`错误: ${u.error}`}))):(G.log("✅ [Popup App] 更新翻译状态",{hasNewContent:!!u.content,hasNewReasoning:!!u.reasoningContent,hasReasoning:u.hasReasoning,isComplete:u.done}),e(I=>({...I,translatedText:u.content||I.translatedText,reasoningText:u.reasoningContent||I.reasoningText,hasReasoning:u.hasReasoning||!1,showResult:!0,isTranslating:!u.done}))),d({success:!0})):G.log("❓ [Popup App] 未处理的消息类型:",u.action),!1};if(O.runtime.onMessage)return O.runtime.onMessage.addListener(k),()=>{O.runtime.onMessage.removeListener(k)}},[]),S.useEffect(()=>{(async()=>{try{const f=await fe.getSettings();G.log("⚙️ [Popup App] 初始化设置",{thinkingEnabled:f.thinkingEnabled,hasApiKey:!!f.apiKey}),e(d=>({...d,thinkingEnabled:f.thinkingEnabled}))}catch(f){G.error("❌ [Popup App] 加载设置失败:",f)}})(),m();const u=fe.onSettingsChanged(f=>{G.log("🔄 [Popup App] 设置已更新",{thinkingEnabled:f.thinkingEnabled,previousState:t.thinkingEnabled}),e(d=>({...d,thinkingEnabled:f.thinkingEnabled}))});return()=>{u()}},[]);const a=()=>{},l=async()=>{var u,f;const k=t.sourceText.trim();if(G.log("LHG:popup/App.tsx text:::",k),!k){alert("请输入要翻译的文本");return}if(!t.isTranslating){e(d=>({...d,isTranslating:!0,showResult:!0,translatedText:"",reasoningText:"",hasReasoning:!1}));try{const d=await fe.getSettings();G.log("⚙️ [Popup App] 翻译时使用设置",{thinkingEnabled:d.thinkingEnabled,temperature:d.temperature,hasApiKey:!!d.apiKey}),(u=O)!=null&&u.runtime&&(await O.runtime.sendMessage({action:"cleanup"}),await O.runtime.sendMessage({action:"translate",text:k,images:t.images,thinkingEnabled:d.thinkingEnabled,temperature:d.temperature,promptTemplate:d.promptTemplate,apiKey:d.apiKey,source:"popup"}))}catch(d){(f=d.message)!=null&&f.includes("Receiving end does not exist")||e(M=>({...M,isTranslating:!1,translatedText:`发生错误：${d.message}`}))}}},g=async k=>{try{return await navigator.clipboard.writeText(k),!0}catch(u){return G.error("复制失败:",u),!1}},m=()=>{var k;(k=O)!=null&&k.runtime&&O.runtime.sendMessage({action:"getHistory"},u=>{u&&u.success&&i(u.history||[])})},b=()=>{s(!0),o(""),m()},w=()=>{s(!1)},C=k=>{e(u=>({...u,sourceText:k.original,translatedText:k.translated,reasoningText:k.reasoning||"",hasReasoning:k.hasReasoning||!1,isTranslating:!1,showResult:!0})),w()},N=k=>{var u;confirm("确定要删除这条历史记录吗？")&&(u=O)!=null&&u.runtime&&O.runtime.sendMessage({action:"deleteHistoryItem",original:k},f=>{f&&f.success?m():alert("删除失败："+((f==null?void 0:f.error)||"未知错误"))})},F=()=>{var k;confirm("确定要清空所有历史记录吗？此操作不可撤销。")&&(k=O)!=null&&k.runtime&&O.runtime.sendMessage({action:"clearHistory"},u=>{u&&u.success?i([]):alert("清空历史记录失败："+((u==null?void 0:u.error)||"未知错误"))})},R=()=>{var k;(k=O)!=null&&k.runtime&&O.runtime.sendMessage({action:"getHistory"},u=>{if(u&&u.success&&u.history.length>0){const f=JSON.stringify(u.history,null,2),d=new Blob([f],{type:"application/json"}),M=URL.createObjectURL(d),T=document.createElement("a");T.href=M,T.download=`translation_history_${new Date().toISOString().slice(0,10)}.json`,T.click(),setTimeout(()=>URL.revokeObjectURL(M),100)}else alert("暂无历史记录可导出")})},E=k=>{const u=new FileReader;u.onload=f=>{var d,M;try{const T=JSON.parse((d=f.target)==null?void 0:d.result);Array.isArray(T)?(M=O)!=null&&M.runtime&&O.runtime.sendMessage({action:"importHistory",history:T},I=>{I&&I.success?(alert("历史记录导入成功"),m()):alert("导入失败："+((I==null?void 0:I.error)||"未知错误"))}):alert("导入的文件格式不正确")}catch(T){alert("导入失败：文件解析错误"),G.error(T)}},u.readAsText(k)},j=()=>{var k;(k=O)!=null&&k.runtime&&O.runtime.openOptionsPage()};return S.useEffect(()=>{const k=()=>{var u;(u=O)!=null&&u.runtime&&O.runtime.sendMessage({action:"cleanup"})};return window.addEventListener("beforeunload",k),()=>{var u;window.removeEventListener("beforeunload",k),(u=O)!=null&&u.runtime&&O.runtime.sendMessage({action:"cleanup"})}},[]),h.jsx("div",{className:"container",onScroll:a,children:n?h.jsx(En,{history:r,searchTerm:c,onSearchChange:o,onBack:w,onRestore:C,onDelete:N,onClear:F,onExport:R,onImport:E}):h.jsx(Un,{translationState:t,setTranslationState:e,onTranslate:l,onCopy:g,onShowHistory:b,onOpenSettings:j,onScroll:()=>{},history:r})})}nt.createRoot(document.getElementById("root")).render(h.jsx(st.StrictMode,{children:h.jsx(Kn,{})}));
