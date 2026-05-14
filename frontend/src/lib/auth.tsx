import React, { createContext, useContext, useState } from 'react';
import { api, AuthAPI } from './api';
import { STORAGE_KEYS } from './config';
import { deleteItem, getItem, setItem } from './storage';

type User = { id: number; email: string; name: string; role: 'TEACHER' | 'STUDENT' };

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function _persist(tokenValue: string, userValue: User) {
    await api.setToken(tokenValue);
    await setItem(STORAGE_KEYS.USER, JSON.stringify(userValue));
    setToken(tokenValue);
    setUser(userValue);
  }

  async function login(email: string, password: string) {
    const res = await AuthAPI.login({ email, password });
    await _persist(res.token, res.user);
  }

  async function register(firstName: string, lastName: string, email: string, password: string, role: string) {
    const res = await AuthAPI.register({ name: `${firstName} ${lastName}`.trim(), email, password, role });
    await _persist(res.token, res.user);
  }

  async function logout() {
    await api.removeToken();
    await deleteItem(STORAGE_KEYS.USER);
    setToken(null);
    setUser(null);
  }

  async function loadFromStorage() {
    const [storedToken, storedUser] = await Promise.all([
      api.getToken(),
      getItem(STORAGE_KEYS.USER),
    ]);
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as User);
      } catch {
        await logout();
      }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoggedIn: !!token && !!user,
      isTeacher: user?.role === 'TEACHER',
      isStudent: user?.role === 'STUDENT',
      login,
      register,
      logout,
      loadFromStorage,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
