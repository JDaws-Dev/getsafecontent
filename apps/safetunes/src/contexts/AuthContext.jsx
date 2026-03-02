/**
 * Central JWT Authentication Context for SafeTunes
 *
 * This context manages authentication state using JWT tokens from the central
 * Marketing auth system. No local Convex Auth is needed.
 *
 * Architecture:
 * - Marketing (adamant-crow-705.convex.site) is the ONLY auth system
 * - Apps store JWT in localStorage
 * - Apps verify JWT with Marketing for protected routes
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Marketing Convex backend URL for auth endpoints
const CENTRAL_AUTH_URL = 'https://adamant-crow-705.convex.site';

// Storage keys
const JWT_KEY = 'safetunes_jwt';
const USER_KEY = 'safetunes_user';

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string|null} name
 * @property {string} subscriptionStatus
 * @property {string[]} entitledApps
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {User|null} user
 * @property {boolean} isAuthenticated
 * @property {boolean} isLoading
 * @property {function(string, string): Promise<{success: boolean, error?: string, code?: string}>} login
 * @property {function(): void} logout
 * @property {function(string): Promise<{success: boolean, error?: string, code?: string}>} requestPasswordReset
 * @property {function(string, string, string): Promise<{success: boolean, error?: string}>} resetPassword
 * @property {function(): Promise<void>} refreshUser
 */

const AuthContext = createContext(null);

/**
 * AuthProvider component that manages JWT auth state
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

  /**
   * Verify the stored token and get fresh user data
   */
  const verifyAndRefresh = useCallback(async (storedToken) => {
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
        console.log('[AuthContext] Token verification failed:', response.status);
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        return false;
      }

      const data = await response.json();

      if (!data.valid) {
        console.log('[AuthContext] Token invalid:', data.error);
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        return false;
      }

      // Check if user is entitled to SafeTunes
      if (!data.user.entitledApps?.includes('safetunes')) {
        console.log('[AuthContext] User not entitled to SafeTunes');
        // Still set the user but they will be redirected by protected routes
      }

      // Update user state with fresh data
      setUser(data.user);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return true;
    } catch (error) {
      console.error('[AuthContext] Token verification error:', error);
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
   */
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(JWT_KEY);

      if (storedToken) {
        setToken(storedToken);
        await verifyAndRefresh(storedToken);
      }

      setIsLoading(false);
    };

    initAuth();
  }, [verifyAndRefresh]);

  /**
   * Log in with email and password
   * @returns {Promise<{success: boolean, error?: string, code?: string, user?: User}>}
   */
  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch(`${CENTRAL_AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Invalid email or password',
          code: data.code,
        };
      }

      // Check entitlement to SafeTunes
      if (!data.user.entitledApps?.includes('safetunes')) {
        // Return the user data so the caller can show upgrade prompt
        return {
          success: false,
          error: 'NOT_ENTITLED',
          code: 'NOT_ENTITLED',
          user: data.user,
        };
      }

      // Store token and user
      localStorage.setItem(JWT_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      console.log('[AuthContext] Login successful for:', email);

      return { success: true, user: data.user };
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
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
    console.log('[AuthContext] Logged out');
  }, []);

  /**
   * Request a password reset email
   * @returns {Promise<{success: boolean, error?: string, code?: string}>}
   */
  const requestPasswordReset = useCallback(async (email) => {
    try {
      const response = await fetch(`${CENTRAL_AUTH_URL}/requestPasswordReset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      // The endpoint always returns success for security (don't reveal if email exists)
      // But it may return OAUTH_ONLY code if the user uses Google sign-in
      if (data.code === 'OAUTH_ONLY') {
        return {
          success: false,
          error: data.error,
          code: 'OAUTH_ONLY',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthContext] Password reset request error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }, []);

  /**
   * Reset password with OTP code
   * @returns {Promise<{success: boolean, error?: string, user?: User}>}
   */
  const resetPassword = useCallback(async (email, code, newPassword) => {
    try {
      const response = await fetch(`${CENTRAL_AUTH_URL}/resetPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to reset password',
        };
      }

      // Password reset returns a JWT for auto-login
      localStorage.setItem(JWT_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      console.log('[AuthContext] Password reset successful for:', email);

      return { success: true, user: data.user };
    } catch (error) {
      console.error('[AuthContext] Password reset error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
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

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    requestPasswordReset,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * @returns {AuthContextValue}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
