"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getMyFranqueado } from "@/lib/peopleApi";

/**
 * Hook para proteger páginas contra acesso de franqueados inativos
 * Redireciona para /dashboard se o franqueado estiver inativo
 * Retorna true se deve bloquear a renderização
 */
export function useFranqueadoProtection() {
  const { user } = useAuth();
  const router = useRouter();

  // Verificar se é franqueado
  const isFranqueado = user?.perfis?.some((perfil: any) => {
    const perfilNome =
      typeof perfil === "string" ? perfil : perfil.nome || perfil.perfil;
    return perfilNome?.toLowerCase() === "franqueado";
  });

  // Buscar dados do franqueado
  const { data: franqueado, isLoading } = useQuery({
    queryKey: ["franqueado-me", user?.id],
    queryFn: getMyFranqueado,
    enabled: !!user?.id && isFranqueado,
  });

  // Redirecionar se for franqueado inativo
  useEffect(() => {
    if (isFranqueado && !isLoading && franqueado === null) {
      router.push("/dashboard");
    }
  }, [isFranqueado, franqueado, isLoading, router]);

  // Retorna true se deve bloquear (franqueado inativo)
  const shouldBlock = isFranqueado && !isLoading && franqueado === null;

  return { isFranqueado, franqueado, isLoading, shouldBlock };
}
