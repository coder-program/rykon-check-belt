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

interface AulaDisponivel {
  id: string;
  nome: string;
  professor: string;
  unidade: string;
  horarioInicio: string;
  horarioFim: string;
  data: string;
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

export default function AlunoDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Estados para dados reais
  const [statusGraduacao, setStatusGraduacao] =
    useState<StatusGraduacao | null>(null);
  const [estatisticasPresenca, setEstatisticasPresenca] =
    useState<EstatisticasPresenca | null>(null);
  const [proximasAulas, setProximasAulas] = useState<AulaDisponivel[]>([]);
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
      const [graduacaoData, presencaData, aulasData, historicoData] =
        await Promise.allSettled([
          // 1. Status de Graduação
          getStatusGraduacao(user.id),

          // 2. Estatísticas de Presença
          http("/presenca/minhas-estatisticas", { auth: true }),

          // 3. Próximas Aulas Disponíveis
          http("/presenca/aulas-disponiveis", { auth: true }),

          // 4. Histórico de Presença (últimas 5)
          http("/presenca/minha-historico?limit=5", { auth: true }),
        ]);

      // Processar resultados
      if (graduacaoData.status === "fulfilled") {
        console.log("🎓 Status de graduação recebido:", graduacaoData.value);
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
  const tempoNaGraduacao = "Calculando..."; // Propriedade não disponível na API
  const proximaGraduacao = statusGraduacao?.proximaFaixa || "A definir";
  const aulasMes = estatisticasPresenca?.aulasMes || 0;
  const presencaMensal = estatisticasPresenca?.presencaMensal || 0;
  const pontosGraduacao = statusGraduacao?.presencasNoCiclo || 0;
  const pontosNecessarios = statusGraduacao?.aulasPorGrau || 0;
  const ranking = null; // Propriedade não disponível na API

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
                    {statusGraduacao?.diasNaFaixa || 0} dias na faixa
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
                  <p className="text-sm text-blue-100">
                    {statusGraduacao?.faltamAulas || 0} aulas restantes
                  </p>
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
                      Na sua turma
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-gray-400">-</div>
                    <p className="text-xs text-muted-foreground">
                      Calculando...
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

          {/* Conquistas Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Conquistas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conquistas.map((conquista, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div
                      className={`p-2 rounded-lg bg-gray-100 ${conquista.color}`}
                    >
                      <conquista.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{conquista.titulo}</div>
                      <div className="text-sm text-gray-600">
                        {conquista.descricao}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {conquista.data}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
