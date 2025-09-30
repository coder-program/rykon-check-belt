"use client";

import React from "react";
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
} from "lucide-react";

export default function InstrutorDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const instrutorStats = {
    meusAlunos: 48,
    aulasSemana: 12,
    graduacoesPendentes: 5,
    novasInscricoes: 3,
    presencaMedia: 78,
    proximasAulas: 3,
    alunosAtivos: 45,
    avaliacoesPendentes: 8,
  };

  const proximasAulas = [
    {
      horario: "18:00 - 19:30",
      tipo: "Jiu-Jitsu Gi Iniciantes",
      alunos: 12,
      local: "Tatame Principal",
    },
    {
      horario: "19:30 - 21:00",
      tipo: "Jiu-Jitsu NoGi Avançados",
      alunos: 18,
      local: "Tatame Principal",
    },
    {
      horario: "21:00 - 22:00",
      tipo: "Treino Livre",
      alunos: 8,
      local: "Tatame Secundário",
    },
  ];

  const alunosDestaque = [
    {
      nome: "Carlos Mendes",
      graduacao: "Faixa Branca 4° Grau",
      presenca: 95,
      evolucao: "Excelente",
      proximaGraduacao: true,
    },
    {
      nome: "Ana Silva",
      graduacao: "Faixa Azul 1° Grau",
      presenca: 88,
      evolucao: "Boa",
      proximaGraduacao: false,
    },
    {
      nome: "Pedro Santos",
      graduacao: "Faixa Branca 2° Grau",
      presenca: 92,
      evolucao: "Muito Boa",
      proximaGraduacao: false,
    },
  ];

  const quickActions = [
    {
      title: "Registrar Presença",
      description: "Fazer chamada da próxima aula",
      icon: UserCheck,
      action: () => router.push("/presenca/registrar"),
      color: "bg-green-500",
      urgent: true,
    },
    {
      title: "Meus Alunos",
      description: "Gerenciar e avaliar alunos",
      icon: Users,
      action: () => router.push("/meus-alunos"),
      color: "bg-blue-500",
    },
    {
      title: "Graduações",
      description: "5 avaliações pendentes",
      icon: GraduationCap,
      action: () => router.push("/graduacoes"),
      color: "bg-yellow-500",
      urgent: true,
    },
    {
      title: "Relatórios",
      description: "Progresso dos alunos",
      icon: TrendingUp,
      action: () => router.push("/relatorios"),
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Instrutor
            </h1>
          </div>
          <p className="text-gray-600">
            Bem-vindo, Prof. {user?.nome}! Gerencie suas turmas e alunos.
          </p>
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
                {instrutorStats.meusAlunos}
              </div>
              <p className="text-xs text-muted-foreground">
                {instrutorStats.alunosAtivos} ativos
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
                {instrutorStats.aulasSemana}
              </div>
              <p className="text-xs text-muted-foreground">
                {instrutorStats.proximasAulas} hoje
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
                {instrutorStats.graduacoesPendentes}
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
                {instrutorStats.presencaMedia}%
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
                {proximasAulas.map((aula, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => router.push(`/aulas/${index + 1}`)}
                  >
                    <div>
                      <div className="font-semibold">{aula.tipo}</div>
                      <div className="text-sm text-gray-600">{aula.local}</div>
                      <div className="text-xs text-gray-500">
                        {aula.alunos} alunos esperados
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
                ))}
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
                {alunosDestaque.map((aluno, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => router.push(`/alunos/${index + 1}`)}
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
                          {aluno.graduacao}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {aluno.presenca}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {aluno.evolucao}
                      </div>
                    </div>
                  </div>
                ))}
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
                  +{instrutorStats.novasInscricoes}
                </div>
                <div className="text-xs text-gray-600">Este mês</div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa Presença</span>
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  {instrutorStats.presencaMedia}%
                </div>
                <div className="text-xs text-gray-600">Média mensal</div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Graduações</span>
                  <Trophy className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-yellow-600 mt-2">7</div>
                <div className="text-xs text-gray-600">Aprovadas este mês</div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avaliações</span>
                  <Star className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600 mt-2">
                  {instrutorStats.avaliacoesPendentes}
                </div>
                <div className="text-xs text-gray-600">Pendentes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
