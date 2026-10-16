import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'regexlab.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(StorageService);
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<Theme>(this.storage.read<Theme>(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark');

  constructor() {
    effect(() => {
      const theme = this.theme();
      this.document.documentElement.dataset['theme'] = theme;
      this.document.documentElement.style.colorScheme = theme;
      this.storage.write(THEME_KEY, theme);
    });
  }

  toggle(): void {
    this.theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }
}
