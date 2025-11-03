"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter, usePathname } from "next/navigation";

// Páginas que não precisam de cadastro completo
const ALLOWED_INCOMPLETE_PAGES = [
  "/login",
  "/register",
  "/complete-profile",
  "/reset-password",
  "/onboarding/recepcionista",
  "/minha-franquia", // Franqueados podem acessar mesmo com cadastro incompleto
  "/",
];

export function ProfileCompletionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Se ainda está carregando, não faz nada
    if (loading) return;

    // Se está numa página que permite acesso público, não redireciona
    if (ALLOWED_INCOMPLETE_PAGES.includes(pathname)) return;

    // Se não está autenticado e não está numa página pública, vai para login
    if (!isAuthenticated || !user) {
      console.log(
        "🔄 [ProfileGuard] Usuário não autenticado tentando acessar página protegida, redirecionando para /login"
      );
      router.push("/login");
      return;
    }

    // Se o usuário está autenticado mas não completou o cadastro, redireciona
    if (user.cadastro_completo === false) {
      // Verificar se é franqueado
      const isFranqueado = user?.perfis?.some(
        (perfil: string | { nome?: string; name?: string }) => {
          if (typeof perfil === "string")
            return perfil.toLowerCase() === "franqueado";
          if (typeof perfil === "object" && perfil?.nome)
            return perfil.nome.toLowerCase() === "franqueado";
          if (typeof perfil === "object" && perfil?.name)
            return perfil.name.toLowerCase() === "franqueado";
          return String(perfil).toLowerCase() === "franqueado";
        }
      );

      if (isFranqueado && pathname !== "/minha-franquia") {
        console.log(
          "🔄 [ProfileGuard] Franqueado com cadastro incompleto, redirecionando para /minha-franquia"
        );
        router.push("/minha-franquia");
      } else if (!isFranqueado && pathname !== "/complete-profile") {
        console.log(
          "🔄 [ProfileGuard] Usuário com cadastro incompleto, redirecionando para /complete-profile"
        );
        router.push("/complete-profile");
      }
    }
  }, [user, loading, isAuthenticated, pathname, router]);

  return <>{children}</>;
}
