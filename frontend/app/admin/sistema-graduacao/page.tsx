"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarFaixas,
  getProximosGraduar,
  concederGrau,
  graduarFaixa,
  getHistoricoGraduacoes,
} from "@/lib/graduacaoApi";
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
  Users,
  Clock,
  Star,
  Award,
  CheckCircle,
  Calendar,
  Target,
  TrendingUp,
  Filter,
  Search,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

interface AlunoGraduacao {
  id: string;
  nome: string;
  faixaAtual: string;
  faixaAtualCor: string;
  grauAtual: number;
  tempoNaFaixa: number;
  aulasRealizadas: number;
  aulasNecessarias: number;
  proximaFaixa?: string;
  proximaFaixaCor?: string;
  categoria: "ADULTO" | "INFANTIL";
  unidadeId: string;
  unidadeNome: string;
  podeGraduar: boolean;
}

interface FaixaDef {
  id: string;
  nome: string;
  cor: string;
  categoria: "ADULTO" | "INFANTIL";
  ordem: number;
  tempoMinimoMeses: number;
  aulasNecessarias: number;
  maxGraus: number;
}

export default function SistemaGraduacaoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedTab, setSelectedTab] = useState<"proximos" | "historico">(
    "proximos"
  );
  const [filtroCategoria, setFiltroCategoria] = useState<
    "todos" | "adulto" | "kids"
  >("todos");
  const [filtroUnidade, setFiltroUnidade] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAluno, setSelectedAluno] = useState<AlunoGraduacao | null>(
    null
  );
  const [showGraduacaoModal, setShowGraduacaoModal] = useState(false);
  const [tipoGraduacao, setTipoGraduacao] = useState<"grau" | "faixa">("grau");

  // Verificar permissões
  const hasPerfil = (p: string) =>
    (user?.perfis || [])
      .map((x: string) => x.toLowerCase())
      .includes(p.toLowerCase());

  const podeGraduar =
    hasPerfil("master") ||
    hasPerfil("instrutor") ||
    hasPerfil("franqueado") ||
    hasPerfil("gerente_unidade");

  const faixasQuery = useQuery({
    queryKey: ["faixas-graduacao"],
    queryFn: () => listarFaixas(),
  });

  const proximosQuery = useQuery({
    queryKey: ["proximos-graduar", filtroCategoria, filtroUnidade],
    queryFn: () =>
      getProximosGraduar({
        categoria: filtroCategoria === "todos" ? undefined : filtroCategoria,
        unidadeId: filtroUnidade || undefined,
        pageSize: 50,
      }),
  });

  const historicoQuery = useQuery({
    queryKey: ["historico-graduacoes", filtroCategoria, filtroUnidade],
    queryFn: () =>
      getHistoricoGraduacoes({
        categoria: filtroCategoria === "todos" ? undefined : filtroCategoria,
        unidadeId: filtroUnidade || undefined,
        pageSize: 50,
      }),
    enabled: selectedTab === "historico",
  });

  const concederGrauMutation = useMutation({
    mutationFn: ({
      alunoId,
      observacao,
    }: {
      alunoId: string;
      observacao?: string;
    }) => concederGrau(alunoId, { observacao }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proximos-graduar"] });
      queryClient.invalidateQueries({ queryKey: ["historico-graduacoes"] });
      toast.success("Grau concedido com sucesso!", {
        duration: 3000,
      });
      setShowGraduacaoModal(false);
      setSelectedAluno(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao conceder grau");
    },
  });

  const graduarFaixaMutation = useMutation({
    mutationFn: ({
      alunoId,
      novaFaixaId,
      observacao,
    }: {
      alunoId: string;
      novaFaixaId: string;
      observacao?: string;
    }) => graduarFaixa(alunoId, { novaFaixaId, observacao }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proximos-graduar"] });
      queryClient.invalidateQueries({ queryKey: ["historico-graduacoes"] });
      toast.success("Graduação de faixa realizada com sucesso!", {
        duration: 3000,
      });
      setShowGraduacaoModal(false);
      setSelectedAluno(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao graduar faixa");
    },
  });

  const abrirModalGraduacao = (
    aluno: AlunoGraduacao,
    tipo: "grau" | "faixa"
  ) => {
    setSelectedAluno(aluno);
    setTipoGraduacao(tipo);
    setShowGraduacaoModal(true);
  };

  const executarGraduacao = (observacao?: string) => {
    if (!selectedAluno) return;

    if (tipoGraduacao === "grau") {
      concederGrauMutation.mutate({
        alunoId: selectedAluno.id,
        observacao,
      });
    } else {
      // Para graduação de faixa, precisamos encontrar a próxima faixa
      const faixas = faixasQuery.data || [];
      const faixaAtual = faixas.find(
        (f) => f.nome === selectedAluno.faixaAtual
      );
      const proximaFaixa = faixas.find(
        (f) =>
          f.categoria === selectedAluno.categoria &&
          f.ordem === (faixaAtual?.ordem || 0) + 1
      );

      if (proximaFaixa) {
        graduarFaixaMutation.mutate({
          alunoId: selectedAluno.id,
          novaFaixaId: proximaFaixa.id,
          observacao,
        });
      } else {
        toast.error("Não foi possível encontrar a próxima faixa");
      }
    }
  };

  const proximos = proximosQuery.data?.items || [];
  const historico = historicoQuery.data?.items || [];
  const faixas = faixasQuery.data || [];

  // Filtrar por busca
  const proximosFiltrados = proximos.filter((aluno: AlunoGraduacao) =>
    aluno.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estatísticas
  const stats = {
    totalProximos: proximos.length,
    prontosPraGrau: proximos.filter(
      (a: AlunoGraduacao) => a.podeGraduar && a.grauAtual < 4
    ).length,
    prontosPraFaixa: proximos.filter(
      (a: AlunoGraduacao) => a.podeGraduar && a.grauAtual >= 4
    ).length,
    categoriasAdulto: proximos.filter(
      (a: AlunoGraduacao) => a.categoria === "ADULTO"
    ).length,
    categoriasKids: proximos.filter(
      (a: AlunoGraduacao) => a.categoria === "INFANTIL"
    ).length,
    historicoMes: historico.filter((h: any) => {
      const dataGrad = new Date(h.dataGraduacao);
      const agora = new Date();
      return (
        dataGrad.getMonth() === agora.getMonth() &&
        dataGrad.getFullYear() === agora.getFullYear()
      );
    }).length,
  };

  const getFaixaCorClass = (cor: string) => {
    const cores: Record<string, string> = {
      branca: "bg-gray-100 text-gray-800 border-gray-300",
      azul: "bg-blue-100 text-blue-800 border-blue-300",
      roxa: "bg-purple-100 text-purple-800 border-purple-300",
      marrom: "bg-amber-100 text-amber-800 border-amber-300",
      preta: "bg-gray-900 text-white border-gray-700",
      coral: "bg-orange-100 text-orange-800 border-orange-300",
      amarela: "bg-yellow-100 text-yellow-800 border-yellow-300",
      laranja: "bg-orange-200 text-orange-900 border-orange-400",
      verde: "bg-green-100 text-green-800 border-green-300",
    };
    return (
      cores[cor.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-300"
    );
  };

  if (!podeGraduar) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Restrito
          </h1>
          <p className="text-gray-600">
            Você não tem permissão para gerenciar graduações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-3 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Sistema de Graduação
              </h1>
            </div>
            <button
              onClick={() => router.push("/admin/aprovacao-graduacao")}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Aprovação de Graduações</span>
              <span className="px-2 py-1 bg-white/20 rounded text-xs font-bold">
                NOVO
              </span>
            </button>
          </div>
          <p className="text-gray-600">
            Gerencie graduações, graus e acompanhe o progresso dos alunos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximos</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProximos}</div>
              <p className="text-xs text-muted-foreground">Para graduar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prontos (Grau)
              </CardTitle>
              <Star className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.prontosPraGrau}
              </div>
              <p className="text-xs text-muted-foreground">Novo grau</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prontos (Faixa)
              </CardTitle>
              <Award className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.prontosPraFaixa}
              </div>
              <p className="text-xs text-muted-foreground">Nova faixa</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Adultos</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.categoriasAdulto}
              </div>
              <p className="text-xs text-muted-foreground">Categoria adulto</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kids</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.categoriasKids}
              </div>
              <p className="text-xs text-muted-foreground">
                Categoria infantil
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {stats.historicoMes}
              </div>
              <p className="text-xs text-muted-foreground">Graduações</p>
            </CardContent>
          </Card>
        </div>

        {/* Card de Atalho para Aprovação */}
        <Card className="mb-6 border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Sistema de Aprovação de Graduações
                  </h3>
                  <p className="text-sm text-gray-600">
                    Aprove alunos aptos para a próxima faixa baseado nos
                    parâmetros configurados
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/admin/aprovacao-graduacao")}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all shadow-md hover:shadow-lg font-semibold"
              >
                Acessar Aprovações →
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setSelectedTab("proximos")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === "proximos"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Próximos a Graduar
            </button>
            <button
              onClick={() => setSelectedTab("historico")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === "historico"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Buscar aluno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                value={filtroCategoria}
                onChange={(e) =>
                  setFiltroCategoria(
                    e.target.value as "todos" | "adulto" | "kids"
                  )
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todas as categorias</option>
                <option value="adulto">Adulto</option>
                <option value="kids">Kids</option>
              </select>

              <input
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Filtrar por unidade..."
                value={filtroUnidade}
                onChange={(e) => setFiltroUnidade(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {selectedTab === "proximos" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Alunos Próximos à Graduação
              </CardTitle>
              <CardDescription>
                Alunos elegíveis para receber graus ou graduação de faixa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proximosFiltrados.map((aluno: AlunoGraduacao) => (
                  <div
                    key={aluno.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{aluno.nome}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-1 rounded-full text-xs border ${getFaixaCorClass(
                              aluno.faixaAtualCor
                            )}`}
                          >
                            {aluno.faixaAtual} {aluno.grauAtual}° grau
                          </span>
                          <span className="text-xs text-gray-500">
                            {aluno.categoria} • {aluno.unidadeNome}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {aluno.aulasRealizadas}/{aluno.aulasNecessarias} aulas
                          •{aluno.tempoNaFaixa} meses na faixa
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {aluno.podeGraduar && aluno.grauAtual < 4 && (
                        <button
                          onClick={() => abrirModalGraduacao(aluno, "grau")}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                        >
                          <Star className="h-4 w-4" />
                          Conceder Grau
                        </button>
                      )}

                      {aluno.podeGraduar && aluno.grauAtual >= 4 && (
                        <button
                          onClick={() => abrirModalGraduacao(aluno, "faixa")}
                          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                        >
                          <Award className="h-4 w-4" />
                          Graduar Faixa
                        </button>
                      )}

                      {!aluno.podeGraduar && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-3 py-2 rounded-lg">
                          Ainda não elegível
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {proximosFiltrados.length === 0 && (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Nenhum aluno encontrado para graduação
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTab === "historico" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Histórico de Graduações
              </CardTitle>
              <CardDescription>
                Registro de todas as graduações realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historico.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.nomeAluno}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-1 rounded-full text-xs border ${getFaixaCorClass(
                              item.faixaAnteriorCor
                            )}`}
                          >
                            {item.faixaAnterior}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs border ${getFaixaCorClass(
                              item.novaFaixaCor
                            )}`}
                          >
                            {item.novaFaixa}
                          </span>
                        </div>
                        {item.observacao && (
                          <p className="text-xs text-gray-600 mt-1">
                            {item.observacao}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {new Date(item.dataGraduacao).toLocaleDateString()}
                      </div>
                      {item.concedidoPor && (
                        <div className="text-xs text-gray-500">
                          Por: {item.concedidoPor}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {historico.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Nenhuma graduação registrada
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de Graduação */}
        {showGraduacaoModal && selectedAluno && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  {tipoGraduacao === "grau" ? (
                    <Star className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Award className="h-5 w-5 text-yellow-600" />
                  )}
                  {tipoGraduacao === "grau" ? "Conceder Grau" : "Graduar Faixa"}
                </h2>
                <p className="text-gray-600 mt-1">{selectedAluno.nome}</p>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Atual</p>
                      <span
                        className={`px-3 py-1 rounded-full text-sm border ${getFaixaCorClass(
                          selectedAluno.faixaAtualCor
                        )}`}
                      >
                        {selectedAluno.faixaAtual} {selectedAluno.grauAtual}°
                      </span>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Novo</p>
                      {tipoGraduacao === "grau" ? (
                        <span
                          className={`px-3 py-1 rounded-full text-sm border ${getFaixaCorClass(
                            selectedAluno.faixaAtualCor
                          )}`}
                        >
                          {selectedAluno.faixaAtual}{" "}
                          {selectedAluno.grauAtual + 1}°
                        </span>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-sm border ${getFaixaCorClass(
                            selectedAluno.proximaFaixaCor || "azul"
                          )}`}
                        >
                          {selectedAluno.proximaFaixa || "Próxima Faixa"} 1°
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observação (opcional)
                  </label>
                  <textarea
                    id="observacao"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Adicione uma observação sobre esta graduação..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowGraduacaoModal(false);
                    setSelectedAluno(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const textarea = document.getElementById(
                      "observacao"
                    ) as HTMLTextAreaElement;
                    executarGraduacao(textarea?.value || undefined);
                  }}
                  disabled={
                    concederGrauMutation.isPending ||
                    graduarFaixaMutation.isPending
                  }
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    tipoGraduacao === "grau"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-yellow-600 hover:bg-yellow-700"
                  }`}
                >
                  {(concederGrauMutation.isPending ||
                    graduarFaixaMutation.isPending) && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Confirmar {tipoGraduacao === "grau" ? "Grau" : "Graduação"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
