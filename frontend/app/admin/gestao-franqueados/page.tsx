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
import { getUsuariosByPerfil } from "@/lib/usuariosApi";
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
  UserCog,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

interface Franqueado {
  id: string;
  nome: string;
  email: string;
  cnpj: string;
  unidades_gerencia: string[];
  ativo: boolean;
  situacao: "ATIVA" | "INATIVA" | "EM_HOMOLOGACAO";
  total_unidades: number;
  usuario_id?: string;
}

interface Unidade {
  id: string;
  nome: string;
  franqueado_id: string;
  status: string;
  endereco?: any;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  username: string;
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

  // Novo estado para vincular usuário
  const [showVincularUsuarioModal, setShowVincularUsuarioModal] =
    useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<string>("");

  // Estados dos filtros
  const [filtros, setFiltros] = useState({
    busca: "",
    situacao: "",
    ativo: "",
    temUnidades: "",
    temUsuario: "",
  });

  // Hooks sempre chamados (antes de qualquer return condicional)
  const franqueadosQuery = useQuery({
    queryKey: ["franqueados-gestao"],
    queryFn: () => listFranqueados({ pageSize: 100 }),
  });

  const unidadesQuery = useQuery({
    queryKey: ["unidades-todas"],
    queryFn: () => listUnidades({ pageSize: 500 }),
  });

  // Query para buscar usuários com perfil FRANQUEADO
  const usuariosFranqueadosQuery = useQuery({
    queryKey: ["usuarios-franqueados"],
    queryFn: () => getUsuariosByPerfil("FRANQUEADO"),
  });

  const associarUnidadesMutation = useMutation({
    mutationFn: ({
      franqueadoId,
      unidadeIds,
    }: {
      franqueadoId: string;
      unidadeIds: string[];
    }) => updateFranqueado(franqueadoId, { unidades_gerencia: unidadeIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franqueados-gestao"] });
      queryClient.invalidateQueries({ queryKey: ["unidades-todas"] });
      toast.success("Unidades associadas com sucesso!");
      setShowAssociacaoModal(false);
    },
    onError: (error: Error) => {
      console.error("Erro ao associar unidades:", error);
      toast.error("Erro ao associar unidades");
    },
  });

  const vincularUsuarioMutation = useMutation({
    mutationFn: ({
      franqueadoId,
      usuarioId,
    }: {
      franqueadoId: string;
      usuarioId: string;
    }) => updateFranqueado(franqueadoId, { usuario_id: usuarioId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franqueados-gestao"] });
      toast.success("Usuário vinculado com sucesso!");
      setShowVincularUsuarioModal(false);
    },
    onError: (error: Error) => {
      console.error("Erro ao vincular usuário:", error);
      toast.error("Erro ao vincular usuário");
    },
  });

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

  // Funções de filtro
  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const limparFiltros = () => {
    setFiltros({
      busca: "",
      situacao: "",
      ativo: "",
      temUnidades: "",
      temUsuario: "",
    });
  };

  const abrirModalVincularUsuario = (franqueado: Franqueado) => {
    setSelectedFranqueado(franqueado);
    setSelectedUsuarioId(franqueado.usuario_id || "");
    setShowVincularUsuarioModal(true);
  };

  const abrirModalAssociacao = (franqueado: Franqueado) => {
    setSelectedFranqueado(franqueado);

    // Buscar unidades já vinculadas pelo franqueado_id na base de dados
    const todasUnidades = unidadesQuery.data?.items || [];
    const unidadesDoFranqueado = todasUnidades
      .filter((unidade: Unidade) => unidade.franqueado_id === franqueado.id)
      .map((unidade: Unidade) => unidade.id);

    setUnidadesVinculadas(unidadesDoFranqueado);

    // Mostrar TODAS as unidades para seleção - incluir as que já pertencem a outros franqueados
    // mas marcar visualmente quais estão disponíveis
    setUnidadesDisponiveis(todasUnidades);
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

    // Determinar se é associação ou desassociação baseado na quantidade
    const todasUnidades = unidadesQuery.data?.items || [];
    const unidadesAtuais = todasUnidades
      .filter(
        (unidade: Unidade) => unidade.franqueado_id === selectedFranqueado.id
      )
      .map((unidade: Unidade) => unidade.id);

    const foiAssociacao = unidadesVinculadas.length > unidadesAtuais.length;
    const foiDesassociacao = unidadesVinculadas.length < unidadesAtuais.length;

    associarUnidadesMutation.mutate({
      franqueadoId: selectedFranqueado.id,
      unidadeIds: unidadesVinculadas,
      isAssociacao: foiAssociacao,
      isDesassociacao: foiDesassociacao,
    });
  };

  const franqueados = franqueadosQuery.data?.items || [];
  const todasUnidades = unidadesQuery.data?.items || [];
  const usuarios = usuariosFranqueadosQuery.data || [];

  // Aplicar filtros
  const franqueadosFiltrados = franqueados.filter((franqueado) => {
    // Filtro de busca (nome, email, CNPJ)
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      const matches =
        franqueado.nome.toLowerCase().includes(busca) ||
        franqueado.email.toLowerCase().includes(busca) ||
        franqueado.cnpj.includes(filtros.busca);
      if (!matches) return false;
    }

    // Filtro de situação
    if (filtros.situacao && franqueado.situacao !== filtros.situacao) {
      return false;
    }

    // Filtro de ativo
    if (filtros.ativo) {
      const isAtivo = filtros.ativo === "true";
      if (franqueado.ativo !== isAtivo) return false;
    }

    // Filtro de tem unidades
    if (filtros.temUnidades) {
      const temUnidades = todasUnidades.some(
        (u: Unidade) => u.franqueado_id === franqueado.id
      );
      const filtroTemUnidades = filtros.temUnidades === "true";
      if (temUnidades !== filtroTemUnidades) return false;
    }

    // Filtro de tem usuário vinculado
    if (filtros.temUsuario) {
      const temUsuario = !!franqueado.usuario_id;
      const filtroTemUsuario = filtros.temUsuario === "true";
      if (temUsuario !== filtroTemUsuario) return false;
    }

    return true;
  });

  // Estatísticas
  const stats = {
    totalFranqueados: franqueados.length,
    franqueadosAtivos: franqueados.filter((f) => f.situacao === "ATIVA").length,
    franqueadosInativos: franqueados.filter((f) => f.situacao === "INATIVA")
      .length,
    franqueadosHomologacao: franqueados.filter(
      (f) => f.situacao === "EM_HOMOLOGACAO"
    ).length,
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
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  title="Voltar para o Dashboard"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
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
              Visualizar Franqueados
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

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Busca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar
                </label>
                <input
                  type="text"
                  placeholder="Nome, email ou CNPJ..."
                  value={filtros.busca}
                  onChange={(e) => handleFiltroChange("busca", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Situação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Situação
                </label>
                <select
                  value={filtros.situacao}
                  onChange={(e) =>
                    handleFiltroChange("situacao", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Todas</option>
                  <option value="ATIVA">Ativa</option>
                  <option value="INATIVA">Inativa</option>
                  <option value="EM_HOMOLOGACAO">Em Homologação</option>
                </select>
              </div>

              {/* Tem Unidades */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidades
                </label>
                <select
                  value={filtros.temUnidades}
                  onChange={(e) =>
                    handleFiltroChange("temUnidades", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Todos</option>
                  <option value="true">Com unidades</option>
                  <option value="false">Sem unidades</option>
                </select>
              </div>

              {/* Tem Usuário */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuário
                </label>
                <select
                  value={filtros.temUsuario}
                  onChange={(e) =>
                    handleFiltroChange("temUsuario", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Todos</option>
                  <option value="true">Com usuário</option>
                  <option value="false">Sem usuário</option>
                </select>
              </div>
            </div>

            {/* Botão Limpar Filtros */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={limparFiltros}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
              >
                Limpar Filtros
              </button>
            </div>

            {/* Contador de resultados */}
            <div className="mt-2 text-sm text-gray-500">
              Mostrando {franqueadosFiltrados.length} de {franqueados.length}{" "}
              franqueados
            </div>
          </CardContent>
        </Card>

        {/* Lista de Franqueados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Franqueados e Suas Unidades
            </CardTitle>
            <CardDescription>
              Clique em &quot;Gerenciar Unidades&quot; para associar/desassociar
              unidades de cada franqueado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {franqueadosFiltrados.map((franqueado: Franqueado) => {
                // Buscar unidades vinculadas pelo franqueado_id
                const unidadesFranqueado = todasUnidades.filter(
                  (u: Unidade) => u.franqueado_id === franqueado.id
                );

                // Badge de status
                const getStatusBadge = () => {
                  switch (franqueado.situacao) {
                    case "ATIVA":
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          Ativa
                        </span>
                      );
                    case "INATIVA":
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          <XCircle className="h-3 w-3" />
                          Inativa
                        </span>
                      );
                    case "EM_HOMOLOGACAO":
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                          <Settings className="h-3 w-3" />
                          Em Homologação
                        </span>
                      );
                    default:
                      return null;
                  }
                };

                return (
                  <div
                    key={franqueado.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors overflow-hidden"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate max-w-md">
                            {franqueado.nome}
                          </h3>
                          {getStatusBadge()}
                        </div>
                        <p className="text-sm text-gray-600 truncate max-w-md">
                          {franqueado.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {unidadesFranqueado.length} unidade(s) vinculada(s)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {unidadesFranqueado.length > 0 && (
                        <div className="text-right max-w-md">
                          <div className="text-sm font-medium truncate">
                            {unidadesFranqueado.map((u, i) => (
                              <span key={u.id} className="text-gray-600">
                                {u.nome}
                                {i < unidadesFranqueado.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Botões comentados temporariamente */}
                      {/* <button
                        onClick={() => abrirModalVincularUsuario(franqueado)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                        title="Vincular usuário a este franqueado"
                      >
                        <UserCog className="h-4 w-4" />
                        Vincular Usuário
                      </button>

                      <button
                        onClick={() => abrirModalAssociacao(franqueado)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                      >
                        <Settings className="h-4 w-4" />
                        Gerenciar Unidades
                      </button> */}
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

        {/* Modal de Vincular Usuário */}
        {showVincularUsuarioModal && selectedFranqueado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-purple-600" />
                  Vincular Usuário ao Franqueado
                </h2>
                <p className="text-gray-600 mt-1">{selectedFranqueado.nome}</p>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecione um usuário com perfil FRANQUEADO
                    </label>
                    <select
                      value={selectedUsuarioId}
                      onChange={(e) => setSelectedUsuarioId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Nenhum usuário selecionado</option>
                      {usuariosFranqueadosQuery.data?.map((usuario) => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.nome} ({usuario.email})
                        </option>
                      ))}
                    </select>
                    {usuariosFranqueadosQuery.isLoading && (
                      <p className="text-sm text-gray-500 mt-1">
                        Carregando usuários...
                      </p>
                    )}
                    {!usuariosFranqueadosQuery.isLoading &&
                      usuariosFranqueadosQuery.data?.length === 0 && (
                        <p className="text-sm text-orange-600 mt-1">
                          Nenhum usuário com perfil FRANQUEADO encontrado. Crie
                          um usuário primeiro.
                        </p>
                      )}
                  </div>

                  {selectedFranqueado.usuario_id && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Atual:</strong> Este franqueado já está
                        vinculado a um usuário. Selecionar outro usuário irá
                        substituir o vínculo existente.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowVincularUsuarioModal(false);
                    setSelectedFranqueado(null);
                    setSelectedUsuarioId("");
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (selectedFranqueado) {
                      vincularUsuarioMutation.mutate({
                        franqueadoId: selectedFranqueado.id,
                        usuarioId: selectedUsuarioId || null,
                      });
                    }
                  }}
                  disabled={
                    vincularUsuarioMutation.isPending ||
                    usuariosFranqueadosQuery.isLoading
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {vincularUsuarioMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Salvar Vínculo
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
