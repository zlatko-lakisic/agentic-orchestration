import { __decorate } from "tslib";
import { isPlatformServer } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState, } from '@angular/core';
const STORAGE_STATE_KEY = makeStateKey('APP_STORAGE_STATE');
let LocalStorage = class LocalStorage {
    // Dependencies
    transferState = inject(TransferState);
    // State
    isServer = isPlatformServer(inject(PLATFORM_ID));
    storage = new Map();
    constructor() {
        // Initialize the localStorage with the transfer state
        if (!this.isServer) {
            new Map(this.transferState.get(STORAGE_STATE_KEY, [])).forEach((value, key) => {
                localStorage.setItem(key, value);
            });
        }
    }
    /**
     * Updates the transfer state with the given map.
     */
    updateTransferState(map) {
        this.transferState.set(STORAGE_STATE_KEY, Array.from(map.entries()));
    }
    /**
     * Returns the number of key/value pairs.
     */
    get length() {
        return this.storage.size;
    }
    /**
     * Sets the value of the pair identified by key to value,
     * creating a new key/value pair if none existed for key previously.
     */
    setItem(key, value) {
        if (this.isServer) {
            this.storage.set(key, value);
            this.updateTransferState(this.storage);
            return;
        }
        localStorage.setItem(key, value);
    }
    /**
     * Returns the current value associated with the given key,
     * or null if the given key does not exist in the list associated
     * with the object.
     */
    getItem(key) {
        if (this.isServer) {
            return this.storage.get(key) ?? null;
        }
        return localStorage.getItem(key);
    }
    /**
     * Removes the key/value pair with the given key,
     * if a key/value pair with the given key exists.
     */
    removeItem(key) {
        if (this.isServer) {
            this.storage.delete(key);
            this.updateTransferState(this.storage);
            return;
        }
        localStorage.removeItem(key);
    }
    /**
     * Removes all key/value pairs, if there are any.
     */
    clear() {
        if (this.isServer) {
            this.storage.clear();
            this.updateTransferState(this.storage);
        }
        localStorage.clear();
    }
    /**
     * Returns the name of the nth key in the list.
     */
    key(index) {
        if (this.isServer) {
            return Array.from(this.storage.keys())[index] ?? null;
        }
        return localStorage.key(index);
    }
};
LocalStorage = __decorate([
    Injectable({ providedIn: 'root' })
], LocalStorage);
export { LocalStorage };
