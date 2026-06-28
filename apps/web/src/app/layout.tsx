import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SwRegister } from '@/components/SwRegister';

export const metadata: Metadata = {
  title: 'Budgio — Budget familial',
  description: 'Gestion budgétaire familiale collaborative',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Budgio',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

// Appliqué avant le premier rendu pour éviter le flash de thème
const FOUC_SCRIPT = `(function(){try{
  var t=localStorage.getItem('budgio_theme');
  var map={
    'sombre':    'theme-sombre dark',
    'hc-clair':  'theme-hc-clair',
    'hc-sombre': 'theme-hc-sombre dark',
    'matrix':    'theme-matrix dark',
    'rainbow':   'theme-rainbow'
  };
  var cls=map[t];
  if(cls)document.documentElement.classList.add(...cls.split(' '));
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <SwRegister />
      </body>
    </html>
  );
}
