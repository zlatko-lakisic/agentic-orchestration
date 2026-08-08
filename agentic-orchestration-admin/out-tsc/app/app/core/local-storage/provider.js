import { inject, makeEnvironmentProviders, provideAppInitializer, } from '@angular/core';
import { LocalStorage } from './local-storage';
export const provideLocalStorage = () => makeEnvironmentProviders([
    // Initialize the LocalStorage
    provideAppInitializer(() => {
        inject(LocalStorage);
    }),
]);
