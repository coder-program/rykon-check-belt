"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
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
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Presenca {
  id: string;
  data: string;
  horario: string;
  tipo: string;
  faixa: string;
  faixaCodigo: string;
  graus: number;
  aula: {
    nome: string;
    professor: string;
    unidade: string;
  };
}

export default function HistoricoPresencaPage() {
  const router = useRouter();
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [filtroFaixa, setFiltroFaixa] = useState<
    "todas" | "branca" | "azul" | "roxa" | "marrom" | "preta"
  >("todas");

  useEffect(() => {
    loadHistoricoCompleto();
  }, []);

  const loadHistoricoCompleto = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/minha-historico?limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Dados recebidos:", data);
        setPresencas(data);
      } else {
        toast.error("Erro ao carregar histórico");
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico de presenças");
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    if (!data) return "-";
    try {
      const date = new Date(data);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const presencasFiltradas = presencas.filter((p) => {
    // Filtro de busca
    if (buscaHistorico) {
      const termo = buscaHistorico.toLowerCase();
      const match =
        p.aula.nome.toLowerCase().includes(termo) ||
        p.aula.professor.toLowerCase().includes(termo) ||
        p.aula.unidade.toLowerCase().includes(termo);
      if (!match) return false;
    }

    // Filtro de faixa
    if (filtroFaixa !== "todas") {
      const faixaNormalizada = (p.faixaCodigo || "BRANCA").toLowerCase();
      if (faixaNormalizada !== filtroFaixa.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  console.log("🔍 Presencas totais:", presencas.length);
  console.log("🔍 Presencas filtradas:", presencasFiltradas.length);
  console.log("🔍 Filtro faixa ativo:", filtroFaixa);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/presenca")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📋 Histórico Completo de Presenças
            </h1>
            <p className="text-gray-600">
              Visualize todo o histórico de check-ins realizados
            </p>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campo de Busca */}
              <div>
                <Input
                  placeholder="🔍 Buscar por aula, professor ou unidade..."
                  value={buscaHistorico}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBuscaHistorico(e.target.value)
                  }
                  className="w-full"
                />
              </div>

              {/* Filtro de Faixa */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Filtrar por Faixa
                </label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={filtroFaixa === "todas" ? "default" : "outline"}
                    onClick={() => setFiltroFaixa("todas")}
                    className="text-xs"
                  >
                    Todas
                  </Button>
                  <Button
                    size="sm"
                    variant={filtroFaixa === "branca" ? "default" : "outline"}
                    onClick={() => setFiltroFaixa("branca")}
                    className="text-xs"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"
                        fill="#FFFFFF"
                        stroke="#000"
                        strokeWidth="0.5"
                      />
                    </svg>
                    Branca
                  </Button>
                  <Button
                    size="sm"
                    variant={filtroFaixa === "azul" ? "default" : "outline"}
                    onClick={() => setFiltroFaixa("azul")}
                    className="text-xs"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"
                        fill="#0066CC"
                      />
                    </svg>
                    Azul
                  </Button>
                  <Button
                    size="sm"
                    variant={filtroFaixa === "roxa" ? "default" : "outline"}
                    onClick={() => setFiltroFaixa("roxa")}
                    className="text-xs"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"
                        fill="#9933CC"
                      />
                    </svg>
                    Roxa
                  </Button>
                  <Button
                    size="sm"
                    variant={filtroFaixa === "marrom" ? "default" : "outline"}
                    onClick={() => setFiltroFaixa("marrom")}
                    className="text-xs"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"
                        fill="#8B4513"
                      />
                    </svg>
                    Marrom
                  </Button>
                  <Button
                    size="sm"
                    variant={filtroFaixa === "preta" ? "default" : "outline"}
                    onClick={() => setFiltroFaixa("preta")}
                    className="text-xs"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"
                        fill="#000000"
                      />
                    </svg>
                    Preta
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Presenças */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Histórico de Presenças</span>
                <span className="text-sm font-normal text-gray-500">
                  {presencasFiltradas.length} registro(s)
                </span>
              </CardTitle>
              <CardDescription>
                Todas as suas presenças registradas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-spin" />
                  <p className="text-gray-600">Carregando histórico...</p>
                </div>
              ) : presencasFiltradas.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">
                    Nenhuma presença encontrada
                  </p>
                  <p className="text-sm">
                    {buscaHistorico
                      ? "Tente buscar com outros termos"
                      : "Faça seu primeiro check-in!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {presencasFiltradas.map((presenca) => (
                    <div
                      key={presenca.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 mb-1">
                            {presenca.aula.nome}
                          </div>
                          <div className="flex flex-col gap-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Prof.:</span>
                              <span>
                                {presenca.aula.professor || "Não informado"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span>{presenca.aula.unidade}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-semibold text-gray-700">
                                Faixa:
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  presenca.faixaCodigo?.toUpperCase() ===
                                  "BRANCA"
                                    ? "bg-gray-100 text-gray-800 border border-gray-300"
                                    : presenca.faixaCodigo?.toUpperCase() ===
                                      "AZUL"
                                    ? "bg-blue-100 text-blue-800"
                                    : presenca.faixaCodigo?.toUpperCase() ===
                                      "ROXA"
                                    ? "bg-purple-100 text-purple-800"
                                    : presenca.faixaCodigo?.toUpperCase() ===
                                      "MARROM"
                                    ? "bg-amber-100 text-amber-800"
                                    : presenca.faixaCodigo?.toUpperCase() ===
                                      "PRETA"
                                    ? "bg-gray-800 text-white"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {presenca.faixa}
                                {presenca.graus > 0 && ` (${presenca.graus}°)`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 mt-3 md:mt-0 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {formatarData(presenca.data)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          {presenca.horario}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
