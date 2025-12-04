"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AcessoNegado() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-600">Acesso Negado</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-gray-500">
            Esta funcionalidade está disponível apenas para administradores,
            franqueados e gerentes de unidade.
          </p>
          <div className="flex gap-2 justify-center pt-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              Ir para Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
