"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuthStatus, logout as apiLogout, getLoginUrl } from "../api";
import type { AuthStatus } from "../types";

interface AuthContextType {
  auth: AuthStatus;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthStatus>({ authenticated: false });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const status = await getAuthStatus();
      setAuth(status);
    } catch {
      setAuth({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = () => {
    window.location.href = getLoginUrl();
  };

  const logout = async () => {
    await apiLogout();
    setAuth({ authenticated: false });
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ auth, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
