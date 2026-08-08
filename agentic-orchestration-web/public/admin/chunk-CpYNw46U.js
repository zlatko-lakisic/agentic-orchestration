import{Ci as zl,Hn as ea,Yt as Vn,hn as Z3}from"./chunk-D-Xh3agN.js";var m=(()=>{class e{get vertical(){return this._vertical}set vertical(t){this._vertical=Z3(t)}_vertical=!1;get inset(){return this._inset}set inset(t){this._inset=Z3(t)}_inset=!1;static ɵfac=function(r){return new(r||e)};static ɵcmp=Vn({type:e,selectors:[[`mat-divider`]],hostAttrs:[`role`,`separator`,1,`mat-divider`],hostVars:7,hostBindings:function(r,i){r&2&&(zl(`aria-orientation`,i.vertical?`vertical`:`horizontal`),ea(`mat-divider-vertical`,i.vertical)(`mat-divider-horizontal`,!i.vertical)(`mat-divider-inset`,i.inset))},inputs:{vertical:`vertical`,inset:`inset`},decls:0,vars:0,template:function(r,i){},styles:[`.mat-divider {
  display: block;
  margin: 0;
  border-top-style: solid;
  border-top-color: var(--%NS%mat-divider-color, var(--%NS%mat-sys-outline-variant));
  border-top-width: var(--%NS%mat-divider-width, 1px);
}
.mat-divider.mat-divider-vertical {
  border-top: 0;
  border-right-style: solid;
  border-right-color: var(--%NS%mat-divider-color, var(--%NS%mat-sys-outline-variant));
  border-right-width: var(--%NS%mat-divider-width, 1px);
}
.mat-divider.mat-divider-inset {
  margin-left: 80px;
}
[dir=rtl] .mat-divider.mat-divider-inset {
  margin-left: auto;
  margin-right: 80px;
}
`],encapsulation:2})}return e})();export{m as t};