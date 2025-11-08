import './globals.css';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import { Footer } from '@/components/Footer';
import { ConfirmationProvider } from '@/hooks/useConfirmation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FloatingActionButtons } from '@/components/FloatingActionButtons';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SteadyStream',
  description: 'A calm, chronological social network',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <div className="flex flex-col min-h-screen">
              <AuthProvider>
                <ConfirmationProvider>
                  <main className="flex-1">{children}</main>
                  <FloatingActionButtons />
                </ConfirmationProvider>
              </AuthProvider>
              <Footer />
            </div>
            <Toaster />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
