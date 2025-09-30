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
  GraduationCap,
  Calendar,
  Trophy,
  TrendingUp,
  Clock,
  Star,
  Target,
  Award,
} from "lucide-react";

export default function AlunoDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const alunoStats = {
    graduacaoAtual: "Faixa Azul 2° Grau",
    tempoNaGraduacao: "8 meses",
    proximaGraduacao: "Faixa Azul 3° Grau",
    aulasMes: 12,
    presencaMensal: 85,
    pontosGraduacao: 180,
    pontosNecessarios: 250,
    ranking: 15,
  };

  const proximasAulas = [
    {
      data: "Hoje",
      horario: "19:00 - 20:30",
      tipo: "Jiu-Jitsu Gi",
      professor: "Prof. Carlos Silva",
      local: "TeamCruz Vila Madalena",
    },
    {
      data: "Amanhã",
      horario: "18:00 - 19:30",
      tipo: "Jiu-Jitsu NoGi",
      professor: "Prof. Ana Santos",
      local: "TeamCruz Vila Madalena",
    },
    {
      data: "Sexta",
      horario: "19:00 - 20:30",
      tipo: "Jiu-Jitsu Gi",
      professor: "Prof. Roberto Lima",
      local: "TeamCruz Vila Madalena",
    },
  ];

  const conquistas = [
    {
      titulo: "Primeira Vitória",
      descricao: "Ganhou sua primeira luta em campeonato",
      data: "15/11/2024",
      icon: Trophy,
      color: "text-yellow-600",
    },
    {
      titulo: "Assiduidade",
      descricao: "100% de presença em outubro",
      data: "01/11/2024",
      icon: Star,
      color: "text-blue-600",
    },
    {
      titulo: "Evolução Técnica",
      descricao: "Dominou a guarda fechada",
      data: "28/10/2024",
      icon: Target,
      color: "text-green-600",
    },
  ];

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

  const progressoPercentual =
    (alunoStats.pontosGraduacao / alunoStats.pontosNecessarios) * 100;

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

        {/* Graduação Atual */}
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
                <h3 className="text-2xl font-bold">
                  {alunoStats.graduacaoAtual}
                </h3>
                <p className="text-blue-100">
                  Há {alunoStats.tempoNaGraduacao}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">
                  Progresso para próxima graduação
                </h4>
                <div className="bg-white/20 rounded-full h-3 mb-2">
                  <div
                    className="bg-white rounded-full h-3 transition-all"
                    style={{ width: `${progressoPercentual}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-100">
                  {alunoStats.pontosGraduacao} / {alunoStats.pontosNecessarios}{" "}
                  pontos
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Próxima Graduação</h4>
                <p className="text-xl font-bold">
                  {alunoStats.proximaGraduacao}
                </p>
                <p className="text-sm text-blue-100">
                  {alunoStats.pontosNecessarios - alunoStats.pontosGraduacao}{" "}
                  pontos restantes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Aulas Este Mês
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alunoStats.aulasMes}</div>
              <p className="text-xs text-muted-foreground">
                +3 vs mês anterior
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
              <div className="text-2xl font-bold">
                {alunoStats.presencaMensal}%
              </div>
              <p className="text-xs text-muted-foreground">
                Excelente frequência
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
              <div className="text-2xl font-bold text-yellow-600">
                #{alunoStats.ranking}
              </div>
              <p className="text-xs text-muted-foreground">Entre 45 alunos</p>
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
                {alunoStats.pontosGraduacao}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(progressoPercentual)}% para próxima
              </p>
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
                {proximasAulas.map((aula, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-semibold">{aula.tipo}</div>
                      <div className="text-sm text-gray-600">
                        {aula.professor}
                      </div>
                      <div className="text-xs text-gray-500">{aula.local}</div>
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
                ))}
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
