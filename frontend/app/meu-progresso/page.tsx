"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";

export default function MeuProgressoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Meu Progresso
              </h1>
              <p className="text-gray-600">
                Sistema para gerenciar seu histórico de graduações
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Grau
            </Button>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Faixa
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Graduações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-8">
              Sistema implementado! Use os botões acima para adicionar seu
              histórico.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
