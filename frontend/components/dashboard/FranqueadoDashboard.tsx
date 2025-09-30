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
  Building2,
  Users,
  GraduationCap,
  DollarSign,
  BarChart3,
  MapPin,
  Trophy,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export default function FranqueadoDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const stats = {
    minhasUnidades: 3,
    totalAlunos: 245,
    totalProfessores: 12,
    receitaMensal: 15750,
    graduacoesPendentes: 8,
    alunosAtivos: 220,
  };

  const unidades = [
    {
      id: 1,
      nome: "TeamCruz Vila Madalena",
      alunos: 95,
      professores: 4,
      status: "Ativa",
      receita: 6500,
    },
    {
      id: 2,
      nome: "TeamCruz Pinheiros",
      alunos: 78,
      professores: 3,
      status: "Ativa",
      receita: 5200,
    },
    {
      id: 3,
      nome: "TeamCruz Itaim",
      alunos: 72,
      professores: 5,
      status: "Ativa",
      receita: 4050,
    },
  ];

  const quickActions = [
    {
      title: "Gerenciar Unidades",
      description: "Administrar suas academias",
      icon: Building2,
      action: () => router.push("/unidades"),
      color: "bg-blue-500",
    },
    {
      title: "Meus Alunos",
      description: "Ver todos os alunos das suas unidades",
      icon: Users,
      action: () => router.push("/alunos"),
      color: "bg-green-500",
    },
    {
      title: "Graduações",
      description: "8 graduações aguardando aprovação",
      icon: GraduationCap,
      action: () => router.push("/graduacoes"),
      color: "bg-yellow-500",
      urgent: true,
    },
    {
      title: "Relatórios Financeiros",
      description: "Acompanhar receitas e mensalidades",
      icon: BarChart3,
      action: () => router.push("/relatorios/financeiro"),
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
                +12% vs mês anterior
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
                {stats.graduacoesPendentes}
              </div>
              <p className="text-xs text-muted-foreground">
                Pendentes aprovação
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
            <div className="space-y-4">
              {unidades.map((unidade) => (
                <div
                  key={unidade.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => router.push(`/unidades/${unidade.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{unidade.nome}</h3>
                      <p className="text-sm text-gray-600">
                        {unidade.alunos} alunos • {unidade.professores}{" "}
                        professores
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      R$ {unidade.receita.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {unidade.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                  +18
                </div>
                <div className="text-xs text-gray-600">Este mês</div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa Retenção</span>
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-2">92%</div>
                <div className="text-xs text-gray-600">Últimos 6 meses</div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Graduações</span>
                  <Trophy className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600 mt-2">
                  24
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
