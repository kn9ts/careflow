'use client';

import { AuthProvider } from '@/components/providers/AuthProvider';

/**
 * Auth Layout
 *
 * Wraps all auth pages with AuthProvider to enable useAuth() hook.
 * This is a client component layout.
 */
export default function AuthLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
