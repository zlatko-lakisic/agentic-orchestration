import{$ as Km,Ci as zl,Cr as oa$1,Ct as Ow,D as Ei,Dn as bC,Fr as qr,Ft as Re,G as Im,Gn as fT,Hn as ea$1,I as Gm,Ir as rC,It as Rm,K as Ir,Mr as ql,Or as q,Ot as Q,P as Ge,Pn as bw,Pr as qn,Q as Kl,Sn as aG,Tr as oy,U as Hw,V as Hd,Wt as Tw,X as Jl,Xn as gD,Xt as Vs,Yn as ft,Yr as v,Yt as Vn,Zt as Vw,an as Ww,b as Cw,bi as yp,ct as Mf,d as Bd,di as xC,dr as jw,en as WS,er as gv,fi as xT,ft as Mv,gi as yD,gr as lG,h as CC,ii as wC,jn as be,kt as Ql,lt as Mm,mi as xm,n as $i,ni as vp,nr as hC,o as $w,oi as wI,ot as MC,qn as fe,r as $m,ri as vy,rt as LC,sr as ie,tr as h,tt as L,u as Ap,ui as ww,ur as js,vn as _m,w as Da$1,xr as nM,y as Ct,yi as ym,z as Gw,zt as Sw}from"./chunk-D-Xh3agN.js";import{C as De,D as ae,E as W,O as re,S as Ce$1,T as Me,a as No,c as ue,d as s,f as Mt,g as rt,i as G,m as at,o as dr,p as Rt,r as Dt,s as k,t as wt,u as d,w as He,y as v$1}from"./main-RYQDSSG2.js";import{t as l}from"./chunk-BaPahABB.js";import"./chunk-Bf1UGpln.js";import{i as Pe}from"./chunk-DXA83wRW.js";import{c as tt,n as Q$1,r as Ut$1,s as st}from"./chunk-CBKxlHbd.js";import"./chunk-DhFDnquC.js";import{t as d$1}from"./chunk-CFvWdEFA.js";import"./chunk-Bm_wY86e.js";import{t as E}from"./chunk-DQlyGrFT.js";import{a as ei,c as ni,d as si,f as ti,i as ai,l as oi,n as Ke,o as ii,r as Zt,s as li,t as Jt$1,u as ri}from"./chunk-ByMTi0ip.js";import{t as R}from"./chunk-D7yfR9GS.js";import{c as kt,o as ee,r as Ht,t as A,u as xe$1}from"./chunk-VP4FtH9G.js";import{t as Ve}from"./chunk-BDYGsTpr.js";import{n as Fe,r as Lt,t as Et}from"./chunk-BpB-nmsU.js";import{t as c}from"./chunk-C65wApRv.js";import{n as De$1,r as ue$1,t as $e}from"./chunk-PUJ7NZQh.js";import"./chunk-ClwZ4X-k.js";import{t as I}from"./chunk-DSlM3GiQ.js";var Jt=[`button`];var ea=[`*`];function ta(n,i){if(n&1&&(js(0,`div`,2),Im(1,`mat-pseudo-checkbox`,6),ql()),n&2){let e=jw();wI(),_m(`disabled`,e.disabled)}}var Kt=new v(`MAT_BUTTON_TOGGLE_DEFAULT_OPTIONS`,{providedIn:`root`,factory:()=>({hideSingleSelectionIndicator:!1,hideMultipleSelectionIndicator:!1,disabledInteractive:!1})});var qt=new v(`MatButtonToggleGroup`);var aa={provide:xe$1,useExisting:$i(()=>Ce),multi:!0};var se=class{source;value;constructor(i,e){this.source=i,this.value=e}};var Ce=(()=>{class n{_changeDetector=h(vy);_dir=h(nM,{optional:!0});_multiple=!1;_disabled=!1;_disabledInteractive=!1;_selectionModel;_rawValue;_controlValueAccessorChangeFn=()=>{};_onTouched=()=>{};_buttonToggles;appearance;get name(){return this._name}set name(e){this._name=e,this._markButtonsForCheck()}_name=h(Hd).getId(`mat-button-toggle-group-`);vertical=!1;get value(){let e=this._selectionModel?this._selectionModel.selected:[];return this.multiple?e.map(t=>t.value):e[0]?e[0].value:void 0}set value(e){this._setSelectionByValue(e),this.valueChange.emit(this.value)}valueChange=new fe;get selected(){let e=this._selectionModel?this._selectionModel.selected:[];return this.multiple?e:e[0]||null}get multiple(){return this._multiple}set multiple(e){this._multiple=e,this._markButtonsForCheck()}get disabled(){return this._disabled}set disabled(e){this._disabled=e,this._markButtonsForCheck()}get disabledInteractive(){return this._disabledInteractive}set disabledInteractive(e){this._disabledInteractive=e,this._markButtonsForCheck()}get dir(){return this._dir&&this._dir.value===`rtl`?`rtl`:`ltr`}change=new fe;get hideSingleSelectionIndicator(){return this._hideSingleSelectionIndicator}set hideSingleSelectionIndicator(e){this._hideSingleSelectionIndicator=e,this._markButtonsForCheck()}_hideSingleSelectionIndicator;get hideMultipleSelectionIndicator(){return this._hideMultipleSelectionIndicator}set hideMultipleSelectionIndicator(e){this._hideMultipleSelectionIndicator=e,this._markButtonsForCheck()}_hideMultipleSelectionIndicator;constructor(){let e=h(Kt,{optional:!0});this.appearance=e&&e.appearance?e.appearance:`standard`,this._hideSingleSelectionIndicator=e?.hideSingleSelectionIndicator??!1,this._hideMultipleSelectionIndicator=e?.hideMultipleSelectionIndicator??!1}ngOnInit(){this._selectionModel=new d$1(this.multiple,void 0,!1)}ngAfterContentInit(){this._selectionModel.select(...this._buttonToggles.filter(e=>e.checked)),this.multiple||this._initializeTabIndex()}writeValue(e){this.value=e,this._changeDetector.markForCheck()}registerOnChange(e){this._controlValueAccessorChangeFn=e}registerOnTouched(e){this._onTouched=e}setDisabledState(e){this.disabled=e}_keydown(e){if(this.multiple||this.disabled||Mv(e))return;let a=e.target.id,o=this._buttonToggles.toArray().findIndex(g=>g.buttonId===a),r=null;switch(e.keyCode){case 32:case 13:r=this._buttonToggles.get(o)||null;break;case 38:r=this._getNextButton(o,-1);break;case 37:r=this._getNextButton(o,this.dir===`ltr`?-1:1);break;case 40:r=this._getNextButton(o,1);break;case 39:r=this._getNextButton(o,this.dir===`ltr`?1:-1);break;default:return}r&&(e.preventDefault(),r._onButtonClick(),r.focus())}_emitChangeEvent(e){let t=new se(e,this.value);this._rawValue=t.value,this._controlValueAccessorChangeFn(t.value),this.change.emit(t)}_syncButtonToggle(e,t,a=!1,o=!1){!this.multiple&&this.selected&&!e.checked&&(this.selected.checked=!1),this._selectionModel?t?this._selectionModel.select(e):this._selectionModel.deselect(e):o=!0,o?Promise.resolve().then(()=>this._updateModelValue(e,a)):this._updateModelValue(e,a)}_isSelected(e){return this._selectionModel&&this._selectionModel.isSelected(e)}_isPrechecked(e){return typeof this._rawValue>`u`?!1:this.multiple&&Array.isArray(this._rawValue)?this._rawValue.some(t=>e.value!=null&&t===e.value):e.value===this._rawValue}_initializeTabIndex(){if(this._buttonToggles.forEach(e=>{e.tabIndex=-1}),this.selected)this.selected.tabIndex=0;else for(let e=0;e<this._buttonToggles.length;e++){let t=this._buttonToggles.get(e);if(!t.disabled){t.tabIndex=0;break}}}_getNextButton(e,t){let a=this._buttonToggles;for(let o=1;o<=a.length;o++){let r=(e+t*o+a.length)%a.length,g=a.get(r);if(g&&!g.disabled)return g}return null}_setSelectionByValue(e){if(this._rawValue=e,!this._buttonToggles)return;let t=this._buttonToggles.toArray();if(this.multiple&&e?(this._clearSelection(),e.forEach(a=>this._selectValue(a,t))):(this._clearSelection(),this._selectValue(e,t)),!this.multiple&&t.every(a=>a.tabIndex===-1)){for(let a of t)if(!a.disabled){a.tabIndex=0;break}}}_clearSelection(){this._selectionModel.clear(),this._buttonToggles.forEach(e=>{e.checked=!1,this.multiple||(e.tabIndex=-1)})}_selectValue(e,t){for(let a of t)if(a.value===e){a.checked=!0,this._selectionModel.select(a),this.multiple||(a.tabIndex=0);break}}_updateModelValue(e,t){t&&this._emitChangeEvent(e),this.valueChange.emit(this.value)}_markButtonsForCheck(){this._buttonToggles?.forEach(e=>e._markForCheck())}static ɵfac=function(t){return new(t||n)};static ɵdir=Re({type:n,selectors:[[`mat-button-toggle-group`]],contentQueries:function(t,a,o){if(t&1&&xm(o,xe,5),t&2){let r;$w(r=Gw())&&(a._buttonToggles=r)}},hostAttrs:[1,`mat-button-toggle-group`],hostVars:6,hostBindings:function(t,a){t&1&&Mm(`keydown`,function(r){return a._keydown(r)}),t&2&&(zl(`role`,a.multiple?`group`:`radiogroup`)(`aria-disabled`,a.disabled),ea$1(`mat-button-toggle-vertical`,a.vertical)(`mat-button-toggle-group-appearance-standard`,a.appearance===`standard`))},inputs:{appearance:`appearance`,name:`name`,vertical:[2,`vertical`,`vertical`,oa$1],value:`value`,multiple:[2,`multiple`,`multiple`,oa$1],disabled:[2,`disabled`,`disabled`,oa$1],disabledInteractive:[2,`disabledInteractive`,`disabledInteractive`,oa$1],hideSingleSelectionIndicator:[2,`hideSingleSelectionIndicator`,`hideSingleSelectionIndicator`,oa$1],hideMultipleSelectionIndicator:[2,`hideMultipleSelectionIndicator`,`hideMultipleSelectionIndicator`,oa$1]},outputs:{valueChange:`valueChange`,change:`change`},exportAs:[`matButtonToggleGroup`],features:[Km([aa,{provide:qt,useExisting:n}])]})}return n})();var xe=(()=>{class n{_changeDetectorRef=h(vy);_elementRef=h(ie);_focusMonitor=h(gv);_idGenerator=h(Hd);_animationDisabled=Da$1();_checked=!1;ariaLabel;ariaLabelledby=null;_buttonElement;buttonToggleGroup;get buttonId(){return`${this.id}-button`}id;name;value;get tabIndex(){return this._tabIndex()}set tabIndex(e){this._tabIndex.set(e)}_tabIndex;disableRipple=!1;get appearance(){return this.buttonToggleGroup?this.buttonToggleGroup.appearance:this._appearance}set appearance(e){this._appearance=e}_appearance;get checked(){return this.buttonToggleGroup?this.buttonToggleGroup._isSelected(this):this._checked}set checked(e){e!==this._checked&&(this._checked=e,this.buttonToggleGroup&&this.buttonToggleGroup._syncButtonToggle(this,this._checked),this._changeDetectorRef.markForCheck())}get disabled(){return this._disabled||this.buttonToggleGroup&&this.buttonToggleGroup.disabled}set disabled(e){this._disabled=e}_disabled=!1;get disabledInteractive(){return this._disabledInteractive||this.buttonToggleGroup!==null&&this.buttonToggleGroup.disabledInteractive}set disabledInteractive(e){this._disabledInteractive=e}_disabledInteractive;change=new fe;constructor(){h(qn).load(lG);let e=h(qt,{optional:!0}),t=h(new oy(`tabindex`),{optional:!0})||``,a=h(Kt,{optional:!0});this._tabIndex=Ct(parseInt(t)||0),this.buttonToggleGroup=e,this._appearance=a&&a.appearance?a.appearance:`standard`,this._disabledInteractive=a?.disabledInteractive??!1}ngOnInit(){let e=this.buttonToggleGroup;this.id=this.id||this._idGenerator.getId(`mat-button-toggle-`),e&&(e._isPrechecked(this)?this.checked=!0:e._isSelected(this)!==this._checked&&e._syncButtonToggle(this,this._checked))}ngAfterViewInit(){this._animationDisabled||this._elementRef.nativeElement.classList.add(`mat-button-toggle-animations-enabled`),this._focusMonitor.monitor(this._elementRef,!0)}ngOnDestroy(){let e=this.buttonToggleGroup;this._focusMonitor.stopMonitoring(this._elementRef),e&&e._isSelected(this)&&e._syncButtonToggle(this,!1,!1,!0)}focus(e){this._buttonElement.nativeElement.focus(e)}_onButtonClick(){if(this.disabled)return;let e=this.isSingleSelector()?!0:!this._checked;if(e!==this._checked&&(this._checked=e,this.buttonToggleGroup&&(this.buttonToggleGroup._syncButtonToggle(this,this._checked,!0),this.buttonToggleGroup._onTouched())),this.isSingleSelector()){let t=this.buttonToggleGroup._buttonToggles.find(a=>a.tabIndex===0);t&&(t.tabIndex=-1),this.tabIndex=0}this.change.emit(new se(this,this.value))}_markForCheck(){this._changeDetectorRef.markForCheck()}_getButtonName(){return this.isSingleSelector()?this.buttonToggleGroup.name:this.name||null}isSingleSelector(){return this.buttonToggleGroup&&!this.buttonToggleGroup.multiple}static ɵfac=function(t){return new(t||n)};static ɵcmp=Vn({type:n,selectors:[[`mat-button-toggle`]],viewQuery:function(t,a){if(t&1&&Rm(Jt,5),t&2){let o;$w(o=Gw())&&(a._buttonElement=o.first)}},hostAttrs:[`role`,`presentation`,1,`mat-button-toggle`],hostVars:14,hostBindings:function(t,a){t&1&&Mm(`focus`,function(){return a.focus()}),t&2&&(zl(`aria-label`,null)(`aria-labelledby`,null)(`id`,a.id)(`name`,null),ea$1(`mat-button-toggle-standalone`,!a.buttonToggleGroup)(`mat-button-toggle-checked`,a.checked)(`mat-button-toggle-disabled`,a.disabled)(`mat-button-toggle-disabled-interactive`,a.disabledInteractive)(`mat-button-toggle-appearance-standard`,a.appearance===`standard`))},inputs:{ariaLabel:[0,`aria-label`,`ariaLabel`],ariaLabelledby:[0,`aria-labelledby`,`ariaLabelledby`],id:`id`,name:`name`,value:`value`,tabIndex:`tabIndex`,disableRipple:[2,`disableRipple`,`disableRipple`,oa$1],appearance:`appearance`,checked:[2,`checked`,`checked`,oa$1],disabled:[2,`disabled`,`disabled`,oa$1],disabledInteractive:[2,`disabledInteractive`,`disabledInteractive`,oa$1]},outputs:{change:`change`},exportAs:[`matButtonToggle`],ngContentSelectors:ea,decls:7,vars:13,consts:[[`button`,``],[`type`,`button`,1,`mat-button-toggle-button`,`mat-focus-indicator`,3,`click`,`id`,`disabled`],[1,`mat-button-toggle-checkbox-wrapper`],[1,`mat-button-toggle-label-content`],[1,`mat-button-toggle-focus-overlay`],[`matRipple`,``,1,`mat-button-toggle-ripple`,3,`matRippleTrigger`,`matRippleDisabled`],[`state`,`checked`,`aria-hidden`,`true`,`appearance`,`minimal`,3,`disabled`]],template:function(t,a){if(t&1&&(Vw(),js(0,`button`,1,0),Mm(`click`,function(){return a._onButtonClick()}),bw(2,ta,2,1,`div`,2),js(3,`span`,3),Hw(4),ql()(),Im(5,`span`,4)(6,`span`,5)),t&2){let o=Ww(1);_m(`id`,a.buttonId)(`disabled`,a.disabled&&!a.disabledInteractive||null),zl(`role`,a.isSingleSelector()?`radio`:`button`)(`tabindex`,a.disabled&&!a.disabledInteractive?-1:a.tabIndex)(`aria-pressed`,a.isSingleSelector()?null:a.checked)(`aria-checked`,a.isSingleSelector()?a.checked:null)(`name`,a._getButtonName())(`aria-label`,a.ariaLabel)(`aria-labelledby`,a.ariaLabelledby)(`aria-disabled`,a.disabled&&a.disabledInteractive?`true`:null),wI(2),ww(a.buttonToggleGroup&&(!a.buttonToggleGroup.multiple&&!a.buttonToggleGroup.hideSingleSelectionIndicator||a.buttonToggleGroup.multiple&&!a.buttonToggleGroup.hideMultipleSelectionIndicator)?2:-1),wI(4),_m(`matRippleTrigger`,o)(`matRippleDisabled`,a.disableRipple||a.disabled)}},dependencies:[aG,W],styles:[`.mat-button-toggle-standalone,
.mat-button-toggle-group {
  position: relative;
  display: inline-flex;
  flex-direction: row;
  white-space: nowrap;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  border-radius: var(--%NS%mat-button-toggle-legacy-shape);
  transform: translateZ(0);
}
.mat-button-toggle-standalone:not([class*=mat-elevation-z]),
.mat-button-toggle-group:not([class*=mat-elevation-z]) {
  box-shadow: 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12);
}
@media (forced-colors: active) {
  .mat-button-toggle-standalone,
  .mat-button-toggle-group {
    outline: solid 1px;
  }
}

.mat-button-toggle-standalone.mat-button-toggle-appearance-standard,
.mat-button-toggle-group-appearance-standard {
  border-radius: var(--%NS%mat-button-toggle-shape, var(--%NS%mat-sys-corner-extra-large));
  border: solid 1px var(--%NS%mat-button-toggle-divider-color, var(--%NS%mat-sys-outline));
}
.mat-button-toggle-standalone.mat-button-toggle-appearance-standard .mat-pseudo-checkbox,
.mat-button-toggle-group-appearance-standard .mat-pseudo-checkbox {
  --%NS%mat-pseudo-checkbox-minimal-selected-checkmark-color: var(--%NS%mat-button-toggle-selected-state-text-color, var(--%NS%mat-sys-on-secondary-container));
}
.mat-button-toggle-standalone.mat-button-toggle-appearance-standard:not([class*=mat-elevation-z]),
.mat-button-toggle-group-appearance-standard:not([class*=mat-elevation-z]) {
  box-shadow: none;
}
@media (forced-colors: active) {
  .mat-button-toggle-standalone.mat-button-toggle-appearance-standard,
  .mat-button-toggle-group-appearance-standard {
    outline: 0;
  }
}

.mat-button-toggle-vertical {
  flex-direction: column;
}
.mat-button-toggle-vertical .mat-button-toggle-label-content {
  display: block;
}

.mat-button-toggle {
  white-space: nowrap;
  position: relative;
  color: var(--%NS%mat-button-toggle-legacy-text-color);
  font-family: var(--%NS%mat-button-toggle-legacy-label-text-font);
  font-size: var(--%NS%mat-button-toggle-legacy-label-text-size);
  line-height: var(--%NS%mat-button-toggle-legacy-label-text-line-height);
  font-weight: var(--%NS%mat-button-toggle-legacy-label-text-weight);
  letter-spacing: var(--%NS%mat-button-toggle-legacy-label-text-tracking);
  --%NS%mat-pseudo-checkbox-minimal-selected-checkmark-color: var(--%NS%mat-button-toggle-legacy-selected-state-text-color);
}
.mat-button-toggle.cdk-keyboard-focused .mat-button-toggle-focus-overlay {
  opacity: var(--%NS%mat-button-toggle-legacy-focus-state-layer-opacity);
}
.mat-button-toggle .mat-icon svg {
  vertical-align: top;
}

.mat-button-toggle-checkbox-wrapper {
  display: inline-block;
  justify-content: flex-start;
  align-items: center;
  width: 0;
  height: 18px;
  line-height: 18px;
  overflow: hidden;
  box-sizing: border-box;
  position: absolute;
  top: 50%;
  left: 16px;
  transform: translate3d(0, -50%, 0);
}
[dir=rtl] .mat-button-toggle-checkbox-wrapper {
  left: auto;
  right: 16px;
}
.mat-button-toggle-appearance-standard .mat-button-toggle-checkbox-wrapper {
  left: 12px;
}
[dir=rtl] .mat-button-toggle-appearance-standard .mat-button-toggle-checkbox-wrapper {
  left: auto;
  right: 12px;
}
.mat-button-toggle-checked .mat-button-toggle-checkbox-wrapper {
  width: 18px;
}
.mat-button-toggle-animations-enabled .mat-button-toggle-checkbox-wrapper {
  transition: width 150ms 45ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-button-toggle-vertical .mat-button-toggle-checkbox-wrapper {
  transition: none;
}

.mat-button-toggle-checked {
  color: var(--%NS%mat-button-toggle-legacy-selected-state-text-color);
  background-color: var(--%NS%mat-button-toggle-legacy-selected-state-background-color);
}

.mat-button-toggle-disabled {
  pointer-events: none;
  color: var(--%NS%mat-button-toggle-legacy-disabled-state-text-color);
  background-color: var(--%NS%mat-button-toggle-legacy-disabled-state-background-color);
  --%NS%mat-pseudo-checkbox-minimal-disabled-selected-checkmark-color: var(--%NS%mat-button-toggle-legacy-disabled-state-text-color);
}
.mat-button-toggle-disabled.mat-button-toggle-checked {
  background-color: var(--%NS%mat-button-toggle-legacy-disabled-selected-state-background-color);
}

.mat-button-toggle-disabled-interactive {
  pointer-events: auto;
}

.mat-button-toggle-appearance-standard {
  color: var(--%NS%mat-button-toggle-text-color, var(--%NS%mat-sys-on-surface));
  background-color: var(--%NS%mat-button-toggle-background-color, transparent);
  font-family: var(--%NS%mat-button-toggle-label-text-font, var(--%NS%mat-sys-label-large-font));
  font-size: var(--%NS%mat-button-toggle-label-text-size, var(--%NS%mat-sys-label-large-size));
  line-height: var(--%NS%mat-button-toggle-label-text-line-height, var(--%NS%mat-sys-label-large-line-height));
  font-weight: var(--%NS%mat-button-toggle-label-text-weight, var(--%NS%mat-sys-label-large-weight));
  letter-spacing: var(--%NS%mat-button-toggle-label-text-tracking, var(--%NS%mat-sys-label-large-tracking));
}
.mat-button-toggle-group-appearance-standard .mat-button-toggle-appearance-standard + .mat-button-toggle-appearance-standard {
  border-left: solid 1px var(--%NS%mat-button-toggle-divider-color, var(--%NS%mat-sys-outline));
}
[dir=rtl] .mat-button-toggle-group-appearance-standard .mat-button-toggle-appearance-standard + .mat-button-toggle-appearance-standard {
  border-left: none;
  border-right: solid 1px var(--%NS%mat-button-toggle-divider-color, var(--%NS%mat-sys-outline));
}
.mat-button-toggle-group-appearance-standard.mat-button-toggle-vertical .mat-button-toggle-appearance-standard + .mat-button-toggle-appearance-standard {
  border-left: none;
  border-right: none;
  border-top: solid 1px var(--%NS%mat-button-toggle-divider-color, var(--%NS%mat-sys-outline));
}
.mat-button-toggle-appearance-standard.mat-button-toggle-checked {
  color: var(--%NS%mat-button-toggle-selected-state-text-color, var(--%NS%mat-sys-on-secondary-container));
  background-color: var(--%NS%mat-button-toggle-selected-state-background-color, var(--%NS%mat-sys-secondary-container));
}
.mat-button-toggle-appearance-standard.mat-button-toggle-disabled {
  color: var(--%NS%mat-button-toggle-disabled-state-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
  background-color: var(--%NS%mat-button-toggle-disabled-state-background-color, transparent);
}
.mat-button-toggle-appearance-standard.mat-button-toggle-disabled .mat-pseudo-checkbox {
  --%NS%mat-pseudo-checkbox-minimal-disabled-selected-checkmark-color: var(--%NS%mat-button-toggle-disabled-selected-state-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-button-toggle-appearance-standard.mat-button-toggle-disabled.mat-button-toggle-checked {
  color: var(--%NS%mat-button-toggle-disabled-selected-state-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
  background-color: var(--%NS%mat-button-toggle-disabled-selected-state-background-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
.mat-button-toggle-appearance-standard .mat-button-toggle-focus-overlay {
  background-color: var(--%NS%mat-button-toggle-state-layer-color, var(--%NS%mat-sys-on-surface));
}
.mat-button-toggle-appearance-standard:hover .mat-button-toggle-focus-overlay {
  opacity: var(--%NS%mat-button-toggle-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-button-toggle-appearance-standard.cdk-keyboard-focused .mat-button-toggle-focus-overlay {
  opacity: var(--%NS%mat-button-toggle-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
@media (hover: none) {
  .mat-button-toggle-appearance-standard:hover .mat-button-toggle-focus-overlay {
    display: none;
  }
}

.mat-button-toggle-label-content {
  -webkit-user-select: none;
  user-select: none;
  display: inline-block;
  padding: 0 16px;
  line-height: var(--%NS%mat-button-toggle-legacy-height);
  position: relative;
}
.mat-button-toggle-appearance-standard .mat-button-toggle-label-content {
  padding: 0 12px;
  line-height: var(--%NS%mat-button-toggle-height, 40px);
}

.mat-button-toggle-label-content > * {
  vertical-align: middle;
}

.mat-button-toggle-focus-overlay {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  background-color: var(--%NS%mat-button-toggle-legacy-state-layer-color);
}

@media (forced-colors: active) {
  .mat-button-toggle-checked .mat-button-toggle-focus-overlay {
    border-bottom: solid 500px;
    opacity: 0.5;
    height: 0;
  }
  .mat-button-toggle-checked:hover .mat-button-toggle-focus-overlay {
    opacity: 0.6;
  }
  .mat-button-toggle-checked.mat-button-toggle-appearance-standard .mat-button-toggle-focus-overlay {
    border-bottom: solid 500px;
  }
}
.mat-button-toggle .mat-button-toggle-ripple {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
}

.mat-button-toggle-button {
  border: 0;
  background: none;
  color: inherit;
  padding: 0;
  margin: 0;
  font: inherit;
  outline: none;
  width: 100%;
  cursor: pointer;
}
.mat-button-toggle-animations-enabled .mat-button-toggle-button {
  transition: padding 150ms 45ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-button-toggle-vertical .mat-button-toggle-button {
  transition: none;
}
.mat-button-toggle-disabled .mat-button-toggle-button {
  cursor: default;
}
.mat-button-toggle-button::-moz-focus-inner {
  border: 0;
}
.mat-button-toggle-checked .mat-button-toggle-button:has(.mat-button-toggle-checkbox-wrapper) {
  padding-left: 30px;
}
[dir=rtl] .mat-button-toggle-checked .mat-button-toggle-button:has(.mat-button-toggle-checkbox-wrapper) {
  padding-left: 0;
  padding-right: 30px;
}

.mat-button-toggle-standalone.mat-button-toggle-appearance-standard {
  --%NS%mat-focus-indicator-border-radius: var(--%NS%mat-button-toggle-shape, var(--%NS%mat-sys-corner-extra-large));
}

.mat-button-toggle-group-appearance-standard:not(.mat-button-toggle-vertical) .mat-button-toggle:last-of-type .mat-button-toggle-button::before {
  border-top-right-radius: var(--%NS%mat-button-toggle-shape, var(--%NS%mat-sys-corner-extra-large));
  border-bottom-right-radius: var(--%NS%mat-button-toggle-shape, var(--%NS%mat-sys-corner-extra-large));
}
.mat-button-toggle-group-appearance-standard:not(.mat-button-toggle-vertical) .mat-button-toggle:first-of-type .mat-button-toggle-button::before {
  border-top-left-radius: var(--%NS%mat-button-toggle-shape, var(--%NS%mat-sys-corner-extra-large));
  border-bottom-left-radius: var(--%NS%mat-button-toggle-shape, var(--%NS%mat-sys-corner-extra-large));
}

.mat-button-toggle-group-appearance-standard.mat-button-toggle-vertical .mat-button-toggle:last-of-type .mat-button-toggle-button::before {
  border-bottom-right-radius: var(--%NS%mat-button-toggle-shape, var(--%NS%mat-sys-corner-extra-large));
  border-bottom-left-radius: var(--%NS%mat-button-toggle-shape, var(--%NS%mat-sys-corner-extra-large));
}
.mat-button-toggle-group-appearance-standard.mat-button-toggle-vertical .mat-button-toggle:first-of-type .mat-button-toggle-button::before {
  border-top-right-radius: var(--%NS%mat-button-toggle-shape, var(--%NS%mat-sys-corner-extra-large));
  border-top-left-radius: var(--%NS%mat-button-toggle-shape, var(--%NS%mat-sys-corner-extra-large));
}
`],encapsulation:2})}return n})();var oa=[`trigger`];var ra=[`panel`];var la=[[[`mat-select-trigger`]],`*`];var sa=[`mat-select-trigger`,`*`];function ca(n,i){if(n&1&&(js(0,`span`,4),hC(1),ql()),n&2){let e=jw();wI(),$m(e.placeholder)}}function da(n,i){n&1&&Hw(0)}function ua(n,i){if(n&1&&(js(0,`span`,11),hC(1),ql()),n&2){let e=jw(2);wI(),$m(e.triggerValue)}}function pa(n,i){if(n&1&&(js(0,`span`,5),bw(1,da,1,0)(2,ua,2,1,`span`,11),ql()),n&2){let e=jw();wI(),ww(e.customTrigger?1:2)}}function ga(n,i){if(n&1){let e=Ow();js(0,`div`,12,1),Mm(`keydown`,function(a){yp(e);return vp(jw()._handleKeydown(a))}),Hw(2,1),ql()}if(n&2){let e=jw();rC(e.panelClass),ea$1(`mat-select-panel-animations-enabled`,!e._animationsDisabled)(`mat-primary`,e._parentFormField?.color===`primary`)(`mat-accent`,e._parentFormField?.color===`accent`)(`mat-warn`,e._parentFormField?.color===`warn`)(`mat-undefined`,!e._parentFormField?.color),zl(`id`,e.id+`-panel`)(`aria-multiselectable`,e.multiple)(`aria-label`,e.ariaLabel||null)(`aria-labelledby`,e._getPanelAriaLabelledby())}}var ma=new v(`mat-select-scroll-strategy`,{providedIn:`root`,factory:()=>{let n=h(q);return()=>tt(n)}});var ha=new v(`MAT_SELECT_CONFIG`);var ba=new v(`MatSelectTrigger`);var ke=class{source;value;constructor(i,e){this.source=i,this.value=e}};var jt=(()=>{class n{_viewportRuler=h(Pe);_changeDetectorRef=h(vy);_elementRef=h(ie);_dir=h(nM,{optional:!0});_idGenerator=h(Hd);_renderer=h(Ir);_parentFormField=h(rt,{optional:!0});ngControl=h(A,{self:!0,optional:!0});_liveAnnouncer=h(WS);_defaultOptions=h(ha,{optional:!0});_animationsDisabled=Da$1();_popoverLocation;_initialized=new L;_cleanupDetach;options;optionGroups;customTrigger;_positions=[{originX:`start`,originY:`bottom`,overlayX:`start`,overlayY:`top`},{originX:`end`,originY:`bottom`,overlayX:`end`,overlayY:`top`},{originX:`start`,originY:`top`,overlayX:`start`,overlayY:`bottom`,panelClass:`mat-mdc-select-panel-above`},{originX:`end`,originY:`top`,overlayX:`end`,overlayY:`bottom`,panelClass:`mat-mdc-select-panel-above`}];_scrollOptionIntoView(e){let t=this.options.toArray()[e];if(t){let a=this.panel.nativeElement,o=De(e,this.options,this.optionGroups),r=t._getHostElement();e===0&&o===1?a.scrollTop=0:a.scrollTop=Me(r.offsetTop,r.offsetHeight,a.scrollTop,a.offsetHeight)}}_positioningSettled(){this._scrollOptionIntoView(this._keyManager.activeItemIndex||0)}_getChangeEvent(e){return new ke(this,e)}_scrollStrategyFactory=h(ma);_panelOpen=!1;_compareWith=(e,t)=>e===t;_uid=this._idGenerator.getId(`mat-select-`);_triggerAriaLabelledBy=null;_previousControl;_destroy=new L;_errorStateTracker;stateChanges=new L;disableAutomaticLabeling=!0;userAriaDescribedBy;_selectionModel;_keyManager;_preferredOverlayOrigin;_overlayWidth;_onChange=()=>{};_onTouched=()=>{};_valueId=this._idGenerator.getId(`mat-select-value-`);_scrollStrategy;_overlayPanelClass=this._defaultOptions?.overlayPanelClass||``;get focused(){return this._focused||this._panelOpen}_focused=!1;controlType=`mat-select`;trigger;panel;_overlayDir;panelClass;disabled=!1;get disableRipple(){return this._disableRipple()}set disableRipple(e){this._disableRipple.set(e)}_disableRipple=Ct(!1);tabIndex=0;get hideSingleSelectionIndicator(){return this._hideSingleSelectionIndicator}set hideSingleSelectionIndicator(e){this._hideSingleSelectionIndicator=e,this._syncParentProperties()}_hideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get placeholder(){return this._placeholder}set placeholder(e){this._placeholder=e,this.stateChanges.next()}_placeholder;get required(){return this._required??this.ngControl?.control?.hasValidator(ee.required)??!1}set required(e){this._required=e,this.stateChanges.next()}_required;get multiple(){return this._multiple}set multiple(e){this._selectionModel,this._multiple=e}_multiple=!1;disableOptionCentering=this._defaultOptions?.disableOptionCentering??!1;get compareWith(){return this._compareWith}set compareWith(e){this._compareWith=e,this._selectionModel&&this._initializeSelection()}get value(){return this._value}set value(e){this._assignValue(e)&&this._onChange(e)}_value;ariaLabel=``;ariaLabelledby;get errorStateMatcher(){return this._errorStateTracker.matcher}set errorStateMatcher(e){this._errorStateTracker.matcher=e}typeaheadDebounceInterval;sortComparator;get id(){return this._id}set id(e){this._id=e||this._uid,this.stateChanges.next()}_id;get errorState(){return this._errorStateTracker.errorState}set errorState(e){this._errorStateTracker.errorState=e}panelWidth=this._defaultOptions&&typeof this._defaultOptions.panelWidth<`u`?this._defaultOptions.panelWidth:`auto`;canSelectNullableOptions=this._defaultOptions?.canSelectNullableOptions??!1;optionSelectionChanges=gD(()=>{let e=this.options;return e?e.changes.pipe(Ei(e),Mf(()=>yD(...e.map(t=>t.onSelectionChange)))):this._initialized.pipe(Mf(()=>this.optionSelectionChanges))});openedChange=new fe;_openedStream=this.openedChange.pipe(be(e=>e),Q(()=>{}));_closedStream=this.openedChange.pipe(be(e=>!e),Q(()=>{}));selectionChange=new fe;valueChange=new fe;constructor(){let e=h(d),t=h(kt,{optional:!0}),a=h(Ht,{optional:!0}),o=h(new oy(`tabindex`),{optional:!0}),r=h(st,{optional:!0}),g=h(R,{optional:!0,self:!0});this.ngControl&&(this.ngControl.valueAccessor=this),this._defaultOptions?.typeaheadDebounceInterval!=null&&(this.typeaheadDebounceInterval=this._defaultOptions.typeaheadDebounceInterval),this._errorStateTracker=new s(e,g||this.ngControl,a,t,this.stateChanges),this._scrollStrategy=this._scrollStrategyFactory(),this.tabIndex=o==null?0:parseInt(o)||0,this._popoverLocation=r?.usePopover===!1?null:`inline`,this.id=this.id}ngOnInit(){this._selectionModel=new d$1(this.multiple),this.stateChanges.next(),this._viewportRuler.change().pipe(qr(this._destroy)).subscribe(()=>{this.panelOpen&&(this._overlayWidth=this._getOverlayWidth(this._preferredOverlayOrigin),this._changeDetectorRef.detectChanges())})}ngAfterContentInit(){this._initialized.next(),this._initialized.complete(),this._initKeyManager(),this._selectionModel.changed.pipe(qr(this._destroy)).subscribe(e=>{e.added.forEach(t=>t.select()),e.removed.forEach(t=>t.deselect())}),this.options.changes.pipe(Ei(null),qr(this._destroy)).subscribe(()=>{this._resetOptions(),this._initializeSelection()})}ngDoCheck(){let e=this._getTriggerAriaLabelledby(),t=this.ngControl;if(e!==this._triggerAriaLabelledBy){let a=this._elementRef.nativeElement;this._triggerAriaLabelledBy=e,e?a.setAttribute(`aria-labelledby`,e):a.removeAttribute(`aria-labelledby`)}t&&(this._previousControl!==t.control&&(this._previousControl!==void 0&&t.disabled!==null&&t.disabled!==this.disabled&&(this.disabled=t.disabled),this._previousControl=t.control),this.updateErrorState())}ngOnChanges(e){(e.disabled||e.userAriaDescribedBy)&&this.stateChanges.next(),e.typeaheadDebounceInterval&&this._keyManager&&this._keyManager.withTypeAhead(this.typeaheadDebounceInterval),e.panelClass&&this.panelClass instanceof Set&&(this.panelClass=Array.from(this.panelClass))}ngOnDestroy(){this._cleanupDetach?.(),this._keyManager?.destroy(),this._destroy.next(),this._destroy.complete(),this.stateChanges.complete()}toggle(){this.panelOpen?this.close():this.open()}open(){this._canOpen()&&(this._parentFormField&&(this._preferredOverlayOrigin=this._parentFormField.getConnectedOverlayOrigin()),this._cleanupDetach?.(),this._overlayWidth=this._getOverlayWidth(this._preferredOverlayOrigin),this._panelOpen=!0,this._overlayDir.positionChange.pipe(ft(1)).subscribe(()=>{this._changeDetectorRef.detectChanges(),this._positioningSettled()}),this._overlayDir.attachOverlay(),this._keyManager.withHorizontalOrientation(null),this._highlightCorrectOption(),this._changeDetectorRef.markForCheck(),this.stateChanges.next(),Promise.resolve().then(()=>this.openedChange.emit(!0)))}close(){this._panelOpen&&(this._panelOpen=!1,this._exitAndDetach(),this._keyManager.withHorizontalOrientation(this._isRtl()?`rtl`:`ltr`),this._changeDetectorRef.markForCheck(),this._onTouched(),this.stateChanges.next(),Promise.resolve().then(()=>this.openedChange.emit(!1)))}_exitAndDetach(){if(this._animationsDisabled||!this.panel){this._detachOverlay();return}this._cleanupDetach?.(),this._cleanupDetach=()=>{t(),clearTimeout(a),this._cleanupDetach=void 0};let e=this.panel.nativeElement,t=this._renderer.listen(e,`animationend`,o=>{o.animationName===`_mat-select-exit`&&(this._cleanupDetach?.(),this._detachOverlay())}),a=setTimeout(()=>{this._cleanupDetach?.(),this._detachOverlay()},200);e.classList.add(`mat-select-panel-exit`)}_detachOverlay(){this._overlayDir.detachOverlay(),this._changeDetectorRef.markForCheck()}writeValue(e){this._assignValue(e)}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}setDisabledState(e){this.disabled=e,this._changeDetectorRef.markForCheck(),this.stateChanges.next()}get panelOpen(){return this._panelOpen}get selected(){return this.multiple?this._selectionModel?.selected||[]:this._selectionModel?.selected[0]}get triggerValue(){if(this.empty)return``;if(this._multiple){let e=this._selectionModel.selected.map(t=>t.viewValue);return this._isRtl()&&e.reverse(),e.join(`, `)}return this._selectionModel.selected[0].viewValue}updateErrorState(){this._errorStateTracker.updateErrorState()}_isRtl(){return this._dir?this._dir.value===`rtl`:!1}_handleKeydown(e){this.disabled||(this.panelOpen?this._handleOpenKeydown(e):this._handleClosedKeydown(e))}_handleClosedKeydown(e){let t=e.keyCode,a=t===40||t===38||t===37||t===39,o=t===13||t===32,r=this._keyManager;if(!r.isTyping()&&o&&!Mv(e)||(this.multiple||e.altKey)&&a)e.preventDefault(),this.open();else if(!this.multiple){let g=this.selected;r.onKeydown(e);let _=this.selected;_&&g!==_&&this._liveAnnouncer.announce(_.viewValue,1e4)}}_handleOpenKeydown(e){let t=this._keyManager,a=e.keyCode,o=a===40||a===38,r=t.isTyping();if(o&&e.altKey)e.preventDefault(),this.close();else if(!r&&(a===13||a===32)&&t.activeItem&&!Mv(e))e.preventDefault(),t.activeItem._selectViaInteraction();else if(!r&&this._multiple&&a===65&&e.ctrlKey){e.preventDefault();let g=this.options.some(_=>!_.disabled&&!_.selected);this.options.forEach(_=>{_.disabled||(g?_.select():_.deselect())})}else{let g=t.activeItemIndex;t.onKeydown(e),this._multiple&&o&&e.shiftKey&&t.activeItem&&t.activeItemIndex!==g&&t.activeItem._selectViaInteraction()}}_handleOverlayKeydown(e){e.keyCode===27&&!Mv(e)&&(e.preventDefault(),this.close())}_onFocus(){this.disabled||(this._focused=!0,this.stateChanges.next())}_onBlur(){this._focused=!1,this._keyManager?.cancelTypeahead(),!this.disabled&&!this.panelOpen&&(this._onTouched(),this._changeDetectorRef.markForCheck(),this.stateChanges.next())}get empty(){return!this._selectionModel||this._selectionModel.isEmpty()}_initializeSelection(){Promise.resolve().then(()=>{this.ngControl&&(this._value=this.ngControl.value),this._setSelectionByValue(this._value),this.stateChanges.next()})}_setSelectionByValue(e){if(this.options.forEach(t=>t.setInactiveStyles()),this._selectionModel.clear(),this.multiple&&e)e.forEach(t=>this._selectOptionByValue(t)),this._sortValues();else{let t=this._selectOptionByValue(e);t?this._keyManager.updateActiveItem(t):this.panelOpen||this._keyManager.updateActiveItem(-1)}this._changeDetectorRef.markForCheck()}_selectOptionByValue(e){let t=this.options.find(a=>{if(this._selectionModel.isSelected(a))return!1;try{return(a.value!=null||this.canSelectNullableOptions)&&this._compareWith(a.value,e)}catch{return!1}});return t&&this._selectionModel.select(t),t}_assignValue(e){return e!==this._value||this._multiple&&Array.isArray(e)?(this.options&&this._setSelectionByValue(e),this._value=e,!0):!1}_skipPredicate=e=>this.panelOpen?!1:e.disabled;_getOverlayWidth(e){return this.panelWidth===`auto`?(e instanceof Q$1?e.elementRef:e||this._elementRef).nativeElement.getBoundingClientRect().width:this.panelWidth===null?``:this.panelWidth}_syncParentProperties(){if(this.options)for(let e of this.options)e._changeDetectorRef.markForCheck()}_initKeyManager(){this._keyManager=new Bd(this.options).withTypeAhead(this.typeaheadDebounceInterval).withVerticalOrientation().withHorizontalOrientation(this._isRtl()?`rtl`:`ltr`).withHomeAndEnd().withPageUpDown().withAllowedModifierKeys([`shiftKey`]).skipPredicate(this._skipPredicate),this._keyManager.tabOut.subscribe(()=>{this.panelOpen&&(!this.multiple&&this._keyManager.activeItem&&this._keyManager.activeItem._selectViaInteraction(),this.focus(),this.close())}),this._keyManager.change.subscribe(()=>{this._panelOpen&&this.panel?this._scrollOptionIntoView(this._keyManager.activeItemIndex||0):!this._panelOpen&&!this.multiple&&this._keyManager.activeItem&&this._keyManager.activeItem._selectViaInteraction()})}_resetOptions(){let e=yD(this.options.changes,this._destroy);this.optionSelectionChanges.pipe(qr(e)).subscribe(t=>{this._onSelect(t.source,t.isUserInput),t.isUserInput&&!this.multiple&&this._panelOpen&&(this.close(),this.focus())}),yD(...this.options.map(t=>t._stateChanges)).pipe(qr(e)).subscribe(()=>{this._changeDetectorRef.detectChanges(),this.stateChanges.next()})}_onSelect(e,t){let a=this._selectionModel.isSelected(e);!this.canSelectNullableOptions&&e.value==null&&!this._multiple?(e.deselect(),this._selectionModel.clear(),this.value!=null&&this._propagateChanges(e.value)):(a!==e.selected&&(e.selected?this._selectionModel.select(e):this._selectionModel.deselect(e)),t&&this._keyManager.setActiveItem(e),this.multiple&&(this._sortValues(),t&&this.focus())),a!==this._selectionModel.isSelected(e)&&this._propagateChanges(),this.stateChanges.next()}_sortValues(){if(this.multiple){let e=this.options.toArray();this._selectionModel.sort((t,a)=>this.sortComparator?this.sortComparator(t,a,e):e.indexOf(t)-e.indexOf(a)),this.stateChanges.next()}}_propagateChanges(e){let t;this.multiple?t=this.selected.map(a=>a.value):t=this.selected?this.selected.value:e,this._value=t,this.valueChange.emit(t),this._onChange(t),this.selectionChange.emit(this._getChangeEvent(t)),this._changeDetectorRef.markForCheck()}_highlightCorrectOption(){if(this._keyManager)if(this.empty){let e=-1;for(let t=0;t<this.options.length;t++)if(!this.options.get(t).disabled){e=t;break}this._keyManager.setActiveItem(e)}else this._keyManager.setActiveItem(this._selectionModel.selected[0])}_canOpen(){return!this._panelOpen&&!this.disabled&&this.options?.length>0&&!!this._overlayDir}focus(e){this._elementRef.nativeElement.focus(e)}_getPanelAriaLabelledby(){if(this.ariaLabel)return null;let e=this._parentFormField?.getLabelId()||null,t=e?e+` `:``;return this.ariaLabelledby?t+this.ariaLabelledby:e}_getAriaActiveDescendant(){return this.panelOpen&&this._keyManager&&this._keyManager.activeItem?this._keyManager.activeItem.id:null}_getTriggerAriaLabelledby(){if(this.ariaLabel)return null;let e=this._parentFormField?.getLabelId()||``;return this.ariaLabelledby&&(e+=` `+this.ariaLabelledby),e||(e=this._valueId),e}get describedByIds(){return this._elementRef.nativeElement.getAttribute(`aria-describedby`)?.split(` `)||[]}setDescribedByIds(e){let t=this._elementRef.nativeElement;e.length?t.setAttribute(`aria-describedby`,e.join(` `)):t.removeAttribute(`aria-describedby`)}onContainerClick(e){let t=Ge(e);t&&(t.tagName===`MAT-OPTION`||t.classList.contains(`cdk-overlay-backdrop`)||t.closest(`.mat-mdc-select-panel`))||(this.focus(),this.open())}get shouldLabelFloat(){return this.panelOpen||!this.empty||this.focused&&!!this.placeholder}static ɵfac=function(t){return new(t||n)};static ɵcmp=Vn({type:n,selectors:[[`mat-select`]],contentQueries:function(t,a,o){if(t&1&&xm(o,ba,5)(o,Ce$1,5)(o,re,5),t&2){let r;$w(r=Gw())&&(a.customTrigger=r.first),$w(r=Gw())&&(a.options=r),$w(r=Gw())&&(a.optionGroups=r)}},viewQuery:function(t,a){if(t&1&&Rm(oa,5)(ra,5)(Ut$1,5),t&2){let o;$w(o=Gw())&&(a.trigger=o.first),$w(o=Gw())&&(a.panel=o.first),$w(o=Gw())&&(a._overlayDir=o.first)}},hostAttrs:[`role`,`combobox`,`aria-haspopup`,`listbox`,1,`mat-mdc-select`],hostVars:21,hostBindings:function(t,a){t&1&&Mm(`keydown`,function(r){return a._handleKeydown(r)})(`focus`,function(){return a._onFocus()})(`blur`,function(){return a._onBlur()}),t&2&&(zl(`id`,a.id)(`tabindex`,a.disabled?-1:a.tabIndex)(`aria-controls`,a.panelOpen?a.id+`-panel`:null)(`aria-expanded`,a.panelOpen)(`aria-label`,a.ariaLabel||null)(`aria-required`,a.required.toString())(`aria-disabled`,a.disabled.toString())(`aria-invalid`,a.errorState)(`aria-activedescendant`,a._getAriaActiveDescendant()),ea$1(`mat-mdc-select-disabled`,a.disabled)(`mat-mdc-select-invalid`,a.errorState)(`mat-mdc-select-required`,a.required)(`mat-mdc-select-empty`,a.empty)(`mat-mdc-select-multiple`,a.multiple)(`mat-select-open`,a.panelOpen))},inputs:{userAriaDescribedBy:[0,`aria-describedby`,`userAriaDescribedBy`],panelClass:`panelClass`,disabled:[2,`disabled`,`disabled`,oa$1],disableRipple:[2,`disableRipple`,`disableRipple`,oa$1],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:fT(e)],hideSingleSelectionIndicator:[2,`hideSingleSelectionIndicator`,`hideSingleSelectionIndicator`,oa$1],placeholder:`placeholder`,required:[2,`required`,`required`,oa$1],multiple:[2,`multiple`,`multiple`,oa$1],disableOptionCentering:[2,`disableOptionCentering`,`disableOptionCentering`,oa$1],compareWith:`compareWith`,value:`value`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaLabelledby:[0,`aria-labelledby`,`ariaLabelledby`],errorStateMatcher:`errorStateMatcher`,typeaheadDebounceInterval:[2,`typeaheadDebounceInterval`,`typeaheadDebounceInterval`,fT],sortComparator:`sortComparator`,id:`id`,panelWidth:`panelWidth`,canSelectNullableOptions:[2,`canSelectNullableOptions`,`canSelectNullableOptions`,oa$1]},outputs:{openedChange:`openedChange`,_openedStream:`opened`,_closedStream:`closed`,selectionChange:`selectionChange`,valueChange:`valueChange`},exportAs:[`matSelect`],features:[Km([{provide:at,useExisting:n},{provide:ae,useExisting:n}]),Vs],ngContentSelectors:sa,decls:11,vars:10,consts:[[`fallbackOverlayOrigin`,`cdkOverlayOrigin`,`trigger`,``],[`panel`,``],[`cdk-overlay-origin`,``,1,`mat-mdc-select-trigger`,3,`click`],[1,`mat-mdc-select-value`],[1,`mat-mdc-select-placeholder`,`mat-mdc-select-min-line`],[1,`mat-mdc-select-value-text`],[1,`mat-mdc-select-arrow-wrapper`],[1,`mat-mdc-select-arrow`],[`viewBox`,`0 0 24 24`,`width`,`24px`,`height`,`24px`,`focusable`,`false`,`aria-hidden`,`true`],[`d`,`M7 10l5 5 5-5z`],[`cdk-connected-overlay`,``,`cdkConnectedOverlayHasBackdrop`,``,`cdkConnectedOverlayBackdropClass`,`cdk-overlay-transparent-backdrop`,3,`detach`,`backdropClick`,`overlayKeydown`,`cdkConnectedOverlayDisableClose`,`cdkConnectedOverlayPanelClass`,`cdkConnectedOverlayScrollStrategy`,`cdkConnectedOverlayOrigin`,`cdkConnectedOverlayPositions`,`cdkConnectedOverlayWidth`,`cdkConnectedOverlayFlexibleDimensions`,`cdkConnectedOverlayUsePopover`],[1,`mat-mdc-select-min-line`],[`role`,`listbox`,`tabindex`,`-1`,1,`mat-mdc-select-panel`,`mdc-menu-surface`,`mdc-menu-surface--open`,3,`keydown`]],template:function(t,a){if(t&1&&(Vw(la),js(0,`div`,2,0),Mm(`click`,function(){return a.open()}),js(3,`div`,3),bw(4,ca,2,1,`span`,4)(5,pa,3,1,`span`,5),ql(),js(6,`div`,6)(7,`div`,7),Ap(),js(8,`svg`,8),Im(9,`path`,9),ql()()()(),ym(10,ga,3,16,`ng-template`,10),Mm(`detach`,function(){return a.close()})(`backdropClick`,function(){return a.close()})(`overlayKeydown`,function(r){return a._handleOverlayKeydown(r)})),t&2){let o=Ww(1);wI(3),zl(`id`,a._valueId),wI(),ww(a.empty?4:5),wI(6),_m(`cdkConnectedOverlayDisableClose`,!0)(`cdkConnectedOverlayPanelClass`,a._overlayPanelClass)(`cdkConnectedOverlayScrollStrategy`,a._scrollStrategy)(`cdkConnectedOverlayOrigin`,a._preferredOverlayOrigin||o)(`cdkConnectedOverlayPositions`,a._positions)(`cdkConnectedOverlayWidth`,a._overlayWidth)(`cdkConnectedOverlayFlexibleDimensions`,!0)(`cdkConnectedOverlayUsePopover`,a._popoverLocation)}},dependencies:[Q$1,Ut$1],styles:[`@keyframes _mat-select-enter {
  from {
    opacity: 0;
    transform: scaleY(0.8);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes _mat-select-exit {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
.mat-mdc-select {
  display: inline-block;
  width: 100%;
  outline: none;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  color: var(--%NS%mat-select-enabled-trigger-text-color, var(--%NS%mat-sys-on-surface));
  font-family: var(--%NS%mat-select-trigger-text-font, var(--%NS%mat-sys-body-large-font));
  line-height: var(--%NS%mat-select-trigger-text-line-height, var(--%NS%mat-sys-body-large-line-height));
  font-size: var(--%NS%mat-select-trigger-text-size, var(--%NS%mat-sys-body-large-size));
  font-weight: var(--%NS%mat-select-trigger-text-weight, var(--%NS%mat-sys-body-large-weight));
  letter-spacing: var(--%NS%mat-select-trigger-text-tracking, var(--%NS%mat-sys-body-large-tracking));
}

div.mat-mdc-select-panel {
  box-shadow: var(--%NS%mat-select-container-elevation-shadow, 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12));
}

.mat-mdc-select-disabled {
  color: var(--%NS%mat-select-disabled-trigger-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-select-disabled .mat-mdc-select-placeholder {
  color: var(--%NS%mat-select-disabled-trigger-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}

.mat-mdc-select-trigger {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  box-sizing: border-box;
  width: 100%;
}
.mat-mdc-select-disabled .mat-mdc-select-trigger {
  -webkit-user-select: none;
  user-select: none;
  cursor: default;
}

.mat-mdc-select-value {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mat-mdc-select-value-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mat-mdc-select-arrow-wrapper {
  height: 24px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}
.mat-form-field-appearance-fill .mdc-text-field--no-label .mat-mdc-select-arrow-wrapper {
  transform: none;
}

.mat-mdc-form-field .mat-mdc-select.mat-mdc-select-invalid .mat-mdc-select-arrow,
.mat-form-field-invalid:not(.mat-form-field-disabled) .mat-mdc-form-field-infix::after {
  color: var(--%NS%mat-select-invalid-arrow-color, var(--%NS%mat-sys-error));
}

.mat-mdc-select-arrow {
  width: 10px;
  height: 5px;
  position: relative;
  color: var(--%NS%mat-select-enabled-arrow-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-form-field.mat-focused .mat-mdc-select-arrow {
  color: var(--%NS%mat-select-focused-arrow-color, var(--%NS%mat-sys-primary));
}
.mat-mdc-form-field .mat-mdc-select.mat-mdc-select-disabled .mat-mdc-select-arrow {
  color: var(--%NS%mat-select-disabled-arrow-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-select-open .mat-mdc-select-arrow {
  transform: rotate(180deg);
}
.mat-form-field-animations-enabled .mat-mdc-select-arrow {
  transition: transform 80ms linear;
}
.mat-mdc-select-arrow svg {
  fill: currentColor;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
@media (forced-colors: active) {
  .mat-mdc-select-arrow svg {
    fill: CanvasText;
  }
  .mat-mdc-select-disabled .mat-mdc-select-arrow svg {
    fill: GrayText;
  }
}

div.mat-mdc-select-panel {
  width: 100%;
  max-height: 275px;
  outline: 0;
  overflow: auto;
  padding: 8px 0;
  box-sizing: border-box;
  transform-origin: top center;
  border-radius: 0 0 4px 4px;
  position: relative;
  background-color: var(--%NS%mat-select-panel-background-color, var(--%NS%mat-sys-surface-container));
}
.mat-mdc-select-panel-above div.mat-mdc-select-panel {
  border-radius: 4px 4px 0 0;
  transform-origin: bottom center;
}
@media (forced-colors: active) {
  div.mat-mdc-select-panel {
    outline: solid 1px;
  }
}

.mat-select-panel-animations-enabled {
  animation: _mat-select-enter 120ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-select-panel-animations-enabled.mat-select-panel-exit {
  animation: _mat-select-exit 100ms linear;
}

.mat-mdc-select-placeholder {
  transition: color 400ms 133.3333333333ms cubic-bezier(0.25, 0.8, 0.25, 1);
  color: var(--%NS%mat-select-placeholder-text-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-form-field:not(.mat-form-field-animations-enabled) .mat-mdc-select-placeholder, ._mat-animation-noopable .mat-mdc-select-placeholder {
  transition: none;
}
.mat-form-field-hide-placeholder .mat-mdc-select-placeholder {
  color: transparent;
  -webkit-text-fill-color: transparent;
  transition: none;
  display: block;
}

.mat-mdc-form-field-type-mat-select:not(.mat-form-field-disabled) .mat-mdc-text-field-wrapper {
  cursor: pointer;
}
.mat-mdc-form-field-type-mat-select.mat-form-field-appearance-fill .mat-mdc-floating-label {
  max-width: calc(100% - 18px);
}
.mat-mdc-form-field-type-mat-select.mat-form-field-appearance-fill .mdc-floating-label--float-above {
  max-width: calc(100% / 0.75 - 24px);
}
.mat-mdc-form-field-type-mat-select.mat-form-field-appearance-outline .mdc-notched-outline__notch {
  max-width: calc(100% - 60px);
}
.mat-mdc-form-field-type-mat-select.mat-form-field-appearance-outline .mdc-text-field--label-floating .mdc-notched-outline__notch {
  max-width: calc(100% - 24px);
}

.mat-mdc-select-min-line:empty::before {
  content: " ";
  white-space: pre;
  width: 1px;
  display: inline-block;
  visibility: hidden;
}

.mat-form-field-appearance-fill .mat-mdc-select-arrow-wrapper {
  transform: var(--%NS%mat-select-arrow-transform, translateY(-8px));
}
`],encapsulation:2})}return n})();var fa=()=>({"=0":`No entries`,"=1":`1 entry`,other:`# entries`});var _a=n=>[`/capabilities`,n];var Ut=(n,i)=>[`/capabilities`,n,i];var va=n=>({flash:n});var ya=(n,i)=>i.status;var Sa=(n,i)=>i.id;function Ca(n,i){if(n&1){let e=Ow();js(0,`button`,16),Mm(`click`,function(){let a=yp(e).$implicit;return vp(jw().onStatusFilter(a.status))}),hC(1),ql()}if(n&2){let e=i.$implicit;rC(jw().statusFilter()===e.status?`bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900`:`bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300`),wI(),Gm(` `,e.count,` `,e.status,` `)}}function xa(n,i){if(n&1&&(js(0,`mat-option`,29),hC(1),ql()),n&2){let e=i.$implicit;_m(`value`,e),wI(),$m(e)}}function ka(n,i){if(n&1){let e=Ow();js(0,`mat-form-field`,23)(1,`mat-select`,28),Mm(`selectionChange`,function(a){yp(e);return vp(jw().onProviderFilter(a.value))}),js(2,`mat-option`,20),hC(3,`All providers`),ql(),Tw(4,xa,2,2,`mat-option`,29,Cw),ql()()}if(n&2){let e=jw();wI(),_m(`value`,e.providerFilter()),wI(3),Sw(e.providers())}}function Ma(n,i){if(n&1&&(js(0,`a`,25,1),hC(2),ql()),n&2){let e=i.$implicit,t=Ww(1);_m(`routerLink`,wC(3,_a,e.id))(`active`,t.isActive),wI(2),Jl(` `,e.label,` `)}}function wa(n,i){if(n&1&&(js(0,`div`,26),Im(1,`ao-error-state`,30),ql()),n&2){let e=jw();wI(),_m(`message`,e.error())}}function Ta(n,i){n&1&&(js(0,`div`,26),Im(1,`ao-empty-state`,31),ql())}function Ia(n,i){n&1&&(js(0,`th`,45),hC(1,` Id `),ql())}function Oa(n,i){if(n&1&&(js(0,`div`,48),hC(1),ql()),n&2){let e=jw().$implicit;wI(),Jl(` `,e.role||e.description,` `)}}function Na(n,i){if(n&1&&(js(0,`td`,46)(1,`a`,47),hC(2),ql(),bw(3,Oa,2,1,`div`,48),ql()),n&2){let e=i.$implicit,t=jw(2);wI(),_m(`routerLink`,CC(3,Ut,t.kind(),e.id)),wI(),Jl(` `,e.id,` `),wI(),ww(e.role||e.description?3:-1)}}function Da(n,i){n&1&&(js(0,`th`,49),hC(1,` Type `),ql())}function Ea(n,i){if(n&1&&(js(0,`td`,50)(1,`span`,51),hC(2),ql()()),n&2){let e=i.$implicit;wI(2),$m(e.type||`—`)}}function Ra(n,i){n&1&&(js(0,`th`,49),hC(1,` Status `),ql())}function Aa(n,i){if(n&1&&(js(0,`td`,50),Im(1,`ao-status-chip`,52),ql()),n&2){let e=i.$implicit;wI(),_m(`status`,e.status||`available`)}}function Fa(n,i){n&1&&(js(0,`th`,53),hC(1,` Gate `),ql())}function Pa(n,i){if(n&1&&(js(0,`a`,55),hC(1),ql()),n&2){let e=jw().$implicit;_m(`routerLink`,jw(2).fixRoute(e.fixKey))(`queryParams`,wC(3,va,e.fixKey)),wI(),Jl(``,e.gateReason,` →`)}}function La(n,i){if(n&1&&(js(0,`span`,56),hC(1),ql()),n&2){let e=jw().$implicit;wI(),$m(e.gateReason||`—`)}}function Ba(n,i){if(n&1&&(js(0,`td`,54),bw(1,Pa,2,5,`a`,55)(2,La,2,1,`span`,56),ql()),n&2){let e=i.$implicit;wI(),ww(e.gateReason&&e.fixKey?1:2)}}function Va(n,i){n&1&&Im(0,`tr`,57)}function Ga(n,i){if(n&1&&Im(0,`tr`,58),n&2){let e=i.$implicit;_m(`routerLink`,CC(1,Ut,jw(2).kind(),e.id))}}function Ha(n,i){if(n&1&&(js(0,`div`,27)(1,`table`,32),Kl(2,33),ym(3,Ia,2,0,`th`,34)(4,Na,4,6,`td`,35),Ql(),Kl(5,36),ym(6,Da,2,0,`th`,37)(7,Ea,3,1,`td`,38),Ql(),Kl(8,39),ym(9,Ra,2,0,`th`,37)(10,Aa,2,1,`td`,38),Ql(),Kl(11,40),ym(12,Fa,2,0,`th`,41)(13,Ba,3,1,`td`,42),Ql(),ym(14,Va,1,0,`tr`,43)(15,Ga,1,4,`tr`,44),ql()()),n&2){let e=jw();wI(),_m(`dataSource`,e.dataSource),wI(13),_m(`matHeaderRowDef`,e.columns)(`matHeaderRowDefSticky`,!0),wI(),_m(`matRowDefColumns`,e.columns)}}var Wa=[{id:`agents`,label:`Agents`},{id:`mcp`,label:`MCP servers`},{id:`skills`,label:`Skills`},{id:`rag`,label:`RAG sources`},{id:`workflows`,label:`Workflows`},{id:`harnesses`,label:`Harnesses`},{id:`societies`,label:`Societies`}];var Qt=class n{api=h(l);route=h(G);router=h(ue);media=h(v$1);kinds=Wa;kind=Ct(`agents`);entries=Ct([]);error=Ct(null);search=Ct(``);statusFilter=Ct(`all`);providerFilter=Ct(`all`);columns=[`id`,`type`,`status`,`gate`];counts=LC(()=>{let i=new Map;for(let e of this.entries()){let t=String(e.status||`available`);i.set(t,(i.get(t)??0)+1)}return[...i.entries()].map(([e,t])=>({status:e,count:t})).sort((e,t)=>t.count-e.count)});providers=LC(()=>{let i=new Set;for(let e of this.entries())e.type&&i.add(String(e.type));return[...i].sort((e,t)=>e.localeCompare(t))});dataSource=new Ke([]);url=He(this.router.events.pipe(be(i=>i instanceof k),Q(()=>this.router.url),Ei(this.router.url)),{initialValue:this.router.url});isMobile=LC(()=>this.media.match(`(max-width: 639px)`)());detailOpen=LC(()=>/\/capabilities\/[^/]+\/[^/]+/.test(this.url().split(`?`)[0]));ngOnInit(){this.route.paramMap.subscribe(i=>{let e=i.get(`kind`)||`agents`;this.kind.set(e),this.statusFilter.set(`all`),this.providerFilter.set(`all`),this.load(e)})}load(i){this.error.set(null),this.api.catalogs(i).subscribe(e=>{if(!e.ok){this.error.set(e.message),this.entries.set([]),this.dataSource.data=[];return}this.entries.set(e.data),this.applyFilter()})}onSearch(i){this.search.set(i),this.applyFilter()}onStatusFilter(i){this.statusFilter.set(i||`all`),this.applyFilter()}onProviderFilter(i){this.providerFilter.set(i||`all`),this.applyFilter()}applyFilter(){let i=this.entries(),e=this.search().trim().toLowerCase(),t=this.statusFilter(),a=this.providerFilter(),o=e?i.filter(r=>r.id.toLowerCase().includes(e)||String(r.type||``).toLowerCase().includes(e)||String(r.role||r.description||``).toLowerCase().includes(e)||String(r.gateReason||``).toLowerCase().includes(e)):[...i];t!==`all`&&(o=o.filter(r=>{let g=String(r.status||`available`);return t===`gated`?!!r.gateReason||g!==`available`:g===t})),a!==`all`&&(o=o.filter(r=>String(r.type||``)===a)),o.sort((r,g)=>{return(r.gateReason||r.status&&r.status!==`available`?0:1)-(g.gateReason||g.status&&g.status!==`available`?0:1)||r.id.localeCompare(g.id)}),this.dataSource.data=o}closeDetail(){this.router.navigate([`/capabilities`,this.kind()])}fixRoute(i){return i.includes(`API_KEY`)||i.includes(`TOKEN`)||i.includes(`OLLAMA`)||i.includes(`HF_`)?`/components/ollama`:i.includes(`MCP`)||i.includes(`HOME_ASSISTANT`)||i.includes(`FILESYSTEM`)?`/components`:`/settings`}static ɵfac=function(e){return new(e||n)};static ɵcmp=Vn({type:n,selectors:[[`ao-catalogs-page`]],hostAttrs:[1,`lg:h-full`],decls:39,vars:20,consts:[[`tabPanel`,``],[`rla`,`routerLinkActive`],[1,`@container`,`mx-auto`,`flex`,`h-full`,`w-full`,`flex-auto`,`flex-col`,`overflow-hidden`],[1,`h-full`,`flex-auto`,`[&_.mat-drawer-backdrop]:fixed`,3,`backdropClick`],[`disableClose`,``,1,`w-full`,`border-none`,`bg-white`,`sm:w-lg`,`dark:bg-neutral-900`,3,`mode`,`opened`,`position`,`fixedInViewport`],[1,`flex`,`flex-auto`,`flex-col`],[1,`flex`,`flex-col`,`gap-4`,`border-b`,`px-6`,`py-4`,`lg:px-8`,`lg:py-8`],[1,`flex`,`items-center`,`gap-x-4`],[1,`flex`,`flex-col`,`gap-y-0.5`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex-auto`],[1,`w-40`,`sm:w-64`],[`matPrefix`,``,`svgIcon`,`search`],[`placeholder`,`Search capabilities`,`matInput`,``,3,`input`,`value`],[1,`flex`,`flex-wrap`,`items-center`,`gap-2`,`text-sm`],[`type`,`button`,1,`rounded-full`,`px-3`,`py-1`,`font-medium`,3,`click`],[`type`,`button`,1,`rounded-full`,`px-3`,`py-1`,`font-medium`,3,`class`],[1,`flex`,`flex-wrap`,`items-center`,`gap-4`],[`aria-label`,`Availability`,3,`change`,`value`],[`value`,`all`],[`value`,`available`],[`value`,`gated`],[1,`w-48`],[`mat-tab-nav-bar`,``,`ngSkipHydration`,``,3,`mat-stretch-tabs`,`tabPanel`],[`mat-tab-link`,``,`routerLinkActive`,``,3,`routerLink`,`active`],[1,`p-6`,`lg:px-8`],[1,`relative`,`flex-auto`,`overflow-auto`],[3,`selectionChange`,`value`],[3,`value`],[3,`message`],[`message`,`No catalog entries loaded.`],[`mat-table`,``,1,`-mt-px`,`w-full`,`border-separate`,`border-spacing-0`,`whitespace-nowrap`,3,`dataSource`],[`matColumnDef`,`id`],[`class`,`pl-6 lg:pl-8`,`mat-header-cell`,``,4,`matHeaderCellDef`],[`class`,`pl-6 lg:pl-8`,`mat-cell`,``,4,`matCellDef`],[`matColumnDef`,`type`],[`mat-header-cell`,``,4,`matHeaderCellDef`],[`mat-cell`,``,4,`matCellDef`],[`matColumnDef`,`status`],[`matColumnDef`,`gate`],[`class`,`pr-6 lg:pr-8`,`mat-header-cell`,``,4,`matHeaderCellDef`],[`class`,`pr-6 lg:pr-8`,`mat-cell`,``,4,`matCellDef`],[`class`,`bg-white dark:bg-neutral-900`,`mat-header-row`,``,4,`matHeaderRowDef`,`matHeaderRowDefSticky`],[`class`,`cursor-pointer hover:bg-neutral-100 dark:hover:bg-white/2.5`,`mat-row`,``,3,`routerLink`,4,`matRowDef`,`matRowDefColumns`],[`mat-header-cell`,``,1,`pl-6`,`lg:pl-8`],[`mat-cell`,``,1,`pl-6`,`lg:pl-8`],[1,`font-mono`,`text-sm`,`font-medium`,`text-primary-600`,`hover:underline`,3,`routerLink`],[1,`mt-1`,`max-w-md`,`truncate`,`text-sm`,`text-neutral-500`],[`mat-header-cell`,``],[`mat-cell`,``],[1,`font-mono`,`text-sm`,`text-neutral-500`],[3,`status`],[`mat-header-cell`,``,1,`pr-6`,`lg:pr-8`],[`mat-cell`,``,1,`pr-6`,`lg:pr-8`],[1,`text-sm`,`text-primary-600`,`hover:underline`,3,`routerLink`,`queryParams`],[1,`text-sm`,`text-neutral-500`],[`mat-header-row`,``,1,`bg-white`,`dark:bg-neutral-900`],[`mat-row`,``,1,`cursor-pointer`,`hover:bg-neutral-100`,`dark:hover:bg-white/2.5`,3,`routerLink`]],template:function(e,t){if(e&1&&(js(0,`div`,2)(1,`mat-sidenav-container`,3),Mm(`backdropClick`,function(){return t.closeDetail()}),js(2,`mat-sidenav`,4),Im(3,`router-outlet`),ql(),js(4,`mat-sidenav-content`,5)(5,`div`,6)(6,`div`,7)(7,`div`,8)(8,`div`,9),hC(9,` Capabilities `),ql(),js(10,`div`,10),hC(11),MC(12,`i18nPlural`),ql()(),Im(13,`div`,11),js(14,`mat-form-field`,12),Im(15,`mat-icon`,13),js(16,`input`,14),Mm(`input`,function(o){return t.onSearch(o.target.value)}),ql()()(),js(17,`div`,15)(18,`button`,16),Mm(`click`,function(){return t.onStatusFilter(`all`)}),hC(19),ql(),Tw(20,Ca,2,4,`button`,17,ya),ql(),js(22,`div`,18)(23,`mat-button-toggle-group`,19),Mm(`change`,function(o){return t.onStatusFilter(o.value)}),js(24,`mat-button-toggle`,20),hC(25,`All`),ql(),js(26,`mat-button-toggle`,21),hC(27,` Available `),ql(),js(28,`mat-button-toggle`,22),hC(29,`Gated`),ql()(),bw(30,ka,6,1,`mat-form-field`,23),ql(),js(31,`nav`,24),Tw(32,Ma,3,5,`a`,25,Sa),ql(),Im(34,`mat-tab-nav-panel`,null,0),ql(),bw(36,wa,2,1,`div`,26)(37,Ta,2,0,`div`,26)(38,Ha,16,4,`div`,27),ql()()()),e&2){let a=Ww(35);wI(2),_m(`mode`,t.isMobile()?`over`:`side`)(`opened`,t.detailOpen())(`position`,`end`)(`fixedInViewport`,t.isMobile()),wI(2),ea$1(`border-r`,t.detailOpen()),wI(7),Jl(` `,xC(12,16,t.entries().length,bC(19,fa)),` · what this deployment can do, and what is gated `),wI(5),_m(`value`,t.search()),wI(2),rC(t.statusFilter()===`all`?`bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900`:`bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300`),wI(),Jl(` `,t.entries().length,` total `),wI(),Sw(t.counts()),wI(3),_m(`value`,t.statusFilter()),wI(7),ww(t.providers().length>1?30:-1),wI(),_m(`mat-stretch-tabs`,!1)(`tabPanel`,a),wI(),Sw(t.kinds),wI(4),ww(t.error()?36:t.entries().length?38:37)}},dependencies:[wt,Rt,Ve,Mt,li,Zt,ei,ni,ti,Jt$1,ri,ii,oi,si,ai,$e,De$1,ue$1,Lt,Et,Fe,xe,Ce,jt,Ce$1,dr,Dt,No,c,E,I,xT],encapsulation:2})};export{Qt as CatalogsPage};