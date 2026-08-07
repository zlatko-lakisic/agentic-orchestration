import{$n as te$1,A as Im,An as mn,B as Lh,C as Gn$1,En as md,F as Kn$1,Fn as oC,Ft as bh,G as Nh,H as MI,Ht as dg,I as Kv,In as oe,J as OI,Jt as fo,K as Nm,Kt as fh,L as LI,Lt as bu,M as J,Mn as ng,Mt as _u,N as JI,Nt as _w,O as Hh,On as mh,Ot as _I,P as Jn,Pt as bI,Q as P,Qt as gd,R as LL,T as HI,U as Md,Ut as ee,V as M,Vn as ph,Vt as dE,Wt as fC,Xt as fy,Zt as g,_ as Em,an as iT,ar as vm,bn as lh,br as zr,bt as VL,c as Ce$1,cr as wh,ct as SI,d as DE,dn as jI,dt as Su,et as Pd,f as Dm,fn as jL,g as Eh,gr as yh,gt as UI,hr as xr$1,ht as U,in as iC,it as Q,jt as _s,k as Ht,l as Ch,lt as Sh,m as E,mn as jh,mr as xm,nn as ht$1,nr as uT,o as Bf,on as ig,or as vw,ot as Ri,pr as xh,pt as Tu,qn as rs,qt as fn,r as $s,rn as hw,rt as Pl,sr as wD,t as $,tn as hn,tt as Ph,u as Cw,un as j,ur as wu,v as Ew,vn as kv,vr as yu,wn as lw,wt as Y,xn as ln,xt as Ws,y as FI,yn as lI,yr as zi,yt as VI,zn as pE,zt as ce}from"./chunk-BzAqJosl.js";import{A as lt,C as Wn$1,D as gn$1,F as ut$1,I as v,L as vn$1,M as p,N as qe$1,O as j$1,P as u$1,R as ze,S,T as ae,_ as Dn$1,a as k,b as Qe,c as wt$1,d as Ph$1,f as ro,g as C,h as At$1,i as dr$1,j as oe$1,k as jn$1,l as yt,o as ue,p as zt,r as No,s as ur$1,t as Dt$1,u as Ot$1,v as Ft,w as _n$1,x as R,y as Nn$1}from"./main-QVCWN3GZ.js";import"./chunk-C5dOPZwW.js";import{t as c}from"./chunk-C-H8Alki.js";import{i as bt$1,n as De,r as Zt,t as $t}from"./chunk-iGVUdj6o.js";import{r as lt$1,t as Z}from"./chunk-DSjpE1HQ.js";var Vn=20;var dt=(()=>{class r{_ngZone=g(te$1);_platform=g(u$1);_renderer=g(ln).createRenderer(null,null);_cleanupGlobalListener;_scrolled=new J;_scrolledCount=0;scrollContainers=new Map;register(e){this.scrollContainers.has(e)||this.scrollContainers.set(e,e.elementScrolled().subscribe(()=>this._scrolled.next(e)))}deregister(e){let i=this.scrollContainers.get(e);i&&(i.unsubscribe(),this.scrollContainers.delete(e))}scrolled(e=Vn){return this._platform.isBrowser?new M(i=>{this._cleanupGlobalListener||(this._cleanupGlobalListener=this._ngZone.runOutsideAngular(()=>this._renderer.listen(`document`,`scroll`,()=>this._scrolled.next())));let n=e>0?this._scrolled.pipe(Dm(e)).subscribe(i):this._scrolled.subscribe(i);return this._scrolledCount++,()=>{n.unsubscribe(),this._scrolledCount--,this._scrolledCount||(this._cleanupGlobalListener?.(),this._cleanupGlobalListener=void 0)}}):$s()}ngOnDestroy(){this._cleanupGlobalListener?.(),this._cleanupGlobalListener=void 0,this.scrollContainers.forEach((e,i)=>this.deregister(i)),this._scrolled.complete()}ancestorScrolled(e,i){let n=this.getAncestorScrollContainers(e);return this.scrolled(i).pipe(ht$1(o=>!o||n.indexOf(o)>-1))}getAncestorScrollContainers(e){let i=[];return this.scrollContainers.forEach((n,o)=>{this._targetContainsElement(o,e)&&i.push(o)}),i}_targetContainsElement(e,i){let n=v(i),o=e.getElementRef().nativeElement;do if(n==o)return!0;while(n=n.parentElement);return!1}static ɵfac=function(i){return new(i||r)};static ɵprov=ce({token:r,factory:r.ɵfac})}return r})();var Pe=(()=>{class r{elementRef=g(hn);scrollDispatcher=g(dt);ngZone=g(te$1);dir=g(uT,{optional:!0});_scrollElement=this.elementRef.nativeElement;_destroyed=new J;_renderer=g(zr);_cleanupScroll;_elementScrolled=new J;ngOnInit(){this._cleanupScroll=this.ngZone.runOutsideAngular(()=>this._renderer.listen(this._scrollElement,`scroll`,e=>this._elementScrolled.next(e))),this.scrollDispatcher.register(this)}ngOnDestroy(){this._cleanupScroll?.(),this._elementScrolled.complete(),this.scrollDispatcher.deregister(this),this._destroyed.next(),this._destroyed.complete()}elementScrolled(){return this._elementScrolled}getElementRef(){return this.elementRef}scrollTo(e){let i=this.elementRef.nativeElement,n=this.dir&&this.dir.value==`rtl`;e.left??=n?e.end:e.start,e.right??=n?e.start:e.end,e.bottom!=null&&(e.top=i.scrollHeight-i.clientHeight-e.bottom),n&&gn$1()!=S.NORMAL?(e.left!=null&&(e.right=i.scrollWidth-i.clientWidth-e.left),gn$1()==S.INVERTED?e.left=e.right:gn$1()==S.NEGATED&&(e.left=e.right?-e.right:e.right)):e.right!=null&&(e.left=i.scrollWidth-i.clientWidth-e.right),this._applyScrollToOptions(e)}_applyScrollToOptions(e){let i=this.elementRef.nativeElement;_n$1()?i.scrollTo(e):(e.top!=null&&(i.scrollTop=e.top),e.left!=null&&(i.scrollLeft=e.left))}measureScrollOffset(e){let i=`left`,n=`right`,o=this.elementRef.nativeElement;if(e==`top`)return o.scrollTop;if(e==`bottom`)return o.scrollHeight-o.clientHeight-o.scrollTop;let s=this.dir&&this.dir.value==`rtl`;return e==`start`?e=s?n:i:e==`end`&&(e=s?i:n),s&&gn$1()==S.INVERTED?e==i?o.scrollWidth-o.clientWidth-o.scrollLeft:o.scrollLeft:s&&gn$1()==S.NEGATED?e==i?o.scrollLeft+o.scrollWidth-o.clientWidth:-o.scrollLeft:e==i?o.scrollLeft:o.scrollWidth-o.clientWidth-o.scrollLeft}static ɵfac=function(i){return new(i||r)};static ɵdir=rs({type:r,selectors:[[``,`cdk-scrollable`,``],[``,`cdkScrollable`,``]]})}return r})();var Ln=20;var Ie=(()=>{class r{_platform=g(u$1);_listeners;_viewportSize=null;_change=new J;_document=g(j);constructor(){let e=g(te$1),i=g(ln).createRenderer(null,null);e.runOutsideAngular(()=>{if(this._platform.isBrowser){let n=o=>this._change.next(o);this._listeners=[i.listen(`window`,`resize`,n),i.listen(`window`,`orientationchange`,n)]}this.change().subscribe(()=>this._viewportSize=null)})}ngOnDestroy(){this._listeners?.forEach(e=>e()),this._change.complete()}getViewportSize(){this._viewportSize||this._updateViewportSize();let e={width:this._viewportSize.width,height:this._viewportSize.height};return this._platform.isBrowser||(this._viewportSize=null),e}getViewportRect(){let e=this.getViewportScrollPosition(),{width:i,height:n}=this.getViewportSize();return{top:e.top,left:e.left,bottom:e.top+n,right:e.left+i,height:n,width:i}}getViewportScrollPosition(){if(!this._platform.isBrowser)return{top:0,left:0};let e=this._document,i=this._getWindow(),n=e.documentElement,o=n.getBoundingClientRect();return{top:-o.top||e.body?.scrollTop||i.scrollY||n.scrollTop||0,left:-o.left||e.body?.scrollLeft||i.scrollX||n.scrollLeft||0}}change(e=Ln){return e>0?this._change.pipe(Dm(e)):this._change}_getWindow(){return this._document.defaultView||window}_updateViewportSize(){let e=this._getWindow();this._viewportSize=this._platform.isBrowser?{width:e.innerWidth,height:e.innerHeight}:{width:0,height:0}}static ɵfac=function(i){return new(i||r)};static ɵprov=ce({token:r,factory:r.ɵfac})}return r})();var ht=[`*`];var Hn=[`content`];var _n=[[[`mat-drawer`],[`mat-sidenav`]],[[`mat-drawer-content`],[`mat-sidenav-content`]],`*`];var gn=[`mat-drawer, mat-sidenav`,`mat-drawer-content, mat-sidenav-content`,`*`];function jn(r,t){if(r&1){let e=OI();zi(0,`div`,1),wh(`click`,function(){gd(e);return md(FI()._onBackdropClicked())}),Tu()}if(r&2)xh(`mat-drawer-shown`,FI()._isShowingBackdrop())}function Wn(r,t){r&1&&(zi(0,`mat-drawer-content`),jI(1,2),Tu())}function Yn(r,t){if(r&1){let e=OI();zi(0,`div`,1),wh(`click`,function(){gd(e);return md(FI()._onBackdropClicked())}),Tu()}if(r&2)xh(`mat-drawer-shown`,FI()._isShowingBackdrop())}function Xn(r,t){r&1&&(zi(0,`mat-sidenav-content`),jI(1,2),Tu())}var Gn=`.mat-drawer-container {
  position: relative;
  z-index: 1;
  color: var(--%NS%mat-sidenav-content-text-color, var(--%NS%mat-sys-on-background));
  background-color: var(--%NS%mat-sidenav-content-background-color, var(--%NS%mat-sys-background));
  box-sizing: border-box;
  display: block;
  overflow: hidden;
}
.mat-drawer-container[fullscreen] {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
}
.mat-drawer-container[fullscreen].mat-drawer-container-has-open {
  overflow: hidden;
}
.mat-drawer-container.mat-drawer-container-explicit-backdrop .mat-drawer-side {
  z-index: 3;
}
.mat-drawer-container.ng-animate-disabled .mat-drawer-backdrop,
.mat-drawer-container.ng-animate-disabled .mat-drawer-content, .ng-animate-disabled .mat-drawer-container .mat-drawer-backdrop,
.ng-animate-disabled .mat-drawer-container .mat-drawer-content {
  transition: none;
}

.mat-drawer-backdrop {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  display: block;
  z-index: 3;
  visibility: hidden;
}
.mat-drawer-backdrop.mat-drawer-shown {
  visibility: visible;
  background-color: var(--%NS%mat-sidenav-scrim-color, color-mix(in srgb, var(--%NS%mat-sys-neutral-variant20) 40%, transparent));
}
.mat-drawer-transition .mat-drawer-backdrop {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: background-color, visibility;
}
@media (forced-colors: active) {
  .mat-drawer-backdrop {
    opacity: 0.5;
  }
}

.mat-drawer-content {
  position: relative;
  z-index: 1;
  display: block;
  height: 100%;
  overflow: auto;
}
.mat-drawer-content.mat-drawer-content-hidden {
  opacity: 0;
}
.mat-drawer-transition .mat-drawer-content {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: transform, margin-left, margin-right;
}

.mat-drawer {
  position: relative;
  z-index: 4;
  color: var(--%NS%mat-sidenav-container-text-color, var(--%NS%mat-sys-on-surface-variant));
  box-shadow: var(--%NS%mat-sidenav-container-elevation-shadow, none);
  background-color: var(--%NS%mat-sidenav-container-background-color, var(--%NS%mat-sys-surface));
  border-top-right-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-bottom-right-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  width: var(--%NS%mat-sidenav-container-width, 360px);
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  outline: 0;
  box-sizing: border-box;
  overflow-y: auto;
  transform: translate3d(-100%, 0, 0);
}
@media (forced-colors: active) {
  .mat-drawer, [dir=rtl] .mat-drawer.mat-drawer-end {
    border-right: solid 1px currentColor;
  }
}
@media (forced-colors: active) {
  [dir=rtl] .mat-drawer, .mat-drawer.mat-drawer-end {
    border-left: solid 1px currentColor;
    border-right: none;
  }
}
.mat-drawer.mat-drawer-side {
  z-index: 2;
}
.mat-drawer.mat-drawer-end {
  right: 0;
  transform: translate3d(100%, 0, 0);
  border-top-left-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-bottom-left-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
[dir=rtl] .mat-drawer {
  border-top-left-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-bottom-left-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  transform: translate3d(100%, 0, 0);
}
[dir=rtl] .mat-drawer.mat-drawer-end {
  border-top-right-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-bottom-right-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  left: 0;
  right: auto;
  transform: translate3d(-100%, 0, 0);
}
.mat-drawer-transition .mat-drawer {
  transition: transform 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) {
  visibility: hidden;
  box-shadow: none;
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) .mat-drawer-inner-container {
  display: none;
}
.mat-drawer.mat-drawer-opened.mat-drawer-opened {
  transform: none;
}

.mat-drawer-side {
  box-shadow: none;
  border-right-color: var(--%NS%mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
}
.mat-drawer-side.mat-drawer-end {
  border-left-color: var(--%NS%mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side {
  border-left-color: var(--%NS%mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side.mat-drawer-end {
  border-right-color: var(--%NS%mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
  border-left: none;
}

.mat-drawer-inner-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.mat-sidenav-fixed {
  position: fixed;
}
`;var Zn=new E(`MAT_DRAWER_DEFAULT_AUTOSIZE`,{providedIn:`root`,factory:()=>!1});var ei=new E(`MAT_DRAWER_CONTAINER`);var Ze=(()=>{class r extends Pe{_platform=g(u$1);_changeDetectorRef=g(ng);_element=g(hn);_ngZone=g(te$1);_isInert=!1;_container=g(Qt);ngAfterContentInit(){this._container._contentMarginChanges.subscribe(()=>this._changeDetectorRef.markForCheck())}_drawerToggled(e){e.opened?this._ngZone.runOutsideAngular(()=>{e._animationEnd.pipe(Im(50),Ht(1)).subscribe(()=>this._updateInert())}):this._updateInert()}_drawerModeChanged(){this._updateInert()}_updateInert(){let e=this._container._isShowingBackdrop();if(e!==this._isInert){let i=this._element.nativeElement;this._isInert=e,e?i.setAttribute(`inert`,`true`):i.removeAttribute(`inert`)}}_shouldBeHidden(){if(this._platform.isBrowser)return!1;let{start:e,end:i}=this._container;return e!=null&&e.mode!==`over`&&e.opened||i!=null&&i.mode!==`over`&&i.opened}static ɵfac=(()=>{let e;return function(n){return(e||(e=Bf(r)))(n||r)}})();static ɵcmp=yu({type:r,selectors:[[`mat-drawer-content`]],hostAttrs:[1,`mat-drawer-content`],hostVars:6,hostBindings:function(i,n){i&2&&(Nh(`margin-left`,n._container._contentMargins.left,`px`)(`margin-right`,n._container._contentMargins.right,`px`),xh(`mat-drawer-content-hidden`,n._shouldBeHidden()))},features:[Hh([{provide:Pe,useExisting:r}]),lh],ngContentSelectors:ht,decls:1,vars:0,template:function(i,n){i&1&&(LI(),jI(0))},encapsulation:2})}return r})();var qt=(()=>{class r{_elementRef=g(hn);_focusTrapFactory=g(At$1);_focusMonitor=g(ze);_platform=g(u$1);_ngZone=g(te$1);_renderer=g(zr);_interactivityChecker=g(Qe);_doc=g(j);_container=g(ei,{optional:!0});_focusTrap=null;_elementFocusedBeforeDrawerWasOpened=null;_eventCleanups;_isAttached=!1;_anchor=null;get position(){return this._position}set position(e){e=e===`end`?`end`:`start`,e!==this._position&&(this._isAttached&&this._updatePositionInParent(e),this._position=e,this.onPositionChanged.emit())}_position=`start`;get mode(){return this._mode}set mode(e){this._mode=e,this._updateFocusTrapState(),this._modeChanged.next(),this._getContent()?._drawerModeChanged()}_mode=`over`;get disableClose(){return this._disableClose}set disableClose(e){this._disableClose=Nn$1(e)}_disableClose=!1;get autoFocus(){return this._autoFocus??(this.mode===`side`?`dialog`:`first-tabbable`)}set autoFocus(e){(e===`true`||e===`false`||e==null)&&(e=Nn$1(e)),this._autoFocus=e}_autoFocus;get opened(){return this._opened()}set opened(e){this.toggle(Nn$1(e))}_opened=xr$1(!1);_openedVia=null;_animationStarted=new J;_animationEnd=new J;openedChange=new Ce$1(!0);_openedStream=this.openedChange.pipe(ht$1(e=>e),oe(()=>{}));openedStart=this._animationStarted.pipe(ht$1(()=>this.opened),Ws(void 0));_closedStream=this.openedChange.pipe(ht$1(e=>!e),oe(()=>{}));closedStart=this._animationStarted.pipe(ht$1(()=>!this.opened),Ws(void 0));_destroyed=new J;onPositionChanged=new Ce$1;_content;_modeChanged=new J;_injector=g(ee);_changeDetectorRef=g(ng);constructor(){this.openedChange.pipe(xm(this._destroyed)).subscribe(e=>{e?(this._elementFocusedBeforeDrawerWasOpened=this._doc.activeElement,this._takeFocus()):this._isFocusWithinDrawer()&&this._restoreFocus(this._openedVia||`program`)}),this._eventCleanups=this._ngZone.runOutsideAngular(()=>{let e=this._renderer,i=this._elementRef.nativeElement;return[e.listen(i,`keydown`,n=>{n.keyCode===27&&!this.disableClose&&!qe$1(n)&&this._ngZone.run(()=>{this.close(),n.stopPropagation(),n.preventDefault()})}),e.listen(i,`transitionend`,this._handleTransitionEvent),e.listen(i,`transitioncancel`,this._handleTransitionEvent)]}),this._animationEnd.subscribe(()=>{this.openedChange.emit(this.opened)})}_focusByCssSelector(e,i){let n=this._elementRef.nativeElement.querySelector(e);n&&(this._interactivityChecker.isFocusable(n)||(n.tabIndex=-1,this._ngZone.runOutsideAngular(()=>{let o=()=>{s(),l(),n.removeAttribute(`tabindex`)},s=this._renderer.listen(n,`blur`,o),l=this._renderer.listen(n,`mousedown`,o)})),n.focus(i))}_takeFocus(){if(!this._focusTrap)return;let e=this._elementRef.nativeElement;switch(this.autoFocus){case!1:case`dialog`:return;case!0:case`first-tabbable`:Kv(()=>{!this._focusTrap.focusInitialElement()&&typeof e.focus==`function`&&e.focus()},{injector:this._injector});break;case`first-heading`:this._focusByCssSelector(`h1, h2, h3, h4, h5, h6, [role="heading"]`);break;default:this._focusByCssSelector(this.autoFocus);break}}_restoreFocus(e){this.autoFocus!==`dialog`&&(this._elementFocusedBeforeDrawerWasOpened?this._focusMonitor.focusVia(this._elementFocusedBeforeDrawerWasOpened,e):this._elementRef.nativeElement.blur(),this._elementFocusedBeforeDrawerWasOpened=null)}_isFocusWithinDrawer(){let e=this._doc.activeElement;return!!e&&this._elementRef.nativeElement.contains(e)}ngAfterViewInit(){this._isAttached=!0,this._position===`end`&&this._updatePositionInParent(`end`),this._platform.isBrowser&&(this._focusTrap=this._focusTrapFactory.create(this._elementRef.nativeElement),this._updateFocusTrapState())}ngOnDestroy(){this._eventCleanups.forEach(e=>e()),this._focusTrap?.destroy(),this._anchor?.remove(),this._anchor=null,this._animationStarted.complete(),this._animationEnd.complete(),this._modeChanged.complete(),this._destroyed.next(),this._destroyed.complete()}open(e){return this.toggle(!0,e)}close(){return this.toggle(!1)}_closeViaBackdropClick(){return this._setOpen(!1,!0,`mouse`)}toggle(e=!this.opened,i){e&&i&&(this._openedVia=i);let n=this._setOpen(e,!e&&this._isFocusWithinDrawer(),this._openedVia||`program`);return e||(this._openedVia=null),n}_setOpen(e,i,n){return e===this.opened?Promise.resolve(e?`open`:`close`):(this._opened.set(e),this._getContent()?._drawerToggled(this),this._container?._transitionsEnabled?(this._setIsAnimating(!0),setTimeout(()=>this._animationStarted.next())):setTimeout(()=>{this._animationStarted.next(),this._animationEnd.next()}),this._elementRef.nativeElement.classList.toggle(`mat-drawer-opened`,e),!e&&i&&this._restoreFocus(n),this._changeDetectorRef.markForCheck(),this._updateFocusTrapState(),new Promise(o=>{this.openedChange.pipe(Ht(1)).subscribe(s=>o(s?`open`:`close`))}))}_getContent(){return this._container?._content||this._container?._userContent}_setIsAnimating(e){this._elementRef.nativeElement.classList.toggle(`mat-drawer-animating`,e)}_getWidth(){return this._elementRef.nativeElement.offsetWidth||0}_updateFocusTrapState(){this._focusTrap&&(this._focusTrap.enabled=this.opened&&!!this._container?._isShowingBackdrop())}_updatePositionInParent(e){if(!this._platform.isBrowser)return;let i=this._elementRef.nativeElement,n=i.parentNode;e===`end`?(this._anchor||(this._anchor=this._doc.createComment(`mat-drawer-anchor`),n.insertBefore(this._anchor,i)),n.appendChild(i)):this._anchor&&this._anchor.parentNode.insertBefore(i,this._anchor)}_handleTransitionEvent=e=>{let i=this._elementRef.nativeElement;e.target===i&&this._ngZone.run(()=>{e.type===`transitionend`&&this._setIsAnimating(!1),this._animationEnd.next(e)})};static ɵfac=function(i){return new(i||r)};static ɵcmp=yu({type:r,selectors:[[`mat-drawer`]],viewQuery:function(i,n){if(i&1&&Sh(Hn,5),i&2){let o;VI(o=HI())&&(n._content=o.first)}},hostAttrs:[1,`mat-drawer`],hostVars:12,hostBindings:function(i,n){i&2&&(wu(`align`,null)(`tabIndex`,n.mode!==`side`?`-1`:null),Nh(`visibility`,!n._container&&!n.opened?`hidden`:null),xh(`mat-drawer-end`,n.position===`end`)(`mat-drawer-over`,n.mode===`over`)(`mat-drawer-push`,n.mode===`push`)(`mat-drawer-side`,n.mode===`side`))},inputs:{position:`position`,mode:`mode`,disableClose:`disableClose`,autoFocus:`autoFocus`,opened:`opened`},outputs:{openedChange:`openedChange`,_openedStream:`opened`,openedStart:`openedStart`,_closedStream:`closed`,closedStart:`closedStart`,onPositionChanged:`positionChanged`},exportAs:[`matDrawer`],ngContentSelectors:ht,decls:3,vars:0,consts:[[`content`,``],[`cdkScrollable`,``,1,`mat-drawer-inner-container`]],template:function(i,n){i&1&&(LI(),zi(0,`div`,1,0),jI(2),Tu())},dependencies:[Pe],encapsulation:2})}return r})();var Qt=(()=>{class r{_dir=g(uT,{optional:!0});_element=g(hn);_ngZone=g(te$1);_changeDetectorRef=g(ng);_animationDisabled=j$1();_transitionsEnabled=!1;_allDrawers;_drawers=new Ri;_content;_userContent;get start(){return this._start}get end(){return this._end}get autosize(){return this._autosize}set autosize(e){this._autosize=Nn$1(e)}_autosize=g(Zn);get hasBackdrop(){return this._drawerHasBackdrop(this._start)||this._drawerHasBackdrop(this._end)}set hasBackdrop(e){this._backdropOverride=e==null?null:Nn$1(e)}_backdropOverride=null;backdropClick=new Ce$1;_start=null;_end=null;_left=null;_right=null;_destroyed=new J;_doCheckSubject=new J;_contentMargins={left:null,right:null};_contentMarginChanges=new J;get scrollable(){return this._userContent||this._content}_injector=g(ee);constructor(){let e=g(u$1),i=g(Ie);this._dir?.change.pipe(xm(this._destroyed)).subscribe(()=>{this._validateDrawers(),this.updateContentMargins()}),i.change().pipe(xm(this._destroyed)).subscribe(()=>this.updateContentMargins()),!this._animationDisabled&&e.isBrowser&&this._ngZone.runOutsideAngular(()=>{setTimeout(()=>{this._element.nativeElement.classList.add(`mat-drawer-transition`),this._transitionsEnabled=!0},200)})}ngAfterContentInit(){this._allDrawers.changes.pipe(Nm(this._allDrawers),xm(this._destroyed)).subscribe(e=>{this._drawers.reset(e.filter(i=>!i._container||i._container===this)),this._drawers.notifyOnChanges()}),this._drawers.changes.pipe(Nm(null)).subscribe(()=>{this._validateDrawers(),this._drawers.forEach(e=>{this._watchDrawerToggle(e),this._watchDrawerPosition(e),this._watchDrawerMode(e)}),(!this._drawers.length||this._isDrawerOpen(this._start)||this._isDrawerOpen(this._end))&&this.updateContentMargins(),this._changeDetectorRef.markForCheck()}),this._ngZone.runOutsideAngular(()=>{this._doCheckSubject.pipe(Em(10),xm(this._destroyed)).subscribe(()=>this.updateContentMargins())})}ngOnDestroy(){this._contentMarginChanges.complete(),this._doCheckSubject.complete(),this._drawers.destroy(),this._destroyed.next(),this._destroyed.complete()}open(){this._drawers.forEach(e=>e.open())}close(){this._drawers.forEach(e=>e.close())}updateContentMargins(){let e=0,i=0;if(this._left&&this._left.opened){if(this._left.mode==`side`)e+=this._left._getWidth();else if(this._left.mode==`push`){let n=this._left._getWidth();e+=n,i-=n}}if(this._right&&this._right.opened){if(this._right.mode==`side`)i+=this._right._getWidth();else if(this._right.mode==`push`){let n=this._right._getWidth();i+=n,e-=n}}e=e||null,i=i||null,(e!==this._contentMargins.left||i!==this._contentMargins.right)&&(this._contentMargins={left:e,right:i},this._ngZone.run(()=>this._contentMarginChanges.next(this._contentMargins)))}ngDoCheck(){this._autosize&&this._isPushed()&&this._ngZone.runOutsideAngular(()=>this._doCheckSubject.next())}_watchDrawerToggle(e){e._animationStarted.pipe(xm(this._drawers.changes)).subscribe(()=>{this.updateContentMargins(),this._changeDetectorRef.markForCheck()}),e.mode!==`side`&&e.openedChange.pipe(xm(this._drawers.changes)).subscribe(()=>this._setContainerClass(e.opened))}_watchDrawerPosition(e){e.onPositionChanged.pipe(xm(this._drawers.changes)).subscribe(()=>{Kv({read:()=>this._validateDrawers()},{injector:this._injector})})}_watchDrawerMode(e){e._modeChanged.pipe(xm(vm(this._drawers.changes,this._destroyed))).subscribe(()=>{this.updateContentMargins(),this._changeDetectorRef.markForCheck()})}_setContainerClass(e){let i=this._element.nativeElement.classList,n=`mat-drawer-container-has-open`;e?i.add(n):i.remove(n)}_validateDrawers(){this._start=this._end=null,this._drawers.forEach(e=>{e.position==`end`?(this._end,this._end=e):(this._start,this._start=e)}),this._right=this._left=null,this._dir&&this._dir.value===`rtl`?(this._left=this._end,this._right=this._start):(this._left=this._start,this._right=this._end)}_isPushed(){return this._isDrawerOpen(this._start)&&this._start.mode!=`over`||this._isDrawerOpen(this._end)&&this._end.mode!=`over`}_onBackdropClicked(){this.backdropClick.emit(),this._closeModalDrawersViaBackdrop()}_closeModalDrawersViaBackdrop(){[this._start,this._end].filter(e=>e&&!e.disableClose&&this._drawerHasBackdrop(e)).forEach(e=>e._closeViaBackdropClick())}_isShowingBackdrop(){return this._isDrawerOpen(this._start)&&this._drawerHasBackdrop(this._start)||this._isDrawerOpen(this._end)&&this._drawerHasBackdrop(this._end)}_isDrawerOpen(e){return e!=null&&e.opened}_drawerHasBackdrop(e){return this._backdropOverride==null?!!e&&e.mode!==`side`:this._backdropOverride}static ɵfac=function(i){return new(i||r)};static ɵcmp=yu({type:r,selectors:[[`mat-drawer-container`]],contentQueries:function(i,n,o){if(i&1&&bh(o,Ze,5)(o,qt,5),i&2){let s;VI(s=HI())&&(n._content=s.first),VI(s=HI())&&(n._allDrawers=s)}},viewQuery:function(i,n){if(i&1&&Sh(Ze,5),i&2){let o;VI(o=HI())&&(n._userContent=o.first)}},hostAttrs:[1,`mat-drawer-container`],hostVars:2,hostBindings:function(i,n){i&2&&xh(`mat-drawer-container-explicit-backdrop`,n._backdropOverride)},inputs:{autosize:`autosize`,hasBackdrop:`hasBackdrop`},outputs:{backdropClick:`backdropClick`},exportAs:[`matDrawerContainer`],features:[Hh([{provide:ei,useExisting:r}])],ngContentSelectors:gn,decls:4,vars:2,consts:[[1,`mat-drawer-backdrop`,3,`mat-drawer-shown`],[1,`mat-drawer-backdrop`,3,`click`]],template:function(i,n){i&1&&(LI(_n),bI(0,jn,1,2,`div`,0),jI(1),jI(2,1),bI(3,Wn,2,0,`mat-drawer-content`)),i&2&&(SI(n.hasBackdrop?0:-1),wD(3),SI(n._content?-1:3))},dependencies:[Ze],styles:[`.mat-drawer-container {
  position: relative;
  z-index: 1;
  color: var(--%NS%mat-sidenav-content-text-color, var(--%NS%mat-sys-on-background));
  background-color: var(--%NS%mat-sidenav-content-background-color, var(--%NS%mat-sys-background));
  box-sizing: border-box;
  display: block;
  overflow: hidden;
}
.mat-drawer-container[fullscreen] {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
}
.mat-drawer-container[fullscreen].mat-drawer-container-has-open {
  overflow: hidden;
}
.mat-drawer-container.mat-drawer-container-explicit-backdrop .mat-drawer-side {
  z-index: 3;
}
.mat-drawer-container.ng-animate-disabled .mat-drawer-backdrop,
.mat-drawer-container.ng-animate-disabled .mat-drawer-content, .ng-animate-disabled .mat-drawer-container .mat-drawer-backdrop,
.ng-animate-disabled .mat-drawer-container .mat-drawer-content {
  transition: none;
}

.mat-drawer-backdrop {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  display: block;
  z-index: 3;
  visibility: hidden;
}
.mat-drawer-backdrop.mat-drawer-shown {
  visibility: visible;
  background-color: var(--%NS%mat-sidenav-scrim-color, color-mix(in srgb, var(--%NS%mat-sys-neutral-variant20) 40%, transparent));
}
.mat-drawer-transition .mat-drawer-backdrop {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: background-color, visibility;
}
@media (forced-colors: active) {
  .mat-drawer-backdrop {
    opacity: 0.5;
  }
}

.mat-drawer-content {
  position: relative;
  z-index: 1;
  display: block;
  height: 100%;
  overflow: auto;
}
.mat-drawer-content.mat-drawer-content-hidden {
  opacity: 0;
}
.mat-drawer-transition .mat-drawer-content {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: transform, margin-left, margin-right;
}

.mat-drawer {
  position: relative;
  z-index: 4;
  color: var(--%NS%mat-sidenav-container-text-color, var(--%NS%mat-sys-on-surface-variant));
  box-shadow: var(--%NS%mat-sidenav-container-elevation-shadow, none);
  background-color: var(--%NS%mat-sidenav-container-background-color, var(--%NS%mat-sys-surface));
  border-top-right-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-bottom-right-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  width: var(--%NS%mat-sidenav-container-width, 360px);
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  outline: 0;
  box-sizing: border-box;
  overflow-y: auto;
  transform: translate3d(-100%, 0, 0);
}
@media (forced-colors: active) {
  .mat-drawer, [dir=rtl] .mat-drawer.mat-drawer-end {
    border-right: solid 1px currentColor;
  }
}
@media (forced-colors: active) {
  [dir=rtl] .mat-drawer, .mat-drawer.mat-drawer-end {
    border-left: solid 1px currentColor;
    border-right: none;
  }
}
.mat-drawer.mat-drawer-side {
  z-index: 2;
}
.mat-drawer.mat-drawer-end {
  right: 0;
  transform: translate3d(100%, 0, 0);
  border-top-left-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-bottom-left-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
[dir=rtl] .mat-drawer {
  border-top-left-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-bottom-left-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  transform: translate3d(100%, 0, 0);
}
[dir=rtl] .mat-drawer.mat-drawer-end {
  border-top-right-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-bottom-right-radius: var(--%NS%mat-sidenav-container-shape, var(--%NS%mat-sys-corner-large));
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  left: 0;
  right: auto;
  transform: translate3d(-100%, 0, 0);
}
.mat-drawer-transition .mat-drawer {
  transition: transform 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) {
  visibility: hidden;
  box-shadow: none;
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) .mat-drawer-inner-container {
  display: none;
}
.mat-drawer.mat-drawer-opened.mat-drawer-opened {
  transform: none;
}

.mat-drawer-side {
  box-shadow: none;
  border-right-color: var(--%NS%mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
}
.mat-drawer-side.mat-drawer-end {
  border-left-color: var(--%NS%mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side {
  border-left-color: var(--%NS%mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side.mat-drawer-end {
  border-right-color: var(--%NS%mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
  border-left: none;
}

.mat-drawer-inner-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.mat-sidenav-fixed {
  position: fixed;
}
`],encapsulation:2})}return r})();var ct=(()=>{class r extends Ze{static ɵfac=(()=>{let e;return function(n){return(e||(e=Bf(r)))(n||r)}})();static ɵcmp=yu({type:r,selectors:[[`mat-sidenav-content`]],hostAttrs:[1,`mat-drawer-content`,`mat-sidenav-content`],features:[Hh([{provide:Pe,useExisting:r},{provide:Ze,useExisting:r}]),lh],ngContentSelectors:ht,decls:1,vars:0,template:function(i,n){i&1&&(LI(),jI(0))},encapsulation:2})}return r})();var ti=(()=>{class r extends qt{get fixedInViewport(){return this._fixedInViewport}set fixedInViewport(e){this._fixedInViewport=Nn$1(e)}_fixedInViewport=!1;get fixedTopGap(){return this._fixedTopGap}set fixedTopGap(e){this._fixedTopGap=lt(e)}_fixedTopGap=0;get fixedBottomGap(){return this._fixedBottomGap}set fixedBottomGap(e){this._fixedBottomGap=lt(e)}_fixedBottomGap=0;static ɵfac=(()=>{let e;return function(n){return(e||(e=Bf(r)))(n||r)}})();static ɵcmp=yu({type:r,selectors:[[`mat-sidenav`]],hostAttrs:[1,`mat-drawer`,`mat-sidenav`],hostVars:16,hostBindings:function(i,n){i&2&&(wu(`tabIndex`,n.mode!==`side`?`-1`:null)(`align`,null),Nh(`top`,n.fixedInViewport?n.fixedTopGap:null,`px`)(`bottom`,n.fixedInViewport?n.fixedBottomGap:null,`px`),xh(`mat-drawer-end`,n.position===`end`)(`mat-drawer-over`,n.mode===`over`)(`mat-drawer-push`,n.mode===`push`)(`mat-drawer-side`,n.mode===`side`)(`mat-sidenav-fixed`,n.fixedInViewport))},inputs:{fixedInViewport:`fixedInViewport`,fixedTopGap:`fixedTopGap`,fixedBottomGap:`fixedBottomGap`},exportAs:[`matSidenav`],features:[Hh([{provide:qt,useExisting:r}]),lh],ngContentSelectors:ht,decls:3,vars:0,consts:[[`content`,``],[`cdkScrollable`,``,1,`mat-drawer-inner-container`]],template:function(i,n){i&1&&(LI(),zi(0,`div`,1,0),jI(2),Tu())},dependencies:[Pe],encapsulation:2})}return r})();var vn=(()=>{class r extends Qt{_allDrawers=void 0;_content=void 0;static ɵfac=(()=>{let e;return function(n){return(e||(e=Bf(r)))(n||r)}})();static ɵcmp=yu({type:r,selectors:[[`mat-sidenav-container`]],contentQueries:function(i,n,o){if(i&1&&bh(o,ct,5)(o,ti,5),i&2){let s;VI(s=HI())&&(n._content=s.first),VI(s=HI())&&(n._allDrawers=s)}},hostAttrs:[1,`mat-drawer-container`,`mat-sidenav-container`],hostVars:2,hostBindings:function(i,n){i&2&&xh(`mat-drawer-container-explicit-backdrop`,n._backdropOverride)},exportAs:[`matSidenavContainer`],features:[Hh([{provide:ei,useExisting:r},{provide:Qt,useExisting:r}]),lh],ngContentSelectors:gn,decls:4,vars:2,consts:[[1,`mat-drawer-backdrop`,3,`mat-drawer-shown`],[1,`mat-drawer-backdrop`,3,`click`]],template:function(i,n){i&1&&(LI(_n),bI(0,Yn,1,2,`div`,0),jI(1),jI(2,1),bI(3,Xn,2,0,`mat-sidenav-content`)),i&2&&(SI(n.hasBackdrop?0:-1),wD(3),SI(n._content?-1:3))},dependencies:[ct],styles:[Gn],encapsulation:2})}return r})();var Ke=class{_attachedHost=null;attach(t){return this._attachedHost=t,t.attach(this)}detach(){let t=this._attachedHost;t!=null&&(this._attachedHost=null,t.detach())}get isAttached(){return this._attachedHost!=null}setAttachedHost(t){this._attachedHost=t}};var ii=class extends Ke{component;viewContainerRef;injector;projectableNodes;bindings;directives;constructor(t,e,i,n,o,s){super(),this.component=t,this.viewContainerRef=e,this.injector=i,this.projectableNodes=n,this.bindings=o||null,this.directives=s||null}};var Te=class extends Ke{templateRef;viewContainerRef;context;injector;constructor(t,e,i,n){super(),this.templateRef=t,this.viewContainerRef=e,this.context=i,this.injector=n}get origin(){return this.templateRef.elementRef}attach(t,e=this.context){return this.context=e,super.attach(t)}detach(){return this.context=void 0,super.detach()}};var ni=class extends Ke{element;constructor(t){super(),this.element=t instanceof hn?t.nativeElement:t}};var ri=class{_attachedPortal=null;_disposeFn=null;_isDisposed=!1;hasAttached(){return!!this._attachedPortal}attach(t){if(t instanceof ii)return this._attachedPortal=t,this.attachComponentPortal(t);if(t instanceof Te)return this._attachedPortal=t,this.attachTemplatePortal(t);if(this.attachDomPortal&&t instanceof ni)return this._attachedPortal=t,this.attachDomPortal(t)}attachDomPortal=null;detach(){this._attachedPortal&&(this._attachedPortal.setAttachedHost(null),this._attachedPortal=null),this._invokeDisposeFn()}dispose(){this.hasAttached()&&this.detach(),this._invokeDisposeFn(),this._isDisposed=!0}setDisposeFn(t){this._disposeFn=t}_invokeDisposeFn(){this._disposeFn&&(this._disposeFn(),this._disposeFn=null)}};var Ue=class extends ri{outletElement;_appRef;_defaultInjector;constructor(t,e,i){super(),this.outletElement=t,this._appRef=e,this._defaultInjector=i}attachComponentPortal(t){let e;if(t.viewContainerRef){let i=t.injector||t.viewContainerRef.injector,n=i.get(fn,null,{optional:!0})||void 0;e=t.viewContainerRef.createComponent(t.component,{index:t.viewContainerRef.length,injector:i,ngModuleRef:n,projectableNodes:t.projectableNodes||void 0,bindings:t.bindings||void 0,directives:t.directives||void 0}),this.setDisposeFn(()=>e.destroy())}else{let i=this._appRef,n=t.injector||this._defaultInjector||ee.NULL,o=n.get(Q,i.injector);e=ig(t.component,{elementInjector:n,environmentInjector:o,projectableNodes:t.projectableNodes||void 0,bindings:t.bindings||void 0,directives:t.directives||void 0}),i.attachView(e.hostView),this.setDisposeFn(()=>{i.viewCount>0&&i.detachView(e.hostView),e.destroy()})}return this.outletElement.appendChild(this._getComponentRootNode(e)),this._attachedPortal=t,e}attachTemplatePortal(t){let e=t.viewContainerRef,i=e.createEmbeddedView(t.templateRef,t.context,{injector:t.injector});return i.rootNodes.forEach(n=>this.outletElement.appendChild(n)),i.detectChanges(),this.setDisposeFn(()=>{let n=e.indexOf(i);n!==-1&&e.remove(n)}),this._attachedPortal=t,i}attachDomPortal=t=>{let e=t.element;e.parentNode;let i=this.outletElement.ownerDocument.createComment(`dom-portal`);e.parentNode.insertBefore(i,e),this.outletElement.appendChild(e),this._attachedPortal=t,super.setDisposeFn(()=>{i.parentNode&&i.parentNode.replaceChild(e,i)})};dispose(){super.dispose(),this.outletElement.remove()}_getComponentRootNode(t){return t.hostView.rootNodes[0]}};var ut=class{enable(){}disable(){}attach(){}};function oi(r,t){return t.some(e=>{let i=r.bottom<e.top,n=r.top>e.bottom,o=r.right<e.left,s=r.left>e.right;return i||n||o||s})}function yn(r,t){return t.some(e=>{let i=r.top<e.top,n=r.bottom>e.bottom,o=r.left<e.left,s=r.right>e.right;return i||n||o||s})}function ai(r,t){return new pt(r.get(dt),r.get(Ie),r.get(te$1),t)}var pt=class{_scrollDispatcher;_viewportRuler;_ngZone;_config;_scrollSubscription=null;_overlayRef;constructor(t,e,i,n){this._scrollDispatcher=t,this._viewportRuler=e,this._ngZone=i,this._config=n}attach(t){this._overlayRef,this._overlayRef=t}enable(){if(!this._scrollSubscription){let t=this._config?this._config.scrollThrottle:0;this._scrollSubscription=this._scrollDispatcher.scrolled(t).subscribe(()=>{if(this._overlayRef.updatePosition(),this._config&&this._config.autoClose){let e=this._overlayRef.overlayElement.getBoundingClientRect(),{width:i,height:n}=this._viewportRuler.getViewportSize();oi(e,[{width:i,height:n,bottom:n,right:i,top:0,left:0}])&&(this.disable(),this._ngZone.run(()=>this._overlayRef.detach()))}})}}disable(){this._scrollSubscription&&(this._scrollSubscription.unsubscribe(),this._scrollSubscription=null)}detach(){this.disable(),this._overlayRef=null}};var Ae=class{positionStrategy;scrollStrategy=new ut;panelClass=``;hasBackdrop=!1;backdropClass=`cdk-overlay-dark-backdrop`;disableAnimations;width;height;minWidth;minHeight;maxWidth;maxHeight;direction;disposeOnNavigation=!1;usePopover;eventPredicate;constructor(t){if(t){let e=Object.keys(t);for(let i of e)t[i]!==void 0&&(this[i]=t[i])}}};var mt=class{connectionPair;scrollableViewProperties;constructor(t,e){this.connectionPair=t,this.scrollableViewProperties=e}};var Sn=(()=>{class r{_attachedOverlays=[];_document=g(j);_isAttached=!1;ngOnDestroy(){this.detach()}add(e){this.remove(e),this._attachedOverlays.push(e)}remove(e){let i=this._attachedOverlays.indexOf(e);i>-1&&this._attachedOverlays.splice(i,1),this._attachedOverlays.length===0&&this.detach()}canReceiveEvent(e,i,n){return n.observers.length<1?!1:e.eventPredicate?e.eventPredicate(i):!0}static ɵfac=function(i){return new(i||r)};static ɵprov=ce({token:r,factory:r.ɵfac})}return r})();var kn=(()=>{class r extends Sn{_ngZone=g(te$1);_renderer=g(ln).createRenderer(null,null);_cleanupKeydown;add(e){super.add(e),this._isAttached||(this._ngZone.runOutsideAngular(()=>{this._cleanupKeydown=this._renderer.listen(`body`,`keydown`,this._keydownListener)}),this._isAttached=!0)}detach(){this._isAttached&&(this._cleanupKeydown?.(),this._isAttached=!1)}_keydownListener=e=>{let i=this._attachedOverlays;for(let n=i.length-1;n>-1;n--){let o=i[n];if(this.canReceiveEvent(o,e,o._keydownEvents)){this._ngZone.run(()=>o._keydownEvents.next(e));break}}};static ɵfac=function(i){return new(i||r)};static ɵprov=ce({token:r,factory:r.ɵfac})}return r})();var Mn=(()=>{class r extends Sn{_platform=g(u$1);_ngZone=g(te$1);_renderer=g(ln).createRenderer(null,null);_cursorOriginalValue;_cursorStyleIsSet=!1;_pointerDownEventTarget=null;_cleanups;add(e){if(super.add(e),!this._isAttached){let i=this._document.body,n={capture:!0},o=this._renderer;this._cleanups=this._ngZone.runOutsideAngular(()=>[o.listen(i,`pointerdown`,this._pointerDownListener,n),o.listen(i,`click`,this._clickListener,n),o.listen(i,`auxclick`,this._clickListener,n),o.listen(i,`contextmenu`,this._clickListener,n)]),this._platform.IOS&&!this._cursorStyleIsSet&&(this._cursorOriginalValue=i.style.cursor,i.style.cursor=`pointer`,this._cursorStyleIsSet=!0),this._isAttached=!0}}detach(){this._isAttached&&(this._cleanups?.forEach(e=>e()),this._cleanups=void 0,this._platform.IOS&&this._cursorStyleIsSet&&(this._document.body.style.cursor=this._cursorOriginalValue,this._cursorStyleIsSet=!1),this._isAttached=!1)}_pointerDownListener=e=>{this._pointerDownEventTarget=p(e)};_clickListener=e=>{let i=p(e),n=e.type===`click`&&this._pointerDownEventTarget?this._pointerDownEventTarget:i;this._pointerDownEventTarget=null;let o=this._attachedOverlays.slice();for(let s=o.length-1;s>-1;s--){let l=o[s],d=l._outsidePointerEvents;if(!(!l.hasAttached()||!this.canReceiveEvent(l,e,d))){if(bn(l.overlayElement,i)||bn(l.overlayElement,n))break;this._ngZone?this._ngZone.run(()=>d.next(e)):d.next(e)}}};static ɵfac=function(i){return new(i||r)};static ɵprov=ce({token:r,factory:r.ɵfac})}return r})();function bn(r,t){let e=typeof ShadowRoot<`u`&&ShadowRoot,i=t;for(;i;){if(i===r)return!0;i=e&&i instanceof ShadowRoot?i.host:i.parentNode}return!1}var Dn=(()=>{class r{static ɵfac=function(i){return new(i||r)};static ɵcmp=yu({type:r,selectors:[[`ng-component`]],hostAttrs:[`cdk-overlay-style-loader`,``],decls:0,vars:0,template:function(i,n){},styles:[`.cdk-overlay-container, .cdk-global-overlay-wrapper {
  pointer-events: none;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
}

.cdk-overlay-container {
  position: fixed;
}
@layer cdk-overlay {
  .cdk-overlay-container {
    z-index: 1000;
  }
}
.cdk-overlay-container:empty {
  display: none;
}

.cdk-global-overlay-wrapper {
  display: flex;
  position: absolute;
}
@layer cdk-overlay {
  .cdk-global-overlay-wrapper {
    z-index: 1000;
  }
}

.cdk-overlay-pane {
  position: absolute;
  pointer-events: auto;
  box-sizing: border-box;
  display: flex;
  max-width: 100%;
  max-height: 100%;
}
@layer cdk-overlay {
  .cdk-overlay-pane {
    z-index: 1000;
  }
}

.cdk-overlay-backdrop {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  opacity: 0;
  touch-action: manipulation;
}
@layer cdk-overlay {
  .cdk-overlay-backdrop {
    z-index: 1000;
    transition: opacity 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
  }
}
@media (prefers-reduced-motion) {
  .cdk-overlay-backdrop {
    transition-duration: 1ms;
  }
}

.cdk-overlay-backdrop-showing {
  opacity: 1;
}
@media (forced-colors: active) {
  .cdk-overlay-backdrop-showing {
    opacity: 0.6;
  }
}

@layer cdk-overlay {
  .cdk-overlay-dark-backdrop {
    background: rgba(0, 0, 0, 0.32);
  }
}

.cdk-overlay-transparent-backdrop {
  transition: visibility 1ms linear, opacity 1ms linear;
  visibility: hidden;
  opacity: 1;
}
.cdk-overlay-transparent-backdrop.cdk-overlay-backdrop-showing, .cdk-high-contrast-active .cdk-overlay-transparent-backdrop {
  opacity: 0;
  visibility: visible;
}

.cdk-overlay-backdrop-noop-animation {
  transition: none;
}

.cdk-overlay-connected-position-bounding-box {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 1px;
  min-height: 1px;
}
@layer cdk-overlay {
  .cdk-overlay-connected-position-bounding-box {
    z-index: 1000;
  }
}

.cdk-global-scrollblock {
  position: fixed;
  width: 100%;
  overflow-y: scroll;
}

.cdk-overlay-popover {
  background: none;
  border: none;
  padding: 0;
  outline: 0;
  overflow: visible;
  position: fixed;
  pointer-events: none;
  white-space: normal;
  color: inherit;
  text-decoration: none;
  width: 100%;
  height: 100%;
  inset: auto;
  top: 0;
  left: 0;
}
.cdk-overlay-popover::backdrop {
  display: none;
}
.cdk-overlay-popover .cdk-overlay-backdrop {
  position: fixed;
  z-index: auto;
}
`],encapsulation:2})}return r})();var Rn=(()=>{class r{_platform=g(u$1);_containerElement;_document=g(j);_styleLoader=g(iT);ngOnDestroy(){this._containerElement?.remove()}getContainerElement(){return this._loadStyles(),this._containerElement||this._createContainer(),this._containerElement}_createContainer(){let e=`cdk-overlay-container`;if(this._platform.isBrowser||vn$1()){let n=this._document.querySelectorAll(`.${e}[platform="server"], .${e}[platform="test"]`);for(let o=0;o<n.length;o++)n[o].remove()}let i=this._document.createElement(`div`);i.classList.add(e),vn$1()?i.setAttribute(`platform`,`test`):this._platform.isBrowser||i.setAttribute(`platform`,`server`),this._document.body.appendChild(i),this._containerElement=i}_loadStyles(){this._styleLoader.load(Dn)}static ɵfac=function(i){return new(i||r)};static ɵprov=ce({token:r,factory:r.ɵfac})}return r})();var si=class{_renderer;_ngZone;element;_cleanupClick;_cleanupTransitionEnd;_fallbackTimeout;constructor(t,e,i,n){this._renderer=e,this._ngZone=i,this.element=t.createElement(`div`),this.element.classList.add(`cdk-overlay-backdrop`),this._cleanupClick=e.listen(this.element,`click`,n)}detach(){this._ngZone.runOutsideAngular(()=>{let t=this.element;clearTimeout(this._fallbackTimeout),this._cleanupTransitionEnd?.(),this._cleanupTransitionEnd=this._renderer.listen(t,`transitionend`,this.dispose),this._fallbackTimeout=setTimeout(this.dispose,500),t.style.pointerEvents=`none`,t.classList.remove(`cdk-overlay-backdrop-showing`)})}dispose=()=>{clearTimeout(this._fallbackTimeout),this._cleanupClick?.(),this._cleanupTransitionEnd?.(),this._cleanupClick=this._cleanupTransitionEnd=this._fallbackTimeout=void 0,this.element.remove()}};function li(r){return r&&r.nodeType===1}var ft=class{_portalOutlet;_host;_pane;_config;_ngZone;_keyboardDispatcher;_document;_location;_outsideClickDispatcher;_animationsDisabled;_injector;_renderer;_backdropClick=new J;_attachments=new J;_detachments=new J;_positionStrategy;_scrollStrategy;_locationChanges=Y.EMPTY;_backdropRef=null;_detachContentMutationObserver;_detachContentAfterRenderRef;_disposed=!1;_previousHostParent;_keydownEvents=new J;_outsidePointerEvents=new J;_afterNextRenderRef;constructor(t,e,i,n,o,s,l,d,g,p=!1,y,I){this._portalOutlet=t,this._host=e,this._pane=i,this._config=n,this._ngZone=o,this._keyboardDispatcher=s,this._document=l,this._location=d,this._outsideClickDispatcher=g,this._animationsDisabled=p,this._injector=y,this._renderer=I,n.scrollStrategy&&(this._scrollStrategy=n.scrollStrategy,this._scrollStrategy.attach(this)),this._positionStrategy=n.positionStrategy}get overlayElement(){return this._pane}get backdropElement(){return this._backdropRef?.element||null}get hostElement(){return this._host}get eventPredicate(){return this._config?.eventPredicate||null}attach(t){if(this._disposed)return null;this._attachHost();let e=this._portalOutlet.attach(t);return this._positionStrategy?.attach(this),this._updateStackingOrder(),this._updateElementSize(),this._updateElementDirection(),this._scrollStrategy&&this._scrollStrategy.enable(),this._afterNextRenderRef?.destroy(),this._afterNextRenderRef=Kv(()=>{this.hasAttached()&&this.updatePosition()},{injector:this._injector}),this._togglePointerEvents(!0),this._config.hasBackdrop&&this._attachBackdrop(),this._config.panelClass&&this._toggleClasses(this._pane,this._config.panelClass,!0),this._attachments.next(),this._completeDetachContent(),this._keyboardDispatcher.add(this),this._config.disposeOnNavigation&&(this._locationChanges=this._location.subscribe(()=>this.dispose())),this._outsideClickDispatcher.add(this),typeof e?.onDestroy==`function`&&e.onDestroy(()=>{this.hasAttached()&&this._ngZone.runOutsideAngular(()=>Promise.resolve().then(()=>this.detach()))}),e}detach(){if(!this.hasAttached())return;this.detachBackdrop(),this._togglePointerEvents(!1),this._positionStrategy&&this._positionStrategy.detach&&this._positionStrategy.detach(),this._scrollStrategy&&this._scrollStrategy.disable();let t=this._portalOutlet.detach();return this._detachments.next(),this._completeDetachContent(),this._keyboardDispatcher.remove(this),this._detachContentWhenEmpty(),this._locationChanges.unsubscribe(),this._outsideClickDispatcher.remove(this),t}dispose(){if(this._disposed)return;let t=this.hasAttached();this._positionStrategy&&this._positionStrategy.dispose(),this._disposeScrollStrategy(),this._backdropRef?.dispose(),this._locationChanges.unsubscribe(),this._keyboardDispatcher.remove(this),this._portalOutlet.dispose(),this._attachments.complete(),this._backdropClick.complete(),this._keydownEvents.complete(),this._outsidePointerEvents.complete(),this._outsideClickDispatcher.remove(this),this._host?.remove(),this._afterNextRenderRef?.destroy(),this._previousHostParent=this._pane=this._host=this._backdropRef=null,t&&this._detachments.next(),this._detachments.complete(),this._completeDetachContent(),this._disposed=!0}hasAttached(){return this._portalOutlet.hasAttached()}backdropClick(){return this._backdropClick}attachments(){return this._attachments}detachments(){return this._detachments}keydownEvents(){return this._keydownEvents}outsidePointerEvents(){return this._outsidePointerEvents}getConfig(){return this._config}updatePosition(){this._positionStrategy&&this._positionStrategy.apply()}updatePositionStrategy(t){t!==this._positionStrategy&&(this._positionStrategy&&this._positionStrategy.dispose(),this._positionStrategy=t,this.hasAttached()&&(t.attach(this),this.updatePosition()))}updateSize(t){this._config=P(P({},this._config),t),this._updateElementSize()}setDirection(t){this._config=U(P({},this._config),{direction:t}),this._updateElementDirection()}addPanelClass(t){this._pane&&this._toggleClasses(this._pane,t,!0)}removePanelClass(t){this._pane&&this._toggleClasses(this._pane,t,!1)}getDirection(){let t=this._config.direction;return t?typeof t==`string`?t:t.value:`ltr`}updateScrollStrategy(t){t!==this._scrollStrategy&&(this._disposeScrollStrategy(),this._scrollStrategy=t,this.hasAttached()&&(t.attach(this),t.enable()))}_updateElementDirection(){this._host.setAttribute(`dir`,this.getDirection())}_updateElementSize(){if(!this._pane)return;let t=this._pane.style;t.width=Dn$1(this._config.width),t.height=Dn$1(this._config.height),t.minWidth=Dn$1(this._config.minWidth),t.minHeight=Dn$1(this._config.minHeight),t.maxWidth=Dn$1(this._config.maxWidth),t.maxHeight=Dn$1(this._config.maxHeight)}_togglePointerEvents(t){this._pane.style.pointerEvents=t?``:`none`}_attachHost(){if(!this._host.parentElement){let t=this._config.usePopover?this._positionStrategy?.getPopoverInsertionPoint?.():null;li(t)?t.after(this._host):t?.type===`parent`?t.element.appendChild(this._host):this._previousHostParent?.appendChild(this._host)}if(this._config.usePopover)try{this._host.showPopover()}catch{}}_attachBackdrop(){let t=`cdk-overlay-backdrop-showing`;this._backdropRef?.dispose(),this._backdropRef=new si(this._document,this._renderer,this._ngZone,e=>{this._backdropClick.next(e)}),this._animationsDisabled&&this._backdropRef.element.classList.add(`cdk-overlay-backdrop-noop-animation`),this._config.backdropClass&&this._toggleClasses(this._backdropRef.element,this._config.backdropClass,!0),this._config.usePopover?this._host.prepend(this._backdropRef.element):this._host.parentElement.insertBefore(this._backdropRef.element,this._host),!this._animationsDisabled&&typeof requestAnimationFrame<`u`?this._ngZone.runOutsideAngular(()=>{requestAnimationFrame(()=>this._backdropRef?.element.classList.add(t))}):this._backdropRef.element.classList.add(t)}_updateStackingOrder(){!this._config.usePopover&&this._host.nextSibling&&this._host.parentNode.appendChild(this._host)}detachBackdrop(){this._animationsDisabled?(this._backdropRef?.dispose(),this._backdropRef=null):this._backdropRef?.detach()}_toggleClasses(t,e,i){let n=Ft(e||[]).filter(o=>!!o);n.length&&(i?t.classList.add(...n):t.classList.remove(...n))}_detachContentWhenEmpty(){let t=!1;try{this._detachContentAfterRenderRef=Kv(()=>{t=!0,this._detachContent()},{injector:this._injector})}catch(e){if(t)throw e;this._detachContent()}globalThis.MutationObserver&&this._pane&&(this._detachContentMutationObserver||=new globalThis.MutationObserver(()=>{this._detachContent()}),this._detachContentMutationObserver.observe(this._pane,{childList:!0}))}_detachContent(){(!this._pane||!this._host||this._pane.children.length===0)&&(this._pane&&this._config.panelClass&&this._toggleClasses(this._pane,this._config.panelClass,!1),this._host&&this._host.parentElement&&(this._previousHostParent=this._host.parentElement,this._host.remove()),this._completeDetachContent())}_completeDetachContent(){this._detachContentAfterRenderRef?.destroy(),this._detachContentAfterRenderRef=void 0,this._detachContentMutationObserver?.disconnect()}_disposeScrollStrategy(){let t=this._scrollStrategy;t?.disable(),t?.detach?.()}};var wn=`cdk-overlay-connected-position-bounding-box`;var Kn=/([A-Za-z%]+)$/;function di(r,t){return new _t(t,r.get(Ie),r.get(j),r.get(u$1),r.get(Rn))}var _t=class{_viewportRuler;_document;_platform;_overlayContainer;_overlayRef;_isInitialRender=!1;_lastBoundingBoxSize={width:0,height:0};_isPushed=!1;_canPush=!0;_growAfterOpen=!1;_hasFlexibleDimensions=!0;_positionLocked=!1;_originRect;_overlayRect;_viewportRect;_containerRect;_viewportMargin=0;_scrollables=[];_preferredPositions=[];_origin;_pane;_isDisposed=!1;_boundingBox=null;_lastPosition=null;_lastScrollVisibility=null;_positionChanges=new J;_resizeSubscription=Y.EMPTY;_offsetX=0;_offsetY=0;_transformOriginSelector;_appliedPanelClasses=[];_previousPushAmount=null;_popoverLocation=`global`;positionChanges=this._positionChanges;get positions(){return this._preferredPositions}constructor(t,e,i,n,o){this._viewportRuler=e,this._document=i,this._platform=n,this._overlayContainer=o,this.setOrigin(t)}attach(t){this._overlayRef&&this._overlayRef,this._validatePositions(),t.hostElement.classList.add(wn),this._overlayRef=t,this._boundingBox=t.hostElement,this._pane=t.overlayElement,this._isDisposed=!1,this._isInitialRender=!0,this._lastPosition=null,this._resizeSubscription.unsubscribe(),this._resizeSubscription=this._viewportRuler.change().subscribe(()=>{this._isInitialRender=!0,this.apply()})}apply(){if(this._isDisposed||!this._platform.isBrowser)return;if(!this._isInitialRender&&this._positionLocked&&this._lastPosition){this.reapplyLastPosition();return}this._clearPanelClasses(),this._resetOverlayElementStyles(),this._resetBoundingBoxStyles(),this._viewportRect=this._getNarrowedViewportRect(),this._originRect=this._getOriginRect(),this._overlayRect=this._pane.getBoundingClientRect(),this._containerRect=this._getContainerRect();let t=this._originRect,e=this._overlayRect,i=this._viewportRect,n=this._containerRect,o=[],s;for(let l of this._preferredPositions){let d=this._getOriginPoint(t,n,l),g=this._getOverlayPoint(d,e,l),p=this._getOverlayFit(g,e,i,l);if(p.isCompletelyWithinViewport){this._isPushed=!1,this._applyPosition(l,d);return}if(this._canFitWithFlexibleDimensions(p,g,i)){o.push({position:l,origin:d,overlayRect:e,boundingBoxRect:this._calculateBoundingBoxRect(d,l)});continue}(!s||s.overlayFit.visibleArea<p.visibleArea)&&(s={overlayFit:p,overlayPoint:g,originPoint:d,position:l,overlayRect:e})}if(o.length){let l=null,d=-1;for(let g of o){let p=g.boundingBoxRect.width*g.boundingBoxRect.height*(g.position.weight||1);p>d&&(d=p,l=g)}this._isPushed=!1,this._applyPosition(l.position,l.origin);return}if(this._canPush){this._isPushed=!0,this._applyPosition(s.position,s.originPoint);return}this._applyPosition(s.position,s.originPoint)}detach(){this._clearPanelClasses(),this._lastPosition=null,this._previousPushAmount=null,this._resizeSubscription.unsubscribe()}dispose(){this._isDisposed||(this._boundingBox&&Ce(this._boundingBox.style,{top:``,left:``,right:``,bottom:``,height:``,width:``,alignItems:``,justifyContent:``}),this._pane&&this._resetOverlayElementStyles(),this._overlayRef&&this._overlayRef.hostElement.classList.remove(wn),this.detach(),this._positionChanges.complete(),this._overlayRef=this._boundingBox=null,this._isDisposed=!0)}reapplyLastPosition(){if(this._isDisposed||!this._platform.isBrowser)return;let t=this._lastPosition;t?(this._originRect=this._getOriginRect(),this._overlayRect=this._pane.getBoundingClientRect(),this._viewportRect=this._getNarrowedViewportRect(),this._containerRect=this._getContainerRect(),this._applyPosition(t,this._getOriginPoint(this._originRect,this._containerRect,t))):this.apply()}withScrollableContainers(t){return this._scrollables=t,this}withPositions(t){return this._preferredPositions=t,t.indexOf(this._lastPosition)===-1&&(this._lastPosition=null),this._validatePositions(),this}withViewportMargin(t){return this._viewportMargin=t,this}withFlexibleDimensions(t=!0){return this._hasFlexibleDimensions=t,this}withGrowAfterOpen(t=!0){return this._growAfterOpen=t,this}withPush(t=!0){return this._canPush=t,this}withLockedPosition(t=!0){return this._positionLocked=t,this}setOrigin(t){return this._origin=t,this}withDefaultOffsetX(t){return this._offsetX=t,this}withDefaultOffsetY(t){return this._offsetY=t,this}withTransformOriginOn(t){return this._transformOriginSelector=t,this}withPopoverLocation(t){return this._popoverLocation=t,this}getPopoverInsertionPoint(){return this._popoverLocation===`global`?null:this._popoverLocation!==`inline`?this._popoverLocation:this._origin instanceof hn?this._origin.nativeElement:li(this._origin)?this._origin:null}_getOriginPoint(t,e,i){let n;if(i.originX==`center`)n=t.left+t.width/2;else{let s=this._isRtl()?t.right:t.left,l=this._isRtl()?t.left:t.right;n=i.originX==`start`?s:l}e.left<0&&(n-=e.left);let o;return i.originY==`center`?o=t.top+t.height/2:o=i.originY==`top`?t.top:t.bottom,e.top<0&&(o-=e.top),{x:n,y:o}}_getOverlayPoint(t,e,i){let n;i.overlayX==`center`?n=-e.width/2:i.overlayX===`start`?n=this._isRtl()?-e.width:0:n=this._isRtl()?0:-e.width;let o;return i.overlayY==`center`?o=-e.height/2:o=i.overlayY==`top`?0:-e.height,{x:t.x+n,y:t.y+o}}_getOverlayFit(t,e,i,n){let o=xn(e),{x:s,y:l}=t,d=this._getOffset(n,`x`),g=this._getOffset(n,`y`);d&&(s+=d),g&&(l+=g);let p=0-s,y=s+o.width-i.width,I=0-l,ie=l+o.height-i.height,de=this._subtractOverflows(o.width,p,y),yi=this._subtractOverflows(o.height,I,ie),bi=de*yi;return{visibleArea:bi,isCompletelyWithinViewport:o.width*o.height===bi,fitsInViewportVertically:yi===o.height,fitsInViewportHorizontally:de==o.width}}_canFitWithFlexibleDimensions(t,e,i){if(this._hasFlexibleDimensions){let n=i.bottom-e.y,o=i.right-e.x,s=Cn(this._overlayRef.getConfig().minHeight),l=Cn(this._overlayRef.getConfig().minWidth),d=t.fitsInViewportVertically||s!=null&&s<=n,g=t.fitsInViewportHorizontally||l!=null&&l<=o;return d&&g}return!1}_pushOverlayOnScreen(t,e,i){if(this._previousPushAmount&&this._positionLocked)return{x:t.x+this._previousPushAmount.x,y:t.y+this._previousPushAmount.y};let n=xn(e),o=this._viewportRect,s=Math.max(t.x+n.width-o.width,0),l=Math.max(t.y+n.height-o.height,0),d=Math.max(o.top-i.top-t.y,0),g=Math.max(o.left-i.left-t.x,0),p=0,y=0;return n.width<=o.width?p=g||-s:p=t.x<this._getViewportMarginStart()?o.left-i.left-t.x:0,n.height<=o.height?y=d||-l:y=t.y<this._getViewportMarginTop()?o.top-i.top-t.y:0,this._previousPushAmount={x:p,y},{x:t.x+p,y:t.y+y}}_applyPosition(t,e){if(this._setTransformOrigin(t),this._setOverlayElementStyles(e,t),this._setBoundingBoxStyles(e,t),t.panelClass&&this._addPanelClasses(t.panelClass),this._positionChanges.observers.length){let i=this._getScrollVisibility();if(t!==this._lastPosition||!this._lastScrollVisibility||!Un(this._lastScrollVisibility,i)){let n=new mt(t,i);this._positionChanges.next(n)}this._lastScrollVisibility=i}this._lastPosition=t,this._isInitialRender=!1}_setTransformOrigin(t){if(!this._transformOriginSelector)return;let e=this._boundingBox.querySelectorAll(this._transformOriginSelector),i,n=t.overlayY;t.overlayX===`center`?i=`center`:this._isRtl()?i=t.overlayX===`start`?`right`:`left`:i=t.overlayX===`start`?`left`:`right`;for(let o=0;o<e.length;o++)e[o].style.transformOrigin=`${i} ${n}`}_calculateBoundingBoxRect(t,e){let i=this._viewportRect,n=this._isRtl(),o,s,l;if(e.overlayY===`top`)s=t.y,o=i.height-s+this._getViewportMarginBottom();else if(e.overlayY===`bottom`)l=i.height-t.y+this._getViewportMarginTop()+this._getViewportMarginBottom(),o=i.height-l+this._getViewportMarginTop();else{let ie=Math.min(i.bottom-t.y+i.top,t.y),de=this._lastBoundingBoxSize.height;o=ie*2,s=t.y-ie,o>de&&!this._isInitialRender&&!this._growAfterOpen&&(s=t.y-de/2)}let d=e.overlayX===`start`&&!n||e.overlayX===`end`&&n,g=e.overlayX===`end`&&!n||e.overlayX===`start`&&n,p,y,I;if(g)I=i.width-t.x+this._getViewportMarginStart()+this._getViewportMarginEnd(),p=t.x-this._getViewportMarginStart();else if(d)y=t.x,p=i.right-t.x-this._getViewportMarginEnd();else{let ie=Math.min(i.right-t.x+i.left,t.x),de=this._lastBoundingBoxSize.width;p=ie*2,y=t.x-ie,p>de&&!this._isInitialRender&&!this._growAfterOpen&&(y=t.x-de/2)}return{top:s,left:y,bottom:l,right:I,width:p,height:o}}_setBoundingBoxStyles(t,e){let i=this._calculateBoundingBoxRect(t,e);!this._isInitialRender&&!this._growAfterOpen&&(i.height=Math.min(i.height,this._lastBoundingBoxSize.height),i.width=Math.min(i.width,this._lastBoundingBoxSize.width));let n={};if(this._hasExactPosition())n.top=n.left=`0`,n.bottom=n.right=`auto`,n.maxHeight=n.maxWidth=``,n.width=n.height=`100%`;else{let o=this._overlayRef.getConfig().maxHeight,s=this._overlayRef.getConfig().maxWidth;n.width=Dn$1(i.width),n.height=Dn$1(i.height),n.top=Dn$1(i.top)||`auto`,n.bottom=Dn$1(i.bottom)||`auto`,n.left=Dn$1(i.left)||`auto`,n.right=Dn$1(i.right)||`auto`,e.overlayX===`center`?n.alignItems=`center`:n.alignItems=e.overlayX===`end`?`flex-end`:`flex-start`,e.overlayY===`center`?n.justifyContent=`center`:n.justifyContent=e.overlayY===`bottom`?`flex-end`:`flex-start`,o&&(n.maxHeight=Dn$1(o)),s&&(n.maxWidth=Dn$1(s))}this._lastBoundingBoxSize=i,Ce(this._boundingBox.style,n)}_resetBoundingBoxStyles(){Ce(this._boundingBox.style,{top:`0`,left:`0`,right:`0`,bottom:`0`,height:``,width:``,alignItems:``,justifyContent:``})}_resetOverlayElementStyles(){Ce(this._pane.style,{top:``,left:``,bottom:``,right:``,position:``,transform:``})}_setOverlayElementStyles(t,e){let i={},n=this._hasExactPosition(),o=this._hasFlexibleDimensions,s=this._overlayRef.getConfig();if(n){let p=this._viewportRuler.getViewportScrollPosition();Ce(i,this._getExactOverlayY(e,t,p)),Ce(i,this._getExactOverlayX(e,t,p))}else i.position=`static`;let l=``,d=this._getOffset(e,`x`),g=this._getOffset(e,`y`);d&&(l+=`translateX(${d}px) `),g&&(l+=`translateY(${g}px)`),i.transform=l.trim(),s.maxHeight&&(n?i.maxHeight=Dn$1(s.maxHeight):o&&(i.maxHeight=``)),s.maxWidth&&(n?i.maxWidth=Dn$1(s.maxWidth):o&&(i.maxWidth=``)),Ce(this._pane.style,i)}_getExactOverlayY(t,e,i){let n={top:``,bottom:``},o=this._getOverlayPoint(e,this._overlayRect,t);if(this._isPushed&&(o=this._pushOverlayOnScreen(o,this._overlayRect,i)),t.overlayY===`bottom`)n.bottom=`${this._document.documentElement.clientHeight-(o.y+this._overlayRect.height)}px`;else n.top=Dn$1(o.y);return n}_getExactOverlayX(t,e,i){let n={left:``,right:``},o=this._getOverlayPoint(e,this._overlayRect,t);this._isPushed&&(o=this._pushOverlayOnScreen(o,this._overlayRect,i));let s;if(this._isRtl()?s=t.overlayX===`end`?`left`:`right`:s=t.overlayX===`end`?`right`:`left`,s===`right`)n.right=`${this._document.documentElement.clientWidth-(o.x+this._overlayRect.width)}px`;else n.left=Dn$1(o.x);return n}_getScrollVisibility(){let t=this._getOriginRect(),e=this._pane.getBoundingClientRect(),i=this._scrollables.map(n=>n.getElementRef().nativeElement.getBoundingClientRect());return{isOriginClipped:yn(t,i),isOriginOutsideView:oi(t,i),isOverlayClipped:yn(e,i),isOverlayOutsideView:oi(e,i)}}_subtractOverflows(t,...e){return e.reduce((i,n)=>i-Math.max(n,0),t)}_getNarrowedViewportRect(){let t=this._document.documentElement.clientWidth,e=this._document.documentElement.clientHeight,i=this._viewportRuler.getViewportScrollPosition();return{top:i.top+this._getViewportMarginTop(),left:i.left+this._getViewportMarginStart(),right:i.left+t-this._getViewportMarginEnd(),bottom:i.top+e-this._getViewportMarginBottom(),width:t-this._getViewportMarginStart()-this._getViewportMarginEnd(),height:e-this._getViewportMarginTop()-this._getViewportMarginBottom()}}_isRtl(){return this._overlayRef.getDirection()===`rtl`}_hasExactPosition(){return!this._hasFlexibleDimensions||this._isPushed}_getOffset(t,e){return e===`x`?t.offsetX==null?this._offsetX:t.offsetX:t.offsetY==null?this._offsetY:t.offsetY}_validatePositions(){}_addPanelClasses(t){this._pane&&Ft(t).forEach(e=>{e!==``&&this._appliedPanelClasses.indexOf(e)===-1&&(this._appliedPanelClasses.push(e),this._pane.classList.add(e))})}_clearPanelClasses(){this._pane&&(this._appliedPanelClasses.forEach(t=>{this._pane.classList.remove(t)}),this._appliedPanelClasses=[])}_getViewportMarginStart(){return typeof this._viewportMargin==`number`?this._viewportMargin:this._viewportMargin?.start??0}_getViewportMarginEnd(){return typeof this._viewportMargin==`number`?this._viewportMargin:this._viewportMargin?.end??0}_getViewportMarginTop(){return typeof this._viewportMargin==`number`?this._viewportMargin:this._viewportMargin?.top??0}_getViewportMarginBottom(){return typeof this._viewportMargin==`number`?this._viewportMargin:this._viewportMargin?.bottom??0}_getOriginRect(){let t=this._origin;if(t instanceof hn)return t.nativeElement.getBoundingClientRect();if(t instanceof Element)return t.getBoundingClientRect();let e=t.width||0,i=t.height||0;return{top:t.y,bottom:t.y+i,left:t.x,right:t.x+e,height:i,width:e}}_getContainerRect(){let t=this._overlayRef.getConfig().usePopover&&this._popoverLocation!==`global`,e=this._overlayContainer.getContainerElement();t&&(e.style.display=`block`);let i=e.getBoundingClientRect();return t&&(e.style.display=``),i}};function Ce(r,t){for(let e in t)t.hasOwnProperty(e)&&(r[e]=t[e]);return r}function Cn(r){if(typeof r!=`number`&&r!=null){let[t,e]=r.split(Kn);return!e||e===`px`?parseFloat(t):null}return r||null}function xn(r){return{top:Math.floor(r.top),right:Math.floor(r.right),bottom:Math.floor(r.bottom),left:Math.floor(r.left),width:Math.floor(r.width),height:Math.floor(r.height)}}function Un(r,t){return r===t?!0:r.isOriginClipped===t.isOriginClipped&&r.isOriginOutsideView===t.isOriginOutsideView&&r.isOverlayClipped===t.isOverlayClipped&&r.isOverlayOutsideView===t.isOverlayOutsideView}var On=new E(`OVERLAY_DEFAULT_CONFIG`);function ci(r,t){r.get(iT).load(Dn);let e=r.get(Rn),i=r.get(j),n=r.get(ae),o=r.get(mn),s=r.get(uT),l=r.get(zr,null,{optional:!0})||r.get(ln).createRenderer(null,null),d=new Ae(t),g=r.get(On,null,{optional:!0})?.usePopover??!0;d.direction=d.direction||s.value,!i.body||!(`showPopover`in i.body)?d.usePopover=!1:d.usePopover=t?.usePopover??g;let p=i.createElement(`div`),y=i.createElement(`div`);p.id=n.getId(`cdk-overlay-`),p.classList.add(`cdk-overlay-pane`),y.appendChild(p),d.usePopover&&(y.setAttribute(`popover`,`manual`),y.classList.add(`cdk-overlay-popover`));let I=d.usePopover?d.positionStrategy?.getPopoverInsertionPoint?.():null;return li(I)?I.after(y):I?.type===`parent`?I.element.appendChild(y):e.getContainerElement().appendChild(y),new ft(new Ue(p,o,r),y,p,d,r.get(te$1),r.get(kn),i,r.get(dg),r.get(Mn),t?.disableAnimations??r.get(fy,null,{optional:!0})===`NoopAnimations`,r.get(Q),l)}var tr=[[[`mat-icon`],[``,`matMenuItemIcon`,``]],`*`];var ir=[`mat-icon, [matMenuItemIcon]`,`*`];function nr(r,t){r&1&&(Md(),zi(0,`svg`,2),yh(1,`polygon`,3),Tu())}var rr=[`*`];function or(r,t){if(r&1){let e=OI();bu(0,`div`,0),Ch(`click`,function(){gd(e);return md(FI().closed.emit(`click`))})(`animationstart`,function(n){gd(e);return md(FI()._onAnimationStart(n.animationName))})(`animationend`,function(n){gd(e);return md(FI()._onAnimationDone(n.animationName))})(`animationcancel`,function(n){gd(e);return md(FI()._onAnimationDone(n.animationName))}),bu(1,`div`,1),jI(2),Su()()}if(r&2){let e=FI();JI(e._classList),xh(`mat-menu-panel-animations-disabled`,e._animationsDisabled)(`mat-menu-panel-exit-animation`,e._panelAnimationState===`void`)(`mat-menu-panel-animating`,e._isAnimating()),Eh(`id`,e.panelId),wu(`aria-label`,e.ariaLabel||null)(`aria-labelledby`,e.ariaLabelledby||null)(`aria-describedby`,e.ariaDescribedby||null)}}var ui=new E(`MAT_MENU_PANEL`);var $e=(()=>{class r{_elementRef=g(hn);_document=g(j);_focusMonitor=g(ze);_parentMenu=g(ui,{optional:!0});_changeDetectorRef=g(ng);role=`menuitem`;disabled=!1;disableRipple=!1;_hovered=new J;_focused=new J;_highlighted=!1;_triggersSubmenu=!1;constructor(){g(iT).load(Wn$1),this._parentMenu?.addItem?.(this)}focus(e,i){this._focusMonitor&&e?this._focusMonitor.focusVia(this._getHostElement(),e,i):this._getHostElement().focus(i),this._focused.next(this)}ngAfterViewInit(){this._focusMonitor&&this._focusMonitor.monitor(this._elementRef,!1)}ngOnDestroy(){this._focusMonitor&&this._focusMonitor.stopMonitoring(this._elementRef),this._parentMenu&&this._parentMenu.removeItem&&this._parentMenu.removeItem(this),this._hovered.complete(),this._focused.complete()}_getTabIndex(){return this.disabled?`-1`:`0`}_getHostElement(){return this._elementRef.nativeElement}_checkDisabled(e){this.disabled&&(e.preventDefault(),e.stopPropagation())}_handleMouseEnter(){this._hovered.next(this)}getLabel(){let e=this._elementRef.nativeElement.cloneNode(!0),i=e.querySelectorAll(`mat-icon, .material-icons`);for(let n=0;n<i.length;n++)i[n].remove();return e.textContent?.trim()||``}_setHighlighted(e){this._highlighted=e,this._changeDetectorRef.markForCheck()}_setTriggersSubmenu(e){this._triggersSubmenu=e,this._changeDetectorRef.markForCheck()}_hasFocus(){return this._document&&this._document.activeElement===this._getHostElement()}static ɵfac=function(i){return new(i||r)};static ɵcmp=yu({type:r,selectors:[[``,`mat-menu-item`,``]],hostAttrs:[1,`mat-mdc-menu-item`,`mat-focus-indicator`],hostVars:8,hostBindings:function(i,n){i&1&&wh(`click`,function(s){return n._checkDisabled(s)})(`mouseenter`,function(){return n._handleMouseEnter()}),i&2&&(wu(`role`,n.role)(`tabindex`,n._getTabIndex())(`aria-disabled`,n.disabled)(`disabled`,n.disabled||null),xh(`mat-mdc-menu-item-highlighted`,n._highlighted)(`mat-mdc-menu-item-submenu-trigger`,n._triggersSubmenu))},inputs:{role:`role`,disabled:[2,`disabled`,`disabled`,oC],disableRipple:[2,`disableRipple`,`disableRipple`,oC]},exportAs:[`matMenuItem`],ngContentSelectors:ir,decls:5,vars:3,consts:[[1,`mat-mdc-menu-item-text`],[`matRipple`,``,1,`mat-mdc-menu-ripple`,3,`matRippleDisabled`,`matRippleTrigger`],[`viewBox`,`0 0 5 10`,`focusable`,`false`,`aria-hidden`,`true`,1,`mat-mdc-menu-submenu-icon`],[`points`,`0,0 5,5 0,10`]],template:function(i,n){i&1&&(LI(tr),jI(0),zi(1,`span`,0),jI(2,1),Tu(),yh(3,`div`,1),bI(4,nr,2,0,`:svg:svg`,2)),i&2&&(wD(3),mh(`matRippleDisabled`,n.disableRipple||n.disabled)(`matRippleTrigger`,n._getHostElement()),wD(),SI(n._triggersSubmenu?4:-1))},dependencies:[jn$1],encapsulation:2})}return r})();var sr=new E(`MatMenuContent`);var ar=new E(`mat-menu-default-options`,{providedIn:`root`,factory:()=>({overlapTrigger:!1,xPosition:`after`,yPosition:`below`,backdropClass:`cdk-overlay-transparent-backdrop`})});var hi=`_mat-menu-enter`;var gt=`_mat-menu-exit`;var Be=(()=>{class r{_elementRef=g(hn);_changeDetectorRef=g(ng);_injector=g(ee);_keyManager;_xPosition;_yPosition;_firstItemFocusRef;_exitFallbackTimeout;_animationsDisabled=j$1();_allItems;_directDescendantItems=new Ri;_classList={};_panelAnimationState=`void`;_animationDone=new J;_isAnimating=xr$1(!1);parentMenu;direction;overlayPanelClass;backdropClass;ariaLabel;ariaLabelledby;ariaDescribedby;get xPosition(){return this._xPosition}set xPosition(e){this._xPosition=e,this.setPositionClasses()}get yPosition(){return this._yPosition}set yPosition(e){this._yPosition=e,this.setPositionClasses()}templateRef;items;lazyContent;overlapTrigger=!1;hasBackdrop;get panelClass(){return this._previousPanelClass}set panelClass(e){let i=this._previousPanelClass,n=P({},this._classList);i&&i.length&&i.split(` `).forEach(o=>{n[o]=!1}),this._previousPanelClass=e,e&&e.length&&(e.split(` `).forEach(o=>{n[o]=!0}),this._elementRef.nativeElement.className=``),this._classList=n}_previousPanelClass=``;get classList(){return this.panelClass}set classList(e){this.panelClass=e}closed=new Ce$1;close=this.closed;panelId=g(ae).getId(`mat-menu-panel-`);constructor(){let e=g(ar);this.overlayPanelClass=e.overlayPanelClass||``,this._xPosition=e.xPosition,this._yPosition=e.yPosition,this.backdropClass=e.backdropClass,this.overlapTrigger=e.overlapTrigger,this.hasBackdrop=e.hasBackdrop}ngOnInit(){this.setPositionClasses()}ngAfterContentInit(){this._updateDirectDescendants(),this._keyManager=new oe$1(this._directDescendantItems).withWrap().withTypeAhead().withHomeAndEnd(),this._keyManager.tabOut.subscribe(()=>this.closed.emit(`tab`)),this._directDescendantItems.changes.pipe(Nm(this._directDescendantItems),Pl(e=>vm(...e.map(i=>i._focused)))).subscribe(e=>this._keyManager.updateActiveItem(e)),this._directDescendantItems.changes.subscribe(e=>{let i=this._keyManager;if(this._panelAnimationState===`enter`&&i.activeItem?._hasFocus()){let n=e.toArray(),o=Math.max(0,Math.min(n.length-1,i.activeItemIndex||0));n[o]&&!n[o].disabled?i.setActiveItem(o):i.setNextItemActive()}})}ngOnDestroy(){this._keyManager?.destroy(),this._directDescendantItems.destroy(),this.closed.complete(),this._firstItemFocusRef?.destroy(),clearTimeout(this._exitFallbackTimeout)}_hovered(){return this._directDescendantItems.changes.pipe(Nm(this._directDescendantItems),Pl(i=>vm(...i.map(n=>n._hovered))))}addItem(e){}removeItem(e){}_handleKeydown(e){let i=e.keyCode,n=this._keyManager;switch(i){case 27:qe$1(e)||(e.preventDefault(),this.closed.emit(`keydown`));break;case 37:this.parentMenu&&this.direction===`ltr`&&this.closed.emit(`keydown`);break;case 39:this.parentMenu&&this.direction===`rtl`&&this.closed.emit(`keydown`);break;default:(i===38||i===40)&&n.setFocusOrigin(`keyboard`),n.onKeydown(e);return}}focusFirstItem(e=`program`){this._firstItemFocusRef?.destroy(),this._firstItemFocusRef=Kv(()=>{let i=this._resolvePanel();if(!i||!i.contains(document.activeElement)){let n=this._keyManager;n.setFocusOrigin(e).setFirstItemActive(),!n.activeItem&&i&&i.focus()}},{injector:this._injector})}resetActiveItem(){this._keyManager.setActiveItem(-1)}setElevation(e){}setPositionClasses(e=this.xPosition,i=this.yPosition){this._classList=U(P({},this._classList),{"mat-menu-before":e===`before`,"mat-menu-after":e===`after`,"mat-menu-above":i===`above`,"mat-menu-below":i===`below`}),this._changeDetectorRef.markForCheck()}_onAnimationDone(e){let i=e===gt;(i||e===hi)&&(i&&(clearTimeout(this._exitFallbackTimeout),this._exitFallbackTimeout=void 0),this._animationDone.next(i?`void`:`enter`),this._isAnimating.set(!1))}_onAnimationStart(e){(e===hi||e===gt)&&this._isAnimating.set(!0)}_setIsOpen(e){if(this._panelAnimationState=e?`enter`:`void`,e){if(this._keyManager.activeItemIndex===0){let i=this._resolvePanel();i&&(i.scrollTop=0)}}else this._animationsDisabled||(this._exitFallbackTimeout=setTimeout(()=>this._onAnimationDone(gt),200));this._animationsDisabled&&setTimeout(()=>{this._onAnimationDone(e?hi:gt)}),this._changeDetectorRef.markForCheck()}_updateDirectDescendants(){this._allItems.changes.pipe(Nm(this._allItems)).subscribe(e=>{this._directDescendantItems.reset(e.filter(i=>i._parentMenu===this)),this._directDescendantItems.notifyOnChanges()})}_resolvePanel(){let e=null;return this._directDescendantItems.length&&(e=this._directDescendantItems.first._getHostElement().closest(`[role="menu"]`)),e}static ɵfac=function(i){return new(i||r)};static ɵcmp=yu({type:r,selectors:[[`mat-menu`]],contentQueries:function(i,n,o){if(i&1&&bh(o,sr,5)(o,$e,5)(o,$e,4),i&2){let s;VI(s=HI())&&(n.lazyContent=s.first),VI(s=HI())&&(n._allItems=s),VI(s=HI())&&(n.items=s)}},viewQuery:function(i,n){if(i&1&&Sh(Gn$1,5),i&2){let o;VI(o=HI())&&(n.templateRef=o.first)}},hostVars:3,hostBindings:function(i,n){i&2&&wu(`aria-label`,null)(`aria-labelledby`,null)(`aria-describedby`,null)},inputs:{backdropClass:`backdropClass`,ariaLabel:[0,`aria-label`,`ariaLabel`],ariaLabelledby:[0,`aria-labelledby`,`ariaLabelledby`],ariaDescribedby:[0,`aria-describedby`,`ariaDescribedby`],xPosition:`xPosition`,yPosition:`yPosition`,overlapTrigger:[2,`overlapTrigger`,`overlapTrigger`,oC],hasBackdrop:[2,`hasBackdrop`,`hasBackdrop`,e=>e==null?null:oC(e)],panelClass:[0,`class`,`panelClass`],classList:`classList`},outputs:{closed:`closed`,close:`close`},exportAs:[`matMenu`],features:[Hh([{provide:ui,useExisting:r}])],ngContentSelectors:rr,decls:1,vars:0,consts:[[`tabindex`,`-1`,`role`,`menu`,1,`mat-mdc-menu-panel`,3,`click`,`animationstart`,`animationend`,`animationcancel`,`id`],[1,`mat-mdc-menu-content`]],template:function(i,n){i&1&&(LI(),ph(0,or,3,12,`ng-template`))},styles:[`mat-menu {
  display: none;
}

.mat-mdc-menu-content {
  margin: 0;
  padding: 8px 0;
  outline: 0;
}
.mat-mdc-menu-content,
.mat-mdc-menu-content .mat-mdc-menu-item .mat-mdc-menu-item-text {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  flex: 1;
  white-space: normal;
  font-family: var(--%NS%mat-menu-item-label-text-font, var(--%NS%mat-sys-label-large-font));
  line-height: var(--%NS%mat-menu-item-label-text-line-height, var(--%NS%mat-sys-label-large-line-height));
  font-size: var(--%NS%mat-menu-item-label-text-size, var(--%NS%mat-sys-label-large-size));
  letter-spacing: var(--%NS%mat-menu-item-label-text-tracking, var(--%NS%mat-sys-label-large-tracking));
  font-weight: var(--%NS%mat-menu-item-label-text-weight, var(--%NS%mat-sys-label-large-weight));
}

@keyframes _mat-menu-enter {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes _mat-menu-exit {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
.mat-mdc-menu-panel {
  min-width: 112px;
  max-width: 280px;
  overflow: auto;
  box-sizing: border-box;
  outline: 0;
  animation: _mat-menu-enter 120ms cubic-bezier(0, 0, 0.2, 1);
  border-radius: var(--%NS%mat-menu-container-shape, var(--%NS%mat-sys-corner-extra-small));
  background-color: var(--%NS%mat-menu-container-color, var(--%NS%mat-sys-surface-container));
  box-shadow: var(--%NS%mat-menu-container-elevation-shadow, 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12));
  will-change: transform, opacity;
}
.mat-mdc-menu-panel.mat-menu-panel-exit-animation {
  animation: _mat-menu-exit 100ms 25ms linear forwards;
}
.mat-mdc-menu-panel.mat-menu-panel-animations-disabled {
  animation: none;
}
.mat-mdc-menu-panel.mat-menu-panel-animating {
  pointer-events: none;
}
.mat-mdc-menu-panel.mat-menu-panel-animating:has(.mat-mdc-menu-content:empty) {
  display: none;
}
@media (forced-colors: active) {
  .mat-mdc-menu-panel {
    outline: solid 1px;
  }
}
.mat-mdc-menu-panel .mat-divider {
  border-top-color: var(--%NS%mat-menu-divider-color, var(--%NS%mat-sys-surface-variant));
  margin-bottom: var(--%NS%mat-menu-divider-bottom-spacing, 8px);
  margin-top: var(--%NS%mat-menu-divider-top-spacing, 8px);
}

.mat-mdc-menu-item {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  width: 100%;
  text-align: left;
  box-sizing: border-box;
  color: inherit;
  font-size: inherit;
  background: none;
  text-decoration: none;
  margin: 0;
  min-height: 48px;
  padding-left: var(--%NS%mat-menu-item-leading-spacing, 12px);
  padding-right: var(--%NS%mat-menu-item-trailing-spacing, 12px);
  -webkit-user-select: none;
  user-select: none;
  cursor: pointer;
  outline: none;
  border: none;
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-menu-item::-moz-focus-inner {
  border: 0;
}
[dir=rtl] .mat-mdc-menu-item {
  padding-left: var(--%NS%mat-menu-item-trailing-spacing, 12px);
  padding-right: var(--%NS%mat-menu-item-leading-spacing, 12px);
}
.mat-mdc-menu-item:has(.material-icons, mat-icon, [matButtonIcon]) {
  padding-left: var(--%NS%mat-menu-item-with-icon-leading-spacing, 12px);
  padding-right: var(--%NS%mat-menu-item-with-icon-trailing-spacing, 12px);
}
[dir=rtl] .mat-mdc-menu-item:has(.material-icons, mat-icon, [matButtonIcon]) {
  padding-left: var(--%NS%mat-menu-item-with-icon-trailing-spacing, 12px);
  padding-right: var(--%NS%mat-menu-item-with-icon-leading-spacing, 12px);
}
.mat-mdc-menu-item, .mat-mdc-menu-item:visited, .mat-mdc-menu-item:link {
  color: var(--%NS%mat-menu-item-label-text-color, var(--%NS%mat-sys-on-surface));
}
.mat-mdc-menu-item .mat-icon-no-color,
.mat-mdc-menu-item .mat-mdc-menu-submenu-icon {
  color: var(--%NS%mat-menu-item-icon-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-menu-item[disabled] {
  cursor: default;
  opacity: 0.38;
}
.mat-mdc-menu-item[disabled]::after {
  display: block;
  position: absolute;
  content: "";
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}
.mat-mdc-menu-item:focus {
  outline: 0;
}
.mat-mdc-menu-item .mat-icon {
  flex-shrink: 0;
  margin-right: var(--%NS%mat-menu-item-spacing, 12px);
  height: var(--%NS%mat-menu-item-icon-size, 24px);
  width: var(--%NS%mat-menu-item-icon-size, 24px);
}
[dir=rtl] .mat-mdc-menu-item {
  text-align: right;
}
[dir=rtl] .mat-mdc-menu-item .mat-icon {
  margin-right: 0;
  margin-left: var(--%NS%mat-menu-item-spacing, 12px);
}
.mat-mdc-menu-item:not([disabled]):hover {
  background-color: var(--%NS%mat-menu-item-hover-state-layer-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) calc(var(--%NS%mat-sys-hover-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-menu-item:not([disabled]).cdk-program-focused, .mat-mdc-menu-item:not([disabled]).cdk-keyboard-focused, .mat-mdc-menu-item:not([disabled]).mat-mdc-menu-item-highlighted {
  background-color: var(--%NS%mat-menu-item-focus-state-layer-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) calc(var(--%NS%mat-sys-focus-state-layer-opacity) * 100%), transparent));
}
@media (forced-colors: active) {
  .mat-mdc-menu-item {
    margin-top: 1px;
  }
}

.mat-mdc-menu-submenu-icon {
  width: var(--%NS%mat-menu-item-icon-size, 24px);
  height: 10px;
  fill: currentColor;
  padding-left: var(--%NS%mat-menu-item-spacing, 12px);
}
[dir=rtl] .mat-mdc-menu-submenu-icon {
  padding-right: var(--%NS%mat-menu-item-spacing, 12px);
  padding-left: 0;
}
[dir=rtl] .mat-mdc-menu-submenu-icon polygon {
  transform: scaleX(-1);
  transform-origin: center;
}
@media (forced-colors: active) {
  .mat-mdc-menu-submenu-icon {
    fill: CanvasText;
  }
}

.mat-mdc-menu-item .mat-mdc-menu-ripple {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
}
`],encapsulation:2})}return r})();var lr=new E(`mat-menu-scroll-strategy`,{providedIn:`root`,factory:()=>{let r=g(ee);return()=>ai(r)}});var Ne=new WeakMap;var dr=(()=>{class r{_canHaveBackdrop;_element=g(hn);_viewContainerRef=g(Kn$1);_menuItemInstance=g($e,{optional:!0,self:!0});_dir=g(uT,{optional:!0});_focusMonitor=g(ze);_ngZone=g(te$1);_injector=g(ee);_scrollStrategy=g(lr);_changeDetectorRef=g(ng);_animationsDisabled=j$1();_portal;_overlayRef=null;_menuOpen=!1;_closingActionsSubscription=Y.EMPTY;_menuCloseSubscription=Y.EMPTY;_pendingRemoval;_parentMaterialMenu;_parentInnerPadding;_openedBy=void 0;get _menu(){return this._menuInternal}set _menu(e){e!==this._menuInternal&&(this._menuInternal=e,this._menuCloseSubscription.unsubscribe(),e?(this._parentMaterialMenu,this._menuCloseSubscription=e.close.subscribe(i=>{this._destroyMenu(i),(i===`click`||i===`tab`)&&this._parentMaterialMenu&&this._parentMaterialMenu.closed.emit(i)})):this._destroyMenu(),this._menuItemInstance?._setTriggersSubmenu(this._triggersSubmenu()))}_menuInternal=null;constructor(e){this._canHaveBackdrop=e;let i=g(ui,{optional:!0});this._parentMaterialMenu=i instanceof Be?i:void 0}ngOnDestroy(){this._menu&&this._ownsMenu(this._menu)&&Ne.delete(this._menu),this._pendingRemoval?.unsubscribe(),this._menuCloseSubscription.unsubscribe(),this._closingActionsSubscription.unsubscribe(),this._overlayRef&&(this._overlayRef.dispose(),this._overlayRef=null)}get menuOpen(){return this._menuOpen}get dir(){return this._dir&&this._dir.value===`rtl`?`rtl`:`ltr`}_triggersSubmenu(){return!!(this._menuItemInstance&&this._parentMaterialMenu&&this._menu)}_closeMenu(){this._menu?.close.emit()}_openMenu(e){if(this._triggerIsAriaDisabled())return;let i=this._menu;if(this._menuOpen||!i)return;this._pendingRemoval?.unsubscribe();let n=Ne.get(i);Ne.set(i,this),n&&n!==this&&n._closeMenu();let o=this._createOverlay(i),s=o.getConfig(),l=s.positionStrategy;this._setPosition(i,l),this._canHaveBackdrop?s.hasBackdrop=i.hasBackdrop==null?!this._triggersSubmenu():i.hasBackdrop:s.hasBackdrop=i.hasBackdrop??!1,o.hasAttached()||(o.attach(this._getPortal(i)),i.lazyContent?.attach(this.menuData)),this._closingActionsSubscription=this._menuClosingActions().subscribe(()=>this._closeMenu()),i.parentMenu=this._triggersSubmenu()?this._parentMaterialMenu:void 0,i.direction=this.dir,e&&i.focusFirstItem(this._openedBy||`program`),this._setIsMenuOpen(!0),i instanceof Be&&(i._setIsOpen(!0),i._directDescendantItems.changes.pipe(xm(i.close)).subscribe(()=>{l.withLockedPosition(!1).reapplyLastPosition(),l.withLockedPosition(!0)}))}focus(e,i){this._focusMonitor&&e?this._focusMonitor.focusVia(this._element,e,i):this._element.nativeElement.focus(i)}_destroyMenu(e){let i=this._overlayRef,n=this._menu;!i||!this.menuOpen||(this._closingActionsSubscription.unsubscribe(),this._pendingRemoval?.unsubscribe(),n instanceof Be&&this._ownsMenu(n)?(this._pendingRemoval=n._animationDone.pipe(Ht(1)).subscribe(()=>{i.detach(),Ne.has(n)||n.lazyContent?.detach()}),n._setIsOpen(!1)):(i.detach(),n?.lazyContent?.detach()),n&&this._ownsMenu(n)&&Ne.delete(n),this.restoreFocus&&(e===`keydown`||!this._openedBy||!this._triggersSubmenu())&&this.focus(this._openedBy),this._openedBy=void 0,this._setIsMenuOpen(!1))}_setIsMenuOpen(e){e!==this._menuOpen&&(this._menuOpen=e,this._menuOpen?this.menuOpened.emit():this.menuClosed.emit(),this._triggersSubmenu()&&this._menuItemInstance._setHighlighted(e),this._changeDetectorRef.markForCheck())}_createOverlay(e){if(!this._overlayRef){let i=this._getOverlayConfig(e);this._subscribeToPositions(e,i.positionStrategy),this._overlayRef=ci(this._injector,i),this._overlayRef.keydownEvents().subscribe(n=>{this._menu instanceof Be&&this._menu._handleKeydown(n)})}return this._overlayRef}_getOverlayConfig(e){return new Ae({positionStrategy:di(this._injector,this._getOverlayOrigin()).withLockedPosition().withGrowAfterOpen().withTransformOriginOn(`.mat-menu-panel, .mat-mdc-menu-panel`),backdropClass:e.backdropClass||`cdk-overlay-transparent-backdrop`,panelClass:e.overlayPanelClass,scrollStrategy:this._scrollStrategy(),direction:this._dir||`ltr`,disableAnimations:this._animationsDisabled})}_subscribeToPositions(e,i){e.setPositionClasses&&i.positionChanges.subscribe(n=>{this._ngZone.run(()=>{let o=n.connectionPair.overlayX===`start`?`after`:`before`,s=n.connectionPair.overlayY===`top`?`below`:`above`;e.setPositionClasses(o,s)})})}_setPosition(e,i){let[n,o]=e.xPosition===`before`?[`end`,`start`]:[`start`,`end`],[s,l]=e.yPosition===`above`?[`bottom`,`top`]:[`top`,`bottom`],[d,g]=[s,l],[p,y]=[n,o],I=0;if(this._triggersSubmenu()){if(y=n=e.xPosition===`before`?`start`:`end`,o=p=n===`end`?`start`:`end`,this._parentMaterialMenu){if(this._parentInnerPadding==null){let ie=this._parentMaterialMenu.items.first;this._parentInnerPadding=ie?ie._getHostElement().offsetTop:0}I=s===`bottom`?this._parentInnerPadding:-this._parentInnerPadding}}else e.overlapTrigger||(d=s===`top`?`bottom`:`top`,g=l===`top`?`bottom`:`top`);i.withPositions([{originX:n,originY:d,overlayX:p,overlayY:s,offsetY:I},{originX:o,originY:d,overlayX:y,overlayY:s,offsetY:I},{originX:n,originY:g,overlayX:p,overlayY:l,offsetY:-I},{originX:o,originY:g,overlayX:y,overlayY:l,offsetY:-I}])}_menuClosingActions(){let e=this._getOutsideClickStream(this._overlayRef),i=this._overlayRef.detachments();return vm(e,this._parentMaterialMenu?this._parentMaterialMenu.closed:$s(),this._parentMaterialMenu?this._parentMaterialMenu._hovered().pipe(ht$1(s=>this._menuOpen&&s!==this._menuItemInstance)):$s(),i)}_getPortal(e){return(!this._portal||this._portal.templateRef!==e.templateRef)&&(this._portal=new Te(e.templateRef,this._viewContainerRef)),this._portal}_ownsMenu(e){return Ne.get(e)===this}_triggerIsAriaDisabled(){return oC(this._element.nativeElement.getAttribute(`aria-disabled`))}static ɵfac=function(i){DE()};static ɵdir=rs({type:r})}return r})();var In=(()=>{class r extends dr{_cleanupTouchstart;_hoverSubscription=Y.EMPTY;get _deprecatedMatMenuTriggerFor(){return this.menu}set _deprecatedMatMenuTriggerFor(e){this.menu=e}get menu(){return this._menu}set menu(e){this._menu=e}menuData;restoreFocus=!0;menuOpened=new Ce$1;onMenuOpen=this.menuOpened;menuClosed=new Ce$1;onMenuClose=this.menuClosed;constructor(){super(!0);let e=g(zr);this._cleanupTouchstart=e.listen(this._element.nativeElement,`touchstart`,i=>{R(i)||(this._openedBy=`touch`)},{passive:!0})}triggersSubmenu(){return super._triggersSubmenu()}toggleMenu(){return this.menuOpen?this.closeMenu():this.openMenu()}openMenu(){this._openMenu(!0)}closeMenu(){this._closeMenu()}updatePosition(){this._overlayRef?.updatePosition()}ngAfterContentInit(){this._handleHover()}ngOnDestroy(){super.ngOnDestroy(),this._cleanupTouchstart(),this._hoverSubscription.unsubscribe()}_getOverlayOrigin(){return this._element}_getOutsideClickStream(e){return e.backdropClick()}_handleMousedown(e){C(e)||(this._openedBy=e.button===0?`mouse`:void 0,this.triggersSubmenu()&&e.preventDefault())}_handleKeydown(e){let i=e.keyCode;(i===13||i===32)&&(this._openedBy=`keyboard`),this.triggersSubmenu()&&(i===39&&this.dir===`ltr`||i===37&&this.dir===`rtl`)&&(this._openedBy=`keyboard`,this.openMenu())}_handleClick(e){this.triggersSubmenu()?(e.stopPropagation(),this.openMenu()):this.toggleMenu()}_handleHover(){this.triggersSubmenu()&&this._parentMaterialMenu&&(this._hoverSubscription=this._parentMaterialMenu._hovered().subscribe(e=>{e===this._menuItemInstance&&!e.disabled&&this._parentMaterialMenu?._panelAnimationState!==`void`&&(this._openedBy=`mouse`,this._openMenu(!1))}))}static ɵfac=function(i){return new(i||r)};static ɵdir=rs({type:r,selectors:[[``,`mat-menu-trigger-for`,``],[``,`matMenuTriggerFor`,``]],hostAttrs:[1,`mat-mdc-menu-trigger`],hostVars:3,hostBindings:function(i,n){i&1&&wh(`click`,function(s){return n._handleClick(s)})(`mousedown`,function(s){return n._handleMousedown(s)})(`keydown`,function(s){return n._handleKeydown(s)}),i&2&&wu(`aria-haspopup`,n.menu?`menu`:null)(`aria-expanded`,n.menuOpen)(`aria-controls`,n.menuOpen?n.menu?.panelId:null)},inputs:{_deprecatedMatMenuTriggerFor:[0,`mat-menu-trigger-for`,`_deprecatedMatMenuTriggerFor`],menu:[0,`matMenuTriggerFor`,`menu`],menuData:[0,`matMenuTriggerData`,`menuData`],restoreFocus:[0,`matMenuTriggerRestoreFocus`,`restoreFocus`]},outputs:{menuOpened:`menuOpened`,onMenuOpen:`onMenuOpen`,menuClosed:`menuClosed`,onMenuClose:`onMenuClose`},exportAs:[`matMenuTrigger`],features:[lh]})}return r})();var cr=(r,t)=>t.value;function hr(r,t){if(r&1){let e=OI();zi(0,`button`,4),wh(`click`,function(){let n=gd(e).$implicit;return md(FI().updateScheme(n.value))}),zi(1,`span`,5)(2,`span`,6),lw(3),Tu(),yh(4,`mat-pseudo-checkbox`,7),Tu()()}if(r&2){let e=t.$implicit,i=FI();wD(3),Ph(e.label),wD(),mh(`state`,i.scheme()===e.value?`checked`:`unchecked`)}}var vt=class r{theming=g(Ot$1);scheme=_w(()=>this.theming.scheme());schemes=[{label:`Light`,value:`light`},{label:`Dark`,value:`dark`},{label:`System`,value:`system`}];updateScheme(t){this.theming.scheme.set(t)}static ɵfac=function(e){return new(e||r)};static ɵcmp=yu({type:r,selectors:[[`scheme-switcher`]],decls:6,vars:1,consts:[[`schemeMenu`,``],[`matIconButton`,``,3,`matMenuTriggerFor`],[`svgIcon`,`sun-moon`],[`mat-menu-item`,``],[`mat-menu-item`,``,3,`click`],[1,`flex`,`items-center`,`gap-x-1`],[1,`flex-auto`],[`appearance`,`minimal`,3,`state`]],template:function(e,i){if(e&1&&(zi(0,`button`,1),yh(1,`mat-icon`,2),Tu(),zi(2,`mat-menu`,null,0),_I(4,hr,5,2,`button`,3,cr),Tu()),e&2)mh(`matMenuTriggerFor`,UI(3)),wD(4),MI(i.schemes)},dependencies:[wt$1,Z,Be,$e,ro,In],encapsulation:2})};var u=(function(r){return r[r.None=0]=`None`,r[r.Ctrl=1]=`Ctrl`,r[r.Shift=2]=`Shift`,r[r.Alt=4]=`Alt`,r[r.Meta=8]=`Meta`,r.Any=`Any`,r})(u||{});var qe=class{configs=[];handle(t){for(let e of this.configs)e.matcher(t)&&(e.handler(t),e.preventDefault&&t.preventDefault(),e.stopPropagation&&t.stopPropagation())}};function ur(r){return(+r.ctrlKey&&u.Ctrl)|(+r.shiftKey&&u.Shift)|(+r.altKey&&u.Alt)|(+r.metaKey&&u.Meta)}function pi(r,t){let e=ur(r),i=Array.isArray(t)?t:[t];return i.includes(u.Any)?!0:i.some(n=>e===n)}var bt=class extends qe{options={ignoreRepeat:!0,preventDefault:!0,stopPropagation:!0};on(...t){let{modifiers:e,key:i,handler:n,options:o}=this._normalizeInputs(...t);return this.configs.push(P(P({handler:n,matcher:s=>this._isMatch(s,i,e,o)},this.options),o)),this}_normalizeInputs(...t){let e=Array.isArray(t[0])||u.hasOwnProperty(t[0]),i=e?t[0]:u.None;return{key:e?t[1]:t[0],handler:e?t[2]:t[1],modifiers:i,options:(e?t[3]:t[2])??{}}}_isMatch(t,e,i,n){return t.key==null||!pi(t,i)||t.repeat&&n?.ignoreRepeat!==!1?!1:e instanceof RegExp?e.test(t.key):(typeof e==`string`?e:e()).toLowerCase()===t.key.toLowerCase()}};function m(r){let t=fo(r);return t[$].debugName=``,t}function te(r){let[t,e,i]=_s(r);return t[$].debugName=``,Object.assign(t,{set:e,update:i,asReadonly:()=>t})}function mi(r,t){return(r.element.compareDocumentPosition(t.element)&Node.DOCUMENT_POSITION_PRECEDING)>0?1:-1}var wt=class{_items=xr$1(new Set);_version=xr$1(0);_observer;orderedItems=_w(()=>(this._version(),Array.from(this._items()).sort(mi)));register(t){this._items.update(e=>{let i=new Set(e);return i.add(t),i})}unregister(t){this._items.update(e=>{let i=new Set(e);return i.delete(t),i})}startObserving(t){this._observer&&this._observer.disconnect(),this._observer=new MutationObserver(e=>{e.some(n=>n.addedNodes.length||n.removedNodes.length)&&this._version.update(n=>n+1)}),this._observer.observe(t,{childList:!0,subtree:!0})}stopObserving(){this._observer?.disconnect(),this._observer=void 0}};var Ct=class{inputs;constructor(t){this.inputs=t}open(t){return!this.isExpandable(t)||t.expanded()?!1:(this.inputs.multiExpandable()||this.closeAll(),t.expanded.set(!0),!0)}close(t){return this.isExpandable(t)?(t.expanded.set(!1),!0):!1}toggle(t){return t.expanded()?this.close(t):this.open(t)}openAll(){if(this.inputs.multiExpandable())for(let t of this.inputs.items())this.open(t)}closeAll(){for(let t of this.inputs.items())this.close(t)}isExpandable(t){return!this.inputs.disabled()&&!t.disabled()&&t.expandable()}};var xt=class{inputs;prevActiveItem=te(void 0);prevActiveIndex=m(()=>this.prevActiveItem()?this.inputs.items().indexOf(this.prevActiveItem()):-1);activeIndex=m(()=>this.inputs.activeItem()?this.inputs.items().indexOf(this.inputs.activeItem()):-1);constructor(t){this.inputs=t}isListDisabled(){return this.inputs.disabled()||this.inputs.items().every(t=>t.disabled())}getActiveDescendant(){if(!this.isListDisabled()&&this.inputs.focusMode()!==`roving`)return this.inputs.activeItem()?.id()??void 0}getListTabIndex(){return this.isListDisabled()||this.inputs.focusMode()===`activedescendant`?0:-1}getItemTabIndex(t){return this.isListDisabled()||this.inputs.focusMode()===`activedescendant`?-1:this.inputs.activeItem()===t?0:-1}focus(t,e){return this.isListDisabled()||!this.isFocusable(t)?!1:(this.prevActiveItem.set(this.inputs.activeItem()),this.inputs.activeItem.set(t),(e?.focusElement||e?.focusElement===void 0)&&this.inputs.focusMode()===`roving`&&t.element()?.focus(),!0)}isFocusable(t){return!t.disabled()||this.inputs.softDisabled()}};var St=class{inputs;constructor(t){this.inputs=t}goto(t,e){return t?this.inputs.focusManager.focus(t,e):!1}next(t){return this._advance(1,t)}peekNext(t){return this._peek(1,t)}prev(t){return this._advance(-1,t)}peekPrev(t){return this._peek(-1,t)}first(t){let e=this.peekFirst(t);return e?this.goto(e,t):!1}last(t){let e=this.peekLast(t);return e?this.goto(e,t):!1}peekFirst(t){return(t?.items??this.inputs.items()).find(i=>this.inputs.focusManager.isFocusable(i))}peekLast(t){let e=t?.items??this.inputs.items();for(let i=e.length-1;i>=0;i--)if(this.inputs.focusManager.isFocusable(e[i]))return e[i]}_advance(t,e){let i=this._peek(t,e);return i?this.goto(i,e):!1}_peek(t,e){let i=e?.items??this.inputs.items(),n=i.length,o=this.inputs.focusManager.inputs.activeItem(),s=e?.items&&o?i.indexOf(o):this.inputs.focusManager.activeIndex(),l=d=>this.inputs.wrap()?(d+t+n)%n:d+t;for(let d=l(s);d!==s&&d<n&&d>=0;d=l(d))if(this.inputs.focusManager.isFocusable(i[d]))return i[d]}};var kt=class{inputs;rangeStartIndex=te(0);rangeEndIndex=te(0);selectedItems=m(()=>this.inputs.items().filter(t=>this.inputs.value().includes(t.value())));constructor(t){this.inputs=t}select(t,e={anchor:!0}){if(t=t??this.inputs.focusManager.inputs.activeItem(),!t||t.disabled()||!t.selectable()||!this.inputs.focusManager.isFocusable(t)||this.inputs.value().includes(t.value()))return;this.inputs.multi()||this.deselectAll();let i=this.inputs.items().findIndex(n=>n===t);e.anchor&&this.beginRangeSelection(i),this.inputs.value.update(n=>n.concat(t.value()))}deselect(t){t=t??this.inputs.focusManager.inputs.activeItem(),t&&!t.disabled()&&t.selectable()&&this.inputs.value.update(e=>e.filter(i=>i!==t.value()))}toggle(t){t=t??this.inputs.focusManager.inputs.activeItem(),t&&(this.inputs.value().includes(t.value())?this.deselect(t):this.select(t))}toggleOne(){let t=this.inputs.focusManager.inputs.activeItem();t&&(this.inputs.value().includes(t.value())?this.deselect():this.selectOne())}selectAll(){if(this.inputs.multi()){for(let t of this.inputs.items())this.select(t,{anchor:!1});this.beginRangeSelection()}}deselectAll(){for(let t of this.inputs.value()){let e=this.inputs.items().find(i=>i.value()===t);e?this.deselect(e):this.inputs.value.update(i=>i.filter(n=>n!==t))}}toggleAll(){this.inputs.items().filter(e=>!e.disabled()&&e.selectable()&&this.inputs.focusManager.isFocusable(e)).map(e=>e.value()).every(e=>this.inputs.value().includes(e))?this.deselectAll():this.selectAll()}selectOne(){let t=this.inputs.focusManager.inputs.activeItem();t&&(t.disabled()||!t.selectable())||(this.deselectAll(),!(this.inputs.value().length>0&&!this.inputs.multi())&&this.select())}selectRange(t={anchor:!0}){this.inputs.focusManager.prevActiveIndex()===this.rangeStartIndex()&&t.anchor&&this.beginRangeSelection(this.inputs.focusManager.prevActiveIndex());let i=this._getItemsFromIndex(this.rangeStartIndex()),n=this._getItemsFromIndex(this.rangeEndIndex()).filter(o=>!i.includes(o));for(let o of n)this.deselect(o);for(let o of i)this.select(o,{anchor:!1});if(i.length){let o=i.pop(),s=this.inputs.items().findIndex(l=>l===o);this.rangeEndIndex.set(s)}}beginRangeSelection(t=this.inputs.focusManager.activeIndex()){this.rangeStartIndex.set(t),this.rangeEndIndex.set(t)}_getItemsFromIndex(t){if(t===-1)return[];let e=Math.max(this.inputs.focusManager.activeIndex(),t),i=Math.min(this.inputs.focusManager.activeIndex(),t),n=[];for(let o=i;o<=e;o++)n.push(this.inputs.items()[o]);return this.inputs.focusManager.activeIndex()<t?n.reverse():n}};var Mt=class{inputs;timeout;focusManager;isTyping=m(()=>this._query().length>0);_query=te(``);_startIndex=te(void 0);constructor(t){this.inputs=t,this.focusManager=t.focusManager}search(t){if(t.length!==1||!this.isTyping()&&t===` `)return!1;this._startIndex()===void 0&&this._startIndex.set(this.focusManager.activeIndex()),clearTimeout(this.timeout),this._query.update(i=>i+t.toLowerCase());let e=this._getItem();return e&&this.focusManager.focus(e),this.timeout=setTimeout(()=>{this._query.set(``),this._startIndex.set(void 0)},this.inputs.typeaheadDelay()),!0}_getItem(){let t=this.focusManager.inputs.items(),e=t.length,i=this._startIndex();for(let n=0;n<e;n++){let s=t[(i+1+n)%e];if(this.focusManager.isFocusable(s)&&s.searchTerm().toLowerCase().startsWith(this._query()))return s}}};function pr(r){return r.detail===0||!r.pointerType}function mr(r){return!r.isTrusted}var Dt=class extends qe{options={preventDefault:!1,stopPropagation:!1};on(...t){let{handler:e,modifiers:i}=this._normalizeInputs(...t);return this.configs.push(P({handler:e,matcher:n=>this._isMatch(n,i)},this.options)),this}_normalizeInputs(...t){return t.length===2?{modifiers:t[0],handler:t[1]}:{modifiers:u.None,handler:t[0]}}_isMatch(t,e){return(mr(t)||!pr(t))&&pi(t,e)}};var fi=class extends xt{isFocusable(t){return super.isFocusable(t)&&t.visible()}};var _i=class{inputs;navigationBehavior;selectionBehavior;typeaheadBehavior;focusBehavior;expansionBehavior;disabled=m(()=>this.focusBehavior.isListDisabled());activeDescendant=m(()=>this.focusBehavior.getActiveDescendant());tabIndex=m(()=>this.focusBehavior.getListTabIndex());activeIndex=m(()=>this.focusBehavior.activeIndex());_anchorIndex=te(0);_wrap=te(!0);constructor(t){this.inputs=t,this.focusBehavior=new fi(t),this.selectionBehavior=new kt(U(P({},t),{focusManager:this.focusBehavior})),this.typeaheadBehavior=new Mt(U(P({},t),{focusManager:this.focusBehavior})),this.expansionBehavior=new Ct(t),this.navigationBehavior=new St(U(P({},t),{focusManager:this.focusBehavior,wrap:m(()=>this._wrap()&&this.inputs.wrap())}))}getItemTabindex(t){return this.focusBehavior.getItemTabIndex(t)}first(t){this._navigate(t,()=>this.navigationBehavior.first(t))}last(t){this._navigate(t,()=>this.navigationBehavior.last(t))}next(t){this._navigate(t,()=>this.navigationBehavior.next(t))}prev(t){this._navigate(t,()=>this.navigationBehavior.prev(t))}firstChild(t){this._navigate(t,()=>{let i=this.inputs.activeItem()?.children?.()??[];return this.navigationBehavior.first(P({items:i},t))})}lastChild(t){this._navigate(t,()=>{let i=this.inputs.activeItem()?.children?.()??[];return this.navigationBehavior.last(P({items:i},t))})}nextSibling(t){this._navigate(t,()=>{let i=this.inputs.activeItem()?.parent?.()?.children?.()??[];return this.navigationBehavior.next(P({items:i},t))})}prevSibling(t){this._navigate(t,()=>{let i=this.inputs.activeItem()?.parent?.()?.children?.()??[];return this.navigationBehavior.prev(P({items:i},t))})}parent(t){this._navigate(t,()=>this.navigationBehavior.goto(this.inputs.activeItem()?.parent?.(),t))}goto(t,e){this._navigate(e,()=>this.navigationBehavior.goto(t,e))}unfocus(){this.inputs.activeItem.set(void 0)}anchor(t){this._anchorIndex.set(t)}search(t,e){this._navigate(e,()=>this.typeaheadBehavior.search(t))}isTyping(){return this.typeaheadBehavior.isTyping()}select(t){this.selectionBehavior.select(t)}selectOne(){this.selectionBehavior.selectOne()}deselect(t){this.selectionBehavior.deselect(t)}deselectAll(){this.selectionBehavior.deselectAll()}toggle(t){this.selectionBehavior.toggle(t)}toggleOne(){this.selectionBehavior.toggleOne()}toggleAll(){this.selectionBehavior.toggleAll()}toggleExpansion(t){t??=this.inputs.activeItem(),!(!t||!this.isFocusable(t))&&this.isExpandable(t)&&this.expansionBehavior.toggle(t)}expand(t){this.isExpandable(t)&&this.expansionBehavior.open(t)}collapse(t){this.expansionBehavior.close(t)}expandSiblings(t){if(t??=this.inputs.activeItem(),!t)return;let e=t.parent?.();(e?e.children?.():this.inputs.items().filter(n=>!n.parent?.()))?.forEach(n=>this.expand(n))}expandAll(){this.expansionBehavior.openAll()}collapseAll(){this.expansionBehavior.closeAll()}isFocusable(t){return this.focusBehavior.isFocusable(t)}isExpandable(t){return this.expansionBehavior.isExpandable(t)}updateSelection(t={anchor:!0}){t.toggle&&this.selectionBehavior.toggle(),t.select&&this.selectionBehavior.select(),t.selectOne&&this.selectionBehavior.selectOne(),t.selectRange&&this.selectionBehavior.selectRange(),t.anchor||this.anchor(this.selectionBehavior.rangeStartIndex())}_navigate(t={},e){t?.selectRange&&(this._wrap.set(!1),this.selectionBehavior.rangeStartIndex.set(this._anchorIndex())),e()&&this.updateSelection(t),this._wrap.set(!0)}};var Rt=class r{inputs;id=()=>this.inputs.id();value=()=>this.inputs.value();element=()=>this.inputs.element();disabled=()=>this.inputs.disabled();searchTerm=()=>this.inputs.searchTerm();tree=()=>this.inputs.tree();parent=m(()=>{let t=this.inputs.parent();return t instanceof r?t:void 0});children=()=>this.inputs.children()??[];index=m(()=>this.tree().inputs.items().indexOf(this));expandable=()=>this.inputs.hasChildren();selectable=()=>this.inputs.selectable();expanded;level=m(()=>this.inputs.parent().level()+1);visible=m(()=>this.inputs.parent().expanded()&&this.inputs.parent().visible());setsize=m(()=>this.inputs.parent().children().length);posinset=m(()=>this.inputs.parent().children().indexOf(this)+1);active=m(()=>this.tree().activeItem()===this);tabIndex=m(()=>this.tree().treeBehavior.getItemTabindex(this));selected=m(()=>{if(!this.tree().nav()&&this.selectable())return this.tree().value().includes(this.value())});current=m(()=>{if(this.tree().nav()&&this.selectable())return this.tree().value().includes(this.value())?this.tree().currentType():void 0});constructor(t){this.inputs=t,this.expanded=t.expanded}};var Ot=class{inputs;treeBehavior;hasBeenInteracted=te(!1);level=()=>0;expanded=()=>!0;visible=()=>!0;tabIndex=m(()=>this.treeBehavior.tabIndex());activeDescendant=m(()=>this.treeBehavior.activeDescendant());children=m(()=>this.inputs.items().filter(t=>t.level()===this.level()+1));followFocus=m(()=>this.inputs.selectionMode()===`follow`);isRtl=m(()=>this.textDirection()===`rtl`);prevKey=m(()=>this.inputs.orientation()===`vertical`?`ArrowUp`:this.isRtl()?`ArrowRight`:`ArrowLeft`);nextKey=m(()=>this.inputs.orientation()===`vertical`?`ArrowDown`:this.isRtl()?`ArrowLeft`:`ArrowRight`);collapseKey=m(()=>this.inputs.orientation()===`horizontal`?`ArrowUp`:this.isRtl()?`ArrowRight`:`ArrowLeft`);expandKey=m(()=>this.inputs.orientation()===`horizontal`?`ArrowDown`:this.isRtl()?`ArrowLeft`:`ArrowRight`);dynamicSpaceKey=m(()=>this.treeBehavior.isTyping()?``:` `);typeaheadRegexp=/^.$/;keydown=m(()=>{let t=new bt,e=this.treeBehavior;return t.on(this.prevKey,()=>e.prev({selectOne:this.followFocus()}),{ignoreRepeat:!1}).on(this.nextKey,()=>e.next({selectOne:this.followFocus()}),{ignoreRepeat:!1}).on(`Home`,()=>e.first({selectOne:this.followFocus()})).on(`End`,()=>e.last({selectOne:this.followFocus()})).on(this.typeaheadRegexp,i=>e.search(i.key,{selectOne:this.followFocus()})).on(u.Shift,`*`,()=>e.expandSiblings()).on(this.expandKey,()=>this._expandOrFirstChild({selectOne:this.followFocus()})).on(this.collapseKey,()=>this._collapseOrParent({selectOne:this.followFocus()})),this.inputs.multi()&&t.on(u.Any,`Shift`,()=>e.anchor(this.treeBehavior.activeIndex())).on(u.Shift,this.prevKey,()=>e.prev({selectRange:!0}),{ignoreRepeat:!1}).on(u.Shift,this.nextKey,()=>e.next({selectRange:!0}),{ignoreRepeat:!1}).on([u.Ctrl|u.Shift,u.Meta|u.Shift],`Home`,()=>e.first({selectRange:!0,anchor:!1})).on([u.Ctrl|u.Shift,u.Meta|u.Shift],`End`,()=>e.last({selectRange:!0,anchor:!1})).on(u.Shift,`Enter`,()=>e.updateSelection({selectRange:!0,anchor:!1})).on(u.Shift,this.dynamicSpaceKey,()=>e.updateSelection({selectRange:!0,anchor:!1})),!this.followFocus()&&this.inputs.multi()&&t.on(this.dynamicSpaceKey,()=>e.toggle()).on(`Enter`,()=>e.toggle(),{preventDefault:!this.nav()}).on([u.Ctrl,u.Meta],`A`,()=>e.toggleAll()),!this.followFocus()&&!this.inputs.multi()&&(t.on(this.dynamicSpaceKey,()=>e.selectOne()),t.on(`Enter`,()=>e.selectOne(),{preventDefault:!this.nav()})),this.inputs.multi()&&this.followFocus()&&t.on([u.Ctrl,u.Meta],this.prevKey,()=>e.prev(),{ignoreRepeat:!1}).on([u.Ctrl,u.Meta],this.nextKey,()=>e.next(),{ignoreRepeat:!1}).on([u.Ctrl,u.Meta],this.expandKey,()=>this._expandOrFirstChild()).on([u.Ctrl,u.Meta],this.collapseKey,()=>this._collapseOrParent()).on([u.Ctrl,u.Meta],` `,()=>e.toggle()).on([u.Ctrl,u.Meta],`Enter`,()=>e.toggle()).on([u.Ctrl,u.Meta],`Home`,()=>e.first()).on([u.Ctrl,u.Meta],`End`,()=>e.last()).on([u.Ctrl,u.Meta],`A`,()=>{e.toggleAll(),e.select()}),t});clickManager=m(()=>{let t=new Dt;return this.multi()&&t.on(u.Shift,e=>this.goto(e,{selectRange:!0})),this.multi()?this.multi()&&this.followFocus()?t.on(e=>this.goto(e,{selectOne:!0})).on(u.Ctrl,e=>this.goto(e,{toggle:!0})):this.multi()&&!this.followFocus()?t.on(e=>this.goto(e,{toggle:!0})):t:t.on(e=>this.goto(e,{selectOne:!0}))});id=()=>this.inputs.id();element=()=>this.inputs.element();nav=()=>this.inputs.nav();currentType=()=>this.inputs.currentType();items=()=>this.inputs.items();focusMode=()=>this.inputs.focusMode();disabled=()=>this.inputs.disabled();activeItem;softDisabled=()=>this.inputs.softDisabled();wrap=()=>this.inputs.wrap();orientation=()=>this.inputs.orientation();textDirection=()=>this.inputs.textDirection();multi=m(()=>this.nav()?!1:this.inputs.multi());selectionMode=()=>this.inputs.selectionMode();typeaheadDelay=()=>this.inputs.typeaheadDelay();value;constructor(t){this.inputs=t,this.activeItem=t.activeItem,this.value=t.value,this.treeBehavior=new _i(U(P({},t),{multi:this.multi,multiExpandable:()=>!0}))}validate(){let t=[];!this.inputs.multi()&&this.inputs.value().length>1&&t.push(`A single-select tree should not have multiple selected options. Selected options: ${this.inputs.value().join(`, `)}`);let e=this.inputs.items().map(n=>n.value()),i=e.filter((n,o)=>e.indexOf(n)!==o);return i.length>0&&t.push(`Duplicate tree item value '${i[0]}' detected inside ngTree.`),t}setDefaultState(){let t;for(let e of this.inputs.items())if(e.visible()&&this.treeBehavior.isFocusable(e)&&(t===void 0&&(t=e),e.selected())){this.activeItem.set(e);return}t!==void 0&&this.activeItem.set(t)}setDefaultStateEffect(){this.hasBeenInteracted()||this.setDefaultState()}onKeydown(t){this.disabled()||(this.hasBeenInteracted.set(!0),this.keydown().handle(t))}onClick(t){this.disabled()||(this.hasBeenInteracted.set(!0),this.clickManager().handle(t))}onFocusIn(){this.hasBeenInteracted.set(!0)}goto(t,e){let i=this._getItem(t);i&&(this.treeBehavior.goto(i,e),this.treeBehavior.toggleExpansion(i))}_expandOrFirstChild(t){let e=this.treeBehavior.inputs.activeItem();e&&this.treeBehavior.isExpandable(e)&&!e.expanded()?this.treeBehavior.expand(e):this.treeBehavior.firstChild(t)}_collapseOrParent(t){let e=this.treeBehavior.inputs.activeItem();e&&this.treeBehavior.isExpandable(e)&&e.expanded()?this.treeBehavior.collapse(e):this.treeBehavior.parent(t)}_getItem(t){if(!t.target)return;let e=t.target.closest(`[role="treeitem"]`);return this.inputs.items().find(i=>i.element()===e)}};function Tn(r){return r===void 0?void 0:iC(r)}var gi=(()=>{class r{contentVisible=xr$1(!1);preserveContent=jL(!1);static ɵfac=function(i){return new(i||r)};static ɵdir=rs({type:r,inputs:{preserveContent:[1,`preserveContent`]},outputs:{preserveContent:`preserveContentChange`}})}return r})();var vi=(()=>{class r{_deferredContentAware=g(gi,{optional:!0});_templateRef=g(Gn$1);_viewContainerRef=g(Kn$1);_currentViewRef=null;_isRendered=!1;deferredContentAware=xr$1(this._deferredContentAware);constructor(){VL({write:()=>{this.deferredContentAware()?.contentVisible()?this._isRendered||(this._destroyContent(),this._currentViewRef=this._viewContainerRef.createEmbeddedView(this._templateRef),this._isRendered=!0):this.deferredContentAware()?.preserveContent()||(this._destroyContent(),this._isRendered=!1)}})}ngOnDestroy(){this._destroyContent()}_destroyContent(){let e=this._currentViewRef;e&&!e.destroyed&&(e.destroy(),this._currentViewRef=null)}static ɵfac=function(i){return new(i||r)};static ɵdir=rs({type:r})}return r})();var Et=(()=>{class r{_elementRef=g(hn);element=this._elementRef.nativeElement;_collection=new wt;id=LL(g(ae).getId(`ng-tree-`,!0));orientation=LL(`vertical`);multi=LL(!1,{transform:oC});disabled=LL(!1,{transform:oC});selectionMode=LL(`explicit`);focusMode=LL(`roving`);wrap=LL(!0,{transform:oC});softDisabled=LL(!0,{transform:oC});typeaheadDelay=LL(500);tabIndex=LL(void 0,{alias:`tabindex`,transform:Tn});value=jL([]);textDirection=g(uT).valueSignal;nav=LL(!1,{transform:oC});currentType=LL(`page`);_pattern;activeDescendant;constructor(){let e=U(P({},this),{id:this.id,items:_w(()=>this._collection.orderedItems().map(i=>i._pattern)),activeItem:xr$1(void 0),element:()=>this.element});this._pattern=new Ot(e),this.activeDescendant=_w(()=>this._pattern.activeDescendant()),Kv(()=>{this._collection.startObserving(this.element)}),VL({write:()=>this._pattern.setDefaultStateEffect()}),VL({write:()=>{let i=e.items(),n=Jn(()=>e.activeItem());n&&!i.some(o=>o===n)&&(this._pattern.treeBehavior.unfocus(),this._pattern.setDefaultState())}})}ngOnDestroy(){this._collection.stopObserving()}scrollActiveItemIntoView(e={block:`nearest`}){this._pattern.inputs.activeItem()?.element()?.scrollIntoView(e)}static ɵfac=function(i){return new(i||r)};static ɵdir=rs({type:r,selectors:[[``,`ngTree`,``]],hostAttrs:[`role`,`tree`],hostVars:6,hostBindings:function(i,n){i&1&&wh(`keydown`,function(s){return n._pattern.onKeydown(s)})(`click`,function(s){return n._pattern.onClick(s)})(`focusin`,function(){return n._pattern.onFocusIn()}),i&2&&(Eh(`tabIndex`,n.tabIndex()!==void 0?n.tabIndex():n._pattern.tabIndex()),wu(`id`,n.id())(`aria-orientation`,n._pattern.orientation())(`aria-multiselectable`,n._pattern.multi())(`aria-disabled`,n._pattern.disabled())(`aria-activedescendant`,n._pattern.activeDescendant()))},inputs:{id:[1,`id`],orientation:[1,`orientation`],multi:[1,`multi`],disabled:[1,`disabled`],selectionMode:[1,`selectionMode`],focusMode:[1,`focusMode`],wrap:[1,`wrap`],softDisabled:[1,`softDisabled`],typeaheadDelay:[1,`typeaheadDelay`],tabIndex:[1,`tabindex`,`tabIndex`],value:[1,`value`],nav:[1,`nav`],currentType:[1,`currentType`]},outputs:{value:`valueChange`},exportAs:[`ngTree`]})}return r})();var Pt=(()=>{class r{_elementRef=g(hn);element=this._elementRef.nativeElement;_deferredContent=g(vi);_unorderedItems=xr$1(new Set);_childPatterns=_w(()=>[...this._unorderedItems()].sort(mi).map(e=>e._pattern));ownedBy=LL.required();ngOnInit(){this._deferredContent.deferredContentAware.set(this.ownedBy()),this.ownedBy()._register(this)}ngOnDestroy(){this.ownedBy()._unregister()}_register(e){this._unorderedItems().add(e),this._unorderedItems.set(new Set(this._unorderedItems()))}_unregister(e){this._unorderedItems().delete(e),this._unorderedItems.set(new Set(this._unorderedItems()))}static ɵfac=function(i){return new(i||r)};static ɵdir=rs({type:r,selectors:[[`ng-template`,`ngTreeItemGroup`,``]],inputs:{ownedBy:[1,`ownedBy`]},exportAs:[`ngTreeItemGroup`],features:[lI([vi])]})}return r})();var An=(()=>{class r extends gi{_elementRef=g(hn);element=this._elementRef.nativeElement;_group=xr$1(void 0);id=LL(g(ae).getId(`ng-tree-item-`,!0));value=LL.required();parent=LL.required();disabled=LL(!1,{transform:oC});selectable=LL(!0);expanded=jL(!1);label=LL();searchTerm=_w(()=>this.label()??this.element.textContent);tree=_w(()=>this.parent()instanceof Et?this.parent():this.parent().ownedBy().tree());active=_w(()=>this._pattern.active());level=_w(()=>this._pattern.level());selected=_w(()=>this._pattern.selected());visible=_w(()=>this._pattern.visible());_expanded=_w(()=>this._pattern.expandable()?this._pattern.expanded():void 0);_pattern;constructor(){super(),VL({write:()=>{this.contentVisible.set(this._pattern.expanded())}})}ngOnInit(){this.parent()instanceof Pt&&this.parent()._register(this),this.tree()._collection.register(this);let e=_w(()=>this.tree()._pattern),i=_w(()=>this.parent()instanceof Et?e():this.parent().ownedBy()._pattern);this._pattern=new Rt(U(P({},this),{tree:e,parent:i,children:_w(()=>this._group()?._childPatterns()),hasChildren:_w(()=>!!this._group()),element:()=>this.element,searchTerm:()=>this.searchTerm()??``}))}ngOnDestroy(){this.parent()instanceof Pt&&this.parent()._unregister(this),this.tree()._collection.unregister(this)}_register(e){this._group.set(e)}_unregister(){this._group.set(void 0)}static ɵfac=function(i){return new(i||r)};static ɵdir=rs({type:r,selectors:[[``,`ngTreeItem`,``]],hostAttrs:[`role`,`treeitem`],hostVars:10,hostBindings:function(i,n){i&2&&(Eh(`id`,n._pattern.id()),wu(`data-active`,n.active())(`aria-expanded`,n._expanded())(`aria-selected`,n.selected())(`aria-current`,n._pattern.current())(`aria-disabled`,n._pattern.disabled())(`aria-level`,n.level())(`aria-setsize`,n._pattern.setsize())(`aria-posinset`,n._pattern.posinset())(`tabindex`,n._pattern.tabIndex()))},inputs:{id:[1,`id`],value:[1,`value`],parent:[1,`parent`],disabled:[1,`disabled`],selectable:[1,`selectable`],expanded:[1,`expanded`],label:[1,`label`]},outputs:{expanded:`expandedChange`},exportAs:[`ngTreeItem`],features:[lh]})}return r})();var It=[{id:`main`,label:`Control plane`,children:[{id:`overview`,label:`Overview`,icon:`activity`,route:`/overview`}]},{id:`runtime`,label:`Runtime`,description:`Planner, execution, models`,children:[{id:`runtime/planner`,label:`Planner & defaults`,icon:`cpu`,route:`/runtime/planner`},{id:`runtime/execution`,label:`Execution`,icon:`server`,route:`/runtime/execution`},{id:`runtime/models`,label:`Models & hardware`,icon:`microchip`,route:`/runtime/models`}]},{id:`configuration`,label:`Configuration`,children:[{id:`catalogs`,label:`Catalogs`,icon:`layers`,route:`/catalogs`,activeOptions:{exact:!1}},{id:`memory`,label:`Memory & quality`,icon:`database`,route:`/memory`},{id:`security`,label:`Access & security`,icon:`shield`,route:`/security`},{id:`integrations`,label:`Integrations`,icon:`plug`,route:`/integrations`}]},{id:`operations`,label:`Operations`,children:[{id:`deployments`,label:`Deployments`,icon:`rocket`,route:`/deployments`},{id:`data`,label:`Data & storage`,icon:`hard-drive`,route:`/data`},{id:`audit`,label:`Audit`,icon:`scroll-text`,route:`/audit`},{id:`advanced`,label:`Advanced`,icon:`sliders-horizontal`,route:`/advanced`},{id:`changes`,label:`Change set`,icon:`git-compare`,route:`/changes`}]}];var Nn=(r,t)=>({nodes:r,parent:t});var fr=()=>({exact:!0});var Bn=(r,t)=>t.id;function _r(r,t){if(r&1&&(zi(0,`div`,7),lw(1),Tu()),r&2){let e=FI().$implicit;wD(),_u(` `,e.description,` `)}}function gr(r,t){}function vr(r,t){if(r&1&&yh(0,`mat-icon`,11),r&2){let e=FI().$implicit;mh(`svgIcon`,e.icon)}}function yr(r,t){if(r&1&&(zi(0,`div`,13),lw(1),Tu()),r&2){let e=FI().$implicit;wD(),_u(` `,e.description,` `)}}function br(r,t){if(r&1&&(zi(0,`div`,14),lw(1),Tu()),r&2){let e=FI().$implicit;wD(),_u(` `,e.badge,` `)}}function wr(r,t){if(r&1&&yh(0,`mat-icon`,17),r&2){let e=FI().$implicit;xh(`rotate-90`,e.expanded)}}function Cr(r,t){}function xr(r,t){if(r&1&&fh(0,Cr,0,0,`ng-template`,9),r&2){FI();let e=UI(2),i=FI().$implicit;FI(2);mh(`ngTemplateOutlet`,UI(8))(`ngTemplateOutletContext`,Ew(2,Nn,i.children,e))}}function Sr(r,t){if(r&1&&(zi(0,`ul`,18),fh(1,xr,1,5,`ng-template`,19,3,Cw),Tu()),r&2){let e=FI().$implicit,i=UI(2);xh(`hidden`,!e.expanded)(`mt-1`,e.expanded),wD(),mh(`ownedBy`,i)}}function kr(r,t){if(r&1){let e=OI();zi(0,`a`,10,2),jh(`expandedChange`,function(n){let o=gd(e).$implicit;return hw(o.expanded,n)||(o.expanded=n),md(n)}),wh(`click`,function(n){return n.preventDefault()}),bI(3,vr,1,1,`mat-icon`,11),zi(4,`div`,12),lw(5),bI(6,yr,2,1,`div`,13),Tu(),bI(7,br,2,1,`div`,14),bI(8,wr,1,2,`mat-icon`,15),Tu(),bI(9,Sr,3,5,`ul`,16)}if(r&2){let e=t.$implicit,i=FI().parent;mh(`parent`,i)(`value`,e.id)(`label`,e.label)(`disabled`,e.disabled)(`selectable`,!e.children),Lh(`expanded`,e.expanded),mh(`routerLink`,e.route)(`routerLinkActiveOptions`,e.activeOptions??vw(14,fr)),wD(3),SI(e.icon?3:-1),wD(2),_u(` `,e.label,` `),wD(),SI(e.description?6:-1),wD(),SI(e.badge?7:-1),wD(),SI(e.children&&e.children.length>0?8:-1),wD(),SI(e.children&&e.children.length>0?9:-1)}}function Mr(r,t){if(r&1&&_I(0,kr,10,15,null,null,Bn),r&2){let e=t.nodes;MI(e)}}function Dr(r,t){if(r&1&&(zi(0,`div`,5)(1,`div`,6),lw(2),bI(3,_r,2,1,`div`,7),Tu(),zi(4,`ul`,8,0),fh(6,gr,0,0,`ng-template`,9),Tu(),fh(7,Mr,2,0,`ng-template`,null,1,Cw),Tu()),r&2){let e=t.$implicit,i=UI(5),n=UI(8);wD(2),_u(` `,e.label,` `),wD(),SI(e.description?3:-1),wD(),mh(`nav`,!0),wD(2),mh(`ngTemplateOutlet`,n)(`ngTemplateOutletContext`,Ew(5,Nn,e.children,i))}}var Tt=class r{router=g(ue);navigation=xr$1(It);navigationEnd=Ph$1(this.router.events.pipe(ht$1(t=>t instanceof k),Ht(1)));constructor(){Pd(()=>{this.navigationEnd()&&this.navigation.set(this.expandActiveRoute(this.navigation()))})}expandActiveRoute(t){for(let e of t)e.children?.length&&(e.children=this.expandActiveRoute(e.children),e.children.some(i=>i.expanded)&&(e.expanded=!0)),e.route&&ur$1(e.route,this.router,this.isActiveOption(e.activeOptions??{exact:!0}))()&&(e.expanded=!0);return t}isActiveOption(t){return`exact`in t?t.exact?{paths:`exact`,queryParams:`exact`,fragment:`ignored`,matrixParams:`ignored`}:{paths:`subset`,queryParams:`subset`,fragment:`ignored`,matrixParams:`ignored`}:t}static ɵfac=function(e){return new(e||r)};static ɵcmp=yu({type:r,selectors:[[`navigation`]],decls:3,vars:0,consts:[[`tree`,`ngTree`],[`treeNodes`,``],[`rla`,`routerLinkActive`,`treeItem`,`ngTreeItem`],[`group`,`ngTreeItemGroup`],[1,`flex`,`flex-col`,`gap-y-4`],[1,`flex`,`flex-col`,`px-4`],[1,`px-2.5`,`py-1.5`,`text-sm`,`font-semibold`,`text-blue-400`],[1,`text-xs`,`font-medium`,`text-neutral-400`],[`ngTree`,``,1,`mt-1`,`flex`,`flex-col`,`gap-y-1`,3,`nav`],[3,`ngTemplateOutlet`,`ngTemplateOutletContext`],[`cdkMonitorElementFocus`,``,`ngTreeItem`,``,`routerLinkActive`,`bg-neutral-700/10 dark:bg-neutral-300/10`,1,`navigation-item`,`flex`,`cursor-pointer`,`items-center`,`gap-x-2`,`rounded-lg`,`px-2.5`,`py-2`,`select-none`,`hover:bg-neutral-700/10`,`dark:hover:bg-neutral-300/10`,3,`expandedChange`,`click`,`parent`,`value`,`label`,`disabled`,`selectable`,`expanded`,`routerLink`,`routerLinkActiveOptions`],[1,`pointer-events-none`,`size-4`,3,`svgIcon`],[1,`flex`,`flex-auto`,`flex-col`,`font-medium`],[1,`text-xs`],[1,`rounded`,`bg-pink-400`,`px-1.5`,`py-0.5`,`text-xs`,`font-semibold`,`dark:bg-pink-700`],[`svgIcon`,`chevron-right`,1,`pointer-events-none`,`size-4`,`transition-[rotate]`,3,`rotate-90`],[`role`,`group`,1,`flex`,`flex-col`,`gap-y-1`,`[&_ul>.navigation-item]:pl-14.5`,`[&>.navigation-item]:pl-8.5`,3,`hidden`,`mt-1`],[`svgIcon`,`chevron-right`,1,`pointer-events-none`,`size-4`,`transition-[rotate]`],[`role`,`group`,1,`flex`,`flex-col`,`gap-y-1`,`[&_ul>.navigation-item]:pl-14.5`,`[&>.navigation-item]:pl-8.5`],[`ngTreeItemGroup`,``,3,`ownedBy`]],template:function(e,i){e&1&&(zi(0,`div`,4),_I(1,Dr,9,8,`div`,5,Bn),Tu()),e&2&&(wD(),MI(i.navigation()))},dependencies:[wt$1,fC,No,Et,An,Pt,Dt$1,ut$1],encapsulation:2})};var At=class r{static ɵfac=function(e){return new(e||r)};static ɵcmp=yu({type:r,selectors:[[`admin-sidebar`]],hostAttrs:[1,`flex`,`w-full`,`flex-auto`,`flex-col`],decls:20,vars:0,consts:[[1,`relative`,`flex`,`items-center`,`gap-x-2.5`,`px-6`,`pt-5`,`pb-0`],[1,`flex`,`size-8`,`items-center`,`justify-center`,`rounded-md`,`bg-primary-600`,`text-sm`,`font-bold`,`text-white`],[1,`flex`,`flex-col`],[1,`text-on-surface`,`text-lg`,`leading-none`,`font-bold`,`tracking-wider`],[1,`font-mono`,`text-2xs`,`leading-3`,`font-medium`,`tracking-tighter`,`text-neutral-500`],[1,`mt-8`,`mb-4`,`flex-auto`],[1,`m-4`,`rounded-lg`,`border`,`border-neutral-800`,`p-3`,`text-xs`,`text-neutral-500`],[`href`,`/`,1,`font-mono`,`text-primary-400`,`hover:underline`],[1,`font-mono`,`text-neutral-300`],[1,`font-mono`,`text-amber-400`]],template:function(e,i){e&1&&(zi(0,`div`,0)(1,`div`,1),lw(2,` AO `),Tu(),zi(3,`div`,2)(4,`div`,3),lw(5,` AO Admin `),Tu(),zi(6,`div`,4),lw(7,` Control Plane · Phase 0 `),Tu()()(),yh(8,`navigation`,5),zi(9,`div`,6),lw(10,` Chat UI stays at `),zi(11,`a`,7),lw(12,`/`),Tu(),lw(13,`. Reach uses engine `),zi(14,`span`,8),lw(15,`:8765`),Tu(),lw(16,`, never `),zi(17,`span`,9),lw(18,`:30487`),Tu(),lw(19,`. `),Tu())},dependencies:[Tt],encapsulation:2})};var Rr=(r,t)=>t.label+t.route+t.detail;function Or(r,t){if(r&1){let e=OI();zi(0,`button`,7),wh(`click`,function(){let n=gd(e).$implicit;return md(FI(2).go(n))}),zi(1,`span`,8),lw(2),Tu(),zi(3,`span`,9),lw(4),Tu()()}if(r&2){let e=t.$implicit;wD(2),Ph(e.label),wD(2),Ph(e.detail)}}function Er(r,t){r&1&&(zi(0,`div`,6),lw(1,`No matches`),Tu())}function Pr(r,t){if(r&1){let e=OI();zi(0,`div`,1),wh(`click`,function(){gd(e);return md(FI().close())}),zi(1,`div`,2),wh(`click`,function(n){return n.stopPropagation()}),zi(2,`input`,3),wh(`ngModelChange`,function(n){gd(e);return md(FI().query.set(n))}),Tu(),dE(),zi(3,`div`,4),_I(4,Or,5,2,`button`,5,Rr,!1,Er,2,0,`div`,6),Tu()()()}if(r&2){let e=FI();wD(2),mh(`ngModel`,e.query()),pE(),wD(2),MI(e.hits())}}var Nt=class r{router=g(ue);config=g(c);visible=xr$1(!1);query=xr$1(``);hits=_w(()=>{let t=this.query().trim().toLowerCase(),e=[];for(let i of this.flattenNav(It))(!t||i.label.toLowerCase().includes(t)||i.detail.toLowerCase().includes(t))&&e.push(i);if(t)for(let i of this.config.entries())(i.key.toLowerCase().includes(t)||String(i.label||``).toLowerCase().includes(t))&&e.push({kind:`config`,label:i.label||i.key,detail:i.key,route:this.routeForGroup(i.group),flash:i.key});return e.slice(0,40)});onKey(t){(t.metaKey||t.ctrlKey)&&t.key.toLowerCase()===`k`&&(t.preventDefault(),this.visible.update(e=>!e)),t.key===`Escape`&&this.close()}open(){this.visible.set(!0)}close(){this.visible.set(!1),this.query.set(``)}go(t){let e=t.flash?`${t.route}?flash=${encodeURIComponent(t.flash)}`:t.route;this.router.navigateByUrl(e),this.close()}flattenNav(t,e=[]){for(let i of t)i.route&&e.push({kind:`nav`,label:i.label,detail:i.route,route:i.route}),i.children&&this.flattenNav(i.children,e);return e}routeForGroup(t){switch(t){case`planner`:return`/runtime/planner`;case`execution`:case`engine`:return`/runtime/execution`;case`models`:return`/runtime/models`;case`memory`:return`/memory`;case`security`:return`/security`;case`integrations`:return`/integrations`;case`deployments`:return`/deployments`;default:return`/advanced`}}static ɵfac=function(e){return new(e||r)};static ɵcmp=yu({type:r,selectors:[[`ao-command-palette`]],hostBindings:function(e,i){e&1&&wh(`keydown`,function(o){return i.onKey(o)},kv)},decls:1,vars:1,consts:[[1,`fixed`,`inset-0`,`z-50`,`flex`,`items-start`,`justify-center`,`bg-black/60`,`p-4`,`pt-[12vh]`],[1,`fixed`,`inset-0`,`z-50`,`flex`,`items-start`,`justify-center`,`bg-black/60`,`p-4`,`pt-[12vh]`,3,`click`],[1,`w-full`,`max-w-xl`,`overflow-hidden`,`rounded-lg`,`border`,`border-neutral-700`,`bg-neutral-900`,`shadow-2xl`,3,`click`],[`placeholder`,`Search settings, catalogs, pages…`,`autofocus`,``,1,`w-full`,`border-b`,`border-neutral-800`,`bg-transparent`,`px-4`,`py-3`,`font-mono`,`text-sm`,`outline-none`,3,`ngModelChange`,`ngModel`],[1,`max-h-80`,`overflow-auto`,`py-1`],[`type`,`button`,1,`flex`,`w-full`,`flex-col`,`items-start`,`gap-0.5`,`px-4`,`py-2`,`text-left`,`hover:bg-neutral-800`],[1,`px-4`,`py-6`,`text-sm`,`text-neutral-500`],[`type`,`button`,1,`flex`,`w-full`,`flex-col`,`items-start`,`gap-0.5`,`px-4`,`py-2`,`text-left`,`hover:bg-neutral-800`,3,`click`],[1,`text-sm`],[1,`font-mono`,`text-2xs`,`text-neutral-500`]],template:function(e,i){e&1&&bI(0,Pr,7,2,`div`,0),e&2&&SI(i.visible()?0:-1)},dependencies:[Zt,De,$t,bt$1],encapsulation:2})};var Il=[{path:``,component:class r{media=g(zt);isMobile=_w(()=>this.media.match(`(max-width: 1023px)`)());openChat(){window.location.href=`/`}static ɵfac=function(e){return new(e||r)};static ɵcmp=yu({type:r,selectors:[[`admin-layout`]],decls:21,vars:3,consts:[[`sidenav`,`matSidenav`],[`palette`,``],[1,`min-h-dvh`,`bg-neutral-100`,`scheme-dark:bg-neutral-950`],[`fixedInViewport`,``,1,`w-70`,`border-r`,`border-neutral-200`,`bg-white`,`scheme-dark:border-neutral-800`,`scheme-dark:bg-neutral-900`,3,`mode`,`opened`,`disableClose`],[1,`flex`,`flex-col`,`lg:h-dvh`,`lg:overflow-hidden`],[1,`flex`,`items-center`,`gap-3`,`border-b`,`border-neutral-200`,`px-4`,`py-2.5`,`scheme-dark:border-neutral-800`],[`matIconButton`,``,`type`,`button`,`aria-label`,`Toggle navigation`,3,`click`],[`svgIcon`,`panel-left`],[1,`mx-1`,`h-5`,`border-l`,`border-neutral-300`,`scheme-dark:border-neutral-700`],[`type`,`button`,1,`rounded-md`,`border`,`border-neutral-300`,`px-2.5`,`py-1`,`font-mono`,`text-xs`,`text-neutral-500`,`hover:bg-neutral-100`,`scheme-dark:border-neutral-700`,`scheme-dark:hover:bg-neutral-800`,3,`click`],[1,`flex-auto`],[1,`rounded-md`,`border`,`border-amber-500/40`,`bg-amber-500/10`,`px-2`,`py-0.5`,`text-xs`,`font-medium`,`text-amber-600`,`scheme-dark:text-amber-400`],[`routerLink`,`/overview`,`href`,`/`,1,`text-xs`,`text-neutral-500`,`hover:text-neutral-900`,`scheme-dark:hover:text-white`,3,`click`],[1,`flex`,`flex-col`,`lg:min-h-0`,`lg:flex-auto`,`lg:overflow-auto`]],template:function(e,i){if(e&1){let n=OI();zi(0,`mat-sidenav-container`,2)(1,`mat-sidenav`,3,0),yh(3,`admin-sidebar`),Tu(),zi(4,`mat-sidenav-content`,4)(5,`div`,5)(6,`button`,6),wh(`click`,function(){gd(n);return md(UI(2).toggle())}),yh(7,`mat-icon`,7),Tu(),yh(8,`div`,8),zi(9,`button`,9),wh(`click`,function(){gd(n);return md(UI(20).open())}),lw(10,` ⌘K Search `),Tu(),yh(11,`div`,10),zi(12,`span`,11),lw(13,` Read-only — no admin write API `),Tu(),zi(14,`a`,12),wh(`click`,function(s){return gd(n),s.preventDefault(),md(i.openChat())}),lw(15,` Open chat `),Tu(),yh(16,`scheme-switcher`),Tu(),zi(17,`div`,13),yh(18,`router-outlet`),Tu()()(),yh(19,`ao-command-palette`,null,1)}e&2&&(wD(),mh(`mode`,i.isMobile()?`over`:`side`)(`opened`,!i.isMobile())(`disableClose`,!i.isMobile()))},dependencies:[yt,wt$1,lt$1,Z,dr$1,Dt$1,vn,ti,ct,At,vt,Nt],encapsulation:2})},children:[{path:``,pathMatch:`full`,redirectTo:`overview`},{path:`overview`,loadComponent:()=>import(`./chunk-DVePuZg-.js`).then(r=>r.OverviewPage)},{path:`runtime/planner`,loadComponent:()=>import(`./chunk-2d-3Eo3r.js`).then(r=>r.PlannerPage)},{path:`runtime/execution`,loadComponent:()=>import(`./chunk-CMFaQIKY.js`).then(r=>r.ExecutionPage)},{path:`runtime/models`,loadComponent:()=>import(`./chunk-s8uAz_s_.js`).then(r=>r.ModelsPage)},{path:`catalogs`,pathMatch:`full`,redirectTo:`catalogs/agents`},{path:`catalogs/:kind`,loadComponent:()=>import(`./chunk-CxYltZs-.js`).then(r=>r.CatalogsPage)},{path:`catalogs/:kind/:id`,loadComponent:()=>import(`./chunk-CM9lKNaI.js`).then(r=>r.CatalogDetailPage)},{path:`memory`,loadComponent:()=>import(`./chunk-CF0VTNNo.js`).then(r=>r.MemoryPage)},{path:`security`,loadComponent:()=>import(`./chunk-DM79nCXD.js`).then(r=>r.SecurityPage)},{path:`integrations`,loadComponent:()=>import(`./chunk-HWJaKZQH.js`).then(r=>r.IntegrationsPage)},{path:`deployments`,loadComponent:()=>import(`./chunk-CQIEKJOt.js`).then(r=>r.DeploymentsPage)},{path:`data`,loadComponent:()=>import(`./chunk-LyLJJS08.js`).then(r=>r.DataPage)},{path:`audit`,loadComponent:()=>import(`./chunk-D5CZscBg.js`).then(r=>r.AuditPage)},{path:`advanced`,loadComponent:()=>import(`./chunk-D8YUHBxo.js`).then(r=>r.AdvancedPage)},{path:`changes`,loadComponent:()=>import(`./chunk-d-3m2L05.js`).then(r=>r.ChangesPage)},{path:`404`,loadComponent:()=>import(`./chunk-Cd2vfujO.js`)},{path:`**`,redirectTo:`overview`}]}];export{Il as default};