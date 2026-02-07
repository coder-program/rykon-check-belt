"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AntifraudePage() {
  const router = useRouter();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Antifraude</h1>
          <p className="text-gray-600">ClearSale, 3DS e IDPAY</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ClearSale</p>
                <p className="text-2xl font-bold">Inativo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">3D Secure</p>
                <p className="text-2xl font-bold">Inativo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">IDPAY</p>
                <p className="text-2xl font-bold">Inativo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Antifraude</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-900">
                Módulo em Desenvolvimento
              </p>
              <p className="text-sm text-yellow-700">
                As configurações de antifraude estarão disponíveis em breve.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
