import { DOCUMENT, isPlatformServer } from '@angular/common';
import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { LocalStorage } from '@/app/core/local-storage/local-storage';
import { Media } from '@/app/core/media/media';
import { TonalPalette } from '@/app/core/theming/palette';
import { Scheme, Colors, Theme } from './models/theming';
import { THEME_CONFIG } from './provider';

@Injectable({ providedIn: 'root' })
export class Theming {
  // Dependencies
  private document = inject(DOCUMENT);
  private isServer = isPlatformServer(inject(PLATFORM_ID));
  private localStorage = inject(LocalStorage);
  private media = inject(Media);
  private themeConfig = inject(THEME_CONFIG);

  // State
  private prefersDarkMode = this.media.match('(prefers-color-scheme: dark)');

  colors = signal<Colors>({
    primary: this.themeConfig.primary,
    error: this.themeConfig.error,
  });
  scheme = signal<Scheme>(
    (this.localStorage.getItem('scheme') as Scheme) || this.themeConfig.scheme
  );
  theme = computed<Theme>(() => this.generateTheme(this.colors()));

  isDark = computed(
    () =>
      this.scheme() === 'dark' ||
      (this.scheme() === 'system' && this.prefersDarkMode)
  );
  isLight = computed(() => !this.isDark());

  // DOM
  private rootEl = this.document.documentElement;
  private themeStyleEl = this.document.createElement('style');

  constructor() {
    // Append the themeStyleEl to the DOM
    this.document.head.appendChild(this.themeStyleEl);
    this.themeStyleEl.classList.add('theme-colors');

    // Update scheme
    effect(() => {
      // Skip the server. Otherwise, the scheme will always be 'system' and
      // the class will always be 'scheme-dark'.
      if (this.isServer) {
        return;
      }

      const scheme = this.scheme();
      const prefersDarkMode = this.prefersDarkMode();

      // Figure out if the scheme is 'dark'
      const isDark =
        scheme === 'dark' || (scheme === 'system' && prefersDarkMode);

      // Add the 'dark' or 'light' class to the html element
      this.rootEl.classList.toggle('scheme-dark', isDark);
      this.rootEl.classList.toggle('scheme-light', !isDark);

      // Store the scheme in local storage
      this.localStorage.setItem('scheme', scheme);
    });

    // Generate the theme for the first time
    this.generateTheme(this.themeConfig);
  }

  /**
   * Generates a theme using the provided theming configuration and
   * applies it to the DOM by injecting CSS variables into a
   * style element.
   */
  private generateTheme(config: Colors): {
    primary: TonalPalette;
    error: TonalPalette;
  } {
    const primary = new TonalPalette({
      color: config.primary,
    });
    const error = new TonalPalette({
      color: config.error,
    });

    this.themeStyleEl.textContent = `:root {
      /* Primary */
      --theme-color-primary-50: ${primary.hue(50)};
      --theme-color-primary-100: ${primary.hue(100)};
      --theme-color-primary-200: ${primary.hue(200)};
      --theme-color-primary-300: ${primary.hue(300)};
      --theme-color-primary-400: ${primary.hue(400)};
      --theme-color-primary-500: ${primary.hue(500)};
      --theme-color-primary-600: ${primary.hue(600)};
      --theme-color-primary-700: ${primary.hue(700)};
      --theme-color-primary-800: ${primary.hue(800)};
      --theme-color-primary-900: ${primary.hue(900)};
      --theme-color-primary-950: ${primary.hue(950)};

      /* Error */
      --theme-color-error-50: ${error.hue(50)};
      --theme-color-error-100: ${error.hue(100)};
      --theme-color-error-200: ${error.hue(200)};
      --theme-color-error-300: ${error.hue(300)};
      --theme-color-error-400: ${error.hue(400)};
      --theme-color-error-500: ${error.hue(500)};
      --theme-color-error-600: ${error.hue(600)};
      --theme-color-error-700: ${error.hue(700)};
      --theme-color-error-800: ${error.hue(800)};
      --theme-color-error-900: ${error.hue(900)};
      --theme-color-error-950: ${error.hue(950)};
    `;

    return {
      primary,
      error,
    };
  }
}
