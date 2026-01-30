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
import ResponsavelDashboard from "@/components/dashboard/ResponsavelDashboard";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, logout, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  console.log('========= DASHBOARD PAGE =========')
  console.log('Loading:', loading)
  console.log('IsAuthenticated:', isAuthenticated)
  console.log('User:', user)
  console.log('User Perfis:', user?.perfis)
  console.log('====================================')

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
      console.log('[DASHBOARD] Recepcionista precisa completar cadastro, redirecionando...')
      router.push("/onboarding/recepcionista");
    }
  }, [user, router, hasPerfil]);

  // Redirecionamento inteligente - impede dashboard genérico
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('[DASHBOARD] Usuário não autenticado, redirecionando para login')
      router.push("/login");
      return;
    }

    if (!loading && user) {
      // ADMIN_SISTEMA vai direto para página otimizada
      if (hasPerfil("admin_sistema")) {
        console.log('[DASHBOARD] ADMIN_SISTEMA detectado, redirecionando...')
        router.push("/admin/sistema");
        return;
      }

      // Se não tem perfis ou perfis inválidos, vai para login
      if (
        !user.perfis ||
        !Array.isArray(user.perfis) ||
        user.perfis.length === 0
      ) {
        console.log('[DASHBOARD] Usuário sem perfis válidos, fazendo logout')
        logout();
        router.push("/login");
        return;
      }
    }
  }, [user, loading, isAuthenticated, router, logout, hasPerfil]);

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
    console.log('[DASHBOARD] Renderizando MasterDashboard')
    return <MasterDashboard />;
  }

  if (hasPerfil("franqueado")) {
    console.log('[DASHBOARD] Renderizando FranqueadoDashboard')
    return <FranqueadoDashboard />;
  }

  if (hasPerfil("gerente_unidade")) {
    console.log('[DASHBOARD] Renderizando GerenteDashboard')
    return <GerenteDashboard />;
  }

  if (hasPerfil("recepcionista")) {
    console.log('[DASHBOARD] Renderizando RecepcionistaDashboard')
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
    console.log('[DASHBOARD] Renderizando AlunoDashboard')
    return <AlunoDashboard />;
  }

  if (hasPerfil("instrutor") || hasPerfil("professor")) {
    console.log('[DASHBOARD] Renderizando InstrutorDashboard')
    return <InstrutorDashboard />;
  }

  if (hasPerfil("responsavel")) {
    console.log('[DASHBOARD] Renderizando ResponsavelDashboard')
    // Responsável tem dashboard próprio para gerenciar filhos
    return <ResponsavelDashboard />;
  }

  // Se chegou até aqui, o usuário tem perfis não reconhecidos
  console.log('[DASHBOARD] Perfil não reconhecido, fazendo logout')
  console.log('[DASHBOARD] Perfis disponíveis:', user?.perfis)
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
