import { __decorate } from "tslib";
import { MediaMatcher } from '@angular/cdk/layout';
import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal, } from '@angular/core';
let Media = class Media {
    // Dependencies
    destroyRef = inject(DestroyRef);
    isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    mediaMatcher = inject(MediaMatcher);
    // State
    matchers = new Map();
    /**
     * Creates a new media query observer signal for the given query.
     */
    match(query) {
        const existingMatcher = this.matchers.get(query);
        if (existingMatcher) {
            return existingMatcher.matches.asReadonly();
        }
        // Create MediaQueryList for the query
        const mql = this.mediaMatcher.matchMedia(query);
        // Create new signal with initial matches value of the mql
        const matches = signal(mql.matches);
        // Create handler
        const handler = (event) => {
            matches.set(event.matches);
        };
        // Add listener and destroy handler
        if (this.isBrowser) {
            mql.addEventListener('change', handler);
            this.destroyRef.onDestroy(() => {
                mql.removeEventListener('change', handler);
            });
        }
        // Store the observer
        this.matchers.set(query, {
            matches,
            handler,
        });
        return matches.asReadonly();
    }
};
Media = __decorate([
    Injectable({ providedIn: 'root' })
], Media);
export { Media };
