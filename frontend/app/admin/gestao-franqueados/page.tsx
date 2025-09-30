"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFranqueados,
  listUnidades,
  updateFranqueado,
} from "@/lib/peopleApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Users,
  MapPin,
  Link as LinkIcon,
  Settings,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

interface Franqueado {
  id: string;
  nome: string;
  email: string;
  cnpj: string;
  unidades_gerencia: string[];
  ativo: boolean;
}

interface Unidade {
  id: string;
  nome: string;
  franqueado_id: string;
  status: string;
  endereco?: any;
}

export default function GestaoFranqueadosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedFranqueado, setSelectedFranqueado] =
    useState<Franqueado | null>(null);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState<Unidade[]>([]);
  const [unidadesVinculadas, setUnidadesVinculadas] = useState<string[]>([]);
  const [showAssociacaoModal, setShowAssociacaoModal] = useState(false);

  // Verificar se é master
  const hasPerfil = (p: string) =>
    (user?.perfis || [])
      .map((x: string) => x.toLowerCase())
      .includes(p.toLowerCase());

  if (!hasPerfil("master")) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h1>
          <p className="text-gray-600">
            Apenas administradores master podem gerenciar franqueados.
          </p>
        </div>
      </div>
    );
  }

  const franqueadosQuery = useQuery({
    queryKey: ["franqueados-gestao"],
    queryFn: () => listFranqueados({ pageSize: 100 }),
  });

  const unidadesQuery = useQuery({
    queryKey: ["unidades-todas"],
    queryFn: () => listUnidades({ pageSize: 500 }),
  });

  const associarUnidadesMutation = useMutation({
    mutationFn: async ({
      franqueadoId,
      unidadesIds,
    }: {
      franqueadoId: string;
      unidadesIds: string[];
    }) => {
      return updateFranqueado(franqueadoId, { unidades_gerencia: unidadesIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franqueados-gestao"] });
      toast.success("Unidades associadas com sucesso!");
      setShowAssociacaoModal(false);
      setSelectedFranqueado(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao associar unidades");
    },
  });

  const abrirModalAssociacao = (franqueado: Franqueado) => {
    setSelectedFranqueado(franqueado);
    setUnidadesVinculadas(franqueado.unidades_gerencia || []);

    // Filtrar unidades disponíveis (que não pertencem a outros franqueados ou sem dono)
    const todasUnidades = unidadesQuery.data?.items || [];
    const unidadesLivres = todasUnidades.filter(
      (unidade: Unidade) =>
        !unidade.franqueado_id ||
        unidade.franqueado_id === franqueado.id ||
        franqueado.unidades_gerencia?.includes(unidade.id)
    );

    setUnidadesDisponiveis(unidadesLivres);
    setShowAssociacaoModal(true);
  };

  const toggleUnidadeVinculacao = (unidadeId: string) => {
    setUnidadesVinculadas((prev) =>
      prev.includes(unidadeId)
        ? prev.filter((id) => id !== unidadeId)
        : [...prev, unidadeId]
    );
  };

  const salvarAssociacoes = () => {
    if (!selectedFranqueado) return;

    associarUnidadesMutation.mutate({
      franqueadoId: selectedFranqueado.id,
      unidadesIds: unidadesVinculadas,
    });
  };

  const franqueados = franqueadosQuery.data?.items || [];
  const todasUnidades = unidadesQuery.data?.items || [];

  // Estatísticas
  const stats = {
    totalFranqueados: franqueados.length,
    franqueadosAtivos: franqueados.filter((f) => f.ativo).length,
    totalUnidades: todasUnidades.length,
    unidadesVinculadas: todasUnidades.filter((u: Unidade) => u.franqueado_id)
      .length,
    unidadesSemFranqueado: todasUnidades.filter(
      (u: Unidade) => !u.franqueado_id
    ).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Gestão de Franqueados
                </h1>
              </div>
              <p className="text-gray-600">
                Administre franqueados e suas unidades associadas
              </p>
            </div>
            <button
              onClick={() => router.push("/franqueados")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo Franqueado
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Franqueados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFranqueados}</div>
              <p className="text-xs text-muted-foreground">
                {stats.franqueadosAtivos} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Unidades
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUnidades}</div>
              <p className="text-xs text-muted-foreground">Todas as unidades</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vinculadas</CardTitle>
              <LinkIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.unidadesVinculadas}
              </div>
              <p className="text-xs text-muted-foreground">Com franqueado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
              <MapPin className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.unidadesSemFranqueado}
              </div>
              <p className="text-xs text-muted-foreground">Sem franqueado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa Vinculação
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalUnidades > 0
                  ? Math.round(
                      (stats.unidadesVinculadas / stats.totalUnidades) * 100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                Unidades vinculadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Franqueados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Franqueados e Suas Unidades
            </CardTitle>
            <CardDescription>
              Clique em "Gerenciar Unidades" para associar/desassociar unidades
              de cada franqueado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {franqueados.map((franqueado: Franqueado) => {
                const unidadesFranqueado = todasUnidades.filter((u: Unidade) =>
                  franqueado.unidades_gerencia?.includes(u.id)
                );

                return (
                  <div
                    key={franqueado.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {franqueado.nome}
                          {franqueado.ativo ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {franqueado.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {unidadesFranqueado.length} unidade(s) vinculada(s)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {unidadesFranqueado.length > 0 && (
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {unidadesFranqueado.map((u, i) => (
                              <span key={u.id} className="text-gray-600">
                                {u.nome}
                                {i < unidadesFranqueado.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => abrirModalAssociacao(franqueado)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Gerenciar Unidades
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Modal de Associação */}
        {showAssociacaoModal && selectedFranqueado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-blue-600" />
                  Gerenciar Unidades - {selectedFranqueado.nome}
                </h2>
                <p className="text-gray-600 mt-1">
                  Selecione as unidades que este franqueado irá gerenciar
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unidadesDisponiveis.map((unidade: Unidade) => {
                    const isVinculada = unidadesVinculadas.includes(unidade.id);
                    const temOutroFranqueado =
                      unidade.franqueado_id &&
                      unidade.franqueado_id !== selectedFranqueado.id;

                    return (
                      <div
                        key={unidade.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isVinculada
                            ? "border-blue-500 bg-blue-50"
                            : temOutroFranqueado
                            ? "border-red-300 bg-red-50 opacity-50 cursor-not-allowed"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() =>
                          !temOutroFranqueado &&
                          toggleUnidadeVinculacao(unidade.id)
                        }
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm">
                            {unidade.nome}
                          </h3>
                          {isVinculada ? (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          ) : temOutroFranqueado ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          Status: {unidade.status}
                        </p>
                        {temOutroFranqueado && (
                          <p className="text-xs text-red-600">
                            Já possui franqueado
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {unidadesDisponiveis.length === 0 && (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Nenhuma unidade disponível para associação
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssociacaoModal(false);
                    setSelectedFranqueado(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarAssociacoes}
                  disabled={associarUnidadesMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {associarUnidadesMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Salvar Associações
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
