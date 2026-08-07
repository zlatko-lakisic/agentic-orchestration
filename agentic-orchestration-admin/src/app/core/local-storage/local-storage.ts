import { isPlatformServer } from '@angular/common';
import {
  inject,
  Injectable,
  makeStateKey,
  PLATFORM_ID,
  TransferState,
} from '@angular/core';

const STORAGE_STATE_KEY = makeStateKey<[string, string][]>('APP_STORAGE_STATE');

@Injectable({ providedIn: 'root' })
export class LocalStorage {
  // Dependencies
  private transferState = inject(TransferState);

  // State
  private isServer = isPlatformServer(inject(PLATFORM_ID));
  private storage = new Map<string, string>();

  constructor() {
    // Initialize the localStorage with the transfer state
    if (!this.isServer) {
      new Map(this.transferState.get(STORAGE_STATE_KEY, [])).forEach(
        (value, key) => {
          localStorage.setItem(key, value);
        }
      );
    }
  }

  /**
   * Updates the transfer state with the given map.
   */
  private updateTransferState(map: Map<string, string>) {
    this.transferState.set(STORAGE_STATE_KEY, Array.from(map.entries()));
  }

  /**
   * Returns the number of key/value pairs.
   */
  get length(): number {
    return this.storage.size;
  }

  /**
   * Sets the value of the pair identified by key to value,
   * creating a new key/value pair if none existed for key previously.
   */
  setItem(key: string, value: string): void {
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
  getItem(key: string): string | null {
    if (this.isServer) {
      return this.storage.get(key) ?? null;
    }

    return localStorage.getItem(key);
  }

  /**
   * Removes the key/value pair with the given key,
   * if a key/value pair with the given key exists.
   */
  removeItem(key: string): void {
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
  clear(): void {
    if (this.isServer) {
      this.storage.clear();
      this.updateTransferState(this.storage);
    }

    localStorage.clear();
  }

  /**
   * Returns the name of the nth key in the list.
   */
  key(index: number): string | null {
    if (this.isServer) {
      return Array.from(this.storage.keys())[index] ?? null;
    }

    return localStorage.key(index);
  }
}
