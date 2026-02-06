"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && currentUser) {
      router.push("/dashboard");
    }
  }, [mounted, loading, currentUser, router]);

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark via-primary-blue/10 to-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-primary-blue/10 to-background-dark flex items-center justify-center px-4 relative overflow-hidden">
      {/* Scenery Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80"
          alt="Beautiful mountain landscape"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-background-dark/90 via-background-dark/80 to-background-dark/90"></div>
      </div>

      <div className="w-full max-w-2xl text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          CareFlow
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          Browser-based calling powered by Twilio Voice
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="px-8 py-4 bg-gradient-to-r from-primary-red to-primary-blue text-white font-medium rounded-lg hover:opacity-90 transition-all"
          >
            Sign In
          </a>
          <a
            href="/signup"
            className="px-8 py-4 bg-white/10 backdrop-blur-lg border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all"
          >
            Create Account
          </a>
        </div>

        <p className="mt-8 text-gray-400 text-sm">
          Secure. Reliable. Browser-based calling.
        </p>
      </div>
    </div>
  );
}
