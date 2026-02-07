"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List, ArrowLeft, RefreshCw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AtividadesPage() {
  const router = useRouter();
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");

  const carregarAtividades = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("rykon_pay_token");
      const response = await fetch(
        "https://rykon-pay-production.up.railway.app/api/activities",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAtividades(data.data || []);
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar atividades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAtividades();
  }, []);

  const atividadesFiltradas = atividades.filter(
    (a) =>
      a.description?.toLowerCase().includes(busca.toLowerCase()) ||
      a.code?.includes(busca)
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Atividades Econômicas</h1>
            <p className="text-gray-600">CNAEs e categorias</p>
          </div>
        </div>
        <Button onClick={carregarAtividades}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por descrição ou código CNAE..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{atividadesFiltradas.length} Atividade(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : atividadesFiltradas.length > 0 ? (
            <div className="space-y-3">
              {atividadesFiltradas.map((atividade: any) => (
                <div
                  key={atividade.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-lg">
                      <List className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium">{atividade.description}</p>
                      <p className="text-sm text-gray-600">
                        CNAE: {atividade.code}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">ID: {atividade.id}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-12 text-gray-500">
              Nenhuma atividade encontrada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
