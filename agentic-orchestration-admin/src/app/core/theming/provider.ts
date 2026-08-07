import {
  EnvironmentProviders,
  inject,
  InjectionToken,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { ThemeConfig } from './models/theming';
import { Theming } from './theming';

export const THEME_CONFIG = new InjectionToken<ThemeConfig>('THEME_CONFIG');

export const provideTheming = (config: ThemeConfig): EnvironmentProviders =>
  makeEnvironmentProviders([
    {
      provide: THEME_CONFIG,
      useValue: config,
    },

    // Initialize the Theming
    provideAppInitializer(() => {
      inject(Theming);
    }),
  ]);
