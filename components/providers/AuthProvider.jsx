'use client';

import { AuthProvider as ContextProvider } from '@/context/AuthContext';

/**
 * AuthProvider Component
 *
 * Wraps the AuthContext provider for use in client components.
 * This allows the root layout to remain a pure server component.
 *
 * Usage:
 * ```jsx
 * import { AuthProvider } from '@/components/providers/AuthProvider';
 *
 * export default function SomePage() {
 *   return (
 *     <AuthProvider>
 *       <ClientComponent />
 *     </AuthProvider>
 *   );
 * }
 * ```
 */

// Re-export the ContextProvider as AuthProvider
const AuthProvider = ContextProvider;

export { AuthProvider };
export { useAuth } from '@/context/AuthContext';
