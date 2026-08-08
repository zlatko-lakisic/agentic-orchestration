import{$t as Uv,A as Ea$1,Ai as zw,Ar as oM,At as Ql,Bn as be,Ci as xv,E as Dm,Ei as yp,Gr as qn$1,Jr as qw,Jt as Tt$1,K as Ir,Lt as Re,Mi as m,Mt as R,Nn as _r,Nr as pH,O as ED,Oi as zl,P as Fm,Pn as _y,Pr as pT,Rr as pt,Si as xp,St as P,Ti as ym,U as Hr,Un as cG,Ur as ql,Ut as Sw,V as Hd,Vt as SI,W as Hw,Wr as qm,X as Jl,Xt as Tw,Yt as Tv,Z as Jm,_t as Nm,ai as v,an as Vm,bi as xe,ci as vp,cr as ge,dr as ia$1,en as Uw,er as fe,et as Kl,fn as Wm,ft as Mw,g as CC,gr as js,hi as ww,ii as uw,in as Vh,ir as gC,it as Ld,j as Ee,ji as l,jn as _i$1,kr as oC,li as vv,ln as WS,lr as h,mi as wm,n as $i$1,nn as V_,oi as vD,on as Vn,p as Bw,pr as ie,qn as dG,rt as L,s as Ap,si as vl,sn as Vs,ti as ta$1,ui as wC,ur as hH,vn as YS,vr as k,wr as kw,wt as PC,x as Cw,xi as xm,y as Cm,yi as xS,yt as O,z as Gw,zn as ay,zr as q}from"./chunk-BpT5wdeN.js";import{n as yt,r as Dt,t as wt$1,u as m$1}from"./main-YENOWT3F.js";import{t as f}from"./chunk-3nbb3lx-.js";import{n as dt,r as lt}from"./chunk-CdM5TklW.js";import{a as k$1,o as p,r as d,s,t as H}from"./chunk-Diy3XHPK.js";import"./chunk-C99dHixH.js";import"./chunk-WZemQj03.js";import{n as Ie}from"./chunk-DAoBc3q9.js";import{a as Vt$1,l as ot,n as It,o as W,s as Wt$1,t as D,u as qt$1}from"./chunk-CE815-g4.js";import"./chunk-CoBJjLjQ.js";import{t as w}from"./chunk-DlVvsYRy.js";import{a as ei$1,c as ni$1,d as si$1,f as ti$1,i as ai$1,l as oi$1,o as ii$1,r as Zt,s as li$1,t as Jt,u as ri$1}from"./chunk-Cn3paqQs.js";import"./chunk-BQmX-p_U.js";import{t as I}from"./chunk-C1zxfjID.js";import{i as Lt$1,r as I$1,t as Bt$1}from"./chunk-Ct_65vQm.js";import{l as q$1,u as xe$1}from"./chunk-BctHmrjI.js";import{n as bt,r as nt,t as Dt$1}from"./chunk-6Q9Qlxht.js";import{n as ge$1,r as he,t as U}from"./chunk-VjoCMFg2.js";import{a as hn,i as bn,r as Re$1}from"./chunk-CXzVBkki.js";function bi(t,i){}var re=class{viewContainerRef;injector;id;role=`dialog`;panelClass=``;hasBackdrop=!0;backdropClass=``;disableClose=!1;closePredicate;width=``;height=``;minWidth;minHeight;maxWidth;maxHeight;positionStrategy;data=null;direction;ariaDescribedBy=null;ariaLabelledBy=null;ariaLabel=null;ariaModal=!1;autoFocus=`first-tabbable`;restoreFocus=!0;scrollStrategy;closeOnNavigation=!0;closeOnDestroy=!0;closeOnOverlayDetachments=!0;disableAnimations=!1;providers;container;templateContext;bindings};var Lt=(()=>{class t extends d{_elementRef=h(ie);_focusTrapFactory=h(WS);_config;_interactivityChecker=h(Tv);_ngZone=h(P);_focusMonitor=h(vv);_renderer=h(Ir);_changeDetectorRef=h(_y);_injector=h(q);_platform=h(ge);_document=h(O);_portalOutlet;_focusTrapped=new L;_focusTrap=null;_elementFocusedBeforeDialogWasOpened=null;_closeInteractionType=null;_ariaLabelledByQueue=[];_isDestroyed=!1;constructor(){super(),this._config=h(re,{optional:!0})||new re,this._config.ariaLabelledBy&&this._ariaLabelledByQueue.push(this._config.ariaLabelledBy)}_addAriaLabelledBy(e){this._ariaLabelledByQueue.push(e),this._changeDetectorRef.markForCheck()}_removeAriaLabelledBy(e){let n=this._ariaLabelledByQueue.indexOf(e);n>-1&&(this._ariaLabelledByQueue.splice(n,1),this._changeDetectorRef.markForCheck())}_contentAttached(){this._initializeFocusTrap(),this._captureInitialFocus()}_captureInitialFocus(){this._trapFocus()}ngOnDestroy(){this._focusTrapped.complete(),this._isDestroyed=!0,this._restoreFocus()}attachComponentPortal(e){this._portalOutlet.hasAttached();let n=this._portalOutlet.attachComponentPortal(e);return this._contentAttached(),n}attachTemplatePortal(e){this._portalOutlet.hasAttached();let n=this._portalOutlet.attachTemplatePortal(e);return this._contentAttached(),n}attachDomPortal=e=>{this._portalOutlet.hasAttached();let n=this._portalOutlet.attachDomPortal(e);return this._contentAttached(),n};_recaptureFocus(){this._containsFocus()||this._trapFocus()}_forceFocus(e,n){this._interactivityChecker.isFocusable(e)||(e.tabIndex=-1,this._ngZone.runOutsideAngular(()=>{let a=()=>{l(),p(),e.removeAttribute(`tabindex`)},l=this._renderer.listen(e,`blur`,a),p=this._renderer.listen(e,`mousedown`,a)})),e.focus(n)}_focusByCssSelector(e,n){let a=this._elementRef.nativeElement.querySelector(e);a&&this._forceFocus(a,n)}_trapFocus(e){this._isDestroyed||vl(()=>{let n=this._elementRef.nativeElement;switch(this._config.autoFocus){case!1:case`dialog`:this._containsFocus()||n.focus(e);break;case!0:case`first-tabbable`:this._focusTrap?.focusInitialElement(e)||this._focusDialogContainer(e);break;case`first-heading`:this._focusByCssSelector(`h1, h2, h3, h4, h5, h6, [role="heading"]`,e);break;default:this._focusByCssSelector(this._config.autoFocus,e);break}this._focusTrapped.next()},{injector:this._injector})}_restoreFocus(){let e=this._config.restoreFocus,n=null;if(typeof e==`string`?n=this._document.querySelector(e):typeof e==`boolean`?n=e?this._elementFocusedBeforeDialogWasOpened:null:e&&(n=e),this._config.restoreFocus&&n&&typeof n.focus==`function`){let a=xS(),l=this._elementRef.nativeElement;(!a||a===this._document.body||a===l||l.contains(a))&&(this._focusMonitor?(this._focusMonitor.focusVia(n,this._closeInteractionType),this._closeInteractionType=null):n.focus())}this._focusTrap&&this._focusTrap.destroy()}_focusDialogContainer(e){this._elementRef.nativeElement.focus?.(e)}_containsFocus(){let e=this._elementRef.nativeElement,n=xS();return e===n||e.contains(n)}_initializeFocusTrap(){this._platform.isBrowser&&(this._focusTrap=this._focusTrapFactory.create(this._elementRef.nativeElement),this._document&&(this._elementFocusedBeforeDialogWasOpened=xS()))}static ɵfac=function(n){return new(n||t)};static ɵcmp=Vn({type:t,selectors:[[`cdk-dialog-container`]],viewQuery:function(n,a){if(n&1&&Fm(k$1,7),n&2){let l;Gw(l=zw())&&(a._portalOutlet=l.first)}},hostAttrs:[`tabindex`,`-1`,1,`cdk-dialog-container`],hostVars:6,hostBindings:function(n,a){n&2&&zl(`id`,a._config.id||null)(`role`,a._config.role)(`aria-modal`,a._config.ariaModal)(`aria-labelledby`,a._config.ariaLabel?null:a._ariaLabelledByQueue[0])(`aria-label`,a._config.ariaLabel)(`aria-describedby`,a._config.ariaDescribedBy||null)},features:[ym],decls:1,vars:0,consts:[[`cdkPortalOutlet`,``]],template:function(n,a){n&1&&Dm(0,bi,0,0,`ng-template`,0)},dependencies:[k$1],styles:[`.cdk-dialog-container {
  display: block;
  width: 100%;
  height: 100%;
  min-height: inherit;
  max-height: inherit;
}
`],encapsulation:2,changeDetection:1})}return t})();var He=class{overlayRef;config;componentInstance=null;componentRef=null;containerInstance;disableClose;closed=new L;backdropClick;keydownEvents;outsidePointerEvents;id;_detachSubscription;constructor(i,e){this.overlayRef=i,this.config=e,this.disableClose=e.disableClose,this.backdropClick=i.backdropClick(),this.keydownEvents=i.keydownEvents(),this.outsidePointerEvents=i.outsidePointerEvents(),this.id=e.id,this.keydownEvents.subscribe(n=>{n.keyCode===27&&!this.disableClose&&!xv(n)&&(n.preventDefault(),this.close(void 0,{focusOrigin:`keyboard`}))}),this.backdropClick.subscribe(()=>{!this.disableClose&&this._canClose()?this.close(void 0,{focusOrigin:`mouse`}):this.containerInstance._recaptureFocus?.()}),this._detachSubscription=i.detachments().subscribe(()=>{e.closeOnOverlayDetachments!==!1&&this.close()})}close(i,e){if(this._canClose(i)){let n=this.closed;this.containerInstance._closeInteractionType=e?.focusOrigin||`program`,this._detachSubscription.unsubscribe(),this.overlayRef.dispose(),n.next(i),n.complete(),this.componentInstance=this.containerInstance=null}}updatePosition(){return this.overlayRef.updatePosition(),this}updateSize(i=``,e=``){return this.overlayRef.updateSize({width:i,height:e}),this}addPanelClass(i){return this.overlayRef.addPanelClass(i),this}removePanelClass(i){return this.overlayRef.removePanelClass(i),this}_canClose(i){let e=this.config;return!!this.containerInstance&&(!e.closePredicate||e.closePredicate(i,e,this.componentInstance))}};var _i=new v(`DialogScrollStrategy`,{providedIn:`root`,factory:()=>{let t=h(q);return()=>Vt$1(t)}});var vi=new v(`DialogData`);var xi=new v(`DefaultDialogConfig`);function wi(t){let i=Tt$1(t),e=new fe;return{valueSignal:i,get value(){return i()},change:e,ngOnDestroy(){e.complete()}}}var Ft=(()=>{class t{_injector=h(q);_defaultOptions=h(xi,{optional:!0});_parentDialog=h(t,{optional:!0,skipSelf:!0});_overlayContainer=h(Wt$1);_idGenerator=h(Hd);_openDialogsAtThisLevel=[];_afterAllClosedAtThisLevel=new L;_afterOpenedAtThisLevel=new L;_ariaHiddenElements=new Map;_scrollStrategy=h(_i);get openDialogs(){return this._parentDialog?this._parentDialog.openDialogs:this._openDialogsAtThisLevel}get afterOpened(){return this._parentDialog?this._parentDialog.afterOpened:this._afterOpenedAtThisLevel}afterAllClosed=vD(()=>this.openDialogs.length?this._getAfterAllClosed():this._getAfterAllClosed().pipe(_i$1(void 0)));open(e,n){n=l(l({},this._defaultOptions||new re),n),n.id=n.id||this._idGenerator.getId(`cdk-dialog-`),n.id&&this.getDialogById(n.id);let l$1=this._getOverlayConfig(n),p=ot(this._injector,l$1),u=new He(p,n),S=this._attachContainer(p,u,n);if(u.containerInstance=S,!this.openDialogs.length){let g=this._overlayContainer.getContainerElement();S._focusTrapped?S._focusTrapped.pipe(pt(1)).subscribe(()=>{this._hideNonDialogContentFromAssistiveTechnology(g)}):this._hideNonDialogContentFromAssistiveTechnology(g)}return this._attachDialogContent(e,u,S,n),this.openDialogs.push(u),u.closed.subscribe(()=>this._removeOpenDialog(u,!0)),this.afterOpened.next(u),u}closeAll(){Rt(this.openDialogs,e=>e.close())}getDialogById(e){return this.openDialogs.find(n=>n.id===e)}ngOnDestroy(){Rt(this._openDialogsAtThisLevel,e=>{e.config.closeOnDestroy===!1&&this._removeOpenDialog(e,!1)}),Rt(this._openDialogsAtThisLevel,e=>e.close()),this._afterAllClosedAtThisLevel.complete(),this._afterOpenedAtThisLevel.complete(),this._openDialogsAtThisLevel=[]}_getOverlayConfig(e){let n=new D({positionStrategy:e.positionStrategy||It().centerHorizontally().centerVertically(),scrollStrategy:e.scrollStrategy||this._scrollStrategy(),panelClass:e.panelClass,hasBackdrop:e.hasBackdrop,direction:e.direction,minWidth:e.minWidth,minHeight:e.minHeight,maxWidth:e.maxWidth,maxHeight:e.maxHeight,width:e.width,height:e.height,disposeOnNavigation:e.closeOnNavigation,disableAnimations:e.disableAnimations});return e.backdropClass&&(n.backdropClass=e.backdropClass),n}_attachContainer(e,n,a){let l=a.injector||a.viewContainerRef?.injector,p$1=[{provide:re,useValue:a},{provide:He,useValue:n},{provide:W,useValue:e}],u;a.container?typeof a.container==`function`?u=a.container:(u=a.container.type,p$1.push(...a.container.providers(a))):u=Lt;let S=new p(u,a.viewContainerRef,q.create({parent:l||this._injector,providers:p$1}));return e.attach(S).instance}_attachDialogContent(e,n,a,l$2){if(e instanceof _r){let p=this._createInjector(l$2,n,a,void 0),u={$implicit:l$2.data,dialogRef:n};l$2.templateContext&&(u=l(l({},u),typeof l$2.templateContext==`function`?l$2.templateContext():l$2.templateContext)),a.attachTemplatePortal(new s(e,null,u,p))}else{let p$2=this._createInjector(l$2,n,a,this._injector),u=a.attachComponentPortal(new p(e,l$2.viewContainerRef,p$2,null,l$2.bindings));n.componentRef=u,n.componentInstance=u.instance}}_createInjector(e,n,a,l){let p=e.injector||e.viewContainerRef?.injector,u=[{provide:vi,useValue:e.data},{provide:He,useValue:n}];return e.providers&&(typeof e.providers==`function`?u.push(...e.providers(n,e,a)):u.push(...e.providers)),e.direction&&(!p||!p.get(oM,null,{optional:!0}))&&u.push({provide:oM,useValue:wi(e.direction)}),q.create({parent:p||l,providers:u})}_removeOpenDialog(e,n){let a=this.openDialogs.indexOf(e);a>-1&&(this.openDialogs.splice(a,1),this.openDialogs.length||(this._ariaHiddenElements.forEach((l,p)=>{l?p.setAttribute(`aria-hidden`,l):p.removeAttribute(`aria-hidden`)}),this._ariaHiddenElements.clear(),n&&this._getAfterAllClosed().next()))}_hideNonDialogContentFromAssistiveTechnology(e){if(e.parentElement){let n=e.parentElement.children;for(let a=n.length-1;a>-1;a--){let l=n[a];l!==e&&l.nodeName!==`SCRIPT`&&l.nodeName!==`STYLE`&&!l.hasAttribute(`aria-live`)&&!l.hasAttribute(`popover`)&&(this._ariaHiddenElements.set(l,l.getAttribute(`aria-hidden`)),l.setAttribute(`aria-hidden`,`true`))}}}_getAfterAllClosed(){let e=this._parentDialog;return e?e._getAfterAllClosed():this._afterAllClosedAtThisLevel}static ɵfac=function(n){return new(n||t)};static ɵprov=k({token:t,factory:t.ɵfac})}return t})();function Rt(t,i){let e=t.length;for(;e--;)i(t[e])}var qn=(()=>{class t{static ɵfac=function(n){return new(n||t)};static ɵmod=xe({type:t});static ɵinj=Ee({providers:[Ft],imports:[qt$1,H,YS,H]})}return t})();function ki(t,i){}var vt=class{viewContainerRef;injector;id;role=`dialog`;panelClass=``;hasBackdrop=!0;backdropClass=``;disableClose=!1;closePredicate;width=``;height=``;minWidth;minHeight;maxWidth;maxHeight;position;data=null;direction;ariaDescribedBy=null;ariaLabelledBy=null;ariaLabel=null;ariaModal=!1;autoFocus=`first-tabbable`;restoreFocus=!0;delayFocusTrap=!0;scrollStrategy;closeOnNavigation=!0;enterAnimationDuration;exitAnimationDuration;bindings};var Bt=`mdc-dialog--open`;var $n=`mdc-dialog--opening`;var Un=`mdc-dialog--closing`;var Ci=150;var Si=75;var Di=(()=>{class t extends Lt{_animationStateChanged=new fe;_animationsEnabled=!Ea$1();_actionSectionCount=0;_hostElement=this._elementRef.nativeElement;_enterAnimationDuration=this._animationsEnabled?Xn(this._config.enterAnimationDuration)??Ci:0;_exitAnimationDuration=this._animationsEnabled?Xn(this._config.exitAnimationDuration)??Si:0;_animationTimer=null;_contentAttached(){super._contentAttached(),this._startOpenAnimation()}_startOpenAnimation(){this._animationStateChanged.emit({state:`opening`,totalTime:this._enterAnimationDuration}),this._animationsEnabled?(this._hostElement.style.setProperty(Yn,`${this._enterAnimationDuration}ms`),this._requestAnimationFrame(()=>this._hostElement.classList.add($n,Bt)),this._waitForAnimationToComplete(this._enterAnimationDuration,this._finishDialogOpen)):(this._hostElement.classList.add(Bt),Promise.resolve().then(()=>this._finishDialogOpen()))}_startExitAnimation(){this._animationStateChanged.emit({state:`closing`,totalTime:this._exitAnimationDuration}),this._hostElement.classList.remove(Bt),this._animationsEnabled?(this._hostElement.style.setProperty(Yn,`${this._exitAnimationDuration}ms`),this._requestAnimationFrame(()=>this._hostElement.classList.add(Un)),this._waitForAnimationToComplete(this._exitAnimationDuration,this._finishDialogClose)):Promise.resolve().then(()=>this._finishDialogClose())}_updateActionSectionCount(e){this._actionSectionCount+=e,this._changeDetectorRef.markForCheck()}_finishDialogOpen=()=>{this._clearAnimationClasses(),this._openAnimationDone(this._enterAnimationDuration)};_finishDialogClose=()=>{this._clearAnimationClasses(),this._animationStateChanged.emit({state:`closed`,totalTime:this._exitAnimationDuration})};_clearAnimationClasses(){this._hostElement.classList.remove($n,Un)}_waitForAnimationToComplete(e,n){this._animationTimer!==null&&clearTimeout(this._animationTimer),this._animationTimer=setTimeout(n,e)}_requestAnimationFrame(e){this._ngZone.runOutsideAngular(()=>{typeof requestAnimationFrame==`function`?requestAnimationFrame(e):e()})}_captureInitialFocus(){this._config.delayFocusTrap||this._trapFocus()}_openAnimationDone(e){this._config.delayFocusTrap&&this._trapFocus(),this._animationStateChanged.next({state:`opened`,totalTime:e})}ngOnDestroy(){super.ngOnDestroy(),this._animationTimer!==null&&clearTimeout(this._animationTimer)}attachComponentPortal(e){let n=super.attachComponentPortal(e);return n.location.nativeElement.classList.add(`mat-mdc-dialog-component-host`),n}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵcmp=Vn({type:t,selectors:[[`mat-dialog-container`]],hostAttrs:[`tabindex`,`-1`,1,`mat-mdc-dialog-container`,`mdc-dialog`],hostVars:10,hostBindings:function(n,a){n&2&&(Nm(`id`,a._config.id),zl(`aria-modal`,a._config.ariaModal)(`role`,a._config.role)(`aria-labelledby`,a._config.ariaLabel?null:a._ariaLabelledByQueue[0])(`aria-label`,a._config.ariaLabel)(`aria-describedby`,a._config.ariaDescribedBy||null),ta$1(`_mat-animation-noopable`,!a._animationsEnabled)(`mat-mdc-dialog-container-with-actions`,a._actionSectionCount>0))},features:[ym],decls:3,vars:0,consts:[[1,`mat-mdc-dialog-inner-container`,`mdc-dialog__container`],[1,`mat-mdc-dialog-surface`,`mdc-dialog__surface`],[`cdkPortalOutlet`,``]],template:function(n,a){n&1&&(js(0,`div`,0)(1,`div`,1),Dm(2,ki,0,0,`ng-template`,2),ql()())},dependencies:[k$1],styles:[`.mat-mdc-dialog-container {
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
`],encapsulation:2,changeDetection:1})}return t})();var Yn=`--mat-dialog-transition-duration`;function Xn(t){return t==null?null:typeof t==`number`?t:t.endsWith(`ms`)?Ld(t.substring(0,t.length-2)):t.endsWith(`s`)?Ld(t.substring(0,t.length-1))*1e3:t===`0`?0:null}var _t=(function(t){return t[t.OPEN=0]=`OPEN`,t[t.CLOSING=1]=`CLOSING`,t[t.CLOSED=2]=`CLOSED`,t})(_t||{});var Q=class{_ref;_config;_containerInstance;componentInstance;componentRef=null;disableClose;id;_afterOpened=new Hr(1);_beforeClosed=new Hr(1);_result;_closeFallbackTimeout;_state=_t.OPEN;_closeInteractionType;constructor(i,e,n){this._ref=i,this._config=e,this._containerInstance=n,this.disableClose=e.disableClose,this.id=i.id,i.addPanelClass(`mat-mdc-dialog-panel`),n._animationStateChanged.pipe(be(a=>a.state===`opened`),pt(1)).subscribe(()=>{this._afterOpened.next(),this._afterOpened.complete()}),n._animationStateChanged.pipe(be(a=>a.state===`closed`),pt(1)).subscribe(()=>{clearTimeout(this._closeFallbackTimeout),this._finishDialogClose()}),i.overlayRef.detachments().subscribe(()=>{this._beforeClosed.next(this._result),this._beforeClosed.complete(),this._finishDialogClose()}),ED(this.backdropClick(),this.keydownEvents().pipe(be(a=>a.keyCode===27&&!this.disableClose&&!xv(a)))).subscribe(a=>{this.disableClose||(a.preventDefault(),Qn(this,a.type===`keydown`?`keyboard`:`mouse`))})}close(i){let e=this._config.closePredicate;e&&!e(i,this._config,this.componentInstance)||(this._result=i,this._containerInstance._animationStateChanged.pipe(be(n=>n.state===`closing`),pt(1)).subscribe(n=>{this._beforeClosed.next(i),this._beforeClosed.complete(),this._ref.overlayRef.detachBackdrop(),this._closeFallbackTimeout=setTimeout(()=>this._finishDialogClose(),n.totalTime+100)}),this._state=_t.CLOSING,this._containerInstance._startExitAnimation())}afterOpened(){return this._afterOpened}afterClosed(){return this._ref.closed}beforeClosed(){return this._beforeClosed}backdropClick(){return this._ref.backdropClick}keydownEvents(){return this._ref.keydownEvents}updatePosition(i){let e=this._ref.config.positionStrategy;return i&&(i.left||i.right)?i.left?e.left(i.left):e.right(i.right):e.centerHorizontally(),i&&(i.top||i.bottom)?i.top?e.top(i.top):e.bottom(i.bottom):e.centerVertically(),this._ref.updatePosition(),this}updateSize(i=``,e=``){return this._ref.updateSize(i,e),this}addPanelClass(i){return this._ref.addPanelClass(i),this}removePanelClass(i){return this._ref.removePanelClass(i),this}getState(){return this._state}_finishDialogClose(){this._state=_t.CLOSED,this._ref.close(this._result,{focusOrigin:this._closeInteractionType}),this.componentInstance=null}};function Qn(t,i,e){return t._closeInteractionType=i,t.close(e)}var pe=new v(`MatMdcDialogData`);var Ti=new v(`mat-mdc-dialog-default-options`);var Ni=new v(`mat-mdc-dialog-scroll-strategy`,{providedIn:`root`,factory:()=>{let t=h(q);return()=>Vt$1(t)}});var ze=(()=>{class t{_defaultOptions=h(Ti,{optional:!0});_scrollStrategy=h(Ni);_parentDialog=h(t,{optional:!0,skipSelf:!0});_idGenerator=h(Hd);_injector=h(q);_dialog=h(Ft);_animationsDisabled=Ea$1();_openDialogsAtThisLevel=[];_afterAllClosedAtThisLevel=new L;_afterOpenedAtThisLevel=new L;dialogConfigClass=vt;_dialogRefConstructor;_dialogContainerType;_dialogDataToken;get openDialogs(){return this._parentDialog?this._parentDialog.openDialogs:this._openDialogsAtThisLevel}get afterOpened(){return this._parentDialog?this._parentDialog.afterOpened:this._afterOpenedAtThisLevel}_getAfterAllClosed(){let e=this._parentDialog;return e?e._getAfterAllClosed():this._afterAllClosedAtThisLevel}afterAllClosed=vD(()=>this.openDialogs.length?this._getAfterAllClosed():this._getAfterAllClosed().pipe(_i$1(void 0)));constructor(){this._dialogRefConstructor=Q,this._dialogContainerType=Di,this._dialogDataToken=pe}open(e,n){let a;n=l(l({},this._defaultOptions||new vt),n),n.id=n.id||this._idGenerator.getId(`mat-mdc-dialog-`),n.scrollStrategy=n.scrollStrategy||this._scrollStrategy();let l$3=this._dialog.open(e,m(l({},n),{positionStrategy:It(this._injector).centerHorizontally().centerVertically(),disableClose:!0,closePredicate:void 0,closeOnDestroy:!1,closeOnOverlayDetachments:!1,disableAnimations:this._animationsDisabled||n.enterAnimationDuration?.toLocaleString()===`0`||n.exitAnimationDuration?.toString()===`0`,container:{type:this._dialogContainerType,providers:()=>[{provide:this.dialogConfigClass,useValue:n},{provide:re,useValue:n}]},templateContext:()=>({dialogRef:a}),providers:(p,u,S)=>(a=new this._dialogRefConstructor(p,n,S),a.updatePosition(n?.position),[{provide:this._dialogContainerType,useValue:S},{provide:this._dialogDataToken,useValue:u.data},{provide:this._dialogRefConstructor,useValue:a}])}));return a.componentRef=l$3.componentRef,a.componentInstance=l$3.componentInstance,this.openDialogs.push(a),this.afterOpened.next(a),a.afterClosed().subscribe(()=>{let p=this.openDialogs.indexOf(a);p>-1&&(this.openDialogs.splice(p,1),this.openDialogs.length||this._getAfterAllClosed().next())}),a}closeAll(){this._closeDialogs(this.openDialogs)}getDialogById(e){return this.openDialogs.find(n=>n.id===e)}ngOnDestroy(){this._closeDialogs(this._openDialogsAtThisLevel),this._afterAllClosedAtThisLevel.complete(),this._afterOpenedAtThisLevel.complete()}_closeDialogs(e){let n=e.length;for(;n--;)e[n].close()}static ɵfac=function(n){return new(n||t)};static ɵprov=k({token:t,factory:t.ɵfac})}return t})();var ke=(()=>{class t{dialogRef=h(Q,{optional:!0});_elementRef=h(ie);_dialog=h(ze);ariaLabel;type=`button`;dialogResult;_matDialogClose;ngOnInit(){this.dialogRef||(this.dialogRef=Jn(this._elementRef,this._dialog.openDialogs))}ngOnChanges(e){let n=e._matDialogClose;n&&(this.dialogResult=n.currentValue)}_onButtonClick(e){this._elementRef.nativeElement.getAttribute(`aria-disabled`)!==`true`&&Qn(this.dialogRef,e.screenX===0&&e.screenY===0?`keyboard`:`mouse`,this.dialogResult)}static ɵfac=function(n){return new(n||t)};static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-close`,``],[``,`matDialogClose`,``]],hostVars:2,hostBindings:function(n,a){n&1&&xm(`click`,function(p){return a._onButtonClick(p)}),n&2&&zl(`aria-label`,a.ariaLabel||null)(`type`,a.type)},inputs:{ariaLabel:[0,`aria-label`,`ariaLabel`],type:`type`,dialogResult:[0,`mat-dialog-close`,`dialogResult`],_matDialogClose:[0,`matDialogClose`,`_matDialogClose`]},exportAs:[`matDialogClose`],features:[Vs]})}return t})();var Zn=(()=>{class t{_dialogRef=h(Q,{optional:!0});_elementRef=h(ie);_dialog=h(ze);ngOnInit(){this._dialogRef||(this._dialogRef=Jn(this._elementRef,this._dialog.openDialogs)),this._dialogRef&&Promise.resolve().then(()=>{this._onAdd()})}ngOnDestroy(){this._dialogRef?._containerInstance&&Promise.resolve().then(()=>{this._onRemove()})}static ɵfac=function(n){return new(n||t)};static ɵdir=Re({type:t})}return t})();var Ce=(()=>{class t extends Zn{id=h(Hd).getId(`mat-mdc-dialog-title-`);_onAdd(){this._dialogRef._containerInstance?._addAriaLabelledBy?.(this.id)}_onRemove(){this._dialogRef?._containerInstance?._removeAriaLabelledBy?.(this.id)}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-title`,``],[``,`matDialogTitle`,``]],hostAttrs:[1,`mat-mdc-dialog-title`,`mdc-dialog__title`],hostVars:1,hostBindings:function(n,a){n&2&&Nm(`id`,a.id)},inputs:{id:`id`},exportAs:[`matDialogTitle`],features:[ym]})}return t})();var Se=(()=>{class t{static ɵfac=function(n){return new(n||t)};static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-content`,``],[`mat-dialog-content`],[``,`matDialogContent`,``]],hostAttrs:[1,`mat-mdc-dialog-content`,`mdc-dialog__content`],features:[uw([Ie])]})}return t})();var De=(()=>{class t extends Zn{align;_onAdd(){this._dialogRef._containerInstance?._updateActionSectionCount?.(1)}_onRemove(){this._dialogRef._containerInstance?._updateActionSectionCount?.(-1)}static ɵfac=(()=>{let e;return function(a){return(e||(e=Vh(t)))(a||t)}})();static ɵdir=Re({type:t,selectors:[[``,`mat-dialog-actions`,``],[`mat-dialog-actions`],[``,`matDialogActions`,``]],hostAttrs:[1,`mat-mdc-dialog-actions`,`mdc-dialog__actions`],hostVars:6,hostBindings:function(n,a){n&2&&ta$1(`mat-mdc-dialog-actions-align-start`,a.align===`start`)(`mat-mdc-dialog-actions-align-center`,a.align===`center`)(`mat-mdc-dialog-actions-align-end`,a.align===`end`)},inputs:{align:`align`},features:[ym]})}return t})();function Jn(t,i){let e=t.nativeElement.parentElement;for(;e&&!e.classList.contains(`mat-mdc-dialog-container`);)e=e.parentElement;return e?i.find(n=>n.id===e.id):null}var le=(()=>{class t{static ɵfac=function(n){return new(n||t)};static ɵmod=xe({type:t});static ɵinj=Ee({providers:[ze],imports:[qn,qt$1,H,Uv]})}return t})();var Mi=[`switch`];var Ei=[`*`];function Ai(t,i){t&1&&(js(0,`span`,11),Ap(),js(1,`svg`,13),Cm(2,`path`,14),ql(),js(3,`svg`,15),Cm(4,`path`,16),ql()())}var Pi=new v(`mat-slide-toggle-default-options`,{providedIn:`root`,factory:()=>({disableToggleValue:!1,hideIcon:!1,disabledInteractive:!1})});var xt=class{source;checked;constructor(i,e){this.source=i,this.checked=e}};var zt=(()=>{class t{_elementRef=h(ie);_focusMonitor=h(vv);_changeDetectorRef=h(_y);defaults=h(Pi);_onChange=e=>{};_onTouched=()=>{};_validatorOnChange=()=>{};_uniqueId;_checked=!1;_createChangeEvent(e){return new xt(this,e)}_labelId;get buttonId(){return`${this.id||this._uniqueId}-button`}_switchElement;focus(){this._switchElement.nativeElement.focus()}_noopAnimations=Ea$1();_focused=!1;name=null;id;labelPosition=`after`;ariaLabel=null;ariaLabelledby=null;ariaDescribedby;required=!1;color;disabled=!1;fullWidth=!1;disableRipple=!1;tabIndex=0;get checked(){return this._checked}set checked(e){this._checked=e,this._changeDetectorRef.markForCheck()}hideIcon;disabledInteractive;change=new fe;toggleChange=new fe;get inputId(){return`${this.id||this._uniqueId}-input`}constructor(){h(qn$1).load(dG);let e=h(new ay(`tabindex`),{optional:!0}),n=this.defaults;this.tabIndex=e==null?0:parseInt(e)||0,this.color=n.color||`accent`,this.id=this._uniqueId=h(Hd).getId(`mat-mdc-slide-toggle-`),this.hideIcon=n.hideIcon??!1,this.disabledInteractive=n.disabledInteractive??!1,this._labelId=this._uniqueId+`-label`}ngAfterContentInit(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{e===`keyboard`||e===`program`?(this._focused=!0,this._changeDetectorRef.markForCheck()):e||Promise.resolve().then(()=>{this._focused=!1,this._onTouched(),this._changeDetectorRef.markForCheck()})})}ngOnChanges(e){e.required&&this._validatorOnChange()}ngOnDestroy(){this._focusMonitor.stopMonitoring(this._elementRef)}writeValue(e){this.checked=!!e}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}validate(e){return this.required&&e.value!==!0?{required:!0}:null}registerOnValidatorChange(e){this._validatorOnChange=e}setDisabledState(e){this.disabled=e,this._changeDetectorRef.markForCheck()}toggle(){this.checked=!this.checked,this._onChange(this.checked)}_emitChangeEvent(){this._onChange(this.checked),this.change.emit(this._createChangeEvent(this.checked))}_handleClick(){this.disabled||(this.toggleChange.emit(),this.defaults.disableToggleValue||(this.checked=!this.checked,this._onChange(this.checked),this.change.emit(new xt(this,this.checked))))}_getAriaLabelledBy(){return this.ariaLabelledby?this.ariaLabelledby:this.ariaLabel?null:this._labelId}static ɵfac=function(n){return new(n||t)};static ɵcmp=Vn({type:t,selectors:[[`mat-slide-toggle`]],viewQuery:function(n,a){if(n&1&&Fm(Mi,5),n&2){let l;Gw(l=zw())&&(a._switchElement=l.first)}},hostAttrs:[1,`mat-mdc-slide-toggle`],hostVars:15,hostBindings:function(n,a){n&2&&(Nm(`id`,a.id),zl(`tabindex`,null)(`aria-label`,null)(`name`,null)(`aria-labelledby`,null),oC(a.color?`mat-`+a.color:``),ta$1(`mat-mdc-slide-toggle-focused`,a._focused)(`mat-mdc-slide-toggle-checked`,a.checked)(`mat-slide-toggle-full-width`,a.fullWidth)(`_mat-animation-noopable`,a._noopAnimations))},inputs:{name:`name`,id:`id`,labelPosition:`labelPosition`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaLabelledby:[0,`aria-labelledby`,`ariaLabelledby`],ariaDescribedby:[0,`aria-describedby`,`ariaDescribedby`],required:[2,`required`,`required`,ia$1],color:`color`,disabled:[2,`disabled`,`disabled`,ia$1],fullWidth:[2,`fullWidth`,`fullWidth`,ia$1],disableRipple:[2,`disableRipple`,`disableRipple`,ia$1],tabIndex:[2,`tabIndex`,`tabIndex`,e=>e==null?0:pT(e)],checked:[2,`checked`,`checked`,ia$1],hideIcon:[2,`hideIcon`,`hideIcon`,ia$1],disabledInteractive:[2,`disabledInteractive`,`disabledInteractive`,ia$1]},outputs:{change:`change`,toggleChange:`toggleChange`},exportAs:[`matSlideToggle`],features:[Jm([{provide:xe$1,useExisting:$i$1(()=>t),multi:!0},{provide:q$1,useExisting:t,multi:!0}]),Vs],ngContentSelectors:Ei,decls:14,vars:27,consts:[[`switch`,``],[`mat-internal-form-field`,``,3,`labelPosition`],[`role`,`switch`,`type`,`button`,1,`mdc-switch`,3,`click`,`tabIndex`,`disabled`],[1,`mat-mdc-slide-toggle-touch-target`],[1,`mdc-switch__track`],[1,`mdc-switch__handle-track`],[1,`mdc-switch__handle`],[1,`mdc-switch__shadow`],[1,`mdc-elevation-overlay`],[1,`mdc-switch__ripple`],[`mat-ripple`,``,1,`mat-mdc-slide-toggle-ripple`,`mat-focus-indicator`,3,`matRippleTrigger`,`matRippleDisabled`,`matRippleCentered`],[1,`mdc-switch__icons`],[1,`mdc-label`,3,`click`,`for`],[`viewBox`,`0 0 24 24`,`aria-hidden`,`true`,1,`mdc-switch__icon`,`mdc-switch__icon--on`],[`d`,`M19.69,5.23L8.96,15.96l-4.23-4.23L2.96,13.5l6,6L21.46,7L19.69,5.23z`],[`viewBox`,`0 0 24 24`,`aria-hidden`,`true`,1,`mdc-switch__icon`,`mdc-switch__icon--off`],[`d`,`M20 13H4v-2h16v2z`]],template:function(n,a){if(n&1&&(Hw(),js(0,`div`,1)(1,`button`,2,0),xm(`click`,function(){return a._handleClick()}),Cm(3,`div`,3)(4,`span`,4),js(5,`span`,5)(6,`span`,6)(7,`span`,7),Cm(8,`span`,8),ql(),js(9,`span`,9),Cm(10,`span`,10),ql(),ww(11,Ai,5,0,`span`,11),ql()()(),js(12,`label`,12),xm(`click`,function(p){return p.stopPropagation()}),Uw(13),ql()()),n&2){let l=qw(2);wm(`labelPosition`,a.labelPosition),SI(),ta$1(`mdc-switch--selected`,a.checked)(`mdc-switch--unselected`,!a.checked)(`mdc-switch--checked`,a.checked)(`mdc-switch--disabled`,a.disabled)(`mat-mdc-slide-toggle-disabled-interactive`,a.disabledInteractive),wm(`tabIndex`,a.disabled&&!a.disabledInteractive?-1:a.tabIndex)(`disabled`,a.disabled&&!a.disabledInteractive),zl(`id`,a.buttonId)(`name`,a.name)(`aria-label`,a.ariaLabel)(`aria-labelledby`,a._getAriaLabelledBy())(`aria-describedby`,a.ariaDescribedby)(`aria-required`,a.required||null)(`aria-checked`,a.checked)(`aria-disabled`,a.disabled&&a.disabledInteractive?`true`:null),SI(9),wm(`matRippleTrigger`,l)(`matRippleDisabled`,a.disableRipple||a.disabled)(`matRippleCentered`,!0),SI(),Cw(a.hideIcon?-1:11),SI(),wm(`for`,a.buttonId),zl(`id`,a._labelId)}},dependencies:[cG,m$1],styles:[`.mdc-switch {
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
`],encapsulation:2})}return t})();var ei=(()=>{class t{static ɵfac=function(n){return new(n||t)};static ɵmod=xe({type:t});static ɵinj=Ee({imports:[zt,Uv]})}return t})();var Oi={ui:{band:`application`,rank:0,lane:0,order:0},"overlay-source":{band:`application`,rank:0,lane:1,order:0},"local-tools":{band:`application`,rank:0,lane:2,order:0},openclaw:{band:`application`,rank:0,lane:3,order:0},"session-bridge":{band:`reach`,rank:0,lane:0,order:0},"overlay-packer":{band:`reach`,rank:0,lane:1,order:0},"local-mcp-host":{band:`reach`,rank:0,lane:2,order:0},"speech-client":{band:`reach`,rank:0,lane:3,order:0},"mtls-enroller":{band:`reach`,rank:0,lane:4,order:0},engine:{band:`ao`,rank:0,lane:0,order:0},endpoint:{band:`ao`,rank:0,lane:1,order:0},"web-ui":{band:`ao`,rank:0,lane:5,order:0},planner:{band:`ao`,rank:1,lane:0,order:0},catalog:{band:`ao`,rank:2,lane:0,order:0},"model-backend":{band:`ao`,rank:2,lane:1,order:0},"model-runtime":{band:`ao`,rank:2,lane:2,order:0},"execution-backend":{band:`ao`,rank:3,lane:0,order:0},worker:{band:`ao`,rank:3,lane:1,order:0},"mcp-sidecar":{band:`ao`,rank:3,lane:2,order:0},platform:{band:`ao`,rank:4,lane:0,order:0},storage:{band:`ao`,rank:4,lane:1,order:0}};var Gt={"engine/session-overlay":1,"engine/mcp-tunnel":2,"engine/direct-agent":3,"engine/hello-speech":4,"engine/mtls-enrol":4,"speech/stt":3,"speech/tts":4};var Vt={"catalog/agents":0,"catalog/mcp":1,"catalog/skills":2};var Kt={"models/backends":3,"models/ollama":4,"models/remote":5};var ti=140;var ni=52;var Ri=52;var Wt=64;var wt=28;var jt=22;var Te=32;var Li=56;var Ge=8;var Fi=8;var Bi=14;var ii={application:`1 · Application`,reach:`2 · AO Reach`,ao:`3 · Agentic Orchestration`};function Hi(t){let i=Oi[t.kind]||{band:t.band||`ao`,rank:0,lane:Ge-1,order:99},e=i.lane,n=i.order;return t.kind===`endpoint`&&Gt[t.id]!=null&&(e=Gt[t.id]),t.kind===`catalog`&&Vt[t.id]!=null&&(e=Vt[t.id],n=Vt[t.id]),(t.kind===`model-runtime`||t.kind===`model-backend`)&&(Kt[t.id]!=null?(e=Kt[t.id],n=Kt[t.id]):t.kind===`model-backend`&&(e=3)),t.id===`speech/stt`||t.id===`speech/tts`?{band:`ao`,rank:0,lane:Gt[t.id]??3,order:10}:{band:t.band||i.band,rank:i.rank,lane:e,order:n}}function zi(t){return t.instrumented===!1&&t.status===`healthy`||!t.instrumented&&t.status===`healthy`?`unknown`:t.status||`unknown`}function Gi(t,i){return{x:t.x-i,y:t.y-i,w:t.width+i*2,h:t.height+i*2,id:t.id}}function Vi(t,i,e){let n=Math.min(t.x,i.x),a=Math.max(t.x,i.x),l=Math.min(t.y,i.y),p=Math.max(t.y,i.y),u=e.x+e.w,S=e.y+e.h;return Math.abs(t.x-i.x)<.5?t.x>=e.x&&t.x<=u&&p>=e.y&&l<=S:Math.abs(t.y-i.y)<.5?t.y>=e.y&&t.y<=S&&a>=e.x&&n<=u:!1}function Ki(t,i){for(let e=0;e<t.length-1;e++)for(let n of i)if(Vi(t[e],t[e+1],n))return!0;return!1}function ji(t){if(t.length<3)return t;let i=[t[0]];for(let e=1;e<t.length-1;e++){let n=i[i.length-1],a=t[e],l=t[e+1];Math.abs(n.x-a.x)<.5&&Math.abs(a.x-l.x)<.5||Math.abs(n.y-a.y)<.5&&Math.abs(a.y-l.y)<.5||i.push(a)}return i.push(t[t.length-1]),i}function ai(t){return ji(t).map((e,n)=>`${n===0?`M`:`L`} ${oi(e.x)} ${oi(e.y)}`).join(` `)}function oi(t){return Math.round(t*10)/10}function qt(t,i){let e=t.x+t.width/2,n=t.y+t.height/2;switch(i){case`top`:return{x:e,y:t.y};case`bottom`:return{x:e,y:t.y+t.height};case`left`:return{x:t.x,y:n};case`right`:return{x:t.x+t.width,y:n}}}function ri(t,i,e=Bi){let n=qt(t,i);switch(i){case`top`:return{x:n.x,y:n.y-e};case`bottom`:return{x:n.x,y:n.y+e};case`left`:return{x:n.x-e,y:n.y};case`right`:return{x:n.x+e,y:n.y}}}function Wi(t,i,e){if(e===`bypass`)return{fromSide:`right`,toSide:`right`};let n=t.x+t.width/2,a=t.y+t.height/2,l=i.x+i.width/2,u=i.y+i.height/2-a,S=l-n;return Math.abs(u)>=Math.abs(S)*.75?u>=0?{fromSide:`bottom`,toSide:`top`}:{fromSide:`top`,toSide:`bottom`}:S>=0?{fromSide:`right`,toSide:`left`}:{fromSide:`left`,toSide:`right`}}function qi(t,i,e,n,a){let{fromSide:l,toSide:p}=Wi(t,i,e),u=qt(t,l),S=qt(i,p),g=ri(t,l),c=ri(i,p);e===`reverse-tunnel`&&(g={x:g.x+16,y:g.y},c={x:c.x+16,y:c.y});let F=n.filter(V=>V.id!==t.id&&V.id!==i.id).map(V=>Gi(V,Fi)),O=Te/2,T=a-Te/2,j=(g.y+c.y)/2,Ee=(g.x+c.x)/2,y=Math.min(g.y,c.y)-Math.max(12,Wt/4),v=Math.max(g.y,c.y)+Math.max(12,Wt/4),D=[];e===`bypass`&&D.push([g,{x:T,y:g.y},{x:T,y:c.y},c]),Math.abs(g.x-c.x)<.5&&D.push([g,c]),Math.abs(g.y-c.y)<.5&&D.push([g,c]),D.push([g,{x:g.x,y:j},{x:c.x,y:j},c]),D.push([g,{x:Ee,y:g.y},{x:Ee,y:c.y},c]),D.push([g,{x:g.x,y:v},{x:c.x,y:v},c]),D.push([g,{x:g.x,y},{x:c.x,y},c]),D.push([g,{x:O,y:g.y},{x:O,y:c.y},c]),D.push([g,{x:T,y:g.y},{x:T,y:c.y},c]),D.push([g,{x:g.x,y:v},{x:T,y:v},{x:T,y},{x:c.x,y},c]),D.push([g,{x:g.x,y},{x:O,y},{x:O,y:v},{x:c.x,y:v},c]);for(let V of D)if(!Ki(V,F))return ai([u,...V,S]);return ai([u,g,{x:T,y:g.y},{x:T,y:c.y},c,S])}function li(t,i,e){let n=e?.showNotDeployed??!1,l$4=t.filter(y=>n||y.deployed!==!1).map(y=>{let v=Hi(y);return l({node:y},v)});l$4.sort((y,v)=>{let D={application:0,reach:1,ao:2};return D[y.band]!==D[v.band]?D[y.band]-D[v.band]:y.rank!==v.rank?y.rank-v.rank:y.lane!==v.lane?y.lane-v.lane:y.order!==v.order?y.order-v.order:y.node.id.localeCompare(v.node.id)});let p=ti+Ri,S=Ge*p+Li+Te*2,g=new Map;for(let y of l$4){let v=`${y.band}:${y.rank}`;g.has(v)||g.set(v,[]),g.get(v).push(y)}let c=[`application`,`reach`,`ao`],F=[],O=[],T=Te;for(let y of c){let v=[...g.entries()].filter(([Ae])=>Ae.startsWith(`${y}:`)).sort((Ae,ge)=>Number(Ae[0].split(`:`)[1])-Number(ge[0].split(`:`)[1]));if(v.length===0){O.push({id:y,label:ii[y],y:T,height:wt+jt+40}),T+=wt+jt+40+16;continue}let D=T;T+=wt+jt;for(let[,Ae]of v){let ge=new Set;for(let Pe of Ae){let Z=Math.max(0,Math.min(Ge-1,Pe.lane));for(;ge.has(Z)&&Z<Ge-1;)Z+=1;if(ge.has(Z)){for(let We=0;We<Ge;We++)if(!ge.has(We)){Z=We;break}}ge.add(Z);let yi=Te+Z*p;F.push(m(l({},Pe.node),{x:yi,y:T,width:ti,height:ni,lane:Z,rank:Pe.rank,order:Pe.order,displayStatus:zi(Pe.node)}))}T+=ni+Wt}let V=T-D+wt/2;O.push({id:y,label:ii[y],y:D,height:V}),T+=16}let j=new Map(F.map(y=>[y.id,y])),Ee=[];for(let y of i){let v=j.get(y.from),D=j.get(y.to);if(!v||!D)continue;let V=qi(v,D,String(y.kind||`request`),F,S);Ee.push(m(l({},y),{points:``,pathD:V}))}return{width:S,height:T+Te,bands:O,nodes:F,edges:Ee}}function si(t,i){let e=new Map,n=new Map;for(let u of i)e.has(u.from)||e.set(u.from,[]),e.get(u.from).push(u.to),n.has(u.to)||n.set(u.to,[]),n.get(u.to).push(u.from);let a=new Set([t]),l=new Set,p=(u,S,g)=>{let c=[u];for(;c.length;){let F=c.pop();for(let O of S.get(F)||[]){let T=i.find(j=>g?j.from===F&&j.to===O:j.from===O&&j.to===F)?.id;T&&l.add(T),a.has(O)||(a.add(O),c.push(O))}}};p(t,e,!0),p(t,n,!1);for(let u of i)a.has(u.from)&&a.has(u.to)&&l.add(u.id);return{nodes:a,edges:l}}var $i=3e4;var Ve=class t{api=h(f);live=h(U);liveSub=null;seq=Tt$1(0);generatedAt=Tt$1(null);notes=Tt$1([]);capabilities=Tt$1(null);structureNodes=Tt$1([]);structureEdges=Tt$1([]);healthById=Tt$1({});liveMode=Tt$1(!0);paused=Tt$1(!1);showNotDeployed=Tt$1(!1);onlyUnhealthy=Tt$1(!1);bandFilter=Tt$1(`all`);tableMode=Tt$1(!1);hoverNodeId=Tt$1(null);snapshotOnly=Tt$1(!1);lastError=Tt$1(null);loading=Tt$1(!0);grace=new Map;_layoutRuns=0;layoutRunCount(){return this._layoutRuns}layout=PC(()=>{this._layoutRuns+=1;let i=this.mergeGrace(this.structureNodes()),e=this.structureEdges();if(this.bandFilter()!==`all`){let n=this.bandFilter();i=i.filter(l=>l.band===n);let a=new Set(i.map(l=>l.id));e=e.filter(l=>a.has(l.from)&&a.has(l.to))}return li(i,e,{showNotDeployed:this.showNotDeployed()})});displayNodes=PC(()=>{let i=this.healthById(),e=this.onlyUnhealthy();return this.layout().nodes.map(n=>{let a=i[n.id],l$5=a?.status||n.status,p=a?.statusReason??n.statusReason;return n.instrumented===!1&&l$5===`healthy`&&(l$5=`unknown`),m(l({},n),{status:l$5,statusReason:p,displayStatus:l$5})}).filter(n=>e?[`failed`,`degraded`,`offline`].includes(String(n.displayStatus||``).toLowerCase()):!0)});displayEdges=PC(()=>{if(!this.onlyUnhealthy())return this.layout().edges;let i=new Set(this.displayNodes().map(e=>e.id));return this.layout().edges.filter(e=>i.has(e.from)||i.has(e.to))});hoverClosure=PC(()=>{let i=this.hoverNodeId();return i?si(i,this.structureEdges()):null});unhealthyCount=PC(()=>this.displayNodes().filter(i=>[`failed`,`degraded`].includes(String(i.displayStatus||``).toLowerCase())).length);nodes=PC(()=>this.structureNodes());edges=PC(()=>this.structureEdges());start(){this.loading.set(!0),this.api.topologyGraph().subscribe(i=>{i.ok?(this.applySnapshot(i.data),this.snapshotOnly.set(!0),this.lastError.set(null)):this.lastError.set(i.message),this.loading.set(!1)}),this.live.acquire({topology:!0}),this.liveSub?.unsubscribe(),this.liveSub=this.live.topologyEvents.subscribe(i=>{this.paused()||this.onLiveEvent(i)})}stop(){this.liveSub?.unsubscribe(),this.liveSub=null,this.live.release()}togglePause(){this.paused.update(i=>!i)}resync(){this.live.resyncTopology(),this.api.topologyGraph().subscribe(i=>{i.ok&&this.applySnapshot(i.data)})}setHover(i){this.hoverNodeId.set(i)}loadNodeDetail(i){return this.api.topologyNode(i)}applyHealthForTest(i){this.layout();let e=this._layoutRuns;this.patchHealth(i),this.displayNodes();return{layoutRunsBefore:e,layoutRunsAfter:this._layoutRuns}}onLiveEvent(i){if(i.type===`topology_snapshot`){this.applySnapshot(i),this.snapshotOnly.set(!1);return}if(i.type===`topology_delta`){let e=Number(i.fromSeq||0);if(e&&e!==this.seq()){this.live.resyncTopology();return}this.applyDelta(i),this.snapshotOnly.set(!1);return}if(i.type===`topology_health`){let e=i.health;Array.isArray(e)&&this.patchHealth(e),i.seq!=null&&this.seq.set(Number(i.seq))}}applySnapshot(i){this.seq.set(Number(i.seq||0)),this.generatedAt.set(i.generatedAt||null),this.notes.set(i.notes||[]),this.capabilities.set(i.capabilities||null),this.structureNodes.set(i.nodes||[]),this.structureEdges.set(i.edges||[]);let e={};for(let n of i.nodes||[])e[n.id]={status:String(n.status),statusReason:n.statusReason};this.healthById.set(e),this.grace.clear()}applyDelta(i){let e=i.nodesUpserted||[],n=i.nodesRemoved||[],a=i.edgesUpserted||[],l$6=i.edgesRemoved||[],p=new Map(this.structureNodes().map(c=>[c.id,c])),u=l({},this.healthById());for(let c of e)p.set(c.id,c),u[c.id]={status:String(c.status),statusReason:c.statusReason},this.grace.delete(c.id);let S=Date.now();for(let c of n){let F=p.get(c);F&&(this.grace.set(c,{node:m(l({},F),{status:`offline`}),removeAt:S+$i}),u[c]={status:`offline`,statusReason:`removed`}),p.delete(c)}this.structureNodes.set([...p.values()]),this.healthById.set(u);let g=new Map(this.structureEdges().map(c=>[c.id,c]));for(let c of a)g.set(c.id,c);for(let c of l$6)g.delete(c);this.structureEdges.set([...g.values()]),i.seq!=null&&this.seq.set(Number(i.seq)),i.notes&&this.notes.set(i.notes),i.capabilities&&this.capabilities.set(i.capabilities),i.generatedAt&&this.generatedAt.set(String(i.generatedAt))}patchHealth(i){this.healthById.update(e=>{let n=l({},e);for(let a of i)n[a.id]={status:a.status,statusReason:a.statusReason};return n})}mergeGrace(i){let e=Date.now(),n=[...i];for(let[a,l]of[...this.grace.entries()]){if(e>=l.removeAt){this.grace.delete(a);continue}n.some(p=>p.id===a)||n.push(l.node)}return n}static ɵfac=function(e){return new(e||t)};static ɵprov=R({token:t,factory:t.ɵfac})};var di={ui:{accent:`#0d9488`,icon:`monitor`,aspect:`Client`},"overlay-source":{accent:`#0891b2`,icon:`layers`,aspect:`Overlays`},"local-tools":{accent:`#059669`,icon:`wrench`,aspect:`Local tools`},openclaw:{accent:`#7c3aed`,icon:`bot`,aspect:`OpenClaw`},"session-bridge":{accent:`#2563eb`,icon:`cable`,aspect:`Reach bridge`},"overlay-packer":{accent:`#4f46e5`,icon:`package`,aspect:`Overlay pack`},"local-mcp-host":{accent:`#6366f1`,icon:`plug`,aspect:`Local MCP`},"speech-client":{accent:`#db2777`,icon:`mic`,aspect:`Speech`},"mtls-enroller":{accent:`#b45309`,icon:`shield`,aspect:`mTLS`},engine:{accent:`#dc2626`,icon:`cpu`,aspect:`Engine`},endpoint:{accent:`#ea580c`,icon:`radio`,aspect:`Endpoint`},"web-ui":{accent:`#0284c7`,icon:`globe`,aspect:`Web UI`},planner:{accent:`#ca8a04`,icon:`brain`,aspect:`Planner`},catalog:{accent:`#16a34a`,icon:`book-open`,aspect:`Catalog`},"model-backend":{accent:`#0f766e`,icon:`boxes`,aspect:`Models`},"model-runtime":{accent:`#0d9488`,icon:`sparkles`,aspect:`Runtime`},"execution-backend":{accent:`#9333ea`,icon:`workflow`,aspect:`Execution`},worker:{accent:`#a855f7`,icon:`server`,aspect:`Workers`},"mcp-sidecar":{accent:`#c026d3`,icon:`puzzle`,aspect:`Sidecar`},platform:{accent:`#475569`,icon:`container`,aspect:`Platform`},storage:{accent:`#64748b`,icon:`hard-drive`,aspect:`Storage`}};var Ui={application:{accent:`#0d9488`,icon:`monitor`,aspect:`Application`},reach:{accent:`#2563eb`,icon:`cable`,aspect:`Reach`},ao:{accent:`#dc2626`,icon:`cpu`,aspect:`AO`}};function Ke(t,i){return di[String(t)]||(i?Ui[i]:null)||{accent:`#737373`,icon:`circle`,aspect:`Other`}}var ci=di;var $t=(t,i)=>i.id;function Yi(t,i){if(t&1&&(Ap(),Cm(0,`rect`,6),js(1,`text`,7),gC(2),ql()),t&2){let e=i.$implicit,n=Bw();zl(`x`,12)(`y`,e.y)(`width`,n.layout().width-24)(`height`,e.height)(`data-band`,e.id),SI(),zl(`x`,28)(`y`,e.y+18),SI(),Jl(` `,e.label,` `)}}function Xi(t,i){if(t&1){let e=kw();Ap(),js(0,`path`,8),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().edgeClick.emit(a))}),ql()}if(t&2){let e=i.$implicit,n=Bw();ta$1(`dimmed`,n.isDimmedEdge(e.id))(`highlighted`,n.isHighlightedEdge(e.id))(`flow`,n.isHighlightedEdge(e.id)),zl(`d`,e.pathD)(`data-kind`,e.kind)}}function Qi(t,i){if(t&1){let e=kw();Ap(),js(0,`g`,9),xm(`mouseenter`,function(){let a=yp(e).$implicit;return vp(Bw().hover.emit(a.id))})(`mouseleave`,function(){yp(e);return vp(Bw().hover.emit(null))})(`focus`,function(){let a=yp(e).$implicit;return vp(Bw().hover.emit(a.id))})(`blur`,function(){yp(e);return vp(Bw().hover.emit(null))})(`click`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))})(`keydown.enter`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))}),Cm(1,`rect`,10)(2,`rect`,11),js(3,`foreignObject`,12),xp(),js(4,`div`,13),Cm(5,`mat-icon`,14),ql()(),Ap(),js(6,`text`,15),gC(7),ql(),js(8,`text`,16),gC(9),ql()()}if(t&2){let e=i.$implicit,n=Bw();ta$1(`dimmed`,n.isDimmedNode(e.id))(`highlighted`,n.isHighlightedNode(e.id)),zl(`transform`,`translate(`+e.x+`,`+e.y+`)`)(`data-status`,e.displayStatus)(`data-band`,e.band)(`data-kind`,e.kind)(`aria-label`,e.label+` `+e.displayStatus),SI(),zl(`width`,e.width)(`height`,e.height)(`stroke`,n.accent(e)),SI(),zl(`height`,e.height)(`fill`,n.accent(e)),SI(3),Vm(`color`,n.accent(e)),wm(`svgIcon`,n.icon(e)),SI(),zl(`x`,38),SI(),Jl(` `,n.truncate(e.label,14),` `),SI(),zl(`x`,38),SI(),qm(` `,n.statusGlyph(e.displayStatus),` `,n.truncate(e.sublabel||e.displayStatus,14),` `)}}var kt=class t{layout=hH.required();nodes=hH.required();edges=hH.required();closure=hH(null);blurred=hH(!1);summary=hH(`Deployment topology diagram`);hover=pH();nodeClick=pH();edgeClick=pH();isDimmedEdge(i){let e=this.closure();return!!e&&!e.edges.has(i)}isHighlightedEdge(i){let e=this.closure();return!!e&&e.edges.has(i)}isDimmedNode(i){let e=this.closure();return!!e&&!e.nodes.has(i)}isHighlightedNode(i){let e=this.closure();return!!e&&e.nodes.has(i)}accent(i){return Ke(i.kind,i.band).accent}icon(i){return Ke(i.kind,i.band).icon}truncate(i,e){let n=String(i||``);return n.length>e?n.slice(0,e-1)+`…`:n}statusGlyph(i){switch(String(i||``).toLowerCase()){case`healthy`:return`●`;case`degraded`:return`▲`;case`failed`:return`✖`;case`starting`:return`◐`;case`draining`:return`◌`;case`offline`:return`○`;default:return`?`}}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-canvas`]],inputs:{layout:[1,`layout`],nodes:[1,`nodes`],edges:[1,`edges`],closure:[1,`closure`],blurred:[1,`blurred`],summary:[1,`summary`]},outputs:{hover:`hover`,nodeClick:`nodeClick`,edgeClick:`edgeClick`},decls:15,vars:8,consts:[[1,`topology-canvas-wrap`,`relative`,`h-full`,`w-full`,`overflow-auto`,`rounded-xl`,`border`,`border-neutral-200`,`bg-neutral-50`,`dark:border-neutral-800`,`dark:bg-neutral-950`],[`role`,`img`,1,`topology-svg`,`block`,`min-w-full`],[`id`,`topo-arrow`,`viewBox`,`0 0 10 10`,`refX`,`9`,`refY`,`5`,`markerWidth`,`7`,`markerHeight`,`7`,`orient`,`auto`],[`d`,`M 0 0 L 10 5 L 0 10 z`,1,`fill-neutral-400`,`dark:fill-neutral-500`],[`marker-end`,`url(#topo-arrow)`,1,`topo-edge`,3,`dimmed`,`highlighted`,`flow`],[`tabindex`,`0`,`role`,`button`,1,`topo-node`,3,`dimmed`,`highlighted`],[`rx`,`10`,1,`band-rect`],[1,`band-label`,`fill-neutral-500`,`text-[11px]`,`font-medium`,`tracking-wide`,`uppercase`],[`marker-end`,`url(#topo-arrow)`,1,`topo-edge`,3,`click`],[`tabindex`,`0`,`role`,`button`,1,`topo-node`,3,`mouseenter`,`mouseleave`,`focus`,`blur`,`click`,`keydown.enter`],[`rx`,`8`,1,`node-fill`],[`x`,`0`,`y`,`0`,`width`,`4`,`rx`,`2`],[`x`,`12`,`y`,`14`,`width`,`22`,`height`,`22`],[`xmlns`,`http://www.w3.org/1999/xhtml`,1,`node-icon`],[3,`svgIcon`],[`y`,`22`,1,`fill-neutral-900`,`text-[12px]`,`font-medium`,`dark:fill-neutral-100`],[`y`,`38`,1,`fill-neutral-500`,`text-[10px]`]],template:function(e,n){e&1&&(js(0,`div`,0),Ap(),js(1,`svg`,1)(2,`title`),gC(3,`Live deployment topology`),ql(),js(4,`desc`),gC(5),ql(),js(6,`defs`)(7,`marker`,2),Cm(8,`path`,3),ql()(),Sw(9,Yi,3,8,null,null,$t),Sw(11,Xi,1,8,`:svg:path`,4,$t),Sw(13,Qi,10,22,`:svg:g`,5,$t),ql()()),e&2&&(ta$1(`topology-blur`,n.blurred()),SI(),ta$1(`path-highlight`,!!n.closure()),zl(`width`,n.layout().width)(`height`,n.layout().height)(`viewBox`,`0 0 `+n.layout().width+` `+n.layout().height),SI(4),Wm(n.summary()),SI(4),Mw(n.layout().bands),SI(2),Mw(n.edges()),SI(2),Mw(n.nodes()))},dependencies:[yt,wt$1],styles:[`[_nghost-%COMP%]{display:block;min-height:420px}.topology-blur[_ngcontent-%COMP%]{filter:blur(3px) saturate(.85);opacity:.72;transition:filter .15s ease,opacity .15s ease}.band-rect[data-band=application][_ngcontent-%COMP%]{fill:color-mix(in oklab,#0d9488 8%,transparent);stroke:color-mix(in oklab,#0d9488 28%,transparent)}.band-rect[data-band=reach][_ngcontent-%COMP%]{fill:color-mix(in oklab,#2563eb 8%,transparent);stroke:color-mix(in oklab,#2563eb 28%,transparent)}.band-rect[data-band=ao][_ngcontent-%COMP%]{fill:color-mix(in oklab,#dc2626 7%,transparent);stroke:color-mix(in oklab,#dc2626 24%,transparent)}.topo-edge[_ngcontent-%COMP%]{fill:none;stroke:var(--%NS%mat-sys-outline);stroke-width:1.6;stroke-dasharray:7 5;stroke-linecap:square;stroke-linejoin:miter;opacity:.7;cursor:pointer;pointer-events:stroke}.topo-edge[data-kind=stream][_ngcontent-%COMP%]{stroke-dasharray:10 6}.topo-edge[data-kind=reverse-tunnel][_ngcontent-%COMP%]{stroke-dasharray:3 4}.topo-edge[data-kind=advertisement][_ngcontent-%COMP%]{stroke-dasharray:1 5;opacity:.45}.topo-edge[data-kind=bypass][_ngcontent-%COMP%]{stroke-dasharray:9 5}.topo-edge.flow[_ngcontent-%COMP%], .path-highlight[_ngcontent-%COMP%]   .topo-edge.highlighted[_ngcontent-%COMP%]{stroke:var(--%NS%mat-sys-primary);stroke-width:2.1;opacity:1;animation:_ngcontent-%COMP%_topo-dash-flow 1.1s linear infinite}@keyframes _ngcontent-%COMP%_topo-dash-flow{to{stroke-dashoffset:-24}}.topo-node[_ngcontent-%COMP%]{cursor:pointer;transition:opacity .12s ease}.topo-node[_ngcontent-%COMP%]:focus{outline:2px solid var(--%NS%mat-sys-primary);outline-offset:2px}.node-fill[_ngcontent-%COMP%]{fill:var(--%NS%mat-sys-surface);stroke-width:1.5}.node-icon[_ngcontent-%COMP%]{display:flex;width:22px;height:22px;align-items:center;justify-content:center}.node-icon[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{width:18px;height:18px;font-size:18px}.topo-node[data-status=failed][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-width:2.25}.topo-node[data-status=degraded][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-width:2}.topo-node[data-status=unknown][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{stroke-dasharray:4 3}.topo-node[data-status=offline][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{fill:transparent;stroke-dasharray:3 3;opacity:.55}.topo-node[data-status=starting][_ngcontent-%COMP%]   .node-fill[_ngcontent-%COMP%]{opacity:.7}.path-highlight[_ngcontent-%COMP%]   .dimmed[_ngcontent-%COMP%]{opacity:.18}.path-highlight[_ngcontent-%COMP%]   .highlighted[_ngcontent-%COMP%]{opacity:1}@media(prefers-reduced-motion:reduce){.topo-edge.flow[_ngcontent-%COMP%], .path-highlight[_ngcontent-%COMP%]   .topo-edge.highlighted[_ngcontent-%COMP%]{animation:none}.topology-blur[_ngcontent-%COMP%]{transition:none;filter:none;opacity:.65}}`]})};function Zi(t,i){t&1&&(js(0,`th`,15),gC(1,`Name`),ql())}function Ji(t,i){if(t&1){let e=kw();js(0,`td`,16)(1,`button`,17),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().nodeClick.emit(a))}),gC(2),ql()()}if(t&2){let e=i.$implicit;SI(2),Jl(` `,e.label,` `)}}function ea(t,i){t&1&&(js(0,`th`,15),gC(1,`Band`),ql())}function ta(t,i){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=i.$implicit;SI(),Wm(e.band)}}function na(t,i){t&1&&(js(0,`th`,15),gC(1,`Status`),ql())}function ia(t,i){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=i.$implicit;SI(),Wm(e.displayStatus)}}function aa(t,i){t&1&&(js(0,`th`,15),gC(1,`Reason`),ql())}function oa(t,i){if(t&1&&(js(0,`td`,18),gC(1),ql()),t&2){let e=i.$implicit;SI(),Jl(` `,e.statusReason||`—`,` `)}}function ra(t,i){t&1&&Cm(0,`tr`,19)}function la(t,i){t&1&&Cm(0,`tr`,20)}function sa(t,i){t&1&&(js(0,`th`,15),gC(1,`Id`),ql())}function da(t,i){if(t&1){let e=kw();js(0,`td`,16)(1,`button`,21),xm(`click`,function(){let a=yp(e).$implicit;return vp(Bw().edgeClick.emit(a))}),gC(2),ql()()}if(t&2){let e=i.$implicit;SI(2),Jl(` `,e.id,` `)}}function ca(t,i){t&1&&(js(0,`th`,15),gC(1,`Kind`),ql())}function ma(t,i){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=i.$implicit;SI(),Wm(e.kind)}}function ua(t,i){t&1&&(js(0,`th`,15),gC(1,`Metrics`),ql())}function pa(t,i){if(t&1&&(js(0,`td`,16),gC(1),ql()),t&2){let e=i.$implicit;SI(),Jl(` `,e.instrumented?`yes`:`no data`,` `)}}function ga(t,i){t&1&&Cm(0,`tr`,19)}function ha(t,i){t&1&&Cm(0,`tr`,20)}var Ct=class t{nodes=hH.required();edges=hH.required();nodeClick=pH();edgeClick=pH();nodeCols=[`label`,`band`,`status`,`reason`];edgeCols=[`id`,`kind`,`instrumented`];static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-table`]],inputs:{nodes:[1,`nodes`],edges:[1,`edges`]},outputs:{nodeClick:`nodeClick`,edgeClick:`edgeClick`},decls:34,vars:6,consts:[[1,`flex`,`flex-col`,`gap-6`],[1,`mb-2`,`text-sm`,`font-medium`],[`mat-table`,``,1,`w-full`,3,`dataSource`],[`matColumnDef`,`label`],[`mat-header-cell`,``,4,`matHeaderCellDef`],[`mat-cell`,``,4,`matCellDef`],[`matColumnDef`,`band`],[`matColumnDef`,`status`],[`matColumnDef`,`reason`],[`mat-cell`,``,`class`,`text-neutral-500`,4,`matCellDef`],[`mat-header-row`,``,4,`matHeaderRowDef`],[`mat-row`,``,4,`matRowDef`,`matRowDefColumns`],[`matColumnDef`,`id`],[`matColumnDef`,`kind`],[`matColumnDef`,`instrumented`],[`mat-header-cell`,``],[`mat-cell`,``],[`type`,`button`,1,`text-left`,`underline-offset-2`,`hover:underline`,3,`click`],[`mat-cell`,``,1,`text-neutral-500`],[`mat-header-row`,``],[`mat-row`,``],[`type`,`button`,1,`font-mono`,`text-xs`,`text-left`,`underline-offset-2`,`hover:underline`,3,`click`]],template:function(e,n){e&1&&(js(0,`div`,0)(1,`div`)(2,`div`,1),gC(3,`Nodes`),ql(),js(4,`table`,2),Kl(5,3),Dm(6,Zi,2,0,`th`,4)(7,Ji,3,1,`td`,5),Ql(),Kl(8,6),Dm(9,ea,2,0,`th`,4)(10,ta,2,1,`td`,5),Ql(),Kl(11,7),Dm(12,na,2,0,`th`,4)(13,ia,2,1,`td`,5),Ql(),Kl(14,8),Dm(15,aa,2,0,`th`,4)(16,oa,2,1,`td`,9),Ql(),Dm(17,ra,1,0,`tr`,10)(18,la,1,0,`tr`,11),ql()(),js(19,`div`)(20,`div`,1),gC(21,`Edges`),ql(),js(22,`table`,2),Kl(23,12),Dm(24,sa,2,0,`th`,4)(25,da,3,1,`td`,5),Ql(),Kl(26,13),Dm(27,ca,2,0,`th`,4)(28,ma,2,1,`td`,5),Ql(),Kl(29,14),Dm(30,ua,2,0,`th`,4)(31,pa,2,1,`td`,5),Ql(),Dm(32,ga,1,0,`tr`,10)(33,ha,1,0,`tr`,11),ql()()()),e&2&&(SI(4),wm(`dataSource`,n.nodes()),SI(13),wm(`matHeaderRowDef`,n.nodeCols),SI(),wm(`matRowDefColumns`,n.nodeCols),SI(4),wm(`dataSource`,n.edges()),SI(10),wm(`matHeaderRowDef`,n.edgeCols),SI(),wm(`matRowDefColumns`,n.edgeCols))},dependencies:[li$1,Zt,ei$1,ni$1,ti$1,Jt,ri$1,ii$1,oi$1,si$1,ai$1],encapsulation:2})};var fa=(t,i)=>i.aspect;function ya(t,i){if(t&1&&(js(0,`div`,8),Cm(1,`span`,10)(2,`mat-icon`,11),gC(3),ql()),t&2){let e=i.$implicit;SI(),Vm(`background`,e.accent),SI(),Vm(`color`,e.accent),wm(`svgIcon`,e.icon),SI(),Jl(` `,e.aspect,` `)}}var St=class t{aspects=Object.values(ci).filter((i,e,n)=>n.findIndex(a=>a.aspect===i.aspect)===e);static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-legend`]],decls:24,vars:1,consts:[[`menu`,`matMenu`],[`matButton`,``,`type`,`button`,3,`matMenuTriggerFor`],[`svgIcon`,`info`],[1,`topology-legend-menu`],[1,`flex`,`max-w-sm`,`flex-col`,`gap-2`,`px-4`,`py-3`,`text-sm`,3,`click`],[1,`font-medium`],[1,`mt-2`,`font-medium`],[1,`grid`,`grid-cols-2`,`gap-1`],[1,`flex`,`items-center`,`gap-1.5`,`text-xs`],[1,`mt-2`,`text-neutral-500`],[1,`inline-block`,`h-2`,`w-2`,`rounded-full`],[1,`!h-3.5`,`!w-3.5`,`!text-[14px]`,3,`svgIcon`]],template:function(e,n){if(e&1&&(js(0,`button`,1),Cm(1,`mat-icon`,2),gC(2,` Legend `),ql(),js(3,`mat-menu`,3,0)(5,`div`,4),xm(`click`,function(l){return l.stopPropagation()}),js(6,`div`,5),gC(7,`Status`),ql(),js(8,`div`),gC(9,`● healthy · ▲ degraded · ✖ failed · ? unknown · ○ offline`),ql(),js(10,`div`,6),gC(11,`Edges`),ql(),js(12,`div`),gC(13,`Right-angle routes · hover animates dash toward the arrow`),ql(),js(14,`div`,6),gC(15,`Aspects`),ql(),js(16,`div`,7),Sw(17,ya,4,6,`div`,8,fa),ql(),js(19,`div`,9),gC(20,` Uninstrumented traffic shows `),js(21,`em`),gC(22,`no data`),ql(),gC(23,`, never zeros. `),ql()()()),e&2)wm(`matMenuTriggerFor`,qw(4)),SI(17),Mw(n.aspects)},dependencies:[Lt$1,I$1,Bt$1,lt,dt,yt,wt$1],encapsulation:2})};var Me=`Topology-dashboard`;var ba={ui:{wikiKey:`ui`,blurb:`Client or kiosk UI that connected through AO Reach.`},"overlay-source":{wikiKey:`overlay-source`,blurb:`Domain overlays the client advertised for this session.`},"local-tools":{wikiKey:`local-tools`,blurb:`MCP tools hosted on the client device and reverse-tunneled in.`},openclaw:{wikiKey:`openclaw`,blurb:`OpenClaw host that talks to the Web UI and bypasses Reach.`},"session-bridge":{wikiKey:`session-bridge`,blurb:`Reach SessionBridge carrying the authenticated client session.`},"overlay-packer":{wikiKey:`overlay-packer`,blurb:`Packs client overlays before they hit the engine overlay API.`},"local-mcp-host":{wikiKey:`local-mcp-host`,blurb:`Client-side MCP host reached via the engine reverse tunnel.`},"speech-client":{wikiKey:`speech-client`,blurb:`Reach speech client for STT/TTS against advertised sidecars.`},"mtls-enroller":{wikiKey:`mtls-enroller`,blurb:`Issues and renews client certificates for Reach↔engine mTLS.`},engine:{wikiKey:`engine`,blurb:`Engine daemon API (serve) — session, tunnel, and agent edge.`},endpoint:{wikiKey:`endpoint`,blurb:`A concrete engine or speech HTTP endpoint on the edge rank.`},"web-ui":{wikiKey:`web-ui`,blurb:`Coordinator Web UI and Admin console (NodePort 30487).`},planner:{wikiKey:`planner`,blurb:`Dynamic planner / runner that turns goals into CrewAI steps.`},catalog:{wikiKey:`catalog`,blurb:`Resolved agent, MCP, or skills catalog cluster used by planning.`},"model-backend":{wikiKey:`model-backend`,blurb:`Model backend registry that selects local or remote LLM runtimes.`},"model-runtime":{wikiKey:`model-runtime`,blurb:`A concrete model runtime such as Ollama or a remote provider.`},"execution-backend":{wikiKey:`execution-backend`,blurb:`Execution backend that runs steps (in-process, k8s, or warm pool).`},worker:{wikiKey:`worker`,blurb:`Worker pods or processes currently available to run steps.`},"mcp-sidecar":{wikiKey:`mcp-sidecar`,blurb:`MCP sidecar containers attached to workers for tool execution.`},platform:{wikiKey:`platform`,blurb:`Cluster / host platform layer (k3s node, Jetson, or NVR).`},storage:{wikiKey:`storage`,blurb:`Persistent volumes, GPU weights, and host metrics mounts.`}};var _a={"engine/session-overlay":{wikiKey:`endpoint-session-overlay`,blurb:`Engine API that applies Reach session overlays for a run.`},"engine/mcp-tunnel":{wikiKey:`endpoint-mcp-tunnel`,blurb:`Reverse tunnel endpoint that calls back into the client MCP host.`},"engine/direct-agent":{wikiKey:`endpoint-direct-agent`,blurb:`Direct-agent chat path that skips full dynamic planning.`},"engine/hello-speech":{wikiKey:`endpoint-hello-speech`,blurb:`Advertises speech (STT/TTS) capability to Reach clients.`},"engine/mtls-enrol":{wikiKey:`endpoint-mtls-enrol`,blurb:`mTLS enrollment endpoint for Reach client certificates.`},"speech/stt":{wikiKey:`speech-stt`,blurb:`Speech-to-text sidecar serving transcription requests.`},"speech/tts":{wikiKey:`speech-tts`,blurb:`Text-to-speech sidecar serving synthesis requests.`},"catalog/agents":{wikiKey:`catalog-agents`,blurb:`Cluster of agent-provider catalog entries available to the planner.`},"catalog/mcp":{wikiKey:`catalog-mcp`,blurb:`Cluster of MCP provider catalog entries available to the planner.`},"catalog/skills":{wikiKey:`catalog-skills`,blurb:`Cluster of agent-skill playbooks the planner may attach to tasks.`},"models/backends":{wikiKey:`models-backends`,blurb:`Resolved model-backend catalog used to pick LLM runtimes.`},"models/ollama":{wikiKey:`models-ollama`,blurb:`Local Ollama runtime for on-box model inference.`},"models/remote":{wikiKey:`models-remote`,blurb:`Remote LLM providers (OpenAI, Anthropic, …) when credentials exist.`}};var va={request:{wikiKey:`edge-request`,blurb:`A request/response call path between two components.`},stream:{wikiKey:`edge-stream`,blurb:`A streaming path (WebSocket or chunked) between components.`},"reverse-tunnel":{wikiKey:`edge-reverse-tunnel`,blurb:`Engine calling back up into a Reach-hosted local MCP host.`},advertisement:{wikiKey:`edge-advertisement`,blurb:`Capability advertisement (not request traffic).`},bypass:{wikiKey:`edge-bypass`,blurb:`OpenClaw path that skips Reach and hits the Web UI directly.`}};var ui={wikiKey:`topology-node`,blurb:`A live topology component reported by the current deployment.`};var pi={wikiKey:`topology-edge`,blurb:`A structural link between two topology components.`};function je(t){return t&&(_a[t.id]||ba[String(t.kind)])||ui}function gi(t){return t&&va[String(t.kind)]||pi}var hi=t=>[t];var ka=()=>[`#ea580c`];var Ca=(t,i)=>i.id;function Sa(t,i){if(t&1&&Cm(0,`ao-env-help`,3),t&2){let e=i,n=Bw();wm(`key`,e.wikiKey)(`help`,e.blurb)(`wikiPage`,n.wikiPage)}}function Da(t,i){if(t&1&&(js(0,`div`,5),gC(1),ql()),t&2){let e=Bw();SI(),Jl(` `,e.data.offlineBanner,` `)}}function Ta(t,i){t&1&&(js(0,`p`,6),gC(1,`Loading…`),ql())}function Na(t,i){t&1&&(js(0,`p`,7),gC(1),ql()),t&2&&(SI(),Wm(i))}function Ma(t,i){t&1&&(js(0,`span`,13),gC(1,` · not instrumented`),ql())}function Ea(t,i){if(t&1&&(js(0,`div`,13),gC(1),ql()),t&2){let e=Bw();SI(),Jl(` `,e.probe?.statusReason||e.node.statusReason,` `)}}function Aa(t,i){if(t&1&&gC(0),t&2)Jl(` · RTT `,Bw(2).latestLatency(),` ms `)}function Pa(t,i){if(t&1&&Cm(0,`apx-chart`,16),t&2){let e=Bw(2);wm(`series`,e.healthChartSeries())(`chart`,e.sparkChart)(`colors`,CC(10,hi,e.accent()))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}function Ia(t,i){t&1&&(js(0,`div`,17),gC(1,` Waiting for live probe samples… `),ql())}function Oa(t,i){if(t&1&&(js(0,`div`),gC(1),js(2,`span`,13),gC(3),ql()()),t&2){let e=Bw();SI(),Jl(` Cluster members: `,e.members.count,` `),SI(2),Jl(` — `,e.members.note)}}function Ra(t,i){t&1&&(js(0,`div`,13),gC(1,`Open this tab for live traffic.`),ql())}function La(t,i){if(t&1&&(js(0,`div`,19)(1,`strong`),gC(2,`no data`),ql(),gC(3),ql()),t&2){let e=Bw();SI(3),qm(` — related edges are not instrumented. Inbound `,e.inbound.length,` · Outbound `,e.outbound.length,`. `)}}function Fa(t,i){if(t&1&&(js(0,`div`,14)(1,`div`,15),gC(2,` Live rate (events/s) · websocket `),ql(),Cm(3,`apx-chart`,16),ql(),js(4,`div`,14)(5,`div`,15),gC(6,` Latency p95 (ms) `),ql(),Cm(7,`apx-chart`,16),ql()),t&2){let e=Bw(2);SI(3),wm(`series`,e.trafficRateSeries())(`chart`,e.sparkChart)(`colors`,CC(20,hi,e.accent()))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid),SI(4),wm(`series`,e.trafficLatencySeries())(`chart`,e.sparkChart)(`colors`,wC(22,ka))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}function Ba(t,i){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=i.$implicit;SI(),qm(``,e.id,` · `,e.kind)}}function Ha(t,i){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=i.$implicit;SI(),Wm(e)}}function za(t,i){if(t&1&&(js(0,`ul`,20),Sw(1,Ha,2,1,`li`,null,Tw),ql(),js(3,`a`,25),gC(4,` Open All settings `),ql()),t&2){let e=Bw();SI(),Mw(e.configKeys),SI(2),wm(`mat-dialog-close`,!0)}}function Ga(t,i){t&1&&(js(0,`span`,13),gC(1,`No linked config keys`),ql())}function Va(t,i){if(t&1){let e=kw();js(0,`mat-tab-group`,10),xm(`selectedIndexChange`,function(a){yp(e);return vp(Bw().onTab(a))}),js(1,`mat-tab`,11)(2,`div`,12)(3,`div`),gC(4,` Status: `),js(5,`strong`),gC(6),ql(),ww(7,Ma,2,0,`span`,13),ql(),ww(8,Ea,2,1,`div`,13),js(9,`div`,13),gC(10),ww(11,Aa,1,1),ql(),js(12,`div`,14)(13,`div`,15),gC(14,` Health monitor (probe latency) `),ql(),ww(15,Pa,1,12,`apx-chart`,16)(16,Ia,2,0,`div`,17),ql(),ww(17,Oa,4,2,`div`),ql()(),js(18,`mat-tab`,18)(19,`div`,12),ww(20,Ra,2,0,`div`,13)(21,La,4,2,`div`,19)(22,Fa,8,23),js(23,`div`),gC(24),ql(),js(25,`ul`,20),Sw(26,Ba,2,2,`li`,null,Ca),ql()()(),js(28,`mat-tab`,21)(29,`div`,22),ww(30,za,5,1)(31,Ga,2,0,`span`,13),ql()(),js(32,`mat-tab`,23)(33,`div`,22)(34,`div`),gC(35,` Log source: `),js(36,`code`),gC(37),ql()(),js(38,`a`,24),gC(39,` Open Overview logs `),ql()()()()}if(t&2){let e=i,n=Bw();SI(6),Wm(n.liveStatus()||e.node.status),SI(),Cw(e.probe?.instrumented?-1:7),SI(),Cw(e.probe?.statusReason||e.node.statusReason?8:-1),SI(2),Jl(` Last probe: `,e.probe?.lastProbeAt||`—`,` `),SI(),Cw(n.latestLatency()!=null?11:-1),SI(4),Cw(n.healthSeries().length?15:16),SI(2),Cw(e.members?17:-1),SI(3),Cw(n.trafficActive()?n.trafficInstrumented()?22:21:20),SI(4),qm(`Inbound: `,e.inbound.length,` · Outbound: `,e.outbound.length),SI(2),Mw(e.outbound),SI(4),Cw(e.configKeys?.length?30:31),SI(7),Wm(e.logSource||`web`),SI(),wm(`mat-dialog-close`,!0)}}var Tt=class t{data=h(pe);ref=h(Q);api=h(f);live=h(U);loading=Tt$1(!0);error=Tt$1(null);detail=Tt$1(null);liveStatus=Tt$1(null);healthSeries=Tt$1([]);trafficRate=Tt$1([]);trafficLatency=Tt$1([]);trafficActive=Tt$1(!1);trafficInstrumented=Tt$1(!1);wikiPage=Me;accent=PC(()=>{let i=this.detail()?.node;return Ke(i?.kind||`engine`,i?.band).accent});wikiHelp=PC(()=>{let i=this.detail()?.node;return i?je(i):je({id:this.data.nodeId,kind:`endpoint`})});latestLatency=PC(()=>{let i=this.healthSeries(),e=i.length?i[i.length-1]:null;return e?.y==null?null:Math.round(Number(e.y))});sparkChart={type:`area`,height:120,animations:{enabled:!1},toolbar:{show:!1},zoom:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`};sparkStroke={curve:`smooth`,width:2};sparkFill={type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.35,opacityTo:.05}};sparkTooltip={x:{format:`HH:mm:ss`}};sparkXaxis={type:`datetime`,labels:{datetimeUTC:!1,style:{fontSize:`10px`}},axisBorder:{show:!1}};sparkYaxis={labels:{style:{fontSize:`10px`}},min:0};sparkGrid={borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:4,right:4}};noDataLabels={enabled:!1};sub=null;watching=!1;trafficWatch=!1;ngOnInit(){this.api.topologyNode(this.data.nodeId).subscribe(i=>{if(this.loading.set(!1),!i.ok){this.error.set(i.message);return}this.detail.set(i.data)}),this.live.subscribeTopologyWatch(`node`,this.data.nodeId),this.watching=!0,this.sub=this.live.topologyEvents.subscribe(i=>{(i.type===`topology_watch_snapshot`||i.type===`topology_watch_tick`)&&i.target===`node`&&i.id===this.data.nodeId&&this.applyWatch(i)}),this.ref.afterClosed().subscribe(()=>this.teardown())}ngOnDestroy(){this.teardown()}onTab(i){i===1?(this.trafficActive.set(!0),this.trafficWatch=!0):this.trafficWatch&&this.trafficActive.set(!1)}healthChartSeries(){return[{name:`latency ms`,data:this.healthSeries()}]}trafficRateSeries(){return[{name:`rate`,data:this.trafficRate()}]}trafficLatencySeries(){return[{name:`p95 ms`,data:this.trafficLatency()}]}applyWatch(i){let e=i.latest;e?.status&&this.liveStatus.set(String(e.status));let n=i.health||[];n.length&&this.healthSeries.set(n);let a=i.series;a?.latencyMs?.length&&!n.length&&this.healthSeries.set(a.latencyMs);let l=a?.rate||[],p=a?.latencyP95||[];this.trafficRate.set(l),this.trafficLatency.set(p),this.trafficInstrumented.set(!!i.instrumented&&(l.length>0||p.length>0))}teardown(){this.sub?.unsubscribe(),this.sub=null,this.watching&&(this.live.unsubscribeTopologyWatch(`node`,this.data.nodeId),this.watching=!1)}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-node-detail-dialog`]],decls:13,vars:6,consts:[[`mat-dialog-title`,``,1,`flex`,`items-center`,`gap-2`],[1,`inline-block`,`h-2.5`,`w-2.5`,`rounded-full`],[1,`flex-auto`],[3,`key`,`help`,`wikiPage`],[1,`min-w-[340px]`,`max-w-lg`],[1,`mb-3`,`rounded-lg`,`border`,`border-amber-300`,`bg-amber-50`,`px-3`,`py-2`,`text-sm`,`text-amber-900`,`dark:border-amber-700`,`dark:bg-amber-950`,`dark:text-amber-100`],[1,`text-sm`,`text-neutral-500`],[1,`text-sm`,`text-red-600`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[3,`selectedIndexChange`],[`label`,`Health`],[1,`flex`,`flex-col`,`gap-3`,`py-3`,`text-sm`],[1,`text-neutral-500`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-2`,`pt-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`mb-1`,`px-1`,`text-xs`,`text-neutral-500`],[3,`series`,`chart`,`colors`,`stroke`,`fill`,`tooltip`,`xaxis`,`yaxis`,`dataLabels`,`grid`],[1,`px-2`,`pb-3`,`text-xs`,`text-neutral-500`],[`label`,`Traffic`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`font-mono`,`text-xs`],[`label`,`Config`],[1,`flex`,`flex-col`,`gap-2`,`py-3`,`text-sm`],[`label`,`Logs`],[`matButton`,``,`routerLink`,`/overview`,3,`mat-dialog-close`],[`matButton`,``,`routerLink`,`/settings`,3,`mat-dialog-close`]],template:function(e,n){if(e&1&&(js(0,`h2`,0),Cm(1,`span`,1),js(2,`span`,2),gC(3),ql(),ww(4,Sa,1,3,`ao-env-help`,3),ql(),js(5,`mat-dialog-content`,4),ww(6,Da,2,1,`div`,5),ww(7,Ta,2,0,`p`,6)(8,Na,2,1,`p`,7)(9,Va,40,13,`mat-tab-group`),ql(),js(10,`mat-dialog-actions`,8)(11,`button`,9),gC(12,`Close`),ql()()),e&2){let a,l;SI(),Vm(`background`,n.accent()),SI(2),Wm(n.detail()?.node?.label||n.data.nodeId),SI(),Cw((a=n.wikiHelp())?4:-1,a),SI(2),Cw(n.data.offlineBanner?6:-1),SI(),Cw(n.loading()?7:(l=n.error())?8:(l=n.detail())?9:-1,l)}},dependencies:[le,ke,Ce,De,Se,lt,dt,hn,Re$1,bn,Dt,ge$1,he,w],encapsulation:2})};var Ka=()=>[`#2563eb`];var ja=()=>[`#ea580c`];function Wa(t,i){if(t&1&&gC(0),t&2)Jl(` · :`,Bw().data.edge.port,` `)}function qa(t,i){t&1&&(js(0,`div`,10),gC(1,` This edge is not instrumented — health is structural only. `),ql())}function $a(t,i){if(t&1&&gC(0),t&2)Jl(` Latency p95 `,Bw(2).latest()?.latencyP95,` ms `)}function Ua(t,i){if(t&1&&gC(0),t&2)Jl(` · error rate `,((Bw(2).latest()?.errorRate||0)*100).toFixed(0),`% `)}function Ya(t,i){if(t&1&&(js(0,`div`,10),ww(1,$a,1,1),ww(2,Ua,1,1),ql()),t&2){let e=Bw();SI(),Cw(e.latest()?.latencyP95!=null?1:-1),SI(),Cw(e.latest()?.errorRate!=null?2:-1)}}function Xa(t,i){t&1&&(js(0,`div`,10),gC(1,`Open this tab for live traffic.`),ql())}function Qa(t,i){t&1&&(js(0,`div`,13)(1,`strong`),gC(2,`no data`),ql(),gC(3,` — this edge is not instrumented. `),ql())}function Za(t,i){if(t&1&&(js(0,`div`,16)(1,`div`,17),gC(2,` Live rate (events/s) `),ql(),Cm(3,`apx-chart`,18),ql(),js(4,`div`,16)(5,`div`,17),gC(6,`Latency p95 (ms)`),ql(),Cm(7,`apx-chart`,18),ql()),t&2){let e=Bw();SI(3),wm(`series`,e.rateSeries())(`chart`,e.sparkChart)(`colors`,wC(20,Ka))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid),SI(4),wm(`series`,e.latencySeries())(`chart`,e.sparkChart)(`colors`,wC(21,ja))(`stroke`,e.sparkStroke)(`fill`,e.sparkFill)(`tooltip`,e.sparkTooltip)(`xaxis`,e.sparkXaxis)(`yaxis`,e.sparkYaxis)(`dataLabels`,e.noDataLabels)(`grid`,e.sparkGrid)}}var Nt=class t{data=h(pe);ref=h(Q);live=h(U);wikiPage=Me;wikiHelp=gi(this.data.edge);instrumented=Tt$1(!!this.data.edge.instrumented);liveStatus=Tt$1(null);latest=Tt$1(null);ratePts=Tt$1([]);latencyPts=Tt$1([]);trafficActive=Tt$1(!1);sparkChart={type:`area`,height:120,animations:{enabled:!1},toolbar:{show:!1},zoom:{enabled:!1},fontFamily:`inherit`,foreColor:`inherit`};sparkStroke={curve:`smooth`,width:2};sparkFill={type:`gradient`,gradient:{shadeIntensity:.4,opacityFrom:.35,opacityTo:.05}};sparkTooltip={x:{format:`HH:mm:ss`}};sparkXaxis={type:`datetime`,labels:{datetimeUTC:!1,style:{fontSize:`10px`}},axisBorder:{show:!1}};sparkYaxis={labels:{style:{fontSize:`10px`}},min:0};sparkGrid={borderColor:`rgba(148, 163, 184, 0.2)`,strokeDashArray:3,padding:{left:4,right:4}};noDataLabels={enabled:!1};sub=null;watching=!1;ngOnInit(){this.live.subscribeTopologyWatch(`edge`,this.data.edge.id),this.watching=!0,this.sub=this.live.topologyEvents.subscribe(i=>{(i.type===`topology_watch_snapshot`||i.type===`topology_watch_tick`)&&i.target===`edge`&&i.id===this.data.edge.id&&this.applyWatch(i)}),this.ref.afterClosed().subscribe(()=>this.teardown())}ngOnDestroy(){this.teardown()}onTab(i){this.trafficActive.set(i===1)}rateSeries(){return[{name:`rate`,data:this.ratePts()}]}latencySeries(){return[{name:`p95 ms`,data:this.latencyPts()}]}applyWatch(i){this.instrumented.set(!!i.instrumented);let e=i.latest;this.latest.set(e),e?.errorRate!=null&&e.errorRate>.2?this.liveStatus.set(`failing`):e&&this.liveStatus.set(`ok`);let n=i.series;n?.rate&&this.ratePts.set(n.rate),n?.latencyP95&&this.latencyPts.set(n.latencyP95)}teardown(){this.sub?.unsubscribe(),this.sub=null,this.watching&&(this.live.unsubscribeTopologyWatch(`edge`,this.data.edge.id),this.watching=!1)}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-edge-detail-dialog`]],decls:29,vars:12,consts:[[`mat-dialog-title`,``,1,`flex`,`items-center`,`gap-2`],[1,`flex-auto`],[3,`key`,`help`,`wikiPage`],[1,`min-w-[320px]`,`max-w-lg`,`text-sm`],[1,`font-mono`,`text-xs`,`break-all`],[1,`mt-2`],[1,`mt-1`,`text-neutral-500`],[1,`mt-3`,3,`selectedIndexChange`],[`label`,`Health`],[1,`flex`,`flex-col`,`gap-2`,`py-3`],[1,`text-neutral-500`],[`label`,`Traffic`],[1,`flex`,`flex-col`,`gap-3`,`py-3`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-2`,`pt-2`,`dark:border-neutral-700`,`dark:bg-neutral-900`],[1,`mb-1`,`px-1`,`text-xs`,`text-neutral-500`],[3,`series`,`chart`,`colors`,`stroke`,`fill`,`tooltip`,`xaxis`,`yaxis`,`dataLabels`,`grid`]],template:function(e,n){e&1&&(js(0,`h2`,0)(1,`span`,1),gC(2,`Edge`),ql(),Cm(3,`ao-env-help`,2),ql(),js(4,`mat-dialog-content`,3)(5,`div`,4),gC(6),ql(),js(7,`div`,5),gC(8),ql(),js(9,`div`,6),gC(10),ww(11,Wa,1,1),ql(),js(12,`mat-tab-group`,7),xm(`selectedIndexChange`,function(l){return n.onTab(l)}),js(13,`mat-tab`,8)(14,`div`,9)(15,`div`),gC(16,` Status: `),js(17,`strong`),gC(18),ql()(),ww(19,qa,2,0,`div`,10)(20,Ya,3,2,`div`,10),ql()(),js(21,`mat-tab`,11)(22,`div`,12),ww(23,Xa,2,0,`div`,10)(24,Qa,4,0,`div`,13)(25,Za,8,22),ql()()()(),js(26,`mat-dialog-actions`,14)(27,`button`,15),gC(28,`Close`),ql()()),e&2&&(SI(3),wm(`key`,n.wikiHelp.wikiKey)(`help`,n.wikiHelp.blurb)(`wikiPage`,n.wikiPage),SI(3),Wm(n.data.edge.id),SI(2),qm(``,n.data.edge.from,` → `,n.data.edge.to),SI(2),qm(` kind `,n.data.edge.kind,` · `,n.data.edge.protocol||`—`,` `),SI(),Cw(n.data.edge.port?11:-1),SI(7),Wm(n.liveStatus()||n.data.edge.status||`unknown`),SI(),Cw(n.instrumented()?20:19),SI(4),Cw(n.trafficActive()?n.instrumented()?25:24:23))},dependencies:[le,ke,Ce,De,Se,lt,dt,hn,Re$1,bn,ge$1,he,w],encapsulation:2})};var Ja=(t,i)=>i[0];function eo(t,i){if(t&1&&(js(0,`li`),gC(1),ql()),t&2){let e=i.$implicit;SI(),qm(``,e[0],`: `,e[1])}}function to(t,i){if(t&1&&(js(0,`ul`,4),Sw(1,eo,2,2,`li`,null,Ja),ql()),t&2){let e=Bw();SI(),Mw(e.breakdownEntries(i))}}var Mt=class t{data=h(pe);wikiPage=Me;wikiHelp=je(this.data.node);breakdownEntries(i){return Object.entries(i)}catalogLink(){let i=this.data.node.id;return i.includes(`mcp`)?`/capabilities/mcp`:i.includes(`skill`)?`/capabilities/skills`:`/capabilities/agents`}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-cluster-dialog`]],decls:15,vars:8,consts:[[`mat-dialog-title`,``,1,`flex`,`items-center`,`gap-2`],[1,`flex-auto`],[3,`key`,`help`,`wikiPage`],[1,`text-sm`],[1,`mt-2`,`text-neutral-500`],[1,`mt-3`,`text-neutral-500`],[`matButton`,``,1,`mt-2`,3,`routerLink`,`mat-dialog-close`],[`align`,`end`],[`matButton`,``,`mat-dialog-close`,``,`type`,`button`]],template:function(e,n){if(e&1&&(js(0,`h2`,0)(1,`span`,1),gC(2),ql(),Cm(3,`ao-env-help`,2),ql(),js(4,`mat-dialog-content`,3)(5,`div`),gC(6),ql(),ww(7,to,3,0,`ul`,4),js(8,`p`,5),gC(9,` Members are not expanded on the canvas. Open Capabilities for the full catalog list. `),ql(),js(10,`a`,6),gC(11,` Open Capabilities `),ql()(),js(12,`mat-dialog-actions`,7)(13,`button`,8),gC(14,`Close`),ql()()),e&2){let a;SI(2),Jl(``,n.data.node.label,` cluster`),SI(),wm(`key`,n.wikiHelp.wikiKey)(`help`,n.wikiHelp.blurb)(`wikiPage`,n.wikiPage),SI(3),Jl(`Count: `,n.data.node.count??0),SI(),Cw((a=n.data.node.breakdown)?7:-1,a),SI(3),wm(`routerLink`,n.catalogLink())(`mat-dialog-close`,!0)}},dependencies:[le,ke,Ce,De,Se,lt,dt,Dt,w],encapsulation:2})};function no(t,i){t&1&&gC(0,` Paused `)}function io(t,i){if(t&1&&gC(0),t&2)Jl(` Not live — snapshot `,Bw().store.generatedAt()||``,` `)}function ao(t,i){if(t&1&&gC(0),t&2)Jl(` Live · `,Bw().store.generatedAt()||`…`,` `)}function oo(t,i){t&1&&gC(0,` Reconnecting… `)}function ro(t,i){if(t&1&&(js(0,`div`),gC(1),ql()),t&2){let e=i.$implicit;SI(),Wm(e)}}function lo(t,i){if(t&1&&(js(0,`div`,8),Sw(1,ro,2,1,`div`,null,Tw),ql()),t&2){let e=Bw();SI(),Mw(e.store.notes())}}function so(t,i){t&1&&Cm(0,`ao-error-state`,17),t&2&&wm(`message`,i)}function co(t,i){t&1&&(js(0,`div`,16),gC(1,`Loading topology…`),ql())}function mo(t,i){t&1&&(js(0,`p`,16),gC(1,` Diagram needs a wider screen — showing table view. `),ql())}function uo(t,i){if(t&1){let e=kw();ww(0,mo,2,0,`p`,16),js(1,`ao-topology-table`,19),xm(`nodeClick`,function(a){yp(e);return vp(Bw().openNode(a))})(`edgeClick`,function(a){yp(e);return vp(Bw().openEdge(a))}),ql()}if(t&2){let e=Bw();Cw(e.forceTable()&&!e.store.tableMode()?0:-1),SI(),wm(`nodes`,e.store.displayNodes())(`edges`,e.store.displayEdges())}}function po(t,i){if(t&1){let e=kw();js(0,`ao-topology-canvas`,20),xm(`hover`,function(a){yp(e);return vp(Bw().onHover(a))})(`nodeClick`,function(a){yp(e);return vp(Bw().openNode(a))})(`edgeClick`,function(a){yp(e);return vp(Bw().openEdge(a))}),ql()}if(t&2){let e=Bw();wm(`layout`,e.store.layout())(`nodes`,e.store.displayNodes())(`edges`,e.store.displayEdges())(`closure`,e.store.hoverClosure())(`blurred`,e.dialogOpen())(`summary`,e.a11ySummary())}}var fi=class t{store=h(Ve);live=h(U);dialog=h(ze);forceTable=Tt$1(typeof window<`u`?window.innerWidth<=1023:!1);dialogOpen=Tt$1(!1);hoverTimer=null;a11ySummary=PC(()=>{return`Topology with ${this.store.displayNodes().length} nodes, ${this.store.unhealthyCount()} unhealthy. ${this.store.notes().join(`. `)}`});ngOnInit(){this.store.start()}ngOnDestroy(){this.store.stop(),this.hoverTimer&&clearTimeout(this.hoverTimer)}onResize(){this.forceTable.set(window.innerWidth<=1023)}onHover(i){if(this.hoverTimer&&clearTimeout(this.hoverTimer),i==null){this.store.setHover(null);return}this.hoverTimer=setTimeout(()=>this.store.setHover(i),60)}openNode(i){if(i.count!=null&&i.count>0&&i.kind===`catalog`){this.dialogOpen.set(!0),this.dialog.open(Mt,{data:{node:i},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1));return}let e=this.store.displayNodes().some(a=>a.id===i.id);this.dialogOpen.set(!0),this.dialog.open(Tt,{data:{nodeId:i.id,offlineBanner:e?null:`This component went offline at ${new Date().toLocaleTimeString()}`},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1))}openEdge(i){this.dialogOpen.set(!0),this.dialog.open(Nt,{data:{edge:i},autoFocus:`first-heading`}).afterClosed().subscribe(()=>this.dialogOpen.set(!1))}static ɵfac=function(e){return new(e||t)};static ɵcmp=Vn({type:t,selectors:[[`ao-topology-page`]],hostBindings:function(e,n){e&1&&xm(`resize`,function(){return n.onResize()},V_)},features:[Jm([Ve])],decls:42,vars:23,consts:[[1,`mx-auto`,`flex`,`h-full`,`w-full`,`max-w-[1600px]`,`flex-auto`,`flex-col`,`gap-3`,`p-4`,`sm:p-6`,`lg:px-8`,`lg:pt-8`],[1,`flex`,`flex-wrap`,`items-start`,`justify-between`,`gap-3`],[1,`text-xl`,`font-semibold`,`tracking-tighter`,`sm:text-2xl`],[1,`text-neutral-500`],[1,`flex`,`flex-wrap`,`items-center`,`gap-2`],[1,`rounded-full`,`px-2.5`,`py-1`,`text-xs`,`font-medium`],[`matButton`,`outlined`,`type`,`button`,3,`click`],[`svgIcon`,`refresh-cw`],[1,`rounded-lg`,`border`,`border-neutral-200`,`bg-neutral-50`,`px-3`,`py-2`,`text-sm`,`text-neutral-600`,`dark:border-neutral-700`,`dark:bg-neutral-900`,`dark:text-neutral-300`],[1,`flex`,`flex-wrap`,`items-center`,`gap-3`],[`aria-label`,`Band filter`,3,`change`,`value`],[`value`,`all`],[`value`,`application`],[`value`,`reach`],[`value`,`ao`],[3,`change`,`checked`],[1,`text-sm`,`text-neutral-500`],[3,`message`],[1,`min-h-[520px]`,`flex-auto`,3,`layout`,`nodes`,`edges`,`closure`,`blurred`,`summary`],[3,`nodeClick`,`edgeClick`,`nodes`,`edges`],[1,`min-h-[520px]`,`flex-auto`,3,`hover`,`nodeClick`,`edgeClick`,`layout`,`nodes`,`edges`,`closure`,`blurred`,`summary`]],template:function(e,n){if(e&1&&(js(0,`div`,0)(1,`div`,1)(2,`div`)(3,`div`,2),gC(4,` Topology `),ql(),js(5,`div`,3),gC(6,` Live deployment graph — what is present now, not a docs diagram `),ql()(),js(7,`div`,4)(8,`span`,5),ww(9,no,1,0)(10,io,1,1)(11,ao,1,1)(12,oo,1,0),ql(),js(13,`button`,6),xm(`click`,function(){return n.store.togglePause()}),gC(14),ql(),js(15,`button`,6),xm(`click`,function(){return n.store.resync()}),Cm(16,`mat-icon`,7),gC(17,` Refresh `),ql(),Cm(18,`ao-topology-legend`),ql()(),ww(19,lo,3,0,`div`,8),js(20,`div`,9)(21,`mat-button-toggle-group`,10),xm(`change`,function(l){return n.store.bandFilter.set(l.value)}),js(22,`mat-button-toggle`,11),gC(23,`All bands`),ql(),js(24,`mat-button-toggle`,12),gC(25,`App`),ql(),js(26,`mat-button-toggle`,13),gC(27,`Reach`),ql(),js(28,`mat-button-toggle`,14),gC(29,`AO`),ql()(),js(30,`mat-slide-toggle`,15),xm(`change`,function(l){return n.store.onlyUnhealthy.set(l.checked)}),gC(31,` Only unhealthy `),ql(),js(32,`mat-slide-toggle`,15),xm(`change`,function(l){return n.store.showNotDeployed.set(l.checked)}),gC(33,` Show not deployed `),ql(),js(34,`mat-slide-toggle`,15),xm(`change`,function(l){return n.store.tableMode.set(l.checked)}),gC(35,` Table view `),ql(),js(36,`span`,16),gC(37),ql()(),ww(38,so,1,1,`ao-error-state`,17),ww(39,co,2,0,`div`,16)(40,uo,2,3)(41,po,1,6,`ao-topology-canvas`,18),ql()),e&2){let a;SI(8),ta$1(`bg-emerald-100`,n.live.connected()&&!n.store.paused()&&!n.store.snapshotOnly())(`text-emerald-800`,n.live.connected()&&!n.store.paused()&&!n.store.snapshotOnly())(`bg-amber-100`,n.store.snapshotOnly()||n.store.paused())(`text-amber-900`,n.store.snapshotOnly()||n.store.paused())(`dark:bg-emerald-950`,n.live.connected()&&!n.store.paused()&&!n.store.snapshotOnly())(`dark:text-emerald-200`,n.live.connected()&&!n.store.paused()&&!n.store.snapshotOnly()),SI(),Cw(n.store.paused()?9:n.store.snapshotOnly()?10:n.live.connected()?11:12),SI(5),Jl(` `,n.store.paused()?`Resume`:`Pause`,` `),SI(5),Cw(n.store.notes().length?19:-1),SI(2),wm(`value`,n.store.bandFilter()),SI(9),wm(`checked`,n.store.onlyUnhealthy()),SI(2),wm(`checked`,n.store.showNotDeployed()),SI(2),wm(`checked`,n.store.tableMode()||n.forceTable()),SI(3),qm(` `,n.store.unhealthyCount(),` unhealthy · `,n.store.displayNodes().length,` nodes `),SI(),Cw((a=n.store.lastError())?38:-1,a),SI(),Cw(n.store.loading()?39:n.store.tableMode()||n.forceTable()?40:41)}},dependencies:[lt,dt,Dt$1,bt,nt,le,yt,wt$1,ei,zt,Lt$1,I,kt,Ct,St],encapsulation:2})};export{fi as TopologyPage};