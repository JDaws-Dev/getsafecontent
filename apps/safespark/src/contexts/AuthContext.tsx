"use client";

/**
 * Central JWT Authentication Context for SafeSpark
 *
 * Mirrors the SafeReads federated-auth pattern: Marketing Central is
 * the only auth system, JWT lives in localStorage, /verifyToken
 * validates against `adamant-crow-705.convex.site`.
 *
 * Coexists with Clerk during the migration window — Clerk handles
 * legacy `/sign-in` route, this handles new `/login` route. Both
 * paths resolve to the same SafeSpark users row (email is the
 * common key). Eventually Clerk gets retired.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const CENTRAL_AUTH_URL = "https://adamant-crow-705.convex.site";
const MARKETING_OAUTH_URL = "https://getsafefamily.com/oauth";

// Storage keys — namespaced so they don't collide with the other 4 apps.
const JWT_KEY = "safespark_jwt";
const USER_KEY = "safespark_user";

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
  login: (
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    code?: string;
    user?: User;
  }>;
  loginWithGoogle: () => void;
  logout: () => void;
  requestPasswordReset: (
    email: string,
  ) => Promise<{ success: boolean; error?: string; code?: string }>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const handleOAuthCallback = useCallback((tokenParam: string): boolean => {
    if (!tokenParam) return false;
    localStorage.setItem(JWT_KEY, tokenParam);
    setToken(tokenParam);
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    url.searchParams.delete("expiresAt");
    window.history.replaceState({}, "", url.toString());
    return true;
  }, []);

  const verifyAndRefresh = useCallback(
    async (storedToken: string): Promise<boolean> => {
      if (!storedToken) {
        setIsLoading(false);
        return false;
      }
      try {
        const response = await fetch(
          `${CENTRAL_AUTH_URL}/verifyToken?token=${encodeURIComponent(storedToken)}`,
        );
        if (!response.ok) {
          localStorage.removeItem(JWT_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
          return false;
        }
        const data = await response.json();
        if (!data.valid) {
          localStorage.removeItem(JWT_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
          return false;
        }
        // Don't gate here — let protected routes/queries decide what to
        // show non-entitled users (upgrade screen vs blank). Login flow
        // checks entitledApps explicitly below.
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return true;
      } catch {
        // Network error — fall back to cached user for graceful degradation.
        const cached = localStorage.getItem(USER_KEY);
        if (cached) {
          try {
            setUser(JSON.parse(cached));
            return true;
          } catch {
            /* invalid cache */
          }
        }
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }
    const initAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get("token");
      if (tokenParam) {
        handleOAuthCallback(tokenParam);
        await verifyAndRefresh(tokenParam);
        setIsLoading(false);
        return;
      }
      const storedToken = localStorage.getItem(JWT_KEY);
      if (storedToken) {
        setToken(storedToken);
        await verifyAndRefresh(storedToken);
      }
      setIsLoading(false);
    };
    initAuth();
  }, [verifyAndRefresh, handleOAuthCallback]);

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
      // Gate on SafeSpark entitlement. Non-entitled users get a "you don't
      // have access — upgrade?" screen on /login. They CAN log in to other
      // Safe Family apps with the same credentials.
      if (!data.user.entitledApps?.includes("safespark")) {
        return {
          success: false,
          error: "NOT_ENTITLED",
          code: "NOT_ENTITLED",
          user: data.user,
        };
      }
      localStorage.setItem(JWT_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch {
      return {
        success: false,
        error: "Network error. Please check your connection.",
      };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const loginWithGoogle = useCallback(() => {
    const returnTo = window.location.origin + "/login";
    const oauthUrl = new URL(MARKETING_OAUTH_URL);
    oauthUrl.searchParams.set("returnTo", returnTo);
    oauthUrl.searchParams.set("app", "SafeSpark");
    window.location.href = oauthUrl.toString();
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const response = await fetch(
        `${CENTRAL_AUTH_URL}/requestPasswordReset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      const data = await response.json();
      if (data.code === "OAUTH_ONLY") {
        return { success: false, error: data.error, code: "OAUTH_ONLY" };
      }
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Network error. Please check your connection.",
      };
    }
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
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
        localStorage.setItem(JWT_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      } catch {
        return {
          success: false,
          error: "Network error. Please check your connection.",
        };
      }
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    if (token) await verifyAndRefresh(token);
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

const defaultAuthValue: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false, error: "Not initialized" }),
  loginWithGoogle: () => {},
  logout: () => {},
  requestPasswordReset: async () => ({
    success: false,
    error: "Not initialized",
  }),
  resetPassword: async () => ({ success: false, error: "Not initialized" }),
  refreshUser: async () => {},
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    if (typeof window === "undefined") return defaultAuthValue;
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
