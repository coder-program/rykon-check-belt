"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { ContratosManager } from "@/components/contratos/ContratosManager";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

export default function ContratosPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unidadeId, setUnidadeId] = useState<string | null>(null);
  const [unidadeNome, setUnidadeNome] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Verificar se o usuário tem permissão (admin, gerente, franqueado)
      const perfisPermitidos = ["admin", "gerente", "franqueado"];
      const perfilUsuario = user.perfil?.nome?.toLowerCase() || "";

      if (!perfisPermitidos.includes(perfilUsuario)) {
        setError("Você não tem permissão para acessar esta página");
        setLoading(false);
        return;
      }

      // Pegar unidade_id do usuário (gerente) ou primeira unidade (admin/franqueado)
      if (user.unidade_id) {
        setUnidadeId(user.unidade_id);
        setUnidadeNome(user.unidade?.nome || "");
      } else {
        setError("Usuário sem unidade vinculada");
      }

      setLoading(false);
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900">
        <Loader2 className="h-8 w-8 animate-spin text-red-400" />
      </div>
    );
  }

  if (error || !unidadeId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 p-4">
        <Card className="max-w-md bg-gray-900/90 border-red-600/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-white text-center">{error || "Erro ao carregar página"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <ContratosManager unidadeId={unidadeId} unidadeNome={unidadeNome} />
      </div>
    </div>
  );
}
