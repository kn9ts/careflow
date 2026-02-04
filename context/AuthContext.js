"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  getIdToken,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError(null);

      if (user) {
        try {
          // Get fresh token
          const idToken = await getIdToken(user, true);

          // Fetch additional user data if needed
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            phoneNumber: user.phoneNumber,
          });
          setToken(idToken);

          // Set up token refresh every 50 minutes (Firebase tokens expire in 60 minutes)
          const tokenRefresh = setInterval(
            async () => {
              try {
                const newToken = await getIdToken(user, true);
                setToken(newToken);
              } catch (err) {
                console.error("Token refresh failed:", err);
                // If token refresh fails, sign out user
                await handleLogout();
              }
            },
            50 * 60 * 1000,
          ); // 50 minutes

          return () => clearInterval(tokenRefresh);
        } catch (error) {
          console.error("Error fetching user data:", error);
          setError("Failed to load user data");
          setCurrentUser(null);
          setToken(null);
        }
      } else {
        setCurrentUser(null);
        setToken(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up function
  const signup = async (email, password, displayName) => {
    setLoading(true);
    setError(null);

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Update profile with display name
      if (displayName) {
        await updateProfile(result.user, {
          displayName: displayName,
        });
      }

      setCurrentUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
        phoneNumber: result.user.phoneNumber,
      });

      return { success: true, user: result.user };
    } catch (error) {
      console.error("Signup error:", error);
      setError(getErrorMessage(error.code));
      return { success: false, error: getErrorMessage(error.code) };
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      setCurrentUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
        phoneNumber: result.user.phoneNumber,
      });

      return { success: true, user: result.user };
    } catch (error) {
      console.error("Login error:", error);
      setError(getErrorMessage(error.code));
      return { success: false, error: getErrorMessage(error.code) };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    setError(null);

    try {
      await signOut(auth);
      setCurrentUser(null);
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      setError("Failed to logout");
      return { success: false, error: "Failed to logout" };
    } finally {
      setLoading(false);
    }
  };

  // Password reset function
  const resetPassword = async (email) => {
    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: "Password reset email sent" };
    } catch (error) {
      console.error("Password reset error:", error);
      setError(getErrorMessage(error.code));
      return { success: false, error: getErrorMessage(error.code) };
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfileData = async (displayName, photoURL) => {
    if (!currentUser) return { success: false, error: "No user logged in" };

    setLoading(true);
    setError(null);

    try {
      await updateProfile(auth.currentUser, {
        displayName,
        photoURL,
      });

      setCurrentUser({
        ...currentUser,
        displayName,
        photoURL,
      });

      return { success: true };
    } catch (error) {
      console.error("Profile update error:", error);
      setError(getErrorMessage(error.code));
      return { success: false, error: getErrorMessage(error.code) };
    } finally {
      setLoading(false);
    }
  };

  // Get error message helper
  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "An account with this email already exists";
      case "auth/invalid-email":
        return "Invalid email address";
      case "auth/weak-password":
        return "Password is too weak. Please use at least 6 characters";
      case "auth/user-not-found":
        return "No account found with this email address";
      case "auth/wrong-password":
        return "Incorrect password";
      case "auth/user-disabled":
        return "This account has been disabled";
      case "auth/operation-not-allowed":
        return "Email/password accounts are not enabled";
      case "auth/too-many-requests":
        return "Too many login attempts. Please try again later";
      case "auth/network-request-failed":
        return "Network error. Please check your connection";
      default:
        return "An error occurred. Please try again.";
    }
  };

  const value = {
    currentUser,
    token,
    loading,
    error,
    setError,
    login,
    signup,
    logout,
    resetPassword,
    updateProfileData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
