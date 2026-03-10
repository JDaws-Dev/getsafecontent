"use client";

/**
 * Central JWT Authentication Context for SafeReads
 *
 * This context manages authentication state using JWT tokens from the central
 * Marketing auth system. No local Convex Auth is needed.
 *
 * Architecture:
 * - Marketing (adamant-crow-705.convex.site) is the ONLY auth system
 * - Apps store JWT in localStorage
 * - Apps verify JWT with Marketing for protected routes
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// Marketing Convex backend URL for auth endpoints
const CENTRAL_AUTH_URL = "https://adamant-crow-705.convex.site";

// Storage keys
const JWT_KEY = "safereads_jwt";
const USER_KEY = "safereads_user";

interface User {
  id: string;
  email: string;
  name: string | null;
  subscriptionStatus: string;
  entitledApps: string[];
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string; user?: User }>;
  loginWithGoogle: () => void;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Marketing OAuth URL
const MARKETING_OAUTH_URL = "https://getsafefamily.com/oauth";

/**
 * AuthProvider component that manages JWT auth state
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  /**
   * Handle OAuth callback token from URL params
   */
  const handleOAuthCallback = useCallback((tokenParam: string): boolean => {
    if (!tokenParam) return false;

    console.log("[AuthContext] Handling OAuth callback token");

    // Store the token
    localStorage.setItem(JWT_KEY, tokenParam);
    setToken(tokenParam);

    // Clean up URL params
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    url.searchParams.delete("expiresAt");
    window.history.replaceState({}, "", url.toString());

    return true;
  }, []);

  /**
   * Verify the stored token and get fresh user data
   */
  const verifyAndRefresh = useCallback(async (storedToken: string): Promise<boolean> => {
    if (!storedToken) {
      setIsLoading(false);
      return false;
    }

    try {
      const response = await fetch(
        `${CENTRAL_AUTH_URL}/verifyToken?token=${encodeURIComponent(storedToken)}`
      );

      if (!response.ok) {
        // Token invalid or expired
        console.log("[AuthContext] Token verification failed:", response.status);
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        return false;
      }

      const data = await response.json();

      if (!data.valid) {
        console.log("[AuthContext] Token invalid:", data.error);
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        return false;
      }

      // Check if user is entitled to SafeReads
      if (!data.user.entitledApps?.includes("safereads")) {
        console.log("[AuthContext] User not entitled to SafeReads");
        // Still set the user but they will be redirected by protected routes
      }

      // Update user state with fresh data
      setUser(data.user);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return true;
    } catch (error) {
      console.error("[AuthContext] Token verification error:", error);
      // Network error - keep the cached user for offline support
      const cachedUser = localStorage.getItem(USER_KEY);
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
          return true;
        } catch {
          // Invalid cached user
        }
      }
      localStorage.removeItem(JWT_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
      return false;
    }
  }, []);

  /**
   * Initialize auth state on mount
   * Also handles OAuth callback if token is in URL params
   */
  useEffect(() => {
    // Guard for SSR - localStorage is only available in browser
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      // Check for OAuth callback token in URL
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get("token");

      if (tokenParam) {
        // Handle OAuth callback
        handleOAuthCallback(tokenParam);
        await verifyAndRefresh(tokenParam);
        setIsLoading(false);
        return;
      }

      // Check for stored token
      const storedToken = localStorage.getItem(JWT_KEY);

      if (storedToken) {
        setToken(storedToken);
        await verifyAndRefresh(storedToken);
      }

      setIsLoading(false);
    };

    initAuth();
  }, [verifyAndRefresh, handleOAuthCallback]);

  /**
   * Log in with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${CENTRAL_AUTH_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Invalid email or password",
          code: data.code,
        };
      }

      // Check entitlement to SafeReads
      if (!data.user.entitledApps?.includes("safereads")) {
        // Return the user data so the caller can show upgrade prompt
        return {
          success: false,
          error: "NOT_ENTITLED",
          code: "NOT_ENTITLED",
          user: data.user,
        };
      }

      // Store token and user
      localStorage.setItem(JWT_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      console.log("[AuthContext] Login successful for:", email);

      return { success: true, user: data.user };
    } catch (error) {
      console.error("[AuthContext] Login error:", error);
      return {
        success: false,
        error: "Network error. Please check your connection.",
      };
    }
  }, []);

  /**
   * Log out and clear state
   */
  const logout = useCallback(() => {
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    console.log("[AuthContext] Logged out");
  }, []);

  /**
   * Redirect to Marketing's Google OAuth flow
   * After OAuth completes, Marketing will redirect back with JWT
   */
  const loginWithGoogle = useCallback(() => {
    // Build the return URL with the login path (so we return and handle the token)
    const returnTo = window.location.origin + "/login";
    const oauthUrl = new URL(MARKETING_OAUTH_URL);
    oauthUrl.searchParams.set("returnTo", returnTo);
    oauthUrl.searchParams.set("app", "SafeReads");

    console.log("[AuthContext] Redirecting to Marketing OAuth:", oauthUrl.toString());
    window.location.href = oauthUrl.toString();
  }, []);

  /**
   * Request a password reset email
   */
  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const response = await fetch(`${CENTRAL_AUTH_URL}/requestPasswordReset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.code === "OAUTH_ONLY") {
        return {
          success: false,
          error: data.error,
          code: "OAUTH_ONLY",
        };
      }

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Failed to send password reset email",
          code: data.code,
        };
      }

      return { success: true };
    } catch (error) {
      console.error("[AuthContext] Password reset request error:", error);
      return {
        success: false,
        error: "Network error. Please check your connection.",
      };
    }
  }, []);

  /**
   * Reset password with OTP code
   */
  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    try {
      const response = await fetch(`${CENTRAL_AUTH_URL}/resetPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Failed to reset password",
        };
      }

      // Password reset returns a JWT for auto-login
      localStorage.setItem(JWT_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      console.log("[AuthContext] Password reset successful for:", email);

      return { success: true, user: data.user };
    } catch (error) {
      console.error("[AuthContext] Password reset error:", error);
      return {
        success: false,
        error: "Network error. Please check your connection.",
      };
    }
  }, []);

  /**
   * Refresh user data from central auth
   */
  const refreshUser = useCallback(async () => {
    if (token) {
      await verifyAndRefresh(token);
    }
  }, [token, verifyAndRefresh]);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithGoogle,
    logout,
    requestPasswordReset,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Default auth value for SSR/prerendering
const defaultAuthValue: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false, error: "Not initialized" }),
  loginWithGoogle: () => {},
  logout: () => {},
  requestPasswordReset: async () => ({ success: false, error: "Not initialized" }),
  resetPassword: async () => ({ success: false, error: "Not initialized" }),
  refreshUser: async () => {},
};

/**
 * Hook to access auth context
 * Returns default values during SSR/prerendering to prevent build errors
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  // During SSR/prerendering, context may be null
  // Return safe defaults to prevent build errors
  if (!context) {
    // Check if we're in browser vs server
    if (typeof window === "undefined") {
      return defaultAuthValue;
    }
    // In browser but no context = error
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
