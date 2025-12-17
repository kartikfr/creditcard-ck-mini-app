import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { generateToken, refreshToken as refreshTokenApi, initGuestToken, stopTokenRefresh } from '@/lib/api';

interface User {
  userId: number;
  mobileNumber: string;
  email: string;
  firstName: string;
  isNewUser: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  refreshTokenStr: string | null;
  guestToken: string | null;
}

interface AuthContextType extends AuthState {
  login: (loginData: {
    access_token: string;
    refresh_token: string;
    user_id: number;
    mobile_number: string;
    email: string;
    first_name: string;
    is_new_user: boolean;
    expires_in?: number; // Not always returned by CashKaro
  }) => void;
  logout: () => void;
  getGuestToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
    refreshTokenStr: null,
    guestToken: null,
  });

  const [userTokenRefreshTimer, setUserTokenRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Initialize guest token on mount with auto-refresh
  useEffect(() => {
    const initToken = async () => {
      try {
        console.log('[Auth] Initializing guest token...');
        const token = await initGuestToken();
        console.log('[Auth] Guest token initialized successfully');
        setState(prev => ({
          ...prev,
          guestToken: token,
          isLoading: false,
        }));
      } catch (error) {
        console.error('[Auth] Failed to generate guest token:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initToken();

    // Cleanup on unmount
    return () => {
      stopTokenRefresh();
    };
  }, []);

  // Best-effort: derive expires_in from JWT exp if API doesn't return it
  const getExpiresInFromJwt = useCallback((jwt: string): number | null => {
    try {
      const [, payloadB64] = jwt.split('.');
      if (!payloadB64) return null;

      const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson) as { exp?: number; iat?: number };

      if (!payload.exp) return null;
      const nowSec = Math.floor(Date.now() / 1000);
      return Math.max(payload.exp - nowSec, 0);
    } catch {
      return null;
    }
  }, []);

  // Setup user token refresh (for authenticated users)
  const setupUserTokenRefresh = useCallback((expiresIn: number, currentRefreshToken: string, currentAccessToken: string) => {
    if (userTokenRefreshTimer) {
      clearTimeout(userTokenRefreshTimer);
    }

    // Refresh 2 minutes before expiry
    const refreshTime = Math.max((expiresIn - 120) * 1000, 60000); // At least 1 minute
    console.log(`[Auth] User token will refresh in ${refreshTime / 1000} seconds`);

    const timer = setTimeout(async () => {
      console.log('[Auth] Refreshing user access token...');
      try {
        const response = await refreshTokenApi(currentRefreshToken, currentAccessToken);
        const newData = response.data.attributes;

        setState(prev => ({
          ...prev,
          accessToken: newData.access_token,
          refreshTokenStr: newData.refresh_token,
        }));

        const nextExpiresIn =
          typeof newData.expires_in === 'number'
            ? newData.expires_in
            : getExpiresInFromJwt(newData.access_token);

        if (typeof nextExpiresIn === 'number') {
          console.log('[Auth] User token refreshed successfully');
          setupUserTokenRefresh(nextExpiresIn, newData.refresh_token, newData.access_token);
        } else {
          console.warn('[Auth] Token refreshed but expires_in missing; skipping auto-refresh scheduling');
        }
      } catch (error) {
        console.error('[Auth] Token refresh failed:', error);
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshTokenStr: null,
        }));
      }
    }, refreshTime);

    setUserTokenRefreshTimer(timer);
  }, [userTokenRefreshTimer, getExpiresInFromJwt]);

  const login = useCallback((loginData: {
    access_token: string;
    refresh_token: string;
    user_id: number;
    mobile_number: string;
    email: string;
    first_name: string;
    is_new_user: boolean;
    expires_in?: number;
  }) => {
    console.log('[Auth] User logged in:', loginData.first_name);

    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      accessToken: loginData.access_token,
      refreshTokenStr: loginData.refresh_token,
      user: {
        userId: loginData.user_id,
        mobileNumber: loginData.mobile_number,
        email: loginData.email,
        firstName: loginData.first_name,
        isNewUser: loginData.is_new_user,
      },
    }));

    const expiresIn =
      typeof loginData.expires_in === 'number'
        ? loginData.expires_in
        : getExpiresInFromJwt(loginData.access_token);

    if (typeof expiresIn === 'number') {
      setupUserTokenRefresh(expiresIn, loginData.refresh_token, loginData.access_token);
    } else {
      console.warn('[Auth] Login succeeded but expires_in missing; skipping auto-refresh scheduling');
    }
  }, [setupUserTokenRefresh, getExpiresInFromJwt]);

  const logout = useCallback(() => {
    console.log('[Auth] User logged out');
    
    if (userTokenRefreshTimer) {
      clearTimeout(userTokenRefreshTimer);
    }

    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshTokenStr: null,
    }));
  }, [userTokenRefreshTimer]);

  const getGuestToken = useCallback(async (): Promise<string> => {
    // Always delegate to the API token manager which handles expiry + refresh.
    // (state.guestToken can become stale if the app stays open for a long time)
    const token = await initGuestToken();

    if (token !== state.guestToken) {
      setState(prev => ({ ...prev, guestToken: token }));
    }

    return token;
  }, [state.guestToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (userTokenRefreshTimer) {
        clearTimeout(userTokenRefreshTimer);
      }
    };
  }, [userTokenRefreshTimer]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        getGuestToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
