import{g as Xe,c as pe,r as $,j as u,I as ce,S as ee,i as Ze,b as O,a as qe,R as et}from"./settingsUtils-1Z7pwmUI.js";var de={exports:{}},tt=de.exports,je;function nt(){return je||(je=1,(function(t,e){(function(n,r){t.exports=r()})(tt,(function(){var n=1e3,r=6e4,s=36e5,i="millisecond",c="second",o="minute",a="hour",l="day",h="week",f="month",y="quarter",k="year",v="date",_="Invalid Date",I=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,F=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,E={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(A){var b=["th","st","nd","rd"],p=A%100;return"["+A+(b[(p-20)%10]||b[p]||b[0])+"]"}},j=function(A,b,p){var M=String(A);return!M||M.length>=b?A:""+Array(b+1-M.length).join(p)+A},w={s:j,z:function(A){var b=-A.utcOffset(),p=Math.abs(b),M=Math.floor(p/60),x=p%60;return(b<=0?"+":"-")+j(M,2,"0")+":"+j(x,2,"0")},m:function A(b,p){if(b.date()<p.date())return-A(p,b);var M=12*(p.year()-b.year())+(p.month()-b.month()),x=b.clone().add(M,f),D=p-x<0,T=b.clone().add(M+(D?-1:1),f);return+(-(M+(p-x)/(D?x-T:T-x))||0)},a:function(A){return A<0?Math.ceil(A)||0:Math.floor(A)},p:function(A){return{M:f,y:k,w:h,d:l,D:v,h:a,m:o,s:c,ms:i,Q:y}[A]||String(A||"").toLowerCase().replace(/s$/,"")},u:function(A){return A===void 0}},d="en",m={};m[d]=E;var g="$isDayjsObject",C=function(A){return A instanceof V||!(!A||!A[g])},R=function A(b,p,M){var x;if(!b)return d;if(typeof b=="string"){var D=b.toLowerCase();m[D]&&(x=D),p&&(m[D]=p,x=D);var T=b.split("-");if(!x&&T.length>1)return A(T[0])}else{var L=b.name;m[L]=b,x=L}return!M&&x&&(d=x),x||!M&&d},B=function(A,b){if(C(A))return A.clone();var p=typeof b=="object"?b:{};return p.date=A,p.args=arguments,new V(p)},N=w;N.l=R,N.i=C,N.w=function(A,b){return B(A,{locale:b.$L,utc:b.$u,x:b.$x,$offset:b.$offset})};var V=(function(){function A(p){this.$L=R(p.locale,null,!0),this.parse(p),this.$x=this.$x||p.x||{},this[g]=!0}var b=A.prototype;return b.parse=function(p){this.$d=(function(M){var x=M.date,D=M.utc;if(x===null)return new Date(NaN);if(N.u(x))return new Date;if(x instanceof Date)return new Date(x);if(typeof x=="string"&&!/Z$/i.test(x)){var T=x.match(I);if(T){var L=T[2]-1||0,H=(T[7]||"0").substring(0,3);return D?new Date(Date.UTC(T[1],L,T[3]||1,T[4]||0,T[5]||0,T[6]||0,H)):new Date(T[1],L,T[3]||1,T[4]||0,T[5]||0,T[6]||0,H)}}return new Date(x)})(p),this.init()},b.init=function(){var p=this.$d;this.$y=p.getFullYear(),this.$M=p.getMonth(),this.$D=p.getDate(),this.$W=p.getDay(),this.$H=p.getHours(),this.$m=p.getMinutes(),this.$s=p.getSeconds(),this.$ms=p.getMilliseconds()},b.$utils=function(){return N},b.isValid=function(){return this.$d.toString()!==_},b.isSame=function(p,M){var x=B(p);return this.startOf(M)<=x&&x<=this.endOf(M)},b.isAfter=function(p,M){return B(p)<this.startOf(M)},b.isBefore=function(p,M){return this.endOf(M)<B(p)},b.$g=function(p,M,x){return N.u(p)?this[M]:this.set(x,p)},b.unix=function(){return Math.floor(this.valueOf()/1e3)},b.valueOf=function(){return this.$d.getTime()},b.startOf=function(p,M){var x=this,D=!!N.u(M)||M,T=N.p(p),L=function(q,z){var Q=N.w(x.$u?Date.UTC(x.$y,z,q):new Date(x.$y,z,q),x);return D?Q:Q.endOf(l)},H=function(q,z){return N.w(x.toDate()[q].apply(x.toDate("s"),(D?[0,0,0,0]:[23,59,59,999]).slice(z)),x)},P=this.$W,W=this.$M,U=this.$D,ne="set"+(this.$u?"UTC":"");switch(T){case k:return D?L(1,0):L(31,11);case f:return D?L(1,W):L(0,W+1);case h:var Z=this.$locale().weekStart||0,se=(P<Z?P+7:P)-Z;return L(D?U-se:U+(6-se),W);case l:case v:return H(ne+"Hours",0);case a:return H(ne+"Minutes",1);case o:return H(ne+"Seconds",2);case c:return H(ne+"Milliseconds",3);default:return this.clone()}},b.endOf=function(p){return this.startOf(p,!1)},b.$set=function(p,M){var x,D=N.p(p),T="set"+(this.$u?"UTC":""),L=(x={},x[l]=T+"Date",x[v]=T+"Date",x[f]=T+"Month",x[k]=T+"FullYear",x[a]=T+"Hours",x[o]=T+"Minutes",x[c]=T+"Seconds",x[i]=T+"Milliseconds",x)[D],H=D===l?this.$D+(M-this.$W):M;if(D===f||D===k){var P=this.clone().set(v,1);P.$d[L](H),P.init(),this.$d=P.set(v,Math.min(this.$D,P.daysInMonth())).$d}else L&&this.$d[L](H);return this.init(),this},b.set=function(p,M){return this.clone().$set(p,M)},b.get=function(p){return this[N.p(p)]()},b.add=function(p,M){var x,D=this;p=Number(p);var T=N.p(M),L=function(W){var U=B(D);return N.w(U.date(U.date()+Math.round(W*p)),D)};if(T===f)return this.set(f,this.$M+p);if(T===k)return this.set(k,this.$y+p);if(T===l)return L(1);if(T===h)return L(7);var H=(x={},x[o]=r,x[a]=s,x[c]=n,x)[T]||1,P=this.$d.getTime()+p*H;return N.w(P,this)},b.subtract=function(p,M){return this.add(-1*p,M)},b.format=function(p){var M=this,x=this.$locale();if(!this.isValid())return x.invalidDate||_;var D=p||"YYYY-MM-DDTHH:mm:ssZ",T=N.z(this),L=this.$H,H=this.$m,P=this.$M,W=x.weekdays,U=x.months,ne=x.meridiem,Z=function(z,Q,ie,ae){return z&&(z[Q]||z(M,D))||ie[Q].slice(0,ae)},se=function(z){return N.s(L%12||12,z,"0")},q=ne||function(z,Q,ie){var ae=z<12?"AM":"PM";return ie?ae.toLowerCase():ae};return D.replace(F,(function(z,Q){return Q||(function(ie){switch(ie){case"YY":return String(M.$y).slice(-2);case"YYYY":return N.s(M.$y,4,"0");case"M":return P+1;case"MM":return N.s(P+1,2,"0");case"MMM":return Z(x.monthsShort,P,U,3);case"MMMM":return Z(U,P);case"D":return M.$D;case"DD":return N.s(M.$D,2,"0");case"d":return String(M.$W);case"dd":return Z(x.weekdaysMin,M.$W,W,2);case"ddd":return Z(x.weekdaysShort,M.$W,W,3);case"dddd":return W[M.$W];case"H":return String(L);case"HH":return N.s(L,2,"0");case"h":return se(1);case"hh":return se(2);case"a":return q(L,H,!0);case"A":return q(L,H,!1);case"m":return String(H);case"mm":return N.s(H,2,"0");case"s":return String(M.$s);case"ss":return N.s(M.$s,2,"0");case"SSS":return N.s(M.$ms,3,"0");case"Z":return T}return null})(z)||T.replace(":","")}))},b.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},b.diff=function(p,M,x){var D,T=this,L=N.p(M),H=B(p),P=(H.utcOffset()-this.utcOffset())*r,W=this-H,U=function(){return N.m(T,H)};switch(L){case k:D=U()/12;break;case f:D=U();break;case y:D=U()/3;break;case h:D=(W-P)/6048e5;break;case l:D=(W-P)/864e5;break;case a:D=W/s;break;case o:D=W/r;break;case c:D=W/n;break;default:D=W}return x?D:N.a(D)},b.daysInMonth=function(){return this.endOf(f).$D},b.$locale=function(){return m[this.$L]},b.locale=function(p,M){if(!p)return this.$L;var x=this.clone(),D=R(p,M,!0);return D&&(x.$L=D),x},b.clone=function(){return N.w(this.$d,this)},b.toDate=function(){return new Date(this.valueOf())},b.toJSON=function(){return this.isValid()?this.toISOString():null},b.toISOString=function(){return this.$d.toISOString()},b.toString=function(){return this.$d.toUTCString()},A})(),be=V.prototype;return B.prototype=be,[["$ms",i],["$s",c],["$m",o],["$H",a],["$W",l],["$M",f],["$y",k],["$D",v]].forEach((function(A){be[A[1]]=function(b){return this.$g(b,A[0],A[1])}})),B.extend=function(A,b){return A.$i||(A(b,V,B),A.$i=!0),B},B.locale=R,B.isDayjs=C,B.unix=function(A){return B(1e3*A)},B.en=m[d],B.Ls=m,B.p={},B}))})(de)),de.exports}var rt=nt();const st=Xe(rt);function he(t){var e=typeof t;return t!=null&&(e=="object"||e=="function")}var it=typeof global=="object"&&global&&global.Object===Object&&global,ot=typeof self=="object"&&self&&self.Object===Object&&self,Be=it||ot||Function("return this")(),ye=function(){return Be.Date.now()},at=/\s/;function ct(t){for(var e=t.length;e--&&at.test(t.charAt(e)););return e}var lt=/^\s+/;function ut(t){return t&&t.slice(0,ct(t)+1).replace(lt,"")}var fe=Be.Symbol,Le=Object.prototype,dt=Le.hasOwnProperty,ht=Le.toString,oe=fe?fe.toStringTag:void 0;function ft(t){var e=dt.call(t,oe),n=t[oe];try{t[oe]=void 0;var r=!0}catch{}var s=ht.call(t);return r&&(e?t[oe]=n:delete t[oe]),s}var gt=Object.prototype,mt=gt.toString;function pt(t){return mt.call(t)}var bt="[object Null]",yt="[object Undefined]",Se=fe?fe.toStringTag:void 0;function xt(t){return t==null?t===void 0?yt:bt:Se&&Se in Object(t)?ft(t):pt(t)}function kt(t){return t!=null&&typeof t=="object"}var wt="[object Symbol]";function Ct(t){return typeof t=="symbol"||kt(t)&&xt(t)==wt}var De=NaN,vt=/^[-+]0x[0-9a-f]+$/i,At=/^0b[01]+$/i,Et=/^0o[0-7]+$/i,Mt=parseInt;function Te(t){if(typeof t=="number")return t;if(Ct(t))return De;if(he(t)){var e=typeof t.valueOf=="function"?t.valueOf():t;t=he(e)?e+"":e}if(typeof t!="string")return t===0?t:+t;t=ut(t);var n=At.test(t);return n||Et.test(t)?Mt(t.slice(2),n?2:8):vt.test(t)?De:+t}var $t="Expected a function",jt=Math.max,St=Math.min;function Oe(t,e,n){var r,s,i,c,o,a,l=0,h=!1,f=!1,y=!0;if(typeof t!="function")throw new TypeError($t);e=Te(e)||0,he(n)&&(h=!!n.leading,f="maxWait"in n,i=f?jt(Te(n.maxWait)||0,e):i,y="trailing"in n?!!n.trailing:y);function k(m){var g=r,C=s;return r=s=void 0,l=m,c=t.apply(C,g),c}function v(m){return l=m,o=setTimeout(F,e),h?k(m):c}function _(m){var g=m-a,C=m-l,R=e-g;return f?St(R,i-C):R}function I(m){var g=m-a,C=m-l;return a===void 0||g>=e||g<0||f&&C>=i}function F(){var m=ye();if(I(m))return E(m);o=setTimeout(F,_(m))}function E(m){return o=void 0,y&&r?k(m):(r=s=void 0,c)}function j(){o!==void 0&&clearTimeout(o),l=0,r=a=s=o=void 0}function w(){return o===void 0?c:E(ye())}function d(){var m=ye(),g=I(m);if(r=arguments,s=this,a=m,g){if(o===void 0)return v(a);if(f)return clearTimeout(o),o=setTimeout(F,e),k(a)}return o===void 0&&(o=setTimeout(F,e)),c}return d.cancel=j,d.flush=w,d}var Dt="Expected a function";function Tt(t,e,n){var r=!0,s=!0;if(typeof t!="function")throw new TypeError(Dt);return he(n)&&(r="leading"in n?!!n.leading:r,s="trailing"in n?!!n.trailing:s),Oe(t,e,{leading:r,maxWait:e,trailing:s})}pe("popup-helpers","🛠️");function _t(t){return st(t).format("YYYY-MM-DD HH:mm")}function J(t){return Array.isArray?Array.isArray(t):We(t)==="[object Array]"}function It(t){if(typeof t=="string")return t;let e=t+"";return e=="0"&&1/t==-1/0?"-0":e}function Nt(t){return t==null?"":It(t)}function G(t){return typeof t=="string"}function He(t){return typeof t=="number"}function Ft(t){return t===!0||t===!1||Rt(t)&&We(t)=="[object Boolean]"}function Pe(t){return typeof t=="object"}function Rt(t){return Pe(t)&&t!==null}function K(t){return t!=null}function xe(t){return!t.trim().length}function We(t){return t==null?t===void 0?"[object Undefined]":"[object Null]":Object.prototype.toString.call(t)}const Bt="Incorrect 'index' type",Lt=t=>`Invalid value for key ${t}`,Ot=t=>`Pattern length exceeds max of ${t}.`,Ht=t=>`Missing ${t} property in key`,Pt=t=>`Property 'weight' in key '${t}' must be a positive integer`,_e=Object.prototype.hasOwnProperty;class Wt{constructor(e){this._keys=[],this._keyMap={};let n=0;e.forEach(r=>{let s=ze(r);this._keys.push(s),this._keyMap[s.id]=s,n+=s.weight}),this._keys.forEach(r=>{r.weight/=n})}get(e){return this._keyMap[e]}keys(){return this._keys}toJSON(){return JSON.stringify(this._keys)}}function ze(t){let e=null,n=null,r=null,s=1,i=null;if(G(t)||J(t))r=t,e=Ie(t),n=we(t);else{if(!_e.call(t,"name"))throw new Error(Ht("name"));const c=t.name;if(r=c,_e.call(t,"weight")&&(s=t.weight,s<=0))throw new Error(Pt(c));e=Ie(c),n=we(c),i=t.getFn}return{path:e,id:n,weight:s,src:r,getFn:i}}function Ie(t){return J(t)?t:t.split(".")}function we(t){return J(t)?t.join("."):t}function zt(t,e){let n=[],r=!1;const s=(i,c,o)=>{if(K(i))if(!c[o])n.push(i);else{let a=c[o];const l=i[a];if(!K(l))return;if(o===c.length-1&&(G(l)||He(l)||Ft(l)))n.push(Nt(l));else if(J(l)){r=!0;for(let h=0,f=l.length;h<f;h+=1)s(l[h],c,o+1)}else c.length&&s(l,c,o+1)}};return s(t,G(e)?e.split("."):e,0),r?n:n[0]}const Kt={includeMatches:!1,findAllMatches:!1,minMatchCharLength:1},Ut={isCaseSensitive:!1,ignoreDiacritics:!1,includeScore:!1,keys:[],shouldSort:!0,sortFn:(t,e)=>t.score===e.score?t.idx<e.idx?-1:1:t.score<e.score?-1:1},Yt={location:0,threshold:.6,distance:100},Vt={useExtendedSearch:!1,getFn:zt,ignoreLocation:!1,ignoreFieldNorm:!1,fieldNormWeight:1};var S={...Ut,...Kt,...Yt,...Vt};const Gt=/[^ ]+/g;function Jt(t=1,e=3){const n=new Map,r=Math.pow(10,e);return{get(s){const i=s.match(Gt).length;if(n.has(i))return n.get(i);const c=1/Math.pow(i,.5*t),o=parseFloat(Math.round(c*r)/r);return n.set(i,o),o},clear(){n.clear()}}}class $e{constructor({getFn:e=S.getFn,fieldNormWeight:n=S.fieldNormWeight}={}){this.norm=Jt(n,3),this.getFn=e,this.isCreated=!1,this.setIndexRecords()}setSources(e=[]){this.docs=e}setIndexRecords(e=[]){this.records=e}setKeys(e=[]){this.keys=e,this._keysMap={},e.forEach((n,r)=>{this._keysMap[n.id]=r})}create(){this.isCreated||!this.docs.length||(this.isCreated=!0,G(this.docs[0])?this.docs.forEach((e,n)=>{this._addString(e,n)}):this.docs.forEach((e,n)=>{this._addObject(e,n)}),this.norm.clear())}add(e){const n=this.size();G(e)?this._addString(e,n):this._addObject(e,n)}removeAt(e){this.records.splice(e,1);for(let n=e,r=this.size();n<r;n+=1)this.records[n].i-=1}getValueForItemAtKeyId(e,n){return e[this._keysMap[n]]}size(){return this.records.length}_addString(e,n){if(!K(e)||xe(e))return;let r={v:e,i:n,n:this.norm.get(e)};this.records.push(r)}_addObject(e,n){let r={i:n,$:{}};this.keys.forEach((s,i)=>{let c=s.getFn?s.getFn(e):this.getFn(e,s.path);if(K(c)){if(J(c)){let o=[];const a=[{nestedArrIndex:-1,value:c}];for(;a.length;){const{nestedArrIndex:l,value:h}=a.pop();if(K(h))if(G(h)&&!xe(h)){let f={v:h,i:l,n:this.norm.get(h)};o.push(f)}else J(h)&&h.forEach((f,y)=>{a.push({nestedArrIndex:y,value:f})})}r.$[i]=o}else if(G(c)&&!xe(c)){let o={v:c,n:this.norm.get(c)};r.$[i]=o}}}),this.records.push(r)}toJSON(){return{keys:this.keys,records:this.records}}}function Ke(t,e,{getFn:n=S.getFn,fieldNormWeight:r=S.fieldNormWeight}={}){const s=new $e({getFn:n,fieldNormWeight:r});return s.setKeys(t.map(ze)),s.setSources(e),s.create(),s}function Qt(t,{getFn:e=S.getFn,fieldNormWeight:n=S.fieldNormWeight}={}){const{keys:r,records:s}=t,i=new $e({getFn:e,fieldNormWeight:n});return i.setKeys(r),i.setIndexRecords(s),i}function le(t,{errors:e=0,currentLocation:n=0,expectedLocation:r=0,distance:s=S.distance,ignoreLocation:i=S.ignoreLocation}={}){const c=e/t.length;if(i)return c;const o=Math.abs(r-n);return s?c+o/s:o?1:c}function Xt(t=[],e=S.minMatchCharLength){let n=[],r=-1,s=-1,i=0;for(let c=t.length;i<c;i+=1){let o=t[i];o&&r===-1?r=i:!o&&r!==-1&&(s=i-1,s-r+1>=e&&n.push([r,s]),r=-1)}return t[i-1]&&i-r>=e&&n.push([r,i-1]),n}const te=32;function Zt(t,e,n,{location:r=S.location,distance:s=S.distance,threshold:i=S.threshold,findAllMatches:c=S.findAllMatches,minMatchCharLength:o=S.minMatchCharLength,includeMatches:a=S.includeMatches,ignoreLocation:l=S.ignoreLocation}={}){if(e.length>te)throw new Error(Ot(te));const h=e.length,f=t.length,y=Math.max(0,Math.min(r,f));let k=i,v=y;const _=o>1||a,I=_?Array(f):[];let F;for(;(F=t.indexOf(e,v))>-1;){let g=le(e,{currentLocation:F,expectedLocation:y,distance:s,ignoreLocation:l});if(k=Math.min(g,k),v=F+h,_){let C=0;for(;C<h;)I[F+C]=1,C+=1}}v=-1;let E=[],j=1,w=h+f;const d=1<<h-1;for(let g=0;g<h;g+=1){let C=0,R=w;for(;C<R;)le(e,{errors:g,currentLocation:y+R,expectedLocation:y,distance:s,ignoreLocation:l})<=k?C=R:w=R,R=Math.floor((w-C)/2+C);w=R;let B=Math.max(1,y-R+1),N=c?f:Math.min(y+R,f)+h,V=Array(N+2);V[N+1]=(1<<g)-1;for(let A=N;A>=B;A-=1){let b=A-1,p=n[t.charAt(b)];if(_&&(I[b]=+!!p),V[A]=(V[A+1]<<1|1)&p,g&&(V[A]|=(E[A+1]|E[A])<<1|1|E[A+1]),V[A]&d&&(j=le(e,{errors:g,currentLocation:b,expectedLocation:y,distance:s,ignoreLocation:l}),j<=k)){if(k=j,v=b,v<=y)break;B=Math.max(1,2*y-v)}}if(le(e,{errors:g+1,currentLocation:y,expectedLocation:y,distance:s,ignoreLocation:l})>k)break;E=V}const m={isMatch:v>=0,score:Math.max(.001,j)};if(_){const g=Xt(I,o);g.length?a&&(m.indices=g):m.isMatch=!1}return m}function qt(t){let e={};for(let n=0,r=t.length;n<r;n+=1){const s=t.charAt(n);e[s]=(e[s]||0)|1<<r-n-1}return e}const ge=String.prototype.normalize?(t=>t.normalize("NFD").replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g,"")):(t=>t);class Ue{constructor(e,{location:n=S.location,threshold:r=S.threshold,distance:s=S.distance,includeMatches:i=S.includeMatches,findAllMatches:c=S.findAllMatches,minMatchCharLength:o=S.minMatchCharLength,isCaseSensitive:a=S.isCaseSensitive,ignoreDiacritics:l=S.ignoreDiacritics,ignoreLocation:h=S.ignoreLocation}={}){if(this.options={location:n,threshold:r,distance:s,includeMatches:i,findAllMatches:c,minMatchCharLength:o,isCaseSensitive:a,ignoreDiacritics:l,ignoreLocation:h},e=a?e:e.toLowerCase(),e=l?ge(e):e,this.pattern=e,this.chunks=[],!this.pattern.length)return;const f=(k,v)=>{this.chunks.push({pattern:k,alphabet:qt(k),startIndex:v})},y=this.pattern.length;if(y>te){let k=0;const v=y%te,_=y-v;for(;k<_;)f(this.pattern.substr(k,te),k),k+=te;if(v){const I=y-te;f(this.pattern.substr(I),I)}}else f(this.pattern,0)}searchIn(e){const{isCaseSensitive:n,ignoreDiacritics:r,includeMatches:s}=this.options;if(e=n?e:e.toLowerCase(),e=r?ge(e):e,this.pattern===e){let _={isMatch:!0,score:0};return s&&(_.indices=[[0,e.length-1]]),_}const{location:i,distance:c,threshold:o,findAllMatches:a,minMatchCharLength:l,ignoreLocation:h}=this.options;let f=[],y=0,k=!1;this.chunks.forEach(({pattern:_,alphabet:I,startIndex:F})=>{const{isMatch:E,score:j,indices:w}=Zt(e,_,I,{location:i+F,distance:c,threshold:o,findAllMatches:a,minMatchCharLength:l,includeMatches:s,ignoreLocation:h});E&&(k=!0),y+=j,E&&w&&(f=[...f,...w])});let v={isMatch:k,score:k?y/this.chunks.length:1};return k&&s&&(v.indices=f),v}}class X{constructor(e){this.pattern=e}static isMultiMatch(e){return Ne(e,this.multiRegex)}static isSingleMatch(e){return Ne(e,this.singleRegex)}search(){}}function Ne(t,e){const n=t.match(e);return n?n[1]:null}class en extends X{constructor(e){super(e)}static get type(){return"exact"}static get multiRegex(){return/^="(.*)"$/}static get singleRegex(){return/^=(.*)$/}search(e){const n=e===this.pattern;return{isMatch:n,score:n?0:1,indices:[0,this.pattern.length-1]}}}class tn extends X{constructor(e){super(e)}static get type(){return"inverse-exact"}static get multiRegex(){return/^!"(.*)"$/}static get singleRegex(){return/^!(.*)$/}search(e){const r=e.indexOf(this.pattern)===-1;return{isMatch:r,score:r?0:1,indices:[0,e.length-1]}}}class nn extends X{constructor(e){super(e)}static get type(){return"prefix-exact"}static get multiRegex(){return/^\^"(.*)"$/}static get singleRegex(){return/^\^(.*)$/}search(e){const n=e.startsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[0,this.pattern.length-1]}}}class rn extends X{constructor(e){super(e)}static get type(){return"inverse-prefix-exact"}static get multiRegex(){return/^!\^"(.*)"$/}static get singleRegex(){return/^!\^(.*)$/}search(e){const n=!e.startsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[0,e.length-1]}}}class sn extends X{constructor(e){super(e)}static get type(){return"suffix-exact"}static get multiRegex(){return/^"(.*)"\$$/}static get singleRegex(){return/^(.*)\$$/}search(e){const n=e.endsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[e.length-this.pattern.length,e.length-1]}}}class on extends X{constructor(e){super(e)}static get type(){return"inverse-suffix-exact"}static get multiRegex(){return/^!"(.*)"\$$/}static get singleRegex(){return/^!(.*)\$$/}search(e){const n=!e.endsWith(this.pattern);return{isMatch:n,score:n?0:1,indices:[0,e.length-1]}}}class Ye extends X{constructor(e,{location:n=S.location,threshold:r=S.threshold,distance:s=S.distance,includeMatches:i=S.includeMatches,findAllMatches:c=S.findAllMatches,minMatchCharLength:o=S.minMatchCharLength,isCaseSensitive:a=S.isCaseSensitive,ignoreDiacritics:l=S.ignoreDiacritics,ignoreLocation:h=S.ignoreLocation}={}){super(e),this._bitapSearch=new Ue(e,{location:n,threshold:r,distance:s,includeMatches:i,findAllMatches:c,minMatchCharLength:o,isCaseSensitive:a,ignoreDiacritics:l,ignoreLocation:h})}static get type(){return"fuzzy"}static get multiRegex(){return/^"(.*)"$/}static get singleRegex(){return/^(.*)$/}search(e){return this._bitapSearch.searchIn(e)}}class Ve extends X{constructor(e){super(e)}static get type(){return"include"}static get multiRegex(){return/^'"(.*)"$/}static get singleRegex(){return/^'(.*)$/}search(e){let n=0,r;const s=[],i=this.pattern.length;for(;(r=e.indexOf(this.pattern,n))>-1;)n=r+i,s.push([r,n-1]);const c=!!s.length;return{isMatch:c,score:c?0:1,indices:s}}}const Ce=[en,Ve,nn,rn,on,sn,tn,Ye],Fe=Ce.length,an=/ +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/,cn="|";function ln(t,e={}){return t.split(cn).map(n=>{let r=n.trim().split(an).filter(i=>i&&!!i.trim()),s=[];for(let i=0,c=r.length;i<c;i+=1){const o=r[i];let a=!1,l=-1;for(;!a&&++l<Fe;){const h=Ce[l];let f=h.isMultiMatch(o);f&&(s.push(new h(f,e)),a=!0)}if(!a)for(l=-1;++l<Fe;){const h=Ce[l];let f=h.isSingleMatch(o);if(f){s.push(new h(f,e));break}}}return s})}const un=new Set([Ye.type,Ve.type]);class dn{constructor(e,{isCaseSensitive:n=S.isCaseSensitive,ignoreDiacritics:r=S.ignoreDiacritics,includeMatches:s=S.includeMatches,minMatchCharLength:i=S.minMatchCharLength,ignoreLocation:c=S.ignoreLocation,findAllMatches:o=S.findAllMatches,location:a=S.location,threshold:l=S.threshold,distance:h=S.distance}={}){this.query=null,this.options={isCaseSensitive:n,ignoreDiacritics:r,includeMatches:s,minMatchCharLength:i,findAllMatches:o,ignoreLocation:c,location:a,threshold:l,distance:h},e=n?e:e.toLowerCase(),e=r?ge(e):e,this.pattern=e,this.query=ln(this.pattern,this.options)}static condition(e,n){return n.useExtendedSearch}searchIn(e){const n=this.query;if(!n)return{isMatch:!1,score:1};const{includeMatches:r,isCaseSensitive:s,ignoreDiacritics:i}=this.options;e=s?e:e.toLowerCase(),e=i?ge(e):e;let c=0,o=[],a=0;for(let l=0,h=n.length;l<h;l+=1){const f=n[l];o.length=0,c=0;for(let y=0,k=f.length;y<k;y+=1){const v=f[y],{isMatch:_,indices:I,score:F}=v.search(e);if(_){if(c+=1,a+=F,r){const E=v.constructor.type;un.has(E)?o=[...o,...I]:o.push(I)}}else{a=0,c=0,o.length=0;break}}if(c){let y={isMatch:!0,score:a/c};return r&&(y.indices=o),y}}return{isMatch:!1,score:1}}}const ve=[];function hn(...t){ve.push(...t)}function Ae(t,e){for(let n=0,r=ve.length;n<r;n+=1){let s=ve[n];if(s.condition(t,e))return new s(t,e)}return new Ue(t,e)}const me={AND:"$and",OR:"$or"},Ee={PATH:"$path",PATTERN:"$val"},Me=t=>!!(t[me.AND]||t[me.OR]),fn=t=>!!t[Ee.PATH],gn=t=>!J(t)&&Pe(t)&&!Me(t),Re=t=>({[me.AND]:Object.keys(t).map(e=>({[e]:t[e]}))});function Ge(t,e,{auto:n=!0}={}){const r=s=>{let i=Object.keys(s);const c=fn(s);if(!c&&i.length>1&&!Me(s))return r(Re(s));if(gn(s)){const a=c?s[Ee.PATH]:i[0],l=c?s[Ee.PATTERN]:s[a];if(!G(l))throw new Error(Lt(a));const h={keyId:we(a),pattern:l};return n&&(h.searcher=Ae(l,e)),h}let o={children:[],operator:i[0]};return i.forEach(a=>{const l=s[a];J(l)&&l.forEach(h=>{o.children.push(r(h))})}),o};return Me(t)||(t=Re(t)),r(t)}function mn(t,{ignoreFieldNorm:e=S.ignoreFieldNorm}){t.forEach(n=>{let r=1;n.matches.forEach(({key:s,norm:i,score:c})=>{const o=s?s.weight:null;r*=Math.pow(c===0&&o?Number.EPSILON:c,(o||1)*(e?1:i))}),n.score=r})}function pn(t,e){const n=t.matches;e.matches=[],K(n)&&n.forEach(r=>{if(!K(r.indices)||!r.indices.length)return;const{indices:s,value:i}=r;let c={indices:s,value:i};r.key&&(c.key=r.key.src),r.idx>-1&&(c.refIndex=r.idx),e.matches.push(c)})}function bn(t,e){e.score=t.score}function yn(t,e,{includeMatches:n=S.includeMatches,includeScore:r=S.includeScore}={}){const s=[];return n&&s.push(pn),r&&s.push(bn),t.map(i=>{const{idx:c}=i,o={item:e[c],refIndex:c};return s.length&&s.forEach(a=>{a(i,o)}),o})}class re{constructor(e,n={},r){this.options={...S,...n},this.options.useExtendedSearch,this._keyStore=new Wt(this.options.keys),this.setCollection(e,r)}setCollection(e,n){if(this._docs=e,n&&!(n instanceof $e))throw new Error(Bt);this._myIndex=n||Ke(this.options.keys,this._docs,{getFn:this.options.getFn,fieldNormWeight:this.options.fieldNormWeight})}add(e){K(e)&&(this._docs.push(e),this._myIndex.add(e))}remove(e=()=>!1){const n=[];for(let r=0,s=this._docs.length;r<s;r+=1){const i=this._docs[r];e(i,r)&&(this.removeAt(r),r-=1,s-=1,n.push(i))}return n}removeAt(e){this._docs.splice(e,1),this._myIndex.removeAt(e)}getIndex(){return this._myIndex}search(e,{limit:n=-1}={}){const{includeMatches:r,includeScore:s,shouldSort:i,sortFn:c,ignoreFieldNorm:o}=this.options;let a=G(e)?G(this._docs[0])?this._searchStringList(e):this._searchObjectList(e):this._searchLogical(e);return mn(a,{ignoreFieldNorm:o}),i&&a.sort(c),He(n)&&n>-1&&(a=a.slice(0,n)),yn(a,this._docs,{includeMatches:r,includeScore:s})}_searchStringList(e){const n=Ae(e,this.options),{records:r}=this._myIndex,s=[];return r.forEach(({v:i,i:c,n:o})=>{if(!K(i))return;const{isMatch:a,score:l,indices:h}=n.searchIn(i);a&&s.push({item:i,idx:c,matches:[{score:l,value:i,norm:o,indices:h}]})}),s}_searchLogical(e){const n=Ge(e,this.options),r=(o,a,l)=>{if(!o.children){const{keyId:f,searcher:y}=o,k=this._findMatches({key:this._keyStore.get(f),value:this._myIndex.getValueForItemAtKeyId(a,f),searcher:y});return k&&k.length?[{idx:l,item:a,matches:k}]:[]}const h=[];for(let f=0,y=o.children.length;f<y;f+=1){const k=o.children[f],v=r(k,a,l);if(v.length)h.push(...v);else if(o.operator===me.AND)return[]}return h},s=this._myIndex.records,i={},c=[];return s.forEach(({$:o,i:a})=>{if(K(o)){let l=r(n,o,a);l.length&&(i[a]||(i[a]={idx:a,item:o,matches:[]},c.push(i[a])),l.forEach(({matches:h})=>{i[a].matches.push(...h)}))}}),c}_searchObjectList(e){const n=Ae(e,this.options),{keys:r,records:s}=this._myIndex,i=[];return s.forEach(({$:c,i:o})=>{if(!K(c))return;let a=[];r.forEach((l,h)=>{a.push(...this._findMatches({key:l,value:c[h],searcher:n}))}),a.length&&i.push({idx:o,item:c,matches:a})}),i}_findMatches({key:e,value:n,searcher:r}){if(!K(n))return[];let s=[];if(J(n))n.forEach(({v:i,i:c,n:o})=>{if(!K(i))return;const{isMatch:a,score:l,indices:h}=r.searchIn(i);a&&s.push({score:l,key:e,value:i,idx:c,norm:o,indices:h})});else{const{v:i,n:c}=n,{isMatch:o,score:a,indices:l}=r.searchIn(i);o&&s.push({score:a,key:e,value:i,norm:c,indices:l})}return s}}re.version="7.1.0";re.createIndex=Ke;re.parseIndex=Qt;re.config=S;re.parseQuery=Ge;hn(dn);const xn={keys:["original","translated"],threshold:.3,includeScore:!0,includeMatches:!0,minMatchCharLength:1,maxResults:10};function Je(t,e={}){const[n,r]=$.useState([]),[s,i]=$.useState(!1),c=$.useMemo(()=>({...xn,...e}),[e]),o=$.useMemo(()=>new re(t,c),[t,c]),a=$.useCallback(y=>{if(!y.trim())return r([]),i(!1),[];i(!0);const v=o.search(y,{limit:c.maxResults||10}).map(_=>({item:_.item,score:_.score,matches:_.matches}));return r(v),i(!1),v},[o,c.maxResults]),l=$.useCallback((y,k=5)=>{if(!y.trim())return[];const v=o.search(y,{limit:k*2}),_=new Set;return v.forEach(I=>{if(_.size>=k)return;const F=I.item;if(F.original){const E=F.original.toLowerCase(),j=y.toLowerCase();E.includes(j)&&_.add(F.original)}}),Array.from(_)},[o]),h=$.useCallback(y=>{if(!y.trim()||y.length<2)return[];const k=y.toLowerCase(),v=new Set;return t.forEach(_=>{if(!(v.size>=8)&&_.original){const I=_.original.trim(),F=I.toLowerCase();if(F.startsWith(k)&&I.length>y.length){v.add(I);return}const E=I.split(/[\s\n\r,.!?;:]+/).filter(j=>j.length>0);for(const j of E)if(j.toLowerCase().startsWith(k)&&j.length>y.length){v.add(I);break}F.includes(k)&&!v.has(I)&&v.add(I)}}),Array.from(v).slice(0,5)},[t]),f=$.useCallback(()=>{r([]),i(!1)},[]);return{search:a,getSuggestions:l,getAutoComplete:h,clearResults:f,results:n,isSearching:s}}function kn(t){return Je(t,{keys:["original","translated"],threshold:.4,includeScore:!0,includeMatches:!0,minMatchCharLength:1,maxResults:20})}function wn(t){return Je(t,{keys:["original"],threshold:.2,includeScore:!0,minMatchCharLength:2,maxResults:10})}const Cn=({history:t,searchTerm:e,onSearchChange:n,onBack:r,onRestore:s,onDelete:i,onClear:c,onExport:o,onImport:a})=>{const l=$.useRef(null),[h,f]=$.useState(!1),{search:y,results:k}=kn(t),v=$.useCallback(Oe(g=>{n(g),g.trim()&&y(g)},300),[n,y]),_=g=>{v(g.target.value)},I=async()=>{if(!h&&confirm("确定要清除所有历史记录吗？此操作不可撤销。")){f(!0);try{await c()}finally{f(!1)}}},F=async(g,C)=>{C.stopPropagation(),confirm("确定要删除这条历史记录吗？")&&await i(g)},E=e.trim()===""?t:k.map(g=>g.item),j=()=>{l.current?.click()},w=g=>{const C=g.target.files?.[0];C&&(a(C),g.target.value="")},d=(g,C)=>{const R=g.original.length>30?g.original.substring(0,30)+"...":g.original;return u.jsxs("div",{className:"history-item",onClick:()=>s(g),children:[u.jsx("div",{className:"history-item-title",children:R}),u.jsxs("div",{className:"history-meta",children:[u.jsx("div",{className:"history-item-time",children:_t(g.timestamp)}),u.jsxs("div",{className:"history-actions",children:[u.jsx("button",{className:"history-action-btn history-restore",onClick:B=>{B.stopPropagation(),s(g)},children:"恢复"}),u.jsx("button",{className:"history-action-btn history-delete",onClick:B=>F(g.original,B),children:"删除"})]})]}),g.hasReasoning&&u.jsx("div",{className:"history-tags",children:u.jsx("span",{className:"history-tag",children:"含思维链"})})]},`${g.timestamp}-${C}`)},m=()=>{const g=e.trim()!==""?`没有符合"${e}"的搜索结果`:"暂无翻译历史";return u.jsxs("div",{className:"empty-state-container",children:[u.jsx("p",{className:"empty-history",children:g}),u.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]})};return u.jsxs("div",{className:"history-panel visible",children:[u.jsxs("div",{className:"history-panel-header",children:[u.jsxs("div",{className:"history-panel-title",children:[u.jsx("div",{className:"back-button",onClick:r,children:u.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:u.jsx("path",{d:"M19 12H5M12 19l-7-7 7-7"})})}),u.jsx("h2",{children:"翻译历史"})]}),u.jsx("div",{className:"history-search-container",children:u.jsx("input",{type:"text",className:"history-search",placeholder:"搜索历史记录...",defaultValue:e,onChange:_})})]}),u.jsx("div",{className:"history-panel-content",children:E.length>0?u.jsxs(u.Fragment,{children:[E.map(d),u.jsx("div",{className:"history-limit-hint",children:"注意：系统最多保留100条最近的历史记录"})]}):m()}),u.jsxs("div",{className:"history-panel-footer",children:[u.jsxs("button",{className:"footer-btn",onClick:I,disabled:h,children:[u.jsx("div",{className:"footer-btn-icon",children:u.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("polyline",{points:"3 6 5 6 21 6"}),u.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})}),u.jsx("span",{children:h?"清空中...":"清空"})]}),u.jsxs("button",{className:"footer-btn",onClick:o,children:[u.jsx("div",{className:"footer-btn-icon",children:u.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),u.jsx("polyline",{points:"17 8 12 3 7 8"}),u.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]})}),u.jsx("span",{children:"导出"})]}),u.jsxs("button",{className:"footer-btn",onClick:j,children:[u.jsx("div",{className:"footer-btn-icon",children:u.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[u.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),u.jsx("polyline",{points:"7 10 12 15 17 10"}),u.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]})}),u.jsx("span",{children:"导入"})]})]}),u.jsx("input",{ref:l,type:"file",accept:".json",style:{display:"none"},onChange:w})]})},vn=pe("popup-image","🖼️");class An{static compressImage(e,n=ce.COMPRESSION_QUALITY){return new Promise((r,s)=>{const i=document.createElement("canvas"),c=i.getContext("2d"),o=new Image;o.onload=()=>{let{width:a,height:l}=o;const h=ce.MAX_DIMENSION;(a>h||l>h)&&(a>l?(l=l*h/a,a=h):(a=a*h/l,l=h)),i.width=a,i.height=l,c?.drawImage(o,0,0,a,l);const f=i.toDataURL("image/jpeg",n);r(f)},o.onerror=()=>s(new Error("图片加载失败")),o.src=URL.createObjectURL(e)})}static isValidImageType(e){return ce.SUPPORTED_FORMATS.includes(e)}static isValidImageSize(e){return e<=ce.MAX_SIZE}static async getImageFromClipboard(){try{const e=await navigator.clipboard.read();for(const n of e)for(const r of n.types)if(this.isValidImageType(r)){const s=await n.getType(r);if(!this.isValidImageSize(s.size))throw new Error("图片大小超过限制（10MB）");const i=new File([s],"clipboard-image",{type:r});return{data:await this.compressImage(i),mimeType:r,fileName:`clipboard-image-${Date.now()}`}}return null}catch(e){throw vn.error("从剪贴板获取图片失败:",e),e}}static formatImageForAPI(e){return{type:"image_url",image_url:{url:e.data}}}}const En=`
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
`;function Mn(t="markdown-styles"){if(!document.querySelector(`#${t}`)){const e=document.createElement("style");e.id=t,e.textContent=En,document.head.appendChild(e)}}function Qe(t){if(!t)return"";let e=t;e=e.replace(/\r\n/g,`
`).replace(/\r/g,`
`),e=e.replace(/</g,"&lt;").replace(/>/g,"&gt;");const n=[];e=e.replace(/```(\w+)?\n([\s\S]*?)```/g,(s,i,c)=>{const o=n.length,a=i||"text",l=c.trim();return n.push(`<div class="code-block-container">
        <div class="code-block-header">
          <span class="code-language">${a}</span>
          <button class="copy-button" data-code="${l}" title="复制代码">
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
      </div>`),`__CODE_BLOCK_${o}__`});const r=[];return e=e.replace(/`([^`\n]+)`/g,(s,i)=>{const c=r.length;return r.push(`<code class="inline-code">${i}</code>`),`__INLINE_CODE_${c}__`}),e=$n(e),e=e.replace(/^#{6}\s+(.*$)/gm,"<h6>$1</h6>"),e=e.replace(/^#{5}\s+(.*$)/gm,"<h5>$1</h5>"),e=e.replace(/^#{4}\s+(.*$)/gm,"<h4>$1</h4>"),e=e.replace(/^#{3}\s+(.*$)/gm,"<h3>$1</h3>"),e=e.replace(/^#{2}\s+(.*$)/gm,"<h2>$1</h2>"),e=e.replace(/^#{1}\s+(.*$)/gm,"<h1>$1</h1>"),e=e.replace(/^(-{3,}|\*{3,}|_{3,})$/gm,'<hr class="markdown-divider">'),e=jn(e),e=Sn(e),e=Dn(e),e=Tn(e),e=_n(e),n.forEach((s,i)=>{e=e.replace(`__CODE_BLOCK_${i}__`,s)}),r.forEach((s,i)=>{e=e.replace(`__INLINE_CODE_${i}__`,s)}),e=e.replace(/\n{3,}/g,`

`),e=e.replace(/^\s+|\s+$/g,""),e}function $n(t){const e=/^(\|.*\|)\n(\|[-\s|:]*\|)\n((?:\|.*\|\n?)*)/gm;return t.replace(e,(n,r,s,i)=>{const c=r.split("|").slice(1,-1).map(a=>`<th>${a.trim()}</th>`).join(""),o=i.trim().split(`
`).map(a=>`<tr>${a.split("|").slice(1,-1).map(h=>`<td>${h.trim()}</td>`).join("")}</tr>`).join("");return`<table class="markdown-table"><thead><tr>${c}</tr></thead><tbody>${o}</tbody></table>`})}function jn(t){const e=t.split(`
`),n=[];let r=!1,s=[];for(const i of e)i.match(/^>\s/)?(r||(r=!0,s=[]),s.push(i.replace(/^>\s?/,""))):(r&&(n.push(`<blockquote class="markdown-quote">${s.join("<br>")}</blockquote>`),r=!1,s=[]),n.push(i));return r&&s.length>0&&n.push(`<blockquote class="markdown-quote">${s.join("<br>")}</blockquote>`),n.join(`
`)}function Sn(t){const e=t.split(`
`),n=[];let r=null;for(const s of e){const i=s.match(/^(\s*)[-*+]\s+(.+)$/),c=s.match(/^(\s*)\d+\.\s+(.+)$/);if(i){const[,o,a]=i,l=Math.floor(o.length/2);(!r||r.type!=="ul")&&(r&&n.push(ue(r)),r={type:"ul",items:[]}),r.items.push(`<li class="list-item level-${l}">${a}</li>`)}else if(c){const[,o,a]=c,l=Math.floor(o.length/2);(!r||r.type!=="ol")&&(r&&n.push(ue(r)),r={type:"ol",items:[]}),r.items.push(`<li class="list-item level-${l}">${a}</li>`)}else r&&(n.push(ue(r)),r=null),n.push(s)}return r&&n.push(ue(r)),n.join(`
`)}function ue(t){return`<${t.type} class="markdown-list">${t.items.join("")}</${t.type}>`}function Dn(t){return t=t.replace(/~~(.*?)~~/g,'<del class="strikethrough">$1</del>'),t=t.replace(/\*\*(.*?)\*\*/g,'<strong class="bold">$1</strong>'),t=t.replace(new RegExp("(?<!\\*)\\*(?!\\*)([^*]+)\\*(?!\\*)","g"),'<em class="italic">$1</em>'),t=t.replace(/==(.*?)==/g,'<mark class="highlight">$1</mark>'),t}function Tn(t){return t=t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" class="markdown-image" loading="lazy">'),t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>'),t=t.replace(/<(https?:\/\/[^>]+)>/g,'<a href="$1" class="markdown-link auto-link" target="_blank" rel="noopener noreferrer">$1</a>'),t}function _n(t){return t.split(/\n\s*\n/).map(n=>{if(n=n.trim(),!n)return"";if(n.match(/^<(h[1-6]|div|blockquote|ul|ol|table|pre|hr)/))return n;const r=n.split(`
`).filter(s=>s.trim());return r.length===1?`<p class="markdown-paragraph">${r[0]}</p>`:`<p class="markdown-paragraph">${r.join("<br>")}</p>`}).join(`

`)}async function In(t){const e=t.getAttribute("data-code");if(!e)return;const n=t.querySelector(".copy-icon"),r=t.querySelector(".check-icon");try{await navigator.clipboard.writeText(e),n&&r&&(n.style.display="none",r.style.display="block",setTimeout(()=>{n.style.display="block",r.style.display="none"},2e3))}catch{const i=document.createElement("textarea");i.value=e,i.style.position="fixed",i.style.opacity="0",document.body.appendChild(i),i.select();try{await navigator.clipboard.writeText(e)}catch{const o=document.createElement("textarea");o.value=e,o.style.position="fixed",o.style.opacity="0",o.style.left="-9999px",document.body.appendChild(o),o.select();try{document.execCommand("copy")}finally{document.body.removeChild(o)}}document.body.removeChild(i),n&&r&&(n.style.display="none",r.style.display="block",setTimeout(()=>{n.style.display="block",r.style.display="none"},2e3))}}function Nn(){document.addEventListener("click",t=>{const n=t.target.closest(".copy-button");n&&n.classList.contains("copy-button")&&(t.preventDefault(),In(n))})}const Fn=({reasoningText:t,isTranslating:e})=>{const[n,r]=$.useState(!1),[s,i]=$.useState(!1),c=$.useRef(null),o=$.useRef(null);$.useEffect(()=>{if(c.current&&o.current){const h=c.current.scrollHeight,f=o.current.clientHeight;i(h>f)}},[t]),$.useEffect(()=>{!n&&o.current&&t&&requestAnimationFrame(()=>{o.current&&(o.current.scrollTop=o.current.scrollHeight)})},[t,n]);const a=()=>{r(!n)},l=()=>{const h=t.split(`
`);return h.length>5?h.slice(-5).join(`
`):t};return u.jsxs("div",{className:"collapsible-thinking-chain",children:[u.jsxs("div",{className:"result-label",children:["思维链",!n&&s&&u.jsx("span",{className:"expand-indicator",children:" (点击展开查看完整内容)"}),n&&u.jsx("span",{className:"expand-indicator",children:" (点击收起)"})]}),u.jsx("div",{ref:o,className:`thinking-chain-container ${n?"expanded":"collapsed"}`,onClick:!n&&s?a:void 0,children:u.jsx("div",{ref:c,className:"thinking-chain-content markdown-content",dangerouslySetInnerHTML:{__html:Qe(n?t:l())}})}),n&&u.jsx("button",{className:"collapse-btn",onClick:a,children:"收起思维链 ↑"}),e&&u.jsxs("div",{className:"thinking-indicator",children:[u.jsx("span",{className:"thinking-dot"}),u.jsx("span",{className:"thinking-dot"}),u.jsx("span",{className:"thinking-dot"}),"思考中..."]})]})},Rn=({onCopyOriginal:t,onCopyTranslation:e,hasResult:n,hasInput:r})=>{const[s,i]=$.useState("复制原文"),[c,o]=$.useState("复制译文"),[a,l]=$.useState(!1),[h,f]=$.useState(!1),y=async()=>{if(!a){l(!0),i("复制中...");try{await t()?(i("已复制"),setTimeout(()=>i("复制原文"),1500)):(i("复制失败"),setTimeout(()=>i("复制原文"),1500))}catch{i("复制失败"),setTimeout(()=>i("复制原文"),1500)}finally{l(!1)}}},k=async()=>{if(!h){f(!0),o("复制中...");try{await e()?(o("已复制"),setTimeout(()=>o("复制译文"),1500)):(o("复制失败"),setTimeout(()=>o("复制译文"),1500))}catch{o("复制失败"),setTimeout(()=>o("复制译文"),1500)}finally{f(!1)}}};return u.jsxs("div",{className:"copy-footer",children:[u.jsx("button",{className:"copy-footer-btn copy-original-btn",onClick:y,disabled:!r||a,title:r?"复制原文到剪贴板":"请先输入文本",children:s}),u.jsx("button",{className:"copy-footer-btn copy-translation-btn",onClick:k,disabled:!n||h,title:n?"复制译文到剪贴板":"请先进行翻译",children:c})]})},Bn=({value:t,onChange:e,onKeyDown:n,placeholder:r,rows:s=5,history:i,disabled:c=!1})=>{const[o,a]=$.useState(!1),[l,h]=$.useState(-1),[f,y]=$.useState([]),k=$.useRef(null),v=$.useRef(null),{getAutoComplete:_,getSuggestions:I}=wn(i),F=$.useCallback(()=>{if(!k.current)return{word:"",start:0,end:0};const d=k.current,m=d.selectionStart,g=d.value;let C=m,R=m;for(;C>0&&!/[\s\n\r,.!?;:]/.test(g[C-1]);)C--;for(;R<g.length&&!/[\s\n\r,.!?;:]/.test(g[R]);)R++;return{word:g.slice(C,R),start:C,end:R}},[]);$.useCallback(()=>{if(!k.current)return;const{word:d}=F();if(d.length>=2){const m=_(d),g=I(d,3),C=Array.from(new Set([...m,...g]));y(C.slice(0,8)),a(C.length>0),h(-1)}else a(!1),y([])},[]);const E=$.useCallback(d=>{if(!k.current)return;const m=k.current,{start:g,end:C}=F(),R=m.value,B=R.slice(0,g)+d+R.slice(C);e(B),setTimeout(()=>{const N=g+d.length;m.setSelectionRange(N,N),m.focus()},0),a(!1)},[e,F]),j=d=>{e(d.target.value)},w=d=>{if(o&&f.length>0)switch(d.key){case"ArrowDown":d.preventDefault(),h(m=>m<f.length-1?m+1:0);return;case"ArrowUp":d.preventDefault(),h(m=>m>0?m-1:f.length-1);return;case"Tab":if(l>=0){d.preventDefault(),E(f[l]);return}break;case"Enter":if(l>=0){d.preventDefault(),E(f[l]);return}break;case"Escape":d.preventDefault(),a(!1);return}d.key==="Enter"&&(d.ctrlKey||d.metaKey)&&a(!1),n?.(d)};return $.useEffect(()=>{if(t){const{word:d}=F();if(d.length>=2){const m=_(d),g=I(d,3),C=Array.from(new Set([...m,...g]));y(C.slice(0,8)),a(C.length>0),h(-1)}else a(!1),y([])}else a(!1)},[t]),$.useEffect(()=>{const d=m=>{v.current&&!v.current.contains(m.target)&&!k.current?.contains(m.target)&&a(!1)};return document.addEventListener("mousedown",d),()=>document.removeEventListener("mousedown",d)},[]),u.jsxs("div",{className:"smart-input-container",children:[u.jsx("textarea",{ref:k,value:t,onChange:j,onKeyDown:w,placeholder:r,rows:s,disabled:c,className:"smart-input"}),o&&f.length>0&&u.jsx("div",{ref:v,className:"suggestions-dropdown",children:f.map((d,m)=>u.jsxs("div",{className:`suggestion-item ${m===l?"selected":""}`,onClick:()=>E(d),onMouseEnter:()=>h(m),children:[u.jsx("span",{className:"suggestion-text",children:d}),u.jsx("span",{className:"suggestion-hint",children:"Tab 补全"})]},m))})]})},ke=pe("popup-translation-area","📝"),Ln=({translationState:t,setTranslationState:e,onTranslate:n,onCopy:r,onShowHistory:s,onOpenSettings:i,history:c})=>{const o=$.useRef(!1),a=$.useRef(null),l=$.useRef(null);$.useEffect(()=>{Mn("popup-markdown-styles"),Nn()},[]);const h=$.useCallback(()=>{if(a.current){const{scrollHeight:E,scrollTop:j,clientHeight:w}=a.current,d=Math.abs(E-j-w)<10;o.current=!d,d||(l.current&&clearTimeout(l.current),l.current=setTimeout(()=>{if(a.current){const{scrollHeight:m,scrollTop:g,clientHeight:C}=a.current;Math.abs(m-g-C)<10&&(o.current=!1)}},1e3))}},[]),f=$.useCallback(Tt(h,16),[h]);$.useEffect(()=>{!o.current&&a.current&&(t.translatedText||t.reasoningText)&&requestAnimationFrame(()=>{a.current&&(a.current.scrollTop=a.current.scrollHeight)})},[t.translatedText,t.reasoningText]),$.useEffect(()=>{t.isTranslating&&(o.current=!1,l.current&&(clearTimeout(l.current),l.current=null))},[t.isTranslating]),$.useEffect(()=>()=>{l.current&&clearTimeout(l.current)},[]);const y=E=>{E.key==="Enter"&&(E.ctrlKey||E.metaKey)&&(E.preventDefault(),t.isTranslating||n())},k=async()=>await r(t.translatedText),v=async()=>t.sourceText.trim()?await r(t.sourceText):(alert("请输入要复制的文本"),!1),_=async()=>{const E=!t.thinkingEnabled;e(j=>({...j,thinkingEnabled:E}));try{await ee.setSetting("thinkingEnabled",E)}catch(j){ke.error("更新思考模式失败:",j)}};$.useEffect(()=>{ee.getSettings().then(E=>{e(j=>({...j,thinkingEnabled:E.thinkingEnabled}))}).catch(E=>ke.error("读取思考模式失败:",E))},[e]);const I=async E=>{try{const j=await An.getImageFromClipboard();j&&e(w=>({...w,images:[...w.images,j]}))}catch(j){ke.error("粘贴图片失败:",j),alert("粘贴图片失败: "+j.message)}},F=E=>{e(j=>({...j,images:j.images.filter((w,d)=>d!==E)}))};return $.useEffect(()=>{const E=j=>{document.activeElement?.closest(".translation-area")&&I()};return document.addEventListener("paste",E),()=>{document.removeEventListener("paste",E)}},[]),u.jsxs("div",{className:"translation-area",children:[u.jsxs("div",{className:"header-section",children:[u.jsx("h1",{children:"人话翻译器"}),u.jsxs("div",{className:"header-buttons",children:[u.jsxs("button",{className:`thinking-toggle-btn ${t.thinkingEnabled?"enabled":"disabled"}`,onClick:_,title:t.thinkingEnabled?"点击关闭深度思考":"点击开启深度思考",children:["🧠 ",t.thinkingEnabled?"深度思考":"快速回复"]}),u.jsx("button",{className:"text-btn",onClick:s,children:"历史记录"}),u.jsx("button",{className:"text-btn",onClick:i,children:"设置"})]})]}),t.images.length>0&&u.jsxs("div",{className:"image-preview-section",children:[u.jsxs("div",{className:"image-preview-header",children:[u.jsxs("span",{children:["已选择的图片 (",t.images.length,")"]}),u.jsx("span",{className:"image-hint",children:"💡 支持 Ctrl+V 粘贴剪贴板图片"})]}),u.jsx("div",{className:"image-preview-list",children:t.images.map((E,j)=>u.jsxs("div",{className:"image-preview-item",children:[u.jsx("img",{src:E.data,alt:`预览图 ${j+1}`}),u.jsx("button",{className:"remove-image-btn",onClick:()=>F(j),title:"删除图片",children:"✕"})]},j))})]}),u.jsxs("div",{className:"translation-content",children:[u.jsxs("div",{className:"input-section",children:[u.jsx("div",{className:"input-area",children:u.jsx(Bn,{value:t.sourceText,onChange:E=>e(j=>({...j,sourceText:E})),onKeyDown:y,placeholder:`请输入要翻译的文本... ${t.images.length>0?"(已选择"+t.images.length+"张图片) ":""}Ctrl+V可粘贴图片，Ctrl+Enter发送`,rows:3,history:c,disabled:t.isTranslating})}),u.jsx("div",{className:"translate-btn-wrapper",children:u.jsx("button",{className:"primary-btn",onClick:n,disabled:t.isTranslating,children:t.isTranslating?"翻译中...":"翻译"})})]}),t.showResult&&u.jsx("div",{className:"result-section-wrapper",ref:a,onScroll:f,children:u.jsxs("div",{className:"result-area",children:[u.jsx("div",{className:"result-header",children:u.jsx("span",{children:"翻译结果"})}),u.jsxs("div",{className:"result-wrapper",children:[t.hasReasoning&&t.reasoningText&&u.jsx(Fn,{reasoningText:t.reasoningText,isTranslating:t.isTranslating}),u.jsxs("div",{className:"result-section",children:[u.jsx("div",{className:"result-label",children:"译文"}),u.jsx("div",{className:"result-content markdown-content",dangerouslySetInnerHTML:{__html:Qe(t.translatedText)}})]})]})]})})]}),u.jsx(Rn,{onCopyOriginal:v,onCopyTranslation:k,hasResult:t.showResult,hasInput:t.sourceText.trim().length>0})]})},Y=pe("popup-app","🔽");function On(){const[t,e]=$.useState({sourceText:"",translatedText:"",reasoningText:"",isTranslating:!1,hasReasoning:!1,showResult:!1,thinkingEnabled:!1,images:[]}),[n,r]=$.useState(!1),[s,i]=$.useState([]),[c,o]=$.useState("");$.useEffect(()=>{Ze()},[]),$.useEffect(()=>{const w=(d,m,g)=>(Y.log("📨 [Popup App] 收到消息",{action:d.action,hasContent:!!d.content,contentLength:d.content?.length||0,hasReasoning:!!d.reasoningContent,reasoningLength:d.reasoningContent?.length||0,done:d.done,error:d.error,timestamp:new Date().toISOString()}),d.action==="updatePopupTranslation"?(Y.log("🔄 [Popup App] 处理popup翻译更新"),d.error?(Y.log("❌ [Popup App] 翻译错误:",d.error),e(C=>({...C,isTranslating:!1,translatedText:`错误: ${d.error}`}))):(Y.log("✅ [Popup App] 更新翻译状态",{hasNewContent:!!d.content,hasNewReasoning:!!d.reasoningContent,hasReasoning:d.hasReasoning,isComplete:d.done}),e(C=>({...C,translatedText:d.content||C.translatedText,reasoningText:d.reasoningContent||C.reasoningText,hasReasoning:d.hasReasoning||!1,showResult:!0,isTranslating:!d.done}))),g({success:!0})):Y.log("❓ [Popup App] 未处理的消息类型:",d.action),!1);if(O.runtime.onMessage)return O.runtime.onMessage.addListener(w),()=>{O.runtime.onMessage.removeListener(w)}},[]),$.useEffect(()=>{(async()=>{try{ee.clearCache();const m=await ee.getSettings();Y.log("⚙️ [Popup App] 初始化设置",{thinkingEnabled:m.thinkingEnabled,hasApiKey:!!m.apiKey}),e(g=>({...g,thinkingEnabled:m.thinkingEnabled}));try{const g=document.documentElement,C=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)"),R=m.theme==="system"?C?.matches?"dark":"light":m.theme;g.setAttribute("data-theme",R)}catch{}}catch(m){Y.error("❌ [Popup App] 加载设置失败:",m)}})(),f();const d=ee.onSettingsChanged(m=>{Y.log("🔄 [Popup App] 设置已更新",{thinkingEnabled:m.thinkingEnabled,previousState:t.thinkingEnabled}),e(g=>({...g,thinkingEnabled:m.thinkingEnabled}))});return()=>{d()}},[]);const a=()=>{},l=async()=>{const w=t.sourceText.trim();if(Y.log("LHG:popup/App.tsx text:::",w),!w){alert("请输入要翻译的文本");return}if(!t.isTranslating){e(d=>({...d,isTranslating:!0,showResult:!0,translatedText:"",reasoningText:"",hasReasoning:!1}));try{ee.clearCache();const d=await ee.getSettings();Y.log("⚙️ [Popup App] 翻译时使用设置",{thinkingEnabled:d.thinkingEnabled,temperature:d.temperature,hasApiKey:!!d.apiKey}),O?.runtime&&(await O.runtime.sendMessage({action:"cleanup"}),await O.runtime.sendMessage({action:"translate",text:w,images:t.images,thinkingEnabled:d.thinkingEnabled,temperature:d.temperature,promptTemplate:d.promptTemplate,apiKey:d.apiKey,source:"popup"}))}catch(d){d.message?.includes("Receiving end does not exist")||e(m=>({...m,isTranslating:!1,translatedText:`发生错误：${d.message}`}))}}},h=async w=>{try{return await navigator.clipboard.writeText(w),!0}catch(d){return Y.error("复制失败:",d),!1}},f=()=>{O?.runtime&&O.runtime.sendMessage({action:"getHistory"},w=>{w&&w.success&&i(w.history||[])})},y=()=>{r(!0),o(""),f()},k=()=>{r(!1)},v=w=>{e(d=>({...d,sourceText:w.original,translatedText:w.translated,reasoningText:w.reasoning||"",hasReasoning:w.hasReasoning||!1,isTranslating:!1,showResult:!0})),k()},_=w=>{confirm("确定要删除这条历史记录吗？")&&O?.runtime&&O.runtime.sendMessage({action:"deleteHistoryItem",original:w},d=>{d&&d.success?f():alert("删除失败："+(d?.error||"未知错误"))})},I=()=>{confirm("确定要清空所有历史记录吗？此操作不可撤销。")&&O?.runtime&&O.runtime.sendMessage({action:"clearHistory"},w=>{w&&w.success?i([]):alert("清空历史记录失败："+(w?.error||"未知错误"))})},F=()=>{O?.runtime&&O.runtime.sendMessage({action:"getHistory"},w=>{if(w&&w.success&&w.history.length>0){const d=JSON.stringify(w.history,null,2),m=new Blob([d],{type:"application/json"}),g=URL.createObjectURL(m),C=document.createElement("a");C.href=g,C.download=`translation_history_${new Date().toISOString().slice(0,10)}.json`,C.click(),setTimeout(()=>URL.revokeObjectURL(g),100)}else alert("暂无历史记录可导出")})},E=w=>{const d=new FileReader;d.onload=m=>{try{const g=JSON.parse(m.target?.result);Array.isArray(g)?O?.runtime&&O.runtime.sendMessage({action:"importHistory",history:g},C=>{C&&C.success?(alert("历史记录导入成功"),f()):alert("导入失败："+(C?.error||"未知错误"))}):alert("导入的文件格式不正确")}catch(g){alert("导入失败：文件解析错误"),Y.error(g)}},d.readAsText(w)},j=()=>{O?.runtime&&O.runtime.openOptionsPage()};return $.useEffect(()=>{const w=()=>{O?.runtime&&O.runtime.sendMessage({action:"cleanup"})};return window.addEventListener("beforeunload",w),()=>{window.removeEventListener("beforeunload",w),O?.runtime&&O.runtime.sendMessage({action:"cleanup"})}},[]),u.jsx("div",{className:"container",onScroll:a,children:n?u.jsx(Cn,{history:s,searchTerm:c,onSearchChange:o,onBack:k,onRestore:v,onDelete:_,onClear:I,onExport:F,onImport:E}):u.jsx(Ln,{translationState:t,setTranslationState:e,onTranslate:l,onCopy:h,onShowHistory:y,onOpenSettings:j,onScroll:()=>{},history:s})})}qe.createRoot(document.getElementById("root")).render(u.jsx(et.StrictMode,{children:u.jsx(On,{})}));
