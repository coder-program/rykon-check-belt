"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GraduationCap,
  Calendar,
  Trophy,
  TrendingUp,
  Clock,
  Star,
  Target,
  Award,
} from "lucide-react";
import { getStatusGraduacao, StatusGraduacao } from "@/lib/graduacaoApi";
import { http } from "@/lib/api";

interface EstatisticasPresenca {
  presencaMensal: number;
  aulasMes: number;
  sequenciaAtual: number;
  ultimaPresenca: string | null;
}

interface RankingData {
  posicao: number | null;
  presencas: number;
  totalAlunos: number;
  mes: number;
  ano: number;
  ranking: Array<{
    posicao: number;
    nome: string;
    faixa: string;
    graus: number;
    presencas: number;
    isUsuarioAtual: boolean;
  }>;
}

interface AulaDisponivel {
  id: string;
  nome: string;
  professor: string;
  unidade: string;
  horarioInicio: string;
  horarioFim: string;
  data: string;
}

interface HistoricoCompeticao {
  id: string;
  competicao: {
    nome: string;
    tipo: string;
    data: string;
    local: string;
    cidade: string;
  };
  posicao: string;
  categoria_peso: string;
  categoria_faixa: string;
  medalha_emoji: string;
  total_lutas: number;
  vitorias: number;
  derrotas: number;
  aproveitamento: number;
}

interface EstatisticasCompeticoes {
  totalCompeticoes: number;
  totalOuros: number;
  totalPratas: number;
  totalBronzes: number;
  totalPodios: number;
  totalLutas: number;
  totalVitorias: number;
  totalDerrotas: number;
  aproveitamento: number;
}

// Interface para futura implementação
// interface HistoricoPresenca {
//   id: string;
//   data: string;
//   horario: string;
//   tipo: "entrada" | "saida";
//   aula: {
//     nome: string;
//     professor: string;
//   };
// }

// Helper para converter dias em anos e meses
function formatarTempoNaFaixa(dias: number): string {
  if (dias < 30) {
    return `${dias} dia${dias !== 1 ? "s" : ""}`;
  }

  const anos = Math.floor(dias / 365);
  const mesesRestantes = Math.floor((dias % 365) / 30);
  const diasRestantes = dias % 30;

  const partes: string[] = [];

  if (anos > 0) {
    partes.push(`${anos} ano${anos > 1 ? "s" : ""}`);
  }

  if (mesesRestantes > 0) {
    partes.push(`${mesesRestantes} mês${mesesRestantes > 1 ? "es" : ""}`);
  }

  // Opcional: incluir dias restantes se for menos de 1 mês desde o último mês completo
  if (diasRestantes > 0 && anos === 0 && mesesRestantes === 0) {
    partes.push(`${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`);
  }

  return partes.join(" e ");
}

export default function AlunoDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Estados para dados reais
  const [statusGraduacao, setStatusGraduacao] =
    useState<StatusGraduacao | null>(null);
  const [estatisticasPresenca, setEstatisticasPresenca] =
    useState<EstatisticasPresenca | null>(null);
  const [proximasAulas, setProximasAulas] = useState<AulaDisponivel[]>([]);
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [historicoCompeticoes, setHistoricoCompeticoes] = useState<
    HistoricoCompeticao[]
  >([]);
  const [estatisticasCompeticoes, setEstatisticasCompeticoes] =
    useState<EstatisticasCompeticoes | null>(null);
  // Histórico será implementado futuramente
  // const [historicoPresenca, setHistoricoPresenca] = useState<HistoricoPresenca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do aluno logado
  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Carregar dados em paralelo
      const [
        graduacaoData,
        presencaData,
        aulasData,
        rankingDataResult,
        competicoesData,
      ] = await Promise.allSettled([
        // 1. Status de Graduação
        getStatusGraduacao(user.id),

        // 2. Estatísticas de Presença
        http("/presenca/minhas-estatisticas", { auth: true }),

        // 3. Próximas Aulas Disponíveis
        http("/presenca/aulas-disponiveis", { auth: true }),

        // 4. Ranking da Unidade
        http("/presenca/ranking-unidade", { auth: true }),

        // 5. Histórico de Competições
        http("/competicoes/meu-historico", { auth: true }),
      ]);

      // Processar resultados
      if (graduacaoData.status === "fulfilled") {
        setStatusGraduacao(graduacaoData.value);
      } else {
        console.error(
          "❌ Erro ao carregar status de graduação:",
          graduacaoData.reason
        );
      }

      if (presencaData.status === "fulfilled") {
        setEstatisticasPresenca(presencaData.value);
      }

      if (aulasData.status === "fulfilled") {
        setProximasAulas(Array.isArray(aulasData.value) ? aulasData.value : []);
      }

      if (rankingDataResult.status === "fulfilled") {
        setRankingData(rankingDataResult.value);
      } else {
        console.error("❌ Erro ao carregar ranking:", rankingDataResult.reason);
      }

      if (competicoesData.status === "fulfilled") {
        const data = competicoesData.value;
        setHistoricoCompeticoes(
          Array.isArray(data.participacoes) ? data.participacoes : []
        );
        setEstatisticasCompeticoes(data.estatisticas || null);
      } else {
        console.error(
          "❌ Erro ao carregar competições:",
          competicoesData.reason
        );
      }

      // Histórico será implementado futuramente
      // if (historicoData.status === "fulfilled") {
      //   setHistoricoPresenca(Array.isArray(historicoData.value) ? historicoData.value : []);
      // }
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
      setError("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Dados calculados baseados nos dados reais
  const graduacaoAtual = statusGraduacao?.faixaAtual || "Carregando...";
  const proximaGraduacao = statusGraduacao?.proximaFaixa || "A definir";
  const aulasMes = estatisticasPresenca?.aulasMes || 0;
  const presencaMensal = estatisticasPresenca?.presencaMensal || 0;
  const pontosGraduacao = statusGraduacao?.presencasNoCiclo || 0;
  const pontosNecessarios = statusGraduacao?.aulasPorGrau || 0;
  const ranking = rankingData?.posicao || null;

  // Calcular progresso percentual
  const progressoPercentual = statusGraduacao?.progressoPercentual
    ? statusGraduacao.progressoPercentual * 100
    : 0;

  const proximasAulasFormatadas = proximasAulas.map((aula) => ({
    data: new Date(aula.data).toLocaleDateString("pt-BR"),
    horario: `${aula.horarioInicio} - ${aula.horarioFim}`,
    tipo: aula.nome,
    professor: aula.professor,
    local: aula.unidade,
  }));

  // Conquistas baseadas em dados reais
  const conquistas = [];

  // Adicionar conquista de assiduidade se tiver 100% de presença
  if (presencaMensal === 100) {
    conquistas.push({
      titulo: "Assiduidade Perfeita!",
      descricao: "100% de presença neste mês",
      data: new Date().toLocaleDateString("pt-BR"),
      icon: Star,
      color: "text-blue-600",
    });
  }

  // Adicionar conquista de sequência
  if ((estatisticasPresenca?.sequenciaAtual || 0) >= 10) {
    conquistas.push({
      titulo: "Sequência Impressionante!",
      descricao: `${estatisticasPresenca?.sequenciaAtual} aulas consecutivas`,
      data: new Date().toLocaleDateString("pt-BR"),
      icon: Target,
      color: "text-green-600",
    });
  }

  // Adicionar conquista de graduação próxima
  if (progressoPercentual >= 90) {
    conquistas.push({
      titulo: "Quase Lá!",
      descricao: `${Math.round(progressoPercentual)}% para próxima graduação`,
      data: new Date().toLocaleDateString("pt-BR"),
      icon: Trophy,
      color: "text-yellow-600",
    });
  }

  const quickActions = [
    {
      title: "Marcar Presença",
      description: "Check-in na aula de hoje",
      icon: Clock,
      action: () => router.push("/presenca"),
      color: "bg-green-500",
      urgent: true,
    },
    {
      title: "Meu Progresso",
      description: "Ver evolução e graduações",
      icon: TrendingUp,
      action: () => router.push("/meu-progresso"),
      color: "bg-blue-500",
    },
    {
      title: "Horários",
      description: "Ver grade de horários",
      icon: Calendar,
      action: () => router.push("/horarios"),
      color: "bg-purple-500",
    },
    {
      title: "Competições",
      description: "Inscreva-se em campeonatos",
      icon: Award,
      action: () => router.push("/competicoes"),
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Meu Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Bem-vindo, {user?.nome}! Acompanhe sua jornada no Jiu-Jitsu.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                Carregando dados do dashboard...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="text-red-600">{error}</div>
              <button
                onClick={loadDashboardData}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Tentar Novamente
              </button>
            </CardContent>
          </Card>
        )}

        {/* Graduação Atual */}
        {!loading && !error && (
          <Card className="mb-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Graduação Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-2xl font-bold">{graduacaoAtual}</h3>
                  <p className="text-blue-100">
                    {statusGraduacao?.grausAtual || 0} /{" "}
                    {statusGraduacao?.grausMax || 4} graus
                  </p>
                  <p className="text-xs text-blue-200">
                    {formatarTempoNaFaixa(statusGraduacao?.diasNaFaixa || 0)} na
                    faixa
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">
                    Progresso para próximo grau
                  </h4>
                  <div className="bg-white/20 rounded-full h-3 mb-2">
                    <div
                      className="bg-white rounded-full h-3 transition-all"
                      style={{
                        width: `${Math.min(progressoPercentual, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-100">
                    {pontosGraduacao} / {pontosNecessarios} presenças
                  </p>
                  <p className="text-xs text-blue-200">
                    Falta{statusGraduacao?.faltamAulas === 1 ? "" : "m"}{" "}
                    {statusGraduacao?.faltamAulas || 0} aula
                    {statusGraduacao?.faltamAulas === 1 ? "" : "s"} para o
                    próximo grau
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">Próxima Graduação</h4>
                  <p className="text-xl font-bold">{proximaGraduacao}</p>
                  {statusGraduacao && (
                    <>
                      <p className="text-sm text-blue-100 mt-1">
                        {statusGraduacao.grausAtual < statusGraduacao.grausMax
                          ? `${
                              statusGraduacao.grausMax -
                              statusGraduacao.grausAtual
                            } grau${
                              statusGraduacao.grausMax -
                                statusGraduacao.grausAtual >
                              1
                                ? "s"
                                : ""
                            } restante${
                              statusGraduacao.grausMax -
                                statusGraduacao.grausAtual >
                              1
                                ? "s"
                                : ""
                            }`
                          : "Graus completos ✓"}
                      </p>
                      <p className="text-xs text-blue-200">
                        {statusGraduacao.diasRestantes > 0
                          ? `Falta${
                              Math.ceil(statusGraduacao.diasRestantes / 30) > 1
                                ? "m"
                                : ""
                            } ${Math.ceil(
                              statusGraduacao.diasRestantes / 30
                            )} mês${
                              Math.ceil(statusGraduacao.diasRestantes / 30) !==
                              1
                                ? "es"
                                : ""
                            } para tempo mínimo`
                          : "Tempo mínimo atingido ✓"}
                      </p>
                      <p className="text-xs text-blue-200 mt-1">
                        Mínimo: {statusGraduacao.tempoMinimoAnos} ano
                        {statusGraduacao.tempoMinimoAnos > 1 ? "s" : ""} +{" "}
                        {statusGraduacao.grausMax} graus
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Aulas Este Mês
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aulasMes}</div>
                <p className="text-xs text-muted-foreground">
                  {aulasMes > 0 ? "Mantendo frequência" : "Nenhuma aula ainda"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Presença Mensal
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{presencaMensal}%</div>
                <p className="text-xs text-muted-foreground">
                  {presencaMensal >= 80
                    ? "Excelente frequência"
                    : presencaMensal >= 60
                    ? "Boa frequência"
                    : "Pode melhorar"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ranking Turma
                </CardTitle>
                <Trophy className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                {ranking ? (
                  <>
                    <div className="text-2xl font-bold text-yellow-600">
                      #{ranking}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rankingData?.presencas || 0} aula
                      {rankingData?.presencas === 1 ? "" : "s"} no mês
                    </p>
                    <p className="text-xs text-gray-400">
                      de {rankingData?.totalAlunos || 0} alunos
                    </p>
                  </>
                ) : loading ? (
                  <>
                    <div className="text-2xl font-bold text-gray-400">-</div>
                    <p className="text-xs text-muted-foreground">
                      Calculando...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-gray-400">-</div>
                    <p className="text-xs text-muted-foreground">
                      Sem presenças
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pontos Graduação
                </CardTitle>
                <Star className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {pontosGraduacao}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(progressoPercentual)}% para próxima
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className={`cursor-pointer hover:shadow-lg transition-all transform hover:scale-105 ${
                  action.urgent ? "ring-2 ring-green-400 bg-green-50" : ""
                }`}
                onClick={action.action}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${action.color} text-white`}
                      >
                        <action.icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm">{action.title}</span>
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Próximas Aulas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximas Aulas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proximasAulasFormatadas.length > 0 ? (
                  proximasAulasFormatadas.map((aula, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-semibold">{aula.tipo}</div>
                        <div className="text-sm text-gray-600">
                          {aula.professor}
                        </div>
                        <div className="text-xs text-gray-500">
                          {aula.local}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-600">
                          {aula.data}
                        </div>
                        <div className="text-sm text-gray-600">
                          {aula.horario}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma aula disponível no momento</p>
                    <p className="text-sm">
                      Verifique a programação na seção Horários
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Competições */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Histórico de Competições
              </CardTitle>
              <CardDescription>
                {estatisticasCompeticoes &&
                estatisticasCompeticoes.totalCompeticoes > 0
                  ? `${estatisticasCompeticoes.totalOuros} 🥇 | ${estatisticasCompeticoes.totalPratas} 🥈 | ${estatisticasCompeticoes.totalBronzes} 🥉 - ${estatisticasCompeticoes.aproveitamento}% de aproveitamento`
                  : "Suas participações em campeonatos"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {historicoCompeticoes.length > 0 ? (
                  historicoCompeticoes.slice(0, 5).map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <div className="text-4xl">{comp.medalha_emoji}</div>
                      <div className="flex-1">
                        <div className="font-semibold">
                          {comp.competicao.nome}
                        </div>
                        <div className="text-sm text-gray-600">
                          {comp.competicao.tipo} - {comp.categoria_peso} (
                          {comp.categoria_faixa})
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(comp.competicao.data).toLocaleDateString(
                            "pt-BR"
                          )}{" "}
                          • {comp.competicao.cidade}
                        </div>
                        {comp.total_lutas > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {comp.vitorias}V / {comp.derrotas}D -{" "}
                            {comp.aproveitamento}% de aproveitamento
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${
                            comp.posicao === "OURO"
                              ? "text-yellow-600"
                              : comp.posicao === "PRATA"
                              ? "text-gray-500"
                              : comp.posicao === "BRONZE"
                              ? "text-amber-700"
                              : "text-gray-400"
                          }`}
                        >
                          {comp.posicao}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma competição registrada</p>
                    <p className="text-sm mt-1">
                      Participe de campeonatos e registre seus resultados aqui
                    </p>
                    <button
                      onClick={() => router.push("/competicoes")}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Ver Competições Disponíveis
                    </button>
                  </div>
                )}
                {historicoCompeticoes.length > 5 && (
                  <button
                    onClick={() => router.push("/meu-historico-competicoes")}
                    className="w-full mt-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Ver todas ({historicoCompeticoes.length} competições)
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ranking Completo - Top 10 */}
        {rankingData && rankingData.ranking.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Top 10 - Ranking de Frequência ({rankingData.mes}/
                {rankingData.ano})
              </CardTitle>
              <CardDescription>
                Os alunos mais frequentes da sua unidade este mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rankingData.ranking.map((item) => (
                  <div
                    key={item.posicao}
                    className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                      item.isUsuarioAtual
                        ? "bg-yellow-50 border-2 border-yellow-300 shadow-md"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                          item.posicao === 1
                            ? "bg-yellow-400 text-yellow-900"
                            : item.posicao === 2
                            ? "bg-gray-300 text-gray-700"
                            : item.posicao === 3
                            ? "bg-amber-600 text-white"
                            : item.isUsuarioAtual
                            ? "bg-yellow-200 text-yellow-800"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {item.posicao === 1 && "🥇"}
                        {item.posicao === 2 && "🥈"}
                        {item.posicao === 3 && "🥉"}
                        {item.posicao > 3 && `#${item.posicao}`}
                      </div>
                      <div>
                        <div
                          className={`font-semibold ${
                            item.isUsuarioAtual ? "text-yellow-800" : ""
                          }`}
                        >
                          {item.nome} {item.isUsuarioAtual && "(Você)"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.faixa}{" "}
                          {item.graus > 0 &&
                            `- ${item.graus} grau${item.graus > 1 ? "s" : ""}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {item.presencas}
                      </div>
                      <div className="text-xs text-gray-500">
                        aula{item.presencas === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {rankingData.totalAlunos > 10 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  Mostrando top 10 de {rankingData.totalAlunos} alunos ativos
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
