import{$t as Uv,A as Ea$1,Ai as zw,Ar as oM,At as Ql,Bn as be,Ci as xv,E as Dm,Ei as yp,Gr as qn$1,Jr as qw,Jt as Tt,K as Ir,Lt as Re,Mi as m,Mt as R,Nn as _r,Nr as pH,O as ED,Oi as zl,P as Fm,Pn as _y,Pr as pT,Rr as pt,Si as xp,St as P,Ti as ym,U as Hr,Un as cG,Ur as ql,Ut as Sw,V as Hd,Vt as SI,W as Hw,Wr as qm,X as Jl,Xt as Tw,Yt as Tv,Z as Jm,_t as Nm,ai as v,an as Vm,bi as xe,ci as vp,cr as ge$1,dr as ia$1,en as Uw,er as fe,et as Kl,fn as Wm,ft as Mw,g as CC,gr as js,hi as ww,ii as uw,in as Vh,ir as gC,it as Ld,j as Ee,ji as l,jn as _i$1,kr as oC,li as vv,ln as WS,lr as h,mi as wm,n as $i$1,nn as V_,oi as vD,on as Vn,p as Bw,pr as ie,qn as dG,rt as L,s as Ap,si as vl,sn as Vs,ti as ta$1,ui as wC,ur as hH,vn as YS,vr as k,wr as kw,wt as PC,x as Cw,xi as xm,y as Cm,yi as xS,yt as O,z as Gw,zn as ay,zr as q}from"./chunk-BpT5wdeN.js";import{n as yt$1,r as Dt,t as wt,u as m$1}from"./main-PVC7GSTJ.js";import"./chunk-BQmX-p_U.js";import{t as f}from"./chunk-3nbb3lx-.js";import{n as dt,r as lt}from"./chunk-CdM5TklW.js";import{n as Ie}from"./chunk-DAoBc3q9.js";import{a as k$1,o as p,r as d,s,t as H}from"./chunk-Diy3XHPK.js";import{a as Vt$1,l as ot,n as It$1,o as W,s as Wt,t as D,u as qt}from"./chunk-vO7qp06V.js";import"./chunk-C99dHixH.js";import"./chunk-WZemQj03.js";import{a as ei$1,c as ni$1,d as si$1,f as ti$1,i as ai$1,l as oi$1,o as ii$1,r as Zt,s as li$1,t as Jt,u as ri}from"./chunk-ByeK_7W8.js";import{t as I}from"./chunk-C8vMj0Az.js";import{i as Lt,r as I$1,t as Bt$1}from"./chunk-DaqQ7sDI.js";import{l as q$1,u as xe$1}from"./chunk-BctHmrjI.js";import{a as hn,i as bn,r as Re$1}from"./chunk-D1jfBsQv.js";import{n as bt$1,r as nt,t as Dt$1}from"./chunk-RnUo9PT92.js";import{n as ge$2,r as he,t as U}from"./chunk-VjoCMFg22.js";function ci(t,n){}var re=class{viewContainerRef;injector;id;role=`dialog`;panelClass=``;hasBackdrop=!0;backdropClass=``;disableClose=!1;closePredicate;width=``;height=``;minWidth;minHeight;maxWidth;maxHeight;positionStrategy;data=null;direction;ariaDescribedBy=null;ariaLabelledBy=null;ariaLabel=null;ariaModal=!1;autoFocus=`first-tabbable`;restoreFocus=!0;scrollStrategy;closeOnNavigation=!0;closeOnDestroy=!0;closeOnOverlayDetachments=!0;disableAnimations=!1;providers;container;templateContext;bindings};var Pt=(()=>{class t extends d{_elementRef=h(ie);_focusTrapFactory=h(WS);_config;_interactivityChecker=h(Tv);_ngZone=h(P);_focusMonitor=h(vv);_renderer=h(Ir);_changeDetectorRef=h(_y);_injector=h(q);_platform=h(ge$1);_document=h(O);_portalOutlet;_focusTrapped=new L;_focusTrap=null;_elementFocusedBeforeDialogWasOpened=null;_closeInteractionType=null;_ariaLabelledByQueue=[];_isDestroyed=!1;constructor(){super(),this._config=h(re,{optional:!0})||new re,this._config.ariaLabelledBy&&this._ariaLabelledByQueue.push(this._config.ariaLabelledBy)}_addAriaLabelledBy(e){this._ariaLabelledByQueue.push(e),this._changeDetectorRef.markForCheck()}_removeAriaLabelledBy(e){let i=this._ariaLabelledByQueue.indexOf(e);i>-1&&(this._ariaLabelledByQueue.splice(i,1),this._changeDetectorRef.markForCheck())}_contentAttached(){this._initializeFocusTrap(),this._captureInitialFocus()}_captureInitialFocus(){this._trapFocus()}ngOnDestroy(){this._focusTrapped.complete(),this._isDestroyed=!0,this._restoreFocus()}attachComponentPortal(e){this._portalOutlet.hasAttached();let i=this._portalOutlet.attachComponentPortal(e);return this._contentAttached(),i}attachTemplatePortal(e){this._portalOutlet.hasAttached();let i=this._portalOutlet.attachTemplatePortal(e);return this._contentAttached(),i}attachDomPortal=e=>{this._portalOutlet.hasAttached();let i=this._portalOutlet.attachDomPortal(e);return this._contentAttached(),i};_recaptureFocus(){this._containsFocus()||this._trapFocus()}_forceFocus(e,i){this._interactivityChecker.isFocusable(e)||(e.tabIndex=-1,this._ngZone.runOutsideAngular(()=>{let a=()=>{o(),c(),e.removeAttribute(`tabindex`)},o=this._renderer.listen(e,`blur`,a),c=this._renderer.listen(e,`mousedown`,a)})),e.focus(i)}_focusByCssSelector(e,i){let a=this._elementRef.nativeElement.querySelector(e);a&&this._forceFocus(a,i)}_trapFocus(e){this._isDestroyed||vl(()=>{let i=this._elementRef.nativeElement;switch(this._config.autoFocus){case!1:case`dialog`:this._containsFocus()||i.focus(e);break;case!0:case`first-tabbable`:this._focusTrap?.focusInitialElement(e)||this._focusDialogContainer(e);break;case`first-heading`:this._focusByCssSelector(`h1, h2, h3, h4, h5, h6, [role="heading"]`,e);break;default:this._focusByCssSelector(this._config.autoFocus,e);break}this._focusTrapped.next()},{injector:this._injector})}_restoreFocus(){let e=this._config.restoreFocus,i=null;if(typeof e==`string`?i=this._document.querySelector(e):typeof e==`boolean`?i=e?this._elementFocusedBeforeDialogWasOpened:null:e&&(i=e),this._config.restoreFocus&&i&&typeof i.focus==`function`){let a=xS(),o=this._elementRef.nativeElement;(!a||a===this._document.body||a===o||o.contains(a))&&(this._focusMonitor?(this._focusMonitor.focusVia(i,this._closeInteractionType),this._closeInteractionType=null):i.focus())}this._focusTrap&&this._focusTrap.destroy()}_focusDialogContainer(e){this._elementRef.nativeElement.focus?.(e)}_containsFocus(){let e=this._elementRef.nativeElement,i=xS();return e===i||e.contains(i)}_initializeFocusTrap(){this._platform.isBrowser&&(this._focusTrap=this._focusTrapFactory.create(this._elementRef.nativeElement),this._document&&(this._elementFocusedBeforeDialogWasOpened=xS()))}static ɵfac=function(i){return new(i||t)};static ɵcmp=Vn({type:t,selectors:[[`cdk-dialog-container`]],viewQuery:function(i,a){if(i&1&&Fm(k$1,7),i&2){let o;Gw(o=zw())&&(a._portalOutlet=o.first)}},hostAttrs:[`tabindex`,`-1`,1,`cdk-dialog-container`],hostVars:6,hostBindings:function(i,a){i&2&&zl(`id`,a._config.id||null)(`role`,a._config.role)(`aria-modal`,a._config.ariaModal)(`aria-labelledby`,a._config.ariaLabel?null:a._ariaLabelledByQueue[0])(`aria-label`,a._config.ariaLabel)(`aria-describedby`,a._config.ariaDescribedBy||null)},features:[ym],decls:1,vars:0,consts:[[`cdkPortalOutlet`,``]],template:function(i,a){i&1&&Dm(0,ci,0,0,`ng-template`,0)},dependencies:[k$1],styles:[`.cdk-dialog-container {
  display: block;
  width: 100%;
  height: 100%;
  min-height: inherit;
  max-height: inherit;
}
`],encapsulation:2,changeDetection:1})}return t})();var Le=class{overlayRef;config;componentInstance=null;componentRef=null;containerInstance;disableClose;closed=new L;backdropClick;keydownEvents;outsidePointerEvents;id;_detachSubscription;constructor(n,e){this.overlayRef=n,this.config=e,this.disableClose=e.disableClose,this.backdropClick=n.backdropClick(),this.keydownEvents=n.keydownEvents(),this.outsidePointerEvents=n.outsidePointerEvents(),this.id=e.id,this.keydownEvents.subscribe(i=>{i.keyCode===27&&!this.disableClose&&!xv(i)&&(i.preventDefault(),this.close(void 0,{focusOrigin:`keyboard`}))}),this.backdropClick.subscribe(()=>{!this.disableClose&&this._canClose()?this.close(void 0,{focusOrigin:`mouse`}):this.containerInstance._recaptureFocus?.()}),this._detachSubscription=n.detachments().subscribe(()=>{e.closeOnOverlayDetachments!==!1&&this.close()})}close(n,e){if(this._canClose(n)){let i=this.closed;this.containerInstance._closeInteractionType=e?.focusOrigin||`program`,this._detachSubscription.unsubscribe(),this.overlayRef.dispose(),i.next(n),i.complete(),this.componentInstance=this.containerInstance=null}}updatePosition(){return this.overlayRef.updatePosition(),this}updateSize(n=``,e=``){return this.overlayRef.updateSize({width:n,height:e}),this}addPanelClass(n){return this.overlayRef.addPanelClass(n),this}removePanelClass(n){return this.overlayRef.removePanelClass(n),this}_canClose(n){let e=this.config;return!!this.containerInstance&&(!e.closePredicate||e.closePredicate(n,e,this.componentInstance))}};var mi=new v(`DialogScrollStrategy`,{providedIn:`root`,factory:()=>{let t=h(q);return()=>Vt$1(t)}});var ui=new v(`DialogData`);var gi=new v(`DefaultDialogConfig`);function pi(t){let n=Tt(t),e=new fe;return{valueSignal:n,get value(){return n()},change:e,ngOnDestroy(){e.complete()}}}var Ot=(()=>{class t{_injector=h(q);_defaultOptions=h(gi,{optional:!0});_parentDialog=h(t,{optional:!0,skipSelf:!0});_overlayContainer=h(Wt);_idGenerator=h(Hd);_openDialogsAtThisLevel=[];_afterAllClosedAtThisLevel=new L;_afterOpenedAtThisLevel=new L;_ariaHiddenElements=new Map;_scrollStrategy=h(mi);get openDialogs(){return this._parentDialog?this._parentDialog.openDialogs:this._openDialogsAtThisLevel}get afterOpened(){return this._parentDialog?this._parentDialog.afterOpened:this._afterOpenedAtThisLevel}afterAllClosed=vD(()=>this.openDialogs.length?this._getAfterAllClosed():this._getAfterAllClosed().pipe(_i$1(void 0)));open(e,i){i=l(l({},this._defaultOptions||new re),i),i.id=i.id||this._idGenerator.getId(`cdk-dialog-`),i.id&&this.getDialogById(i.id);let o=this._getOverlayConfig(i),c=ot(this._injector,o),u=new Le(c,i),D=this._attachContainer(c,u,i);if(u.containerInstance=D,!this.openDialogs.length){let k=this._overlayContainer.getContainerElement();D._focusTrapped?D._focusTrapped.pipe(pt(1)).subscribe(()=>{this._hideNonDialogContentFromAssistiveTechnology(k)}):this._hideNonDialogContentFromAssistiveTechnology(k)}return this._attachDialogContent(e,u,D,i),this.openDialogs.push(u),u.closed.subscribe(()=>this._removeOpenDialog(u,!0)),this.afterOpened.next(u),u}closeAll(){It(this.openDialogs,e=>e.close())}getDialogById(e){return this.openDialogs.find(i=>i.id===e)}ngOnDestroy(){It(this._openDialogsAtThisLevel,e=>{e.config.closeOnDestroy===!1&&this._removeOpenDialog(e,!1)}),It(this._openDialogsAtThisLevel,e=>e.close()),this._afterAllClosedAtThisLevel.complete(),this._afterOpenedAtThisLevel.complete(),this._openDialogsAtThisLevel=[]}_getOverlayConfig(e){let i=new D({positionStrategy:e.positionStrategy||It$1().centerHorizontally().centerVertically(),scrollStrategy:e.scrollStrategy||this._scrollStrategy(),panelClass:e.panelClass,hasBackdrop:e.hasBackdrop,direction:e.direction,minWidth:e.minWidth,minHeight:e.minHeight,maxWidth:e.maxWidth,maxHeight:e.maxHeight,width:e.width,height:e.height,disposeOnNavigation:e.closeOnNavigation,disableAnimations:e.disableAnimations});return e.backdropClass&&(i.backdropClass=e.backdropClass),i}_attachContainer(e,i,a){let o=a.injector||a.viewContainerRef?.injector,c=[{provide:re,useValue:a},{provide:Le,useValue:i},{provide:W,useValue:e}],u;a.container?typeof a.container==`function`?u=a.container:(u=a.container.type,c.push(...a.container.providers(a))):u=Pt;let D=new p(u,a.viewContainerRef,q.create({parent:o||this._injector,providers:c}));return e.attach(D).instance}_attachDialogContent(e,i,a,o){if(e instanceof _r){let c=this._createInjector(o,i,a,void 0),u={$implicit:o.data,dialogRef:i};o.templateContext&&(u=l(l({},u),typeof o.templateContext==`function`?o.templateContext():o.templateContext)),a.attachTemplatePortal(new s(e,null,u,c))}else{let c=this._createInjector(o,i,a,this._injector),u=a.attachComponentPortal(new p(e,o.viewContainerRef,c,null,o.bindings));i.componentRef=u,i.componentInstance=u.instance}}_createInjector(e,i,a,o){let c=e.injector||e.viewContainerRef?.injector,u=[{provide:ui,useValue:e.data},{provide:Le,useValue:i}];return e.providers&&(typeof e.providers==`function`?u.push(...e.providers(i,e,a)):u.push(...e.providers)),e.direction&&(!c||!c.get(oM,null,{optional:!0}))&&u.push({provide:oM,useValue:pi(e.direction)}),q.create({parent:c||o,providers:u})}_removeOpenDialog(e,i){let a=this.openDialogs.indexOf(e);a>-1&&(this.openDialogs.splice(a,1),this.openDialogs.length||(this._ariaHiddenElements.forEach((o,c)=>{o?c.setAttribute(`aria-hidden`,o):c.removeAttribute(`aria-hidden`)}),this._ariaHiddenElements.clear(),i&&this._getAfterAllClosed().next()))}_hideNonDialogContentFromAssistiveTechnology(e){if(e.parentElement){let i=e.parentElement.children;for(let a=i.length-1;a>-1;a--){let o=i[a];o!==e&&o.nodeName!==`SCRIPT`&&o.nodeName!==`STYLE`&&!o.hasAttribute(`aria-live`)&&!o.hasAttribute(`popover`)&&(this._ariaHiddenElements.set(o,o.getAttribute(`aria-hidden`)),o.setAttribute(`aria-hidden`,`true`))}}}_getAfterAllClosed(){let e=this._parentDialog;return e?e._getAfterAllClosed():this._afterAllClosedAtThisLevel}static ɵfac=function(i){return new(i||t)};static ɵprov=k({token:t,factory:t.ɵfac})}return t})();function It(t,n){let e=t.length;for(;e--;)n(t[e])}var Gn=(()=>{class t{static ɵfac=function(i){return new(i||t)};static ɵmod=xe({type:t});static ɵinj=Ee({providers:[Ot],imports:[qt,H,YS,H]})}return t})();function hi(t,n){}var ft=class{viewContainerRef;injector;id;role=`dialog`;panelClass=``;hasBackdrop=!0;backdropClass=``;disableClose=!1;closePredicate;width=``;height=``;minWidth;minHeight;maxWidth;maxHeight;position;data=null;direction;ariaDescribedBy=null;ariaLabelledBy=null;ariaLabel=null;ariaModal=!1;autoFocus=`first-tabbable`;restoreFocus=!0;delayFocusTrap=!0;scrollStrategy;closeOnNavigation=!0;enterAnimationDuration;exitAnimationDuration;bindings};var Rt=`mdc-dialog--open`;var jn=`mdc-dialog--opening`;var Wn=`mdc-dialog--closing`;var fi=150;var yi=75;var _i=(()=>{class t extends Pt{_animationStateChanged=new fe;_animationsEnabled=!Ea$1();_actionSectionCount=0;_hostElement=this._elementRef.nativeElement;_enterAnimationDuration=this._animationsEnabled?$n(this._config.enterAnimationDuration)??fi:0;_exitAnimationDuration=this._animationsEnabled?$n(this._config.exitAnimationDuration)??yi:0;_animationTimer=null;_contentAttached(){super._contentAttached(),this._startOpenAnimation()}_startOpenAnimation(){this._animationStateChanged.emit({state:`opening`,totalTime:this._enterAnimationDuration}),this._animationsEnabled?(this._hostElement.style.setProperty(qn,`${this._enterAnimationDuration}ms`),this._requestAnimationFrame(()=>this._hostElement.classList.add(jn,Rt)),this._waitForAnimationToComplete(this._enterAnimationDuration,this._finishDialogOpen)):(this._hostElement.classList.add(Rt),Promise.resolve().then(()=>this._finishDialogOpen()))}_startExitAnimation(){this._animationStateChanged.emit({state:`closing`,totalTime:this._exitAnimationDuration}),this._hostElement.classList.remove(Rt),this._animationsEnabled?(this._hostElement.style.setProperty(qn,`${this._exitAnimationDuration}ms`),this._requestAnimationFrame(()=>this._hostElement.classList.add(Wn)),this._waitForAnimationToComplete(this._exitAnimationDuration,this._finishDialogClose)):Promise.resolve().then(()=>this._finishDialogClose())}_updateActionSectionCount(e){this._actionSectionCount+=e,this._changeDetectorRef.markForCheck()}_finishDialogOpen=()=>{this._clearAnimationClasses(),this._openAnimationDone(this._enterAnimationDuration)};_finishDialogClose=()=>{this._clearAnimationClasses(),this._animationStateChanged.emit({state:`closed`,totalTime:this._exitAnimationDuration})};_clearAnimationClasses(){this._hostElement.classList.remove(jn,Wn)}_waitForAnimationToComplete(e,i){this._animationTimer!==null&&clearTimeout(this._animationTimer),this._animationTimer=setTimeout(i,e)}_requestAnimationFrame(e){this._ngZone.runOutsideAngular(()=>{typeof requestAnimationFrame==`function`?requestAnimationFrame(e):e()})}_captureInitialFocus(){this._config.delayFocusTrap||this._trapFocus()}_openAnimationDone(e){this._config.delayFocusTrap&&this._trapFocus(),this._animationStateChanged.next({state:`opened`,totalTime:e})}ngOnDestroy(){super.ngOnDestroy(),this._animationTimer!==null&&clearTimeout(this._animationTimer)}attachComponentPortal(e){let i=super.attachComponentPortal(e);return i.location.nativeElement.classList.add(`mat-mdc-dialog-component-host`),i}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵcmp=Vn({type:t,selectors:[[`mat-dialog-container`]],hostAttrs:[`tabindex`,`-1`,1,`mat-mdc-dialog-container`,`mdc-dialog`],hostVars:10,hostBindings:function(i,a){i&2&&(Nm(`id`,a._config.id),zl(`aria-modal`,a._config.ariaModal)(`role`,a._config.role)(`aria-labelledby`,a._config.ariaLabel?null:a._ariaLabelledByQueue[0])(`aria-label`,a._config.ariaLabel)(`aria-describedby`,a._config.ariaDescribedBy||null),ta$1(`_mat-animation-noopable`,!a._animationsEnabled)(`mat-mdc-dialog-container-with-actions`,a._actionSectionCount>0))},features:[ym],decls:3,vars:0,consts:[[1,`mat-mdc-dialog-inner-container`,`mdc-dialog__container`],[1,`mat-mdc-dialog-surface`,`mdc-dialog__surface`],[`cdkPortalOutlet`,``]],template:function(i,a){i&1&&(js(0,`div`,0)(1,`div`,1),Dm(2,hi,0,0,`ng-template`,2),ql()())},dependencies:[k$1],styles:[`.mat-mdc-dialog-container {
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
`],encapsulation:2,changeDetection:1})}return t})();var qn=`--mat-dialog-transition-duration`;function $n(t){return t==null?null:typeof t==`number`?t:t.endsWith(`ms`)?Ld(t.substring(0,t.length-2)):t.endsWith(`s`)?Ld(t.substring(0,t.length-1))*1e3:t===`0`?0:null}var ht=(function(t){return t[t.OPEN=0]=`OPEN`,t[t.CLOSING=1]=`CLOSING`,t[t.CLOSED=2]=`CLOSED`,t})(ht||{});var Q=class{_ref;_config;_containerInstance;componentInstance;componentRef=null;disableClose;id;_afterOpened=new Hr(1);_beforeClosed=new Hr(1);_result;_closeFallbackTimeout;_state=ht.OPEN;_closeInteractionType;constructor(n,e,i){this._ref=n,this._config=e,this._containerInstance=i,this.disableClose=e.disableClose,this.id=n.id,n.addPanelClass(`mat-mdc-dialog-panel`),i._animationStateChanged.pipe(be(a=>a.state===`opened`),pt(1)).subscribe(()=>{this._afterOpened.next(),this._afterOpened.complete()}),i._animationStateChanged.pipe(be(a=>a.state===`closed`),pt(1)).subscribe(()=>{clearTimeout(this._closeFallbackTimeout),this._finishDialogClose()}),n.overlayRef.detachments().subscribe(()=>{this._beforeClosed.next(this._result),this._beforeClosed.complete(),this._finishDialogClose()}),ED(this.backdropClick(),this.keydownEvents().pipe(be(a=>a.keyCode===27&&!this.disableClose&&!xv(a)))).subscribe(a=>{this.disableClose||(a.preventDefault(),Xn(this,a.type===`keydown`?`keyboard`:`mouse`))})}close(n){let e=this._config.closePredicate;e&&!e(n,this._config,this.componentInstance)||(this._result=n,this._containerInstance._animationStateChanged.pipe(be(i=>i.state===`closing`),pt(1)).subscribe(i=>{this._beforeClosed.next(n),this._beforeClosed.complete(),this._ref.overlayRef.detachBackdrop(),this._closeFallbackTimeout=setTimeout(()=>this._finishDialogClose(),i.totalTime+100)}),this._state=ht.CLOSING,this._containerInstance._startExitAnimation())}afterOpened(){return this._afterOpened}afterClosed(){return this._ref.closed}beforeClosed(){return this._beforeClosed}backdropClick(){return this._ref.backdropClick}keydownEvents(){return this._ref.keydownEvents}updatePosition(n){let e=this._ref.config.positionStrategy;return n&&(n.left||n.right)?n.left?e.left(n.left):e.right(n.right):e.centerHorizontally(),n&&(n.top||n.bottom)?n.top?e.top(n.top):e.bottom(n.bottom):e.centerVertically(),this._ref.updatePosition(),this}updateSize(n=``,e=``){return this._ref.updateSize(n,e),this}addPanelClass(n){return this._ref.addPanelClass(n),this}removePanelClass(n){return this._ref.removePanelClass(n),this}getState(){return this._state}_finishDialogClose(){this._state=ht.CLOSED,this._ref.close(this._result,{focusOrigin:this._closeInteractionType}),this.componentInstance=null}};function Xn(t,n,e){return t._closeInteractionType=n,t.close(e)}var ge=new v(`MatMdcDialogData`);var bi=new v(`mat-mdc-dialog-default-options`);var vi=new v(`mat-mdc-dialog-scroll-strategy`,{providedIn:`root`,factory:()=>{let t=h(q);return()=>Vt$1(t)}});var Fe=(()=>{class t{_defaultOptions=h(bi,{optional:!0});_scrollStrategy=h(vi);_parentDialog=h(t,{optional:!0,skipSelf:!0});_idGenerator=h(Hd);_injector=h(q);_dialog=h(Ot);_animationsDisabled=Ea$1();_openDialogsAtThisLevel=[];_afterAllClosedAtThisLevel=new L;_afterOpenedAtThisLevel=new L;dialogConfigClass=ft;_dialogRefConstructor;_dialogContainerType;_dialogDataToken;get openDialogs(){return this._parentDialog?this._parentDialog.openDialogs:this._openDialogsAtThisLevel}get afterOpened(){return this._parentDialog?this._parentDialog.afterOpened:this._afterOpenedAtThisLevel}_getAfterAllClosed(){let e=this._parentDialog;return e?e._getAfterAllClosed():this._afterAllClosedAtThisLevel}afterAllClosed=vD(()=>this.openDialogs.length?this._getAfterAllClosed():this._getAfterAllClosed().pipe(_i$1(void 0)));constructor(){this._dialogRefConstructor=Q,this._dialogContainerType=_i,this._dialogDataToken=ge}open(e,i){let a;i=l(l({},this._defaultOptions||new ft),i),i.id=i.id||this._idGenerator.getId(`mat-mdc-dialog-`),i.scrollStrategy=i.scrollStrategy||this._scrollStrategy();let o=this._dialog.open(e,m(l({},i),{positionStrategy:It$1(this._injector).centerHorizontally().centerVertically(),disableClose:!0,closePredicate:void 0,closeOnDestroy:!1,closeOnOverlayDetachments:!1,disableAnimations:this._animationsDisabled||i.enterAnimationDuration?.toLocaleString()===`0`||i.exitAnimationDuration?.toString()===`0`,container:{type:this._dialogContainerType,providers:()=>[{provide:this.dialogConfigClass,useValue:i},{provide:re,useValue:i}]},templateContext:()=>({dialogRef:a}),providers:(c,u,D)=>(a=new this._dialogRefConstructor(c,i,D),a.updatePosition(i?.position),[{provide:this._dialogContainerType,useValue:D},{provide:this._dialogDataToken,useValue:u.data},{provide:this._dialogRefConstructor,useValue:a}])}));return a.componentRef=o.componentRef,a.componentInstance=o.componentInstance,this.openDialogs.push(a),this.afterOpened.next(a),a.afterClosed().subscribe(()=>{let c=this.openDialogs.indexOf(a);c>-1&&(this.openDialogs.splice(c,1),this.openDialogs.length||this._getAfterAllClosed().next())}),a}closeAll(){this._closeDialogs(this.openDialogs)}getDialogById(e){return this.openDialogs.find(i=>i.id===e)}ngOnDestroy(){this._closeDialogs(this._openDialogsAtThisLevel),this._afterAllClosedAtThisLevel.complete(),this._afterOpenedAtThisLevel.complete()}_closeDialogs(e){let i=e.length;for(;i--;)e[i].close()}static ɵfac=function(i){return new(i||t)};static ɵprov=k({token:t,factory:t.ɵfac})}return t})();var we=(()=>{class t{dialogRef=h(Q,{optional:!0});_elementRef=h(ie);_dialog=h(Fe);ariaLabel;type=`button`;dialogResult;_matDialogClose;ngOnInit(){this.dialogRef||(this.dialogRef=Yn(this._elementRef,this._dialog.openDialogs))}ngOnChanges(e){let i=e._matDialogClose;i&&(this.dialogResult=i.currentValue)}_onButtonClick(e){this._elementRef.nativeElement.getAttribute(`aria-disabled`)!==`true`&&Xn(this.dialogRef,e.screenX===0&&e.screenY===0?`keyboard`:`mouse`,this.dialogResult)}static ɵfac=function(i){return new(i||t)};static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-close`,``],[``,`matDialogClose`,``]],hostVars:2,hostBindings:function(i,a){i&1&&xm(`click`,function(c){return a._onButtonClick(c)}),i&2&&zl(`aria-label`,a.ariaLabel||null)(`type`,a.type)},inputs:{ariaLabel:[0,`aria-label`,`ariaLabel`],type:`type`,dialogResult:[0,`mat-dialog-close`,`dialogResult`],_matDialogClose:[0,`matDialogClose`,`_matDialogClose`]},exportAs:[`matDialogClose`],features:[Vs]})}return t})();var Kn=(()=>{class t{_dialogRef=h(Q,{optional:!0});_elementRef=h(ie);_dialog=h(Fe);ngOnInit(){this._dialogRef||(this._dialogRef=Yn(this._elementRef,this._dialog.openDialogs)),this._dialogRef&&Promise.resolve().then(()=>{this._onAdd()})}ngOnDestroy(){this._dialogRef?._containerInstance&&Promise.resolve().then(()=>{this._onRemove()})}static ɵfac=function(i){return new(i||t)};static ɵdir=Re({type:t})}return t})();var Ce=(()=>{class t extends Kn{id=h(Hd).getId(`mat-mdc-dialog-title-`);_onAdd(){this._dialogRef._containerInstance?._addAriaLabelledBy?.(this.id)}_onRemove(){this._dialogRef?._containerInstance?._removeAriaLabelledBy?.(this.id)}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-title`,``],[``,`matDialogTitle`,``]],hostAttrs:[1,`mat-mdc-dialog-title`,`mdc-dialog__title`],hostVars:1,hostBindings:function(i,a){i&2&&Nm(`id`,a.id)},inputs:{id:`id`},exportAs:[`matDialogTitle`],features:[ym]})}return t})();var Se=(()=>{class t{static ɵfac=function(i){return new(i||t)};static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-content`,``],[`mat-dialog-content`],[``,`matDialogContent`,``]],hostAttrs:[1,`mat-mdc-dialog-content`,`mdc-dialog__content`],features:[uw([Ie])]})}return t})();var ke=(()=>{class t extends Kn{align;_onAdd(){this._dialogRef._containerInstance?._updateActionSectionCount?.(1)}_onRemove(){this._dialogRef._containerInstance?._updateActionSectionCount?.(-1)}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-actions`,``],[`mat-dialog-actions`],[``,`matDialogActions`,``]],hostAttrs:[1,`mat-mdc-dialog-actions`,`mdc-dialog__actions`],hostVars:6,hostBindings:function(i,a){i&2&&ta$1(`mat-mdc-dialog-actions-align-start`,a.align===`start`)(`mat-mdc-dialog-actions-align-center`,a.align===`center`)(`mat-mdc-dialog-actions-align-end`,a.align===`end`)},inputs:{align:`align`},features:[ym]})}return t})();function Yn(t,n){let e=t.nativeElement.parentElement;for(;e&&!e.classList.contains(`mat-mdc-dialog-container`);)e=e.parentElement;return e?n.find(i=>i.id===e.id):null}var se=(()=>{class t{static ɵfac=function(i){return new(i||t)};static ɵmod=xe({type:t});static ɵinj=Ee({providers:[Fe],imports:[Gn,qt,H,Uv]})}return t})();var xi=[`switch`];var wi=[`*`];function Ci(t,n){t&1&&(js(0,`span`,11),Ap(),js(1,`svg`,13),Cm(2,`path`,14),ql(),js(3,`svg`,15),Cm(4,`path`,16),ql()())}var Si=new v(`mat-slide-toggle-default-options`,{providedIn:`root`,factory:()=>({disableToggleValue:!1,hideIcon:!1,disabledInteractive:!1})});var yt=class{source;checked;constructor(n,e){this.source=n,this.checked=e}};var Ft=(()=>{class t{_elementRef=h(ie);_focusMonitor=h(vv);_changeDetectorRef=h(_y);defaults=h(Si);_onChange=e=>{};_onTouched=()=>{};_validatorOnChange=()=>{};_uniqueId;_checked=!1;_createChangeEvent(e){return new yt(this,e)}_labelId;get buttonId(){return`${this.id||this._uniqueId}-button`}_switchElement;focus(){this._switchElement.nativeElement.focus()}_noopAnimations=Ea$1();_focused=!1;name=null;id;labelPosition=`after`;ariaLabel=null;ariaLabelledby=null;ariaDescribedby;required=!1;color;disabled=!1;fullWidth=!1;disableRipple=!1;tabIndex=0;get checked(){return this._checked}set checked(e){this._checked=e,this._changeDetectorRef.markForCheck()}hideIcon;disabledInteractive;change=new fe;toggleChange=new fe;get inputId(){return`${this.id||this._uniqueId}-input`}constructor(){h(qn$1).load(dG);let e=h(new ay(`tabindex`),{optional:!0}),i=this.defaults;this.tabIndex=e==null?0:parseInt(e)||0,this.color=i.color||`accent`,this.id=this._uniqueId=h(Hd).getId(`mat-mdc-slide-toggle-`),this.hideIcon=i.hideIcon??!1,this.disabledInteractive=i.disabledInteractive??!1,this._labelId=this._uniqueId+`-label`}ngAfterContentInit(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{e===`keyboard`||e===`program`?(this._focused=!0,this._changeDetectorRef.markForCheck()):e||Promise.resolve().then(()=>{this._focused=!1,this._onTouched(),this._changeDetectorRef.markForCheck()})})}ngOnChanges(e){e.required&&this._validatorOnChange()}ngOnDestroy(){this._focusMonitor.stopMonitoring(this._elementRef)}writeValue(e){this.checked=!!e}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}validate(e){return this.required&&e.value!==!0?{required:!0}:null}registerOnValidatorChange(e){this._validatorOnChange=e}setDisabledState(e){this.disabled=e,this._changeDetectorRef.markForCheck()}toggle(){this.checked=!this.checked,this._onChange(this.checked)}_emitChangeEvent(){this._onChange(this.checked),this.change.emit(this._createChangeEvent(this.checked))}_handleClick(){this.disabled||(this.toggleChange.emit(),this.defaults.disableToggleValue||(this.checked=!this.checked,this._onChange(this.checked),this.change.emit(new yt(this,this.checked))))}_getAriaLabelledBy(){return this.ariaLabelledby?this.ariaLabelledby:this.ariaLabel?null:this._labelId}static ɵfac=function(i){return new(i||t)};static ɵcmp=Vn({type:t,selectors:[[`mat-slide-toggle`]],viewQuery:function(i,a){if(i&1&&Fm(xi,5),i&2){let o;Gw(o=zw())&&(a._switchElement=o.first)}},hostAttrs:[1,`mat-mdc-slide-toggle`],hostVars:15,hostBindings:function(i,a){i&2&&(Nm(`id`,a.id),zl(`tabindex`,null)(`aria-label`,null)(`name`,null)(`aria-labelledby`,null),oC(a.color?`mat-`+a.color:``),ta$1(`mat-mdc-slide-toggle-focused`,a._focused)(`mat-mdc-slide-toggle-checked`,a.checked)(`mat-slide-toggle-full-width`,a.fullWidth)(`_mat-animation-noopable`,a._noopAnimations))},inputs:{name:`name`,id:`id`,labelPosition:`labelPosition`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaLabelledby:[0,`aria-labelledby`,`ariaLabelledby`],ariaDescribedby:[0,`aria-describedby`,`ariaDescribedby`],required:[2,`required`,`required`,ia$1],color:`color`,disabled:[2,`disabled`,`disabled`,ia$1],fullWidth:[2,`fullWidth`,`fullWidth`,ia$1],disableRipple:[2,`disableRipple`,`disableRipple`,ia$1],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:pT(e)],checked:[2,`checked`,`checked`,ia$1],hideIcon:[2,`hideIcon`,`hideIcon`,ia$1],disabledInteractive:[2,`disabledInteractive`,`disabledInteractive`,ia$1]},outputs:{change:`change`,toggleChange:`toggleChange`},exportAs:[`matSlideToggle`],features:[Jm([{provide:xe$1,useExisting:$i$1(()=>t),multi:!0},{provide:q$1,useExisting:t,multi:!0}]),Vs],ngContentSelectors:wi,decls:14,vars:27,consts:[[`switch`,``],[`mat-internal-form-field`,``,3,`labelPosition`],[`role`,`switch`,`type`,`button`,1,`mdc-switch`,3,`click`,`tabIndex`,`disabled`],[1,`mat-mdc-slide-toggle-touch-target`],[1,`mdc-switch__track`],[1,`mdc-switch__handle-track`],[1,`mdc-switch__handle`],[1,`mdc-switch__shadow`],[1,`mdc-elevation-overlay`],[1,`mdc-switch__ripple`],[`mat-ripple`,``,1,`mat-mdc-slide-toggle-ripple`,`mat-focus-indicator`,3,`matRippleTrigger`,`matRippleDisabled`,`matRippleCentered`],[1,`mdc-switch__icons`],[1,`mdc-label`,3,`click`,`for`],[`viewBox`,`0 0 24 24`,`aria-hidden`,`true`,1,`mdc-switch__icon`,`mdc-switch__icon--on`],[`d`,`M19.69,5.23L8.96,15.96l-4.23-4.23L2.96,13.5l6,6L21.46,7L19.69,5.23z`],[`viewBox`,`0 0 24 24`,`aria-hidden`,`true`,1,`mdc-switch__icon`,`mdc-switch__icon--off`],[`d`,`M20 13H4v-2h16v2z`]],template:function(i,a){if(i&1&&(Hw(),js(0,`div`,1)(1,`button`,2,0),xm(`click`,function(){return a._handleClick()}),Cm(3,`div`,3)(4,`span`,4),js(5,`span`,5)(6,`span`,6)(7,`span`,7),Cm(8,`span`,8),ql(),js(9,`span`,9),Cm(10,`span`,10),ql(),ww(11,Ci,5,0,`span`,11),ql()()(),js(12,`label`,12),xm(`click`,function(c){return c.stopPropagation()}),Uw(13),ql()()),i&2){let o=qw(2);wm(`labelPosition`,a.labelPosition),SI(),ta$1(`mdc-switch--selected`,a.checked)(`mdc-switch--unselected`,!a.checked)(`mdc-switch--checked`,a.checked)(`mdc-switch--disabled`,a.disabled)(`mat-mdc-slide-toggle-disabled-interactive`,a.disabledInteractive),wm(`tabIndex`,a.disabled&&!a.disabledInteractive?-1:a.tabIndex)(`disabled`,a.disabled&&!a.disabledInteractive),zl(`id`,a.buttonId)(`name`,a.name)(`aria-label`,a.ariaLabel)(`aria-labelledby`,a._getAriaLabelledBy())(`aria-describedby`,a.ariaDescribedby)(`aria-required`,a.required||null)(`aria-checked`,a.checked)(`aria-disabled`,a.disabled&&a.disabledInteractive?`true`:null),SI(9),wm(`matRippleTrigger`,o)(`matRippleDisabled`,a.disableRipple||a.disabled)(`matRippleCentered`,!0),SI(),Cw(a.hideIcon?-1:11),SI(),wm(`for`,a.buttonId),zl(`id`,a._labelId)}},dependencies:[cG,m$1],styles:[`.mdc-switch {
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
`],encapsulation:2})}return t})();var Un=(()=>{class t{static ɵfac=function(i){return new(i||t)};static ɵmod=xe({type:t});static ɵinj=Ee({imports:[Ft,Uv]})}return t})();var Di={ui:{band:`application`,rank:0,lane:0,order:0},"overlay-source":{band:`application`,rank:0,lane:1,order:0},"local-tools":{band:`application`,rank:0,lane:2,order:0},openclaw:{band:`application`,rank:0,lane:3,order:0},"session-bridge":{band:`reach`,rank:0,lane:0,order:0},"overlay-packer":{band:`reach`,rank:0,lane:1,order:0},"local-mcp-host":{band:`reach`,rank:0,lane:2,order:0},"speech-client":{band:`reach`,rank:0,lane:3,order:0},"mtls-enroller":{band:`reach`,rank:0,lane:4,order:0},engine:{band:`ao`,rank:0,lane:0,order:0},endpoint:{band:`ao`,rank:0,lane:1,order:0},"web-ui":{band:`ao`,rank:0,lane:5,order:0},planner:{band:`ao`,rank:1,lane:0,order:0},catalog:{band:`ao`,rank:2,lane:0,order:0},"model-backend":{band:`ao`,rank:2,lane:1,order:0},"model-runtime":{band:`ao`,rank:2,lane:2,order:0},"execution-backend":{band:`ao`,rank:3,lane:0,order:0},worker:{band:`ao`,rank:3,lane:1,order:0},"mcp-sidecar":{band:`ao`,rank:3,lane:2,order:0},platform:{band:`ao`,rank:4,lane:0,order:0},storage:{band:`ao`,rank:4,lane:1,order:0}};var Bt={"engine/session-overlay":1,"engine/mcp-tunnel":2,"engine/direct-agent":3,"engine/hello-speech":4,"engine/mtls-enrol":4,"speech/stt":3,"speech/tts":4};var zt={"catalog/agents":0,"catalog/mcp":1,"catalog/skills":2};var Vt={"models/backends":3,"models/ollama":4,"models/remote":5};var Qn=140;var Zn=52;var Ti=52;var Gt=64;var _t=28;var Ht=22;var De=32;var Ni=56;var Be=8;var Mi=8;var Jn={application:`1 · Application`,reach:`2 · AO Reach`,ao:`3 · Agentic Orchestration`};function Ei(t){let n=Di[t.kind]||{band:t.band||`ao`,rank:0,lane:Be-1,order:99},e=n.lane,i=n.order;return t.kind===`endpoint`&&Bt[t.id]!=null&&(e=Bt[t.id]),t.kind===`catalog`&&zt[t.id]!=null&&(e=zt[t.id],i=zt[t.id]),(t.kind===`model-runtime`||t.kind===`model-backend`)&&(Vt[t.id]!=null?(e=Vt[t.id],i=Vt[t.id]):t.kind===`model-backend`&&(e=3)),t.id===`speech/stt`||t.id===`speech/tts`?{band:`ao`,rank:0,lane:Bt[t.id]??3,order:10}:{band:t.band||n.band,rank:n.rank,lane:e,order:i}}function Ai(t){return t.instrumented===!1&&t.status===`healthy`||!t.instrumented&&t.status===`healthy`?`unknown`:t.status||`unknown`}function Ii(t,n){return{x:t.x-n,y:t.y-n,w:t.width+n*2,h:t.height+n*2,id:t.id}}function Pi(t,n,e){let i=Math.min(t.x,n.x),a=Math.max(t.x,n.x),o=Math.min(t.y,n.y),c=Math.max(t.y,n.y),u=e.x+e.w,D=e.y+e.h;return Math.abs(t.x-n.x)<.5?t.x>=e.x&&t.x<=u&&c>=e.y&&o<=D:Math.abs(t.y-n.y)<.5?t.y>=e.y&&t.y<=D&&a>=e.x&&i<=u:!1}function Oi(t,n){for(let e=0;e<t.length-1;e++)for(let i of n)if(Pi(t[e],t[e+1],i))return!0;return!1}function Ri(t){if(t.length<3)return t;let n=[t[0]];for(let e=1;e<t.length-1;e++){let i=n[n.length-1],a=t[e],o=t[e+1];Math.abs(i.x-a.x)<.5&&Math.abs(a.x-o.x)<.5||Math.abs(i.y-a.y)<.5&&Math.abs(a.y-o.y)<.5||n.push(a)}return n.push(t[t.length-1]),n}function ei(t){return Ri(t).map((e,i)=>`${i===0?`M`:`L`} ${ti(e.x)} ${ti(e.y)}`).join(` `)}function ti(t){return Math.round(t*10)/10}function Li(t,n){let e=t.x+t.width/2,i=t.y+t.height/2,a=n.x+n.width/2,o=n.y+n.height/2,c=o-i,u=a-e;return Math.abs(c)>=Math.abs(u)?{vertical:!0,s:{x:e,y:c>=0?t.y+t.height:t.y},t:{x:a,y:c>=0?n.y:n.y+n.height}}:{vertical:!1,s:{x:u>=0?t.x+t.width:t.x,y:i},t:{x:u>=0?n.x:n.x+n.width,y:o}}}function Fi(t,n,e,i,a){let{s:o,t:c}=Li(t,n),u=i.filter(A=>A.id!==t.id&&A.id!==n.id).map(A=>Ii(A,Mi)),D=De/2,k=a-De/2,_=(o.y+c.y)/2,L=(o.x+c.x)/2,O=Math.min(o.y,c.y)-Gt/3,P=Math.max(o.y,c.y)+Gt/3,W=e===`reverse-tunnel`?16:0,S=o.x+W,g=c.x+W,y=[];e===`bypass`&&y.push([{x:S,y:o.y},{x:k,y:o.y},{x:k,y:c.y},{x:g,y:c.y}]),Math.abs(S-g)<1&&(y.push([{x:S,y:o.y},{x:g,y:c.y}]),y.push([{x:S,y:o.y},{x:S+24,y:o.y},{x:S+24,y:c.y},{x:g,y:c.y}])),Math.abs(o.y-c.y)<1&&(y.push([{x:S,y:o.y},{x:g,y:c.y}]),y.push([{x:S,y:o.y},{x:S,y:O},{x:g,y:O},{x:g,y:c.y}])),y.push([{x:S,y:o.y},{x:S,y:_},{x:g,y:_},{x:g,y:c.y}]),y.push([{x:S,y:o.y},{x:L,y:o.y},{x:L,y:c.y},{x:g,y:c.y}]),y.push([{x:S,y:o.y},{x:S,y:P},{x:g,y:P},{x:g,y:c.y}]),y.push([{x:S,y:o.y},{x:S,y:O},{x:g,y:O},{x:g,y:c.y}]),y.push([{x:S,y:o.y},{x:D,y:o.y},{x:D,y:c.y},{x:g,y:c.y}]),y.push([{x:S,y:o.y},{x:k,y:o.y},{x:k,y:c.y},{x:g,y:c.y}]),y.push([{x:S,y:o.y},{x:S,y:P},{x:k,y:P},{x:k,y:O},{x:g,y:O},{x:g,y:c.y}]);for(let A of y)if(!Oi(A,u))return ei(A);return ei([{x:S,y:o.y},{x:k,y:o.y},{x:k,y:c.y},{x:g,y:c.y}])}function ni(t,n,e){let i=e?.showNotDeployed??!1,o=t.filter(g=>i||g.deployed!==!1).map(g=>{let y=Ei(g);return l({node:g},y)});o.sort((g,y)=>{let A={application:0,reach:1,ao:2};return A[g.band]!==A[y.band]?A[g.band]-A[y.band]:g.rank!==y.rank?g.rank-y.rank:g.lane!==y.lane?g.lane-y.lane:g.order!==y.order?g.order-y.order:g.node.id.localeCompare(y.node.id)});let c=Qn+Ti,D=Be*c+Ni+De*2,k=new Map;for(let g of o){let y=`${g.band}:${g.rank}`;k.has(y)||k.set(y,[]),k.get(y).push(g)}let _=[`application`,`reach`,`ao`],L=[],O=[],P=De;for(let g of _){let y=[...k.entries()].filter(([Ne])=>Ne.startsWith(`${g}:`)).sort((Ne,pe)=>Number(Ne[0].split(`:`)[1])-Number(pe[0].split(`:`)[1]));if(y.length===0){O.push({id:g,label:Jn[g],y:P,height:_t+Ht+40}),P+=_t+Ht+40+16;continue}let A=P;P+=_t+Ht;for(let[,Ne]of y){let pe=new Set;for(let Me of Ne){let Z=Math.max(0,Math.min(Be-1,Me.lane));for(;pe.has(Z)&&Z<Be-1;)Z+=1;if(pe.has(Z)){for(let He=0;He<Be;He++)if(!pe.has(He)){Z=He;break}}pe.add(Z);let di=De+Z*c;L.push(m(l({},Me.node),{x:di,y:P,width:Qn,height:Zn,lane:Z,rank:Me.rank,order:Me.order,displayStatus:Ai(Me.node)}))}P+=Zn+Gt}let Dt=P-A+_t/2;O.push({id:g,label:Jn[g],y:A,height:Dt}),P+=16}let W=new Map(L.map(g=>[g.id,g])),S=[];for(let g of n){let y=W.get(g.from),A=W.get(g.to);if(!y||!A)continue;let Dt=Fi(y,A,String(g.kind||`request`),L,D);S.push(m(l({},g),{points:``,pathD:Dt}))}return{width:D,height:P+De,bands:O,nodes:L,edges:S}}function ii(t,n){let e=new Map,i=new Map;for(let u of n)e.has(u.from)||e.set(u.from,[]),e.get(u.from).push(u.to),i.has(u.to)||i.set(u.to,[]),i.get(u.to).push(u.from);let a=new Set([t]),o=new Set,c=(u,D,k)=>{let _=[u];for(;_.length;){let L=_.pop();for(let O of D.get(L)||[]){let P=n.find(W=>k?W.from===L&&W.to===O:W.from===O&&W.to===L)?.id;P&&o.add(P),a.has(O)||(a.add(O),_.push(O))}}};c(t,e,!0),c(t,i,!1);for(let u of n)a.has(u.from)&&a.has(u.to)&&o.add(u.id);return{nodes:a,edges:o}}var Bi=3e4;var ze=class t{api=h(f);live=h(U);liveSub=null;seq=Tt(0);generatedAt=Tt(null);notes=Tt([]);capabilities=Tt(null);structureNodes=Tt([]);structureEdges=Tt([]);healthById=Tt({});liveMode=Tt(!0);paused=Tt(!1);showNotDeployed=Tt(!1);onlyUnhealthy=Tt(!1);bandFilter=Tt(`all`);tableMode=Tt(!1);hoverNodeId=Tt(null);snapshotOnly=Tt(!1);lastError=Tt(null);loading=Tt(!0);grace=new Map;_layoutRuns=0;layoutRunCount(){return this._layoutRuns}layout=PC(()=>{this._layoutRuns+=1;let n=this.mergeGrace(this.structureNodes()),e=this.structureEdges();if(this.bandFilter()!==`all`){let i=this.bandFilter();n=n.filter(o=>o.band===i);let a=new Set(n.map(o=>o.id));e=e.filter(o=>a.has(o.from)&&a.has(o.to))}return ni(n,e,{showNotDeployed:this.showNotDeployed()})});displayNodes=PC(()=>{let n=this.healthById(),e=this.onlyUnhealthy();return this.layout().nodes.map(i=>{let a=n[i.id],o=a?.status||i.status,c=a?.statusReason??i.statusReason;return i.instrumented===!1&&o===`healthy`&&(o=`unknown`),m(l({},i),{status:o,statusReason:c,displayStatus:o})}).filter(i=>e?[`failed`,`degraded`,`offline`].includes(String(i.displayStatus||``).toLowerCase()):!0)});displayEdges=PC(()=>{if(!this.onlyUnhealthy())return this.layout().edges;let n=new Set(this.displayNodes().map(e=>e.id));return this.layout().edges.filter(e=>n.has(e.from)||n.has(e.to))});hoverClosure=PC(()=>{let n=this.hoverNodeId();return n?ii(n,this.structureEdges()):null});unhealthyCount=PC(()=>this.displayNodes().filter(n=>[`failed`,`degraded`].includes(String(n.displayStatus||``).toLowerCase())).length);nodes=PC(()=>this.structureNodes());edges=PC(()=>this.structureEdges());start(){this.loading.set(!0),this.api.topologyGraph().subscribe(n=>{n.ok?(this.applySnapshot(n.data),this.snapshotOnly.set(!0),this.lastError.set(null)):this.lastError.set(n.message),this.loading.set(!1)}),this.live.acquire({topology:!0}),this.liveSub?.unsubscribe(),this.liveSub=this.live.topologyEvents.subscribe(n=>{this.paused()||this.onLiveEvent(n)})}stop(){this.liveSub?.unsubscribe(),this.liveSub=null,this.live.release()}togglePause(){this.paused.update(n=>!n)}resync(){this.live.resyncTopology(),this.api.topologyGraph().subscribe(n=>{n.ok&&this.applySnapshot(n.data)})}setHover(n){this.hoverNodeId.set(n)}loadNodeDetail(n){return this.api.topologyNode(n)}applyHealthForTest(n){this.layout();let e=this._layoutRuns;this.patchHealth(n),this.displayNodes();return{layoutRunsBefore:e,layoutRunsAfter:this._layoutRuns}}onLiveEvent(n){if(n.type===`topology_snapshot`){this.applySnapshot(n),this.snapshotOnly.set(!1);return}if(n.type===`topology_delta`){let e=Number(n.fromSeq||0);if(e&&e!==this.seq()){this.live.resyncTopology();return}this.applyDelta(n),this.snapshotOnly.set(!1);return}if(n.type===`topology_health`){let e=n.health;Array.isArray(e)&&this.patchHealth(e),n.seq!=null&&this.seq.set(Number(n.seq))}}applySnapshot(n){this.seq.set(Number(n.seq||0)),this.generatedAt.set(n.generatedAt||null),this.notes.set(n.notes||[]),this.capabilities.set(n.capabilities||null),this.structureNodes.set(n.nodes||[]),this.structureEdges.set(n.edges||[]);let e={};for(let i of n.nodes||[])e[i.id]={status:String(i.status),statusReason:i.statusReason};this.healthById.set(e),this.grace.clear()}applyDelta(n){let e=n.nodesUpserted||[],i=n.nodesRemoved||[],a=n.edgesUpserted||[],o=n.edgesRemoved||[],c=new Map(this.structureNodes().map(_=>[_.id,_])),u=l({},this.healthById());for(let _ of e)c.set(_.id,_),u[_.id]={status:String(_.status),statusReason:_.statusReason},this.grace.delete(_.id);let D=Date.now();for(let _ of i){let L=c.get(_);L&&(this.grace.set(_,{node:m(l({},L),{status:`offline`}),removeAt:D+Bi}),u[_]={status:`offline`,statusReason:`removed`}),c.delete(_)}this.structureNodes.set([...c.values()]),this.healthById.set(u);let k=new Map(this.structureEdges().map(_=>[_.id,_]));for(let _ of a)k.set(_.id,_);for(let _ of o)k.delete(_);this.structureEdges.set([...k.values()]),n.seq!=null&&this.seq.set(Number(n.seq)),n.notes&&this.notes.set(n.notes),n.capabilities&&this.capabilities.set(n.capabilities),n.generatedAt&&this.generatedAt.set(String(n.generatedAt))}patchHealth(n){this.healthById.update(e=>{let i=l({},e);for(let a of n)i[a.id]={status:a.status,statusReason:a.statusReason};return i})}mergeGrace(n){let e=Date.now(),i=[...n];for(let[a,o]of[...this.grace.entries()]){if(e>=o.removeAt){this.grace.delete(a);continue}i.some(c=>c.id===a)||i.push(o.node)}return i}static ɵfac=function(e){return new(e||t)};static ɵprov=R({token:t,factory:t.ɵfac})};var ai={ui:{accent:`#0d9488`,icon:`monitor`,aspect:`Client`},"overlay-source":{accent:`#0891b2`,icon:`layers`,aspect:`Overlays`},"local-tools":{accent:`#059669`,icon:`wrench`,aspect:`Local tools`},openclaw:{accent:`#7c3aed`,icon:`bot`,aspect:`OpenClaw`},"session-bridge":{accent:`#2563eb`,icon:`cable`,aspect:`Reach bridge`},"overlay-packer":{accent:`#4f46e5`,icon:`package`,aspect:`Overlay pack`},"local-mcp-host":{accent:`#6366f1`,icon:`plug`,aspect:`Local MCP`},"speech-client":{accent:`#db2777`,icon:`mic`,aspect:`Speech`},"mtls-enroller":{accent:`#b45309`,icon:`shield`,aspect:`mTLS`},engine:{accent:`#dc2626`,icon:`cpu`,aspect:`Engine`},endpoint:{accent:`#ea580c`,icon:`radio`,aspect:`Endpoint`},"web-ui":{accent:`#0284c7`,icon:`globe`,aspect:`Web UI`},planner:{accent:`#ca8a04`,icon:`brain`,aspect:`Planner`},catalog:{accent:`#16a34a`,icon:`book-open`,aspect:`Catalog`},"model-backend":{accent:`#0f766e`,icon:`boxes`,aspect:`Models`},"model-runtime":{accent:`#0d9488`,icon:`sparkles`,aspect:`Runtime`},"execution-backend":{accent:`#9333ea`,icon:`workflow`,aspect:`Execution`},worker:{accent:`#a855f7`,icon:`server`,aspect:`Workers`},"mcp-sidecar":{accent:`#c026d3`,icon:`puzzle`,aspect:`Sidecar`},platform:{accent:`#475569`,icon:`container`,aspect:`Platform`},storage:{accent:`#64748b`,icon:`hard-drive`,aspect:`Storage`}};var zi={application:{accent:`#0d9488`,icon:`monitor`,aspect:`Application`},reach:{accent:`#2563eb`,icon:`cable`,aspect:`Reach`},ao:{accent:`#dc2626`,icon:`cpu`,aspect:`AO`}};function Ve(t,n){return ai[String(t)]||(n?zi[n]:null)||{accent:`#737373`,icon:`circle`,aspect:`Other`}}var oi=ai;var jt=(t,n)=>n.id;function Vi(t,n){if(t&1&&(Ap(),Cm(0,`rect`,6),js(1,`text`,7),gC(2),ql()),t&2){let e=n.$implicit,i=Bw();zl(`x`,12)(`y`,e.y)(`width`,i.layout().width-24)(`height`,e.height)(`data-band`,e.id),SI(),zl(`x`,28)(`y`,e.y+18),SI(),Jl(` `,e.label,` `)}}function Hi(t,n){if(t&1){let e=kw();Ap(),js(0,`path`,8),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().edgeClick.emit(a))}),ql()}if(t&2){let e=n.$implicit,i=Bw();ta$1(`dimmed`,i.isDimmedEdge(e.id))(`highlighted`,i.isHighlightedEdge(e.id))(`flow`,i.isHighlightedEdge(e.id)),zl(`d`,e.pathD)(`data-kind`,e.kind)}}function Gi(t,n){if(t&1){let e=kw();Ap(),js(0,`g`,9),xm(`mouseenter`,function(){let a=yp(e).$implicit;return vp(Bw().hover.emit(a.id))})(`mouseleave`,function(){yp(e);return vp(Bw().hover.emit(null))})(`focus`,function(){let a=yp(e).$implicit;return vp(Bw().hover.emit(a.id))})(`blur`,function(){yp(e);return vp(Bw().hover.emit(null))})(`click`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))})(`keydown.enter`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))}),Cm(1,`rect`,10)(2,`rect`,11),js(3,`foreignObject`,12),xp(),js(4,`div`,13),Cm(5,`mat-icon`,14),ql()(),Ap(),js(6,`text`,15),gC(7),ql(),js(8,`text`,16),gC(9),ql()()}if(t&2){let e=n.$implicit,i=Bw();ta$1(`dimmed`,i.isDimmedNode(e.id))(`highlighted`,i.isHighlightedNode(e.id)),zl(`transform`,`translate(`+e.x+`,`+e.y+`)`)(`data-status`,e.displayStatus)(`data-band`,e.band)(`data-kind`,e.kind)(`aria-label`,e.label+` `+e.displayStatus),SI(),zl(`width`,e.width)(`height`,e.height)(`stroke`,i.accent(e)),SI(),zl(`height`,e.height)(`fill`,i.accent(e)),SI(3),Vm(`color`,i.accent(e)),wm(`svgIcon`,i.icon(e)),SI(),zl(`x`,38),SI(),Jl(` `,i.truncate(e.label,14),` `),SI(),zl(`x`,38),SI(),qm(` `,i.statusGlyph(e.displayStatus),` `,i.truncate(e.sublabel||e.displayStatus,14),` `)}}var bt=class t{layout=hH.required();nodes=hH.required();edges=hH.required();closure=hH(null);blurred=hH(!1);summary=hH(`Deployment topology diagram`);hover=pH();nodeClick=pH();edgeClick=pH();isDimmedEdge(n){let e=this.closure();return!!e&&!e.edges.has(n)}isHighlightedEdge(n){let e=this.closure();return!!e&&e.edges.has(n)}isDimmedNode(n){let e=this.closure();return!!e&&!e.nodes.has(n)}isHighlightedNode(n){let e=this.closure();return!!e&&e.nodes.has(n)}accent(n){return Ve(n.kind,n.band).accent}icon(n){return Ve(n.kind,n.band).icon}truncate(n,e){let i=String(n||``);return i.length>e?i.slice(0,e-1)+`…`:i}statusGlyph(n){switch(String(n||``).toLowerCase()){case`healthy`:return`●`;case`degraded`:return`▲`;case`failed`:return`✖`;case`starting`:return`◐`;case`draining`:return`◌`;case`offline`:return`○`;default:return`?`}}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-canvas`]],inputs:{layout:[1,`layout`],nodes:[1,`nodes`],edges:[1,`edges`],closure:[1,`closure`],blurred:[1,`blurred`],summary:[1,`summary`]},outputs:{hover:`hover`,nodeClick:`nodeClick`,edgeClick:`edgeClick`},decls:15,vars:8,consts:[[1,`topology-canvas-wrap`,`relative`,`h-full`,`w-full`,`overflow-auto`,`rounded-xl`,`border`,`border-neutral-200`,`bg-neutral-50`,`dark:border-neutral-800`,`dark:bg-neutral-950`],[`role`,`img`,1,`topology-svg`,`block`,`min-w-full`],[`id`,`topo-arrow`,`viewBox`,`0 0 10 10`,`refX`,`9`,`refY`,`5`,`markerWidth`,`7`,`markerHeight`,`7`,`orient`,`auto`],[`d`,`M 0 0 L 10 5 L 0 10 z`,1,`fill-neutral-400`,`dark:fill-neutral-500`],[`marker-end`,`url(#topo-arrow)`,1,`topo-edge`,3,`dimmed`,`highlighted`,`flow`],[`tabindex`,`0`,`role`,`button`,1,`topo-node`,3,`dimmed`,`highlighted`],[`rx`,`10`,1,`band-rect`],[1,`band-label`,`fill-neutral-500`,`text-[11px]`,`font-medium`,`tracking-wide`,`uppercase`],[`marker-end`,`url(#topo-arrow)`,1,`topo-edge`,3,`click`],[`tabindex`,`0`,`role`,`button`,1,`topo-node`,3,`mouseenter`,`mouseleave`,`focus`,`blur`,`click`,`keydown.enter`],[`rx`,`8`,1,`node-fill`],[`x`,`0`,`y`,`0`,`width`,`4`,`rx`,`2`],[`x`,`12`,`y`,`14`,`width`,`22`,`height`,`22`],[`xmlns`,`http://www.w3.org/1999/xhtml`,1,`node-icon`],[3,`svgIcon`],[`y`,`22`,1,`fill-neutral-900`,`text-[12px]`,`font-medium`,`dark:fill-neutral-100`],[`y`,`38`,1,`fill-neutral-500`,`text-[10px]`]],template:function(e,i){e&1&&(js(0,`div`,0),Ap(),js(1,`svg`,1)(2,`title`),gC(3,`Live deployment topology`),ql(),js(4,`desc`),gC(5),ql(),js(6,`defs`)(7,`marker`,2),Cm(8,`path`,3),ql()(),Sw(9,Vi,3,8,null,null,jt),Sw(11,Hi,1,8,`:svg:path`,4,jt),Sw(13,Gi,10,22,`:svg:g`,5,jt),ql()()),e&2&&(ta$1(`topology-blur`,i.blurred()),SI(),ta$1(`path-highlight`,!!i.closure()),zl(`width`,i.layout().width)(`height`,i.layout().height)(`viewBox`,`0 0 `+i.layout().width+` `+i.layout().height),SI(4),Wm(i.summary()),SI(4),Mw(i.layout().bands),SI(2),Mw(i.edges()),SI(2),Mw(i.nodes()))},dependencies:[yt$1,wt],styles:[`[_nghost-%COMP%]{display:block;min-height:420px}.topology-blur[_ngcontent-%COMP%]{filter:blur(3px) saturate(.85);opacity:.72;transition:filter .15s ease,opacity .15s ease}.band-rect[data-band=application][_ngcontent-%COMP%]{fill:color-mix(in oklab,#0d9488 8%,transparent);stroke:color-mix(in oklab,#0d9488 28%,transparent)}.band-rect[data-band=reach][_ngcontent-%COMP%]{fill:color-mix(in oklab,#2563eb 8%,transparent);stroke:color-mix(in oklab,#2563eb 28%,transparent)}.band-rect[data-band=ao][_ngcontent-%COMP%]{fill:color-mix(in oklab,#dc2626 7%,transparent);stroke:color-mix(in oklab,#dc2626 24%,transparent)}.topo-edge[_ngcontent-%COMP%]{fill:none;stroke:var(--%NS%mat-sys-outline);stroke-width:1.6;stroke-dasharray:7 5;stroke-linecap:square;stroke-linejoin:miter;opacity:.7;cursor:pointer;pointer-events:stroke}.topo-edge[data-kind=stream][_ngcontent-%COMP%]{stroke-dasharray:10 6}.topo-edge[data-kind=reverse-tunnel][_ngcontent-%COMP%]{stroke-dasharray:3 4}.topo-edge[data-kind=advertisement][_ngcontent-%COMP%]{stroke-dasharray:1 5;opacity:.45}.topo-edge[data-kind=bypass][_ngcontent-%COMP%]{stroke-dasharray:9 5}.topo-edge.flow[_ngcontent-%COMP%], .path-highlight[_ngcontent-%COMP%]   .topo-edge.highlighted[_ngcontent-%COMP%]{stroke:var(--%NS%mat-sys-primary);stroke-width:2.1;opacity:1;animation:_ngcontent-%COMP%_topo-dash-flow 1.1s linear infinite}@keyframes _ngcontent-%COMP%_topo-dash-flow{to{stroke-dashoffset:-24}}.topo-node[_ngcontent-%COMP%]{cursor:pointer;transition:opacity .12s ease}.topo-node[_ngcontent-%COMP%]:focus{outline:2px solid var(--%NS%mat-sys-primary);outline-offset:2px}.node-fill[_ngcontent-%COMP%]{fill:var(--%NS%mat-sys-surface);stroke-width:1.5}.node-icon[_ngcontent-%COMP%]{display:flex;width:22px;height:22px;align-items:center;justify-content:center}.node-icon[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{width:18px;height:18px;font-size:18px}.topo-node[data-status=failed][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-width:2.25}.topo-node[data-status=degraded][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-width:2}.topo-node[data-status=unknown][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-dasharray:4 3}.topo-node[data-status=offline][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{fill:transparent;stroke-dasharray:3 3;opacity:.55}.topo-node[data-status=starting][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{opacity:.7}.path-highlight[_ngcontent-%COMP%]   .dimmed[_ngcontent-%COMP%]{opacity:.18}.path-highlight[_ngcontent-%COMP%]   .highlighted[_ngcontent-%COMP%]{opacity:1}@media(prefers-reduced-motion:reduce){.topo-edge.flow[_ngcontent-%COMP%], .path-highlight[_ngcontent-%COMP%]   .topo-edge.highlighted[_ngcontent-%COMP%]{animation:none}.topology-blur[_ngcontent-%COMP%]{transition:none;filter:none;opacity:.65}}`]})};function ji(t,n){t&1&&(js(0,`th`,15),gC(1,`Name`),ql())}function Wi(t,n){if(t&1){let e=kw();js(0,`td`,16)(1,`button`,17),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))}),gC(2),ql()()}if(t&2){let e=n.$implicit;SI(2),Jl(` `,e.label,` `)}}function qi(t,n){t&1&&(js(0,`th`,15),gC(1,`Band`),ql())}function $i(t,n){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=n.$implicit;SI(),Wm(e.band)}}function Xi(t,n){t&1&&(js(0,`th`,15),gC(1,`Status`),ql())}function Ki(t,n){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=n.$implicit;SI(),Wm(e.displayStatus)}}function Yi(t,n){t&1&&(js(0,`th`,15),gC(1,`Reason`),ql())}function Ui(t,n){if(t&1&&(js(0,`td`,18),gC(1),ql()),t&2){let e=n.$implicit;SI(),Jl(` `,e.statusReason||`—`,` `)}}function Qi(t,n){t&1&&Cm(0,`tr`,19)}function Zi(t,n){t&1&&Cm(0,`tr`,20)}function Ji(t,n){t&1&&(js(0,`th`,15),gC(1,`Id`),ql())}function ea(t,n){if(t&1){let e=kw();js(0,`td`,16)(1,`button`,21),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().edgeClick.emit(a))}),gC(2),ql()()}if(t&2){let e=n.$implicit;SI(2),Jl(` `,e.id,` `)}}function ta(t,n){t&1&&(js(0,`th`,15),gC(1,`Kind`),ql())}function na(t,n){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=n.$implicit;SI(),Wm(e.kind)}}function ia(t,n){t&1&&(js(0,`th`,15),gC(1,`Metrics`),ql())}function aa(t,n){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=n.$implicit;SI(),Jl(` `,e.instrumented?`yes`:`no data`,` `)}}function oa(t,n){t&1&&Cm(0,`tr`,19)}function ra(t,n){t&1&&Cm(0,`tr`,20)}var vt=class t{nodes=hH.required();edges=hH.required();nodeClick=pH();edgeClick=pH();nodeCols=[`label`,`band`,`status`,`reason`];edgeCols=[`id`,`kind`,`instrumented`];static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-table`]],inputs:{nodes:[1,`nodes`],edges:[1,`edges`]},outputs:{nodeClick:`nodeClick`,edgeClick:`edgeClick`},decls:34,vars:6,consts:[[1,`flex`,`flex-col`,`gap-6`],[1,`mb-2`,`text-sm`,`font-medium`],[`mat-table`,``,1,`w-full`,3,`dataSource`],[`matColumnDef`,`label`],[`mat-header-cell`,``,4,`matHeaderCellDef`],[`mat-cell`,``,4,`matCellDef`],[`matColumnDef`,`band`],[`matColumnDef`,`status`],[`matColumnDef`,`reason`],[`mat-cell`,``,`class`,`text-neutral-500`,4,`matCellDef`],[`mat-header-row`,``,4,`matHeaderRowDef`],[`mat-row`,``,4,`matRowDef`,`matRowDefColumns`],[`matColumnDef`,`id`],[`matColumnDef`,`kind`],[`matColumnDef`,`instrumented`],[`mat-header-cell`,``],[`mat-cell`,``],[`type`,`button`,1,`text-left`,`underline-offset-2`,`hover:underline`,3,`click`],[`mat-cell`,``,1,`text-neutral-500`],[`mat-header-row`,``],[`mat-row`,``],[`type`,`button`,1,`font-mono`,`text-xs`,`text-left`,`underline-offset-2`,`hover:underline`,3,`click`]],template:function(e,i){e&1&&(js(0,`div`,0)(1,`div`)(2,`div`,1),gC(3,`Nodes`),ql(),js(4,`table`,2),Kl(5,3),Dm(6,ji,2,0,`th`,4)(7,Wi,3,1,`td`,5),Ql(),Kl(8,6),Dm(9,qi,2,0,`th`,4)(10,$i,2,1,`td`,5),Ql(),Kl(11,7),Dm(12,Xi,2,0,`th`,4)(13,Ki,2,1,`td`,5),Ql(),Kl(14,8),Dm(15,Yi,2,0,`th`,4)(16,Ui,2,1,`td`,9),Ql(),Dm(17,Qi,1,0,`tr`,10)(18,Zi,1,0,`tr`,11),ql()(),js(19,`div`)(20,`div`,1),gC(21,`Edges`),ql(),js(22,`table`,2),Kl(23,12),Dm(24,Ji,2,0,`th`,4)(25,ea,3,1,`td`,5),Ql(),Kl(26,13),Dm(27,ta,2,0,`th`,4)(28,na,2,1,`td`,5),Ql(),Kl(29,14),Dm(30,ia,2,0,`th`,4)(31,aa,2,1,`td`,5),Ql(),Dm(32,oa,1,0,`tr`,10)(33,ra,1,0,`tr`,11),ql()()()),e&2&&(SI(4),wm(`dataSource`,i.nodes()),SI(13),wm(`matHeaderRowDef`,i.nodeCols),SI(),wm(`matRowDefColumns`,i.nodeCols),SI(4),wm(`dataSource`,i.edges()),SI(10),wm(`matHeaderRowDef`,i.edgeCols),SI(),wm(`matRowDefColumns`,i.edgeCols))},dependencies:[li$1,Zt,ei$1,ni$1,ti$1,Jt,ri,ii$1,oi$1,si$1,ai$1],encapsulation:2})};var sa=(t,n)=>n.aspect;function la(t,n){if(t&1&&(js(0,`div`,8),Cm(1,`span`,10)(2,`mat-icon`,11),gC(3),ql()),t&2){let e=n.$implicit;SI(),Vm(`background`,e.accent),SI(),Vm(`color`,e.accent),wm(`svgIcon`,e.icon),SI(),Jl(` `,e.aspect,` `)}}var xt=class t{aspects=Object.values(oi).filter((n,e,i)=>i.findIndex(a=>a.aspect===n.aspect)===e);static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-legend`]],decls:24,vars:1,consts:[[`menu`,`matMenu`],[`matButton`,``,`type`,`button`,3,`matMenuTriggerFor`],[`svgIcon`,`info`],[1,`topology-legend-menu`],[1,`flex`,`max-w-sm`,`flex-col`,`gap-2`,`px-4`,`py-3`,`text-sm`,3,`click`],[1,`font-medium`],[1,`mt-2`,`font-medium`],[1,`grid`,`grid-cols-2`,`gap-1`],[1,`flex`,`items-center`,`gap-1.5`,`text-xs`],[1,`mt-2`,`text-neutral-500`],[1,`inline-block`,`h-2`,`w-2`,`rounded-full`],[1,`!h-3.5`,`!w-3.5`,`!text-[14px]`,3,`svgIcon`]],template:function(e,i){if(e&1&&(js(0,`button`,1),Cm(1,`mat-icon`,2),gC(2,` Legend `),ql(),js(3,`mat-menu`,3,0)(5,`div`,4),xm(`click`,function(o){return o.stopPropagation()}),js(6,`div`,5),gC(7,`Status`),ql(),js(8,`div`),gC(9,`● healthy · ▲ degraded · ✖ failed · ? unknown · ○ offline`),ql(),js(10,`div`,6),gC(11,`Edges`),ql(),js(12,`div`),gC(13,`Right-angle routes · hover animates dash toward the arrow`),ql(),js(14,`div`,6),gC(15,`Aspects`),ql(),js(16,`div`,7),Sw(17,la,4,6,`div`,8,sa),ql(),js(19,`div`,9),gC(20,` Uninstrumented traffic shows `),js(21,`em`),gC(22,`no data`),ql(),gC(23,`, never zeros. `),ql()()()),e&2)wm(`matMenuTriggerFor`,qw(4)),SI(17),Mw(i.aspects)},dependencies:[Lt,I$1,Bt$1,lt,dt,yt$1,wt],encapsulation:2})};var si=t=>[t];var ma=()=>[`#ea580c`];var ua=(t,n)=>n.id;function ga(t,n){if(t&1&&(js(0,`div`,3),gC(1),ql()),t&2){let e=Bw();SI(),Jl(` `,e.data.offlineBanner,` `)}}function pa(t,n){t&1&&(js(0,`p`,4),gC(1,`Loading…`),ql())}function ha(t,n){t&1&&(js(0,`p`,5),gC(1),ql()),t&2&&(SI(),Wm(n))}function fa(t,n){t&1&&(js(0,`span`,11),gC(1,` · not instrumented`),ql())}function ya(t,n){if(t&1&&(js(0,`div`,11),gC(1),ql()),t&2){let e=Bw();SI(),Jl(` `,e.probe?.statusReason||e.node.statusReason,` `)}}function _a(t,n){if(t&1&&gC(0),t&2)Jl(` · RTT `,Bw(2).latestLatency(),` ms `)}function ba(t,n){if(t&1&&Cm(0,`apx-chart`,14),t&2){let e=Bw(2);wm(`series`,e.healthChartSeries())(`chart`,e.sparkChart)(`colors`,CC(10,si,e.accent()))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}function va(t,n){t&1&&(js(0,`div`,15),gC(1,` Waiting for live probe samples… `),ql())}function xa(t,n){if(t&1&&(js(0,`div`),gC(1),js(2,`span`,11),gC(3),ql()()),t&2){let e=Bw();SI(),Jl(` Cluster members: `,e.members.count,` `),SI(2),Jl(` — `,e.members.note)}}function wa(t,n){t&1&&(js(0,`div`,11),gC(1,`Open this tab for live traffic.`),ql())}function Ca(t,n){if(t&1&&(js(0,`div`,17)(1,`strong`),gC(2,`no data`),ql(),gC(3),ql()),t&2){let e=Bw();SI(3),qm(` — related edges are not instrumented. Inbound `,e.inbound.length,` · Outbound `,e.outbound.length,`. `)}}function Sa(t,n){if(t&1&&(js(0,`div`,12)(1,`div`,13),gC(2,` Live rate (events/s) · websocket `),ql(),Cm(3,`apx-chart`,14),ql(),js(4,`div`,12)(5,`div`,13),gC(6,` Latency p95 (ms) `),ql(),Cm(7,`apx-chart`,14),ql()),t&2){let e=Bw(2);SI(3),wm(`series`,e.trafficRateSeries())(`chart`,e.sparkChart)(`colors`,CC(20,si,e.accent()))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid),SI(4),wm(`series`,e.trafficLatencySeries())(`chart`,e.sparkChart)(`colors`,wC(22,ma))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}function ka(t,n){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=n.$implicit;SI(),qm(``,e.id,` · `,e.kind)}}function Da(t,n){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=n.$implicit;SI(),Wm(e)}}function Ta(t,n){if(t&1&&(js(0,`ul`,18),Sw(1,Da,2,1,`li`,null,Tw),ql(),js(3,`a`,23),gC(4,` Open All settings `),ql()),t&2){let e=Bw();SI(),Mw(e.configKeys),SI(2),wm(`mat-dialog-close`,!0)}}function Na(t,n){t&1&&(js(0,`span`,11),gC(1,`No linked config keys`),ql())}function Ma(t,n){if(t&1){let e=kw();js(0,`mat-tab-group`,8),xm(`selectedIndexChange`,function(a){yp(e);return vp(Bw().onTab(a))}),js(1,`mat-tab`,9)(2,`div`,10)(3,`div`),gC(4,` Status: `),js(5,`strong`),gC(6),ql(),ww(7,fa,2,0,`span`,11),ql(),ww(8,ya,2,1,`div`,11),js(9,`div`,11),gC(10),ww(11,_a,1,1),ql(),js(12,`div`,12)(13,`div`,13),gC(14,` Health monitor (probe latency) `),ql(),ww(15,ba,1,12,`apx-chart`,14)(16,va,2,0,`div`,15),ql(),ww(17,xa,4,2,`div`),ql()(),js(18,`mat-tab`,16)(19,`div`,10),ww(20,wa,2,0,`div`,11)(21,Ca,4,2,`div`,17)(22,Sa,8,23),js(23,`div`),gC(24),ql(),js(25,`ul`,18),Sw(26,ka,2,2,`li`,null,ua),ql()()(),js(28,`mat-tab`,19)(29,`div`,20),ww(30,Ta,5,1)(31,Na,2,0,`span`,11),ql()(),js(32,`mat-tab`,21)(33,`div`,20)(34,`div`),gC(35,` Log source: `),js(36,`code`),gC(37),ql()(),js(38,`a`,22),gC(39,` Open Overview logs `),ql()()()()}if(t&2){let e=n,i=Bw();SI(6),Wm(i.liveStatus()||e.node.status),SI(),Cw(e.probe?.instrumented?-1:7),SI(),Cw(e.probe?.statusReason||e.node.statusReason?8:-1),SI(2),Jl(` Last probe: `,e.probe?.lastProbeAt||`—`,` `),SI(),Cw(i.latestLatency()!=null?11:-1),SI(4),Cw(i.healthSeries().length?15:16),SI(2),Cw(e.members?17:-1),SI(3),Cw(i.trafficActive()?i.trafficInstrumented()?22:21:20),SI(4),qm(`Inbound: `,e.inbound.length,` · Outbound: `,e.outbound.length),SI(2),Mw(e.outbound),SI(4),Cw(e.configKeys?.length?30:31),SI(7),Wm(e.logSource||`web`),SI(),wm(`mat-dialog-close`,!0)}}var Ct=class t{data=h(ge);ref=h(Q);api=h(f);live=h(U);loading=Tt(!0);error=Tt(null);detail=Tt(null);liveStatus=Tt(null);healthSeries=Tt([]);trafficRate=Tt([]);trafficLatency=Tt([]);trafficActive=Tt(!1);trafficInstrumented=Tt(!1);accent=PC(()=>{let n=this.detail()?.node;return Ve(n?.kind||`engine`,n?.band).accent});latestLatency=PC(()=>{let n=this.healthSeries(),e=n.length?n[n.length-1]:null;return e?.y==null?null:Math.round(Number(e.y))});sparkChart={type:`area`,height:120,animations:{enabled:!1},toolbar:{show:!1},zoom:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`};sparkStroke={curve:`smooth`,width:2};sparkFill={type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.35,opacityTo:.05}};sparkTooltip={x:{format:`HH:mm:ss`}};sparkXaxis={type:`datetime`,labels:{datetimeUTC:!1,style:{fontSize:`10px`}},axisBorder:{show:!1}};sparkYaxis={labels:{style:{fontSize:`10px`}},min:0};sparkGrid={borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:4,right:4}};noDataLabels={enabled:!1};sub=null;watching=!1;trafficWatch=!1;ngOnInit(){this.api.topologyNode(this.data.nodeId).subscribe(n=>{if(this.loading.set(!1),!n.ok){this.error.set(n.message);return}this.detail.set(n.data)}),this.live.subscribeTopologyWatch(`node`,this.data.nodeId),this.watching=!0,this.sub=this.live.topologyEvents.subscribe(n=>{(n.type===`topology_watch_snapshot`||n.type===`topology_watch_tick`)&&n.target===`node`&&n.id===this.data.nodeId&&this.applyWatch(n)}),this.ref.afterClosed().subscribe(()=>this.teardown())}ngOnDestroy(){this.teardown()}onTab(n){n===1?(this.trafficActive.set(!0),this.trafficWatch=!0):this.trafficWatch&&this.trafficActive.set(!1)}healthChartSeries(){return[{name:`latency ms`,data:this.healthSeries()}]}trafficRateSeries(){return[{name:`rate`,data:this.trafficRate()}]}trafficLatencySeries(){return[{name:`p95 ms`,data:this.trafficLatency()}]}applyWatch(n){let e=n.latest;e?.status&&this.liveStatus.set(String(e.status));let i=n.health||[];i.length&&this.healthSeries.set(i);let a=n.series;a?.latencyMs?.length&&!i.length&&this.healthSeries.set(a.latencyMs);let o=a?.rate||[],c=a?.latencyP95||[];this.trafficRate.set(o),this.trafficLatency.set(c),this.trafficInstrumented.set(!!n.instrumented&&(o.length>0||c.length>0))}teardown(){this.sub?.unsubscribe(),this.sub=null,this.watching&&(this.live.unsubscribeTopologyWatch(`node`,this.data.nodeId),this.watching=!1)}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-node-detail-dialog`]],decls:11,vars:5,consts:[[`mat-dialog-title`,``,1,`flex`,`items-center`,`gap-2`],[1,`inline-block`,`h-2.5`,`w-2.5`,`rounded-full`],[1,`min-w-[340px]`,`max-w-lg`],[1,`mb-3`,`rounded-lg`,`border`,`border-amber-300`,`bg-amber-50`,`px-3`,`py-2`,`text-sm`,`text-amber-900`,`dark:border-amber-700`,`dark:bg-amber-950`,`dark:text-amber-100`],[1,`text-sm`,`text-neutral-500`],[1,`text-sm`,`text-red-600`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[3,`selectedIndexChange`],[`label`,`Health`],[1,`flex`,`flex-col`,`gap-3`,`py-3`,`text-sm`],[1,`text-neutral-500`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-2`,`pt-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`mb-1`,`px-1`,`text-xs`,`text-neutral-500`],[3,`series`,`chart`,`colors`,`stroke`,`fill`,`tooltip`,`xaxis`,`yaxis`,`dataLabels`,`grid`],[1,`px-2`,`pb-3`,`text-xs`,`text-neutral-500`],[`label`,`Traffic`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`font-mono`,`text-xs`],[`label`,`Config`],[1,`flex`,`flex-col`,`gap-2`,`py-3`,`text-sm`],[`label`,`Logs`],[`matButton`,``,`routerLink`,`/overview`,3,`mat-dialog-close`],[`matButton`,``,`routerLink`,`/settings`,3,`mat-dialog-close`]],template:function(e,i){if(e&1&&(js(0,`h2`,0),Cm(1,`span`,1),gC(2),ql(),js(3,`mat-dialog-content`,2),ww(4,ga,2,1,`div`,3),ww(5,pa,2,0,`p`,4)(6,ha,2,1,`p`,5)(7,Ma,40,13,`mat-tab-group`),ql(),js(8,`mat-dialog-actions`,6)(9,`button`,7),gC(10,`Close`),ql()()),e&2){let a;SI(),Vm(`background`,i.accent()),SI(),Jl(` `,i.detail()?.node?.label||i.data.nodeId,` `),SI(2),Cw(i.data.offlineBanner?4:-1),SI(),Cw(i.loading()?5:(a=i.error())?6:(a=i.detail())?7:-1,a)}},dependencies:[se,we,Ce,ke,Se,lt,dt,hn,Re$1,bn,Dt,ge$2,he],encapsulation:2})};var Ea=()=>[`#2563eb`];var Aa=()=>[`#ea580c`];function Ia(t,n){if(t&1&&gC(0),t&2)Jl(` · :`,Bw().data.edge.port,` `)}function Pa(t,n){t&1&&(js(0,`div`,8),gC(1,` This edge is not instrumented — health is structural only. `),ql())}function Oa(t,n){if(t&1&&gC(0),t&2)Jl(` Latency p95 `,Bw(2).latest()?.latencyP95,` ms `)}function Ra(t,n){if(t&1&&gC(0),t&2)Jl(` · error rate `,((Bw(2).latest()?.errorRate||0)*100).toFixed(0),`% `)}function La(t,n){if(t&1&&(js(0,`div`,8),ww(1,Oa,1,1),ww(2,Ra,1,1),ql()),t&2){let e=Bw();SI(),Cw(e.latest()?.latencyP95!=null?1:-1),SI(),Cw(e.latest()?.errorRate!=null?2:-1)}}function Fa(t,n){t&1&&(js(0,`div`,8),gC(1,`Open this tab for live traffic.`),ql())}function Ba(t,n){t&1&&(js(0,`div`,11)(1,`strong`),gC(2,`no data`),ql(),gC(3,` — this edge is not instrumented. `),ql())}function za(t,n){if(t&1&&(js(0,`div`,14)(1,`div`,15),gC(2,` Live rate (events/s) `),ql(),Cm(3,`apx-chart`,16),ql(),js(4,`div`,14)(5,`div`,15),gC(6,`Latency p95 (ms)`),ql(),Cm(7,`apx-chart`,16),ql()),t&2){let e=Bw();SI(3),wm(`series`,e.rateSeries())(`chart`,e.sparkChart)(`colors`,wC(20,Ea))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid),SI(4),wm(`series`,e.latencySeries())(`chart`,e.sparkChart)(`colors`,wC(21,Aa))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}var St=class t{data=h(ge);ref=h(Q);live=h(U);instrumented=Tt(!!this.data.edge.instrumented);liveStatus=Tt(null);latest=Tt(null);ratePts=Tt([]);latencyPts=Tt([]);trafficActive=Tt(!1);sparkChart={type:`area`,height:120,animations:{enabled:!1},toolbar:{show:!1},zoom:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`};sparkStroke={curve:`smooth`,width:2};sparkFill={type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.35,opacityTo:.05}};sparkTooltip={x:{format:`HH:mm:ss`}};sparkXaxis={type:`datetime`,labels:{datetimeUTC:!1,style:{fontSize:`10px`}},axisBorder:{show:!1}};sparkYaxis={labels:{style:{fontSize:`10px`}},min:0};sparkGrid={borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:4,right:4}};noDataLabels={enabled:!1};sub=null;watching=!1;ngOnInit(){this.live.subscribeTopologyWatch(`edge`,this.data.edge.id),this.watching=!0,this.sub=this.live.topologyEvents.subscribe(n=>{(n.type===`topology_watch_snapshot`||n.type===`topology_watch_tick`)&&n.target===`edge`&&n.id===this.data.edge.id&&this.applyWatch(n)}),this.ref.afterClosed().subscribe(()=>this.teardown())}ngOnDestroy(){this.teardown()}onTab(n){this.trafficActive.set(n===1)}rateSeries(){return[{name:`rate`,data:this.ratePts()}]}latencySeries(){return[{name:`p95 ms`,data:this.latencyPts()}]}applyWatch(n){this.instrumented.set(!!n.instrumented);let e=n.latest;this.latest.set(e),e?.errorRate!=null&&e.errorRate>.2?this.liveStatus.set(`failing`):e&&this.liveStatus.set(`ok`);let i=n.series;i?.rate&&this.ratePts.set(i.rate),i?.latencyP95&&this.latencyPts.set(i.latencyP95)}teardown(){this.sub?.unsubscribe(),this.sub=null,this.watching&&(this.live.unsubscribeTopologyWatch(`edge`,this.data.edge.id),this.watching=!1)}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-edge-detail-dialog`]],decls:27,vars:9,consts:[[`mat-dialog-title`,``],[1,`min-w-[320px]`,`max-w-lg`,`text-sm`],[1,`font-mono`,`text-xs`,`break-all`],[1,`mt-2`],[1,`mt-1`,`text-neutral-500`],[1,`mt-3`,3,`selectedIndexChange`],[`label`,`Health`],[1,`flex`,`flex-col`,`gap-2`,`py-3`],[1,`text-neutral-500`],[`label`,`Traffic`],[1,`flex`,`flex-col`,`gap-3`,`py-3`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-2`,`pt-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`mb-1`,`px-1`,`text-xs`,`text-neutral-500`],[3,`series`,`chart`,`colors`,`stroke`,`fill`,`tooltip`,`xaxis`,`yaxis`,`dataLabels`,`grid`]],template:function(e,i){e&1&&(js(0,`h2`,0),gC(1,`Edge`),ql(),js(2,`mat-dialog-content`,1)(3,`div`,2),gC(4),ql(),js(5,`div`,3),gC(6),ql(),js(7,`div`,4),gC(8),ww(9,Ia,1,1),ql(),js(10,`mat-tab-group`,5),xm(`selectedIndexChange`,function(o){return i.onTab(o)}),js(11,`mat-tab`,6)(12,`div`,7)(13,`div`),gC(14,` Status: `),js(15,`strong`),gC(16),ql()(),ww(17,Pa,2,0,`div`,8)(18,La,3,2,`div`,8),ql()(),js(19,`mat-tab`,9)(20,`div`,10),ww(21,Fa,2,0,`div`,8)(22,Ba,4,0,`div`,11)(23,za,8,22),ql()()()(),js(24,`mat-dialog-actions`,12)(25,`button`,13),gC(26,`Close`),ql()()),e&2&&(SI(4),Wm(i.data.edge.id),SI(2),qm(``,i.data.edge.from,` → `,i.data.edge.to),SI(2),qm(` kind `,i.data.edge.kind,` · `,i.data.edge.protocol||`—`,` `),SI(),Cw(i.data.edge.port?9:-1),SI(7),Wm(i.liveStatus()||i.data.edge.status||`unknown`),SI(),Cw(i.instrumented()?18:17),SI(4),Cw(i.trafficActive()?i.instrumented()?23:22:21))},dependencies:[se,we,Ce,ke,Se,lt,dt,hn,Re$1,bn,ge$2,he],encapsulation:2})};var Va=(t,n)=>n[0];function Ha(t,n){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=n.$implicit;SI(),qm(``,e[0],`: `,e[1])}}function Ga(t,n){if(t&1&&(js(0,`ul`,2),Sw(1,Ha,2,2,`li`,null,Va),ql()),t&2){let e=Bw();SI(),Mw(e.breakdownEntries(n))}}var kt=class t{data=h(ge);breakdownEntries(n){return Object.entries(n)}catalogLink(){let n=this.data.node.id;return n.includes(`mcp`)?`/capabilities/mcp`:n.includes(`skill`)?`/capabilities/skills`:`/capabilities/agents`}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-cluster-dialog`]],decls:13,vars:5,consts:[[`mat-dialog-title`,``],[1,`text-sm`],[1,`mt-2`,`text-neutral-500`],[1,`mt-3`,`text-neutral-500`],[`matButton`,``,1,`mt-2`,3,`routerLink`,`mat-dialog-close`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`]],template:function(e,i){if(e&1&&(js(0,`h2`,0),gC(1),ql(),js(2,`mat-dialog-content`,1)(3,`div`),gC(4),ql(),ww(5,Ga,3,0,`ul`,2),js(6,`p`,3),gC(7,` Members are not expanded on the canvas. Open Capabilities for the full catalog list. `),ql(),js(8,`a`,4),gC(9,` Open Capabilities `),ql()(),js(10,`mat-dialog-actions`,5)(11,`button`,6),gC(12,`Close`),ql()()),e&2){let a;SI(),Jl(``,i.data.node.label,` cluster`),SI(3),Jl(`Count: `,i.data.node.count??0),SI(),Cw((a=i.data.node.breakdown)?5:-1,a),SI(3),wm(`routerLink`,i.catalogLink())(`mat-dialog-close`,!0)}},dependencies:[se,we,Ce,ke,Se,lt,dt,Dt],encapsulation:2})};function ja(t,n){t&1&&gC(0,` Paused `)}function Wa(t,n){if(t&1&&gC(0),t&2)Jl(` Not live — snapshot `,Bw().store.generatedAt()||``,` `)}function qa(t,n){if(t&1&&gC(0),t&2)Jl(` Live · `,Bw().store.generatedAt()||`…`,` `)}function $a(t,n){t&1&&gC(0,` Reconnecting… `)}function Xa(t,n){if(t&1&&(js(0,`div`),gC(1),ql()),t&2){let e=n.$implicit;SI(),Wm(e)}}function Ka(t,n){if(t&1&&(js(0,`div`,8),Sw(1,Xa,2,1,`div`,null,Tw),ql()),t&2){let e=Bw();SI(),Mw(e.store.notes())}}function Ya(t,n){t&1&&Cm(0,`ao-error-state`,17),t&2&&wm(`message`,n)}function Ua(t,n){t&1&&(js(0,`div`,16),gC(1,`Loading topology…`),ql())}function Qa(t,n){t&1&&(js(0,`p`,16),gC(1,` Diagram needs a wider screen — showing table view. `),ql())}function Za(t,n){if(t&1){let e=kw();ww(0,Qa,2,0,`p`,16),js(1,`ao-topology-table`,19),xm(`nodeClick`,function(a){yp(e);return vp(Bw().openNode(a))})(`edgeClick`,function(a){yp(e);return vp(Bw().openEdge(a))}),ql()}if(t&2){let e=Bw();Cw(e.forceTable()&&!e.store.tableMode()?0:-1),SI(),wm(`nodes`,e.store.displayNodes())(`edges`,e.store.displayEdges())}}function Ja(t,n){if(t&1){let e=kw();js(0,`ao-topology-canvas`,20),xm(`hover`,function(a){yp(e);return vp(Bw().onHover(a))})(`nodeClick`,function(a){yp(e);return vp(Bw().openNode(a))})(`edgeClick`,function(a){yp(e);return vp(Bw().openEdge(a))}),ql()}if(t&2){let e=Bw();wm(`layout`,e.store.layout())(`nodes`,e.store.displayNodes())(`edges`,e.store.displayEdges())(`closure`,e.store.hoverClosure())(`blurred`,e.dialogOpen())(`summary`,e.a11ySummary())}}var li=class t{store=h(ze);live=h(U);dialog=h(Fe);forceTable=Tt(typeof window<`u`?window.innerWidth<=1023:!1);dialogOpen=Tt(!1);hoverTimer=null;a11ySummary=PC(()=>{return`Topology with ${this.store.displayNodes().length} nodes, ${this.store.unhealthyCount()} unhealthy. ${this.store.notes().join(`. `)}`});ngOnInit(){this.store.start()}ngOnDestroy(){this.store.stop(),this.hoverTimer&&clearTimeout(this.hoverTimer)}onResize(){this.forceTable.set(window.innerWidth<=1023)}onHover(n){if(this.hoverTimer&&clearTimeout(this.hoverTimer),n==null){this.store.setHover(null);return}this.hoverTimer=setTimeout(()=>this.store.setHover(n),60)}openNode(n){if(n.count!=null&&n.count>0&&n.kind===`catalog`){this.dialogOpen.set(!0),this.dialog.open(kt,{data:{node:n},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1));return}let e=this.store.displayNodes().some(a=>a.id===n.id);this.dialogOpen.set(!0),this.dialog.open(Ct,{data:{nodeId:n.id,offlineBanner:e?null:`This component went offline at ${new Date().toLocaleTimeString()}`},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1))}openEdge(n){this.dialogOpen.set(!0),this.dialog.open(St,{data:{edge:n},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1))}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-page`]],hostBindings:function(e,i){e&1&&xm(`resize`,function(){return i.onResize()},V_)},features:[Jm([ze])],decls:42,vars:23,consts:[[1,`mx-auto`,`flex`,`h-full`,`w-full`,`max-w-[1600px]`,`flex-auto`,`flex-col`,`gap-3`,`p-4`,`sm:p-6`,`lg:px-8`,`lg:pt-8`],[1,`flex`,`flex-wrap`,`items-start`,`justify-between`,`gap-3`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex`,`flex-wrap`,`items-center`,`gap-2`],[1,`rounded-full`,`px-2.5`,`py-1`,`text-xs`,`font-medium`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[`svgIcon`,`refresh-cw`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`text-sm`,`text-neutral-600`,`dark:border-neutral-700`,`dark:bg-neutral-900`,`dark:text-neutral-300`],[1,`flex`,`flex-wrap`,`items-center`,`gap-3`],[`aria-label`,`Band filter`,3,`change`,`value`],[`value`,`all`],[`value`,`application`],[`value`,`reach`],[`value`,`ao`],[3,`change`,`checked`],[1,`text-sm`,`text-neutral-500`],[3,`message`],[1,`min-h-[520px]`,`flex-auto`,3,`layout`,`nodes`,`edges`,`closure`,`blurred`,`summary`],[3,`nodeClick`,`edgeClick`,`nodes`,`edges`],[1,`min-h-[520px]`,`flex-auto`,3,`hover`,`nodeClick`,`edgeClick`,`layout`,`nodes`,`edges`,`closure`,`blurred`,`summary`]],template:function(e,i){if(e&1&&(js(0,`div`,0)(1,`div`,1)(2,`div`)(3,`div`,2),gC(4,` Topology `),ql(),js(5,`div`,3),gC(6,` Live deployment graph — what is present now, not a docs diagram `),ql()(),js(7,`div`,4)(8,`span`,5),ww(9,ja,1,0)(10,Wa,1,1)(11,qa,1,1)(12,$a,1,0),ql(),js(13,`button`,6),xm(`click`,function(){return i.store.togglePause()}),gC(14),ql(),js(15,`button`,6),xm(`click`,function(){return i.store.resync()}),Cm(16,`mat-icon`,7),gC(17,` Refresh `),ql(),Cm(18,`ao-topology-legend`),ql()(),ww(19,Ka,3,0,`div`,8),js(20,`div`,9)(21,`mat-button-toggle-group`,10),xm(`change`,function(o){return i.store.bandFilter.set(o.value)}),js(22,`mat-button-toggle`,11),gC(23,`All bands`),ql(),js(24,`mat-button-toggle`,12),gC(25,`App`),ql(),js(26,`mat-button-toggle`,13),gC(27,`Reach`),ql(),js(28,`mat-button-toggle`,14),gC(29,`AO`),ql()(),js(30,`mat-slide-toggle`,15),xm(`change`,function(o){return i.store.onlyUnhealthy.set(o.checked)}),gC(31,` Only unhealthy `),ql(),js(32,`mat-slide-toggle`,15),xm(`change`,function(o){return i.store.showNotDeployed.set(o.checked)}),gC(33,` Show not deployed `),ql(),js(34,`mat-slide-toggle`,15),xm(`change`,function(o){return i.store.tableMode.set(o.checked)}),gC(35,` Table view `),ql(),js(36,`span`,16),gC(37),ql()(),ww(38,Ya,1,1,`ao-error-state`,17),ww(39,Ua,2,0,`div`,16)(40,Za,2,3)(41,Ja,1,6,`ao-topology-canvas`,18),ql()),e&2){let a;SI(8),ta$1(`bg-emerald-100`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly())(`text-emerald-800`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly())(`bg-amber-100`,i.store.snapshotOnly()||i.store.paused())(`text-amber-900`,i.store.snapshotOnly()||i.store.paused())(`dark:bg-emerald-950`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly())(`dark:text-emerald-200`,i.live.connected()&&!i.store.paused()&&!i.store.snapshotOnly()),SI(),Cw(i.store.paused()?9:i.store.snapshotOnly()?10:i.live.connected()?11:12),SI(5),Jl(` `,i.store.paused()?`Resume`:`Pause`,` `),SI(5),Cw(i.store.notes().length?19:-1),SI(2),wm(`value`,i.store.bandFilter()),SI(9),wm(`checked`,i.store.onlyUnhealthy()),SI(2),wm(`checked`,i.store.showNotDeployed()),SI(2),wm(`checked`,i.store.tableMode()||i.forceTable()),SI(3),qm(` `,i.store.unhealthyCount(),` unhealthy · `,i.store.displayNodes().length,` nodes `),SI(),Cw((a=i.store.lastError())?38:-1,a),SI(),Cw(i.store.loading()?39:i.store.tableMode()||i.forceTable()?40:41)}},dependencies:[lt,dt,Dt$1,bt$1,nt,se,yt$1,wt,Un,Ft,Lt,I,bt,vt,xt],encapsulation:2})};export{li as TopologyPage};