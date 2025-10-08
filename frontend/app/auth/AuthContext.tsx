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
      console.log(
        "🔍 AuthContext - Token no localStorage:",
        token ? "Presente" : "Ausente"
      );

      if (token) {
        console.log("🔍 AuthContext - Validando token...");
        const userData = await authService.validateToken(token);
        console.log("🔍 AuthContext - Dados do usuário:", userData);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        console.log("🔍 AuthContext - Nenhum token encontrado");
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      console.log("🔍 AuthContext - Removendo token inválido do localStorage");
      if (typeof window !== "undefined") localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authService.login(email, password);

      if (typeof window !== "undefined") {
        localStorage.setItem("token", response.access_token);
      }
      setUser(response.user);
      setIsAuthenticated(true);

      showPermissionsAlert(response.user);

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

  const showPermissionsAlert = (user: any) => {
    let alertMessage = `🎉 Bem-vindo, ${
      user.nome || user.name || "Usuário"
    }!\n\n`;
    alertMessage += `📧 Email: ${user.email}\n\n`;

    alertMessage += `🔐 SUAS PERMISSÕES DE ACESSO:\n`;
    alertMessage += `════════════════════════════\n\n`;

    if (user.permissionsDetail && user.permissionsDetail.length > 0) {
      user.permissionsDetail.forEach((permission: any, index: number) => {
        alertMessage += `${index + 1}. ${permission.nome}\n`;
        if (permission.descricao)
          alertMessage += `   📄 ${permission.descricao}\n`;
        if (permission.nivel)
          alertMessage += `   🏷️  Nível: ${permission.nivel.nome} (${permission.nivel.descricao})\n`;
        if (permission.modulo)
          alertMessage += `   📁 Módulo: ${permission.modulo}\n\n`;
      });
    } else {
      alertMessage += `❌ Nenhuma permissão específica encontrada\n\n`;
    }

    alertMessage += `════════════════════════════\n`;
    alertMessage += `✨ Aproveite o sistema!`;

    if (typeof window !== "undefined") {
      setTimeout(() => {
        alert(alertMessage);
      }, 300);
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") localStorage.removeItem("token");
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
