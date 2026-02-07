"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Download, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LiquidacoesPage() {
  const router = useRouter();
  const [liquidacoes, setLiquidacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarLiquidacoes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("rykon_pay_token");
      const response = await fetch(
        "https://rykon-pay-production.up.railway.app/api/settlements",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLiquidacoes(data.data || []);
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar liquidações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLiquidacoes();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Liquidações</h1>
            <p className="text-gray-600">Extratos do marketplace</p>
          </div>
        </div>
        <Button onClick={carregarLiquidacoes}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liquidações do Período</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : liquidacoes.length > 0 ? (
            <div className="space-y-3">
              {liquidacoes.map((liquidacao: any) => (
                <div
                  key={liquidacao.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Liquidação #{liquidacao.id}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(liquidacao.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      R$ {((liquidacao.amount || 0) / 100).toFixed(2)}
                    </p>
                    <Badge className="bg-green-100 text-green-800">
                      {liquidacao.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-12 text-gray-500">
              Nenhuma liquidação encontrada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
