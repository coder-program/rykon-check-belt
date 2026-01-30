"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Database, Mail, Shield, Server } from "lucide-react";

export default function ConfiguracoesPage() {
  const router = useRouter();

  const configuracoes = [
    {
      icon: Database,
      title: "Banco de Dados",
      description: "Configurações de conexão e backup",
      color: "blue" as const,
    },
    {
      icon: Mail,
      title: "Email & Notificações",
      description: "SMTP, templates e alertas",
      color: "green" as const,
    },
    {
      icon: Shield,
      title: "Segurança",
      description: "Autenticação, permissões e logs",
      color: "red" as const,
    },
    {
      icon: Server,
      title: "Sistema",
      description: "Parâmetros gerais e integrações",
      color: "purple" as const,
    },
  ];

  const colorClasses = {
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    green: { bg: "bg-green-100", text: "text-green-600" },
    red: { bg: "bg-red-100", text: "text-red-600" },
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
  };

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push("/admin/sistema")}
            variant="outline"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configurações do Sistema
          </h1>
          <p className="text-gray-600">
            Gerencie configurações globais e parâmetros do sistema
          </p>
        </div>

        {/* Grid de Configurações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {configuracoes.map((config, index) => {
            const Icon = config.icon;
            const colors = colorClasses[config.color];

            return (
              <Card
                key={index}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 ${colors.bg} rounded-lg`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {config.title}
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full">
                    Configurar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Informações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Versão</p>
                <p className="text-gray-600">2.0.0</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Ambiente</p>
                <p className="text-gray-600">Produção</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Última Atualização</p>
                <p className="text-gray-600">30/01/2026</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
