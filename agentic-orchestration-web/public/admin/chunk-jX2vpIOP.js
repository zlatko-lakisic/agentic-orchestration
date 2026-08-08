import{$t as Yf,Ar as oC,Bn as eN,Br as qm,Cn as cC,Cr as md,Ct as TC,D as He,Dn as cd,E as Ha,G as Ks,Gn as fT,Jt as Y,K as L,Kn as fa,Ln as dd,Lr as py,M as IC,N as ID,Nr as oy,Nt as Ve,On as cf,Or as ny,Pn as dT,Rr as qT,Rt as Wm,Tt as TM,U as Km,Ur as ro,Ut as Xm,Wn as f2,Wr as rr,Wt as Xn,Xn as h,Y as Lt$1,Yt as YC,_n as ag,_r as ld,ai as uT,bn as bS,ci as uf,cr as jm,ct as P,ei as ts,hi as ws,in as _C,jr as oT,jt as Uy,ki as zm,l as DC,li as v,ln as a2,ni as ty,nr as hy,nt as Ne,o as CC,or as iz,ot as Oi,pi as wC,pn as ab,pt as Qp,qn as fd,qr as sC,qt as Xv,rr as iC,rt as O,si as ue$1,sr as jC,tr as hf,tt as NS,un as aC,ut as Pa,v as Ey,vt as Rr,wi as ye,x as GG,xi as yT,xr as ma,yn as ay,zn as eE,zt as Wn}from"./chunk-BSP5txkv.js";import"./chunk-KL__mmzy.js";import{n as yt$1,p as Lt$2,r as Dt$1,t as wt$1}from"./main-RELGUXAW.js";import"./chunk-c-QCRSmx.js";import{d as xe}from"./chunk-Dzqs0zTk.js";import"./chunk-B35pY3Lf.js";import{n as I,r as w,t as A}from"./chunk-aX65fBcY.js";import{n as dt$1,r as lt$1}from"./chunk-BPq-DBwM.js";import{t as I$1}from"./chunk-CxinL7H_.js";import{t as d}from"./chunk-B8sgR9DK.js";import"./chunk-BIdVRixk.js";import"./chunk-DRBRVH7A.js";import{a as mn,i as hn,n as Te,t as Ie}from"./chunk-BoT-5Ktl.js";import{t as m}from"./chunk-B15KYNMt.js";import{r as he$1,t as U}from"./chunk-CNf_v2cG.js";var mt=[`*`,[[`mat-chip-avatar`],[``,`matChipAvatar`,``]],[[`mat-chip-trailing-icon`],[``,`matChipRemove`,``],[``,`matChipTrailingIcon`,``]]];var ht=[`*`,`mat-chip-avatar, [matChipAvatar]`,`mat-chip-trailing-icon,[matChipRemove],[matChipTrailingIcon]`];function Et(a,n){a&1&&(Ks(0,`span`,3),IC(1,1),ld())}function At(a,n){a&1&&(Ks(0,`span`,6),IC(1,2),ld())}function Mt(a,n){a&1&&(Ks(0,`span`,3),IC(1,1),Ks(2,`span`,7),Qp(),Ks(3,`svg`,8),Wm(4,`path`,9),ld()()())}function Tt(a,n){a&1&&(Ks(0,`span`,6),IC(1,2),ld())}var Dt=`.mdc-evolution-chip,
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
`;var ut=[`*`];var Rt=`.mat-mdc-chip-set {
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
`;var gt=new v(`mat-chips-default-options`,{providedIn:`root`,factory:()=>({separatorKeyCodes:[13]})});var ct=new v(`MatChipAvatar`);var st=new v(`MatChipTrailingIcon`);var lt=new v(`MatChipEdit`);var dt=new v(`MatChipRemove`);var ue=new v(`MatChip`);var vt=(()=>{class a{_elementRef=h(ue$1);_parentChip=h(ue);_isPrimary=!0;_isLeading=!1;get disabled(){return this._disabled||this._parentChip?.disabled||!1}set disabled(e){this._disabled=e}_disabled=!1;tabIndex=-1;_allowFocusWhenDisabled=!1;_getDisabledAttribute(){return this.disabled&&!this._allowFocusWhenDisabled?``:null}constructor(){h(rr).load(GG),this._elementRef.nativeElement.nodeName===`BUTTON`&&this._elementRef.nativeElement.setAttribute(`type`,`button`)}focus(){this._elementRef.nativeElement.focus()}static ɵfac=function(t){return new(t||a)};static ɵdir=He({type:a,selectors:[[``,`matChipContent`,``]],hostAttrs:[1,`mat-mdc-chip-action`,`mdc-evolution-chip__action`,`mdc-evolution-chip__action--presentational`],hostVars:8,hostBindings:function(t,i){t&2&&(cd(`disabled`,i._getDisabledAttribute())(`aria-disabled`,i.disabled),fa(`mdc-evolution-chip__action--primary`,i._isPrimary)(`mdc-evolution-chip__action--secondary`,!i._isPrimary)(`mdc-evolution-chip__action--trailing`,!i._isPrimary&&!i._isLeading))},inputs:{disabled:[2,`disabled`,`disabled`,ma],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?-1:qT(e)],_allowFocusWhenDisabled:`_allowFocusWhenDisabled`}})}return a})();var ft=(()=>{class a extends vt{_getTabindex(){return this.disabled&&!this._allowFocusWhenDisabled?null:this.tabIndex.toString()}_handleClick(e){!this.disabled&&this._isPrimary&&(e.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}_handleKeydown(e){(e.keyCode===13||e.keyCode===32)&&!this.disabled&&this._isPrimary&&!this._parentChip._isEditing&&(e.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}static ɵfac=(()=>{let e;return function(i){return(e||(e=ag(a)))(i||a)}})();static ɵdir=He({type:a,selectors:[[``,`matChipAction`,``]],hostVars:3,hostBindings:function(t,i){t&1&&Xm(`click`,function(d){return i._handleClick(d)})(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&(cd(`tabindex`,i._getTabindex()),fa(`mdc-evolution-chip__action--presentational`,!1))},features:[jm]})}return a})();var me=(()=>{class a{_changeDetectorRef=h(Uy);_elementRef=h(ue$1);_tagName=h(a2);_ngZone=h(P);_focusMonitor=h(Xv);_globalRippleOptions=h(hf,{optional:!0});_document=h(O);_onFocus=new L;_onBlur=new L;_isBasicChip=!1;role=null;_hasFocusInternal=!1;_pendingFocus=!1;_actionChanges;_animationsDisabled=Pa();_allLeadingIcons;_allTrailingIcons;_allEditIcons;_allRemoveIcons;_hasFocus(){return this._hasFocusInternal}id=h(uf).getId(`mat-mdc-chip-`);ariaLabel=null;ariaDescription=null;_chipListDisabled=!1;_hadFocusOnRemove=!1;_textElement;get value(){return this._value!==void 0?this._value:this._textElement.textContent.trim()}set value(e){this._value=e}_value;color;removable=!0;highlighted=!1;disableRipple=!1;get disabled(){return this._disabled||this._chipListDisabled}set disabled(e){this._disabled=e}_disabled=!1;removed=new ye;destroyed=new ye;basicChipAttrName=`mat-basic-chip`;leadingIcon;editIcon;trailingIcon;removeIcon;primaryAction;_rippleLoader=h(iz);_injector=h(Y);constructor(){let e=h(rr);e.load(GG),e.load(Ha),this._monitorFocus(),this._rippleLoader?.configureRipple(this._elementRef.nativeElement,{className:`mat-mdc-chip-ripple`,disabled:this._isRippleDisabled()})}ngOnInit(){this._isBasicChip=this._elementRef.nativeElement.hasAttribute(this.basicChipAttrName)||this._tagName.toLowerCase()===this.basicChipAttrName}ngAfterViewInit(){this._textElement=this._elementRef.nativeElement.querySelector(`.mat-mdc-chip-action-label`),this._pendingFocus&&(this._pendingFocus=!1,this.focus())}ngAfterContentInit(){this._actionChanges=eE(this._allLeadingIcons.changes,this._allTrailingIcons.changes,this._allEditIcons.changes,this._allRemoveIcons.changes).subscribe(()=>this._changeDetectorRef.markForCheck())}ngDoCheck(){this._rippleLoader.setDisabled(this._elementRef.nativeElement,this._isRippleDisabled())}ngOnDestroy(){this.destroyed.emit({chip:this}),this.destroyed.complete(),this._focusMonitor.stopMonitoring(this._elementRef),this._rippleLoader?.destroyRipple(this._elementRef.nativeElement),this._actionChanges?.unsubscribe()}remove(){this.removable&&(this._hadFocusOnRemove=this._hasFocus(),this.removed.emit({chip:this}))}_isRippleDisabled(){return this.disabled||this.disableRipple||this._animationsDisabled||this._isBasicChip||!this._hasInteractiveActions()||!!this._globalRippleOptions?.disabled}_hasTrailingIcon(){return!!(this.trailingIcon||this.removeIcon)}_handleKeydown(e){(e.keyCode===8&&!e.repeat||e.keyCode===46)&&(e.preventDefault(),this.remove())}focus(){this.disabled||(this.primaryAction?this.primaryAction.focus():this._pendingFocus=!0)}_getSourceAction(e){return this._getActions().find(t=>{let i=t._elementRef.nativeElement;return i===e||i.contains(e)})}_getActions(){let e=[];return this.editIcon&&e.push(this.editIcon),this.primaryAction&&e.push(this.primaryAction),this.removeIcon&&e.push(this.removeIcon),e}_handlePrimaryActionInteraction(){}_hasInteractiveActions(){return this._getActions().length>0}_edit(e){}_monitorFocus(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{let t=e!==null;t!==this._hasFocusInternal&&(this._hasFocusInternal=t,t?this._onFocus.next({chip:this}):(this._changeDetectorRef.markForCheck(),setTimeout(()=>this._ngZone.run(()=>this._onBlur.next({chip:this})))))})}static ɵfac=function(t){return new(t||a)};static ɵcmp=Xn({type:a,selectors:[[`mat-basic-chip`],[``,`mat-basic-chip`,``],[`mat-chip`],[``,`mat-chip`,``]],contentQueries:function(t,i,l){if(t&1&&ty(l,ct,5)(l,lt,5)(l,st,5)(l,dt,5)(l,ct,5)(l,st,5)(l,lt,5)(l,dt,5),t&2){let d;wC(d=CC())&&(i.leadingIcon=d.first),wC(d=CC())&&(i.editIcon=d.first),wC(d=CC())&&(i.trailingIcon=d.first),wC(d=CC())&&(i.removeIcon=d.first),wC(d=CC())&&(i._allLeadingIcons=d),wC(d=CC())&&(i._allTrailingIcons=d),wC(d=CC())&&(i._allEditIcons=d),wC(d=CC())&&(i._allRemoveIcons=d)}},viewQuery:function(t,i){if(t&1&&ny(ft,5),t&2){let l;wC(l=CC())&&(i.primaryAction=l.first)}},hostAttrs:[1,`mat-mdc-chip`],hostVars:31,hostBindings:function(t,i){t&1&&Xm(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&(Km(`id`,i.id),cd(`role`,i.role)(`aria-label`,i.ariaLabel),jC(`mat-`+(i.color||`primary`)),fa(`mdc-evolution-chip`,!i._isBasicChip)(`mdc-evolution-chip--disabled`,i.disabled)(`mdc-evolution-chip--with-trailing-action`,i._hasTrailingIcon())(`mdc-evolution-chip--with-primary-graphic`,i.leadingIcon)(`mdc-evolution-chip--with-primary-icon`,i.leadingIcon)(`mdc-evolution-chip--with-avatar`,i.leadingIcon)(`mat-mdc-chip-with-avatar`,i.leadingIcon)(`mat-mdc-chip-highlighted`,i.highlighted)(`mat-mdc-chip-disabled`,i.disabled)(`mat-mdc-basic-chip`,i._isBasicChip)(`mat-mdc-standard-chip`,!i._isBasicChip)(`mat-mdc-chip-with-trailing-icon`,i._hasTrailingIcon())(`_mat-animation-noopable`,i._animationsDisabled))},inputs:{role:`role`,id:`id`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaDescription:[0,`aria-description`,`ariaDescription`],value:`value`,color:`color`,removable:[2,`removable`,`removable`,ma],highlighted:[2,`highlighted`,`highlighted`,ma],disableRipple:[2,`disableRipple`,`disableRipple`,ma],disabled:[2,`disabled`,`disabled`,ma]},outputs:{removed:`removed`,destroyed:`destroyed`},exportAs:[`matChip`],features:[Ey([{provide:ue,useExisting:a}])],ngContentSelectors:ht,decls:8,vars:2,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipContent`,``],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`]],template:function(t,i){t&1&&(_C(mt),Wm(0,`span`,0),Ks(1,`span`,1)(2,`span`,2),oC(3,Et,2,0,`span`,3),Ks(4,`span`,4),IC(5),Wm(6,`span`,5),ld()()(),oC(7,At,2,0,`span`,6)),t&2&&(ab(3),iC(i.leadingIcon?3:-1),ab(4),iC(i._hasTrailingIcon()?7:-1))},dependencies:[vt],styles:[`.mdc-evolution-chip,
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
`],encapsulation:2})}return a})();var ge=(()=>{class a extends me{_defaultOptions=h(gt,{optional:!0});chipListSelectable=!0;_chipListMultiple=!1;_chipListHideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get selectable(){return this._selectable&&this.chipListSelectable}set selectable(e){this._selectable=e,this._changeDetectorRef.markForCheck()}_selectable=!0;get selected(){return this._selected}set selected(e){this._setSelectedState(e,!1,!0)}_selected=!1;get ariaSelected(){return this.selectable?this.selected.toString():null}basicChipAttrName=`mat-basic-chip-option`;selectionChange=new ye;ngOnInit(){super.ngOnInit(),this.role=`presentation`}select(){this._setSelectedState(!0,!1,!0)}deselect(){this._setSelectedState(!1,!1,!0)}selectViaInteraction(){this._setSelectedState(!0,!0,!0)}toggleSelected(e=!1){return this._setSelectedState(!this.selected,e,!0),this.selected}_handlePrimaryActionInteraction(){this.disabled||(this.focus(),this.selectable&&this.toggleSelected(!0))}_hasLeadingGraphic(){return this.leadingIcon?!0:!this._chipListHideSingleSelectionIndicator||this._chipListMultiple}_setSelectedState(e,t,i){e!==this.selected&&(this._selected=e,i&&this.selectionChange.emit({source:this,isUserInput:t,selected:this.selected}),this._changeDetectorRef.markForCheck())}static ɵfac=(()=>{let e;return function(i){return(e||(e=ag(a)))(i||a)}})();static ɵcmp=Xn({type:a,selectors:[[`mat-basic-chip-option`],[``,`mat-basic-chip-option`,``],[`mat-chip-option`],[``,`mat-chip-option`,``]],hostAttrs:[1,`mat-mdc-chip`,`mat-mdc-chip-option`],hostVars:37,hostBindings:function(t,i){t&2&&(Km(`id`,i.id),cd(`tabindex`,null)(`aria-label`,null)(`aria-description`,null)(`role`,i.role),fa(`mdc-evolution-chip`,!i._isBasicChip)(`mdc-evolution-chip--filter`,!i._isBasicChip)(`mdc-evolution-chip--selectable`,!i._isBasicChip)(`mat-mdc-chip-selected`,i.selected)(`mat-mdc-chip-multiple`,i._chipListMultiple)(`mat-mdc-chip-disabled`,i.disabled)(`mat-mdc-chip-with-avatar`,i.leadingIcon)(`mdc-evolution-chip--disabled`,i.disabled)(`mdc-evolution-chip--selected`,i.selected)(`mdc-evolution-chip--selecting`,!i._animationsDisabled)(`mdc-evolution-chip--with-trailing-action`,i._hasTrailingIcon())(`mdc-evolution-chip--with-primary-icon`,i.leadingIcon)(`mdc-evolution-chip--with-primary-graphic`,i._hasLeadingGraphic())(`mdc-evolution-chip--with-avatar`,i.leadingIcon)(`mat-mdc-chip-highlighted`,i.highlighted)(`mat-mdc-chip-with-trailing-icon`,i._hasTrailingIcon()))},inputs:{selectable:[2,`selectable`,`selectable`,ma],selected:[2,`selected`,`selected`,ma]},outputs:{selectionChange:`selectionChange`},features:[Ey([{provide:me,useExisting:a},{provide:ue,useExisting:a}]),jm],ngContentSelectors:ht,decls:8,vars:6,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipAction`,``,`role`,`option`,3,`_allowFocusWhenDisabled`],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`],[1,`mdc-evolution-chip__checkmark`],[`viewBox`,`-2 -3 30 30`,`focusable`,`false`,`aria-hidden`,`true`,1,`mdc-evolution-chip__checkmark-svg`],[`fill`,`none`,`stroke`,`currentColor`,`d`,`M1.73,12.91 8.1,19.28 22.79,4.59`,1,`mdc-evolution-chip__checkmark-path`]],template:function(t,i){t&1&&(_C(mt),Wm(0,`span`,0),Ks(1,`span`,1)(2,`button`,2),oC(3,Mt,5,0,`span`,3),Ks(4,`span`,4),IC(5),Wm(6,`span`,5),ld()()(),oC(7,Tt,2,0,`span`,6)),t&2&&(ab(2),zm(`_allowFocusWhenDisabled`,!0),cd(`aria-description`,i.ariaDescription)(`aria-label`,i.ariaLabel)(`aria-selected`,i.ariaSelected),ab(),iC(i._hasLeadingGraphic()?3:-1),ab(4),iC(i._hasTrailingIcon()?7:-1))},dependencies:[ft],styles:[Dt],encapsulation:2})}return a})();var Ft=(()=>{class a{_elementRef=h(ue$1);_changeDetectorRef=h(Uy);_dir=h(eN,{optional:!0});_lastDestroyedFocusedChipIndex=null;_keyManager;_destroyed=new L;_defaultRole=`presentation`;get chipFocusChanges(){return this._getChipStream(e=>e._onFocus)}get chipDestroyedChanges(){return this._getChipStream(e=>e.destroyed)}get chipRemovedChanges(){return this._getChipStream(e=>e.removed)}get disabled(){return this._disabled}set disabled(e){this._disabled=e,this._syncChipsState()}_disabled=!1;get empty(){return!this._chips||this._chips.length===0}get role(){return this._explicitRole?this._explicitRole:this.empty?null:this._defaultRole}tabIndex=0;set role(e){this._explicitRole=e}_explicitRole=null;get focused(){return this._hasFocusedChip()}_chips;_chipActions=new Wn;ngAfterViewInit(){this._setUpFocusManagement(),this._trackChipSetChanges(),this._trackDestroyedFocusedChip()}ngOnDestroy(){this._keyManager?.destroy(),this._chipActions.destroy(),this._destroyed.next(),this._destroyed.complete()}_hasFocusedChip(){return this._chips&&this._chips.some(e=>e._hasFocus())}_syncChipsState(){this._chips?.forEach(e=>{e._chipListDisabled=this._disabled,e._changeDetectorRef.markForCheck()})}focus(){}_handleKeydown(e){this._originatesFromChip(e)&&this._keyManager.onKeydown(e)}_isValidIndex(e){return e>=0&&e<this._chips.length}_allowFocusEscape(){let e=this._elementRef.nativeElement.tabIndex;e!==-1&&(this._elementRef.nativeElement.tabIndex=-1,setTimeout(()=>this._elementRef.nativeElement.tabIndex=e))}_getChipStream(e){return this._chips.changes.pipe(Oi(null),Yf(()=>eE(...this._chips.map(e))))}_originatesFromChip(e){let t=e.target;for(;t&&t!==this._elementRef.nativeElement;){if(t.classList.contains(`mat-mdc-chip`))return!0;t=t.parentElement}return!1}_setUpFocusManagement(){this._chips.changes.pipe(Oi(this._chips)).subscribe(e=>{let t=[];e.forEach(i=>i._getActions().forEach(l=>t.push(l))),this._chipActions.reset(t),this._chipActions.notifyOnChanges()}),this._keyManager=new cf(this._chipActions).withVerticalOrientation().withHorizontalOrientation(this._dir?this._dir.value:`ltr`).withHomeAndEnd().skipPredicate(e=>this._skipPredicate(e)),this.chipFocusChanges.pipe(ro(this._destroyed)).subscribe(({chip:e})=>{let t=e._getSourceAction(document.activeElement);t&&this._keyManager.updateActiveItem(t)}),this._dir?.change.pipe(ro(this._destroyed)).subscribe(e=>this._keyManager.withHorizontalOrientation(e))}_skipPredicate(e){return e.disabled}_trackChipSetChanges(){this._chips.changes.pipe(Oi(null),ro(this._destroyed)).subscribe(()=>{this.disabled&&Promise.resolve().then(()=>this._syncChipsState()),this._redirectDestroyedChipFocus()})}_trackDestroyedFocusedChip(){this.chipDestroyedChanges.pipe(ro(this._destroyed)).subscribe(e=>{let i=this._chips.toArray().indexOf(e.chip),l=e.chip._hasFocus(),d=e.chip._hadFocusOnRemove&&this._keyManager.activeItem&&e.chip._getActions().includes(this._keyManager.activeItem),f=l||d;this._isValidIndex(i)&&f&&(this._lastDestroyedFocusedChipIndex=i)})}_redirectDestroyedChipFocus(){if(this._lastDestroyedFocusedChipIndex!=null){if(this._chips.length){let e=Math.min(this._lastDestroyedFocusedChipIndex,this._chips.length-1),t=this._chips.toArray()[e];t.disabled?this._chips.length===1?this.focus():this._keyManager.setPreviousItemActive():t.focus()}else this.focus();this._lastDestroyedFocusedChipIndex=null}}static ɵfac=function(t){return new(t||a)};static ɵcmp=Xn({type:a,selectors:[[`mat-chip-set`]],contentQueries:function(t,i,l){if(t&1&&ty(l,me,5),t&2){let d;wC(d=CC())&&(i._chips=d)}},hostAttrs:[1,`mat-mdc-chip-set`,`mdc-evolution-chip-set`],hostVars:1,hostBindings:function(t,i){t&1&&Xm(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&cd(`role`,i.role)},inputs:{disabled:[2,`disabled`,`disabled`,ma],role:`role`,tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:qT(e)]},ngContentSelectors:ut,decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(t,i){t&1&&(_C(),dd(0,`div`,0),IC(1),fd())},styles:[`.mat-mdc-chip-set {
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
`],encapsulation:2})}return a})();var he=class{source;value;constructor(n,e){this.source=n,this.value=e}};var Pt={provide:xe,useExisting:ts(()=>ve),multi:!0};var ve=(()=>{class a extends Ft{_onTouched=()=>{};_onChange=()=>{};_defaultRole=`listbox`;_defaultOptions=h(gt,{optional:!0});get multiple(){return this._multiple}set multiple(e){this._multiple=e,this._syncListboxProperties()}_multiple=!1;get selected(){let e=this._chips.toArray().filter(t=>t.selected);return this.multiple?e:e[0]}ariaOrientation=`horizontal`;get selectable(){return this._selectable}set selectable(e){this._selectable=e,this._syncListboxProperties()}_selectable=!0;compareWith=(e,t)=>e===t;required=!1;get hideSingleSelectionIndicator(){return this._hideSingleSelectionIndicator}set hideSingleSelectionIndicator(e){this._hideSingleSelectionIndicator=e,this._syncListboxProperties()}_hideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get chipSelectionChanges(){return this._getChipStream(e=>e.selectionChange)}get chipBlurChanges(){return this._getChipStream(e=>e._onBlur)}get value(){return this._value}set value(e){this._chips&&this._chips.length&&this._setSelectionByValue(e,!1),this._value=e}_value;change=new ye;_chips=void 0;ngAfterContentInit(){this._chips.changes.pipe(Oi(null),ro(this._destroyed)).subscribe(()=>{this.value!==void 0&&Promise.resolve().then(()=>{this._setSelectionByValue(this.value,!1)}),this._syncListboxProperties()}),this.chipBlurChanges.pipe(ro(this._destroyed)).subscribe(()=>this._blur()),this.chipSelectionChanges.pipe(ro(this._destroyed)).subscribe(e=>{this.multiple||this._chips.forEach(t=>{t!==e.source&&t._setSelectedState(!1,!1,!1)}),e.isUserInput&&this._propagateChanges()})}focus(){if(this.disabled)return;let e=this._getFirstSelectedChip();e&&!e.disabled?e.focus():this._chips.length>0?this._keyManager.setFirstItemActive():this._elementRef.nativeElement.focus()}writeValue(e){e!=null?this.value=e:this.value=void 0}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}setDisabledState(e){this.disabled=e}_setSelectionByValue(e,t=!0){this._clearSelection(),Array.isArray(e)?e.forEach(i=>this._selectValue(i,t)):this._selectValue(e,t)}_blur(){this.disabled||setTimeout(()=>{this.focused||this._markAsTouched()})}_keydown(e){e.keyCode===9&&super._allowFocusEscape()}_markAsTouched(){this._onTouched(),this._changeDetectorRef.markForCheck()}_propagateChanges(){let e=null;Array.isArray(this.selected)?e=this.selected.map(t=>t.value):e=this.selected?this.selected.value:void 0,this._value=e,this.change.emit(new he(this,e)),this._onChange(e),this._changeDetectorRef.markForCheck()}_clearSelection(e){this._chips.forEach(t=>{t!==e&&t.deselect()})}_selectValue(e,t){let i=this._chips.find(l=>l.value!=null&&this.compareWith(l.value,e));return i&&(t?i.selectViaInteraction():i.select()),i}_syncListboxProperties(){this._chips&&Promise.resolve().then(()=>{this._chips.forEach(e=>{e._chipListMultiple=this.multiple,e.chipListSelectable=this._selectable,e._chipListHideSingleSelectionIndicator=this.hideSingleSelectionIndicator,e._changeDetectorRef.markForCheck()})})}_getFirstSelectedChip(){return Array.isArray(this.selected)?this.selected.length?this.selected[0]:void 0:this.selected}_skipPredicate(e){return!1}static ɵfac=(()=>{let e;return function(i){return(e||(e=ag(a)))(i||a)}})();static ɵcmp=Xn({type:a,selectors:[[`mat-chip-listbox`]],contentQueries:function(t,i,l){if(t&1&&ty(l,ge,5),t&2){let d;wC(d=CC())&&(i._chips=d)}},hostAttrs:[1,`mdc-evolution-chip-set`,`mat-mdc-chip-listbox`],hostVars:10,hostBindings:function(t,i){t&1&&Xm(`focus`,function(){return i.focus()})(`blur`,function(){return i._blur()})(`keydown`,function(d){return i._keydown(d)}),t&2&&(Km(`tabIndex`,i.disabled||i.empty?-1:i.tabIndex),cd(`role`,i.role)(`aria-required`,i.role?i.required:null)(`aria-disabled`,i.disabled.toString())(`aria-multiselectable`,i.multiple)(`aria-orientation`,i.ariaOrientation),fa(`mat-mdc-chip-list-disabled`,i.disabled)(`mat-mdc-chip-list-required`,i.required))},inputs:{multiple:[2,`multiple`,`multiple`,ma],ariaOrientation:[0,`aria-orientation`,`ariaOrientation`],selectable:[2,`selectable`,`selectable`,ma],compareWith:`compareWith`,required:[2,`required`,`required`,ma],hideSingleSelectionIndicator:[2,`hideSingleSelectionIndicator`,`hideSingleSelectionIndicator`,ma],value:`value`},outputs:{change:`change`},features:[Ey([Pt]),jm],ngContentSelectors:ut,decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(t,i){t&1&&(_C(),dd(0,`div`,0),IC(1),fd())},styles:[Rt],encapsulation:2})}return a})();function Lt(a,n){a&1&&qm(0,`div`,2)}var Bt=new v(`MAT_PROGRESS_BAR_DEFAULT_OPTIONS`);var yt=(()=>{class a{_elementRef=h(ue$1);_ngZone=h(P);_changeDetectorRef=h(Uy);_renderer=h(Rr);_cleanupTransitionEnd;constructor(){let e=TM(),t=h(Bt,{optional:!0});this._isNoopAnimation=e===`di-disabled`,e===`reduced-motion`&&this._elementRef.nativeElement.classList.add(`mat-progress-bar-reduced-motion`),t&&(t.color&&(this.color=this._defaultColor=t.color),this.mode=t.mode||this.mode)}_isNoopAnimation;get color(){return this._color||this._defaultColor}set color(e){this._color=e}_color;_defaultColor=`primary`;get value(){return this._value}set value(e){this._value=_t(e||0),this._changeDetectorRef.markForCheck()}_value=0;get bufferValue(){return this._bufferValue||0}set bufferValue(e){this._bufferValue=_t(e||0),this._changeDetectorRef.markForCheck()}_bufferValue=0;animationEnd=new ye;get mode(){return this._mode}set mode(e){this._mode=e,this._changeDetectorRef.markForCheck()}_mode=`determinate`;ngAfterViewInit(){this._ngZone.runOutsideAngular(()=>{this._cleanupTransitionEnd=this._renderer.listen(this._elementRef.nativeElement,`transitionend`,this._transitionendHandler)})}ngOnDestroy(){this._cleanupTransitionEnd?.()}_getPrimaryBarTransform(){return`scaleX(${this._isIndeterminate()?1:this.value/100})`}_getBufferBarFlexBasis(){return`${this.mode===`buffer`?this.bufferValue:100}%`}_isIndeterminate(){return this.mode===`indeterminate`||this.mode===`query`}_transitionendHandler=e=>{this.animationEnd.observers.length===0||!e.target||!e.target.classList.contains(`mdc-linear-progress__primary-bar`)||(this.mode===`determinate`||this.mode===`buffer`)&&this._ngZone.run(()=>this.animationEnd.next({value:this.value}))};static ɵfac=function(t){return new(t||a)};static ɵcmp=Xn({type:a,selectors:[[`mat-progress-bar`]],hostAttrs:[`role`,`progressbar`,`aria-valuemin`,`0`,`aria-valuemax`,`100`,`tabindex`,`-1`,1,`mat-mdc-progress-bar`,`mdc-linear-progress`],hostVars:10,hostBindings:function(t,i){t&2&&(cd(`aria-valuenow`,i._isIndeterminate()?null:i.value)(`mode`,i.mode),jC(`mat-`+i.color),fa(`_mat-animation-noopable`,i._isNoopAnimation)(`mdc-linear-progress--animation-ready`,!i._isNoopAnimation)(`mdc-linear-progress--indeterminate`,i._isIndeterminate()))},inputs:{color:`color`,value:[2,`value`,`value`,qT],bufferValue:[2,`bufferValue`,`bufferValue`,qT],mode:`mode`},outputs:{animationEnd:`animationEnd`},exportAs:[`matProgressBar`],decls:7,vars:5,consts:[[`aria-hidden`,`true`,1,`mdc-linear-progress__buffer`],[1,`mdc-linear-progress__buffer-bar`],[1,`mdc-linear-progress__buffer-dots`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__primary-bar`],[1,`mdc-linear-progress__bar-inner`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__secondary-bar`]],template:function(t,i){t&1&&(dd(0,`div`,0),qm(1,`div`,1),oC(2,Lt,1,0,`div`,2),fd(),dd(3,`div`,3),qm(4,`span`,4),fd(),dd(5,`div`,5),qm(6,`span`,4),fd()),t&2&&(ab(),ay(`flex-basis`,i._getBufferBarFlexBasis()),ab(),iC(i.mode===`buffer`?2:-1),ab(),ay(`transform`,i._getPrimaryBarTransform()))},styles:[`.mat-mdc-progress-bar {
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
`],encapsulation:2})}return a})();function _t(a,n=0,e=100){return Math.max(n,Math.min(e,a))}var bt=(()=>{class a{static ɵfac=function(t){return new(t||a)};static ɵmod=Ve({type:a});static ɵinj=Ne({imports:[ID]})}return a})();var zt=`# Thermal operating ranges for AO host-metrics charts (Celsius).
kind,match,min_c,max_c,label,source
gpu,RTX 4000 SFF Ada,0,95,NVIDIA RTX 4000 SFF Ada,https://www.nvidia.com/en-us/products/workstations/rtx-4000-sff-ada/
gpu,RTX 4000 Ada,0,95,NVIDIA RTX 4000 Ada,https://www.nvidia.com/en-us/products/workstations/rtx-4000-ada/
gpu,RTX 6000 Ada,0,95,NVIDIA RTX 6000 Ada,https://www.nvidia.com/en-us/products/workstations/rtx-6000-ada/
gpu,RTX 5000 Ada,0,95,NVIDIA RTX 5000 Ada,https://www.nvidia.com/en-us/products/workstations/rtx-5000-ada/
gpu,Ada Generation,0,95,NVIDIA Ada GPU (typical),https://www.nvidia.com/en-us/data-center/technologies/ada-architecture/
gpu,GeForce RTX 40,0,90,NVIDIA GeForce RTX 40-series (typical),https://www.nvidia.com/en-us/geforce/graphics-cards/
gpu,GeForce RTX 30,0,93,NVIDIA GeForce RTX 30-series (typical),https://www.nvidia.com/en-us/geforce/graphics-cards/
gpu,A100,0,85,NVIDIA A100,https://www.nvidia.com/en-us/data-center/a100/
gpu,H100,0,85,NVIDIA H100,https://www.nvidia.com/en-us/data-center/h100/
gpu,L40,0,90,NVIDIA L40,https://www.nvidia.com/en-us/data-center/l40/
gpu,Tesla T4,0,85,NVIDIA T4,https://www.nvidia.com/en-us/data-center/tesla-t4/
gpu,Jetson AGX Orin,-25,99,Jetson AGX Orin SoC (recommended),https://developer.nvidia.com/embedded/jetson-agx-orin
gpu,Jetson Orin NX,-25,99,Jetson Orin NX SoC (TJ),https://developer.nvidia.com/embedded/jetson-orin
gpu,Jetson Orin Nano,-25,99,Jetson Orin Nano SoC (TJ),https://developer.nvidia.com/embedded/jetson-orin
gpu,Jetson,-25,99,NVIDIA Jetson SoC (typical TJ),https://developer.nvidia.com/embedded-computing
gpu,Radeon RX 7,0,110,AMD Radeon RX 7000 (typical),https://www.amd.com/en/products/graphics/desktops/radeon.html
gpu,Radeon RX 6,0,110,AMD Radeon RX 6000 (typical),https://www.amd.com/en/products/graphics/desktops/radeon.html
gpu,Radeon,0,110,AMD Radeon GPU (typical),https://www.amd.com/en/products/graphics/desktops/radeon.html
gpu,Intel Arc,0,100,Intel Arc GPU (typical),https://www.intel.com/content/www/us/en/products/docs/discrete-gpus/arc/overview.html
gpu,NVIDIA,0,95,NVIDIA GPU (typical),https://www.nvidia.com/
gpu,*,0,95,Generic GPU,https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/assets/thermal-operating-ranges.csv
cpu,Jetson AGX Orin,-25,99,Jetson AGX Orin CPU/SoC,https://developer.nvidia.com/embedded/jetson-agx-orin
cpu,Jetson Orin,-25,99,Jetson Orin CPU/SoC,https://developer.nvidia.com/embedded/jetson-orin
cpu,Jetson,-25,99,NVIDIA Jetson CPU/SoC,https://developer.nvidia.com/embedded-computing
cpu,Ryzen AI,0,100,AMD Ryzen AI (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,Ryzen 9,0,95,AMD Ryzen 9 (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,Ryzen 7,0,95,AMD Ryzen 7 (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,Ryzen 5,0,95,AMD Ryzen 5 (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,Ryzen,0,95,AMD Ryzen (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,EPYC,0,95,AMD EPYC (Tjmax typical),https://www.amd.com/en/products/processors/server/epyc.html
cpu,Xeon,0,100,Intel Xeon (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Core Ultra,0,105,Intel Core Ultra (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Core i9,0,100,Intel Core i9 (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Core i7,0,100,Intel Core i7 (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Core i5,0,100,Intel Core i5 (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Core i3,0,100,Intel Core i3 (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Intel,0,100,Intel CPU (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,AMD,0,95,AMD CPU (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,ARMv8,0,99,Armv8 SoC (typical),https://developer.nvidia.com/embedded-computing
cpu,aarch64,0,99,Arm aarch64 SoC (typical),https://developer.nvidia.com/embedded-computing
cpu,*,0,100,Generic CPU,https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/assets/thermal-operating-ranges.csv
`;var xt=`https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/assets/thermal-operating-ranges.csv`;function Vt(a){let n=[];for(let e of a.split(/\r?\n/)){let t=e.trim();if(!t||t.startsWith(`#`)||t.startsWith(`kind,`))continue;let i=t.split(`,`);if(i.length<6)continue;let l=i[0]?.trim().toLowerCase();if(l!==`cpu`&&l!==`gpu`)continue;let d=i[1]?.trim()??``,f=Number(i[2]),X=Number(i[3]);if(!Number.isFinite(f)||!Number.isFinite(X)||X<=f)continue;let Nt=i[4]?.trim()||d||l,kt=i.slice(5).join(`,`).trim();n.push({kind:l,match:d,minC:f,maxC:X,label:Nt,source:kt})}return n}var Gt=Vt(zt);var Ht={cpu:{kind:`cpu`,match:`*`,minC:0,maxC:100,label:`Generic CPU`,source:xt},gpu:{kind:`gpu`,match:`*`,minC:0,maxC:95,label:`Generic GPU`,source:xt}};function fe(a,n){let e=String(n||``).trim().toLowerCase(),i=[...Gt.filter(l=>l.kind===a)].sort((l,d)=>{let f=l.match===`*`?-1:l.match.length;return(d.match===`*`?-1:d.match.length)-f});for(let l of i)if(l.match!==`*`&&e&&e.includes(l.match.toLowerCase()))return l;return i.find(l=>l.match===`*`)||Ht[a]}var jt=[`logViewport`];var St=()=>[];var Ut=()=>[`#f59e0b`];var Xt=()=>[`#60a5fa`];var qt=()=>[`#c084fc`];var Qt=(a,n)=>n.message;var $t=(a,n)=>n.title;var Kt=(a,n)=>n.id;function Wt(a,n){if(a&1&&Wm(0,`ao-error-state`,10),a&2)zm(`message`,DC().error())}function Jt(a,n){if(a&1&&(Ks(0,`a`,70),YC(1,` Open `),ld()),a&2){let e=DC().$implicit;zm(`routerLink`,e.href)}}function Yt(a,n){if(a&1&&(Ks(0,`div`,16),Wm(1,`mat-icon`,69),Ks(2,`div`,21)(3,`div`,5),YC(4),ld(),oC(5,Jt,2,1,`a`,70),ld()()),a&2){let e=n.$implicit;ab(),zm(`svgIcon`,e.severity===`warning`?`octagon-alert`:`circle-alert`),ab(3),py(e.message),ab(),iC(e.href?5:-1)}}function Zt(a,n){a&1&&(Ks(0,`div`,16),Wm(1,`mat-icon`,71),Ks(2,`div`,5),YC(3,`Nothing flagged`),ld()())}function ei(a,n){if(a&1&&(Ks(0,`mat-card`,18)(1,`mat-card-header`)(2,`div`,12),Wm(3,`mat-icon`,72),Ks(4,`div`,41),YC(5),ld()()(),Ks(6,`mat-card-content`)(7,`div`,73),YC(8),uT(9,`number`),ld(),Ks(10,`div`,74),Wm(11,`mat-icon`,72),Ks(12,`div`,27),YC(13),ld()()()()),a&2){let e=n.$implicit;ab(3),zm(`svgIcon`,e.icon),ab(2),py(e.title),ab(3),md(` `,dT(9,7,e.value),` `),ab(3),jC(e.toneClass),zm(`svgIcon`,e.toneIcon),ab(2),md(` `,e.caption,` `)}}function ti(a,n){a&1&&(Ks(0,`span`,31),YC(1,`%`),ld())}function ii(a,n){a&1&&(Ks(0,`span`,31),YC(1,`%`),ld())}function ni(a,n){a&1&&(Ks(0,`span`,31),YC(1,`°C`),ld())}function ai(a,n){if(a&1&&YC(0),a&2)md(` · `,DC().live.metrics()?.gpu?.vramSource,` `)}function oi(a,n){a&1&&(Ks(0,`span`,31),YC(1,`%`),ld())}function ri(a,n){a&1&&(Ks(0,`span`,31),YC(1,`%`),ld())}function ci(a,n){a&1&&(Ks(0,`span`,31),YC(1,`°C`),ld())}function si(a,n){a&1&&(Ks(0,`mat-card`,11)(1,`div`,12),Wm(2,`mat-icon`,13),Ks(3,`div`,14),YC(4,` Reach port guard `),ld()(),Ks(5,`div`,75),Wm(6,`mat-icon`,76),Ks(7,`div`,5),YC(8),ld()()()),a&2&&(ab(8),py(n.message))}function li(a,n){if(a&1&&(Ks(0,`mat-card`,11)(1,`div`,12),Wm(2,`mat-icon`,77),Ks(3,`div`,14),YC(4,` Sparkline snapshots `),ld()(),Ks(5,`div`,78)(6,`div`)(7,`div`,79),YC(8,`CPU`),ld(),Wm(9,`apx-chart`,80),ld(),Ks(10,`div`)(11,`div`,79),YC(12,`Memory`),ld(),Wm(13,`apx-chart`,80),ld(),Ks(14,`div`)(15,`div`,79),YC(16,`GPU`),ld(),Wm(17,`apx-chart`,80),ld()()()),a&2){let e=DC();ab(9),zm(`chart`,e.sparkChart.chart)(`colors`,oT(18,Ut))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`cpu`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip),ab(4),zm(`chart`,e.sparkChart.chart)(`colors`,oT(19,Xt))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`mem`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip),ab(4),zm(`chart`,e.sparkChart.chart)(`colors`,oT(20,qt))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`gpu`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip)}}function di(a,n){a&1&&(Ks(0,`span`,5),YC(1),ld()),a&2&&(ab(),md(`Snapshot `,n))}function pi(a,n){if(a&1&&(Ks(0,`mat-chip-option`,66),YC(1),ld()),a&2){let e=n.$implicit;zm(`value`,e),ab(),py(e)}}function mi(a,n){if(a&1&&(Ks(0,`div`,68)(1,`span`,81),YC(2),ld(),Ks(3,`span`,82),YC(4),ld(),Ks(5,`span`,83),YC(6),ld()()),a&2){let e=n.$implicit,t=DC();ab(2),py(t.formatLogTime(e.ts)),ab(),zm(`ngClass`,t.sourceClass(e.source)),ab(),py(e.source),ab(),zm(`ngClass`,t.levelClass(e.level)),ab(),py(e.line)}}function hi(a,n){a&1&&(Ks(0,`div`,5),YC(1,`Waiting for log lines…`),ld())}var Ct=[`web`,`engine`,`execution`,`ollama`,`mcp`,`speech`,`openclaw`,`reach`];var wt=class a{api=h(d);theming=h(Lt$2);live=h(U);logViewport=f2(`logViewport`);topologyTimer=null;topology=Lt$1(null);ping=Lt$1(null);session=Lt$1(null);error=Lt$1(null);selectedSources=Lt$1([]);followLogs=Lt$1(!0);components=yT(()=>this.topology()?.components||[]);orderedComponents=yT(()=>{let n=e=>{let t=Ct.indexOf(e);return t===-1?Ct.length:t};return[...this.components()].sort((e,t)=>n(e.id)-n(t.id))});topologyUnhealthyCount=yT(()=>this.components().filter(n=>[`failed`,`degraded`,`blocking`,`warning`].includes(String(n.status||``).toLowerCase())).length);filteredLogs=yT(()=>{let n=new Set(this.selectedSources()),e=this.live.logs();return n.size?e.filter(t=>n.has(t.source)):e});cpuMemSeries=yT(()=>{let n=this.live.history();return[{name:`CPU`,data:n.map(e=>({x:e.t,y:e.cpu==null?null:Number(e.cpu.toFixed(1))}))},{name:`Memory`,data:n.map(e=>({x:e.t,y:e.mem==null?null:Number(e.mem.toFixed(1))}))},{name:`Temp`,data:n.map(e=>({x:e.t,y:e.cpuTemp==null?null:Number(e.cpuTemp.toFixed(1))}))}]});gpuVramSeries=yT(()=>{let n=this.live.history();return[{name:`GPU`,data:n.map(e=>({x:e.t,y:e.gpu==null?null:Number(e.gpu.toFixed(1))}))},{name:`VRAM`,data:n.map(e=>({x:e.t,y:e.vram==null?null:Number(e.vram.toFixed(1))}))},{name:`Temp`,data:n.map(e=>({x:e.t,y:e.gpuTemp==null?null:Number(e.gpuTemp.toFixed(1))}))}]});cpuMemChartColors=[`#f59e0b`,`#60a5fa`,`#f87171`];gpuVramChartColors=[`#c084fc`,`#34d399`,`#f87171`];cpuThermalRange=yT(()=>{let n=String(this.live.metrics()?.scope||``),e=this.live.cpuModel(),t=this.live.gpuName();return fe(`cpu`,n===`jetson`||/jetson|tegra|orin/i.test(String(t||``))?t||e:e||t)});gpuThermalRange=yT(()=>fe(`gpu`,this.live.gpuName()));cpuMemTooltip=yT(()=>({theme:this.theming.isDark()?`dark`:`light`,x:{format:`HH:mm:ss`},y:{formatter:(n,e)=>n==null||Number.isNaN(Number(n))?`—`:(e?.seriesIndex??0)===2?`${Number(n).toFixed(1)}\xB0C`:`${Number(n).toFixed(1)}%`}}));gpuVramTooltip=yT(()=>({theme:this.theming.isDark()?`dark`:`light`,x:{format:`HH:mm:ss`},y:{formatter:(n,e)=>n==null||Number.isNaN(Number(n))?`—`:(e?.seriesIndex??0)===2?`${Number(n).toFixed(1)}\xB0C`:`${Number(n).toFixed(1)}%`}}));cpuMemYaxis=yT(()=>{let n=this.cpuThermalRange();return[{seriesName:`CPU`,min:0,max:100,tickAmount:4,forceNiceScale:!1,labels:{formatter:e=>`${Math.round(e)}%`,style:{colors:`var(--mat-sys-on-surface)`}}},{seriesName:`Memory`,show:!1,min:0,max:100,tickAmount:4,forceNiceScale:!1,labels:{formatter:e=>`${Math.round(e)}%`}},{seriesName:`Temp`,opposite:!0,min:n.minC,max:n.maxC,tickAmount:4,forceNiceScale:!1,title:{text:`${n.minC}\u2013${n.maxC}\xB0C`,style:{color:`var(--mat-sys-on-surface)`,fontSize:`11px`}},labels:{formatter:e=>`${Math.round(e)}\xB0C`,style:{colors:`var(--mat-sys-on-surface)`}}}]});gpuVramYaxis=yT(()=>{let n=this.gpuThermalRange();return[{seriesName:`GPU`,min:0,max:100,tickAmount:4,forceNiceScale:!1,labels:{formatter:e=>`${Math.round(e)}%`,style:{colors:`var(--mat-sys-on-surface)`}}},{seriesName:`VRAM`,show:!1,min:0,max:100,tickAmount:4,forceNiceScale:!1,labels:{formatter:e=>`${Math.round(e)}%`}},{seriesName:`Temp`,opposite:!0,min:n.minC,max:n.maxC,tickAmount:4,forceNiceScale:!1,title:{text:`${n.minC}\u2013${n.maxC}\xB0C`,style:{color:`var(--mat-sys-on-surface)`,fontSize:`11px`}},labels:{formatter:e=>`${Math.round(e)}\xB0C`,style:{colors:`var(--mat-sys-on-surface)`}}}]});summary=yT(()=>{let n=this.components(),e=n.filter(f=>[`healthy`,`available`,`succeeded`].includes(String(f.status||``).toLowerCase())).length,t=n.filter(f=>[`degraded`,`warning`,`running`,`reconciling`].includes(String(f.status||``).toLowerCase())).length,i=n.filter(f=>[`failed`,`blocking`].includes(String(f.status||``).toLowerCase())).length,l=this.topology()?.attention?.length??0;return[{title:`Healthy`,icon:`circle-check`,value:e,caption:n.filter(f=>[`healthy`,`available`,`succeeded`].includes(String(f.status||``).toLowerCase())).map(f=>f.id).join(`, `)||`components up`,toneIcon:`arrow-up`,toneClass:`text-green-600`},{title:`Degraded`,icon:`octagon-alert`,value:t,caption:`need watch`,toneIcon:t?`arrow-up`:`arrow-down`,toneClass:t?`text-amber-600`:`text-green-600`},{title:`Failed`,icon:`circle-x`,value:i,caption:`blocking`,toneIcon:i?`arrow-up`:`arrow-down`,toneClass:i?`text-red-600`:`text-green-600`},{title:`Attention`,icon:`bell`,value:l,caption:`open items`,toneIcon:l?`arrow-up`:`arrow-down`,toneClass:l?`text-amber-600`:`text-green-600`}]});utilChart={chart:{animations:{enabled:!1,dynamicAnimation:{enabled:!1}},fontFamily:`inherit`,foreColor:`inherit`,height:`100%`,type:`area`,toolbar:{show:!1},zoom:{enabled:!1}},colors:[`#f59e0b`,`#60a5fa`],dataLabels:{enabled:!1},fill:{type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.45,opacityTo:.05,stops:[0,90,100]}},grid:{borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:8,right:8}},legend:{show:!0,position:`top`,horizontalAlign:`right`},stroke:{curve:`smooth`,width:2,connectNulls:!0},xaxis:{type:`datetime`,labels:{datetimeUTC:!1,style:{colors:`var(--mat-sys-on-surface)`}},axisBorder:{show:!1},tooltip:{enabled:!1}}};sparkChart={chart:{animations:{enabled:!1,dynamicAnimation:{enabled:!1}},fontFamily:`inherit`,foreColor:`inherit`,height:`101%`,width:`101%`,type:`area`,sparkline:{enabled:!0}},fill:{type:`gradient`,gradient:{shadeIntensity:.5,opacityFrom:.4,opacityTo:.05}},stroke:{curve:`smooth`,width:2},tooltip:{enabled:!1}};constructor(){ws(()=>{this.filteredLogs(),this.followLogs()&&queueMicrotask(()=>{let n=this.logViewport()?.nativeElement;n&&(n.scrollTop=n.scrollHeight)})})}ngOnInit(){this.selectedSources.set([...this.live.logSourceOptions()]),this.live.acquire({metrics:!0,logs:!0}),this.reload(),this.topologyTimer=setInterval(()=>this.reload(),3e4)}ngOnDestroy(){this.topologyTimer&&(clearInterval(this.topologyTimer),this.topologyTimer=null),this.live.release()}sparkSeries(n){let e=this.live.history().map(t=>t[n]).filter(t=>t!=null);return[{name:n,data:e.length?e:[0]}]}onSourcesChange(n){let e=n.value,t=Array.isArray(e)?e:e?[e]:[];this.selectedSources.set(t),this.live.setLogSources(t.length?t:null)}exportBundle(){this.api.supportBundle().subscribe(n=>{if(!n.ok){this.error.set(n.message);return}let e=new Blob([JSON.stringify(n.data,null,2)],{type:`application/json`}),t=URL.createObjectURL(e),i=document.createElement(`a`);i.href=t,i.download=`ao-support-bundle-${Date.now()}.json`,i.click(),URL.revokeObjectURL(t)})}reload(){this.error.set(null),this.api.topology().subscribe(n=>{n.ok?this.topology.set(n.data):this.error.set(n.message)}),this.api.ping().subscribe(n=>n.ok&&this.ping.set(n.data)),this.api.session().subscribe(n=>n.ok&&this.session.set(n.data))}componentHref(n){let e=n.url||n.urlHint;if(!e)return null;let t=location.hostname||`127.0.0.1`,i=String(e).replace(/__HOST__/g,t).replace(/<host>/gi,t).split(/\s+/)[0];return!i||i.includes(`<`)?null:i.startsWith(`/`)?`${location.protocol}//${location.host}${i}`:i}resourceBarColor(n){return n==null?`primary`:n>=90?`error`:n>=75?`warn`:`primary`}statusLabel(n){let e=String(n||`unknown`).replace(/-/g,` `);return e.charAt(0).toUpperCase()+e.slice(1)}statusTextClass(n){let e=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`text-green-600`:[`failed`,`blocking`].includes(e)?`text-red-600`:[`degraded`,`warning`,`running`,`reconciling`].includes(e)?`text-amber-600`:`text-neutral-500`}statusDotClass(n){let e=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`bg-green-500`:[`failed`,`blocking`].includes(e)?`bg-red-500`:[`degraded`,`warning`,`running`,`reconciling`].includes(e)?`bg-amber-500`:`bg-neutral-400`}formatUptime(n){if(n==null||!Number.isFinite(n))return`—`;let e=Math.floor(n),t=Math.floor(e/86400),i=Math.floor(e%86400/3600),l=Math.floor(e%3600/60);return t>0?`${t}d ${i}h`:i>0?`${i}h ${l}m`:`${l}m`}formatLogTime(n){let e=new Date(n);return Number.isFinite(e.getTime())?e.toLocaleTimeString([],{hour12:!1,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}):`--:--:--`}sourceClass(n){switch(n){case`engine`:return`text-violet-400`;case`coordinator`:return`text-sky-400`;case`warm-pool`:return`text-amber-400`;case`broker`:return`text-rose-400`;default:return`text-emerald-400`}}levelClass(n){return n===`error`?`text-red-300`:n===`warn`?`text-amber-200`:`text-neutral-200`}static ɵfac=function(e){return new(e||a)};static ɵcmp=Xn({type:a,selectors:[[`ao-overview-page`]],viewQuery:function(e,t){e&1&&oy(t.logViewport,jt,5),e&2&&TC()},decls:198,vars:79,consts:[[`logViewport`,``],[1,`@container`,`mx-auto`,`flex`,`w-full`,`max-w-7xl`,`flex-auto`,`flex-col`,`gap-4`,`p-6`,`sm:gap-6`,`lg:px-8`,`lg:pt-8`,`lg:pb-10`],[1,`flex`,`items-center`,`justify-between`,`gap-x-3`],[1,`flex`,`flex-col`,`gap-y-0.5`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex-auto`],[`matButton`,`outlined`,`type`,`button`,1,`mr-2`,3,`click`],[1,`flex`,`items-center`,`gap-x-1.5`,`text-sm`,3,`ngClass`],[1,`inline-block`,`size-2`,`rounded-full`,3,`ngClass`],[3,`message`],[`appearance`,`outlined`,1,`p-6`],[1,`flex`,`items-center`,`gap-x-2`],[`svgIcon`,`sparkles`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`truncate`,`text-lg`,`font-medium`,`tracking-tight`],[1,`mt-6`,`flex`,`flex-col`,`gap-y-4`],[1,`flex`,`items-start`,`gap-x-3`],[1,`grid`,`gap-4`,`sm:gap-6`,`@max-md:grid-cols-1`,`@md:grid-cols-2`,`@4xl:grid-cols-4`],[`appearance`,`filled`],[`appearance`,`outlined`,1,`overflow-hidden`],[1,`flex`,`flex-col`,`gap-y-1`,`px-5`,`pt-5`,`sm:flex-row`,`sm:items-start`],[1,`min-w-0`,`flex-auto`],[1,`text-lg`,`font-medium`,`tracking-tight`],[1,`font-medium`,`text-neutral-500`],[1,`mt-2`,`grid`,`grid-cols-1`,`gap-2`,`px-2`,`pb-2`,`xl:grid-cols-2`],[1,`flex`,`min-w-0`,`flex-col`],[1,`flex`,`flex-wrap`,`items-end`,`gap-x-6`,`gap-y-2`,`px-3`,`pt-2`],[1,`text-sm`,`font-medium`,`text-neutral-500`],[1,`truncate`,`text-sm`,`font-medium`],[1,`text-xs`,`text-neutral-500`],[1,`text-3xl`,`font-semibold`,`tabular-nums`,`tracking-tighter`],[1,`text-lg`,`text-neutral-500`],[1,`h-64`,`w-full`,3,`chart`,`colors`,`dataLabels`,`fill`,`grid`,`legend`,`series`,`stroke`,`tooltip`,`xaxis`,`yaxis`],[1,`flex`,`flex-wrap`,`gap-x-8`,`gap-y-3`,`px-5`,`py-4`,`text-sm`],[1,`font-mono`,`tabular-nums`],[1,`min-w-40`,`flex-auto`],[`mode`,`determinate`,1,`mt-1`,`rounded-full`,3,`color`,`value`],[1,`grid`,`w-full`,`grid-cols-1`,`gap-6`,`xl:grid-cols-2`],[`appearance`,`filled`,1,`flex`,`flex-col`],[1,`flex`,`flex-auto`,`items-center`,`gap-x-2`],[`svgIcon`,`server`,1,`size-4`],[1,`font-medium`,`tracking-tight`],[1,`ml-auto`],[`matButton`,``,`href`,`/`],[1,`flex`,`flex-auto`,`flex-col`],[1,`text-3xl`,`font-semibold`],[1,`mt-0.5`,`text-sm`,`text-neutral-500`],[1,`mt-4`,`flex`,`flex-col`,`gap-y-3`],[1,`flex`,`items-center`,`gap-x-1`],[1,`font-medium`,`tabular-nums`],[1,`max-w-[60%]`,`truncate`,`font-mono`,`text-sm`,`font-medium`],[1,`font-medium`],[1,`flex`,`w-full`,`items-start`,`justify-between`,`gap-3`],[1,`text-sm`,`text-neutral-500`],[`matButton`,`filled`,`routerLink`,`/topology`],[`svgIcon`,`share-2`],[1,`pt-2`],[1,`flex`,`flex-wrap`,`items-center`,`gap-x-4`,`gap-y-1`,`text-sm`],[1,`font-medium`,3,`ngClass`],[1,`!rounded-xl`,`!border`,`!shadow-none`],[1,`flex`,`flex-col`,`gap-3`,`pb-2`,`sm:flex-row`,`sm:items-center`],[1,`min-w-0`,`flex-auto`,`text-sm`,`text-neutral-500`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[3,`svgIcon`],[1,`pb-3`],[`aria-label`,`Log sources`,3,`change`,`multiple`,`value`],[3,`value`],[1,`max-h-96`,`overflow-y-auto`,`bg-neutral-950`,`px-4`,`py-3`,`font-mono`,`text-xs`,`leading-relaxed`,`text-neutral-200`],[1,`flex`,`gap-x-2`,`whitespace-pre-wrap`,`break-all`],[1,`size-5`,`shrink-0`,`text-neutral-500`,3,`svgIcon`],[`matButton`,``,1,`mt-1`,3,`routerLink`],[`svgIcon`,`circle-check`,1,`size-5`,`shrink-0`,`text-green-600`],[1,`size-4`,3,`svgIcon`],[1,`text-5xl`,`font-semibold`,`tabular-nums`],[1,`mt-2`,`flex`,`items-center`,`gap-x-1`],[1,`mt-4`,`flex`,`items-start`,`gap-x-3`],[`svgIcon`,`octagon-alert`,1,`size-5`,`shrink-0`,`text-neutral-500`],[`svgIcon`,`activity`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`mt-4`,`grid`,`grid-cols-3`,`gap-3`],[1,`text-xs`,`font-medium`,`text-neutral-500`],[1,`h-16`,3,`chart`,`colors`,`fill`,`series`,`stroke`,`tooltip`],[1,`shrink-0`,`text-neutral-500`],[1,`w-24`,`shrink-0`,`truncate`,`font-semibold`,3,`ngClass`],[3,`ngClass`]],template:function(e,t){if(e&1&&(Ks(0,`div`,1)(1,`div`,2)(2,`div`,3)(3,`div`,4),YC(4,` Overview `),ld(),Ks(5,`div`,5),YC(6,` Live host utilization, topology, and streaming logs `),ld()(),Wm(7,`div`,6),Ks(8,`button`,7),Xm(`click`,function(){return t.exportBundle()}),YC(9,` Export support bundle `),ld(),Ks(10,`div`,8),Wm(11,`span`,9),YC(12),ld()(),oC(13,Wt,1,1,`ao-error-state`,10),Ks(14,`mat-card`,11)(15,`div`,12),Wm(16,`mat-icon`,13),Ks(17,`div`,14),YC(18,` Needs attention `),ld()(),Ks(19,`div`,15),aC(20,Yt,6,3,`div`,16,Qt,!1,Zt,4,0,`div`,16),ld()(),Ks(23,`div`,17),aC(24,ei,14,9,`mat-card`,18,$t),ld(),Ks(26,`mat-card`,19)(27,`div`,20)(28,`div`,21)(29,`div`,22),YC(30,` Host utilization `),ld(),Ks(31,`div`,23),YC(32),ld()()(),Ks(33,`div`,24)(34,`div`,25)(35,`div`,26)(36,`div`,21)(37,`div`,27),YC(38,`CPU`),ld(),Ks(39,`div`,28),YC(40),ld(),Ks(41,`div`,29),YC(42),ld()(),Ks(43,`div`)(44,`div`,27),YC(45,`CPU`),ld(),Ks(46,`div`,30),YC(47),oC(48,ti,2,0,`span`,31),ld()(),Ks(49,`div`)(50,`div`,27),YC(51,`Memory`),ld(),Ks(52,`div`,30),YC(53),oC(54,ii,2,0,`span`,31),ld()(),Ks(55,`div`)(56,`div`,27),YC(57,`Temp`),ld(),Ks(58,`div`,30),YC(59),uT(60,`number`),oC(61,ni,2,0,`span`,31),ld()()(),Wm(62,`apx-chart`,32),ld(),Ks(63,`div`,25)(64,`div`,26)(65,`div`,21)(66,`div`,27),YC(67,`GPU`),ld(),Ks(68,`div`,28),YC(69),ld(),Ks(70,`div`,29),YC(71),oC(72,ai,1,1),ld()(),Ks(73,`div`)(74,`div`,27),YC(75,`GPU`),ld(),Ks(76,`div`,30),YC(77),oC(78,oi,2,0,`span`,31),ld()(),Ks(79,`div`)(80,`div`,27),YC(81,`VRAM`),ld(),Ks(82,`div`,30),YC(83),oC(84,ri,2,0,`span`,31),ld()(),Ks(85,`div`)(86,`div`,27),YC(87,`Temp`),ld(),Ks(88,`div`,30),YC(89),uT(90,`number`),oC(91,ci,2,0,`span`,31),ld()()(),Wm(92,`apx-chart`,32),ld()(),Wm(93,`mat-divider`),Ks(94,`div`,33)(95,`div`)(96,`div`,23),YC(97,`Load`),ld(),Ks(98,`div`,34),YC(99),ld()(),Ks(100,`div`)(101,`div`,23),YC(102,`Uptime`),ld(),Ks(103,`div`,34),YC(104),ld()(),Ks(105,`div`,35)(106,`div`,23),YC(107,`CPU`),ld(),Wm(108,`mat-progress-bar`,36),ld(),Ks(109,`div`,35)(110,`div`,23),YC(111,`Memory`),ld(),Wm(112,`mat-progress-bar`,36),ld(),Ks(113,`div`,35)(114,`div`,23),YC(115,`GPU`),ld(),Wm(116,`mat-progress-bar`,36),ld(),Ks(117,`div`,35)(118,`div`,23),YC(119,`VRAM`),ld(),Wm(120,`mat-progress-bar`,36),ld()()(),Ks(121,`div`,37)(122,`mat-card`,38)(123,`mat-card-header`)(124,`div`,39),Wm(125,`mat-icon`,40),Ks(126,`div`,41),YC(127,`Web process`),ld(),Ks(128,`div`,42)(129,`a`,43),YC(130,` Open chat `),ld()()()(),Ks(131,`mat-card-content`,44)(132,`div`,45),YC(133),ld(),Ks(134,`div`,46),YC(135,` Coordinator web UI and Admin API process `),ld(),Ks(136,`div`,47)(137,`div`,48)(138,`div`,5),YC(139,`pid`),ld(),Wm(140,`div`,6),Ks(141,`div`,49),YC(142),ld()(),Ks(143,`div`,48)(144,`div`,5),YC(145,`instance`),ld(),Wm(146,`div`,6),Ks(147,`div`,50),YC(148),ld()(),Ks(149,`div`,48)(150,`div`,5),YC(151,`user`),ld(),Wm(152,`div`,6),Ks(153,`div`,51),YC(154),ld()()()()(),oC(155,si,9,1,`mat-card`,11)(156,li,18,21,`mat-card`,11),ld(),Ks(157,`mat-card`,19)(158,`mat-card-header`)(159,`div`,52)(160,`div`)(161,`div`,22),YC(162,` Deployment topology `),ld(),Ks(163,`div`,53),YC(164,` Live three-band graph of what is deployed and healthy `),ld()(),Ks(165,`a`,54),Wm(166,`mat-icon`,55),YC(167,` Open Topology `),ld()()(),Ks(168,`mat-card-content`,56)(169,`div`,57)(170,`span`),YC(171),ld(),Ks(172,`span`,58),YC(173),ld(),oC(174,di,2,1,`span`,5),ld()()(),Ks(175,`mat-expansion-panel`,59)(176,`mat-expansion-panel-header`)(177,`mat-panel-title`),YC(178,`Live logs`),ld(),Ks(179,`mat-panel-description`),YC(180,` Streaming from web + cluster tails `),ld()(),Ks(181,`div`,60)(182,`div`,61),YC(183,` Filter sources · errors red, warnings amber `),ld(),Ks(184,`button`,62),Xm(`click`,function(){return t.followLogs.set(!t.followLogs())}),Wm(185,`mat-icon`,63),YC(186),ld(),Ks(187,`button`,62),Xm(`click`,function(){return t.live.clearLogs()}),YC(188,` Clear `),ld()(),Ks(189,`div`,64)(190,`mat-chip-listbox`,65),Xm(`change`,function(l){return t.onSourcesChange(l)}),aC(191,pi,2,2,`mat-chip-option`,66,sC),ld()(),Ks(193,`div`,67,0),aC(195,mi,7,5,`div`,68,Kt,!1,hi,2,0,`div`,5),ld()()()),e&2){let i,l;ab(10),zm(`ngClass`,t.live.connected()?`text-green-600`:`text-neutral-500`),ab(),zm(`ngClass`,t.live.connected()?`bg-green-500 animate-pulse`:`bg-neutral-400`),ab(),md(` `,t.live.connected()?`Live`:`Reconnecting…`,` `),ab(),iC(t.error()?13:-1),ab(7),cC(t.topology()?.attention||oT(77,St)),ab(4),cC(t.summary()),ab(8),hy(` `,t.live.metrics()?.hostname||`Coordinator host`,` · scope `,t.live.metrics()?.scope||`—`,` · WebSocket push ~2s `),ab(8),md(` `,t.live.cpuModel()||`—`,` `),ab(2),hy(` `,t.live.metrics()?.cpu?.cores??`—`,` cores · memory `,t.live.memoryLabel()||`—`,` `),ab(5),md(` `,t.live.latestCpu()??`—`),ab(),iC(t.live.latestCpu()!=null?48:-1),ab(5),md(` `,t.live.latestMem()??`—`),ab(),iC(t.live.latestMem()!=null?54:-1),ab(5),md(` `,t.live.latestCpuTemp()!=null?fT(60,71,t.live.latestCpuTemp(),`1.0-1`):`—`),ab(2),iC(t.live.latestCpuTemp()!=null?61:-1),ab(),zm(`chart`,t.utilChart.chart)(`colors`,t.cpuMemChartColors)(`dataLabels`,t.utilChart.dataLabels)(`fill`,t.utilChart.fill)(`grid`,t.utilChart.grid)(`legend`,t.utilChart.legend)(`series`,t.cpuMemSeries())(`stroke`,t.utilChart.stroke)(`tooltip`,t.cpuMemTooltip())(`xaxis`,t.utilChart.xaxis)(`yaxis`,t.cpuMemYaxis()),ab(7),md(` `,t.live.gpuName()||`No GPU metrics`,` `),ab(2),md(` VRAM `,t.live.vramLabel()||`—`,` `),ab(),iC(t.live.metrics()?.gpu?.vramSource?72:-1),ab(5),md(` `,t.live.latestGpu()??`—`),ab(),iC(t.live.latestGpu()!=null?78:-1),ab(5),md(` `,t.live.latestVram()??`—`),ab(),iC(t.live.latestVram()!=null?84:-1),ab(5),md(` `,t.live.latestGpuTemp()!=null?fT(90,74,t.live.latestGpuTemp(),`1.0-1`):`—`),ab(2),iC(t.live.latestGpuTemp()!=null?91:-1),ab(),zm(`chart`,t.utilChart.chart)(`colors`,t.gpuVramChartColors)(`dataLabels`,t.utilChart.dataLabels)(`fill`,t.utilChart.fill)(`grid`,t.utilChart.grid)(`legend`,t.utilChart.legend)(`series`,t.gpuVramSeries())(`stroke`,t.utilChart.stroke)(`tooltip`,t.gpuVramTooltip())(`xaxis`,t.utilChart.xaxis)(`yaxis`,t.gpuVramYaxis()),ab(7),md(` `,(t.live.metrics()?.loadAvg||oT(78,St)).join(` · `)||`—`,` `),ab(5),md(` `,t.formatUptime(t.live.metrics()?.uptimeSec),` `),ab(4),zm(`color`,t.resourceBarColor(t.live.latestCpu()))(`value`,t.live.latestCpu()??0),ab(4),zm(`color`,t.resourceBarColor(t.live.latestMem()))(`value`,t.live.latestMem()??0),ab(4),zm(`color`,t.resourceBarColor(t.live.latestGpu()))(`value`,t.live.latestGpu()??0),ab(4),zm(`color`,t.resourceBarColor(t.live.latestVram()))(`value`,t.live.latestVram()??0),ab(13),md(` `,t.ping()?.service||`—`,` `),ab(9),md(` `,t.ping()?.pid??`—`,` `),ab(6),md(` `,t.ping()?.instance||`—`,` `),ab(6),md(` `,t.session()?.userName||`—`,` `),ab(),iC((i=t.topology()?.reachGuard)?155:156,i),ab(16),md(` `,t.orderedComponents().length,` components reported `),ab(),zm(`ngClass`,t.topologyUnhealthyCount()>0?`text-red-600 dark:text-red-400`:`text-neutral-500`),ab(),md(` `,t.topologyUnhealthyCount(),` unhealthy `),ab(),iC((l=t.topology()?.generatedAt)?174:-1,l),ab(11),zm(`svgIcon`,t.followLogs()?`circle-check`:`circle`),ab(),md(` `,t.followLogs()?`Following`:`Follow`,` `),ab(4),zm(`multiple`,!0)(`value`,t.selectedSources()),ab(),cC(t.live.logSourceOptions()),ab(4),cC(t.filteredLogs())}},dependencies:[Dt$1,I$1,lt$1,dt$1,yt$1,wt$1,w,I,A,m,bt,yt,ve,ge,Te,Ie,hn,mn,bS,he$1,NS],encapsulation:2})};export{wt as OverviewPage};