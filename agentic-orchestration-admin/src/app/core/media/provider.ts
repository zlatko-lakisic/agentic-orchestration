import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { Media } from './media';

export const provideMedia = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    // Initialize the Media
    provideAppInitializer(() => {
      inject(Media);
    }),
  ]);
