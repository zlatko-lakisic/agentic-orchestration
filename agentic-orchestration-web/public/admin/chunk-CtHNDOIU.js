import{$n as ie,Ar as ql,At as Re,Bn as fD,C as Di,Cn as aT,Dn as bC,Dt as R,Er as q,F as Fm,G as Hw,Gt as Um,Hn as fe,Ht as Tm,I as Fw,J as Iw,K as Ia,Ln as ds,N as Ew,On as bT,Pr as ra,Pt as ST,Qn as iH,R as Gd,Si as zl,Sn as aH,St as Ps,T as Dw,Tr as pv,U as Hm,Vt as Tf,Wr as tG,Wt as Ui,X as Jl,Xr as ug,Xt as Vw,Yn as h,Yt as Vn,Z as Js,_i as yl,_n as _m,ai as ve,an as Xw,bn as _w,cn as Yl,di as xC,dt as Nm,ei as v,en as Wr,er as j,f as Bw,fn as Zl,fr as mG,ft as Nn,g as Ct$1,gr as nH,h as CS,hr as my,ht as O,ii as va,ir as jw,j as Em,jr as qn,jt as Rm,l as Bd,li as wm,m as CC,nr as jh,nt as Lw,o as Am,oi as vw,on as YS,or as kn,ot as Mp,pi as xe$1,pn as Zm,q as Ir,qr as uC,sn as Y_,sr as kv,ti as vC,tr as jd,tt as L,u as Bs,vt as Ow,w as Dm,wr as pm,x as DI,yr as oH,yt as Oy}from"./chunk-CY-GKrdk.js";import{n as yt,r as Dt$1,t as wt$1,v as Lt$1}from"./main-ZAKAF7UE.js";import{n as I,r as w,t as A}from"./chunk-DM14lFJZ.js";import{t as l}from"./chunk-D6p-0CkG.js";import{n as dt,r as lt,t as Z}from"./chunk-ClzTBcNf.js";import{t as I$1}from"./chunk-DGqKkpDo.js";import"./chunk-B4ZH1RzW.js";import"./chunk-BuCyZ0fl.js";import{o as se}from"./chunk-BXNiLH7Q.js";import{i as Lt$2,n as G,r as I$2,t as Bt$1}from"./chunk-BQ1eaCxv.js";import{u as xe$2}from"./chunk-CugKOjOC.js";import"./chunk-CRSVLhTz.js";import"./chunk-YNvcPNSe.js";import{a as mn,i as hn,n as Te,t as Ie}from"./chunk-WlZ46HF7.js";var Nt=[`*`,[[`mat-chip-avatar`],[``,`matChipAvatar`,``]],[[`mat-chip-trailing-icon`],[``,`matChipRemove`,``],[``,`matChipTrailingIcon`,``]]];var kt=[`*`,`mat-chip-avatar, [matChipAvatar]`,`mat-chip-trailing-icon,[matChipRemove],[matChipTrailingIcon]`];function Ut(a,n){a&1&&(Ps(0,`span`,3),Lw(1,1),ql())}function qt(a,n){a&1&&(Ps(0,`span`,6),Lw(1,2),ql())}function Qt(a,n){a&1&&(Ps(0,`span`,3),Lw(1,1),Ps(2,`span`,7),Mp(),Ps(3,`svg`,8),Em(4,`path`,9),ql()()())}function Xt(a,n){a&1&&(Ps(0,`span`,6),Lw(1,2),ql())}var Kt=`.mdc-evolution-chip,
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
`;var It=[`*`];var Zt=`.mat-mdc-chip-set {
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
`;var Et=new v(`mat-chips-default-options`,{providedIn:`root`,factory:()=>({separatorKeyCodes:[13]})});var St=new v(`MatChipAvatar`);var xt=new v(`MatChipTrailingIcon`);var Ct=new v(`MatChipEdit`);var wt=new v(`MatChipRemove`);var we=new v(`MatChip`);var Mt=(()=>{class a{_elementRef=h(ie);_parentChip=h(we);_isPrimary=!0;_isLeading=!1;get disabled(){return this._disabled||this._parentChip?.disabled||!1}set disabled(e){this._disabled=e}_disabled=!1;tabIndex=-1;_allowFocusWhenDisabled=!1;_getDisabledAttribute(){return this.disabled&&!this._allowFocusWhenDisabled?``:null}constructor(){h(qn).load(tG),this._elementRef.nativeElement.nodeName===`BUTTON`&&this._elementRef.nativeElement.setAttribute(`type`,`button`)}focus(){this._elementRef.nativeElement.focus()}static ɵfac=function(t){return new(t||a)};static ɵdir=Re({type:a,selectors:[[``,`matChipContent`,``]],hostAttrs:[1,`mat-mdc-chip-action`,`mdc-evolution-chip__action`,`mdc-evolution-chip__action--presentational`],hostVars:8,hostBindings:function(t,i){t&2&&(zl(`disabled`,i._getDisabledAttribute())(`aria-disabled`,i.disabled),Js(`mdc-evolution-chip__action--primary`,i._isPrimary)(`mdc-evolution-chip__action--secondary`,!i._isPrimary)(`mdc-evolution-chip__action--trailing`,!i._isPrimary&&!i._isLeading))},inputs:{disabled:[2,`disabled`,`disabled`,ra],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?-1:aT(e)],_allowFocusWhenDisabled:`_allowFocusWhenDisabled`}})}return a})();var Dt=(()=>{class a extends Mt{_getTabindex(){return this.disabled&&!this._allowFocusWhenDisabled?null:this.tabIndex.toString()}_handleClick(e){!this.disabled&&this._isPrimary&&(e.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}_handleKeydown(e){(e.keyCode===13||e.keyCode===32)&&!this.disabled&&this._isPrimary&&!this._parentChip._isEditing&&(e.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}static ɵfac=(()=>{let e;return function(i){return(e||(e=jh(a)))(i||a)}})();static ɵdir=Re({type:a,selectors:[[``,`matChipAction`,``]],hostVars:3,hostBindings:function(t,i){t&1&&Tm(`click`,function(d){return i._handleClick(d)})(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&(zl(`tabindex`,i._getTabindex()),Js(`mdc-evolution-chip__action--presentational`,!1))},features:[pm]})}return a})();var xe=(()=>{class a{_changeDetectorRef=h(my);_elementRef=h(ie);_tagName=h(nH);_ngZone=h(j);_focusMonitor=h(pv);_globalRippleOptions=h(Gd,{optional:!0});_document=h(O);_onFocus=new L;_onBlur=new L;_isBasicChip=!1;role=null;_hasFocusInternal=!1;_pendingFocus=!1;_actionChanges;_animationsDisabled=va();_allLeadingIcons;_allTrailingIcons;_allEditIcons;_allRemoveIcons;_hasFocus(){return this._hasFocusInternal}id=h(Bd).getId(`mat-mdc-chip-`);ariaLabel=null;ariaDescription=null;_chipListDisabled=!1;_hadFocusOnRemove=!1;_textElement;get value(){return this._value!==void 0?this._value:this._textElement.textContent.trim()}set value(e){this._value=e}_value;color;removable=!0;highlighted=!1;disableRipple=!1;get disabled(){return this._disabled||this._chipListDisabled}set disabled(e){this._disabled=e}_disabled=!1;removed=new fe;destroyed=new fe;basicChipAttrName=`mat-basic-chip`;leadingIcon;editIcon;trailingIcon;removeIcon;primaryAction;_rippleLoader=h(mG);_injector=h(q);constructor(){let e=h(qn);e.load(tG),e.load(Ia),this._monitorFocus(),this._rippleLoader?.configureRipple(this._elementRef.nativeElement,{className:`mat-mdc-chip-ripple`,disabled:this._isRippleDisabled()})}ngOnInit(){this._isBasicChip=this._elementRef.nativeElement.hasAttribute(this.basicChipAttrName)||this._tagName.toLowerCase()===this.basicChipAttrName}ngAfterViewInit(){this._textElement=this._elementRef.nativeElement.querySelector(`.mat-mdc-chip-action-label`),this._pendingFocus&&(this._pendingFocus=!1,this.focus())}ngAfterContentInit(){this._actionChanges=fD(this._allLeadingIcons.changes,this._allTrailingIcons.changes,this._allEditIcons.changes,this._allRemoveIcons.changes).subscribe(()=>this._changeDetectorRef.markForCheck())}ngDoCheck(){this._rippleLoader.setDisabled(this._elementRef.nativeElement,this._isRippleDisabled())}ngOnDestroy(){this.destroyed.emit({chip:this}),this.destroyed.complete(),this._focusMonitor.stopMonitoring(this._elementRef),this._rippleLoader?.destroyRipple(this._elementRef.nativeElement),this._actionChanges?.unsubscribe()}remove(){this.removable&&(this._hadFocusOnRemove=this._hasFocus(),this.removed.emit({chip:this}))}_isRippleDisabled(){return this.disabled||this.disableRipple||this._animationsDisabled||this._isBasicChip||!this._hasInteractiveActions()||!!this._globalRippleOptions?.disabled}_hasTrailingIcon(){return!!(this.trailingIcon||this.removeIcon)}_handleKeydown(e){(e.keyCode===8&&!e.repeat||e.keyCode===46)&&(e.preventDefault(),this.remove())}focus(){this.disabled||(this.primaryAction?this.primaryAction.focus():this._pendingFocus=!0)}_getSourceAction(e){return this._getActions().find(t=>{let i=t._elementRef.nativeElement;return i===e||i.contains(e)})}_getActions(){let e=[];return this.editIcon&&e.push(this.editIcon),this.primaryAction&&e.push(this.primaryAction),this.removeIcon&&e.push(this.removeIcon),e}_handlePrimaryActionInteraction(){}_hasInteractiveActions(){return this._getActions().length>0}_edit(e){}_monitorFocus(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{let t=e!==null;t!==this._hasFocusInternal&&(this._hasFocusInternal=t,t?this._onFocus.next({chip:this}):(this._changeDetectorRef.markForCheck(),setTimeout(()=>this._ngZone.run(()=>this._onBlur.next({chip:this})))))})}static ɵfac=function(t){return new(t||a)};static ɵcmp=Vn({type:a,selectors:[[`mat-basic-chip`],[``,`mat-basic-chip`,``],[`mat-chip`],[``,`mat-chip`,``]],contentQueries:function(t,i,l){if(t&1&&Nm(l,St,5)(l,Ct,5)(l,xt,5)(l,wt,5)(l,St,5)(l,xt,5)(l,Ct,5)(l,wt,5),t&2){let d;jw(d=Bw())&&(i.leadingIcon=d.first),jw(d=Bw())&&(i.editIcon=d.first),jw(d=Bw())&&(i.trailingIcon=d.first),jw(d=Bw())&&(i.removeIcon=d.first),jw(d=Bw())&&(i._allLeadingIcons=d),jw(d=Bw())&&(i._allTrailingIcons=d),jw(d=Bw())&&(i._allEditIcons=d),jw(d=Bw())&&(i._allRemoveIcons=d)}},viewQuery:function(t,i){if(t&1&&Am(Dt,5),t&2){let l;jw(l=Bw())&&(i.primaryAction=l.first)}},hostAttrs:[1,`mat-mdc-chip`],hostVars:31,hostBindings:function(t,i){t&1&&Tm(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&(wm(`id`,i.id),zl(`role`,i.role)(`aria-label`,i.ariaLabel),Xw(`mat-`+(i.color||`primary`)),Js(`mdc-evolution-chip`,!i._isBasicChip)(`mdc-evolution-chip--disabled`,i.disabled)(`mdc-evolution-chip--with-trailing-action`,i._hasTrailingIcon())(`mdc-evolution-chip--with-primary-graphic`,i.leadingIcon)(`mdc-evolution-chip--with-primary-icon`,i.leadingIcon)(`mdc-evolution-chip--with-avatar`,i.leadingIcon)(`mat-mdc-chip-with-avatar`,i.leadingIcon)(`mat-mdc-chip-highlighted`,i.highlighted)(`mat-mdc-chip-disabled`,i.disabled)(`mat-mdc-basic-chip`,i._isBasicChip)(`mat-mdc-standard-chip`,!i._isBasicChip)(`mat-mdc-chip-with-trailing-icon`,i._hasTrailingIcon())(`_mat-animation-noopable`,i._animationsDisabled))},inputs:{role:`role`,id:`id`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaDescription:[0,`aria-description`,`ariaDescription`],value:`value`,color:`color`,removable:[2,`removable`,`removable`,ra],highlighted:[2,`highlighted`,`highlighted`,ra],disableRipple:[2,`disableRipple`,`disableRipple`,ra],disabled:[2,`disabled`,`disabled`,ra]},outputs:{removed:`removed`,destroyed:`destroyed`},exportAs:[`matChip`],features:[Zm([{provide:we,useExisting:a}])],ngContentSelectors:kt,decls:8,vars:2,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipContent`,``],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`]],template:function(t,i){t&1&&(Fw(Nt),Em(0,`span`,0),Ps(1,`span`,1)(2,`span`,2),vw(3,Ut,2,0,`span`,3),Ps(4,`span`,4),Lw(5),Em(6,`span`,5),ql()()(),vw(7,qt,2,0,`span`,6)),t&2&&(DI(3),Dw(i.leadingIcon?3:-1),DI(4),Dw(i._hasTrailingIcon()?7:-1))},dependencies:[Mt],styles:[`.mdc-evolution-chip,
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
`],encapsulation:2})}return a})();var Ne=(()=>{class a extends xe{_defaultOptions=h(Et,{optional:!0});chipListSelectable=!0;_chipListMultiple=!1;_chipListHideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get selectable(){return this._selectable&&this.chipListSelectable}set selectable(e){this._selectable=e,this._changeDetectorRef.markForCheck()}_selectable=!0;get selected(){return this._selected}set selected(e){this._setSelectedState(e,!1,!0)}_selected=!1;get ariaSelected(){return this.selectable?this.selected.toString():null}basicChipAttrName=`mat-basic-chip-option`;selectionChange=new fe;ngOnInit(){super.ngOnInit(),this.role=`presentation`}select(){this._setSelectedState(!0,!1,!0)}deselect(){this._setSelectedState(!1,!1,!0)}selectViaInteraction(){this._setSelectedState(!0,!0,!0)}toggleSelected(e=!1){return this._setSelectedState(!this.selected,e,!0),this.selected}_handlePrimaryActionInteraction(){this.disabled||(this.focus(),this.selectable&&this.toggleSelected(!0))}_hasLeadingGraphic(){return this.leadingIcon?!0:!this._chipListHideSingleSelectionIndicator||this._chipListMultiple}_setSelectedState(e,t,i){e!==this.selected&&(this._selected=e,i&&this.selectionChange.emit({source:this,isUserInput:t,selected:this.selected}),this._changeDetectorRef.markForCheck())}static ɵfac=(()=>{let e;return function(i){return(e||(e=jh(a)))(i||a)}})();static ɵcmp=Vn({type:a,selectors:[[`mat-basic-chip-option`],[``,`mat-basic-chip-option`,``],[`mat-chip-option`],[``,`mat-chip-option`,``]],hostAttrs:[1,`mat-mdc-chip`,`mat-mdc-chip-option`],hostVars:37,hostBindings:function(t,i){t&2&&(wm(`id`,i.id),zl(`tabindex`,null)(`aria-label`,null)(`aria-description`,null)(`role`,i.role),Js(`mdc-evolution-chip`,!i._isBasicChip)(`mdc-evolution-chip--filter`,!i._isBasicChip)(`mdc-evolution-chip--selectable`,!i._isBasicChip)(`mat-mdc-chip-selected`,i.selected)(`mat-mdc-chip-multiple`,i._chipListMultiple)(`mat-mdc-chip-disabled`,i.disabled)(`mat-mdc-chip-with-avatar`,i.leadingIcon)(`mdc-evolution-chip--disabled`,i.disabled)(`mdc-evolution-chip--selected`,i.selected)(`mdc-evolution-chip--selecting`,!i._animationsDisabled)(`mdc-evolution-chip--with-trailing-action`,i._hasTrailingIcon())(`mdc-evolution-chip--with-primary-icon`,i.leadingIcon)(`mdc-evolution-chip--with-primary-graphic`,i._hasLeadingGraphic())(`mdc-evolution-chip--with-avatar`,i.leadingIcon)(`mat-mdc-chip-highlighted`,i.highlighted)(`mat-mdc-chip-with-trailing-icon`,i._hasTrailingIcon()))},inputs:{selectable:[2,`selectable`,`selectable`,ra],selected:[2,`selected`,`selected`,ra]},outputs:{selectionChange:`selectionChange`},features:[Zm([{provide:xe,useExisting:a},{provide:we,useExisting:a}]),pm],ngContentSelectors:kt,decls:8,vars:6,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipAction`,``,`role`,`option`,3,`_allowFocusWhenDisabled`],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`],[1,`mdc-evolution-chip__checkmark`],[`viewBox`,`-2 -3 30 30`,`focusable`,`false`,`aria-hidden`,`true`,1,`mdc-evolution-chip__checkmark-svg`],[`fill`,`none`,`stroke`,`currentColor`,`d`,`M1.73,12.91 8.1,19.28 22.79,4.59`,1,`mdc-evolution-chip__checkmark-path`]],template:function(t,i){t&1&&(Fw(Nt),Em(0,`span`,0),Ps(1,`span`,1)(2,`button`,2),vw(3,Qt,5,0,`span`,3),Ps(4,`span`,4),Lw(5),Em(6,`span`,5),ql()()(),vw(7,Xt,2,0,`span`,6)),t&2&&(DI(2),Dm(`_allowFocusWhenDisabled`,!0),zl(`aria-description`,i.ariaDescription)(`aria-label`,i.ariaLabel)(`aria-selected`,i.ariaSelected),DI(),Dw(i._hasLeadingGraphic()?3:-1),DI(4),Dw(i._hasTrailingIcon()?7:-1))},dependencies:[Dt],styles:[Kt],encapsulation:2})}return a})();var $t=(()=>{class a{_elementRef=h(ie);_changeDetectorRef=h(my);_dir=h(YS,{optional:!0});_lastDestroyedFocusedChipIndex=null;_keyManager;_destroyed=new L;_defaultRole=`presentation`;get chipFocusChanges(){return this._getChipStream(e=>e._onFocus)}get chipDestroyedChanges(){return this._getChipStream(e=>e.destroyed)}get chipRemovedChanges(){return this._getChipStream(e=>e.removed)}get disabled(){return this._disabled}set disabled(e){this._disabled=e,this._syncChipsState()}_disabled=!1;get empty(){return!this._chips||this._chips.length===0}get role(){return this._explicitRole?this._explicitRole:this.empty?null:this._defaultRole}tabIndex=0;set role(e){this._explicitRole=e}_explicitRole=null;get focused(){return this._hasFocusedChip()}_chips;_chipActions=new kn;ngAfterViewInit(){this._setUpFocusManagement(),this._trackChipSetChanges(),this._trackDestroyedFocusedChip()}ngOnDestroy(){this._keyManager?.destroy(),this._chipActions.destroy(),this._destroyed.next(),this._destroyed.complete()}_hasFocusedChip(){return this._chips&&this._chips.some(e=>e._hasFocus())}_syncChipsState(){this._chips?.forEach(e=>{e._chipListDisabled=this._disabled,e._changeDetectorRef.markForCheck()})}focus(){}_handleKeydown(e){this._originatesFromChip(e)&&this._keyManager.onKeydown(e)}_isValidIndex(e){return e>=0&&e<this._chips.length}_allowFocusEscape(){let e=this._elementRef.nativeElement.tabIndex;e!==-1&&(this._elementRef.nativeElement.tabIndex=-1,setTimeout(()=>this._elementRef.nativeElement.tabIndex=e))}_getChipStream(e){return this._chips.changes.pipe(Di(null),Tf(()=>fD(...this._chips.map(e))))}_originatesFromChip(e){let t=e.target;for(;t&&t!==this._elementRef.nativeElement;){if(t.classList.contains(`mat-mdc-chip`))return!0;t=t.parentElement}return!1}_setUpFocusManagement(){this._chips.changes.pipe(Di(this._chips)).subscribe(e=>{let t=[];e.forEach(i=>i._getActions().forEach(l=>t.push(l))),this._chipActions.reset(t),this._chipActions.notifyOnChanges()}),this._keyManager=new jd(this._chipActions).withVerticalOrientation().withHorizontalOrientation(this._dir?this._dir.value:`ltr`).withHomeAndEnd().skipPredicate(e=>this._skipPredicate(e)),this.chipFocusChanges.pipe(Wr(this._destroyed)).subscribe(({chip:e})=>{let t=e._getSourceAction(document.activeElement);t&&this._keyManager.updateActiveItem(t)}),this._dir?.change.pipe(Wr(this._destroyed)).subscribe(e=>this._keyManager.withHorizontalOrientation(e))}_skipPredicate(e){return e.disabled}_trackChipSetChanges(){this._chips.changes.pipe(Di(null),Wr(this._destroyed)).subscribe(()=>{this.disabled&&Promise.resolve().then(()=>this._syncChipsState()),this._redirectDestroyedChipFocus()})}_trackDestroyedFocusedChip(){this.chipDestroyedChanges.pipe(Wr(this._destroyed)).subscribe(e=>{let i=this._chips.toArray().indexOf(e.chip),l=e.chip._hasFocus(),d=e.chip._hadFocusOnRemove&&this._keyManager.activeItem&&e.chip._getActions().includes(this._keyManager.activeItem),v=l||d;this._isValidIndex(i)&&v&&(this._lastDestroyedFocusedChipIndex=i)})}_redirectDestroyedChipFocus(){if(this._lastDestroyedFocusedChipIndex!=null){if(this._chips.length){let e=Math.min(this._lastDestroyedFocusedChipIndex,this._chips.length-1),t=this._chips.toArray()[e];t.disabled?this._chips.length===1?this.focus():this._keyManager.setPreviousItemActive():t.focus()}else this.focus();this._lastDestroyedFocusedChipIndex=null}}static ɵfac=function(t){return new(t||a)};static ɵcmp=Vn({type:a,selectors:[[`mat-chip-set`]],contentQueries:function(t,i,l){if(t&1&&Nm(l,xe,5),t&2){let d;jw(d=Bw())&&(i._chips=d)}},hostAttrs:[1,`mat-mdc-chip-set`,`mdc-evolution-chip-set`],hostVars:1,hostBindings:function(t,i){t&1&&Tm(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&zl(`role`,i.role)},inputs:{disabled:[2,`disabled`,`disabled`,ra],role:`role`,tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:aT(e)]},ngContentSelectors:It,decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(t,i){t&1&&(Fw(),Zl(0,`div`,0),Lw(1),Yl())},styles:[`.mat-mdc-chip-set {
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
`],encapsulation:2})}return a})();var Ce=class{source;value;constructor(n,e){this.source=n,this.value=e}};var Wt={provide:xe$2,useExisting:Ui(()=>ke),multi:!0};var ke=(()=>{class a extends $t{_onTouched=()=>{};_onChange=()=>{};_defaultRole=`listbox`;_defaultOptions=h(Et,{optional:!0});get multiple(){return this._multiple}set multiple(e){this._multiple=e,this._syncListboxProperties()}_multiple=!1;get selected(){let e=this._chips.toArray().filter(t=>t.selected);return this.multiple?e:e[0]}ariaOrientation=`horizontal`;get selectable(){return this._selectable}set selectable(e){this._selectable=e,this._syncListboxProperties()}_selectable=!0;compareWith=(e,t)=>e===t;required=!1;get hideSingleSelectionIndicator(){return this._hideSingleSelectionIndicator}set hideSingleSelectionIndicator(e){this._hideSingleSelectionIndicator=e,this._syncListboxProperties()}_hideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get chipSelectionChanges(){return this._getChipStream(e=>e.selectionChange)}get chipBlurChanges(){return this._getChipStream(e=>e._onBlur)}get value(){return this._value}set value(e){this._chips&&this._chips.length&&this._setSelectionByValue(e,!1),this._value=e}_value;change=new fe;_chips=void 0;ngAfterContentInit(){this._chips.changes.pipe(Di(null),Wr(this._destroyed)).subscribe(()=>{this.value!==void 0&&Promise.resolve().then(()=>{this._setSelectionByValue(this.value,!1)}),this._syncListboxProperties()}),this.chipBlurChanges.pipe(Wr(this._destroyed)).subscribe(()=>this._blur()),this.chipSelectionChanges.pipe(Wr(this._destroyed)).subscribe(e=>{this.multiple||this._chips.forEach(t=>{t!==e.source&&t._setSelectedState(!1,!1,!1)}),e.isUserInput&&this._propagateChanges()})}focus(){if(this.disabled)return;let e=this._getFirstSelectedChip();e&&!e.disabled?e.focus():this._chips.length>0?this._keyManager.setFirstItemActive():this._elementRef.nativeElement.focus()}writeValue(e){e!=null?this.value=e:this.value=void 0}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}setDisabledState(e){this.disabled=e}_setSelectionByValue(e,t=!0){this._clearSelection(),Array.isArray(e)?e.forEach(i=>this._selectValue(i,t)):this._selectValue(e,t)}_blur(){this.disabled||setTimeout(()=>{this.focused||this._markAsTouched()})}_keydown(e){e.keyCode===9&&super._allowFocusEscape()}_markAsTouched(){this._onTouched(),this._changeDetectorRef.markForCheck()}_propagateChanges(){let e=null;Array.isArray(this.selected)?e=this.selected.map(t=>t.value):e=this.selected?this.selected.value:void 0,this._value=e,this.change.emit(new Ce(this,e)),this._onChange(e),this._changeDetectorRef.markForCheck()}_clearSelection(e){this._chips.forEach(t=>{t!==e&&t.deselect()})}_selectValue(e,t){let i=this._chips.find(l=>l.value!=null&&this.compareWith(l.value,e));return i&&(t?i.selectViaInteraction():i.select()),i}_syncListboxProperties(){this._chips&&Promise.resolve().then(()=>{this._chips.forEach(e=>{e._chipListMultiple=this.multiple,e.chipListSelectable=this._selectable,e._chipListHideSingleSelectionIndicator=this.hideSingleSelectionIndicator,e._changeDetectorRef.markForCheck()})})}_getFirstSelectedChip(){return Array.isArray(this.selected)?this.selected.length?this.selected[0]:void 0:this.selected}_skipPredicate(e){return!1}static ɵfac=(()=>{let e;return function(i){return(e||(e=jh(a)))(i||a)}})();static ɵcmp=Vn({type:a,selectors:[[`mat-chip-listbox`]],contentQueries:function(t,i,l){if(t&1&&Nm(l,Ne,5),t&2){let d;jw(d=Bw())&&(i._chips=d)}},hostAttrs:[1,`mdc-evolution-chip-set`,`mat-mdc-chip-listbox`],hostVars:10,hostBindings:function(t,i){t&1&&Tm(`focus`,function(){return i.focus()})(`blur`,function(){return i._blur()})(`keydown`,function(d){return i._keydown(d)}),t&2&&(wm(`tabIndex`,i.disabled||i.empty?-1:i.tabIndex),zl(`role`,i.role)(`aria-required`,i.role?i.required:null)(`aria-disabled`,i.disabled.toString())(`aria-multiselectable`,i.multiple)(`aria-orientation`,i.ariaOrientation),Js(`mat-mdc-chip-list-disabled`,i.disabled)(`mat-mdc-chip-list-required`,i.required))},inputs:{multiple:[2,`multiple`,`multiple`,ra],ariaOrientation:[0,`aria-orientation`,`ariaOrientation`],selectable:[2,`selectable`,`selectable`,ra],compareWith:`compareWith`,required:[2,`required`,`required`,ra],hideSingleSelectionIndicator:[2,`hideSingleSelectionIndicator`,`hideSingleSelectionIndicator`,ra],value:`value`},outputs:{change:`change`},features:[Zm([Wt]),pm],ngContentSelectors:It,decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(t,i){t&1&&(Fw(),Zl(0,`div`,0),Lw(1),Yl())},styles:[Zt],encapsulation:2})}return a})();function Jt(a,n){a&1&&_m(0,`div`,2)}var Yt=new v(`MAT_PROGRESS_BAR_DEFAULT_OPTIONS`);var Ft=(()=>{class a{_elementRef=h(ie);_ngZone=h(j);_changeDetectorRef=h(my);_renderer=h(Ir);_cleanupTransitionEnd;constructor(){let e=CS(),t=h(Yt,{optional:!0});this._isNoopAnimation=e===`di-disabled`,e===`reduced-motion`&&this._elementRef.nativeElement.classList.add(`mat-progress-bar-reduced-motion`),t&&(t.color&&(this.color=this._defaultColor=t.color),this.mode=t.mode||this.mode)}_isNoopAnimation;get color(){return this._color||this._defaultColor}set color(e){this._color=e}_color;_defaultColor=`primary`;get value(){return this._value}set value(e){this._value=At(e||0),this._changeDetectorRef.markForCheck()}_value=0;get bufferValue(){return this._bufferValue||0}set bufferValue(e){this._bufferValue=At(e||0),this._changeDetectorRef.markForCheck()}_bufferValue=0;animationEnd=new fe;get mode(){return this._mode}set mode(e){this._mode=e,this._changeDetectorRef.markForCheck()}_mode=`determinate`;ngAfterViewInit(){this._ngZone.runOutsideAngular(()=>{this._cleanupTransitionEnd=this._renderer.listen(this._elementRef.nativeElement,`transitionend`,this._transitionendHandler)})}ngOnDestroy(){this._cleanupTransitionEnd?.()}_getPrimaryBarTransform(){return`scaleX(${this._isIndeterminate()?1:this.value/100})`}_getBufferBarFlexBasis(){return`${this.mode===`buffer`?this.bufferValue:100}%`}_isIndeterminate(){return this.mode===`indeterminate`||this.mode===`query`}_transitionendHandler=e=>{this.animationEnd.observers.length===0||!e.target||!e.target.classList.contains(`mdc-linear-progress__primary-bar`)||(this.mode===`determinate`||this.mode===`buffer`)&&this._ngZone.run(()=>this.animationEnd.next({value:this.value}))};static ɵfac=function(t){return new(t||a)};static ɵcmp=Vn({type:a,selectors:[[`mat-progress-bar`]],hostAttrs:[`role`,`progressbar`,`aria-valuemin`,`0`,`aria-valuemax`,`100`,`tabindex`,`-1`,1,`mat-mdc-progress-bar`,`mdc-linear-progress`],hostVars:10,hostBindings:function(t,i){t&2&&(zl(`aria-valuenow`,i._isIndeterminate()?null:i.value)(`mode`,i.mode),Xw(`mat-`+i.color),Js(`_mat-animation-noopable`,i._isNoopAnimation)(`mdc-linear-progress--animation-ready`,!i._isNoopAnimation)(`mdc-linear-progress--indeterminate`,i._isIndeterminate()))},inputs:{color:`color`,value:[2,`value`,`value`,aT],bufferValue:[2,`bufferValue`,`bufferValue`,aT],mode:`mode`},outputs:{animationEnd:`animationEnd`},exportAs:[`matProgressBar`],decls:7,vars:5,consts:[[`aria-hidden`,`true`,1,`mdc-linear-progress__buffer`],[1,`mdc-linear-progress__buffer-bar`],[1,`mdc-linear-progress__buffer-dots`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__primary-bar`],[1,`mdc-linear-progress__bar-inner`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__secondary-bar`]],template:function(t,i){t&1&&(Zl(0,`div`,0),_m(1,`div`,1),vw(2,Jt,1,0,`div`,2),Yl(),Zl(3,`div`,3),_m(4,`span`,4),Yl(),Zl(5,`div`,5),_m(6,`span`,4),Yl()),t&2&&(DI(),Fm(`flex-basis`,i._getBufferBarFlexBasis()),DI(),Dw(i.mode===`buffer`?2:-1),DI(),Fm(`transform`,i._getPrimaryBarTransform()))},styles:[`.mat-mdc-progress-bar {
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
`],encapsulation:2})}return a})();function At(a,n=0,e=100){return Math.max(n,Math.min(e,a))}var Tt=(()=>{class a{static ɵfac=function(t){return new(t||a)};static ɵmod=xe$1({type:a});static ɵinj=ve({imports:[kv]})}return a})();var ti=[`chart`];var Rt=(()=>{class a{constructor(){this.chart=iH(),this.annotations=iH(),this.colors=iH(),this.dataLabels=iH(),this.series=iH(),this.stroke=iH(),this.labels=iH(),this.legend=iH(),this.markers=iH(),this.noData=iH(),this.parsing=iH(),this.fill=iH(),this.tooltip=iH(),this.plotOptions=iH(),this.responsive=iH(),this.xaxis=iH(),this.yaxis=iH(),this.forecastDataPoints=iH(),this.grid=iH(),this.states=iH(),this.title=iH(),this.subtitle=iH(),this.theme=iH(),this.autoUpdateSeries=iH(!0),this.chartReady=oH(),this.chartInstance=Ct$1(null),this.chartElement=aH.required(`chart`),this.ngZone=h(j),this.isBrowser=Oy(h(Nn)),this._destroyed=!1,this._injector=h(q),this.waitingForConnectedRef=null}ngOnChanges(e){this.isBrowser&&this.hydrate(e)}ngOnDestroy(){this.destroy(),this._destroyed=!0}get isConnected(){return this.chartElement()?.nativeElement.isConnected}hydrate(e){if(this.waitingForConnectedRef)return;if(this.chartInstance()&&this.autoUpdateSeries()&&Object.keys(e).filter(i=>i!==`series`).length===0){this.updateSeries(this.series(),!0);return}yl({read:()=>this.createElement()},{injector:this._injector})}importApexCharts(){return import(`./chunk-B4t3fBEx.js`)}async createElement(){let{default:e}=await this.importApexCharts();if(window.ApexCharts||=e,this._destroyed)return;if(!this.isConnected){this.waitForConnected();return}let t={};[`annotations`,`chart`,`colors`,`dataLabels`,`series`,`stroke`,`labels`,`legend`,`fill`,`tooltip`,`plotOptions`,`responsive`,`markers`,`noData`,`parsing`,`xaxis`,`yaxis`,`forecastDataPoints`,`grid`,`states`,`title`,`subtitle`,`theme`].forEach(d=>{let v=this[d]();v&&(t[d]=v)}),this.destroy();let l=this.ngZone.runOutsideAngular(()=>new e(this.chartElement().nativeElement,t));this.chartInstance.set(l),this.render(),this.chartReady.emit({chartObj:l})}render(){if(this.isConnected)return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.render());this.waitForConnected()}updateOptions(e,t,i,l){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.updateOptions(e,t,i,l))}updateSeries(e,t){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.updateSeries(e,t))}appendSeries(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.appendSeries(e,t))}appendData(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.appendData(e))}highlightSeries(e){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.highlightSeries(e))}toggleSeries(e){return this.ngZone.runOutsideAngular(()=>this.chartInstance()?.toggleSeries(e))}showSeries(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.showSeries(e))}hideSeries(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.hideSeries(e))}resetSeries(){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.resetSeries())}zoomX(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.zoomX(e,t))}toggleDataPointSelection(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.toggleDataPointSelection(e,t))}destroy(){this.chartInstance()?.destroy(),this.chartInstance.set(null)}setLocale(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.setLocale(e))}paper(){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.paper())}addXaxisAnnotation(e,t,i){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.addXaxisAnnotation(e,t,i))}addYaxisAnnotation(e,t,i){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.addYaxisAnnotation(e,t,i))}addPointAnnotation(e,t,i){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.addPointAnnotation(e,t,i))}removeAnnotation(e,t){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.removeAnnotation(e,t))}clearAnnotations(e){this.ngZone.runOutsideAngular(()=>this.chartInstance()?.clearAnnotations(e))}dataURI(e){return this.chartInstance()?.dataURI(e)}waitForConnected(){this.waitingForConnectedRef||(this.waitingForConnectedRef=Y_({read:()=>{this.isConnected&&(this.waitingForConnectedRef.destroy(),this.waitingForConnectedRef=null,this.createElement())}},{injector:this._injector}))}static{this.ɵfac=function(t){return new(t||a)}}static{this.ɵcmp=Vn({type:a,selectors:[[`apx-chart`]],viewQuery:function(t,i){t&1&&Rm(i.chartElement,ti,5),t&2&&Vw()},inputs:{chart:[1,`chart`],annotations:[1,`annotations`],colors:[1,`colors`],dataLabels:[1,`dataLabels`],series:[1,`series`],stroke:[1,`stroke`],labels:[1,`labels`],legend:[1,`legend`],markers:[1,`markers`],noData:[1,`noData`],parsing:[1,`parsing`],fill:[1,`fill`],tooltip:[1,`tooltip`],plotOptions:[1,`plotOptions`],responsive:[1,`responsive`],xaxis:[1,`xaxis`],yaxis:[1,`yaxis`],forecastDataPoints:[1,`forecastDataPoints`],grid:[1,`grid`],states:[1,`states`],title:[1,`title`],subtitle:[1,`subtitle`],theme:[1,`theme`],autoUpdateSeries:[1,`autoUpdateSeries`]},outputs:{chartReady:`chartReady`},features:[Bs],decls:2,vars:0,consts:[[`chart`,``]],template:function(t,i){t&1&&_m(0,`div`,null,0)},encapsulation:2})}}return a})();var Ot=180;var Pt=400;var ii=2500;var ce=class a{ws=null;reconnectTimer=null;destroyed=!1;wantMetrics=!1;wantLogs=!1;logSources=null;logSeq=0;refCount=0;connected=Ct$1(!1);metrics=Ct$1(null);history=Ct$1([]);logs=Ct$1([]);logSourceOptions=Ct$1([`web`,`coordinator`,`engine`,`warm-pool`,`broker`]);latestCpu=xC(()=>{let n=this.metrics()?.cpu?.percent;return n==null||Number.isNaN(Number(n))?null:Number(n)});latestMem=xC(()=>{let n=this.metrics()?.memory,e=n?.usedPercent??n?.percent;return e==null||Number.isNaN(Number(e))?null:Number(e)});latestGpu=xC(()=>{let e=this.metrics()?.gpu?.percent;if(e!=null&&!Number.isNaN(Number(e)))return Number(e);let i=this.metrics()?.jetson?.gpu?.percent;return i==null||Number.isNaN(Number(i))?null:Number(i)});latestVram=xC(()=>{let n=this.metrics()?.gpu?.vramUsedPercent;return n==null||Number.isNaN(Number(n))?null:Number(n)});cpuModel=xC(()=>{let n=this.metrics()?.cpu?.model;return n?String(n):null});gpuName=xC(()=>{let n=this.metrics()?.gpu?.name;return n?String(n):null});memoryLabel=xC(()=>{let n=this.metrics()?.memory;return n?.totalBytes?ni(n.totalBytes):null});vramLabel=xC(()=>{let n=this.metrics()?.gpu;if(n?.vramTotalGb==null)return null;let e=Number(n.vramTotalGb);return Number.isFinite(e)?n.vramUsedGb!=null&&Number.isFinite(Number(n.vramUsedGb))?`${Number(n.vramUsedGb).toFixed(1)} / ${e.toFixed(1)} GiB`:`${e.toFixed(1)} GiB`:null});acquire(n){this.refCount+=1,n.metrics&&(this.wantMetrics=!0),n.logs&&(this.wantLogs=!0),n.logSources&&(this.logSources=[...n.logSources]),this.ensureConnected(),this.pushSubscriptions()}release(){this.refCount=Math.max(0,this.refCount-1),this.refCount===0&&(this.wantMetrics=!1,this.wantLogs=!1,this.closeSocket())}setLogSources(n){this.logSources=n,this.wantLogs&&this.ws?.readyState===WebSocket.OPEN&&this.ws.send(JSON.stringify({type:`admin_logs_subscribe`,sources:n?.length?n:void 0}))}clearLogs(){this.logs.set([])}ngOnDestroy(){this.destroyed=!0,this.closeSocket()}wsUrl(){let n=location.protocol===`https:`?`wss:`:`ws:`;return location.port===`3873`?`ws://127.0.0.1:3847/`:`${n}//${location.host}/`}ensureConnected(){if(!(this.destroyed||this.refCount<=0)&&!(this.ws&&(this.ws.readyState===WebSocket.OPEN||this.ws.readyState===WebSocket.CONNECTING)))try{let n=new WebSocket(this.wsUrl());this.ws=n,n.onopen=()=>{this.connected.set(!0),this.pushSubscriptions()},n.onmessage=e=>this.onMessage(e),n.onclose=()=>{this.connected.set(!1),this.ws=null,this.scheduleReconnect()},n.onerror=()=>{try{n.close()}catch{}}}catch{this.scheduleReconnect()}}pushSubscriptions(){let n=this.ws;!n||n.readyState!==WebSocket.OPEN||(this.wantMetrics&&n.send(JSON.stringify({type:`host_metrics_subscribe`})),this.wantLogs&&n.send(JSON.stringify({type:`admin_logs_subscribe`,sources:this.logSources?.length?this.logSources:void 0})))}onMessage(n){let e;try{e=JSON.parse(String(n.data||``))}catch{return}let t=String(e.type||``);if(t===`host_metrics`){let i=e;this.metrics.set(i),this.pushHistory(i);return}if(t===`admin_logs_sources`&&Array.isArray(e.sources)){this.logSourceOptions.set(e.sources.map(String));return}if(t===`admin_log`){let i={id:++this.logSeq,source:String(e.source||`web`),level:String(e.level||`info`),ts:String(e.ts||new Date().toISOString()),line:String(e.line||``)};this.logs.update(l=>{let d=[...l,i];return d.length>Pt?d.slice(d.length-Pt):d})}}pushHistory(n){let e=Date.parse(String(n.ts||``))||Date.now(),t=n.cpu?.percent==null||Number.isNaN(Number(n.cpu.percent))?null:Number(n.cpu.percent),i=n.memory?.usedPercent??n.memory?.percent,l=i==null||Number.isNaN(Number(i))?null:Number(i),d=n.jetson,v=n.gpu?.percent??d?.gpu?.percent,Ht=v==null||Number.isNaN(Number(v))?null:Number(v),se=n.gpu?.vramUsedPercent,jt=se==null||Number.isNaN(Number(se))?null:Number(se);this.history.update(Vt=>{let Z=[...Vt,{t:e,cpu:t,mem:l,gpu:Ht,vram:jt}];return Z.length>Ot?Z.slice(Z.length-Ot):Z})}scheduleReconnect(){this.destroyed||this.refCount<=0||this.reconnectTimer||(this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.ensureConnected()},ii))}closeSocket(){this.reconnectTimer&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null);let n=this.ws;if(this.ws=null,this.connected.set(!1),!!n)try{n.readyState===WebSocket.OPEN&&(n.send(JSON.stringify({type:`host_metrics_unsubscribe`})),n.send(JSON.stringify({type:`admin_logs_unsubscribe`}))),n.close()}catch{}}static ɵfac=function(e){return new(e||a)};static ɵprov=R({token:a,factory:a.ɵfac,providedIn:`root`})};function ni(a){if(!Number.isFinite(a)||a<0)return`—`;let n=[`B`,`KiB`,`MiB`,`GiB`,`TiB`],e=a,t=0;for(;e>=1024&&t<n.length-1;)e/=1024,t+=1;return`${e.toFixed(t===0?0:1)} ${n[t]}`}var ai=[`logViewport`];var Lt=()=>[];var ri=()=>[`#f59e0b`];var oi=()=>[`#60a5fa`];var ci=()=>[`#c084fc`];var si=(a,n)=>n.message;var li=(a,n)=>n.title;var Bt=(a,n)=>n.id;function di(a,n){if(a&1&&Em(0,`ao-error-state`,11),a&2)Dm(`message`,Ow().error())}function pi(a,n){if(a&1&&(Ps(0,`a`,67),uC(1,` Open `),ql()),a&2){let e=Ow().$implicit;Dm(`routerLink`,e.href)}}function mi(a,n){if(a&1&&(Ps(0,`div`,17),Em(1,`mat-icon`,66),Ps(2,`div`,22)(3,`div`,6),uC(4),ql(),vw(5,pi,2,1,`a`,67),ql()()),a&2){let e=n.$implicit;DI(),Dm(`svgIcon`,e.severity===`warning`?`octagon-alert`:`circle-alert`),DI(3),Hm(e.message),DI(),Dw(e.href?5:-1)}}function hi(a,n){a&1&&(Ps(0,`div`,17),Em(1,`mat-icon`,68),Ps(2,`div`,6),uC(3,`Nothing flagged`),ql()())}function ui(a,n){if(a&1&&(Ps(0,`mat-card`,19)(1,`mat-card-header`)(2,`div`,13),Em(3,`mat-icon`,69),Ps(4,`div`,42),uC(5),ql()()(),Ps(6,`mat-card-content`)(7,`div`,70),uC(8),bC(9,`number`),ql(),Ps(10,`div`,71),Em(11,`mat-icon`,69),Ps(12,`div`,28),uC(13),ql()()()()),a&2){let e=n.$implicit;DI(3),Dm(`svgIcon`,e.icon),DI(2),Hm(e.title),DI(3),Jl(` `,CC(9,7,e.value),` `),DI(3),Xw(e.toneClass),Dm(`svgIcon`,e.toneIcon),DI(2),Jl(` `,e.caption,` `)}}function gi(a,n){a&1&&(Ps(0,`span`,32),uC(1,`%`),ql())}function vi(a,n){a&1&&(Ps(0,`span`,32),uC(1,`%`),ql())}function fi(a,n){if(a&1&&uC(0),a&2)Jl(` · `,Ow().live.metrics()?.gpu?.vramSource,` `)}function _i(a,n){a&1&&(Ps(0,`span`,32),uC(1,`%`),ql())}function yi(a,n){a&1&&(Ps(0,`span`,32),uC(1,`%`),ql())}function bi(a,n){a&1&&(Ps(0,`mat-card`,12)(1,`div`,13),Em(2,`mat-icon`,14),Ps(3,`div`,15),uC(4,` Reach port guard `),ql()(),Ps(5,`div`,72),Em(6,`mat-icon`,73),Ps(7,`div`,6),uC(8),ql()()()),a&2&&(DI(8),Hm(n.message))}function Si(a,n){if(a&1&&(Ps(0,`mat-card`,12)(1,`div`,13),Em(2,`mat-icon`,74),Ps(3,`div`,15),uC(4,` Sparkline snapshots `),ql()(),Ps(5,`div`,75)(6,`div`)(7,`div`,76),uC(8,`CPU`),ql(),Em(9,`apx-chart`,77),ql(),Ps(10,`div`)(11,`div`,76),uC(12,`Memory`),ql(),Em(13,`apx-chart`,77),ql(),Ps(14,`div`)(15,`div`,76),uC(16,`GPU`),ql(),Em(17,`apx-chart`,77),ql()()()),a&2){let e=Ow();DI(9),Dm(`chart`,e.sparkChart.chart)(`colors`,vC(18,ri))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`cpu`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip),DI(4),Dm(`chart`,e.sparkChart.chart)(`colors`,vC(19,oi))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`mem`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip),DI(4),Dm(`chart`,e.sparkChart.chart)(`colors`,vC(20,ci))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`gpu`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip)}}function xi(a,n){if(a&1&&(Ps(0,`button`,88),Em(1,`mat-icon`,89),ql(),Ps(2,`mat-menu`,null,1)(4,`a`,90),uC(5,` Open `),ql()()),a&2)Dm(`matMenuTriggerFor`,Hw(3)),DI(4),Dm(`href`,n,ug)}function Ci(a,n){a&1&&(Ps(0,`div`,87)(1,`a`,91),uC(2,` Open `),ql()()),a&2&&(DI(),Dm(`href`,n,ug))}function wi(a,n){if(a&1&&(Ps(0,`mat-card`,55)(1,`div`,78),Em(2,`mat-icon`,79),ql(),Ps(3,`div`,80)(4,`div`,26)(5,`div`,15),uC(6),ql(),Ps(7,`div`,81),uC(8),ql()(),Ps(9,`div`,82),vw(10,xi,6,2),ql()(),Ps(11,`div`,83)(12,`div`,84)(13,`div`,28),uC(14,`Port`),ql(),Ps(15,`div`,85),uC(16),ql()(),Ps(17,`div`,84)(18,`div`,28),uC(19,`NodePort`),ql(),Ps(20,`div`,85),uC(21),ql()(),Ps(22,`div`,26)(23,`div`,28),uC(24,`Detail`),ql(),Ps(25,`div`,86),uC(26),ql()()(),vw(27,Ci,3,1,`div`,87),ql()),a&2){let e,t,i=n.$implicit,l=Ow();DI(2),Dm(`ngClass`,l.watermarkClass(i.status))(`svgIcon`,l.watermarkIcon(i.status)),DI(4),Jl(` `,i.label,` `),DI(),Dm(`ngClass`,l.statusTextClass(i.status)),DI(),Jl(` `,l.statusLabel(i.status),` `),DI(2),Dw((e=l.componentHref(i))?10:-1,e),DI(6),Jl(` `,i.port??`—`,` `),DI(5),Jl(` `,i.nodePort??`—`,` `),DI(5),Jl(` `,i.fact||i.detail||`—`,` `),DI(),Dw((t=l.componentHref(i))?27:-1,t)}}function Ni(a,n){a&1&&(Ps(0,`mat-card`,56)(1,`div`,6),uC(2,`No topology components reported`),ql()())}function ki(a,n){if(a&1&&(Ps(0,`mat-chip-option`,63),uC(1),ql()),a&2){let e=n.$implicit;Dm(`value`,e),DI(),Hm(e)}}function Ii(a,n){if(a&1&&(Ps(0,`div`,65)(1,`span`,92),uC(2),ql(),Ps(3,`span`,93),uC(4),ql(),Ps(5,`span`,94),uC(6),ql()()),a&2){let e=n.$implicit,t=Ow();DI(2),Hm(t.formatLogTime(e.ts)),DI(),Dm(`ngClass`,t.sourceClass(e.source)),DI(),Hm(e.source),DI(),Dm(`ngClass`,t.levelClass(e.level)),DI(),Hm(e.line)}}function Ei(a,n){a&1&&(Ps(0,`div`,6),uC(1,`Waiting for log lines…`),ql())}var zt=class a{api=h(l);theming=h(Lt$1);live=h(ce);logViewport=aH(`logViewport`);topologyTimer=null;topology=Ct$1(null);ping=Ct$1(null);session=Ct$1(null);error=Ct$1(null);selectedSources=Ct$1([]);components=xC(()=>this.topology()?.components||[]);filteredLogs=xC(()=>{let n=new Set(this.selectedSources()),e=this.live.logs();return n.size?e.filter(t=>n.has(t.source)):e});cpuMemSeries=xC(()=>{let n=this.live.history();return[{name:`CPU`,data:n.map(e=>({x:e.t,y:e.cpu==null?null:Number(e.cpu.toFixed(1))}))},{name:`Memory`,data:n.map(e=>({x:e.t,y:e.mem==null?null:Number(e.mem.toFixed(1))}))}]});gpuVramSeries=xC(()=>{let n=this.live.history();return[{name:`GPU`,data:n.map(e=>({x:e.t,y:e.gpu==null?null:Number(e.gpu.toFixed(1))}))},{name:`VRAM`,data:n.map(e=>({x:e.t,y:e.vram==null?null:Number(e.vram.toFixed(1))}))}]});cpuMemChartColors=[`#f59e0b`,`#60a5fa`];gpuVramChartColors=[`#c084fc`,`#34d399`];summary=xC(()=>{let n=this.components(),e=n.filter(v=>[`healthy`,`available`,`succeeded`].includes(String(v.status||``).toLowerCase())).length,t=n.filter(v=>[`degraded`,`warning`,`running`,`reconciling`].includes(String(v.status||``).toLowerCase())).length,i=n.filter(v=>[`failed`,`blocking`].includes(String(v.status||``).toLowerCase())).length,l=this.topology()?.attention?.length??0;return[{title:`Healthy`,icon:`circle-check`,value:e,caption:n.filter(v=>[`healthy`,`available`,`succeeded`].includes(String(v.status||``).toLowerCase())).map(v=>v.id).join(`, `)||`components up`,toneIcon:`arrow-up`,toneClass:`text-green-600`},{title:`Degraded`,icon:`octagon-alert`,value:t,caption:`need watch`,toneIcon:t?`arrow-up`:`arrow-down`,toneClass:t?`text-amber-600`:`text-green-600`},{title:`Failed`,icon:`circle-x`,value:i,caption:`blocking`,toneIcon:i?`arrow-up`:`arrow-down`,toneClass:i?`text-red-600`:`text-green-600`},{title:`Attention`,icon:`bell`,value:l,caption:`open items`,toneIcon:l?`arrow-up`:`arrow-down`,toneClass:l?`text-amber-600`:`text-green-600`}]});utilChart={chart:{animations:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`,height:`100%`,type:`area`,toolbar:{show:!1},zoom:{enabled:!1}},colors:[`#f59e0b`,`#60a5fa`],dataLabels:{enabled:!1},fill:{type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.45,opacityTo:.05,stops:[0,90,100]}},grid:{borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:8,right:8}},legend:{show:!0,position:`top`,horizontalAlign:`right`},stroke:{curve:`smooth`,width:2},tooltip:xC(()=>({theme:this.theming.isDark()?`dark`:`light`,x:{format:`HH:mm:ss`},y:{formatter:n=>`${Number(n).toFixed(1)}%`}})),xaxis:{type:`datetime`,labels:{datetimeUTC:!1,style:{colors:`var(--mat-sys-on-surface)`}},axisBorder:{show:!1},tooltip:{enabled:!1}},yaxis:{min:0,max:100,tickAmount:4,labels:{formatter:n=>`${Math.round(n)}%`,style:{colors:`var(--mat-sys-on-surface)`}}}};sparkChart={chart:{animations:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`,height:`101%`,width:`101%`,type:`area`,sparkline:{enabled:!0}},fill:{type:`gradient`,gradient:{shadeIntensity:.5,opacityFrom:.4,opacityTo:.05}},stroke:{curve:`smooth`,width:2},tooltip:{enabled:!1}};constructor(){ds(()=>{this.filteredLogs(),queueMicrotask(()=>{let n=this.logViewport()?.nativeElement;n&&(n.scrollTop=n.scrollHeight)})})}ngOnInit(){this.selectedSources.set([...this.live.logSourceOptions()]),this.live.acquire({metrics:!0,logs:!0}),this.reload(),this.topologyTimer=setInterval(()=>this.reload(),3e4)}ngOnDestroy(){this.topologyTimer&&(clearInterval(this.topologyTimer),this.topologyTimer=null),this.live.release()}sparkSeries(n){let e=this.live.history().map(t=>t[n]).filter(t=>t!=null);return[{name:n,data:e.length?e:[0]}]}onSourcesChange(n){let e=n.value,t=Array.isArray(e)?e:e?[e]:[];this.selectedSources.set(t),this.live.setLogSources(t.length?t:null)}exportBundle(){this.api.supportBundle().subscribe(n=>{if(!n.ok){this.error.set(n.message);return}let e=new Blob([JSON.stringify(n.data,null,2)],{type:`application/json`}),t=URL.createObjectURL(e),i=document.createElement(`a`);i.href=t,i.download=`ao-support-bundle-${Date.now()}.json`,i.click(),URL.revokeObjectURL(t)})}reload(){this.error.set(null),this.api.topology().subscribe(n=>{n.ok?this.topology.set(n.data):this.error.set(n.message)}),this.api.ping().subscribe(n=>n.ok&&this.ping.set(n.data)),this.api.session().subscribe(n=>n.ok&&this.session.set(n.data))}componentHref(n){let e=n.url||n.urlHint;if(!e)return null;let t=location.hostname||`127.0.0.1`,i=String(e).replace(/__HOST__/g,t).replace(/<host>/gi,t).split(/\s+/)[0];return!i||i.includes(`<`)?null:i.startsWith(`/`)?`${location.protocol}//${location.host}${i}`:i}resourceBarColor(n){return n==null?`primary`:n>=90?`error`:n>=75?`warn`:`primary`}statusLabel(n){let e=String(n||`unknown`).replace(/-/g,` `);return e.charAt(0).toUpperCase()+e.slice(1)}statusTextClass(n){let e=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`text-green-600`:[`failed`,`blocking`].includes(e)?`text-red-600`:[`degraded`,`warning`,`running`,`reconciling`].includes(e)?`text-amber-600`:`text-neutral-500`}watermarkIcon(n){let e=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`circle-check`:[`failed`,`blocking`].includes(e)?`circle-x`:`circle-alert`}watermarkClass(n){let e=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`text-green-600/25 dark:text-green-500/25`:[`failed`,`blocking`].includes(e)?`text-red-600/25 dark:text-red-500/25`:`text-amber-600/25 dark:text-amber-500/25`}formatUptime(n){if(n==null||!Number.isFinite(n))return`—`;let e=Math.floor(n),t=Math.floor(e/86400),i=Math.floor(e%86400/3600),l=Math.floor(e%3600/60);return t>0?`${t}d ${i}h`:i>0?`${i}h ${l}m`:`${l}m`}formatLogTime(n){let e=new Date(n);return Number.isFinite(e.getTime())?e.toLocaleTimeString([],{hour12:!1,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}):`--:--:--`}sourceClass(n){switch(n){case`engine`:return`text-violet-400`;case`coordinator`:return`text-sky-400`;case`warm-pool`:return`text-amber-400`;case`broker`:return`text-rose-400`;default:return`text-emerald-400`}}levelClass(n){return n===`error`?`text-red-300`:n===`warn`?`text-amber-200`:`text-neutral-200`}static ɵfac=function(e){return new(e||a)};static ɵcmp=Vn({type:a,selectors:[[`ao-overview-page`]],viewQuery:function(e,t){e&1&&Rm(t.logViewport,ai,5),e&2&&Vw()},decls:172,vars:64,consts:[[`logViewport`,``],[`compMenu`,`matMenu`],[1,`@container`,`mx-auto`,`flex`,`w-full`,`max-w-7xl`,`flex-auto`,`flex-col`,`gap-4`,`p-6`,`sm:gap-6`,`lg:px-8`,`lg:pt-8`,`lg:pb-10`],[1,`flex`,`items-center`,`justify-between`,`gap-x-3`],[1,`flex`,`flex-col`,`gap-y-0.5`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex-auto`],[`matButton`,`outlined`,`type`,`button`,1,`mr-2`,3,`click`],[1,`flex`,`items-center`,`gap-x-1.5`,`text-sm`,3,`ngClass`],[1,`inline-block`,`size-2`,`rounded-full`,3,`ngClass`],[3,`message`],[`appearance`,`outlined`,1,`p-6`],[1,`flex`,`items-center`,`gap-x-2`],[`svgIcon`,`sparkles`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`truncate`,`text-lg`,`font-medium`,`tracking-tight`],[1,`mt-6`,`flex`,`flex-col`,`gap-y-4`],[1,`flex`,`items-start`,`gap-x-3`],[1,`grid`,`gap-4`,`sm:gap-6`,`@max-md:grid-cols-1`,`@md:grid-cols-2`,`@4xl:grid-cols-4`],[`appearance`,`filled`],[`appearance`,`outlined`,1,`overflow-hidden`],[1,`flex`,`flex-col`,`gap-y-1`,`px-5`,`pt-5`,`sm:flex-row`,`sm:items-start`],[1,`min-w-0`,`flex-auto`],[1,`text-lg`,`font-medium`,`tracking-tight`],[1,`font-medium`,`text-neutral-500`],[1,`mt-2`,`grid`,`grid-cols-1`,`gap-2`,`px-2`,`pb-2`,`xl:grid-cols-2`],[1,`flex`,`min-w-0`,`flex-col`],[1,`flex`,`flex-wrap`,`items-end`,`gap-x-6`,`gap-y-2`,`px-3`,`pt-2`],[1,`text-sm`,`font-medium`,`text-neutral-500`],[1,`truncate`,`text-sm`,`font-medium`],[1,`text-xs`,`text-neutral-500`],[1,`text-3xl`,`font-semibold`,`tabular-nums`,`tracking-tighter`],[1,`text-lg`,`text-neutral-500`],[1,`h-64`,`w-full`,3,`chart`,`colors`,`dataLabels`,`fill`,`grid`,`legend`,`series`,`stroke`,`tooltip`,`xaxis`,`yaxis`],[1,`flex`,`flex-wrap`,`gap-x-8`,`gap-y-3`,`px-5`,`py-4`,`text-sm`],[1,`font-mono`,`tabular-nums`],[1,`min-w-40`,`flex-auto`],[`mode`,`determinate`,1,`mt-1`,`rounded-full`,3,`color`,`value`],[1,`grid`,`w-full`,`grid-cols-1`,`gap-6`,`xl:grid-cols-2`],[`appearance`,`filled`,1,`flex`,`flex-col`],[1,`flex`,`flex-auto`,`items-center`,`gap-x-2`],[`svgIcon`,`server`,1,`size-4`],[1,`font-medium`,`tracking-tight`],[1,`ml-auto`],[`matButton`,``,`href`,`/`],[1,`flex`,`flex-auto`,`flex-col`],[1,`text-3xl`,`font-semibold`],[1,`mt-0.5`,`text-sm`,`text-neutral-500`],[1,`mt-4`,`flex`,`flex-col`,`gap-y-3`],[1,`flex`,`items-center`,`gap-x-1`],[1,`font-medium`,`tabular-nums`],[1,`max-w-[60%]`,`truncate`,`font-mono`,`text-sm`,`font-medium`],[1,`font-medium`],[1,`mt-2`,`w-full`],[1,`grid`,`w-full`,`grid-cols-1`,`gap-6`,`sm:grid-cols-2`,`xl:grid-cols-2`],[`appearance`,`outlined`,1,`relative`,`overflow-hidden`,`px-5`,`py-4`],[`appearance`,`outlined`,1,`px-5`,`py-8`],[1,`!rounded-xl`,`!border`,`!shadow-none`],[1,`flex`,`flex-col`,`gap-3`,`pb-2`,`sm:flex-row`,`sm:items-center`],[1,`min-w-0`,`flex-auto`,`text-sm`,`text-neutral-500`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[1,`pb-3`],[`aria-label`,`Log sources`,3,`change`,`multiple`,`value`],[3,`value`],[1,`max-h-96`,`overflow-y-auto`,`bg-neutral-950`,`px-4`,`py-3`,`font-mono`,`text-xs`,`leading-relaxed`,`text-neutral-200`],[1,`flex`,`gap-x-2`,`whitespace-pre-wrap`,`break-all`],[1,`size-5`,`shrink-0`,`text-neutral-500`,3,`svgIcon`],[`matButton`,``,1,`mt-1`,3,`routerLink`],[`svgIcon`,`circle-check`,1,`size-5`,`shrink-0`,`text-green-600`],[1,`size-4`,3,`svgIcon`],[1,`text-5xl`,`font-semibold`,`tabular-nums`],[1,`mt-2`,`flex`,`items-center`,`gap-x-1`],[1,`mt-4`,`flex`,`items-start`,`gap-x-3`],[`svgIcon`,`octagon-alert`,1,`size-5`,`shrink-0`,`text-neutral-500`],[`svgIcon`,`activity`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`mt-4`,`grid`,`grid-cols-3`,`gap-3`],[1,`text-xs`,`font-medium`,`text-neutral-500`],[1,`h-16`,3,`chart`,`colors`,`fill`,`series`,`stroke`,`tooltip`],[1,`absolute`,`right-0`,`bottom-0`,`-m-6`,`h-24`,`w-24`],[1,`size-24`,3,`ngClass`,`svgIcon`],[1,`flex`,`items-center`],[1,`text-sm`,`font-medium`,3,`ngClass`],[1,`-mt-2`,`ml-auto`],[1,`mt-4`,`flex`,`flex-row`,`flex-wrap`,`gap-6`],[1,`flex`,`flex-col`],[1,`text-3xl`,`font-medium`,`tabular-nums`],[1,`max-w-56`,`truncate`,`text-sm`,`text-neutral-500`],[1,`mt-3`],[`mat-icon-button`,``,`type`,`button`,3,`matMenuTriggerFor`],[`svgIcon`,`ellipsis`],[`mat-menu-item`,``,`target`,`_blank`,`rel`,`noopener`,3,`href`],[`matButton`,``,`target`,`_blank`,`rel`,`noopener`,3,`href`],[1,`shrink-0`,`text-neutral-500`],[1,`w-24`,`shrink-0`,`truncate`,`font-semibold`,3,`ngClass`],[3,`ngClass`]],template:function(e,t){if(e&1&&(Ps(0,`div`,2)(1,`div`,3)(2,`div`,4)(3,`div`,5),uC(4,` Overview `),ql(),Ps(5,`div`,6),uC(6,` Live host utilization, topology, and streaming logs `),ql()(),Em(7,`div`,7),Ps(8,`button`,8),Tm(`click`,function(){return t.exportBundle()}),uC(9,` Export support bundle `),ql(),Ps(10,`div`,9),Em(11,`span`,10),uC(12),ql()(),vw(13,di,1,1,`ao-error-state`,11),Ps(14,`mat-card`,12)(15,`div`,13),Em(16,`mat-icon`,14),Ps(17,`div`,15),uC(18,` Needs attention `),ql()(),Ps(19,`div`,16),_w(20,mi,6,3,`div`,17,si,!1,hi,4,0,`div`,17),ql()(),Ps(23,`div`,18),_w(24,ui,14,9,`mat-card`,19,li),ql(),Ps(26,`mat-card`,20)(27,`div`,21)(28,`div`,22)(29,`div`,23),uC(30,` Host utilization `),ql(),Ps(31,`div`,24),uC(32),ql()()(),Ps(33,`div`,25)(34,`div`,26)(35,`div`,27)(36,`div`,22)(37,`div`,28),uC(38,`CPU`),ql(),Ps(39,`div`,29),uC(40),ql(),Ps(41,`div`,30),uC(42),ql()(),Ps(43,`div`)(44,`div`,28),uC(45,`CPU`),ql(),Ps(46,`div`,31),uC(47),vw(48,gi,2,0,`span`,32),ql()(),Ps(49,`div`)(50,`div`,28),uC(51,`Memory`),ql(),Ps(52,`div`,31),uC(53),vw(54,vi,2,0,`span`,32),ql()()(),Em(55,`apx-chart`,33),ql(),Ps(56,`div`,26)(57,`div`,27)(58,`div`,22)(59,`div`,28),uC(60,`GPU`),ql(),Ps(61,`div`,29),uC(62),ql(),Ps(63,`div`,30),uC(64),vw(65,fi,1,1),ql()(),Ps(66,`div`)(67,`div`,28),uC(68,`GPU`),ql(),Ps(69,`div`,31),uC(70),vw(71,_i,2,0,`span`,32),ql()(),Ps(72,`div`)(73,`div`,28),uC(74,`VRAM`),ql(),Ps(75,`div`,31),uC(76),vw(77,yi,2,0,`span`,32),ql()()(),Em(78,`apx-chart`,33),ql()(),Em(79,`mat-divider`),Ps(80,`div`,34)(81,`div`)(82,`div`,24),uC(83,`Load`),ql(),Ps(84,`div`,35),uC(85),ql()(),Ps(86,`div`)(87,`div`,24),uC(88,`Uptime`),ql(),Ps(89,`div`,35),uC(90),ql()(),Ps(91,`div`,36)(92,`div`,24),uC(93,`CPU`),ql(),Em(94,`mat-progress-bar`,37),ql(),Ps(95,`div`,36)(96,`div`,24),uC(97,`Memory`),ql(),Em(98,`mat-progress-bar`,37),ql(),Ps(99,`div`,36)(100,`div`,24),uC(101,`GPU`),ql(),Em(102,`mat-progress-bar`,37),ql(),Ps(103,`div`,36)(104,`div`,24),uC(105,`VRAM`),ql(),Em(106,`mat-progress-bar`,37),ql()()(),Ps(107,`div`,38)(108,`mat-card`,39)(109,`mat-card-header`)(110,`div`,40),Em(111,`mat-icon`,41),Ps(112,`div`,42),uC(113,`Web process`),ql(),Ps(114,`div`,43)(115,`a`,44),uC(116,` Open chat `),ql()()()(),Ps(117,`mat-card-content`,45)(118,`div`,46),uC(119),ql(),Ps(120,`div`,47),uC(121,` Coordinator web UI and Admin API process `),ql(),Ps(122,`div`,48)(123,`div`,49)(124,`div`,6),uC(125,`pid`),ql(),Em(126,`div`,7),Ps(127,`div`,50),uC(128),ql()(),Ps(129,`div`,49)(130,`div`,6),uC(131,`instance`),ql(),Em(132,`div`,7),Ps(133,`div`,51),uC(134),ql()(),Ps(135,`div`,49)(136,`div`,6),uC(137,`user`),ql(),Em(138,`div`,7),Ps(139,`div`,52),uC(140),ql()()()()(),vw(141,bi,9,1,`mat-card`,12)(142,Si,18,21,`mat-card`,12),ql(),Ps(143,`div`,53)(144,`div`,5),uC(145,` Topology `),ql(),Ps(146,`div`,6),uC(147,` Runtime components and how they are exposed on this host `),ql()(),Ps(148,`div`,54),_w(149,wi,28,10,`mat-card`,55,Bt,!1,Ni,3,0,`mat-card`,56),ql(),Ps(152,`mat-expansion-panel`,57)(153,`mat-expansion-panel-header`)(154,`mat-panel-title`),uC(155,`Live logs`),ql(),Ps(156,`mat-panel-description`),uC(157,` Streaming from web + cluster tails `),ql()(),Ps(158,`div`,58)(159,`div`,59),uC(160,` Filter sources · follow newest `),ql(),Ps(161,`button`,60),Tm(`click`,function(){return t.live.clearLogs()}),uC(162,` Clear `),ql()(),Ps(163,`div`,61)(164,`mat-chip-listbox`,62),Tm(`change`,function(l){return t.onSourcesChange(l)}),_w(165,ki,2,2,`mat-chip-option`,63,Ew),ql()(),Ps(167,`div`,64,0),_w(169,Ii,7,5,`div`,65,Bt,!1,Ei,2,0,`div`,6),ql()()()),e&2){let i;DI(10),Dm(`ngClass`,t.live.connected()?`text-green-600`:`text-neutral-500`),DI(),Dm(`ngClass`,t.live.connected()?`bg-green-500 animate-pulse`:`bg-neutral-400`),DI(),Jl(` `,t.live.connected()?`Live`:`Reconnecting…`,` `),DI(),Dw(t.error()?13:-1),DI(7),Iw(t.topology()?.attention||vC(62,Lt)),DI(4),Iw(t.summary()),DI(8),Um(` `,t.live.metrics()?.hostname||`Coordinator host`,` · scope `,t.live.metrics()?.scope||`—`,` · WebSocket push ~2s `),DI(8),Jl(` `,t.live.cpuModel()||`—`,` `),DI(2),Um(` `,t.live.metrics()?.cpu?.cores??`—`,` cores · memory `,t.live.memoryLabel()||`—`,` `),DI(5),Jl(` `,t.live.latestCpu()??`—`),DI(),Dw(t.live.latestCpu()!=null?48:-1),DI(5),Jl(` `,t.live.latestMem()??`—`),DI(),Dw(t.live.latestMem()!=null?54:-1),DI(),Dm(`chart`,t.utilChart.chart)(`colors`,t.cpuMemChartColors)(`dataLabels`,t.utilChart.dataLabels)(`fill`,t.utilChart.fill)(`grid`,t.utilChart.grid)(`legend`,t.utilChart.legend)(`series`,t.cpuMemSeries())(`stroke`,t.utilChart.stroke)(`tooltip`,t.utilChart.tooltip())(`xaxis`,t.utilChart.xaxis)(`yaxis`,t.utilChart.yaxis),DI(7),Jl(` `,t.live.gpuName()||`No GPU metrics`,` `),DI(2),Jl(` VRAM `,t.live.vramLabel()||`—`,` `),DI(),Dw(t.live.metrics()?.gpu?.vramSource?65:-1),DI(5),Jl(` `,t.live.latestGpu()??`—`),DI(),Dw(t.live.latestGpu()!=null?71:-1),DI(5),Jl(` `,t.live.latestVram()??`—`),DI(),Dw(t.live.latestVram()!=null?77:-1),DI(),Dm(`chart`,t.utilChart.chart)(`colors`,t.gpuVramChartColors)(`dataLabels`,t.utilChart.dataLabels)(`fill`,t.utilChart.fill)(`grid`,t.utilChart.grid)(`legend`,t.utilChart.legend)(`series`,t.gpuVramSeries())(`stroke`,t.utilChart.stroke)(`tooltip`,t.utilChart.tooltip())(`xaxis`,t.utilChart.xaxis)(`yaxis`,t.utilChart.yaxis),DI(7),Jl(` `,(t.live.metrics()?.loadAvg||vC(63,Lt)).join(` · `)||`—`,` `),DI(5),Jl(` `,t.formatUptime(t.live.metrics()?.uptimeSec),` `),DI(4),Dm(`color`,t.resourceBarColor(t.live.latestCpu()))(`value`,t.live.latestCpu()??0),DI(4),Dm(`color`,t.resourceBarColor(t.live.latestMem()))(`value`,t.live.latestMem()??0),DI(4),Dm(`color`,t.resourceBarColor(t.live.latestGpu()))(`value`,t.live.latestGpu()??0),DI(4),Dm(`color`,t.resourceBarColor(t.live.latestVram()))(`value`,t.live.latestVram()??0),DI(13),Jl(` `,t.ping()?.service||`—`,` `),DI(9),Jl(` `,t.ping()?.pid??`—`,` `),DI(6),Jl(` `,t.ping()?.instance||`—`,` `),DI(6),Jl(` `,t.session()?.userName||`—`,` `),DI(),Dw((i=t.topology()?.reachGuard)?141:142,i),DI(8),Iw(t.components()),DI(15),Dm(`multiple`,!0)(`value`,t.selectedSources()),DI(),Iw(t.live.logSourceOptions()),DI(4),Iw(t.filteredLogs())}},dependencies:[Dt$1,I$1,lt,dt,Z,yt,wt$1,Lt$2,I$2,G,Bt$1,w,I,A,se,Tt,Ft,ke,Ne,Te,Ie,hn,mn,bT,Rt,ST],encapsulation:2})};export{zt as OverviewPage};