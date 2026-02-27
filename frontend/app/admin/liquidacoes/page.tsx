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
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const carregarLiquidacoes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/liquidations`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMeta(data.meta);
        setLiquidacoes(data.data || []);
      } else {
        console.error("Erro na resposta:", response.status);
        if (response.status === 404) {
          toast.error("Funcionalidade de liquidações ainda não implementada no backend");
        } else {
          toast.error("Erro ao carregar liquidações");
        }
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao conectar com o servidor. Verifique se o backend está rodando.");
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Sobre as Liquidações</h3>
            <p className="text-sm text-blue-800">
              Estes são repasses financeiros <b>reais</b> do <b>PayTime Marketplace</b>. 
              Cada liquidação representa a transferência de valores das transações processadas 
              pelos estabelecimentos para o marketplace. Os valores são automaticamente calculados 
              pelo PayTime com base nas transações realizadas, taxas e planos configurados.
            </p>
          </div>
        </div>
      </div>

      {meta && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Liquidado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {((meta.total_amount || 0) / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Transações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meta.total_transactions || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meta.total_payments || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

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
                  key={liquidacao._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">
                        {liquidacao.establishment?.name1 || liquidacao.establishment?.name2 || 'Estabelecimento N/A'}
                      </p>
                      <div className="flex gap-3 mt-1">
                        <p className="text-sm text-gray-600">
                          📅 {liquidacao.liquidation 
                            ? new Date(liquidacao.liquidation).toLocaleDateString("pt-BR", {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Data não disponível'}
                        </p>
                        <p className="text-sm text-gray-600">
                          📊 {liquidacao.transactions || 0} transação{liquidacao.transactions !== 1 ? 'ões' : ''}
                        </p>
                        {liquidacao.marketplace?.name1 && (
                          <p className="text-sm text-gray-600">
                            🏪 {liquidacao.marketplace.name1}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      R$ {((liquidacao.amount || 0) / 100).toFixed(2)}
                    </p>
                    <Badge className={
                      liquidacao.status === 'PAID' 
                        ? 'bg-green-100 text-green-800' 
                        : liquidacao.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }>
                      {liquidacao.status === 'PAID' ? '✓ PAGO' : 
                       liquidacao.status === 'PENDING' ? '⏳ PENDENTE' : 
                       liquidacao.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Nenhuma liquidação encontrada</p>
              <p className="text-sm text-gray-400">
                Liquidações são os repasses financeiros do marketplace
              </p>
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-yellow-800">
                  ⚠️ Esta funcionalidade pode não estar disponível ainda. 
                  Verifique se o endpoint de settlements foi implementado no backend.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
