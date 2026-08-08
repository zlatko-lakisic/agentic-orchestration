import { __decorate } from "tslib";
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
let TranslocoHttpLoader = class TranslocoHttpLoader {
    http = inject(HttpClient);
    getTranslation(lang) {
        return this.http.get(`/i18n/${lang}.json`);
    }
};
TranslocoHttpLoader = __decorate([
    Injectable({ providedIn: 'root' })
], TranslocoHttpLoader);
export { TranslocoHttpLoader };
