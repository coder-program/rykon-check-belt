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

export default function MasterDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const stats = {
    totalUsuarios: 156,
    usuariosPendentes: 12,
    totalFranqueados: 8,
    totalUnidades: 24,
    totalAlunos: 1250,
    totalProfessores: 45,
  };

  const quickActions = [
    {
      title: "Gerenciar Usuários",
      description: "Cadastrar e gerenciar usuários",
      icon: Users,
      action: () => router.push("/usuarios"),
      color: "bg-blue-500",
    },
    {
      title: "Aprovar Cadastros",
      description: "12 usuários aguardando aprovação",
      icon: UserCheck,
      action: () => router.push("/admin/usuarios-pendentes"),
      color: "bg-green-500",
      urgent: true,
    },
    {
      title: "Gestão Franqueados",
      description: "Associar franqueados e unidades",
      icon: Building2,
      action: () => router.push("/admin/gestao-franqueados"),
      color: "bg-purple-500",
    },
    {
      title: "Sistema Graduação",
      description: "Controle de faixas e graus",
      icon: Trophy,
      action: () => router.push("/admin/sistema-graduacao"),
      color: "bg-yellow-500",
    },
    {
      title: "Sistema Presença",
      description: "Check-in digital e relatórios",
      icon: Clock,
      action: () => router.push("/admin/sistema-presenca"),
      color: "bg-green-600",
    },
    {
      title: "Gestão Unidades",
      description: "Vincular professores às unidades",
      icon: MapPin,
      action: () => router.push("/admin/gestao-unidades"),
      color: "bg-indigo-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
                +12 novos este mês
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
                +8% vs mês anterior
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
                      {action.title}
                    </span>
                    {action.urgent && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        Urgente
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
