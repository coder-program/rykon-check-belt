"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUnidades, updateUnidade } from "@/lib/peopleApi";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/app/auth/AuthContext";
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function UnidadesPendentesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedUnidade, setSelectedUnidade] = useState<any>(null);

  // Verificar se é MASTER
  const isMaster = user?.perfis?.some((perfil: any) => {
    const perfilNome =
      typeof perfil === "string" ? perfil : perfil.nome || perfil.perfil;
    return perfilNome?.toUpperCase() === "MASTER";
  });

  // Buscar unidades em homologação
  const { data: unidades, isLoading } = useQuery({
    queryKey: ["unidades-pendentes"],
    queryFn: async () => {
      const result = await listUnidades({
        status: "HOMOLOGACAO",
        pageSize: "100",
      });
      return Array.isArray(result) ? result : result.items || [];
    },
  });

  const aprovarMutation = useMutation({
    mutationFn: (unidadeId: string) =>
      updateUnidade(unidadeId, { status: "ATIVA" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades-pendentes"] });
      toast.success("Unidade aprovada com sucesso!", {
        duration: 3000,
      });
      setSelectedUnidade(null);
    },
    onError: () => {
      toast.error("Erro ao aprovar unidade");
    },
  });

  const rejeitarMutation = useMutation({
    mutationFn: (unidadeId: string) =>
      updateUnidade(unidadeId, { status: "INATIVA" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades-pendentes"] });
      toast.success("Unidade rejeitada", {
        duration: 3000,
      });
      setSelectedUnidade(null);
    },
    onError: () => {
      toast.error("Erro ao rejeitar unidade");
    },
  });

  if (!isMaster) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Acesso Negado
            </h1>
            <p className="text-gray-600 mb-6">
              Apenas administradores MASTER podem acessar esta página.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar
            </button>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-8 w-8 text-yellow-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Unidades Pendentes de Aprovação
              </h1>
            </div>
            <p className="text-gray-600">
              Revise e aprove unidades cadastradas por franqueados
            </p>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Carregando unidades...</p>
            </div>
          )}

          {/* Lista de Unidades */}
          {!isLoading && (
            <div className="grid grid-cols-1 gap-6">
              {!unidades || unidades.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Nenhuma unidade pendente
                  </h3>
                  <p className="text-gray-600">
                    Todas as unidades foram revisadas!
                  </p>
                </div>
              ) : (
                unidades.map((unidade: any) => (
                  <div
                    key={unidade.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-yellow-100 p-3 rounded-lg">
                          <Building2 className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {unidade.nome}
                          </h3>
                          <p className="text-sm text-gray-600">
                            CNPJ: {unidade.cnpj}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                        Em Homologação
                      </span>
                    </div>

                    {/* Informações */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          Responsável: {unidade.responsavel_nome}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {unidade.telefone_celular}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{unidade.email}</span>
                      </div>
                      {unidade.endereco && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {unidade.endereco.cidade} -{" "}
                            {unidade.endereco.estado}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => aprovarMutation.mutate(unidade.id)}
                        disabled={aprovarMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <CheckCircle className="h-5 w-5" />
                        {aprovarMutation.isPending
                          ? "Aprovando..."
                          : "Aprovar Unidade"}
                      </button>
                      <button
                        onClick={() => rejeitarMutation.mutate(unidade.id)}
                        disabled={rejeitarMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <XCircle className="h-5 w-5" />
                        {rejeitarMutation.isPending
                          ? "Rejeitando..."
                          : "Rejeitar"}
                      </button>
                      <button
                        onClick={() => router.push(`/unidades/${unidade.id}`)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
