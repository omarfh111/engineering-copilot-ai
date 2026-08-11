import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, getApiErrorMessage, tokenStorage, userApi } from '../lib/api';
import type { User } from '../types/user';

interface SessionContextValue {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
  updateLocalProfile: (profile: Partial<Pick<User, 'avatarUrl' | 'firstName' | 'lastName' | 'email' | 'phoneNumber' | 'department' | 'jobTitle'>>) => void;
  login: (email: string, password: string) => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);
const PROFILE_STORAGE_PREFIX = 'copilote_profile_overrides:';

function profileStorageKey(userId: number) {
  return `${PROFILE_STORAGE_PREFIX}${userId}`;
}

function loadProfileOverrides(userId: number) {
  try {
    return JSON.parse(localStorage.getItem(profileStorageKey(userId)) ?? '{}') as Partial<User>;
  } catch {
    return {};
  }
}

function mergeProfileOverrides(user: User) {
  return { ...user, ...loadProfileOverrides(user.id) };
}

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
      setCurrentUser(mergeProfileOverrides(user));
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

  const updateLocalProfile = (profile: Partial<Pick<User, 'avatarUrl' | 'firstName' | 'lastName' | 'email' | 'phoneNumber' | 'department' | 'jobTitle'>>) => {
    setCurrentUser((current) => {
      if (!current) return current;
      const next = { ...current, ...profile };
      localStorage.setItem(profileStorageKey(current.id), JSON.stringify({
        avatarUrl: next.avatarUrl,
        firstName: next.firstName,
        lastName: next.lastName,
        email: next.email,
        phoneNumber: next.phoneNumber,
        department: next.department,
        jobTitle: next.jobTitle
      }));
      return next;
    });
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
        updateLocalProfile,
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
