import { EnvironmentProviders, InjectionToken } from '@angular/core';
import { ThemeConfig } from './models/theming';
export declare const THEME_CONFIG: InjectionToken<ThemeConfig>;
export declare const provideTheming: (config: ThemeConfig) => EnvironmentProviders;
