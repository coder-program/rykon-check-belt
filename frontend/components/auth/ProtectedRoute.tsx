"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPerfis?: string[];
  requiredPermissions?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requiredPerfis = [],
  requiredPermissions = [],
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Se o usuário está autenticado mas não completou o cadastro,
    // redireciona para a tela de completar perfil antes de acessar qualquer rota protegida
    if (
      !loading &&
      isAuthenticated &&
      user &&
      user.cadastro_completo === false
    ) {
      router.push("/complete-profile");
      return;
    }
  }, [loading, isAuthenticated, router, redirectTo, user]);

  // Função para verificar se o usuário tem o perfil necessário
  const hasPerfil = (perfil: string): boolean => {
    if (!user?.perfis || !Array.isArray(user.perfis)) return false;

    return user.perfis
      .map((p: string | { nome?: string; name?: string }) => {
        if (typeof p === "string") return p.toLowerCase();
        if (typeof p === "object" && p?.nome) return p.nome.toLowerCase();
        if (typeof p === "object" && p?.name) return p.name.toLowerCase();
        return String(p).toLowerCase();
      })
      .includes(perfil.toLowerCase());
  };

  // Função para verificar se o usuário tem a permissão necessária
  const hasPermission = (permission: string): boolean => {
    if (!user?.permissions || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permission);
  };

  // Verificar se o usuário tem algum dos perfis necessários
  const hasRequiredPerfil = (): boolean => {
    if (requiredPerfis.length === 0) return true;
    return requiredPerfis.some((perfil) => hasPerfil(perfil));
  };

  // Verificar se o usuário tem todas as permissões necessárias
  const hasRequiredPermissions = (): boolean => {
    if (requiredPermissions.length === 0) return true;
    return requiredPermissions.every((permission) => hasPermission(permission));
  };

  // Mostrar loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Verificando acesso...
              </h3>
              <p className="text-gray-600">
                Aguarde enquanto validamos suas credenciais
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Usuário não autenticado
  if (!isAuthenticated) {
    return null; // O useEffect já redireciona
  }

  // Verificar permissões
  const hasAccess = hasRequiredPerfil() && hasRequiredPermissions();

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
              <p className="text-gray-600 mb-4">
                Você não tem permissão para acessar esta página.
              </p>
              {requiredPerfis.length > 0 && (
                <div className="text-xs text-gray-500 mb-2">
                  <strong>Perfis necessários:</strong>{" "}
                  {requiredPerfis.join(", ")}
                </div>
              )}
              {requiredPermissions.length > 0 && (
                <div className="text-xs text-gray-500 mb-4">
                  <strong>Permissões necessárias:</strong>{" "}
                  {requiredPermissions.join(", ")}
                </div>
              )}
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
