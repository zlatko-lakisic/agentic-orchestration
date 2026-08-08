export declare class LocalStorage {
    private transferState;
    private isServer;
    private storage;
    constructor();
    /**
     * Updates the transfer state with the given map.
     */
    private updateTransferState;
    /**
     * Returns the number of key/value pairs.
     */
    get length(): number;
    /**
     * Sets the value of the pair identified by key to value,
     * creating a new key/value pair if none existed for key previously.
     */
    setItem(key: string, value: string): void;
    /**
     * Returns the current value associated with the given key,
     * or null if the given key does not exist in the list associated
     * with the object.
     */
    getItem(key: string): string | null;
    /**
     * Removes the key/value pair with the given key,
     * if a key/value pair with the given key exists.
     */
    removeItem(key: string): void;
    /**
     * Removes all key/value pairs, if there are any.
     */
    clear(): void;
    /**
     * Returns the name of the nth key in the list.
     */
    key(index: number): string | null;
}
