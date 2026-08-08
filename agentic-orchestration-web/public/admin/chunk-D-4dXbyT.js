import{$ as Km,$n as gm,A as Fy,An as ba,At as R,Ci as zl,Cr as oa,D as Ei$1,Di as zw,Dn as bC,Et as Pm,Fr as qr,Ft as Re,G as Im,Gn as fT,Hn as ea,I as Gm,Ir as rC,It as Rm,Jn as fs,Jt as Vh,K as Ir,Kr as uH,Ln as dH,Mn as bm,Mr as ql,Nt as RT,Or as q,Pn as bw,Pr as qn,Rn as dg,U as Hw,Ut as Tm,V as Hd,Vn as eI,Wn as fH,Wt as Tw,X as Jl,Xt as Vs,Yr as v,Yt as Vn,Zt as Vw,_ as CG,_t as Nn,b as Cw,ct as Mf,dr as jw,ei as ve,er as gv,fn as Yl,gi as yD,gn as Zl,gr as lG,hr as kn,ii as wC,lt as Mm,mi as xm,mr as km,mt as NS,n as $i,nn as Wd,nr as hC,o as $w,oi as wI,ot as MC,p as Bv,pi as xe$1,qn as fe,qt as Vd,r as $m,ri as vy,rr as hH,rt as LC,s as AC,sr as ie,st as MT,tr as h,tt as L,u as Ap,ui as ww,ur as js,vi as yl,vn as _m,w as Da,wt as P,xr as nM,y as Ct$1,yt as O,z as Gw,zt as Sw}from"./chunk-D-Xh3agN.js";import{n as yt$1,r as Dt$1,t as wt$1,v as Lt}from"./main-J3ZIU3TR.js";import{t as l}from"./chunk-BaPahABB.js";import"./chunk-Bf1UGpln.js";import"./chunk-DhFDnquC.js";import"./chunk-CFvWdEFA.js";import{a as mn,i as hn,n as Te,t as Ie}from"./chunk-asU9MVMR.js";import{n as dt,r as lt,t as Z}from"./chunk-Bm_wY86e.js";import"./chunk-D7yfR9GS.js";import{u as xe$2}from"./chunk-VP4FtH9G.js";import{n as I,r as w,t as A}from"./chunk-ClwZ4X-k.js";import{t as I$1}from"./chunk-BgTQacSX.js";import{t as m}from"./chunk-CpYNw46U.js";var St=[`*`,[[`mat-chip-avatar`],[``,`matChipAvatar`,``]],[[`mat-chip-trailing-icon`],[``,`matChipRemove`,``],[``,`matChipTrailingIcon`,``]]];var xt=[`*`,`mat-chip-avatar, [matChipAvatar]`,`mat-chip-trailing-icon,[matChipRemove],[matChipTrailingIcon]`];function jt(a,i){a&1&&(js(0,`span`,3),Hw(1,1),ql())}function Vt(a,i){a&1&&(js(0,`span`,6),Hw(1,2),ql())}function Gt(a,i){a&1&&(js(0,`span`,3),Hw(1,1),js(2,`span`,7),Ap(),js(3,`svg`,8),Im(4,`path`,9),ql()()())}function Ut(a,i){a&1&&(js(0,`span`,6),Hw(1,2),ql())}var qt=`.mdc-evolution-chip,
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
`;var Ct=[`*`];var Qt=`.mat-mdc-chip-set {
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
`;var wt=new v(`mat-chips-default-options`,{providedIn:`root`,factory:()=>({separatorKeyCodes:[13]})});var ft=new v(`MatChipAvatar`);var _t=new v(`MatChipTrailingIcon`);var yt=new v(`MatChipEdit`);var bt=new v(`MatChipRemove`);var Ce=new v(`MatChip`);var Nt=(()=>{class a{_elementRef=h(ie);_parentChip=h(Ce);_isPrimary=!0;_isLeading=!1;get disabled(){return this._disabled||this._parentChip?.disabled||!1}set disabled(e){this._disabled=e}_disabled=!1;tabIndex=-1;_allowFocusWhenDisabled=!1;_getDisabledAttribute(){return this.disabled&&!this._allowFocusWhenDisabled?``:null}constructor(){h(qn).load(lG),this._elementRef.nativeElement.nodeName===`BUTTON`&&this._elementRef.nativeElement.setAttribute(`type`,`button`)}focus(){this._elementRef.nativeElement.focus()}static ɵfac=function(t){return new(t||a)};static ɵdir=Re({type:a,selectors:[[``,`matChipContent`,``]],hostAttrs:[1,`mat-mdc-chip-action`,`mdc-evolution-chip__action`,`mdc-evolution-chip__action--presentational`],hostVars:8,hostBindings:function(t,n){t&2&&(zl(`disabled`,n._getDisabledAttribute())(`aria-disabled`,n.disabled),ea(`mdc-evolution-chip__action--primary`,n._isPrimary)(`mdc-evolution-chip__action--secondary`,!n._isPrimary)(`mdc-evolution-chip__action--trailing`,!n._isPrimary&&!n._isLeading))},inputs:{disabled:[2,`disabled`,`disabled`,oa],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?-1:fT(e)],_allowFocusWhenDisabled:`_allowFocusWhenDisabled`}})}return a})();var kt=(()=>{class a extends Nt{_getTabindex(){return this.disabled&&!this._allowFocusWhenDisabled?null:this.tabIndex.toString()}_handleClick(e){!this.disabled&&this._isPrimary&&(e.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}_handleKeydown(e){(e.keyCode===13||e.keyCode===32)&&!this.disabled&&this._isPrimary&&!this._parentChip._isEditing&&(e.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}static ɵfac=(()=>{let e;return function(n){return(e||(e=Vh(a)))(n||a)}})();static ɵdir=Re({type:a,selectors:[[``,`matChipAction`,``]],hostVars:3,hostBindings:function(t,n){t&1&&Mm(`click`,function(l){return n._handleClick(l)})(`keydown`,function(l){return n._handleKeydown(l)}),t&2&&(zl(`tabindex`,n._getTabindex()),ea(`mdc-evolution-chip__action--presentational`,!1))},features:[gm]})}return a})();var Se=(()=>{class a{_changeDetectorRef=h(vy);_elementRef=h(ie);_tagName=h(uH);_ngZone=h(P);_focusMonitor=h(gv);_globalRippleOptions=h(Wd,{optional:!0});_document=h(O);_onFocus=new L;_onBlur=new L;_isBasicChip=!1;role=null;_hasFocusInternal=!1;_pendingFocus=!1;_actionChanges;_animationsDisabled=Da();_allLeadingIcons;_allTrailingIcons;_allEditIcons;_allRemoveIcons;_hasFocus(){return this._hasFocusInternal}id=h(Hd).getId(`mat-mdc-chip-`);ariaLabel=null;ariaDescription=null;_chipListDisabled=!1;_hadFocusOnRemove=!1;_textElement;get value(){return this._value!==void 0?this._value:this._textElement.textContent.trim()}set value(e){this._value=e}_value;color;removable=!0;highlighted=!1;disableRipple=!1;get disabled(){return this._disabled||this._chipListDisabled}set disabled(e){this._disabled=e}_disabled=!1;removed=new fe;destroyed=new fe;basicChipAttrName=`mat-basic-chip`;leadingIcon;editIcon;trailingIcon;removeIcon;primaryAction;_rippleLoader=h(CG);_injector=h(q);constructor(){let e=h(qn);e.load(lG),e.load(ba),this._monitorFocus(),this._rippleLoader?.configureRipple(this._elementRef.nativeElement,{className:`mat-mdc-chip-ripple`,disabled:this._isRippleDisabled()})}ngOnInit(){this._isBasicChip=this._elementRef.nativeElement.hasAttribute(this.basicChipAttrName)||this._tagName.toLowerCase()===this.basicChipAttrName}ngAfterViewInit(){this._textElement=this._elementRef.nativeElement.querySelector(`.mat-mdc-chip-action-label`),this._pendingFocus&&(this._pendingFocus=!1,this.focus())}ngAfterContentInit(){this._actionChanges=yD(this._allLeadingIcons.changes,this._allTrailingIcons.changes,this._allEditIcons.changes,this._allRemoveIcons.changes).subscribe(()=>this._changeDetectorRef.markForCheck())}ngDoCheck(){this._rippleLoader.setDisabled(this._elementRef.nativeElement,this._isRippleDisabled())}ngOnDestroy(){this.destroyed.emit({chip:this}),this.destroyed.complete(),this._focusMonitor.stopMonitoring(this._elementRef),this._rippleLoader?.destroyRipple(this._elementRef.nativeElement),this._actionChanges?.unsubscribe()}remove(){this.removable&&(this._hadFocusOnRemove=this._hasFocus(),this.removed.emit({chip:this}))}_isRippleDisabled(){return this.disabled||this.disableRipple||this._animationsDisabled||this._isBasicChip||!this._hasInteractiveActions()||!!this._globalRippleOptions?.disabled}_hasTrailingIcon(){return!!(this.trailingIcon||this.removeIcon)}_handleKeydown(e){(e.keyCode===8&&!e.repeat||e.keyCode===46)&&(e.preventDefault(),this.remove())}focus(){this.disabled||(this.primaryAction?this.primaryAction.focus():this._pendingFocus=!0)}_getSourceAction(e){return this._getActions().find(t=>{let n=t._elementRef.nativeElement;return n===e||n.contains(e)})}_getActions(){let e=[];return this.editIcon&&e.push(this.editIcon),this.primaryAction&&e.push(this.primaryAction),this.removeIcon&&e.push(this.removeIcon),e}_handlePrimaryActionInteraction(){}_hasInteractiveActions(){return this._getActions().length>0}_edit(e){}_monitorFocus(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{let t=e!==null;t!==this._hasFocusInternal&&(this._hasFocusInternal=t,t?this._onFocus.next({chip:this}):(this._changeDetectorRef.markForCheck(),setTimeout(()=>this._ngZone.run(()=>this._onBlur.next({chip:this})))))})}static ɵfac=function(t){return new(t||a)};static ɵcmp=Vn({type:a,selectors:[[`mat-basic-chip`],[``,`mat-basic-chip`,``],[`mat-chip`],[``,`mat-chip`,``]],contentQueries:function(t,n,d){if(t&1&&xm(d,ft,5)(d,yt,5)(d,_t,5)(d,bt,5)(d,ft,5)(d,_t,5)(d,yt,5)(d,bt,5),t&2){let l;$w(l=Gw())&&(n.leadingIcon=l.first),$w(l=Gw())&&(n.editIcon=l.first),$w(l=Gw())&&(n.trailingIcon=l.first),$w(l=Gw())&&(n.removeIcon=l.first),$w(l=Gw())&&(n._allLeadingIcons=l),$w(l=Gw())&&(n._allTrailingIcons=l),$w(l=Gw())&&(n._allEditIcons=l),$w(l=Gw())&&(n._allRemoveIcons=l)}},viewQuery:function(t,n){if(t&1&&Rm(kt,5),t&2){let d;$w(d=Gw())&&(n.primaryAction=d.first)}},hostAttrs:[1,`mat-mdc-chip`],hostVars:31,hostBindings:function(t,n){t&1&&Mm(`keydown`,function(l){return n._handleKeydown(l)}),t&2&&(Tm(`id`,n.id),zl(`role`,n.role)(`aria-label`,n.ariaLabel),rC(`mat-`+(n.color||`primary`)),ea(`mdc-evolution-chip`,!n._isBasicChip)(`mdc-evolution-chip--disabled`,n.disabled)(`mdc-evolution-chip--with-trailing-action`,n._hasTrailingIcon())(`mdc-evolution-chip--with-primary-graphic`,n.leadingIcon)(`mdc-evolution-chip--with-primary-icon`,n.leadingIcon)(`mdc-evolution-chip--with-avatar`,n.leadingIcon)(`mat-mdc-chip-with-avatar`,n.leadingIcon)(`mat-mdc-chip-highlighted`,n.highlighted)(`mat-mdc-chip-disabled`,n.disabled)(`mat-mdc-basic-chip`,n._isBasicChip)(`mat-mdc-standard-chip`,!n._isBasicChip)(`mat-mdc-chip-with-trailing-icon`,n._hasTrailingIcon())(`_mat-animation-noopable`,n._animationsDisabled))},inputs:{role:`role`,id:`id`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaDescription:[0,`aria-description`,`ariaDescription`],value:`value`,color:`color`,removable:[2,`removable`,`removable`,oa],highlighted:[2,`highlighted`,`highlighted`,oa],disableRipple:[2,`disableRipple`,`disableRipple`,oa],disabled:[2,`disabled`,`disabled`,oa]},outputs:{removed:`removed`,destroyed:`destroyed`},exportAs:[`matChip`],features:[Km([{provide:Ce,useExisting:a}])],ngContentSelectors:xt,decls:8,vars:2,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipContent`,``],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`]],template:function(t,n){t&1&&(Vw(St),Im(0,`span`,0),js(1,`span`,1)(2,`span`,2),bw(3,jt,2,0,`span`,3),js(4,`span`,4),Hw(5),Im(6,`span`,5),ql()()(),bw(7,Vt,2,0,`span`,6)),t&2&&(wI(3),ww(n.leadingIcon?3:-1),wI(4),ww(n._hasTrailingIcon()?7:-1))},dependencies:[Nt],styles:[`.mdc-evolution-chip,
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
`],encapsulation:2})}return a})();var we=(()=>{class a extends Se{_defaultOptions=h(wt,{optional:!0});chipListSelectable=!0;_chipListMultiple=!1;_chipListHideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get selectable(){return this._selectable&&this.chipListSelectable}set selectable(e){this._selectable=e,this._changeDetectorRef.markForCheck()}_selectable=!0;get selected(){return this._selected}set selected(e){this._setSelectedState(e,!1,!0)}_selected=!1;get ariaSelected(){return this.selectable?this.selected.toString():null}basicChipAttrName=`mat-basic-chip-option`;selectionChange=new fe;ngOnInit(){super.ngOnInit(),this.role=`presentation`}select(){this._setSelectedState(!0,!1,!0)}deselect(){this._setSelectedState(!1,!1,!0)}selectViaInteraction(){this._setSelectedState(!0,!0,!0)}toggleSelected(e=!1){return this._setSelectedState(!this.selected,e,!0),this.selected}_handlePrimaryActionInteraction(){this.disabled||(this.focus(),this.selectable&&this.toggleSelected(!0))}_hasLeadingGraphic(){return this.leadingIcon?!0:!this._chipListHideSingleSelectionIndicator||this._chipListMultiple}_setSelectedState(e,t,n){e!==this.selected&&(this._selected=e,n&&this.selectionChange.emit({source:this,isUserInput:t,selected:this.selected}),this._changeDetectorRef.markForCheck())}static ɵfac=(()=>{let e;return function(n){return(e||(e=Vh(a)))(n||a)}})();static ɵcmp=Vn({type:a,selectors:[[`mat-basic-chip-option`],[``,`mat-basic-chip-option`,``],[`mat-chip-option`],[``,`mat-chip-option`,``]],hostAttrs:[1,`mat-mdc-chip`,`mat-mdc-chip-option`],hostVars:37,hostBindings:function(t,n){t&2&&(Tm(`id`,n.id),zl(`tabindex`,null)(`aria-label`,null)(`aria-description`,null)(`role`,n.role),ea(`mdc-evolution-chip`,!n._isBasicChip)(`mdc-evolution-chip--filter`,!n._isBasicChip)(`mdc-evolution-chip--selectable`,!n._isBasicChip)(`mat-mdc-chip-selected`,n.selected)(`mat-mdc-chip-multiple`,n._chipListMultiple)(`mat-mdc-chip-disabled`,n.disabled)(`mat-mdc-chip-with-avatar`,n.leadingIcon)(`mdc-evolution-chip--disabled`,n.disabled)(`mdc-evolution-chip--selected`,n.selected)(`mdc-evolution-chip--selecting`,!n._animationsDisabled)(`mdc-evolution-chip--with-trailing-action`,n._hasTrailingIcon())(`mdc-evolution-chip--with-primary-icon`,n.leadingIcon)(`mdc-evolution-chip--with-primary-graphic`,n._hasLeadingGraphic())(`mdc-evolution-chip--with-avatar`,n.leadingIcon)(`mat-mdc-chip-highlighted`,n.highlighted)(`mat-mdc-chip-with-trailing-icon`,n._hasTrailingIcon()))},inputs:{selectable:[2,`selectable`,`selectable`,oa],selected:[2,`selected`,`selected`,oa]},outputs:{selectionChange:`selectionChange`},features:[Km([{provide:Se,useExisting:a},{provide:Ce,useExisting:a}]),gm],ngContentSelectors:xt,decls:8,vars:6,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipAction`,``,`role`,`option`,3,`_allowFocusWhenDisabled`],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`],[1,`mdc-evolution-chip__checkmark`],[`viewBox`,`-2 -3 30 30`,`focusable`,`false`,`aria-hidden`,`true`,1,`mdc-evolution-chip__checkmark-svg`],[`fill`,`none`,`stroke`,`currentColor`,`d`,`M1.73,12.91 8.1,19.28 22.79,4.59`,1,`mdc-evolution-chip__checkmark-path`]],template:function(t,n){t&1&&(Vw(St),Im(0,`span`,0),js(1,`span`,1)(2,`button`,2),bw(3,Gt,5,0,`span`,3),js(4,`span`,4),Hw(5),Im(6,`span`,5),ql()()(),bw(7,Ut,2,0,`span`,6)),t&2&&(wI(2),_m(`_allowFocusWhenDisabled`,!0),zl(`aria-description`,n.ariaDescription)(`aria-label`,n.ariaLabel)(`aria-selected`,n.ariaSelected),wI(),ww(n._hasLeadingGraphic()?3:-1),wI(4),ww(n._hasTrailingIcon()?7:-1))},dependencies:[kt],styles:[qt],encapsulation:2})}return a})();var Xt=(()=>{class a{_elementRef=h(ie);_changeDetectorRef=h(vy);_dir=h(nM,{optional:!0});_lastDestroyedFocusedChipIndex=null;_keyManager;_destroyed=new L;_defaultRole=`presentation`;get chipFocusChanges(){return this._getChipStream(e=>e._onFocus)}get chipDestroyedChanges(){return this._getChipStream(e=>e.destroyed)}get chipRemovedChanges(){return this._getChipStream(e=>e.removed)}get disabled(){return this._disabled}set disabled(e){this._disabled=e,this._syncChipsState()}_disabled=!1;get empty(){return!this._chips||this._chips.length===0}get role(){return this._explicitRole?this._explicitRole:this.empty?null:this._defaultRole}tabIndex=0;set role(e){this._explicitRole=e}_explicitRole=null;get focused(){return this._hasFocusedChip()}_chips;_chipActions=new kn;ngAfterViewInit(){this._setUpFocusManagement(),this._trackChipSetChanges(),this._trackDestroyedFocusedChip()}ngOnDestroy(){this._keyManager?.destroy(),this._chipActions.destroy(),this._destroyed.next(),this._destroyed.complete()}_hasFocusedChip(){return this._chips&&this._chips.some(e=>e._hasFocus())}_syncChipsState(){this._chips?.forEach(e=>{e._chipListDisabled=this._disabled,e._changeDetectorRef.markForCheck()})}focus(){}_handleKeydown(e){this._originatesFromChip(e)&&this._keyManager.onKeydown(e)}_isValidIndex(e){return e>=0&&e<this._chips.length}_allowFocusEscape(){let e=this._elementRef.nativeElement.tabIndex;e!==-1&&(this._elementRef.nativeElement.tabIndex=-1,setTimeout(()=>this._elementRef.nativeElement.tabIndex=e))}_getChipStream(e){return this._chips.changes.pipe(Ei$1(null),Mf(()=>yD(...this._chips.map(e))))}_originatesFromChip(e){let t=e.target;for(;t&&t!==this._elementRef.nativeElement;){if(t.classList.contains(`mat-mdc-chip`))return!0;t=t.parentElement}return!1}_setUpFocusManagement(){this._chips.changes.pipe(Ei$1(this._chips)).subscribe(e=>{let t=[];e.forEach(n=>n._getActions().forEach(d=>t.push(d))),this._chipActions.reset(t),this._chipActions.notifyOnChanges()}),this._keyManager=new Vd(this._chipActions).withVerticalOrientation().withHorizontalOrientation(this._dir?this._dir.value:`ltr`).withHomeAndEnd().skipPredicate(e=>this._skipPredicate(e)),this.chipFocusChanges.pipe(qr(this._destroyed)).subscribe(({chip:e})=>{let t=e._getSourceAction(document.activeElement);t&&this._keyManager.updateActiveItem(t)}),this._dir?.change.pipe(qr(this._destroyed)).subscribe(e=>this._keyManager.withHorizontalOrientation(e))}_skipPredicate(e){return e.disabled}_trackChipSetChanges(){this._chips.changes.pipe(Ei$1(null),qr(this._destroyed)).subscribe(()=>{this.disabled&&Promise.resolve().then(()=>this._syncChipsState()),this._redirectDestroyedChipFocus()})}_trackDestroyedFocusedChip(){this.chipDestroyedChanges.pipe(qr(this._destroyed)).subscribe(e=>{let n=this._chips.toArray().indexOf(e.chip),d=e.chip._hasFocus(),l=e.chip._hadFocusOnRemove&&this._keyManager.activeItem&&e.chip._getActions().includes(this._keyManager.activeItem),_=d||l;this._isValidIndex(n)&&_&&(this._lastDestroyedFocusedChipIndex=n)})}_redirectDestroyedChipFocus(){if(this._lastDestroyedFocusedChipIndex!=null){if(this._chips.length){let e=Math.min(this._lastDestroyedFocusedChipIndex,this._chips.length-1),t=this._chips.toArray()[e];t.disabled?this._chips.length===1?this.focus():this._keyManager.setPreviousItemActive():t.focus()}else this.focus();this._lastDestroyedFocusedChipIndex=null}}static ɵfac=function(t){return new(t||a)};static ɵcmp=Vn({type:a,selectors:[[`mat-chip-set`]],contentQueries:function(t,n,d){if(t&1&&xm(d,Se,5),t&2){let l;$w(l=Gw())&&(n._chips=l)}},hostAttrs:[1,`mat-mdc-chip-set`,`mdc-evolution-chip-set`],hostVars:1,hostBindings:function(t,n){t&1&&Mm(`keydown`,function(l){return n._handleKeydown(l)}),t&2&&zl(`role`,n.role)},inputs:{disabled:[2,`disabled`,`disabled`,oa],role:`role`,tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:fT(e)]},ngContentSelectors:Ct,decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(t,n){t&1&&(Vw(),Zl(0,`div`,0),Hw(1),Yl())},styles:[`.mat-mdc-chip-set {
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
`],encapsulation:2})}return a})();var xe=class{source;value;constructor(i,e){this.source=i,this.value=e}};var $t={provide:xe$2,useExisting:$i(()=>Ne),multi:!0};var Ne=(()=>{class a extends Xt{_onTouched=()=>{};_onChange=()=>{};_defaultRole=`listbox`;_defaultOptions=h(wt,{optional:!0});get multiple(){return this._multiple}set multiple(e){this._multiple=e,this._syncListboxProperties()}_multiple=!1;get selected(){let e=this._chips.toArray().filter(t=>t.selected);return this.multiple?e:e[0]}ariaOrientation=`horizontal`;get selectable(){return this._selectable}set selectable(e){this._selectable=e,this._syncListboxProperties()}_selectable=!0;compareWith=(e,t)=>e===t;required=!1;get hideSingleSelectionIndicator(){return this._hideSingleSelectionIndicator}set hideSingleSelectionIndicator(e){this._hideSingleSelectionIndicator=e,this._syncListboxProperties()}_hideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get chipSelectionChanges(){return this._getChipStream(e=>e.selectionChange)}get chipBlurChanges(){return this._getChipStream(e=>e._onBlur)}get value(){return this._value}set value(e){this._chips&&this._chips.length&&this._setSelectionByValue(e,!1),this._value=e}_value;change=new fe;_chips=void 0;ngAfterContentInit(){this._chips.changes.pipe(Ei$1(null),qr(this._destroyed)).subscribe(()=>{this.value!==void 0&&Promise.resolve().then(()=>{this._setSelectionByValue(this.value,!1)}),this._syncListboxProperties()}),this.chipBlurChanges.pipe(qr(this._destroyed)).subscribe(()=>this._blur()),this.chipSelectionChanges.pipe(qr(this._destroyed)).subscribe(e=>{this.multiple||this._chips.forEach(t=>{t!==e.source&&t._setSelectedState(!1,!1,!1)}),e.isUserInput&&this._propagateChanges()})}focus(){if(this.disabled)return;let e=this._getFirstSelectedChip();e&&!e.disabled?e.focus():this._chips.length>0?this._keyManager.setFirstItemActive():this._elementRef.nativeElement.focus()}writeValue(e){e!=null?this.value=e:this.value=void 0}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}setDisabledState(e){this.disabled=e}_setSelectionByValue(e,t=!0){this._clearSelection(),Array.isArray(e)?e.forEach(n=>this._selectValue(n,t)):this._selectValue(e,t)}_blur(){this.disabled||setTimeout(()=>{this.focused||this._markAsTouched()})}_keydown(e){e.keyCode===9&&super._allowFocusEscape()}_markAsTouched(){this._onTouched(),this._changeDetectorRef.markForCheck()}_propagateChanges(){let e=null;Array.isArray(this.selected)?e=this.selected.map(t=>t.value):e=this.selected?this.selected.value:void 0,this._value=e,this.change.emit(new xe(this,e)),this._onChange(e),this._changeDetectorRef.markForCheck()}_clearSelection(e){this._chips.forEach(t=>{t!==e&&t.deselect()})}_selectValue(e,t){let n=this._chips.find(d=>d.value!=null&&this.compareWith(d.value,e));return n&&(t?n.selectViaInteraction():n.select()),n}_syncListboxProperties(){this._chips&&Promise.resolve().then(()=>{this._chips.forEach(e=>{e._chipListMultiple=this.multiple,e.chipListSelectable=this._selectable,e._chipListHideSingleSelectionIndicator=this.hideSingleSelectionIndicator,e._changeDetectorRef.markForCheck()})})}_getFirstSelectedChip(){return Array.isArray(this.selected)?this.selected.length?this.selected[0]:void 0:this.selected}_skipPredicate(e){return!1}static ɵfac=(()=>{let e;return function(n){return(e||(e=Vh(a)))(n||a)}})();static ɵcmp=Vn({type:a,selectors:[[`mat-chip-listbox`]],contentQueries:function(t,n,d){if(t&1&&xm(d,we,5),t&2){let l;$w(l=Gw())&&(n._chips=l)}},hostAttrs:[1,`mdc-evolution-chip-set`,`mat-mdc-chip-listbox`],hostVars:10,hostBindings:function(t,n){t&1&&Mm(`focus`,function(){return n.focus()})(`blur`,function(){return n._blur()})(`keydown`,function(l){return n._keydown(l)}),t&2&&(Tm(`tabIndex`,n.disabled||n.empty?-1:n.tabIndex),zl(`role`,n.role)(`aria-required`,n.role?n.required:null)(`aria-disabled`,n.disabled.toString())(`aria-multiselectable`,n.multiple)(`aria-orientation`,n.ariaOrientation),ea(`mat-mdc-chip-list-disabled`,n.disabled)(`mat-mdc-chip-list-required`,n.required))},inputs:{multiple:[2,`multiple`,`multiple`,oa],ariaOrientation:[0,`aria-orientation`,`ariaOrientation`],selectable:[2,`selectable`,`selectable`,oa],compareWith:`compareWith`,required:[2,`required`,`required`,oa],hideSingleSelectionIndicator:[2,`hideSingleSelectionIndicator`,`hideSingleSelectionIndicator`,oa],value:`value`},outputs:{change:`change`},features:[Km([$t]),gm],ngContentSelectors:Ct,decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(t,n){t&1&&(Vw(),Zl(0,`div`,0),Hw(1),Yl())},styles:[Qt],encapsulation:2})}return a})();function Kt(a,i){a&1&&bm(0,`div`,2)}var Zt=new v(`MAT_PROGRESS_BAR_DEFAULT_OPTIONS`);var Et=(()=>{class a{_elementRef=h(ie);_ngZone=h(P);_changeDetectorRef=h(vy);_renderer=h(Ir);_cleanupTransitionEnd;constructor(){let e=NS(),t=h(Zt,{optional:!0});this._isNoopAnimation=e===`di-disabled`,e===`reduced-motion`&&this._elementRef.nativeElement.classList.add(`mat-progress-bar-reduced-motion`),t&&(t.color&&(this.color=this._defaultColor=t.color),this.mode=t.mode||this.mode)}_isNoopAnimation;get color(){return this._color||this._defaultColor}set color(e){this._color=e}_color;_defaultColor=`primary`;get value(){return this._value}set value(e){this._value=It(e||0),this._changeDetectorRef.markForCheck()}_value=0;get bufferValue(){return this._bufferValue||0}set bufferValue(e){this._bufferValue=It(e||0),this._changeDetectorRef.markForCheck()}_bufferValue=0;animationEnd=new fe;get mode(){return this._mode}set mode(e){this._mode=e,this._changeDetectorRef.markForCheck()}_mode=`determinate`;ngAfterViewInit(){this._ngZone.runOutsideAngular(()=>{this._cleanupTransitionEnd=this._renderer.listen(this._elementRef.nativeElement,`transitionend`,this._transitionendHandler)})}ngOnDestroy(){this._cleanupTransitionEnd?.()}_getPrimaryBarTransform(){return`scaleX(${this._isIndeterminate()?1:this.value/100})`}_getBufferBarFlexBasis(){return`${this.mode===`buffer`?this.bufferValue:100}%`}_isIndeterminate(){return this.mode===`indeterminate`||this.mode===`query`}_transitionendHandler=e=>{this.animationEnd.observers.length===0||!e.target||!e.target.classList.contains(`mdc-linear-progress__primary-bar`)||(this.mode===`determinate`||this.mode===`buffer`)&&this._ngZone.run(()=>this.animationEnd.next({value:this.value}))};static ɵfac=function(t){return new(t||a)};static ɵcmp=Vn({type:a,selectors:[[`mat-progress-bar`]],hostAttrs:[`role`,`progressbar`,`aria-valuemin`,`0`,`aria-valuemax`,`100`,`tabindex`,`-1`,1,`mat-mdc-progress-bar`,`mdc-linear-progress`],hostVars:10,hostBindings:function(t,n){t&2&&(zl(`aria-valuenow`,n._isIndeterminate()?null:n.value)(`mode`,n.mode),rC(`mat-`+n.color),ea(`_mat-animation-noopable`,n._isNoopAnimation)(`mdc-linear-progress--animation-ready`,!n._isNoopAnimation)(`mdc-linear-progress--indeterminate`,n._isIndeterminate()))},inputs:{color:`color`,value:[2,`value`,`value`,fT],bufferValue:[2,`bufferValue`,`bufferValue`,fT],mode:`mode`},outputs:{animationEnd:`animationEnd`},exportAs:[`matProgressBar`],decls:7,vars:5,consts:[[`aria-hidden`,`true`,1,`mdc-linear-progress__buffer`],[1,`mdc-linear-progress__buffer-bar`],[1,`mdc-linear-progress__buffer-dots`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__primary-bar`],[1,`mdc-linear-progress__bar-inner`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__secondary-bar`]],template:function(t,n){t&1&&(Zl(0,`div`,0),bm(1,`div`,1),bw(2,Kt,1,0,`div`,2),Yl(),Zl(3,`div`,3),bm(4,`span`,4),Yl(),Zl(5,`div`,5),bm(6,`span`,4),Yl()),t&2&&(wI(),Pm(`flex-basis`,n._getBufferBarFlexBasis()),wI(),ww(n.mode===`buffer`?2:-1),wI(),Pm(`transform`,n._getPrimaryBarTransform()))},styles:[`.mat-mdc-progress-bar {
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
`],encapsulation:2})}return a})();function It(a,i=0,e=100){return Math.max(i,Math.min(e,a))}var Mt=(()=>{class a{static ɵfac=function(t){return new(t||a)};static ɵmod=xe$1({type:a});static ɵinj=ve({imports:[Bv]})}return a})();var Jt=[`chart`];var Dt=(()=>{class a{constructor(){this.chart=fH(),this.annotations=fH(),this.colors=fH(),this.dataLabels=fH(),this.series=fH(),this.stroke=fH(),this.labels=fH(),this.legend=fH(),this.markers=fH(),this.noData=fH(),this.parsing=fH(),this.fill=fH(),this.tooltip=fH(),this.plotOptions=fH(),this.responsive=fH(),this.xaxis=fH(),this.yaxis=fH(),this.forecastDataPoints=fH(),this.grid=fH(),this.states=fH(),this.title=fH(),this.subtitle=fH(),this.theme=fH(),this.autoUpdateSeries=fH(!0),this.chartReady=dH(),this.chartInstance=Ct$1(null),this.chartElement=hH.required(`chart`),this.ngZone=h(P),this.isBrowser=Fy(h(Nn)),this._destroyed=!1,this._injector=h(q),this.waitingForConnectedRef=null}ngOnChanges(e){this.isBrowser&&this.hydrate(e)}ngOnDestroy(){this.destroy(),this._destroyed=!0}get isConnected(){return this.chartElement()?.nativeElement.isConnected}hydrate(e){if(this.waitingForConnectedRef)return;if(this.chartInstance()&&this.autoUpdateSeries()&&Object.keys(e).filter(n=>n!==`series`).length===0){this.updateSeries(this.series(),!0);return}yl({read:()=>this.createElement()},{injector:this._injector})}importApexCharts(){return import(`./chunk-B4t3fBEx2.js`)}async createElement(){let{default:e}=await this.importApexCharts();if(window.ApexCharts||=e,this._destroyed)return;if(!this.isConnected){this.waitForConnected();return}let t={};[`annotations`,`chart`,`colors`,`dataLabels`,`series`,`stroke`,`labels`,`legend`,`fill`,`tooltip`,`plotOptions`,`responsive`,`markers`,`noData`,`parsing`,`xaxis`,`yaxis`,`forecastDataPoints`,`grid`,`states`,`title`,`subtitle`,`theme`].forEach(l=>{let _=this[l]();_&&(t[l]=_)}),this.destroy();let d=this.ngZone.runOutsideAngular(()=>new e(this.chartElement().nativeElement,t));this.chartInstance.set(d),this.render(),this.chartReady.emit({chartObj:d})}render(){if(this.isConnected)return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.render());this.waitForConnected()}updateOptions(e,t,n,d){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.updateOptions(e,t,n,d))}updateSeries(e,t){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.updateSeries(e,t))}appendSeries(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.appendSeries(e,t))}appendData(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.appendData(e))}highlightSeries(e){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.highlightSeries(e))}toggleSeries(e){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.toggleSeries(e))}showSeries(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.showSeries(e))}hideSeries(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.hideSeries(e))}resetSeries(){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.resetSeries())}zoomX(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.zoomX(e,t))}toggleDataPointSelection(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.toggleDataPointSelection(e,t))}destroy(){this.chartInstance()?.destroy(),this.chartInstance.set(null)}setLocale(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.setLocale(e))}paper(){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.paper())}addXaxisAnnotation(e,t,n){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.addXaxisAnnotation(e,t,n))}addYaxisAnnotation(e,t,n){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.addYaxisAnnotation(e,t,n))}addPointAnnotation(e,t,n){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.addPointAnnotation(e,t,n))}removeAnnotation(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.removeAnnotation(e,t))}clearAnnotations(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.clearAnnotations(e))}dataURI(e){return this.chartInstance()?.dataURI(e)}waitForConnected(){this.waitingForConnectedRef||(this.waitingForConnectedRef=eI({read:()=>{this.isConnected&&(this.waitingForConnectedRef.destroy(),this.waitingForConnectedRef=null,this.createElement())}},{injector:this._injector}))}static{this.ɵfac=function(t){return new(t||a)}}static{this.ɵcmp=Vn({type:a,selectors:[[`apx-chart`]],viewQuery:function(t,n){t&1&&km(n.chartElement,Jt,5),t&2&&zw()},inputs:{chart:[1,`chart`],annotations:[1,`annotations`],colors:[1,`colors`],dataLabels:[1,`dataLabels`],series:[1,`series`],stroke:[1,`stroke`],labels:[1,`labels`],legend:[1,`legend`],markers:[1,`markers`],noData:[1,`noData`],parsing:[1,`parsing`],fill:[1,`fill`],tooltip:[1,`tooltip`],plotOptions:[1,`plotOptions`],responsive:[1,`responsive`],xaxis:[1,`xaxis`],yaxis:[1,`yaxis`],forecastDataPoints:[1,`forecastDataPoints`],grid:[1,`grid`],states:[1,`states`],title:[1,`title`],subtitle:[1,`subtitle`],theme:[1,`theme`],autoUpdateSeries:[1,`autoUpdateSeries`]},outputs:{chartReady:`chartReady`},features:[Vs],decls:2,vars:0,consts:[[`chart`,``]],template:function(t,n){t&1&&bm(0,`div`,null,0)},encapsulation:2})}}return a})();var At=180;var Ft=400;var Yt=2500;var ce=class a{ws=null;reconnectTimer=null;destroyed=!1;wantMetrics=!1;wantLogs=!1;logSources=null;logSeq=0;refCount=0;connected=Ct$1(!1);metrics=Ct$1(null);history=Ct$1([]);logs=Ct$1([]);logSourceOptions=Ct$1([`web`,`coordinator`,`engine`,`warm-pool`,`broker`]);latestCpu=LC(()=>{let i=this.metrics()?.cpu?.percent;return i==null||Number.isNaN(Number(i))?null:Number(i)});latestMem=LC(()=>{let i=this.metrics()?.memory,e=i?.usedPercent??i?.percent;return e==null||Number.isNaN(Number(e))?null:Number(e)});latestGpu=LC(()=>{let e=this.metrics()?.gpu?.percent;if(e!=null&&!Number.isNaN(Number(e)))return Number(e);let n=this.metrics()?.jetson?.gpu?.percent;return n==null||Number.isNaN(Number(n))?null:Number(n)});latestVram=LC(()=>{let i=this.metrics()?.gpu?.vramUsedPercent;return i==null||Number.isNaN(Number(i))?null:Number(i)});cpuModel=LC(()=>{let i=this.metrics()?.cpu?.model;return i?String(i):null});gpuName=LC(()=>{let i=this.metrics()?.gpu?.name;return i?String(i):null});memoryLabel=LC(()=>{let i=this.metrics()?.memory;return i?.totalBytes?ei(i.totalBytes):null});vramLabel=LC(()=>{let i=this.metrics()?.gpu;if(i?.vramTotalGb==null)return null;let e=Number(i.vramTotalGb);return Number.isFinite(e)?i.vramUsedGb!=null&&Number.isFinite(Number(i.vramUsedGb))?`${Number(i.vramUsedGb).toFixed(1)} / ${e.toFixed(1)} GiB`:`${e.toFixed(1)} GiB`:null});acquire(i){this.refCount+=1,i.metrics&&(this.wantMetrics=!0),i.logs&&(this.wantLogs=!0),i.logSources&&(this.logSources=[...i.logSources]),this.ensureConnected(),this.pushSubscriptions()}release(){this.refCount=Math.max(0,this.refCount-1),this.refCount===0&&(this.wantMetrics=!1,this.wantLogs=!1,this.closeSocket())}setLogSources(i){this.logSources=i,this.wantLogs&&this.ws?.readyState===WebSocket.OPEN&&this.ws.send(JSON.stringify({type:`admin_logs_subscribe`,sources:i?.length?i:void 0}))}clearLogs(){this.logs.set([])}ngOnDestroy(){this.destroyed=!0,this.closeSocket()}wsUrl(){let i=location.protocol===`https:`?`wss:`:`ws:`;return location.port===`3873`?`ws://127.0.0.1:3847/`:`${i}//${location.host}/`}ensureConnected(){if(!(this.destroyed||this.refCount<=0)&&!(this.ws&&(this.ws.readyState===WebSocket.OPEN||this.ws.readyState===WebSocket.CONNECTING)))try{let i=new WebSocket(this.wsUrl());this.ws=i,i.onopen=()=>{this.connected.set(!0),this.pushSubscriptions()},i.onmessage=e=>this.onMessage(e),i.onclose=()=>{this.connected.set(!1),this.ws=null,this.scheduleReconnect()},i.onerror=()=>{try{i.close()}catch{}}}catch{this.scheduleReconnect()}}pushSubscriptions(){let i=this.ws;!i||i.readyState!==WebSocket.OPEN||(this.wantMetrics&&i.send(JSON.stringify({type:`host_metrics_subscribe`})),this.wantLogs&&i.send(JSON.stringify({type:`admin_logs_subscribe`,sources:this.logSources?.length?this.logSources:void 0})))}onMessage(i){let e;try{e=JSON.parse(String(i.data||``))}catch{return}let t=String(e.type||``);if(t===`host_metrics`){let n=e;this.metrics.set(n),this.pushHistory(n);return}if(t===`admin_logs_sources`&&Array.isArray(e.sources)){this.logSourceOptions.set(e.sources.map(String));return}if(t===`admin_log`){let n={id:++this.logSeq,source:String(e.source||`web`),level:String(e.level||`info`),ts:String(e.ts||new Date().toISOString()),line:String(e.line||``)};this.logs.update(d=>{let l=[...d,n];return l.length>Ft?l.slice(l.length-Ft):l})}}pushHistory(i){let e=Date.parse(String(i.ts||``))||Date.now(),t=i.cpu?.percent==null||Number.isNaN(Number(i.cpu.percent))?null:Number(i.cpu.percent),n=i.memory?.usedPercent??i.memory?.percent,d=n==null||Number.isNaN(Number(n))?null:Number(n),l=i.jetson,_=i.gpu?.percent??l?.gpu?.percent,Lt=_==null||Number.isNaN(Number(_))?null:Number(_),se=i.gpu?.vramUsedPercent,Bt=se==null||Number.isNaN(Number(se))?null:Number(se);this.history.update(zt=>{let K=[...zt,{t:e,cpu:t,mem:d,gpu:Lt,vram:Bt}];return K.length>At?K.slice(K.length-At):K})}scheduleReconnect(){this.destroyed||this.refCount<=0||this.reconnectTimer||(this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.ensureConnected()},Yt))}closeSocket(){this.reconnectTimer&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null);let i=this.ws;if(this.ws=null,this.connected.set(!1),!!i)try{i.readyState===WebSocket.OPEN&&(i.send(JSON.stringify({type:`host_metrics_unsubscribe`})),i.send(JSON.stringify({type:`admin_logs_unsubscribe`}))),i.close()}catch{}}static ɵfac=function(e){return new(e||a)};static ɵprov=R({token:a,factory:a.ɵfac,providedIn:`root`})};function ei(a){if(!Number.isFinite(a)||a<0)return`—`;let i=[`B`,`KiB`,`MiB`,`GiB`,`TiB`],e=a,t=0;for(;e>=1024&&t<i.length-1;)e/=1024,t+=1;return`${e.toFixed(t===0?0:1)} ${i[t]}`}var ti=[`logViewport`];var Tt=()=>[];var ii=()=>[`#f59e0b`];var ni=()=>[`#60a5fa`];var ai=()=>[`#c084fc`];var ri=a=>[`/components`,a];var oi=(a,i)=>i.message;var ci=(a,i)=>i.title;var Rt=(a,i)=>i.id;function si(a,i){if(a&1&&Im(0,`ao-error-state`,10),a&2)_m(`message`,jw().error())}function li(a,i){if(a&1&&(js(0,`a`,65),hC(1,` Open `),ql()),a&2){let e=jw().$implicit;_m(`routerLink`,e.href)}}function di(a,i){if(a&1&&(js(0,`div`,16),Im(1,`mat-icon`,64),js(2,`div`,21)(3,`div`,5),hC(4),ql(),bw(5,li,2,1,`a`,65),ql()()),a&2){let e=i.$implicit;wI(),_m(`svgIcon`,e.severity===`warning`?`octagon-alert`:`circle-alert`),wI(3),$m(e.message),wI(),ww(e.href?5:-1)}}function pi(a,i){a&1&&(js(0,`div`,16),Im(1,`mat-icon`,66),js(2,`div`,5),hC(3,`Nothing flagged`),ql()())}function mi(a,i){if(a&1&&(js(0,`mat-card`,18)(1,`mat-card-header`)(2,`div`,12),Im(3,`mat-icon`,67),js(4,`div`,41),hC(5),ql()()(),js(6,`mat-card-content`)(7,`div`,68),hC(8),MC(9,`number`),ql(),js(10,`div`,69),Im(11,`mat-icon`,67),js(12,`div`,27),hC(13),ql()()()()),a&2){let e=i.$implicit;wI(3),_m(`svgIcon`,e.icon),wI(2),$m(e.title),wI(3),Jl(` `,AC(9,7,e.value),` `),wI(3),rC(e.toneClass),_m(`svgIcon`,e.toneIcon),wI(2),Jl(` `,e.caption,` `)}}function hi(a,i){a&1&&(js(0,`span`,31),hC(1,`%`),ql())}function ui(a,i){a&1&&(js(0,`span`,31),hC(1,`%`),ql())}function gi(a,i){if(a&1&&hC(0),a&2)Jl(` · `,jw().live.metrics()?.gpu?.vramSource,` `)}function vi(a,i){a&1&&(js(0,`span`,31),hC(1,`%`),ql())}function fi(a,i){a&1&&(js(0,`span`,31),hC(1,`%`),ql())}function _i(a,i){a&1&&(js(0,`mat-card`,11)(1,`div`,12),Im(2,`mat-icon`,13),js(3,`div`,14),hC(4,` Reach port guard `),ql()(),js(5,`div`,70),Im(6,`mat-icon`,71),js(7,`div`,5),hC(8),ql()()()),a&2&&(wI(8),$m(i.message))}function yi(a,i){if(a&1&&(js(0,`mat-card`,11)(1,`div`,12),Im(2,`mat-icon`,72),js(3,`div`,14),hC(4,` Sparkline snapshots `),ql()(),js(5,`div`,73)(6,`div`)(7,`div`,74),hC(8,`CPU`),ql(),Im(9,`apx-chart`,75),ql(),js(10,`div`)(11,`div`,74),hC(12,`Memory`),ql(),Im(13,`apx-chart`,75),ql(),js(14,`div`)(15,`div`,74),hC(16,`GPU`),ql(),Im(17,`apx-chart`,75),ql()()()),a&2){let e=jw();wI(9),_m(`chart`,e.sparkChart.chart)(`colors`,bC(18,ii))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`cpu`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip),wI(4),_m(`chart`,e.sparkChart.chart)(`colors`,bC(19,ni))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`mem`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip),wI(4),_m(`chart`,e.sparkChart.chart)(`colors`,bC(20,ai))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`gpu`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip)}}function bi(a,i){a&1&&Im(0,`span`,79)}function Si(a,i){if(a&1&&hC(0),a&2){let e=jw(2).$implicit;Jl(` · `,e.nodePort,` `)}}function xi(a,i){if(a&1&&(js(0,`span`,85),hC(1),bw(2,Si,1,1),ql()),a&2){let e=jw().$implicit;wI(),Jl(` `,e.port??`—`),wI(),ww(e.nodePort?2:-1)}}function Ci(a,i){a&1&&(js(0,`a`,86),Im(1,`mat-icon`,87),ql()),a&2&&_m(`href`,i,dg)}function wi(a,i){a&1&&Im(0,`mat-divider`)}function Ni(a,i){if(a&1&&(js(0,`div`,76)(1,`div`,77),Im(2,`span`,78),bw(3,bi,1,0,`span`,79),ql(),js(4,`div`,21)(5,`div`,80)(6,`a`,81),hC(7),ql(),js(8,`span`,82),hC(9),ql()(),js(10,`div`,83),hC(11),ql()(),js(12,`div`,84),bw(13,xi,3,2,`span`,85),bw(14,Ci,2,1,`a`,86),ql()(),bw(15,wi,1,0,`mat-divider`)),a&2){let e,t=i.$implicit,n=i.$index,d=i.$count,l=jw();wI(2),_m(`ngClass`,l.statusDotClass(t.status)),wI(),ww(n!==d-1?3:-1),wI(3),_m(`routerLink`,wC(10,ri,t.id)),wI(),Jl(` `,t.label,` `),wI(),_m(`ngClass`,l.statusTextClass(t.status)),wI(),Jl(` `,l.statusLabel(t.status),` `),wI(2),Jl(` `,t.fact||t.detail||`—`,` `),wI(2),ww(t.port||t.nodePort?13:-1),wI(),ww((e=l.componentHref(t))?14:-1,e),wI(),ww(n!==d-1?15:-1)}}function ki(a,i){a&1&&(js(0,`div`,53),hC(1,` No topology components reported `),ql())}function Ii(a,i){if(a&1&&(js(0,`mat-chip-option`,61),hC(1),ql()),a&2){let e=i.$implicit;_m(`value`,e),wI(),$m(e)}}function Ei(a,i){if(a&1&&(js(0,`div`,63)(1,`span`,88),hC(2),ql(),js(3,`span`,89),hC(4),ql(),js(5,`span`,90),hC(6),ql()()),a&2){let e=i.$implicit,t=jw();wI(2),$m(t.formatLogTime(e.ts)),wI(),_m(`ngClass`,t.sourceClass(e.source)),wI(),$m(e.source),wI(),_m(`ngClass`,t.levelClass(e.level)),wI(),$m(e.line)}}function Mi(a,i){a&1&&(js(0,`div`,5),hC(1,`Waiting for log lines…`),ql())}var Ot=[`web`,`engine`,`execution`,`ollama`,`mcp`,`speech`,`openclaw`,`reach`];var Pt=class a{api=h(l);theming=h(Lt);live=h(ce);logViewport=hH(`logViewport`);topologyTimer=null;topology=Ct$1(null);ping=Ct$1(null);session=Ct$1(null);error=Ct$1(null);selectedSources=Ct$1([]);followLogs=Ct$1(!0);components=LC(()=>this.topology()?.components||[]);orderedComponents=LC(()=>{let i=e=>{let t=Ot.indexOf(e);return t===-1?Ot.length:t};return[...this.components()].sort((e,t)=>i(e.id)-i(t.id))});filteredLogs=LC(()=>{let i=new Set(this.selectedSources()),e=this.live.logs();return i.size?e.filter(t=>i.has(t.source)):e});cpuMemSeries=LC(()=>{let i=this.live.history();return[{name:`CPU`,data:i.map(e=>({x:e.t,y:e.cpu==null?null:Number(e.cpu.toFixed(1))}))},{name:`Memory`,data:i.map(e=>({x:e.t,y:e.mem==null?null:Number(e.mem.toFixed(1))}))}]});gpuVramSeries=LC(()=>{let i=this.live.history();return[{name:`GPU`,data:i.map(e=>({x:e.t,y:e.gpu==null?null:Number(e.gpu.toFixed(1))}))},{name:`VRAM`,data:i.map(e=>({x:e.t,y:e.vram==null?null:Number(e.vram.toFixed(1))}))}]});cpuMemChartColors=[`#f59e0b`,`#60a5fa`];gpuVramChartColors=[`#c084fc`,`#34d399`];summary=LC(()=>{let i=this.components(),e=i.filter(_=>[`healthy`,`available`,`succeeded`].includes(String(_.status||``).toLowerCase())).length,t=i.filter(_=>[`degraded`,`warning`,`running`,`reconciling`].includes(String(_.status||``).toLowerCase())).length,n=i.filter(_=>[`failed`,`blocking`].includes(String(_.status||``).toLowerCase())).length,d=this.topology()?.attention?.length??0;return[{title:`Healthy`,icon:`circle-check`,value:e,caption:i.filter(_=>[`healthy`,`available`,`succeeded`].includes(String(_.status||``).toLowerCase())).map(_=>_.id).join(`, `)||`components up`,toneIcon:`arrow-up`,toneClass:`text-green-600`},{title:`Degraded`,icon:`octagon-alert`,value:t,caption:`need watch`,toneIcon:t?`arrow-up`:`arrow-down`,toneClass:t?`text-amber-600`:`text-green-600`},{title:`Failed`,icon:`circle-x`,value:n,caption:`blocking`,toneIcon:n?`arrow-up`:`arrow-down`,toneClass:n?`text-red-600`:`text-green-600`},{title:`Attention`,icon:`bell`,value:d,caption:`open items`,toneIcon:d?`arrow-up`:`arrow-down`,toneClass:d?`text-amber-600`:`text-green-600`}]});utilChart={chart:{animations:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`,height:`100%`,type:`area`,toolbar:{show:!1},zoom:{enabled:!1}},colors:[`#f59e0b`,`#60a5fa`],dataLabels:{enabled:!1},fill:{type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.45,opacityTo:.05,stops:[0,90,100]}},grid:{borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:8,right:8}},legend:{show:!0,position:`top`,horizontalAlign:`right`},stroke:{curve:`smooth`,width:2},tooltip:LC(()=>({theme:this.theming.isDark()?`dark`:`light`,x:{format:`HH:mm:ss`},y:{formatter:i=>`${Number(i).toFixed(1)}%`}})),xaxis:{type:`datetime`,labels:{datetimeUTC:!1,style:{colors:`var(--mat-sys-on-surface)`}},axisBorder:{show:!1},tooltip:{enabled:!1}},yaxis:{min:0,max:100,tickAmount:4,labels:{formatter:i=>`${Math.round(i)}%`,style:{colors:`var(--mat-sys-on-surface)`}}}};sparkChart={chart:{animations:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`,height:`101%`,width:`101%`,type:`area`,sparkline:{enabled:!0}},fill:{type:`gradient`,gradient:{shadeIntensity:.5,opacityFrom:.4,opacityTo:.05}},stroke:{curve:`smooth`,width:2},tooltip:{enabled:!1}};constructor(){fs(()=>{this.filteredLogs(),this.followLogs()&&queueMicrotask(()=>{let i=this.logViewport()?.nativeElement;i&&(i.scrollTop=i.scrollHeight)})})}ngOnInit(){this.selectedSources.set([...this.live.logSourceOptions()]),this.live.acquire({metrics:!0,logs:!0}),this.reload(),this.topologyTimer=setInterval(()=>this.reload(),3e4)}ngOnDestroy(){this.topologyTimer&&(clearInterval(this.topologyTimer),this.topologyTimer=null),this.live.release()}sparkSeries(i){let e=this.live.history().map(t=>t[i]).filter(t=>t!=null);return[{name:i,data:e.length?e:[0]}]}onSourcesChange(i){let e=i.value,t=Array.isArray(e)?e:e?[e]:[];this.selectedSources.set(t),this.live.setLogSources(t.length?t:null)}exportBundle(){this.api.supportBundle().subscribe(i=>{if(!i.ok){this.error.set(i.message);return}let e=new Blob([JSON.stringify(i.data,null,2)],{type:`application/json`}),t=URL.createObjectURL(e),n=document.createElement(`a`);n.href=t,n.download=`ao-support-bundle-${Date.now()}.json`,n.click(),URL.revokeObjectURL(t)})}reload(){this.error.set(null),this.api.topology().subscribe(i=>{i.ok?this.topology.set(i.data):this.error.set(i.message)}),this.api.ping().subscribe(i=>i.ok&&this.ping.set(i.data)),this.api.session().subscribe(i=>i.ok&&this.session.set(i.data))}componentHref(i){let e=i.url||i.urlHint;if(!e)return null;let t=location.hostname||`127.0.0.1`,n=String(e).replace(/__HOST__/g,t).replace(/<host>/gi,t).split(/\s+/)[0];return!n||n.includes(`<`)?null:n.startsWith(`/`)?`${location.protocol}//${location.host}${n}`:n}resourceBarColor(i){return i==null?`primary`:i>=90?`error`:i>=75?`warn`:`primary`}statusLabel(i){let e=String(i||`unknown`).replace(/-/g,` `);return e.charAt(0).toUpperCase()+e.slice(1)}statusTextClass(i){let e=String(i||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`text-green-600`:[`failed`,`blocking`].includes(e)?`text-red-600`:[`degraded`,`warning`,`running`,`reconciling`].includes(e)?`text-amber-600`:`text-neutral-500`}statusDotClass(i){let e=String(i||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`bg-green-500`:[`failed`,`blocking`].includes(e)?`bg-red-500`:[`degraded`,`warning`,`running`,`reconciling`].includes(e)?`bg-amber-500`:`bg-neutral-400`}formatUptime(i){if(i==null||!Number.isFinite(i))return`—`;let e=Math.floor(i),t=Math.floor(e/86400),n=Math.floor(e%86400/3600),d=Math.floor(e%3600/60);return t>0?`${t}d ${n}h`:n>0?`${n}h ${d}m`:`${d}m`}formatLogTime(i){let e=new Date(i);return Number.isFinite(e.getTime())?e.toLocaleTimeString([],{hour12:!1,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}):`--:--:--`}sourceClass(i){switch(i){case`engine`:return`text-violet-400`;case`coordinator`:return`text-sky-400`;case`warm-pool`:return`text-amber-400`;case`broker`:return`text-rose-400`;default:return`text-emerald-400`}}levelClass(i){return i===`error`?`text-red-300`:i===`warn`?`text-amber-200`:`text-neutral-200`}static ɵfac=function(e){return new(e||a)};static ɵcmp=Vn({type:a,selectors:[[`ao-overview-page`]],viewQuery:function(e,t){e&1&&km(t.logViewport,ti,5),e&2&&zw()},decls:175,vars:66,consts:[[`logViewport`,``],[1,`@container`,`mx-auto`,`flex`,`w-full`,`max-w-7xl`,`flex-auto`,`flex-col`,`gap-4`,`p-6`,`sm:gap-6`,`lg:px-8`,`lg:pt-8`,`lg:pb-10`],[1,`flex`,`items-center`,`justify-between`,`gap-x-3`],[1,`flex`,`flex-col`,`gap-y-0.5`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex-auto`],[`matButton`,`outlined`,`type`,`button`,1,`mr-2`,3,`click`],[1,`flex`,`items-center`,`gap-x-1.5`,`text-sm`,3,`ngClass`],[1,`inline-block`,`size-2`,`rounded-full`,3,`ngClass`],[3,`message`],[`appearance`,`outlined`,1,`p-6`],[1,`flex`,`items-center`,`gap-x-2`],[`svgIcon`,`sparkles`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`truncate`,`text-lg`,`font-medium`,`tracking-tight`],[1,`mt-6`,`flex`,`flex-col`,`gap-y-4`],[1,`flex`,`items-start`,`gap-x-3`],[1,`grid`,`gap-4`,`sm:gap-6`,`@max-md:grid-cols-1`,`@md:grid-cols-2`,`@4xl:grid-cols-4`],[`appearance`,`filled`],[`appearance`,`outlined`,1,`overflow-hidden`],[1,`flex`,`flex-col`,`gap-y-1`,`px-5`,`pt-5`,`sm:flex-row`,`sm:items-start`],[1,`min-w-0`,`flex-auto`],[1,`text-lg`,`font-medium`,`tracking-tight`],[1,`font-medium`,`text-neutral-500`],[1,`mt-2`,`grid`,`grid-cols-1`,`gap-2`,`px-2`,`pb-2`,`xl:grid-cols-2`],[1,`flex`,`min-w-0`,`flex-col`],[1,`flex`,`flex-wrap`,`items-end`,`gap-x-6`,`gap-y-2`,`px-3`,`pt-2`],[1,`text-sm`,`font-medium`,`text-neutral-500`],[1,`truncate`,`text-sm`,`font-medium`],[1,`text-xs`,`text-neutral-500`],[1,`text-3xl`,`font-semibold`,`tabular-nums`,`tracking-tighter`],[1,`text-lg`,`text-neutral-500`],[1,`h-64`,`w-full`,3,`chart`,`colors`,`dataLabels`,`fill`,`grid`,`legend`,`series`,`stroke`,`tooltip`,`xaxis`,`yaxis`],[1,`flex`,`flex-wrap`,`gap-x-8`,`gap-y-3`,`px-5`,`py-4`,`text-sm`],[1,`font-mono`,`tabular-nums`],[1,`min-w-40`,`flex-auto`],[`mode`,`determinate`,1,`mt-1`,`rounded-full`,3,`color`,`value`],[1,`grid`,`w-full`,`grid-cols-1`,`gap-6`,`xl:grid-cols-2`],[`appearance`,`filled`,1,`flex`,`flex-col`],[1,`flex`,`flex-auto`,`items-center`,`gap-x-2`],[`svgIcon`,`server`,1,`size-4`],[1,`font-medium`,`tracking-tight`],[1,`ml-auto`],[`matButton`,``,`href`,`/`],[1,`flex`,`flex-auto`,`flex-col`],[1,`text-3xl`,`font-semibold`],[1,`mt-0.5`,`text-sm`,`text-neutral-500`],[1,`mt-4`,`flex`,`flex-col`,`gap-y-3`],[1,`flex`,`items-center`,`gap-x-1`],[1,`font-medium`,`tabular-nums`],[1,`max-w-[60%]`,`truncate`,`font-mono`,`text-sm`,`font-medium`],[1,`font-medium`],[1,`mt-2`,`w-full`],[1,`px-5`,`py-8`,`text-neutral-500`],[1,`!rounded-xl`,`!border`,`!shadow-none`],[1,`flex`,`flex-col`,`gap-3`,`pb-2`,`sm:flex-row`,`sm:items-center`],[1,`min-w-0`,`flex-auto`,`text-sm`,`text-neutral-500`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[3,`svgIcon`],[1,`pb-3`],[`aria-label`,`Log sources`,3,`change`,`multiple`,`value`],[3,`value`],[1,`max-h-96`,`overflow-y-auto`,`bg-neutral-950`,`px-4`,`py-3`,`font-mono`,`text-xs`,`leading-relaxed`,`text-neutral-200`],[1,`flex`,`gap-x-2`,`whitespace-pre-wrap`,`break-all`],[1,`size-5`,`shrink-0`,`text-neutral-500`,3,`svgIcon`],[`matButton`,``,1,`mt-1`,3,`routerLink`],[`svgIcon`,`circle-check`,1,`size-5`,`shrink-0`,`text-green-600`],[1,`size-4`,3,`svgIcon`],[1,`text-5xl`,`font-semibold`,`tabular-nums`],[1,`mt-2`,`flex`,`items-center`,`gap-x-1`],[1,`mt-4`,`flex`,`items-start`,`gap-x-3`],[`svgIcon`,`octagon-alert`,1,`size-5`,`shrink-0`,`text-neutral-500`],[`svgIcon`,`activity`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`mt-4`,`grid`,`grid-cols-3`,`gap-3`],[1,`text-xs`,`font-medium`,`text-neutral-500`],[1,`h-16`,3,`chart`,`colors`,`fill`,`series`,`stroke`,`tooltip`],[1,`flex`,`items-start`,`gap-x-3`,`px-5`,`py-3`],[1,`flex`,`flex-col`,`items-center`,`self-stretch`,`pt-2`],[1,`size-2.5`,`shrink-0`,`rounded-full`,3,`ngClass`],[1,`mt-1`,`w-px`,`flex-auto`,`bg-neutral-200`,`dark:bg-neutral-700`],[1,`flex`,`flex-wrap`,`items-baseline`,`gap-x-2`],[1,`font-medium`,`hover:underline`,3,`routerLink`],[1,`text-sm`,`font-medium`,3,`ngClass`],[1,`mt-0.5`,`truncate`,`text-sm`,`text-neutral-500`],[1,`flex`,`shrink-0`,`items-center`,`gap-x-3`],[1,`font-mono`,`text-xs`,`text-neutral-500`,`tabular-nums`],[`matIconButton`,``,`aria-label`,`Open component URL`,`target`,`_blank`,`rel`,`noopener`,3,`href`],[`svgIcon`,`external-link`],[1,`shrink-0`,`text-neutral-500`],[1,`w-24`,`shrink-0`,`truncate`,`font-semibold`,3,`ngClass`],[3,`ngClass`]],template:function(e,t){if(e&1&&(js(0,`div`,1)(1,`div`,2)(2,`div`,3)(3,`div`,4),hC(4,` Overview `),ql(),js(5,`div`,5),hC(6,` Live host utilization, topology, and streaming logs `),ql()(),Im(7,`div`,6),js(8,`button`,7),Mm(`click`,function(){return t.exportBundle()}),hC(9,` Export support bundle `),ql(),js(10,`div`,8),Im(11,`span`,9),hC(12),ql()(),bw(13,si,1,1,`ao-error-state`,10),js(14,`mat-card`,11)(15,`div`,12),Im(16,`mat-icon`,13),js(17,`div`,14),hC(18,` Needs attention `),ql()(),js(19,`div`,15),Tw(20,di,6,3,`div`,16,oi,!1,pi,4,0,`div`,16),ql()(),js(23,`div`,17),Tw(24,mi,14,9,`mat-card`,18,ci),ql(),js(26,`mat-card`,19)(27,`div`,20)(28,`div`,21)(29,`div`,22),hC(30,` Host utilization `),ql(),js(31,`div`,23),hC(32),ql()()(),js(33,`div`,24)(34,`div`,25)(35,`div`,26)(36,`div`,21)(37,`div`,27),hC(38,`CPU`),ql(),js(39,`div`,28),hC(40),ql(),js(41,`div`,29),hC(42),ql()(),js(43,`div`)(44,`div`,27),hC(45,`CPU`),ql(),js(46,`div`,30),hC(47),bw(48,hi,2,0,`span`,31),ql()(),js(49,`div`)(50,`div`,27),hC(51,`Memory`),ql(),js(52,`div`,30),hC(53),bw(54,ui,2,0,`span`,31),ql()()(),Im(55,`apx-chart`,32),ql(),js(56,`div`,25)(57,`div`,26)(58,`div`,21)(59,`div`,27),hC(60,`GPU`),ql(),js(61,`div`,28),hC(62),ql(),js(63,`div`,29),hC(64),bw(65,gi,1,1),ql()(),js(66,`div`)(67,`div`,27),hC(68,`GPU`),ql(),js(69,`div`,30),hC(70),bw(71,vi,2,0,`span`,31),ql()(),js(72,`div`)(73,`div`,27),hC(74,`VRAM`),ql(),js(75,`div`,30),hC(76),bw(77,fi,2,0,`span`,31),ql()()(),Im(78,`apx-chart`,32),ql()(),Im(79,`mat-divider`),js(80,`div`,33)(81,`div`)(82,`div`,23),hC(83,`Load`),ql(),js(84,`div`,34),hC(85),ql()(),js(86,`div`)(87,`div`,23),hC(88,`Uptime`),ql(),js(89,`div`,34),hC(90),ql()(),js(91,`div`,35)(92,`div`,23),hC(93,`CPU`),ql(),Im(94,`mat-progress-bar`,36),ql(),js(95,`div`,35)(96,`div`,23),hC(97,`Memory`),ql(),Im(98,`mat-progress-bar`,36),ql(),js(99,`div`,35)(100,`div`,23),hC(101,`GPU`),ql(),Im(102,`mat-progress-bar`,36),ql(),js(103,`div`,35)(104,`div`,23),hC(105,`VRAM`),ql(),Im(106,`mat-progress-bar`,36),ql()()(),js(107,`div`,37)(108,`mat-card`,38)(109,`mat-card-header`)(110,`div`,39),Im(111,`mat-icon`,40),js(112,`div`,41),hC(113,`Web process`),ql(),js(114,`div`,42)(115,`a`,43),hC(116,` Open chat `),ql()()()(),js(117,`mat-card-content`,44)(118,`div`,45),hC(119),ql(),js(120,`div`,46),hC(121,` Coordinator web UI and Admin API process `),ql(),js(122,`div`,47)(123,`div`,48)(124,`div`,5),hC(125,`pid`),ql(),Im(126,`div`,6),js(127,`div`,49),hC(128),ql()(),js(129,`div`,48)(130,`div`,5),hC(131,`instance`),ql(),Im(132,`div`,6),js(133,`div`,50),hC(134),ql()(),js(135,`div`,48)(136,`div`,5),hC(137,`user`),ql(),Im(138,`div`,6),js(139,`div`,51),hC(140),ql()()()()(),bw(141,_i,9,1,`mat-card`,11)(142,yi,18,21,`mat-card`,11),ql(),js(143,`div`,52)(144,`div`,4),hC(145,` Topology `),ql(),js(146,`div`,5),hC(147,` Ordered by dependency: web → engine → execution → ollama `),ql()(),js(148,`mat-card`,19),Tw(149,Ni,16,12,null,null,Rt,!1,ki,2,0,`div`,53),ql(),js(152,`mat-expansion-panel`,54)(153,`mat-expansion-panel-header`)(154,`mat-panel-title`),hC(155,`Live logs`),ql(),js(156,`mat-panel-description`),hC(157,` Streaming from web + cluster tails `),ql()(),js(158,`div`,55)(159,`div`,56),hC(160,` Filter sources · errors red, warnings amber `),ql(),js(161,`button`,57),Mm(`click`,function(){return t.followLogs.set(!t.followLogs())}),Im(162,`mat-icon`,58),hC(163),ql(),js(164,`button`,57),Mm(`click`,function(){return t.live.clearLogs()}),hC(165,` Clear `),ql()(),js(166,`div`,59)(167,`mat-chip-listbox`,60),Mm(`change`,function(d){return t.onSourcesChange(d)}),Tw(168,Ii,2,2,`mat-chip-option`,61,Cw),ql()(),js(170,`div`,62,0),Tw(172,Ei,7,5,`div`,63,Rt,!1,Mi,2,0,`div`,5),ql()()()),e&2){let n;wI(10),_m(`ngClass`,t.live.connected()?`text-green-600`:`text-neutral-500`),wI(),_m(`ngClass`,t.live.connected()?`bg-green-500 animate-pulse`:`bg-neutral-400`),wI(),Jl(` `,t.live.connected()?`Live`:`Reconnecting…`,` `),wI(),ww(t.error()?13:-1),wI(7),Sw(t.topology()?.attention||bC(64,Tt)),wI(4),Sw(t.summary()),wI(8),Gm(` `,t.live.metrics()?.hostname||`Coordinator host`,` · scope `,t.live.metrics()?.scope||`—`,` · WebSocket push ~2s `),wI(8),Jl(` `,t.live.cpuModel()||`—`,` `),wI(2),Gm(` `,t.live.metrics()?.cpu?.cores??`—`,` cores · memory `,t.live.memoryLabel()||`—`,` `),wI(5),Jl(` `,t.live.latestCpu()??`—`),wI(),ww(t.live.latestCpu()!=null?48:-1),wI(5),Jl(` `,t.live.latestMem()??`—`),wI(),ww(t.live.latestMem()!=null?54:-1),wI(),_m(`chart`,t.utilChart.chart)(`colors`,t.cpuMemChartColors)(`dataLabels`,t.utilChart.dataLabels)(`fill`,t.utilChart.fill)(`grid`,t.utilChart.grid)(`legend`,t.utilChart.legend)(`series`,t.cpuMemSeries())(`stroke`,t.utilChart.stroke)(`tooltip`,t.utilChart.tooltip())(`xaxis`,t.utilChart.xaxis)(`yaxis`,t.utilChart.yaxis),wI(7),Jl(` `,t.live.gpuName()||`No GPU metrics`,` `),wI(2),Jl(` VRAM `,t.live.vramLabel()||`—`,` `),wI(),ww(t.live.metrics()?.gpu?.vramSource?65:-1),wI(5),Jl(` `,t.live.latestGpu()??`—`),wI(),ww(t.live.latestGpu()!=null?71:-1),wI(5),Jl(` `,t.live.latestVram()??`—`),wI(),ww(t.live.latestVram()!=null?77:-1),wI(),_m(`chart`,t.utilChart.chart)(`colors`,t.gpuVramChartColors)(`dataLabels`,t.utilChart.dataLabels)(`fill`,t.utilChart.fill)(`grid`,t.utilChart.grid)(`legend`,t.utilChart.legend)(`series`,t.gpuVramSeries())(`stroke`,t.utilChart.stroke)(`tooltip`,t.utilChart.tooltip())(`xaxis`,t.utilChart.xaxis)(`yaxis`,t.utilChart.yaxis),wI(7),Jl(` `,(t.live.metrics()?.loadAvg||bC(65,Tt)).join(` · `)||`—`,` `),wI(5),Jl(` `,t.formatUptime(t.live.metrics()?.uptimeSec),` `),wI(4),_m(`color`,t.resourceBarColor(t.live.latestCpu()))(`value`,t.live.latestCpu()??0),wI(4),_m(`color`,t.resourceBarColor(t.live.latestMem()))(`value`,t.live.latestMem()??0),wI(4),_m(`color`,t.resourceBarColor(t.live.latestGpu()))(`value`,t.live.latestGpu()??0),wI(4),_m(`color`,t.resourceBarColor(t.live.latestVram()))(`value`,t.live.latestVram()??0),wI(13),Jl(` `,t.ping()?.service||`—`,` `),wI(9),Jl(` `,t.ping()?.pid??`—`,` `),wI(6),Jl(` `,t.ping()?.instance||`—`,` `),wI(6),Jl(` `,t.session()?.userName||`—`,` `),wI(),ww((n=t.topology()?.reachGuard)?141:142,n),wI(8),Sw(t.orderedComponents()),wI(13),_m(`svgIcon`,t.followLogs()?`circle-check`:`circle`),wI(),Jl(` `,t.followLogs()?`Following`:`Follow`,` `),wI(4),_m(`multiple`,!0)(`value`,t.selectedSources()),wI(),Sw(t.live.logSourceOptions()),wI(4),Sw(t.filteredLogs())}},dependencies:[Dt$1,I$1,lt,dt,Z,yt$1,wt$1,w,I,A,m,Mt,Et,Ne,we,Te,Ie,hn,mn,MT,Dt,RT],encapsulation:2})};export{Pt as OverviewPage};