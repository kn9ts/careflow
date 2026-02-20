import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * ProtectedRoute Component
 *
 * Guards protected routes by verifying authentication state before rendering children.
 *
 * FIXES IMPLEMENTED:
 * - CRITICAL-02: Changed localStorage to sessionStorage to match AuthContext
 * - DEP-01: Added isInitialized check to prevent rendering before auth state is determined
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {React.ReactNode} - Protected children or loading/redirect state
 */
export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { currentUser, loading, isInitialized } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // FIX: Use sessionStorage to match AuthContext token storage
    // This resolves the storage mismatch issue (CRITICAL-02)
    const storedToken =
      typeof window !== 'undefined' ? sessionStorage.getItem('careflow_token') : null;

    // Only evaluate access after auth is fully initialized (DEP-01 fix)
    // This prevents race conditions where we grant access before Firebase confirms auth state
    if (!isInitialized) {
      // Auth is still initializing - don't make access decisions yet
      return;
    }

    // If we have either a Firebase user or a stored token, grant access
    if (currentUser || storedToken) {
      setHasAccess(true);
    }

    // If Firebase has finished loading and no user/token, redirect to login
    if (!loading && !currentUser && !storedToken) {
      router.push('/login');
    }

    // Mark initial auth check as complete only after initialization
    setIsCheckingAuth(false);
  }, [currentUser, loading, isInitialized, router]);

  // Show loading spinner during auth initialization or initial check
  // FIX: Also wait for isInitialized to be true (DEP-01)
  if (!isInitialized || loading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-red" />
      </div>
    );
  }

  // If we have access, render the children
  if (hasAccess) {
    return <>{children}</>;
  }

  // No access and not loading - show nothing (redirect will happen)
  return null;
}
