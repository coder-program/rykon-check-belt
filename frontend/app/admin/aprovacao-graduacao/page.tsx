"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  listarParametros,
  listarAlunosAptos,
  aprovarGraduacao,
  graduarAlunoManual,
  listarFaixas,
  listarFaixasValidasParaGraduacao,
  type AlunoAptoGraduacao,
} from "@/lib/graduacaoParametrosApi";
import { listAlunos } from "@/lib/peopleApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Trophy,
  Users,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Settings,
  Award,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AprovacaoGraduacaoPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [parametroSelecionado, setParametroSelecionado] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "pendente" | "aprovado"
  >("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAluno, setSelectedAluno] = useState<AlunoAptoGraduacao | null>(
    null
  );
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [observacao, setObservacao] = useState("");
  // Estados para graduação manual
  const [activeTab, setActiveTab] = useState<"automatica" | "manual">(
    "automatica"
  );
  const [searchAlunoManual, setSearchAlunoManual] = useState("");
  const [selectedAlunoManual, setSelectedAlunoManual] = useState<{
    id: string;
    nome: string;
    faixa_nome: string;
    faixa_cor: string;
    unidade_nome: string;
    data_nascimento: string;
  } | null>(null);
  const [showGraduacaoManualModal, setShowGraduacaoManualModal] =
    useState(false);

  const [faixaDestinoId, setFaixaDestinoId] = useState("");
  const [observacaoManual, setObservacaoManual] = useState("");

  // Verificar permissões
  const hasPerfil = (p: string) =>
    (user?.perfis || [])
      .map((x: string) => x.toLowerCase())
      .includes(p.toLowerCase());

  const podeAprovar =
    hasPerfil("master") ||
    hasPerfil("admin") ||
    hasPerfil("professor") ||
    hasPerfil("gerente_unidade") ||
    hasPerfil("franqueado");

  // Queries
  const parametrosQuery = useQuery({
    queryKey: ["parametros-graduacao"],
    queryFn: () => listarParametros(),
  });

  const alunosAptosQuery = useQuery({
    queryKey: ["alunos-aptos", parametroSelecionado],
    queryFn: () => listarAlunosAptos(parametroSelecionado || undefined),
    enabled: !!parametroSelecionado || parametroSelecionado === "",
  });

  // Query para buscar todos os alunos (graduação manual)
  const todosAlunosQuery = useQuery({
    queryKey: ["todos-alunos-graduacao"],
    queryFn: () => listAlunos({ pageSize: 1000, status: "ATIVO" }),
    enabled: activeTab === "manual",
  });

  // Query para buscar faixas disponíveis (válidas para graduação)
  const faixasQuery = useQuery({
    queryKey: ["faixas-graduacao", selectedAlunoManual?.id],
    queryFn: async () => {
      console.log("🔍 Buscando faixas válidas para graduação...");

      if (!selectedAlunoManual?.id) {
        console.log("⚠️ Nenhum aluno selecionado, buscando todas as faixas");
        return await listarFaixas("ADULTO");
      }

      try {
        // Buscar apenas faixas válidas para graduação (ordem superior à atual)
        const faixasValidas = await listarFaixasValidasParaGraduacao(
          selectedAlunoManual.id,
          "ADULTO"
        );
        console.log("📋 Faixas válidas para graduação:", faixasValidas);

        if (faixasValidas.length === 0) {
          console.log(
            "⚠️ Nenhuma faixa válida encontrada, aluno pode estar na faixa máxima"
          );
        }

        return faixasValidas;
      } catch (error) {
        console.error(
          "❌ Erro ao buscar faixas válidas, buscando todas:",
          error
        );
        // Fallback: buscar todas as faixas
        return await listarFaixas("ADULTO");
      }
    },
    enabled: activeTab === "manual" && !!selectedAlunoManual,
  });

  // Mutations
  const aprovarMutation = useMutation({
    mutationFn: (data: {
      aluno_id: string;
      faixa_origem_id: string;
      faixa_destino_id: string;
      parametro_id?: string;
      observacao_aprovacao?: string;
    }) => aprovarGraduacao(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alunos-aptos"] });
      toast.success("Graduação aprovada com sucesso!");
      setShowAprovarModal(false);
      setSelectedAluno(null);
      setObservacao("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao aprovar graduação");
    },
  });

  // Mutation para graduação manual
  const graduarManualMutation = useMutation({
    mutationFn: (data: {
      alunoId: string;
      faixaDestinoId: string;
      observacao?: string;
    }) =>
      graduarAlunoManual(data.alunoId, {
        faixaDestinoId: data.faixaDestinoId,
        observacao: data.observacao,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos-alunos-graduacao"] });
      queryClient.invalidateQueries({ queryKey: ["alunos-aptos"] });
      toast.success("Aluno graduado manualmente com sucesso!");
      setShowGraduacaoManualModal(false);
      setSelectedAlunoManual(null);
      setObservacaoManual("");
      setFaixaDestinoId("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao graduar aluno");
    },
  });

  const handleAprovar = (aluno: AlunoAptoGraduacao) => {
    if (!aluno.proxima_faixa_id) {
      toast.error("Não foi possível identificar a próxima faixa");
      return;
    }

    setSelectedAluno(aluno);
    setShowAprovarModal(true);
  };

  const confirmarAprovacao = () => {
    if (!selectedAluno || !selectedAluno.proxima_faixa_id) return;

    aprovarMutation.mutate({
      aluno_id: selectedAluno.aluno_id,
      faixa_origem_id: selectedAluno.faixa_atual_id,
      faixa_destino_id: selectedAluno.proxima_faixa_id,
      parametro_id: parametroSelecionado || undefined,
      observacao_aprovacao: observacao || undefined,
    });
  };

  const parametros = parametrosQuery.data || [];
  const alunosAptos = alunosAptosQuery.data || [];

  // Filtros
  const alunosFiltrados = alunosAptos
    .filter((aluno) => {
      if (filtroStatus === "pendente") return !aluno.graduacao_aprovada;
      if (filtroStatus === "aprovado") return aluno.graduacao_aprovada;
      return true;
    })
    .filter((aluno) =>
      aluno.aluno_nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Estatísticas
  const stats = {
    total: alunosAptos.length,
    pendentes: alunosAptos.filter((a) => !a.graduacao_aprovada).length,
    aprovados: alunosAptos.filter((a) => a.graduacao_aprovada).length,
  };

  // Mapear cores das faixas baseado no enum
  const getFaixaCorByEnum = (faixaEnum: string): string => {
    const coresFaixas: Record<string, string> = {
      BRANCA: "#FFFFFF",
      CINZA_BRANCA: "#CCCCCC",
      CINZA: "#808080",
      CINZA_PRETA: "#404040",
      AMARELA_BRANCA: "#FFFF99",
      AMARELA: "#FFFF00",
      AMARELA_PRETA: "#CCCC00",
      LARANJA_BRANCA: "#FFCC99",
      LARANJA: "#FF7F50",
      LARANJA_PRETA: "#FF4500",
      VERDE_BRANCA: "#99FF99",
      VERDE: "#00FF00",
      VERDE_PRETA: "#008000",
      AZUL: "#0066CC",
      ROXA: "#6600CC",
      MARROM: "#8B4513",
      PRETA: "#000000",
      CORAL: "#FF7F50",
      VERMELHA: "#FF0000",
    };
    return coresFaixas[faixaEnum] || "#FFFFFF";
  };

  const getFaixaCorClass = (cor: string) => {
    const cores: Record<string, string> = {
      "#FFFFFF": "bg-gray-100 text-gray-800 border-gray-300",
      "#0066CC": "bg-blue-100 text-blue-800 border-blue-300",
      "#6600CC": "bg-purple-100 text-purple-800 border-purple-300",
      "#8B4513": "bg-amber-100 text-amber-800 border-amber-300",
      "#000000": "bg-gray-900 text-white border-gray-700",
      "#FF7F50": "bg-orange-100 text-orange-800 border-orange-300",
      "#FF0000": "bg-red-100 text-red-800 border-red-300",
      "#CCCCCC": "bg-gray-200 text-gray-800 border-gray-400",
      "#808080": "bg-gray-300 text-gray-800 border-gray-500",
      "#404040": "bg-gray-600 text-white border-gray-700",
      "#FFFF99": "bg-yellow-100 text-yellow-800 border-yellow-300",
      "#FFFF00": "bg-yellow-200 text-yellow-800 border-yellow-400",
      "#CCCC00": "bg-yellow-300 text-yellow-800 border-yellow-500",
      "#FFCC99": "bg-orange-50 text-orange-800 border-orange-200",
      "#FF4500": "bg-orange-200 text-orange-800 border-orange-400",
      "#99FF99": "bg-green-50 text-green-800 border-green-200",
      "#00FF00": "bg-green-200 text-green-800 border-green-400",
      "#008000": "bg-green-600 text-white border-green-700",
    };
    return cores[cor] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  if (!podeAprovar) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Restrito
          </h1>
          <p className="text-gray-600">
            Você não tem permissão para aprovar graduações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-3 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Aprovação de Graduações
            </h1>
          </div>
          <p className="text-gray-600">
            Gerencie e aprove solicitações de graduação de alunos
          </p>
        </div>

        {/* Tabs para Graduação */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("automatica")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "automatica"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Graduação Automática (Por Parâmetros)
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "manual"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Graduação Manual (Sem Parâmetros)
            </button>
          </nav>
        </div>

        {/* Conteúdo da Tab Automática */}
        {activeTab === "automatica" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Alunos Aptos
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    Prontos para graduar
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pendentes
                  </CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.pendentes}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Aguardando aprovação
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Aprovadas
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.aprovados}
                  </div>
                  <p className="text-xs text-muted-foreground">Já aprovadas</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Período de Graduação
                    </label>
                    <select
                      value={parametroSelecionado}
                      onChange={(e) => setParametroSelecionado(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos os Períodos</option>
                      {parametros.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} (
                          {new Date(p.data_inicio).toLocaleDateString()} -{" "}
                          {new Date(p.data_fim).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={filtroStatus}
                      onChange={(e) =>
                        setFiltroStatus(
                          e.target.value as "todos" | "pendente" | "aprovado"
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="todos">Todos</option>
                      <option value="pendente">Pendentes</option>
                      <option value="aprovado">Aprovados</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar Aluno
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nome do aluno..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações do Período */}
            {parametroSelecionado && (
              <Card className="mb-6 bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-blue-900">
                        Período Selecionado:{" "}
                        {
                          parametros.find((p) => p.id === parametroSelecionado)
                            ?.nome
                        }
                      </p>
                      <p className="text-sm text-blue-700">
                        Critérios: Mínimo{" "}
                        {
                          parametros.find((p) => p.id === parametroSelecionado)
                            ?.graus_minimos
                        }{" "}
                        graus |{" "}
                        {
                          parametros.find((p) => p.id === parametroSelecionado)
                            ?.presencas_minimas
                        }{" "}
                        presenças
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de Alunos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Alunos Aptos para Graduação ({alunosFiltrados.length})
                </CardTitle>
                <CardDescription>
                  {filtroStatus === "pendente"
                    ? "Alunos aguardando aprovação"
                    : filtroStatus === "aprovado"
                    ? "Alunos com graduação aprovada"
                    : "Todos os alunos aptos para graduar"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alunosFiltrados.map((aluno) => (
                    <div
                      key={aluno.aluno_id}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        aluno.graduacao_aprovada
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              {aluno.aluno_nome}
                            </h3>
                            {aluno.graduacao_aprovada && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Aprovada
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-sm text-gray-600">
                              📍 {aluno.unidade_nome}
                            </span>
                            <span className="text-sm text-gray-600">
                              CPF: {aluno.aluno_cpf}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700">
                                Atual:
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-sm border font-medium ${getFaixaCorClass(
                                  aluno.faixa_atual_cor
                                )}`}
                              >
                                {aluno.faixa_atual_nome} ({aluno.graus_atual}{" "}
                                graus)
                              </span>
                            </div>
                            <span className="text-gray-400">→</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700">
                                Próxima:
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-sm border font-medium ${getFaixaCorClass(
                                  aluno.proxima_faixa_cor || "#FFFFFF"
                                )}`}
                              >
                                {aluno.proxima_faixa_nome || "N/A"}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Presenças:</span>
                              <span className="ml-2 font-semibold">
                                {aluno.presencas_total}
                              </span>
                              {aluno.presencas_suficientes ? (
                                <span className="ml-1 text-green-600">✓</span>
                              ) : (
                                <span className="ml-1 text-red-600">✗</span>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-600">Graus:</span>
                              <span className="ml-2 font-semibold">
                                {aluno.graus_atual}
                              </span>
                              {aluno.graus_suficientes ? (
                                <span className="ml-1 text-green-600">✓</span>
                              ) : (
                                <span className="ml-1 text-red-600">✗</span>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-600">
                                Na faixa desde:
                              </span>
                              <span className="ml-2 font-semibold">
                                {new Date(
                                  aluno.data_inicio_faixa
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {aluno.graduacao_data_aprovacao && (
                            <div className="mt-2 text-sm text-green-700">
                              Aprovada em:{" "}
                              {new Date(
                                aluno.graduacao_data_aprovacao
                              ).toLocaleDateString()}
                            </div>
                          )}

                          {aluno.observacao_aprovacao && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded">
                              <strong>Obs:</strong> {aluno.observacao_aprovacao}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {!aluno.graduacao_aprovada && (
                            <button
                              onClick={() => handleAprovar(aluno)}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Aprovar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {alunosFiltrados.length === 0 && (
                    <div className="text-center py-12">
                      <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg">
                        Nenhum aluno encontrado
                      </p>
                      <p className="text-gray-500 text-sm">
                        Ajuste os filtros ou selecione outro período
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Modal de Aprovação */}
            {showAprovarModal && selectedAluno && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Aprovar Graduação
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {selectedAluno.aluno_nome}
                    </p>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Faixa Atual</p>
                          <span
                            className={`px-3 py-1 rounded-full text-sm border ${getFaixaCorClass(
                              selectedAluno.faixa_atual_cor
                            )}`}
                          >
                            {selectedAluno.faixa_atual_nome}
                          </span>
                        </div>
                        <div className="text-gray-400">→</div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Nova Faixa</p>
                          <span
                            className={`px-3 py-1 rounded-full text-sm border ${getFaixaCorClass(
                              selectedAluno.proxima_faixa_cor || "#FFFFFF"
                            )}`}
                          >
                            {selectedAluno.proxima_faixa_nome || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações da Aprovação (opcional)
                      </label>
                      <textarea
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Ex: Excelente evolução técnica, dedicação exemplar..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAprovarModal(false);
                        setSelectedAluno(null);
                        setObservacao("");
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmarAprovacao}
                      disabled={aprovarMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {aprovarMutation.isPending && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      <CheckCircle className="h-4 w-4" />
                      Confirmar Aprovação
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Conteúdo da Tab Manual */}
        {activeTab === "manual" && (
          <div className="space-y-6">
            {/* Buscar Aluno */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar Aluno para Graduação Manual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Digite o nome do aluno..."
                      value={searchAlunoManual}
                      onChange={(e) => setSearchAlunoManual(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => setShowGraduacaoManualModal(true)}
                    disabled={!selectedAlunoManual}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Graduar
                  </button>
                </div>

                {/* Lista de Alunos Filtrados */}
                {searchAlunoManual && (
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {todosAlunosQuery.data?.items
                      ?.filter((aluno) =>
                        aluno.nome_completo
                          ?.toLowerCase()
                          ?.includes(searchAlunoManual.toLowerCase())
                      )
                      .map((aluno) => (
                        <div
                          key={aluno.id}
                          onClick={() => {
                            // Debug log para verificar estrutura dos dados
                            console.log("Dados do aluno:", aluno);
                            console.log("Faixa atual:", aluno.faixa_atual);
                            console.log("Faixas relacionadas:", aluno.faixas);

                            // Buscar faixa ativa primeiro, senão usar faixa_atual enum
                            const faixaAtiva =
                              aluno.faixas?.find((f) => f.ativa) ||
                              aluno.faixas?.[0];

                            const faixaNome =
                              faixaAtiva?.faixaDef?.nome_exibicao ||
                              aluno.faixa_atual?.replace(/_/g, " ") ||
                              "Sem faixa";
                            const faixaCor =
                              faixaAtiva?.faixaDef?.cor_hex ||
                              getFaixaCorByEnum(aluno.faixa_atual) ||
                              "#FFFFFF";

                            setSelectedAlunoManual({
                              id: aluno.id,
                              nome: aluno.nome_completo,
                              faixa_nome: faixaNome,
                              faixa_cor: faixaCor,
                              unidade_nome:
                                aluno.unidade?.nome || "Sem unidade",
                              data_nascimento: aluno.data_nascimento,
                            });
                            setSearchAlunoManual(aluno.nome_completo);
                          }}
                          className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                            selectedAlunoManual?.id === aluno.id
                              ? "bg-blue-50"
                              : ""
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {aluno.nome_completo}
                              </p>
                              <p className="text-sm text-gray-500">
                                Faixa:{" "}
                                {(() => {
                                  const faixaAtiva =
                                    aluno.faixas?.find((f) => f.ativa) ||
                                    aluno.faixas?.[0];
                                  return (
                                    faixaAtiva?.faixaDef?.nome_exibicao ||
                                    aluno.faixa_atual?.replace(/_/g, " ") ||
                                    "Sem faixa"
                                  );
                                })()}{" "}
                                | Unidade:{" "}
                                {aluno.unidade?.nome || "Sem unidade"}
                              </p>
                            </div>
                            <div
                              className={`px-2 py-1 rounded text-xs font-medium border ${getFaixaCorClass(
                                aluno.faixa_cor
                              )}`}
                            >
                              {aluno.faixa_nome}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações do Aluno Selecionado */}
            {selectedAlunoManual && (
              <Card>
                <CardHeader>
                  <CardTitle>Aluno Selecionado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Nome</p>
                      <p className="font-medium">{selectedAlunoManual.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Faixa Atual</p>
                      <div className="flex items-center gap-2">
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium border ${getFaixaCorClass(
                            selectedAlunoManual.faixa_cor
                          )}`}
                        >
                          {selectedAlunoManual.faixa_nome}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Unidade</p>
                      <p className="font-medium">
                        {selectedAlunoManual.unidade_nome}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        Data de Nascimento
                      </p>
                      <p className="font-medium">
                        {new Date(
                          selectedAlunoManual.data_nascimento
                        ).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {/* Botão de Graduação */}
                  <div className="mt-6">
                    <button
                      onClick={() => setShowGraduacaoManualModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Graduar Aluno
                    </button>
                  </div>

                  {/* Campo de Observação */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observação (opcional)
                    </label>
                    <textarea
                      value={observacaoManual}
                      onChange={(e) => setObservacaoManual(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Adicione uma observação sobre esta graduação..."
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Modal de Graduação Manual */}
        {showGraduacaoManualModal && selectedAlunoManual && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Graduação Manual - {selectedAlunoManual.nome}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                {/* Seleção de Faixa */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Faixa de Destino
                  </label>
                  <div className="mb-3 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded border">
                    ℹ️ Apenas faixas com ordem superior à atual são exibidas
                    (graduação sequencial)
                  </div>
                  <select
                    value={faixaDestinoId}
                    onChange={(e) => setFaixaDestinoId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-500">
                      Selecione uma faixa
                    </option>
                    {(() => {
                      console.log(
                        "🎯 Dados das faixas no select:",
                        faixasQuery.data
                      );
                      console.log("🎯 Loading:", faixasQuery.isLoading);
                      console.log("🎯 Error:", faixasQuery.error);

                      if (faixasQuery.isLoading) {
                        return <option value="">Carregando faixas...</option>;
                      }

                      if (faixasQuery.error) {
                        return (
                          <option value="">Erro ao carregar faixas</option>
                        );
                      }

                      if (!faixasQuery.data || faixasQuery.data.length === 0) {
                        return (
                          <option value="">Nenhuma faixa encontrada</option>
                        );
                      }

                      return faixasQuery.data.map((faixa) => (
                        <option
                          key={faixa.id}
                          value={faixa.id}
                          className="text-gray-900"
                        >
                          {faixa.nome_exibicao} (Ordem: {faixa.ordem || "N/A"})
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Observação */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Observação (opcional)
                  </label>
                  <textarea
                    value={observacaoManual}
                    onChange={(e) => setObservacaoManual(e.target.value)}
                    placeholder="Digite uma observação sobre esta graduação..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowGraduacaoManualModal(false);
                    setFaixaDestinoId("");
                    setObservacaoManual("");
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!faixaDestinoId) {
                      toast.error("Selecione uma faixa de destino");
                      return;
                    }
                    graduarManualMutation.mutate({
                      alunoId: selectedAlunoManual.id,
                      faixaDestinoId,
                      observacao: observacaoManual || undefined,
                    });
                  }}
                  disabled={!faixaDestinoId || graduarManualMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {graduarManualMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <CheckCircle className="h-4 w-4" />
                  Confirmar Graduação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
