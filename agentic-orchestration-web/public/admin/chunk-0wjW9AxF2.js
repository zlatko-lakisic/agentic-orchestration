import{$t as Uv,A as Ea,Ai as zw,Ar as oM,At as Ql,Bn as be$1,Ci as xv,E as Dm,Ei as yp,Gr as qn$1,Jr as qw,Jt as Tt$1,K as Ir,Lt as Re,Mi as m,Mt as R,Nn as _r,Nr as pH,O as ED,Oi as zl,P as Fm,Pn as _y,Pr as pT,Rr as pt$1,Rt as Rm,St as P,Ti as ym,Tn as Zl,U as Hr,Un as cG,Ur as ql,Ut as Sw,V as Hd,Vt as SI,W as Hw,Wr as qm,X as Jl,Xt as Tw,Yt as Tv,Z as Jm,_t as Nm,ai as v,bi as xe,ci as vp,cr as ge,dr as ia$1,en as Uw,er as fe,et as Kl,fn as Wm,ft as Mw,gr as js,hi as ww,ii as uw,in as Vh,ir as gC,it as Ld,j as Ee$1,ji as l,jn as _i$1,kr as oC,li as vv,ln as WS,lr as h,mi as wm,n as $i$1,nn as V_,oi as vD,on as Vn$1,p as Bw,pr as ie$1,qn as dG,qt as Tm,rt as L,s as Ap,si as vl,sn as Vs,ti as ta$1,ur as hH,vn as YS,vr as k,wr as kw,wt as PC,x as Cw,xi as xm,y as Cm,yi as xS,yn as Yl,yt as O,z as Gw,zn as ay,zr as q}from"./chunk-BpT5wdeN.js";import{n as yt,r as Dt,t as wt,u as m$1}from"./main-6MU6FGPW.js";import"./chunk-BQmX-p_U.js";import{t as f}from"./chunk-3nbb3lx-.js";import{n as dt$1,r as lt$1}from"./chunk-CdM5TklW.js";import{n as Ie}from"./chunk-DAoBc3q9.js";import{a as k$1,o as p,r as d,s,t as H}from"./chunk-Diy3XHPK.js";import{a as Vt,l as ot$1,n as It,o as W,s as Wt,t as D,u as qt}from"./chunk-vO7qp06V.js";import"./chunk-C99dHixH.js";import"./chunk-WZemQj03.js";import{a as ei$1,c as ni$1,d as si$1,f as ti$1,i as ai$1,l as oi$1,o as ii$1,r as Zt,s as li$1,t as Jt,u as ri$1}from"./chunk-ByeK_7W8.js";import{i as Lt,r as I,t as Bt}from"./chunk-DaqQ7sDI.js";import{l as q$1,u as xe$1}from"./chunk-BctHmrjI.js";import{t as I$1}from"./chunk-BAXIsi_L.js";import{a as hn,i as bn,r as Re$1}from"./chunk-CxqacwYE.js";import{n as bt,r as nt,t as Dt$1}from"./chunk-9-uwIijt.js";import{t as M}from"./chunk-CHQtBxLP2.js";function Yn(t,i){}var ie=class{viewContainerRef;injector;id;role=`dialog`;panelClass=``;hasBackdrop=!0;backdropClass=``;disableClose=!1;closePredicate;width=``;height=``;minWidth;minHeight;maxWidth;maxHeight;positionStrategy;data=null;direction;ariaDescribedBy=null;ariaLabelledBy=null;ariaLabel=null;ariaModal=!1;autoFocus=`first-tabbable`;restoreFocus=!0;scrollStrategy;closeOnNavigation=!0;closeOnDestroy=!0;closeOnOverlayDetachments=!0;disableAnimations=!1;providers;container;templateContext;bindings};var St=(()=>{class t extends d{_elementRef=h(ie$1);_focusTrapFactory=h(WS);_config;_interactivityChecker=h(Tv);_ngZone=h(P);_focusMonitor=h(vv);_renderer=h(Ir);_changeDetectorRef=h(_y);_injector=h(q);_platform=h(ge);_document=h(O);_portalOutlet;_focusTrapped=new L;_focusTrap=null;_elementFocusedBeforeDialogWasOpened=null;_closeInteractionType=null;_ariaLabelledByQueue=[];_isDestroyed=!1;constructor(){super(),this._config=h(ie,{optional:!0})||new ie,this._config.ariaLabelledBy&&this._ariaLabelledByQueue.push(this._config.ariaLabelledBy)}_addAriaLabelledBy(e){this._ariaLabelledByQueue.push(e),this._changeDetectorRef.markForCheck()}_removeAriaLabelledBy(e){let n=this._ariaLabelledByQueue.indexOf(e);n>-1&&(this._ariaLabelledByQueue.splice(n,1),this._changeDetectorRef.markForCheck())}_contentAttached(){this._initializeFocusTrap(),this._captureInitialFocus()}_captureInitialFocus(){this._trapFocus()}ngOnDestroy(){this._focusTrapped.complete(),this._isDestroyed=!0,this._restoreFocus()}attachComponentPortal(e){this._portalOutlet.hasAttached();let n=this._portalOutlet.attachComponentPortal(e);return this._contentAttached(),n}attachTemplatePortal(e){this._portalOutlet.hasAttached();let n=this._portalOutlet.attachTemplatePortal(e);return this._contentAttached(),n}attachDomPortal=e=>{this._portalOutlet.hasAttached();let n=this._portalOutlet.attachDomPortal(e);return this._contentAttached(),n};_recaptureFocus(){this._containsFocus()||this._trapFocus()}_forceFocus(e,n){this._interactivityChecker.isFocusable(e)||(e.tabIndex=-1,this._ngZone.runOutsideAngular(()=>{let a=()=>{o(),u(),e.removeAttribute(`tabindex`)},o=this._renderer.listen(e,`blur`,a),u=this._renderer.listen(e,`mousedown`,a)})),e.focus(n)}_focusByCssSelector(e,n){let a=this._elementRef.nativeElement.querySelector(e);a&&this._forceFocus(a,n)}_trapFocus(e){this._isDestroyed||vl(()=>{let n=this._elementRef.nativeElement;switch(this._config.autoFocus){case!1:case`dialog`:this._containsFocus()||n.focus(e);break;case!0:case`first-tabbable`:this._focusTrap?.focusInitialElement(e)||this._focusDialogContainer(e);break;case`first-heading`:this._focusByCssSelector(`h1, h2, h3, h4, h5, h6, [role="heading"]`,e);break;default:this._focusByCssSelector(this._config.autoFocus,e);break}this._focusTrapped.next()},{injector:this._injector})}_restoreFocus(){let e=this._config.restoreFocus,n=null;if(typeof e==`string`?n=this._document.querySelector(e):typeof e==`boolean`?n=e?this._elementFocusedBeforeDialogWasOpened:null:e&&(n=e),this._config.restoreFocus&&n&&typeof n.focus==`function`){let a=xS(),o=this._elementRef.nativeElement;(!a||a===this._document.body||a===o||o.contains(a))&&(this._focusMonitor?(this._focusMonitor.focusVia(n,this._closeInteractionType),this._closeInteractionType=null):n.focus())}this._focusTrap&&this._focusTrap.destroy()}_focusDialogContainer(e){this._elementRef.nativeElement.focus?.(e)}_containsFocus(){let e=this._elementRef.nativeElement,n=xS();return e===n||e.contains(n)}_initializeFocusTrap(){this._platform.isBrowser&&(this._focusTrap=this._focusTrapFactory.create(this._elementRef.nativeElement),this._document&&(this._elementFocusedBeforeDialogWasOpened=xS()))}static ɵfac=function(n){return new(n||t)};static ɵcmp=Vn$1({type:t,selectors:[[`cdk-dialog-container`]],viewQuery:function(n,a){if(n&1&&Fm(k$1,7),n&2){let o;Gw(o=zw())&&(a._portalOutlet=o.first)}},hostAttrs:[`tabindex`,`-1`,1,`cdk-dialog-container`],hostVars:6,hostBindings:function(n,a){n&2&&zl(`id`,a._config.id||null)(`role`,a._config.role)(`aria-modal`,a._config.ariaModal)(`aria-labelledby`,a._config.ariaLabel?null:a._ariaLabelledByQueue[0])(`aria-label`,a._config.ariaLabel)(`aria-describedby`,a._config.ariaDescribedBy||null)},features:[ym],decls:1,vars:0,consts:[[`cdkPortalOutlet`,``]],template:function(n,a){n&1&&Dm(0,Yn,0,0,`ng-template`,0)},dependencies:[k$1],styles:[`.cdk-dialog-container {
  display: block;
  width: 100%;
  height: 100%;
  min-height: inherit;
  max-height: inherit;
}
`],encapsulation:2,changeDetection:1})}return t})();var Ee=class{overlayRef;config;componentInstance=null;componentRef=null;containerInstance;disableClose;closed=new L;backdropClick;keydownEvents;outsidePointerEvents;id;_detachSubscription;constructor(i,e){this.overlayRef=i,this.config=e,this.disableClose=e.disableClose,this.backdropClick=i.backdropClick(),this.keydownEvents=i.keydownEvents(),this.outsidePointerEvents=i.outsidePointerEvents(),this.id=e.id,this.keydownEvents.subscribe(n=>{n.keyCode===27&&!this.disableClose&&!xv(n)&&(n.preventDefault(),this.close(void 0,{focusOrigin:`keyboard`}))}),this.backdropClick.subscribe(()=>{!this.disableClose&&this._canClose()?this.close(void 0,{focusOrigin:`mouse`}):this.containerInstance._recaptureFocus?.()}),this._detachSubscription=i.detachments().subscribe(()=>{e.closeOnOverlayDetachments!==!1&&this.close()})}close(i,e){if(this._canClose(i)){let n=this.closed;this.containerInstance._closeInteractionType=e?.focusOrigin||`program`,this._detachSubscription.unsubscribe(),this.overlayRef.dispose(),n.next(i),n.complete(),this.componentInstance=this.containerInstance=null}}updatePosition(){return this.overlayRef.updatePosition(),this}updateSize(i=``,e=``){return this.overlayRef.updateSize({width:i,height:e}),this}addPanelClass(i){return this.overlayRef.addPanelClass(i),this}removePanelClass(i){return this.overlayRef.removePanelClass(i),this}_canClose(i){let e=this.config;return!!this.containerInstance&&(!e.closePredicate||e.closePredicate(i,e,this.componentInstance))}};var Zn=new v(`DialogScrollStrategy`,{providedIn:`root`,factory:()=>{let t=h(q);return()=>Vt(t)}});var Jn=new v(`DialogData`);var ei=new v(`DefaultDialogConfig`);function ti(t){let i=Tt$1(t),e=new fe;return{valueSignal:i,get value(){return i()},change:e,ngOnDestroy(){e.complete()}}}var xt=(()=>{class t{_injector=h(q);_defaultOptions=h(ei,{optional:!0});_parentDialog=h(t,{optional:!0,skipSelf:!0});_overlayContainer=h(Wt);_idGenerator=h(Hd);_openDialogsAtThisLevel=[];_afterAllClosedAtThisLevel=new L;_afterOpenedAtThisLevel=new L;_ariaHiddenElements=new Map;_scrollStrategy=h(Zn);get openDialogs(){return this._parentDialog?this._parentDialog.openDialogs:this._openDialogsAtThisLevel}get afterOpened(){return this._parentDialog?this._parentDialog.afterOpened:this._afterOpenedAtThisLevel}afterAllClosed=vD(()=>this.openDialogs.length?this._getAfterAllClosed():this._getAfterAllClosed().pipe(_i$1(void 0)));open(e,n){n=l(l({},this._defaultOptions||new ie),n),n.id=n.id||this._idGenerator.getId(`cdk-dialog-`),n.id&&this.getDialogById(n.id);let o=this._getOverlayConfig(n),u=ot$1(this._injector,o),c=new Ee(u,n),v=this._attachContainer(u,c,n);if(c.containerInstance=v,!this.openDialogs.length){let b=this._overlayContainer.getContainerElement();v._focusTrapped?v._focusTrapped.pipe(pt$1(1)).subscribe(()=>{this._hideNonDialogContentFromAssistiveTechnology(b)}):this._hideNonDialogContentFromAssistiveTechnology(b)}return this._attachDialogContent(e,c,v,n),this.openDialogs.push(c),c.closed.subscribe(()=>this._removeOpenDialog(c,!0)),this.afterOpened.next(c),c}closeAll(){Ct(this.openDialogs,e=>e.close())}getDialogById(e){return this.openDialogs.find(n=>n.id===e)}ngOnDestroy(){Ct(this._openDialogsAtThisLevel,e=>{e.config.closeOnDestroy===!1&&this._removeOpenDialog(e,!1)}),Ct(this._openDialogsAtThisLevel,e=>e.close()),this._afterAllClosedAtThisLevel.complete(),this._afterOpenedAtThisLevel.complete(),this._openDialogsAtThisLevel=[]}_getOverlayConfig(e){let n=new D({positionStrategy:e.positionStrategy||It().centerHorizontally().centerVertically(),scrollStrategy:e.scrollStrategy||this._scrollStrategy(),panelClass:e.panelClass,hasBackdrop:e.hasBackdrop,direction:e.direction,minWidth:e.minWidth,minHeight:e.minHeight,maxWidth:e.maxWidth,maxHeight:e.maxHeight,width:e.width,height:e.height,disposeOnNavigation:e.closeOnNavigation,disableAnimations:e.disableAnimations});return e.backdropClass&&(n.backdropClass=e.backdropClass),n}_attachContainer(e,n,a){let o=a.injector||a.viewContainerRef?.injector,u=[{provide:ie,useValue:a},{provide:Ee,useValue:n},{provide:W,useValue:e}],c;a.container?typeof a.container==`function`?c=a.container:(c=a.container.type,u.push(...a.container.providers(a))):c=St;let v=new p(c,a.viewContainerRef,q.create({parent:o||this._injector,providers:u}));return e.attach(v).instance}_attachDialogContent(e,n,a,o){if(e instanceof _r){let u=this._createInjector(o,n,a,void 0),c={$implicit:o.data,dialogRef:n};o.templateContext&&(c=l(l({},c),typeof o.templateContext==`function`?o.templateContext():o.templateContext)),a.attachTemplatePortal(new s(e,null,c,u))}else{let u=this._createInjector(o,n,a,this._injector),c=a.attachComponentPortal(new p(e,o.viewContainerRef,u,null,o.bindings));n.componentRef=c,n.componentInstance=c.instance}}_createInjector(e,n,a,o){let u=e.injector||e.viewContainerRef?.injector,c=[{provide:Jn,useValue:e.data},{provide:Ee,useValue:n}];return e.providers&&(typeof e.providers==`function`?c.push(...e.providers(n,e,a)):c.push(...e.providers)),e.direction&&(!u||!u.get(oM,null,{optional:!0}))&&c.push({provide:oM,useValue:ti(e.direction)}),q.create({parent:u||o,providers:c})}_removeOpenDialog(e,n){let a=this.openDialogs.indexOf(e);a>-1&&(this.openDialogs.splice(a,1),this.openDialogs.length||(this._ariaHiddenElements.forEach((o,u)=>{o?u.setAttribute(`aria-hidden`,o):u.removeAttribute(`aria-hidden`)}),this._ariaHiddenElements.clear(),n&&this._getAfterAllClosed().next()))}_hideNonDialogContentFromAssistiveTechnology(e){if(e.parentElement){let n=e.parentElement.children;for(let a=n.length-1;a>-1;a--){let o=n[a];o!==e&&o.nodeName!==`SCRIPT`&&o.nodeName!==`STYLE`&&!o.hasAttribute(`aria-live`)&&!o.hasAttribute(`popover`)&&(this._ariaHiddenElements.set(o,o.getAttribute(`aria-hidden`)),o.setAttribute(`aria-hidden`,`true`))}}}_getAfterAllClosed(){let e=this._parentDialog;return e?e._getAfterAllClosed():this._afterAllClosedAtThisLevel}static ɵfac=function(n){return new(n||t)};static ɵprov=k({token:t,factory:t.ɵfac})}return t})();function Ct(t,i){let e=t.length;for(;e--;)i(t[e])}var On=(()=>{class t{static ɵfac=function(n){return new(n||t)};static ɵmod=xe({type:t});static ɵinj=Ee$1({providers:[xt],imports:[qt,H,YS,H]})}return t})();function ni(t,i){}var ot=class{viewContainerRef;injector;id;role=`dialog`;panelClass=``;hasBackdrop=!0;backdropClass=``;disableClose=!1;closePredicate;width=``;height=``;minWidth;minHeight;maxWidth;maxHeight;position;data=null;direction;ariaDescribedBy=null;ariaLabelledBy=null;ariaLabel=null;ariaModal=!1;autoFocus=`first-tabbable`;restoreFocus=!0;delayFocusTrap=!0;scrollStrategy;closeOnNavigation=!0;enterAnimationDuration;exitAnimationDuration;bindings};var kt=`mdc-dialog--open`;var Pn=`mdc-dialog--opening`;var Rn=`mdc-dialog--closing`;var ii=150;var ai=75;var oi=(()=>{class t extends St{_animationStateChanged=new fe;_animationsEnabled=!Ea();_actionSectionCount=0;_hostElement=this._elementRef.nativeElement;_enterAnimationDuration=this._animationsEnabled?Fn(this._config.enterAnimationDuration)??ii:0;_exitAnimationDuration=this._animationsEnabled?Fn(this._config.exitAnimationDuration)??ai:0;_animationTimer=null;_contentAttached(){super._contentAttached(),this._startOpenAnimation()}_startOpenAnimation(){this._animationStateChanged.emit({state:`opening`,totalTime:this._enterAnimationDuration}),this._animationsEnabled?(this._hostElement.style.setProperty(Ln,`${this._enterAnimationDuration}ms`),this._requestAnimationFrame(()=>this._hostElement.classList.add(Pn,kt)),this._waitForAnimationToComplete(this._enterAnimationDuration,this._finishDialogOpen)):(this._hostElement.classList.add(kt),Promise.resolve().then(()=>this._finishDialogOpen()))}_startExitAnimation(){this._animationStateChanged.emit({state:`closing`,totalTime:this._exitAnimationDuration}),this._hostElement.classList.remove(kt),this._animationsEnabled?(this._hostElement.style.setProperty(Ln,`${this._exitAnimationDuration}ms`),this._requestAnimationFrame(()=>this._hostElement.classList.add(Rn)),this._waitForAnimationToComplete(this._exitAnimationDuration,this._finishDialogClose)):Promise.resolve().then(()=>this._finishDialogClose())}_updateActionSectionCount(e){this._actionSectionCount+=e,this._changeDetectorRef.markForCheck()}_finishDialogOpen=()=>{this._clearAnimationClasses(),this._openAnimationDone(this._enterAnimationDuration)};_finishDialogClose=()=>{this._clearAnimationClasses(),this._animationStateChanged.emit({state:`closed`,totalTime:this._exitAnimationDuration})};_clearAnimationClasses(){this._hostElement.classList.remove(Pn,Rn)}_waitForAnimationToComplete(e,n){this._animationTimer!==null&&clearTimeout(this._animationTimer),this._animationTimer=setTimeout(n,e)}_requestAnimationFrame(e){this._ngZone.runOutsideAngular(()=>{typeof requestAnimationFrame==`function`?requestAnimationFrame(e):e()})}_captureInitialFocus(){this._config.delayFocusTrap||this._trapFocus()}_openAnimationDone(e){this._config.delayFocusTrap&&this._trapFocus(),this._animationStateChanged.next({state:`opened`,totalTime:e})}ngOnDestroy(){super.ngOnDestroy(),this._animationTimer!==null&&clearTimeout(this._animationTimer)}attachComponentPortal(e){let n=super.attachComponentPortal(e);return n.location.nativeElement.classList.add(`mat-mdc-dialog-component-host`),n}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵcmp=Vn$1({type:t,selectors:[[`mat-dialog-container`]],hostAttrs:[`tabindex`,`-1`,1,`mat-mdc-dialog-container`,`mdc-dialog`],hostVars:10,hostBindings:function(n,a){n&2&&(Nm(`id`,a._config.id),zl(`aria-modal`,a._config.ariaModal)(`role`,a._config.role)(`aria-labelledby`,a._config.ariaLabel?null:a._ariaLabelledByQueue[0])(`aria-label`,a._config.ariaLabel)(`aria-describedby`,a._config.ariaDescribedBy||null),ta$1(`_mat-animation-noopable`,!a._animationsEnabled)(`mat-mdc-dialog-container-with-actions`,a._actionSectionCount>0))},features:[ym],decls:3,vars:0,consts:[[1,`mat-mdc-dialog-inner-container`,`mdc-dialog__container`],[1,`mat-mdc-dialog-surface`,`mdc-dialog__surface`],[`cdkPortalOutlet`,``]],template:function(n,a){n&1&&(js(0,`div`,0)(1,`div`,1),Dm(2,ni,0,0,`ng-template`,2),ql()())},dependencies:[k$1],styles:[`.mat-mdc-dialog-container {
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
`],encapsulation:2,changeDetection:1})}return t})();var Ln=`--mat-dialog-transition-duration`;function Fn(t){return t==null?null:typeof t==`number`?t:t.endsWith(`ms`)?Ld(t.substring(0,t.length-2)):t.endsWith(`s`)?Ld(t.substring(0,t.length-1))*1e3:t===`0`?0:null}var at=(function(t){return t[t.OPEN=0]=`OPEN`,t[t.CLOSING=1]=`CLOSING`,t[t.CLOSED=2]=`CLOSED`,t})(at||{});var me=class{_ref;_config;_containerInstance;componentInstance;componentRef=null;disableClose;id;_afterOpened=new Hr(1);_beforeClosed=new Hr(1);_result;_closeFallbackTimeout;_state=at.OPEN;_closeInteractionType;constructor(i,e,n){this._ref=i,this._config=e,this._containerInstance=n,this.disableClose=e.disableClose,this.id=i.id,i.addPanelClass(`mat-mdc-dialog-panel`),n._animationStateChanged.pipe(be$1(a=>a.state===`opened`),pt$1(1)).subscribe(()=>{this._afterOpened.next(),this._afterOpened.complete()}),n._animationStateChanged.pipe(be$1(a=>a.state===`closed`),pt$1(1)).subscribe(()=>{clearTimeout(this._closeFallbackTimeout),this._finishDialogClose()}),i.overlayRef.detachments().subscribe(()=>{this._beforeClosed.next(this._result),this._beforeClosed.complete(),this._finishDialogClose()}),ED(this.backdropClick(),this.keydownEvents().pipe(be$1(a=>a.keyCode===27&&!this.disableClose&&!xv(a)))).subscribe(a=>{this.disableClose||(a.preventDefault(),Bn(this,a.type===`keydown`?`keyboard`:`mouse`))})}close(i){let e=this._config.closePredicate;e&&!e(i,this._config,this.componentInstance)||(this._result=i,this._containerInstance._animationStateChanged.pipe(be$1(n=>n.state===`closing`),pt$1(1)).subscribe(n=>{this._beforeClosed.next(i),this._beforeClosed.complete(),this._ref.overlayRef.detachBackdrop(),this._closeFallbackTimeout=setTimeout(()=>this._finishDialogClose(),n.totalTime+100)}),this._state=at.CLOSING,this._containerInstance._startExitAnimation())}afterOpened(){return this._afterOpened}afterClosed(){return this._ref.closed}beforeClosed(){return this._beforeClosed}backdropClick(){return this._ref.backdropClick}keydownEvents(){return this._ref.keydownEvents}updatePosition(i){let e=this._ref.config.positionStrategy;return i&&(i.left||i.right)?i.left?e.left(i.left):e.right(i.right):e.centerHorizontally(),i&&(i.top||i.bottom)?i.top?e.top(i.top):e.bottom(i.bottom):e.centerVertically(),this._ref.updatePosition(),this}updateSize(i=``,e=``){return this._ref.updateSize(i,e),this}addPanelClass(i){return this._ref.addPanelClass(i),this}removePanelClass(i){return this._ref.removePanelClass(i),this}getState(){return this._state}_finishDialogClose(){this._state=at.CLOSED,this._ref.close(this._result,{focusOrigin:this._closeInteractionType}),this.componentInstance=null}};function Bn(t,i,e){return t._closeInteractionType=i,t.close(e)}var ue=new v(`MatMdcDialogData`);var ri=new v(`mat-mdc-dialog-default-options`);var li=new v(`mat-mdc-dialog-scroll-strategy`,{providedIn:`root`,factory:()=>{let t=h(q);return()=>Vt(t)}});var Me=(()=>{class t{_defaultOptions=h(ri,{optional:!0});_scrollStrategy=h(li);_parentDialog=h(t,{optional:!0,skipSelf:!0});_idGenerator=h(Hd);_injector=h(q);_dialog=h(xt);_animationsDisabled=Ea();_openDialogsAtThisLevel=[];_afterAllClosedAtThisLevel=new L;_afterOpenedAtThisLevel=new L;dialogConfigClass=ot;_dialogRefConstructor;_dialogContainerType;_dialogDataToken;get openDialogs(){return this._parentDialog?this._parentDialog.openDialogs:this._openDialogsAtThisLevel}get afterOpened(){return this._parentDialog?this._parentDialog.afterOpened:this._afterOpenedAtThisLevel}_getAfterAllClosed(){let e=this._parentDialog;return e?e._getAfterAllClosed():this._afterAllClosedAtThisLevel}afterAllClosed=vD(()=>this.openDialogs.length?this._getAfterAllClosed():this._getAfterAllClosed().pipe(_i$1(void 0)));constructor(){this._dialogRefConstructor=me,this._dialogContainerType=oi,this._dialogDataToken=ue}open(e,n){let a;n=l(l({},this._defaultOptions||new ot),n),n.id=n.id||this._idGenerator.getId(`mat-mdc-dialog-`),n.scrollStrategy=n.scrollStrategy||this._scrollStrategy();let o=this._dialog.open(e,m(l({},n),{positionStrategy:It(this._injector).centerHorizontally().centerVertically(),disableClose:!0,closePredicate:void 0,closeOnDestroy:!1,closeOnOverlayDetachments:!1,disableAnimations:this._animationsDisabled||n.enterAnimationDuration?.toLocaleString()===`0`||n.exitAnimationDuration?.toString()===`0`,container:{type:this._dialogContainerType,providers:()=>[{provide:this.dialogConfigClass,useValue:n},{provide:ie,useValue:n}]},templateContext:()=>({dialogRef:a}),providers:(u,c,v)=>(a=new this._dialogRefConstructor(u,n,v),a.updatePosition(n?.position),[{provide:this._dialogContainerType,useValue:v},{provide:this._dialogDataToken,useValue:c.data},{provide:this._dialogRefConstructor,useValue:a}])}));return a.componentRef=o.componentRef,a.componentInstance=o.componentInstance,this.openDialogs.push(a),this.afterOpened.next(a),a.afterClosed().subscribe(()=>{let u=this.openDialogs.indexOf(a);u>-1&&(this.openDialogs.splice(u,1),this.openDialogs.length||this._getAfterAllClosed().next())}),a}closeAll(){this._closeDialogs(this.openDialogs)}getDialogById(e){return this.openDialogs.find(n=>n.id===e)}ngOnDestroy(){this._closeDialogs(this._openDialogsAtThisLevel),this._afterAllClosedAtThisLevel.complete(),this._afterOpenedAtThisLevel.complete()}_closeDialogs(e){let n=e.length;for(;n--;)e[n].close()}static ɵfac=function(n){return new(n||t)};static ɵprov=k({token:t,factory:t.ɵfac})}return t})();var ye=(()=>{class t{dialogRef=h(me,{optional:!0});_elementRef=h(ie$1);_dialog=h(Me);ariaLabel;type=`button`;dialogResult;_matDialogClose;ngOnInit(){this.dialogRef||(this.dialogRef=zn(this._elementRef,this._dialog.openDialogs))}ngOnChanges(e){let n=e._matDialogClose;n&&(this.dialogResult=n.currentValue)}_onButtonClick(e){this._elementRef.nativeElement.getAttribute(`aria-disabled`)!==`true`&&Bn(this.dialogRef,e.screenX===0&&e.screenY===0?`keyboard`:`mouse`,this.dialogResult)}static ɵfac=function(n){return new(n||t)};static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-close`,``],[``,`matDialogClose`,``]],hostVars:2,hostBindings:function(n,a){n&1&&xm(`click`,function(u){return a._onButtonClick(u)}),n&2&&zl(`aria-label`,a.ariaLabel||null)(`type`,a.type)},inputs:{ariaLabel:[0,`aria-label`,`ariaLabel`],type:`type`,dialogResult:[0,`mat-dialog-close`,`dialogResult`],_matDialogClose:[0,`matDialogClose`,`_matDialogClose`]},exportAs:[`matDialogClose`],features:[Vs]})}return t})();var Vn=(()=>{class t{_dialogRef=h(me,{optional:!0});_elementRef=h(ie$1);_dialog=h(Me);ngOnInit(){this._dialogRef||(this._dialogRef=zn(this._elementRef,this._dialog.openDialogs)),this._dialogRef&&Promise.resolve().then(()=>{this._onAdd()})}ngOnDestroy(){this._dialogRef?._containerInstance&&Promise.resolve().then(()=>{this._onRemove()})}static ɵfac=function(n){return new(n||t)};static ɵdir=Re({type:t})}return t})();var be=(()=>{class t extends Vn{id=h(Hd).getId(`mat-mdc-dialog-title-`);_onAdd(){this._dialogRef._containerInstance?._addAriaLabelledBy?.(this.id)}_onRemove(){this._dialogRef?._containerInstance?._removeAriaLabelledBy?.(this.id)}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-title`,``],[``,`matDialogTitle`,``]],hostAttrs:[1,`mat-mdc-dialog-title`,`mdc-dialog__title`],hostVars:1,hostBindings:function(n,a){n&2&&Nm(`id`,a.id)},inputs:{id:`id`},exportAs:[`matDialogTitle`],features:[ym]})}return t})();var ve=(()=>{class t{static ɵfac=function(n){return new(n||t)};static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-content`,``],[`mat-dialog-content`],[``,`matDialogContent`,``]],hostAttrs:[1,`mat-mdc-dialog-content`,`mdc-dialog__content`],features:[uw([Ie])]})}return t})();var we=(()=>{class t extends Vn{align;_onAdd(){this._dialogRef._containerInstance?._updateActionSectionCount?.(1)}_onRemove(){this._dialogRef._containerInstance?._updateActionSectionCount?.(-1)}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-actions`,``],[`mat-dialog-actions`],[``,`matDialogActions`,``]],hostAttrs:[1,`mat-mdc-dialog-actions`,`mdc-dialog__actions`],hostVars:6,hostBindings:function(n,a){n&2&&ta$1(`mat-mdc-dialog-actions-align-start`,a.align===`start`)(`mat-mdc-dialog-actions-align-center`,a.align===`center`)(`mat-mdc-dialog-actions-align-end`,a.align===`end`)},inputs:{align:`align`},features:[ym]})}return t})();function zn(t,i){let e=t.nativeElement.parentElement;for(;e&&!e.classList.contains(`mat-mdc-dialog-container`);)e=e.parentElement;return e?i.find(n=>n.id===e.id):null}var ae=(()=>{class t{static ɵfac=function(n){return new(n||t)};static ɵmod=xe({type:t});static ɵinj=Ee$1({providers:[Me],imports:[On,qt,H,Uv]})}return t})();var si=[`switch`];var di=[`*`];function ci(t,i){t&1&&(js(0,`span`,11),Ap(),js(1,`svg`,13),Cm(2,`path`,14),ql(),js(3,`svg`,15),Cm(4,`path`,16),ql()())}var mi=new v(`mat-slide-toggle-default-options`,{providedIn:`root`,factory:()=>({disableToggleValue:!1,hideIcon:!1,disabledInteractive:!1})});var rt=class{source;checked;constructor(i,e){this.source=i,this.checked=e}};var Nt=(()=>{class t{_elementRef=h(ie$1);_focusMonitor=h(vv);_changeDetectorRef=h(_y);defaults=h(mi);_onChange=e=>{};_onTouched=()=>{};_validatorOnChange=()=>{};_uniqueId;_checked=!1;_createChangeEvent(e){return new rt(this,e)}_labelId;get buttonId(){return`${this.id||this._uniqueId}-button`}_switchElement;focus(){this._switchElement.nativeElement.focus()}_noopAnimations=Ea();_focused=!1;name=null;id;labelPosition=`after`;ariaLabel=null;ariaLabelledby=null;ariaDescribedby;required=!1;color;disabled=!1;fullWidth=!1;disableRipple=!1;tabIndex=0;get checked(){return this._checked}set checked(e){this._checked=e,this._changeDetectorRef.markForCheck()}hideIcon;disabledInteractive;change=new fe;toggleChange=new fe;get inputId(){return`${this.id||this._uniqueId}-input`}constructor(){h(qn$1).load(dG);let e=h(new ay(`tabindex`),{optional:!0}),n=this.defaults;this.tabIndex=e==null?0:parseInt(e)||0,this.color=n.color||`accent`,this.id=this._uniqueId=h(Hd).getId(`mat-mdc-slide-toggle-`),this.hideIcon=n.hideIcon??!1,this.disabledInteractive=n.disabledInteractive??!1,this._labelId=this._uniqueId+`-label`}ngAfterContentInit(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{e===`keyboard`||e===`program`?(this._focused=!0,this._changeDetectorRef.markForCheck()):e||Promise.resolve().then(()=>{this._focused=!1,this._onTouched(),this._changeDetectorRef.markForCheck()})})}ngOnChanges(e){e.required&&this._validatorOnChange()}ngOnDestroy(){this._focusMonitor.stopMonitoring(this._elementRef)}writeValue(e){this.checked=!!e}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}validate(e){return this.required&&e.value!==!0?{required:!0}:null}registerOnValidatorChange(e){this._validatorOnChange=e}setDisabledState(e){this.disabled=e,this._changeDetectorRef.markForCheck()}toggle(){this.checked=!this.checked,this._onChange(this.checked)}_emitChangeEvent(){this._onChange(this.checked),this.change.emit(this._createChangeEvent(this.checked))}_handleClick(){this.disabled||(this.toggleChange.emit(),this.defaults.disableToggleValue||(this.checked=!this.checked,this._onChange(this.checked),this.change.emit(new rt(this,this.checked))))}_getAriaLabelledBy(){return this.ariaLabelledby?this.ariaLabelledby:this.ariaLabel?null:this._labelId}static ɵfac=function(n){return new(n||t)};static ɵcmp=Vn$1({type:t,selectors:[[`mat-slide-toggle`]],viewQuery:function(n,a){if(n&1&&Fm(si,5),n&2){let o;Gw(o=zw())&&(a._switchElement=o.first)}},hostAttrs:[1,`mat-mdc-slide-toggle`],hostVars:15,hostBindings:function(n,a){n&2&&(Nm(`id`,a.id),zl(`tabindex`,null)(`aria-label`,null)(`name`,null)(`aria-labelledby`,null),oC(a.color?`mat-`+a.color:``),ta$1(`mat-mdc-slide-toggle-focused`,a._focused)(`mat-mdc-slide-toggle-checked`,a.checked)(`mat-slide-toggle-full-width`,a.fullWidth)(`_mat-animation-noopable`,a._noopAnimations))},inputs:{name:`name`,id:`id`,labelPosition:`labelPosition`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaLabelledby:[0,`aria-labelledby`,`ariaLabelledby`],ariaDescribedby:[0,`aria-describedby`,`ariaDescribedby`],required:[2,`required`,`required`,ia$1],color:`color`,disabled:[2,`disabled`,`disabled`,ia$1],fullWidth:[2,`fullWidth`,`fullWidth`,ia$1],disableRipple:[2,`disableRipple`,`disableRipple`,ia$1],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:pT(e)],checked:[2,`checked`,`checked`,ia$1],hideIcon:[2,`hideIcon`,`hideIcon`,ia$1],disabledInteractive:[2,`disabledInteractive`,`disabledInteractive`,ia$1]},outputs:{change:`change`,toggleChange:`toggleChange`},exportAs:[`matSlideToggle`],features:[Jm([{provide:xe$1,useExisting:$i$1(()=>t),multi:!0},{provide:q$1,useExisting:t,multi:!0}]),Vs],ngContentSelectors:di,decls:14,vars:27,consts:[[`switch`,``],[`mat-internal-form-field`,``,3,`labelPosition`],[`role`,`switch`,`type`,`button`,1,`mdc-switch`,3,`click`,`tabIndex`,`disabled`],[1,`mat-mdc-slide-toggle-touch-target`],[1,`mdc-switch__track`],[1,`mdc-switch__handle-track`],[1,`mdc-switch__handle`],[1,`mdc-switch__shadow`],[1,`mdc-elevation-overlay`],[1,`mdc-switch__ripple`],[`mat-ripple`,``,1,`mat-mdc-slide-toggle-ripple`,`mat-focus-indicator`,3,`matRippleTrigger`,`matRippleDisabled`,`matRippleCentered`],[1,`mdc-switch__icons`],[1,`mdc-label`,3,`click`,`for`],[`viewBox`,`0 0 24 24`,`aria-hidden`,`true`,1,`mdc-switch__icon`,`mdc-switch__icon--on`],[`d`,`M19.69,5.23L8.96,15.96l-4.23-4.23L2.96,13.5l6,6L21.46,7L19.69,5.23z`],[`viewBox`,`0 0 24 24`,`aria-hidden`,`true`,1,`mdc-switch__icon`,`mdc-switch__icon--off`],[`d`,`M20 13H4v-2h16v2z`]],template:function(n,a){if(n&1&&(Hw(),js(0,`div`,1)(1,`button`,2,0),xm(`click`,function(){return a._handleClick()}),Cm(3,`div`,3)(4,`span`,4),js(5,`span`,5)(6,`span`,6)(7,`span`,7),Cm(8,`span`,8),ql(),js(9,`span`,9),Cm(10,`span`,10),ql(),ww(11,ci,5,0,`span`,11),ql()()(),js(12,`label`,12),xm(`click`,function(u){return u.stopPropagation()}),Uw(13),ql()()),n&2){let o=qw(2);wm(`labelPosition`,a.labelPosition),SI(),ta$1(`mdc-switch--selected`,a.checked)(`mdc-switch--unselected`,!a.checked)(`mdc-switch--checked`,a.checked)(`mdc-switch--disabled`,a.disabled)(`mat-mdc-slide-toggle-disabled-interactive`,a.disabledInteractive),wm(`tabIndex`,a.disabled&&!a.disabledInteractive?-1:a.tabIndex)(`disabled`,a.disabled&&!a.disabledInteractive),zl(`id`,a.buttonId)(`name`,a.name)(`aria-label`,a.ariaLabel)(`aria-labelledby`,a._getAriaLabelledBy())(`aria-describedby`,a.ariaDescribedby)(`aria-required`,a.required||null)(`aria-checked`,a.checked)(`aria-disabled`,a.disabled&&a.disabledInteractive?`true`:null),SI(9),wm(`matRippleTrigger`,o)(`matRippleDisabled`,a.disableRipple||a.disabled)(`matRippleCentered`,!0),SI(),Cw(a.hideIcon?-1:11),SI(),wm(`for`,a.buttonId),zl(`id`,a._labelId)}},dependencies:[cG,m$1],styles:[`.mdc-switch {
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
`],encapsulation:2})}return t})();var $n=(()=>{class t{static ɵfac=function(n){return new(n||t)};static ɵmod=xe({type:t});static ɵinj=Ee$1({imports:[Nt,Uv]})}return t})();var gi={ui:{band:`application`,rank:0,lane:0,order:0},"overlay-source":{band:`application`,rank:0,lane:1,order:0},"local-tools":{band:`application`,rank:0,lane:2,order:0},openclaw:{band:`application`,rank:0,lane:3,order:0},"session-bridge":{band:`reach`,rank:0,lane:0,order:0},"overlay-packer":{band:`reach`,rank:0,lane:1,order:0},"local-mcp-host":{band:`reach`,rank:0,lane:2,order:0},"speech-client":{band:`reach`,rank:0,lane:3,order:0},"mtls-enroller":{band:`reach`,rank:0,lane:4,order:0},engine:{band:`ao`,rank:0,lane:0,order:0},endpoint:{band:`ao`,rank:0,lane:1,order:0},"web-ui":{band:`ao`,rank:0,lane:5,order:0},planner:{band:`ao`,rank:1,lane:0,order:0},catalog:{band:`ao`,rank:2,lane:0,order:0},"model-backend":{band:`ao`,rank:2,lane:1,order:0},"model-runtime":{band:`ao`,rank:2,lane:2,order:0},"execution-backend":{band:`ao`,rank:3,lane:0,order:0},worker:{band:`ao`,rank:3,lane:1,order:0},"mcp-sidecar":{band:`ao`,rank:3,lane:2,order:0},platform:{band:`ao`,rank:4,lane:0,order:0},storage:{band:`ao`,rank:4,lane:1,order:0}};var Tt={"engine/session-overlay":1,"engine/mcp-tunnel":2,"engine/direct-agent":3,"engine/hello-speech":4,"engine/mtls-enrol":4,"speech/stt":3,"speech/tts":4};var jn={"catalog/agents":0,"catalog/mcp":1,"catalog/skills":2};var Et={"models/backends":0,"models/ollama":1,"models/remote":2};var Hn=128;var Gn=48;var hi=28;var pi=36;var lt=28;var Mt=22;var st=24;var Wn=6;var qn={application:`1 · Application`,reach:`2 · AO Reach`,ao:`3 · Agentic Orchestration`};function fi(t){let i=gi[t.kind]||{band:t.band||`ao`,rank:0,lane:Wn-1,order:99},e=i.lane,n=i.order;return t.kind===`endpoint`&&Tt[t.id]!=null&&(e=Tt[t.id]),t.kind===`catalog`&&jn[t.id]!=null&&(n=jn[t.id]),t.kind===`model-runtime`&&Et[t.id]!=null&&(e=2+(Et[t.id]||0),n=Et[t.id]||0),t.kind===`model-backend`&&(e=1),t.id===`speech/stt`||t.id===`speech/tts`?{band:`ao`,rank:0,lane:Tt[t.id]??3,order:10}:{band:t.band||i.band,rank:i.rank,lane:e,order:n}}function _i(t){return t.instrumented===!1&&t.status===`healthy`||!t.instrumented&&t.status===`healthy`?`unknown`:t.status||`unknown`}function yi(t,i,e,n,a,o){let u=e-t,c=n-i,v=Math.hypot(u,c)||1,b=u/v,g=c/v;return{x1:t+b*a,y1:i+g*o,x2:e-b*a,y2:n-g*o}}function bi(t,i,e){let n=t.x+t.width/2,a=t.y+t.height/2,o=i.x+i.width/2,c=yi(n,a,o,i.y+i.height/2,t.width/2-4,t.height/2-4);if(e===`bypass`){let b=Math.max(n,o)+80;return`M ${c.x1} ${c.y1} L ${b} ${c.y1} L ${b} ${c.y2} L ${c.x2} ${c.y2}`}if(e===`reverse-tunnel`){let b=(c.y1+c.y2)/2,g=18;return`M ${c.x1+g} ${c.y1} C ${c.x1+g} ${b}, ${c.x2+g} ${b}, ${c.x2+g} ${c.y2}`}if(Math.abs(t.rank-i.rank)<=1&&Math.abs(t.lane-i.lane)<=1)return`M ${c.x1} ${c.y1} L ${c.x2} ${c.y2}`;let v=(c.y1+c.y2)/2;return`M ${c.x1} ${c.y1} C ${c.x1} ${v}, ${c.x2} ${v}, ${c.x2} ${c.y2}`}function Un(t,i,e){let n=e?.showNotDeployed??!1,o=t.filter(p=>n||p.deployed!==!1).map(p=>{let w=fi(p);return l({node:p},w)});o.sort((p,w)=>{let z={application:0,reach:1,ao:2};return z[p.band]!==z[w.band]?z[p.band]-z[w.band]:p.rank!==w.rank?p.rank-w.rank:p.lane!==w.lane?p.lane-w.lane:p.order!==w.order?p.order-w.order:p.node.id.localeCompare(w.node.id)});let u=Hn+hi,v=Wn*u+st*2,b=new Map;for(let p of o){let w=`${p.band}:${p.rank}`;b.has(w)||b.set(w,[]),b.get(w).push(p)}let g=[`application`,`reach`,`ao`],V=[],U=[],P=st;for(let p of g){let w=[...b.entries()].filter(([Se])=>Se.startsWith(`${p}:`)).sort((Se,Y)=>Number(Se[0].split(`:`)[1])-Number(Y[0].split(`:`)[1]));if(w.length===0){U.push({id:p,label:qn[p],y:P,height:lt+Mt+40}),P+=lt+Mt+40+12;continue}let z=P;P+=lt+Mt;for(let[,Se]of w){for(let Y of Se){let Kn=st+Y.lane*u;V.push(m(l({},Y.node),{x:Kn,y:P,width:Hn,height:Gn,lane:Y.lane,rank:Y.rank,order:Y.order,displayStatus:_i(Y.node)}))}P+=Gn+pi}let ft=P-z+lt/2;U.push({id:p,label:qn[p],y:z,height:ft}),P+=12}let oe=new Map(V.map(p=>[p.id,p])),It=[];for(let p of i){let w=oe.get(p.from),z=oe.get(p.to);if(!w||!z)continue;let ft=bi(w,z,String(p.kind||`request`));It.push(m(l({},p),{points:``,pathD:ft}))}return{width:v,height:P+st,bands:U,nodes:V,edges:It}}function Qn(t,i){let e=new Map,n=new Map;for(let c of i)e.has(c.from)||e.set(c.from,[]),e.get(c.from).push(c.to),n.has(c.to)||n.set(c.to,[]),n.get(c.to).push(c.from);let a=new Set([t]),o=new Set,u=(c,v,b)=>{let g=[c];for(;g.length;){let V=g.pop();for(let U of v.get(V)||[]){let P=i.find(oe=>b?oe.from===V&&oe.to===U:oe.from===U&&oe.to===V)?.id;P&&o.add(P),a.has(U)||(a.add(U),g.push(U))}}};u(t,e,!0),u(t,n,!1);for(let c of i)a.has(c.from)&&a.has(c.to)&&o.add(c.id);return{nodes:a,edges:o}}var vi=3e4;var Ae=class t{api=h(f);live=h(M);liveSub=null;seq=Tt$1(0);generatedAt=Tt$1(null);notes=Tt$1([]);capabilities=Tt$1(null);structureNodes=Tt$1([]);structureEdges=Tt$1([]);healthById=Tt$1({});liveMode=Tt$1(!0);paused=Tt$1(!1);showNotDeployed=Tt$1(!1);onlyUnhealthy=Tt$1(!1);bandFilter=Tt$1(`all`);tableMode=Tt$1(!1);hoverNodeId=Tt$1(null);snapshotOnly=Tt$1(!1);lastError=Tt$1(null);loading=Tt$1(!0);grace=new Map;_layoutRuns=0;layoutRunCount(){return this._layoutRuns}layout=PC(()=>{this._layoutRuns+=1;let i=this.mergeGrace(this.structureNodes()),e=this.structureEdges();if(this.bandFilter()!==`all`){let n=this.bandFilter();i=i.filter(o=>o.band===n);let a=new Set(i.map(o=>o.id));e=e.filter(o=>a.has(o.from)&&a.has(o.to))}return Un(i,e,{showNotDeployed:this.showNotDeployed()})});displayNodes=PC(()=>{let i=this.healthById(),e=this.onlyUnhealthy();return this.layout().nodes.map(n=>{let a=i[n.id],o=a?.status||n.status,u=a?.statusReason??n.statusReason;return n.instrumented===!1&&o===`healthy`&&(o=`unknown`),m(l({},n),{status:o,statusReason:u,displayStatus:o})}).filter(n=>e?[`failed`,`degraded`,`offline`].includes(String(n.displayStatus||``).toLowerCase()):!0)});displayEdges=PC(()=>{if(!this.onlyUnhealthy())return this.layout().edges;let i=new Set(this.displayNodes().map(e=>e.id));return this.layout().edges.filter(e=>i.has(e.from)||i.has(e.to))});hoverClosure=PC(()=>{let i=this.hoverNodeId();return i?Qn(i,this.structureEdges()):null});unhealthyCount=PC(()=>this.displayNodes().filter(i=>[`failed`,`degraded`].includes(String(i.displayStatus||``).toLowerCase())).length);nodes=PC(()=>this.structureNodes());edges=PC(()=>this.structureEdges());start(){this.loading.set(!0),this.api.topologyGraph().subscribe(i=>{i.ok?(this.applySnapshot(i.data),this.snapshotOnly.set(!0),this.lastError.set(null)):this.lastError.set(i.message),this.loading.set(!1)}),this.live.acquire({topology:!0}),this.liveSub?.unsubscribe(),this.liveSub=this.live.topologyEvents.subscribe(i=>{this.paused()||this.onLiveEvent(i)})}stop(){this.liveSub?.unsubscribe(),this.liveSub=null,this.live.release()}togglePause(){this.paused.update(i=>!i)}resync(){this.live.resyncTopology(),this.api.topologyGraph().subscribe(i=>{i.ok&&this.applySnapshot(i.data)})}setHover(i){this.hoverNodeId.set(i)}loadNodeDetail(i){return this.api.topologyNode(i)}applyHealthForTest(i){this.layout();let e=this._layoutRuns;this.patchHealth(i),this.displayNodes();return{layoutRunsBefore:e,layoutRunsAfter:this._layoutRuns}}onLiveEvent(i){if(i.type===`topology_snapshot`){this.applySnapshot(i),this.snapshotOnly.set(!1);return}if(i.type===`topology_delta`){let e=Number(i.fromSeq||0);if(e&&e!==this.seq()){this.live.resyncTopology();return}this.applyDelta(i),this.snapshotOnly.set(!1);return}if(i.type===`topology_health`){let e=i.health;Array.isArray(e)&&this.patchHealth(e),i.seq!=null&&this.seq.set(Number(i.seq))}}applySnapshot(i){this.seq.set(Number(i.seq||0)),this.generatedAt.set(i.generatedAt||null),this.notes.set(i.notes||[]),this.capabilities.set(i.capabilities||null),this.structureNodes.set(i.nodes||[]),this.structureEdges.set(i.edges||[]);let e={};for(let n of i.nodes||[])e[n.id]={status:String(n.status),statusReason:n.statusReason};this.healthById.set(e),this.grace.clear()}applyDelta(i){let e=i.nodesUpserted||[],n=i.nodesRemoved||[],a=i.edgesUpserted||[],o=i.edgesRemoved||[],u=new Map(this.structureNodes().map(g=>[g.id,g])),c=l({},this.healthById());for(let g of e)u.set(g.id,g),c[g.id]={status:String(g.status),statusReason:g.statusReason},this.grace.delete(g.id);let v=Date.now();for(let g of n){let V=u.get(g);V&&(this.grace.set(g,{node:m(l({},V),{status:`offline`}),removeAt:v+vi}),c[g]={status:`offline`,statusReason:`removed`}),u.delete(g)}this.structureNodes.set([...u.values()]),this.healthById.set(c);let b=new Map(this.structureEdges().map(g=>[g.id,g]));for(let g of a)b.set(g.id,g);for(let g of o)b.delete(g);this.structureEdges.set([...b.values()]),i.seq!=null&&this.seq.set(Number(i.seq)),i.notes&&this.notes.set(i.notes),i.capabilities&&this.capabilities.set(i.capabilities),i.generatedAt&&this.generatedAt.set(String(i.generatedAt))}patchHealth(i){this.healthById.update(e=>{let n=l({},e);for(let a of i)n[a.id]={status:a.status,statusReason:a.statusReason};return n})}mergeGrace(i){let e=Date.now(),n=[...i];for(let[a,o]of[...this.grace.entries()]){if(e>=o.removeAt){this.grace.delete(a);continue}n.some(u=>u.id===a)||n.push(o.node)}return n}static ɵfac=function(e){return new(e||t)};static ɵprov=R({token:t,factory:t.ɵfac})};var At=(t,i)=>i.id;function wi(t,i){if(t&1&&(Ap(),Tm(0,`rect`,6),Zl(1,`text`,7),gC(2),Yl()),t&2){let e=i.$implicit,n=Bw();zl(`x`,12)(`y`,e.y)(`width`,n.layout().width-24)(`height`,e.height)(`data-band`,e.id),SI(),zl(`x`,28)(`y`,e.y+18),SI(),Jl(` `,e.label,` `)}}function Ci(t,i){if(t&1){let e=kw();Ap(),Zl(0,`path`,8),Rm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().edgeClick.emit(a))}),Yl()}if(t&2){let e=i.$implicit,n=Bw();ta$1(`dimmed`,n.isDimmedEdge(e.id))(`highlighted`,n.isHighlightedEdge(e.id)),zl(`d`,e.pathD)(`data-kind`,e.kind)}}function Si(t,i){if(t&1){let e=kw();Ap(),Zl(0,`g`,9),Rm(`mouseenter`,function(){let a=yp(e).$implicit;return vp(Bw().hover.emit(a.id))})(`mouseleave`,function(){yp(e);return vp(Bw().hover.emit(null))})(`focus`,function(){let a=yp(e).$implicit;return vp(Bw().hover.emit(a.id))})(`blur`,function(){yp(e);return vp(Bw().hover.emit(null))})(`click`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))})(`keydown.enter`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))}),Tm(1,`rect`,10),Zl(2,`text`,11),gC(3),Yl(),Zl(4,`text`,12),gC(5),Yl()()}if(t&2){let e=i.$implicit,n=Bw();ta$1(`dimmed`,n.isDimmedNode(e.id))(`highlighted`,n.isHighlightedNode(e.id)),zl(`transform`,`translate(`+e.x+`,`+e.y+`)`)(`data-status`,e.displayStatus)(`data-band`,e.band)(`aria-label`,e.label+` `+e.displayStatus),SI(),zl(`width`,e.width)(`height`,e.height),SI(),zl(`x`,e.width/2),SI(),Jl(` `,e.label,` `),SI(),zl(`x`,e.width/2),SI(),qm(` `,n.statusGlyph(e.displayStatus),` `,e.sublabel||e.displayStatus,` `)}}var dt=class t{layout=hH.required();nodes=hH.required();edges=hH.required();closure=hH(null);blurred=hH(!1);summary=hH(`Deployment topology diagram`);hover=pH();nodeClick=pH();edgeClick=pH();width=PC(()=>this.layout().width);isDimmedEdge(i){let e=this.closure();return!!e&&!e.edges.has(i)}isHighlightedEdge(i){let e=this.closure();return!!e&&e.edges.has(i)}isDimmedNode(i){let e=this.closure();return!!e&&!e.nodes.has(i)}isHighlightedNode(i){let e=this.closure();return!!e&&e.nodes.has(i)}statusGlyph(i){switch(String(i||``).toLowerCase()){case`healthy`:return`●`;case`degraded`:return`▲`;case`failed`:return`✖`;case`starting`:return`◐`;case`draining`:return`◌`;case`offline`:return`○`;default:return`?`}}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn$1({type:t,selectors:[[`ao-topology-canvas`]],inputs:{layout:[1,`layout`],nodes:[1,`nodes`],edges:[1,`edges`],closure:[1,`closure`],blurred:[1,`blurred`],summary:[1,`summary`]},outputs:{hover:`hover`,nodeClick:`nodeClick`,edgeClick:`edgeClick`},decls:15,vars:8,consts:[[1,`topology-canvas-wrap`,`relative`,`h-full`,`w-full`,`overflow-auto`,`rounded-xl`,`border`,`border-neutral-200`,`bg-neutral-50`,`dark:border-neutral-800`,`dark:bg-neutral-950`],[`role`,`img`,1,`topology-svg`,`block`,`min-w-full`],[`id`,`topo-arrow`,`viewBox`,`0 0 10 10`,`refX`,`8`,`refY`,`5`,`markerWidth`,`6`,`markerHeight`,`6`,`orient`,`auto-start-reverse`],[`d`,`M 0 0 L 10 5 L 0 10 z`,1,`fill-neutral-400`,`dark:fill-neutral-500`],[`marker-end`,`url(#topo-arrow)`,1,`topo-edge`,3,`dimmed`,`highlighted`],[`tabindex`,`0`,`role`,`button`,1,`topo-node`,3,`dimmed`,`highlighted`],[`rx`,`10`,1,`band-rect`],[1,`band-label`,`fill-neutral-500`,`text-[11px]`,`font-medium`,`tracking-wide`,`uppercase`],[`marker-end`,`url(#topo-arrow)`,1,`topo-edge`,3,`click`],[`tabindex`,`0`,`role`,`button`,1,`topo-node`,3,`mouseenter`,`mouseleave`,`focus`,`blur`,`click`,`keydown.enter`],[`rx`,`8`,1,`node-fill`],[`y`,`20`,`text-anchor`,`middle`,1,`fill-neutral-900`,`text-[12px]`,`font-medium`,`dark:fill-neutral-100`],[`y`,`36`,`text-anchor`,`middle`,1,`fill-neutral-500`,`text-[10px]`]],template:function(e,n){e&1&&(Zl(0,`div`,0),Ap(),Zl(1,`svg`,1)(2,`title`),gC(3,`Live deployment topology`),Yl(),Zl(4,`desc`),gC(5),Yl(),Zl(6,`defs`)(7,`marker`,2),Tm(8,`path`,3),Yl()(),Sw(9,wi,3,8,null,null,At),Sw(11,Ci,1,6,`:svg:path`,4,At),Sw(13,Si,6,15,`:svg:g`,5,At),Yl()()),e&2&&(ta$1(`topology-blur`,n.blurred()),SI(),ta$1(`path-highlight`,!!n.closure()),zl(`width`,n.layout().width)(`height`,n.layout().height)(`viewBox`,`0 0 `+n.layout().width+` `+n.layout().height),SI(4),Wm(n.summary()),SI(4),Mw(n.layout().bands),SI(2),Mw(n.edges()),SI(2),Mw(n.nodes()))},styles:[`[_nghost-%COMP%]{display:block;min-height:420px}.topology-blur[_ngcontent-%COMP%]{filter:blur(3px) saturate(.85);opacity:.72;transition:filter .15s ease,opacity .15s ease}.band-rect[data-band=application][_ngcontent-%COMP%]{fill:color-mix(in oklab,var(--%NS%mat-sys-surface-container) 88%,transparent);stroke:color-mix(in oklab,var(--%NS%mat-sys-outline-variant) 60%,transparent)}.band-rect[data-band=reach][_ngcontent-%COMP%]{fill:color-mix(in oklab,var(--%NS%mat-sys-secondary-container) 35%,transparent);stroke:color-mix(in oklab,var(--%NS%mat-sys-secondary) 25%,transparent)}.band-rect[data-band=ao][_ngcontent-%COMP%]{fill:color-mix(in oklab,var(--%NS%mat-sys-primary-container) 30%,transparent);stroke:color-mix(in oklab,var(--%NS%mat-sys-primary) 22%,transparent)}.topo-edge[_ngcontent-%COMP%]{fill:none;stroke:var(--%NS%mat-sys-outline);stroke-width:1.5;stroke-dasharray:6 4;opacity:.75;cursor:pointer;pointer-events:stroke}.topo-edge[data-kind=stream][_ngcontent-%COMP%]{stroke-dasharray:10 6}.topo-edge[data-kind=reverse-tunnel][_ngcontent-%COMP%]{stroke-dasharray:3 3}.topo-edge[data-kind=advertisement][_ngcontent-%COMP%]{stroke-dasharray:1 4;opacity:.45}.topo-edge[data-kind=bypass][_ngcontent-%COMP%]{stroke-dasharray:8 4}.topo-node[_ngcontent-%COMP%]{cursor:pointer;transition:opacity .12s ease}.topo-node[_ngcontent-%COMP%]:focus{outline:2px solid var(--%NS%mat-sys-primary);outline-offset:2px}.node-fill[_ngcontent-%COMP%]{fill:var(--%NS%mat-sys-surface);stroke:var(--%NS%mat-sys-outline-variant);stroke-width:1.25}.topo-node[data-status=failed][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke:var(--%NS%mat-sys-error);stroke-width:2}.topo-node[data-status=degraded][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke:#d97706;stroke-width:2}.topo-node[data-status=unknown][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-dasharray:4 3}.topo-node[data-status=offline][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{fill:transparent;stroke-dasharray:3 3;opacity:.55}.topo-node[data-status=starting][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{opacity:.7}.path-highlight[_ngcontent-%COMP%]   .dimmed[_ngcontent-%COMP%]{opacity:.22}.path-highlight[_ngcontent-%COMP%]   .highlighted[_ngcontent-%COMP%]{opacity:1}.path-highlight[_ngcontent-%COMP%]   .topo-edge.highlighted[_ngcontent-%COMP%]{stroke:var(--%NS%mat-sys-primary);stroke-width:2}@media(prefers-reduced-motion:reduce){.topology-blur[_ngcontent-%COMP%]{transition:none;filter:none;opacity:.65}}`]})};function xi(t,i){t&1&&(js(0,`th`,15),gC(1,`Name`),ql())}function ki(t,i){if(t&1){let e=kw();js(0,`td`,16)(1,`button`,17),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))}),gC(2),ql()()}if(t&2){let e=i.$implicit;SI(2),Jl(` `,e.label,` `)}}function Di(t,i){t&1&&(js(0,`th`,15),gC(1,`Band`),ql())}function Ni(t,i){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=i.$implicit;SI(),Wm(e.band)}}function Ti(t,i){t&1&&(js(0,`th`,15),gC(1,`Status`),ql())}function Ei(t,i){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=i.$implicit;SI(),Wm(e.displayStatus)}}function Mi(t,i){t&1&&(js(0,`th`,15),gC(1,`Reason`),ql())}function Ai(t,i){if(t&1&&(js(0,`td`,18),gC(1),ql()),t&2){let e=i.$implicit;SI(),Jl(` `,e.statusReason||`—`,` `)}}function Ii(t,i){t&1&&Cm(0,`tr`,19)}function Oi(t,i){t&1&&Cm(0,`tr`,20)}function Pi(t,i){t&1&&(js(0,`th`,15),gC(1,`Id`),ql())}function Ri(t,i){if(t&1){let e=kw();js(0,`td`,16)(1,`button`,21),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().edgeClick.emit(a))}),gC(2),ql()()}if(t&2){let e=i.$implicit;SI(2),Jl(` `,e.id,` `)}}function Li(t,i){t&1&&(js(0,`th`,15),gC(1,`Kind`),ql())}function Fi(t,i){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=i.$implicit;SI(),Wm(e.kind)}}function Bi(t,i){t&1&&(js(0,`th`,15),gC(1,`Metrics`),ql())}function Vi(t,i){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=i.$implicit;SI(),Jl(` `,e.instrumented?`yes`:`no data`,` `)}}function zi(t,i){t&1&&Cm(0,`tr`,19)}function $i(t,i){t&1&&Cm(0,`tr`,20)}var ct=class t{nodes=hH.required();edges=hH.required();nodeClick=pH();edgeClick=pH();nodeCols=[`label`,`band`,`status`,`reason`];edgeCols=[`id`,`kind`,`instrumented`];static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn$1({type:t,selectors:[[`ao-topology-table`]],inputs:{nodes:[1,`nodes`],edges:[1,`edges`]},outputs:{nodeClick:`nodeClick`,edgeClick:`edgeClick`},decls:34,vars:6,consts:[[1,`flex`,`flex-col`,`gap-6`],[1,`mb-2`,`text-sm`,`font-medium`],[`mat-table`,``,1,`w-full`,3,`dataSource`],[`matColumnDef`,`label`],[`mat-header-cell`,``,4,`matHeaderCellDef`],[`mat-cell`,``,4,`matCellDef`],[`matColumnDef`,`band`],[`matColumnDef`,`status`],[`matColumnDef`,`reason`],[`mat-cell`,``,`class`,`text-neutral-500`,4,`matCellDef`],[`mat-header-row`,``,4,`matHeaderRowDef`],[`mat-row`,``,4,`matRowDef`,`matRowDefColumns`],[`matColumnDef`,`id`],[`matColumnDef`,`kind`],[`matColumnDef`,`instrumented`],[`mat-header-cell`,``],[`mat-cell`,``],[`type`,`button`,1,`text-left`,`underline-offset-2`,`hover:underline`,3,`click`],[`mat-cell`,``,1,`text-neutral-500`],[`mat-header-row`,``],[`mat-row`,``],[`type`,`button`,1,`font-mono`,`text-xs`,`text-left`,`underline-offset-2`,`hover:underline`,3,`click`]],template:function(e,n){e&1&&(js(0,`div`,0)(1,`div`)(2,`div`,1),gC(3,`Nodes`),ql(),js(4,`table`,2),Kl(5,3),Dm(6,xi,2,0,`th`,4)(7,ki,3,1,`td`,5),Ql(),Kl(8,6),Dm(9,Di,2,0,`th`,4)(10,Ni,2,1,`td`,5),Ql(),Kl(11,7),Dm(12,Ti,2,0,`th`,4)(13,Ei,2,1,`td`,5),Ql(),Kl(14,8),Dm(15,Mi,2,0,`th`,4)(16,Ai,2,1,`td`,9),Ql(),Dm(17,Ii,1,0,`tr`,10)(18,Oi,1,0,`tr`,11),ql()(),js(19,`div`)(20,`div`,1),gC(21,`Edges`),ql(),js(22,`table`,2),Kl(23,12),Dm(24,Pi,2,0,`th`,4)(25,Ri,3,1,`td`,5),Ql(),Kl(26,13),Dm(27,Li,2,0,`th`,4)(28,Fi,2,1,`td`,5),Ql(),Kl(29,14),Dm(30,Bi,2,0,`th`,4)(31,Vi,2,1,`td`,5),Ql(),Dm(32,zi,1,0,`tr`,10)(33,$i,1,0,`tr`,11),ql()()()),e&2&&(SI(4),wm(`dataSource`,n.nodes()),SI(13),wm(`matHeaderRowDef`,n.nodeCols),SI(),wm(`matRowDefColumns`,n.nodeCols),SI(4),wm(`dataSource`,n.edges()),SI(10),wm(`matHeaderRowDef`,n.edgeCols),SI(),wm(`matRowDefColumns`,n.edgeCols))},dependencies:[li$1,Zt,ei$1,ni$1,ti$1,Jt,ri$1,ii$1,oi$1,si$1,ai$1],encapsulation:2})};var mt=class t{static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn$1({type:t,selectors:[[`ao-topology-legend`]],decls:21,vars:1,consts:[[`menu`,`matMenu`],[`matButton`,``,`type`,`button`,3,`matMenuTriggerFor`],[`svgIcon`,`info`],[1,`topology-legend-menu`],[1,`flex`,`max-w-xs`,`flex-col`,`gap-2`,`px-4`,`py-3`,`text-sm`,3,`click`],[1,`font-medium`],[1,`mt-2`,`font-medium`],[1,`mt-2`,`text-neutral-500`]],template:function(e,n){if(e&1&&(js(0,`button`,1),Cm(1,`mat-icon`,2),gC(2,` Legend `),ql(),js(3,`mat-menu`,3,0)(5,`div`,4),xm(`click`,function(o){return o.stopPropagation()}),js(6,`div`,5),gC(7,`Status`),ql(),js(8,`div`),gC(9,`● healthy · ▲ degraded · ✖ failed · ? unknown · ○ offline`),ql(),js(10,`div`,6),gC(11,`Edges`),ql(),js(12,`div`),gC(13,`Solid dash — request · Long dash — stream`),ql(),js(14,`div`),gC(15,`Short dash up — reverse tunnel · Dots — advertisement`),ql(),js(16,`div`,7),gC(17,` Uninstrumented edges show `),js(18,`em`),gC(19,`no data`),ql(),gC(20,`, never zeros. `),ql()()()),e&2)wm(`matMenuTriggerFor`,qw(4))},dependencies:[Lt,I,Bt,lt$1,dt$1,yt,wt],encapsulation:2})};var Hi=(t,i)=>i.id;function Gi(t,i){if(t&1&&(js(0,`div`,2),gC(1),ql()),t&2){let e=Bw();SI(),Jl(` `,e.data.offlineBanner,` `)}}function qi(t,i){t&1&&(js(0,`p`,3),gC(1,`Loading…`),ql())}function Wi(t,i){t&1&&(js(0,`p`,4),gC(1),ql()),t&2&&(SI(),Wm(i))}function Ui(t,i){t&1&&(js(0,`span`,9),gC(1,` · not instrumented`),ql())}function Qi(t,i){if(t&1&&(js(0,`div`,9),gC(1),ql()),t&2){let e=Bw();SI(),Wm(e.probe.statusReason)}}function Xi(t,i){if(t&1&&(js(0,`div`),gC(1),js(2,`span`,9),gC(3),ql()()),t&2){let e=Bw();SI(),Jl(` Cluster members: `,e.members.count,` `),SI(2),Jl(` — `,e.members.note)}}function Ki(t,i){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=i.$implicit;SI(),qm(``,e.id,` · `,e.kind)}}function Yi(t,i){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=i.$implicit;SI(),Wm(e)}}function Zi(t,i){if(t&1&&(js(0,`ul`,11),Sw(1,Yi,2,1,`li`,null,Tw),ql(),js(3,`a`,15),gC(4,` Open All settings `),ql()),t&2){let e=Bw();SI(),Mw(e.configKeys),SI(2),wm(`mat-dialog-close`,!0)}}function Ji(t,i){t&1&&(js(0,`span`,9),gC(1,`No linked config keys`),ql())}function ea(t,i){if(t&1&&(js(0,`mat-tab-group`)(1,`mat-tab`,7)(2,`div`,8)(3,`div`),gC(4,` Status: `),js(5,`strong`),gC(6),ql(),ww(7,Ui,2,0,`span`,9),ql(),ww(8,Qi,2,1,`div`,9),js(9,`div`,9),gC(10),ql(),ww(11,Xi,4,2,`div`),ql()(),js(12,`mat-tab`,10)(13,`div`,8)(14,`div`,9),gC(15,` Edge metrics are not instrumented in Phase 1 — every link reports `),js(16,`em`),gC(17,`no data`),ql(),gC(18,`. `),ql(),js(19,`div`),gC(20),ql(),js(21,`div`),gC(22),ql(),js(23,`ul`,11),Sw(24,Ki,2,2,`li`,null,Hi),ql()()(),js(26,`mat-tab`,12)(27,`div`,8),ww(28,Zi,5,1)(29,Ji,2,0,`span`,9),ql()(),js(30,`mat-tab`,13)(31,`div`,8)(32,`div`),gC(33,` Log source: `),js(34,`code`),gC(35),ql()(),js(36,`a`,14),gC(37,` Open Overview logs `),ql()()()()),t&2){let e=i;SI(6),Wm(e.node.status),SI(),Cw(e.probe?.instrumented?-1:7),SI(),Cw(e.probe&&e.probe.statusReason?8:-1),SI(2),Jl(` Last probe: `,e.probe?.lastProbeAt||`—`,` `),SI(),Cw(e.members?11:-1),SI(9),Jl(`Inbound: `,e.inbound.length),SI(2),Jl(`Outbound: `,e.outbound.length),SI(2),Mw(e.outbound),SI(4),Cw(e.configKeys?.length?28:29),SI(7),Wm(e.logSource||`web`),SI(),wm(`mat-dialog-close`,!0)}}var gt=class t{data=h(ue);ref=h(me);api=h(f);loading=Tt$1(!0);error=Tt$1(null);detail=Tt$1(null);ngOnInit(){this.api.topologyNode(this.data.nodeId).subscribe(i=>{if(this.loading.set(!1),!i.ok){this.error.set(i.message);return}this.detail.set(i.data)})}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn$1({type:t,selectors:[[`ao-node-detail-dialog`]],decls:10,vars:3,consts:[[`mat-dialog-title`,``],[1,`min-w-[320px]`,`max-w-lg`],[1,`mb-3`,`rounded-lg`,`border`,`border-amber-300`,`bg-amber-50`,`px-3`,`py-2`,`text-sm`,`text-amber-900`,`dark:border-amber-700`,`dark:bg-amber-950`,`dark:text-amber-100`],[1,`text-sm`,`text-neutral-500`],[1,`text-sm`,`text-red-600`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[`label`,`Health`],[1,`flex`,`flex-col`,`gap-2`,`py-3`,`text-sm`],[1,`text-neutral-500`],[`label`,`Traffic`],[1,`font-mono`,`text-xs`],[`label`,`Config`],[`label`,`Logs`],[`matButton`,``,`routerLink`,`/overview`,3,`mat-dialog-close`],[`matButton`,``,`routerLink`,`/settings`,3,`mat-dialog-close`]],template:function(e,n){if(e&1&&(js(0,`h2`,0),gC(1),ql(),js(2,`mat-dialog-content`,1),ww(3,Gi,2,1,`div`,2),ww(4,qi,2,0,`p`,3)(5,Wi,2,1,`p`,4)(6,ea,38,10,`mat-tab-group`),ql(),js(7,`mat-dialog-actions`,5)(8,`button`,6),gC(9,`Close`),ql()()),e&2){let a;SI(),Wm(n.detail()?.node?.label||n.data.nodeId),SI(2),Cw(n.data.offlineBanner?3:-1),SI(),Cw(n.loading()?4:(a=n.error())?5:(a=n.detail())?6:-1,a)}},dependencies:[ae,ye,be,we,ve,lt$1,dt$1,hn,Re$1,bn,Dt],encapsulation:2})};function ta(t,i){if(t&1&&gC(0),t&2)Jl(` · :`,Bw().data.edge.port,` `)}function na(t,i){t&1&&gC(0,` Metrics available `)}function ia(t,i){t&1&&(js(0,`strong`),gC(1,`no data`),ql(),gC(2,` — this edge is not instrumented in Phase 1. Rate, latency, and errors will appear when edge metrics ship. `))}var ht=class t{data=h(ue);static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn$1({type:t,selectors:[[`ao-edge-detail-dialog`]],decls:16,vars:7,consts:[[`mat-dialog-title`,``],[1,`min-w-[280px]`,`max-w-md`,`text-sm`],[1,`font-mono`,`text-xs`,`break-all`],[1,`mt-2`],[1,`mt-1`,`text-neutral-500`],[1,`mt-4`,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`]],template:function(e,n){e&1&&(js(0,`h2`,0),gC(1,`Edge`),ql(),js(2,`mat-dialog-content`,1)(3,`div`,2),gC(4),ql(),js(5,`div`,3),gC(6),ql(),js(7,`div`,4),gC(8),ww(9,ta,1,1),ql(),js(10,`div`,5),ww(11,na,1,0)(12,ia,3,0),ql()(),js(13,`mat-dialog-actions`,6)(14,`button`,7),gC(15,`Close`),ql()()),e&2&&(SI(4),Wm(n.data.edge.id),SI(2),qm(``,n.data.edge.from,` → `,n.data.edge.to),SI(2),qm(` kind `,n.data.edge.kind,` · `,n.data.edge.protocol||`—`,` `),SI(),Cw(n.data.edge.port?9:-1),SI(2),Cw(n.data.edge.instrumented?11:12))},dependencies:[ae,ye,be,we,ve,lt$1,dt$1],encapsulation:2})};var aa=(t,i)=>i[0];function oa(t,i){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=i.$implicit;SI(),qm(``,e[0],`: `,e[1])}}function ra(t,i){if(t&1&&(js(0,`ul`,2),Sw(1,oa,2,2,`li`,null,aa),ql()),t&2){let e=Bw();SI(),Mw(e.breakdownEntries(i))}}var pt=class t{data=h(ue);breakdownEntries(i){return Object.entries(i)}catalogLink(){let i=this.data.node.id;return i.includes(`mcp`)?`/capabilities/mcp`:i.includes(`skill`)?`/capabilities/skills`:`/capabilities/agents`}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn$1({type:t,selectors:[[`ao-cluster-dialog`]],decls:13,vars:5,consts:[[`mat-dialog-title`,``],[1,`text-sm`],[1,`mt-2`,`text-neutral-500`],[1,`mt-3`,`text-neutral-500`],[`matButton`,``,1,`mt-2`,3,`routerLink`,`mat-dialog-close`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`]],template:function(e,n){if(e&1&&(js(0,`h2`,0),gC(1),ql(),js(2,`mat-dialog-content`,1)(3,`div`),gC(4),ql(),ww(5,ra,3,0,`ul`,2),js(6,`p`,3),gC(7,` Members are not expanded on the canvas. Open Capabilities for the full catalog list. `),ql(),js(8,`a`,4),gC(9,` Open Capabilities `),ql()(),js(10,`mat-dialog-actions`,5)(11,`button`,6),gC(12,`Close`),ql()()),e&2){let a;SI(),Jl(``,n.data.node.label,` cluster`),SI(3),Jl(`Count: `,n.data.node.count??0),SI(),Cw((a=n.data.node.breakdown)?5:-1,a),SI(3),wm(`routerLink`,n.catalogLink())(`mat-dialog-close`,!0)}},dependencies:[ae,ye,be,we,ve,lt$1,dt$1,Dt],encapsulation:2})};function la(t,i){t&1&&gC(0,` Paused `)}function sa(t,i){if(t&1&&gC(0),t&2)Jl(` Not live — snapshot `,Bw().store.generatedAt()||``,` `)}function da(t,i){if(t&1&&gC(0),t&2)Jl(` Live · `,Bw().store.generatedAt()||`…`,` `)}function ca(t,i){t&1&&gC(0,` Reconnecting… `)}function ma(t,i){if(t&1&&(js(0,`div`),gC(1),ql()),t&2){let e=i.$implicit;SI(),Wm(e)}}function ua(t,i){if(t&1&&(js(0,`div`,8),Sw(1,ma,2,1,`div`,null,Tw),ql()),t&2){let e=Bw();SI(),Mw(e.store.notes())}}function ga(t,i){t&1&&Cm(0,`ao-error-state`,17),t&2&&wm(`message`,i)}function ha(t,i){t&1&&(js(0,`div`,16),gC(1,`Loading topology…`),ql())}function pa(t,i){t&1&&(js(0,`p`,16),gC(1,` Diagram needs a wider screen — showing table view. `),ql())}function fa(t,i){if(t&1){let e=kw();ww(0,pa,2,0,`p`,16),js(1,`ao-topology-table`,19),xm(`nodeClick`,function(a){yp(e);return vp(Bw().openNode(a))})(`edgeClick`,function(a){yp(e);return vp(Bw().openEdge(a))}),ql()}if(t&2){let e=Bw();Cw(e.forceTable()&&!e.store.tableMode()?0:-1),SI(),wm(`nodes`,e.store.displayNodes())(`edges`,e.store.displayEdges())}}function _a(t,i){if(t&1){let e=kw();js(0,`ao-topology-canvas`,20),xm(`hover`,function(a){yp(e);return vp(Bw().onHover(a))})(`nodeClick`,function(a){yp(e);return vp(Bw().openNode(a))})(`edgeClick`,function(a){yp(e);return vp(Bw().openEdge(a))}),ql()}if(t&2){let e=Bw();wm(`layout`,e.store.layout())(`nodes`,e.store.displayNodes())(`edges`,e.store.displayEdges())(`closure`,e.store.hoverClosure())(`blurred`,e.dialogOpen())(`summary`,e.a11ySummary())}}var Xn=class t{store=h(Ae);live=h(M);dialog=h(Me);forceTable=Tt$1(typeof window<`u`?window.innerWidth<=1023:!1);dialogOpen=Tt$1(!1);hoverTimer=null;a11ySummary=PC(()=>{return`Topology with ${this.store.displayNodes().length} nodes, ${this.store.unhealthyCount()} unhealthy. ${this.store.notes().join(`. `)}`});ngOnInit(){this.store.start()}ngOnDestroy(){this.store.stop(),this.hoverTimer&&clearTimeout(this.hoverTimer)}onResize(){this.forceTable.set(window.innerWidth<=1023)}onHover(i){if(this.hoverTimer&&clearTimeout(this.hoverTimer),i==null){this.store.setHover(null);return}this.hoverTimer=setTimeout(()=>this.store.setHover(i),60)}openNode(i){if(i.count!=null&&i.count>0&&i.kind===`catalog`){this.dialogOpen.set(!0),this.dialog.open(pt,{data:{node:i},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1));return}let e=this.store.displayNodes().some(a=>a.id===i.id);this.dialogOpen.set(!0),this.dialog.open(gt,{data:{nodeId:i.id,offlineBanner:e?null:`This component went offline at ${new Date().toLocaleTimeString()}`},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1))}openEdge(i){this.dialogOpen.set(!0),this.dialog.open(ht,{data:{edge:i},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1))}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn$1({type:t,selectors:[[`ao-topology-page`]],hostBindings:function(e,n){e&1&&xm(`resize`,function(){return n.onResize()},V_)},features:[Jm([Ae])],decls:42,vars:23,consts:[[1,`mx-auto`,`flex`,`h-full`,`w-full`,`max-w-[1600px]`,`flex-auto`,`flex-col`,`gap-3`,`p-4`,`sm:p-6`,`lg:px-8`,`lg:pt-8`],[1,`flex`,`flex-wrap`,`items-start`,`justify-between`,`gap-3`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex`,`flex-wrap`,`items-center`,`gap-2`],[1,`rounded-full`,`px-2.5`,`py-1`,`text-xs`,`font-medium`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[`svgIcon`,`refresh-cw`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`text-sm`,`text-neutral-600`,`dark:border-neutral-700`,`dark:bg-neutral-900`,`dark:text-neutral-300`],[1,`flex`,`flex-wrap`,`items-center`,`gap-3`],[`aria-label`,`Band filter`,3,`change`,`value`],[`value`,`all`],[`value`,`application`],[`value`,`reach`],[`value`,`ao`],[3,`change`,`checked`],[1,`text-sm`,`text-neutral-500`],[3,`message`],[1,`min-h-[520px]`,`flex-auto`,3,`layout`,`nodes`,`edges`,`closure`,`blurred`,`summary`],[3,`nodeClick`,`edgeClick`,`nodes`,`edges`],[1,`min-h-[520px]`,`flex-auto`,3,`hover`,`nodeClick`,`edgeClick`,`layout`,`nodes`,`edges`,`closure`,`blurred`,`summary`]],template:function(e,n){if(e&1&&(js(0,`div`,0)(1,`div`,1)(2,`div`)(3,`div`,2),gC(4,` Topology `),ql(),js(5,`div`,3),gC(6,` Live deployment graph — what is present now, not a docs diagram `),ql()(),js(7,`div`,4)(8,`span`,5),ww(9,la,1,0)(10,sa,1,1)(11,da,1,1)(12,ca,1,0),ql(),js(13,`button`,6),xm(`click`,function(){return n.store.togglePause()}),gC(14),ql(),js(15,`button`,6),xm(`click`,function(){return n.store.resync()}),Cm(16,`mat-icon`,7),gC(17,` Refresh `),ql(),Cm(18,`ao-topology-legend`),ql()(),ww(19,ua,3,0,`div`,8),js(20,`div`,9)(21,`mat-button-toggle-group`,10),xm(`change`,function(o){return n.store.bandFilter.set(o.value)}),js(22,`mat-button-toggle`,11),gC(23,`All bands`),ql(),js(24,`mat-button-toggle`,12),gC(25,`App`),ql(),js(26,`mat-button-toggle`,13),gC(27,`Reach`),ql(),js(28,`mat-button-toggle`,14),gC(29,`AO`),ql()(),js(30,`mat-slide-toggle`,15),xm(`change`,function(o){return n.store.onlyUnhealthy.set(o.checked)}),gC(31,` Only unhealthy `),ql(),js(32,`mat-slide-toggle`,15),xm(`change`,function(o){return n.store.showNotDeployed.set(o.checked)}),gC(33,` Show not deployed `),ql(),js(34,`mat-slide-toggle`,15),xm(`change`,function(o){return n.store.tableMode.set(o.checked)}),gC(35,` Table view `),ql(),js(36,`span`,16),gC(37),ql()(),ww(38,ga,1,1,`ao-error-state`,17),ww(39,ha,2,0,`div`,16)(40,fa,2,3)(41,_a,1,6,`ao-topology-canvas`,18),ql()),e&2){let a;SI(8),ta$1(`bg-emerald-100`,n.live.connected()&&!n.store.paused()&&!n.store.snapshotOnly())(`text-emerald-800`,n.live.connected()&&!n.store.paused()&&!n.store.snapshotOnly())(`bg-amber-100`,n.store.snapshotOnly()||n.store.paused())(`text-amber-900`,n.store.snapshotOnly()||n.store.paused())(`dark:bg-emerald-950`,n.live.connected()&&!n.store.paused()&&!n.store.snapshotOnly())(`dark:text-emerald-200`,n.live.connected()&&!n.store.paused()&&!n.store.snapshotOnly()),SI(),Cw(n.store.paused()?9:n.store.snapshotOnly()?10:n.live.connected()?11:12),SI(5),Jl(` `,n.store.paused()?`Resume`:`Pause`,` `),SI(5),Cw(n.store.notes().length?19:-1),SI(2),wm(`value`,n.store.bandFilter()),SI(9),wm(`checked`,n.store.onlyUnhealthy()),SI(2),wm(`checked`,n.store.showNotDeployed()),SI(2),wm(`checked`,n.store.tableMode()||n.forceTable()),SI(3),qm(` `,n.store.unhealthyCount(),` unhealthy · `,n.store.displayNodes().length,` nodes `),SI(),Cw((a=n.store.lastError())?38:-1,a),SI(),Cw(n.store.loading()?39:n.store.tableMode()||n.forceTable()?40:41)}},dependencies:[lt$1,dt$1,Dt$1,bt,nt,ae,yt,wt,$n,Nt,Lt,I$1,dt,ct,mt],encapsulation:2})};export{Xn as TopologyPage};