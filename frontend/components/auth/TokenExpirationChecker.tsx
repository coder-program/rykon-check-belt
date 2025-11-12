"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "react-hot-toast";

export function TokenExpirationChecker() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Páginas públicas que não precisam de verificação
    const publicPages = ["/login", "/register", "/cadastro-concluido", "/reset-password"];
    if (publicPages.includes(pathname)) {
      return;
    }

    // Função para verificar se o token expirou
    const checkTokenExpiration = () => {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        // Decodificar JWT
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);

        // Verificar se o token expirou
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          console.warn('⏰ Token expirado! Fazendo logout...');
          
          // Limpar storage
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          // Mostrar mensagem
          toast.error("⏰ Sua sessão expirou! Faça login novamente.", {
            duration: 5000,
            position: "top-center",
            icon: "🔒",
          });

          // Redirecionar para login
          router.push("/login?expired=true");
        }
      } catch (error) {
        console.error("Erro ao verificar token:", error);
      }
    };

    // Verificar imediatamente
    checkTokenExpiration();

    // Verificar a cada 30 segundos
    const interval = setInterval(checkTokenExpiration, 30000);

    return () => clearInterval(interval);
  }, [router, pathname]);

  return null;
}
