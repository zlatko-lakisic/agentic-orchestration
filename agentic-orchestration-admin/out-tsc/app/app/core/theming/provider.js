import { inject, InjectionToken, makeEnvironmentProviders, provideAppInitializer, } from '@angular/core';
import { Theming } from './theming';
export const THEME_CONFIG = new InjectionToken('THEME_CONFIG');
export const provideTheming = (config) => makeEnvironmentProviders([
    {
        provide: THEME_CONFIG,
        useValue: config,
    },
    // Initialize the Theming
    provideAppInitializer(() => {
        inject(Theming);
    }),
]);
