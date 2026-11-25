import{n as Y}from"./chunk-DECieRzM.js";import"./chunk-B9ZROE1j.js";import"./chunk-B7GFS1kR.js";import{a as pn,i as ln,r as ke,t as Ne}from"./chunk-BI0wBOy-.js";import{$ as $T,Br as mn,Ci as xC,Cr as j,Ct as Hv,Di as yN,Dr as js,En as Xa,Et as If,F as Z,Fn as _b,Ft as LC,Gt as NC,Hn as b,Ir as m,Jn as ce,Jt as Nf,Kr as pI,Lt as LT,M as Ue,Mi as zG,Mn as Zi,Mt as Jn,N as Vt$1,Ni as zt$1,Nn as Zr,Nr as li,Oi as yb,On as Ya,Qn as dI,Qt as P,Rr as mb,S as Yt$1,Sn as Vb,Ti as xd,Tt as Ib,Un as bb,Ut as Me,Vn as ay,Vr as mo,Vt as MC,Wn as be,Yn as ci$1,Yr as pn$1,Zt as Ob,_i as vt$1,_n as Ud,a as I$1,an as Sh,at as CD,b as Vn,bi as wf,bn as VC,bt as HC,ci as ua,dt as Eb,ei as ro,et as AS,fi as vS,g as An,i as wt$1,in as SS,ir as ei,it as Bt$1,jn as Yt,k as z,ki as yc,kr as k,l as Pt$1,lr as fm,mr as gs,mt as FH,nn as Rd,o as N,oi as tt,pn as UC,pr as gn,qr as pb,r as Mt$1,ri as si,rt as BH,s as _,si as uS,t as I,tt as Ad,u as W$1,vn as Uv,vt as GG,w as je,wn as W,wt as IS,zn as ai$1}from"./main-7OCNARMU.js";import{n as z$1}from"./chunk-Dg5M7jJy.js";import{n as Ze,t as Ue$1}from"./chunk-DBpgYiXN.js";import"./chunk-BIuCHytS.js";import{t as d}from"./chunk-D5S5oZzw.js";import"./chunk-B3Kc9KxL.js";import{t as C}from"./chunk-C5GsZL8F.js";var vt=new b(`mat-chips-default-options`,{providedIn:`root`,factory:()=>({separatorKeyCodes:[13]})});var pt=new b(`MatChipAvatar`);var st=new b(`MatChipLeadingIcon`);var ht=new b(`MatChipTrailingIcon`);var mt=new b(`MatChipEdit`);var ut=new b(`MatChipRemove`);var oi=new b(`MatChip`);var gt=(()=>{class e{_elementRef=m(ce);_parentChip=m(oi);_isPrimary=!0;_isLeading=!1;get disabled(){return this._disabled||this._parentChip?.disabled||!1}set disabled(i){this._disabled=i}_disabled=!1;tabIndex=-1;_allowFocusWhenDisabled=!1;_getDisabledAttribute(){return this.disabled&&!this._allowFocusWhenDisabled?``:null}constructor(){m(Yt).load(Uv),this._elementRef.nativeElement.nodeName===`BUTTON`&&this._elementRef.nativeElement.setAttribute(`type`,`button`)}focus(){this._elementRef.nativeElement.focus()}static ɵfac=function(t){return new(t||e)};static ɵdir=Me({type:e,selectors:[[``,`matChipContent`,``]],hostAttrs:[1,`mat-mdc-chip-action`,`mdc-evolution-chip__action`,`mdc-evolution-chip__action--presentational`],hostVars:8,hostBindings:function(t,a){t&2&&(si(`disabled`,a._getDisabledAttribute())(`aria-disabled`,a.disabled),gn(`mdc-evolution-chip__action--primary`,a._isPrimary)(`mdc-evolution-chip__action--secondary`,!a._isPrimary)(`mdc-evolution-chip__action--trailing`,!a._isPrimary&&!a._isLeading))},inputs:{disabled:[2,`disabled`,`disabled`,vt$1],tabIndex:[2,`tabIndex`,`tabIndex`,i=>i==null?-1:Ud(i)],_allowFocusWhenDisabled:`_allowFocusWhenDisabled`}})}return e})();var _t=(()=>{class e extends gt{_getTabindex(){return this.disabled&&!this._allowFocusWhenDisabled?null:this.tabIndex.toString()}_handleClick(i){!this.disabled&&this._isPrimary&&(i.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}_handleKeydown(i){(i.keyCode===13||i.keyCode===32)&&!this.disabled&&this._isPrimary&&!this._parentChip._isEditing&&(i.preventDefault(),this._parentChip._handlePrimaryActionInteraction())}static ɵfac=(()=>{let i;return function(a){return(i||(i=Sh(e)))(a||e)}})();static ɵdir=Me({type:e,selectors:[[``,`matChipAction`,``]],hostVars:3,hostBindings:function(t,a){t&1&&yb(`click`,function(m){return a._handleClick(m)})(`keydown`,function(m){return a._handleKeydown(m)}),t&2&&(si(`tabindex`,a._getTabindex()),gn(`mdc-evolution-chip__action--presentational`,!1))},features:[Zr]})}return e})();var ai=(()=>{class e{_changeDetectorRef=m(ay);_elementRef=m(ce);_tagName=m(FH);_ngZone=m(P);_focusMonitor=m(Ya);_globalRippleOptions=m(Nf,{optional:!0});_document=m(k);_onFocus=new j;_onBlur=new j;_isBasicChip=!1;role=null;_hasFocusInternal=!1;_pendingFocus=!1;_actionChanges;_animationsDisabled=ro();_allAvatars;_allLeadingIcons;_allTrailingIcons;_allEditIcons;_allRemoveIcons;_hasFocus(){return this._hasFocusInternal}id=m(If).getId(`mat-mdc-chip-`);ariaLabel=null;ariaDescription=null;_chipListDisabled=!1;_hadFocusOnRemove=!1;_textElement;get value(){return this._value!==void 0?this._value:this._textElement.textContent.trim()}set value(i){this._value=i}_value;color;removable=!0;highlighted=!1;disableRipple=!1;get disabled(){return this._disabled||this._chipListDisabled}set disabled(i){this._disabled=i}_disabled=!1;removed=new be;destroyed=new be;basicChipAttrName=`mat-basic-chip`;avatar;leadingIcon;editIcon;trailingIcon;removeIcon;primaryAction;_rippleLoader=m(Hv);_injector=m(W);constructor(){let i=m(Yt);i.load(Uv),i.load(Xa),this._monitorFocus(),this._rippleLoader?.configureRipple(this._elementRef.nativeElement,{className:`mat-mdc-chip-ripple`,disabled:this._isRippleDisabled()})}ngOnInit(){this._isBasicChip=this._elementRef.nativeElement.hasAttribute(this.basicChipAttrName)||this._tagName.toLowerCase()===this.basicChipAttrName}ngAfterViewInit(){this._textElement=this._elementRef.nativeElement.querySelector(`.mat-mdc-chip-action-label`),this._pendingFocus&&(this._pendingFocus=!1,this.focus())}ngAfterContentInit(){this._actionChanges=CD(this._allAvatars.changes,this._allLeadingIcons.changes,this._allTrailingIcons.changes,this._allEditIcons.changes,this._allRemoveIcons.changes).subscribe(()=>this._changeDetectorRef.markForCheck())}ngDoCheck(){this._rippleLoader.setDisabled(this._elementRef.nativeElement,this._isRippleDisabled())}ngOnDestroy(){this.destroyed.emit({chip:this}),this.destroyed.complete(),this._focusMonitor.stopMonitoring(this._elementRef),this._rippleLoader?.destroyRipple(this._elementRef.nativeElement),this._actionChanges?.unsubscribe()}remove(){this.removable&&(this._hadFocusOnRemove=this._hasFocus(),this.removed.emit({chip:this}))}_isRippleDisabled(){return this.disabled||this.disableRipple||this._animationsDisabled||this._isBasicChip||!this._hasInteractiveActions()||!!this._globalRippleOptions?.disabled}_hasLeadingGraphic(){return!!(this.leadingIcon||this.avatar)}_hasTrailingIcon(){return!!(this.trailingIcon||this.removeIcon)}_handleKeydown(i){(i.keyCode===8&&!i.repeat||i.keyCode===46)&&(i.preventDefault(),this.remove())}focus(){this.disabled||(this.primaryAction?this.primaryAction.focus():this._pendingFocus=!0)}_getSourceAction(i){return this._getActions().find(t=>{let a=t._elementRef.nativeElement;return a===i||a.contains(i)})}_getActions(){let i=[];return this.editIcon&&i.push(this.editIcon),this.primaryAction&&i.push(this.primaryAction),this.removeIcon&&i.push(this.removeIcon),i}_handlePrimaryActionInteraction(){}_hasInteractiveActions(){return this._getActions().length>0}_edit(i){}_monitorFocus(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(i=>{let t=i!==null;t!==this._hasFocusInternal&&(this._hasFocusInternal=t,t?this._onFocus.next({chip:this}):(this._changeDetectorRef.markForCheck(),setTimeout(()=>this._ngZone.run(()=>this._onBlur.next({chip:this})))))})}static ɵfac=function(t){return new(t||e)};static ɵcmp=(function(){let i=[`*`,[[`mat-chip-avatar`],[``,`matChipAvatar`,``],[`mat-chip-leading-icon`],[``,`matChipLeadingIcon`,``]],[[`mat-chip-trailing-icon`],[``,`matChipRemove`,``],[``,`matChipTrailingIcon`,``]]],t=[`*`,`mat-chip-avatar, [matChipAvatar], mat-chip-leading-icon, [matChipLeadingIcon]`,`mat-chip-trailing-icon,[matChipRemove],[matChipTrailingIcon]`];function a(m,s){m&1&&(ua(0,`span`,3),zt$1(1,1),xd())}function p(m,s){m&1&&(ua(0,`span`,7),zt$1(1,2),xd())}return tt({type:e,selectors:[[`mat-basic-chip`],[``,`mat-basic-chip`,``],[`mat-chip`],[``,`mat-chip`,``]],contentQueries:function(s,r,y){if(s&1&&Eb(y,pt,5)(y,st,5)(y,mt,5)(y,ht,5)(y,ut,5)(y,pt,5)(y,st,5)(y,ht,5)(y,mt,5)(y,ut,5),s&2){let v;VC(v=HC())&&(r.avatar=v.first),VC(v=HC())&&(r.leadingIcon=v.first),VC(v=HC())&&(r.editIcon=v.first),VC(v=HC())&&(r.trailingIcon=v.first),VC(v=HC())&&(r.removeIcon=v.first),VC(v=HC())&&(r._allAvatars=v),VC(v=HC())&&(r._allLeadingIcons=v),VC(v=HC())&&(r._allTrailingIcons=v),VC(v=HC())&&(r._allEditIcons=v),VC(v=HC())&&(r._allRemoveIcons=v)}},viewQuery:function(s,r){if(s&1&&_b(_t,5),s&2){let y;VC(y=HC())&&(r.primaryAction=y.first)}},hostAttrs:[1,`mat-mdc-chip`],hostVars:33,hostBindings:function(s,r){s&1&&yb(`keydown`,function(v){return r._handleKeydown(v)}),s&2&&(bb(`id`,r.id),si(`role`,r.role)(`aria-label`,r.ariaLabel),Ad(`mat-`+(r.color||`primary`)),gn(`mdc-evolution-chip`,!r._isBasicChip)(`mdc-evolution-chip--disabled`,r.disabled)(`mdc-evolution-chip--with-trailing-action`,r._hasTrailingIcon())(`mdc-evolution-chip--with-primary-graphic`,r._hasLeadingGraphic())(`mdc-evolution-chip--with-primary-icon`,r.leadingIcon||r.avatar)(`mdc-evolution-chip--with-avatar`,r.avatar)(`mat-mdc-chip-with-avatar`,r.avatar)(`mat-mdc-chip-with-leading-icon`,r.leadingIcon)(`mat-mdc-chip-highlighted`,r.highlighted)(`mat-mdc-chip-disabled`,r.disabled)(`mat-mdc-basic-chip`,r._isBasicChip)(`mat-mdc-standard-chip`,!r._isBasicChip)(`mat-mdc-chip-with-trailing-icon`,r._hasTrailingIcon())(`_mat-animation-noopable`,r._animationsDisabled))},inputs:{role:`role`,id:`id`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaDescription:[0,`aria-description`,`ariaDescription`],value:`value`,color:`color`,removable:[2,`removable`,`removable`,vt$1],highlighted:[2,`highlighted`,`highlighted`,vt$1],disableRipple:[2,`disableRipple`,`disableRipple`,vt$1],disabled:[2,`disabled`,`disabled`,vt$1]},outputs:{removed:`removed`,destroyed:`destroyed`},exportAs:[`matChip`],features:[Vb([{provide:oi,useExisting:e}])],ngContentSelectors:t,decls:9,vars:2,consts:[[1,`mat-mdc-chip-focus-overlay`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipContent`,``],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mat-mdc-chip-touch-target`],[1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`]],template:function(s,r){s&1&&(li(i),mb(0,`span`,0),ua(1,`span`,1)(2,`span`,2),ai$1(3,a,2,0,`span`,3),ua(4,`span`,4),zt$1(5),mb(6,`span`,5),xd(),mb(7,`span`,6),xd()(),ai$1(8,p,2,0,`span`,7)),s&2&&(ei(3),ci$1(r._hasLeadingGraphic()?3:-1),ei(5),ci$1(r._hasTrailingIcon()?8:-1))},dependencies:[gt],styles:[`.mdc-evolution-chip,
.mdc-evolution-chip__cell,
.mdc-evolution-chip__action {
  display: inline-flex;
  align-items: center;
}

.mdc-evolution-chip {
  position: relative;
  max-width: 100%;
}

.mat-mdc-chip-touch-target {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 48px;
  transform: translateY(-50%);
  display: var(--%NS%mat-chip-touch-target-display, block);
  pointer-events: auto;
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

.mdc-evolution-chip--%NS%disabled:not(.mdc-evolution-chip--selected) .mat-mdc-chip-leading-icon {
  opacity: var(--%NS%mat-chip-with-icon-disabled-icon-opacity, 0.38);
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
.mat-mdc-standard-chip .mat-mdc-chip-leading-icon,
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
.mat-mdc-standard-chip .mat-mdc-chip-avatar {
  border-radius: var(--%NS%mat-chip-with-avatar-avatar-shape-radius, 24px);
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
`],encapsulation:2})})()}return e})();var ri=(()=>{class e extends ai{_defaultOptions=m(vt,{optional:!0});chipListSelectable=!0;_chipListMultiple=!1;_chipListHideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get selectable(){return this._selectable&&this.chipListSelectable}set selectable(i){this._selectable=i,this._changeDetectorRef.markForCheck()}_selectable=!0;get selected(){return this._selected}set selected(i){this._setSelectedState(i,!1,!0)}_selected=!1;get ariaSelected(){return this.selectable?this.selected.toString():null}basicChipAttrName=`mat-basic-chip-option`;selectionChange=new be;ngOnInit(){super.ngOnInit(),this.role=`presentation`}select(){this._setSelectedState(!0,!1,!0)}deselect(){this._setSelectedState(!1,!1,!0)}selectViaInteraction(){this._setSelectedState(!0,!0,!0)}toggleSelected(i=!1){return this._setSelectedState(!this.selected,i,!0),this.selected}_handlePrimaryActionInteraction(){this.disabled||(this.focus(),this.selectable&&this.toggleSelected(!0))}_hasLeadingGraphic(){return this.leadingIcon||this.avatar?!0:!this._chipListHideSingleSelectionIndicator||this._chipListMultiple}_setSelectedState(i,t,a){i!==this.selected&&(this._selected=i,a&&this.selectionChange.emit({source:this,isUserInput:t,selected:this.selected}),this._changeDetectorRef.markForCheck())}static ɵfac=(()=>{let i;return function(a){return(i||(i=Sh(e)))(a||e)}})();static ɵcmp=(function(){let i=[`*`,[[`mat-chip-avatar`],[``,`matChipAvatar`,``],[`mat-chip-leading-icon`],[``,`matChipLeadingIcon`,``]],[[`mat-chip-trailing-icon`],[``,`matChipRemove`,``],[``,`matChipTrailingIcon`,``]]],t=[`*`,`mat-chip-avatar, [matChipAvatar], mat-chip-leading-icon, [matChipLeadingIcon]`,`mat-chip-trailing-icon,[matChipRemove],[matChipTrailingIcon]`];function a(m,s){m&1&&(ua(0,`span`,3),zt$1(1,1),ua(2,`span`,8),fm(),ua(3,`svg`,9),mb(4,`path`,10),xd()()())}function p(m,s){m&1&&(ua(0,`span`,7),zt$1(1,2),xd())}return tt({type:e,selectors:[[`mat-basic-chip-option`],[``,`mat-basic-chip-option`,``],[`mat-chip-option`],[``,`mat-chip-option`,``]],hostAttrs:[1,`mat-mdc-chip`,`mat-mdc-chip-option`],hostVars:39,hostBindings:function(s,r){s&2&&(bb(`id`,r.id),si(`tabindex`,null)(`aria-label`,null)(`aria-description`,null)(`role`,r.role),gn(`mdc-evolution-chip`,!r._isBasicChip)(`mdc-evolution-chip--filter`,!r._isBasicChip)(`mdc-evolution-chip--selectable`,!r._isBasicChip)(`mat-mdc-chip-selected`,r.selected)(`mat-mdc-chip-multiple`,r._chipListMultiple)(`mat-mdc-chip-disabled`,r.disabled)(`mat-mdc-chip-with-avatar`,r.avatar)(`mat-mdc-chip-with-leading-icon`,r.leadingIcon)(`mdc-evolution-chip--disabled`,r.disabled)(`mdc-evolution-chip--selected`,r.selected)(`mdc-evolution-chip--selecting`,!r._animationsDisabled)(`mdc-evolution-chip--with-trailing-action`,r._hasTrailingIcon())(`mdc-evolution-chip--with-primary-icon`,r.leadingIcon||r.avatar)(`mdc-evolution-chip--with-primary-graphic`,r._hasLeadingGraphic())(`mdc-evolution-chip--with-avatar`,r.avatar)(`mat-mdc-chip-highlighted`,r.highlighted)(`mat-mdc-chip-with-trailing-icon`,r._hasTrailingIcon()))},inputs:{selectable:[2,`selectable`,`selectable`,vt$1],selected:[2,`selected`,`selected`,vt$1]},outputs:{selectionChange:`selectionChange`},features:[Vb([{provide:ai,useExisting:e},{provide:oi,useExisting:e}]),Zr],ngContentSelectors:t,decls:9,vars:6,consts:[[1,`mat-mdc-chip-focus-overlay`],[`role`,`presentation`,1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--primary`],[`matChipAction`,``,`role`,`option`,3,`_allowFocusWhenDisabled`],[1,`mdc-evolution-chip__graphic`,`mat-mdc-chip-graphic`],[1,`mdc-evolution-chip__text-label`,`mat-mdc-chip-action-label`],[1,`mat-mdc-chip-primary-focus-indicator`,`mat-focus-indicator`],[1,`mat-mdc-chip-touch-target`],[`role`,`presentation`,1,`mdc-evolution-chip__cell`,`mdc-evolution-chip__cell--trailing`],[1,`mdc-evolution-chip__checkmark`],[`viewBox`,`-2 -3 30 30`,`focusable`,`false`,`aria-hidden`,`true`,1,`mdc-evolution-chip__checkmark-svg`],[`fill`,`none`,`stroke`,`currentColor`,`d`,`M1.73,12.91 8.1,19.28 22.79,4.59`,1,`mdc-evolution-chip__checkmark-path`]],template:function(s,r){s&1&&(li(i),mb(0,`span`,0),ua(1,`span`,1)(2,`button`,2),ai$1(3,a,5,0,`span`,3),ua(4,`span`,4),zt$1(5),mb(6,`span`,5)(7,`span`,6),xd()()(),ai$1(8,p,2,0,`span`,7)),s&2&&(ei(2),pb(`_allowFocusWhenDisabled`,!0),si(`aria-description`,r.ariaDescription)(`aria-label`,r.ariaLabel)(`aria-selected`,r.ariaSelected),ei(),ci$1(r._hasLeadingGraphic()?3:-1),ei(5),ci$1(r._hasTrailingIcon()?8:-1))},dependencies:[_t],styles:[`.mdc-evolution-chip,
.mdc-evolution-chip__cell,
.mdc-evolution-chip__action {
  display: inline-flex;
  align-items: center;
}

.mdc-evolution-chip {
  position: relative;
  max-width: 100%;
}

.mat-mdc-chip-touch-target {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 48px;
  transform: translateY(-50%);
  display: var(--%NS%mat-chip-touch-target-display, block);
  pointer-events: auto;
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

.mdc-evolution-chip--%NS%disabled:not(.mdc-evolution-chip--selected) .mat-mdc-chip-leading-icon {
  opacity: var(--%NS%mat-chip-with-icon-disabled-icon-opacity, 0.38);
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
.mat-mdc-standard-chip .mat-mdc-chip-leading-icon,
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
.mat-mdc-standard-chip .mat-mdc-chip-avatar {
  border-radius: var(--%NS%mat-chip-with-avatar-avatar-shape-radius, 24px);
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
`],encapsulation:2})})()}return e})();var wt=(()=>{class e{_elementRef=m(ce);_changeDetectorRef=m(ay);_dir=m(yN,{optional:!0});_lastDestroyedFocusedChipIndex=null;_keyManager;_destroyed=new j;_defaultRole=`presentation`;get chipFocusChanges(){return this._getChipStream(i=>i._onFocus)}get chipDestroyedChanges(){return this._getChipStream(i=>i.destroyed)}get chipRemovedChanges(){return this._getChipStream(i=>i.removed)}get disabled(){return this._disabled}set disabled(i){this._disabled=i,this._syncChipsState()}_disabled=!1;get empty(){return!this._chips||this._chips.length===0}get role(){return this._explicitRole?this._explicitRole:this.empty?null:this._defaultRole}tabIndex=0;set role(i){this._explicitRole=i}_explicitRole=null;get focused(){return this._hasFocusedChip()}_chips;_chipActions=new Jn;ngAfterViewInit(){this._setUpFocusManagement(),this._trackChipSetChanges(),this._trackDestroyedFocusedChip()}ngOnDestroy(){this._keyManager?.destroy(),this._chipActions.destroy(),this._destroyed.next(),this._destroyed.complete()}_hasFocusedChip(){return this._chips&&this._chips.some(i=>i._hasFocus())}_syncChipsState(){this._chips?.forEach(i=>{i._chipListDisabled=this._disabled,i._changeDetectorRef.markForCheck()})}focus(){}_handleKeydown(i){this._originatesFromChip(i)&&this._keyManager.onKeydown(i)}_isValidIndex(i){return i>=0&&i<this._chips.length}_allowFocusEscape(){let i=this._elementRef.nativeElement.tabIndex;i!==-1&&(this._elementRef.nativeElement.tabIndex=-1,setTimeout(()=>this._elementRef.nativeElement.tabIndex=i))}_getChipStream(i){return this._chips.changes.pipe(Zi(null),yc(()=>CD(...this._chips.map(i))))}_originatesFromChip(i){let t=i.target;for(;t&&t!==this._elementRef.nativeElement;){if(t.classList.contains(`mat-mdc-chip`))return!0;t=t.parentElement}return!1}_setUpFocusManagement(){this._chips.changes.pipe(Zi(this._chips)).subscribe(i=>{let t=[];i.forEach(a=>a._getActions().forEach(p=>t.push(p))),this._chipActions.reset(t),this._chipActions.notifyOnChanges()}),this._keyManager=new wf(this._chipActions).withVerticalOrientation().withHorizontalOrientation(this._dir?this._dir.value:`ltr`).withHomeAndEnd().skipPredicate(i=>this._skipPredicate(i)),this.chipFocusChanges.pipe(mo(this._destroyed)).subscribe(({chip:i})=>{let t=i._getSourceAction(document.activeElement);t&&this._keyManager.updateActiveItem(t)}),this._dir?.change.pipe(mo(this._destroyed)).subscribe(i=>this._keyManager.withHorizontalOrientation(i))}_skipPredicate(i){return i.disabled}_trackChipSetChanges(){this._chips.changes.pipe(Zi(null),mo(this._destroyed)).subscribe(()=>{this.disabled&&Promise.resolve().then(()=>this._syncChipsState()),this._redirectDestroyedChipFocus()})}_trackDestroyedFocusedChip(){this.chipDestroyedChanges.pipe(mo(this._destroyed)).subscribe(i=>{let a=this._chips.toArray().indexOf(i.chip),p=i.chip._hasFocus(),m=i.chip._hadFocusOnRemove&&this._keyManager.activeItem&&i.chip._getActions().includes(this._keyManager.activeItem),s=p||m;this._isValidIndex(a)&&s&&(this._lastDestroyedFocusedChipIndex=a)})}_redirectDestroyedChipFocus(){if(this._lastDestroyedFocusedChipIndex!=null){if(this._chips.length){let i=Math.min(this._lastDestroyedFocusedChipIndex,this._chips.length-1),t=this._chips.toArray()[i];t.disabled?this._chips.length===1?this.focus():this._keyManager.setPreviousItemActive():t.focus()}else this.focus();this._lastDestroyedFocusedChipIndex=null}}static ɵfac=function(t){return new(t||e)};static ɵcmp=(function(){return tt({type:e,selectors:[[`mat-chip-set`]],contentQueries:function(a,p,m){if(a&1&&Eb(m,ai,5),a&2){let s;VC(s=HC())&&(p._chips=s)}},hostAttrs:[1,`mat-mdc-chip-set`,`mdc-evolution-chip-set`],hostVars:1,hostBindings:function(a,p){a&1&&yb(`keydown`,function(s){return p._handleKeydown(s)}),a&2&&si(`role`,p.role)},inputs:{disabled:[2,`disabled`,`disabled`,vt$1],role:`role`,tabIndex:[2,`tabIndex`,`tabIndex`,t=>t==null?0:Ud(t)]},ngContentSelectors:[`*`],decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(a,p){a&1&&(li(),pn$1(0,`div`,0),zt$1(1),mn())},styles:[`.mat-mdc-chip-set {
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
  margin: 8px 0 8px 8px;
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
`],encapsulation:2})})()}return e})();var ci=class{source;value;constructor(n,i){this.source=n,this.value=i}};var Ct={provide:z,useExisting:gs(()=>di),multi:!0};var di=(()=>{class e extends wt{_onTouched=()=>{};_onChange=()=>{};_defaultRole=`listbox`;_defaultOptions=m(vt,{optional:!0});get multiple(){return this._multiple}set multiple(i){this._multiple=i,this._syncListboxProperties()}_multiple=!1;get selected(){let i=this._chips.toArray().filter(t=>t.selected);return this.multiple?i:i[0]}ariaOrientation=`horizontal`;get selectable(){return this._selectable}set selectable(i){this._selectable=i,this._syncListboxProperties()}_selectable=!0;compareWith=(i,t)=>i===t;required=!1;get hideSingleSelectionIndicator(){return this._hideSingleSelectionIndicator}set hideSingleSelectionIndicator(i){this._hideSingleSelectionIndicator=i,this._syncListboxProperties()}_hideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get chipSelectionChanges(){return this._getChipStream(i=>i.selectionChange)}get chipBlurChanges(){return this._getChipStream(i=>i._onBlur)}get value(){return this._value}set value(i){this._chips&&this._chips.length&&this._setSelectionByValue(i,!1),this._value=i}_value;change=new be;_chips=void 0;ngAfterContentInit(){this._chips.changes.pipe(Zi(null),mo(this._destroyed)).subscribe(()=>{this.value!==void 0&&Promise.resolve().then(()=>{this._setSelectionByValue(this.value,!1)}),this._syncListboxProperties()}),this.chipBlurChanges.pipe(mo(this._destroyed)).subscribe(()=>this._blur()),this.chipSelectionChanges.pipe(mo(this._destroyed)).subscribe(i=>{this.multiple||this._chips.forEach(t=>{t!==i.source&&t._setSelectedState(!1,!1,!1)}),i.isUserInput&&this._propagateChanges()})}focus(){if(this.disabled)return;let i=this._getFirstSelectedChip();i&&!i.disabled?i.focus():this._chips.length>0?this._keyManager.setFirstItemActive():this._elementRef.nativeElement.focus()}writeValue(i){i!=null?this.value=i:this.value=void 0}registerOnChange(i){this._onChange=i}registerOnTouched(i){this._onTouched=i}setDisabledState(i){this.disabled=i}_setSelectionByValue(i,t=!0){this._clearSelection(),Array.isArray(i)?i.forEach(a=>this._selectValue(a,t)):this._selectValue(i,t)}_blur(){this.disabled||setTimeout(()=>{this.focused||this._markAsTouched()})}_keydown(i){i.keyCode===9&&super._allowFocusEscape()}_markAsTouched(){this._onTouched(),this._changeDetectorRef.markForCheck()}_propagateChanges(){let i=null;Array.isArray(this.selected)?i=this.selected.map(t=>t.value):i=this.selected?this.selected.value:void 0,this._value=i,this.change.emit(new ci(this,i)),this._onChange(i),this._changeDetectorRef.markForCheck()}_clearSelection(i){this._chips.forEach(t=>{t!==i&&t.deselect()})}_selectValue(i,t){let a=this._chips.find(p=>p.value!=null&&this.compareWith(p.value,i));return a&&(t?a.selectViaInteraction():a.select()),a}_syncListboxProperties(){this._chips&&Promise.resolve().then(()=>{this._chips.forEach(i=>{i._chipListMultiple=this.multiple,i.chipListSelectable=this._selectable,i._chipListHideSingleSelectionIndicator=this.hideSingleSelectionIndicator,i._changeDetectorRef.markForCheck()})})}_getFirstSelectedChip(){return Array.isArray(this.selected)?this.selected.length?this.selected[0]:void 0:this.selected}_skipPredicate(i){return!1}static ɵfac=(()=>{let i;return function(a){return(i||(i=Sh(e)))(a||e)}})();static ɵcmp=(function(){return tt({type:e,selectors:[[`mat-chip-listbox`]],contentQueries:function(a,p,m){if(a&1&&Eb(m,ri,5),a&2){let s;VC(s=HC())&&(p._chips=s)}},hostAttrs:[1,`mdc-evolution-chip-set`,`mat-mdc-chip-listbox`],hostVars:10,hostBindings:function(a,p){a&1&&yb(`focus`,function(){return p.focus()})(`blur`,function(){return p._blur()})(`keydown`,function(s){return p._keydown(s)}),a&2&&(bb(`tabIndex`,p.disabled||p.empty?-1:p.tabIndex),si(`role`,p.role)(`aria-required`,p.role?p.required:null)(`aria-disabled`,p.disabled.toString())(`aria-multiselectable`,p.multiple)(`aria-orientation`,p.ariaOrientation),gn(`mat-mdc-chip-list-disabled`,p.disabled)(`mat-mdc-chip-list-required`,p.required))},inputs:{multiple:[2,`multiple`,`multiple`,vt$1],ariaOrientation:[0,`aria-orientation`,`ariaOrientation`],selectable:[2,`selectable`,`selectable`,vt$1],compareWith:`compareWith`,required:[2,`required`,`required`,vt$1],hideSingleSelectionIndicator:[2,`hideSingleSelectionIndicator`,`hideSingleSelectionIndicator`,vt$1],value:`value`},outputs:{change:`change`},features:[Vb([Ct]),Zr],ngContentSelectors:[`*`],decls:2,vars:0,consts:[[`role`,`presentation`,1,`mdc-evolution-chip-set__chips`]],template:function(a,p){a&1&&(li(),pn$1(0,`div`,0),zt$1(1),mn())},styles:[`.mat-mdc-chip-set {
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
  margin: 8px 0 8px 8px;
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
`],encapsulation:2})})()}return e})();var St=[`logViewport`];var kt=()=>[];var Nt=()=>[`#f59e0b`];var It=()=>[`#60a5fa`];var Et=()=>[`#c084fc`];var Mt=(e,n)=>n.message;var At=(e,n)=>n.title;var Dt=(e,n)=>n.id;function Tt(e,n){if(e&1&&mb(0,`ao-error-state`,10),e&2){let i=LC();pb(`message`,i.error())}}function Ft(e,n){if(e&1&&(ua(0,`a`,58),uS(1,` Open `),xd()),e&2){let i=LC().$implicit;pb(`routerLink`,i.href)}}function Rt(e,n){if(e&1&&(ua(0,`div`,16),mb(1,`mat-icon`,56),ua(2,`div`,57)(3,`div`,5),uS(4),xd(),ai$1(5,Ft,2,1,`a`,58),xd()()),e&2){let i=n.$implicit;ei(),pb(`svgIcon`,i.severity===`warning`?`octagon-alert`:`circle-alert`),ei(3),Ob(i.message),ei(),ci$1(i.href?5:-1)}}function Lt(e,n){e&1&&(ua(0,`div`,16),mb(1,`mat-icon`,59),ua(2,`div`,5),uS(3,`Nothing flagged`),xd()())}function zt(e,n){if(e&1&&(ua(0,`mat-card`,18)(1,`mat-card-header`)(2,`div`,12),mb(3,`mat-icon`,60),ua(4,`div`,23),uS(5),xd()()(),ua(6,`mat-card-content`)(7,`div`,61),uS(8),IS(9,`number`),xd(),ua(10,`div`,62),mb(11,`mat-icon`,60),ua(12,`div`,63),uS(13),xd()()()()),e&2){let i=n.$implicit;ei(3),pb(`svgIcon`,i.icon),ei(2),Ob(i.title),ei(3),Rd(` `,SS(9,7,i.value),` `),ei(3),Ad(i.toneClass),pb(`svgIcon`,i.toneIcon),ei(2),Rd(` `,i.caption,` `)}}function Ot(e,n){if(e&1&&(ua(0,`div`,31)(1,`div`,5),uS(2,`email`),xd(),mb(3,`div`,6),ua(4,`div`,64),uS(5),xd()()),e&2){let i=LC();ei(5),Rd(` `,i.session()?.email,` `)}}function Pt(e,n){if(e&1&&(ua(0,`div`,31)(1,`div`,5),uS(2,`user id`),xd(),mb(3,`div`,6),ua(4,`div`,33),uS(5),xd()()),e&2){let i=LC();ei(5),Rd(` `,i.session()?.userId,` `)}}function Bt(e,n){e&1&&(ua(0,`mat-card`,11)(1,`div`,12),mb(2,`mat-icon`,13),ua(3,`div`,14),uS(4,` Reach port guard `),xd()(),ua(5,`div`,65),mb(6,`mat-icon`,66),ua(7,`div`,5),uS(8),xd()()()),e&2&&(ei(8),Ob(n.message))}function Ht(e,n){if(e&1&&(ua(0,`mat-card`,11)(1,`div`,12),mb(2,`mat-icon`,67),ua(3,`div`,14),uS(4,` Sparkline snapshots `),xd()(),ua(5,`div`,68)(6,`div`)(7,`div`,69),uS(8,`CPU`),xd(),mb(9,`apx-chart`,70),xd(),ua(10,`div`)(11,`div`,69),uS(12,`Memory`),xd(),mb(13,`apx-chart`,70),xd(),ua(14,`div`)(15,`div`,69),uS(16,`GPU`),xd(),mb(17,`apx-chart`,70),xd()()()),e&2){let i=LC();ei(9),pb(`chart`,i.sparkChart.chart)(`colors`,vS(18,Nt))(`fill`,i.sparkChart.fill)(`series`,i.sparkSeries(`cpu`))(`stroke`,i.sparkChart.stroke)(`tooltip`,i.sparkChart.tooltip),ei(4),pb(`chart`,i.sparkChart.chart)(`colors`,vS(19,It))(`fill`,i.sparkChart.fill)(`series`,i.sparkSeries(`mem`))(`stroke`,i.sparkChart.stroke)(`tooltip`,i.sparkChart.tooltip),ei(4),pb(`chart`,i.sparkChart.chart)(`colors`,vS(20,Et))(`fill`,i.sparkChart.fill)(`series`,i.sparkSeries(`gpu`))(`stroke`,i.sparkChart.stroke)(`tooltip`,i.sparkChart.tooltip)}}function Gt(e,n){e&1&&(ua(0,`span`,5),uS(1),xd()),e&2&&(ei(),Rd(`Snapshot `,n))}function Vt(e,n){if(e&1&&uS(0),e&2){let i=LC();Rd(` · filter `,i.runIdFilter(),` `)}}function jt(e,n){if(e&1&&(ua(0,`mat-chip-option`,53),uS(1),xd()),e&2){let i=n.$implicit;pb(`value`,i),ei(),Ob(i)}}function qt(e,n){if(e&1&&(ua(0,`div`,55)(1,`span`,71),uS(2),xd(),ua(3,`span`,72),uS(4),xd(),ua(5,`span`,73),uS(6),xd()()),e&2){let i=n.$implicit,t=LC();ei(2),Ob(t.formatLogTime(i.ts)),ei(),pb(`ngClass`,t.sourceClass(i.source)),ei(),Ob(i.source),ei(),pb(`ngClass`,t.levelClass(i.level)),ei(),Ob(i.line)}}function Qt(e,n){e&1&&(ua(0,`div`,5),uS(1,`Waiting for log lines…`),xd())}var yt=[`web`,`engine`,`execution`,`ollama`,`detection`,`mcp`,`speech`,`openclaw`,`reach`];var ft=class e{api=m(d);route=m(W$1);live=m(C);liveHandle=null;logViewport=BH(`logViewport`);topology=Bt$1(null);ping=Bt$1(null);session=Bt$1(null);revision=Bt$1(null);error=Bt$1(null);selectedSources=Bt$1([]);followLogs=Bt$1(!0);runIdFilter=Bt$1(``);logsExpanded=Bt$1(!1);components=AS(()=>this.topology()?.components||[]);orderedComponents=AS(()=>{let n=i=>{let t=yt.indexOf(i);return t===-1?yt.length:t};return[...this.components()].sort((i,t)=>n(i.id)-n(t.id))});topologyUnhealthyCount=AS(()=>this.components().filter(n=>[`failed`,`degraded`,`blocking`,`warning`].includes(String(n.status||``).toLowerCase())).length);filteredLogs=AS(()=>{let n=new Set(this.selectedSources()),i=this.runIdFilter().trim().toLowerCase(),t=this.live.logs();return n.size&&(t=t.filter(a=>n.has(a.source))),i&&(t=t.filter(a=>String(a.line||``).toLowerCase().includes(i))),t});summary=AS(()=>{let n=this.components(),i=n.filter(s=>[`healthy`,`available`,`succeeded`].includes(String(s.status||``).toLowerCase())).length,t=n.filter(s=>[`degraded`,`warning`,`running`,`reconciling`].includes(String(s.status||``).toLowerCase())).length,a=n.filter(s=>[`failed`,`blocking`].includes(String(s.status||``).toLowerCase())).length,p=this.topology()?.attention?.length??0;return[{title:`Healthy`,icon:`circle-check`,value:i,caption:n.filter(s=>[`healthy`,`available`,`succeeded`].includes(String(s.status||``).toLowerCase())).map(s=>s.id).join(`, `)||`components up`,toneIcon:`arrow-up`,toneClass:`text-green-600`},{title:`Degraded`,icon:`octagon-alert`,value:t,caption:`need watch`,toneIcon:t?`arrow-up`:`arrow-down`,toneClass:t?`text-amber-600`:`text-green-600`},{title:`Failed`,icon:`circle-x`,value:a,caption:`blocking`,toneIcon:a?`arrow-up`:`arrow-down`,toneClass:a?`text-red-600`:`text-green-600`},{title:`Attention`,icon:`bell`,value:p,caption:`open items`,toneIcon:p?`arrow-up`:`arrow-down`,toneClass:p?`text-amber-600`:`text-green-600`}]});sparkChart={chart:{animations:{enabled:!1,dynamicAnimation:{enabled:!1}},fontFamily:`inherit`,foreColor:`inherit`,height:`101%`,width:`101%`,type:`area`,sparkline:{enabled:!0}},fill:{type:`gradient`,gradient:{shadeIntensity:.5,opacityFrom:.4,opacityTo:.05}},stroke:{curve:`smooth`,width:2},tooltip:{enabled:!1}};constructor(){js(()=>{let n=this.live.feedErrors().topology||this.live.feedErrors()._;n&&this.error.set(n);let i=this.live.feeds().topology;i&&(this.error.set(null),this.topology.set(i))}),js(()=>{this.filteredLogs(),this.followLogs()&&queueMicrotask(()=>{let n=this.logViewport()?.nativeElement;n&&(n.scrollTop=n.scrollHeight)})})}ngOnInit(){this.selectedSources.set([...this.live.logSourceOptions()]),this.liveHandle=this.live.acquire({metrics:!0,logs:!0,feeds:[`topology`],feedIntervalMs:5e3}),this.api.ping().subscribe(i=>i.ok&&this.ping.set(i.data)),this.api.session().subscribe(i=>i.ok&&this.session.set(i.data)),this.api.revision().subscribe(i=>i.ok&&this.revision.set(i.data));let n=String(this.route.snapshot.queryParamMap.get(`runId`)||``).trim()||String(this.route.snapshot.queryParamMap.get(`q`)||``).trim();n&&this.applyRunIdFilter(n)}revisionTitle(){let n=this.revision();return n?[n.sha,n.subject].filter(Boolean).join(` — `):``}onRunIdFilterChange(n){this.applyRunIdFilter(String(n||``))}applyRunIdFilter(n){let i=n.trim();this.runIdFilter.set(i),i&&(this.logsExpanded.set(!0),this.liveHandle?.followRunLogs(i))}ngOnDestroy(){this.liveHandle?.release(),this.liveHandle=null}sparkSeries(n){let i=this.live.history().map(t=>t[n]).filter(t=>t!=null);return[{name:n,data:i.length?i:[0]}]}onSourcesChange(n){let i=n.value,t=Array.isArray(i)?i:i?[i]:[];this.selectedSources.set(t),this.liveHandle?.setLogSources(t.length?t:null)}exportBundle(){this.api.supportBundle().subscribe(n=>{if(!n.ok){this.error.set(n.message);return}let i=new Blob([JSON.stringify(n.data,null,2)],{type:`application/json`}),t=URL.createObjectURL(i),a=document.createElement(`a`);a.href=t,a.download=`ao-support-bundle-${Date.now()}.json`,a.click(),URL.revokeObjectURL(t)})}reload(){this.error.set(null),this.live.refreshFeeds(),this.api.ping().subscribe(n=>n.ok&&this.ping.set(n.data)),this.api.session().subscribe(n=>n.ok&&this.session.set(n.data)),this.api.revision().subscribe(n=>n.ok&&this.revision.set(n.data))}componentHref(n){let i=n.url||n.urlHint;if(!i)return null;let t=location.hostname||`127.0.0.1`,a=String(i).replace(/__HOST__/g,t).replace(/<host>/gi,t).split(/\s+/)[0];return!a||a.includes(`<`)?null:a.startsWith(`/`)?`${location.protocol}//${location.host}${a}`:a}statusLabel(n){let i=String(n||`unknown`).replace(/-/g,` `);return i.charAt(0).toUpperCase()+i.slice(1)}statusTextClass(n){let i=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(i)?`text-green-600`:[`failed`,`blocking`].includes(i)?`text-red-600`:[`degraded`,`warning`,`running`,`reconciling`].includes(i)?`text-amber-600`:`text-neutral-500`}statusDotClass(n){let i=String(n||``).toLowerCase();return[`healthy`,`available`,`succeeded`].includes(i)?`bg-green-500`:[`failed`,`blocking`].includes(i)?`bg-red-500`:[`degraded`,`warning`,`running`,`reconciling`].includes(i)?`bg-amber-500`:`bg-neutral-400`}formatLogTime(n){let i=new Date(n);return Number.isFinite(i.getTime())?i.toLocaleTimeString([],{hour12:!1,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}):`--:--:--`}sourceClass(n){switch(n){case`engine`:return`text-violet-400`;case`coordinator`:return`text-sky-400`;case`warm-pool`:return`text-amber-400`;case`broker`:return`text-rose-400`;default:return`text-emerald-400`}}levelClass(n){return n===`error`?`text-red-300`:n===`warn`?`text-amber-200`:`text-neutral-200`}static ɵfac=function(i){return new(i||e)};static ɵcmp=tt({type:e,selectors:[[`ao-overview-page`]],viewQuery:function(i,t){i&1&&Ib(t.logViewport,St,5),i&2&&UC()},decls:113,vars:27,consts:[[`logViewport`,``],[1,`@container`,`mx-auto`,`flex`,`w-full`,`max-w-7xl`,`flex-auto`,`flex-col`,`gap-4`,`p-6`,`sm:gap-6`,`lg:px-8`,`lg:pt-8`,`lg:pb-10`],[1,`flex`,`items-center`,`justify-between`,`gap-x-3`],[1,`flex`,`flex-col`,`gap-y-0.5`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex-auto`],[`matButton`,`outlined`,`type`,`button`,1,`mr-2`,3,`click`],[1,`flex`,`items-center`,`gap-x-1.5`,`text-sm`,3,`ngClass`],[1,`inline-block`,`size-2`,`rounded-full`,3,`ngClass`],[3,`message`],[`appearance`,`outlined`,1,`p-6`],[1,`flex`,`items-center`,`gap-x-2`],[`svgIcon`,`sparkles`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`truncate`,`text-lg`,`font-medium`,`tracking-tight`],[1,`mt-6`,`flex`,`flex-col`,`gap-y-4`],[1,`flex`,`items-start`,`gap-x-3`],[1,`grid`,`gap-4`,`sm:gap-6`,`@max-md:grid-cols-1`,`@md:grid-cols-2`,`@4xl:grid-cols-4`],[`appearance`,`filled`],[1,`grid`,`w-full`,`grid-cols-1`,`gap-6`,`xl:grid-cols-2`],[`appearance`,`filled`,1,`flex`,`flex-col`],[1,`flex`,`flex-auto`,`items-center`,`gap-x-2`],[`svgIcon`,`server`,1,`size-4`],[1,`font-medium`,`tracking-tight`],[1,`ml-auto`],[`matButton`,``,`href`,`/`],[1,`flex`,`flex-auto`,`flex-col`],[1,`text-3xl`,`font-semibold`],[1,`mt-0.5`,`text-sm`,`text-neutral-500`],[1,`mt-2`,`break-words`,`font-mono`,`text-sm`,`font-medium`,3,`title`],[1,`mt-4`,`flex`,`flex-col`,`gap-y-3`],[1,`flex`,`items-center`,`gap-x-1`],[1,`font-medium`,`tabular-nums`],[1,`max-w-[60%]`,`truncate`,`font-mono`,`text-sm`,`font-medium`],[1,`font-medium`],[`appearance`,`outlined`,1,`overflow-hidden`],[1,`flex`,`w-full`,`items-start`,`justify-between`,`gap-3`],[1,`text-lg`,`font-medium`,`tracking-tight`],[1,`text-sm`,`text-neutral-500`],[`matButton`,`filled`,`routerLink`,`/topology`],[`svgIcon`,`share-2`],[1,`pt-2`],[1,`flex`,`flex-wrap`,`items-center`,`gap-x-4`,`gap-y-1`,`text-sm`],[1,`font-medium`,3,`ngClass`],[1,`!rounded-xl`,`!border`,`!shadow-none`,3,`opened`,`closed`,`expanded`],[1,`flex`,`flex-col`,`gap-3`,`pb-2`,`sm:flex-row`,`sm:items-center`],[1,`min-w-0`,`flex-auto`,`text-sm`,`text-neutral-500`],[`appearance`,`outline`,`subscriptSizing`,`dynamic`,1,`w-full`,`sm:w-72`],[`matInput`,``,`placeholder`,`paste run_id`,3,`ngModelChange`,`ngModel`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[3,`svgIcon`],[1,`pb-3`],[`aria-label`,`Log sources`,3,`change`,`multiple`,`value`],[3,`value`],[1,`max-h-96`,`overflow-y-auto`,`bg-neutral-950`,`px-4`,`py-3`,`font-mono`,`text-xs`,`leading-relaxed`,`text-neutral-200`],[1,`flex`,`gap-x-2`,`whitespace-pre-wrap`,`break-all`],[1,`size-5`,`shrink-0`,`text-neutral-500`,3,`svgIcon`],[1,`min-w-0`,`flex-auto`],[`matButton`,``,1,`mt-1`,3,`routerLink`],[`svgIcon`,`circle-check`,1,`size-5`,`shrink-0`,`text-green-600`],[1,`size-4`,3,`svgIcon`],[1,`text-5xl`,`font-semibold`,`tabular-nums`],[1,`mt-2`,`flex`,`items-center`,`gap-x-1`],[1,`text-sm`,`font-medium`,`text-neutral-500`],[1,`max-w-[60%]`,`truncate`,`font-medium`],[1,`mt-4`,`flex`,`items-start`,`gap-x-3`],[`svgIcon`,`octagon-alert`,1,`size-5`,`shrink-0`,`text-neutral-500`],[`svgIcon`,`activity`,1,`size-5`,`text-primary-600`,`dark:text-primary-500`],[1,`mt-4`,`grid`,`grid-cols-3`,`gap-3`],[1,`text-xs`,`font-medium`,`text-neutral-500`],[1,`h-16`,3,`chart`,`colors`,`fill`,`series`,`stroke`,`tooltip`],[1,`shrink-0`,`text-neutral-500`],[1,`w-24`,`shrink-0`,`truncate`,`font-semibold`,3,`ngClass`],[3,`ngClass`]],template:function(i,t){if(i&1&&(ua(0,`div`,1)(1,`div`,2)(2,`div`,3)(3,`div`,4),uS(4,` Overview `),xd(),ua(5,`div`,5),uS(6,` Live host utilization, topology, and streaming logs `),xd()(),mb(7,`div`,6),ua(8,`button`,7),yb(`click`,function(){return t.exportBundle()}),uS(9,` Export support bundle `),xd(),ua(10,`div`,8),mb(11,`span`,9),uS(12),xd()(),ai$1(13,Tt,1,1,`ao-error-state`,10),ua(14,`mat-card`,11)(15,`div`,12),mb(16,`mat-icon`,13),ua(17,`div`,14),uS(18,` Needs attention `),xd()(),ua(19,`div`,15),NC(20,Rt,6,3,`div`,16,Mt,!1,Lt,4,0,`div`,16),xd()(),ua(23,`div`,17),NC(24,zt,14,9,`mat-card`,18,At),xd(),mb(26,`ao-host-utilization`),ua(27,`div`,19)(28,`mat-card`,20)(29,`mat-card-header`)(30,`div`,21),mb(31,`mat-icon`,22),ua(32,`div`,23),uS(33,`Web process`),xd(),ua(34,`div`,24)(35,`a`,25),uS(36,` Open chat `),xd()()()(),ua(37,`mat-card-content`,26)(38,`div`,27),uS(39),xd(),ua(40,`div`,28),uS(41,` Coordinator web UI and Admin API process `),xd(),ua(42,`div`,29),uS(43),xd(),ua(44,`div`,30)(45,`div`,31)(46,`div`,5),uS(47,`pid`),xd(),mb(48,`div`,6),ua(49,`div`,32),uS(50),xd()(),ua(51,`div`,31)(52,`div`,5),uS(53,`instance`),xd(),mb(54,`div`,6),ua(55,`div`,33),uS(56),xd()(),ua(57,`div`,31)(58,`div`,5),uS(59,`user`),xd(),mb(60,`div`,6),ua(61,`div`,34),uS(62),xd()(),ai$1(63,Ot,6,1,`div`,31),ai$1(64,Pt,6,1,`div`,31),xd()()(),ai$1(65,Bt,9,1,`mat-card`,11)(66,Ht,18,21,`mat-card`,11),xd(),ua(67,`mat-card`,35)(68,`mat-card-header`)(69,`div`,36)(70,`div`)(71,`div`,37),uS(72,` Deployment topology `),xd(),ua(73,`div`,38),uS(74,` Live three-band graph of what is deployed and healthy `),xd()(),ua(75,`a`,39),mb(76,`mat-icon`,40),uS(77,` Open Topology `),xd()()(),ua(78,`mat-card-content`,41)(79,`div`,42)(80,`span`),uS(81),xd(),ua(82,`span`,43),uS(83),xd(),ai$1(84,Gt,2,1,`span`,5),xd()()(),ua(85,`mat-expansion-panel`,44),yb(`opened`,function(){return t.logsExpanded.set(!0)})(`closed`,function(){return t.logsExpanded.set(!1)}),ua(86,`mat-expansion-panel-header`)(87,`mat-panel-title`),uS(88,`Live logs`),xd(),ua(89,`mat-panel-description`),uS(90,` Streaming from web + cluster tails `),ai$1(91,Vt,1,1),xd()(),ua(92,`div`,45)(93,`div`,46),uS(94,` Filter sources · errors red, warnings amber `),xd(),ua(95,`mat-form-field`,47)(96,`mat-label`),uS(97,`run_id filter`),xd(),ua(98,`input`,48),dI(),yb(`ngModelChange`,function(p){return t.onRunIdFilterChange(p)}),xd()(),ua(99,`button`,49),yb(`click`,function(){return t.followLogs.set(!t.followLogs())}),mb(100,`mat-icon`,50),uS(101),xd(),ua(102,`button`,49),yb(`click`,function(){return t.live.clearLogs()}),uS(103,` Clear `),xd()(),ua(104,`div`,51)(105,`mat-chip-listbox`,52),yb(`change`,function(p){return t.onSourcesChange(p)}),NC(106,jt,2,2,`mat-chip-option`,53,xC),xd()(),ua(108,`div`,54,0),NC(110,qt,7,5,`div`,55,Dt,!1,Qt,2,0,`div`,5),xd()()()),i&2){let a,p;ei(10),pb(`ngClass`,t.live.connected()?`text-green-600`:`text-neutral-500`),ei(),pb(`ngClass`,t.live.connected()?`bg-green-500 animate-pulse`:`bg-neutral-400`),ei(),Rd(` `,t.live.connected()?`Live`:`Reconnecting…`,` `),ei(),ci$1(t.error()?13:-1),ei(7),MC(t.topology()?.attention||vS(26,kt)),ei(4),MC(t.summary()),ei(15),Rd(` `,t.ping()?.service||`—`,` `),ei(3),pb(`title`,t.revisionTitle()),ei(),Rd(` `,t.revision()?.label||`—`,` `),ei(7),Rd(` `,t.ping()?.pid??`—`,` `),ei(6),Rd(` `,t.ping()?.instance||`—`,` `),ei(6),Rd(` `,t.session()?.userName||`—`,` `),ei(),ci$1(t.session()?.email?63:-1),ei(),ci$1(t.session()?.userId?64:-1),ei(),ci$1((a=t.topology()?.reachGuard)?65:66,a),ei(16),Rd(` `,t.orderedComponents().length,` components reported `),ei(),pb(`ngClass`,t.topologyUnhealthyCount()>0?`text-red-600 dark:text-red-400`:`text-neutral-500`),ei(),Rd(` `,t.topologyUnhealthyCount(),` unhealthy `),ei(),ci$1((p=t.topology()?.generatedAt)?84:-1,p),ei(),pb(`expanded`,t.logsExpanded()),ei(6),ci$1(t.runIdFilter()?91:-1),ei(7),pb(`ngModel`,t.runIdFilter()),pI(),ei(2),pb(`svgIcon`,t.followLogs()?`circle-check`:`circle`),ei(),Rd(` `,t.followLogs()?`Following`:`Follow`,` `),ei(4),pb(`multiple`,!0)(`value`,t.selectedSources()),ei(),MC(t.live.logSourceOptions()),ei(4),MC(t.filteredLogs())}},dependencies:[Pt$1,An,je,Vn,Yt$1,Vt$1,Ue,Z,Ze,Ue$1,I,GG,zG,Mt$1,wt$1,N,_,I$1,di,Y,ri,ke,Ne,ln,pn,LT,z$1,$T],encapsulation:2})};export{ft as OverviewPage};