import { inject, makeEnvironmentProviders, provideAppInitializer, } from '@angular/core';
import { Media } from './media';
export const provideMedia = () => makeEnvironmentProviders([
    // Initialize the Media
    provideAppInitializer(() => {
        inject(Media);
    }),
]);
