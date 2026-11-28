import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import PageTransitions from '@/components/PageTransitions';
import MatchWatcher from '@/components/MatchWatcher';

const inter = Inter({ subsets: ['latin'] });

// Note: Bitcount Grid Single is loaded via Google Fonts link in the HTML head
// The font is configured with CSS variables in globals.css

export const metadata: Metadata = {
  title: 'Cinephile',
  description: 'A dating app for film lovers. Not just for dating, but for finding people who share your taste in films.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Kavoon&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <PageTransitions />
          <MatchWatcher />
        </ThemeProvider>
      </body>
    </html>
  );
}
