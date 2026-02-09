import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // Check for existing token on initial mount and when auth state changes
    const storedToken =
      typeof window !== "undefined"
        ? localStorage.getItem("careflow_token")
        : null;

    // If we have either a Firebase user or a stored token, grant access
    if (currentUser || storedToken) {
      setHasAccess(true);
    }

    // If Firebase has finished loading and no user/token, redirect to login
    if (!loading && !currentUser && !storedToken) {
      router.push("/login");
    }

    // Mark initial auth check as complete
    setIsCheckingAuth(false);
  }, [currentUser, loading, router]);

  // Show loading spinner only during initial auth check
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-red"></div>
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
