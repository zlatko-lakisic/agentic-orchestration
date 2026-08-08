import{Ar as oC,Cn as cC,Cr as md,Dn as cd,G as Ks,Gt as Xp,Ir as pd,Kn as fa,Kt as Xs,Lr as py,M as IC,N as ID,Ni as l,Nt as Ve$1,Or as ny,Pi as m,Pt as Vm,Rr as qT,Rt as Wm,T as HG,U as Km,Ut as Xm,Wr as rr,Wt as Xn$1,Xn as h,Y as Lt,Yt as YC,Zn as hC,_r as ld,ar as iT,bt as SC,ci as uf,ei as ts,er as hd,et as My,ht as R,i as Bp,in as _C,jr as oT,jt as Uy,ki as zm,l as DC,li as v,lr as jp,m as EI,mr as l2,nr as hy,nt as Ne,o as CC,pi as wC,pn as ab,pt as Qp,qr as sC,qt as Xv,ri as u2,rr as iC,si as ue,sr as jC,un as aC,ut as Pa,v as Ey,wi as ye,x as GG,xi as yT,xr as ma$1,yn as ay}from"./chunk-BSP5txkv.js";import"./chunk-KL__mmzy.js";import{n as yt,r as Dt,t as wt,u as m$1}from"./main-BGVDSCTK.js";import"./chunk-BXQmTEYl.js";import"./chunk-B35pY3Lf.js";import"./chunk-CQzKlj5E.js";import{i as Lt$1,r as I,t as Bt}from"./chunk-Dsq1SXmv.js";import{d as se,o as O}from"./chunk-CvDTfDKe.js";import{t as d}from"./chunk-B_azdExJ.js";import"./chunk-DHVKr03x.js";import"./chunk-BIdVRixk.js";import"./chunk-DRBRVH7A.js";import{n as dt,r as lt$1}from"./chunk-BPq-DBwM.js";import{n as ge,r as he,t as U}from"./chunk-CNf_v2cG.js";import"./chunk-aX65fBcY.js";import{t as I$1}from"./chunk-mCaDqr0X.js";import{t as w}from"./chunk-CXaMWVqH.js";import{a as ei$1,c as ni$1,d as si$1,f as ti$1,i as ai$1,l as oi$1,o as ii$1,r as Zt,s as li$1,t as Jt,u as ri$1}from"./chunk-DwukmKpF.js";import{a as hn$1,i as bn$1,r as Re}from"./chunk-DK2pv_E1.js";import{a as Vt,c as zt,i as T,n as Bt$1,o as ee,r as Ht,s as jt,t as $e$1}from"./chunk-DsNeAHOr.js";import{n as bt,r as nt$1,t as Dt$1}from"./chunk-CWRMasfP2.js";var xn=[`switch`];var wn=[`*`];function kn(n,t){n&1&&(Ks(0,`span`,11),Qp(),Ks(1,`svg`,13),Wm(2,`path`,14),ld(),Ks(3,`svg`,15),Wm(4,`path`,16),ld()())}var Sn=new v(`mat-slide-toggle-default-options`,{providedIn:`root`,factory:()=>({disableToggleValue:!1,hideIcon:!1,disabledInteractive:!1})});var He=class{source;checked;constructor(t,e){this.source=t,this.checked=e}};var Ze=(()=>{class n{_elementRef=h(ue);_focusMonitor=h(Xv);_changeDetectorRef=h(Uy);defaults=h(Sn);_onChange=e=>{};_onTouched=()=>{};_validatorOnChange=()=>{};_uniqueId;_checked=!1;_createChangeEvent(e){return new He(this,e)}_labelId;get buttonId(){return`${this.id||this._uniqueId}-button`}_switchElement;focus(){this._switchElement.nativeElement.focus()}_noopAnimations=Pa();_focused=!1;name=null;id;labelPosition=`after`;ariaLabel=null;ariaLabelledby=null;ariaDescribedby;required=!1;color;disabled=!1;fullWidth=!1;disableRipple=!1;tabIndex=0;get checked(){return this._checked}set checked(e){this._checked=e,this._changeDetectorRef.markForCheck()}hideIcon;disabledInteractive;change=new ye;toggleChange=new ye;get inputId(){return`${this.id||this._uniqueId}-input`}constructor(){h(rr).load(GG);let e=h(new My(`tabindex`),{optional:!0}),i=this.defaults;this.tabIndex=e==null?0:parseInt(e)||0,this.color=i.color||`accent`,this.id=this._uniqueId=h(uf).getId(`mat-mdc-slide-toggle-`),this.hideIcon=i.hideIcon??!1,this.disabledInteractive=i.disabledInteractive??!1,this._labelId=this._uniqueId+`-label`}ngAfterContentInit(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{e===`keyboard`||e===`program`?(this._focused=!0,this._changeDetectorRef.markForCheck()):e||Promise.resolve().then(()=>{this._focused=!1,this._onTouched(),this._changeDetectorRef.markForCheck()})})}ngOnChanges(e){e.required&&this._validatorOnChange()}ngOnDestroy(){this._focusMonitor.stopMonitoring(this._elementRef)}writeValue(e){this.checked=!!e}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}validate(e){return this.required&&e.value!==!0?{required:!0}:null}registerOnValidatorChange(e){this._validatorOnChange=e}setDisabledState(e){this.disabled=e,this._changeDetectorRef.markForCheck()}toggle(){this.checked=!this.checked,this._onChange(this.checked)}_emitChangeEvent(){this._onChange(this.checked),this.change.emit(this._createChangeEvent(this.checked))}_handleClick(){this.disabled||(this.toggleChange.emit(),this.defaults.disableToggleValue||(this.checked=!this.checked,this._onChange(this.checked),this.change.emit(new He(this,this.checked))))}_getAriaLabelledBy(){return this.ariaLabelledby?this.ariaLabelledby:this.ariaLabel?null:this._labelId}static ɵfac=function(i){return new(i||n)};static ɵcmp=Xn$1({type:n,selectors:[[`mat-slide-toggle`]],viewQuery:function(i,a){if(i&1&&ny(xn,5),i&2){let d;wC(d=CC())&&(a._switchElement=d.first)}},hostAttrs:[1,`mat-mdc-slide-toggle`],hostVars:15,hostBindings:function(i,a){i&2&&(Km(`id`,a.id),cd(`tabindex`,null)(`aria-label`,null)(`name`,null)(`aria-labelledby`,null),jC(a.color?`mat-`+a.color:``),fa(`mat-mdc-slide-toggle-focused`,a._focused)(`mat-mdc-slide-toggle-checked`,a.checked)(`mat-slide-toggle-full-width`,a.fullWidth)(`_mat-animation-noopable`,a._noopAnimations))},inputs:{name:`name`,id:`id`,labelPosition:`labelPosition`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaLabelledby:[0,`aria-labelledby`,`ariaLabelledby`],ariaDescribedby:[0,`aria-describedby`,`ariaDescribedby`],required:[2,`required`,`required`,ma$1],color:`color`,disabled:[2,`disabled`,`disabled`,ma$1],fullWidth:[2,`fullWidth`,`fullWidth`,ma$1],disableRipple:[2,`disableRipple`,`disableRipple`,ma$1],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:qT(e)],checked:[2,`checked`,`checked`,ma$1],hideIcon:[2,`hideIcon`,`hideIcon`,ma$1],disabledInteractive:[2,`disabledInteractive`,`disabledInteractive`,ma$1]},outputs:{change:`change`,toggleChange:`toggleChange`},exportAs:[`matSlideToggle`],features:[Ey([{provide:se,useExisting:ts(()=>n),multi:!0},{provide:O,useExisting:n,multi:!0}]),Xs],ngContentSelectors:wn,decls:14,vars:27,consts:[[`switch`,``],[`mat-internal-form-field`,``,3,`labelPosition`],[`role`,`switch`,`type`,`button`,1,`mdc-switch`,3,`click`,`tabIndex`,`disabled`],[1,`mat-mdc-slide-toggle-touch-target`],[1,`mdc-switch__track`],[1,`mdc-switch__handle-track`],[1,`mdc-switch__handle`],[1,`mdc-switch__shadow`],[1,`mdc-elevation-overlay`],[1,`mdc-switch__ripple`],[`mat-ripple`,``,1,`mat-mdc-slide-toggle-ripple`,`mat-focus-indicator`,3,`matRippleTrigger`,`matRippleDisabled`,`matRippleCentered`],[1,`mdc-switch__icons`],[1,`mdc-label`,3,`click`,`for`],[`viewBox`,`0 0 24 24`,`aria-hidden`,`true`,1,`mdc-switch__icon`,`mdc-switch__icon--on`],[`d`,`M19.69,5.23L8.96,15.96l-4.23-4.23L2.96,13.5l6,6L21.46,7L19.69,5.23z`],[`viewBox`,`0 0 24 24`,`aria-hidden`,`true`,1,`mdc-switch__icon`,`mdc-switch__icon--off`],[`d`,`M20 13H4v-2h16v2z`]],template:function(i,a){if(i&1&&(_C(),Ks(0,`div`,1)(1,`button`,2,0),Xm(`click`,function(){return a._handleClick()}),Wm(3,`div`,3)(4,`span`,4),Ks(5,`span`,5)(6,`span`,6)(7,`span`,7),Wm(8,`span`,8),ld(),Ks(9,`span`,9),Wm(10,`span`,10),ld(),oC(11,kn,5,0,`span`,11),ld()()(),Ks(12,`label`,12),Xm(`click`,function(f){return f.stopPropagation()}),IC(13),ld()()),i&2){let d=SC(2);zm(`labelPosition`,a.labelPosition),ab(),fa(`mdc-switch--selected`,a.checked)(`mdc-switch--unselected`,!a.checked)(`mdc-switch--checked`,a.checked)(`mdc-switch--disabled`,a.disabled)(`mat-mdc-slide-toggle-disabled-interactive`,a.disabledInteractive),zm(`tabIndex`,a.disabled&&!a.disabledInteractive?-1:a.tabIndex)(`disabled`,a.disabled&&!a.disabledInteractive),cd(`id`,a.buttonId)(`name`,a.name)(`aria-label`,a.ariaLabel)(`aria-labelledby`,a._getAriaLabelledBy())(`aria-describedby`,a.ariaDescribedby)(`aria-required`,a.required||null)(`aria-checked`,a.checked)(`aria-disabled`,a.disabled&&a.disabledInteractive?`true`:null),ab(9),zm(`matRippleTrigger`,d)(`matRippleDisabled`,a.disableRipple||a.disabled)(`matRippleCentered`,!0),ab(),iC(a.hideIcon?-1:11),ab(),zm(`for`,a.buttonId),cd(`id`,a._labelId)}},dependencies:[HG,m$1],styles:[`.mdc-switch {
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  margin: 0;
  outline: none;
  overflow: visible;
  padding: 0;
  position: relative;
  width: var(--%NS%mat-slide-toggle-track-width, 52px);
}
.mdc-switch.mdc-switch--disabled {
  cursor: default;
  pointer-events: none;
}
.mdc-switch.mat-mdc-slide-toggle-disabled-interactive {
  pointer-events: auto;
}

.mdc-switch__track {
  overflow: hidden;
  position: relative;
  width: 100%;
  height: var(--%NS%mat-slide-toggle-track-height, 32px);
  border-radius: var(--%NS%mat-slide-toggle-track-shape, var(--%NS%mat-sys-corner-full));
}
.mdc-switch--disabled.mdc-switch .mdc-switch__track {
  opacity: var(--%NS%mat-slide-toggle-disabled-track-opacity, 0.12);
}
.mdc-switch__track::before, .mdc-switch__track::after {
  border: 1px solid transparent;
  border-radius: inherit;
  box-sizing: border-box;
  content: "";
  height: 100%;
  left: 0;
  position: absolute;
  width: 100%;
  border-width: var(--%NS%mat-slide-toggle-track-outline-width, 2px);
  border-color: var(--%NS%mat-slide-toggle-track-outline-color, var(--%NS%mat-sys-outline));
}
.mdc-switch--selected .mdc-switch__track::before, .mdc-switch--selected .mdc-switch__track::after {
  border-width: var(--%NS%mat-slide-toggle-selected-track-outline-width, 2px);
  border-color: var(--%NS%mat-slide-toggle-selected-track-outline-color, transparent);
}
.mdc-switch--disabled .mdc-switch__track::before, .mdc-switch--disabled .mdc-switch__track::after {
  border-width: var(--%NS%mat-slide-toggle-disabled-unselected-track-outline-width, 2px);
  border-color: var(--%NS%mat-slide-toggle-disabled-unselected-track-outline-color, var(--%NS%mat-sys-on-surface));
}
@media (forced-colors: active) {
  .mdc-switch__track {
    border-color: currentColor;
  }
}
.mdc-switch__track::before {
  transition: transform 75ms 0ms cubic-bezier(0, 0, 0.2, 1);
  transform: translateX(0);
  background: var(--%NS%mat-slide-toggle-unselected-track-color, var(--%NS%mat-sys-surface-variant));
}
.mdc-switch--selected .mdc-switch__track::before {
  transition: transform 75ms 0ms cubic-bezier(0.4, 0, 0.6, 1);
  transform: translateX(100%);
}
[dir=rtl] .mdc-switch--selected .mdc-switch--selected .mdc-switch__track::before {
  transform: translateX(-100%);
}
.mdc-switch--selected .mdc-switch__track::before {
  opacity: var(--%NS%mat-slide-toggle-hidden-track-opacity, 0);
  transition: var(--%NS%mat-slide-toggle-hidden-track-transition, opacity 75ms);
}
.mdc-switch--unselected .mdc-switch__track::before {
  opacity: var(--%NS%mat-slide-toggle-visible-track-opacity, 1);
  transition: var(--%NS%mat-slide-toggle-visible-track-transition, opacity 75ms);
}
.mdc-switch:enabled:hover:not(:focus):not(:active) .mdc-switch__track::before {
  background: var(--%NS%mat-slide-toggle-unselected-hover-track-color, var(--%NS%mat-sys-surface-variant));
}
.mdc-switch:enabled:focus:not(:active) .mdc-switch__track::before {
  background: var(--%NS%mat-slide-toggle-unselected-focus-track-color, var(--%NS%mat-sys-surface-variant));
}
.mdc-switch:enabled:active .mdc-switch__track::before {
  background: var(--%NS%mat-slide-toggle-unselected-pressed-track-color, var(--%NS%mat-sys-surface-variant));
}
.mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:hover:not(:focus):not(:active) .mdc-switch__track::before, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:focus:not(:active) .mdc-switch__track::before, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:active .mdc-switch__track::before, .mdc-switch.mdc-switch--disabled .mdc-switch__track::before {
  background: var(--%NS%mat-slide-toggle-disabled-unselected-track-color, var(--%NS%mat-sys-surface-variant));
}
.mdc-switch__track::after {
  transform: translateX(-100%);
  background: var(--%NS%mat-slide-toggle-selected-track-color, var(--%NS%mat-sys-primary));
}
[dir=rtl] .mdc-switch__track::after {
  transform: translateX(100%);
}
.mdc-switch--selected .mdc-switch__track::after {
  transform: translateX(0);
}
.mdc-switch--selected .mdc-switch__track::after {
  opacity: var(--%NS%mat-slide-toggle-visible-track-opacity, 1);
  transition: var(--%NS%mat-slide-toggle-visible-track-transition, opacity 75ms);
}
.mdc-switch--unselected .mdc-switch__track::after {
  opacity: var(--%NS%mat-slide-toggle-hidden-track-opacity, 0);
  transition: var(--%NS%mat-slide-toggle-hidden-track-transition, opacity 75ms);
}
.mdc-switch:enabled:hover:not(:focus):not(:active) .mdc-switch__track::after {
  background: var(--%NS%mat-slide-toggle-selected-hover-track-color, var(--%NS%mat-sys-primary));
}
.mdc-switch:enabled:focus:not(:active) .mdc-switch__track::after {
  background: var(--%NS%mat-slide-toggle-selected-focus-track-color, var(--%NS%mat-sys-primary));
}
.mdc-switch:enabled:active .mdc-switch__track::after {
  background: var(--%NS%mat-slide-toggle-selected-pressed-track-color, var(--%NS%mat-sys-primary));
}
.mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:hover:not(:focus):not(:active) .mdc-switch__track::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:focus:not(:active) .mdc-switch__track::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:active .mdc-switch__track::after, .mdc-switch.mdc-switch--disabled .mdc-switch__track::after {
  background: var(--%NS%mat-slide-toggle-disabled-selected-track-color, var(--%NS%mat-sys-on-surface));
}

.mdc-switch__handle-track {
  height: 100%;
  pointer-events: none;
  position: absolute;
  top: 0;
  transition: transform 75ms 0ms cubic-bezier(0.4, 0, 0.2, 1);
  left: 0;
  right: auto;
  transform: translateX(0);
  width: calc(100% - var(--%NS%mat-slide-toggle-handle-width));
}
[dir=rtl] .mdc-switch__handle-track {
  left: auto;
  right: 0;
}
.mdc-switch--selected .mdc-switch__handle-track {
  transform: translateX(100%);
}
[dir=rtl] .mdc-switch--selected .mdc-switch__handle-track {
  transform: translateX(-100%);
}

.mdc-switch__handle {
  display: flex;
  pointer-events: auto;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
  right: auto;
  transition: width 75ms cubic-bezier(0.4, 0, 0.2, 1), height 75ms cubic-bezier(0.4, 0, 0.2, 1), margin 75ms cubic-bezier(0.4, 0, 0.2, 1);
  width: var(--%NS%mat-slide-toggle-handle-width);
  height: var(--%NS%mat-slide-toggle-handle-height);
  border-radius: var(--%NS%mat-slide-toggle-handle-shape, var(--%NS%mat-sys-corner-full));
}
[dir=rtl] .mdc-switch__handle {
  left: auto;
  right: 0;
}
.mat-mdc-slide-toggle .mdc-switch--unselected .mdc-switch__handle {
  width: var(--%NS%mat-slide-toggle-unselected-handle-size, 16px);
  height: var(--%NS%mat-slide-toggle-unselected-handle-size, 16px);
  margin: var(--%NS%mat-slide-toggle-unselected-handle-horizontal-margin, 0 8px);
}
.mat-mdc-slide-toggle .mdc-switch--unselected .mdc-switch__handle:has(.mdc-switch__icons) {
  margin: var(--%NS%mat-slide-toggle-unselected-with-icon-handle-horizontal-margin, 0 4px);
}
.mat-mdc-slide-toggle .mdc-switch--selected .mdc-switch__handle {
  width: var(--%NS%mat-slide-toggle-selected-handle-size, 24px);
  height: var(--%NS%mat-slide-toggle-selected-handle-size, 24px);
  margin: var(--%NS%mat-slide-toggle-selected-handle-horizontal-margin, 0 24px);
}
.mat-mdc-slide-toggle .mdc-switch--selected .mdc-switch__handle:has(.mdc-switch__icons) {
  margin: var(--%NS%mat-slide-toggle-selected-with-icon-handle-horizontal-margin, 0 24px);
}
.mat-mdc-slide-toggle .mdc-switch__handle:has(.mdc-switch__icons) {
  width: var(--%NS%mat-slide-toggle-with-icon-handle-size, 24px);
  height: var(--%NS%mat-slide-toggle-with-icon-handle-size, 24px);
}
.mat-mdc-slide-toggle .mdc-switch:active:not(.mdc-switch--disabled) .mdc-switch__handle {
  width: var(--%NS%mat-slide-toggle-pressed-handle-size, 28px);
  height: var(--%NS%mat-slide-toggle-pressed-handle-size, 28px);
}
.mat-mdc-slide-toggle .mdc-switch--%NS%selected:active:not(.mdc-switch--disabled) .mdc-switch__handle {
  margin: var(--%NS%mat-slide-toggle-selected-pressed-handle-horizontal-margin, 0 22px);
}
.mat-mdc-slide-toggle .mdc-switch--%NS%unselected:active:not(.mdc-switch--disabled) .mdc-switch__handle {
  margin: var(--%NS%mat-slide-toggle-unselected-pressed-handle-horizontal-margin, 0 2px);
}
.mdc-switch--disabled.mdc-switch--selected .mdc-switch__handle::after {
  opacity: var(--%NS%mat-slide-toggle-disabled-selected-handle-opacity, 1);
}
.mdc-switch--disabled.mdc-switch--unselected .mdc-switch__handle::after {
  opacity: var(--%NS%mat-slide-toggle-disabled-unselected-handle-opacity, 0.38);
}
.mdc-switch__handle::before, .mdc-switch__handle::after {
  border: 1px solid transparent;
  border-radius: inherit;
  box-sizing: border-box;
  content: "";
  width: 100%;
  height: 100%;
  left: 0;
  position: absolute;
  top: 0;
  transition: background-color 75ms 0ms cubic-bezier(0.4, 0, 0.2, 1), border-color 75ms 0ms cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}
@media (forced-colors: active) {
  .mdc-switch__handle::before, .mdc-switch__handle::after {
    border-color: currentColor;
  }
}
.mdc-switch--%NS%selected:enabled .mdc-switch__handle::after {
  background: var(--%NS%mat-slide-toggle-selected-handle-color, var(--%NS%mat-sys-on-primary));
}
.mdc-switch--%NS%selected:enabled:hover:not(:focus):not(:active) .mdc-switch__handle::after {
  background: var(--%NS%mat-slide-toggle-selected-hover-handle-color, var(--%NS%mat-sys-primary-container));
}
.mdc-switch--%NS%selected:enabled:focus:not(:active) .mdc-switch__handle::after {
  background: var(--%NS%mat-slide-toggle-selected-focus-handle-color, var(--%NS%mat-sys-primary-container));
}
.mdc-switch--%NS%selected:enabled:active .mdc-switch__handle::after {
  background: var(--%NS%mat-slide-toggle-selected-pressed-handle-color, var(--%NS%mat-sys-primary-container));
}
.mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled.mdc-switch--%NS%selected:hover:not(:focus):not(:active) .mdc-switch__handle::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled.mdc-switch--%NS%selected:focus:not(:active) .mdc-switch__handle::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled.mdc-switch--%NS%selected:active .mdc-switch__handle::after, .mdc-switch--selected.mdc-switch--disabled .mdc-switch__handle::after {
  background: var(--%NS%mat-slide-toggle-disabled-selected-handle-color, var(--%NS%mat-sys-surface));
}
.mdc-switch--%NS%unselected:enabled .mdc-switch__handle::after {
  background: var(--%NS%mat-slide-toggle-unselected-handle-color, var(--%NS%mat-sys-outline));
}
.mdc-switch--%NS%unselected:enabled:hover:not(:focus):not(:active) .mdc-switch__handle::after {
  background: var(--%NS%mat-slide-toggle-unselected-hover-handle-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-switch--%NS%unselected:enabled:focus:not(:active) .mdc-switch__handle::after {
  background: var(--%NS%mat-slide-toggle-unselected-focus-handle-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-switch--%NS%unselected:enabled:active .mdc-switch__handle::after {
  background: var(--%NS%mat-slide-toggle-unselected-pressed-handle-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-switch--unselected.mdc-switch--disabled .mdc-switch__handle::after {
  background: var(--%NS%mat-slide-toggle-disabled-unselected-handle-color, var(--%NS%mat-sys-on-surface));
}
.mdc-switch__handle::before {
  background: var(--%NS%mat-slide-toggle-handle-surface-color);
}

.mdc-switch__shadow {
  border-radius: inherit;
  bottom: 0;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}
.mdc-switch:enabled .mdc-switch__shadow {
  box-shadow: var(--%NS%mat-slide-toggle-handle-elevation-shadow);
}
.mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:hover:not(:focus):not(:active) .mdc-switch__shadow, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:focus:not(:active) .mdc-switch__shadow, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:active .mdc-switch__shadow, .mdc-switch.mdc-switch--disabled .mdc-switch__shadow {
  box-shadow: var(--%NS%mat-slide-toggle-disabled-handle-elevation-shadow);
}

.mdc-switch__ripple {
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: -1;
  width: var(--%NS%mat-slide-toggle-state-layer-size, 40px);
  height: var(--%NS%mat-slide-toggle-state-layer-size, 40px);
}
.mdc-switch__ripple::after {
  content: "";
  opacity: 0;
}
.mdc-switch--disabled .mdc-switch__ripple::after {
  display: none;
}
.mat-mdc-slide-toggle-disabled-interactive .mdc-switch__ripple::after {
  display: block;
}
.mdc-switch:hover .mdc-switch__ripple::after {
  transition: 75ms opacity cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:enabled:focus .mdc-switch__ripple::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:enabled:active .mdc-switch__ripple::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--%NS%disabled:enabled:hover:not(:focus) .mdc-switch__ripple::after, .mdc-switch--%NS%unselected:enabled:hover:not(:focus) .mdc-switch__ripple::after {
  background: var(--%NS%mat-slide-toggle-unselected-hover-state-layer-color, var(--%NS%mat-sys-on-surface));
  opacity: var(--%NS%mat-slide-toggle-unselected-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mdc-switch--%NS%unselected:enabled:focus .mdc-switch__ripple::after {
  background: var(--%NS%mat-slide-toggle-unselected-focus-state-layer-color, var(--%NS%mat-sys-on-surface));
  opacity: var(--%NS%mat-slide-toggle-unselected-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
.mdc-switch--%NS%unselected:enabled:active .mdc-switch__ripple::after {
  background: var(--%NS%mat-slide-toggle-unselected-pressed-state-layer-color, var(--%NS%mat-sys-on-surface));
  opacity: var(--%NS%mat-slide-toggle-unselected-pressed-state-layer-opacity, var(--%NS%mat-sys-pressed-state-layer-opacity));
  transition: opacity 75ms linear;
}
.mdc-switch--%NS%selected:enabled:hover:not(:focus) .mdc-switch__ripple::after {
  background: var(--%NS%mat-slide-toggle-selected-hover-state-layer-color, var(--%NS%mat-sys-primary));
  opacity: var(--%NS%mat-slide-toggle-selected-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mdc-switch--%NS%selected:enabled:focus .mdc-switch__ripple::after {
  background: var(--%NS%mat-slide-toggle-selected-focus-state-layer-color, var(--%NS%mat-sys-primary));
  opacity: var(--%NS%mat-slide-toggle-selected-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
.mdc-switch--%NS%selected:enabled:active .mdc-switch__ripple::after {
  background: var(--%NS%mat-slide-toggle-selected-pressed-state-layer-color, var(--%NS%mat-sys-primary));
  opacity: var(--%NS%mat-slide-toggle-selected-pressed-state-layer-opacity, var(--%NS%mat-sys-pressed-state-layer-opacity));
  transition: opacity 75ms linear;
}

.mdc-switch__icons {
  position: relative;
  height: 100%;
  width: 100%;
  z-index: 1;
  transform: translateZ(0);
}
.mdc-switch--disabled.mdc-switch--unselected .mdc-switch__icons {
  opacity: var(--%NS%mat-slide-toggle-disabled-unselected-icon-opacity, 0.38);
}
.mdc-switch--disabled.mdc-switch--selected .mdc-switch__icons {
  opacity: var(--%NS%mat-slide-toggle-disabled-selected-icon-opacity, 0.38);
}

.mdc-switch__icon {
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
  opacity: 0;
  transition: opacity 30ms 0ms cubic-bezier(0.4, 0, 1, 1);
}
.mdc-switch--unselected .mdc-switch__icon {
  width: var(--%NS%mat-slide-toggle-unselected-icon-size, 16px);
  height: var(--%NS%mat-slide-toggle-unselected-icon-size, 16px);
  fill: var(--%NS%mat-slide-toggle-unselected-icon-color, var(--%NS%mat-sys-surface-variant));
}
.mdc-switch--unselected.mdc-switch--disabled .mdc-switch__icon {
  fill: var(--%NS%mat-slide-toggle-disabled-unselected-icon-color, var(--%NS%mat-sys-surface-variant));
}
.mdc-switch--selected .mdc-switch__icon {
  width: var(--%NS%mat-slide-toggle-selected-icon-size, 16px);
  height: var(--%NS%mat-slide-toggle-selected-icon-size, 16px);
  fill: var(--%NS%mat-slide-toggle-selected-icon-color, var(--%NS%mat-sys-on-primary-container));
}
.mdc-switch--selected.mdc-switch--disabled .mdc-switch__icon {
  fill: var(--%NS%mat-slide-toggle-disabled-selected-icon-color, var(--%NS%mat-sys-on-surface));
}

.mdc-switch--selected .mdc-switch__icon--on,
.mdc-switch--unselected .mdc-switch__icon--off {
  opacity: 1;
  transition: opacity 45ms 30ms cubic-bezier(0, 0, 0.2, 1);
}

.mat-mdc-slide-toggle {
  -webkit-user-select: none;
  user-select: none;
  display: inline-block;
  -webkit-tap-highlight-color: transparent;
  outline: 0;
}
.mat-mdc-slide-toggle .mat-icon {
  min-height: fit-content;
  flex-shrink: 0;
}
.mat-mdc-slide-toggle .mat-mdc-slide-toggle-ripple,
.mat-mdc-slide-toggle .mdc-switch__ripple::after {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.mat-mdc-slide-toggle .mat-mdc-slide-toggle-ripple:not(:empty),
.mat-mdc-slide-toggle .mdc-switch__ripple::after:not(:empty) {
  transform: translateZ(0);
}
.mat-mdc-slide-toggle.mat-mdc-slide-toggle-focused .mat-focus-indicator::before {
  content: "";
}
.mat-mdc-slide-toggle .mat-internal-form-field {
  color: var(--%NS%mat-slide-toggle-label-text-color, var(--%NS%mat-sys-on-surface));
  font-family: var(--%NS%mat-slide-toggle-label-text-font, var(--%NS%mat-sys-body-medium-font));
  line-height: var(--%NS%mat-slide-toggle-label-text-line-height, var(--%NS%mat-sys-body-medium-line-height));
  font-size: var(--%NS%mat-slide-toggle-label-text-size, var(--%NS%mat-sys-body-medium-size));
  letter-spacing: var(--%NS%mat-slide-toggle-label-text-tracking, var(--%NS%mat-sys-body-medium-tracking));
  font-weight: var(--%NS%mat-slide-toggle-label-text-weight, var(--%NS%mat-sys-body-medium-weight));
}
.mat-mdc-slide-toggle .mat-ripple-element {
  opacity: 0.12;
}
.mat-mdc-slide-toggle .mat-focus-indicator::before {
  border-radius: 50%;
}
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__handle-track,
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__icon,
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__handle::before,
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__handle::after,
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__track::before,
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__track::after {
  transition: none;
}
.mat-mdc-slide-toggle .mdc-switch:enabled + .mdc-label {
  cursor: pointer;
}
.mat-mdc-slide-toggle .mdc-switch--disabled + label {
  color: var(--%NS%mat-slide-toggle-disabled-label-text-color, var(--%NS%mat-sys-on-surface));
}
.mat-mdc-slide-toggle label:empty {
  display: none;
}

.mat-slide-toggle-full-width {
  width: 100%;
}
.mat-slide-toggle-full-width .mat-internal-form-field {
  width: 100%;
  justify-content: space-between;
}
.mat-slide-toggle-full-width .mat-internal-form-field label {
  margin: 0;
  flex-grow: 1;
  text-align: end;
}
.mat-slide-toggle-full-width .mdc-form-field--align-end label {
  text-align: start;
}

.mat-mdc-slide-toggle-touch-target {
  position: absolute;
  top: 50%;
  left: 50%;
  height: var(--%NS%mat-slide-toggle-touch-target-size, 48px);
  width: 100%;
  transform: translate(-50%, -50%);
  display: var(--%NS%mat-slide-toggle-touch-target-display, block);
}
[dir=rtl] .mat-mdc-slide-toggle-touch-target {
  left: auto;
  right: 50%;
  transform: translate(50%, -50%);
}
`],encapsulation:2})}return n})();var tn=(()=>{class n{static ɵfac=function(i){return new(i||n)};static ɵmod=Ve$1({type:n});static ɵinj=Ne({imports:[Ze,ID]})}return n})();var Nn={app:{band:`application`,rank:0,lane:0,order:0},ui:{band:`application`,rank:1,lane:0,order:0},"overlay-source":{band:`application`,rank:1,lane:1,order:0},"local-tools":{band:`application`,rank:1,lane:2,order:0},openclaw:{band:`application`,rank:0,lane:3,order:0},"session-bridge":{band:`reach`,rank:0,lane:0,order:0},"overlay-packer":{band:`reach`,rank:0,lane:1,order:0},"local-mcp-host":{band:`reach`,rank:0,lane:2,order:0},"speech-client":{band:`reach`,rank:0,lane:3,order:0},"mtls-enroller":{band:`reach`,rank:0,lane:4,order:0},engine:{band:`ao`,rank:0,lane:0,order:0},endpoint:{band:`ao`,rank:0,lane:1,order:0},"web-ui":{band:`ao`,rank:0,lane:5,order:0},planner:{band:`ao`,rank:1,lane:0,order:0},catalog:{band:`ao`,rank:2,lane:0,order:0},"model-backend":{band:`ao`,rank:2,lane:1,order:0},"model-runtime":{band:`ao`,rank:2,lane:2,order:0},"execution-backend":{band:`ao`,rank:3,lane:0,order:0},worker:{band:`ao`,rank:3,lane:1,order:0},"mcp-sidecar":{band:`ao`,rank:3,lane:2,order:0},platform:{band:`ao`,rank:4,lane:0,order:0},storage:{band:`ao`,rank:4,lane:1,order:0}};var Je={"engine/session-overlay":1,"engine/mcp-tunnel":2,"engine/direct-agent":3,"engine/hello-speech":4,"engine/mtls-enrol":4,"speech/stt":3,"speech/tts":4};var et={"catalog/agents":0,"catalog/mcp":1,"catalog/skills":2};var tt={"models/backends":3,"models/ollama":4,"models/remote":5};var at=140;var nn=52;var Tn=at*3+104;var Dn=52;var ot=64;var Ge=28;var nt=22;var be=32;var Mn=56;var we=8;var En=8;var Pn=14;var it={ui:0,"overlay-source":1,"local-tools":2};function In(n){return[...new Set(n.map(t=>t.trim()).filter(Boolean))].sort()}var an={application:`1 · Application`,reach:`2 · Reach`,ao:`3 · Agentic Orchestration`};function An(n,t){let e=Nn[n.kind]||{band:n.band||`ao`,rank:0,lane:we-1,order:99},i=e.lane,a=e.order,d=e.rank;if(n.band===`application`&&n.appId&&t){let f=t.get(n.appId)??0;if(n.kind===`app`)return{band:`application`,rank:f,lane:0,order:0};if(it[n.kind]!=null)return{band:`application`,rank:f+1,lane:it[n.kind],order:it[n.kind]}}return n.kind===`openclaw`&&t&&t.size?{band:`application`,rank:Math.max(...t.values())+2,lane:3,order:0}:(n.kind===`endpoint`&&Je[n.id]!=null&&(i=Je[n.id]),n.kind===`catalog`&&et[n.id]!=null&&(i=et[n.id],a=et[n.id]),(n.kind===`model-runtime`||n.kind===`model-backend`)&&(tt[n.id]!=null?(i=tt[n.id],a=tt[n.id]):n.kind===`model-backend`&&(i=3)),n.id===`speech/stt`||n.id===`speech/tts`?{band:`ao`,rank:0,lane:Je[n.id]??3,order:10}:{band:n.band||e.band,rank:d,lane:i,order:a})}function On(n){return n.instrumented===!1&&n.status===`healthy`||!n.instrumented&&n.status===`healthy`?`unknown`:n.status||`unknown`}function Rn(n,t){return{x:n.x-t,y:n.y-t,w:n.width+t*2,h:n.height+t*2,id:n.id}}function Ln(n,t,e){let i=Math.min(n.x,t.x),a=Math.max(n.x,t.x),d=Math.min(n.y,t.y),f=Math.max(n.y,t.y),b=e.x+e.w,T=e.y+e.h;return Math.abs(n.x-t.x)<.5?n.x>=e.x&&n.x<=b&&f>=e.y&&d<=T:Math.abs(n.y-t.y)<.5?n.y>=e.y&&n.y<=T&&a>=e.x&&i<=b:!1}function Bn(n,t){for(let e=0;e<n.length-1;e++)for(let i of t)if(Ln(n[e],n[e+1],i))return!0;return!1}function Fn(n){if(n.length<3)return n;let t=[n[0]];for(let e=1;e<n.length-1;e++){let i=t[t.length-1],a=n[e],d=n[e+1];Math.abs(i.x-a.x)<.5&&Math.abs(a.x-d.x)<.5||Math.abs(i.y-a.y)<.5&&Math.abs(a.y-d.y)<.5||t.push(a)}return t.push(n[n.length-1]),t}function on(n){return Fn(n).map((e,i)=>`${i===0?`M`:`L`} ${rn(e.x)} ${rn(e.y)}`).join(` `)}function rn(n){return Math.round(n*10)/10}function rt(n,t){let e=n.x+n.width/2,i=n.y+n.height/2;switch(t){case`top`:return{x:e,y:n.y};case`bottom`:return{x:e,y:n.y+n.height};case`left`:return{x:n.x,y:i};case`right`:return{x:n.x+n.width,y:i}}}function ln(n,t,e=Pn){let i=rt(n,t);switch(t){case`top`:return{x:i.x,y:i.y-e};case`bottom`:return{x:i.x,y:i.y+e};case`left`:return{x:i.x-e,y:i.y};case`right`:return{x:i.x+e,y:i.y}}}function Kn(n,t,e){if(e===`bypass`)return{fromSide:`right`,toSide:`right`};let i=n.x+n.width/2,a=n.y+n.height/2,d=t.x+t.width/2,b=t.y+t.height/2-a,T=d-i;return Math.abs(b)>=Math.abs(T)*.75?b>=0?{fromSide:`bottom`,toSide:`top`}:{fromSide:`top`,toSide:`bottom`}:T>=0?{fromSide:`right`,toSide:`left`}:{fromSide:`left`,toSide:`right`}}function Hn(n,t,e,i,a){let{fromSide:d,toSide:f}=Kn(n,t,e),b=rt(n,d),T=rt(t,f),u=ln(n,d),c=ln(t,f);e===`reverse-tunnel`&&(u={x:u.x+16,y:u.y},c={x:c.x+16,y:c.y});let L=i.filter(_=>_.id!==n.id&&_.id!==t.id).map(_=>Rn(_,En)),F=be/2,P=a-be/2,H=(u.y+c.y)/2,K=(u.x+c.x)/2,j=Math.min(u.y,c.y)-Math.max(12,ot/4),Y=Math.max(u.y,c.y)+Math.max(12,ot/4),m=[];e===`bypass`&&m.push([u,{x:P,y:u.y},{x:P,y:c.y},c]),Math.abs(u.x-c.x)<.5&&m.push([u,c]),Math.abs(u.y-c.y)<.5&&m.push([u,c]),m.push([u,{x:u.x,y:H},{x:c.x,y:H},c]),m.push([u,{x:K,y:u.y},{x:K,y:c.y},c]),m.push([u,{x:u.x,y:Y},{x:c.x,y:Y},c]),m.push([u,{x:u.x,y:j},{x:c.x,y:j},c]),m.push([u,{x:F,y:u.y},{x:F,y:c.y},c]),m.push([u,{x:P,y:u.y},{x:P,y:c.y},c]),m.push([u,{x:u.x,y:Y},{x:P,y:Y},{x:P,y:j},{x:c.x,y:j},c]),m.push([u,{x:u.x,y:j},{x:F,y:j},{x:F,y:Y},{x:c.x,y:Y},c]);for(let _ of m)if(!Bn(_,L))return on([b,..._,T]);return on([b,u,{x:P,y:u.y},{x:P,y:c.y},c,T])}function sn(n,t,e){let i=e?.showNotDeployed??!1,a=n.filter(m=>i||m.deployed!==!1),d=In(a.filter(m=>m.band===`application`&&m.appId).map(m=>String(m.appId))),f=new Map(d.map((m,_)=>[m,_*2])),b=a.map(m=>{let _=An(m,f);return l({node:m},_)});b.sort((m,_)=>{let V={application:0,reach:1,ao:2};return V[m.band]!==V[_.band]?V[m.band]-V[_.band]:m.rank!==_.rank?m.rank-_.rank:m.lane!==_.lane?m.lane-_.lane:m.order!==_.order?m.order-_.order:m.node.id.localeCompare(_.node.id)});let T=at+Dn,c=we*T+Mn+be*2,L=new Map;for(let m of b){let _=`${m.band}:${m.rank}`;L.has(_)||L.set(_,[]),L.get(_).push(m)}let F=[`application`,`reach`,`ao`],P=[],H=[],K=be;for(let m$2 of F){let _=[...L.entries()].filter(([ve])=>ve.startsWith(`${m$2}:`)).sort((ve,Q)=>Number(ve[0].split(`:`)[1])-Number(Q[0].split(`:`)[1]));if(_.length===0){H.push({id:m$2,label:an[m$2],y:K,height:Ge+nt+40}),K+=Ge+nt+40+16;continue}let V=K;K+=Ge+nt;for(let[,ve]of _){let Q=new Set;for(let le of ve){let Z=Math.max(0,Math.min(we-1,le.lane));for(;Q.has(Z)&&Z<we-1;)Z+=1;if(Q.has(Z)){for(let Ne=0;Ne<we;Ne++)if(!Q.has(Ne)){Z=Ne;break}}Q.add(Z);let st=le.node.kind===`app`,_n=st?Tn:at;st&&(Q.add(1),Q.add(2));let vn=be+Z*T;P.push(m(l({},le.node),{x:vn,y:K,width:_n,height:nn,lane:Z,rank:le.rank,order:le.order,displayStatus:On(le.node)}))}K+=nn+ot}let Ye=K-V+Ge/2;H.push({id:m$2,label:an[m$2],y:V,height:Ye}),K+=16}let j=new Map(P.map(m=>[m.id,m])),Y=[];for(let m$3 of t){let _=j.get(m$3.from),V=j.get(m$3.to);if(!_||!V)continue;let Ye=Hn(_,V,String(m$3.kind||`request`),P,c);Y.push(m(l({},m$3),{points:``,pathD:Ye}))}return{width:c,height:K+be,bands:H,nodes:P,edges:Y}}function dn(n,t){let e=new Map,i=new Map;for(let b of t)e.has(b.from)||e.set(b.from,[]),e.get(b.from).push(b.to),i.has(b.to)||i.set(b.to,[]),i.get(b.to).push(b.from);let a=new Set([n]),d=new Set,f=(b,T,u)=>{let c=[b];for(;c.length;){let L=c.pop();for(let F of T.get(L)||[]){let P=t.find(H=>u?H.from===L&&H.to===F:H.from===F&&H.to===L)?.id;P&&d.add(P),a.has(F)||(a.add(F),c.push(F))}}};f(n,e,!0),f(n,i,!1);for(let b of t)a.has(b.from)&&a.has(b.to)&&d.add(b.id);return{nodes:a,edges:d}}var Gn=3e4;var ke=class n{api=h(d);live=h(U);liveSub=null;seq=Lt(0);generatedAt=Lt(null);notes=Lt([]);capabilities=Lt(null);structureNodes=Lt([]);structureEdges=Lt([]);healthById=Lt({});liveMode=Lt(!0);paused=Lt(!1);showNotDeployed=Lt(!1);onlyUnhealthy=Lt(!1);bandFilter=Lt(`all`);tableMode=Lt(!1);hoverNodeId=Lt(null);snapshotOnly=Lt(!1);lastError=Lt(null);loading=Lt(!0);grace=new Map;_layoutRuns=0;layoutRunCount(){return this._layoutRuns}layout=yT(()=>{this._layoutRuns+=1;let t=this.mergeGrace(this.structureNodes()),e=this.structureEdges();if(this.bandFilter()!==`all`){let i=this.bandFilter();t=t.filter(d=>d.band===i);let a=new Set(t.map(d=>d.id));e=e.filter(d=>a.has(d.from)&&a.has(d.to))}return sn(t,e,{showNotDeployed:this.showNotDeployed()})});displayNodes=yT(()=>{let t=this.healthById(),e=this.onlyUnhealthy();return this.layout().nodes.map(i=>{let a=t[i.id],d=a?.status||i.status,f=a?.statusReason??i.statusReason;return i.instrumented===!1&&d===`healthy`&&(d=`unknown`),m(l({},i),{status:d,statusReason:f,displayStatus:d})}).filter(i=>e?[`failed`,`degraded`,`offline`].includes(String(i.displayStatus||``).toLowerCase()):!0)});displayEdges=yT(()=>{if(!this.onlyUnhealthy())return this.layout().edges;let t=new Set(this.displayNodes().map(e=>e.id));return this.layout().edges.filter(e=>t.has(e.from)||t.has(e.to))});hoverClosure=yT(()=>{let t=this.hoverNodeId();return t?dn(t,this.structureEdges()):null});unhealthyCount=yT(()=>this.displayNodes().filter(t=>[`failed`,`degraded`].includes(String(t.displayStatus||``).toLowerCase())).length);nodes=yT(()=>this.structureNodes());edges=yT(()=>this.structureEdges());start(){this.loading.set(!0),this.api.topologyGraph().subscribe(t=>{t.ok?(this.applySnapshot(t.data),this.snapshotOnly.set(!0),this.lastError.set(null)):this.lastError.set(t.message),this.loading.set(!1)}),this.live.acquire({topology:!0}),this.liveSub?.unsubscribe(),this.liveSub=this.live.topologyEvents.subscribe(t=>{this.paused()||this.onLiveEvent(t)})}stop(){this.liveSub?.unsubscribe(),this.liveSub=null,this.live.release()}togglePause(){this.paused.update(t=>!t)}resync(){this.live.resyncTopology(),this.api.topologyGraph().subscribe(t=>{t.ok&&this.applySnapshot(t.data)})}setHover(t){this.hoverNodeId.set(t)}loadNodeDetail(t){return this.api.topologyNode(t)}applyHealthForTest(t){this.layout();let e=this._layoutRuns;this.patchHealth(t),this.displayNodes();return{layoutRunsBefore:e,layoutRunsAfter:this._layoutRuns}}onLiveEvent(t){if(t.type===`topology_snapshot`){this.applySnapshot(t),this.snapshotOnly.set(!1);return}if(t.type===`topology_delta`){let e=Number(t.fromSeq||0);if(e&&e!==this.seq()){this.live.resyncTopology();return}this.applyDelta(t),this.snapshotOnly.set(!1);return}if(t.type===`topology_health`){let e=t.health;Array.isArray(e)&&this.patchHealth(e),t.seq!=null&&this.seq.set(Number(t.seq))}}applySnapshot(t){this.seq.set(Number(t.seq||0)),this.generatedAt.set(t.generatedAt||null),this.notes.set(t.notes||[]),this.capabilities.set(t.capabilities||null),this.structureNodes.set(t.nodes||[]),this.structureEdges.set(t.edges||[]);let e={};for(let i of t.nodes||[])e[i.id]={status:String(i.status),statusReason:i.statusReason};this.healthById.set(e),this.grace.clear()}applyDelta(t){let e=t.nodesUpserted||[],i=t.nodesRemoved||[],a=t.edgesUpserted||[],d=t.edgesRemoved||[],f=new Map(this.structureNodes().map(c=>[c.id,c])),b=l({},this.healthById());for(let c of e)f.set(c.id,c),b[c.id]={status:String(c.status),statusReason:c.statusReason},this.grace.delete(c.id);let T=Date.now();for(let c of i){let L=f.get(c);L&&(this.grace.set(c,{node:m(l({},L),{status:`offline`}),removeAt:T+Gn}),b[c]={status:`offline`,statusReason:`removed`}),f.delete(c)}this.structureNodes.set([...f.values()]),this.healthById.set(b);let u=new Map(this.structureEdges().map(c=>[c.id,c]));for(let c of a)u.set(c.id,c);for(let c of d)u.delete(c);this.structureEdges.set([...u.values()]),t.seq!=null&&this.seq.set(Number(t.seq)),t.notes&&this.notes.set(t.notes),t.capabilities&&this.capabilities.set(t.capabilities),t.generatedAt&&this.generatedAt.set(String(t.generatedAt))}patchHealth(t){this.healthById.update(e=>{let i=l({},e);for(let a of t)i[a.id]={status:a.status,statusReason:a.statusReason};return i})}mergeGrace(t){let e=Date.now(),i=[...t];for(let[a,d]of[...this.grace.entries()]){if(e>=d.removeAt){this.grace.delete(a);continue}i.some(f=>f.id===a)||i.push(d.node)}return i}static ɵfac=function(e){return new(e||n)};static ɵprov=R({token:n,factory:n.ɵfac})};var cn={app:{accent:`#0f766e`,icon:`app-window`,aspect:`App`},ui:{accent:`#0d9488`,icon:`monitor`,aspect:`Client`},"overlay-source":{accent:`#0891b2`,icon:`layers`,aspect:`Overlays`},"local-tools":{accent:`#059669`,icon:`wrench`,aspect:`Local tools`},openclaw:{accent:`#7c3aed`,icon:`bot`,aspect:`OpenClaw`},"session-bridge":{accent:`#2563eb`,icon:`cable`,aspect:`Reach bridge`},"overlay-packer":{accent:`#4f46e5`,icon:`package`,aspect:`Overlay pack`},"local-mcp-host":{accent:`#6366f1`,icon:`plug`,aspect:`Local MCP`},"speech-client":{accent:`#db2777`,icon:`mic`,aspect:`Speech`},"mtls-enroller":{accent:`#b45309`,icon:`shield`,aspect:`mTLS`},engine:{accent:`#dc2626`,icon:`cpu`,aspect:`Engine`},endpoint:{accent:`#ea580c`,icon:`radio`,aspect:`Endpoint`},"web-ui":{accent:`#0284c7`,icon:`globe`,aspect:`Web UI`},planner:{accent:`#ca8a04`,icon:`brain`,aspect:`Planner`},catalog:{accent:`#16a34a`,icon:`book-open`,aspect:`Catalog`},"model-backend":{accent:`#0f766e`,icon:`boxes`,aspect:`Models`},"model-runtime":{accent:`#0d9488`,icon:`sparkles`,aspect:`Runtime`},"execution-backend":{accent:`#9333ea`,icon:`workflow`,aspect:`Execution`},worker:{accent:`#a855f7`,icon:`server`,aspect:`Workers`},"mcp-sidecar":{accent:`#c026d3`,icon:`puzzle`,aspect:`Sidecar`},platform:{accent:`#475569`,icon:`container`,aspect:`Platform`},storage:{accent:`#64748b`,icon:`hard-drive`,aspect:`Storage`}};var Vn={application:{accent:`#0d9488`,icon:`monitor`,aspect:`Application`},reach:{accent:`#2563eb`,icon:`cable`,aspect:`Reach`},ao:{accent:`#dc2626`,icon:`cpu`,aspect:`AO`}};function Se(n,t){return cn[String(n)]||(t?Vn[t]:null)||{accent:`#737373`,icon:`circle`,aspect:`Other`}}var mn=cn;var lt=(n,t)=>t.id;var zn=(n,t)=>t.appId;function $n(n,t){if(n&1&&(Qp(),Ks(0,`text`,8),YC(1,` 2 · `),ld(),Ks(2,`foreignObject`,9),Xp(),Wm(3,`div`,10),ld(),Qp(),Ks(4,`text`,8),YC(5,` Reach `),ld()),n&2){let e=DC().$implicit;cd(`x`,28)(`y`,e.y+18),ab(2),cd(`x`,48)(`y`,e.y+6),ab(2),cd(`x`,66)(`y`,e.y+18)}}function Wn(n,t){if(n&1&&(Qp(),Ks(0,`text`,8),YC(1,` 3 · `),ld(),Ks(2,`foreignObject`,9),Xp(),Wm(3,`div`,10),ld(),Qp(),Ks(4,`text`,8),YC(5,` Agentic Orchestration `),ld()),n&2){let e=DC().$implicit;cd(`x`,28)(`y`,e.y+18),ab(2),cd(`x`,48)(`y`,e.y+6),ab(2),cd(`x`,66)(`y`,e.y+18)}}function qn(n,t){if(n&1&&(Qp(),Ks(0,`text`,8),YC(1),ld()),n&2){let e=DC().$implicit;cd(`x`,28)(`y`,e.y+18),ab(),md(` `,e.label,` `)}}function Xn(n,t){if(n&1&&(Qp(),Wm(0,`rect`,7),oC(1,$n,6,6)(2,Wn,6,6)(3,qn,2,3,`:svg:text`,8)),n&2){let e=t.$implicit,i=DC();cd(`x`,12)(`y`,e.y)(`width`,i.layout().width-24)(`height`,e.height)(`data-band`,e.id),ab(),iC(e.id===`reach`?1:e.id===`ao`?2:3)}}function jn(n,t){if(n&1&&(Qp(),Wm(0,`rect`,4)),n&2){let e=t.$implicit;cd(`x`,e.x)(`y`,e.y)(`width`,e.width)(`height`,e.height)}}function Yn(n,t){if(n&1){let e=hC();Qp(),Ks(0,`path`,11),Xm(`click`,function(){let a=jp(e).$implicit;return Bp(DC().edgeClick.emit(a))}),ld()}if(n&2){let e=t.$implicit,i=DC();fa(`dimmed`,i.isDimmedEdge(e.id))(`highlighted`,i.isHighlightedEdge(e.id))(`flow`,i.isHighlightedEdge(e.id)),cd(`d`,e.pathD)(`data-kind`,e.kind)}}function Un(n,t){if(n&1){let e=hC();Qp(),Ks(0,`g`,12),Xm(`mouseenter`,function(){let a=jp(e).$implicit;return Bp(DC().hover.emit(a.id))})(`mouseleave`,function(){jp(e);return Bp(DC().hover.emit(null))})(`focus`,function(){let a=jp(e).$implicit;return Bp(DC().hover.emit(a.id))})(`blur`,function(){jp(e);return Bp(DC().hover.emit(null))})(`click`,function(){let a=jp(e).$implicit;return Bp(DC().nodeClick.emit(a))})(`keydown.enter`,function(){let a=jp(e).$implicit;return Bp(DC().nodeClick.emit(a))}),Wm(1,`rect`,13)(2,`rect`,14),Ks(3,`foreignObject`,15),Xp(),Ks(4,`div`,16),Wm(5,`mat-icon`,17),ld()(),Qp(),Ks(6,`text`,18),YC(7),ld(),Ks(8,`text`,19),YC(9),ld()()}if(n&2){let e=t.$implicit,i=DC();fa(`dimmed`,i.isDimmedNode(e.id))(`highlighted`,i.isHighlightedNode(e.id)),cd(`transform`,`translate(`+e.x+`,`+e.y+`)`)(`data-status`,e.displayStatus)(`data-band`,e.band)(`data-kind`,e.kind)(`aria-label`,i.ariaLabel(e)),ab(),cd(`width`,e.width)(`height`,e.height)(`stroke`,i.accent(e)),ab(),cd(`height`,e.height)(`fill`,i.accent(e)),ab(3),ay(`color`,i.accent(e)),zm(`svgIcon`,i.icon(e)),ab(),cd(`x`,38),ab(),md(` `,i.truncate(e.label,i.labelMax(e)),` `),ab(),cd(`x`,38),ab(),hy(` `,i.statusGlyph(e.displayStatus),` `,i.truncate(e.sublabel||e.displayStatus,i.labelMax(e)),` `)}}var Ve=class n{layout=l2.required();nodes=l2.required();edges=l2.required();closure=l2(null);blurred=l2(!1);summary=l2(`Deployment topology diagram`);hover=u2();nodeClick=u2();edgeClick=u2();appFrames=yT(()=>{let t=new Map;for(let a of this.nodes()){if(a.band!==`application`||!a.appId)continue;let d=t.get(a.appId)||[];d.push(a),t.set(a.appId,d)}let e=[],i=10;for(let[a,d]of t){if(!d.length)continue;let f=Infinity,b=Infinity,T=-Infinity,u=-Infinity;for(let c of d)f=Math.min(f,c.x),b=Math.min(b,c.y),T=Math.max(T,c.x+c.width),u=Math.max(u,c.y+c.height);e.push({appId:a,x:f-i,y:b-i,width:T-f+i*2,height:u-b+i*2})}return e});isDimmedEdge(t){let e=this.closure();return!!e&&!e.edges.has(t)}isHighlightedEdge(t){let e=this.closure();return!!e&&e.edges.has(t)}isDimmedNode(t){let e=this.closure();return!!e&&!e.nodes.has(t)}isHighlightedNode(t){let e=this.closure();return!!e&&e.nodes.has(t)}accent(t){return Se(t.kind,t.band).accent}icon(t){return Se(t.kind,t.band).icon}labelMax(t){return t.kind===`app`?28:14}ariaLabel(t){let e=t.ownedByApps?.length?` owned by ${t.ownedByApps.join(`, `)}`:``;return`${t.label} ${t.displayStatus}${e}`}truncate(t,e){let i=String(t||``);return i.length>e?i.slice(0,e-1)+`…`:i}statusGlyph(t){switch(String(t||``).toLowerCase()){case`healthy`:return`●`;case`degraded`:return`▲`;case`failed`:return`✖`;case`starting`:return`◐`;case`draining`:return`◌`;case`offline`:return`○`;default:return`?`}}static ɵfac=function(e){return new(e||n)};static ɵcmp=Xn$1({type:n,selectors:[[`ao-topology-canvas`]],inputs:{layout:[1,`layout`],nodes:[1,`nodes`],edges:[1,`edges`],closure:[1,`closure`],blurred:[1,`blurred`],summary:[1,`summary`]},outputs:{hover:`hover`,nodeClick:`nodeClick`,edgeClick:`edgeClick`},decls:17,vars:8,consts:[[1,`topology-canvas-wrap`,`relative`,`h-full`,`w-full`,`overflow-auto`,`rounded-xl`,`border`,`border-neutral-200`,`bg-neutral-50`,`dark:border-neutral-800`,`dark:bg-neutral-950`],[`role`,`img`,1,`topology-svg`,`block`,`min-w-full`],[`id`,`topo-arrow`,`viewBox`,`0 0 10 10`,`refX`,`9`,`refY`,`5`,`markerWidth`,`7`,`markerHeight`,`7`,`orient`,`auto`],[`d`,`M 0 0 L 10 5 L 0 10 z`,1,`fill-neutral-400`,`dark:fill-neutral-500`],[`rx`,`12`,1,`app-group-frame`],[`marker-end`,`url(#topo-arrow)`,1,`topo-edge`,3,`dimmed`,`highlighted`,`flow`],[`tabindex`,`0`,`role`,`button`,1,`topo-node`,3,`dimmed`,`highlighted`],[`rx`,`10`,1,`band-rect`],[1,`band-label`,`fill-neutral-500`,`text-[11px]`,`font-medium`,`tracking-wide`,`uppercase`],[`width`,`14`,`height`,`14`],[`xmlns`,`http://www.w3.org/1999/xhtml`,`role`,`img`,`aria-label`,`AO`,1,`ao-band-mark`],[`marker-end`,`url(#topo-arrow)`,1,`topo-edge`,3,`click`],[`tabindex`,`0`,`role`,`button`,1,`topo-node`,3,`mouseenter`,`mouseleave`,`focus`,`blur`,`click`,`keydown.enter`],[`rx`,`8`,1,`node-fill`],[`x`,`0`,`y`,`0`,`width`,`4`,`rx`,`2`],[`x`,`12`,`y`,`14`,`width`,`22`,`height`,`22`],[`xmlns`,`http://www.w3.org/1999/xhtml`,1,`node-icon`],[3,`svgIcon`],[`y`,`22`,1,`fill-neutral-900`,`text-[12px]`,`font-medium`,`dark:fill-neutral-100`],[`y`,`38`,1,`fill-neutral-500`,`text-[10px]`]],template:function(e,i){e&1&&(Ks(0,`div`,0),Qp(),Ks(1,`svg`,1)(2,`title`),YC(3,`Live deployment topology`),ld(),Ks(4,`desc`),YC(5),ld(),Ks(6,`defs`)(7,`marker`,2),Wm(8,`path`,3),ld()(),aC(9,Xn,4,6,null,null,lt),aC(11,jn,1,4,`:svg:rect`,4,zn),aC(13,Yn,1,8,`:svg:path`,5,lt),aC(15,Un,10,22,`:svg:g`,6,lt),ld()()),e&2&&(fa(`topology-blur`,i.blurred()),ab(),fa(`path-highlight`,!!i.closure()),cd(`width`,i.layout().width)(`height`,i.layout().height)(`viewBox`,`0 0 `+i.layout().width+` `+i.layout().height),ab(4),py(i.summary()),ab(4),cC(i.layout().bands),ab(2),cC(i.appFrames()),ab(2),cC(i.edges()),ab(2),cC(i.nodes()))},dependencies:[yt,wt],styles:[`[_nghost-%COMP%]{display:block;min-height:420px}.topology-blur[_ngcontent-%COMP%]{filter:blur(3px) saturate(.85);opacity:.72;transition:filter .15s ease,opacity .15s ease}.band-rect[data-band=application][_ngcontent-%COMP%]{fill:color-mix(in oklab,#0d9488 8%,transparent);stroke:color-mix(in oklab,#0d9488 28%,transparent)}.app-group-frame[_ngcontent-%COMP%]{fill:color-mix(in oklab,#0f766e 6%,transparent);stroke:color-mix(in oklab,#0f766e 32%,transparent);stroke-width:1.25;stroke-dasharray:5 4;pointer-events:none}.band-rect[data-band=reach][_ngcontent-%COMP%]{fill:color-mix(in oklab,#2563eb 8%,transparent);stroke:color-mix(in oklab,#2563eb 28%,transparent)}.band-rect[data-band=ao][_ngcontent-%COMP%]{fill:color-mix(in oklab,#dc2626 7%,transparent);stroke:color-mix(in oklab,#dc2626 24%,transparent)}.topo-edge[_ngcontent-%COMP%]{fill:none;stroke:var(--%NS%mat-sys-outline);stroke-width:1.6;stroke-dasharray:7 5;stroke-linecap:square;stroke-linejoin:miter;opacity:.7;cursor:pointer;pointer-events:stroke}.topo-edge[data-kind=stream][_ngcontent-%COMP%]{stroke-dasharray:10 6}.topo-edge[data-kind=reverse-tunnel][_ngcontent-%COMP%]{stroke-dasharray:3 4}.topo-edge[data-kind=advertisement][_ngcontent-%COMP%]{stroke-dasharray:1 5;opacity:.45}.topo-edge[data-kind=bypass][_ngcontent-%COMP%]{stroke-dasharray:9 5}.topo-edge.flow[_ngcontent-%COMP%], .path-highlight[_ngcontent-%COMP%]   .topo-edge.highlighted[_ngcontent-%COMP%]{stroke:var(--%NS%mat-sys-primary);stroke-width:2.1;opacity:1;animation:_ngcontent-%COMP%_topo-dash-flow 1.1s linear infinite}@keyframes _ngcontent-%COMP%_topo-dash-flow{to{stroke-dashoffset:-24}}.topo-node[_ngcontent-%COMP%]{cursor:pointer;transition:opacity .12s ease}.topo-node[_ngcontent-%COMP%]:focus{outline:2px solid var(--%NS%mat-sys-primary);outline-offset:2px}.node-fill[_ngcontent-%COMP%]{fill:var(--%NS%mat-sys-surface);stroke-width:1.5}.node-icon[_ngcontent-%COMP%]{display:flex;width:22px;height:22px;align-items:center;justify-content:center}.node-icon[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{width:18px;height:18px;font-size:18px}.topo-node[data-status=failed][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-width:2.25}.topo-node[data-status=degraded][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-width:2}.ao-band-mark[_ngcontent-%COMP%]{display:block;width:14px;height:14px;background:currentColor;color:#737373;-webkit-mask:url(/admin/images/logo/ao-mark-small.svg) center / contain no-repeat;mask:url(/admin/images/logo/ao-mark-small.svg) center / contain no-repeat}.dark[_nghost-%COMP%]   .ao-band-mark[_ngcontent-%COMP%], .dark   [_nghost-%COMP%]   .ao-band-mark[_ngcontent-%COMP%], .dark[_ngcontent-%COMP%]   .ao-band-mark[_ngcontent-%COMP%]{color:#a3a3a3}.topo-node[data-status=unknown][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-dasharray:4 3}.topo-node[data-status=offline][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{fill:transparent;stroke-dasharray:3 3;opacity:.55}.topo-node[data-status=starting][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{opacity:.7}.path-highlight[_ngcontent-%COMP%]   .dimmed[_ngcontent-%COMP%]{opacity:.18}.path-highlight[_ngcontent-%COMP%]   .highlighted[_ngcontent-%COMP%]{opacity:1}@media(prefers-reduced-motion:reduce){.topo-edge.flow[_ngcontent-%COMP%], .path-highlight[_ngcontent-%COMP%]   .topo-edge.highlighted[_ngcontent-%COMP%]{animation:none}.topology-blur[_ngcontent-%COMP%]{transition:none;filter:none;opacity:.65}}`]})};function Qn(n,t){n&1&&(Ks(0,`th`,15),YC(1,`Name`),ld())}function Zn(n,t){if(n&1){let e=hC();Ks(0,`td`,16)(1,`button`,17),Xm(`click`,function(){let a=jp(e).$implicit;return Bp(DC().nodeClick.emit(a))}),YC(2),ld()()}if(n&2){let e=t.$implicit;ab(2),md(` `,e.label,` `)}}function Jn(n,t){n&1&&(Ks(0,`th`,15),YC(1,`Band`),ld())}function ei(n,t){if(n&1&&(Ks(0,`td`,16),YC(1),ld()),n&2){let e=t.$implicit;ab(),py(e.band)}}function ti(n,t){n&1&&(Ks(0,`th`,15),YC(1,`Status`),ld())}function ni(n,t){if(n&1&&(Ks(0,`td`,16),YC(1),ld()),n&2){let e=t.$implicit;ab(),py(e.displayStatus)}}function ii(n,t){n&1&&(Ks(0,`th`,15),YC(1,`Reason`),ld())}function ai(n,t){if(n&1&&(Ks(0,`td`,18),YC(1),ld()),n&2){let e=t.$implicit;ab(),md(` `,e.statusReason||`—`,` `)}}function oi(n,t){n&1&&Wm(0,`tr`,19)}function ri(n,t){n&1&&Wm(0,`tr`,20)}function li(n,t){n&1&&(Ks(0,`th`,15),YC(1,`Id`),ld())}function si(n,t){if(n&1){let e=hC();Ks(0,`td`,16)(1,`button`,21),Xm(`click`,function(){let a=jp(e).$implicit;return Bp(DC().edgeClick.emit(a))}),YC(2),ld()()}if(n&2){let e=t.$implicit;ab(2),md(` `,e.id,` `)}}function di(n,t){n&1&&(Ks(0,`th`,15),YC(1,`Kind`),ld())}function ci(n,t){if(n&1&&(Ks(0,`td`,16),YC(1),ld()),n&2){let e=t.$implicit;ab(),py(e.kind)}}function mi(n,t){n&1&&(Ks(0,`th`,15),YC(1,`Metrics`),ld())}function pi(n,t){if(n&1&&(Ks(0,`td`,16),YC(1),ld()),n&2){let e=t.$implicit;ab(),md(` `,e.instrumented?`yes`:`no data`,` `)}}function ui(n,t){n&1&&Wm(0,`tr`,19)}function gi(n,t){n&1&&Wm(0,`tr`,20)}var ze=class n{nodes=l2.required();edges=l2.required();nodeClick=u2();edgeClick=u2();nodeCols=[`label`,`band`,`status`,`reason`];edgeCols=[`id`,`kind`,`instrumented`];static ɵfac=function(e){return new(e||n)};static ɵcmp=Xn$1({type:n,selectors:[[`ao-topology-table`]],inputs:{nodes:[1,`nodes`],edges:[1,`edges`]},outputs:{nodeClick:`nodeClick`,edgeClick:`edgeClick`},decls:34,vars:6,consts:[[1,`flex`,`flex-col`,`gap-6`],[1,`mb-2`,`text-sm`,`font-medium`],[`mat-table`,``,1,`w-full`,3,`dataSource`],[`matColumnDef`,`label`],[`mat-header-cell`,``,4,`matHeaderCellDef`],[`mat-cell`,``,4,`matCellDef`],[`matColumnDef`,`band`],[`matColumnDef`,`status`],[`matColumnDef`,`reason`],[`mat-cell`,``,`class`,`text-neutral-500`,4,`matCellDef`],[`mat-header-row`,``,4,`matHeaderRowDef`],[`mat-row`,``,4,`matRowDef`,`matRowDefColumns`],[`matColumnDef`,`id`],[`matColumnDef`,`kind`],[`matColumnDef`,`instrumented`],[`mat-header-cell`,``],[`mat-cell`,``],[`type`,`button`,1,`text-left`,`underline-offset-2`,`hover:underline`,3,`click`],[`mat-cell`,``,1,`text-neutral-500`],[`mat-header-row`,``],[`mat-row`,``],[`type`,`button`,1,`font-mono`,`text-xs`,`text-left`,`underline-offset-2`,`hover:underline`,3,`click`]],template:function(e,i){e&1&&(Ks(0,`div`,0)(1,`div`)(2,`div`,1),YC(3,`Nodes`),ld(),Ks(4,`table`,2),pd(5,3),Vm(6,Qn,2,0,`th`,4)(7,Zn,3,1,`td`,5),hd(),pd(8,6),Vm(9,Jn,2,0,`th`,4)(10,ei,2,1,`td`,5),hd(),pd(11,7),Vm(12,ti,2,0,`th`,4)(13,ni,2,1,`td`,5),hd(),pd(14,8),Vm(15,ii,2,0,`th`,4)(16,ai,2,1,`td`,9),hd(),Vm(17,oi,1,0,`tr`,10)(18,ri,1,0,`tr`,11),ld()(),Ks(19,`div`)(20,`div`,1),YC(21,`Edges`),ld(),Ks(22,`table`,2),pd(23,12),Vm(24,li,2,0,`th`,4)(25,si,3,1,`td`,5),hd(),pd(26,13),Vm(27,di,2,0,`th`,4)(28,ci,2,1,`td`,5),hd(),pd(29,14),Vm(30,mi,2,0,`th`,4)(31,pi,2,1,`td`,5),hd(),Vm(32,ui,1,0,`tr`,10)(33,gi,1,0,`tr`,11),ld()()()),e&2&&(ab(4),zm(`dataSource`,i.nodes()),ab(13),zm(`matHeaderRowDef`,i.nodeCols),ab(),zm(`matRowDefColumns`,i.nodeCols),ab(4),zm(`dataSource`,i.edges()),ab(10),zm(`matHeaderRowDef`,i.edgeCols),ab(),zm(`matRowDefColumns`,i.edgeCols))},dependencies:[li$1,Zt,ei$1,ni$1,ti$1,Jt,ri$1,ii$1,oi$1,si$1,ai$1],encapsulation:2})};var hi=(n,t)=>t.aspect;function yi(n,t){if(n&1&&(Ks(0,`div`,8),Wm(1,`span`,10)(2,`mat-icon`,11),YC(3),ld()),n&2){let e=t.$implicit;ab(),ay(`background`,e.accent),ab(),ay(`color`,e.accent),zm(`svgIcon`,e.icon),ab(),md(` `,e.aspect,` `)}}var $e=class n{aspects=Object.values(mn).filter((t,e,i)=>i.findIndex(a=>a.aspect===t.aspect)===e);static ɵfac=function(e){return new(e||n)};static ɵcmp=Xn$1({type:n,selectors:[[`ao-topology-legend`]],decls:24,vars:1,consts:[[`menu`,`matMenu`],[`matButton`,``,`type`,`button`,3,`matMenuTriggerFor`],[`svgIcon`,`info`],[1,`topology-legend-menu`],[1,`flex`,`max-w-sm`,`flex-col`,`gap-2`,`px-4`,`py-3`,`text-sm`,3,`click`],[1,`font-medium`],[1,`mt-2`,`font-medium`],[1,`grid`,`grid-cols-2`,`gap-1`],[1,`flex`,`items-center`,`gap-1.5`,`text-xs`],[1,`mt-2`,`text-neutral-500`],[1,`inline-block`,`h-2`,`w-2`,`rounded-full`],[1,`!h-3.5`,`!w-3.5`,`!text-[14px]`,3,`svgIcon`]],template:function(e,i){if(e&1&&(Ks(0,`button`,1),Wm(1,`mat-icon`,2),YC(2,` Legend `),ld(),Ks(3,`mat-menu`,3,0)(5,`div`,4),Xm(`click`,function(d){return d.stopPropagation()}),Ks(6,`div`,5),YC(7,`Status`),ld(),Ks(8,`div`),YC(9,`● healthy · ▲ degraded · ✖ failed · ? unknown · ○ offline`),ld(),Ks(10,`div`,6),YC(11,`Edges`),ld(),Ks(12,`div`),YC(13,`Right-angle routes · hover animates dash toward the arrow`),ld(),Ks(14,`div`,6),YC(15,`Aspects`),ld(),Ks(16,`div`,7),aC(17,yi,4,6,`div`,8,hi),ld(),Ks(19,`div`,9),YC(20,` Uninstrumented traffic shows `),Ks(21,`em`),YC(22,`no data`),ld(),YC(23,`, never zeros. `),ld()()()),e&2)zm(`matMenuTriggerFor`,SC(4)),ab(17),cC(i.aspects)},dependencies:[Lt$1,I,Bt,lt$1,dt,yt,wt],encapsulation:2})};var _e=`Topology-dashboard`;var bi={app:{wikiKey:`app`,blurb:`Product appId group — how many Reach instances are connected under this name.`},ui:{wikiKey:`ui`,blurb:`Client or kiosk UI that connected through AO Reach.`},"overlay-source":{wikiKey:`overlay-source`,blurb:`Domain overlays the client advertised for this session.`},"local-tools":{wikiKey:`local-tools`,blurb:`MCP tools hosted on the client device and reverse-tunneled in.`},openclaw:{wikiKey:`openclaw`,blurb:`OpenClaw host that talks to the Web UI and bypasses Reach.`},"session-bridge":{wikiKey:`session-bridge`,blurb:`Reach SessionBridge carrying the authenticated client session.`},"overlay-packer":{wikiKey:`overlay-packer`,blurb:`Packs client overlays before they hit the engine overlay API.`},"local-mcp-host":{wikiKey:`local-mcp-host`,blurb:`Client-side MCP host reached via the engine reverse tunnel.`},"speech-client":{wikiKey:`speech-client`,blurb:`Reach speech client for STT/TTS against advertised sidecars.`},"mtls-enroller":{wikiKey:`mtls-enroller`,blurb:`Issues and renews client certificates for Reach↔engine mTLS.`},engine:{wikiKey:`engine`,blurb:`Engine daemon API (serve) — session, tunnel, and agent edge.`},endpoint:{wikiKey:`endpoint`,blurb:`A concrete engine or speech HTTP endpoint on the edge rank.`},"web-ui":{wikiKey:`web-ui`,blurb:`Coordinator Web UI and Admin console (NodePort 30487).`},planner:{wikiKey:`planner`,blurb:`Dynamic planner / runner that turns goals into CrewAI steps.`},catalog:{wikiKey:`catalog`,blurb:`Resolved agent, MCP, or skills catalog cluster used by planning.`},"model-backend":{wikiKey:`model-backend`,blurb:`Model backend registry that selects local or remote LLM runtimes.`},"model-runtime":{wikiKey:`model-runtime`,blurb:`A concrete model runtime such as Ollama or a remote provider.`},"execution-backend":{wikiKey:`execution-backend`,blurb:`Execution backend that runs steps (in-process, k8s, or warm pool).`},worker:{wikiKey:`worker`,blurb:`Worker pods or processes currently available to run steps.`},"mcp-sidecar":{wikiKey:`mcp-sidecar`,blurb:`MCP sidecar containers attached to workers for tool execution.`},platform:{wikiKey:`platform`,blurb:`Cluster / host platform layer (k3s node, Jetson, or NVR).`},storage:{wikiKey:`storage`,blurb:`Persistent volumes, GPU weights, and host metrics mounts.`}};var fi={"engine/session-overlay":{wikiKey:`endpoint-session-overlay`,blurb:`Engine API that applies Reach session overlays for a run.`},"engine/mcp-tunnel":{wikiKey:`endpoint-mcp-tunnel`,blurb:`Reverse tunnel endpoint that calls back into the client MCP host.`},"engine/direct-agent":{wikiKey:`endpoint-direct-agent`,blurb:`Direct-agent chat path that skips full dynamic planning.`},"engine/hello-speech":{wikiKey:`endpoint-hello-speech`,blurb:`Advertises speech (STT/TTS) capability to Reach clients.`},"engine/mtls-enrol":{wikiKey:`endpoint-mtls-enrol`,blurb:`mTLS enrollment endpoint for Reach client certificates.`},"speech/stt":{wikiKey:`speech-stt`,blurb:`Speech-to-text sidecar serving transcription requests.`},"speech/tts":{wikiKey:`speech-tts`,blurb:`Text-to-speech sidecar serving synthesis requests.`},"catalog/agents":{wikiKey:`catalog-agents`,blurb:`Cluster of agent-provider catalog entries available to the planner.`},"catalog/mcp":{wikiKey:`catalog-mcp`,blurb:`Cluster of MCP provider catalog entries available to the planner.`},"catalog/skills":{wikiKey:`catalog-skills`,blurb:`Cluster of agent-skill playbooks the planner may attach to tasks.`},"models/backends":{wikiKey:`models-backends`,blurb:`Resolved model-backend catalog used to pick LLM runtimes.`},"models/ollama":{wikiKey:`models-ollama`,blurb:`Local Ollama runtime for on-box model inference.`},"models/remote":{wikiKey:`models-remote`,blurb:`Remote LLM providers (OpenAI, Anthropic, …) when credentials exist.`}};var _i={request:{wikiKey:`edge-request`,blurb:`A request/response call path between two components.`},stream:{wikiKey:`edge-stream`,blurb:`A streaming path (WebSocket or chunked) between components.`},"reverse-tunnel":{wikiKey:`edge-reverse-tunnel`,blurb:`Engine calling back up into a Reach-hosted local MCP host.`},advertisement:{wikiKey:`edge-advertisement`,blurb:`Capability advertisement (not request traffic).`},bypass:{wikiKey:`edge-bypass`,blurb:`OpenClaw path that skips Reach and hits the Web UI directly.`}};var un={wikiKey:`topology-node`,blurb:`A live topology component reported by the current deployment.`};var gn={wikiKey:`topology-edge`,blurb:`A structural link between two topology components.`};function Ce(n){return n&&(fi[n.id]||bi[String(n.kind)])||un}function hn(n){return n&&_i[String(n.kind)]||gn}var bn=n=>[n];var wi=()=>[`#ea580c`];var ki=(n,t)=>t.id;function Si(n,t){if(n&1&&Wm(0,`ao-env-help`,3),n&2){let e=t,i=DC();zm(`key`,e.wikiKey)(`help`,e.blurb)(`wikiPage`,i.wikiPage)}}function Ci(n,t){if(n&1&&(Ks(0,`div`,5),YC(1),ld()),n&2){let e=DC();ab(),md(` `,e.data.offlineBanner,` `)}}function Ni(n,t){n&1&&(Ks(0,`p`,6),YC(1,`Loading…`),ld())}function Ti(n,t){n&1&&(Ks(0,`p`,7),YC(1),ld()),n&2&&(ab(),py(t))}function Di(n,t){n&1&&(Ks(0,`span`,13),YC(1,` · not instrumented`),ld())}function Mi(n,t){n&1&&(Ks(0,`div`,14)(1,`span`,26),YC(2,`Owned by app`),ld(),Ks(3,`div`,27),YC(4),ld()()),n&2&&(ab(4),py(t))}function Ei(n,t){if(n&1&&(Ks(0,`div`,13),YC(1),ld()),n&2){let e=DC();ab(),md(` `,e.probe?.statusReason||e.node.statusReason,` `)}}function Pi(n,t){if(n&1&&YC(0),n&2)md(` · RTT `,DC(2).latestLatency(),` ms `)}function Ii(n,t){if(n&1&&Wm(0,`apx-chart`,17),n&2){let e=DC(2);zm(`series`,e.healthChartSeries())(`chart`,e.sparkChart)(`colors`,iT(10,bn,e.accent()))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}function Ai(n,t){n&1&&(Ks(0,`div`,18),YC(1,` Waiting for live probe samples… `),ld())}function Oi(n,t){if(n&1&&(Ks(0,`div`),YC(1),Ks(2,`span`,13),YC(3),ld()()),n&2){let e=DC();ab(),md(` Cluster members: `,e.members.count,` `),ab(2),md(` — `,e.members.note)}}function Ri(n,t){n&1&&(Ks(0,`div`,13),YC(1,`Open this tab for live traffic.`),ld())}function Li(n,t){if(n&1&&(Ks(0,`div`,20)(1,`strong`),YC(2,`no data`),ld(),YC(3),ld()),n&2){let e=DC();ab(3),hy(` — related edges are not instrumented. Inbound `,e.inbound.length,` · Outbound `,e.outbound.length,`. `)}}function Bi(n,t){if(n&1&&(Ks(0,`div`,15)(1,`div`,16),YC(2,` Live rate (events/s) · websocket `),ld(),Wm(3,`apx-chart`,17),ld(),Ks(4,`div`,15)(5,`div`,16),YC(6,` Latency p95 (ms) `),ld(),Wm(7,`apx-chart`,17),ld()),n&2){let e=DC(2);ab(3),zm(`series`,e.trafficRateSeries())(`chart`,e.sparkChart)(`colors`,iT(20,bn,e.accent()))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid),ab(4),zm(`series`,e.trafficLatencySeries())(`chart`,e.sparkChart)(`colors`,oT(22,wi))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}function Fi(n,t){if(n&1&&(Ks(0,`li`),YC(1),ld()),n&2){let e=t.$implicit;ab(),hy(``,e.id,` · `,e.kind)}}function Ki(n,t){if(n&1&&(Ks(0,`li`),YC(1),ld()),n&2){let e=t.$implicit;ab(),py(e)}}function Hi(n,t){if(n&1&&(Ks(0,`ul`,21),aC(1,Ki,2,1,`li`,null,sC),ld(),Ks(3,`a`,28),YC(4,` Open All settings `),ld()),n&2){let e=DC();ab(),cC(e.configKeys),ab(2),zm(`mat-dialog-close`,!0)}}function Gi(n,t){n&1&&(Ks(0,`span`,13),YC(1,`No linked config keys`),ld())}function Vi(n,t){if(n&1){let e=hC();Ks(0,`mat-tab-group`,10),Xm(`selectedIndexChange`,function(a){jp(e);return Bp(DC().onTab(a))}),Ks(1,`mat-tab`,11)(2,`div`,12)(3,`div`),YC(4,` Status: `),Ks(5,`strong`),YC(6),ld(),oC(7,Di,2,0,`span`,13),ld(),oC(8,Mi,5,1,`div`,14),oC(9,Ei,2,1,`div`,13),Ks(10,`div`,13),YC(11),oC(12,Pi,1,1),ld(),Ks(13,`div`,15)(14,`div`,16),YC(15,` Health monitor (probe latency) `),ld(),oC(16,Ii,1,12,`apx-chart`,17)(17,Ai,2,0,`div`,18),ld(),oC(18,Oi,4,2,`div`),ld()(),Ks(19,`mat-tab`,19)(20,`div`,12),oC(21,Ri,2,0,`div`,13)(22,Li,4,2,`div`,20)(23,Bi,8,23),Ks(24,`div`),YC(25),ld(),Ks(26,`ul`,21),aC(27,Fi,2,2,`li`,null,ki),ld()()(),Ks(29,`mat-tab`,22)(30,`div`,23),oC(31,Hi,5,1)(32,Gi,2,0,`span`,13),ld()(),Ks(33,`mat-tab`,24)(34,`div`,23)(35,`div`),YC(36,` Log source: `),Ks(37,`code`),YC(38),ld()(),Ks(39,`a`,25),YC(40,` Open Overview logs `),ld()()()()}if(n&2){let e,i=t,a=DC();ab(6),py(a.liveStatus()||i.node.status),ab(),iC(i.probe?.instrumented?-1:7),ab(),iC((e=a.ownerLabel(i))?8:-1,e),ab(),iC(i.probe?.statusReason||i.node.statusReason?9:-1),ab(2),md(` Last probe: `,i.probe?.lastProbeAt||`—`,` `),ab(),iC(a.latestLatency()!=null?12:-1),ab(4),iC(a.healthSeries().length?16:17),ab(2),iC(i.members?18:-1),ab(3),iC(a.trafficActive()?a.trafficInstrumented()?23:22:21),ab(4),hy(`Inbound: `,i.inbound.length,` · Outbound: `,i.outbound.length),ab(2),cC(i.outbound),ab(4),iC(i.configKeys?.length?31:32),ab(7),py(i.logSource||`web`),ab(),zm(`mat-dialog-close`,!0)}}var qe=class n{data=h($e$1);ref=h(T);api=h(d);live=h(U);loading=Lt(!0);error=Lt(null);detail=Lt(null);liveStatus=Lt(null);healthSeries=Lt([]);trafficRate=Lt([]);trafficLatency=Lt([]);trafficActive=Lt(!1);trafficInstrumented=Lt(!1);wikiPage=_e;accent=yT(()=>{let t=this.detail()?.node;return Se(t?.kind||`engine`,t?.band).accent});wikiHelp=yT(()=>{let t=this.detail()?.node;return t?Ce(t):Ce({id:this.data.nodeId,kind:`endpoint`})});latestLatency=yT(()=>{let t=this.healthSeries(),e=t.length?t[t.length-1]:null;return e?.y==null?null:Math.round(Number(e.y))});sparkChart={type:`area`,height:120,animations:{enabled:!1},toolbar:{show:!1},zoom:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`};sparkStroke={curve:`smooth`,width:2};sparkFill={type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.35,opacityTo:.05}};sparkTooltip={x:{format:`HH:mm:ss`}};sparkXaxis={type:`datetime`,labels:{datetimeUTC:!1,style:{fontSize:`10px`}},axisBorder:{show:!1}};sparkYaxis={labels:{style:{fontSize:`10px`}},min:0};sparkGrid={borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:4,right:4}};noDataLabels={enabled:!1};sub=null;watching=!1;trafficWatch=!1;ngOnInit(){this.api.topologyNode(this.data.nodeId).subscribe(t=>{if(this.loading.set(!1),!t.ok){this.error.set(t.message);return}this.detail.set(t.data)}),this.live.subscribeTopologyWatch(`node`,this.data.nodeId),this.watching=!0,this.sub=this.live.topologyEvents.subscribe(t=>{(t.type===`topology_watch_snapshot`||t.type===`topology_watch_tick`)&&t.target===`node`&&t.id===this.data.nodeId&&this.applyWatch(t)}),this.ref.afterClosed().subscribe(()=>this.teardown())}ngOnDestroy(){this.teardown()}onTab(t){t===1?(this.trafficActive.set(!0),this.trafficWatch=!0):this.trafficWatch&&this.trafficActive.set(!1)}ownerLabel(t){let e=t.ownedByApps?.length?t.ownedByApps:t.node.ownedByApps?.length?t.node.ownedByApps:t.node.appId?[t.node.appId]:[];return e.length?t.node.band===`application`&&t.node.kind===`app`||t.node.band===`reach`||t.node.band===`ao`?e.join(`, `):t.node.band===`application`&&t.node.appId?t.node.appId:null:null}healthChartSeries(){return[{name:`latency ms`,data:this.healthSeries()}]}trafficRateSeries(){return[{name:`rate`,data:this.trafficRate()}]}trafficLatencySeries(){return[{name:`p95 ms`,data:this.trafficLatency()}]}applyWatch(t){let e=t.latest;e?.status&&this.liveStatus.set(String(e.status));let i=t.health||[];i.length&&this.healthSeries.set(i);let a=t.series;a?.latencyMs?.length&&!i.length&&this.healthSeries.set(a.latencyMs);let d=a?.rate||[],f=a?.latencyP95||[];this.trafficRate.set(d),this.trafficLatency.set(f),this.trafficInstrumented.set(!!t.instrumented&&(d.length>0||f.length>0))}teardown(){this.sub?.unsubscribe(),this.sub=null,this.watching&&(this.live.unsubscribeTopologyWatch(`node`,this.data.nodeId),this.watching=!1)}static ɵfac=function(e){return new(e||n)};static ɵcmp=Xn$1({type:n,selectors:[[`ao-node-detail-dialog`]],decls:13,vars:6,consts:[[`mat-dialog-title`,``,1,`flex`,`items-center`,`gap-2`],[1,`inline-block`,`h-2.5`,`w-2.5`,`rounded-full`],[1,`flex-auto`],[3,`key`,`help`,`wikiPage`],[1,`min-w-[340px]`,`max-w-lg`],[1,`mb-3`,`rounded-lg`,`border`,`border-amber-300`,`bg-amber-50`,`px-3`,`py-2`,`text-sm`,`text-amber-900`,`dark:border-amber-700`,`dark:bg-amber-950`,`dark:text-amber-100`],[1,`text-sm`,`text-neutral-500`],[1,`text-sm`,`text-red-600`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[3,`selectedIndexChange`],[`label`,`Health`],[1,`flex`,`flex-col`,`gap-3`,`py-3`,`text-sm`],[1,`text-neutral-500`],[1,`rounded-lg`,`border`,`border-teal-200`,`bg-teal-50`,`px-3`,`py-2`,`text-teal-950`,`dark:border-teal-800`,`dark:bg-teal-950`,`dark:text-teal-100`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-2`,`pt-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`mb-1`,`px-1`,`text-xs`,`text-neutral-500`],[3,`series`,`chart`,`colors`,`stroke`,`fill`,`tooltip`,`xaxis`,`yaxis`,`dataLabels`,`grid`],[1,`px-2`,`pb-3`,`text-xs`,`text-neutral-500`],[`label`,`Traffic`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`font-mono`,`text-xs`],[`label`,`Config`],[1,`flex`,`flex-col`,`gap-2`,`py-3`,`text-sm`],[`label`,`Logs`],[`matButton`,``,`routerLink`,`/overview`,3,`mat-dialog-close`],[1,`text-xs`,`uppercase`,`tracking-wide`,`text-teal-700`,`dark:text-teal-300`],[1,`mt-0.5`,`font-medium`],[`matButton`,``,`routerLink`,`/settings`,3,`mat-dialog-close`]],template:function(e,i){if(e&1&&(Ks(0,`h2`,0),Wm(1,`span`,1),Ks(2,`span`,2),YC(3),ld(),oC(4,Si,1,3,`ao-env-help`,3),ld(),Ks(5,`mat-dialog-content`,4),oC(6,Ci,2,1,`div`,5),oC(7,Ni,2,0,`p`,6)(8,Ti,2,1,`p`,7)(9,Vi,41,14,`mat-tab-group`),ld(),Ks(10,`mat-dialog-actions`,8)(11,`button`,9),YC(12,`Close`),ld()()),e&2){let a,d;ab(),ay(`background`,i.accent()),ab(2),py(i.detail()?.node?.label||i.data.nodeId),ab(),iC((a=i.wikiHelp())?4:-1,a),ab(2),iC(i.data.offlineBanner?6:-1),ab(),iC(i.loading()?7:(d=i.error())?8:(d=i.detail())?9:-1,d)}},dependencies:[Ht,Bt$1,jt,zt,Vt,lt$1,dt,hn$1,Re,bn$1,Dt,ge,he,w],encapsulation:2})};var zi=()=>[`#2563eb`];var $i=()=>[`#ea580c`];function Wi(n,t){if(n&1&&YC(0),n&2)md(` · :`,DC().data.edge.port,` `)}function qi(n,t){n&1&&(Ks(0,`div`,10),YC(1,` This edge is not instrumented — health is structural only. `),ld())}function Xi(n,t){if(n&1&&YC(0),n&2)md(` Latency p95 `,DC(2).latest()?.latencyP95,` ms `)}function ji(n,t){if(n&1&&YC(0),n&2)md(` · error rate `,((DC(2).latest()?.errorRate||0)*100).toFixed(0),`% `)}function Yi(n,t){if(n&1&&(Ks(0,`div`,10),oC(1,Xi,1,1),oC(2,ji,1,1),ld()),n&2){let e=DC();ab(),iC(e.latest()?.latencyP95!=null?1:-1),ab(),iC(e.latest()?.errorRate!=null?2:-1)}}function Ui(n,t){n&1&&(Ks(0,`div`,10),YC(1,`Open this tab for live traffic.`),ld())}function Qi(n,t){n&1&&(Ks(0,`div`,13)(1,`strong`),YC(2,`no data`),ld(),YC(3,` — this edge is not instrumented. `),ld())}function Zi(n,t){if(n&1&&(Ks(0,`div`,16)(1,`div`,17),YC(2,` Live rate (events/s) `),ld(),Wm(3,`apx-chart`,18),ld(),Ks(4,`div`,16)(5,`div`,17),YC(6,`Latency p95 (ms)`),ld(),Wm(7,`apx-chart`,18),ld()),n&2){let e=DC();ab(3),zm(`series`,e.rateSeries())(`chart`,e.sparkChart)(`colors`,oT(20,zi))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid),ab(4),zm(`series`,e.latencySeries())(`chart`,e.sparkChart)(`colors`,oT(21,$i))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}var Xe=class n{data=h($e$1);ref=h(T);live=h(U);wikiPage=_e;wikiHelp=hn(this.data.edge);instrumented=Lt(!!this.data.edge.instrumented);liveStatus=Lt(null);latest=Lt(null);ratePts=Lt([]);latencyPts=Lt([]);trafficActive=Lt(!1);sparkChart={type:`area`,height:120,animations:{enabled:!1},toolbar:{show:!1},zoom:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`};sparkStroke={curve:`smooth`,width:2};sparkFill={type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.35,opacityTo:.05}};sparkTooltip={x:{format:`HH:mm:ss`}};sparkXaxis={type:`datetime`,labels:{datetimeUTC:!1,style:{fontSize:`10px`}},axisBorder:{show:!1}};sparkYaxis={labels:{style:{fontSize:`10px`}},min:0};sparkGrid={borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:4,right:4}};noDataLabels={enabled:!1};sub=null;watching=!1;ngOnInit(){this.live.subscribeTopologyWatch(`edge`,this.data.edge.id),this.watching=!0,this.sub=this.live.topologyEvents.subscribe(t=>{(t.type===`topology_watch_snapshot`||t.type===`topology_watch_tick`)&&t.target===`edge`&&t.id===this.data.edge.id&&this.applyWatch(t)}),this.ref.afterClosed().subscribe(()=>this.teardown())}ngOnDestroy(){this.teardown()}onTab(t){this.trafficActive.set(t===1)}rateSeries(){return[{name:`rate`,data:this.ratePts()}]}latencySeries(){return[{name:`p95 ms`,data:this.latencyPts()}]}applyWatch(t){this.instrumented.set(!!t.instrumented);let e=t.latest;this.latest.set(e),e?.errorRate!=null&&e.errorRate>.2?this.liveStatus.set(`failing`):e&&this.liveStatus.set(`ok`);let i=t.series;i?.rate&&this.ratePts.set(i.rate),i?.latencyP95&&this.latencyPts.set(i.latencyP95)}teardown(){this.sub?.unsubscribe(),this.sub=null,this.watching&&(this.live.unsubscribeTopologyWatch(`edge`,this.data.edge.id),this.watching=!1)}static ɵfac=function(e){return new(e||n)};static ɵcmp=Xn$1({type:n,selectors:[[`ao-edge-detail-dialog`]],decls:29,vars:12,consts:[[`mat-dialog-title`,``,1,`flex`,`items-center`,`gap-2`],[1,`flex-auto`],[3,`key`,`help`,`wikiPage`],[1,`min-w-[320px]`,`max-w-lg`,`text-sm`],[1,`font-mono`,`text-xs`,`break-all`],[1,`mt-2`],[1,`mt-1`,`text-neutral-500`],[1,`mt-3`,3,`selectedIndexChange`],[`label`,`Health`],[1,`flex`,`flex-col`,`gap-2`,`py-3`],[1,`text-neutral-500`],[`label`,`Traffic`],[1,`flex`,`flex-col`,`gap-3`,`py-3`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-2`,`pt-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`mb-1`,`px-1`,`text-xs`,`text-neutral-500`],[3,`series`,`chart`,`colors`,`stroke`,`fill`,`tooltip`,`xaxis`,`yaxis`,`dataLabels`,`grid`]],template:function(e,i){e&1&&(Ks(0,`h2`,0)(1,`span`,1),YC(2,`Edge`),ld(),Wm(3,`ao-env-help`,2),ld(),Ks(4,`mat-dialog-content`,3)(5,`div`,4),YC(6),ld(),Ks(7,`div`,5),YC(8),ld(),Ks(9,`div`,6),YC(10),oC(11,Wi,1,1),ld(),Ks(12,`mat-tab-group`,7),Xm(`selectedIndexChange`,function(d){return i.onTab(d)}),Ks(13,`mat-tab`,8)(14,`div`,9)(15,`div`),YC(16,` Status: `),Ks(17,`strong`),YC(18),ld()(),oC(19,qi,2,0,`div`,10)(20,Yi,3,2,`div`,10),ld()(),Ks(21,`mat-tab`,11)(22,`div`,12),oC(23,Ui,2,0,`div`,10)(24,Qi,4,0,`div`,13)(25,Zi,8,22),ld()()()(),Ks(26,`mat-dialog-actions`,14)(27,`button`,15),YC(28,`Close`),ld()()),e&2&&(ab(3),zm(`key`,i.wikiHelp.wikiKey)(`help`,i.wikiHelp.blurb)(`wikiPage`,i.wikiPage),ab(3),py(i.data.edge.id),ab(2),hy(``,i.data.edge.from,` → `,i.data.edge.to),ab(2),hy(` kind `,i.data.edge.kind,` · `,i.data.edge.protocol||`—`,` `),ab(),iC(i.data.edge.port?11:-1),ab(7),py(i.liveStatus()||i.data.edge.status||`unknown`),ab(),iC(i.instrumented()?20:19),ab(4),iC(i.trafficActive()?i.instrumented()?25:24:23))},dependencies:[Ht,Bt$1,jt,zt,Vt,lt$1,dt,hn$1,Re,bn$1,ge,he,w],encapsulation:2})};var Ji=(n,t)=>t[0];function ea(n,t){n&1&&(Ks(0,`div`,4)(1,`span`,10),YC(2,`Owned by app`),ld(),Ks(3,`div`,11),YC(4),ld()()),n&2&&(ab(4),py(t))}function ta(n,t){if(n&1&&(Ks(0,`li`),YC(1),ld()),n&2){let e=t.$implicit;ab(),hy(``,e[0],`: `,e[1])}}function na(n,t){if(n&1&&(Ks(0,`ul`,5),aC(1,ta,2,2,`li`,null,Ji),ld()),n&2){let e=DC();ab(),cC(e.breakdownEntries(t))}}var je=class n{data=h($e$1);wikiPage=_e;wikiHelp=Ce(this.data.node);breakdownEntries(t){return Object.entries(t)}ownerLabel(){let t=this.data.node.ownedByApps||[];return t.length?t.join(`, `):null}catalogLink(){let t=this.data.node.id;return t.includes(`mcp`)?`/capabilities/mcp`:t.includes(`skill`)?`/capabilities/skills`:`/capabilities/agents`}static ɵfac=function(e){return new(e||n)};static ɵcmp=Xn$1({type:n,selectors:[[`ao-cluster-dialog`]],decls:16,vars:9,consts:[[`mat-dialog-title`,``,1,`flex`,`items-center`,`gap-2`],[1,`flex-auto`],[3,`key`,`help`,`wikiPage`],[1,`text-sm`],[1,`mt-2`,`rounded-lg`,`border`,`border-teal-200`,`bg-teal-50`,`px-3`,`py-2`,`text-teal-950`,`dark:border-teal-800`,`dark:bg-teal-950`,`dark:text-teal-100`],[1,`mt-2`,`text-neutral-500`],[1,`mt-3`,`text-neutral-500`],[`matButton`,``,1,`mt-2`,3,`routerLink`,`mat-dialog-close`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[1,`text-xs`,`uppercase`,`tracking-wide`,`text-teal-700`,`dark:text-teal-300`],[1,`mt-0.5`,`font-medium`]],template:function(e,i){if(e&1&&(Ks(0,`h2`,0)(1,`span`,1),YC(2),ld(),Wm(3,`ao-env-help`,2),ld(),Ks(4,`mat-dialog-content`,3)(5,`div`),YC(6),ld(),oC(7,ea,5,1,`div`,4),oC(8,na,3,0,`ul`,5),Ks(9,`p`,6),YC(10,` Members are not expanded on the canvas. Open Capabilities for the full catalog list. `),ld(),Ks(11,`a`,7),YC(12,` Open Capabilities `),ld()(),Ks(13,`mat-dialog-actions`,8)(14,`button`,9),YC(15,`Close`),ld()()),e&2){let a,d;ab(2),md(``,i.data.node.label,` cluster`),ab(),zm(`key`,i.wikiHelp.wikiKey)(`help`,i.wikiHelp.blurb)(`wikiPage`,i.wikiPage),ab(3),md(`Count: `,i.data.node.count??0),ab(),iC((a=i.ownerLabel())?7:-1,a),ab(),iC((d=i.data.node.breakdown)?8:-1,d),ab(3),zm(`routerLink`,i.catalogLink())(`mat-dialog-close`,!0)}},dependencies:[Ht,Bt$1,jt,zt,Vt,lt$1,dt,Dt,w],encapsulation:2})};function ia(n,t){n&1&&YC(0,` Paused `)}function aa(n,t){if(n&1&&YC(0),n&2)md(` Not live — snapshot `,DC().generatedAtLabel()||``,` `)}function oa(n,t){if(n&1&&YC(0),n&2)md(` Live · `,DC().generatedAtLabel()||`…`,` `)}function ra(n,t){n&1&&YC(0,` Reconnecting… `)}function la(n,t){if(n&1&&(Ks(0,`div`),YC(1),ld()),n&2){let e=t.$implicit;ab(),py(e)}}function sa(n,t){if(n&1&&(Ks(0,`div`,8),aC(1,la,2,1,`div`,null,sC),ld()),n&2){let e=DC();ab(),cC(e.store.notes())}}function da(n,t){n&1&&Wm(0,`ao-error-state`,17),n&2&&zm(`message`,t)}function ca(n,t){n&1&&(Ks(0,`div`,16),YC(1,`Loading topology…`),ld())}function ma(n,t){n&1&&(Ks(0,`p`,16),YC(1,` Diagram needs a wider screen — showing table view. `),ld())}function pa(n,t){if(n&1){let e=hC();oC(0,ma,2,0,`p`,16),Ks(1,`ao-topology-table`,19),Xm(`nodeClick`,function(a){jp(e);return Bp(DC().openNode(a))})(`edgeClick`,function(a){jp(e);return Bp(DC().openEdge(a))}),ld()}if(n&2){let e=DC();iC(e.forceTable()&&!e.store.tableMode()?0:-1),ab(),zm(`nodes`,e.store.displayNodes())(`edges`,e.store.displayEdges())}}function ua(n,t){if(n&1){let e=hC();Ks(0,`ao-topology-canvas`,20),Xm(`hover`,function(a){jp(e);return Bp(DC().onHover(a))})(`nodeClick`,function(a){jp(e);return Bp(DC().openNode(a))})(`edgeClick`,function(a){jp(e);return Bp(DC().openEdge(a))}),ld()}if(n&2){let e=DC();zm(`layout`,e.store.layout())(`nodes`,e.store.displayNodes())(`edges`,e.store.displayEdges())(`closure`,e.store.hoverClosure())(`blurred`,e.dialogOpen())(`summary`,e.a11ySummary())}}function ga(n){let t=String(n||``).trim();if(!t)return``;let e=new Date(t);return Number.isNaN(e.getTime())?t:new Intl.DateTimeFormat(void 0,{dateStyle:`medium`,timeStyle:`short`}).format(e)}var fn=class n{store=h(ke);live=h(U);dialog=h(ee);forceTable=Lt(typeof window<`u`?window.innerWidth<=1023:!1);dialogOpen=Lt(!1);hoverTimer=null;a11ySummary=yT(()=>{return`Topology with ${this.store.displayNodes().length} nodes, ${this.store.unhealthyCount()} unhealthy. ${this.store.notes().join(`. `)}`});generatedAtLabel=yT(()=>ga(this.store.generatedAt()));ngOnInit(){this.store.start()}ngOnDestroy(){this.store.stop(),this.hoverTimer&&clearTimeout(this.hoverTimer)}onResize(){this.forceTable.set(window.innerWidth<=1023)}onHover(t){if(this.hoverTimer&&clearTimeout(this.hoverTimer),t==null){this.store.setHover(null);return}this.hoverTimer=setTimeout(()=>this.store.setHover(t),60)}openNode(t){if(t.count!=null&&t.count>0&&t.kind===`catalog`){this.dialogOpen.set(!0),this.dialog.open(je,{data:{node:t},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1));return}let e=this.store.displayNodes().some(a=>a.id===t.id);this.dialogOpen.set(!0),this.dialog.open(qe,{data:{nodeId:t.id,offlineBanner:e?null:`This component went offline at ${new Date().toLocaleTimeString()}`},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1))}openEdge(t){this.dialogOpen.set(!0),this.dialog.open(Xe,{data:{edge:t},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1))}static ɵfac=function(e){return new(e||n)};static ɵcmp=Xn$1({type:n,selectors:[[`ao-topology-page`]],hostBindings:function(e,i){e&1&&Xm(`resize`,function(){return i.onResize()},EI)},features:[Ey([ke])],decls:42,vars:23,consts:[[1,`mx-auto`,`flex`,`h-full`,`w-full`,`max-w-[1600px]`,`flex-auto`,`flex-col`,`gap-3`,`p-4`,`sm:p-6`,`lg:px-8`,`lg:pt-8`],[1,`flex`,`flex-wrap`,`items-start`,`justify-between`,`gap-3`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex`,`flex-wrap`,`items-center`,`gap-2`],[1,`rounded-full`,`px-2.5`,`py-1`,`text-xs`,`font-medium`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[`svgIcon`,`refresh-cw`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`text-sm`,`text-neutral-600`,`dark:border-neutral-700`,`dark:bg-neutral-900`,`dark:text-neutral-300`],[1,`flex`,`flex-wrap`,`items-center`,`gap-3`],[`aria-label`,`Band filter`,3,`change`,`value`],[`value`,`all`],[`value`,`application`],[`value`,`reach`],[`value`,`ao`],[3,`change`,`checked`],[1,`text-sm`,`text-neutral-500`],[3,`message`],[1,`min-h-[520px]`,`flex-auto`,3,`layout`,`nodes`,`edges`,`closure`,`blurred`,`summary`],[3,`nodeClick`,`edgeClick`,`nodes`,`edges`],[1,`min-h-[520px]`,`flex-auto`,3,`hover`,`nodeClick`,`edgeClick`,`layout`,`nodes`,`edges`,`closure`,`blurred`,`summary`]],template:function(e,i){if(e&1&&(Ks(0,`div`,0)(1,`div`,1)(2,`div`)(3,`div`,2),YC(4,` Topology `),ld(),Ks(5,`div`,3),YC(6,` Live deployment graph — what is present now, not a docs diagram `),ld()(),Ks(7,`div`,4)(8,`span`,5),oC(9,ia,1,0)(10,aa,1,1)(11,oa,1,1)(12,ra,1,0),ld(),Ks(13,`button`,6),Xm(`click`,function(){return i.store.togglePause()}),YC(14),ld(),Ks(15,`button`,6),Xm(`click`,function(){return i.store.resync()}),Wm(16,`mat-icon`,7),YC(17,` Refresh `),ld(),Wm(18,`ao-topology-legend`),ld()(),oC(19,sa,3,0,`div`,8),Ks(20,`div`,9)(21,`mat-button-toggle-group`,10),Xm(`change`,function(d){return i.store.bandFilter.set(d.value)}),Ks(22,`mat-button-toggle`,11),YC(23,`All bands`),ld(),Ks(24,`mat-button-toggle`,12),YC(25,`App`),ld(),Ks(26,`mat-button-toggle`,13),YC(27,`Reach`),ld(),Ks(28,`mat-button-toggle`,14),YC(29,`AO`),ld()(),Ks(30,`mat-slide-toggle`,15),Xm(`change`,function(d){return i.store.onlyUnhealthy.set(d.checked)}),YC(31,` Only unhealthy `),ld(),Ks(32,`mat-slide-toggle`,15),Xm(`change`,function(d){return i.store.showNotDeployed.set(d.checked)}),YC(33,` Show not deployed `),ld(),Ks(34,`mat-slide-toggle`,15),Xm(`change`,function(d){return i.store.tableMode.set(d.checked)}),YC(35,` Table view `),ld(),Ks(36,`span`,16),YC(37),ld()(),oC(38,da,1,1,`ao-error-state`,17),oC(39,ca,2,0,`div`,16)(40,pa,2,3)(41,ua,1,6,`ao-topology-canvas`,18),ld()),e&2){let a;ab(8),fa(`bg-emerald-100`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly())(`text-emerald-800`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly())(`bg-amber-100`,i.store.snapshotOnly()||i.store.paused())(`text-amber-900`,i.store.snapshotOnly()||i.store.paused())(`dark:bg-emerald-950`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly())(`dark:text-emerald-200`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly()),ab(),iC(i.store.paused()?9:i.store.snapshotOnly()?10:i.live.connected()?11:12),ab(5),md(` `,i.store.paused()?`Resume`:`Pause`,` `),ab(5),iC(i.store.notes().length?19:-1),ab(2),zm(`value`,i.store.bandFilter()),ab(9),zm(`checked`,i.store.onlyUnhealthy()),ab(2),zm(`checked`,i.store.showNotDeployed()),ab(2),zm(`checked`,i.store.tableMode()||i.forceTable()),ab(3),hy(` `,i.store.unhealthyCount(),` unhealthy · `,i.store.displayNodes().length,` nodes `),ab(),iC((a=i.store.lastError())?38:-1,a),ab(),iC(i.store.loading()?39:i.store.tableMode()||i.forceTable()?40:41)}},dependencies:[lt$1,dt,Dt$1,bt,nt$1,Ht,yt,wt,tn,Ze,Lt$1,I$1,Ve,ze,$e],encapsulation:2})};export{fn as TopologyPage};