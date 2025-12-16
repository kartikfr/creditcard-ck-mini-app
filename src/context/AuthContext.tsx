import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { generateToken, refreshToken as refreshTokenApi } from '@/lib/api';

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
    expires_in: number;
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

  const [tokenRefreshTimer, setTokenRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Initialize guest token on mount
  useEffect(() => {
    const initToken = async () => {
      try {
        const token = await generateToken();
        setState(prev => ({
          ...prev,
          guestToken: token,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to generate guest token:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initToken();
  }, []);

  // Setup token refresh
  const setupTokenRefresh = useCallback((expiresIn: number) => {
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
    }

    // Refresh 2 minutes before expiry
    const refreshTime = (expiresIn - 120) * 1000;
    
    const timer = setTimeout(async () => {
      if (state.refreshTokenStr) {
        try {
          const response = await refreshTokenApi(state.refreshTokenStr);
          const newData = response.data.attributes;
          
          setState(prev => ({
            ...prev,
            accessToken: newData.access_token,
            refreshTokenStr: newData.refresh_token,
          }));

          setupTokenRefresh(newData.expires_in);
        } catch (error) {
          console.error('Token refresh failed:', error);
          logout();
        }
      }
    }, refreshTime);

    setTokenRefreshTimer(timer);
  }, [state.refreshTokenStr, tokenRefreshTimer]);

  const login = useCallback((loginData: {
    access_token: string;
    refresh_token: string;
    user_id: number;
    mobile_number: string;
    email: string;
    first_name: string;
    is_new_user: boolean;
    expires_in: number;
  }) => {
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

    setupTokenRefresh(loginData.expires_in);
  }, [setupTokenRefresh]);

  const logout = useCallback(() => {
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
    }

    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshTokenStr: null,
    }));
  }, [tokenRefreshTimer]);

  const getGuestToken = useCallback(async (): Promise<string> => {
    if (state.guestToken) {
      return state.guestToken;
    }

    const token = await generateToken();
    setState(prev => ({ ...prev, guestToken: token }));
    return token;
  }, [state.guestToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
      }
    };
  }, [tokenRefreshTimer]);

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
