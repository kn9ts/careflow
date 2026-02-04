import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { initializeApp } from "@/lib/init";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CareFlow",
  description: "Make and receive phone calls in your browser",
};

// Initialize application configuration on client side
if (typeof window !== "undefined") {
  // Client-side initialization
  initializeApp().catch((error) => {
    console.warn("⚠️  Client-side initialization failed:", error.message);
    // Don't throw error for client-side initialization to avoid breaking the app
  });
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-background-dark text-white min-h-screen`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
