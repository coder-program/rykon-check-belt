"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/AuthContext";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Preservar ?tenant= no redirect para que o middleware leia o param
      const tenantParam = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('tenant')
        : null;
      const suffix = tenantParam ? `?tenant=${tenantParam}` : '';

      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push(`/login${suffix}`);
      }
    }
  }, [isAuthenticated, loading, router]);

  // Mostra loading enquanto verifica autenticação
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Carregando...
        </h2>
        <p className="text-gray-600">Carregando sistema...</p>
      </div>
    </div>
  );
}
