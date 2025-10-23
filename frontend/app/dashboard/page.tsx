"use client";

import { useEffect, useCallback } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import MasterDashboard from "@/components/dashboard/MasterDashboard";
import FranqueadoDashboard from "@/components/dashboard/FranqueadoDashboard";
import AlunoDashboard from "@/components/dashboard/AlunoDashboard";
import InstrutorDashboard from "@/components/dashboard/InstrutorDashboard";
import GerenteDashboard from "@/components/dashboard/GerenteDashboard";
import RecepcionistaDashboard from "@/components/dashboard/RecepcionistaDashboard";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, logout, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const hasPerfil = useCallback(
    (p: string) => {
      if (!user?.perfis || !Array.isArray(user.perfis)) return false;

      return user.perfis
        .map((x: string | { nome?: string; name?: string }) => {
          // Se x é uma string, retorna ela mesma
          if (typeof x === "string") return x.toLowerCase();
          // Se x é um objeto com propriedade nome, usa nome
          if (typeof x === "object" && x?.nome) return x.nome.toLowerCase();
          // Se x é um objeto com propriedade name, usa name
          if (typeof x === "object" && x?.name) return x.name.toLowerCase();
          // Caso contrário, converte para string
          return String(x).toLowerCase();
        })
        .includes(p.toLowerCase());
    },
    [user?.perfis]
  );

  // VERIFICAR SE RECEPCIONISTA PRECISA COMPLETAR CADASTRO
  useEffect(() => {
    if (user && hasPerfil("recepcionista") && !user.cadastro_completo) {
      router.push("/onboarding/recepcionista");
    }
  }, [user, router, hasPerfil]);

  // Redirecionamento inteligente - impede dashboard genérico
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!loading && user) {
      // Se não tem perfis ou perfis inválidos, vai para login
      if (
        !user.perfis ||
        !Array.isArray(user.perfis) ||
        user.perfis.length === 0
      ) {
        logout();
        router.push("/login");
        return;
      }
    }
  }, [user, loading, isAuthenticated, router, logout]);

  // Mostrar loading durante verificação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            TeamCruz Jiu-Jitsu
          </h2>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, não renderiza nada (useEffect redireciona)
  if (!isAuthenticated || !user) {
    return null;
  }

  // Renderizar dashboard específico por perfil
  if (hasPerfil("master")) {
    return <MasterDashboard />;
  }

  if (hasPerfil("franqueado")) {
    return <FranqueadoDashboard />;
  }

  if (hasPerfil("gerente_unidade")) {
    return <GerenteDashboard />;
  }

  if (hasPerfil("recepcionista")) {
    // Se cadastro incompleto, não renderiza (vai redirecionar)
    if (!user?.cadastro_completo) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
            <p className="mt-4 text-gray-600">
              Redirecionando para completar cadastro...
            </p>
          </div>
        </div>
      );
    }
    return <RecepcionistaDashboard />;
  }

  if (hasPerfil("aluno")) {
    return <AlunoDashboard />;
  }

  if (hasPerfil("instrutor") || hasPerfil("professor")) {
    return <InstrutorDashboard />;
  }

  // Se chegou até aqui, o usuário tem perfis não reconhecidos
  setTimeout(() => {
    logout();
    router.push("/login");
  }, 100);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 text-red-500 animate-spin mb-4" />
        <h3 className="text-lg font-semibold mb-2">Perfil não reconhecido</h3>
        <p className="text-gray-600">Redirecionando para login...</p>
      </div>
    </div>
  );
}
