import { Signal } from '@angular/core';
export declare class Media {
    private destroyRef;
    private isBrowser;
    private mediaMatcher;
    private matchers;
    /**
     * Creates a new media query observer signal for the given query.
     */
    match(query: string): Signal<boolean>;
}
