"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "@/lib/services/authService";

const AuthContext = createContext(undefined as any);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (token) {
        // Verificar se o token está expirado antes de fazer a requisição
        const tokenPayload = parseJwt(token);
        if (tokenPayload && tokenPayload.exp) {
          const isExpired = Date.now() >= tokenPayload.exp * 1000;
          if (isExpired) {
            console.warn("⚠️ Token expirado detectado no checkAuthStatus");
            throw new Error("Token expirado");
          }
        }

        const userData = await authService.validateToken(token);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para decodificar JWT
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  const login = async (emailOrUsername: string, password: string) => {
    try {
      setLoading(true);
      const response = await authService.login(emailOrUsername, password);

      if (typeof window !== "undefined") {
        localStorage.setItem("token", response.access_token);
        localStorage.setItem("user", JSON.stringify(response.user));
      }
      setUser(response.user);
      setIsAuthenticated(true);

      return { success: true, user: response.user };
    } catch (error: any) {
      console.error("Erro no login:", error);
      return {
        success: false,
        error:
          error?.message || error?.response?.data?.message || "Erro no login",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData: any) => {
    setUser(userData);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
