"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listUnidades, listAlunos, listUnidadeModalidades } from "@/lib/peopleApi";
import ModalidadeSelectorModal, { ModalidadeChip } from "@/components/dashboard/ModalidadeSelectorModal";
import { useModalidadeSelector } from "@/hooks/useModalidadeSelector";
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
  UserCheck,
  Clock,
  DollarSign,
  Mail,
  Settings,
  CheckCircle,
  Dumbbell,
} from "lucide-react";
import ConviteModal from "@/components/convites/ConviteModal";

export default function GerenteDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [conviteModalOpen, setConviteModalOpen] = useState(false);

  // Buscar a unidade do gerente
  const { data: unidadesData, isLoading: loadingUnidade } = useQuery({
    queryKey: ["unidade-gerente", user?.id],
    queryFn: async () => {
      // Backend já filtra pela unidade do gerente através das permissões
      const result = await listUnidades({ pageSize: 1 });
      return result;
    },
    enabled: !!user?.id,
    staleTime: 0, // Sempre buscar dados frescos
    refetchOnMount: true, // Recarregar ao montar componente
  });

  const unidade = unidadesData?.items?.[0];

  // Buscar modalidades da unidade do gerente
  const { data: vinculos = [] } = useQuery({
    queryKey: ["unidade-modalidades-gerente", unidade?.id],
    queryFn: () => listUnidadeModalidades({ unidade_id: unidade!.id }),
    enabled: !!unidade?.id,
    staleTime: 0,
  });
  const modalidadesUnidade = vinculos
    .filter((v: { ativa: boolean }) => v.ativa)
    .map((v: { modalidade?: { id: string; nome: string; cor?: string; icone?: string; tipo_graduacao?: string; exibe_graduacao?: boolean; ativo: boolean } }) => v.modalidade)
    .filter(Boolean) as { id: string; nome: string; cor?: string; icone?: string; tipo_graduacao?: string; exibe_graduacao?: boolean; ativo: boolean }[];

  const modalidadeSelector = useModalidadeSelector(user?.id, modalidadesUnidade);
  const isJiuJitsu = (nome: string) => /jiu.?jitsu/i.test(nome);
  const hasGraduacao = modalidadeSelector.selectedModalidade
    ? isJiuJitsu(modalidadeSelector.selectedModalidade.nome)
    : modalidadesUnidade.some((m) => isJiuJitsu(m.nome));
  const isJiuJitsuSelected = !!modalidadeSelector.selectedModalidade && isJiuJitsu(modalidadeSelector.selectedModalidade.nome);

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
    ocupacao:
      unidade?.capacidade_max_alunos && unidade.capacidade_max_alunos > 0
        ? Math.round((alunosAtivos / unidade.capacidade_max_alunos) * 100)
        : null,
    totalProfessores: unidade?.qtde_instrutores || 0,
    receitaMensal: unidade?.valor_plano_padrao
      ? alunos.reduce(
          (sum: number, aluno: { status?: string; ativo?: boolean }) => {
            if (aluno.status === "ATIVO" || aluno.ativo) {
              return sum + unidade.valor_plano_padrao;
            }
            return sum;
          },
          0
        )
      : 0,
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
      title: "Enviar Convite",
      description: "Link de cadastro para aluno",
      icon: Mail,
      action: () => setConviteModalOpen(true),
      color: "bg-blue-500",
    },
    {
      title: "TeamCruz Dashboard",
      description: "Ver estatísticas e visão geral",
      icon: BarChart3,
      action: () => router.push("/teamcruz"),
      color: "bg-red-600",
      show: isJiuJitsuSelected,
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
      description: "Ver e editar dados dos professores",
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
      title: "Aprovar Check-ins",
      description: "Aprovar check-ins do tablet",
      icon: UserCheck,
      action: () => router.push("/checkin/aprovacao"),
      color: "bg-purple-500",
    },
    {
      title: "Relatório de Presenças",
      description: "Ver relatório completo de presenças",
      icon: CheckCircle,
      action: () => router.push("/relatorio-presencas"),
      color: "bg-green-600",
    },
    // TODO: Implementar funcionalidade de registro de presença
    // {
    //   title: "Registrar Presença",
    //   description: "Marcar presença nas aulas",
    //   icon: CheckCircle,
    //   action: () => router.push("/presenca"),
    //   color: "bg-green-500",
    // },
    // {
    //   title: "Horários de Aulas",
    //   description: "Ver grade de horários",
    //   icon: Calendar,
    //   action: () => router.push("/horarios"),
    //   color: "bg-purple-500",
    // },
    {
      title: "Graduações",
      description: `${stats.graduacoesPendentes} pendentes de aprovação`,
      icon: GraduationCap,
      action: () => router.push("/admin/aprovacao-graduacao"),
      color: "bg-yellow-500",
      urgent: stats.graduacoesPendentes > 0,
      show: hasGraduacao,
    },
    {
      title: "Sistema Graduação",
      description: "Controle de faixas e graus",
      icon: Trophy,
      action: () => router.push("/admin/sistema-graduacao"),
      color: "bg-amber-500",
      show: hasGraduacao,
    },
    {
      title: "Configurar Graduação",
      description: "Regras de graduação da unidade",
      icon: Settings,
      action: () => router.push("/admin/configuracao-graduacao"),
      color: "bg-indigo-500",
      show: hasGraduacao,
    },
    {
      title: "Gestão Financeira",
      description: "Dashboard e contas da unidade",
      icon: DollarSign,
      action: () => router.push("/financeiro/dashboard"),
      color: "bg-emerald-500",
    },
    {
      title: "Modalidades",
      description: "Gerenciar modalidades esportivas",
      icon: Dumbbell,
      action: () => router.push("/modalidades"),
      color: "bg-purple-500",
    },
    // TODO: Implementar funcionalidade de relatórios
    // {
    //   title: "Relatórios",
    //   description: "Visualizar relatórios da unidade",
    //   icon: BarChart3,
    //   action: () => router.push("/relatorios"),
    //   color: "bg-indigo-500",
    // },
    {
      title: "Minha Unidade",
      description: "Ver dados da unidade",
      icon: Building2,
      action: () => router.push(`/unidades/${unidade.id}`),
      color: "bg-teal-500",
    },
  ];

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 40%, #ede9fe 100%)" }}>
      {/* Modal seletor de modalidade */}
      <ModalidadeSelectorModal
        open={modalidadeSelector.showSelector}
        modalidades={modalidadesUnidade}
        userName={user?.nome}
        allowAll={true}
        onSelect={modalidadeSelector.selectModalidade}
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-gray-600">
                  Bem-vindo, <span className="font-semibold">{user?.nome}</span>
                  !
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
            {/* Badge da Unidade */}
            <div className="flex items-center gap-2 bg-linear-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg">
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
          {modalidadesUnidade.length > 1 && (
            <div className="flex justify-center mt-5">
              <ModalidadeChip
                modalidade={modalidadeSelector.selectedModalidade}
                onClick={() => modalidadeSelector.setShowSelector(true)}
              />
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8 px-1">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium text-gray-700">{stats.alunosAtivos}</span>
            <span>aluno{stats.alunosAtivos !== 1 ? "s" : ""} ativo{stats.alunosAtivos !== 1 ? "s" : ""}</span>
            {stats.totalAlunos !== stats.alunosAtivos && (
              <span className="text-gray-400">({stats.totalAlunos} total)</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">  
            {stats.capacidadeMax > 0 && (
              <span className="text-gray-400">({stats.alunosAtivos}/{stats.capacidadeMax} vagas)</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium text-gray-700">{stats.aulasHoje}</span>
            <span>aula{stats.aulasHoje !== 1 ? "s" : ""} hoje</span>
          </div>          
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.filter((a) => a.show !== false).map((action, index) => (
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
              <Building2 className="h-5 w-5 text-blue-600" />
              Informações da Unidade
            </CardTitle>
            <CardDescription>Dados completos da sua unidade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Nome
                  </label>
                  <p className="font-semibold text-gray-900 text-lg mt-1">
                    {unidade.nome}
                  </p>
                </div>

                {unidade.cnpj && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">
                      CNPJ
                    </label>
                    <p className="font-medium text-gray-700 mt-1">
                      {unidade.cnpj}
                    </p>
                  </div>
                )}

                {unidade.razao_social && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">
                      Razão Social
                    </label>
                    <p className="font-medium text-gray-700 mt-1">
                      {unidade.razao_social}
                    </p>
                  </div>
                )}

                {unidade.nome_fantasia && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">
                      Nome Fantasia
                    </label>
                    <p className="font-medium text-gray-700 mt-1">
                      {unidade.nome_fantasia}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Status
                  </label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        unidade.status === "ATIVA"
                          ? "bg-green-100 text-green-700"
                          : unidade.status === "INATIVA"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {unidade.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              {unidade.endereco && (
                <div className="pt-6 border-t">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Endereço
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 mt-2">
                    <p className="text-gray-900 font-medium">
                      {unidade.endereco.logradouro &&
                        `${unidade.endereco.logradouro}`}
                      {unidade.endereco.numero &&
                        `, ${unidade.endereco.numero}`}
                      {unidade.endereco.complemento &&
                        ` - ${unidade.endereco.complemento}`}
                    </p>
                    <p className="text-gray-700 mt-1">
                      {unidade.endereco.bairro &&
                        `${unidade.endereco.bairro}, `}
                      {unidade.endereco.cidade && `${unidade.endereco.cidade}`}
                      {unidade.endereco.estado &&
                        ` - ${unidade.endereco.estado}`}
                    </p>
                    {unidade.endereco.cep && (
                      <p className="text-gray-600 text-sm mt-1">
                        CEP: {unidade.endereco.cep}
                      </p>
                    )}
                  </div>
                </div>
              )}
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

      {/* Modal de Convite */}
      <ConviteModal
        isOpen={conviteModalOpen}
        onClose={() => setConviteModalOpen(false)}
        unidadeId={unidade?.id}
      />
    </div>
  );
}
