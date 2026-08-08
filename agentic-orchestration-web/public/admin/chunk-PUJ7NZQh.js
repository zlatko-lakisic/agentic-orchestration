import{$ as Km,$n as gm,Ar as qa,Ci as zl,Cn as an,Ct as Ow,D as Ei,Et as Pm,Fr as qr,Hn as ea,It as Rm,Jt as Vh,K as Ir,M as GS,Mr as ql,Nn as bv,Or as q,Ot as Q,Pn as bw,Qn as ge,S as DD,U as Hw,Yn as ft,Yr as v,Yt as Vn,Zt as Vw,bi as yp,dr as jw,er as gv,ft as Mv,gi as yD,hn as Z3,hr as kn,it as Ld,jn as be$1,lt as Mm,mi as xm,ni as vp,o as $w,oi as wI,qn as fe$1,ri as vy,sr as ie,tr as h,tt as L,ui as ww,ur as js,vi as yl,w as Da,wt as P,xr as nM,y as Ct,yt as O,z as Gw}from"./chunk-D-Xh3agN.js";import{i as Pe,n as Ie}from"./chunk-DXA83wRW.js";var I=[`*`];var be=[`content`];var _e=[[[`mat-drawer`],[`mat-sidenav`]],[[`mat-drawer-content`],[`mat-sidenav-content`]],`*`];var fe=[`mat-drawer, mat-sidenav`,`mat-drawer-content, mat-sidenav-content`,`*`];function ve(r,A){if(r&1){let e=Ow();js(0,`div`,1),Mm(`click`,function(){yp(e);return vp(jw()._onBackdropClicked())}),ql()}if(r&2)ea(`mat-drawer-shown`,jw()._isShowingBackdrop())}function ye(r,A){r&1&&(js(0,`mat-drawer-content`),Hw(1,2),ql())}function Ce(r,A){if(r&1){let e=Ow();js(0,`div`,1),Mm(`click`,function(){yp(e);return vp(jw()._onBackdropClicked())}),ql()}if(r&2)ea(`mat-drawer-shown`,jw()._isShowingBackdrop())}function Se(r,A){r&1&&(js(0,`mat-sidenav-content`),Hw(1,2),ql())}var ke=`.mat-drawer-container {
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
`;var xe=new v(`MAT_DRAWER_DEFAULT_AUTOSIZE`,{providedIn:`root`,factory:()=>!1});var Y=new v(`MAT_DRAWER_CONTAINER`);var D=(()=>{class r extends Ie{_platform=h(ge);_changeDetectorRef=h(vy);_element=h(ie);_ngZone=h(P);_isInert=!1;_container=h(X);ngAfterContentInit(){this._container._contentMarginChanges.subscribe(()=>this._changeDetectorRef.markForCheck())}_drawerToggled(e){e.opened?this._ngZone.runOutsideAngular(()=>{e._animationEnd.pipe(DD(50),ft(1)).subscribe(()=>this._updateInert())}):this._updateInert()}_drawerModeChanged(){this._updateInert()}_updateInert(){let e=this._container._isShowingBackdrop();if(e!==this._isInert){let t=this._element.nativeElement;this._isInert=e,e?t.setAttribute(`inert`,`true`):t.removeAttribute(`inert`)}}_shouldBeHidden(){if(this._platform.isBrowser)return!1;let{start:e,end:t}=this._container;return e!=null&&e.mode!==`over`&&e.opened||t!=null&&t.mode!==`over`&&t.opened}static ɵfac=(()=>{let e;return function(n){return(e||(e=Vh(r)))(n||r)}})();static ɵcmp=Vn({type:r,selectors:[[`mat-drawer-content`]],hostAttrs:[1,`mat-drawer-content`],hostVars:6,hostBindings:function(t,n){t&2&&(Pm(`margin-left`,n._container._contentMargins.left,`px`)(`margin-right`,n._container._contentMargins.right,`px`),ea(`mat-drawer-content-hidden`,n._shouldBeHidden()))},features:[Km([{provide:Ie,useExisting:r}]),gm],ngContentSelectors:I,decls:1,vars:0,template:function(t,n){t&1&&(Vw(),Hw(0))},encapsulation:2})}return r})();var J=(()=>{class r{_elementRef=h(ie);_focusTrapFactory=h(GS);_focusMonitor=h(gv);_platform=h(ge);_ngZone=h(P);_renderer=h(Ir);_interactivityChecker=h(bv);_doc=h(O);_container=h(Y,{optional:!0});_focusTrap=null;_elementFocusedBeforeDrawerWasOpened=null;_eventCleanups;_isAttached=!1;_anchor=null;get position(){return this._position}set position(e){e=e===`end`?`end`:`start`,e!==this._position&&(this._isAttached&&this._updatePositionInParent(e),this._position=e,this.onPositionChanged.emit())}_position=`start`;get mode(){return this._mode}set mode(e){this._mode=e,this._updateFocusTrapState(),this._modeChanged.next(),this._getContent()?._drawerModeChanged()}_mode=`over`;get disableClose(){return this._disableClose}set disableClose(e){this._disableClose=Z3(e)}_disableClose=!1;get autoFocus(){return this._autoFocus??(this.mode===`side`?`dialog`:`first-tabbable`)}set autoFocus(e){(e===`true`||e===`false`||e==null)&&(e=Z3(e)),this._autoFocus=e}_autoFocus;get opened(){return this._opened()}set opened(e){this.toggle(Z3(e))}_opened=Ct(!1);_openedVia=null;_animationStarted=new L;_animationEnd=new L;openedChange=new fe$1(!0);_openedStream=this.openedChange.pipe(be$1(e=>e),Q(()=>{}));openedStart=this._animationStarted.pipe(be$1(()=>this.opened),qa(void 0));_closedStream=this.openedChange.pipe(be$1(e=>!e),Q(()=>{}));closedStart=this._animationStarted.pipe(be$1(()=>!this.opened),qa(void 0));_destroyed=new L;onPositionChanged=new fe$1;_content;_modeChanged=new L;_injector=h(q);_changeDetectorRef=h(vy);constructor(){this.openedChange.pipe(qr(this._destroyed)).subscribe(e=>{e?(this._elementFocusedBeforeDrawerWasOpened=this._doc.activeElement,this._takeFocus()):this._isFocusWithinDrawer()&&this._restoreFocus(this._openedVia||`program`)}),this._eventCleanups=this._ngZone.runOutsideAngular(()=>{let e=this._renderer,t=this._elementRef.nativeElement;return[e.listen(t,`keydown`,n=>{n.keyCode===27&&!this.disableClose&&!Mv(n)&&this._ngZone.run(()=>{this.close(),n.stopPropagation(),n.preventDefault()})}),e.listen(t,`transitionend`,this._handleTransitionEvent),e.listen(t,`transitioncancel`,this._handleTransitionEvent)]}),this._animationEnd.subscribe(()=>{this.openedChange.emit(this.opened)})}_focusByCssSelector(e,t){let n=this._elementRef.nativeElement.querySelector(e);n&&(this._interactivityChecker.isFocusable(n)||(n.tabIndex=-1,this._ngZone.runOutsideAngular(()=>{let a=()=>{o(),we(),n.removeAttribute(`tabindex`)},o=this._renderer.listen(n,`blur`,a),we=this._renderer.listen(n,`mousedown`,a)})),n.focus(t))}_takeFocus(){if(!this._focusTrap)return;let e=this._elementRef.nativeElement;switch(this.autoFocus){case!1:case`dialog`:return;case!0:case`first-tabbable`:yl(()=>{!this._focusTrap.focusInitialElement()&&typeof e.focus==`function`&&e.focus()},{injector:this._injector});break;case`first-heading`:this._focusByCssSelector(`h1, h2, h3, h4, h5, h6, [role="heading"]`);break;default:this._focusByCssSelector(this.autoFocus);break}}_restoreFocus(e){this.autoFocus!==`dialog`&&(this._elementFocusedBeforeDrawerWasOpened?this._focusMonitor.focusVia(this._elementFocusedBeforeDrawerWasOpened,e):this._elementRef.nativeElement.blur(),this._elementFocusedBeforeDrawerWasOpened=null)}_isFocusWithinDrawer(){let e=this._doc.activeElement;return!!e&&this._elementRef.nativeElement.contains(e)}ngAfterViewInit(){this._isAttached=!0,this._position===`end`&&this._updatePositionInParent(`end`),this._platform.isBrowser&&(this._focusTrap=this._focusTrapFactory.create(this._elementRef.nativeElement),this._updateFocusTrapState())}ngOnDestroy(){this._eventCleanups.forEach(e=>e()),this._focusTrap?.destroy(),this._anchor?.remove(),this._anchor=null,this._animationStarted.complete(),this._animationEnd.complete(),this._modeChanged.complete(),this._destroyed.next(),this._destroyed.complete()}open(e){return this.toggle(!0,e)}close(){return this.toggle(!1)}_closeViaBackdropClick(){return this._setOpen(!1,!0,`mouse`)}toggle(e=!this.opened,t){e&&t&&(this._openedVia=t);let n=this._setOpen(e,!e&&this._isFocusWithinDrawer(),this._openedVia||`program`);return e||(this._openedVia=null),n}_setOpen(e,t,n){return e===this.opened?Promise.resolve(e?`open`:`close`):(this._opened.set(e),this._getContent()?._drawerToggled(this),this._container?._transitionsEnabled?(this._setIsAnimating(!0),setTimeout(()=>this._animationStarted.next())):setTimeout(()=>{this._animationStarted.next(),this._animationEnd.next()}),this._elementRef.nativeElement.classList.toggle(`mat-drawer-opened`,e),!e&&t&&this._restoreFocus(n),this._changeDetectorRef.markForCheck(),this._updateFocusTrapState(),new Promise(a=>{this.openedChange.pipe(ft(1)).subscribe(o=>a(o?`open`:`close`))}))}_getContent(){return this._container?._content||this._container?._userContent}_setIsAnimating(e){this._elementRef.nativeElement.classList.toggle(`mat-drawer-animating`,e)}_getWidth(){return this._elementRef.nativeElement.offsetWidth||0}_updateFocusTrapState(){this._focusTrap&&(this._focusTrap.enabled=this.opened&&!!this._container?._isShowingBackdrop())}_updatePositionInParent(e){if(!this._platform.isBrowser)return;let t=this._elementRef.nativeElement,n=t.parentNode;e===`end`?(this._anchor||(this._anchor=this._doc.createComment(`mat-drawer-anchor`),n.insertBefore(this._anchor,t)),n.appendChild(t)):this._anchor&&this._anchor.parentNode.insertBefore(t,this._anchor)}_handleTransitionEvent=e=>{let t=this._elementRef.nativeElement;e.target===t&&this._ngZone.run(()=>{e.type===`transitionend`&&this._setIsAnimating(!1),this._animationEnd.next(e)})};static ɵfac=function(t){return new(t||r)};static ɵcmp=Vn({type:r,selectors:[[`mat-drawer`]],viewQuery:function(t,n){if(t&1&&Rm(be,5),t&2){let a;$w(a=Gw())&&(n._content=a.first)}},hostAttrs:[1,`mat-drawer`],hostVars:12,hostBindings:function(t,n){t&2&&(zl(`align`,null)(`tabIndex`,n.mode!==`side`?`-1`:null),Pm(`visibility`,!n._container&&!n.opened?`hidden`:null),ea(`mat-drawer-end`,n.position===`end`)(`mat-drawer-over`,n.mode===`over`)(`mat-drawer-push`,n.mode===`push`)(`mat-drawer-side`,n.mode===`side`))},inputs:{position:`position`,mode:`mode`,disableClose:`disableClose`,autoFocus:`autoFocus`,opened:`opened`},outputs:{openedChange:`openedChange`,_openedStream:`opened`,openedStart:`openedStart`,_closedStream:`closed`,closedStart:`closedStart`,onPositionChanged:`positionChanged`},exportAs:[`matDrawer`],ngContentSelectors:I,decls:3,vars:0,consts:[[`content`,``],[`cdkScrollable`,``,1,`mat-drawer-inner-container`]],template:function(t,n){t&1&&(Vw(),js(0,`div`,1,0),Hw(2),ql())},dependencies:[Ie],encapsulation:2})}return r})();var X=(()=>{class r{_dir=h(nM,{optional:!0});_element=h(ie);_ngZone=h(P);_changeDetectorRef=h(vy);_animationDisabled=Da();_transitionsEnabled=!1;_allDrawers;_drawers=new kn;_content;_userContent;get start(){return this._start}get end(){return this._end}get autosize(){return this._autosize}set autosize(e){this._autosize=Z3(e)}_autosize=h(xe);get hasBackdrop(){return this._drawerHasBackdrop(this._start)||this._drawerHasBackdrop(this._end)}set hasBackdrop(e){this._backdropOverride=e==null?null:Z3(e)}_backdropOverride=null;backdropClick=new fe$1;_start=null;_end=null;_left=null;_right=null;_destroyed=new L;_doCheckSubject=new L;_contentMargins={left:null,right:null};_contentMarginChanges=new L;get scrollable(){return this._userContent||this._content}_injector=h(q);constructor(){let e=h(ge),t=h(Pe);this._dir?.change.pipe(qr(this._destroyed)).subscribe(()=>{this._validateDrawers(),this.updateContentMargins()}),t.change().pipe(qr(this._destroyed)).subscribe(()=>this.updateContentMargins()),!this._animationDisabled&&e.isBrowser&&this._ngZone.runOutsideAngular(()=>{setTimeout(()=>{this._element.nativeElement.classList.add(`mat-drawer-transition`),this._transitionsEnabled=!0},200)})}ngAfterContentInit(){this._allDrawers.changes.pipe(Ei(this._allDrawers),qr(this._destroyed)).subscribe(e=>{this._drawers.reset(e.filter(t=>!t._container||t._container===this)),this._drawers.notifyOnChanges()}),this._drawers.changes.pipe(Ei(null)).subscribe(()=>{this._validateDrawers(),this._drawers.forEach(e=>{this._watchDrawerToggle(e),this._watchDrawerPosition(e),this._watchDrawerMode(e)}),(!this._drawers.length||this._isDrawerOpen(this._start)||this._isDrawerOpen(this._end))&&this.updateContentMargins(),this._changeDetectorRef.markForCheck()}),this._ngZone.runOutsideAngular(()=>{this._doCheckSubject.pipe(an(10),qr(this._destroyed)).subscribe(()=>this.updateContentMargins())})}ngOnDestroy(){this._contentMarginChanges.complete(),this._doCheckSubject.complete(),this._drawers.destroy(),this._destroyed.next(),this._destroyed.complete()}open(){this._drawers.forEach(e=>e.open())}close(){this._drawers.forEach(e=>e.close())}updateContentMargins(){let e=0,t=0;if(this._left&&this._left.opened){if(this._left.mode==`side`)e+=this._left._getWidth();else if(this._left.mode==`push`){let n=this._left._getWidth();e+=n,t-=n}}if(this._right&&this._right.opened){if(this._right.mode==`side`)t+=this._right._getWidth();else if(this._right.mode==`push`){let n=this._right._getWidth();t+=n,e-=n}}e=e||null,t=t||null,(e!==this._contentMargins.left||t!==this._contentMargins.right)&&(this._contentMargins={left:e,right:t},this._ngZone.run(()=>this._contentMarginChanges.next(this._contentMargins)))}ngDoCheck(){this._autosize&&this._isPushed()&&this._ngZone.runOutsideAngular(()=>this._doCheckSubject.next())}_watchDrawerToggle(e){e._animationStarted.pipe(qr(this._drawers.changes)).subscribe(()=>{this.updateContentMargins(),this._changeDetectorRef.markForCheck()}),e.mode!==`side`&&e.openedChange.pipe(qr(this._drawers.changes)).subscribe(()=>this._setContainerClass(e.opened))}_watchDrawerPosition(e){e.onPositionChanged.pipe(qr(this._drawers.changes)).subscribe(()=>{yl({read:()=>this._validateDrawers()},{injector:this._injector})})}_watchDrawerMode(e){e._modeChanged.pipe(qr(yD(this._drawers.changes,this._destroyed))).subscribe(()=>{this.updateContentMargins(),this._changeDetectorRef.markForCheck()})}_setContainerClass(e){let t=this._element.nativeElement.classList,n=`mat-drawer-container-has-open`;e?t.add(n):t.remove(n)}_validateDrawers(){this._start=this._end=null,this._drawers.forEach(e=>{e.position==`end`?(this._end,this._end=e):(this._start,this._start=e)}),this._right=this._left=null,this._dir&&this._dir.value===`rtl`?(this._left=this._end,this._right=this._start):(this._left=this._start,this._right=this._end)}_isPushed(){return this._isDrawerOpen(this._start)&&this._start.mode!=`over`||this._isDrawerOpen(this._end)&&this._end.mode!=`over`}_onBackdropClicked(){this.backdropClick.emit(),this._closeModalDrawersViaBackdrop()}_closeModalDrawersViaBackdrop(){[this._start,this._end].filter(e=>e&&!e.disableClose&&this._drawerHasBackdrop(e)).forEach(e=>e._closeViaBackdropClick())}_isShowingBackdrop(){return this._isDrawerOpen(this._start)&&this._drawerHasBackdrop(this._start)||this._isDrawerOpen(this._end)&&this._drawerHasBackdrop(this._end)}_isDrawerOpen(e){return e!=null&&e.opened}_drawerHasBackdrop(e){return this._backdropOverride==null?!!e&&e.mode!==`side`:this._backdropOverride}static ɵfac=function(t){return new(t||r)};static ɵcmp=Vn({type:r,selectors:[[`mat-drawer-container`]],contentQueries:function(t,n,a){if(t&1&&xm(a,D,5)(a,J,5),t&2){let o;$w(o=Gw())&&(n._content=o.first),$w(o=Gw())&&(n._allDrawers=o)}},viewQuery:function(t,n){if(t&1&&Rm(D,5),t&2){let a;$w(a=Gw())&&(n._userContent=a.first)}},hostAttrs:[1,`mat-drawer-container`],hostVars:2,hostBindings:function(t,n){t&2&&ea(`mat-drawer-container-explicit-backdrop`,n._backdropOverride)},inputs:{autosize:`autosize`,hasBackdrop:`hasBackdrop`},outputs:{backdropClick:`backdropClick`},exportAs:[`matDrawerContainer`],features:[Km([{provide:Y,useExisting:r}])],ngContentSelectors:fe,decls:4,vars:2,consts:[[1,`mat-drawer-backdrop`,3,`mat-drawer-shown`],[1,`mat-drawer-backdrop`,3,`click`]],template:function(t,n){t&1&&(Vw(_e),bw(0,ve,1,2,`div`,0),Hw(1),Hw(2,1),bw(3,ye,2,0,`mat-drawer-content`)),t&2&&(ww(n.hasBackdrop?0:-1),wI(3),ww(n._content?-1:3))},dependencies:[D],styles:[`.mat-drawer-container {
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
`],encapsulation:2})}return r})();var ue=(()=>{class r extends D{static ɵfac=(()=>{let e;return function(n){return(e||(e=Vh(r)))(n||r)}})();static ɵcmp=Vn({type:r,selectors:[[`mat-sidenav-content`]],hostAttrs:[1,`mat-drawer-content`,`mat-sidenav-content`],features:[Km([{provide:Ie,useExisting:r},{provide:D,useExisting:r}]),gm],ngContentSelectors:I,decls:1,vars:0,template:function(t,n){t&1&&(Vw(),Hw(0))},encapsulation:2})}return r})();var De=(()=>{class r extends J{get fixedInViewport(){return this._fixedInViewport}set fixedInViewport(e){this._fixedInViewport=Z3(e)}_fixedInViewport=!1;get fixedTopGap(){return this._fixedTopGap}set fixedTopGap(e){this._fixedTopGap=Ld(e)}_fixedTopGap=0;get fixedBottomGap(){return this._fixedBottomGap}set fixedBottomGap(e){this._fixedBottomGap=Ld(e)}_fixedBottomGap=0;static ɵfac=(()=>{let e;return function(n){return(e||(e=Vh(r)))(n||r)}})();static ɵcmp=Vn({type:r,selectors:[[`mat-sidenav`]],hostAttrs:[1,`mat-drawer`,`mat-sidenav`],hostVars:16,hostBindings:function(t,n){t&2&&(zl(`tabIndex`,n.mode!==`side`?`-1`:null)(`align`,null),Pm(`top`,n.fixedInViewport?n.fixedTopGap:null,`px`)(`bottom`,n.fixedInViewport?n.fixedBottomGap:null,`px`),ea(`mat-drawer-end`,n.position===`end`)(`mat-drawer-over`,n.mode===`over`)(`mat-drawer-push`,n.mode===`push`)(`mat-drawer-side`,n.mode===`side`)(`mat-sidenav-fixed`,n.fixedInViewport))},inputs:{fixedInViewport:`fixedInViewport`,fixedTopGap:`fixedTopGap`,fixedBottomGap:`fixedBottomGap`},exportAs:[`matSidenav`],features:[Km([{provide:J,useExisting:r}]),gm],ngContentSelectors:I,decls:3,vars:0,consts:[[`content`,``],[`cdkScrollable`,``,1,`mat-drawer-inner-container`]],template:function(t,n){t&1&&(Vw(),js(0,`div`,1,0),Hw(2),ql())},dependencies:[Ie],encapsulation:2})}return r})();var $e=(()=>{class r extends X{_allDrawers=void 0;_content=void 0;static ɵfac=(()=>{let e;return function(n){return(e||(e=Vh(r)))(n||r)}})();static ɵcmp=Vn({type:r,selectors:[[`mat-sidenav-container`]],contentQueries:function(t,n,a){if(t&1&&xm(a,ue,5)(a,De,5),t&2){let o;$w(o=Gw())&&(n._content=o.first),$w(o=Gw())&&(n._allDrawers=o)}},hostAttrs:[1,`mat-drawer-container`,`mat-sidenav-container`],hostVars:2,hostBindings:function(t,n){t&2&&ea(`mat-drawer-container-explicit-backdrop`,n._backdropOverride)},exportAs:[`matSidenavContainer`],features:[Km([{provide:Y,useExisting:r},{provide:X,useExisting:r}]),gm],ngContentSelectors:fe,decls:4,vars:2,consts:[[1,`mat-drawer-backdrop`,3,`mat-drawer-shown`],[1,`mat-drawer-backdrop`,3,`click`]],template:function(t,n){t&1&&(Vw(_e),bw(0,Ce,1,2,`div`,0),Hw(1),Hw(2,1),bw(3,Se,2,0,`mat-sidenav-content`)),t&2&&(ww(n.hasBackdrop?0:-1),wI(3),ww(n._content?-1:3))},dependencies:[ue],styles:[ke],encapsulation:2})}return r})();export{De as n,ue as r,$e as t};