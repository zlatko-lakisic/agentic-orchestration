import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
let App = class App {
};
App = __decorate([
    Component({
        selector: 'app-root',
        imports: [RouterOutlet],
        host: {
            // Ensure root component fills the entire viewport
            class: 'flex min-h-full w-full flex-auto flex-col',
        },
        template: `<router-outlet />`,
    })
], App);
export { App };
