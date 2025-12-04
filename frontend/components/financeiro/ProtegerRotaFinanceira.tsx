"use client";

import { usePermissoes } from "@/hooks/usePermissoes";
import AcessoNegado from "./AcessoNegado";

interface ProtegerRotaFinanceiraProps {
  children: React.ReactNode;
  requerPermissao: keyof ReturnType<typeof usePermissoes>["permissoes"];
}

export default function ProtegerRotaFinanceira({
  children,
  requerPermissao,
}: ProtegerRotaFinanceiraProps) {
  const { permissoes, loading } = usePermissoes();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!permissoes[requerPermissao]) {
    return <AcessoNegado />;
  }

  return <>{children}</>;
}
