import{$t as Xy,At as Sm,Ct as Rd,Dt as Rw,Et as Rv,Gt as Vi,H as Ir,Hr as tT,Ht as Ul,I as Hl,Jt as WS,Kt as Vm,Mn as dl,Mr as ql,Nn as dm,Pn as eG,Pr as qr,Qn as hC,Qr as v,Rr as sC,Rt as Ty,S as Dw,St as R,U as It$1,Un as fm,Ur as ta,Ut as V,V as Im,Vr as tH,W as JV,Wr as tg,Xn as gw,Yt as W_,Z as L,Zn as h,Zr as uy,_i as ye,a as Ae,ai as vw,b as Da,bn as av,br as mw,c as Aw,ci as wm,cr as jw,dn as _m,dt as Od,ei as vS,fi as xe$1,fn as _p,ft as Om,gi as yT,gt as Q,h as CC,ht as Pw,jn as de,jt as Sn,k as Fw,kr as pm,ln as _T,lt as O,mi as yC,n as $S,ni as vf,nr as im,o as Ah,or as jn,pr as ls,pt as Ow,qr as uD,r as $l,ri as vm,rn as Yw,rt as Lw,sr as js,tr as ie,tt as Ls,u as Bl,ur as km,v as DC,vi as yi$1,vr as mI,wi as zn,wr as oH,wt as Rn,xr as nH,yi as yw,yr as mm,yt as Qs}from"./chunk-BKuU67Ve.js";import{c as N,l as wt$1,t as Dt$1,u as yt$1,w as Lt}from"./main-BU2LHH6P.js";import{n as I,r as w,t as A}from"./chunk-D44MjCCg.js";import{t as l}from"./chunk-Chq-Sr3x.js";import{n as dt,r as lt,t as Z}from"./chunk-CvDS5BCF.js";import{t as m}from"./chunk-OUjubrDb.js";import"./chunk-b-CykK3L.js";import"./chunk-DDK6Q_O8.js";import"./chunk-Dhf_pMfa.js";import{i as Lt$1,n as G,r as I$1,t as Bt}from"./chunk-5hTklRp-.js";import{l as xe$2}from"./chunk-CPPTph-4.js";import"./chunk-CFnw-i3R.js";import{t as I$2}from"./chunk-BSoSlnqR.js";var St=[`*`,[[`mat-chip-avatar`],[``,`matChipAvatar`,``]],[[`mat-chip-trailing-icon`],[``,`matChipRemove`,``],[``,`matChipTrailingIcon`,``]]];var xt=[`*`,`mat-chip-avatar, [matChipAvatar]`,`mat-chip-trailing-icon,[matChipRemove],[matChipTrailingIcon]`];function Ht(a,n){a&1&&(Ls(0,`span`,3),Ow(1,1),Hl())}function Vt(a,n){a&1&&(Ls(0,`span`,6),Ow(1,2),Hl())}function jt(a,n){a&1&&(Ls(0,`span`,3),Ow(1,1),Ls(2,`span`,7),_p(),Ls(3,`svg`,8),fm(4,`path`,9),Hl()()())}function Gt(a,n){a&1&&(Ls(0,`span`,6),Ow(1,2),Hl())}var qt=`.mdc-evolution-chip,
.mdc-evolution-chip__cell,
.mdc-evolution-chip__action {
  display: inline-flex;
  align-items: center;
}

.mdc-evolution-chip {
  position: relative;
  max-width: 100%;
}

.mdc-evolution-chip__cell,
.mdc-evolution-chip__action {
  height: 100%;
}

.mdc-evolution-chip__cell--primary {
  flex-basis: 100%;
  overflow-x: hidden;
}

.mdc-evolution-chip__cell--trailing {
  flex: 1 0 auto;
}

.mdc-evolution-chip__action {
  align-items: center;
  background: none;
  border: none;
  box-sizing: content-box;
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  outline: none;
  padding: 0;
  text-decoration: none;
  color: inherit;
}

.mdc-evolution-chip__action--presentational {
  cursor: auto;
}

.mdc-evolution-chip--disabled,
.mdc-evolution-chip__action:disabled {
  pointer-events: none;
}
@media (forced-colors: active) {
  .mdc-evolution-chip--disabled,
  .mdc-evolution-chip__action:disabled {
    forced-color-adjust: none;
  }
}

.mdc-evolution-chip__action--primary {
  font: inherit;
  letter-spacing: inherit;
  white-space: inherit;
  overflow-x: hidden;
}
.mat-mdc-standard-chip .mdc-evolution-chip__action--%NS%primary::before {
  border-width: var(--%NS%mat-chip-outline-width, 1px);
  border-radius: var(--%NS%mat-chip-container-shape-radius, 8px);
  box-sizing: border-box;
  content: "";
  height: 100%;
  left: 0;
  position: absolute;
  pointer-events: none;
  top: 0;
  width: 100%;
  z-index: 1;
  border-style: solid;
}
.mat-mdc-standard-chip .mdc-evolution-chip__action--primary {
  padding-left: 12px;
  padding-right: 12px;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 12px;
}
[dir=rtl] .mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__action--primary {
  padding-left: 12px;
  padding-right: 0;
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__action--%NS%primary::before {
  border-color: var(--%NS%mat-chip-outline-color, var(--%NS%mat-sys-outline));
}
.mdc-evolution-chip__action--%NS%primary:not(.mdc-evolution-chip__action--presentational):not(.mdc-ripple-upgraded):focus::before {
  border-color: var(--%NS%mat-chip-focus-outline-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled .mdc-evolution-chip__action--%NS%primary::before {
  border-color: var(--%NS%mat-chip-disabled-outline-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
.mat-mdc-standard-chip.mdc-evolution-chip--selected .mdc-evolution-chip__action--%NS%primary::before {
  border-width: var(--%NS%mat-chip-flat-selected-outline-width, 0);
}
.mat-mdc-basic-chip .mdc-evolution-chip__action--primary {
  font: inherit;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 12px;
}
[dir=rtl] .mat-mdc-standard-chip.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--primary {
  padding-left: 12px;
  padding-right: 0;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 12px;
  padding-right: 0;
}
[dir=rtl] .mat-mdc-standard-chip.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 12px;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-leading-action.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 0;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 0;
}
[dir=rtl] .mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 0;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 12px;
}
[dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__action--primary {
  padding-left: 12px;
  padding-right: 0;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 0;
}
[dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 0;
}

.mdc-evolution-chip__action--secondary {
  position: relative;
  overflow: visible;
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__action--secondary {
  color: var(--%NS%mat-chip-with-trailing-icon-trailing-icon-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled .mdc-evolution-chip__action--secondary {
  color: var(--%NS%mat-chip-with-trailing-icon-disabled-trailing-icon-color, var(--%NS%mat-sys-on-surface));
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--secondary, .mat-mdc-standard-chip.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--secondary {
  padding-left: 8px;
  padding-right: 8px;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--secondary, .mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--secondary {
  padding-left: 8px;
  padding-right: 8px;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--secondary, .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--secondary {
  padding-left: 8px;
  padding-right: 8px;
}
[dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--secondary, [dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--secondary {
  padding-left: 8px;
  padding-right: 8px;
}

.mdc-evolution-chip__text-label {
  -webkit-user-select: none;
  user-select: none;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.mat-mdc-standard-chip .mdc-evolution-chip__text-label {
  font-family: var(--%NS%mat-chip-label-text-font, var(--%NS%mat-sys-label-large-font));
  line-height: var(--%NS%mat-chip-label-text-line-height, var(--%NS%mat-sys-label-large-line-height));
  font-size: var(--%NS%mat-chip-label-text-size, var(--%NS%mat-sys-label-large-size));
  font-weight: var(--%NS%mat-chip-label-text-weight, var(--%NS%mat-sys-label-large-weight));
  letter-spacing: var(--%NS%mat-chip-label-text-tracking, var(--%NS%mat-sys-label-large-tracking));
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__text-label {
  color: var(--%NS%mat-chip-label-text-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-standard-chip.mdc-evolution-chip--%NS%selected:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__text-label {
  color: var(--%NS%mat-chip-selected-label-text-color, var(--%NS%mat-sys-on-secondary-container));
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled .mdc-evolution-chip__text-label, .mat-mdc-standard-chip.mdc-evolution-chip--selected.mdc-evolution-chip--disabled .mdc-evolution-chip__text-label {
  color: var(--%NS%mat-chip-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}

.mdc-evolution-chip__graphic {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
  position: relative;
  flex: 1 0 auto;
}
.mat-mdc-standard-chip .mdc-evolution-chip__graphic {
  width: var(--%NS%mat-chip-with-avatar-avatar-size, 24px);
  height: var(--%NS%mat-chip-with-avatar-avatar-size, 24px);
  font-size: var(--%NS%mat-chip-with-avatar-avatar-size, 24px);
}
.mdc-evolution-chip--selecting .mdc-evolution-chip__graphic {
  transition: width 150ms 0ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mdc-evolution-chip--%NS%selectable:not(.mdc-evolution-chip--selected):not(.mdc-evolution-chip--with-primary-icon) .mdc-evolution-chip__graphic {
  width: 0;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__graphic {
  padding-left: 6px;
  padding-right: 6px;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__graphic {
  padding-left: 4px;
  padding-right: 8px;
}
[dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__graphic {
  padding-left: 8px;
  padding-right: 4px;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__graphic {
  padding-left: 6px;
  padding-right: 6px;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__graphic {
  padding-left: 4px;
  padding-right: 8px;
}
[dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__graphic {
  padding-left: 8px;
  padding-right: 4px;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__graphic {
  padding-left: 0;
}

.mdc-evolution-chip__checkmark {
  position: absolute;
  opacity: 0;
  top: 50%;
  left: 50%;
  height: 20px;
  width: 20px;
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__checkmark {
  color: var(--%NS%mat-chip-with-icon-selected-icon-color, var(--%NS%mat-sys-on-secondary-container));
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled .mdc-evolution-chip__checkmark {
  color: var(--%NS%mat-chip-with-icon-disabled-icon-color, var(--%NS%mat-sys-on-surface));
}
.mdc-evolution-chip--selecting .mdc-evolution-chip__checkmark {
  transition: transform 150ms 0ms cubic-bezier(0.4, 0, 0.2, 1);
  transform: translate(-75%, -50%);
}
.mdc-evolution-chip--selected .mdc-evolution-chip__checkmark {
  transform: translate(-50%, -50%);
  opacity: 1;
}

.mdc-evolution-chip__checkmark-svg {
  display: block;
}

.mdc-evolution-chip__checkmark-path {
  stroke-width: 2px;
  stroke-dasharray: 29.7833385;
  stroke-dashoffset: 29.7833385;
  stroke: currentColor;
}
.mdc-evolution-chip--selecting .mdc-evolution-chip__checkmark-path {
  transition: stroke-dashoffset 150ms 45ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mdc-evolution-chip--selected .mdc-evolution-chip__checkmark-path {
  stroke-dashoffset: 0;
}
@media (forced-colors: active) {
  .mdc-evolution-chip__checkmark-path {
    stroke: CanvasText !important;
  }
}

.mat-mdc-standard-chip .mdc-evolution-chip__icon--trailing {
  height: 18px;
  width: 18px;
  font-size: 18px;
}
.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--trailing.mat-mdc-chip-remove {
  opacity: calc(var(--%NS%mat-chip-trailing-action-opacity, 1) * var(--%NS%mat-chip-with-trailing-icon-disabled-trailing-icon-opacity, 0.38));
}
.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--trailing.mat-mdc-chip-remove:focus {
  opacity: calc(var(--%NS%mat-chip-trailing-action-focus-opacity, 1) * var(--%NS%mat-chip-with-trailing-icon-disabled-trailing-icon-opacity, 0.38));
}

.mat-mdc-standard-chip {
  border-radius: var(--%NS%mat-chip-container-shape-radius, 8px);
  height: var(--%NS%mat-chip-container-height, 32px);
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) {
  background-color: var(--%NS%mat-chip-elevated-container-color, transparent);
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled {
  background-color: var(--%NS%mat-chip-elevated-disabled-container-color);
}
.mat-mdc-standard-chip.mdc-evolution-chip--%NS%selected:not(.mdc-evolution-chip--disabled) {
  background-color: var(--%NS%mat-chip-elevated-selected-container-color, var(--%NS%mat-sys-secondary-container));
}
.mat-mdc-standard-chip.mdc-evolution-chip--selected.mdc-evolution-chip--disabled {
  background-color: var(--%NS%mat-chip-flat-disabled-selected-container-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
@media (forced-colors: active) {
  .mat-mdc-standard-chip {
    outline: solid 1px;
  }
}

.mat-mdc-standard-chip .mdc-evolution-chip__icon--primary {
  border-radius: var(--%NS%mat-chip-with-avatar-avatar-shape-radius, 24px);
  width: var(--%NS%mat-chip-with-icon-icon-size, 18px);
  height: var(--%NS%mat-chip-with-icon-icon-size, 18px);
  font-size: var(--%NS%mat-chip-with-icon-icon-size, 18px);
}
.mdc-evolution-chip--selected .mdc-evolution-chip__icon--primary {
  opacity: 0;
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__icon--primary {
  color: var(--%NS%mat-chip-with-icon-icon-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--primary {
  color: var(--%NS%mat-chip-with-icon-disabled-icon-color, var(--%NS%mat-sys-on-surface));
}

.mat-mdc-chip-highlighted {
  --%NS%mat-chip-with-icon-icon-color: var(--%NS%mat-chip-with-icon-selected-icon-color, var(--%NS%mat-sys-on-secondary-container));
  --%NS%mat-chip-elevated-container-color: var(--%NS%mat-chip-elevated-selected-container-color, var(--%NS%mat-sys-secondary-container));
  --%NS%mat-chip-label-text-color: var(--%NS%mat-chip-selected-label-text-color, var(--%NS%mat-sys-on-secondary-container));
  --%NS%mat-chip-outline-width: var(--%NS%mat-chip-flat-selected-outline-width, 0);
}

.mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-focus-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-chip-selected .mat-mdc-chip-focus-overlay, .mat-mdc-chip-highlighted .mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-selected-focus-state-layer-color, var(--%NS%mat-sys-on-secondary-container));
}
.mat-mdc-chip:hover .mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-hover-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
  opacity: var(--%NS%mat-chip-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-chip-focus-overlay .mat-mdc-chip-selected:hover, .mat-mdc-chip-highlighted:hover .mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-selected-hover-state-layer-color, var(--%NS%mat-sys-on-secondary-container));
  opacity: var(--%NS%mat-chip-selected-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-chip.cdk-focused .mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-focus-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
  opacity: var(--%NS%mat-chip-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
.mat-mdc-chip-selected.cdk-focused .mat-mdc-chip-focus-overlay, .mat-mdc-chip-highlighted.cdk-focused .mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-selected-focus-state-layer-color, var(--%NS%mat-sys-on-secondary-container));
  opacity: var(--%NS%mat-chip-selected-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}

.mdc-evolution-chip--%NS%disabled:not(.mdc-evolution-chip--selected) .mat-mdc-chip-avatar {
  opacity: var(--%NS%mat-chip-with-avatar-disabled-avatar-opacity, 0.38);
}

.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--trailing {
  opacity: var(--%NS%mat-chip-with-trailing-icon-disabled-trailing-icon-opacity, 0.38);
}

.mdc-evolution-chip--disabled.mdc-evolution-chip--selected .mdc-evolution-chip__checkmark {
  opacity: var(--%NS%mat-chip-with-icon-disabled-icon-opacity, 0.38);
}

.mat-mdc-standard-chip.mdc-evolution-chip--disabled {
  opacity: var(--%NS%mat-chip-disabled-container-opacity, 1);
}
.mat-mdc-standard-chip.mdc-evolution-chip--selected .mdc-evolution-chip__icon--trailing, .mat-mdc-standard-chip.mat-mdc-chip-highlighted .mdc-evolution-chip__icon--trailing {
  color: var(--%NS%mat-chip-selected-trailing-icon-color, var(--%NS%mat-sys-on-secondary-container));
}
.mat-mdc-standard-chip.mdc-evolution-chip--selected.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--trailing, .mat-mdc-standard-chip.mat-mdc-chip-highlighted.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--trailing {
  color: var(--%NS%mat-chip-selected-disabled-trailing-icon-color, var(--%NS%mat-sys-on-surface));
}

.mat-mdc-chip-edit, .mat-mdc-chip-remove {
  opacity: var(--%NS%mat-chip-trailing-action-opacity, 1);
}
.mat-mdc-chip-edit:focus, .mat-mdc-chip-remove:focus {
  opacity: var(--%NS%mat-chip-trailing-action-focus-opacity, 1);
}
.mat-mdc-chip-edit::after, .mat-mdc-chip-remove::after {
  background-color: var(--%NS%mat-chip-trailing-action-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-chip-edit:hover::after, .mat-mdc-chip-remove:hover::after {
  opacity: calc(var(--%NS%mat-chip-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity)) + var(--%NS%mat-chip-trailing-action-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity)));
}
.mat-mdc-chip-edit:focus::after, .mat-mdc-chip-remove:focus::after {
  opacity: calc(var(--%NS%mat-chip-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity)) + var(--%NS%mat-chip-trailing-action-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity)));
}

.mat-mdc-chip-selected .mat-mdc-chip-remove::after,
.mat-mdc-chip-highlighted .mat-mdc-chip-remove::after {
  background-color: var(--%NS%mat-chip-selected-trailing-action-state-layer-color, var(--%NS%mat-sys-on-secondary-container));
}

.mat-mdc-chip.cdk-focused .mat-mdc-chip-edit:focus::after, .mat-mdc-chip.cdk-focused .mat-mdc-chip-remove:focus::after {
  opacity: calc(var(--%NS%mat-chip-selected-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity)) + var(--%NS%mat-chip-trailing-action-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity)));
}
.mat-mdc-chip.cdk-focused .mat-mdc-chip-edit:hover::after, .mat-mdc-chip.cdk-focused .mat-mdc-chip-remove:hover::after {
  opacity: calc(var(--%NS%mat-chip-selected-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity)) + var(--%NS%mat-chip-trailing-action-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity)));
}

.mat-mdc-standard-chip {
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-standard-chip .mat-mdc-chip-graphic,
.mat-mdc-standard-chip .mat-mdc-chip-trailing-icon {
  box-sizing: content-box;
}
.mat-mdc-standard-chip._mat-animation-noopable,
.mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__graphic,
.mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__checkmark,
.mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__checkmark-path {
  transition-duration: 1ms;
  animation-duration: 1ms;
}

.mat-mdc-chip-focus-overlay {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  opacity: 0;
  border-radius: inherit;
  transition: opacity 150ms linear;
}
._mat-animation-noopable .mat-mdc-chip-focus-overlay {
  transition: none;
}
.mat-mdc-basic-chip .mat-mdc-chip-focus-overlay {
  display: none;
}

.mat-mdc-chip .mat-ripple.mat-mdc-chip-ripple {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}

.mat-mdc-chip-avatar {
  text-align: center;
  line-height: 1;
  color: var(--%NS%mat-chip-with-icon-icon-color, currentColor);
}

.mat-mdc-chip {
  position: relative;
  z-index: 0;
}

.mat-mdc-chip-action-label {
  text-align: left;
  z-index: 1;
}
[dir=rtl] .mat-mdc-chip-action-label {
  text-align: right;
}
.mat-mdc-chip.mdc-evolution-chip--with-trailing-action .mat-mdc-chip-action-label {
  position: relative;
}
.mat-mdc-chip-action-label .mat-mdc-chip-primary-focus-indicator {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}
.mat-mdc-chip-action-label .mat-focus-indicator::before {
  margin: calc(calc(var(--%NS%mat-focus-indicator-border-width, 3px) + 2px) * -1);
}

.mat-mdc-chip-edit::before, .mat-mdc-chip-remove::before {
  margin: calc(var(--%NS%mat-focus-indicator-border-width, 3px) * -1);
  left: 8px;
  right: 8px;
}
.mat-mdc-chip-edit::after, .mat-mdc-chip-remove::after {
  content: "";
  display: block;
  opacity: 0;
  position: absolute;
  top: -3px;
  bottom: -3px;
  left: 5px;
  right: 5px;
  border-radius: 50%;
  box-sizing: border-box;
  padding: 12px;
  margin: -12px;
  background-clip: content-box;
}
.mat-mdc-chip-edit .mat-icon, .mat-mdc-chip-remove .mat-icon {
  width: 18px;
  height: 18px;
  font-size: 18px;
  box-sizing: content-box;
}

.mat-chip-edit-input {
  cursor: text;
  display: inline-block;
  color: inherit;
  outline: 0;
}

@media (forced-colors: active) {
  .mat-mdc-chip-selected:not(.mat-mdc-chip-multiple) {
    outline-width: 3px;
  }
}

.mat-mdc-chip-action:focus-visible .mat-focus-indicator::before {
  content: "";
}

.mdc-evolution-chip__icon, .mat-mdc-chip-edit .mat-icon, .mat-mdc-chip-remove .mat-icon {
  min-height: fit-content;
}

img.mdc-evolution-chip__icon {
  min-height: 0;
}
`;var Ct=[`*`];var Ut=`.mat-mdc-chip-set {
  display: flex;
}
.mat-mdc-chip-set:focus {
  outline: none;
}
.mat-mdc-chip-set .mdc-evolution-chip-set__chips {
  min-width: 100%;
  margin-left: -8px;
  margin-right: 0;
}
.mat-mdc-chip-set .mdc-evolution-chip {
  margin: 4px 0 4px 8px;
}
[dir=rtl] .mat-mdc-chip-set .mdc-evolution-chip-set__chips {
  margin-left: 0;
  margin-right: -8px;
}
[dir=rtl] .mat-mdc-chip-set .mdc-evolution-chip {
  margin-left: 0;
  margin-right: 8px;
}

.mdc-evolution-chip-set__chips {
  display: flex;
  flex-flow: wrap;
  min-width: 0;
}

.mat-mdc-chip-set-stacked {
  flex-direction: column;
  align-items: flex-start;
}
.mat-mdc-chip-set-stacked .mat-mdc-chip {
  width: 100%;
}
.mat-mdc-chip-set-stacked .mdc-evolution-chip__graphic {
  flex-grow: 0;
}
.mat-mdc-chip-set-stacked .mdc-evolution-chip__action--primary {
  flex-basis: 100%;
  justify-content: start;
}

input.mat-mdc-chip-input {
  flex: 1 0 150px;
  margin-left: 8px;
}
[dir=rtl] input.mat-mdc-chip-input {
  margin-left: 0;
  margin-right: 8px;
}
.mat-mdc-form-field:not(.mat-form-field-hide-placeholder) input.mat-mdc-chip-input::placeholder {
  opacity: 1;
}
.mat-mdc-form-field:not(.mat-form-field-hide-placeholder) input.mat-mdc-chip-input::-moz-placeholder {
  opacity: 1;
}
.mat-mdc-form-field:not(.mat-form-field-hide-placeholder) input.mat-mdc-chip-input::-webkit-input-placeholder {
  opacity: 1;
}
.mat-mdc-form-field:not(.mat-form-field-hide-placeholder) input.mat-mdc-chip-input:-ms-input-placeholder {
  opacity: 1;
}
.mat-mdc-chip-set + input.mat-mdc-chip-input {
  margin-left: 0;
  margin-right: 0;
}
`;var wt=new v(`mat-chips-default-options`,{providedIn:`root`,factory:()=>({separatorKeyCodes:[13]})});var ft=new v(`MatChipAvatar`);var _t=new v(`MatChipTrailingIcon`);var yt=new v(`MatChipEdit`);var bt=new v(`MatChipRemove`);var we=new v(`MatChip`);var Nt=(()=>{class a{_elementRef=h(ie);_parentChip=h(we);_isPrimary=!0;_isLeading=!1;get disabled(){return this._disabled||this._parentChip?.disabled||!1}set disabled(e){this._disabled=e}_disabled=!1;tabIndex=-1;_allowFocusWhenDisabled=!1;_getDisabledAttribute(){return this.disabled&&!this._allowFocusWhenDisabled?``:null}constructor(){h(zn).load(eG),this._elementRef.nativeElement.nodeName===`BUTTON`&&this._elementRef.nativeElement.setAttribute(`type`,`button`)}focus(){this._elementRef.nativeElement.focus()}static ɵfac=function(t){return new(t||a)};static ɵdir=xe$1({type:a,selectors:[[``,`matChipContent`,``]],hostAttrs:[1,`mat-mdc-chip-action`,`mdc-evolution-chip__action`,`mdc-evolution-chip__action--presentational`],hostVars:8,hostBindings:function(t,i){t&2&&(Bl(`disabled`,i._getDisabledAttribute())(`aria-disabled`,i.disabled),Qs(`mdc-evolution-chip__action--primary`,i._isPrimary)(`mdc-evolution-chip__action--secondary`,!i._isPrimary)(`mdc-evolution-chip__action--trailing`,!i._isPrimary&&!i._isLeading))},inputs:{disabled:[2,`disabled`,`disabled`,ta],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?-1:tT(e)],_allowFocusWhenDisabled:`_allowFocusWhenDisabled`}})}return a})();var kt=(()=>{class a extends Nt{_getTabindex(){return this.disabled&&!this._allowFocusWhenDisabled?null:this.tabIndex.toString()}_handleClick(e){!this.disabled&&this._isPrimary&&(e.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}_handleKeydown(e){(e.keyCode===13||e.keyCode===32)&&!this.disabled&&this._isPrimary&&!this._parentChip._isEditing&&(e.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}static ɵfac=(()=>{let e;return function(i){return(e||(e=Ah(a)))(i||a)}})();static ɵdir=xe$1({type:a,selectors:[[``,`matChipAction`,``]],hostVars:3,hostBindings:function(t,i){t&1&&vm(`click`,function(d){return i._handleClick(d)})(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&(Bl(`tabindex`,i._getTabindex()),Qs(`mdc-evolution-chip__action--presentational`,!1))},features:[im]})}return a})();var xe=(()=>{class a{_changeDetectorRef=h(uy);_elementRef=h(ie);_tagName=h(JV);_ngZone=h(V);_focusMonitor=h(av);_globalRippleOptions=h($S,{optional:!0});_document=h(O);_onFocus=new L;_onBlur=new L;_isBasicChip=!1;role=null;_hasFocusInternal=!1;_pendingFocus=!1;_actionChanges;_animationsDisabled=Xy();_allLeadingIcons;_allTrailingIcons;_allEditIcons;_allRemoveIcons;_hasFocus(){return this._hasFocusInternal}id=h(Od).getId(`mat-mdc-chip-`);ariaLabel=null;ariaDescription=null;_chipListDisabled=!1;_hadFocusOnRemove=!1;_textElement;get value(){return this._value!==void 0?this._value:this._textElement.textContent.trim()}set value(e){this._value=e}_value;color;removable=!0;highlighted=!1;disableRipple=!1;get disabled(){return this._disabled||this._chipListDisabled}set disabled(e){this._disabled=e}_disabled=!1;removed=new de;destroyed=new de;basicChipAttrName=`mat-basic-chip`;leadingIcon;editIcon;trailingIcon;removeIcon;primaryAction;_rippleLoader=h(N);_injector=h(Q);constructor(){let e=h(zn);e.load(eG),e.load(Da),this._monitorFocus(),this._rippleLoader?.configureRipple(this._elementRef.nativeElement,{className:`mat-mdc-chip-ripple`,disabled:this._isRippleDisabled()})}ngOnInit(){this._isBasicChip=this._elementRef.nativeElement.hasAttribute(this.basicChipAttrName)||this._tagName.toLowerCase()===this.basicChipAttrName}ngAfterViewInit(){this._textElement=this._elementRef.nativeElement.querySelector(`.mat-mdc-chip-action-label`),this._pendingFocus&&(this._pendingFocus=!1,this.focus())}ngAfterContentInit(){this._actionChanges=uD(this._allLeadingIcons.changes,this._allTrailingIcons.changes,this._allEditIcons.changes,this._allRemoveIcons.changes).subscribe(()=>this._changeDetectorRef.markForCheck())}ngDoCheck(){this._rippleLoader.setDisabled(this._elementRef.nativeElement,this._isRippleDisabled())}ngOnDestroy(){this.destroyed.emit({chip:this}),this.destroyed.complete(),this._focusMonitor.stopMonitoring(this._elementRef),this._rippleLoader?.destroyRipple(this._elementRef.nativeElement),this._actionChanges?.unsubscribe()}remove(){this.removable&&(this._hadFocusOnRemove=this._hasFocus(),this.removed.emit({chip:this}))}_isRippleDisabled(){return this.disabled||this.disableRipple||this._animationsDisabled||this._isBasicChip||!this._hasInteractiveActions()||!!this._globalRippleOptions?.disabled}_hasTrailingIcon(){return!!(this.trailingIcon||this.removeIcon)}_handleKeydown(e){(e.keyCode===8&&!e.repeat||e.keyCode===46)&&(e.preventDefault(),this.remove())}focus(){this.disabled||(this.primaryAction?this.primaryAction.focus():this._pendingFocus=!0)}_getSourceAction(e){return this._getActions().find(t=>{let i=t._elementRef.nativeElement;return i===e||i.contains(e)})}_getActions(){let e=[];return this.editIcon&&e.push(this.editIcon),this.primaryAction&&e.push(this.primaryAction),this.removeIcon&&e.push(this.removeIcon),e}_handlePrimaryActionInteraction(){}_hasInteractiveActions(){return this._getActions().length>0}_edit(e){}_monitorFocus(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{let t=e!==null;t!==this._hasFocusInternal&&(this._hasFocusInternal=t,t?this._onFocus.next({chip:this}):(this._changeDetectorRef.markForCheck(),setTimeout(()=>this._ngZone.run(()=>this._onBlur.next({chip:this})))))})}static ɵfac=function(t){return new(t||a)};static ɵcmp=jn({type:a,selectors:[[`mat-basic-chip`],[``,`mat-basic-chip`,``],[`mat-chip`],[``,`mat-chip`,``]],contentQueries:function(t,i,l){if(t&1&&_m(l,ft,5)(l,yt,5)(l,_t,5)(l,bt,5)(l,ft,5)(l,_t,5)(l,yt,5)(l,bt,5),t&2){let d;Fw(d=Lw())&&(i.leadingIcon=d.first),Fw(d=Lw())&&(i.editIcon=d.first),Fw(d=Lw())&&(i.trailingIcon=d.first),Fw(d=Lw())&&(i.removeIcon=d.first),Fw(d=Lw())&&(i._allLeadingIcons=d),Fw(d=Lw())&&(i._allTrailingIcons=d),Fw(d=Lw())&&(i._allEditIcons=d),Fw(d=Lw())&&(i._allRemoveIcons=d)}},viewQuery:function(t,i){if(t&1&&Im(kt,5),t&2){let l;Fw(l=Lw())&&(i.primaryAction=l.first)}},hostAttrs:[1,`mat-mdc-chip`],hostVars:31,hostBindings:function(t,i){t&1&&vm(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&(mm(`id`,i.id),Bl(`role`,i.role)(`aria-label`,i.ariaLabel),Yw(`mat-`+(i.color||`primary`)),Qs(`mdc-evolution-chip`,!i._isBasicChip)(`mdc-evolution-chip--disabled`,i.disabled)(`mdc-evolution-chip--with-trailing-action`,i._hasTrailingIcon())(`mdc-evolution-chip--with-primary-graphic`,i.leadingIcon)(`mdc-evolution-chip--with-primary-icon`,i.leadingIcon)(`mdc-evolution-chip--with-avatar`,i.leadingIcon)(`mat-mdc-chip-with-avatar`,i.leadingIcon)(`mat-mdc-chip-highlighted`,i.highlighted)(`mat-mdc-chip-disabled`,i.disabled)(`mat-mdc-basic-chip`,i._isBasicChip)(`mat-mdc-standard-chip`,!i._isBasicChip)(`mat-mdc-chip-with-trailing-icon`,i._hasTrailingIcon())(`_mat-animation-noopable`,i._animationsDisabled))},inputs:{role:`role`,id:`id`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaDescription:[0,`aria-description`,`ariaDescription`],value:`value`,color:`color`,removable:[2,`removable`,`removable`,ta],highlighted:[2,`highlighted`,`highlighted`,ta],disableRipple:[2,`disableRipple`,`disableRipple`,ta],disabled:[2,`disabled`,`disabled`,ta]},outputs:{removed:`removed`,destroyed:`destroyed`},exportAs:[`matChip`],features:[Vm([{provide:we,useExisting:a}])],ngContentSelectors:xt,decls:8,vars:2,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipContent`,``],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`]],template:function(t,i){t&1&&(Rw(St),fm(0,`span`,0),Ls(1,`span`,1)(2,`span`,2),gw(3,Ht,2,0,`span`,3),Ls(4,`span`,4),Ow(5),fm(6,`span`,5),Hl()()(),gw(7,Vt,2,0,`span`,6)),t&2&&(mI(3),mw(i.leadingIcon?3:-1),mI(4),mw(i._hasTrailingIcon()?7:-1))},dependencies:[Nt],styles:[`.mdc-evolution-chip,
.mdc-evolution-chip__cell,
.mdc-evolution-chip__action {
  display: inline-flex;
  align-items: center;
}

.mdc-evolution-chip {
  position: relative;
  max-width: 100%;
}

.mdc-evolution-chip__cell,
.mdc-evolution-chip__action {
  height: 100%;
}

.mdc-evolution-chip__cell--primary {
  flex-basis: 100%;
  overflow-x: hidden;
}

.mdc-evolution-chip__cell--trailing {
  flex: 1 0 auto;
}

.mdc-evolution-chip__action {
  align-items: center;
  background: none;
  border: none;
  box-sizing: content-box;
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  outline: none;
  padding: 0;
  text-decoration: none;
  color: inherit;
}

.mdc-evolution-chip__action--presentational {
  cursor: auto;
}

.mdc-evolution-chip--disabled,
.mdc-evolution-chip__action:disabled {
  pointer-events: none;
}
@media (forced-colors: active) {
  .mdc-evolution-chip--disabled,
  .mdc-evolution-chip__action:disabled {
    forced-color-adjust: none;
  }
}

.mdc-evolution-chip__action--primary {
  font: inherit;
  letter-spacing: inherit;
  white-space: inherit;
  overflow-x: hidden;
}
.mat-mdc-standard-chip .mdc-evolution-chip__action--%NS%primary::before {
  border-width: var(--%NS%mat-chip-outline-width, 1px);
  border-radius: var(--%NS%mat-chip-container-shape-radius, 8px);
  box-sizing: border-box;
  content: "";
  height: 100%;
  left: 0;
  position: absolute;
  pointer-events: none;
  top: 0;
  width: 100%;
  z-index: 1;
  border-style: solid;
}
.mat-mdc-standard-chip .mdc-evolution-chip__action--primary {
  padding-left: 12px;
  padding-right: 12px;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 12px;
}
[dir=rtl] .mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__action--primary {
  padding-left: 12px;
  padding-right: 0;
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__action--%NS%primary::before {
  border-color: var(--%NS%mat-chip-outline-color, var(--%NS%mat-sys-outline));
}
.mdc-evolution-chip__action--%NS%primary:not(.mdc-evolution-chip__action--presentational):not(.mdc-ripple-upgraded):focus::before {
  border-color: var(--%NS%mat-chip-focus-outline-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled .mdc-evolution-chip__action--%NS%primary::before {
  border-color: var(--%NS%mat-chip-disabled-outline-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
.mat-mdc-standard-chip.mdc-evolution-chip--selected .mdc-evolution-chip__action--%NS%primary::before {
  border-width: var(--%NS%mat-chip-flat-selected-outline-width, 0);
}
.mat-mdc-basic-chip .mdc-evolution-chip__action--primary {
  font: inherit;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 12px;
}
[dir=rtl] .mat-mdc-standard-chip.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--primary {
  padding-left: 12px;
  padding-right: 0;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 12px;
  padding-right: 0;
}
[dir=rtl] .mat-mdc-standard-chip.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 12px;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-leading-action.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 0;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 0;
}
[dir=rtl] .mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 0;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 12px;
}
[dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__action--primary {
  padding-left: 12px;
  padding-right: 0;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 0;
}
[dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--primary {
  padding-left: 0;
  padding-right: 0;
}

.mdc-evolution-chip__action--secondary {
  position: relative;
  overflow: visible;
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__action--secondary {
  color: var(--%NS%mat-chip-with-trailing-icon-trailing-icon-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled .mdc-evolution-chip__action--secondary {
  color: var(--%NS%mat-chip-with-trailing-icon-disabled-trailing-icon-color, var(--%NS%mat-sys-on-surface));
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--secondary, .mat-mdc-standard-chip.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--secondary {
  padding-left: 8px;
  padding-right: 8px;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--secondary, .mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--secondary {
  padding-left: 8px;
  padding-right: 8px;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--secondary, .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--secondary {
  padding-left: 8px;
  padding-right: 8px;
}
[dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__action--secondary, [dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__action--secondary {
  padding-left: 8px;
  padding-right: 8px;
}

.mdc-evolution-chip__text-label {
  -webkit-user-select: none;
  user-select: none;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.mat-mdc-standard-chip .mdc-evolution-chip__text-label {
  font-family: var(--%NS%mat-chip-label-text-font, var(--%NS%mat-sys-label-large-font));
  line-height: var(--%NS%mat-chip-label-text-line-height, var(--%NS%mat-sys-label-large-line-height));
  font-size: var(--%NS%mat-chip-label-text-size, var(--%NS%mat-sys-label-large-size));
  font-weight: var(--%NS%mat-chip-label-text-weight, var(--%NS%mat-sys-label-large-weight));
  letter-spacing: var(--%NS%mat-chip-label-text-tracking, var(--%NS%mat-sys-label-large-tracking));
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__text-label {
  color: var(--%NS%mat-chip-label-text-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-standard-chip.mdc-evolution-chip--%NS%selected:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__text-label {
  color: var(--%NS%mat-chip-selected-label-text-color, var(--%NS%mat-sys-on-secondary-container));
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled .mdc-evolution-chip__text-label, .mat-mdc-standard-chip.mdc-evolution-chip--selected.mdc-evolution-chip--disabled .mdc-evolution-chip__text-label {
  color: var(--%NS%mat-chip-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}

.mdc-evolution-chip__graphic {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
  position: relative;
  flex: 1 0 auto;
}
.mat-mdc-standard-chip .mdc-evolution-chip__graphic {
  width: var(--%NS%mat-chip-with-avatar-avatar-size, 24px);
  height: var(--%NS%mat-chip-with-avatar-avatar-size, 24px);
  font-size: var(--%NS%mat-chip-with-avatar-avatar-size, 24px);
}
.mdc-evolution-chip--selecting .mdc-evolution-chip__graphic {
  transition: width 150ms 0ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mdc-evolution-chip--%NS%selectable:not(.mdc-evolution-chip--selected):not(.mdc-evolution-chip--with-primary-icon) .mdc-evolution-chip__graphic {
  width: 0;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__graphic {
  padding-left: 6px;
  padding-right: 6px;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__graphic {
  padding-left: 4px;
  padding-right: 8px;
}
[dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic .mdc-evolution-chip__graphic {
  padding-left: 8px;
  padding-right: 4px;
}
.mat-mdc-standard-chip.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__graphic {
  padding-left: 6px;
  padding-right: 6px;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__graphic {
  padding-left: 4px;
  padding-right: 8px;
}
[dir=rtl] .mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-trailing-action .mdc-evolution-chip__graphic {
  padding-left: 8px;
  padding-right: 4px;
}
.mdc-evolution-chip--with-avatar.mdc-evolution-chip--with-primary-graphic.mdc-evolution-chip--with-leading-action .mdc-evolution-chip__graphic {
  padding-left: 0;
}

.mdc-evolution-chip__checkmark {
  position: absolute;
  opacity: 0;
  top: 50%;
  left: 50%;
  height: 20px;
  width: 20px;
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__checkmark {
  color: var(--%NS%mat-chip-with-icon-selected-icon-color, var(--%NS%mat-sys-on-secondary-container));
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled .mdc-evolution-chip__checkmark {
  color: var(--%NS%mat-chip-with-icon-disabled-icon-color, var(--%NS%mat-sys-on-surface));
}
.mdc-evolution-chip--selecting .mdc-evolution-chip__checkmark {
  transition: transform 150ms 0ms cubic-bezier(0.4, 0, 0.2, 1);
  transform: translate(-75%, -50%);
}
.mdc-evolution-chip--selected .mdc-evolution-chip__checkmark {
  transform: translate(-50%, -50%);
  opacity: 1;
}

.mdc-evolution-chip__checkmark-svg {
  display: block;
}

.mdc-evolution-chip__checkmark-path {
  stroke-width: 2px;
  stroke-dasharray: 29.7833385;
  stroke-dashoffset: 29.7833385;
  stroke: currentColor;
}
.mdc-evolution-chip--selecting .mdc-evolution-chip__checkmark-path {
  transition: stroke-dashoffset 150ms 45ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mdc-evolution-chip--selected .mdc-evolution-chip__checkmark-path {
  stroke-dashoffset: 0;
}
@media (forced-colors: active) {
  .mdc-evolution-chip__checkmark-path {
    stroke: CanvasText !important;
  }
}

.mat-mdc-standard-chip .mdc-evolution-chip__icon--trailing {
  height: 18px;
  width: 18px;
  font-size: 18px;
}
.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--trailing.mat-mdc-chip-remove {
  opacity: calc(var(--%NS%mat-chip-trailing-action-opacity, 1) * var(--%NS%mat-chip-with-trailing-icon-disabled-trailing-icon-opacity, 0.38));
}
.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--trailing.mat-mdc-chip-remove:focus {
  opacity: calc(var(--%NS%mat-chip-trailing-action-focus-opacity, 1) * var(--%NS%mat-chip-with-trailing-icon-disabled-trailing-icon-opacity, 0.38));
}

.mat-mdc-standard-chip {
  border-radius: var(--%NS%mat-chip-container-shape-radius, 8px);
  height: var(--%NS%mat-chip-container-height, 32px);
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) {
  background-color: var(--%NS%mat-chip-elevated-container-color, transparent);
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled {
  background-color: var(--%NS%mat-chip-elevated-disabled-container-color);
}
.mat-mdc-standard-chip.mdc-evolution-chip--%NS%selected:not(.mdc-evolution-chip--disabled) {
  background-color: var(--%NS%mat-chip-elevated-selected-container-color, var(--%NS%mat-sys-secondary-container));
}
.mat-mdc-standard-chip.mdc-evolution-chip--selected.mdc-evolution-chip--disabled {
  background-color: var(--%NS%mat-chip-flat-disabled-selected-container-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
@media (forced-colors: active) {
  .mat-mdc-standard-chip {
    outline: solid 1px;
  }
}

.mat-mdc-standard-chip .mdc-evolution-chip__icon--primary {
  border-radius: var(--%NS%mat-chip-with-avatar-avatar-shape-radius, 24px);
  width: var(--%NS%mat-chip-with-icon-icon-size, 18px);
  height: var(--%NS%mat-chip-with-icon-icon-size, 18px);
  font-size: var(--%NS%mat-chip-with-icon-icon-size, 18px);
}
.mdc-evolution-chip--selected .mdc-evolution-chip__icon--primary {
  opacity: 0;
}
.mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__icon--primary {
  color: var(--%NS%mat-chip-with-icon-icon-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-standard-chip.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--primary {
  color: var(--%NS%mat-chip-with-icon-disabled-icon-color, var(--%NS%mat-sys-on-surface));
}

.mat-mdc-chip-highlighted {
  --%NS%mat-chip-with-icon-icon-color: var(--%NS%mat-chip-with-icon-selected-icon-color, var(--%NS%mat-sys-on-secondary-container));
  --%NS%mat-chip-elevated-container-color: var(--%NS%mat-chip-elevated-selected-container-color, var(--%NS%mat-sys-secondary-container));
  --%NS%mat-chip-label-text-color: var(--%NS%mat-chip-selected-label-text-color, var(--%NS%mat-sys-on-secondary-container));
  --%NS%mat-chip-outline-width: var(--%NS%mat-chip-flat-selected-outline-width, 0);
}

.mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-focus-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-chip-selected .mat-mdc-chip-focus-overlay, .mat-mdc-chip-highlighted .mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-selected-focus-state-layer-color, var(--%NS%mat-sys-on-secondary-container));
}
.mat-mdc-chip:hover .mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-hover-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
  opacity: var(--%NS%mat-chip-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-chip-focus-overlay .mat-mdc-chip-selected:hover, .mat-mdc-chip-highlighted:hover .mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-selected-hover-state-layer-color, var(--%NS%mat-sys-on-secondary-container));
  opacity: var(--%NS%mat-chip-selected-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-chip.cdk-focused .mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-focus-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
  opacity: var(--%NS%mat-chip-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
.mat-mdc-chip-selected.cdk-focused .mat-mdc-chip-focus-overlay, .mat-mdc-chip-highlighted.cdk-focused .mat-mdc-chip-focus-overlay {
  background: var(--%NS%mat-chip-selected-focus-state-layer-color, var(--%NS%mat-sys-on-secondary-container));
  opacity: var(--%NS%mat-chip-selected-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}

.mdc-evolution-chip--%NS%disabled:not(.mdc-evolution-chip--selected) .mat-mdc-chip-avatar {
  opacity: var(--%NS%mat-chip-with-avatar-disabled-avatar-opacity, 0.38);
}

.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--trailing {
  opacity: var(--%NS%mat-chip-with-trailing-icon-disabled-trailing-icon-opacity, 0.38);
}

.mdc-evolution-chip--disabled.mdc-evolution-chip--selected .mdc-evolution-chip__checkmark {
  opacity: var(--%NS%mat-chip-with-icon-disabled-icon-opacity, 0.38);
}

.mat-mdc-standard-chip.mdc-evolution-chip--disabled {
  opacity: var(--%NS%mat-chip-disabled-container-opacity, 1);
}
.mat-mdc-standard-chip.mdc-evolution-chip--selected .mdc-evolution-chip__icon--trailing, .mat-mdc-standard-chip.mat-mdc-chip-highlighted .mdc-evolution-chip__icon--trailing {
  color: var(--%NS%mat-chip-selected-trailing-icon-color, var(--%NS%mat-sys-on-secondary-container));
}
.mat-mdc-standard-chip.mdc-evolution-chip--selected.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--trailing, .mat-mdc-standard-chip.mat-mdc-chip-highlighted.mdc-evolution-chip--disabled .mdc-evolution-chip__icon--trailing {
  color: var(--%NS%mat-chip-selected-disabled-trailing-icon-color, var(--%NS%mat-sys-on-surface));
}

.mat-mdc-chip-edit, .mat-mdc-chip-remove {
  opacity: var(--%NS%mat-chip-trailing-action-opacity, 1);
}
.mat-mdc-chip-edit:focus, .mat-mdc-chip-remove:focus {
  opacity: var(--%NS%mat-chip-trailing-action-focus-opacity, 1);
}
.mat-mdc-chip-edit::after, .mat-mdc-chip-remove::after {
  background-color: var(--%NS%mat-chip-trailing-action-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-chip-edit:hover::after, .mat-mdc-chip-remove:hover::after {
  opacity: calc(var(--%NS%mat-chip-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity)) + var(--%NS%mat-chip-trailing-action-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity)));
}
.mat-mdc-chip-edit:focus::after, .mat-mdc-chip-remove:focus::after {
  opacity: calc(var(--%NS%mat-chip-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity)) + var(--%NS%mat-chip-trailing-action-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity)));
}

.mat-mdc-chip-selected .mat-mdc-chip-remove::after,
.mat-mdc-chip-highlighted .mat-mdc-chip-remove::after {
  background-color: var(--%NS%mat-chip-selected-trailing-action-state-layer-color, var(--%NS%mat-sys-on-secondary-container));
}

.mat-mdc-chip.cdk-focused .mat-mdc-chip-edit:focus::after, .mat-mdc-chip.cdk-focused .mat-mdc-chip-remove:focus::after {
  opacity: calc(var(--%NS%mat-chip-selected-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity)) + var(--%NS%mat-chip-trailing-action-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity)));
}
.mat-mdc-chip.cdk-focused .mat-mdc-chip-edit:hover::after, .mat-mdc-chip.cdk-focused .mat-mdc-chip-remove:hover::after {
  opacity: calc(var(--%NS%mat-chip-selected-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity)) + var(--%NS%mat-chip-trailing-action-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity)));
}

.mat-mdc-standard-chip {
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-standard-chip .mat-mdc-chip-graphic,
.mat-mdc-standard-chip .mat-mdc-chip-trailing-icon {
  box-sizing: content-box;
}
.mat-mdc-standard-chip._mat-animation-noopable,
.mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__graphic,
.mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__checkmark,
.mat-mdc-standard-chip._mat-animation-noopable .mdc-evolution-chip__checkmark-path {
  transition-duration: 1ms;
  animation-duration: 1ms;
}

.mat-mdc-chip-focus-overlay {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  opacity: 0;
  border-radius: inherit;
  transition: opacity 150ms linear;
}
._mat-animation-noopable .mat-mdc-chip-focus-overlay {
  transition: none;
}
.mat-mdc-basic-chip .mat-mdc-chip-focus-overlay {
  display: none;
}

.mat-mdc-chip .mat-ripple.mat-mdc-chip-ripple {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}

.mat-mdc-chip-avatar {
  text-align: center;
  line-height: 1;
  color: var(--%NS%mat-chip-with-icon-icon-color, currentColor);
}

.mat-mdc-chip {
  position: relative;
  z-index: 0;
}

.mat-mdc-chip-action-label {
  text-align: left;
  z-index: 1;
}
[dir=rtl] .mat-mdc-chip-action-label {
  text-align: right;
}
.mat-mdc-chip.mdc-evolution-chip--with-trailing-action .mat-mdc-chip-action-label {
  position: relative;
}
.mat-mdc-chip-action-label .mat-mdc-chip-primary-focus-indicator {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}
.mat-mdc-chip-action-label .mat-focus-indicator::before {
  margin: calc(calc(var(--%NS%mat-focus-indicator-border-width, 3px) + 2px) * -1);
}

.mat-mdc-chip-edit::before, .mat-mdc-chip-remove::before {
  margin: calc(var(--%NS%mat-focus-indicator-border-width, 3px) * -1);
  left: 8px;
  right: 8px;
}
.mat-mdc-chip-edit::after, .mat-mdc-chip-remove::after {
  content: "";
  display: block;
  opacity: 0;
  position: absolute;
  top: -3px;
  bottom: -3px;
  left: 5px;
  right: 5px;
  border-radius: 50%;
  box-sizing: border-box;
  padding: 12px;
  margin: -12px;
  background-clip: content-box;
}
.mat-mdc-chip-edit .mat-icon, .mat-mdc-chip-remove .mat-icon {
  width: 18px;
  height: 18px;
  font-size: 18px;
  box-sizing: content-box;
}

.mat-chip-edit-input {
  cursor: text;
  display: inline-block;
  color: inherit;
  outline: 0;
}

@media (forced-colors: active) {
  .mat-mdc-chip-selected:not(.mat-mdc-chip-multiple) {
    outline-width: 3px;
  }
}

.mat-mdc-chip-action:focus-visible .mat-focus-indicator::before {
  content: "";
}

.mdc-evolution-chip__icon, .mat-mdc-chip-edit .mat-icon, .mat-mdc-chip-remove .mat-icon {
  min-height: fit-content;
}

img.mdc-evolution-chip__icon {
  min-height: 0;
}
`],encapsulation:2})}return a})();var Ne=(()=>{class a extends xe{_defaultOptions=h(wt,{optional:!0});chipListSelectable=!0;_chipListMultiple=!1;_chipListHideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get selectable(){return this._selectable&&this.chipListSelectable}set selectable(e){this._selectable=e,this._changeDetectorRef.markForCheck()}_selectable=!0;get selected(){return this._selected}set selected(e){this._setSelectedState(e,!1,!0)}_selected=!1;get ariaSelected(){return this.selectable?this.selected.toString():null}basicChipAttrName=`mat-basic-chip-option`;selectionChange=new de;ngOnInit(){super.ngOnInit(),this.role=`presentation`}select(){this._setSelectedState(!0,!1,!0)}deselect(){this._setSelectedState(!1,!1,!0)}selectViaInteraction(){this._setSelectedState(!0,!0,!0)}toggleSelected(e=!1){return this._setSelectedState(!this.selected,e,!0),this.selected}_handlePrimaryActionInteraction(){this.disabled||(this.focus(),this.selectable&&this.toggleSelected(!0))}_hasLeadingGraphic(){return this.leadingIcon?!0:!this._chipListHideSingleSelectionIndicator||this._chipListMultiple}_setSelectedState(e,t,i){e!==this.selected&&(this._selected=e,i&&this.selectionChange.emit({source:this,isUserInput:t,selected:this.selected}),this._changeDetectorRef.markForCheck())}static ɵfac=(()=>{let e;return function(i){return(e||(e=Ah(a)))(i||a)}})();static ɵcmp=jn({type:a,selectors:[[`mat-basic-chip-option`],[``,`mat-basic-chip-option`,``],[`mat-chip-option`],[``,`mat-chip-option`,``]],hostAttrs:[1,`mat-mdc-chip`,`mat-mdc-chip-option`],hostVars:37,hostBindings:function(t,i){t&2&&(mm(`id`,i.id),Bl(`tabindex`,null)(`aria-label`,null)(`aria-description`,null)(`role`,i.role),Qs(`mdc-evolution-chip`,!i._isBasicChip)(`mdc-evolution-chip--filter`,!i._isBasicChip)(`mdc-evolution-chip--selectable`,!i._isBasicChip)(`mat-mdc-chip-selected`,i.selected)(`mat-mdc-chip-multiple`,i._chipListMultiple)(`mat-mdc-chip-disabled`,i.disabled)(`mat-mdc-chip-with-avatar`,i.leadingIcon)(`mdc-evolution-chip--disabled`,i.disabled)(`mdc-evolution-chip--selected`,i.selected)(`mdc-evolution-chip--selecting`,!i._animationsDisabled)(`mdc-evolution-chip--with-trailing-action`,i._hasTrailingIcon())(`mdc-evolution-chip--with-primary-icon`,i.leadingIcon)(`mdc-evolution-chip--with-primary-graphic`,i._hasLeadingGraphic())(`mdc-evolution-chip--with-avatar`,i.leadingIcon)(`mat-mdc-chip-highlighted`,i.highlighted)(`mat-mdc-chip-with-trailing-icon`,i._hasTrailingIcon()))},inputs:{selectable:[2,`selectable`,`selectable`,ta],selected:[2,`selected`,`selected`,ta]},outputs:{selectionChange:`selectionChange`},features:[Vm([{provide:xe,useExisting:a},{provide:we,useExisting:a}]),im],ngContentSelectors:xt,decls:8,vars:6,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipAction`,``,`role`,`option`,3,`_allowFocusWhenDisabled`],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`],[1,`mdc-evolution-chip__checkmark`],[`viewBox`,`-2 -3 30 30`,`focusable`,`false`,`aria-hidden`,`true`,1,`mdc-evolution-chip__checkmark-svg`],[`fill`,`none`,`stroke`,`currentColor`,`d`,`M1.73,12.91 8.1,19.28 22.79,4.59`,1,`mdc-evolution-chip__checkmark-path`]],template:function(t,i){t&1&&(Rw(St),fm(0,`span`,0),Ls(1,`span`,1)(2,`button`,2),gw(3,jt,5,0,`span`,3),Ls(4,`span`,4),Ow(5),fm(6,`span`,5),Hl()()(),gw(7,Gt,2,0,`span`,6)),t&2&&(mI(2),dm(`_allowFocusWhenDisabled`,!0),Bl(`aria-description`,i.ariaDescription)(`aria-label`,i.ariaLabel)(`aria-selected`,i.ariaSelected),mI(),mw(i._hasLeadingGraphic()?3:-1),mI(4),mw(i._hasTrailingIcon()?7:-1))},dependencies:[kt],styles:[qt],encapsulation:2})}return a})();var Qt=(()=>{class a{_elementRef=h(ie);_changeDetectorRef=h(uy);_dir=h(WS,{optional:!0});_lastDestroyedFocusedChipIndex=null;_keyManager;_destroyed=new L;_defaultRole=`presentation`;get chipFocusChanges(){return this._getChipStream(e=>e._onFocus)}get chipDestroyedChanges(){return this._getChipStream(e=>e.destroyed)}get chipRemovedChanges(){return this._getChipStream(e=>e.removed)}get disabled(){return this._disabled}set disabled(e){this._disabled=e,this._syncChipsState()}_disabled=!1;get empty(){return!this._chips||this._chips.length===0}get role(){return this._explicitRole?this._explicitRole:this.empty?null:this._defaultRole}tabIndex=0;set role(e){this._explicitRole=e}_explicitRole=null;get focused(){return this._hasFocusedChip()}_chips;_chipActions=new Rn;ngAfterViewInit(){this._setUpFocusManagement(),this._trackChipSetChanges(),this._trackDestroyedFocusedChip()}ngOnDestroy(){this._keyManager?.destroy(),this._chipActions.destroy(),this._destroyed.next(),this._destroyed.complete()}_hasFocusedChip(){return this._chips&&this._chips.some(e=>e._hasFocus())}_syncChipsState(){this._chips?.forEach(e=>{e._chipListDisabled=this._disabled,e._changeDetectorRef.markForCheck()})}focus(){}_handleKeydown(e){this._originatesFromChip(e)&&this._keyManager.onKeydown(e)}_isValidIndex(e){return e>=0&&e<this._chips.length}_allowFocusEscape(){let e=this._elementRef.nativeElement.tabIndex;e!==-1&&(this._elementRef.nativeElement.tabIndex=-1,setTimeout(()=>this._elementRef.nativeElement.tabIndex=e))}_getChipStream(e){return this._chips.changes.pipe(yi$1(null),vf(()=>uD(...this._chips.map(e))))}_originatesFromChip(e){let t=e.target;for(;t&&t!==this._elementRef.nativeElement;){if(t.classList.contains(`mat-mdc-chip`))return!0;t=t.parentElement}return!1}_setUpFocusManagement(){this._chips.changes.pipe(yi$1(this._chips)).subscribe(e=>{let t=[];e.forEach(i=>i._getActions().forEach(l=>t.push(l))),this._chipActions.reset(t),this._chipActions.notifyOnChanges()}),this._keyManager=new Rd(this._chipActions).withVerticalOrientation().withHorizontalOrientation(this._dir?this._dir.value:`ltr`).withHomeAndEnd().skipPredicate(e=>this._skipPredicate(e)),this.chipFocusChanges.pipe(qr(this._destroyed)).subscribe(({chip:e})=>{let t=e._getSourceAction(document.activeElement);t&&this._keyManager.updateActiveItem(t)}),this._dir?.change.pipe(qr(this._destroyed)).subscribe(e=>this._keyManager.withHorizontalOrientation(e))}_skipPredicate(e){return e.disabled}_trackChipSetChanges(){this._chips.changes.pipe(yi$1(null),qr(this._destroyed)).subscribe(()=>{this.disabled&&Promise.resolve().then(()=>this._syncChipsState()),this._redirectDestroyedChipFocus()})}_trackDestroyedFocusedChip(){this.chipDestroyedChanges.pipe(qr(this._destroyed)).subscribe(e=>{let i=this._chips.toArray().indexOf(e.chip),l=e.chip._hasFocus(),d=e.chip._hadFocusOnRemove&&this._keyManager.activeItem&&e.chip._getActions().includes(this._keyManager.activeItem),I=l||d;this._isValidIndex(i)&&I&&(this._lastDestroyedFocusedChipIndex=i)})}_redirectDestroyedChipFocus(){if(this._lastDestroyedFocusedChipIndex!=null){if(this._chips.length){let e=Math.min(this._lastDestroyedFocusedChipIndex,this._chips.length-1),t=this._chips.toArray()[e];t.disabled?this._chips.length===1?this.focus():this._keyManager.setPreviousItemActive():t.focus()}else this.focus();this._lastDestroyedFocusedChipIndex=null}}static ɵfac=function(t){return new(t||a)};static ɵcmp=jn({type:a,selectors:[[`mat-chip-set`]],contentQueries:function(t,i,l){if(t&1&&_m(l,xe,5),t&2){let d;Fw(d=Lw())&&(i._chips=d)}},hostAttrs:[1,`mat-mdc-chip-set`,`mdc-evolution-chip-set`],hostVars:1,hostBindings:function(t,i){t&1&&vm(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&Bl(`role`,i.role)},inputs:{disabled:[2,`disabled`,`disabled`,ta],role:`role`,tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:tT(e)]},ngContentSelectors:Ct,decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(t,i){t&1&&(Rw(),Ul(0,`div`,0),Ow(1),$l())},styles:[`.mat-mdc-chip-set {
  display: flex;
}
.mat-mdc-chip-set:focus {
  outline: none;
}
.mat-mdc-chip-set .mdc-evolution-chip-set__chips {
  min-width: 100%;
  margin-left: -8px;
  margin-right: 0;
}
.mat-mdc-chip-set .mdc-evolution-chip {
  margin: 4px 0 4px 8px;
}
[dir=rtl] .mat-mdc-chip-set .mdc-evolution-chip-set__chips {
  margin-left: 0;
  margin-right: -8px;
}
[dir=rtl] .mat-mdc-chip-set .mdc-evolution-chip {
  margin-left: 0;
  margin-right: 8px;
}

.mdc-evolution-chip-set__chips {
  display: flex;
  flex-flow: wrap;
  min-width: 0;
}

.mat-mdc-chip-set-stacked {
  flex-direction: column;
  align-items: flex-start;
}
.mat-mdc-chip-set-stacked .mat-mdc-chip {
  width: 100%;
}
.mat-mdc-chip-set-stacked .mdc-evolution-chip__graphic {
  flex-grow: 0;
}
.mat-mdc-chip-set-stacked .mdc-evolution-chip__action--primary {
  flex-basis: 100%;
  justify-content: start;
}

input.mat-mdc-chip-input {
  flex: 1 0 150px;
  margin-left: 8px;
}
[dir=rtl] input.mat-mdc-chip-input {
  margin-left: 0;
  margin-right: 8px;
}
.mat-mdc-form-field:not(.mat-form-field-hide-placeholder) input.mat-mdc-chip-input::placeholder {
  opacity: 1;
}
.mat-mdc-form-field:not(.mat-form-field-hide-placeholder) input.mat-mdc-chip-input::-moz-placeholder {
  opacity: 1;
}
.mat-mdc-form-field:not(.mat-form-field-hide-placeholder) input.mat-mdc-chip-input::-webkit-input-placeholder {
  opacity: 1;
}
.mat-mdc-form-field:not(.mat-form-field-hide-placeholder) input.mat-mdc-chip-input:-ms-input-placeholder {
  opacity: 1;
}
.mat-mdc-chip-set + input.mat-mdc-chip-input {
  margin-left: 0;
  margin-right: 0;
}
`],encapsulation:2})}return a})();var Ce=class{source;value;constructor(n,e){this.source=n,this.value=e}};var Xt={provide:xe$2,useExisting:Vi(()=>ke),multi:!0};var ke=(()=>{class a extends Qt{_onTouched=()=>{};_onChange=()=>{};_defaultRole=`listbox`;_defaultOptions=h(wt,{optional:!0});get multiple(){return this._multiple}set multiple(e){this._multiple=e,this._syncListboxProperties()}_multiple=!1;get selected(){let e=this._chips.toArray().filter(t=>t.selected);return this.multiple?e:e[0]}ariaOrientation=`horizontal`;get selectable(){return this._selectable}set selectable(e){this._selectable=e,this._syncListboxProperties()}_selectable=!0;compareWith=(e,t)=>e===t;required=!1;get hideSingleSelectionIndicator(){return this._hideSingleSelectionIndicator}set hideSingleSelectionIndicator(e){this._hideSingleSelectionIndicator=e,this._syncListboxProperties()}_hideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get chipSelectionChanges(){return this._getChipStream(e=>e.selectionChange)}get chipBlurChanges(){return this._getChipStream(e=>e._onBlur)}get value(){return this._value}set value(e){this._chips&&this._chips.length&&this._setSelectionByValue(e,!1),this._value=e}_value;change=new de;_chips=void 0;ngAfterContentInit(){this._chips.changes.pipe(yi$1(null),qr(this._destroyed)).subscribe(()=>{this.value!==void 0&&Promise.resolve().then(()=>{this._setSelectionByValue(this.value,!1)}),this._syncListboxProperties()}),this.chipBlurChanges.pipe(qr(this._destroyed)).subscribe(()=>this._blur()),this.chipSelectionChanges.pipe(qr(this._destroyed)).subscribe(e=>{this.multiple||this._chips.forEach(t=>{t!==e.source&&t._setSelectedState(!1,!1,!1)}),e.isUserInput&&this._propagateChanges()})}focus(){if(this.disabled)return;let e=this._getFirstSelectedChip();e&&!e.disabled?e.focus():this._chips.length>0?this._keyManager.setFirstItemActive():this._elementRef.nativeElement.focus()}writeValue(e){e!=null?this.value=e:this.value=void 0}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}setDisabledState(e){this.disabled=e}_setSelectionByValue(e,t=!0){this._clearSelection(),Array.isArray(e)?e.forEach(i=>this._selectValue(i,t)):this._selectValue(e,t)}_blur(){this.disabled||setTimeout(()=>{this.focused||this._markAsTouched()})}_keydown(e){e.keyCode===9&&super._allowFocusEscape()}_markAsTouched(){this._onTouched(),this._changeDetectorRef.markForCheck()}_propagateChanges(){let e=null;Array.isArray(this.selected)?e=this.selected.map(t=>t.value):e=this.selected?this.selected.value:void 0,this._value=e,this.change.emit(new Ce(this,e)),this._onChange(e),this._changeDetectorRef.markForCheck()}_clearSelection(e){this._chips.forEach(t=>{t!==e&&t.deselect()})}_selectValue(e,t){let i=this._chips.find(l=>l.value!=null&&this.compareWith(l.value,e));return i&&(t?i.selectViaInteraction():i.select()),i}_syncListboxProperties(){this._chips&&Promise.resolve().then(()=>{this._chips.forEach(e=>{e._chipListMultiple=this.multiple,e.chipListSelectable=this._selectable,e._chipListHideSingleSelectionIndicator=this.hideSingleSelectionIndicator,e._changeDetectorRef.markForCheck()})})}_getFirstSelectedChip(){return Array.isArray(this.selected)?this.selected.length?this.selected[0]:void 0:this.selected}_skipPredicate(e){return!1}static ɵfac=(()=>{let e;return function(i){return(e||(e=Ah(a)))(i||a)}})();static ɵcmp=jn({type:a,selectors:[[`mat-chip-listbox`]],contentQueries:function(t,i,l){if(t&1&&_m(l,Ne,5),t&2){let d;Fw(d=Lw())&&(i._chips=d)}},hostAttrs:[1,`mdc-evolution-chip-set`,`mat-mdc-chip-listbox`],hostVars:10,hostBindings:function(t,i){t&1&&vm(`focus`,function(){return i.focus()})(`blur`,function(){return i._blur()})(`keydown`,function(d){return i._keydown(d)}),t&2&&(mm(`tabIndex`,i.disabled||i.empty?-1:i.tabIndex),Bl(`role`,i.role)(`aria-required`,i.role?i.required:null)(`aria-disabled`,i.disabled.toString())(`aria-multiselectable`,i.multiple)(`aria-orientation`,i.ariaOrientation),Qs(`mat-mdc-chip-list-disabled`,i.disabled)(`mat-mdc-chip-list-required`,i.required))},inputs:{multiple:[2,`multiple`,`multiple`,ta],ariaOrientation:[0,`aria-orientation`,`ariaOrientation`],selectable:[2,`selectable`,`selectable`,ta],compareWith:`compareWith`,required:[2,`required`,`required`,ta],hideSingleSelectionIndicator:[2,`hideSingleSelectionIndicator`,`hideSingleSelectionIndicator`,ta],value:`value`},outputs:{change:`change`},features:[Vm([Xt]),im],ngContentSelectors:Ct,decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(t,i){t&1&&(Rw(),Ul(0,`div`,0),Ow(1),$l())},styles:[Ut],encapsulation:2})}return a})();function Kt(a,n){a&1&&pm(0,`div`,2)}var Zt=new v(`MAT_PROGRESS_BAR_DEFAULT_OPTIONS`);var Et=(()=>{class a{_elementRef=h(ie);_ngZone=h(V);_changeDetectorRef=h(uy);_renderer=h(Ir);_cleanupTransitionEnd;constructor(){let e=vS(),t=h(Zt,{optional:!0});this._isNoopAnimation=e===`di-disabled`,e===`reduced-motion`&&this._elementRef.nativeElement.classList.add(`mat-progress-bar-reduced-motion`),t&&(t.color&&(this.color=this._defaultColor=t.color),this.mode=t.mode||this.mode)}_isNoopAnimation;get color(){return this._color||this._defaultColor}set color(e){this._color=e}_color;_defaultColor=`primary`;get value(){return this._value}set value(e){this._value=It(e||0),this._changeDetectorRef.markForCheck()}_value=0;get bufferValue(){return this._bufferValue||0}set bufferValue(e){this._bufferValue=It(e||0),this._changeDetectorRef.markForCheck()}_bufferValue=0;animationEnd=new de;get mode(){return this._mode}set mode(e){this._mode=e,this._changeDetectorRef.markForCheck()}_mode=`determinate`;ngAfterViewInit(){this._ngZone.runOutsideAngular(()=>{this._cleanupTransitionEnd=this._renderer.listen(this._elementRef.nativeElement,`transitionend`,this._transitionendHandler)})}ngOnDestroy(){this._cleanupTransitionEnd?.()}_getPrimaryBarTransform(){return`scaleX(${this._isIndeterminate()?1:this.value/100})`}_getBufferBarFlexBasis(){return`${this.mode===`buffer`?this.bufferValue:100}%`}_isIndeterminate(){return this.mode===`indeterminate`||this.mode===`query`}_transitionendHandler=e=>{this.animationEnd.observers.length===0||!e.target||!e.target.classList.contains(`mdc-linear-progress__primary-bar`)||(this.mode===`determinate`||this.mode===`buffer`)&&this._ngZone.run(()=>this.animationEnd.next({value:this.value}))};static ɵfac=function(t){return new(t||a)};static ɵcmp=jn({type:a,selectors:[[`mat-progress-bar`]],hostAttrs:[`role`,`progressbar`,`aria-valuemin`,`0`,`aria-valuemax`,`100`,`tabindex`,`-1`,1,`mat-mdc-progress-bar`,`mdc-linear-progress`],hostVars:10,hostBindings:function(t,i){t&2&&(Bl(`aria-valuenow`,i._isIndeterminate()?null:i.value)(`mode`,i.mode),Yw(`mat-`+i.color),Qs(`_mat-animation-noopable`,i._isNoopAnimation)(`mdc-linear-progress--animation-ready`,!i._isNoopAnimation)(`mdc-linear-progress--indeterminate`,i._isIndeterminate()))},inputs:{color:`color`,value:[2,`value`,`value`,tT],bufferValue:[2,`bufferValue`,`bufferValue`,tT],mode:`mode`},outputs:{animationEnd:`animationEnd`},exportAs:[`matProgressBar`],decls:7,vars:5,consts:[[`aria-hidden`,`true`,1,`mdc-linear-progress__buffer`],[1,`mdc-linear-progress__buffer-bar`],[1,`mdc-linear-progress__buffer-dots`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__primary-bar`],[1,`mdc-linear-progress__bar-inner`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__secondary-bar`]],template:function(t,i){t&1&&(Ul(0,`div`,0),pm(1,`div`,1),gw(2,Kt,1,0,`div`,2),$l(),Ul(3,`div`,3),pm(4,`span`,4),$l(),Ul(5,`div`,5),pm(6,`span`,4),$l()),t&2&&(mI(),Sm(`flex-basis`,i._getBufferBarFlexBasis()),mI(),mw(i.mode===`buffer`?2:-1),mI(),Sm(`transform`,i._getPrimaryBarTransform()))},styles:[`.mat-mdc-progress-bar {
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
`],encapsulation:2})}return a})();function It(a,n=0,e=100){return Math.max(n,Math.min(e,a))}var Mt=(()=>{class a{static ɵfac=function(t){return new(t||a)};static ɵmod=Ae({type:a});static ɵinj=ye({imports:[Rv]})}return a})();var Wt=[`chart`];var Dt=(()=>{class a{constructor(){this.chart=nH(),this.annotations=nH(),this.colors=nH(),this.dataLabels=nH(),this.series=nH(),this.stroke=nH(),this.labels=nH(),this.legend=nH(),this.markers=nH(),this.noData=nH(),this.parsing=nH(),this.fill=nH(),this.tooltip=nH(),this.plotOptions=nH(),this.responsive=nH(),this.xaxis=nH(),this.yaxis=nH(),this.forecastDataPoints=nH(),this.grid=nH(),this.states=nH(),this.title=nH(),this.subtitle=nH(),this.theme=nH(),this.autoUpdateSeries=nH(!0),this.chartReady=tH(),this.chartInstance=It$1(null),this.chartElement=oH.required(`chart`),this.ngZone=h(V),this.isBrowser=Ty(h(Sn)),this._destroyed=!1,this._injector=h(Q),this.waitingForConnectedRef=null}ngOnChanges(e){this.isBrowser&&this.hydrate(e)}ngOnDestroy(){this.destroy(),this._destroyed=!0}get isConnected(){return this.chartElement()?.nativeElement.isConnected}hydrate(e){if(this.waitingForConnectedRef)return;if(this.chartInstance()&&this.autoUpdateSeries()&&Object.keys(e).filter(i=>i!==`series`).length===0){this.updateSeries(this.series(),!0);return}dl({read:()=>this.createElement()},{injector:this._injector})}importApexCharts(){return import(`./chunk-B4t3fBEx.js`)}async createElement(){let{default:e}=await this.importApexCharts();if(window.ApexCharts||=e,this._destroyed)return;if(!this.isConnected){this.waitForConnected();return}let t={};[`annotations`,`chart`,`colors`,`dataLabels`,`series`,`stroke`,`labels`,`legend`,`fill`,`tooltip`,`plotOptions`,`responsive`,`markers`,`noData`,`parsing`,`xaxis`,`yaxis`,`forecastDataPoints`,`grid`,`states`,`title`,`subtitle`,`theme`].forEach(d=>{let I=this[d]();I&&(t[d]=I)}),this.destroy();let l=this.ngZone.runOutsideAngular(()=>new e(this.chartElement().nativeElement,t));this.chartInstance.set(l),this.render(),this.chartReady.emit({chartObj:l})}render(){if(this.isConnected)return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.render());this.waitForConnected()}updateOptions(e,t,i,l){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.updateOptions(e,t,i,l))}updateSeries(e,t){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.updateSeries(e,t))}appendSeries(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.appendSeries(e,t))}appendData(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.appendData(e))}highlightSeries(e){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.highlightSeries(e))}toggleSeries(e){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.toggleSeries(e))}showSeries(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.showSeries(e))}hideSeries(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.hideSeries(e))}resetSeries(){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.resetSeries())}zoomX(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.zoomX(e,t))}toggleDataPointSelection(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.toggleDataPointSelection(e,t))}destroy(){this.chartInstance()?.destroy(),this.chartInstance.set(null)}setLocale(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.setLocale(e))}paper(){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.paper())}addXaxisAnnotation(e,t,i){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.addXaxisAnnotation(e,t,i))}addYaxisAnnotation(e,t,i){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.addYaxisAnnotation(e,t,i))}addPointAnnotation(e,t,i){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.addPointAnnotation(e,t,i))}removeAnnotation(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.removeAnnotation(e,t))}clearAnnotations(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.clearAnnotations(e))}dataURI(e){return this.chartInstance()?.dataURI(e)}waitForConnected(){this.waitingForConnectedRef||(this.waitingForConnectedRef=W_({read:()=>{this.isConnected&&(this.waitingForConnectedRef.destroy(),this.waitingForConnectedRef=null,this.createElement())}},{injector:this._injector}))}static{this.ɵfac=function(t){return new(t||a)}}static{this.ɵcmp=jn({type:a,selectors:[[`apx-chart`]],viewQuery:function(t,i){t&1&&wm(i.chartElement,Wt,5),t&2&&Pw()},inputs:{chart:[1,`chart`],annotations:[1,`annotations`],colors:[1,`colors`],dataLabels:[1,`dataLabels`],series:[1,`series`],stroke:[1,`stroke`],labels:[1,`labels`],legend:[1,`legend`],markers:[1,`markers`],noData:[1,`noData`],parsing:[1,`parsing`],fill:[1,`fill`],tooltip:[1,`tooltip`],plotOptions:[1,`plotOptions`],responsive:[1,`responsive`],xaxis:[1,`xaxis`],yaxis:[1,`yaxis`],forecastDataPoints:[1,`forecastDataPoints`],grid:[1,`grid`],states:[1,`states`],title:[1,`title`],subtitle:[1,`subtitle`],theme:[1,`theme`],autoUpdateSeries:[1,`autoUpdateSeries`]},outputs:{chartReady:`chartReady`},features:[js],decls:2,vars:0,consts:[[`chart`,``]],template:function(t,i){t&1&&pm(0,`div`,null,0)},encapsulation:2})}}return a})();var At=180;var Ft=400;var Jt=2500;var ce=class a{ws=null;reconnectTimer=null;destroyed=!1;wantMetrics=!1;wantLogs=!1;logSources=null;logSeq=0;refCount=0;connected=It$1(!1);metrics=It$1(null);history=It$1([]);logs=It$1([]);logSourceOptions=It$1([`web`,`coordinator`,`engine`,`warm-pool`,`broker`]);latestCpu=CC(()=>{let n=this.metrics()?.cpu?.percent;return n==null||Number.isNaN(Number(n))?null:Number(n)});latestMem=CC(()=>{let n=this.metrics()?.memory,e=n?.usedPercent??n?.percent;return e==null||Number.isNaN(Number(e))?null:Number(e)});latestGpu=CC(()=>{let e=this.metrics()?.gpu?.percent;if(e!=null&&!Number.isNaN(Number(e)))return Number(e);let i=this.metrics()?.jetson?.gpu?.percent;return i==null||Number.isNaN(Number(i))?null:Number(i)});latestVram=CC(()=>{let n=this.metrics()?.gpu?.vramUsedPercent;return n==null||Number.isNaN(Number(n))?null:Number(n)});cpuModel=CC(()=>{let n=this.metrics()?.cpu?.model;return n?String(n):null});gpuName=CC(()=>{let n=this.metrics()?.gpu?.name;return n?String(n):null});memoryLabel=CC(()=>{let n=this.metrics()?.memory;return n?.totalBytes?Yt(n.totalBytes):null});vramLabel=CC(()=>{let n=this.metrics()?.gpu;if(n?.vramTotalGb==null)return null;let e=Number(n.vramTotalGb);return Number.isFinite(e)?n.vramUsedGb!=null&&Number.isFinite(Number(n.vramUsedGb))?`${Number(n.vramUsedGb).toFixed(1)} / ${e.toFixed(1)} GiB`:`${e.toFixed(1)} GiB`:null});acquire(n){this.refCount+=1,n.metrics&&(this.wantMetrics=!0),n.logs&&(this.wantLogs=!0),n.logSources&&(this.logSources=[...n.logSources]),this.ensureConnected(),this.pushSubscriptions()}release(){this.refCount=Math.max(0,this.refCount-1),this.refCount===0&&(this.wantMetrics=!1,this.wantLogs=!1,this.closeSocket())}setLogSources(n){this.logSources=n,this.wantLogs&&this.ws?.readyState===WebSocket.OPEN&&this.ws.send(JSON.stringify({type:`admin_logs_subscribe`,sources:n?.length?n:void 0}))}clearLogs(){this.logs.set([])}ngOnDestroy(){this.destroyed=!0,this.closeSocket()}wsUrl(){let n=location.protocol===`https:`?`wss:`:`ws:`;return location.port===`3873`?`ws://127.0.0.1:3847/`:`${n}//${location.host}/`}ensureConnected(){if(!(this.destroyed||this.refCount<=0)&&!(this.ws&&(this.ws.readyState===WebSocket.OPEN||this.ws.readyState===WebSocket.CONNECTING)))try{let n=new WebSocket(this.wsUrl());this.ws=n,n.onopen=()=>{this.connected.set(!0),this.pushSubscriptions()},n.onmessage=e=>this.onMessage(e),n.onclose=()=>{this.connected.set(!1),this.ws=null,this.scheduleReconnect()},n.onerror=()=>{try{n.close()}catch{}}}catch{this.scheduleReconnect()}}pushSubscriptions(){let n=this.ws;!n||n.readyState!==WebSocket.OPEN||(this.wantMetrics&&n.send(JSON.stringify({type:`host_metrics_subscribe`})),this.wantLogs&&n.send(JSON.stringify({type:`admin_logs_subscribe`,sources:this.logSources?.length?this.logSources:void 0})))}onMessage(n){let e;try{e=JSON.parse(String(n.data||``))}catch{return}let t=String(e.type||``);if(t===`host_metrics`){let i=e;this.metrics.set(i),this.pushHistory(i);return}if(t===`admin_logs_sources`&&Array.isArray(e.sources)){this.logSourceOptions.set(e.sources.map(String));return}if(t===`admin_log`){let i={id:++this.logSeq,source:String(e.source||`web`),level:String(e.level||`info`),ts:String(e.ts||new Date().toISOString()),line:String(e.line||``)};this.logs.update(l=>{let d=[...l,i];return d.length>Ft?d.slice(d.length-Ft):d})}}pushHistory(n){let e=Date.parse(String(n.ts||``))||Date.now(),t=n.cpu?.percent==null||Number.isNaN(Number(n.cpu.percent))?null:Number(n.cpu.percent),i=n.memory?.usedPercent??n.memory?.percent,l=i==null||Number.isNaN(Number(i))?null:Number(i),d=n.jetson,I=n.gpu?.percent??d?.gpu?.percent,Pt=I==null||Number.isNaN(Number(I))?null:Number(I),se=n.gpu?.vramUsedPercent,Lt=se==null||Number.isNaN(Number(se))?null:Number(se);this.history.update(Bt=>{let Z=[...Bt,{t:e,cpu:t,mem:l,gpu:Pt,vram:Lt}];return Z.length>At?Z.slice(Z.length-At):Z})}scheduleReconnect(){this.destroyed||this.refCount<=0||this.reconnectTimer||(this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.ensureConnected()},Jt))}closeSocket(){this.reconnectTimer&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null);let n=this.ws;if(this.ws=null,this.connected.set(!1),!!n)try{n.readyState===WebSocket.OPEN&&(n.send(JSON.stringify({type:`host_metrics_unsubscribe`})),n.send(JSON.stringify({type:`admin_logs_unsubscribe`}))),n.close()}catch{}}static ɵfac=function(e){return new(e||a)};static ɵprov=R({token:a,factory:a.ɵfac,providedIn:`root`})};function Yt(a){if(!Number.isFinite(a)||a<0)return`—`;let n=[`B`,`KiB`,`MiB`,`GiB`,`TiB`],e=a,t=0;for(;e>=1024&&t<n.length-1;)e/=1024,t+=1;return`${e.toFixed(t===0?0:1)} ${n[t]}`}var ei=[`logViewport`];var Tt=()=>[];var ti=()=>[`#f59e0b`];var ii=()=>[`#60a5fa`];var ni=()=>[`#c084fc`];var ai=(a,n)=>n.title;var Rt=(a,n)=>n.id;var ri=(a,n)=>n.message;function oi(a,n){if(a&1&&fm(0,`ao-error-state`,10),a&2)dm(`message`,Aw().error())}function ci(a,n){if(a&1&&(Ls(0,`mat-card`,12)(1,`mat-card-header`)(2,`div`,59),fm(3,`mat-icon`,64),Ls(4,`div`,35),sC(5),Hl()()(),Ls(6,`mat-card-content`)(7,`div`,65),sC(8),yC(9,`number`),Hl(),Ls(10,`div`,66),fm(11,`mat-icon`,64),Ls(12,`div`,21),sC(13),Hl()()()()),a&2){let e=n.$implicit;mI(3),dm(`svgIcon`,e.icon),mI(2),Om(e.title),mI(3),ql(` `,DC(9,7,e.value),` `),mI(3),Yw(e.toneClass),dm(`svgIcon`,e.toneIcon),mI(2),ql(` `,e.caption,` `)}}function si(a,n){a&1&&(Ls(0,`span`,25),sC(1,`%`),Hl())}function li(a,n){a&1&&(Ls(0,`span`,25),sC(1,`%`),Hl())}function di(a,n){if(a&1&&sC(0),a&2)ql(` · `,Aw().live.metrics()?.gpu?.vramSource,` `)}function pi(a,n){a&1&&(Ls(0,`span`,25),sC(1,`%`),Hl())}function mi(a,n){a&1&&(Ls(0,`span`,25),sC(1,`%`),Hl())}function hi(a,n){a&1&&(Ls(0,`mat-card`,46)(1,`div`,59),fm(2,`mat-icon`,60),Ls(3,`div`,61),sC(4,` Reach port guard `),Hl()(),Ls(5,`div`,67),fm(6,`mat-icon`,68),Ls(7,`div`,6),sC(8),Hl()()()),a&2&&(mI(8),Om(n.message))}function ui(a,n){if(a&1&&(Ls(0,`mat-card`,46)(1,`div`,59),fm(2,`mat-icon`,69),Ls(3,`div`,61),sC(4,` Sparkline snapshots `),Hl()(),Ls(5,`div`,70)(6,`div`)(7,`div`,71),sC(8,`CPU`),Hl(),fm(9,`apx-chart`,72),Hl(),Ls(10,`div`)(11,`div`,71),sC(12,`Memory`),Hl(),fm(13,`apx-chart`,72),Hl(),Ls(14,`div`)(15,`div`,71),sC(16,`GPU`),Hl(),fm(17,`apx-chart`,72),Hl()()()),a&2){let e=Aw();mI(9),dm(`chart`,e.sparkChart.chart)(`colors`,hC(18,ti))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`cpu`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip),mI(4),dm(`chart`,e.sparkChart.chart)(`colors`,hC(19,ii))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`mem`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip),mI(4),dm(`chart`,e.sparkChart.chart)(`colors`,hC(20,ni))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`gpu`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip)}}function gi(a,n){if(a&1&&(Ls(0,`button`,83),fm(1,`mat-icon`,84),Hl(),Ls(2,`mat-menu`,null,1)(4,`a`,85),sC(5,` Open `),Hl()()),a&2)dm(`matMenuTriggerFor`,jw(3)),mI(4),dm(`href`,n,tg)}function vi(a,n){a&1&&(Ls(0,`div`,82)(1,`a`,86),sC(2,` Open `),Hl()()),a&2&&(mI(),dm(`href`,n,tg))}function fi(a,n){if(a&1&&(Ls(0,`mat-card`,49)(1,`div`,73),fm(2,`mat-icon`,74),Hl(),Ls(3,`div`,75)(4,`div`,19)(5,`div`,61),sC(6),Hl(),Ls(7,`div`,76),sC(8),Hl()(),Ls(9,`div`,77),gw(10,gi,6,2),Hl()(),Ls(11,`div`,78)(12,`div`,79)(13,`div`,21),sC(14,`Port`),Hl(),Ls(15,`div`,80),sC(16),Hl()(),Ls(17,`div`,79)(18,`div`,21),sC(19,`NodePort`),Hl(),Ls(20,`div`,80),sC(21),Hl()(),Ls(22,`div`,19)(23,`div`,21),sC(24,`Detail`),Hl(),Ls(25,`div`,81),sC(26),Hl()()(),gw(27,vi,3,1,`div`,82),Hl()),a&2){let e,t,i=n.$implicit,l=Aw();mI(2),dm(`ngClass`,l.watermarkClass(i.status))(`svgIcon`,l.watermarkIcon(i.status)),mI(4),ql(` `,i.label,` `),mI(),dm(`ngClass`,l.statusTextClass(i.status)),mI(),ql(` `,l.statusLabel(i.status),` `),mI(2),mw((e=l.componentHref(i))?10:-1,e),mI(6),ql(` `,i.port??`—`,` `),mI(5),ql(` `,i.nodePort??`—`,` `),mI(5),ql(` `,i.fact||i.detail||`—`,` `),mI(),mw((t=l.componentHref(i))?27:-1,t)}}function _i(a,n){a&1&&(Ls(0,`mat-card`,50)(1,`div`,6),sC(2,`No topology components reported`),Hl()())}function yi(a,n){if(a&1&&(Ls(0,`mat-chip-option`,56),sC(1),Hl()),a&2){let e=n.$implicit;dm(`value`,e),mI(),Om(e)}}function bi(a,n){if(a&1&&(Ls(0,`div`,58)(1,`span`,87),sC(2),Hl(),Ls(3,`span`,88),sC(4),Hl(),Ls(5,`span`,89),sC(6),Hl()()),a&2){let e=n.$implicit,t=Aw();mI(2),Om(t.formatLogTime(e.ts)),mI(),dm(`ngClass`,t.sourceClass(e.source)),mI(),Om(e.source),mI(),dm(`ngClass`,t.levelClass(e.level)),mI(),Om(e.line)}}function Si(a,n){a&1&&(Ls(0,`div`,6),sC(1,`Waiting for log lines…`),Hl())}function xi(a,n){if(a&1&&(Ls(0,`a`,91),sC(1,` Open `),Hl()),a&2){let e=Aw().$implicit;dm(`routerLink`,e.href)}}function Ci(a,n){if(a&1&&(Ls(0,`div`,63),fm(1,`mat-icon`,90),Ls(2,`div`,15)(3,`div`,6),sC(4),Hl(),gw(5,xi,2,1,`a`,91),Hl()()),a&2){let e=n.$implicit;mI(),dm(`svgIcon`,e.severity===`warning`?`octagon-alert`:`circle-alert`),mI(3),Om(e.message),mI(),mw(e.href?5:-1)}}function wi(a,n){a&1&&(Ls(0,`div`,63),fm(1,`mat-icon`,92),Ls(2,`div`,6),sC(3,`Nothing flagged`),Hl()())}var Ot=class a{api=h(l);theming=h(Lt);live=h(ce);logViewport=oH(`logViewport`);topologyTimer=null;topology=It$1(null);ping=It$1(null);session=It$1(null);error=It$1(null);selectedSources=It$1([]);components=CC(()=>this.topology()?.components||[]);filteredLogs=CC(()=>{let n=new Set(this.selectedSources()),e=this.live.logs();return n.size?e.filter(t=>n.has(t.source)):e});cpuMemSeries=CC(()=>{let n=this.live.history();return[{name:`CPU`,data:n.map(e=>({x:e.t,y:e.cpu==null?null:Number(e.cpu.toFixed(1))}))},{name:`Memory`,data:n.map(e=>({x:e.t,y:e.mem==null?null:Number(e.mem.toFixed(1))}))}]});gpuVramSeries=CC(()=>{let n=this.live.history();return[{name:`GPU`,data:n.map(e=>({x:e.t,y:e.gpu==null?null:Number(e.gpu.toFixed(1))}))},{name:`VRAM`,data:n.map(e=>({x:e.t,y:e.vram==null?null:Number(e.vram.toFixed(1))}))}]});cpuMemChartColors=[`#f59e0b`,`#60a5fa`];gpuVramChartColors=[`#c084fc`,`#34d399`];summary=CC(()=>{let n=this.components(),e=n.filter(d=>[`healthy`,`available`,`succeeded`].includes(String(d.status||``).toLowerCase())).length,t=n.filter(d=>[`degraded`,`warning`,`running`,`reconciling`].includes(String(d.status||``).toLowerCase())).length,i=n.filter(d=>[`failed`,`blocking`].includes(String(d.status||``).toLowerCase())).length,l=this.topology()?.attention?.length??0;return[{title:`Healthy`,icon:`circle-check`,value:e,caption:`components up`,toneIcon:`arrow-up`,toneClass:`text-green-600`},{title:`Degraded`,icon:`octagon-alert`,value:t,caption:`need watch`,toneIcon:t?`arrow-up`:`arrow-down`,toneClass:t?`text-amber-600`:`text-green-600`},{title:`Failed`,icon:`circle-x`,value:i,caption:`blocking`,toneIcon:i?`arrow-up`:`arrow-down`,toneClass:i?`text-red-600`:`text-green-600`},{title:`Attention`,icon:`bell`,value:l,caption:`open items`,toneIcon:l?`arrow-up`:`arrow-down`,toneClass:l?`text-amber-600`:`text-green-600`}]});utilChart={chart:{animations:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`,height:`100%`,type:`area`,toolbar:{show:!1},zoom:{enabled:!1}},colors:[`#f59e0b`,`#60a5fa`],dataLabels:{enabled:!1},fill:{type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.45,opacityTo:.05,stops:[0,90,100]}},grid:{borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:8,right:8}},legend:{show:!0,position:`top`,horizontalAlign:`right`},stroke:{curve:`smooth`,width:2},tooltip:CC(()=>({theme:this.theming.isDark()?`dark`:`light`,x:{format:`HH:mm:ss`},y:{formatter:n=>`${Number(n).toFixed(1)}%`}})),xaxis:{type:`datetime`,labels:{datetimeUTC:!1,style:{colors:`var(--mat-sys-on-surface)`}},axisBorder:{show:!1},tooltip:{enabled:!1}},yaxis:{min:0,max:100,tickAmount:4,labels:{formatter:n=>`${Math.round(n)}%`,style:{colors:`var(--mat-sys-on-surface)`}}}};sparkChart={chart:{animations:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`,height:`101%`,width:`101%`,type:`area`,sparkline:{enabled:!0}},fill:{type:`gradient`,gradient:{shadeIntensity:.5,opacityFrom:.4,opacityTo:.05}},stroke:{curve:`smooth`,width:2},tooltip:{enabled:!1}};constructor(){ls(()=>{this.filteredLogs(),queueMicrotask(()=>{let n=this.logViewport()?.nativeElement;n&&(n.scrollTop=n.scrollHeight)})})}ngOnInit(){this.selectedSources.set([...this.live.logSourceOptions()]),this.live.acquire({metrics:!0,logs:!0}),this.reload(),this.topologyTimer=setInterval(()=>this.reload(),3e4)}ngOnDestroy(){this.topologyTimer&&(clearInterval(this.topologyTimer),this.topologyTimer=null),this.live.release()}sparkSeries(n){let e=this.live.history().map(t=>t[n]).filter(t=>t!=null);return[{name:n,data:e.length?e:[0]}]}onSourcesChange(n){let e=n.value,t=Array.isArray(e)?e:e?[e]:[];this.selectedSources.set(t),this.live.setLogSources(t.length?t:null)}reload(){this.error.set(null),this.api.topology().subscribe(n=>{n.ok?this.topology.set(n.data):this.error.set(n.message)}),this.api.ping().subscribe(n=>n.ok&&this.ping.set(n.data)),this.api.session().subscribe(n=>n.ok&&this.session.set(n.data))}componentHref(n){let e=n.url||n.urlHint;if(!e)return null;let t=location.hostname||`127.0.0.1`,i=String(e).replace(/__HOST__/g,t).replace(/<host>/gi,t).split(/\s+/)[0];return!i||i.includes(`<`)?null:i.startsWith(`/`)?`${location.protocol}//${location.host}${i}`:i}resourceBarColor(n){return n==null?`primary`:n>=90?`error`:n>=75?`warn`:`primary`}statusLabel(n){let e=String(n||`unknown`).replace(/-/g,` `);return e.charAt(0).toUpperCase()+e.slice(1)}statusTextClass(n){let e=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`text-green-600`:[`failed`,`blocking`].includes(e)?`text-red-600`:[`degraded`,`warning`,`running`,`reconciling`].includes(e)?`text-amber-600`:`text-neutral-500`}watermarkIcon(n){let e=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`circle-check`:[`failed`,`blocking`].includes(e)?`circle-x`:`circle-alert`}watermarkClass(n){let e=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`text-green-600/25 dark:text-green-500/25`:[`failed`,`blocking`].includes(e)?`text-red-600/25 dark:text-red-500/25`:`text-amber-600/25 dark:text-amber-500/25`}formatUptime(n){if(n==null||!Number.isFinite(n))return`—`;let e=Math.floor(n),t=Math.floor(e/86400),i=Math.floor(e%86400/3600),l=Math.floor(e%3600/60);return t>0?`${t}d ${i}h`:i>0?`${i}h ${l}m`:`${l}m`}formatLogTime(n){let e=new Date(n);return Number.isFinite(e.getTime())?e.toLocaleTimeString([],{hour12:!1,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}):`--:--:--`}sourceClass(n){switch(n){case`engine`:return`text-violet-400`;case`coordinator`:return`text-sky-400`;case`warm-pool`:return`text-amber-400`;case`broker`:return`text-rose-400`;default:return`text-emerald-400`}}levelClass(n){return n===`error`?`text-red-300`:n===`warn`?`text-amber-200`:`text-neutral-200`}static ɵfac=function(e){return new(e||a)};static ɵcmp=jn({type:a,selectors:[[`ao-overview-page`]],viewQuery:function(e,t){e&1&&wm(t.logViewport,ei,5),e&2&&Pw()},decls:169,vars:64,consts:[[`logViewport`,``],[`compMenu`,`matMenu`],[1,`@container`,`mx-auto`,`flex`,`w-full`,`max-w-7xl`,`flex-auto`,`flex-col`,`gap-4`,`p-6`,`sm:gap-6`,`lg:px-8`,`lg:pt-8`,`lg:pb-10`],[1,`flex`,`items-center`,`justify-between`,`gap-x-3`],[1,`flex`,`flex-col`,`gap-y-0.5`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex-auto`],[1,`flex`,`items-center`,`gap-x-1.5`,`text-sm`,3,`ngClass`],[1,`inline-block`,`size-2`,`rounded-full`,3,`ngClass`],[3,`message`],[1,`grid`,`gap-4`,`sm:gap-6`,`@max-md:grid-cols-1`,`@md:grid-cols-2`,`@4xl:grid-cols-4`],[`appearance`,`filled`],[`appearance`,`outlined`,1,`overflow-hidden`],[1,`flex`,`flex-col`,`gap-y-1`,`px-5`,`pt-5`,`sm:flex-row`,`sm:items-start`],[1,`min-w-0`,`flex-auto`],[1,`text-lg`,`font-medium`,`tracking-tight`],[1,`font-medium`,`text-neutral-500`],[1,`mt-2`,`grid`,`grid-cols-1`,`gap-2`,`px-2`,`pb-2`,`xl:grid-cols-2`],[1,`flex`,`min-w-0`,`flex-col`],[1,`flex`,`flex-wrap`,`items-end`,`gap-x-6`,`gap-y-2`,`px-3`,`pt-2`],[1,`text-sm`,`font-medium`,`text-neutral-500`],[1,`truncate`,`text-sm`,`font-medium`],[1,`text-xs`,`text-neutral-500`],[1,`text-3xl`,`font-semibold`,`tabular-nums`,`tracking-tighter`],[1,`text-lg`,`text-neutral-500`],[1,`h-64`,`w-full`,3,`chart`,`colors`,`dataLabels`,`fill`,`grid`,`legend`,`series`,`stroke`,`tooltip`,`xaxis`,`yaxis`],[1,`flex`,`flex-wrap`,`gap-x-8`,`gap-y-3`,`px-5`,`py-4`,`text-sm`],[1,`font-mono`,`tabular-nums`],[1,`min-w-40`,`flex-auto`],[`mode`,`determinate`,1,`mt-1`,`rounded-full`,3,`color`,`value`],[1,`grid`,`w-full`,`grid-cols-1`,`gap-6`,`xl:grid-cols-2`],[`appearance`,`filled`,1,`flex`,`flex-col`],[1,`flex`,`flex-auto`,`items-center`,`gap-x-2`],[`svgIcon`,`server`,1,`size-4`],[1,`font-medium`,`tracking-tight`],[1,`ml-auto`],[`matButton`,``,`href`,`/`],[1,`flex`,`flex-auto`,`flex-col`],[1,`text-3xl`,`font-semibold`],[1,`mt-0.5`,`text-sm`,`text-neutral-500`],[1,`mt-4`,`flex`,`flex-col`,`gap-y-3`],[1,`flex`,`items-center`,`gap-x-1`],[1,`font-medium`,`tabular-nums`],[1,`max-w-[60%]`,`truncate`,`font-mono`,`text-sm`,`font-medium`],[1,`font-medium`],[`appearance`,`outlined`,1,`p-6`],[1,`mt-2`,`w-full`],[1,`grid`,`w-full`,`grid-cols-1`,`gap-6`,`sm:grid-cols-2`,`xl:grid-cols-2`],[`appearance`,`outlined`,1,`relative`,`overflow-hidden`,`px-5`,`py-4`],[`appearance`,`outlined`,1,`px-5`,`py-8`],[1,`flex`,`flex-col`,`gap-3`,`px-5`,`py-4`,`sm:flex-row`,`sm:items-center`],[1,`text-sm`,`text-neutral-500`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[1,`px-5`,`pb-3`],[`aria-label`,`Log sources`,3,`change`,`multiple`,`value`],[3,`value`],[1,`max-h-96`,`overflow-y-auto`,`bg-neutral-950`,`px-4`,`py-3`,`font-mono`,`text-xs`,`leading-relaxed`,`text-neutral-200`],[1,`flex`,`gap-x-2`,`whitespace-pre-wrap`,`break-all`],[1,`flex`,`items-center`,`gap-x-2`],[`svgIcon`,`sparkles`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`truncate`,`text-lg`,`font-medium`,`tracking-tight`],[1,`mt-6`,`flex`,`flex-col`,`gap-y-4`],[1,`flex`,`items-start`,`gap-x-3`],[1,`size-4`,3,`svgIcon`],[1,`text-5xl`,`font-semibold`,`tabular-nums`],[1,`mt-2`,`flex`,`items-center`,`gap-x-1`],[1,`mt-4`,`flex`,`items-start`,`gap-x-3`],[`svgIcon`,`octagon-alert`,1,`size-5`,`shrink-0`,`text-neutral-500`],[`svgIcon`,`activity`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`mt-4`,`grid`,`grid-cols-3`,`gap-3`],[1,`text-xs`,`font-medium`,`text-neutral-500`],[1,`h-16`,3,`chart`,`colors`,`fill`,`series`,`stroke`,`tooltip`],[1,`absolute`,`right-0`,`bottom-0`,`-m-6`,`h-24`,`w-24`],[1,`size-24`,3,`ngClass`,`svgIcon`],[1,`flex`,`items-center`],[1,`text-sm`,`font-medium`,3,`ngClass`],[1,`-mt-2`,`ml-auto`],[1,`mt-4`,`flex`,`flex-row`,`flex-wrap`,`gap-6`],[1,`flex`,`flex-col`],[1,`text-3xl`,`font-medium`,`tabular-nums`],[1,`max-w-56`,`truncate`,`text-sm`,`text-neutral-500`],[1,`mt-3`],[`mat-icon-button`,``,`type`,`button`,3,`matMenuTriggerFor`],[`svgIcon`,`ellipsis`],[`mat-menu-item`,``,`target`,`_blank`,`rel`,`noopener`,3,`href`],[`matButton`,``,`target`,`_blank`,`rel`,`noopener`,3,`href`],[1,`shrink-0`,`text-neutral-500`],[1,`w-24`,`shrink-0`,`truncate`,`font-semibold`,3,`ngClass`],[3,`ngClass`],[1,`size-5`,`shrink-0`,`text-neutral-500`,3,`svgIcon`],[`matButton`,``,1,`mt-1`,3,`routerLink`],[`svgIcon`,`circle-check`,1,`size-5`,`shrink-0`,`text-green-600`]],template:function(e,t){if(e&1&&(Ls(0,`div`,2)(1,`div`,3)(2,`div`,4)(3,`div`,5),sC(4,` Overview `),Hl(),Ls(5,`div`,6),sC(6,` Live host utilization, topology, and streaming logs `),Hl()(),fm(7,`div`,7),Ls(8,`div`,8),fm(9,`span`,9),sC(10),Hl()(),gw(11,oi,1,1,`ao-error-state`,10),Ls(12,`div`,11),vw(13,ci,14,9,`mat-card`,12,ai),Hl(),Ls(15,`mat-card`,13)(16,`div`,14)(17,`div`,15)(18,`div`,16),sC(19,` Host utilization `),Hl(),Ls(20,`div`,17),sC(21),Hl()()(),Ls(22,`div`,18)(23,`div`,19)(24,`div`,20)(25,`div`,15)(26,`div`,21),sC(27,`CPU`),Hl(),Ls(28,`div`,22),sC(29),Hl(),Ls(30,`div`,23),sC(31),Hl()(),Ls(32,`div`)(33,`div`,21),sC(34,`CPU`),Hl(),Ls(35,`div`,24),sC(36),gw(37,si,2,0,`span`,25),Hl()(),Ls(38,`div`)(39,`div`,21),sC(40,`Memory`),Hl(),Ls(41,`div`,24),sC(42),gw(43,li,2,0,`span`,25),Hl()()(),fm(44,`apx-chart`,26),Hl(),Ls(45,`div`,19)(46,`div`,20)(47,`div`,15)(48,`div`,21),sC(49,`GPU`),Hl(),Ls(50,`div`,22),sC(51),Hl(),Ls(52,`div`,23),sC(53),gw(54,di,1,1),Hl()(),Ls(55,`div`)(56,`div`,21),sC(57,`GPU`),Hl(),Ls(58,`div`,24),sC(59),gw(60,pi,2,0,`span`,25),Hl()(),Ls(61,`div`)(62,`div`,21),sC(63,`VRAM`),Hl(),Ls(64,`div`,24),sC(65),gw(66,mi,2,0,`span`,25),Hl()()(),fm(67,`apx-chart`,26),Hl()(),fm(68,`mat-divider`),Ls(69,`div`,27)(70,`div`)(71,`div`,17),sC(72,`Load`),Hl(),Ls(73,`div`,28),sC(74),Hl()(),Ls(75,`div`)(76,`div`,17),sC(77,`Uptime`),Hl(),Ls(78,`div`,28),sC(79),Hl()(),Ls(80,`div`,29)(81,`div`,17),sC(82,`CPU`),Hl(),fm(83,`mat-progress-bar`,30),Hl(),Ls(84,`div`,29)(85,`div`,17),sC(86,`Memory`),Hl(),fm(87,`mat-progress-bar`,30),Hl(),Ls(88,`div`,29)(89,`div`,17),sC(90,`GPU`),Hl(),fm(91,`mat-progress-bar`,30),Hl(),Ls(92,`div`,29)(93,`div`,17),sC(94,`VRAM`),Hl(),fm(95,`mat-progress-bar`,30),Hl()()(),Ls(96,`div`,31)(97,`mat-card`,32)(98,`mat-card-header`)(99,`div`,33),fm(100,`mat-icon`,34),Ls(101,`div`,35),sC(102,`Web process`),Hl(),Ls(103,`div`,36)(104,`a`,37),sC(105,` Open chat `),Hl()()()(),Ls(106,`mat-card-content`,38)(107,`div`,39),sC(108),Hl(),Ls(109,`div`,40),sC(110,` Coordinator web UI and Admin API process `),Hl(),Ls(111,`div`,41)(112,`div`,42)(113,`div`,6),sC(114,`pid`),Hl(),fm(115,`div`,7),Ls(116,`div`,43),sC(117),Hl()(),Ls(118,`div`,42)(119,`div`,6),sC(120,`instance`),Hl(),fm(121,`div`,7),Ls(122,`div`,44),sC(123),Hl()(),Ls(124,`div`,42)(125,`div`,6),sC(126,`user`),Hl(),fm(127,`div`,7),Ls(128,`div`,45),sC(129),Hl()()()()(),gw(130,hi,9,1,`mat-card`,46)(131,ui,18,21,`mat-card`,46),Hl(),Ls(132,`div`,47)(133,`div`,5),sC(134,` Topology `),Hl(),Ls(135,`div`,6),sC(136,` Runtime components and how they are exposed on this host `),Hl()(),Ls(137,`div`,48),vw(138,fi,28,10,`mat-card`,49,Rt,!1,_i,3,0,`mat-card`,50),Hl(),Ls(141,`mat-card`,13)(142,`div`,51)(143,`div`,15)(144,`div`,16),sC(145,`Live logs`),Hl(),Ls(146,`div`,52),sC(147,` Streaming from web + kubectl tails when available `),Hl()(),Ls(148,`button`,53),vm(`click`,function(){return t.live.clearLogs()}),sC(149,` Clear `),Hl()(),Ls(150,`div`,54)(151,`mat-chip-listbox`,55),vm(`change`,function(l){return t.onSourcesChange(l)}),vw(152,yi,2,2,`mat-chip-option`,56,yw),Hl()(),fm(154,`mat-divider`),Ls(155,`div`,57,0),vw(157,bi,7,5,`div`,58,Rt,!1,Si,2,0,`div`,6),Hl()(),Ls(160,`mat-card`,46)(161,`div`,59),fm(162,`mat-icon`,60),Ls(163,`div`,61),sC(164,` Needs attention `),Hl()(),Ls(165,`div`,62),vw(166,Ci,6,3,`div`,63,ri,!1,wi,4,0,`div`,63),Hl()()()),e&2){let i;mI(8),dm(`ngClass`,t.live.connected()?`text-green-600`:`text-neutral-500`),mI(),dm(`ngClass`,t.live.connected()?`bg-green-500 animate-pulse`:`bg-neutral-400`),mI(),ql(` `,t.live.connected()?`Live`:`Reconnecting…`,` `),mI(),mw(t.error()?11:-1),mI(2),Dw(t.summary()),mI(8),km(` `,t.live.metrics()?.hostname||`Coordinator host`,` · scope `,t.live.metrics()?.scope||`—`,` · WebSocket push ~2s `),mI(8),ql(` `,t.live.cpuModel()||`—`,` `),mI(2),km(` `,t.live.metrics()?.cpu?.cores??`—`,` cores · memory `,t.live.memoryLabel()||`—`,` `),mI(5),ql(` `,t.live.latestCpu()??`—`),mI(),mw(t.live.latestCpu()!=null?37:-1),mI(5),ql(` `,t.live.latestMem()??`—`),mI(),mw(t.live.latestMem()!=null?43:-1),mI(),dm(`chart`,t.utilChart.chart)(`colors`,t.cpuMemChartColors)(`dataLabels`,t.utilChart.dataLabels)(`fill`,t.utilChart.fill)(`grid`,t.utilChart.grid)(`legend`,t.utilChart.legend)(`series`,t.cpuMemSeries())(`stroke`,t.utilChart.stroke)(`tooltip`,t.utilChart.tooltip())(`xaxis`,t.utilChart.xaxis)(`yaxis`,t.utilChart.yaxis),mI(7),ql(` `,t.live.gpuName()||`No GPU metrics`,` `),mI(2),ql(` VRAM `,t.live.vramLabel()||`—`,` `),mI(),mw(t.live.metrics()?.gpu?.vramSource?54:-1),mI(5),ql(` `,t.live.latestGpu()??`—`),mI(),mw(t.live.latestGpu()!=null?60:-1),mI(5),ql(` `,t.live.latestVram()??`—`),mI(),mw(t.live.latestVram()!=null?66:-1),mI(),dm(`chart`,t.utilChart.chart)(`colors`,t.gpuVramChartColors)(`dataLabels`,t.utilChart.dataLabels)(`fill`,t.utilChart.fill)(`grid`,t.utilChart.grid)(`legend`,t.utilChart.legend)(`series`,t.gpuVramSeries())(`stroke`,t.utilChart.stroke)(`tooltip`,t.utilChart.tooltip())(`xaxis`,t.utilChart.xaxis)(`yaxis`,t.utilChart.yaxis),mI(7),ql(` `,(t.live.metrics()?.loadAvg||hC(62,Tt)).join(` · `)||`—`,` `),mI(5),ql(` `,t.formatUptime(t.live.metrics()?.uptimeSec),` `),mI(4),dm(`color`,t.resourceBarColor(t.live.latestCpu()))(`value`,t.live.latestCpu()??0),mI(4),dm(`color`,t.resourceBarColor(t.live.latestMem()))(`value`,t.live.latestMem()??0),mI(4),dm(`color`,t.resourceBarColor(t.live.latestGpu()))(`value`,t.live.latestGpu()??0),mI(4),dm(`color`,t.resourceBarColor(t.live.latestVram()))(`value`,t.live.latestVram()??0),mI(13),ql(` `,t.ping()?.service||`—`,` `),mI(9),ql(` `,t.ping()?.pid??`—`,` `),mI(6),ql(` `,t.ping()?.instance||`—`,` `),mI(6),ql(` `,t.session()?.userName||`—`,` `),mI(),mw((i=t.topology()?.reachGuard)?130:131,i),mI(8),Dw(t.components()),mI(13),dm(`multiple`,!0)(`value`,t.selectedSources()),mI(),Dw(t.live.logSourceOptions()),mI(5),Dw(t.filteredLogs()),mI(9),Dw(t.topology()?.attention||hC(63,Tt))}},dependencies:[Dt$1,I$2,lt,dt,Z,yt$1,wt$1,Lt$1,I$1,G,Bt,w,I,A,m,Mt,Et,ke,Ne,yT,Dt,_T],encapsulation:2})};export{Ot as OverviewPage};