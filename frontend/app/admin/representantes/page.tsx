"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, ArrowLeft, RefreshCw, Search, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RepresentantesPage() {
  const router = useRouter();
  const [representantes, setRepresentantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");

  const carregarRepresentantes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/representatives`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRepresentantes(data.data || []);
      } else if (response.status === 404) {
        console.warn("⚠️ Endpoint /paytime/representatives não implementado");
        toast.error("🚧 Funcionalidade em desenvolvimento");
      } else {
        toast.error("Erro ao carregar representantes");
      }
    } catch (error) {
      console.error("Erro:", error);
      // Não mostra erro se for CORS/Network (endpoint não existe)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.warn("🚧 Endpoint ainda não implementado no backend");
      } else {
        toast.error("Erro ao carregar representantes");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRepresentantes();
  }, []);

  const representantesFiltrados = representantes.filter((r) => {
    const searchLower = busca.toLowerCase();
    return (
      r.establishment?.first_name?.toLowerCase().includes(searchLower) ||
      r.establishment?.document?.toLowerCase().includes(searchLower) ||
      r.id?.toString().includes(searchLower)
    );
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Representantes</h1>
            <p className="text-gray-600">Gestão de representantes comerciais PayTime</p>
          </div>
        </div>
        <Button onClick={carregarRepresentantes} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Banner Informativo */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">💼 Representantes Comerciais PayTime</p>
              <p>
                Representantes gerenciam estabelecimentos em regiões específicas e recebem comissões (royalties) sobre operações financeiras.
                Cada representante pode atuar em múltiplos estados e está vinculado a um estabelecimento principal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, documento ou ID..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{representantesFiltrados.length} Representante(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : representantesFiltrados.length > 0 ? (
            <div className="space-y-3">
              {representantesFiltrados.map((rep: any) => (
                <div
                  key={rep.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {rep.establishment?.first_name || "N/A"}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600">
                          Doc: {rep.establishment?.document || "N/A"}
                        </span>
                        {rep.states && rep.states.length > 0 && (
                          <span className="text-sm text-gray-600">
                            Estados: {rep.states.map((s: any) => s.initials).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">ID: {rep.id}</p>
                    {rep.active !== undefined && (
                      <span className={`text-xs px-2 py-1 rounded ${rep.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                        {rep.active ? "Ativo" : "Inativo"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">
                Nenhum representante encontrado
              </p>
              <p className="text-sm text-gray-400 mb-4">
                🚧 Esta funcionalidade requer implementação do endpoint no backend
              </p>
              <p className="text-xs text-gray-400">
                Endpoint necessário: <code className="bg-gray-100 px-2 py-1 rounded">/paytime/representatives</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
