"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarParametros,
  listarAlunosAptos,
  aprovarGraduacao,
  type GraduacaoParametro,
  type AlunoAptoGraduacao,
} from "@/lib/graduacaoParametrosApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Trophy,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Filter,
  Search,
  Award,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AprovacaoGraduacaoPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [parametroSelecionado, setParametroSelecionado] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "pendente" | "aprovado"
  >("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAluno, setSelectedAluno] = useState<AlunoAptoGraduacao | null>(
    null
  );
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [showReprovarModal, setShowReprovarModal] = useState(false);
  const [observacao, setObservacao] = useState("");

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

  const getFaixaCorClass = (cor: string) => {
    const cores: Record<string, string> = {
      "#FFFFFF": "bg-gray-100 text-gray-800 border-gray-300",
      "#0066CC": "bg-blue-100 text-blue-800 border-blue-300",
      "#6600CC": "bg-purple-100 text-purple-800 border-purple-300",
      "#8B4513": "bg-amber-100 text-amber-800 border-amber-300",
      "#000000": "bg-gray-900 text-white border-gray-700",
      "#FF7F50": "bg-orange-100 text-orange-800 border-orange-300",
      "#FF0000": "bg-red-100 text-red-800 border-red-300",
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
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
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
              <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
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
                      {p.nome} ({new Date(p.data_inicio).toLocaleDateString()} -{" "}
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
                          <span className="text-sm text-gray-700">Atual:</span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm border font-medium ${getFaixaCorClass(
                              aluno.faixa_atual_cor
                            )}`}
                          >
                            {aluno.faixa_atual_nome} ({aluno.graus_atual} graus)
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
                          <span className="text-gray-600">Na faixa desde:</span>
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
                <p className="text-gray-600 mt-1">{selectedAluno.aluno_nome}</p>
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
      </div>
    </div>
  );
}
