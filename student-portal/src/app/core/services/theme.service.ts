import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  /** Active theme signal: defaults to 'light' */
  public theme = signal<Theme>('light');

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    const saved = localStorage.getItem('lms-theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') {
      this.theme.set(saved);
    } else {
      this.theme.set('light');
    }
    this.applyThemeToDOM(this.theme());
  }

  public toggleTheme() {
    const newTheme: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  public setTheme(newTheme: Theme) {
    this.theme.set(newTheme);
    localStorage.setItem('lms-theme', newTheme);
    this.applyThemeToDOM(newTheme);
  }

  private applyThemeToDOM(theme: Theme) {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark', 'dark-theme');
      body.classList.remove('light-theme');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark', 'dark-theme');
      body.classList.add('light-theme');
    }
  }
}
