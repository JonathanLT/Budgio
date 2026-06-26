'use client';

import { createContext, useContext } from 'react';

export type Theme = 'clair' | 'sombre' | 'hc-clair' | 'hc-sombre' | 'matrix' | 'rainbow';

export interface ThemeOption {
  label: string;
  /** Classes appliquées sur <html> */
  htmlClass: string;
  /** Couleurs pour la miniature de prévisualisation */
  preview: { bg: string; surface: string; text: string; accent: string };
}

export const THEMES: Record<Theme, ThemeOption> = {
  'clair': {
    label: 'Clair',
    htmlClass: '',
    preview: { bg: '#f9fafb', surface: '#ffffff', text: '#111827', accent: '#16a34a' },
  },
  'sombre': {
    label: 'Sombre',
    htmlClass: 'theme-sombre dark',
    preview: { bg: '#030712', surface: '#111827', text: '#f9fafb', accent: '#22c55e' },
  },
  'hc-clair': {
    label: 'Contraste élevé clair',
    htmlClass: 'theme-hc-clair',
    preview: { bg: '#ffffff', surface: '#eeeeee', text: '#000000', accent: '#0000cc' },
  },
  'hc-sombre': {
    label: 'Contraste élevé sombre',
    htmlClass: 'theme-hc-sombre dark',
    preview: { bg: '#000000', surface: '#111111', text: '#ffffff', accent: '#ffff00' },
  },
  'matrix': {
    label: 'Matrix',
    htmlClass: 'theme-matrix dark',
    preview: { bg: '#0a0a0a', surface: '#001200', text: '#00ff41', accent: '#00ff41' },
  },
  'rainbow': {
    label: 'Rainbow',
    htmlClass: 'theme-rainbow',
    preview: { bg: '#fdf4ff', surface: '#ffffff', text: '#2d0060', accent: '#9333ea' },
  },
};

const ALL_HTML_CLASSES = Object.values(THEMES).flatMap((t) => t.htmlClass.split(' ').filter(Boolean));

export function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove(...ALL_HTML_CLASSES);
  const classes = THEMES[theme].htmlClass.split(' ').filter(Boolean);
  if (classes.length) html.classList.add(...classes);
  localStorage.setItem('budgio_theme', theme);
}

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'clair',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
