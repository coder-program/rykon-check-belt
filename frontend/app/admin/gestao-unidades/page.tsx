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
  Search,
  Filter,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
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

  // Estados dos filtros
  const [filtros, setFiltros] = useState({
    busca: "",
    status: "",
    franqueado: "",
    professores: "", // "com", "sem", ""
  });

  // Estados de paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(10); // Pode ser configurável

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
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["professores-todos"],
        refetchType: "all",
      });
      await queryClient.invalidateQueries({
        queryKey: ["unidades-gestao"],
        refetchType: "all",
      });
      await queryClient.invalidateQueries({
        queryKey: ["unidades"],
        refetchType: "all",
      });
      await queryClient.invalidateQueries({
        queryKey: ["unidades-franqueado"],
        refetchType: "all",
      });
      await queryClient.refetchQueries({ queryKey: ["unidades-gestao"] });
      await queryClient.refetchQueries({ queryKey: ["professores-todos"] });
      toast.success("Professores vinculados com sucesso!");
      setShowProfessoresModal(false);
      setSelectedUnidade(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao vincular professores");
    },
  });

  const aprovarUnidadeMutation = useMutation({
    mutationFn: async (unidadeId: string) => {
      return updateUnidade(unidadeId, { status: "ATIVA" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["unidades-gestao"],
        refetchType: "all",
      });
      await queryClient.invalidateQueries({
        queryKey: ["unidades"],
        refetchType: "all",
      });
      await queryClient.invalidateQueries({
        queryKey: ["unidades-franqueado"],
        refetchType: "all",
      });
      await queryClient.refetchQueries({ queryKey: ["unidades-gestao"] });
      toast.success("Unidade aprovada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao aprovar unidade");
    },
  });

  const reprovarUnidadeMutation = useMutation({
    mutationFn: async (unidadeId: string) => {
      return updateUnidade(unidadeId, { status: "INATIVA" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["unidades-gestao"],
        refetchType: "all",
      });
      await queryClient.invalidateQueries({
        queryKey: ["unidades"],
        refetchType: "all",
      });
      await queryClient.invalidateQueries({
        queryKey: ["unidades-franqueado"],
        refetchType: "all",
      });
      await queryClient.refetchQueries({ queryKey: ["unidades-gestao"] });
      toast.success("Unidade reprovada");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao reprovar unidade");
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

  // Aplicar filtros
  const unidadesFiltradas = unidadesComDados.filter((unidade) => {
    // Filtro de busca por nome
    if (
      filtros.busca &&
      !unidade.nome.toLowerCase().includes(filtros.busca.toLowerCase())
    ) {
      return false;
    }

    // Filtro por status
    if (filtros.status) {
      // Para homologação, aceitar ambos os formatos
      if (filtros.status === "HOMOLOGACAO") {
        if (
          unidade.status !== "HOMOLOGACAO" &&
          unidade.status !== "EM_HOMOLOGACAO"
        ) {
          return false;
        }
      } else {
        // Para outros status, comparação exata
        if (unidade.status !== filtros.status) {
          return false;
        }
      }
    }

    // Filtro por franqueado
    if (filtros.franqueado) {
      if (filtros.franqueado === "com" && !unidade.franqueado_id) return false;
      if (filtros.franqueado === "sem" && unidade.franqueado_id) return false;
      if (
        filtros.franqueado !== "com" &&
        filtros.franqueado !== "sem" &&
        unidade.franqueado_id !== filtros.franqueado
      )
        return false;
    }

    // Filtro por professores
    if (filtros.professores) {
      if (filtros.professores === "com" && unidade.professores.length === 0)
        return false;
      if (filtros.professores === "sem" && unidade.professores.length > 0)
        return false;
    }

    return true;
  });

  // Aplicar paginação
  const totalPaginas = Math.ceil(unidadesFiltradas.length / itensPorPagina);
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const unidadesPaginadas = unidadesFiltradas.slice(indiceInicial, indiceFinal);

  // Reset da página quando aplicar filtros
  const handleFiltroChange = (key: string, value: string) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
    setPaginaAtual(1); // Reset para primeira página
  };

  const limparFiltros = () => {
    setFiltros({
      busca: "",
      status: "",
      franqueado: "",
      professores: "",
    });
    setPaginaAtual(1);
  };

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
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Voltar
                </button>
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
              Gerenciar Unidades
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

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar por nome
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={filtros.busca}
                    onChange={(e) =>
                      handleFiltroChange("busca", e.target.value)
                    }
                    placeholder="Nome da unidade..."
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filtros.status}
                  onChange={(e) => handleFiltroChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Todos os status</option>
                  <option value="ATIVA">Ativa</option>
                  <option value="INATIVA">Inativa</option>
                  <option value="HOMOLOGACAO">Em homologação</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Franqueado
                </label>
                <select
                  value={filtros.franqueado}
                  onChange={(e) =>
                    handleFiltroChange("franqueado", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Todas</option>
                  <option value="com">Com franqueado</option>
                  <option value="sem">Sem franqueado</option>
                  {franqueados.map((franqueado: Franqueado) => (
                    <option key={franqueado.id} value={franqueado.id}>
                      {franqueado.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Professores
                </label>
                <select
                  value={filtros.professores}
                  onChange={(e) =>
                    handleFiltroChange("professores", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Todas</option>
                  <option value="com">Com professores</option>
                  <option value="sem">Sem professores</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={limparFiltros}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Mostrando {indiceInicial + 1} a{" "}
                {Math.min(indiceFinal, unidadesFiltradas.length)} de{" "}
                {unidadesFiltradas.length} unidades
                {filtros.status ||
                filtros.busca ||
                filtros.franqueado ||
                filtros.professores
                  ? ` (filtradas de ${unidadesComDados.length})`
                  : ""}
              </p>
            </div>
          </CardContent>
        </Card>

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
              {unidadesPaginadas.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {filtros.status ||
                  filtros.busca ||
                  filtros.franqueado ||
                  filtros.professores ? (
                    <div>
                      <p className="text-gray-600 mb-2">
                        Nenhuma unidade encontrada com os filtros aplicados
                      </p>
                      {filtros.status === "INATIVA" && (
                        <p className="text-sm text-gray-500 mb-4">
                          ℹ️ Não há unidades com status &quot;Inativa&quot; no
                          sistema atualmente.
                        </p>
                      )}
                      <button
                        onClick={limparFiltros}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      Nenhuma unidade cadastrada ainda
                    </p>
                  )}
                </div>
              ) : (
                unidadesPaginadas.map(
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
                          {/* Approve / Reject buttons for MASTER when unit is pending (HOMOLOGACAO) */}
                          {(unidade.status === "HOMOLOGACAO" ||
                            unidade.status === "EM_HOMOLOGACAO") &&
                            hasPerfil("master") && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Aprovar a unidade "${unidade.nome}"? Essa ação deixará a unidade como ATIVA.`
                                      )
                                    ) {
                                      aprovarUnidadeMutation.mutate(unidade.id);
                                    }
                                  }}
                                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                                >
                                  <CheckCircle className="h-4 w-4 inline-block mr-2" />
                                  Aprovar
                                </button>

                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Reprovar a unidade "${unidade.nome}"? Essa ação deixará a unidade como INATIVA.`
                                      )
                                    ) {
                                      reprovarUnidadeMutation.mutate(
                                        unidade.id
                                      );
                                    }
                                  }}
                                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                                >
                                  <XCircle className="h-4 w-4 inline-block mr-2" />
                                  Reprovar
                                </button>
                              </div>
                            )}

                          {unidade.professores.length > 0 && (
                            <div className="text-right max-w-xs">
                              <div className="text-sm font-medium">
                                {unidade.professores
                                  .slice(0, 2)
                                  .map((p: Professor, i: number) => (
                                    <span key={p.id} className="text-gray-600">
                                      {p.nome_completo}
                                      {i <
                                      Math.min(
                                        unidade.professores.length - 1,
                                        1
                                      )
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

                          {/* Botão Gerenciar Professores - COMENTADO TEMPORARIAMENTE */}
                          {/* <button
                            onClick={() => abrirModalProfessores(unidade)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                          >
                            <Settings className="h-4 w-4" />
                            Gerenciar Professores
                          </button> */}
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPaginaAtual(1)}
              disabled={paginaAtual === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Primeira
            </button>
            <button
              onClick={() => setPaginaAtual(paginaAtual - 1)}
              disabled={paginaAtual === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter((page) => {
                  // Mostra primeira, última, atual e 2 páginas antes/depois da atual
                  return (
                    page === 1 ||
                    page === totalPaginas ||
                    (page >= paginaAtual - 2 && page <= paginaAtual + 2)
                  );
                })
                .map((page, index, array) => {
                  // Adiciona "..." entre páginas não consecutivas
                  const showEllipsis =
                    index > 0 && array[index - 1] !== page - 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <span className="px-2 py-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setPaginaAtual(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          paginaAtual === page
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setPaginaAtual(paginaAtual + 1)}
              disabled={paginaAtual === totalPaginas}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPaginaAtual(totalPaginas)}
              disabled={paginaAtual === totalPaginas}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Última
            </button>
          </div>
        )}

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
