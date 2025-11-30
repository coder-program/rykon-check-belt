"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  listUnidades,
  listAlunos,
  getMyFranqueado,
  listProfessores,
} from "@/lib/peopleApi";
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
  BarChart3,
  MapPin,
  Trophy,
  TrendingUp,
  AlertCircle,
  Loader2,
  UserCheck,
  CheckCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function FranqueadoDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [expandedUnidadeId, setExpandedUnidadeId] = useState<string | null>(
    null
  );

  // Função para mapear status da unidade para texto legível
  const getStatusText = (status: string) => {
    switch (status) {
      case "ATIVA":
        return "Ativa";
      case "INATIVA":
        return "Inativa";
      case "HOMOLOGACAO":
        return "Em Homologação";
      case "EM_HOMOLOGACAO":
        return "Em Homologação";
      default:
        return status;
    }
  };

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

  // Remover duplicatas baseado no ID da unidade
  const unidadesUnicas = unidades.filter(
    (unidade: any, index: number, arr: any[]) =>
      arr.findIndex((u: any) => u.id === unidade.id) === index
  );

  const unidadeIds = unidadesUnicas.map((u: any) => u.id);

  // Debug temporário para verificar os status das unidades
  console.log("🔍 Debug Unidades Originais:", unidades.length);
  console.log("🔍 Debug Unidades Únicas:", unidadesUnicas.length);
  console.log(
    "🔍 Debug Unidades:",
    unidadesUnicas.map((u: any) => ({
      nome: u.nome,
      status: u.status,
      id: u.id,
    }))
  );

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

  // Buscar professores das unidades do franqueado
  const { data: professoresData } = useQuery({
    queryKey: ["professores-franqueado", user?.id],
    queryFn: async () => {
      // Buscar TODOS os professores do franqueado (sem filtrar por unidade)
      // O backend já filtra automaticamente baseado no perfil do usuário logado
      const resultado = await listProfessores({ pageSize: 1000 });

      console.log(
        "🔍 [DASHBOARD] Total de professores recebidos da API:",
        resultado.items?.length || 0
      );
      console.log(
        "🔍 [DASHBOARD] Professores:",
        resultado.items?.map((p: any) => ({
          id: p.id,
          usuario_id: p.usuario_id,
          nome: p.nome,
        }))
      );

      return resultado;
    },
    enabled: !!user,
  });

  const professoresDasFranquias = professoresData?.items || [];

  // Função para contar alunos reais de uma unidade específica
  const getAlunosCountByUnidade = (unidadeId: string) => {
    return alunosDasFranquias.filter(
      (aluno: any) => aluno.unidade_id === unidadeId
    ).length;
  };

  // Função para contar professores reais de uma unidade específica
  const getProfessoresCountByUnidade = (unidadeId: string) => {
    return professoresDasFranquias.filter((prof: any) => {
      // Verificar se o professor está vinculado a esta unidade
      // O backend já filtra por unidade_id na query, mas garantimos aqui também
      return (
        prof.unidade_ids?.includes(unidadeId) || prof.unidade_id === unidadeId
      );
    }).length;
  };

  // Calcular estatísticas baseadas nos dados reais
  const stats = {
    minhasUnidades: unidadesUnicas.length,
    unidadesAtivas: unidadesUnicas.filter((u: any) => u.status === "ATIVA")
      .length,
    unidadesHomologacao: unidadesUnicas.filter(
      (u: any) => u.status === "HOMOLOGACAO" || u.status === "EM_HOMOLOGACAO"
    ).length,
    unidadesInativas: unidadesUnicas.filter((u: any) => u.status === "INATIVA")
      .length,
    totalAlunos: alunosDasFranquias.length,
    totalProfessores: professoresDasFranquias.length,
    receitaMensal: alunosDasFranquias.reduce((sum: number, aluno: any) => {
      // Buscar valor do plano da unidade do aluno
      const unidade = unidadesUnicas.find(
        (u: any) => u.id === aluno.unidade_id
      );
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Cadastro de Franqueado Incompleto
          </h2>
          <p className="text-gray-600 mb-4">
            Seu usuário possui o perfil de FRANQUEADO, mas seu cadastro ainda
            não foi completado ou sua franquia pode ter sido inativada.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  Para completar seu cadastro:
                </p>
                <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                  <li>Entre em contato com o administrador do sistema</li>
                  <li>
                    Solicite que ele edite seu usuário em "Gerenciar Usuários"
                  </li>
                  <li>Peça para marcar a opção "Cadastro Completo"</li>
                  <li>
                    Preencher os dados adicionais de franqueado (CPF, telefone,
                    etc)
                  </li>
                </ol>
              </div>
            </div>
          </div>
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
      action: () => router.push("/admin/gestao-unidades"),
      color: "bg-blue-500",
    },
    {
      title: "Gerenciar Usuários",
      description: "Gerenciar usuários do sistema",
      icon: UserCheck,
      action: () => router.push("/usuarios"),
      color: "bg-indigo-500",
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
      description: "Ver e editar alunos das unidades",
      icon: Users,
      action: () => router.push("/alunos"),
      color: "bg-green-500",
    },
    {
      title: "Aprovar Usuários",
      description: "Aprovar cadastros de usuários",
      icon: UserCheck,
      action: () => router.push("/admin/usuarios-pendentes"),
      color: "bg-orange-500",
    },
    {
      title: "Relatório de Presenças",
      description: "Ver relatório completo de presenças",
      icon: CheckCircle,
      action: () => router.push("/relatorio-presencas"),
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
      title: "Sistema Graduação",
      description: "Controle de faixas e graus",
      icon: Trophy,
      action: () => router.push("/admin/sistema-graduacao"),
      color: "bg-amber-500",
    },
    // TODO: Implementar funcionalidade de relatórios
    // {
    //   title: "Relatórios",
    //   description: "Visualizar relatórios das unidades",
    //   icon: BarChart3,
    //   action: () => router.push("/relatorios"),
    //   color: "bg-purple-500",
    // },
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
              <p className="text-xs text-muted-foreground">
                {stats.unidadesAtivas > 0 &&
                  `${stats.unidadesAtivas} ativa${
                    stats.unidadesAtivas !== 1 ? "s" : ""
                  }`}
                {stats.unidadesAtivas > 0 &&
                  (stats.unidadesHomologacao > 0 ||
                    stats.unidadesInativas > 0) &&
                  ", "}
                {stats.unidadesHomologacao > 0 &&
                  `${stats.unidadesHomologacao} em homologação`}
                {stats.unidadesHomologacao > 0 &&
                  stats.unidadesInativas > 0 &&
                  ", "}
                {stats.unidadesInativas > 0 &&
                  `${stats.unidadesInativas} inativa${
                    stats.unidadesInativas !== 1 ? "s" : ""
                  }`}
              </p>
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
              <p className="text-xs text-muted-foreground">ativos</p>
            </CardContent>
          </Card>

          {/* Receita Mensal - Comentado até implementar módulo financeiro */}
          {/* <Card>
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
          </Card> */}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Professores</CardTitle>
              <GraduationCap className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {stats.totalProfessores}
              </div>
              <p className="text-xs text-muted-foreground">ativos</p>
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
            {unidadesUnicas.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Nenhuma unidade cadastrada ainda
                </p>
                <button
                  onClick={() => router.push("/admin/gestao-unidades")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Cadastrar Primeira Unidade
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {unidadesUnicas.map((unidade: any) => {
                  const alunosCount = getAlunosCountByUnidade(unidade.id);
                  const professoresCount = getProfessoresCountByUnidade(
                    unidade.id
                  );

                  return (
                    <div key={unidade.id} className="border rounded-lg">
                      {/* Header clicável da unidade */}
                      <div
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() =>
                          setExpandedUnidadeId(
                            expandedUnidadeId === unidade.id ? null : unidade.id
                          )
                        }
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{unidade.nome}</h3>
                            <p className="text-sm text-gray-600">
                              {alunosCount} alunos • {professoresCount}{" "}
                              professores
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold text-green-600">
                              R${" "}
                              {(
                                unidade.valor_plano_padrao || 0
                              ).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {getStatusText(unidade.status)}
                            </div>
                          </div>
                          {expandedUnidadeId === unidade.id ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Detalhes expandidos da unidade */}
                      {expandedUnidadeId === unidade.id && (
                        <div className="p-4 bg-white border-t space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                CNPJ
                              </p>
                              <p className="text-sm text-gray-900">
                                {unidade.cnpj || "Não informado"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Telefone
                              </p>
                              <p className="text-sm text-gray-900">
                                {unidade.telefone_celular || "Não informado"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Email
                              </p>
                              <p className="text-sm text-gray-900">
                                {unidade.email || "Não informado"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Cidade
                              </p>
                              <p className="text-sm text-gray-900">
                                {unidade.cidade || "Não informado"}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/gestao-unidades`);
                              }}
                              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Ver Detalhes Completos
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                <div className="text-xs text-gray-600">Este mes</div>
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
