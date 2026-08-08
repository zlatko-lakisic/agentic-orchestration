import{$ as Iw,Cn as aT,Ct as Qs,D as Cw,Dr as mm,En as bC,Gt as Ul,H as Gw,I as Fv,Kn as fC,M as EC,Mt as ST,On as bI,Pn as bw,Q as Ir,Un as dp,Vn as de,Xn as fp,Xt as Vl,Zn as fy,Zr as tC,bn as _t,c as Am,ci as wS,cr as ie,ct as Ls,di as ww,dr as jn,er as gm,hi as xw,kn as bT,lr as ig,lt as Lw,mn as Zl,n as $l,ni as v,nr as h,or as hm,pi as xC,qt as V,s as Ae$1,st as Lm,vi as ye$1,vn as _m,x as CC,xt as Pm,z as Gl}from"./chunk-CeQJ4Cdx.js";import{l as wt,t as Dt,u as yt}from"./main-BKGTRCWJ.js";import"./chunk-C7XtX2r2.js";import{n as I,r as w,t as A}from"./chunk-1V6SSHNJ.js";import{n as dt,r as lt,t as Z}from"./chunk-CGxEN4jC.js";import{t as I$1}from"./chunk-a9ntJSfl.js";import{t as l}from"./chunk-BH_61R7Y.js";import{t as m}from"./chunk-CuzXCJH9.js";import"./chunk-BDqyAtbK.js";import"./chunk-DoQCATbt.js";import{i as Lt,n as G,r as I$2,t as Bt}from"./chunk-DkjvUTnB.js";function Se(o,r){o&1&&mm(0,`div`,2)}var Ee=new v(`MAT_PROGRESS_BAR_DEFAULT_OPTIONS`);var be=(()=>{class o{_elementRef=h(ie);_ngZone=h(V);_changeDetectorRef=h(fy);_renderer=h(Ir);_cleanupTransitionEnd;constructor(){let e=wS(),a=h(Ee,{optional:!0});this._isNoopAnimation=e===`di-disabled`,e===`reduced-motion`&&this._elementRef.nativeElement.classList.add(`mat-progress-bar-reduced-motion`),a&&(a.color&&(this.color=this._defaultColor=a.color),this.mode=a.mode||this.mode)}_isNoopAnimation;get color(){return this._color||this._defaultColor}set color(e){this._color=e}_color;_defaultColor=`primary`;get value(){return this._value}set value(e){this._value=ve(e||0),this._changeDetectorRef.markForCheck()}_value=0;get bufferValue(){return this._bufferValue||0}set bufferValue(e){this._bufferValue=ve(e||0),this._changeDetectorRef.markForCheck()}_bufferValue=0;animationEnd=new de;get mode(){return this._mode}set mode(e){this._mode=e,this._changeDetectorRef.markForCheck()}_mode=`determinate`;ngAfterViewInit(){this._ngZone.runOutsideAngular(()=>{this._cleanupTransitionEnd=this._renderer.listen(this._elementRef.nativeElement,`transitionend`,this._transitionendHandler)})}ngOnDestroy(){this._cleanupTransitionEnd?.()}_getPrimaryBarTransform(){return`scaleX(${this._isIndeterminate()?1:this.value/100})`}_getBufferBarFlexBasis(){return`${this.mode===`buffer`?this.bufferValue:100}%`}_isIndeterminate(){return this.mode===`indeterminate`||this.mode===`query`}_transitionendHandler=e=>{this.animationEnd.observers.length===0||!e.target||!e.target.classList.contains(`mdc-linear-progress__primary-bar`)||(this.mode===`determinate`||this.mode===`buffer`)&&this._ngZone.run(()=>this.animationEnd.next({value:this.value}))};static ɵfac=function(a){return new(a||o)};static ɵcmp=jn({type:o,selectors:[[`mat-progress-bar`]],hostAttrs:[`role`,`progressbar`,`aria-valuemin`,`0`,`aria-valuemax`,`100`,`tabindex`,`-1`,1,`mat-mdc-progress-bar`,`mdc-linear-progress`],hostVars:10,hostBindings:function(a,m){a&2&&(Vl(`aria-valuenow`,m._isIndeterminate()?null:m.value)(`mode`,m.mode),tC(`mat-`+m.color),Qs(`_mat-animation-noopable`,m._isNoopAnimation)(`mdc-linear-progress--animation-ready`,!m._isNoopAnimation)(`mdc-linear-progress--indeterminate`,m._isIndeterminate()))},inputs:{color:`color`,value:[2,`value`,`value`,aT],bufferValue:[2,`bufferValue`,`bufferValue`,aT],mode:`mode`},outputs:{animationEnd:`animationEnd`},exportAs:[`matProgressBar`],decls:7,vars:5,consts:[[`aria-hidden`,`true`,1,`mdc-linear-progress__buffer`],[1,`mdc-linear-progress__buffer-bar`],[1,`mdc-linear-progress__buffer-dots`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__primary-bar`],[1,`mdc-linear-progress__bar-inner`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__secondary-bar`]],template:function(a,m){a&1&&($l(0,`div`,0),mm(1,`div`,1),Iw(2,Se,1,0,`div`,2),Gl(),$l(3,`div`,3),mm(4,`span`,4),Gl(),$l(5,`div`,5),mm(6,`span`,4),Gl()),a&2&&(bI(),Am(`flex-basis`,m._getBufferBarFlexBasis()),bI(),bw(m.mode===`buffer`?2:-1),bI(),Am(`transform`,m._getPrimaryBarTransform()))},styles:[`.mat-mdc-progress-bar {
  --%NS%mat-progress-bar-animation-multiplier: 1;
  display: block;
  text-align: start;
}
.mat-mdc-progress-bar[mode=query] {
  transform: scaleX(-1);
}
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__buffer-dots,
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__primary-bar,
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__secondary-bar,
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__bar-inner.mdc-linear-progress__bar-inner {
  animation: none;
}
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__primary-bar,
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__buffer-bar {
  transition: transform 1ms;
}

.mat-progress-bar-reduced-motion {
  --%NS%mat-progress-bar-animation-multiplier: 2;
}

.mdc-linear-progress {
  position: relative;
  width: 100%;
  transform: translateZ(0);
  outline: 1px solid transparent;
  overflow-x: hidden;
  transition: opacity 250ms 0ms cubic-bezier(0.4, 0, 0.6, 1);
  height: max(var(--%NS%mat-progress-bar-track-height, 4px), var(--%NS%mat-progress-bar-active-indicator-height, 4px));
}
@media (forced-colors: active) {
  .mdc-linear-progress {
    outline-color: CanvasText;
  }
}

.mdc-linear-progress__bar {
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
  width: 100%;
  animation: none;
  transform-origin: top left;
  transition: transform 250ms 0ms cubic-bezier(0.4, 0, 0.6, 1);
  height: var(--%NS%mat-progress-bar-active-indicator-height, 4px);
}
.mdc-linear-progress--indeterminate .mdc-linear-progress__bar {
  transition: none;
}
[dir=rtl] .mdc-linear-progress__bar {
  right: 0;
  transform-origin: center right;
}

.mdc-linear-progress__bar-inner {
  display: inline-block;
  position: absolute;
  width: 100%;
  animation: none;
  border-top-style: solid;
  border-color: var(--%NS%mat-progress-bar-active-indicator-color, var(--%NS%mat-sys-primary));
  border-top-width: var(--%NS%mat-progress-bar-active-indicator-height, 4px);
}

.mdc-linear-progress__buffer {
  display: flex;
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
  width: 100%;
  overflow: hidden;
  height: var(--%NS%mat-progress-bar-track-height, 4px);
  border-radius: var(--%NS%mat-progress-bar-track-shape, var(--%NS%mat-sys-corner-none));
}

.mdc-linear-progress__buffer-dots {
  background-image: radial-gradient(circle, var(--%NS%mat-progress-bar-track-color, var(--%NS%mat-sys-surface-variant)) calc(var(--%NS%mat-progress-bar-track-height, 4px) / 2), transparent 0);
  background-repeat: repeat-x;
  background-size: calc(calc(var(--%NS%mat-progress-bar-track-height, 4px) / 2) * 5);
  background-position: left;
  flex: auto;
  transform: rotate(180deg);
  animation: mdc-linear-progress-buffering calc(250ms * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
}
@media (forced-colors: active) {
  .mdc-linear-progress__buffer-dots {
    background-color: ButtonBorder;
  }
}
[dir=rtl] .mdc-linear-progress__buffer-dots {
  animation: mdc-linear-progress-buffering-reverse calc(250ms * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
  transform: rotate(0);
}

.mdc-linear-progress__buffer-bar {
  flex: 0 1 100%;
  transition: flex-basis 250ms 0ms cubic-bezier(0.4, 0, 0.6, 1);
  background-color: var(--%NS%mat-progress-bar-track-color, var(--%NS%mat-sys-surface-variant));
}

.mdc-linear-progress__primary-bar {
  transform: scaleX(0);
}
.mdc-linear-progress--indeterminate .mdc-linear-progress__primary-bar {
  left: -145.166611%;
}
.mdc-linear-progress--indeterminate.mdc-linear-progress--animation-ready .mdc-linear-progress__primary-bar {
  animation: mdc-linear-progress-primary-indeterminate-translate calc(2s * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
}
.mdc-linear-progress--indeterminate.mdc-linear-progress--animation-ready .mdc-linear-progress__primary-bar > .mdc-linear-progress__bar-inner {
  animation: mdc-linear-progress-primary-indeterminate-scale calc(2s * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
}
[dir=rtl] .mdc-linear-progress.mdc-linear-progress--animation-ready .mdc-linear-progress__primary-bar {
  animation-name: mdc-linear-progress-primary-indeterminate-translate-reverse;
}
[dir=rtl] .mdc-linear-progress.mdc-linear-progress--indeterminate .mdc-linear-progress__primary-bar {
  right: -145.166611%;
  left: auto;
}

.mdc-linear-progress__secondary-bar {
  display: none;
}
.mdc-linear-progress--indeterminate .mdc-linear-progress__secondary-bar {
  left: -54.888891%;
  display: block;
}
.mdc-linear-progress--indeterminate.mdc-linear-progress--animation-ready .mdc-linear-progress__secondary-bar {
  animation: mdc-linear-progress-secondary-indeterminate-translate calc(2s * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
}
.mdc-linear-progress--indeterminate.mdc-linear-progress--animation-ready .mdc-linear-progress__secondary-bar > .mdc-linear-progress__bar-inner {
  animation: mdc-linear-progress-secondary-indeterminate-scale calc(2s * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
}
[dir=rtl] .mdc-linear-progress.mdc-linear-progress--animation-ready .mdc-linear-progress__secondary-bar {
  animation-name: mdc-linear-progress-secondary-indeterminate-translate-reverse;
}
[dir=rtl] .mdc-linear-progress.mdc-linear-progress--indeterminate .mdc-linear-progress__secondary-bar {
  right: -54.888891%;
  left: auto;
}

@keyframes mdc-linear-progress-buffering {
  from {
    transform: rotate(180deg) translateX(calc(var(--%NS%mat-progress-bar-track-height, 4px) * -2.5));
  }
}
@keyframes mdc-linear-progress-primary-indeterminate-translate {
  0% {
    transform: translateX(0);
  }
  20% {
    animation-timing-function: cubic-bezier(0.5, 0, 0.701732, 0.495819);
    transform: translateX(0);
  }
  59.15% {
    animation-timing-function: cubic-bezier(0.302435, 0.381352, 0.55, 0.956352);
    transform: translateX(83.67142%);
  }
  100% {
    transform: translateX(200.611057%);
  }
}
@keyframes mdc-linear-progress-primary-indeterminate-scale {
  0% {
    transform: scaleX(0.08);
  }
  36.65% {
    animation-timing-function: cubic-bezier(0.334731, 0.12482, 0.785844, 1);
    transform: scaleX(0.08);
  }
  69.15% {
    animation-timing-function: cubic-bezier(0.06, 0.11, 0.6, 1);
    transform: scaleX(0.661479);
  }
  100% {
    transform: scaleX(0.08);
  }
}
@keyframes mdc-linear-progress-secondary-indeterminate-translate {
  0% {
    animation-timing-function: cubic-bezier(0.15, 0, 0.515058, 0.409685);
    transform: translateX(0);
  }
  25% {
    animation-timing-function: cubic-bezier(0.31033, 0.284058, 0.8, 0.733712);
    transform: translateX(37.651913%);
  }
  48.35% {
    animation-timing-function: cubic-bezier(0.4, 0.627035, 0.6, 0.902026);
    transform: translateX(84.386165%);
  }
  100% {
    transform: translateX(160.277782%);
  }
}
@keyframes mdc-linear-progress-secondary-indeterminate-scale {
  0% {
    animation-timing-function: cubic-bezier(0.205028, 0.057051, 0.57661, 0.453971);
    transform: scaleX(0.08);
  }
  19.15% {
    animation-timing-function: cubic-bezier(0.152313, 0.196432, 0.648374, 1.004315);
    transform: scaleX(0.457104);
  }
  44.15% {
    animation-timing-function: cubic-bezier(0.257759, -0.003163, 0.211762, 1.38179);
    transform: scaleX(0.72796);
  }
  100% {
    transform: scaleX(0.08);
  }
}
@keyframes mdc-linear-progress-primary-indeterminate-translate-reverse {
  0% {
    transform: translateX(0);
  }
  20% {
    animation-timing-function: cubic-bezier(0.5, 0, 0.701732, 0.495819);
    transform: translateX(0);
  }
  59.15% {
    animation-timing-function: cubic-bezier(0.302435, 0.381352, 0.55, 0.956352);
    transform: translateX(-83.67142%);
  }
  100% {
    transform: translateX(-200.611057%);
  }
}
@keyframes mdc-linear-progress-secondary-indeterminate-translate-reverse {
  0% {
    animation-timing-function: cubic-bezier(0.15, 0, 0.515058, 0.409685);
    transform: translateX(0);
  }
  25% {
    animation-timing-function: cubic-bezier(0.31033, 0.284058, 0.8, 0.733712);
    transform: translateX(-37.651913%);
  }
  48.35% {
    animation-timing-function: cubic-bezier(0.4, 0.627035, 0.6, 0.902026);
    transform: translateX(-84.386165%);
  }
  100% {
    transform: translateX(-160.277782%);
  }
}
@keyframes mdc-linear-progress-buffering-reverse {
  from {
    transform: translateX(-10px);
  }
}
`],encapsulation:2})}return o})();function ve(o,r=0,e=100){return Math.max(r,Math.min(e,o))}var xe=(()=>{class o{static ɵfac=function(a){return new(a||o)};static ɵmod=Ae$1({type:o});static ɵinj=ye$1({imports:[Fv]})}return o})();var _e=()=>[];var ke=(o,r)=>r.title;var Me=(o,r)=>r.id;var Ce=(o,r)=>r.message;function Ie(o,r){if(o&1&&gm(0,`ao-error-state`,16),o&2)hm(`message`,Lw().error())}function Ne(o,r){if(o&1&&(Ls(0,`mat-card`,18)(1,`mat-card-header`)(2,`div`,60),gm(3,`mat-icon`,65),Ls(4,`div`,41),fC(5),Ul()()(),Ls(6,`mat-card-content`)(7,`div`,66),fC(8),bC(9,`number`),Ul(),Ls(10,`div`,67),gm(11,`mat-icon`,65),Ls(12,`div`,68)(13,`div`),fC(14),Ul()()()()()),o&2){let e=r.$implicit;bI(3),hm(`svgIcon`,e.icon),bI(2),Lm(e.title),bI(3),Zl(` `,CC(9,7,e.value),` `),bI(3),tC(e.toneClass),hm(`svgIcon`,e.toneIcon),bI(3),Lm(e.caption)}}function Pe(o,r){o&1&&(Ls(0,`span`,27),fC(1,`%`),Ul())}function Te(o,r){o&1&&(Ls(0,`span`,27),fC(1,`%`),Ul())}function Be(o,r){if(o&1&&(Ls(0,`span`,34),fC(1),Ul()),o&2){let e=Lw();bI(),Zl(` · `,e.metrics()?.cpu?.cores,` cores `)}}function Oe(o,r){o&1&&(Ls(0,`mat-card`,55)(1,`div`,60),gm(2,`mat-icon`,61),Ls(3,`div`,62),fC(4,` Reach port guard `),Ul()(),Ls(5,`div`,69),gm(6,`mat-icon`,70),Ls(7,`div`,7),fC(8),Ul()()()),o&2&&(bI(8),Lm(r.message))}function Re(o,r){if(o&1&&(Ls(0,`a`,78),fC(1,` Open URL `),Ul()),o&2){let e=Lw().$implicit;hm(`href`,e.url,ig)}}function ze(o,r){if(o&1){let e=xw();Ls(0,`mat-card`,58)(1,`div`,71),gm(2,`mat-icon`,72),Ul(),Ls(3,`div`,73)(4,`div`,74)(5,`div`,62),fC(6),Ul(),Ls(7,`div`,75),fC(8),Ul()(),Ls(9,`div`,76)(10,`button`,77),gm(11,`mat-icon`,14),Ul(),Ls(12,`mat-menu`,null,2)(14,`button`,15),_m(`click`,function(){dp(e);return fp(Lw().reload())}),fC(15,` Refresh `),Ul(),Iw(16,Re,2,1,`a`,78),Ul()()(),Ls(17,`div`,79)(18,`div`,22)(19,`div`,28),fC(20,`Port`),Ul(),Ls(21,`div`,80),fC(22),Ul()(),Ls(23,`div`,22)(24,`div`,28),fC(25,`NodePort`),Ul(),Ls(26,`div`,80),fC(27),Ul()(),Ls(28,`div`,74)(29,`div`,28),fC(30,`Detail`),Ul(),Ls(31,`div`,81),fC(32),Ul()()()()}if(o&2){let e=r.$implicit,a=Gw(13),m=Lw();bI(2),hm(`ngClass`,m.watermarkClass(e.status))(`svgIcon`,m.watermarkIcon(e.status)),bI(4),Zl(` `,e.label,` `),bI(),hm(`ngClass`,m.statusTextClass(e.status)),bI(),Zl(` `,m.statusLabel(e.status),` `),bI(2),hm(`matMenuTriggerFor`,a),bI(6),bw(e.url?16:-1),bI(6),Zl(` `,e.port??`—`,` `),bI(5),Zl(` `,e.nodePort??`—`,` `),bI(5),Zl(` `,e.fact||e.detail||`—`,` `)}}function De(o,r){o&1&&(Ls(0,`mat-card`,59)(1,`div`,7),fC(2,`No topology components reported`),Ul()())}function Xe(o,r){if(o&1&&(Ls(0,`a`,84),fC(1,` Open `),Ul()),o&2){let e=Lw().$implicit;hm(`routerLink`,e.href)}}function Fe(o,r){if(o&1&&(Ls(0,`div`,64),gm(1,`mat-icon`,82),Ls(2,`div`,83)(3,`div`,7),fC(4),Ul(),Iw(5,Xe,2,1,`a`,84),Ul()()),o&2){let e=r.$implicit;bI(),hm(`svgIcon`,e.severity===`warning`?`octagon-alert`:`circle-alert`),bI(3),Lm(e.message),bI(),bw(e.href?5:-1)}}function Ae(o,r){o&1&&(Ls(0,`div`,64),gm(1,`mat-icon`,85),Ls(2,`div`,7),fC(3,`Nothing flagged`),Ul()())}var ye=class o{api=h(l);topology=_t(null);ping=_t(null);session=_t(null);metrics=_t(null);error=_t(null);components=xC(()=>this.topology()?.components||[]);cpuPercent=xC(()=>{let r=this.metrics()?.cpu?.percent;return r==null||Number.isNaN(Number(r))?null:Number(r)});memPercent=xC(()=>{let r=this.metrics()?.memory,e=r?.usedPercent??r?.percent;return e==null||Number.isNaN(Number(e))?null:Number(e)});summary=xC(()=>{let r=this.components(),e=r.filter(v=>[`healthy`,`available`,`succeeded`].includes(String(v.status||``).toLowerCase())).length,a=r.filter(v=>[`degraded`,`warning`,`running`,`reconciling`].includes(String(v.status||``).toLowerCase())).length,m=r.filter(v=>[`failed`,`blocking`].includes(String(v.status||``).toLowerCase())).length,g=this.topology()?.attention?.length??0;return[{title:`Healthy`,icon:`circle-check`,value:e,caption:`components up`,toneIcon:`arrow-up`,toneClass:`text-green-600`},{title:`Degraded`,icon:`octagon-alert`,value:a,caption:`need watch`,toneIcon:a?`arrow-up`:`arrow-down`,toneClass:a?`text-amber-600`:`text-green-600`},{title:`Failed`,icon:`circle-x`,value:m,caption:`blocking`,toneIcon:m?`arrow-up`:`arrow-down`,toneClass:m?`text-red-600`:`text-green-600`},{title:`Attention`,icon:`bell`,value:g,caption:`open items`,toneIcon:g?`arrow-up`:`arrow-down`,toneClass:g?`text-amber-600`:`text-green-600`}]});ngOnInit(){this.reload()}reload(){this.error.set(null),this.api.topology().subscribe(r=>{r.ok?this.topology.set(r.data):this.error.set(r.message)}),this.api.ping().subscribe(r=>r.ok&&this.ping.set(r.data)),this.api.session().subscribe(r=>r.ok&&this.session.set(r.data)),this.api.hostMetrics().subscribe(r=>r.ok&&this.metrics.set(r.data))}resourceBarColor(r){return r==null?`primary`:r>=90?`error`:r>=75?`warn`:`primary`}statusLabel(r){let e=String(r||`unknown`).replace(/-/g,` `);return e.charAt(0).toUpperCase()+e.slice(1)}statusTextClass(r){let e=String(r||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`text-green-600`:[`failed`,`blocking`].includes(e)?`text-red-600`:[`degraded`,`warning`,`running`,`reconciling`].includes(e)?`text-amber-600`:`text-neutral-500`}watermarkIcon(r){let e=String(r||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`circle-check`:[`failed`,`blocking`].includes(e)?`circle-x`:`circle-alert`}watermarkClass(r){let e=String(r||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`text-green-600/25 dark:text-green-500/25`:[`failed`,`blocking`].includes(e)?`text-red-600/25 dark:text-red-500/25`:`text-amber-600/25 dark:text-amber-500/25`}formatUptime(r){if(r==null||!Number.isFinite(r))return`—`;let e=Math.floor(r),a=Math.floor(e/86400),m=Math.floor(e%86400/3600),g=Math.floor(e%3600/60);return a>0?`${a}d ${m}h`:m>0?`${m}h ${g}m`:`${g}m`}static ɵfac=function(e){return new(e||o)};static ɵcmp=jn({type:o,selectors:[[`ao-overview-page`]],decls:139,vars:30,consts:[[`actionsMenu`,`matMenu`],[`webMenu`,`matMenu`],[`compMenu`,`matMenu`],[1,`@container`,`mx-auto`,`flex`,`w-full`,`max-w-7xl`,`flex-auto`,`flex-col`,`gap-4`,`p-6`,`sm:gap-6`,`lg:px-8`,`lg:pt-8`,`lg:pb-10`],[1,`flex`,`items-center`,`justify-between`,`gap-x-3`],[1,`flex`,`flex-col`,`gap-y-0.5`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex-auto`],[1,`flex`,`items-center`,`gap-x-3`],[`matButton`,`outlined`,`type`,`button`,1,`hidden`,`sm:inline-flex`,3,`click`],[`svgIcon`,`refresh-cw`],[1,`sm:hidden`],[`matIconButton`,``,`type`,`button`,3,`matMenuTriggerFor`],[`svgIcon`,`ellipsis`],[`mat-menu-item`,``,`type`,`button`,3,`click`],[3,`message`],[1,`grid`,`gap-4`,`sm:gap-6`,`@max-md:grid-cols-1`,`@md:grid-cols-2`,`@4xl:grid-cols-4`],[`appearance`,`filled`],[1,`grid`,`w-full`,`grid-cols-1`,`gap-6`,`xl:grid-cols-2`],[`appearance`,`outlined`,1,`overflow-hidden`],[1,`flex`,`flex-col`,`px-5`,`py-4`],[1,`flex`,`flex-col`],[1,`mr-4`,`truncate`,`text-lg`,`font-medium`,`tracking-tight`],[1,`font-medium`,`text-neutral-500`],[1,`mt-6`,`mr-2`,`flex`,`items-start`],[1,`text-3xl`,`font-semibold`,`tracking-tighter`,`tabular-nums`,`md:text-4xl`],[1,`text-xl`,`text-neutral-500`],[1,`text-sm`,`font-medium`,`text-neutral-500`],[1,`ml-8`,`flex`,`flex-col`,`md:ml-16`],[1,`flex`,`flex-col`,`gap-y-5`,`px-5`,`py-5`],[1,`flex`,`items-end`],[1,`flex-auto`,`leading-none`],[1,`text-2xl`,`font-medium`,`tabular-nums`],[1,`text-sm`,`font-normal`,`text-neutral-500`],[1,`mt-2`,`rounded-full`,3,`mode`,`color`,`value`],[1,`flex`,`flex-wrap`,`gap-x-8`,`gap-y-2`,`text-sm`],[1,`font-mono`,`tabular-nums`],[`appearance`,`filled`,1,`flex`,`flex-col`],[1,`flex`,`flex-auto`,`items-center`,`gap-x-2`],[`svgIcon`,`server`,1,`size-4`],[1,`font-medium`,`tracking-tight`],[1,`ml-auto`],[`matIconButton`,``,`type`,`button`,1,`tiny`,3,`matMenuTriggerFor`],[`svgIcon`,`ellipsis-vertical`],[`mat-menu-item`,``,`href`,`/`],[1,`flex`,`flex-auto`,`flex-col`],[1,`text-3xl`,`font-semibold`],[1,`mt-0.5`,`text-sm`,`text-neutral-500`],[1,`mt-4`,`flex`,`flex-col`,`gap-y-3`],[1,`flex`,`items-center`,`gap-x-1`],[1,`font-medium`,`tabular-nums`],[1,`max-w-[60%]`,`truncate`,`font-mono`,`text-sm`,`font-medium`],[1,`font-medium`],[1,`mt-4`,`text-xs`,`text-neutral-500`],[`appearance`,`outlined`,1,`p-6`],[1,`mt-4`,`w-full`],[1,`grid`,`w-full`,`grid-cols-1`,`gap-6`,`sm:grid-cols-2`,`xl:grid-cols-2`],[`appearance`,`outlined`,1,`relative`,`overflow-hidden`,`px-5`,`py-4`],[`appearance`,`outlined`,1,`px-5`,`py-8`],[1,`flex`,`items-center`,`gap-x-2`],[`svgIcon`,`sparkles`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`truncate`,`text-lg`,`font-medium`,`tracking-tight`],[1,`mt-6`,`flex`,`flex-col`,`gap-y-4`],[1,`flex`,`items-start`,`gap-x-3`],[1,`size-4`,3,`svgIcon`],[1,`text-5xl`,`font-semibold`,`tabular-nums`],[1,`mt-2`,`flex`,`items-center`,`gap-x-1`],[1,`flex`,`items-center`,`gap-x-1`,`text-sm`,`font-medium`,`text-neutral-500`],[1,`mt-4`,`flex`,`items-start`,`gap-x-3`],[`svgIcon`,`octagon-alert`,1,`size-5`,`shrink-0`,`text-neutral-500`],[1,`absolute`,`right-0`,`bottom-0`,`-m-6`,`h-24`,`w-24`],[1,`size-24`,3,`ngClass`,`svgIcon`],[1,`flex`,`items-center`],[1,`flex`,`min-w-0`,`flex-col`],[1,`text-sm`,`font-medium`,3,`ngClass`],[1,`-mt-2`,`ml-auto`],[`mat-icon-button`,``,`type`,`button`,3,`matMenuTriggerFor`],[`mat-menu-item`,``,`target`,`_blank`,`rel`,`noopener`,3,`href`],[1,`mt-4`,`flex`,`flex-row`,`flex-wrap`,`gap-6`],[1,`text-3xl`,`font-medium`,`tabular-nums`],[1,`max-w-56`,`truncate`,`text-sm`,`text-neutral-500`],[1,`size-5`,`shrink-0`,`text-neutral-500`,3,`svgIcon`],[1,`min-w-0`,`flex-auto`],[`matButton`,``,1,`mt-1`,3,`routerLink`],[`svgIcon`,`circle-check`,1,`size-5`,`shrink-0`,`text-green-600`]],template:function(e,a){if(e&1&&(Ls(0,`div`,3)(1,`div`,4)(2,`div`,5)(3,`div`,6),fC(4,` Overview `),Ul(),Ls(5,`div`,7),fC(6,` Control-plane health, host utilization, and items that need attention `),Ul()(),gm(7,`div`,8),Ls(8,`div`,9)(9,`button`,10),_m(`click`,function(){return a.reload()}),gm(10,`mat-icon`,11),fC(11,` Refresh `),Ul(),Ls(12,`div`,12)(13,`button`,13),gm(14,`mat-icon`,14),Ul(),Ls(15,`mat-menu`,null,0)(17,`button`,15),_m(`click`,function(){return a.reload()}),fC(18,` Refresh `),Ul()()()()(),Iw(19,Ie,1,1,`ao-error-state`,16),Ls(20,`div`,17),ww(21,Ne,15,9,`mat-card`,18,ke),Ul(),Ls(23,`div`,19)(24,`mat-card`,20)(25,`div`,21)(26,`div`,22)(27,`div`,23),fC(28,` Host utilization `),Ul(),Ls(29,`div`,24),fC(30),Ul()(),Ls(31,`div`,25)(32,`div`,22)(33,`div`,26),fC(34),Iw(35,Pe,2,0,`span`,27),Ul(),Ls(36,`div`,28),fC(37,`CPU`),Ul()(),Ls(38,`div`,29)(39,`div`,26),fC(40),Iw(41,Te,2,0,`span`,27),Ul(),Ls(42,`div`,28),fC(43,`Memory`),Ul()()()(),gm(44,`mat-divider`),Ls(45,`div`,30)(46,`div`,31)(47,`div`,32)(48,`div`,28),fC(49,`CPU`),Ul(),Ls(50,`div`,33),fC(51),Iw(52,Be,2,1,`span`,34),Ul(),gm(53,`mat-progress-bar`,35),Ul()(),Ls(54,`div`,31)(55,`div`,32)(56,`div`,28),fC(57,`Memory`),Ul(),Ls(58,`div`,33),fC(59),Ul(),gm(60,`mat-progress-bar`,35),Ul()(),Ls(61,`div`,36)(62,`div`)(63,`div`,24),fC(64,`Load`),Ul(),Ls(65,`div`,37),fC(66),Ul()(),Ls(67,`div`)(68,`div`,24),fC(69,`Uptime`),Ul(),Ls(70,`div`,37),fC(71),Ul()()()()(),Ls(72,`mat-card`,38)(73,`mat-card-header`)(74,`div`,39),gm(75,`mat-icon`,40),Ls(76,`div`,41),fC(77,`Web process`),Ul(),Ls(78,`div`,42)(79,`button`,43),gm(80,`mat-icon`,44),Ul(),Ls(81,`mat-menu`,null,1)(83,`button`,15),_m(`click`,function(){return a.reload()}),fC(84,` Refresh data `),Ul(),Ls(85,`a`,45),fC(86,` Open chat `),Ul()()()()(),Ls(87,`mat-card-content`,46)(88,`div`,47),fC(89),Ul(),Ls(90,`div`,48),fC(91,` Coordinator web UI and Admin API process `),Ul(),Ls(92,`div`,49)(93,`div`,50)(94,`div`,7),fC(95,`pid`),Ul(),gm(96,`div`,8),Ls(97,`div`,51),fC(98),Ul()(),Ls(99,`div`,50)(100,`div`,7),fC(101,`instance`),Ul(),gm(102,`div`,8),Ls(103,`div`,52),fC(104),Ul()(),Ls(105,`div`,50)(106,`div`,7),fC(107,`user`),Ul(),gm(108,`div`,8),Ls(109,`div`,53),fC(110),Ul()(),Ls(111,`div`,50)(112,`div`,7),fC(113,`session`),Ul(),gm(114,`div`,8),Ls(115,`div`,52),fC(116),Ul()()(),gm(117,`div`,8),Ls(118,`div`,54),fC(119,` Reach / KnowBuddy must target the engine port, not this web process. `),Ul()()()(),Iw(120,Oe,9,1,`mat-card`,55),Ls(121,`div`,56)(122,`div`,6),fC(123,` Topology `),Ul(),Ls(124,`div`,7),fC(125,` Runtime components and how they are exposed on this host `),Ul()(),Ls(126,`div`,57),ww(127,ze,33,10,`mat-card`,58,Me,!1,De,3,0,`mat-card`,59),Ul(),Ls(130,`mat-card`,55)(131,`div`,60),gm(132,`mat-icon`,61),Ls(133,`div`,62),fC(134,` Needs attention `),Ul()(),Ls(135,`div`,63),ww(136,Fe,6,3,`div`,64,Ce,!1,Ae,4,0,`div`,64),Ul()()()),e&2){let m,g=Gw(16),v=Gw(82);bI(13),hm(`matMenuTriggerFor`,g),bI(6),bw(a.error()?19:-1),bI(2),Cw(a.summary()),bI(9),Pm(` `,a.metrics()?.hostname||`Coordinator host`,` · scope `,a.metrics()?.scope||`—`,` `),bI(4),Zl(` `,a.cpuPercent()??`—`),bI(),bw(a.cpuPercent()!=null?35:-1),bI(5),Zl(` `,a.memPercent()??`—`),bI(),bw(a.memPercent()!=null?41:-1),bI(10),Zl(` `,a.cpuPercent()??`—`,`% `),bI(),bw(a.metrics()?.cpu?.cores?52:-1),bI(),hm(`mode`,`determinate`)(`color`,a.resourceBarColor(a.cpuPercent()))(`value`,a.cpuPercent()??0),bI(6),Zl(` `,a.memPercent()??`—`,`% `),bI(),hm(`mode`,`determinate`)(`color`,a.resourceBarColor(a.memPercent()))(`value`,a.memPercent()??0),bI(6),Zl(` `,(a.metrics()?.loadAvg||EC(28,_e)).join(` · `)||`—`,` `),bI(5),Zl(` `,a.formatUptime(a.metrics()?.uptimeSec),` `),bI(8),hm(`matMenuTriggerFor`,v),bI(10),Zl(` `,a.ping()?.service||`—`,` `),bI(9),Zl(` `,a.ping()?.pid??`—`,` `),bI(6),Zl(` `,a.ping()?.instance||`—`,` `),bI(6),Zl(` `,a.session()?.userName||`—`,` `),bI(6),Zl(` `,a.session()?.sessionId||`—`,` `),bI(4),bw((m=a.topology()?.reachGuard)?120:-1,m),bI(7),Cw(a.components()),bI(9),Cw(a.topology()?.attention||EC(29,_e))}},dependencies:[Dt,I$1,lt,dt,Z,yt,wt,Lt,I$2,G,Bt,w,I,A,m,xe,be,bT,ST],encapsulation:2})};export{ye as OverviewPage};