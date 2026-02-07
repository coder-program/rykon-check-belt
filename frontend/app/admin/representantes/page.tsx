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
      const token = localStorage.getItem("rykon_pay_token");
      const response = await fetch(
        "https://rykon-pay-production.up.railway.app/api/representatives",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRepresentantes(data.data || []);
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar representantes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRepresentantes();
  }, []);

  const representantesFiltrados = representantes.filter((r) =>
    r.name?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Representantes</h1>
            <p className="text-gray-600">Gestão de representantes comerciais</p>
          </div>
        </div>
        <Button onClick={carregarRepresentantes}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar representante..."
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
                      <p className="font-medium">{rep.name}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {rep.email}
                        </span>
                        {rep.phone && (
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {rep.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">ID: {rep.id}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-12 text-gray-500">
              Nenhum representante encontrado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
