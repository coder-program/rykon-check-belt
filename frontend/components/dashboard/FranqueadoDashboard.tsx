"use client";

import React from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listUnidades, listAlunos, getMyFranqueado } from "@/lib/peopleApi";
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
  DollarSign,
  BarChart3,
  MapPin,
  Trophy,
  TrendingUp,
  AlertCircle,
  Loader2,
  UserCheck,
  CheckCircle,
} from "lucide-react";

export default function FranqueadoDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Buscar franqueado do usuário logado
  const { data: franqueado, isLoading: loadingFranqueado } = useQuery({
    queryKey: ["franqueado-me", user?.id],
    queryFn: getMyFranqueado,
    enabled: !!user?.id,
  });

  // Buscar unidades do franqueado
  const { data: unidadesData, isLoading: loadingUnidades } = useQuery({
    queryKey: ["unidades-franqueado", franqueado?.id],
    queryFn: async () => {
      if (!franqueado?.id) return { items: [] };
      const result = await listUnidades({
        pageSize: 100,
        franqueado_id: franqueado.id,
      });
      return result;
    },
    enabled: !!franqueado?.id,
  });

  const unidades = unidadesData?.items || [];
  const unidadeIds = unidades.map((u: any) => u.id);

  // Buscar alunos das unidades do franqueado
  const { data: alunosData } = useQuery({
    queryKey: ["alunos-franqueado", unidadeIds],
    queryFn: async () => {
      if (unidadeIds.length === 0) return { items: [] };

      // Buscar alunos de cada unidade e combinar
      const alunosPorUnidade = await Promise.all(
        unidadeIds.map((unidadeId: string) =>
          listAlunos({ pageSize: 1000, unidade_id: unidadeId })
        )
      );

      // Combinar todos os alunos
      const todosAlunos = alunosPorUnidade.flatMap((result) => result.items);

      return { items: todosAlunos };
    },
    enabled: unidadeIds.length > 0,
  });

  const alunosDasFranquias = alunosData?.items || [];

  // Calcular estatísticas baseadas nos dados reais
  const stats = {
    minhasUnidades: unidades.length,
    totalAlunos: alunosDasFranquias.length,
    totalProfessores: unidades.reduce(
      (sum: number, u: any) => sum + (u.qtde_instrutores || 0),
      0
    ),
    receitaMensal: alunosDasFranquias.reduce((sum: number, aluno: any) => {
      // Buscar valor do plano da unidade do aluno
      const unidade = unidades.find((u: any) => u.id === aluno.unidade_id);
      const valorPlano = unidade?.valor_plano_padrao || 350; // Default 350 se não tiver
      return sum + valorPlano;
    }, 0),
    alunosAtivos: alunosDasFranquias.filter(
      (a: any) => a.status === "ATIVO" || a.ativo
    ).length,
  };

  // Calcular Performance Mensal com dados reais
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // Novos alunos este mês
  const novosAlunosEsteMes = alunosDasFranquias.filter((aluno: any) => {
    if (!aluno.created_at) return false;
    const dataMatricula = new Date(aluno.created_at);
    return (
      dataMatricula.getMonth() === mesAtual &&
      dataMatricula.getFullYear() === anoAtual
    );
  }).length;

  // Alunos que saíram este mês (inativos ou cancelados recentemente)
  const alunosSairamEsteMes = alunosDasFranquias.filter((aluno: any) => {
    if (!aluno.updated_at) return false;
    const dataUpdate = new Date(aluno.updated_at);
    const mesmoMes =
      dataUpdate.getMonth() === mesAtual &&
      dataUpdate.getFullYear() === anoAtual;
    const inativo = aluno.status === "INATIVO" || aluno.ativo === false;
    return mesmoMes && inativo;
  }).length;

  // Taxa de retenção (últimos 6 meses)
  const seiseMesesAtras = new Date();
  seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);

  const alunosUltimos6Meses = alunosDasFranquias.filter((aluno: any) => {
    if (!aluno.created_at) return false;
    const dataMatricula = new Date(aluno.created_at);
    return dataMatricula >= seiseMesesAtras;
  });

  const alunosAtivosUltimos6Meses = alunosUltimos6Meses.filter(
    (a: any) => a.status === "ATIVO" || a.ativo
  );

  const taxaRetencao =
    alunosUltimos6Meses.length > 0
      ? Math.round(
          (alunosAtivosUltimos6Meses.length / alunosUltimos6Meses.length) * 100
        )
      : 0;

  // Graduações este trimestre (últimos 3 meses)
  const tresMesesAtras = new Date();
  tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

  const graduacoesEsteTrimestre = alunosDasFranquias.filter((aluno: any) => {
    if (!aluno.graduacao_atual || !aluno.updated_at) return false;
    const dataUpdate = new Date(aluno.updated_at);
    // Considera que se a faixa mudou nos últimos 3 meses, houve graduação
    return dataUpdate >= tresMesesAtras && aluno.graduacao_atual;
  }).length;

  const isLoading = loadingFranqueado || loadingUnidades;

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

  if (!franqueado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Franqueado não encontrado
          </h2>
          <p className="text-gray-600 mb-4">
            Seu usuário não está vinculado a nenhum franqueado.
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
      title: "Gerenciar Unidades",
      description: "Administrar suas academias",
      icon: Building2,
      action: () => router.push("/unidades"),
      color: "bg-blue-500",
    },
    {
      title: "Gerenciar Alunos",
      description: "Ver e editar alunos das unidades",
      icon: Users,
      action: () => router.push("/alunos"),
      color: "bg-green-500",
    },
    {
      title: "Cadastrar Professor",
      description: "Adicionar novo professor/instrutor",
      icon: GraduationCap,
      action: () => router.push("/professores"),
      color: "bg-teal-500",
    },
    {
      title: "Cadastrar Gerente",
      description: "Adicionar gerente ou recepcionista",
      icon: UserCheck,
      action: () => router.push("/admin/cadastrar-usuario"),
      color: "bg-indigo-500",
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
      color: "bg-green-600",
    },
    {
      title: "Graduações",
      description: `${graduacoesEsteTrimestre} graduações neste trimestre`,
      icon: Trophy,
      action: () => router.push("/admin/aprovacao-graduacao"),
      color: "bg-yellow-500",
      urgent: graduacoesEsteTrimestre > 0,
    },
    {
      title: "Relatórios",
      description: "Visualizar relatórios das unidades",
      icon: BarChart3,
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
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Franqueado
            </h1>
          </div>
          <p className="text-gray-600">
            Bem-vindo, {user?.nome}! Gerencie suas unidades TeamCruz.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Minhas Unidades
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.minhasUnidades}</div>
              <p className="text-xs text-muted-foreground">Todas ativas</p>
            </CardContent>
          </Card>

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
              <CardTitle className="text-sm font-medium">
                Receita Mensal
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {stats.receitaMensal.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Baseado nos valores dos planos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Professores</CardTitle>
              <GraduationCap className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {stats.totalProfessores}
              </div>
              <p className="text-xs text-muted-foreground">
                Em todas as unidades
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
                className={`cursor-pointer hover:shadow-lg transform hover:scale-105 transition-all ${
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

        {/* Minhas Unidades */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Minhas Unidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unidades.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Nenhuma unidade cadastrada ainda
                </p>
                <button
                  onClick={() => router.push("/unidades")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Cadastrar Primeira Unidade
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {unidades.map((unidade: any) => (
                  <div
                    key={unidade.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => router.push("/unidades")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{unidade.nome}</h3>
                        <p className="text-sm text-gray-600">
                          {unidade.capacidade_max_alunos || 0} alunos •{" "}
                          {unidade.qtde_instrutores || 0} professores
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        R$ {(unidade.valor_plano_padrao || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {unidade.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Novos Alunos</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  +{novosAlunosEsteMes}
                </div>
                <div className="text-xs text-gray-600">Este mês</div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa Retenção</span>
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  {taxaRetencao}%
                </div>
                <div className="text-xs text-gray-600">Últimos 6 meses</div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Graduações</span>
                  <Trophy className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600 mt-2">
                  {graduacoesEsteTrimestre}
                </div>
                <div className="text-xs text-gray-600">Este trimestre</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
