import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CareFlow',
  description: 'Make and receive phone calls in your browser',
};

// Disable static generation for this layout to avoid SSR issues with Firebase
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen text-white`}
        style={{
          background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 30%, #134e4a 70%, #042f2e 100%)',
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
