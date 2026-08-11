import type { Metadata } from 'next';
import { Manrope, Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from '@/firebase';
import Script from 'next/script';
import { firebaseConfig } from '@/firebase/config';
import { ZaiaCleanup } from '@/components/zaia-cleanup';
import { SystemCacheCleaner } from '@/components/system/system-cache-cleaner';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-headline',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Igreja Batista da Manhã | Onde a Organização Serve ao Organismo',
  description: 'Uma família que vive o evangelho de forma prática e relevante, centrada em Jesus e apaixonada pela missão de Deus.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport = {
  themeColor: '#6750A4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6750A4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/pwa%2Flogo_1772385880160.png?alt=media&token=9f992f3e-70cd-4a19-a67f-77d16369e81a" />
        <script dangerouslySetInnerHTML={{__html: `
          try {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          } catch (_) {}
          
          // Auto-reload em erros de ChunkLoad para forçar atualização de cache
          if (typeof window !== 'undefined') {
            window.addEventListener('error', function(e) {
              if (e && e.message && (e.message.indexOf('ChunkLoadError') > -1 || e.message.indexOf('Loading chunk') > -1)) {
                console.log('Novo deploy detectado! Atualizando recursos...');
                window.location.reload();
              }
            }, true);
          }
        `}} />
        {googleMapsApiKey && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,marker&loading=async`}
            strategy="afterInteractive"
            async
          />
        )}
      </head>
      <body className={cn(
        "min-h-screen bg-background font-body antialiased",
        manrope.variable,
        inter.variable
      )}>
        <FirebaseClientProvider>
          <SystemCacheCleaner />
          <ZaiaCleanup />
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

