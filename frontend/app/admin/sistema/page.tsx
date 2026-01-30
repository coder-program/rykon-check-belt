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
import { Building2, Plus, Settings, ArrowLeft } from "lucide-react";

export default function AdminSistemaPage() {
  const router = useRouter();

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push("/dashboard")}
            variant="outline"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Administração do Sistema
          </h1>
          <p className="text-gray-600">
            Gerenciamento de estabelecimentos e configurações globais
          </p>
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Cadastrar Estabelecimento */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Novo Estabelecimento</CardTitle>
              </div>
              <CardDescription>
                Adicionar novo estabelecimento ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push("/admin/estabelecimentos/novo")}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar
              </Button>
            </CardContent>
          </Card>

          {/* Card Gerenciar Estabelecimentos */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <CardTitle className="text-lg">Estabelecimentos</CardTitle>
              </div>
              <CardDescription>
                Visualizar e editar estabelecimentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push("/admin/estabelecimentos")}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Gerenciar
              </Button>
            </CardContent>
          </Card>

          {/* Card Configurações */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Configurações</CardTitle>
              </div>
              <CardDescription>
                Parâmetros e configurações globais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push("/admin/configuracoes")}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Acessar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
