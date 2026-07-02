import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, getApiErrorMessage, tokenStorage, userApi } from '../lib/api';
import type { User } from '../types/user';

interface SessionContextValue {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = async () => {
    const token = tokenStorage.get();

    if (!token) {
      setCurrentUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const user = await userApi.getCurrentUser();
      setCurrentUser(user);
      setError(null);
    } catch (refreshError) {
      tokenStorage.clear();
      setCurrentUser(null);
      setError(getApiErrorMessage(refreshError) || 'Your session has expired. Sign in again to continue.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    const response = await authApi.login(email.trim(), password);

    if (!response.token) {
      throw new Error('The sign-in response was incomplete. Please try again.');
    }

    tokenStorage.set(response.token);
    await refreshSession();
  };

  const clearSession = () => {
    tokenStorage.clear();
    setCurrentUser(null);
    setError(null);
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  return (
    <SessionContext.Provider
      value={{
        currentUser,
        loading,
        error,
        refreshSession,
        login,
        clearSession
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return context;
}
