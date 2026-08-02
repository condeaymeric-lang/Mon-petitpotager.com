import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { ToastProvider } from '@/components/Toast';
import { PanierProvider } from '@/components/PanierContext';
import BandeauConstruction from '@/components/BandeauConstruction';
import { ColonnePub } from '@/components/EncartPub';

export const metadata: Metadata = {
  title: 'monpetitpotager.com — Cultivons le bon, partageons le meilleur',
  description:
    "La marketplace locale entre jardiniers, producteurs et habitants. Partout en France, jamais plus loin que votre secteur.",
};

export const viewport: Viewport = {
  themeColor: '#143424',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Instrument+Sans:wght@400;500;600&family=Caveat:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#contenu" className="saut-contenu">Aller au contenu</a>
        <BandeauConstruction />
        <ColonnePub />
        <ToastProvider>
          <PanierProvider>
            <div id="contenu">{children}</div>
          </PanierProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
