import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { refreshToken as refreshTokenApi, initGuestToken, stopTokenRefresh } from '@/lib/api';

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
    expires_in?: number;
  }) => void;
  logout: () => void;
  getGuestToken: () => Promise<string>;
}

const AUTH_STORAGE_KEY = 'cashkaro_auth';

interface StoredAuthData {
  accessToken: string;
  refreshTokenStr: string;
  user: User;
  expiresAt: number;
}

const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// Helper to decode JWT and get expiration time
const getJwtExpiration = (jwt: string): number | null => {
  try {
    const [, payloadB64] = jwt.split('.');
    if (!payloadB64) return null;
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

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

  const saveAuthToStorage = useCallback((accessToken: string, refreshTokenStr: string, user: User, expiresAt: number) => {
    const data: StoredAuthData = { accessToken, refreshTokenStr, user, expiresAt };
    safeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  }, []);

  const restoreAuthFromStorage = useCallback((): StoredAuthData | null => {
    try {
      const stored = safeStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      const data = JSON.parse(stored) as StoredAuthData;
      if (!data.accessToken || !data.refreshTokenStr || !data.user || !data.expiresAt) {
        safeStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      return data;
    } catch {
      safeStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }, []);

  const getExpiresInFromJwt = useCallback((jwt: string): number | null => {
    const expMs = getJwtExpiration(jwt);
    if (!expMs) return null;
    const nowMs = Date.now();
    return Math.max(Math.floor((expMs - nowMs) / 1000), 0);
  }, []);

  const clearAuth = useCallback(() => {
    safeStorage.removeItem(AUTH_STORAGE_KEY);
    if (userTokenRefreshTimer) clearInterval(userTokenRefreshTimer);

    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshTokenStr: null,
    }));
  }, [userTokenRefreshTimer]);

  // Fixed 10-minute refresh interval
  const USER_TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

  const setupUserTokenRefresh = useCallback((currentRefreshToken: string, currentAccessToken: string) => {
    if (userTokenRefreshTimer) clearInterval(userTokenRefreshTimer);

    console.log('[Auth] Setting up user token refresh every 10 minutes');

    const timer = setInterval(async () => {
      console.log('[Auth] Auto-refreshing user token (10 min interval)...');
      try {
        const response = await refreshTokenApi(currentRefreshToken, currentAccessToken);
        const newData = response.data.attributes;

        const newAccessToken = newData.access_token;
        const newRefreshToken = newData.refresh_token;

        setState(prev => {
          if (!prev.user) return prev;

          const newExpiresIn =
            typeof newData.expires_in === 'number'
              ? newData.expires_in
              : getExpiresInFromJwt(newAccessToken);

          const expiresAt = newExpiresIn ? Date.now() + newExpiresIn * 1000 : Date.now() + 3600000;
          saveAuthToStorage(newAccessToken, newRefreshToken, prev.user, expiresAt);

          console.log('[Auth] User token refreshed successfully');

          return {
            ...prev,
            accessToken: newAccessToken,
            refreshTokenStr: newRefreshToken,
          };
        });

        // Update the interval with new tokens for next refresh
        setupUserTokenRefresh(newRefreshToken, newAccessToken);
      } catch (error: any) {
        console.error('[Auth] Failed to refresh user token:', error);
        const msg = String(error?.message || '');
        if (msg.includes('401') || msg.includes('Unauthorized')) {
          clearAuth();
        }
        // Don't retry on error - interval will continue
      }
    }, USER_TOKEN_REFRESH_INTERVAL);

    setUserTokenRefreshTimer(timer);
  }, [userTokenRefreshTimer, getExpiresInFromJwt, saveAuthToStorage, clearAuth]);

  useEffect(() => {
    const initAuth = async () => {
      const storedAuth = restoreAuthFromStorage();

      if (storedAuth) {
        const isExpiredSoon = storedAuth.expiresAt < Date.now() + 300000;

        if (isExpiredSoon) {
          try {
            const response = await refreshTokenApi(storedAuth.refreshTokenStr, storedAuth.accessToken);
            const newData = response.data.attributes;

            const newExpiresIn =
              typeof newData.expires_in === 'number'
                ? newData.expires_in
                : getExpiresInFromJwt(newData.access_token);

            const expiresAt = newExpiresIn ? Date.now() + newExpiresIn * 1000 : Date.now() + 3600000;
            saveAuthToStorage(newData.access_token, newData.refresh_token, storedAuth.user, expiresAt);

            setState(prev => ({
              ...prev,
              isAuthenticated: true,
              user: storedAuth.user,
              accessToken: newData.access_token,
              refreshTokenStr: newData.refresh_token,
              isLoading: false,
            }));

            setupUserTokenRefresh(newData.refresh_token, newData.access_token);

            initGuestToken().then(token => setState(prev => ({ ...prev, guestToken: token })));
            return;
          } catch {
            safeStorage.removeItem(AUTH_STORAGE_KEY);
          }
        } else {
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            user: storedAuth.user,
            accessToken: storedAuth.accessToken,
            refreshTokenStr: storedAuth.refreshTokenStr,
            isLoading: false,
          }));

          setupUserTokenRefresh(storedAuth.refreshTokenStr, storedAuth.accessToken);
          initGuestToken().then(token => setState(prev => ({ ...prev, guestToken: token })));
          return;
        }
      }

      try {
        const token = await initGuestToken();
        setState(prev => ({ ...prev, guestToken: token, isLoading: false }));
      } catch {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    return () => {
      stopTokenRefresh();
    };
  }, []);

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
    const user: User = {
      userId: loginData.user_id,
      mobileNumber: loginData.mobile_number,
      email: loginData.email,
      firstName: loginData.first_name,
      isNewUser: loginData.is_new_user,
    };

    const expiresIn =
      typeof loginData.expires_in === 'number'
        ? loginData.expires_in
        : getExpiresInFromJwt(loginData.access_token);

    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : Date.now() + 3600000;
    saveAuthToStorage(loginData.access_token, loginData.refresh_token, user, expiresAt);

    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      accessToken: loginData.access_token,
      refreshTokenStr: loginData.refresh_token,
      user,
    }));

    setupUserTokenRefresh(loginData.refresh_token, loginData.access_token);
  }, [setupUserTokenRefresh, getExpiresInFromJwt, saveAuthToStorage]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const getGuestToken = useCallback(async (): Promise<string> => {
    const token = await initGuestToken();
    if (token !== state.guestToken) {
      setState(prev => ({ ...prev, guestToken: token }));
    }
    return token;
  }, [state.guestToken]);

  useEffect(() => {
    return () => {
      if (userTokenRefreshTimer) clearInterval(userTokenRefreshTimer);
    };
  }, [userTokenRefreshTimer]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, getGuestToken }}>
      {children}
    </AuthContext.Provider>
  );
};
