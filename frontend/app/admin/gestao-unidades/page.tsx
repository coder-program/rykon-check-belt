"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUnidades,
  listFranqueados,
  updateUnidade,
  listProfessores,
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
  UserCheck,
  MapPin,
  Settings,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";

interface Unidade {
  id: string;
  nome: string;
  franqueado_id: string;
  professores_vinculados?: string[];
  status: string;
  endereco?: {
    cep: string;
    logradouro: string;
    numero: string;
    bairro?: string;
    cidade_nome?: string;
  };
}

interface Professor {
  id: string;
  nome_completo: string;
  faixa_ministrante: string;
  unidade_id?: string;
  status: string;
}

interface Franqueado {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

export default function GestaoUnidadesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null);
  const [professoresDisponiveis, setProfessoresDisponiveis] = useState<
    Professor[]
  >([]);
  const [professoresVinculados, setProfessoresVinculados] = useState<string[]>(
    []
  );
  const [showProfessoresModal, setShowProfessoresModal] = useState(false);

  // Verificar permissões
  const hasPerfil = (p: string) =>
    (user?.perfis || [])
      .map((x: string) => x.toLowerCase())
      .includes(p.toLowerCase());

  const podeGerenciar = hasPerfil("master") || hasPerfil("franqueado");

  const unidadesQuery = useQuery({
    queryKey: ["unidades-gestao"],
    queryFn: () => listUnidades({ pageSize: 500 }),
    enabled: podeGerenciar,
  });

  const franqueadosQuery = useQuery({
    queryKey: ["franqueados-select"],
    queryFn: () => listFranqueados({ pageSize: 100 }),
    enabled: podeGerenciar,
  });

  const professoresQuery = useQuery({
    queryKey: ["professores-todos"],
    queryFn: () =>
      listProfessores({ pageSize: 500, tipo_cadastro: "PROFESSOR" }),
    enabled: podeGerenciar,
  });

  const vincularProfessoresMutation = useMutation({
    mutationFn: async ({
      unidadeId,
      professoresIds,
    }: {
      unidadeId: string;
      professoresIds: string[];
    }) => {
      // Para cada professor, atualizar sua unidade_id
      const promises = professoresIds.map((professorId) =>
        updateUnidade(professorId, { unidade_id: unidadeId })
      );

      // Também limpar professores que foram desvinculados
      const todosProfs = professoresQuery.data?.items || [];
      const profsDaUnidade = todosProfs.filter(
        (p: Professor) => p.unidade_id === unidadeId
      );
      const parasRemover = profsDaUnidade.filter(
        (p: Professor) => !professoresIds.includes(p.id)
      );

      const promisesRemover = parasRemover.map((prof) =>
        updateUnidade(prof.id, { unidade_id: null })
      );

      await Promise.all([...promises, ...promisesRemover]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores-todos"] });
      queryClient.invalidateQueries({ queryKey: ["unidades-gestao"] });
      toast.success("Professores vinculados com sucesso!");
      setShowProfessoresModal(false);
      setSelectedUnidade(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao vincular professores");
    },
  });

  const abrirModalProfessores = (unidade: Unidade) => {
    setSelectedUnidade(unidade);

    // Buscar professores vinculados atualmente
    const todosProfs = professoresQuery.data?.items || [];
    const profsVinculados = todosProfs
      .filter((p: Professor) => p.unidade_id === unidade.id)
      .map((p: Professor) => p.id);

    setProfessoresVinculados(profsVinculados);

    // Professores disponíveis são todos os ativos
    const profsDisponiveis = todosProfs.filter(
      (p: Professor) => p.status === "ATIVO"
    );
    setProfessoresDisponiveis(profsDisponiveis);

    setShowProfessoresModal(true);
  };

  const toggleProfessorVinculacao = (professorId: string) => {
    setProfessoresVinculados((prev) =>
      prev.includes(professorId)
        ? prev.filter((id) => id !== professorId)
        : [...prev, professorId]
    );
  };

  const salvarVinculacoes = () => {
    if (!selectedUnidade) return;

    vincularProfessoresMutation.mutate({
      unidadeId: selectedUnidade.id,
      professoresIds: professoresVinculados,
    });
  };

  const unidades = unidadesQuery.data?.items || [];
  const franqueados = franqueadosQuery.data?.items || [];
  const professores = professoresQuery.data?.items || [];

  // Mapear dados para exibição
  const unidadesComDados = unidades.map((unidade: Unidade) => {
    const franqueado = franqueados.find(
      (f: Franqueado) => f.id === unidade.franqueado_id
    );
    const professoresDaUnidade = professores.filter(
      (p: Professor) => p.unidade_id === unidade.id
    );

    return {
      ...unidade,
      franqueado: franqueado || null,
      professores: professoresDaUnidade,
    };
  });

  // Estatísticas
  const stats = {
    totalUnidades: unidades.length,
    unidadesAtivas: unidades.filter((u: Unidade) => u.status === "ATIVA")
      .length,
    unidadesComFranqueado: unidades.filter((u: Unidade) => u.franqueado_id)
      .length,
    totalProfessores: professores.length,
    professoresVinculados: professores.filter((p: Professor) => p.unidade_id)
      .length,
    professoresSemUnidade: professores.filter((p: Professor) => !p.unidade_id)
      .length,
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
                  Gestão de Unidades
                </h1>
              </div>
              <p className="text-gray-600">
                Administre unidades e seus professores associados
              </p>
            </div>
            <button
              onClick={() => router.push("/unidades")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova Unidade
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unidades</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUnidades}</div>
              <p className="text-xs text-muted-foreground">
                {stats.unidadesAtivas} ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Com Franqueado
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.unidadesComFranqueado}
              </div>
              <p className="text-xs text-muted-foreground">Vinculadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Professores</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProfessores}</div>
              <p className="text-xs text-muted-foreground">Total cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vinculados</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.professoresVinculados}
              </div>
              <p className="text-xs text-muted-foreground">Com unidade</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
              <Users className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.professoresSemUnidade}
              </div>
              <p className="text-xs text-muted-foreground">Sem unidade</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa Ocupação
              </CardTitle>
              <MapPin className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalProfessores > 0
                  ? Math.round(
                      (stats.professoresVinculados / stats.totalProfessores) *
                        100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">Prof. vinculados</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Unidades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Unidades e Seus Professores
            </CardTitle>
            <CardDescription>
              Clique em &quot;Gerenciar Professores&quot; para
              associar/desassociar professores de cada unidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unidadesComDados.map(
                (
                  unidade: Unidade & {
                    franqueado: Franqueado | null;
                    professores: Professor[];
                  }
                ) => {
                  return (
                    <div
                      key={unidade.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {unidade.nome}
                            {unidade.status === "ATIVA" ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-yellow-600" />
                            )}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Franqueado:{" "}
                            {unidade.franqueado?.nome || "Sem franqueado"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {unidade.professores.length} professor(es)
                            vinculado(s)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {unidade.professores.length > 0 && (
                          <div className="text-right max-w-xs">
                            <div className="text-sm font-medium">
                              {unidade.professores
                                .slice(0, 2)
                                .map((p: Professor, i: number) => (
                                  <span key={p.id} className="text-gray-600">
                                    {p.nome_completo}
                                    {i <
                                    Math.min(unidade.professores.length - 1, 1)
                                      ? ", "
                                      : ""}
                                  </span>
                                ))}
                              {unidade.professores.length > 2 && (
                                <span className="text-gray-500">
                                  {" "}
                                  e mais {unidade.professores.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => abrirModalProfessores(unidade)}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          Gerenciar Professores
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal de Professores */}
        {showProfessoresModal && selectedUnidade && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  Gerenciar Professores - {selectedUnidade.nome}
                </h2>
                <p className="text-gray-600 mt-1">
                  Selecione os professores que irão lecionar nesta unidade
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {professoresDisponiveis.map((professor: Professor) => {
                    const isVinculado = professoresVinculados.includes(
                      professor.id
                    );
                    const temOutraUnidade =
                      professor.unidade_id &&
                      professor.unidade_id !== selectedUnidade.id;

                    return (
                      <div
                        key={professor.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isVinculado
                            ? "border-blue-500 bg-blue-50"
                            : temOutraUnidade
                            ? "border-yellow-300 bg-yellow-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => toggleProfessorVinculacao(professor.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm">
                            {professor.nome_completo}
                          </h3>
                          {isVinculado ? (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          Faixa: {professor.faixa_ministrante || "N/A"}
                        </p>
                        {temOutraUnidade && (
                          <p className="text-xs text-yellow-600">
                            Já vinculado a outra unidade
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {professoresDisponiveis.length === 0 && (
                  <div className="text-center py-8">
                    <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum professor disponível</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfessoresModal(false);
                    setSelectedUnidade(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarVinculacoes}
                  disabled={vincularProfessoresMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {vincularProfessoresMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Salvar Vinculações
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
