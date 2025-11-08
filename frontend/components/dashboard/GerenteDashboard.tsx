"use client";

import React from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listUnidades, listAlunos } from "@/lib/peopleApi";
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
  GraduationCap,
  Calendar,
  BarChart3,
  Trophy,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle,
  UserCheck,
  Clock,
} from "lucide-react";

export default function GerenteDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Buscar a unidade do gerente
  const { data: unidadesData, isLoading: loadingUnidade } = useQuery({
    queryKey: ["unidade-gerente", user?.id],
    queryFn: async () => {
      // Backend já filtra pela unidade do gerente através das permissões
      const result = await listUnidades({ pageSize: 1 });
      return result;
    },
    enabled: !!user?.id,
  });

  const unidade = unidadesData?.items?.[0];

  // Buscar alunos da unidade
  const { data: alunosData, isLoading: loadingAlunos } = useQuery({
    queryKey: ["alunos-unidade", unidade?.id],
    queryFn: async () => {
      if (!unidade?.id) return { items: [] };
      const result = await listAlunos({
        pageSize: 1000,
        unidade_id: unidade.id,
      });
      return result;
    },
    enabled: !!unidade?.id,
  });

  // Buscar aulas de hoje
  const { data: aulasHoje } = useQuery({
    queryKey: ["aulas-hoje", unidade?.id],
    queryFn: async () => {
      if (!unidade?.id) return { count: 0 };
      const token = localStorage.getItem("token");
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const response = await fetch(
        `${apiUrl}/aulas/hoje?unidade_id=${unidade.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) return { count: 0 };
      return response.json();
    },
    enabled: !!unidade?.id,
  });

  const alunos = alunosData?.items || [];

  // Calcular estatísticas baseadas nos dados reais
  const alunosAtivos = alunos.filter(
    (a: { status?: string; ativo?: boolean }) => a.status === "ATIVO" || a.ativo
  ).length;

  const stats = {
    totalAlunos: alunos.length,
    alunosAtivos,
    alunosInativos: alunos.length - alunosAtivos,
    capacidadeMax: unidade?.capacidade_max_alunos || 0,
    ocupacao: unidade?.capacidade_max_alunos
      ? Math.round((alunosAtivos / unidade.capacidade_max_alunos) * 100)
      : 0,
    totalProfessores: unidade?.qtde_instrutores || 0,
    receitaMensal: alunos.reduce(
      (sum: number, aluno: { status?: string; ativo?: boolean }) => {
        if (aluno.status === "ATIVO" || aluno.ativo) {
          return sum + (unidade?.valor_plano_padrao || 350);
        }
        return sum;
      },
      0
    ),
    graduacoesPendentes: 0, // TODO: Implementar API de graduações pendentes
    aulasHoje: aulasHoje?.count || 0, // ✅ Buscar do banco
  };

  const isLoading = loadingUnidade || loadingAlunos;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!unidade) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Unidade não encontrada
          </h2>
          <p className="text-gray-600 mb-4">
            Seu usuário não está vinculado a nenhuma unidade.
          </p>
          <p className="text-sm text-gray-500">
            Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "TeamCruz Dashboard",
      description: "Ver estatísticas e visão geral",
      icon: BarChart3,
      action: () => router.push("/teamcruz"),
      color: "bg-red-600",
    },
    {
      title: "Gerenciar Usuários",
      description: "Gerenciar usuários do sistema",
      icon: UserCheck,
      action: () => router.push("/usuarios"),
      color: "bg-pink-500",
    },
    {
      title: "Gerenciar Professor",
      description: "Adicionar novo professor/instrutor",
      icon: GraduationCap,
      action: () => router.push("/professores"),
      color: "bg-teal-500",
    },
    {
      title: "Gerenciar Aulas",
      description: "Criar e editar aulas/horários",
      icon: Calendar,
      action: () => router.push("/aulas"),
      color: "bg-indigo-500",
    },
    {
      title: "Gerenciar Alunos",
      description: "Ver e editar alunos da unidade",
      icon: Users,
      action: () => router.push("/alunos"),
      color: "bg-blue-500",
    },

    {
      title: "Aprovar Alunos",
      description: "Aprovar cadastros de alunos",
      icon: UserCheck,
      action: () => router.push("/admin/usuarios-pendentes"),
      color: "bg-orange-500",
    },
    {
      title: "Registrar Presença",
      description: "Marcar presença nas aulas",
      icon: CheckCircle,
      action: () => router.push("/presenca"),
      color: "bg-green-500",
    },
    {
      title: "Horários de Aulas",
      description: "Ver grade de horários",
      icon: Calendar,
      action: () => router.push("/horarios"),
      color: "bg-purple-500",
    },
    {
      title: "Graduações",
      description: `${stats.graduacoesPendentes} pendentes de aprovação`,
      icon: GraduationCap,
      action: () => router.push("/admin/aprovacao-graduacao"),
      color: "bg-yellow-500",
      urgent: stats.graduacoesPendentes > 0,
    },
    {
      title: "Relatórios",
      description: "Visualizar relatórios da unidade",
      icon: BarChart3,
      action: () => router.push("/relatorios"),
      color: "bg-indigo-500",
    },
    {
      title: "Minha Unidade",
      description: "Ver dados da unidade",
      icon: Building2,
      action: () => router.push(`/unidades/${unidade.id}`),
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
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Dashboard Gerente
                </h1>
                <p className="text-gray-600">
                  Bem-vindo, <span className="font-semibold">{user?.nome}</span>
                  !
                </p>
              </div>
            </div>

            {/* Badge da Unidade - Destacado */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg">
              <Building2 className="h-5 w-5" />
              <div className="text-left">
                <p className="text-xs font-medium opacity-90">Unidade</p>
                <p className="text-lg font-bold">
                  {unidade?.nome || "Carregando..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Alunos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlunos}</div>
              <p className="text-xs text-muted-foreground">
                {stats.alunosAtivos} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ocupação</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.ocupacao}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.alunosAtivos} de {stats.capacidadeMax} vagas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Receita Mensal
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {stats.receitaMensal.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Plano padrão: R$ {unidade.valor_plano_padrao?.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aulas Hoje</CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.aulasHoje}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalProfessores} professores
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    {action.urgent && (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Informações da Unidade */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Unidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">
                  Dados Gerais
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nome:</span>
                    <span className="font-medium">{unidade.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CNPJ:</span>
                    <span className="font-medium">{unidade.cnpj}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        unidade.status === "ATIVA"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {unidade.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Responsável:</span>
                    <span className="font-medium">
                      {unidade.responsavel_nome}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-4">Estrutura</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tatames:</span>
                    <span className="font-medium">
                      {unidade.qtde_tatames || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacidade:</span>
                    <span className="font-medium">
                      {unidade.capacidade_max_alunos || "-"} alunos
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Área do Tatame:</span>
                    <span className="font-medium">
                      {unidade.area_tatame_m2
                        ? `${unidade.area_tatame_m2} m²`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Instrutores:</span>
                    <span className="font-medium">
                      {stats.totalProfessores}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Indicadores de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Alunos Ativos</span>
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  {stats.alunosAtivos}
                </div>
                <div className="text-xs text-gray-600">
                  {stats.alunosInativos} inativos
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa de Ocupação</span>
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  {stats.ocupacao}%
                </div>
                <div className="text-xs text-gray-600">
                  {stats.capacidadeMax - stats.alunosAtivos} vagas disponíveis
                </div>
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
                  Pendentes de aprovação
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
