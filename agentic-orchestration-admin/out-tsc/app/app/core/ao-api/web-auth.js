import { __decorate } from "tslib";
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, of, tap } from 'rxjs';
const STORAGE_KEY = 'ao-web-auth-token';
let WebAuth = class WebAuth {
    http = inject(HttpClient);
    tokenSignal = signal(this.readStored());
    assignedSignal = signal(false);
    readySignal = signal(false);
    token = this.tokenSignal.asReadonly();
    assigned = this.assignedSignal.asReadonly();
    ready = this.readySignal.asReadonly();
    bearer() {
        return this.tokenSignal();
    }
    refresh() {
        return this.http.get('/api/v1/admin/web-auth').pipe(tap((state) => this.apply(state)), catchError(() => {
            this.readySignal.set(true);
            return of({
                assigned: false,
                appId: 'ao-web',
                token: null,
                hint: 'Failed to load web-auth',
            });
        }));
    }
    async refreshOnce() {
        await firstValueFrom(this.refresh());
    }
    /** After minting ao-web, keep the SPA in sync without waiting for another fetch. */
    adoptMinted(token, assignedToWeb) {
        if (!token || !assignedToWeb)
            return;
        this.tokenSignal.set(token);
        this.assignedSignal.set(true);
        this.readySignal.set(true);
        try {
            localStorage.setItem(STORAGE_KEY, token);
        }
        catch {
            /* ignore */
        }
    }
    clear() {
        this.tokenSignal.set(null);
        this.assignedSignal.set(false);
        try {
            localStorage.removeItem(STORAGE_KEY);
        }
        catch {
            /* ignore */
        }
    }
    apply(state) {
        this.assignedSignal.set(Boolean(state.assigned));
        if (state.assigned && state.token) {
            this.tokenSignal.set(state.token);
            try {
                localStorage.setItem(STORAGE_KEY, state.token);
            }
            catch {
                /* ignore */
            }
        }
        else {
            this.tokenSignal.set(null);
            try {
                localStorage.removeItem(STORAGE_KEY);
            }
            catch {
                /* ignore */
            }
        }
        this.readySignal.set(true);
    }
    readStored() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        }
        catch {
            return null;
        }
    }
};
WebAuth = __decorate([
    Injectable({ providedIn: 'root' })
], WebAuth);
export { WebAuth };
