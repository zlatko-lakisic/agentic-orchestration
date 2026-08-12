import{$n as hT,$r as uT,$t as Xm,Ar as pC,At as SC,C as Ey,Di as yd,Dr as or,Gt as Ve,Hr as rs,Ht as Uy,In as eT,Ir as qm,It as Ts,K as Jn,Kn as fz,L as ID,Lr as qn,Mi as zm,N as He,Nn as dd,Nr as pd,Nt as TC,O as Ga,Oi as ye,Pr as py,Q as Km,Qn as h,Ti as yT,Tn as cg,Tr as ny,U as Jb,Vn as fC,Vr as ro,Wn as fd,Wt as Va,Xn as gf,Xr as ty,Yt as Wm,Z as Kf,Zr as uC,Zt as XT,_r as lf,_t as P,b as E2,bi as xC,br as mT,bt as QG,cr as jm,ct as Ne,dr as kS,ei as ub,en as Xp,er as ha,et as L,fr as ki$1,gn as ay,gt as Or,ir as iN,it as MS,kn as dC,kr as oy,lt as O,mi as wC,ni as ue$1,nn as Xv,oi as v,ot as NC,qn as g2,qr as tE,r as AC,ri as uf,rn as Y,rr as hy,t as $C,ti as ud,tn as Xs,tt as Lt$1,ui as va,xi as xM,xn as cC,xt as Qb,z as IT}from"./chunk-_jepUChT.js";import{S as Lt$2,f as B,h as Vt$1,i as G,n as yt$1,p as Ie,r as Dt$1,t as wt$1}from"./main-JFFSNLYX.js";import{n as dt,r as lt}from"./chunk-DrY7LqkW.js";import"./chunk-qgEL4RLw.js";import"./chunk-BnivhzLc.js";import{d as se,l as _n,r as Ht$1,s as Pe,u as mn}from"./chunk-Ce0FHNzE.js";import{n as ht,r as pt}from"./chunk-DjEUiflo.js";import{n as I,r as w,t as A}from"./chunk-Clw6Hw8C.js";import{t as I$1}from"./chunk-DkDYz7NX.js";import{t as d}from"./chunk-CJxJrcI-.js";import{t as m}from"./chunk-Bq1hKqk7.js";import"./chunk-B82HiID_.js";import{n as ge$1,t as B$1}from"./chunk-ijIaE48n.js";import{a as mn$1,i as hn,n as Te,t as Ie$1}from"./chunk-DKle3yWu.js";var wt=[`*`,[[`mat-chip-avatar`],[``,`matChipAvatar`,``]],[[`mat-chip-trailing-icon`],[``,`matChipRemove`,``],[``,`matChipTrailingIcon`,``]]];var Nt=[`*`,`mat-chip-avatar, [matChipAvatar]`,`mat-chip-trailing-icon,[matChipRemove],[matChipTrailingIcon]`];function Vt(a,n){a&1&&(Xs(0,`span`,3),SC(1,1),dd())}function Gt(a,n){a&1&&(Xs(0,`span`,6),SC(1,2),dd())}function Ht(a,n){a&1&&(Xs(0,`span`,3),SC(1,1),Xs(2,`span`,7),Xp(),Xs(3,`svg`,8),Wm(4,`path`,9),dd()()())}function jt(a,n){a&1&&(Xs(0,`span`,6),SC(1,2),dd())}var Ut=`.mdc-evolution-chip,
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
`;var kt=[`*`];var Xt=`.mat-mdc-chip-set {
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
`;var It=new v(`mat-chips-default-options`,{providedIn:`root`,factory:()=>({separatorKeyCodes:[13]})});var yt=new v(`MatChipAvatar`);var bt=new v(`MatChipTrailingIcon`);var xt=new v(`MatChipEdit`);var St=new v(`MatChipRemove`);var ue=new v(`MatChip`);var Et=(()=>{class a{_elementRef=h(ue$1);_parentChip=h(ue);_isPrimary=!0;_isLeading=!1;get disabled(){return this._disabled||this._parentChip?.disabled||!1}set disabled(e){this._disabled=e}_disabled=!1;tabIndex=-1;_allowFocusWhenDisabled=!1;_getDisabledAttribute(){return this.disabled&&!this._allowFocusWhenDisabled?``:null}constructor(){h(or).load(QG),this._elementRef.nativeElement.nodeName===`BUTTON`&&this._elementRef.nativeElement.setAttribute(`type`,`button`)}focus(){this._elementRef.nativeElement.focus()}static ɵfac=function(t){return new(t||a)};static ɵdir=He({type:a,selectors:[[``,`matChipContent`,``]],hostAttrs:[1,`mat-mdc-chip-action`,`mdc-evolution-chip__action`,`mdc-evolution-chip__action--presentational`],hostVars:8,hostBindings:function(t,i){t&2&&(ud(`disabled`,i._getDisabledAttribute())(`aria-disabled`,i.disabled),ha(`mdc-evolution-chip__action--primary`,i._isPrimary)(`mdc-evolution-chip__action--secondary`,!i._isPrimary)(`mdc-evolution-chip__action--trailing`,!i._isPrimary&&!i._isLeading))},inputs:{disabled:[2,`disabled`,`disabled`,va],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?-1:XT(e)],_allowFocusWhenDisabled:`_allowFocusWhenDisabled`}})}return a})();var Mt=(()=>{class a extends Et{_getTabindex(){return this.disabled&&!this._allowFocusWhenDisabled?null:this.tabIndex.toString()}_handleClick(e){!this.disabled&&this._isPrimary&&(e.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}_handleKeydown(e){(e.keyCode===13||e.keyCode===32)&&!this.disabled&&this._isPrimary&&!this._parentChip._isEditing&&(e.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}static ɵfac=(()=>{let e;return function(i){return(e||(e=cg(a)))(i||a)}})();static ɵdir=He({type:a,selectors:[[``,`matChipAction`,``]],hostVars:3,hostBindings:function(t,i){t&1&&Xm(`click`,function(d){return i._handleClick(d)})(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&(ud(`tabindex`,i._getTabindex()),ha(`mdc-evolution-chip__action--presentational`,!1))},features:[jm]})}return a})();var me=(()=>{class a{_changeDetectorRef=h(Uy);_elementRef=h(ue$1);_tagName=h(g2);_ngZone=h(P);_focusMonitor=h(Xv);_globalRippleOptions=h(gf,{optional:!0});_document=h(O);_onFocus=new L;_onBlur=new L;_isBasicChip=!1;role=null;_hasFocusInternal=!1;_pendingFocus=!1;_actionChanges;_animationsDisabled=Va();_allLeadingIcons;_allTrailingIcons;_allEditIcons;_allRemoveIcons;_hasFocus(){return this._hasFocusInternal}id=h(lf).getId(`mat-mdc-chip-`);ariaLabel=null;ariaDescription=null;_chipListDisabled=!1;_hadFocusOnRemove=!1;_textElement;get value(){return this._value!==void 0?this._value:this._textElement.textContent.trim()}set value(e){this._value=e}_value;color;removable=!0;highlighted=!1;disableRipple=!1;get disabled(){return this._disabled||this._chipListDisabled}set disabled(e){this._disabled=e}_disabled=!1;removed=new ye;destroyed=new ye;basicChipAttrName=`mat-basic-chip`;leadingIcon;editIcon;trailingIcon;removeIcon;primaryAction;_rippleLoader=h(fz);_injector=h(Y);constructor(){let e=h(or);e.load(QG),e.load(Ga),this._monitorFocus(),this._rippleLoader?.configureRipple(this._elementRef.nativeElement,{className:`mat-mdc-chip-ripple`,disabled:this._isRippleDisabled()})}ngOnInit(){this._isBasicChip=this._elementRef.nativeElement.hasAttribute(this.basicChipAttrName)||this._tagName.toLowerCase()===this.basicChipAttrName}ngAfterViewInit(){this._textElement=this._elementRef.nativeElement.querySelector(`.mat-mdc-chip-action-label`),this._pendingFocus&&(this._pendingFocus=!1,this.focus())}ngAfterContentInit(){this._actionChanges=tE(this._allLeadingIcons.changes,this._allTrailingIcons.changes,this._allEditIcons.changes,this._allRemoveIcons.changes).subscribe(()=>this._changeDetectorRef.markForCheck())}ngDoCheck(){this._rippleLoader.setDisabled(this._elementRef.nativeElement,this._isRippleDisabled())}ngOnDestroy(){this.destroyed.emit({chip:this}),this.destroyed.complete(),this._focusMonitor.stopMonitoring(this._elementRef),this._rippleLoader?.destroyRipple(this._elementRef.nativeElement),this._actionChanges?.unsubscribe()}remove(){this.removable&&(this._hadFocusOnRemove=this._hasFocus(),this.removed.emit({chip:this}))}_isRippleDisabled(){return this.disabled||this.disableRipple||this._animationsDisabled||this._isBasicChip||!this._hasInteractiveActions()||!!this._globalRippleOptions?.disabled}_hasTrailingIcon(){return!!(this.trailingIcon||this.removeIcon)}_handleKeydown(e){(e.keyCode===8&&!e.repeat||e.keyCode===46)&&(e.preventDefault(),this.remove())}focus(){this.disabled||(this.primaryAction?this.primaryAction.focus():this._pendingFocus=!0)}_getSourceAction(e){return this._getActions().find(t=>{let i=t._elementRef.nativeElement;return i===e||i.contains(e)})}_getActions(){let e=[];return this.editIcon&&e.push(this.editIcon),this.primaryAction&&e.push(this.primaryAction),this.removeIcon&&e.push(this.removeIcon),e}_handlePrimaryActionInteraction(){}_hasInteractiveActions(){return this._getActions().length>0}_edit(e){}_monitorFocus(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{let t=e!==null;t!==this._hasFocusInternal&&(this._hasFocusInternal=t,t?this._onFocus.next({chip:this}):(this._changeDetectorRef.markForCheck(),setTimeout(()=>this._ngZone.run(()=>this._onBlur.next({chip:this})))))})}static ɵfac=function(t){return new(t||a)};static ɵcmp=Jn({type:a,selectors:[[`mat-basic-chip`],[``,`mat-basic-chip`,``],[`mat-chip`],[``,`mat-chip`,``]],contentQueries:function(t,i,l){if(t&1&&ty(l,yt,5)(l,xt,5)(l,bt,5)(l,St,5)(l,yt,5)(l,bt,5)(l,xt,5)(l,St,5),t&2){let d;NC(d=AC())&&(i.leadingIcon=d.first),NC(d=AC())&&(i.editIcon=d.first),NC(d=AC())&&(i.trailingIcon=d.first),NC(d=AC())&&(i.removeIcon=d.first),NC(d=AC())&&(i._allLeadingIcons=d),NC(d=AC())&&(i._allTrailingIcons=d),NC(d=AC())&&(i._allEditIcons=d),NC(d=AC())&&(i._allRemoveIcons=d)}},viewQuery:function(t,i){if(t&1&&ny(Mt,5),t&2){let l;NC(l=AC())&&(i.primaryAction=l.first)}},hostAttrs:[1,`mat-mdc-chip`],hostVars:31,hostBindings:function(t,i){t&1&&Xm(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&(Km(`id`,i.id),ud(`role`,i.role)(`aria-label`,i.ariaLabel),$C(`mat-`+(i.color||`primary`)),ha(`mdc-evolution-chip`,!i._isBasicChip)(`mdc-evolution-chip--disabled`,i.disabled)(`mdc-evolution-chip--with-trailing-action`,i._hasTrailingIcon())(`mdc-evolution-chip--with-primary-graphic`,i.leadingIcon)(`mdc-evolution-chip--with-primary-icon`,i.leadingIcon)(`mdc-evolution-chip--with-avatar`,i.leadingIcon)(`mat-mdc-chip-with-avatar`,i.leadingIcon)(`mat-mdc-chip-highlighted`,i.highlighted)(`mat-mdc-chip-disabled`,i.disabled)(`mat-mdc-basic-chip`,i._isBasicChip)(`mat-mdc-standard-chip`,!i._isBasicChip)(`mat-mdc-chip-with-trailing-icon`,i._hasTrailingIcon())(`_mat-animation-noopable`,i._animationsDisabled))},inputs:{role:`role`,id:`id`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaDescription:[0,`aria-description`,`ariaDescription`],value:`value`,color:`color`,removable:[2,`removable`,`removable`,va],highlighted:[2,`highlighted`,`highlighted`,va],disableRipple:[2,`disableRipple`,`disableRipple`,va],disabled:[2,`disabled`,`disabled`,va]},outputs:{removed:`removed`,destroyed:`destroyed`},exportAs:[`matChip`],features:[Ey([{provide:ue,useExisting:a}])],ngContentSelectors:Nt,decls:8,vars:2,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipContent`,``],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`]],template:function(t,i){t&1&&(TC(wt),Wm(0,`span`,0),Xs(1,`span`,1)(2,`span`,2),cC(3,Vt,2,0,`span`,3),Xs(4,`span`,4),SC(5),Wm(6,`span`,5),dd()()(),cC(7,Gt,2,0,`span`,6)),t&2&&(ub(3),uC(i.leadingIcon?3:-1),ub(4),uC(i._hasTrailingIcon()?7:-1))},dependencies:[Et],styles:[`.mdc-evolution-chip,
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
`],encapsulation:2})}return a})();var ge=(()=>{class a extends me{_defaultOptions=h(It,{optional:!0});chipListSelectable=!0;_chipListMultiple=!1;_chipListHideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get selectable(){return this._selectable&&this.chipListSelectable}set selectable(e){this._selectable=e,this._changeDetectorRef.markForCheck()}_selectable=!0;get selected(){return this._selected}set selected(e){this._setSelectedState(e,!1,!0)}_selected=!1;get ariaSelected(){return this.selectable?this.selected.toString():null}basicChipAttrName=`mat-basic-chip-option`;selectionChange=new ye;ngOnInit(){super.ngOnInit(),this.role=`presentation`}select(){this._setSelectedState(!0,!1,!0)}deselect(){this._setSelectedState(!1,!1,!0)}selectViaInteraction(){this._setSelectedState(!0,!0,!0)}toggleSelected(e=!1){return this._setSelectedState(!this.selected,e,!0),this.selected}_handlePrimaryActionInteraction(){this.disabled||(this.focus(),this.selectable&&this.toggleSelected(!0))}_hasLeadingGraphic(){return this.leadingIcon?!0:!this._chipListHideSingleSelectionIndicator||this._chipListMultiple}_setSelectedState(e,t,i){e!==this.selected&&(this._selected=e,i&&this.selectionChange.emit({source:this,isUserInput:t,selected:this.selected}),this._changeDetectorRef.markForCheck())}static ɵfac=(()=>{let e;return function(i){return(e||(e=cg(a)))(i||a)}})();static ɵcmp=Jn({type:a,selectors:[[`mat-basic-chip-option`],[``,`mat-basic-chip-option`,``],[`mat-chip-option`],[``,`mat-chip-option`,``]],hostAttrs:[1,`mat-mdc-chip`,`mat-mdc-chip-option`],hostVars:37,hostBindings:function(t,i){t&2&&(Km(`id`,i.id),ud(`tabindex`,null)(`aria-label`,null)(`aria-description`,null)(`role`,i.role),ha(`mdc-evolution-chip`,!i._isBasicChip)(`mdc-evolution-chip--filter`,!i._isBasicChip)(`mdc-evolution-chip--selectable`,!i._isBasicChip)(`mat-mdc-chip-selected`,i.selected)(`mat-mdc-chip-multiple`,i._chipListMultiple)(`mat-mdc-chip-disabled`,i.disabled)(`mat-mdc-chip-with-avatar`,i.leadingIcon)(`mdc-evolution-chip--disabled`,i.disabled)(`mdc-evolution-chip--selected`,i.selected)(`mdc-evolution-chip--selecting`,!i._animationsDisabled)(`mdc-evolution-chip--with-trailing-action`,i._hasTrailingIcon())(`mdc-evolution-chip--with-primary-icon`,i.leadingIcon)(`mdc-evolution-chip--with-primary-graphic`,i._hasLeadingGraphic())(`mdc-evolution-chip--with-avatar`,i.leadingIcon)(`mat-mdc-chip-highlighted`,i.highlighted)(`mat-mdc-chip-with-trailing-icon`,i._hasTrailingIcon()))},inputs:{selectable:[2,`selectable`,`selectable`,va],selected:[2,`selected`,`selected`,va]},outputs:{selectionChange:`selectionChange`},features:[Ey([{provide:me,useExisting:a},{provide:ue,useExisting:a}]),jm],ngContentSelectors:Nt,decls:8,vars:6,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipAction`,``,`role`,`option`,3,`_allowFocusWhenDisabled`],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`],[1,`mdc-evolution-chip__checkmark`],[`viewBox`,`-2 -3 30 30`,`focusable`,`false`,`aria-hidden`,`true`,1,`mdc-evolution-chip__checkmark-svg`],[`fill`,`none`,`stroke`,`currentColor`,`d`,`M1.73,12.91 8.1,19.28 22.79,4.59`,1,`mdc-evolution-chip__checkmark-path`]],template:function(t,i){t&1&&(TC(wt),Wm(0,`span`,0),Xs(1,`span`,1)(2,`button`,2),cC(3,Ht,5,0,`span`,3),Xs(4,`span`,4),SC(5),Wm(6,`span`,5),dd()()(),cC(7,jt,2,0,`span`,6)),t&2&&(ub(2),zm(`_allowFocusWhenDisabled`,!0),ud(`aria-description`,i.ariaDescription)(`aria-label`,i.ariaLabel)(`aria-selected`,i.ariaSelected),ub(),uC(i._hasLeadingGraphic()?3:-1),ub(4),uC(i._hasTrailingIcon()?7:-1))},dependencies:[Mt],styles:[Ut],encapsulation:2})}return a})();var qt=(()=>{class a{_elementRef=h(ue$1);_changeDetectorRef=h(Uy);_dir=h(iN,{optional:!0});_lastDestroyedFocusedChipIndex=null;_keyManager;_destroyed=new L;_defaultRole=`presentation`;get chipFocusChanges(){return this._getChipStream(e=>e._onFocus)}get chipDestroyedChanges(){return this._getChipStream(e=>e.destroyed)}get chipRemovedChanges(){return this._getChipStream(e=>e.removed)}get disabled(){return this._disabled}set disabled(e){this._disabled=e,this._syncChipsState()}_disabled=!1;get empty(){return!this._chips||this._chips.length===0}get role(){return this._explicitRole?this._explicitRole:this.empty?null:this._defaultRole}tabIndex=0;set role(e){this._explicitRole=e}_explicitRole=null;get focused(){return this._hasFocusedChip()}_chips;_chipActions=new qn;ngAfterViewInit(){this._setUpFocusManagement(),this._trackChipSetChanges(),this._trackDestroyedFocusedChip()}ngOnDestroy(){this._keyManager?.destroy(),this._chipActions.destroy(),this._destroyed.next(),this._destroyed.complete()}_hasFocusedChip(){return this._chips&&this._chips.some(e=>e._hasFocus())}_syncChipsState(){this._chips?.forEach(e=>{e._chipListDisabled=this._disabled,e._changeDetectorRef.markForCheck()})}focus(){}_handleKeydown(e){this._originatesFromChip(e)&&this._keyManager.onKeydown(e)}_isValidIndex(e){return e>=0&&e<this._chips.length}_allowFocusEscape(){let e=this._elementRef.nativeElement.tabIndex;e!==-1&&(this._elementRef.nativeElement.tabIndex=-1,setTimeout(()=>this._elementRef.nativeElement.tabIndex=e))}_getChipStream(e){return this._chips.changes.pipe(ki$1(null),Kf(()=>tE(...this._chips.map(e))))}_originatesFromChip(e){let t=e.target;for(;t&&t!==this._elementRef.nativeElement;){if(t.classList.contains(`mat-mdc-chip`))return!0;t=t.parentElement}return!1}_setUpFocusManagement(){this._chips.changes.pipe(ki$1(this._chips)).subscribe(e=>{let t=[];e.forEach(i=>i._getActions().forEach(l=>t.push(l))),this._chipActions.reset(t),this._chipActions.notifyOnChanges()}),this._keyManager=new uf(this._chipActions).withVerticalOrientation().withHorizontalOrientation(this._dir?this._dir.value:`ltr`).withHomeAndEnd().skipPredicate(e=>this._skipPredicate(e)),this.chipFocusChanges.pipe(ro(this._destroyed)).subscribe(({chip:e})=>{let t=e._getSourceAction(document.activeElement);t&&this._keyManager.updateActiveItem(t)}),this._dir?.change.pipe(ro(this._destroyed)).subscribe(e=>this._keyManager.withHorizontalOrientation(e))}_skipPredicate(e){return e.disabled}_trackChipSetChanges(){this._chips.changes.pipe(ki$1(null),ro(this._destroyed)).subscribe(()=>{this.disabled&&Promise.resolve().then(()=>this._syncChipsState()),this._redirectDestroyedChipFocus()})}_trackDestroyedFocusedChip(){this.chipDestroyedChanges.pipe(ro(this._destroyed)).subscribe(e=>{let i=this._chips.toArray().indexOf(e.chip),l=e.chip._hasFocus(),d=e.chip._hadFocusOnRemove&&this._keyManager.activeItem&&e.chip._getActions().includes(this._keyManager.activeItem),f=l||d;this._isValidIndex(i)&&f&&(this._lastDestroyedFocusedChipIndex=i)})}_redirectDestroyedChipFocus(){if(this._lastDestroyedFocusedChipIndex!=null){if(this._chips.length){let e=Math.min(this._lastDestroyedFocusedChipIndex,this._chips.length-1),t=this._chips.toArray()[e];t.disabled?this._chips.length===1?this.focus():this._keyManager.setPreviousItemActive():t.focus()}else this.focus();this._lastDestroyedFocusedChipIndex=null}}static ɵfac=function(t){return new(t||a)};static ɵcmp=Jn({type:a,selectors:[[`mat-chip-set`]],contentQueries:function(t,i,l){if(t&1&&ty(l,me,5),t&2){let d;NC(d=AC())&&(i._chips=d)}},hostAttrs:[1,`mat-mdc-chip-set`,`mdc-evolution-chip-set`],hostVars:1,hostBindings:function(t,i){t&1&&Xm(`keydown`,function(d){return i._handleKeydown(d)}),t&2&&ud(`role`,i.role)},inputs:{disabled:[2,`disabled`,`disabled`,va],role:`role`,tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:XT(e)]},ngContentSelectors:kt,decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(t,i){t&1&&(TC(),fd(0,`div`,0),SC(1),pd())},styles:[`.mat-mdc-chip-set {
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
`],encapsulation:2})}return a})();var he=class{source;value;constructor(n,e){this.source=n,this.value=e}};var Qt={provide:se,useExisting:rs(()=>ve),multi:!0};var ve=(()=>{class a extends qt{_onTouched=()=>{};_onChange=()=>{};_defaultRole=`listbox`;_defaultOptions=h(It,{optional:!0});get multiple(){return this._multiple}set multiple(e){this._multiple=e,this._syncListboxProperties()}_multiple=!1;get selected(){let e=this._chips.toArray().filter(t=>t.selected);return this.multiple?e:e[0]}ariaOrientation=`horizontal`;get selectable(){return this._selectable}set selectable(e){this._selectable=e,this._syncListboxProperties()}_selectable=!0;compareWith=(e,t)=>e===t;required=!1;get hideSingleSelectionIndicator(){return this._hideSingleSelectionIndicator}set hideSingleSelectionIndicator(e){this._hideSingleSelectionIndicator=e,this._syncListboxProperties()}_hideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get chipSelectionChanges(){return this._getChipStream(e=>e.selectionChange)}get chipBlurChanges(){return this._getChipStream(e=>e._onBlur)}get value(){return this._value}set value(e){this._chips&&this._chips.length&&this._setSelectionByValue(e,!1),this._value=e}_value;change=new ye;_chips=void 0;ngAfterContentInit(){this._chips.changes.pipe(ki$1(null),ro(this._destroyed)).subscribe(()=>{this.value!==void 0&&Promise.resolve().then(()=>{this._setSelectionByValue(this.value,!1)}),this._syncListboxProperties()}),this.chipBlurChanges.pipe(ro(this._destroyed)).subscribe(()=>this._blur()),this.chipSelectionChanges.pipe(ro(this._destroyed)).subscribe(e=>{this.multiple||this._chips.forEach(t=>{t!==e.source&&t._setSelectedState(!1,!1,!1)}),e.isUserInput&&this._propagateChanges()})}focus(){if(this.disabled)return;let e=this._getFirstSelectedChip();e&&!e.disabled?e.focus():this._chips.length>0?this._keyManager.setFirstItemActive():this._elementRef.nativeElement.focus()}writeValue(e){e!=null?this.value=e:this.value=void 0}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}setDisabledState(e){this.disabled=e}_setSelectionByValue(e,t=!0){this._clearSelection(),Array.isArray(e)?e.forEach(i=>this._selectValue(i,t)):this._selectValue(e,t)}_blur(){this.disabled||setTimeout(()=>{this.focused||this._markAsTouched()})}_keydown(e){e.keyCode===9&&super._allowFocusEscape()}_markAsTouched(){this._onTouched(),this._changeDetectorRef.markForCheck()}_propagateChanges(){let e=null;Array.isArray(this.selected)?e=this.selected.map(t=>t.value):e=this.selected?this.selected.value:void 0,this._value=e,this.change.emit(new he(this,e)),this._onChange(e),this._changeDetectorRef.markForCheck()}_clearSelection(e){this._chips.forEach(t=>{t!==e&&t.deselect()})}_selectValue(e,t){let i=this._chips.find(l=>l.value!=null&&this.compareWith(l.value,e));return i&&(t?i.selectViaInteraction():i.select()),i}_syncListboxProperties(){this._chips&&Promise.resolve().then(()=>{this._chips.forEach(e=>{e._chipListMultiple=this.multiple,e.chipListSelectable=this._selectable,e._chipListHideSingleSelectionIndicator=this.hideSingleSelectionIndicator,e._changeDetectorRef.markForCheck()})})}_getFirstSelectedChip(){return Array.isArray(this.selected)?this.selected.length?this.selected[0]:void 0:this.selected}_skipPredicate(e){return!1}static ɵfac=(()=>{let e;return function(i){return(e||(e=cg(a)))(i||a)}})();static ɵcmp=Jn({type:a,selectors:[[`mat-chip-listbox`]],contentQueries:function(t,i,l){if(t&1&&ty(l,ge,5),t&2){let d;NC(d=AC())&&(i._chips=d)}},hostAttrs:[1,`mdc-evolution-chip-set`,`mat-mdc-chip-listbox`],hostVars:10,hostBindings:function(t,i){t&1&&Xm(`focus`,function(){return i.focus()})(`blur`,function(){return i._blur()})(`keydown`,function(d){return i._keydown(d)}),t&2&&(Km(`tabIndex`,i.disabled||i.empty?-1:i.tabIndex),ud(`role`,i.role)(`aria-required`,i.role?i.required:null)(`aria-disabled`,i.disabled.toString())(`aria-multiselectable`,i.multiple)(`aria-orientation`,i.ariaOrientation),ha(`mat-mdc-chip-list-disabled`,i.disabled)(`mat-mdc-chip-list-required`,i.required))},inputs:{multiple:[2,`multiple`,`multiple`,va],ariaOrientation:[0,`aria-orientation`,`ariaOrientation`],selectable:[2,`selectable`,`selectable`,va],compareWith:`compareWith`,required:[2,`required`,`required`,va],hideSingleSelectionIndicator:[2,`hideSingleSelectionIndicator`,`hideSingleSelectionIndicator`,va],value:`value`},outputs:{change:`change`},features:[Ey([Qt]),jm],ngContentSelectors:kt,decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(t,i){t&1&&(TC(),fd(0,`div`,0),SC(1),pd())},styles:[Xt],encapsulation:2})}return a})();function $t(a,n){a&1&&qm(0,`div`,2)}var Kt=new v(`MAT_PROGRESS_BAR_DEFAULT_OPTIONS`);var Tt=(()=>{class a{_elementRef=h(ue$1);_ngZone=h(P);_changeDetectorRef=h(Uy);_renderer=h(Or);_cleanupTransitionEnd;constructor(){let e=xM(),t=h(Kt,{optional:!0});this._isNoopAnimation=e===`di-disabled`,e===`reduced-motion`&&this._elementRef.nativeElement.classList.add(`mat-progress-bar-reduced-motion`),t&&(t.color&&(this.color=this._defaultColor=t.color),this.mode=t.mode||this.mode)}_isNoopAnimation;get color(){return this._color||this._defaultColor}set color(e){this._color=e}_color;_defaultColor=`primary`;get value(){return this._value}set value(e){this._value=At(e||0),this._changeDetectorRef.markForCheck()}_value=0;get bufferValue(){return this._bufferValue||0}set bufferValue(e){this._bufferValue=At(e||0),this._changeDetectorRef.markForCheck()}_bufferValue=0;animationEnd=new ye;get mode(){return this._mode}set mode(e){this._mode=e,this._changeDetectorRef.markForCheck()}_mode=`determinate`;ngAfterViewInit(){this._ngZone.runOutsideAngular(()=>{this._cleanupTransitionEnd=this._renderer.listen(this._elementRef.nativeElement,`transitionend`,this._transitionendHandler)})}ngOnDestroy(){this._cleanupTransitionEnd?.()}_getPrimaryBarTransform(){return`scaleX(${this._isIndeterminate()?1:this.value/100})`}_getBufferBarFlexBasis(){return`${this.mode===`buffer`?this.bufferValue:100}%`}_isIndeterminate(){return this.mode===`indeterminate`||this.mode===`query`}_transitionendHandler=e=>{this.animationEnd.observers.length===0||!e.target||!e.target.classList.contains(`mdc-linear-progress__primary-bar`)||(this.mode===`determinate`||this.mode===`buffer`)&&this._ngZone.run(()=>this.animationEnd.next({value:this.value}))};static ɵfac=function(t){return new(t||a)};static ɵcmp=Jn({type:a,selectors:[[`mat-progress-bar`]],hostAttrs:[`role`,`progressbar`,`aria-valuemin`,`0`,`aria-valuemax`,`100`,`tabindex`,`-1`,1,`mat-mdc-progress-bar`,`mdc-linear-progress`],hostVars:10,hostBindings:function(t,i){t&2&&(ud(`aria-valuenow`,i._isIndeterminate()?null:i.value)(`mode`,i.mode),$C(`mat-`+i.color),ha(`_mat-animation-noopable`,i._isNoopAnimation)(`mdc-linear-progress--animation-ready`,!i._isNoopAnimation)(`mdc-linear-progress--indeterminate`,i._isIndeterminate()))},inputs:{color:`color`,value:[2,`value`,`value`,XT],bufferValue:[2,`bufferValue`,`bufferValue`,XT],mode:`mode`},outputs:{animationEnd:`animationEnd`},exportAs:[`matProgressBar`],decls:7,vars:5,consts:[[`aria-hidden`,`true`,1,`mdc-linear-progress__buffer`],[1,`mdc-linear-progress__buffer-bar`],[1,`mdc-linear-progress__buffer-dots`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__primary-bar`],[1,`mdc-linear-progress__bar-inner`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__secondary-bar`]],template:function(t,i){t&1&&(fd(0,`div`,0),qm(1,`div`,1),cC(2,$t,1,0,`div`,2),pd(),fd(3,`div`,3),qm(4,`span`,4),pd(),fd(5,`div`,5),qm(6,`span`,4),pd()),t&2&&(ub(),ay(`flex-basis`,i._getBufferBarFlexBasis()),ub(),uC(i.mode===`buffer`?2:-1),ub(),ay(`transform`,i._getPrimaryBarTransform()))},styles:[`.mat-mdc-progress-bar {
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
`],encapsulation:2})}return a})();function At(a,n=0,e=100){return Math.max(n,Math.min(e,a))}var Dt=(()=>{class a{static ɵfac=function(t){return new(t||a)};static ɵmod=Ve({type:a});static ɵinj=Ne({imports:[ID]})}return a})();var Jt=`# Thermal operating ranges for AO host-metrics charts (Celsius).
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
`;var Rt=`https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/assets/thermal-operating-ranges.csv`;function Yt(a){let n=[];for(let e of a.split(/\r?\n/)){let t=e.trim();if(!t||t.startsWith(`#`)||t.startsWith(`kind,`))continue;let i=t.split(`,`);if(i.length<6)continue;let l=i[0]?.trim().toLowerCase();if(l!==`cpu`&&l!==`gpu`)continue;let d=i[1]?.trim()??``,f=Number(i[2]),X=Number(i[3]);if(!Number.isFinite(f)||!Number.isFinite(X)||X<=f)continue;let Ot=i[4]?.trim()||d||l,Bt=i.slice(5).join(`,`).trim();n.push({kind:l,match:d,minC:f,maxC:X,label:Ot,source:Bt})}return n}var Zt=Yt(Jt);var ei={cpu:{kind:`cpu`,match:`*`,minC:0,maxC:100,label:`Generic CPU`,source:Rt},gpu:{kind:`gpu`,match:`*`,minC:0,maxC:95,label:`Generic GPU`,source:Rt}};function fe(a,n){let e=String(n||``).trim().toLowerCase(),i=[...Zt.filter(l=>l.kind===a)].sort((l,d)=>{let f=l.match===`*`?-1:l.match.length;return(d.match===`*`?-1:d.match.length)-f});for(let l of i)if(l.match!==`*`&&e&&e.includes(l.match.toLowerCase()))return l;return i.find(l=>l.match===`*`)||ei[a]}var ti=[`logViewport`];var Ft=()=>[];var ii=()=>[`#f59e0b`];var ni=()=>[`#60a5fa`];var ai=()=>[`#c084fc`];var oi=(a,n)=>n.message;var ri=(a,n)=>n.title;var ci=(a,n)=>n.id;function si(a,n){if(a&1&&Wm(0,`ao-error-state`,10),a&2)zm(`message`,wC().error())}function li(a,n){if(a&1&&(Xs(0,`a`,72),eT(1,` Open `),dd()),a&2){let e=wC().$implicit;zm(`routerLink`,e.href)}}function di(a,n){if(a&1&&(Xs(0,`div`,16),Wm(1,`mat-icon`,71),Xs(2,`div`,21)(3,`div`,5),eT(4),dd(),cC(5,li,2,1,`a`,72),dd()()),a&2){let e=n.$implicit;ub(),zm(`svgIcon`,e.severity===`warning`?`octagon-alert`:`circle-alert`),ub(3),py(e.message),ub(),uC(e.href?5:-1)}}function pi(a,n){a&1&&(Xs(0,`div`,16),Wm(1,`mat-icon`,73),Xs(2,`div`,5),eT(3,`Nothing flagged`),dd()())}function mi(a,n){if(a&1&&(Xs(0,`mat-card`,18)(1,`mat-card-header`)(2,`div`,12),Wm(3,`mat-icon`,74),Xs(4,`div`,41),eT(5),dd()()(),Xs(6,`mat-card-content`)(7,`div`,75),eT(8),hT(9,`number`),dd(),Xs(10,`div`,76),Wm(11,`mat-icon`,74),Xs(12,`div`,27),eT(13),dd()()()()),a&2){let e=n.$implicit;ub(3),zm(`svgIcon`,e.icon),ub(2),py(e.title),ub(3),yd(` `,mT(9,7,e.value),` `),ub(3),$C(e.toneClass),zm(`svgIcon`,e.toneIcon),ub(2),yd(` `,e.caption,` `)}}function hi(a,n){a&1&&(Xs(0,`span`,31),eT(1,`%`),dd())}function ui(a,n){a&1&&(Xs(0,`span`,31),eT(1,`%`),dd())}function gi(a,n){a&1&&(Xs(0,`span`,31),eT(1,`°C`),dd())}function vi(a,n){if(a&1&&eT(0),a&2)yd(` · `,wC().live.metrics()?.gpu?.vramSource,` `)}function fi(a,n){a&1&&(Xs(0,`span`,31),eT(1,`%`),dd())}function _i(a,n){a&1&&(Xs(0,`span`,31),eT(1,`%`),dd())}function yi(a,n){a&1&&(Xs(0,`span`,31),eT(1,`°C`),dd())}function bi(a,n){a&1&&(Xs(0,`mat-card`,11)(1,`div`,12),Wm(2,`mat-icon`,13),Xs(3,`div`,14),eT(4,` Reach port guard `),dd()(),Xs(5,`div`,77),Wm(6,`mat-icon`,78),Xs(7,`div`,5),eT(8),dd()()()),a&2&&(ub(8),py(n.message))}function xi(a,n){if(a&1&&(Xs(0,`mat-card`,11)(1,`div`,12),Wm(2,`mat-icon`,79),Xs(3,`div`,14),eT(4,` Sparkline snapshots `),dd()(),Xs(5,`div`,80)(6,`div`)(7,`div`,81),eT(8,`CPU`),dd(),Wm(9,`apx-chart`,82),dd(),Xs(10,`div`)(11,`div`,81),eT(12,`Memory`),dd(),Wm(13,`apx-chart`,82),dd(),Xs(14,`div`)(15,`div`,81),eT(16,`GPU`),dd(),Wm(17,`apx-chart`,82),dd()()()),a&2){let e=wC();ub(9),zm(`chart`,e.sparkChart.chart)(`colors`,uT(18,ii))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`cpu`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip),ub(4),zm(`chart`,e.sparkChart.chart)(`colors`,uT(19,ni))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`mem`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip),ub(4),zm(`chart`,e.sparkChart.chart)(`colors`,uT(20,ai))(`fill`,e.sparkChart.fill)(`series`,e.sparkSeries(`gpu`))(`stroke`,e.sparkChart.stroke)(`tooltip`,e.sparkChart.tooltip)}}function Si(a,n){a&1&&(Xs(0,`span`,5),eT(1),dd()),a&2&&(ub(),yd(`Snapshot `,n))}function Ci(a,n){if(a&1&&eT(0),a&2)yd(` · filter `,wC().runIdFilter(),` `)}function wi(a,n){if(a&1&&(Xs(0,`mat-chip-option`,68),eT(1),dd()),a&2){let e=n.$implicit;zm(`value`,e),ub(),py(e)}}function Ni(a,n){if(a&1&&(Xs(0,`div`,70)(1,`span`,83),eT(2),dd(),Xs(3,`span`,84),eT(4),dd(),Xs(5,`span`,85),eT(6),dd()()),a&2){let e=n.$implicit,t=wC();ub(2),py(t.formatLogTime(e.ts)),ub(),zm(`ngClass`,t.sourceClass(e.source)),ub(),py(e.source),ub(),zm(`ngClass`,t.levelClass(e.level)),ub(),py(e.line)}}function ki(a,n){a&1&&(Xs(0,`div`,5),eT(1,`Waiting for log lines…`),dd())}var Pt=[`web`,`engine`,`execution`,`ollama`,`mcp`,`speech`,`openclaw`,`reach`];var Lt=class a{api=h(d);theming=h(Lt$2);route=h(G);live=h(B$1);logViewport=E2(`logViewport`);topologyTimer=null;topology=Lt$1(null);ping=Lt$1(null);session=Lt$1(null);error=Lt$1(null);selectedSources=Lt$1([]);followLogs=Lt$1(!0);runIdFilter=Lt$1(``);logsExpanded=Lt$1(!1);components=IT(()=>this.topology()?.components||[]);orderedComponents=IT(()=>{let n=e=>{let t=Pt.indexOf(e);return t===-1?Pt.length:t};return[...this.components()].sort((e,t)=>n(e.id)-n(t.id))});topologyUnhealthyCount=IT(()=>this.components().filter(n=>[`failed`,`degraded`,`blocking`,`warning`].includes(String(n.status||``).toLowerCase())).length);filteredLogs=IT(()=>{let n=new Set(this.selectedSources()),e=this.runIdFilter().trim().toLowerCase(),t=this.live.logs();return n.size&&(t=t.filter(i=>n.has(i.source))),e&&(t=t.filter(i=>String(i.line||``).toLowerCase().includes(e))),t});cpuMemSeries=IT(()=>{let n=this.live.history();return[{name:`CPU`,data:n.map(e=>({x:e.t,y:e.cpu==null?null:Number(e.cpu.toFixed(1))}))},{name:`Memory`,data:n.map(e=>({x:e.t,y:e.mem==null?null:Number(e.mem.toFixed(1))}))},{name:`Temp`,data:n.map(e=>({x:e.t,y:e.cpuTemp==null?null:Number(e.cpuTemp.toFixed(1))}))}]});gpuVramSeries=IT(()=>{let n=this.live.history();return[{name:`GPU`,data:n.map(e=>({x:e.t,y:e.gpu==null?null:Number(e.gpu.toFixed(1))}))},{name:`VRAM`,data:n.map(e=>({x:e.t,y:e.vram==null?null:Number(e.vram.toFixed(1))}))},{name:`Temp`,data:n.map(e=>({x:e.t,y:e.gpuTemp==null?null:Number(e.gpuTemp.toFixed(1))}))}]});cpuMemChartColors=[`#f59e0b`,`#60a5fa`,`#f87171`];gpuVramChartColors=[`#c084fc`,`#34d399`,`#f87171`];cpuThermalRange=IT(()=>{let n=String(this.live.metrics()?.scope||``),e=this.live.cpuModel(),t=this.live.gpuName();return fe(`cpu`,n===`jetson`||/jetson|tegra|orin/i.test(String(t||``))?t||e:e||t)});gpuThermalRange=IT(()=>fe(`gpu`,this.live.gpuName()));cpuMemTooltip=IT(()=>({theme:this.theming.isDark()?`dark`:`light`,x:{format:`HH:mm:ss`},y:{formatter:(n,e)=>n==null||Number.isNaN(Number(n))?`—`:(e?.seriesIndex??0)===2?`${Number(n).toFixed(1)}\xB0C`:`${Number(n).toFixed(1)}%`}}));gpuVramTooltip=IT(()=>({theme:this.theming.isDark()?`dark`:`light`,x:{format:`HH:mm:ss`},y:{formatter:(n,e)=>n==null||Number.isNaN(Number(n))?`—`:(e?.seriesIndex??0)===2?`${Number(n).toFixed(1)}\xB0C`:`${Number(n).toFixed(1)}%`}}));cpuMemYaxis=IT(()=>{let n=this.cpuThermalRange();return[{seriesName:`CPU`,min:0,max:100,tickAmount:4,forceNiceScale:!1,labels:{formatter:e=>`${Math.round(e)}%`,style:{colors:`var(--mat-sys-on-surface)`}}},{seriesName:`Memory`,show:!1,min:0,max:100,tickAmount:4,forceNiceScale:!1,labels:{formatter:e=>`${Math.round(e)}%`}},{seriesName:`Temp`,opposite:!0,min:n.minC,max:n.maxC,tickAmount:4,forceNiceScale:!1,title:{text:`${n.minC}\u2013${n.maxC}\xB0C`,style:{color:`var(--mat-sys-on-surface)`,fontSize:`11px`}},labels:{formatter:e=>`${Math.round(e)}\xB0C`,style:{colors:`var(--mat-sys-on-surface)`}}}]});gpuVramYaxis=IT(()=>{let n=this.gpuThermalRange();return[{seriesName:`GPU`,min:0,max:100,tickAmount:4,forceNiceScale:!1,labels:{formatter:e=>`${Math.round(e)}%`,style:{colors:`var(--mat-sys-on-surface)`}}},{seriesName:`VRAM`,show:!1,min:0,max:100,tickAmount:4,forceNiceScale:!1,labels:{formatter:e=>`${Math.round(e)}%`}},{seriesName:`Temp`,opposite:!0,min:n.minC,max:n.maxC,tickAmount:4,forceNiceScale:!1,title:{text:`${n.minC}\u2013${n.maxC}\xB0C`,style:{color:`var(--mat-sys-on-surface)`,fontSize:`11px`}},labels:{formatter:e=>`${Math.round(e)}\xB0C`,style:{colors:`var(--mat-sys-on-surface)`}}}]});summary=IT(()=>{let n=this.components(),e=n.filter(f=>[`healthy`,`available`,`succeeded`].includes(String(f.status||``).toLowerCase())).length,t=n.filter(f=>[`degraded`,`warning`,`running`,`reconciling`].includes(String(f.status||``).toLowerCase())).length,i=n.filter(f=>[`failed`,`blocking`].includes(String(f.status||``).toLowerCase())).length,l=this.topology()?.attention?.length??0;return[{title:`Healthy`,icon:`circle-check`,value:e,caption:n.filter(f=>[`healthy`,`available`,`succeeded`].includes(String(f.status||``).toLowerCase())).map(f=>f.id).join(`, `)||`components up`,toneIcon:`arrow-up`,toneClass:`text-green-600`},{title:`Degraded`,icon:`octagon-alert`,value:t,caption:`need watch`,toneIcon:t?`arrow-up`:`arrow-down`,toneClass:t?`text-amber-600`:`text-green-600`},{title:`Failed`,icon:`circle-x`,value:i,caption:`blocking`,toneIcon:i?`arrow-up`:`arrow-down`,toneClass:i?`text-red-600`:`text-green-600`},{title:`Attention`,icon:`bell`,value:l,caption:`open items`,toneIcon:l?`arrow-up`:`arrow-down`,toneClass:l?`text-amber-600`:`text-green-600`}]});utilChart={chart:{animations:{enabled:!1,dynamicAnimation:{enabled:!1}},fontFamily:`inherit`,foreColor:`inherit`,height:`100%`,type:`area`,toolbar:{show:!1},zoom:{enabled:!1}},colors:[`#f59e0b`,`#60a5fa`],dataLabels:{enabled:!1},fill:{type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.45,opacityTo:.05,stops:[0,90,100]}},grid:{borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:8,right:8}},legend:{show:!0,position:`top`,horizontalAlign:`right`},stroke:{curve:`smooth`,width:2,connectNulls:!0},xaxis:{type:`datetime`,labels:{datetimeUTC:!1,style:{colors:`var(--mat-sys-on-surface)`}},axisBorder:{show:!1},tooltip:{enabled:!1}}};sparkChart={chart:{animations:{enabled:!1,dynamicAnimation:{enabled:!1}},fontFamily:`inherit`,foreColor:`inherit`,height:`101%`,width:`101%`,type:`area`,sparkline:{enabled:!0}},fill:{type:`gradient`,gradient:{shadeIntensity:.5,opacityFrom:.4,opacityTo:.05}},stroke:{curve:`smooth`,width:2},tooltip:{enabled:!1}};constructor(){Ts(()=>{this.filteredLogs(),this.followLogs()&&queueMicrotask(()=>{let n=this.logViewport()?.nativeElement;n&&(n.scrollTop=n.scrollHeight)})})}ngOnInit(){this.selectedSources.set([...this.live.logSourceOptions()]),this.live.acquire({metrics:!0,logs:!0}),this.reload(),this.topologyTimer=setInterval(()=>this.reload(),3e4);let n=String(this.route.snapshot.queryParamMap.get(`runId`)||``).trim()||String(this.route.snapshot.queryParamMap.get(`q`)||``).trim();n&&this.applyRunIdFilter(n)}onRunIdFilterChange(n){this.applyRunIdFilter(String(n||``))}applyRunIdFilter(n){let e=n.trim();this.runIdFilter.set(e),e&&(this.logsExpanded.set(!0),this.live.followRunLogs(e))}ngOnDestroy(){this.topologyTimer&&(clearInterval(this.topologyTimer),this.topologyTimer=null),this.live.release()}sparkSeries(n){let e=this.live.history().map(t=>t[n]).filter(t=>t!=null);return[{name:n,data:e.length?e:[0]}]}onSourcesChange(n){let e=n.value,t=Array.isArray(e)?e:e?[e]:[];this.selectedSources.set(t),this.live.setLogSources(t.length?t:null)}exportBundle(){this.api.supportBundle().subscribe(n=>{if(!n.ok){this.error.set(n.message);return}let e=new Blob([JSON.stringify(n.data,null,2)],{type:`application/json`}),t=URL.createObjectURL(e),i=document.createElement(`a`);i.href=t,i.download=`ao-support-bundle-${Date.now()}.json`,i.click(),URL.revokeObjectURL(t)})}reload(){this.error.set(null),this.api.topology().subscribe(n=>{n.ok?this.topology.set(n.data):this.error.set(n.message)}),this.api.ping().subscribe(n=>n.ok&&this.ping.set(n.data)),this.api.session().subscribe(n=>n.ok&&this.session.set(n.data))}componentHref(n){let e=n.url||n.urlHint;if(!e)return null;let t=location.hostname||`127.0.0.1`,i=String(e).replace(/__HOST__/g,t).replace(/<host>/gi,t).split(/\s+/)[0];return!i||i.includes(`<`)?null:i.startsWith(`/`)?`${location.protocol}//${location.host}${i}`:i}resourceBarColor(n){return n==null?`primary`:n>=90?`error`:n>=75?`warn`:`primary`}statusLabel(n){let e=String(n||`unknown`).replace(/-/g,` `);return e.charAt(0).toUpperCase()+e.slice(1)}statusTextClass(n){let e=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`text-green-600`:[`failed`,`blocking`].includes(e)?`text-red-600`:[`degraded`,`warning`,`running`,`reconciling`].includes(e)?`text-amber-600`:`text-neutral-500`}statusDotClass(n){let e=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(e)?`bg-green-500`:[`failed`,`blocking`].includes(e)?`bg-red-500`:[`degraded`,`warning`,`running`,`reconciling`].includes(e)?`bg-amber-500`:`bg-neutral-400`}formatUptime(n){if(n==null||!Number.isFinite(n))return`—`;let e=Math.floor(n),t=Math.floor(e/86400),i=Math.floor(e%86400/3600),l=Math.floor(e%3600/60);return t>0?`${t}d ${i}h`:i>0?`${i}h ${l}m`:`${l}m`}formatLogTime(n){let e=new Date(n);return Number.isFinite(e.getTime())?e.toLocaleTimeString([],{hour12:!1,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}):`--:--:--`}sourceClass(n){switch(n){case`engine`:return`text-violet-400`;case`coordinator`:return`text-sky-400`;case`warm-pool`:return`text-amber-400`;case`broker`:return`text-rose-400`;default:return`text-emerald-400`}}levelClass(n){return n===`error`?`text-red-300`:n===`warn`?`text-amber-200`:`text-neutral-200`}static ɵfac=function(e){return new(e||a)};static ɵcmp=Jn({type:a,selectors:[[`ao-overview-page`]],viewQuery:function(e,t){e&1&&oy(t.logViewport,ti,5),e&2&&xC()},decls:203,vars:82,consts:[[`logViewport`,``],[1,`@container`,`mx-auto`,`flex`,`w-full`,`max-w-7xl`,`flex-auto`,`flex-col`,`gap-4`,`p-6`,`sm:gap-6`,`lg:px-8`,`lg:pt-8`,`lg:pb-10`],[1,`flex`,`items-center`,`justify-between`,`gap-x-3`],[1,`flex`,`flex-col`,`gap-y-0.5`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex-auto`],[`matButton`,`outlined`,`type`,`button`,1,`mr-2`,3,`click`],[1,`flex`,`items-center`,`gap-x-1.5`,`text-sm`,3,`ngClass`],[1,`inline-block`,`size-2`,`rounded-full`,3,`ngClass`],[3,`message`],[`appearance`,`outlined`,1,`p-6`],[1,`flex`,`items-center`,`gap-x-2`],[`svgIcon`,`sparkles`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`truncate`,`text-lg`,`font-medium`,`tracking-tight`],[1,`mt-6`,`flex`,`flex-col`,`gap-y-4`],[1,`flex`,`items-start`,`gap-x-3`],[1,`grid`,`gap-4`,`sm:gap-6`,`@max-md:grid-cols-1`,`@md:grid-cols-2`,`@4xl:grid-cols-4`],[`appearance`,`filled`],[`appearance`,`outlined`,1,`overflow-hidden`],[1,`flex`,`flex-col`,`gap-y-1`,`px-5`,`pt-5`,`sm:flex-row`,`sm:items-start`],[1,`min-w-0`,`flex-auto`],[1,`text-lg`,`font-medium`,`tracking-tight`],[1,`font-medium`,`text-neutral-500`],[1,`mt-2`,`grid`,`grid-cols-1`,`gap-2`,`px-2`,`pb-2`,`xl:grid-cols-2`],[1,`flex`,`min-w-0`,`flex-col`],[1,`flex`,`flex-wrap`,`items-end`,`gap-x-6`,`gap-y-2`,`px-3`,`pt-2`],[1,`text-sm`,`font-medium`,`text-neutral-500`],[1,`truncate`,`text-sm`,`font-medium`],[1,`text-xs`,`text-neutral-500`],[1,`text-3xl`,`font-semibold`,`tabular-nums`,`tracking-tighter`],[1,`text-lg`,`text-neutral-500`],[1,`h-64`,`w-full`,3,`chart`,`colors`,`dataLabels`,`fill`,`grid`,`legend`,`series`,`stroke`,`tooltip`,`xaxis`,`yaxis`],[1,`flex`,`flex-wrap`,`gap-x-8`,`gap-y-3`,`px-5`,`py-4`,`text-sm`],[1,`font-mono`,`tabular-nums`],[1,`min-w-40`,`flex-auto`],[`mode`,`determinate`,1,`mt-1`,`rounded-full`,3,`color`,`value`],[1,`grid`,`w-full`,`grid-cols-1`,`gap-6`,`xl:grid-cols-2`],[`appearance`,`filled`,1,`flex`,`flex-col`],[1,`flex`,`flex-auto`,`items-center`,`gap-x-2`],[`svgIcon`,`server`,1,`size-4`],[1,`font-medium`,`tracking-tight`],[1,`ml-auto`],[`matButton`,``,`href`,`/`],[1,`flex`,`flex-auto`,`flex-col`],[1,`text-3xl`,`font-semibold`],[1,`mt-0.5`,`text-sm`,`text-neutral-500`],[1,`mt-4`,`flex`,`flex-col`,`gap-y-3`],[1,`flex`,`items-center`,`gap-x-1`],[1,`font-medium`,`tabular-nums`],[1,`max-w-[60%]`,`truncate`,`font-mono`,`text-sm`,`font-medium`],[1,`font-medium`],[1,`flex`,`w-full`,`items-start`,`justify-between`,`gap-3`],[1,`text-sm`,`text-neutral-500`],[`matButton`,`filled`,`routerLink`,`/topology`],[`svgIcon`,`share-2`],[1,`pt-2`],[1,`flex`,`flex-wrap`,`items-center`,`gap-x-4`,`gap-y-1`,`text-sm`],[1,`font-medium`,3,`ngClass`],[1,`!rounded-xl`,`!border`,`!shadow-none`,3,`opened`,`closed`,`expanded`],[1,`flex`,`flex-col`,`gap-3`,`pb-2`,`sm:flex-row`,`sm:items-center`],[1,`min-w-0`,`flex-auto`,`text-sm`,`text-neutral-500`],[`appearance`,`outline`,`subscriptSizing`,`dynamic`,1,`w-full`,`sm:w-72`],[`matInput`,``,`placeholder`,`paste run_id`,3,`ngModelChange`,`ngModel`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[3,`svgIcon`],[1,`pb-3`],[`aria-label`,`Log sources`,3,`change`,`multiple`,`value`],[3,`value`],[1,`max-h-96`,`overflow-y-auto`,`bg-neutral-950`,`px-4`,`py-3`,`font-mono`,`text-xs`,`leading-relaxed`,`text-neutral-200`],[1,`flex`,`gap-x-2`,`whitespace-pre-wrap`,`break-all`],[1,`size-5`,`shrink-0`,`text-neutral-500`,3,`svgIcon`],[`matButton`,``,1,`mt-1`,3,`routerLink`],[`svgIcon`,`circle-check`,1,`size-5`,`shrink-0`,`text-green-600`],[1,`size-4`,3,`svgIcon`],[1,`text-5xl`,`font-semibold`,`tabular-nums`],[1,`mt-2`,`flex`,`items-center`,`gap-x-1`],[1,`mt-4`,`flex`,`items-start`,`gap-x-3`],[`svgIcon`,`octagon-alert`,1,`size-5`,`shrink-0`,`text-neutral-500`],[`svgIcon`,`activity`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`mt-4`,`grid`,`grid-cols-3`,`gap-3`],[1,`text-xs`,`font-medium`,`text-neutral-500`],[1,`h-16`,3,`chart`,`colors`,`fill`,`series`,`stroke`,`tooltip`],[1,`shrink-0`,`text-neutral-500`],[1,`w-24`,`shrink-0`,`truncate`,`font-semibold`,3,`ngClass`],[3,`ngClass`]],template:function(e,t){if(e&1&&(Xs(0,`div`,1)(1,`div`,2)(2,`div`,3)(3,`div`,4),eT(4,` Overview `),dd(),Xs(5,`div`,5),eT(6,` Live host utilization, topology, and streaming logs `),dd()(),Wm(7,`div`,6),Xs(8,`button`,7),Xm(`click`,function(){return t.exportBundle()}),eT(9,` Export support bundle `),dd(),Xs(10,`div`,8),Wm(11,`span`,9),eT(12),dd()(),cC(13,si,1,1,`ao-error-state`,10),Xs(14,`mat-card`,11)(15,`div`,12),Wm(16,`mat-icon`,13),Xs(17,`div`,14),eT(18,` Needs attention `),dd()(),Xs(19,`div`,15),fC(20,di,6,3,`div`,16,oi,!1,pi,4,0,`div`,16),dd()(),Xs(23,`div`,17),fC(24,mi,14,9,`mat-card`,18,ri),dd(),Xs(26,`mat-card`,19)(27,`div`,20)(28,`div`,21)(29,`div`,22),eT(30,` Host utilization `),dd(),Xs(31,`div`,23),eT(32),dd()()(),Xs(33,`div`,24)(34,`div`,25)(35,`div`,26)(36,`div`,21)(37,`div`,27),eT(38,`CPU`),dd(),Xs(39,`div`,28),eT(40),dd(),Xs(41,`div`,29),eT(42),dd()(),Xs(43,`div`)(44,`div`,27),eT(45,`CPU`),dd(),Xs(46,`div`,30),eT(47),cC(48,hi,2,0,`span`,31),dd()(),Xs(49,`div`)(50,`div`,27),eT(51,`Memory`),dd(),Xs(52,`div`,30),eT(53),cC(54,ui,2,0,`span`,31),dd()(),Xs(55,`div`)(56,`div`,27),eT(57,`Temp`),dd(),Xs(58,`div`,30),eT(59),hT(60,`number`),cC(61,gi,2,0,`span`,31),dd()()(),Wm(62,`apx-chart`,32),dd(),Xs(63,`div`,25)(64,`div`,26)(65,`div`,21)(66,`div`,27),eT(67,`GPU`),dd(),Xs(68,`div`,28),eT(69),dd(),Xs(70,`div`,29),eT(71),cC(72,vi,1,1),dd()(),Xs(73,`div`)(74,`div`,27),eT(75,`GPU`),dd(),Xs(76,`div`,30),eT(77),cC(78,fi,2,0,`span`,31),dd()(),Xs(79,`div`)(80,`div`,27),eT(81,`VRAM`),dd(),Xs(82,`div`,30),eT(83),cC(84,_i,2,0,`span`,31),dd()(),Xs(85,`div`)(86,`div`,27),eT(87,`Temp`),dd(),Xs(88,`div`,30),eT(89),hT(90,`number`),cC(91,yi,2,0,`span`,31),dd()()(),Wm(92,`apx-chart`,32),dd()(),Wm(93,`mat-divider`),Xs(94,`div`,33)(95,`div`)(96,`div`,23),eT(97,`Load`),dd(),Xs(98,`div`,34),eT(99),dd()(),Xs(100,`div`)(101,`div`,23),eT(102,`Uptime`),dd(),Xs(103,`div`,34),eT(104),dd()(),Xs(105,`div`,35)(106,`div`,23),eT(107,`CPU`),dd(),Wm(108,`mat-progress-bar`,36),dd(),Xs(109,`div`,35)(110,`div`,23),eT(111,`Memory`),dd(),Wm(112,`mat-progress-bar`,36),dd(),Xs(113,`div`,35)(114,`div`,23),eT(115,`GPU`),dd(),Wm(116,`mat-progress-bar`,36),dd(),Xs(117,`div`,35)(118,`div`,23),eT(119,`VRAM`),dd(),Wm(120,`mat-progress-bar`,36),dd()()(),Xs(121,`div`,37)(122,`mat-card`,38)(123,`mat-card-header`)(124,`div`,39),Wm(125,`mat-icon`,40),Xs(126,`div`,41),eT(127,`Web process`),dd(),Xs(128,`div`,42)(129,`a`,43),eT(130,` Open chat `),dd()()()(),Xs(131,`mat-card-content`,44)(132,`div`,45),eT(133),dd(),Xs(134,`div`,46),eT(135,` Coordinator web UI and Admin API process `),dd(),Xs(136,`div`,47)(137,`div`,48)(138,`div`,5),eT(139,`pid`),dd(),Wm(140,`div`,6),Xs(141,`div`,49),eT(142),dd()(),Xs(143,`div`,48)(144,`div`,5),eT(145,`instance`),dd(),Wm(146,`div`,6),Xs(147,`div`,50),eT(148),dd()(),Xs(149,`div`,48)(150,`div`,5),eT(151,`user`),dd(),Wm(152,`div`,6),Xs(153,`div`,51),eT(154),dd()()()()(),cC(155,bi,9,1,`mat-card`,11)(156,xi,18,21,`mat-card`,11),dd(),Xs(157,`mat-card`,19)(158,`mat-card-header`)(159,`div`,52)(160,`div`)(161,`div`,22),eT(162,` Deployment topology `),dd(),Xs(163,`div`,53),eT(164,` Live three-band graph of what is deployed and healthy `),dd()(),Xs(165,`a`,54),Wm(166,`mat-icon`,55),eT(167,` Open Topology `),dd()()(),Xs(168,`mat-card-content`,56)(169,`div`,57)(170,`span`),eT(171),dd(),Xs(172,`span`,58),eT(173),dd(),cC(174,Si,2,1,`span`,5),dd()()(),Xs(175,`mat-expansion-panel`,59),Xm(`opened`,function(){return t.logsExpanded.set(!0)})(`closed`,function(){return t.logsExpanded.set(!1)}),Xs(176,`mat-expansion-panel-header`)(177,`mat-panel-title`),eT(178,`Live logs`),dd(),Xs(179,`mat-panel-description`),eT(180,` Streaming from web + cluster tails `),cC(181,Ci,1,1),dd()(),Xs(182,`div`,60)(183,`div`,61),eT(184,` Filter sources · errors red, warnings amber `),dd(),Xs(185,`mat-form-field`,62)(186,`mat-label`),eT(187,`run_id filter`),dd(),Xs(188,`input`,63),Xm(`ngModelChange`,function(l){return t.onRunIdFilterChange(l)}),dd(),Qb(),dd(),Xs(189,`button`,64),Xm(`click`,function(){return t.followLogs.set(!t.followLogs())}),Wm(190,`mat-icon`,65),eT(191),dd(),Xs(192,`button`,64),Xm(`click`,function(){return t.live.clearLogs()}),eT(193,` Clear `),dd()(),Xs(194,`div`,66)(195,`mat-chip-listbox`,67),Xm(`change`,function(l){return t.onSourcesChange(l)}),fC(196,wi,2,2,`mat-chip-option`,68,dC),dd()(),Xs(198,`div`,69,0),fC(200,Ni,7,5,`div`,70,ci,!1,ki,2,0,`div`,5),dd()()()),e&2){let i,l;ub(10),zm(`ngClass`,t.live.connected()?`text-green-600`:`text-neutral-500`),ub(),zm(`ngClass`,t.live.connected()?`bg-green-500 animate-pulse`:`bg-neutral-400`),ub(),yd(` `,t.live.connected()?`Live`:`Reconnecting…`,` `),ub(),uC(t.error()?13:-1),ub(7),pC(t.topology()?.attention||uT(80,Ft)),ub(4),pC(t.summary()),ub(8),hy(` `,t.live.metrics()?.hostname||`Coordinator host`,` · scope `,t.live.metrics()?.scope||`—`,` · WebSocket push ~2s `),ub(8),yd(` `,t.live.cpuModel()||`—`,` `),ub(2),hy(` `,t.live.metrics()?.cpu?.cores??`—`,` cores · memory `,t.live.memoryLabel()||`—`,` `),ub(5),yd(` `,t.live.latestCpu()??`—`),ub(),uC(t.live.latestCpu()!=null?48:-1),ub(5),yd(` `,t.live.latestMem()??`—`),ub(),uC(t.live.latestMem()!=null?54:-1),ub(5),yd(` `,t.live.latestCpuTemp()!=null?yT(60,74,t.live.latestCpuTemp(),`1.0-1`):`—`),ub(2),uC(t.live.latestCpuTemp()!=null?61:-1),ub(),zm(`chart`,t.utilChart.chart)(`colors`,t.cpuMemChartColors)(`dataLabels`,t.utilChart.dataLabels)(`fill`,t.utilChart.fill)(`grid`,t.utilChart.grid)(`legend`,t.utilChart.legend)(`series`,t.cpuMemSeries())(`stroke`,t.utilChart.stroke)(`tooltip`,t.cpuMemTooltip())(`xaxis`,t.utilChart.xaxis)(`yaxis`,t.cpuMemYaxis()),ub(7),yd(` `,t.live.gpuName()||`No GPU metrics`,` `),ub(2),yd(` VRAM `,t.live.vramLabel()||`—`,` `),ub(),uC(t.live.metrics()?.gpu?.vramSource?72:-1),ub(5),yd(` `,t.live.latestGpu()??`—`),ub(),uC(t.live.latestGpu()!=null?78:-1),ub(5),yd(` `,t.live.latestVram()??`—`),ub(),uC(t.live.latestVram()!=null?84:-1),ub(5),yd(` `,t.live.latestGpuTemp()!=null?yT(90,77,t.live.latestGpuTemp(),`1.0-1`):`—`),ub(2),uC(t.live.latestGpuTemp()!=null?91:-1),ub(),zm(`chart`,t.utilChart.chart)(`colors`,t.gpuVramChartColors)(`dataLabels`,t.utilChart.dataLabels)(`fill`,t.utilChart.fill)(`grid`,t.utilChart.grid)(`legend`,t.utilChart.legend)(`series`,t.gpuVramSeries())(`stroke`,t.utilChart.stroke)(`tooltip`,t.gpuVramTooltip())(`xaxis`,t.utilChart.xaxis)(`yaxis`,t.gpuVramYaxis()),ub(7),yd(` `,(t.live.metrics()?.loadAvg||uT(81,Ft)).join(` · `)||`—`,` `),ub(5),yd(` `,t.formatUptime(t.live.metrics()?.uptimeSec),` `),ub(4),zm(`color`,t.resourceBarColor(t.live.latestCpu()))(`value`,t.live.latestCpu()??0),ub(4),zm(`color`,t.resourceBarColor(t.live.latestMem()))(`value`,t.live.latestMem()??0),ub(4),zm(`color`,t.resourceBarColor(t.live.latestGpu()))(`value`,t.live.latestGpu()??0),ub(4),zm(`color`,t.resourceBarColor(t.live.latestVram()))(`value`,t.live.latestVram()??0),ub(13),yd(` `,t.ping()?.service||`—`,` `),ub(9),yd(` `,t.ping()?.pid??`—`,` `),ub(6),yd(` `,t.ping()?.instance||`—`,` `),ub(6),yd(` `,t.session()?.userName||`—`,` `),ub(),uC((i=t.topology()?.reachGuard)?155:156,i),ub(16),yd(` `,t.orderedComponents().length,` components reported `),ub(),zm(`ngClass`,t.topologyUnhealthyCount()>0?`text-red-600 dark:text-red-400`:`text-neutral-500`),ub(),yd(` `,t.topologyUnhealthyCount(),` unhealthy `),ub(),uC((l=t.topology()?.generatedAt)?174:-1,l),ub(),zm(`expanded`,t.logsExpanded()),ub(6),uC(t.runIdFilter()?181:-1),ub(7),zm(`ngModel`,t.runIdFilter()),Jb(),ub(2),zm(`svgIcon`,t.followLogs()?`circle-check`:`circle`),ub(),yd(` `,t.followLogs()?`Following`:`Follow`,` `),ub(4),zm(`multiple`,!0)(`value`,t.selectedSources()),ub(),pC(t.live.logSourceOptions()),ub(4),pC(t.filteredLogs())}},dependencies:[Dt$1,_n,Pe,mn,Ht$1,Vt$1,Ie,B,pt,ht,I$1,lt,dt,yt$1,wt$1,w,I,A,m,Dt,Tt,ve,ge,Te,Ie$1,hn,mn$1,MS,ge$1,kS],encapsulation:2})};export{Lt as OverviewPage};