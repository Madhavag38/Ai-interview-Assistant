/**
 * Auth Context - Enhanced with token refresh
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import {
  clearAuth,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
  StoredUser,
} from "@/lib/auth";

interface AuthContextValue {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Initialize ──────────────────────────────────────────────────────────

  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUser(storedUser);
    }

    setIsLoading(false);
  }, []);

  // ─── Auth Methods ────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const { data } = await axiosInstance.post("/api/auth/login", {
          email,
          password,
        });

        setToken(data.token);
        setStoredUser(data.user);
        setTokenState(data.token);
        setUser(data.user);

        router.push("/dashboard");
      } catch (error: any) {
        console.error("Login error:", error);
        throw new Error(error?.response?.data?.message || "Login failed");
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const { data } = await axiosInstance.post("/api/auth/register", {
          name,
          email,
          password,
        });

        setToken(data.token);
        setStoredUser(data.user);
        setTokenState(data.token);
        setUser(data.user);

        router.push("/dashboard");
      } catch (error: any) {
        console.error("Registration error:", error);
        throw new Error(error?.response?.data?.message || "Registration failed");
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    clearAuth();
    setTokenState(null);
    setUser(null);
    router.push("/");
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/api/auth/me");
      setStoredUser(data.user);
      setUser(data.user);
    } catch {
      logout();
    }
  }, [logout]);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await axiosInstance.post("/api/auth/refresh");
      if (data?.accessToken) {
        setToken(data.accessToken);
        setTokenState(data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
      return null;
    }
  }, [logout]);

  // ─── Context Value ──────────────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isLoggedIn: !!token && !!user,
      login,
      register,
      logout,
      refreshUser,
      refreshToken,
    }),
    [user, token, isLoading, login, register, logout, refreshUser, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };