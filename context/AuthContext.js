/**
 * Authentication Context
 *
 * FIXED: Added proper loading state resolution in all error paths
 * to prevent perpetual loading state during initialization.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  getIdToken,
} from 'firebase/auth';
import { getAuthInstance, isConfigured as isFirebaseConfigured } from '@/lib/firebase';
import { setAuthCookie, clearAuthCookie } from '@/app/actions/auth';
import { getAuthErrorMessageString } from '@/lib/authErrorMessages';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  // Initialize state with sessionStorage values to prevent "Not authenticated" flash
  // Using lazy initializers to read from sessionStorage synchronously on first render
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('careflow_token');
      if (storedToken) {
        return {
          uid: 'authenticated',
          email: 'user@example.com',
          displayName: 'User',
        };
      }
    }
    return null;
  });
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('careflow_token') || null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use ref to track if we already have a user (prevents "Not authenticated" flash)
  // Initialize based on whether we have a token in sessionStorage
  const hasUserRef = useRef(
    typeof window !== 'undefined' && !!sessionStorage.getItem('careflow_token')
  );

  // Initialize authentication state
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Check if Firebase is configured
        if (!isFirebaseConfigured) {
          console.warn('Firebase not configured - skipping auth initialization');
          if (isMounted) {
            setLoading(false);
            setIsInitialized(true);
          }
          return;
        }

        // Get auth instance (may be null on SSR)
        const auth = getAuthInstance();

        if (!auth) {
          // SSR or auth not available
          if (isMounted) {
            setLoading(false);
            setIsInitialized(true);
          }
          return;
        }

        // Set up auth state listener
        unsubscribe = onAuthStateChanged(
          auth,
          async (user) => {
            if (!isMounted) return;

            // Don't reset loading if we already have a user - prevents "Not authenticated" flash
            // Only set loading true if we're transitioning from no user to user (initial load)
            if (!hasUserRef.current && user) {
              setLoading(true);
            }
            setError(null);

            if (user) {
              try {
                // Get fresh token
                const idToken = await getIdToken(user, true);

                if (!isMounted) return;

                setCurrentUser({
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                  photoURL: user.photoURL,
                  emailVerified: user.emailVerified,
                  phoneNumber: user.phoneNumber,
                });
                setToken(idToken);
                hasUserRef.current = true; // Mark that we have a user

                // Store token in sessionStorage (more secure than localStorage)
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('careflow_token', idToken);
                }

                // Fetch user's care4wId and phone from database
                try {
                  const response = await fetch('/api/users/settings', {
                    headers: {
                      Authorization: `Bearer ${idToken}`,
                    },
                  });
                  if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data?.settings) {
                      setCurrentUser((prev) => ({
                        ...prev,
                        care4wId: data.data.settings.care4wId || null,
                        personalPhoneNumber: data.data.settings.personalPhoneNumber || null,
                      }));
                    }
                  }
                } catch (settingsError) {
                  console.warn('Could not fetch user settings:', settingsError);
                  // Non-critical error, continue without care4wId
                }
              } catch (tokenError) {
                console.error('Error fetching user token:', tokenError);
                if (isMounted) {
                  setError('Failed to load user session');
                  setCurrentUser(null);
                  setToken(null);
                  hasUserRef.current = false;
                  // CRITICAL FIX: Ensure loading is set to false on error
                  setLoading(false);
                  setIsInitialized(true);
                }
                return;
              }
            } else if (isMounted) {
              setCurrentUser(null);
              setToken(null);
              hasUserRef.current = false;
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('careflow_token');
              }
            }

            if (isMounted) {
              setLoading(false);
              setIsInitialized(true);
            }
          },
          (authError) => {
            // Handle onAuthStateChanged error callback
            console.error('Auth state change error:', authError);
            if (isMounted) {
              setError('Authentication initialization failed');
              // CRITICAL FIX: Ensure loading is set to false on auth error
              setLoading(false);
              setIsInitialized(true);
            }
          }
        );
      } catch (initError) {
        console.error('Auth initialization error:', initError);
        if (isMounted) {
          setError('Failed to initialize authentication');
          // CRITICAL FIX: Ensure loading is set to false on init error
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Initialize with a small delay to ensure client-side hydration
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame for better hydration
      requestAnimationFrame(() => {
        initializeAuth();
      });
    } else {
      // SSR: Set loading to false immediately
      setLoading(false);
      setIsInitialized(true);
    }

    // Cleanup
    return () => {
      isMounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Token refresh effect (separate from initialization)
  useEffect(() => {
    if (!currentUser || !token) return;

    let refreshInterval = null;

    // Set up token refresh every 50 minutes
    refreshInterval = setInterval(
      async () => {
        try {
          const auth = getAuthInstance();
          if (auth?.currentUser) {
            const newToken = await getIdToken(auth.currentUser, true);
            setToken(newToken);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('careflow_token', newToken);
            }
          }
        } catch (err) {
          console.error('Token refresh failed:', err);
          // Don't logout on refresh failure, let the next API call handle it
        }
      },
      50 * 60 * 1000
    );

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [currentUser, token]);

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const auth = getAuthInstance();
      if (!auth) {
        throw new Error('Authentication not available');
      }
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Get the ID token
      const idToken = await getIdToken(user);

      // Update local state immediately for faster UI response
      setCurrentUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
      });
      setToken(idToken);
      hasUserRef.current = true; // Mark that we have a user

      // Store token in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('careflow_token', idToken);
      }

      // Set the ID token as an HTTP-only cookie for server-side auth
      try {
        await setAuthCookie(idToken);
      } catch (cookieError) {
        console.error('Failed to set auth cookie:', cookieError);
        // Continue anyway - client-side auth still works
      }

      setLoading(false);
      return { success: true, user };
    } catch (err) {
      console.error('Login error:', err);
      const userFriendlyError = getAuthErrorMessageString(err.code || 'unknown', err.message);
      setError(userFriendlyError);
      setLoading(false);
      return { success: false, error: userFriendlyError };
    }
  }, []);

  const signup = useCallback(async (email, password, displayName) => {
    try {
      setError(null);
      setLoading(true);
      const auth = getAuthInstance();
      if (!auth) {
        throw new Error('Authentication not available');
      }
      const result = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }

      // Get the ID token
      const idToken = await getIdToken(result.user);

      // Update local state immediately for faster UI response
      setCurrentUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName || result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
        phoneNumber: result.user.phoneNumber,
      });
      setToken(idToken);
      hasUserRef.current = true; // Mark that we have a user

      // Store token in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('careflow_token', idToken);
      }

      // Set the ID token as an HTTP-only cookie for server-side auth
      try {
        await setAuthCookie(idToken);
      } catch (cookieError) {
        console.error('Failed to set auth cookie:', cookieError);
        // Continue anyway - client-side auth still works
      }

      setLoading(false);

      // Wait for auth state to fully propagate before returning
      // This ensures the onAuthStateChanged callback has fired
      await new Promise((resolve) => setTimeout(resolve, 100));

      return { success: true, user: result.user };
    } catch (err) {
      console.error('Signup error:', err);
      const userFriendlyError = getAuthErrorMessageString(err.code || 'unknown', err.message);
      setError(userFriendlyError);
      setLoading(false);
      return { success: false, error: userFriendlyError };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setError(null);
      const auth = getAuthInstance();
      if (auth) {
        await signOut(auth);
      }
      setCurrentUser(null);
      setToken(null);
      hasUserRef.current = false; // Reset user flag

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('careflow_token');
      }

      // Clear the server-side cookie
      try {
        await clearAuthCookie();
      } catch (cookieError) {
        console.error('Failed to clear auth cookie:', cookieError);
        // Continue anyway - client-side cleanup is done
      }

      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    try {
      setError(null);
      const auth = getAuthInstance();
      if (!auth) {
        throw new Error('Authentication not available');
      }
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err) {
      console.error('Password reset error:', err);
      const userFriendlyError = getAuthErrorMessageString(err.code || 'unknown', err.message);
      setError(userFriendlyError);
      return { success: false, error: userFriendlyError };
    }
  }, []);

  const updateUserProfile = useCallback(
    async (data) => {
      try {
        setError(null);
        const auth = getAuthInstance();
        if (currentUser && auth?.currentUser) {
          await updateProfile(auth.currentUser, data);
          setCurrentUser({ ...currentUser, ...data });
          return { success: true };
        }
        return { success: false, error: 'No user logged in' };
      } catch (err) {
        console.error('Profile update error:', err);
        setError(err.message);
        return { success: false, error: err.message };
      }
    },
    [currentUser]
  );

  // Update user's care4wId in local state (called from callManager)
  const updateUserCare4wId = useCallback(
    (care4wId) => {
      if (currentUser && care4wId) {
        setCurrentUser({ ...currentUser, care4wId });
      }
    },
    [currentUser]
  );

  const value = {
    currentUser,
    user: currentUser, // Alias for convenience
    token,
    loading,
    error,
    isInitialized,
    login,
    signup,
    logout,
    resetPassword,
    updateUserProfile,
    updateUserCare4wId,
    setError,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}
