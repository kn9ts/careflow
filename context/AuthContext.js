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
  useEffect(function () {
    // Skip if auth is not available (SSR case)
    if (!auth) {
      setLoading(false);
      return;
    }

    var unsubscribe = onAuthStateChanged(auth, async function (user) {
      setLoading(true);
      setError(null);

      if (user) {
        try {
          // Get fresh token
          var idToken = await getIdToken(user, true);

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

          // Store token in localStorage for persistence
          if (typeof window !== "undefined") {
            localStorage.setItem("careflow_token", idToken);
          }

          // Set up token refresh every 50 minutes
          var tokenRefresh = setInterval(
            async function () {
              try {
                var newToken = await getIdToken(user, true);
                setToken(newToken);
                if (typeof window !== "undefined") {
                  localStorage.setItem("careflow_token", newToken);
                }
              } catch (err) {
                console.error("Token refresh failed:", err);
                await logout();
              }
            },
            50 * 60 * 1000,
          );

          return function () {
            clearInterval(tokenRefresh);
          };
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

    return function () {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  async function login(email, password) {
    try {
      setError(null);
      var result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }

  async function signup(email, password, displayName) {
    try {
      setError(null);
      var result = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName) {
        await updateProfile(result.user, { displayName: displayName });
      }

      return { success: true, user: result.user };
    } catch (error) {
      console.error("Signup error:", error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }

  async function logout() {
    try {
      setError(null);
      await signOut(auth);
      setCurrentUser(null);
      setToken(null);

      if (typeof window !== "undefined") {
        localStorage.removeItem("careflow_token");
      }

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }

  async function resetPassword(email) {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }

  async function updateUserProfile(data) {
    try {
      setError(null);
      if (currentUser && auth.currentUser) {
        await updateProfile(auth.currentUser, data);

        setCurrentUser(Object.assign({}, currentUser, data));
        return { success: true };
      }
      return { success: false, error: "No user logged in" };
    } catch (error) {
      console.error("Profile update error:", error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }

  var value = {
    currentUser: currentUser,
    token: token,
    loading: loading,
    error: error,
    login: login,
    signup: signup,
    logout: logout,
    resetPassword: resetPassword,
    updateUserProfile: updateUserProfile,
    setError: setError,
  };

  return React.createElement(AuthContext.Provider, { value: value }, children);
}
