import type { Metadata } from 'next';
import { Manrope, Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from '@/firebase';
import Script from 'next/script';
import { firebaseConfig } from '@/firebase/config';
import { ZaiaCleanup } from '@/components/zaia-cleanup';

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
        <meta name="theme-color" content="#0F172A" />
        <link rel="apple-touch-icon" href="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/pwa%2Flogo_1772385880160.png?alt=media&token=9f992f3e-70cd-4a19-a67f-77d16369e81a" />
        {googleMapsApiKey && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,marker`}
            strategy="lazyOnload"
          />
        )}
      </head>
      <body className={cn(
        "min-h-screen bg-background font-body antialiased",
        manrope.variable,
        inter.variable
      )}>
        <FirebaseClientProvider>
          <ZaiaCleanup />
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

