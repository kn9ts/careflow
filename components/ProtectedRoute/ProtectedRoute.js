import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { currentUser, loading, token } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!loading) {
      // Check if user is authenticated via Firebase or has token in localStorage
      const storedToken =
        typeof window !== "undefined"
          ? localStorage.getItem("careflow_token")
          : null;

      if (!currentUser && !storedToken) {
        // Redirect to login if not authenticated
        router.push("/login");
      } else {
        setIsCheckingAuth(false);
      }
    }
  }, [currentUser, loading, router]);

  if (loading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-red"></div>
      </div>
    );
  }

  return <>{children}</>;
}
