import{$t as Uv,A as Ea,Ai as zw,Ar as oM,At as Ql,Bn as be,Ci as xv,E as Dm,Ei as yp,Gr as qn,Jr as qw,Jt as Tt,K as Ir,Lt as Re,Mi as m,Mt as R,Nn as _r,Nr as pH,O as ED,Oi as zl,P as Fm,Pn as _y,Pr as pT,Rr as pt,Si as xp,St as P,Ti as ym,U as Hr,Un as cG,Ur as ql,Ut as Sw,V as Hd,Vt as SI,W as Hw,Wr as qm,X as Jl,Xt as Tw,Yt as Tv,Z as Jm,_t as Nm,ai as v,an as Vm,bi as xe,ci as vp,cr as ge,dr as ia$1,en as Uw,er as fe$1,et as Kl,fn as Wm,ft as Mw,g as CC,gr as js,hi as ww,ii as uw,in as Vh,ir as gC,it as Ld,j as Ee,ji as l,jn as _i$1,kr as oC,li as vv,ln as WS,lr as h,mi as wm,n as $i$1,nn as V_,oi as vD,on as Vn,p as Bw,pr as ie,qn as dG,rt as L,s as Ap,si as vl,sn as Vs,ti as ta$1,ui as wC,ur as hH,vn as YS,vr as k,wr as kw,wt as PC,x as Cw,xi as xm,y as Cm,yi as xS,yt as O,z as Gw,zn as ay,zr as q}from"./chunk-BpT5wdeN.js";import{n as yt,r as Dt$1,t as wt$1,u as m$1}from"./main-OHDKJYUE.js";import{t as f}from"./chunk-3nbb3lx-.js";import{n as dt,r as lt}from"./chunk-CdM5TklW.js";import{a as k$1,o as p,r as d,s,t as H}from"./chunk-Diy3XHPK.js";import"./chunk-C99dHixH.js";import"./chunk-WZemQj03.js";import{n as Ie}from"./chunk-DAoBc3q9.js";import{a as Vt$1,l as ot,n as It,o as W,s as Wt$1,t as D,u as qt$1}from"./chunk-CE815-g4.js";import"./chunk-CoBJjLjQ.js";import{t as w}from"./chunk-CtS0oAqz.js";import{a as ei$1,c as ni$1,d as si$1,f as ti$1,i as ai$1,l as oi$1,o as ii$1,r as Zt,s as li$1,t as Jt,u as ri$1}from"./chunk-Cn3paqQs.js";import"./chunk-BQmX-p_U.js";import{t as I}from"./chunk-A4bEWzEM.js";import{a as hn,i as bn,r as Re$1}from"./chunk-mADxijM6.js";import{i as Lt,r as I$1,t as Bt$1}from"./chunk-Ct_65vQm.js";import{l as q$1,u as xe$1}from"./chunk-BctHmrjI.js";import{n as bt,r as nt,t as Dt$2}from"./chunk-DGTrccWO.js";import{n as ge$1,r as he,t as U}from"./chunk-VjoCMFg2.js";function ki(t,n){}var de=class{viewContainerRef;injector;id;role=`dialog`;panelClass=``;hasBackdrop=!0;backdropClass=``;disableClose=!1;closePredicate;width=``;height=``;minWidth;minHeight;maxWidth;maxHeight;positionStrategy;data=null;direction;ariaDescribedBy=null;ariaLabelledBy=null;ariaLabel=null;ariaModal=!1;autoFocus=`first-tabbable`;restoreFocus=!0;scrollStrategy;closeOnNavigation=!0;closeOnDestroy=!0;closeOnOverlayDetachments=!0;disableAnimations=!1;providers;container;templateContext;bindings};var Bt=(()=>{class t extends d{_elementRef=h(ie);_focusTrapFactory=h(WS);_config;_interactivityChecker=h(Tv);_ngZone=h(P);_focusMonitor=h(vv);_renderer=h(Ir);_changeDetectorRef=h(_y);_injector=h(q);_platform=h(ge);_document=h(O);_portalOutlet;_focusTrapped=new L;_focusTrap=null;_elementFocusedBeforeDialogWasOpened=null;_closeInteractionType=null;_ariaLabelledByQueue=[];_isDestroyed=!1;constructor(){super(),this._config=h(de,{optional:!0})||new de,this._config.ariaLabelledBy&&this._ariaLabelledByQueue.push(this._config.ariaLabelledBy)}_addAriaLabelledBy(e){this._ariaLabelledByQueue.push(e),this._changeDetectorRef.markForCheck()}_removeAriaLabelledBy(e){let i=this._ariaLabelledByQueue.indexOf(e);i>-1&&(this._ariaLabelledByQueue.splice(i,1),this._changeDetectorRef.markForCheck())}_contentAttached(){this._initializeFocusTrap(),this._captureInitialFocus()}_captureInitialFocus(){this._trapFocus()}ngOnDestroy(){this._focusTrapped.complete(),this._isDestroyed=!0,this._restoreFocus()}attachComponentPortal(e){this._portalOutlet.hasAttached();let i=this._portalOutlet.attachComponentPortal(e);return this._contentAttached(),i}attachTemplatePortal(e){this._portalOutlet.hasAttached();let i=this._portalOutlet.attachTemplatePortal(e);return this._contentAttached(),i}attachDomPortal=e=>{this._portalOutlet.hasAttached();let i=this._portalOutlet.attachDomPortal(e);return this._contentAttached(),i};_recaptureFocus(){this._containsFocus()||this._trapFocus()}_forceFocus(e,i){this._interactivityChecker.isFocusable(e)||(e.tabIndex=-1,this._ngZone.runOutsideAngular(()=>{let a=()=>{l(),u(),e.removeAttribute(`tabindex`)},l=this._renderer.listen(e,`blur`,a),u=this._renderer.listen(e,`mousedown`,a)})),e.focus(i)}_focusByCssSelector(e,i){let a=this._elementRef.nativeElement.querySelector(e);a&&this._forceFocus(a,i)}_trapFocus(e){this._isDestroyed||vl(()=>{let i=this._elementRef.nativeElement;switch(this._config.autoFocus){case!1:case`dialog`:this._containsFocus()||i.focus(e);break;case!0:case`first-tabbable`:this._focusTrap?.focusInitialElement(e)||this._focusDialogContainer(e);break;case`first-heading`:this._focusByCssSelector(`h1, h2, h3, h4, h5, h6, [role="heading"]`,e);break;default:this._focusByCssSelector(this._config.autoFocus,e);break}this._focusTrapped.next()},{injector:this._injector})}_restoreFocus(){let e=this._config.restoreFocus,i=null;if(typeof e==`string`?i=this._document.querySelector(e):typeof e==`boolean`?i=e?this._elementFocusedBeforeDialogWasOpened:null:e&&(i=e),this._config.restoreFocus&&i&&typeof i.focus==`function`){let a=xS(),l=this._elementRef.nativeElement;(!a||a===this._document.body||a===l||l.contains(a))&&(this._focusMonitor?(this._focusMonitor.focusVia(i,this._closeInteractionType),this._closeInteractionType=null):i.focus())}this._focusTrap&&this._focusTrap.destroy()}_focusDialogContainer(e){this._elementRef.nativeElement.focus?.(e)}_containsFocus(){let e=this._elementRef.nativeElement,i=xS();return e===i||e.contains(i)}_initializeFocusTrap(){this._platform.isBrowser&&(this._focusTrap=this._focusTrapFactory.create(this._elementRef.nativeElement),this._document&&(this._elementFocusedBeforeDialogWasOpened=xS()))}static ɵfac=function(i){return new(i||t)};static ɵcmp=Vn({type:t,selectors:[[`cdk-dialog-container`]],viewQuery:function(i,a){if(i&1&&Fm(k$1,7),i&2){let l;Gw(l=zw())&&(a._portalOutlet=l.first)}},hostAttrs:[`tabindex`,`-1`,1,`cdk-dialog-container`],hostVars:6,hostBindings:function(i,a){i&2&&zl(`id`,a._config.id||null)(`role`,a._config.role)(`aria-modal`,a._config.ariaModal)(`aria-labelledby`,a._config.ariaLabel?null:a._ariaLabelledByQueue[0])(`aria-label`,a._config.ariaLabel)(`aria-describedby`,a._config.ariaDescribedBy||null)},features:[ym],decls:1,vars:0,consts:[[`cdkPortalOutlet`,``]],template:function(i,a){i&1&&Dm(0,ki,0,0,`ng-template`,0)},dependencies:[k$1],styles:[`.cdk-dialog-container {
  display: block;
  width: 100%;
  height: 100%;
  min-height: inherit;
  max-height: inherit;
}
`],encapsulation:2,changeDetection:1})}return t})();var Ge=class{overlayRef;config;componentInstance=null;componentRef=null;containerInstance;disableClose;closed=new L;backdropClick;keydownEvents;outsidePointerEvents;id;_detachSubscription;constructor(n,e){this.overlayRef=n,this.config=e,this.disableClose=e.disableClose,this.backdropClick=n.backdropClick(),this.keydownEvents=n.keydownEvents(),this.outsidePointerEvents=n.outsidePointerEvents(),this.id=e.id,this.keydownEvents.subscribe(i=>{i.keyCode===27&&!this.disableClose&&!xv(i)&&(i.preventDefault(),this.close(void 0,{focusOrigin:`keyboard`}))}),this.backdropClick.subscribe(()=>{!this.disableClose&&this._canClose()?this.close(void 0,{focusOrigin:`mouse`}):this.containerInstance._recaptureFocus?.()}),this._detachSubscription=n.detachments().subscribe(()=>{e.closeOnOverlayDetachments!==!1&&this.close()})}close(n,e){if(this._canClose(n)){let i=this.closed;this.containerInstance._closeInteractionType=e?.focusOrigin||`program`,this._detachSubscription.unsubscribe(),this.overlayRef.dispose(),i.next(n),i.complete(),this.componentInstance=this.containerInstance=null}}updatePosition(){return this.overlayRef.updatePosition(),this}updateSize(n=``,e=``){return this.overlayRef.updateSize({width:n,height:e}),this}addPanelClass(n){return this.overlayRef.addPanelClass(n),this}removePanelClass(n){return this.overlayRef.removePanelClass(n),this}_canClose(n){let e=this.config;return!!this.containerInstance&&(!e.closePredicate||e.closePredicate(n,e,this.componentInstance))}};var Ci=new v(`DialogScrollStrategy`,{providedIn:`root`,factory:()=>{let t=h(q);return()=>Vt$1(t)}});var Si=new v(`DialogData`);var Di=new v(`DefaultDialogConfig`);function Ti(t){let n=Tt(t),e=new fe$1;return{valueSignal:n,get value(){return n()},change:e,ngOnDestroy(){e.complete()}}}var Ht=(()=>{class t{_injector=h(q);_defaultOptions=h(Di,{optional:!0});_parentDialog=h(t,{optional:!0,skipSelf:!0});_overlayContainer=h(Wt$1);_idGenerator=h(Hd);_openDialogsAtThisLevel=[];_afterAllClosedAtThisLevel=new L;_afterOpenedAtThisLevel=new L;_ariaHiddenElements=new Map;_scrollStrategy=h(Ci);get openDialogs(){return this._parentDialog?this._parentDialog.openDialogs:this._openDialogsAtThisLevel}get afterOpened(){return this._parentDialog?this._parentDialog.afterOpened:this._afterOpenedAtThisLevel}afterAllClosed=vD(()=>this.openDialogs.length?this._getAfterAllClosed():this._getAfterAllClosed().pipe(_i$1(void 0)));open(e,i){i=l(l({},this._defaultOptions||new de),i),i.id=i.id||this._idGenerator.getId(`cdk-dialog-`),i.id&&this.getDialogById(i.id);let l$1=this._getOverlayConfig(i),u=ot(this._injector,l$1),m=new Ge(u,i),x=this._attachContainer(u,m,i);if(m.containerInstance=x,!this.openDialogs.length){let h=this._overlayContainer.getContainerElement();x._focusTrapped?x._focusTrapped.pipe(pt(1)).subscribe(()=>{this._hideNonDialogContentFromAssistiveTechnology(h)}):this._hideNonDialogContentFromAssistiveTechnology(h)}return this._attachDialogContent(e,m,x,i),this.openDialogs.push(m),m.closed.subscribe(()=>this._removeOpenDialog(m,!0)),this.afterOpened.next(m),m}closeAll(){Ft(this.openDialogs,e=>e.close())}getDialogById(e){return this.openDialogs.find(i=>i.id===e)}ngOnDestroy(){Ft(this._openDialogsAtThisLevel,e=>{e.config.closeOnDestroy===!1&&this._removeOpenDialog(e,!1)}),Ft(this._openDialogsAtThisLevel,e=>e.close()),this._afterAllClosedAtThisLevel.complete(),this._afterOpenedAtThisLevel.complete(),this._openDialogsAtThisLevel=[]}_getOverlayConfig(e){let i=new D({positionStrategy:e.positionStrategy||It().centerHorizontally().centerVertically(),scrollStrategy:e.scrollStrategy||this._scrollStrategy(),panelClass:e.panelClass,hasBackdrop:e.hasBackdrop,direction:e.direction,minWidth:e.minWidth,minHeight:e.minHeight,maxWidth:e.maxWidth,maxHeight:e.maxHeight,width:e.width,height:e.height,disposeOnNavigation:e.closeOnNavigation,disableAnimations:e.disableAnimations});return e.backdropClass&&(i.backdropClass=e.backdropClass),i}_attachContainer(e,i,a){let l=a.injector||a.viewContainerRef?.injector,u=[{provide:de,useValue:a},{provide:Ge,useValue:i},{provide:W,useValue:e}],m;a.container?typeof a.container==`function`?m=a.container:(m=a.container.type,u.push(...a.container.providers(a))):m=Bt;let x=new p(m,a.viewContainerRef,q.create({parent:l||this._injector,providers:u}));return e.attach(x).instance}_attachDialogContent(e,i,a,l$2){if(e instanceof _r){let u=this._createInjector(l$2,i,a,void 0),m={$implicit:l$2.data,dialogRef:i};l$2.templateContext&&(m=l(l({},m),typeof l$2.templateContext==`function`?l$2.templateContext():l$2.templateContext)),a.attachTemplatePortal(new s(e,null,m,u))}else{let u=this._createInjector(l$2,i,a,this._injector),m=a.attachComponentPortal(new p(e,l$2.viewContainerRef,u,null,l$2.bindings));i.componentRef=m,i.componentInstance=m.instance}}_createInjector(e,i,a,l){let u=e.injector||e.viewContainerRef?.injector,m=[{provide:Si,useValue:e.data},{provide:Ge,useValue:i}];return e.providers&&(typeof e.providers==`function`?m.push(...e.providers(i,e,a)):m.push(...e.providers)),e.direction&&(!u||!u.get(oM,null,{optional:!0}))&&m.push({provide:oM,useValue:Ti(e.direction)}),q.create({parent:u||l,providers:m})}_removeOpenDialog(e,i){let a=this.openDialogs.indexOf(e);a>-1&&(this.openDialogs.splice(a,1),this.openDialogs.length||(this._ariaHiddenElements.forEach((l,u)=>{l?u.setAttribute(`aria-hidden`,l):u.removeAttribute(`aria-hidden`)}),this._ariaHiddenElements.clear(),i&&this._getAfterAllClosed().next()))}_hideNonDialogContentFromAssistiveTechnology(e){if(e.parentElement){let i=e.parentElement.children;for(let a=i.length-1;a>-1;a--){let l=i[a];l!==e&&l.nodeName!==`SCRIPT`&&l.nodeName!==`STYLE`&&!l.hasAttribute(`aria-live`)&&!l.hasAttribute(`popover`)&&(this._ariaHiddenElements.set(l,l.getAttribute(`aria-hidden`)),l.setAttribute(`aria-hidden`,`true`))}}}_getAfterAllClosed(){let e=this._parentDialog;return e?e._getAfterAllClosed():this._afterAllClosedAtThisLevel}static ɵfac=function(i){return new(i||t)};static ɵprov=k({token:t,factory:t.ɵfac})}return t})();function Ft(t,n){let e=t.length;for(;e--;)n(t[e])}var Qn=(()=>{class t{static ɵfac=function(i){return new(i||t)};static ɵmod=xe({type:t});static ɵinj=Ee({providers:[Ht],imports:[qt$1,H,YS,H]})}return t})();function Ni(t,n){}var xt=class{viewContainerRef;injector;id;role=`dialog`;panelClass=``;hasBackdrop=!0;backdropClass=``;disableClose=!1;closePredicate;width=``;height=``;minWidth;minHeight;maxWidth;maxHeight;position;data=null;direction;ariaDescribedBy=null;ariaLabelledBy=null;ariaLabel=null;ariaModal=!1;autoFocus=`first-tabbable`;restoreFocus=!0;delayFocusTrap=!0;scrollStrategy;closeOnNavigation=!0;enterAnimationDuration;exitAnimationDuration;bindings};var Gt=`mdc-dialog--open`;var Zn=`mdc-dialog--opening`;var Jn=`mdc-dialog--closing`;var Mi=150;var Ai=75;var Ei=(()=>{class t extends Bt{_animationStateChanged=new fe$1;_animationsEnabled=!Ea();_actionSectionCount=0;_hostElement=this._elementRef.nativeElement;_enterAnimationDuration=this._animationsEnabled?ti(this._config.enterAnimationDuration)??Mi:0;_exitAnimationDuration=this._animationsEnabled?ti(this._config.exitAnimationDuration)??Ai:0;_animationTimer=null;_contentAttached(){super._contentAttached(),this._startOpenAnimation()}_startOpenAnimation(){this._animationStateChanged.emit({state:`opening`,totalTime:this._enterAnimationDuration}),this._animationsEnabled?(this._hostElement.style.setProperty(ei,`${this._enterAnimationDuration}ms`),this._requestAnimationFrame(()=>this._hostElement.classList.add(Zn,Gt)),this._waitForAnimationToComplete(this._enterAnimationDuration,this._finishDialogOpen)):(this._hostElement.classList.add(Gt),Promise.resolve().then(()=>this._finishDialogOpen()))}_startExitAnimation(){this._animationStateChanged.emit({state:`closing`,totalTime:this._exitAnimationDuration}),this._hostElement.classList.remove(Gt),this._animationsEnabled?(this._hostElement.style.setProperty(ei,`${this._exitAnimationDuration}ms`),this._requestAnimationFrame(()=>this._hostElement.classList.add(Jn)),this._waitForAnimationToComplete(this._exitAnimationDuration,this._finishDialogClose)):Promise.resolve().then(()=>this._finishDialogClose())}_updateActionSectionCount(e){this._actionSectionCount+=e,this._changeDetectorRef.markForCheck()}_finishDialogOpen=()=>{this._clearAnimationClasses(),this._openAnimationDone(this._enterAnimationDuration)};_finishDialogClose=()=>{this._clearAnimationClasses(),this._animationStateChanged.emit({state:`closed`,totalTime:this._exitAnimationDuration})};_clearAnimationClasses(){this._hostElement.classList.remove(Zn,Jn)}_waitForAnimationToComplete(e,i){this._animationTimer!==null&&clearTimeout(this._animationTimer),this._animationTimer=setTimeout(i,e)}_requestAnimationFrame(e){this._ngZone.runOutsideAngular(()=>{typeof requestAnimationFrame==`function`?requestAnimationFrame(e):e()})}_captureInitialFocus(){this._config.delayFocusTrap||this._trapFocus()}_openAnimationDone(e){this._config.delayFocusTrap&&this._trapFocus(),this._animationStateChanged.next({state:`opened`,totalTime:e})}ngOnDestroy(){super.ngOnDestroy(),this._animationTimer!==null&&clearTimeout(this._animationTimer)}attachComponentPortal(e){let i=super.attachComponentPortal(e);return i.location.nativeElement.classList.add(`mat-mdc-dialog-component-host`),i}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵcmp=Vn({type:t,selectors:[[`mat-dialog-container`]],hostAttrs:[`tabindex`,`-1`,1,`mat-mdc-dialog-container`,`mdc-dialog`],hostVars:10,hostBindings:function(i,a){i&2&&(Nm(`id`,a._config.id),zl(`aria-modal`,a._config.ariaModal)(`role`,a._config.role)(`aria-labelledby`,a._config.ariaLabel?null:a._ariaLabelledByQueue[0])(`aria-label`,a._config.ariaLabel)(`aria-describedby`,a._config.ariaDescribedBy||null),ta$1(`_mat-animation-noopable`,!a._animationsEnabled)(`mat-mdc-dialog-container-with-actions`,a._actionSectionCount>0))},features:[ym],decls:3,vars:0,consts:[[1,`mat-mdc-dialog-inner-container`,`mdc-dialog__container`],[1,`mat-mdc-dialog-surface`,`mdc-dialog__surface`],[`cdkPortalOutlet`,``]],template:function(i,a){i&1&&(js(0,`div`,0)(1,`div`,1),Dm(2,Ni,0,0,`ng-template`,2),ql()())},dependencies:[k$1],styles:[`.mat-mdc-dialog-container {
  width: 100%;
  height: 100%;
  display: block;
  box-sizing: border-box;
  max-height: inherit;
  min-height: inherit;
  min-width: inherit;
  max-width: inherit;
  outline: 0;
}

.cdk-overlay-pane.mat-mdc-dialog-panel {
  max-width: var(--%NS%mat-dialog-container-max-width, 560px);
  min-width: var(--%NS%mat-dialog-container-min-width, 280px);
}
@media (max-width: 599px) {
  .cdk-overlay-pane.mat-mdc-dialog-panel {
    max-width: var(--%NS%mat-dialog-container-small-max-width, calc(100vw - 32px));
  }
}

.mat-mdc-dialog-inner-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  box-sizing: border-box;
  height: 100%;
  opacity: 0;
  transition: opacity linear var(--%NS%mat-dialog-transition-duration, 0ms);
  max-height: inherit;
  min-height: inherit;
  min-width: inherit;
  max-width: inherit;
}
.mdc-dialog--closing .mat-mdc-dialog-inner-container {
  transition: opacity 75ms linear;
  transform: none;
}
.mdc-dialog--open .mat-mdc-dialog-inner-container {
  opacity: 1;
}
._mat-animation-noopable .mat-mdc-dialog-inner-container {
  transition: none;
}

.mat-mdc-dialog-surface {
  display: flex;
  flex-direction: column;
  flex-grow: 0;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  position: relative;
  overflow-y: auto;
  outline: 0;
  transform: scale(0.8);
  transition: transform var(--%NS%mat-dialog-transition-duration, 0ms) cubic-bezier(0, 0, 0.2, 1);
  max-height: inherit;
  min-height: inherit;
  min-width: inherit;
  max-width: inherit;
  box-shadow: var(--%NS%mat-dialog-container-elevation-shadow, none);
  border-radius: var(--%NS%mat-dialog-container-shape, var(--%NS%mat-sys-corner-extra-large, 4px));
  background-color: var(--%NS%mat-dialog-container-color, var(--%NS%mat-sys-surface, white));
}
[dir=rtl] .mat-mdc-dialog-surface {
  text-align: right;
}
.mdc-dialog--open .mat-mdc-dialog-surface, .mdc-dialog--closing .mat-mdc-dialog-surface {
  transform: none;
}
._mat-animation-noopable .mat-mdc-dialog-surface {
  transition: none;
}
.mat-mdc-dialog-surface::before {
  position: absolute;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border: 2px solid transparent;
  border-radius: inherit;
  content: "";
  pointer-events: none;
}

.mat-mdc-dialog-title {
  display: block;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  margin: 0 0 1px;
  padding: var(--%NS%mat-dialog-headline-padding, 6px 24px 13px);
}
.mat-mdc-dialog-title::before {
  display: inline-block;
  width: 0;
  height: 40px;
  content: "";
  vertical-align: 0;
}
[dir=rtl] .mat-mdc-dialog-title {
  text-align: right;
}
.mat-mdc-dialog-container .mat-mdc-dialog-title {
  color: var(--%NS%mat-dialog-subhead-color, var(--%NS%mat-sys-on-surface, rgba(0, 0, 0, 0.87)));
  font-family: var(--%NS%mat-dialog-subhead-font, var(--%NS%mat-sys-headline-small-font, inherit));
  line-height: var(--%NS%mat-dialog-subhead-line-height, var(--%NS%mat-sys-headline-small-line-height, 1.5rem));
  font-size: var(--%NS%mat-dialog-subhead-size, var(--%NS%mat-sys-headline-small-size, 1rem));
  font-weight: var(--%NS%mat-dialog-subhead-weight, var(--%NS%mat-sys-headline-small-weight, 400));
  letter-spacing: var(--%NS%mat-dialog-subhead-tracking, var(--%NS%mat-sys-headline-small-tracking, 0.03125em));
}

.mat-mdc-dialog-content {
  display: block;
  flex-grow: 1;
  box-sizing: border-box;
  margin: 0;
  overflow: auto;
  max-height: 65vh;
}
.mat-mdc-dialog-content > :first-child {
  margin-top: 0;
}
.mat-mdc-dialog-content > :last-child {
  margin-bottom: 0;
}
.mat-mdc-dialog-container .mat-mdc-dialog-content {
  color: var(--%NS%mat-dialog-supporting-text-color, var(--%NS%mat-sys-on-surface-variant, rgba(0, 0, 0, 0.6)));
  font-family: var(--%NS%mat-dialog-supporting-text-font, var(--%NS%mat-sys-body-medium-font, inherit));
  line-height: var(--%NS%mat-dialog-supporting-text-line-height, var(--%NS%mat-sys-body-medium-line-height, 1.5rem));
  font-size: var(--%NS%mat-dialog-supporting-text-size, var(--%NS%mat-sys-body-medium-size, 1rem));
  font-weight: var(--%NS%mat-dialog-supporting-text-weight, var(--%NS%mat-sys-body-medium-weight, 400));
  letter-spacing: var(--%NS%mat-dialog-supporting-text-tracking, var(--%NS%mat-sys-body-medium-tracking, 0.03125em));
}
.mat-mdc-dialog-container .mat-mdc-dialog-content {
  padding: var(--%NS%mat-dialog-content-padding, 20px 24px);
}
.mat-mdc-dialog-container-with-actions .mat-mdc-dialog-content {
  padding: var(--%NS%mat-dialog-with-actions-content-padding, 20px 24px 0);
}
.mat-mdc-dialog-container .mat-mdc-dialog-title + .mat-mdc-dialog-content {
  padding-top: 0;
}

.mat-mdc-dialog-actions {
  display: flex;
  position: relative;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  box-sizing: border-box;
  min-height: 52px;
  margin: 0;
  border-top: 1px solid transparent;
  padding: var(--%NS%mat-dialog-actions-padding, 16px 24px);
  justify-content: var(--%NS%mat-dialog-actions-alignment, flex-end);
}
@media (forced-colors: active) {
  .mat-mdc-dialog-actions {
    border-top-color: CanvasText;
  }
}
.mat-mdc-dialog-actions.mat-mdc-dialog-actions-align-start, .mat-mdc-dialog-actions[align=start] {
  justify-content: start;
}
.mat-mdc-dialog-actions.mat-mdc-dialog-actions-align-center, .mat-mdc-dialog-actions[align=center] {
  justify-content: center;
}
.mat-mdc-dialog-actions.mat-mdc-dialog-actions-align-end, .mat-mdc-dialog-actions[align=end] {
  justify-content: flex-end;
}
.mat-mdc-dialog-actions .mat-button-base + .mat-button-base,
.mat-mdc-dialog-actions .mat-mdc-button-base + .mat-mdc-button-base {
  margin-left: 8px;
}
[dir=rtl] .mat-mdc-dialog-actions .mat-button-base + .mat-button-base,
[dir=rtl] .mat-mdc-dialog-actions .mat-mdc-button-base + .mat-mdc-button-base {
  margin-left: 0;
  margin-right: 8px;
}

.mat-mdc-dialog-component-host {
  display: contents;
}
`],encapsulation:2,changeDetection:1})}return t})();var ei=`--mat-dialog-transition-duration`;function ti(t){return t==null?null:typeof t==`number`?t:t.endsWith(`ms`)?Ld(t.substring(0,t.length-2)):t.endsWith(`s`)?Ld(t.substring(0,t.length-1))*1e3:t===`0`?0:null}var vt=(function(t){return t[t.OPEN=0]=`OPEN`,t[t.CLOSING=1]=`CLOSING`,t[t.CLOSED=2]=`CLOSED`,t})(vt||{});var ee=class{_ref;_config;_containerInstance;componentInstance;componentRef=null;disableClose;id;_afterOpened=new Hr(1);_beforeClosed=new Hr(1);_result;_closeFallbackTimeout;_state=vt.OPEN;_closeInteractionType;constructor(n,e,i){this._ref=n,this._config=e,this._containerInstance=i,this.disableClose=e.disableClose,this.id=n.id,n.addPanelClass(`mat-mdc-dialog-panel`),i._animationStateChanged.pipe(be(a=>a.state===`opened`),pt(1)).subscribe(()=>{this._afterOpened.next(),this._afterOpened.complete()}),i._animationStateChanged.pipe(be(a=>a.state===`closed`),pt(1)).subscribe(()=>{clearTimeout(this._closeFallbackTimeout),this._finishDialogClose()}),n.overlayRef.detachments().subscribe(()=>{this._beforeClosed.next(this._result),this._beforeClosed.complete(),this._finishDialogClose()}),ED(this.backdropClick(),this.keydownEvents().pipe(be(a=>a.keyCode===27&&!this.disableClose&&!xv(a)))).subscribe(a=>{this.disableClose||(a.preventDefault(),ni(this,a.type===`keydown`?`keyboard`:`mouse`))})}close(n){let e=this._config.closePredicate;e&&!e(n,this._config,this.componentInstance)||(this._result=n,this._containerInstance._animationStateChanged.pipe(be(i=>i.state===`closing`),pt(1)).subscribe(i=>{this._beforeClosed.next(n),this._beforeClosed.complete(),this._ref.overlayRef.detachBackdrop(),this._closeFallbackTimeout=setTimeout(()=>this._finishDialogClose(),i.totalTime+100)}),this._state=vt.CLOSING,this._containerInstance._startExitAnimation())}afterOpened(){return this._afterOpened}afterClosed(){return this._ref.closed}beforeClosed(){return this._beforeClosed}backdropClick(){return this._ref.backdropClick}keydownEvents(){return this._ref.keydownEvents}updatePosition(n){let e=this._ref.config.positionStrategy;return n&&(n.left||n.right)?n.left?e.left(n.left):e.right(n.right):e.centerHorizontally(),n&&(n.top||n.bottom)?n.top?e.top(n.top):e.bottom(n.bottom):e.centerVertically(),this._ref.updatePosition(),this}updateSize(n=``,e=``){return this._ref.updateSize(n,e),this}addPanelClass(n){return this._ref.addPanelClass(n),this}removePanelClass(n){return this._ref.removePanelClass(n),this}getState(){return this._state}_finishDialogClose(){this._state=vt.CLOSED,this._ref.close(this._result,{focusOrigin:this._closeInteractionType}),this.componentInstance=null}};function ni(t,n,e){return t._closeInteractionType=n,t.close(e)}var fe=new v(`MatMdcDialogData`);var Pi=new v(`mat-mdc-dialog-default-options`);var Ii=new v(`mat-mdc-dialog-scroll-strategy`,{providedIn:`root`,factory:()=>{let t=h(q);return()=>Vt$1(t)}});var ze=(()=>{class t{_defaultOptions=h(Pi,{optional:!0});_scrollStrategy=h(Ii);_parentDialog=h(t,{optional:!0,skipSelf:!0});_idGenerator=h(Hd);_injector=h(q);_dialog=h(Ht);_animationsDisabled=Ea();_openDialogsAtThisLevel=[];_afterAllClosedAtThisLevel=new L;_afterOpenedAtThisLevel=new L;dialogConfigClass=xt;_dialogRefConstructor;_dialogContainerType;_dialogDataToken;get openDialogs(){return this._parentDialog?this._parentDialog.openDialogs:this._openDialogsAtThisLevel}get afterOpened(){return this._parentDialog?this._parentDialog.afterOpened:this._afterOpenedAtThisLevel}_getAfterAllClosed(){let e=this._parentDialog;return e?e._getAfterAllClosed():this._afterAllClosedAtThisLevel}afterAllClosed=vD(()=>this.openDialogs.length?this._getAfterAllClosed():this._getAfterAllClosed().pipe(_i$1(void 0)));constructor(){this._dialogRefConstructor=ee,this._dialogContainerType=Ei,this._dialogDataToken=fe}open(e,i){let a;i=l(l({},this._defaultOptions||new xt),i),i.id=i.id||this._idGenerator.getId(`mat-mdc-dialog-`),i.scrollStrategy=i.scrollStrategy||this._scrollStrategy();let l$3=this._dialog.open(e,m(l({},i),{positionStrategy:It(this._injector).centerHorizontally().centerVertically(),disableClose:!0,closePredicate:void 0,closeOnDestroy:!1,closeOnOverlayDetachments:!1,disableAnimations:this._animationsDisabled||i.enterAnimationDuration?.toLocaleString()===`0`||i.exitAnimationDuration?.toString()===`0`,container:{type:this._dialogContainerType,providers:()=>[{provide:this.dialogConfigClass,useValue:i},{provide:de,useValue:i}]},templateContext:()=>({dialogRef:a}),providers:(u,m,x)=>(a=new this._dialogRefConstructor(u,i,x),a.updatePosition(i?.position),[{provide:this._dialogContainerType,useValue:x},{provide:this._dialogDataToken,useValue:m.data},{provide:this._dialogRefConstructor,useValue:a}])}));return a.componentRef=l$3.componentRef,a.componentInstance=l$3.componentInstance,this.openDialogs.push(a),this.afterOpened.next(a),a.afterClosed().subscribe(()=>{let u=this.openDialogs.indexOf(a);u>-1&&(this.openDialogs.splice(u,1),this.openDialogs.length||this._getAfterAllClosed().next())}),a}closeAll(){this._closeDialogs(this.openDialogs)}getDialogById(e){return this.openDialogs.find(i=>i.id===e)}ngOnDestroy(){this._closeDialogs(this._openDialogsAtThisLevel),this._afterAllClosedAtThisLevel.complete(),this._afterOpenedAtThisLevel.complete()}_closeDialogs(e){let i=e.length;for(;i--;)e[i].close()}static ɵfac=function(i){return new(i||t)};static ɵprov=k({token:t,factory:t.ɵfac})}return t})();var De=(()=>{class t{dialogRef=h(ee,{optional:!0});_elementRef=h(ie);_dialog=h(ze);ariaLabel;type=`button`;dialogResult;_matDialogClose;ngOnInit(){this.dialogRef||(this.dialogRef=ai(this._elementRef,this._dialog.openDialogs))}ngOnChanges(e){let i=e._matDialogClose;i&&(this.dialogResult=i.currentValue)}_onButtonClick(e){this._elementRef.nativeElement.getAttribute(`aria-disabled`)!==`true`&&ni(this.dialogRef,e.screenX===0&&e.screenY===0?`keyboard`:`mouse`,this.dialogResult)}static ɵfac=function(i){return new(i||t)};static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-close`,``],[``,`matDialogClose`,``]],hostVars:2,hostBindings:function(i,a){i&1&&xm(`click`,function(u){return a._onButtonClick(u)}),i&2&&zl(`aria-label`,a.ariaLabel||null)(`type`,a.type)},inputs:{ariaLabel:[0,`aria-label`,`ariaLabel`],type:`type`,dialogResult:[0,`mat-dialog-close`,`dialogResult`],_matDialogClose:[0,`matDialogClose`,`_matDialogClose`]},exportAs:[`matDialogClose`],features:[Vs]})}return t})();var ii=(()=>{class t{_dialogRef=h(ee,{optional:!0});_elementRef=h(ie);_dialog=h(ze);ngOnInit(){this._dialogRef||(this._dialogRef=ai(this._elementRef,this._dialog.openDialogs)),this._dialogRef&&Promise.resolve().then(()=>{this._onAdd()})}ngOnDestroy(){this._dialogRef?._containerInstance&&Promise.resolve().then(()=>{this._onRemove()})}static ɵfac=function(i){return new(i||t)};static ɵdir=Re({type:t})}return t})();var Te=(()=>{class t extends ii{id=h(Hd).getId(`mat-mdc-dialog-title-`);_onAdd(){this._dialogRef._containerInstance?._addAriaLabelledBy?.(this.id)}_onRemove(){this._dialogRef?._containerInstance?._removeAriaLabelledBy?.(this.id)}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-title`,``],[``,`matDialogTitle`,``]],hostAttrs:[1,`mat-mdc-dialog-title`,`mdc-dialog__title`],hostVars:1,hostBindings:function(i,a){i&2&&Nm(`id`,a.id)},inputs:{id:`id`},exportAs:[`matDialogTitle`],features:[ym]})}return t})();var Ne=(()=>{class t{static ɵfac=function(i){return new(i||t)};static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-content`,``],[`mat-dialog-content`],[``,`matDialogContent`,``]],hostAttrs:[1,`mat-mdc-dialog-content`,`mdc-dialog__content`],features:[uw([Ie])]})}return t})();var Me=(()=>{class t extends ii{align;_onAdd(){this._dialogRef._containerInstance?._updateActionSectionCount?.(1)}_onRemove(){this._dialogRef._containerInstance?._updateActionSectionCount?.(-1)}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-actions`,``],[`mat-dialog-actions`],[``,`matDialogActions`,``]],hostAttrs:[1,`mat-mdc-dialog-actions`,`mdc-dialog__actions`],hostVars:6,hostBindings:function(i,a){i&2&&ta$1(`mat-mdc-dialog-actions-align-start`,a.align===`start`)(`mat-mdc-dialog-actions-align-center`,a.align===`center`)(`mat-mdc-dialog-actions-align-end`,a.align===`end`)},inputs:{align:`align`},features:[ym]})}return t})();function ai(t,n){let e=t.nativeElement.parentElement;for(;e&&!e.classList.contains(`mat-mdc-dialog-container`);)e=e.parentElement;return e?n.find(i=>i.id===e.id):null}var ce=(()=>{class t{static ɵfac=function(i){return new(i||t)};static ɵmod=xe({type:t});static ɵinj=Ee({providers:[ze],imports:[Qn,qt$1,H,Uv]})}return t})();var Oi=[`switch`];var Ri=[`*`];function Li(t,n){t&1&&(js(0,`span`,11),Ap(),js(1,`svg`,13),Cm(2,`path`,14),ql(),js(3,`svg`,15),Cm(4,`path`,16),ql()())}var Fi=new v(`mat-slide-toggle-default-options`,{providedIn:`root`,factory:()=>({disableToggleValue:!1,hideIcon:!1,disabledInteractive:!1})});var wt=class{source;checked;constructor(n,e){this.source=n,this.checked=e}};var Vt=(()=>{class t{_elementRef=h(ie);_focusMonitor=h(vv);_changeDetectorRef=h(_y);defaults=h(Fi);_onChange=e=>{};_onTouched=()=>{};_validatorOnChange=()=>{};_uniqueId;_checked=!1;_createChangeEvent(e){return new wt(this,e)}_labelId;get buttonId(){return`${this.id||this._uniqueId}-button`}_switchElement;focus(){this._switchElement.nativeElement.focus()}_noopAnimations=Ea();_focused=!1;name=null;id;labelPosition=`after`;ariaLabel=null;ariaLabelledby=null;ariaDescribedby;required=!1;color;disabled=!1;fullWidth=!1;disableRipple=!1;tabIndex=0;get checked(){return this._checked}set checked(e){this._checked=e,this._changeDetectorRef.markForCheck()}hideIcon;disabledInteractive;change=new fe$1;toggleChange=new fe$1;get inputId(){return`${this.id||this._uniqueId}-input`}constructor(){h(qn).load(dG);let e=h(new ay(`tabindex`),{optional:!0}),i=this.defaults;this.tabIndex=e==null?0:parseInt(e)||0,this.color=i.color||`accent`,this.id=this._uniqueId=h(Hd).getId(`mat-mdc-slide-toggle-`),this.hideIcon=i.hideIcon??!1,this.disabledInteractive=i.disabledInteractive??!1,this._labelId=this._uniqueId+`-label`}ngAfterContentInit(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{e===`keyboard`||e===`program`?(this._focused=!0,this._changeDetectorRef.markForCheck()):e||Promise.resolve().then(()=>{this._focused=!1,this._onTouched(),this._changeDetectorRef.markForCheck()})})}ngOnChanges(e){e.required&&this._validatorOnChange()}ngOnDestroy(){this._focusMonitor.stopMonitoring(this._elementRef)}writeValue(e){this.checked=!!e}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}validate(e){return this.required&&e.value!==!0?{required:!0}:null}registerOnValidatorChange(e){this._validatorOnChange=e}setDisabledState(e){this.disabled=e,this._changeDetectorRef.markForCheck()}toggle(){this.checked=!this.checked,this._onChange(this.checked)}_emitChangeEvent(){this._onChange(this.checked),this.change.emit(this._createChangeEvent(this.checked))}_handleClick(){this.disabled||(this.toggleChange.emit(),this.defaults.disableToggleValue||(this.checked=!this.checked,this._onChange(this.checked),this.change.emit(new wt(this,this.checked))))}_getAriaLabelledBy(){return this.ariaLabelledby?this.ariaLabelledby:this.ariaLabel?null:this._labelId}static ɵfac=function(i){return new(i||t)};static ɵcmp=Vn({type:t,selectors:[[`mat-slide-toggle`]],viewQuery:function(i,a){if(i&1&&Fm(Oi,5),i&2){let l;Gw(l=zw())&&(a._switchElement=l.first)}},hostAttrs:[1,`mat-mdc-slide-toggle`],hostVars:15,hostBindings:function(i,a){i&2&&(Nm(`id`,a.id),zl(`tabindex`,null)(`aria-label`,null)(`name`,null)(`aria-labelledby`,null),oC(a.color?`mat-`+a.color:``),ta$1(`mat-mdc-slide-toggle-focused`,a._focused)(`mat-mdc-slide-toggle-checked`,a.checked)(`mat-slide-toggle-full-width`,a.fullWidth)(`_mat-animation-noopable`,a._noopAnimations))},inputs:{name:`name`,id:`id`,labelPosition:`labelPosition`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaLabelledby:[0,`aria-labelledby`,`ariaLabelledby`],ariaDescribedby:[0,`aria-describedby`,`ariaDescribedby`],required:[2,`required`,`required`,ia$1],color:`color`,disabled:[2,`disabled`,`disabled`,ia$1],fullWidth:[2,`fullWidth`,`fullWidth`,ia$1],disableRipple:[2,`disableRipple`,`disableRipple`,ia$1],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:pT(e)],checked:[2,`checked`,`checked`,ia$1],hideIcon:[2,`hideIcon`,`hideIcon`,ia$1],disabledInteractive:[2,`disabledInteractive`,`disabledInteractive`,ia$1]},outputs:{change:`change`,toggleChange:`toggleChange`},exportAs:[`matSlideToggle`],features:[Jm([{provide:xe$1,useExisting:$i$1(()=>t),multi:!0},{provide:q$1,useExisting:t,multi:!0}]),Vs],ngContentSelectors:Ri,decls:14,vars:27,consts:[[`switch`,``],[`mat-internal-form-field`,``,3,`labelPosition`],[`role`,`switch`,`type`,`button`,1,`mdc-switch`,3,`click`,`tabIndex`,`disabled`],[1,`mat-mdc-slide-toggle-touch-target`],[1,`mdc-switch__track`],[1,`mdc-switch__handle-track`],[1,`mdc-switch__handle`],[1,`mdc-switch__shadow`],[1,`mdc-elevation-overlay`],[1,`mdc-switch__ripple`],[`mat-ripple`,``,1,`mat-mdc-slide-toggle-ripple`,`mat-focus-indicator`,3,`matRippleTrigger`,`matRippleDisabled`,`matRippleCentered`],[1,`mdc-switch__icons`],[1,`mdc-label`,3,`click`,`for`],[`viewBox`,`0 0 24 24`,`aria-hidden`,`true`,1,`mdc-switch__icon`,`mdc-switch__icon--on`],[`d`,`M19.69,5.23L8.96,15.96l-4.23-4.23L2.96,13.5l6,6L21.46,7L19.69,5.23z`],[`viewBox`,`0 0 24 24`,`aria-hidden`,`true`,1,`mdc-switch__icon`,`mdc-switch__icon--off`],[`d`,`M20 13H4v-2h16v2z`]],template:function(i,a){if(i&1&&(Hw(),js(0,`div`,1)(1,`button`,2,0),xm(`click`,function(){return a._handleClick()}),Cm(3,`div`,3)(4,`span`,4),js(5,`span`,5)(6,`span`,6)(7,`span`,7),Cm(8,`span`,8),ql(),js(9,`span`,9),Cm(10,`span`,10),ql(),ww(11,Li,5,0,`span`,11),ql()()(),js(12,`label`,12),xm(`click`,function(u){return u.stopPropagation()}),Uw(13),ql()()),i&2){let l=qw(2);wm(`labelPosition`,a.labelPosition),SI(),ta$1(`mdc-switch--selected`,a.checked)(`mdc-switch--unselected`,!a.checked)(`mdc-switch--checked`,a.checked)(`mdc-switch--disabled`,a.disabled)(`mat-mdc-slide-toggle-disabled-interactive`,a.disabledInteractive),wm(`tabIndex`,a.disabled&&!a.disabledInteractive?-1:a.tabIndex)(`disabled`,a.disabled&&!a.disabledInteractive),zl(`id`,a.buttonId)(`name`,a.name)(`aria-label`,a.ariaLabel)(`aria-labelledby`,a._getAriaLabelledBy())(`aria-describedby`,a.ariaDescribedby)(`aria-required`,a.required||null)(`aria-checked`,a.checked)(`aria-disabled`,a.disabled&&a.disabledInteractive?`true`:null),SI(9),wm(`matRippleTrigger`,l)(`matRippleDisabled`,a.disableRipple||a.disabled)(`matRippleCentered`,!0),SI(),Cw(a.hideIcon?-1:11),SI(),wm(`for`,a.buttonId),zl(`id`,a._labelId)}},dependencies:[cG,m$1],styles:[`.mdc-switch {
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
`],encapsulation:2})}return t})();var oi=(()=>{class t{static ɵfac=function(i){return new(i||t)};static ɵmod=xe({type:t});static ɵinj=Ee({imports:[Vt,Uv]})}return t})();var Hi={app:{band:`application`,rank:0,lane:0,order:0},ui:{band:`application`,rank:1,lane:0,order:0},"overlay-source":{band:`application`,rank:1,lane:1,order:0},"local-tools":{band:`application`,rank:1,lane:2,order:0},openclaw:{band:`application`,rank:0,lane:3,order:0},"session-bridge":{band:`reach`,rank:0,lane:0,order:0},"overlay-packer":{band:`reach`,rank:0,lane:1,order:0},"local-mcp-host":{band:`reach`,rank:0,lane:2,order:0},"speech-client":{band:`reach`,rank:0,lane:3,order:0},"mtls-enroller":{band:`reach`,rank:0,lane:4,order:0},engine:{band:`ao`,rank:0,lane:0,order:0},endpoint:{band:`ao`,rank:0,lane:1,order:0},"web-ui":{band:`ao`,rank:0,lane:5,order:0},planner:{band:`ao`,rank:1,lane:0,order:0},catalog:{band:`ao`,rank:2,lane:0,order:0},"model-backend":{band:`ao`,rank:2,lane:1,order:0},"model-runtime":{band:`ao`,rank:2,lane:2,order:0},"execution-backend":{band:`ao`,rank:3,lane:0,order:0},worker:{band:`ao`,rank:3,lane:1,order:0},"mcp-sidecar":{band:`ao`,rank:3,lane:2,order:0},platform:{band:`ao`,rank:4,lane:0,order:0},storage:{band:`ao`,rank:4,lane:1,order:0}};var Kt={"engine/session-overlay":1,"engine/mcp-tunnel":2,"engine/direct-agent":3,"engine/hello-speech":4,"engine/mtls-enrol":4,"speech/stt":3,"speech/tts":4};var jt={"catalog/agents":0,"catalog/mcp":1,"catalog/skills":2};var Wt={"models/backends":3,"models/ollama":4,"models/remote":5};var Yt=140;var ri=52;var Gi=Yt*3+104;var zi=52;var Ut=64;var kt=28;var $t=22;var Ae=32;var Vi=56;var Ve=8;var Ki=8;var ji=14;var qt={ui:0,"overlay-source":1,"local-tools":2};function Wi(t){return[...new Set(t.map(n=>n.trim()).filter(Boolean))].sort()}var li={application:`1 · Application`,reach:`2 · AO Reach`,ao:`3 · Agentic Orchestration`};function $i(t,n){let e=Hi[t.kind]||{band:t.band||`ao`,rank:0,lane:Ve-1,order:99},i=e.lane,a=e.order,l=e.rank;if(t.band===`application`&&t.appId&&n){let u=n.get(t.appId)??0;if(t.kind===`app`)return{band:`application`,rank:u,lane:0,order:0};if(qt[t.kind]!=null)return{band:`application`,rank:u+1,lane:qt[t.kind],order:qt[t.kind]}}return t.kind===`openclaw`&&n&&n.size?{band:`application`,rank:Math.max(...n.values())+2,lane:3,order:0}:(t.kind===`endpoint`&&Kt[t.id]!=null&&(i=Kt[t.id]),t.kind===`catalog`&&jt[t.id]!=null&&(i=jt[t.id],a=jt[t.id]),(t.kind===`model-runtime`||t.kind===`model-backend`)&&(Wt[t.id]!=null?(i=Wt[t.id],a=Wt[t.id]):t.kind===`model-backend`&&(i=3)),t.id===`speech/stt`||t.id===`speech/tts`?{band:`ao`,rank:0,lane:Kt[t.id]??3,order:10}:{band:t.band||e.band,rank:l,lane:i,order:a})}function qi(t){return t.instrumented===!1&&t.status===`healthy`||!t.instrumented&&t.status===`healthy`?`unknown`:t.status||`unknown`}function Yi(t,n){return{x:t.x-n,y:t.y-n,w:t.width+n*2,h:t.height+n*2,id:t.id}}function Ui(t,n,e){let i=Math.min(t.x,n.x),a=Math.max(t.x,n.x),l=Math.min(t.y,n.y),u=Math.max(t.y,n.y),m=e.x+e.w,x=e.y+e.h;return Math.abs(t.x-n.x)<.5?t.x>=e.x&&t.x<=m&&u>=e.y&&l<=x:Math.abs(t.y-n.y)<.5?t.y>=e.y&&t.y<=x&&a>=e.x&&i<=m:!1}function Xi(t,n){for(let e=0;e<t.length-1;e++)for(let i of n)if(Ui(t[e],t[e+1],i))return!0;return!1}function Qi(t){if(t.length<3)return t;let n=[t[0]];for(let e=1;e<t.length-1;e++){let i=n[n.length-1],a=t[e],l=t[e+1];Math.abs(i.x-a.x)<.5&&Math.abs(a.x-l.x)<.5||Math.abs(i.y-a.y)<.5&&Math.abs(a.y-l.y)<.5||n.push(a)}return n.push(t[t.length-1]),n}function si(t){return Qi(t).map((e,i)=>`${i===0?`M`:`L`} ${di(e.x)} ${di(e.y)}`).join(` `)}function di(t){return Math.round(t*10)/10}function Xt(t,n){let e=t.x+t.width/2,i=t.y+t.height/2;switch(n){case`top`:return{x:e,y:t.y};case`bottom`:return{x:e,y:t.y+t.height};case`left`:return{x:t.x,y:i};case`right`:return{x:t.x+t.width,y:i}}}function ci(t,n,e=ji){let i=Xt(t,n);switch(n){case`top`:return{x:i.x,y:i.y-e};case`bottom`:return{x:i.x,y:i.y+e};case`left`:return{x:i.x-e,y:i.y};case`right`:return{x:i.x+e,y:i.y}}}function Zi(t,n,e){if(e===`bypass`)return{fromSide:`right`,toSide:`right`};let i=t.x+t.width/2,a=t.y+t.height/2,l=n.x+n.width/2,m=n.y+n.height/2-a,x=l-i;return Math.abs(m)>=Math.abs(x)*.75?m>=0?{fromSide:`bottom`,toSide:`top`}:{fromSide:`top`,toSide:`bottom`}:x>=0?{fromSide:`right`,toSide:`left`}:{fromSide:`left`,toSide:`right`}}function Ji(t,n,e,i,a){let{fromSide:l,toSide:u}=Zi(t,n,e),m=Xt(t,l),x=Xt(n,u),h=ci(t,l),c=ci(n,u);e===`reverse-tunnel`&&(h={x:h.x+16,y:h.y},c={x:c.x+16,y:c.y});let F=i.filter(v=>v.id!==t.id&&v.id!==n.id).map(v=>Yi(v,Ki)),G=Ae/2,I=a-Ae/2,V=(h.y+c.y)/2,z=(h.x+c.x)/2,X=Math.min(h.y,c.y)-Math.max(12,Ut/4),Q=Math.max(h.y,c.y)+Math.max(12,Ut/4),g=[];e===`bypass`&&g.push([h,{x:I,y:h.y},{x:I,y:c.y},c]),Math.abs(h.x-c.x)<.5&&g.push([h,c]),Math.abs(h.y-c.y)<.5&&g.push([h,c]),g.push([h,{x:h.x,y:V},{x:c.x,y:V},c]),g.push([h,{x:z,y:h.y},{x:z,y:c.y},c]),g.push([h,{x:h.x,y:Q},{x:c.x,y:Q},c]),g.push([h,{x:h.x,y:X},{x:c.x,y:X},c]),g.push([h,{x:G,y:h.y},{x:G,y:c.y},c]),g.push([h,{x:I,y:h.y},{x:I,y:c.y},c]),g.push([h,{x:h.x,y:Q},{x:I,y:Q},{x:I,y:X},{x:c.x,y:X},c]),g.push([h,{x:h.x,y:X},{x:G,y:X},{x:G,y:Q},{x:c.x,y:Q},c]);for(let v of g)if(!Xi(v,F))return si([m,...v,x]);return si([m,h,{x:I,y:h.y},{x:I,y:c.y},c,x])}function mi(t,n,e){let i=e?.showNotDeployed??!1,a=t.filter(g=>i||g.deployed!==!1),l$4=Wi(a.filter(g=>g.band===`application`&&g.appId).map(g=>String(g.appId))),u=new Map(l$4.map((g,v)=>[g,v*2])),m$2=a.map(g=>{let v=$i(g,u);return l({node:g},v)});m$2.sort((g,v)=>{let j={application:0,reach:1,ao:2};return j[g.band]!==j[v.band]?j[g.band]-j[v.band]:g.rank!==v.rank?g.rank-v.rank:g.lane!==v.lane?g.lane-v.lane:g.order!==v.order?g.order-v.order:g.node.id.localeCompare(v.node.id)});let x=Yt+zi,c=Ve*x+Vi+Ae*2,F=new Map;for(let g of m$2){let v=`${g.band}:${g.rank}`;F.has(v)||F.set(v,[]),F.get(v).push(g)}let G=[`application`,`reach`,`ao`],I=[],V=[],z=Ae;for(let g of G){let v=[...F.entries()].filter(([Ie])=>Ie.startsWith(`${g}:`)).sort((Ie,te)=>Number(Ie[0].split(`:`)[1])-Number(te[0].split(`:`)[1]));if(v.length===0){V.push({id:g,label:li[g],y:z,height:kt+$t+40}),z+=kt+$t+40+16;continue}let j=z;z+=kt+$t;for(let[,Ie]of v){let te=new Set;for(let ye of Ie){let ne=Math.max(0,Math.min(Ve-1,ye.lane));for(;te.has(ne)&&ne<Ve-1;)ne+=1;if(te.has(ne)){for(let $e=0;$e<Ve;$e++)if(!te.has($e)){ne=$e;break}}te.add(ne);let Zt=ye.node.kind===`app`,xi=Zt?Gi:Yt;Zt&&(te.add(1),te.add(2));let wi=Ae+ne*x;I.push(m(l({},ye.node),{x:wi,y:z,width:xi,height:ri,lane:ne,rank:ye.rank,order:ye.order,displayStatus:qi(ye.node)}))}z+=ri+Ut}let Et=z-j+kt/2;V.push({id:g,label:li[g],y:j,height:Et}),z+=16}let X=new Map(I.map(g=>[g.id,g])),Q=[];for(let g of n){let v=X.get(g.from),j=X.get(g.to);if(!v||!j)continue;let Et=Ji(v,j,String(g.kind||`request`),I,c);Q.push(m(l({},g),{points:``,pathD:Et}))}return{width:c,height:z+Ae,bands:V,nodes:I,edges:Q}}function ui(t,n){let e=new Map,i=new Map;for(let m of n)e.has(m.from)||e.set(m.from,[]),e.get(m.from).push(m.to),i.has(m.to)||i.set(m.to,[]),i.get(m.to).push(m.from);let a=new Set([t]),l=new Set,u=(m,x,h)=>{let c=[m];for(;c.length;){let F=c.pop();for(let G of x.get(F)||[]){let I=n.find(V=>h?V.from===F&&V.to===G:V.from===G&&V.to===F)?.id;I&&l.add(I),a.has(G)||(a.add(G),c.push(G))}}};u(t,e,!0),u(t,i,!1);for(let m of n)a.has(m.from)&&a.has(m.to)&&l.add(m.id);return{nodes:a,edges:l}}var ea=3e4;var Ke=class t{api=h(f);live=h(U);liveSub=null;seq=Tt(0);generatedAt=Tt(null);notes=Tt([]);capabilities=Tt(null);structureNodes=Tt([]);structureEdges=Tt([]);healthById=Tt({});liveMode=Tt(!0);paused=Tt(!1);showNotDeployed=Tt(!1);onlyUnhealthy=Tt(!1);bandFilter=Tt(`all`);tableMode=Tt(!1);hoverNodeId=Tt(null);snapshotOnly=Tt(!1);lastError=Tt(null);loading=Tt(!0);grace=new Map;_layoutRuns=0;layoutRunCount(){return this._layoutRuns}layout=PC(()=>{this._layoutRuns+=1;let n=this.mergeGrace(this.structureNodes()),e=this.structureEdges();if(this.bandFilter()!==`all`){let i=this.bandFilter();n=n.filter(l=>l.band===i);let a=new Set(n.map(l=>l.id));e=e.filter(l=>a.has(l.from)&&a.has(l.to))}return mi(n,e,{showNotDeployed:this.showNotDeployed()})});displayNodes=PC(()=>{let n=this.healthById(),e=this.onlyUnhealthy();return this.layout().nodes.map(i=>{let a=n[i.id],l$5=a?.status||i.status,u=a?.statusReason??i.statusReason;return i.instrumented===!1&&l$5===`healthy`&&(l$5=`unknown`),m(l({},i),{status:l$5,statusReason:u,displayStatus:l$5})}).filter(i=>e?[`failed`,`degraded`,`offline`].includes(String(i.displayStatus||``).toLowerCase()):!0)});displayEdges=PC(()=>{if(!this.onlyUnhealthy())return this.layout().edges;let n=new Set(this.displayNodes().map(e=>e.id));return this.layout().edges.filter(e=>n.has(e.from)||n.has(e.to))});hoverClosure=PC(()=>{let n=this.hoverNodeId();return n?ui(n,this.structureEdges()):null});unhealthyCount=PC(()=>this.displayNodes().filter(n=>[`failed`,`degraded`].includes(String(n.displayStatus||``).toLowerCase())).length);nodes=PC(()=>this.structureNodes());edges=PC(()=>this.structureEdges());start(){this.loading.set(!0),this.api.topologyGraph().subscribe(n=>{n.ok?(this.applySnapshot(n.data),this.snapshotOnly.set(!0),this.lastError.set(null)):this.lastError.set(n.message),this.loading.set(!1)}),this.live.acquire({topology:!0}),this.liveSub?.unsubscribe(),this.liveSub=this.live.topologyEvents.subscribe(n=>{this.paused()||this.onLiveEvent(n)})}stop(){this.liveSub?.unsubscribe(),this.liveSub=null,this.live.release()}togglePause(){this.paused.update(n=>!n)}resync(){this.live.resyncTopology(),this.api.topologyGraph().subscribe(n=>{n.ok&&this.applySnapshot(n.data)})}setHover(n){this.hoverNodeId.set(n)}loadNodeDetail(n){return this.api.topologyNode(n)}applyHealthForTest(n){this.layout();let e=this._layoutRuns;this.patchHealth(n),this.displayNodes();return{layoutRunsBefore:e,layoutRunsAfter:this._layoutRuns}}onLiveEvent(n){if(n.type===`topology_snapshot`){this.applySnapshot(n),this.snapshotOnly.set(!1);return}if(n.type===`topology_delta`){let e=Number(n.fromSeq||0);if(e&&e!==this.seq()){this.live.resyncTopology();return}this.applyDelta(n),this.snapshotOnly.set(!1);return}if(n.type===`topology_health`){let e=n.health;Array.isArray(e)&&this.patchHealth(e),n.seq!=null&&this.seq.set(Number(n.seq))}}applySnapshot(n){this.seq.set(Number(n.seq||0)),this.generatedAt.set(n.generatedAt||null),this.notes.set(n.notes||[]),this.capabilities.set(n.capabilities||null),this.structureNodes.set(n.nodes||[]),this.structureEdges.set(n.edges||[]);let e={};for(let i of n.nodes||[])e[i.id]={status:String(i.status),statusReason:i.statusReason};this.healthById.set(e),this.grace.clear()}applyDelta(n){let e=n.nodesUpserted||[],i=n.nodesRemoved||[],a=n.edgesUpserted||[],l$6=n.edgesRemoved||[],u=new Map(this.structureNodes().map(c=>[c.id,c])),m$3=l({},this.healthById());for(let c of e)u.set(c.id,c),m$3[c.id]={status:String(c.status),statusReason:c.statusReason},this.grace.delete(c.id);let x=Date.now();for(let c of i){let F=u.get(c);F&&(this.grace.set(c,{node:m(l({},F),{status:`offline`}),removeAt:x+ea}),m$3[c]={status:`offline`,statusReason:`removed`}),u.delete(c)}this.structureNodes.set([...u.values()]),this.healthById.set(m$3);let h=new Map(this.structureEdges().map(c=>[c.id,c]));for(let c of a)h.set(c.id,c);for(let c of l$6)h.delete(c);this.structureEdges.set([...h.values()]),n.seq!=null&&this.seq.set(Number(n.seq)),n.notes&&this.notes.set(n.notes),n.capabilities&&this.capabilities.set(n.capabilities),n.generatedAt&&this.generatedAt.set(String(n.generatedAt))}patchHealth(n){this.healthById.update(e=>{let i=l({},e);for(let a of n)i[a.id]={status:a.status,statusReason:a.statusReason};return i})}mergeGrace(n){let e=Date.now(),i=[...n];for(let[a,l]of[...this.grace.entries()]){if(e>=l.removeAt){this.grace.delete(a);continue}i.some(u=>u.id===a)||i.push(l.node)}return i}static ɵfac=function(e){return new(e||t)};static ɵprov=R({token:t,factory:t.ɵfac})};var pi={app:{accent:`#0f766e`,icon:`app-window`,aspect:`App`},ui:{accent:`#0d9488`,icon:`monitor`,aspect:`Client`},"overlay-source":{accent:`#0891b2`,icon:`layers`,aspect:`Overlays`},"local-tools":{accent:`#059669`,icon:`wrench`,aspect:`Local tools`},openclaw:{accent:`#7c3aed`,icon:`bot`,aspect:`OpenClaw`},"session-bridge":{accent:`#2563eb`,icon:`cable`,aspect:`Reach bridge`},"overlay-packer":{accent:`#4f46e5`,icon:`package`,aspect:`Overlay pack`},"local-mcp-host":{accent:`#6366f1`,icon:`plug`,aspect:`Local MCP`},"speech-client":{accent:`#db2777`,icon:`mic`,aspect:`Speech`},"mtls-enroller":{accent:`#b45309`,icon:`shield`,aspect:`mTLS`},engine:{accent:`#dc2626`,icon:`cpu`,aspect:`Engine`},endpoint:{accent:`#ea580c`,icon:`radio`,aspect:`Endpoint`},"web-ui":{accent:`#0284c7`,icon:`globe`,aspect:`Web UI`},planner:{accent:`#ca8a04`,icon:`brain`,aspect:`Planner`},catalog:{accent:`#16a34a`,icon:`book-open`,aspect:`Catalog`},"model-backend":{accent:`#0f766e`,icon:`boxes`,aspect:`Models`},"model-runtime":{accent:`#0d9488`,icon:`sparkles`,aspect:`Runtime`},"execution-backend":{accent:`#9333ea`,icon:`workflow`,aspect:`Execution`},worker:{accent:`#a855f7`,icon:`server`,aspect:`Workers`},"mcp-sidecar":{accent:`#c026d3`,icon:`puzzle`,aspect:`Sidecar`},platform:{accent:`#475569`,icon:`container`,aspect:`Platform`},storage:{accent:`#64748b`,icon:`hard-drive`,aspect:`Storage`}};var ta={application:{accent:`#0d9488`,icon:`monitor`,aspect:`Application`},reach:{accent:`#2563eb`,icon:`cable`,aspect:`Reach`},ao:{accent:`#dc2626`,icon:`cpu`,aspect:`AO`}};function je(t,n){return pi[String(t)]||(n?ta[n]:null)||{accent:`#737373`,icon:`circle`,aspect:`Other`}}var gi=pi;var Qt=(t,n)=>n.id;var na=(t,n)=>n.appId;function ia(t,n){if(t&1&&(Ap(),Cm(0,`rect`,7),js(1,`text`,8),gC(2),ql()),t&2){let e=n.$implicit,i=Bw();zl(`x`,12)(`y`,e.y)(`width`,i.layout().width-24)(`height`,e.height)(`data-band`,e.id),SI(),zl(`x`,28)(`y`,e.y+18),SI(),Jl(` `,e.label,` `)}}function aa(t,n){if(t&1&&(Ap(),Cm(0,`rect`,4)),t&2){let e=n.$implicit;zl(`x`,e.x)(`y`,e.y)(`width`,e.width)(`height`,e.height)}}function oa(t,n){if(t&1){let e=kw();Ap(),js(0,`path`,9),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().edgeClick.emit(a))}),ql()}if(t&2){let e=n.$implicit,i=Bw();ta$1(`dimmed`,i.isDimmedEdge(e.id))(`highlighted`,i.isHighlightedEdge(e.id))(`flow`,i.isHighlightedEdge(e.id)),zl(`d`,e.pathD)(`data-kind`,e.kind)}}function ra(t,n){if(t&1){let e=kw();Ap(),js(0,`g`,10),xm(`mouseenter`,function(){let a=yp(e).$implicit;return vp(Bw().hover.emit(a.id))})(`mouseleave`,function(){yp(e);return vp(Bw().hover.emit(null))})(`focus`,function(){let a=yp(e).$implicit;return vp(Bw().hover.emit(a.id))})(`blur`,function(){yp(e);return vp(Bw().hover.emit(null))})(`click`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))})(`keydown.enter`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))}),Cm(1,`rect`,11)(2,`rect`,12),js(3,`foreignObject`,13),xp(),js(4,`div`,14),Cm(5,`mat-icon`,15),ql()(),Ap(),js(6,`text`,16),gC(7),ql(),js(8,`text`,17),gC(9),ql()()}if(t&2){let e=n.$implicit,i=Bw();ta$1(`dimmed`,i.isDimmedNode(e.id))(`highlighted`,i.isHighlightedNode(e.id)),zl(`transform`,`translate(`+e.x+`,`+e.y+`)`)(`data-status`,e.displayStatus)(`data-band`,e.band)(`data-kind`,e.kind)(`aria-label`,i.ariaLabel(e)),SI(),zl(`width`,e.width)(`height`,e.height)(`stroke`,i.accent(e)),SI(),zl(`height`,e.height)(`fill`,i.accent(e)),SI(3),Vm(`color`,i.accent(e)),wm(`svgIcon`,i.icon(e)),SI(),zl(`x`,38),SI(),Jl(` `,i.truncate(e.label,i.labelMax(e)),` `),SI(),zl(`x`,38),SI(),qm(` `,i.statusGlyph(e.displayStatus),` `,i.truncate(e.sublabel||e.displayStatus,i.labelMax(e)),` `)}}var Ct=class t{layout=hH.required();nodes=hH.required();edges=hH.required();closure=hH(null);blurred=hH(!1);summary=hH(`Deployment topology diagram`);hover=pH();nodeClick=pH();edgeClick=pH();appFrames=PC(()=>{let n=new Map;for(let a of this.nodes()){if(a.band!==`application`||!a.appId)continue;let l=n.get(a.appId)||[];l.push(a),n.set(a.appId,l)}let e=[],i=10;for(let[a,l]of n){if(!l.length)continue;let u=Infinity,m=Infinity,x=-Infinity,h=-Infinity;for(let c of l)u=Math.min(u,c.x),m=Math.min(m,c.y),x=Math.max(x,c.x+c.width),h=Math.max(h,c.y+c.height);e.push({appId:a,x:u-i,y:m-i,width:x-u+i*2,height:h-m+i*2})}return e});isDimmedEdge(n){let e=this.closure();return!!e&&!e.edges.has(n)}isHighlightedEdge(n){let e=this.closure();return!!e&&e.edges.has(n)}isDimmedNode(n){let e=this.closure();return!!e&&!e.nodes.has(n)}isHighlightedNode(n){let e=this.closure();return!!e&&e.nodes.has(n)}accent(n){return je(n.kind,n.band).accent}icon(n){return je(n.kind,n.band).icon}labelMax(n){return n.kind===`app`?28:14}ariaLabel(n){let e=n.ownedByApps?.length?` owned by ${n.ownedByApps.join(`, `)}`:``;return`${n.label} ${n.displayStatus}${e}`}truncate(n,e){let i=String(n||``);return i.length>e?i.slice(0,e-1)+`…`:i}statusGlyph(n){switch(String(n||``).toLowerCase()){case`healthy`:return`●`;case`degraded`:return`▲`;case`failed`:return`✖`;case`starting`:return`◐`;case`draining`:return`◌`;case`offline`:return`○`;default:return`?`}}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-canvas`]],inputs:{layout:[1,`layout`],nodes:[1,`nodes`],edges:[1,`edges`],closure:[1,`closure`],blurred:[1,`blurred`],summary:[1,`summary`]},outputs:{hover:`hover`,nodeClick:`nodeClick`,edgeClick:`edgeClick`},decls:17,vars:8,consts:[[1,`topology-canvas-wrap`,`relative`,`h-full`,`w-full`,`overflow-auto`,`rounded-xl`,`border`,`border-neutral-200`,`bg-neutral-50`,`dark:border-neutral-800`,`dark:bg-neutral-950`],[`role`,`img`,1,`topology-svg`,`block`,`min-w-full`],[`id`,`topo-arrow`,`viewBox`,`0 0 10 10`,`refX`,`9`,`refY`,`5`,`markerWidth`,`7`,`markerHeight`,`7`,`orient`,`auto`],[`d`,`M 0 0 L 10 5 L 0 10 z`,1,`fill-neutral-400`,`dark:fill-neutral-500`],[`rx`,`12`,1,`app-group-frame`],[`marker-end`,`url(#topo-arrow)`,1,`topo-edge`,3,`dimmed`,`highlighted`,`flow`],[`tabindex`,`0`,`role`,`button`,1,`topo-node`,3,`dimmed`,`highlighted`],[`rx`,`10`,1,`band-rect`],[1,`band-label`,`fill-neutral-500`,`text-[11px]`,`font-medium`,`tracking-wide`,`uppercase`],[`marker-end`,`url(#topo-arrow)`,1,`topo-edge`,3,`click`],[`tabindex`,`0`,`role`,`button`,1,`topo-node`,3,`mouseenter`,`mouseleave`,`focus`,`blur`,`click`,`keydown.enter`],[`rx`,`8`,1,`node-fill`],[`x`,`0`,`y`,`0`,`width`,`4`,`rx`,`2`],[`x`,`12`,`y`,`14`,`width`,`22`,`height`,`22`],[`xmlns`,`http://www.w3.org/1999/xhtml`,1,`node-icon`],[3,`svgIcon`],[`y`,`22`,1,`fill-neutral-900`,`text-[12px]`,`font-medium`,`dark:fill-neutral-100`],[`y`,`38`,1,`fill-neutral-500`,`text-[10px]`]],template:function(e,i){e&1&&(js(0,`div`,0),Ap(),js(1,`svg`,1)(2,`title`),gC(3,`Live deployment topology`),ql(),js(4,`desc`),gC(5),ql(),js(6,`defs`)(7,`marker`,2),Cm(8,`path`,3),ql()(),Sw(9,ia,3,8,null,null,Qt),Sw(11,aa,1,4,`:svg:rect`,4,na),Sw(13,oa,1,8,`:svg:path`,5,Qt),Sw(15,ra,10,22,`:svg:g`,6,Qt),ql()()),e&2&&(ta$1(`topology-blur`,i.blurred()),SI(),ta$1(`path-highlight`,!!i.closure()),zl(`width`,i.layout().width)(`height`,i.layout().height)(`viewBox`,`0 0 `+i.layout().width+` `+i.layout().height),SI(4),Wm(i.summary()),SI(4),Mw(i.layout().bands),SI(2),Mw(i.appFrames()),SI(2),Mw(i.edges()),SI(2),Mw(i.nodes()))},dependencies:[yt,wt$1],styles:[`[_nghost-%COMP%]{display:block;min-height:420px}.topology-blur[_ngcontent-%COMP%]{filter:blur(3px) saturate(.85);opacity:.72;transition:filter .15s ease,opacity .15s ease}.band-rect[data-band=application][_ngcontent-%COMP%]{fill:color-mix(in oklab,#0d9488 8%,transparent);stroke:color-mix(in oklab,#0d9488 28%,transparent)}.app-group-frame[_ngcontent-%COMP%]{fill:color-mix(in oklab,#0f766e 6%,transparent);stroke:color-mix(in oklab,#0f766e 32%,transparent);stroke-width:1.25;stroke-dasharray:5 4;pointer-events:none}.band-rect[data-band=reach][_ngcontent-%COMP%]{fill:color-mix(in oklab,#2563eb 8%,transparent);stroke:color-mix(in oklab,#2563eb 28%,transparent)}.band-rect[data-band=ao][_ngcontent-%COMP%]{fill:color-mix(in oklab,#dc2626 7%,transparent);stroke:color-mix(in oklab,#dc2626 24%,transparent)}.topo-edge[_ngcontent-%COMP%]{fill:none;stroke:var(--%NS%mat-sys-outline);stroke-width:1.6;stroke-dasharray:7 5;stroke-linecap:square;stroke-linejoin:miter;opacity:.7;cursor:pointer;pointer-events:stroke}.topo-edge[data-kind=stream][_ngcontent-%COMP%]{stroke-dasharray:10 6}.topo-edge[data-kind=reverse-tunnel][_ngcontent-%COMP%]{stroke-dasharray:3 4}.topo-edge[data-kind=advertisement][_ngcontent-%COMP%]{stroke-dasharray:1 5;opacity:.45}.topo-edge[data-kind=bypass][_ngcontent-%COMP%]{stroke-dasharray:9 5}.topo-edge.flow[_ngcontent-%COMP%], .path-highlight[_ngcontent-%COMP%]   .topo-edge.highlighted[_ngcontent-%COMP%]{stroke:var(--%NS%mat-sys-primary);stroke-width:2.1;opacity:1;animation:_ngcontent-%COMP%_topo-dash-flow 1.1s linear infinite}@keyframes _ngcontent-%COMP%_topo-dash-flow{to{stroke-dashoffset:-24}}.topo-node[_ngcontent-%COMP%]{cursor:pointer;transition:opacity .12s ease}.topo-node[_ngcontent-%COMP%]:focus{outline:2px solid var(--%NS%mat-sys-primary);outline-offset:2px}.node-fill[_ngcontent-%COMP%]{fill:var(--%NS%mat-sys-surface);stroke-width:1.5}.node-icon[_ngcontent-%COMP%]{display:flex;width:22px;height:22px;align-items:center;justify-content:center}.node-icon[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{width:18px;height:18px;font-size:18px}.topo-node[data-status=failed][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-width:2.25}.topo-node[data-status=degraded][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-width:2}.topo-node[data-status=unknown][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-dasharray:4 3}.topo-node[data-status=offline][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{fill:transparent;stroke-dasharray:3 3;opacity:.55}.topo-node[data-status=starting][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{opacity:.7}.path-highlight[_ngcontent-%COMP%]   .dimmed[_ngcontent-%COMP%]{opacity:.18}.path-highlight[_ngcontent-%COMP%]   .highlighted[_ngcontent-%COMP%]{opacity:1}@media(prefers-reduced-motion:reduce){.topo-edge.flow[_ngcontent-%COMP%], .path-highlight[_ngcontent-%COMP%]   .topo-edge.highlighted[_ngcontent-%COMP%]{animation:none}.topology-blur[_ngcontent-%COMP%]{transition:none;filter:none;opacity:.65}}`]})};function la(t,n){t&1&&(js(0,`th`,15),gC(1,`Name`),ql())}function sa(t,n){if(t&1){let e=kw();js(0,`td`,16)(1,`button`,17),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))}),gC(2),ql()()}if(t&2){let e=n.$implicit;SI(2),Jl(` `,e.label,` `)}}function da(t,n){t&1&&(js(0,`th`,15),gC(1,`Band`),ql())}function ca(t,n){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=n.$implicit;SI(),Wm(e.band)}}function ma(t,n){t&1&&(js(0,`th`,15),gC(1,`Status`),ql())}function ua(t,n){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=n.$implicit;SI(),Wm(e.displayStatus)}}function pa(t,n){t&1&&(js(0,`th`,15),gC(1,`Reason`),ql())}function ga(t,n){if(t&1&&(js(0,`td`,18),gC(1),ql()),t&2){let e=n.$implicit;SI(),Jl(` `,e.statusReason||`—`,` `)}}function ha(t,n){t&1&&Cm(0,`tr`,19)}function fa(t,n){t&1&&Cm(0,`tr`,20)}function ya(t,n){t&1&&(js(0,`th`,15),gC(1,`Id`),ql())}function ba(t,n){if(t&1){let e=kw();js(0,`td`,16)(1,`button`,21),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().edgeClick.emit(a))}),gC(2),ql()()}if(t&2){let e=n.$implicit;SI(2),Jl(` `,e.id,` `)}}function _a(t,n){t&1&&(js(0,`th`,15),gC(1,`Kind`),ql())}function va(t,n){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=n.$implicit;SI(),Wm(e.kind)}}function xa(t,n){t&1&&(js(0,`th`,15),gC(1,`Metrics`),ql())}function wa(t,n){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=n.$implicit;SI(),Jl(` `,e.instrumented?`yes`:`no data`,` `)}}function ka(t,n){t&1&&Cm(0,`tr`,19)}function Ca(t,n){t&1&&Cm(0,`tr`,20)}var St=class t{nodes=hH.required();edges=hH.required();nodeClick=pH();edgeClick=pH();nodeCols=[`label`,`band`,`status`,`reason`];edgeCols=[`id`,`kind`,`instrumented`];static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-table`]],inputs:{nodes:[1,`nodes`],edges:[1,`edges`]},outputs:{nodeClick:`nodeClick`,edgeClick:`edgeClick`},decls:34,vars:6,consts:[[1,`flex`,`flex-col`,`gap-6`],[1,`mb-2`,`text-sm`,`font-medium`],[`mat-table`,``,1,`w-full`,3,`dataSource`],[`matColumnDef`,`label`],[`mat-header-cell`,``,4,`matHeaderCellDef`],[`mat-cell`,``,4,`matCellDef`],[`matColumnDef`,`band`],[`matColumnDef`,`status`],[`matColumnDef`,`reason`],[`mat-cell`,``,`class`,`text-neutral-500`,4,`matCellDef`],[`mat-header-row`,``,4,`matHeaderRowDef`],[`mat-row`,``,4,`matRowDef`,`matRowDefColumns`],[`matColumnDef`,`id`],[`matColumnDef`,`kind`],[`matColumnDef`,`instrumented`],[`mat-header-cell`,``],[`mat-cell`,``],[`type`,`button`,1,`text-left`,`underline-offset-2`,`hover:underline`,3,`click`],[`mat-cell`,``,1,`text-neutral-500`],[`mat-header-row`,``],[`mat-row`,``],[`type`,`button`,1,`font-mono`,`text-xs`,`text-left`,`underline-offset-2`,`hover:underline`,3,`click`]],template:function(e,i){e&1&&(js(0,`div`,0)(1,`div`)(2,`div`,1),gC(3,`Nodes`),ql(),js(4,`table`,2),Kl(5,3),Dm(6,la,2,0,`th`,4)(7,sa,3,1,`td`,5),Ql(),Kl(8,6),Dm(9,da,2,0,`th`,4)(10,ca,2,1,`td`,5),Ql(),Kl(11,7),Dm(12,ma,2,0,`th`,4)(13,ua,2,1,`td`,5),Ql(),Kl(14,8),Dm(15,pa,2,0,`th`,4)(16,ga,2,1,`td`,9),Ql(),Dm(17,ha,1,0,`tr`,10)(18,fa,1,0,`tr`,11),ql()(),js(19,`div`)(20,`div`,1),gC(21,`Edges`),ql(),js(22,`table`,2),Kl(23,12),Dm(24,ya,2,0,`th`,4)(25,ba,3,1,`td`,5),Ql(),Kl(26,13),Dm(27,_a,2,0,`th`,4)(28,va,2,1,`td`,5),Ql(),Kl(29,14),Dm(30,xa,2,0,`th`,4)(31,wa,2,1,`td`,5),Ql(),Dm(32,ka,1,0,`tr`,10)(33,Ca,1,0,`tr`,11),ql()()()),e&2&&(SI(4),wm(`dataSource`,i.nodes()),SI(13),wm(`matHeaderRowDef`,i.nodeCols),SI(),wm(`matRowDefColumns`,i.nodeCols),SI(4),wm(`dataSource`,i.edges()),SI(10),wm(`matHeaderRowDef`,i.edgeCols),SI(),wm(`matRowDefColumns`,i.edgeCols))},dependencies:[li$1,Zt,ei$1,ni$1,ti$1,Jt,ri$1,ii$1,oi$1,si$1,ai$1],encapsulation:2})};var Sa=(t,n)=>n.aspect;function Da(t,n){if(t&1&&(js(0,`div`,8),Cm(1,`span`,10)(2,`mat-icon`,11),gC(3),ql()),t&2){let e=n.$implicit;SI(),Vm(`background`,e.accent),SI(),Vm(`color`,e.accent),wm(`svgIcon`,e.icon),SI(),Jl(` `,e.aspect,` `)}}var Dt=class t{aspects=Object.values(gi).filter((n,e,i)=>i.findIndex(a=>a.aspect===n.aspect)===e);static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-legend`]],decls:24,vars:1,consts:[[`menu`,`matMenu`],[`matButton`,``,`type`,`button`,3,`matMenuTriggerFor`],[`svgIcon`,`info`],[1,`topology-legend-menu`],[1,`flex`,`max-w-sm`,`flex-col`,`gap-2`,`px-4`,`py-3`,`text-sm`,3,`click`],[1,`font-medium`],[1,`mt-2`,`font-medium`],[1,`grid`,`grid-cols-2`,`gap-1`],[1,`flex`,`items-center`,`gap-1.5`,`text-xs`],[1,`mt-2`,`text-neutral-500`],[1,`inline-block`,`h-2`,`w-2`,`rounded-full`],[1,`!h-3.5`,`!w-3.5`,`!text-[14px]`,3,`svgIcon`]],template:function(e,i){if(e&1&&(js(0,`button`,1),Cm(1,`mat-icon`,2),gC(2,` Legend `),ql(),js(3,`mat-menu`,3,0)(5,`div`,4),xm(`click`,function(l){return l.stopPropagation()}),js(6,`div`,5),gC(7,`Status`),ql(),js(8,`div`),gC(9,`● healthy · ▲ degraded · ✖ failed · ? unknown · ○ offline`),ql(),js(10,`div`,6),gC(11,`Edges`),ql(),js(12,`div`),gC(13,`Right-angle routes · hover animates dash toward the arrow`),ql(),js(14,`div`,6),gC(15,`Aspects`),ql(),js(16,`div`,7),Sw(17,Da,4,6,`div`,8,Sa),ql(),js(19,`div`,9),gC(20,` Uninstrumented traffic shows `),js(21,`em`),gC(22,`no data`),ql(),gC(23,`, never zeros. `),ql()()()),e&2)wm(`matMenuTriggerFor`,qw(4)),SI(17),Mw(i.aspects)},dependencies:[Lt,I$1,Bt$1,lt,dt,yt,wt$1],encapsulation:2})};var Pe=`Topology-dashboard`;var Ta={app:{wikiKey:`app`,blurb:`Product appId group — how many Reach instances are connected under this name.`},ui:{wikiKey:`ui`,blurb:`Client or kiosk UI that connected through AO Reach.`},"overlay-source":{wikiKey:`overlay-source`,blurb:`Domain overlays the client advertised for this session.`},"local-tools":{wikiKey:`local-tools`,blurb:`MCP tools hosted on the client device and reverse-tunneled in.`},openclaw:{wikiKey:`openclaw`,blurb:`OpenClaw host that talks to the Web UI and bypasses Reach.`},"session-bridge":{wikiKey:`session-bridge`,blurb:`Reach SessionBridge carrying the authenticated client session.`},"overlay-packer":{wikiKey:`overlay-packer`,blurb:`Packs client overlays before they hit the engine overlay API.`},"local-mcp-host":{wikiKey:`local-mcp-host`,blurb:`Client-side MCP host reached via the engine reverse tunnel.`},"speech-client":{wikiKey:`speech-client`,blurb:`Reach speech client for STT/TTS against advertised sidecars.`},"mtls-enroller":{wikiKey:`mtls-enroller`,blurb:`Issues and renews client certificates for Reach↔engine mTLS.`},engine:{wikiKey:`engine`,blurb:`Engine daemon API (serve) — session, tunnel, and agent edge.`},endpoint:{wikiKey:`endpoint`,blurb:`A concrete engine or speech HTTP endpoint on the edge rank.`},"web-ui":{wikiKey:`web-ui`,blurb:`Coordinator Web UI and Admin console (NodePort 30487).`},planner:{wikiKey:`planner`,blurb:`Dynamic planner / runner that turns goals into CrewAI steps.`},catalog:{wikiKey:`catalog`,blurb:`Resolved agent, MCP, or skills catalog cluster used by planning.`},"model-backend":{wikiKey:`model-backend`,blurb:`Model backend registry that selects local or remote LLM runtimes.`},"model-runtime":{wikiKey:`model-runtime`,blurb:`A concrete model runtime such as Ollama or a remote provider.`},"execution-backend":{wikiKey:`execution-backend`,blurb:`Execution backend that runs steps (in-process, k8s, or warm pool).`},worker:{wikiKey:`worker`,blurb:`Worker pods or processes currently available to run steps.`},"mcp-sidecar":{wikiKey:`mcp-sidecar`,blurb:`MCP sidecar containers attached to workers for tool execution.`},platform:{wikiKey:`platform`,blurb:`Cluster / host platform layer (k3s node, Jetson, or NVR).`},storage:{wikiKey:`storage`,blurb:`Persistent volumes, GPU weights, and host metrics mounts.`}};var Na={"engine/session-overlay":{wikiKey:`endpoint-session-overlay`,blurb:`Engine API that applies Reach session overlays for a run.`},"engine/mcp-tunnel":{wikiKey:`endpoint-mcp-tunnel`,blurb:`Reverse tunnel endpoint that calls back into the client MCP host.`},"engine/direct-agent":{wikiKey:`endpoint-direct-agent`,blurb:`Direct-agent chat path that skips full dynamic planning.`},"engine/hello-speech":{wikiKey:`endpoint-hello-speech`,blurb:`Advertises speech (STT/TTS) capability to Reach clients.`},"engine/mtls-enrol":{wikiKey:`endpoint-mtls-enrol`,blurb:`mTLS enrollment endpoint for Reach client certificates.`},"speech/stt":{wikiKey:`speech-stt`,blurb:`Speech-to-text sidecar serving transcription requests.`},"speech/tts":{wikiKey:`speech-tts`,blurb:`Text-to-speech sidecar serving synthesis requests.`},"catalog/agents":{wikiKey:`catalog-agents`,blurb:`Cluster of agent-provider catalog entries available to the planner.`},"catalog/mcp":{wikiKey:`catalog-mcp`,blurb:`Cluster of MCP provider catalog entries available to the planner.`},"catalog/skills":{wikiKey:`catalog-skills`,blurb:`Cluster of agent-skill playbooks the planner may attach to tasks.`},"models/backends":{wikiKey:`models-backends`,blurb:`Resolved model-backend catalog used to pick LLM runtimes.`},"models/ollama":{wikiKey:`models-ollama`,blurb:`Local Ollama runtime for on-box model inference.`},"models/remote":{wikiKey:`models-remote`,blurb:`Remote LLM providers (OpenAI, Anthropic, …) when credentials exist.`}};var Ma={request:{wikiKey:`edge-request`,blurb:`A request/response call path between two components.`},stream:{wikiKey:`edge-stream`,blurb:`A streaming path (WebSocket or chunked) between components.`},"reverse-tunnel":{wikiKey:`edge-reverse-tunnel`,blurb:`Engine calling back up into a Reach-hosted local MCP host.`},advertisement:{wikiKey:`edge-advertisement`,blurb:`Capability advertisement (not request traffic).`},bypass:{wikiKey:`edge-bypass`,blurb:`OpenClaw path that skips Reach and hits the Web UI directly.`}};var fi={wikiKey:`topology-node`,blurb:`A live topology component reported by the current deployment.`};var yi={wikiKey:`topology-edge`,blurb:`A structural link between two topology components.`};function We(t){return t&&(Na[t.id]||Ta[String(t.kind)])||fi}function bi(t){return t&&Ma[String(t.kind)]||yi}var _i=t=>[t];var Pa=()=>[`#ea580c`];var Ia=(t,n)=>n.id;function Oa(t,n){if(t&1&&Cm(0,`ao-env-help`,3),t&2){let e=n,i=Bw();wm(`key`,e.wikiKey)(`help`,e.blurb)(`wikiPage`,i.wikiPage)}}function Ra(t,n){if(t&1&&(js(0,`div`,5),gC(1),ql()),t&2){let e=Bw();SI(),Jl(` `,e.data.offlineBanner,` `)}}function La(t,n){t&1&&(js(0,`p`,6),gC(1,`Loading…`),ql())}function Fa(t,n){t&1&&(js(0,`p`,7),gC(1),ql()),t&2&&(SI(),Wm(n))}function Ba(t,n){t&1&&(js(0,`span`,13),gC(1,` · not instrumented`),ql())}function Ha(t,n){t&1&&(js(0,`div`,14)(1,`span`,26),gC(2,`Owned by app`),ql(),js(3,`div`,27),gC(4),ql()()),t&2&&(SI(4),Wm(n))}function Ga(t,n){if(t&1&&(js(0,`div`,13),gC(1),ql()),t&2){let e=Bw();SI(),Jl(` `,e.probe?.statusReason||e.node.statusReason,` `)}}function za(t,n){if(t&1&&gC(0),t&2)Jl(` · RTT `,Bw(2).latestLatency(),` ms `)}function Va(t,n){if(t&1&&Cm(0,`apx-chart`,17),t&2){let e=Bw(2);wm(`series`,e.healthChartSeries())(`chart`,e.sparkChart)(`colors`,CC(10,_i,e.accent()))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}function Ka(t,n){t&1&&(js(0,`div`,18),gC(1,` Waiting for live probe samples… `),ql())}function ja(t,n){if(t&1&&(js(0,`div`),gC(1),js(2,`span`,13),gC(3),ql()()),t&2){let e=Bw();SI(),Jl(` Cluster members: `,e.members.count,` `),SI(2),Jl(` — `,e.members.note)}}function Wa(t,n){t&1&&(js(0,`div`,13),gC(1,`Open this tab for live traffic.`),ql())}function $a(t,n){if(t&1&&(js(0,`div`,20)(1,`strong`),gC(2,`no data`),ql(),gC(3),ql()),t&2){let e=Bw();SI(3),qm(` — related edges are not instrumented. Inbound `,e.inbound.length,` · Outbound `,e.outbound.length,`. `)}}function qa(t,n){if(t&1&&(js(0,`div`,15)(1,`div`,16),gC(2,` Live rate (events/s) · websocket `),ql(),Cm(3,`apx-chart`,17),ql(),js(4,`div`,15)(5,`div`,16),gC(6,` Latency p95 (ms) `),ql(),Cm(7,`apx-chart`,17),ql()),t&2){let e=Bw(2);SI(3),wm(`series`,e.trafficRateSeries())(`chart`,e.sparkChart)(`colors`,CC(20,_i,e.accent()))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid),SI(4),wm(`series`,e.trafficLatencySeries())(`chart`,e.sparkChart)(`colors`,wC(22,Pa))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}function Ya(t,n){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=n.$implicit;SI(),qm(``,e.id,` · `,e.kind)}}function Ua(t,n){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=n.$implicit;SI(),Wm(e)}}function Xa(t,n){if(t&1&&(js(0,`ul`,21),Sw(1,Ua,2,1,`li`,null,Tw),ql(),js(3,`a`,28),gC(4,` Open All settings `),ql()),t&2){let e=Bw();SI(),Mw(e.configKeys),SI(2),wm(`mat-dialog-close`,!0)}}function Qa(t,n){t&1&&(js(0,`span`,13),gC(1,`No linked config keys`),ql())}function Za(t,n){if(t&1){let e=kw();js(0,`mat-tab-group`,10),xm(`selectedIndexChange`,function(a){yp(e);return vp(Bw().onTab(a))}),js(1,`mat-tab`,11)(2,`div`,12)(3,`div`),gC(4,` Status: `),js(5,`strong`),gC(6),ql(),ww(7,Ba,2,0,`span`,13),ql(),ww(8,Ha,5,1,`div`,14),ww(9,Ga,2,1,`div`,13),js(10,`div`,13),gC(11),ww(12,za,1,1),ql(),js(13,`div`,15)(14,`div`,16),gC(15,` Health monitor (probe latency) `),ql(),ww(16,Va,1,12,`apx-chart`,17)(17,Ka,2,0,`div`,18),ql(),ww(18,ja,4,2,`div`),ql()(),js(19,`mat-tab`,19)(20,`div`,12),ww(21,Wa,2,0,`div`,13)(22,$a,4,2,`div`,20)(23,qa,8,23),js(24,`div`),gC(25),ql(),js(26,`ul`,21),Sw(27,Ya,2,2,`li`,null,Ia),ql()()(),js(29,`mat-tab`,22)(30,`div`,23),ww(31,Xa,5,1)(32,Qa,2,0,`span`,13),ql()(),js(33,`mat-tab`,24)(34,`div`,23)(35,`div`),gC(36,` Log source: `),js(37,`code`),gC(38),ql()(),js(39,`a`,25),gC(40,` Open Overview logs `),ql()()()()}if(t&2){let e,i=n,a=Bw();SI(6),Wm(a.liveStatus()||i.node.status),SI(),Cw(i.probe?.instrumented?-1:7),SI(),Cw((e=a.ownerLabel(i))?8:-1,e),SI(),Cw(i.probe?.statusReason||i.node.statusReason?9:-1),SI(2),Jl(` Last probe: `,i.probe?.lastProbeAt||`—`,` `),SI(),Cw(a.latestLatency()!=null?12:-1),SI(4),Cw(a.healthSeries().length?16:17),SI(2),Cw(i.members?18:-1),SI(3),Cw(a.trafficActive()?a.trafficInstrumented()?23:22:21),SI(4),qm(`Inbound: `,i.inbound.length,` · Outbound: `,i.outbound.length),SI(2),Mw(i.outbound),SI(4),Cw(i.configKeys?.length?31:32),SI(7),Wm(i.logSource||`web`),SI(),wm(`mat-dialog-close`,!0)}}var Nt=class t{data=h(fe);ref=h(ee);api=h(f);live=h(U);loading=Tt(!0);error=Tt(null);detail=Tt(null);liveStatus=Tt(null);healthSeries=Tt([]);trafficRate=Tt([]);trafficLatency=Tt([]);trafficActive=Tt(!1);trafficInstrumented=Tt(!1);wikiPage=Pe;accent=PC(()=>{let n=this.detail()?.node;return je(n?.kind||`engine`,n?.band).accent});wikiHelp=PC(()=>{let n=this.detail()?.node;return n?We(n):We({id:this.data.nodeId,kind:`endpoint`})});latestLatency=PC(()=>{let n=this.healthSeries(),e=n.length?n[n.length-1]:null;return e?.y==null?null:Math.round(Number(e.y))});sparkChart={type:`area`,height:120,animations:{enabled:!1},toolbar:{show:!1},zoom:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`};sparkStroke={curve:`smooth`,width:2};sparkFill={type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.35,opacityTo:.05}};sparkTooltip={x:{format:`HH:mm:ss`}};sparkXaxis={type:`datetime`,labels:{datetimeUTC:!1,style:{fontSize:`10px`}},axisBorder:{show:!1}};sparkYaxis={labels:{style:{fontSize:`10px`}},min:0};sparkGrid={borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:4,right:4}};noDataLabels={enabled:!1};sub=null;watching=!1;trafficWatch=!1;ngOnInit(){this.api.topologyNode(this.data.nodeId).subscribe(n=>{if(this.loading.set(!1),!n.ok){this.error.set(n.message);return}this.detail.set(n.data)}),this.live.subscribeTopologyWatch(`node`,this.data.nodeId),this.watching=!0,this.sub=this.live.topologyEvents.subscribe(n=>{(n.type===`topology_watch_snapshot`||n.type===`topology_watch_tick`)&&n.target===`node`&&n.id===this.data.nodeId&&this.applyWatch(n)}),this.ref.afterClosed().subscribe(()=>this.teardown())}ngOnDestroy(){this.teardown()}onTab(n){n===1?(this.trafficActive.set(!0),this.trafficWatch=!0):this.trafficWatch&&this.trafficActive.set(!1)}ownerLabel(n){let e=n.ownedByApps?.length?n.ownedByApps:n.node.ownedByApps?.length?n.node.ownedByApps:n.node.appId?[n.node.appId]:[];return e.length?n.node.band===`application`&&n.node.kind===`app`||n.node.band===`reach`||n.node.band===`ao`?e.join(`, `):n.node.band===`application`&&n.node.appId?n.node.appId:null:null}healthChartSeries(){return[{name:`latency ms`,data:this.healthSeries()}]}trafficRateSeries(){return[{name:`rate`,data:this.trafficRate()}]}trafficLatencySeries(){return[{name:`p95 ms`,data:this.trafficLatency()}]}applyWatch(n){let e=n.latest;e?.status&&this.liveStatus.set(String(e.status));let i=n.health||[];i.length&&this.healthSeries.set(i);let a=n.series;a?.latencyMs?.length&&!i.length&&this.healthSeries.set(a.latencyMs);let l=a?.rate||[],u=a?.latencyP95||[];this.trafficRate.set(l),this.trafficLatency.set(u),this.trafficInstrumented.set(!!n.instrumented&&(l.length>0||u.length>0))}teardown(){this.sub?.unsubscribe(),this.sub=null,this.watching&&(this.live.unsubscribeTopologyWatch(`node`,this.data.nodeId),this.watching=!1)}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-node-detail-dialog`]],decls:13,vars:6,consts:[[`mat-dialog-title`,``,1,`flex`,`items-center`,`gap-2`],[1,`inline-block`,`h-2.5`,`w-2.5`,`rounded-full`],[1,`flex-auto`],[3,`key`,`help`,`wikiPage`],[1,`min-w-[340px]`,`max-w-lg`],[1,`mb-3`,`rounded-lg`,`border`,`border-amber-300`,`bg-amber-50`,`px-3`,`py-2`,`text-sm`,`text-amber-900`,`dark:border-amber-700`,`dark:bg-amber-950`,`dark:text-amber-100`],[1,`text-sm`,`text-neutral-500`],[1,`text-sm`,`text-red-600`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[3,`selectedIndexChange`],[`label`,`Health`],[1,`flex`,`flex-col`,`gap-3`,`py-3`,`text-sm`],[1,`text-neutral-500`],[1,`rounded-lg`,`border`,`border-teal-200`,`bg-teal-50`,`px-3`,`py-2`,`text-teal-950`,`dark:border-teal-800`,`dark:bg-teal-950`,`dark:text-teal-100`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-2`,`pt-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`mb-1`,`px-1`,`text-xs`,`text-neutral-500`],[3,`series`,`chart`,`colors`,`stroke`,`fill`,`tooltip`,`xaxis`,`yaxis`,`dataLabels`,`grid`],[1,`px-2`,`pb-3`,`text-xs`,`text-neutral-500`],[`label`,`Traffic`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`font-mono`,`text-xs`],[`label`,`Config`],[1,`flex`,`flex-col`,`gap-2`,`py-3`,`text-sm`],[`label`,`Logs`],[`matButton`,``,`routerLink`,`/overview`,3,`mat-dialog-close`],[1,`text-xs`,`uppercase`,`tracking-wide`,`text-teal-700`,`dark:text-teal-300`],[1,`mt-0.5`,`font-medium`],[`matButton`,``,`routerLink`,`/settings`,3,`mat-dialog-close`]],template:function(e,i){if(e&1&&(js(0,`h2`,0),Cm(1,`span`,1),js(2,`span`,2),gC(3),ql(),ww(4,Oa,1,3,`ao-env-help`,3),ql(),js(5,`mat-dialog-content`,4),ww(6,Ra,2,1,`div`,5),ww(7,La,2,0,`p`,6)(8,Fa,2,1,`p`,7)(9,Za,41,14,`mat-tab-group`),ql(),js(10,`mat-dialog-actions`,8)(11,`button`,9),gC(12,`Close`),ql()()),e&2){let a,l;SI(),Vm(`background`,i.accent()),SI(2),Wm(i.detail()?.node?.label||i.data.nodeId),SI(),Cw((a=i.wikiHelp())?4:-1,a),SI(2),Cw(i.data.offlineBanner?6:-1),SI(),Cw(i.loading()?7:(l=i.error())?8:(l=i.detail())?9:-1,l)}},dependencies:[ce,De,Te,Me,Ne,lt,dt,hn,Re$1,bn,Dt$1,ge$1,he,w],encapsulation:2})};var Ja=()=>[`#2563eb`];var eo=()=>[`#ea580c`];function to(t,n){if(t&1&&gC(0),t&2)Jl(` · :`,Bw().data.edge.port,` `)}function no(t,n){t&1&&(js(0,`div`,10),gC(1,` This edge is not instrumented — health is structural only. `),ql())}function io(t,n){if(t&1&&gC(0),t&2)Jl(` Latency p95 `,Bw(2).latest()?.latencyP95,` ms `)}function ao(t,n){if(t&1&&gC(0),t&2)Jl(` · error rate `,((Bw(2).latest()?.errorRate||0)*100).toFixed(0),`% `)}function oo(t,n){if(t&1&&(js(0,`div`,10),ww(1,io,1,1),ww(2,ao,1,1),ql()),t&2){let e=Bw();SI(),Cw(e.latest()?.latencyP95!=null?1:-1),SI(),Cw(e.latest()?.errorRate!=null?2:-1)}}function ro(t,n){t&1&&(js(0,`div`,10),gC(1,`Open this tab for live traffic.`),ql())}function lo(t,n){t&1&&(js(0,`div`,13)(1,`strong`),gC(2,`no data`),ql(),gC(3,` — this edge is not instrumented. `),ql())}function so(t,n){if(t&1&&(js(0,`div`,16)(1,`div`,17),gC(2,` Live rate (events/s) `),ql(),Cm(3,`apx-chart`,18),ql(),js(4,`div`,16)(5,`div`,17),gC(6,`Latency p95 (ms)`),ql(),Cm(7,`apx-chart`,18),ql()),t&2){let e=Bw();SI(3),wm(`series`,e.rateSeries())(`chart`,e.sparkChart)(`colors`,wC(20,Ja))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid),SI(4),wm(`series`,e.latencySeries())(`chart`,e.sparkChart)(`colors`,wC(21,eo))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}var Mt=class t{data=h(fe);ref=h(ee);live=h(U);wikiPage=Pe;wikiHelp=bi(this.data.edge);instrumented=Tt(!!this.data.edge.instrumented);liveStatus=Tt(null);latest=Tt(null);ratePts=Tt([]);latencyPts=Tt([]);trafficActive=Tt(!1);sparkChart={type:`area`,height:120,animations:{enabled:!1},toolbar:{show:!1},zoom:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`};sparkStroke={curve:`smooth`,width:2};sparkFill={type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.35,opacityTo:.05}};sparkTooltip={x:{format:`HH:mm:ss`}};sparkXaxis={type:`datetime`,labels:{datetimeUTC:!1,style:{fontSize:`10px`}},axisBorder:{show:!1}};sparkYaxis={labels:{style:{fontSize:`10px`}},min:0};sparkGrid={borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:4,right:4}};noDataLabels={enabled:!1};sub=null;watching=!1;ngOnInit(){this.live.subscribeTopologyWatch(`edge`,this.data.edge.id),this.watching=!0,this.sub=this.live.topologyEvents.subscribe(n=>{(n.type===`topology_watch_snapshot`||n.type===`topology_watch_tick`)&&n.target===`edge`&&n.id===this.data.edge.id&&this.applyWatch(n)}),this.ref.afterClosed().subscribe(()=>this.teardown())}ngOnDestroy(){this.teardown()}onTab(n){this.trafficActive.set(n===1)}rateSeries(){return[{name:`rate`,data:this.ratePts()}]}latencySeries(){return[{name:`p95 ms`,data:this.latencyPts()}]}applyWatch(n){this.instrumented.set(!!n.instrumented);let e=n.latest;this.latest.set(e),e?.errorRate!=null&&e.errorRate>.2?this.liveStatus.set(`failing`):e&&this.liveStatus.set(`ok`);let i=n.series;i?.rate&&this.ratePts.set(i.rate),i?.latencyP95&&this.latencyPts.set(i.latencyP95)}teardown(){this.sub?.unsubscribe(),this.sub=null,this.watching&&(this.live.unsubscribeTopologyWatch(`edge`,this.data.edge.id),this.watching=!1)}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-edge-detail-dialog`]],decls:29,vars:12,consts:[[`mat-dialog-title`,``,1,`flex`,`items-center`,`gap-2`],[1,`flex-auto`],[3,`key`,`help`,`wikiPage`],[1,`min-w-[320px]`,`max-w-lg`,`text-sm`],[1,`font-mono`,`text-xs`,`break-all`],[1,`mt-2`],[1,`mt-1`,`text-neutral-500`],[1,`mt-3`,3,`selectedIndexChange`],[`label`,`Health`],[1,`flex`,`flex-col`,`gap-2`,`py-3`],[1,`text-neutral-500`],[`label`,`Traffic`],[1,`flex`,`flex-col`,`gap-3`,`py-3`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-2`,`pt-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`mb-1`,`px-1`,`text-xs`,`text-neutral-500`],[3,`series`,`chart`,`colors`,`stroke`,`fill`,`tooltip`,`xaxis`,`yaxis`,`dataLabels`,`grid`]],template:function(e,i){e&1&&(js(0,`h2`,0)(1,`span`,1),gC(2,`Edge`),ql(),Cm(3,`ao-env-help`,2),ql(),js(4,`mat-dialog-content`,3)(5,`div`,4),gC(6),ql(),js(7,`div`,5),gC(8),ql(),js(9,`div`,6),gC(10),ww(11,to,1,1),ql(),js(12,`mat-tab-group`,7),xm(`selectedIndexChange`,function(l){return i.onTab(l)}),js(13,`mat-tab`,8)(14,`div`,9)(15,`div`),gC(16,` Status: `),js(17,`strong`),gC(18),ql()(),ww(19,no,2,0,`div`,10)(20,oo,3,2,`div`,10),ql()(),js(21,`mat-tab`,11)(22,`div`,12),ww(23,ro,2,0,`div`,10)(24,lo,4,0,`div`,13)(25,so,8,22),ql()()()(),js(26,`mat-dialog-actions`,14)(27,`button`,15),gC(28,`Close`),ql()()),e&2&&(SI(3),wm(`key`,i.wikiHelp.wikiKey)(`help`,i.wikiHelp.blurb)(`wikiPage`,i.wikiPage),SI(3),Wm(i.data.edge.id),SI(2),qm(``,i.data.edge.from,` → `,i.data.edge.to),SI(2),qm(` kind `,i.data.edge.kind,` · `,i.data.edge.protocol||`—`,` `),SI(),Cw(i.data.edge.port?11:-1),SI(7),Wm(i.liveStatus()||i.data.edge.status||`unknown`),SI(),Cw(i.instrumented()?20:19),SI(4),Cw(i.trafficActive()?i.instrumented()?25:24:23))},dependencies:[ce,De,Te,Me,Ne,lt,dt,hn,Re$1,bn,ge$1,he,w],encapsulation:2})};var co=(t,n)=>n[0];function mo(t,n){t&1&&(js(0,`div`,4)(1,`span`,10),gC(2,`Owned by app`),ql(),js(3,`div`,11),gC(4),ql()()),t&2&&(SI(4),Wm(n))}function uo(t,n){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=n.$implicit;SI(),qm(``,e[0],`: `,e[1])}}function po(t,n){if(t&1&&(js(0,`ul`,5),Sw(1,uo,2,2,`li`,null,co),ql()),t&2){let e=Bw();SI(),Mw(e.breakdownEntries(n))}}var At=class t{data=h(fe);wikiPage=Pe;wikiHelp=We(this.data.node);breakdownEntries(n){return Object.entries(n)}ownerLabel(){let n=this.data.node.ownedByApps||[];return n.length?n.join(`, `):null}catalogLink(){let n=this.data.node.id;return n.includes(`mcp`)?`/capabilities/mcp`:n.includes(`skill`)?`/capabilities/skills`:`/capabilities/agents`}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-cluster-dialog`]],decls:16,vars:9,consts:[[`mat-dialog-title`,``,1,`flex`,`items-center`,`gap-2`],[1,`flex-auto`],[3,`key`,`help`,`wikiPage`],[1,`text-sm`],[1,`mt-2`,`rounded-lg`,`border`,`border-teal-200`,`bg-teal-50`,`px-3`,`py-2`,`text-teal-950`,`dark:border-teal-800`,`dark:bg-teal-950`,`dark:text-teal-100`],[1,`mt-2`,`text-neutral-500`],[1,`mt-3`,`text-neutral-500`],[`matButton`,``,1,`mt-2`,3,`routerLink`,`mat-dialog-close`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[1,`text-xs`,`uppercase`,`tracking-wide`,`text-teal-700`,`dark:text-teal-300`],[1,`mt-0.5`,`font-medium`]],template:function(e,i){if(e&1&&(js(0,`h2`,0)(1,`span`,1),gC(2),ql(),Cm(3,`ao-env-help`,2),ql(),js(4,`mat-dialog-content`,3)(5,`div`),gC(6),ql(),ww(7,mo,5,1,`div`,4),ww(8,po,3,0,`ul`,5),js(9,`p`,6),gC(10,` Members are not expanded on the canvas. Open Capabilities for the full catalog list. `),ql(),js(11,`a`,7),gC(12,` Open Capabilities `),ql()(),js(13,`mat-dialog-actions`,8)(14,`button`,9),gC(15,`Close`),ql()()),e&2){let a,l;SI(2),Jl(``,i.data.node.label,` cluster`),SI(),wm(`key`,i.wikiHelp.wikiKey)(`help`,i.wikiHelp.blurb)(`wikiPage`,i.wikiPage),SI(3),Jl(`Count: `,i.data.node.count??0),SI(),Cw((a=i.ownerLabel())?7:-1,a),SI(),Cw((l=i.data.node.breakdown)?8:-1,l),SI(3),wm(`routerLink`,i.catalogLink())(`mat-dialog-close`,!0)}},dependencies:[ce,De,Te,Me,Ne,lt,dt,Dt$1,w],encapsulation:2})};function go(t,n){t&1&&gC(0,` Paused `)}function ho(t,n){if(t&1&&gC(0),t&2)Jl(` Not live — snapshot `,Bw().generatedAtLabel()||``,` `)}function fo(t,n){if(t&1&&gC(0),t&2)Jl(` Live · `,Bw().generatedAtLabel()||`…`,` `)}function yo(t,n){t&1&&gC(0,` Reconnecting… `)}function bo(t,n){if(t&1&&(js(0,`div`),gC(1),ql()),t&2){let e=n.$implicit;SI(),Wm(e)}}function _o(t,n){if(t&1&&(js(0,`div`,8),Sw(1,bo,2,1,`div`,null,Tw),ql()),t&2){let e=Bw();SI(),Mw(e.store.notes())}}function vo(t,n){t&1&&Cm(0,`ao-error-state`,17),t&2&&wm(`message`,n)}function xo(t,n){t&1&&(js(0,`div`,16),gC(1,`Loading topology…`),ql())}function wo(t,n){t&1&&(js(0,`p`,16),gC(1,` Diagram needs a wider screen — showing table view. `),ql())}function ko(t,n){if(t&1){let e=kw();ww(0,wo,2,0,`p`,16),js(1,`ao-topology-table`,19),xm(`nodeClick`,function(a){yp(e);return vp(Bw().openNode(a))})(`edgeClick`,function(a){yp(e);return vp(Bw().openEdge(a))}),ql()}if(t&2){let e=Bw();Cw(e.forceTable()&&!e.store.tableMode()?0:-1),SI(),wm(`nodes`,e.store.displayNodes())(`edges`,e.store.displayEdges())}}function Co(t,n){if(t&1){let e=kw();js(0,`ao-topology-canvas`,20),xm(`hover`,function(a){yp(e);return vp(Bw().onHover(a))})(`nodeClick`,function(a){yp(e);return vp(Bw().openNode(a))})(`edgeClick`,function(a){yp(e);return vp(Bw().openEdge(a))}),ql()}if(t&2){let e=Bw();wm(`layout`,e.store.layout())(`nodes`,e.store.displayNodes())(`edges`,e.store.displayEdges())(`closure`,e.store.hoverClosure())(`blurred`,e.dialogOpen())(`summary`,e.a11ySummary())}}function So(t){let n=String(t||``).trim();if(!n)return``;let e=new Date(n);return Number.isNaN(e.getTime())?n:new Intl.DateTimeFormat(void 0,{dateStyle:`medium`,timeStyle:`short`}).format(e)}var vi=class t{store=h(Ke);live=h(U);dialog=h(ze);forceTable=Tt(typeof window<`u`?window.innerWidth<=1023:!1);dialogOpen=Tt(!1);hoverTimer=null;a11ySummary=PC(()=>{return`Topology with ${this.store.displayNodes().length} nodes, ${this.store.unhealthyCount()} unhealthy. ${this.store.notes().join(`. `)}`});generatedAtLabel=PC(()=>So(this.store.generatedAt()));ngOnInit(){this.store.start()}ngOnDestroy(){this.store.stop(),this.hoverTimer&&clearTimeout(this.hoverTimer)}onResize(){this.forceTable.set(window.innerWidth<=1023)}onHover(n){if(this.hoverTimer&&clearTimeout(this.hoverTimer),n==null){this.store.setHover(null);return}this.hoverTimer=setTimeout(()=>this.store.setHover(n),60)}openNode(n){if(n.count!=null&&n.count>0&&n.kind===`catalog`){this.dialogOpen.set(!0),this.dialog.open(At,{data:{node:n},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1));return}let e=this.store.displayNodes().some(a=>a.id===n.id);this.dialogOpen.set(!0),this.dialog.open(Nt,{data:{nodeId:n.id,offlineBanner:e?null:`This component went offline at ${new Date().toLocaleTimeString()}`},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1))}openEdge(n){this.dialogOpen.set(!0),this.dialog.open(Mt,{data:{edge:n},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1))}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-page`]],hostBindings:function(e,i){e&1&&xm(`resize`,function(){return i.onResize()},V_)},features:[Jm([Ke])],decls:42,vars:23,consts:[[1,`mx-auto`,`flex`,`h-full`,`w-full`,`max-w-[1600px]`,`flex-auto`,`flex-col`,`gap-3`,`p-4`,`sm:p-6`,`lg:px-8`,`lg:pt-8`],[1,`flex`,`flex-wrap`,`items-start`,`justify-between`,`gap-3`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex`,`flex-wrap`,`items-center`,`gap-2`],[1,`rounded-full`,`px-2.5`,`py-1`,`text-xs`,`font-medium`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[`svgIcon`,`refresh-cw`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`text-sm`,`text-neutral-600`,`dark:border-neutral-700`,`dark:bg-neutral-900`,`dark:text-neutral-300`],[1,`flex`,`flex-wrap`,`items-center`,`gap-3`],[`aria-label`,`Band filter`,3,`change`,`value`],[`value`,`all`],[`value`,`application`],[`value`,`reach`],[`value`,`ao`],[3,`change`,`checked`],[1,`text-sm`,`text-neutral-500`],[3,`message`],[1,`min-h-[520px]`,`flex-auto`,3,`layout`,`nodes`,`edges`,`closure`,`blurred`,`summary`],[3,`nodeClick`,`edgeClick`,`nodes`,`edges`],[1,`min-h-[520px]`,`flex-auto`,3,`hover`,`nodeClick`,`edgeClick`,`layout`,`nodes`,`edges`,`closure`,`blurred`,`summary`]],template:function(e,i){if(e&1&&(js(0,`div`,0)(1,`div`,1)(2,`div`)(3,`div`,2),gC(4,` Topology `),ql(),js(5,`div`,3),gC(6,` Live deployment graph — what is present now, not a docs diagram `),ql()(),js(7,`div`,4)(8,`span`,5),ww(9,go,1,0)(10,ho,1,1)(11,fo,1,1)(12,yo,1,0),ql(),js(13,`button`,6),xm(`click`,function(){return i.store.togglePause()}),gC(14),ql(),js(15,`button`,6),xm(`click`,function(){return i.store.resync()}),Cm(16,`mat-icon`,7),gC(17,` Refresh `),ql(),Cm(18,`ao-topology-legend`),ql()(),ww(19,_o,3,0,`div`,8),js(20,`div`,9)(21,`mat-button-toggle-group`,10),xm(`change`,function(l){return i.store.bandFilter.set(l.value)}),js(22,`mat-button-toggle`,11),gC(23,`All bands`),ql(),js(24,`mat-button-toggle`,12),gC(25,`App`),ql(),js(26,`mat-button-toggle`,13),gC(27,`Reach`),ql(),js(28,`mat-button-toggle`,14),gC(29,`AO`),ql()(),js(30,`mat-slide-toggle`,15),xm(`change`,function(l){return i.store.onlyUnhealthy.set(l.checked)}),gC(31,` Only unhealthy `),ql(),js(32,`mat-slide-toggle`,15),xm(`change`,function(l){return i.store.showNotDeployed.set(l.checked)}),gC(33,` Show not deployed `),ql(),js(34,`mat-slide-toggle`,15),xm(`change`,function(l){return i.store.tableMode.set(l.checked)}),gC(35,` Table view `),ql(),js(36,`span`,16),gC(37),ql()(),ww(38,vo,1,1,`ao-error-state`,17),ww(39,xo,2,0,`div`,16)(40,ko,2,3)(41,Co,1,6,`ao-topology-canvas`,18),ql()),e&2){let a;SI(8),ta$1(`bg-emerald-100`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly())(`text-emerald-800`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly())(`bg-amber-100`,i.store.snapshotOnly()||i.store.paused())(`text-amber-900`,i.store.snapshotOnly()||i.store.paused())(`dark:bg-emerald-950`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly())(`dark:text-emerald-200`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly()),SI(),Cw(i.store.paused()?9:i.store.snapshotOnly()?10:i.live.connected()?11:12),SI(5),Jl(` `,i.store.paused()?`Resume`:`Pause`,` `),SI(5),Cw(i.store.notes().length?19:-1),SI(2),wm(`value`,i.store.bandFilter()),SI(9),wm(`checked`,i.store.onlyUnhealthy()),SI(2),wm(`checked`,i.store.showNotDeployed()),SI(2),wm(`checked`,i.store.tableMode()||i.forceTable()),SI(3),qm(` `,i.store.unhealthyCount(),` unhealthy · `,i.store.displayNodes().length,` nodes `),SI(),Cw((a=i.store.lastError())?38:-1,a),SI(),Cw(i.store.loading()?39:i.store.tableMode()||i.forceTable()?40:41)}},dependencies:[lt,dt,Dt$2,bt,nt,ce,yt,wt$1,oi,Vt,Lt,I,Ct,St,Dt],encapsulation:2})};export{vi as TopologyPage};