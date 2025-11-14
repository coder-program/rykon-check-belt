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
  Crown,
  Users,
  Building2,
  UserCheck,
  Shield,
  Database,
  Activity,
  TrendingUp,
  Trophy,
  Clock,
  MapPin,
} from "lucide-react";

interface DashboardStats {
  totalUsuarios: number;
  usuariosEsteMes: number;
  usuariosPendentes: number;
  totalFranqueados: number;
  totalUnidades: number;
  totalAlunos: number;
  alunosEsteMes: number;
  crescimentoAlunos: number;
  totalProfessores: number;
}

export default function MasterDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsuarios: 0,
    usuariosEsteMes: 0,
    usuariosPendentes: 0,
    totalFranqueados: 0,
    totalUnidades: 0,
    totalAlunos: 0,
    alunosEsteMes: 0,
    crescimentoAlunos: 0,
    totalProfessores: 0,
  });
  const [loading, setLoading] = useState(true);

  // Carregar estatísticas do dashboard
  useEffect(() => {
    const loadStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/dashboard/stats`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const quickActions = [
    {
      title: "Gerenciar Usuários",
      description: "CRUD completo de usuários, perfis e permissões",
      icon: Users,
      action: () => router.push("/usuarios"),
      color: "bg-green-500",
      badge: "Ativo",
    },
    {
      title: "Aprovar Usuários e Alunos",
      description: `usuários aguardando aprovação`,
      icon: UserCheck,
      action: () => router.push("/admin/usuarios-pendentes"),
      color: "bg-green-500",
      badge: "Master",
      urgent: stats.usuariosPendentes > 0,
    },
    {
      title: "Gestão de Alunos",
      description:
        "Gestão completa de alunos da TeamCruz com controle de graduações",
      icon: Users,
      action: () => router.push("/alunos"),
      color: "bg-blue-500",
      badge: "Ativo",
    },
    /* {
      title: "Aprovação de Alunos",
      description: "Aprovar cadastros de ALUNOS de Jiu-Jitsu (estudantes)",
      icon: UserCheck,
      action: () => router.push("/aprovacao-alunos"),
      color: "bg-yellow-500",
      badge: "🥋 Alunos",
    }, */
    {
      title: "Gestão de Professores",
      description:
        "Cadastro e gestão dos instrutores e professores da academia",
      icon: Users,
      action: () => router.push("/professores"),
      color: "bg-purple-500",
      badge: "Novo!",
    },
    /* {
      title: "Meus Alunos",
      description:
        "Visualização personalizada dos alunos sob sua responsabilidade",
      icon: Users,
      action: () => router.push("/meus-alunos"),
      color: "bg-cyan-500",
      badge: "Personalizado",
    } */ {
      title: "TeamCruz Jiu-Jitsu",
      description: "Sistema completo de controle de presença e graduação",
      icon: Trophy,
      action: () => router.push("/teamcruz"),
      color: "bg-red-500",
      badge: "Sistema",
    },
    /* {
      title: "Franqueados",
      description: "Gestão de franquias e contratos de franqueados",
      on: Building2,
      action: () => router.push("/franqueados"),
      color: "bg-indigo-500",
      badge: "Master",
    }, */
    {
      title: "Gestão Franqueados",
      description: "Associar franqueados e unidades",
      icon: Building2,
      action: () => router.push("/admin/gestao-franqueados"),
      color: "bg-purple-500",
      badge: "Admin",
    },
    /* {
      title: "Unidades",
      description: "Cadastro e administração de todas as unidades",
      icon: MapPin,
      action: () => router.push("/unidades"),
      color: "bg-teal-500",
      badge: "Restrito",
    }, */
    {
      title: "Gestão Unidades",
      description: "Vincular professores às unidades",
      icon: MapPin,
      action: () => router.push("/admin/gestao-unidades"),
      color: "bg-indigo-500",
      badge: "Admin",
    },
    {
      title: "Sistema Graduação",
      description: "Controle de faixas e graus",
      icon: Trophy,
      action: () => router.push("/admin/sistema-graduacao"),
      color: "bg-yellow-500",
      badge: "Admin",
    },
    {
      title: "Aprovação de Graduações",
      description: "Aprovar alunos para próxima faixa",
      icon: Trophy,
      action: () => router.push("/admin/aprovacao-graduacao"),
      color: "bg-orange-500",
      badge: "Novo!",
    },
    {
      title: "Sistema Presença",
      description: "Check-in digital e relatórios",
      icon: Clock,
      action: () => router.push("/admin/sistema-presenca"),
      color: "bg-green-600",
      badge: "Admin",
    },
    {
      title: "Horários de Aulas",
      description: "Visualize os horários das aulas disponíveis na sua unidade",
      icon: Clock,
      action: () => router.push("/horarios"),
      color: "bg-pink-500",
      badge: "Novo!",
    },
    {
      title: "Gerenciamento de Aulas",
      description: "Cadastre, edite e gerencie as aulas das unidades",
      icon: Clock,
      action: () => router.push("/aulas"),
      color: "bg-amber-500",
      badge: "Admin",
    },
    /* {
      title: "Presença",
      description: "Registre sua presença nas aulas e acompanhe sua evolução",
      icon: Clock,
      action: () => router.push("/presenca"),
      color: "bg-emerald-500",
      badge: "Ativo",
    }, */
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Bem-vindo */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="h-8 w-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Master
            </h1>
          </div>
          <p className="text-gray-600">
            Bem-vindo, {user?.nome}! Visão geral completa do sistema TeamCruz.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Usuários
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.usuariosEsteMes} novos este mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <UserCheck className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.usuariosPendentes}
              </div>
              <p className="text-xs text-muted-foreground">
                Aguardando aprovação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Franqueados</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFranqueados}</div>
              <p className="text-xs text-muted-foreground">
                Em {stats.totalUnidades} unidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Alunos
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.totalAlunos}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.crescimentoAlunos > 0 ? "+" : ""}
                {stats.crescimentoAlunos}% vs mes anterior
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Módulos Disponíveis */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Módulos Disponíveis
          </h2>
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
                      {action.title}
                    </span>
                    {action.urgent ? (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        Urgente
                      </span>
                    ) : (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        {action.badge}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Segurança</span>
                </div>
                <span className="text-green-600 font-semibold">OK</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Database</span>
                </div>
                <span className="text-green-600 font-semibold">Online</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span className="font-medium">API</span>
                </div>
                <span className="text-green-600 font-semibold">Ativo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
