import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/providers/AuthProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'CareFlow',
  description: 'Make and receive phone calls in your browser',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

// Let Next.js decide when to use static generation
// Individual pages can override with dynamic = 'force-dynamic' if needed

/**
 * Root Layout
 *
 * FIX IMPLEMENTED (PERSIST-01):
 * - Added AuthProvider at root level for global auth state access
 * - Ensures auth state persists across all routes and navigation
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body
        className={`${inter.className} min-h-screen overflow-x-hidden text-white`}
        style={{
          background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 30%, #134e4a 70%, #042f2e 100%)',
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
