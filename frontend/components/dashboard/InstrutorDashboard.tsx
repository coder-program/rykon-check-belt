"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  GraduationCap,
  Calendar,
  Trophy,
  TrendingUp,
  Clock,
  BookOpen,
  UserCheck,
  Star,
  Target,
  Building2,
  CheckCircle,
  Award,
  Mail,
} from "lucide-react";
import ConviteModal from "@/components/convites/ConviteModal";

interface InstrutorStats {
  meusAlunos: number;
  aulasSemana: number;
  graduacoesPendentes: number;
  novasInscricoes: number;
  presencaMedia: number;
  proximasAulas: number;
  alunosAtivos: number;
  avaliacoesPendentes: number;
}

interface ProximaAula {
  id: string;
  horario: string;
  tipo: string;
  alunos: number;
  local: string;
  data: Date;
}

interface AlunoDestaque {
  id: string;
  nome: string;
  faixa: string;
  presencas: number;
  proximaGraduacao: boolean;
  ultimaPresenca: Date;
}

export default function InstrutorDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [conviteModalOpen, setConviteModalOpen] = useState(false);

  // Buscar unidade do professor
  const { data: unidadeData } = useQuery({
    queryKey: ["unidade-professor", user?.id],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${user?.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Erro ao buscar unidade");
      const userData = await response.json();
      return userData.unidade;
    },
    enabled: !!user?.id,
  });

  // Buscar estatísticas do instrutor
  const { data: instrutorStats, isLoading: statsLoading } =
    useQuery<InstrutorStats>({
      queryKey: ["dashboard-instrutor-stats"],
      queryFn: async () => {
        const response = await fetch("/api/dashboard/instrutor/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Erro ao buscar estatísticas");
        return response.json();
      },
      enabled: !!token,
    });

  // Buscar próximas aulas
  const { data: proximasAulas, isLoading: aulasLoading } = useQuery<
    ProximaAula[]
  >({
    queryKey: ["dashboard-instrutor-proximas-aulas"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/instrutor/proximas-aulas", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Erro ao buscar próximas aulas");
      return response.json();
    },
    enabled: !!token,
  });

  // Buscar alunos em destaque
  const { data: alunosDestaque, isLoading: alunosLoading } = useQuery<
    AlunoDestaque[]
  >({
    queryKey: ["dashboard-instrutor-alunos-destaque"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/instrutor/alunos-destaque", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Erro ao buscar alunos em destaque");
      return response.json();
    },
    enabled: !!token,
  });

  // Dados padrão enquanto carrega
  const defaultStats: InstrutorStats = {
    meusAlunos: 0,
    aulasSemana: 0,
    graduacoesPendentes: 0,
    novasInscricoes: 0,
    presencaMedia: 0,
    proximasAulas: 0,
    alunosAtivos: 0,
    avaliacoesPendentes: 0,
  };

  const stats = instrutorStats || defaultStats;

  const quickActions = [
    {
      title: "Enviar Convite",
      description: "Link de cadastro para aluno",
      icon: Mail,
      action: () => setConviteModalOpen(true),
      color: "bg-blue-500",
    },
    {
      title: "Aprovar Check-ins",
      description: "Aprovar check-ins do tablet",
      icon: CheckCircle,
      action: () => router.push("/checkin/aprovacao"),
      color: "bg-purple-500",
    },
    {
      title: "Meus Alunos",
      description: "Gerenciar e avaliar alunos",
      icon: Users,
      action: () => router.push("/alunos"),
      color: "bg-blue-500",
    },
    {
      title: "Aprovar Graduações",
      description: "Pendentes de aprovação",
      icon: Award,
      action: () => router.push("/admin/aprovacao-graduacao"),
      color: "bg-yellow-500",
      urgent: true,
    },
    {
      title: "Sistema Graduação",
      description: "Controle de faixas e graus",
      icon: GraduationCap,
      action: () => router.push("/admin/sistema-graduacao"),
      color: "bg-green-500",
      urgent: true,
    },
    {
      title: "Gerenciar Aulas",
      description: "Criar e editar aulas/horários",
      icon: Calendar,
      action: () => router.push("/aulas"),
      color: "bg-indigo-500",
    },
    {
      title: "Horários",
      description: "Visualizar cronograma de aulas",
      icon: TrendingUp,
      action: () => router.push("/horarios"),
      color: "bg-purple-500",
    },
    {
      title: "Relatório de Presenças",
      description: "Visualizar histórico de presenças",
      icon: BookOpen,
      action: () => router.push("/relatorio-presencas"),
      color: "bg-teal-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Dashboard Instrutor
                </h1>
                <p className="text-gray-600">
                  Bem-vindo, Prof.{" "}
                  <span className="font-semibold">{user?.nome}</span>!
                </p>
              </div>
            </div>

            {/* Badge da Unidade - Destacado */}
            {unidadeData && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg shadow-lg">
                <Building2 className="h-5 w-5" />
                <div className="text-left">
                  <p className="text-xs font-medium opacity-90">Unidade</p>
                  <p className="text-lg font-bold">
                    {unidadeData?.nome || "Carregando..."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meus Alunos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats.meusAlunos}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "..." : stats.alunosAtivos} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Aulas/Semana
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats.aulasSemana}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "..." : stats.proximasAulas} hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Graduações</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {statsLoading ? "..." : stats.graduacoesPendentes}
              </div>
              <p className="text-xs text-muted-foreground">
                Avaliações pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Presença Média
              </CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? "..." : stats.presencaMedia}%
              </div>
              <p className="text-xs text-muted-foreground">Últimas 4 semanas</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className={`cursor-pointer hover:shadow-lg transition-all transform hover:scale-105 ${
                  action.urgent ? "ring-2 ring-yellow-400 bg-yellow-50" : ""
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
                Próximas Aulas Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aulasLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    Carregando próximas aulas...
                  </div>
                ) : proximasAulas && proximasAulas.length > 0 ? (
                  proximasAulas.map((aula, index) => (
                    <div
                      key={aula.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => router.push(`/aulas/${aula.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{aula.tipo}</div>
                          <div className="text-sm text-gray-600">
                            {aula.local}
                          </div>
                          <div className="text-xs text-gray-500">
                            {aula.alunos} alunos esperados
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-600">
                          {aula.horario}
                        </div>
                        <div className="text-xs text-gray-500">
                          {index === 0
                            ? "Próxima"
                            : index === 1
                            ? "Em seguida"
                            : "Última"}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma aula programada para hoje
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alunos em Destaque */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Alunos em Destaque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alunosLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    Carregando alunos em destaque...
                  </div>
                ) : alunosDestaque && alunosDestaque.length > 0 ? (
                  alunosDestaque.map((aluno) => (
                    <div
                      key={aluno.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => router.push(`/alunos/${aluno.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {aluno.nome}
                            {aluno.proximaGraduacao && (
                              <Target className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {aluno.faixa}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {aluno.presencas}
                        </div>
                        <div className="text-xs text-gray-500">presenças</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum aluno encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Mensal */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Novas Inscrições</span>
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  +{stats.novasInscricoes}
                </div>
                <div className="text-xs text-gray-600">Este mês</div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa Presença</span>
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  {stats.presencaMedia}%
                </div>
                <div className="text-xs text-gray-600">Média mensal</div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Graduações</span>
                  <Trophy className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-yellow-600 mt-2">
                  {stats.graduacoesPendentes}
                </div>
                <div className="text-xs text-gray-600">
                  Avaliações pendentes
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avaliações</span>
                  <Star className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600 mt-2">
                  {stats.avaliacoesPendentes}
                </div>
                <div className="text-xs text-gray-600">Pendentes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Convite */}
      <ConviteModal
        isOpen={conviteModalOpen}
        onClose={() => setConviteModalOpen(false)}
      />
    </div>
  );
}
