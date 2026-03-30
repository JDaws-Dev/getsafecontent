/**
 * Central JWT Authentication Context for SafeNet
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
const JWT_KEY = 'safenet_jwt';
const USER_KEY = 'safenet_user';

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
 * @property {function(): void} loginWithGoogle - Redirects to Marketing OAuth flow
 * @property {function(): void} logout
 * @property {function(string): Promise<{success: boolean, error?: string, code?: string}>} requestPasswordReset
 * @property {function(string, string, string): Promise<{success: boolean, error?: string}>} resetPassword
 * @property {function(): Promise<void>} refreshUser
 */

const AuthContext = createContext(null);

// Marketing OAuth URL
const MARKETING_OAUTH_URL = 'https://getsafefamily.com/oauth';

/**
 * AuthProvider component that manages JWT auth state
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

  /**
   * Handle OAuth callback token from URL params
   */
  const handleOAuthCallback = useCallback((tokenParam, expiresAtParam) => {
    if (!tokenParam) return false;


    // Store the token
    localStorage.setItem(JWT_KEY, tokenParam);
    setToken(tokenParam);

    // Clean up URL params
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('expiresAt');
    window.history.replaceState({}, '', url.toString());

    return true;
  }, []);

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

      // Check if user is entitled to SafeNet
      if (!data.user.entitledApps?.includes('safenet')) {
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
   * Also handles OAuth callback if token is in URL params
   */
  useEffect(() => {
    const initAuth = async () => {
      // Check for OAuth callback token in URL
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      const expiresAtParam = urlParams.get('expiresAt');

      if (tokenParam) {
        // Handle OAuth callback
        handleOAuthCallback(tokenParam, expiresAtParam);
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

      // TODO: Check entitlement to SafeNet once Marketing Central supports it
      // For now, allow all authenticated users during development
      // if (!data.user.entitledApps?.includes('safenet')) {
      //   return {
      //     success: false,
      //     error: 'NOT_ENTITLED',
      //     code: 'NOT_ENTITLED',
      //     user: data.user,
      //   };
      // }

      // Store token and user
      localStorage.setItem(JWT_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);


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
  }, []);

  /**
   * Redirect to Marketing's Google OAuth flow
   * After OAuth completes, Marketing will redirect back with JWT
   */
  const loginWithGoogle = useCallback(() => {
    const returnTo = window.location.origin + '/login';
    const oauthUrl = new URL(MARKETING_OAUTH_URL);
    oauthUrl.searchParams.set('returnTo', returnTo);
    oauthUrl.searchParams.set('app', 'SafeNet');

    window.location.href = oauthUrl.toString();
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
    loginWithGoogle,
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
