import type {Metadata} from 'next';
import { PT_Sans } from 'next/font/google'
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from '@/firebase';
import Script from 'next/script';
import { firebaseConfig } from '@/firebase/config';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'IBM Core - O Sistema Operacional da Igreja',
  description: 'Um sistema para garantir que a Organização sirva ao Organismo.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appId = firebaseConfig.appId;
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <Script
            id="__APP_ID__"
            dangerouslySetInnerHTML={{
              __html: `
            window.__app_id = "${appId}";
          `,
            }}
          />
        {googleMapsApiKey && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,marker`}
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className={cn(
        "min-h-screen bg-background font-body antialiased",
        ptSans.variable
      )}>
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
