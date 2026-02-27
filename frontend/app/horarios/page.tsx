"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useFranqueadoProtection } from "@/hooks/useFranqueadoProtection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Filter,
  ArrowLeft,
  Users,
  Star,
  AlertCircle,
} from "lucide-react";

interface HorarioAula {
  id: string;
  nome: string;
  descricao?: string;
  professor: string;
  unidade: string;
  diaSemana: string;
  horarioInicio: string;
  horarioFim: string;
  nivel: "Iniciante" | "Intermediário" | "Avançado" | "Todos";
  modalidade: "Gi" | "NoGi" | "Misto";
  vagasDisponiveis: number;
  vagasTotal: number;
  inscrito: boolean;
  observacoes?: string;
}

export default function HorariosPage() {
  const { shouldBlock } = useFranqueadoProtection();

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [horarios, setHorarios] = useState<HorarioAula[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSelecionado, setFiltroSelecionado] = useState<string>("todos");
  const [diaSelecionado, setDiaSelecionado] = useState<string>("todos");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (shouldBlock) return null;
  
  // Wait for authentication check
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const diasSemana = [
    { key: "todos", label: "Todos os Dias" },
    { key: "segunda", label: "Segunda-feira" },
    { key: "terca", label: "Terça-feira" },
    { key: "quarta", label: "Quarta-feira" },
    { key: "quinta", label: "Quinta-feira" },
    { key: "sexta", label: "Sexta-feira" },
    { key: "sabado", label: "Sábado" },
    { key: "domingo", label: "Domingo" },
  ];

  const filtros = [
    { key: "todos", label: "Todas as Aulas" },
    { key: "minhas", label: "Minhas Aulas" },
    { key: "iniciante", label: "Iniciante" },
    { key: "gi", label: "Gi" },
    { key: "nogi", label: "NoGi" },
  ];

  useEffect(() => {
    loadHorarios();
  }, []);

  const loadHorarios = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("❌ Token não encontrado no localStorage");
        router.push('/login');
        return;
      }

      // Verificar se token está expirado antes de fazer requisição
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(jsonPayload);
        
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          console.error("❌ Token expirado - redirecionando para login");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push('/login');
          return;
        }
        
      } catch (e) {
        console.error("❌ Erro ao decodificar token:", e);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push('/login');
        return;
      }

      // � Verificar se há alunoId na URL
      const urlParams = new URLSearchParams(window.location.search);
      const alunoId = urlParams.get('alunoId');
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/aulas/horarios`;
      
      // Se há alunoId na URL, passar para a API
      if (alunoId) {
        url += `?alunoId=${alunoId}`;
      }

      // 🔒 Backend automaticamente filtra pela unidade do aluno
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        console.error("❌ Não autorizado (401) - Token rejeitado pelo servidor");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setHorarios(data);
      } else {
        console.error("❌ Erro ao buscar horários:", response.status);
        const errorText = await response.text();
        console.error("Resposta do servidor:", errorText);
        setHorarios([]);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar horários:", error);
      setHorarios([]);
    } finally {
      setLoading(false);
    }
  };

  const getNivelColor = (nivel: string) => {
    const colors: Record<string, string> = {
      Iniciante: "bg-green-100 text-green-800",
      Intermediário: "bg-yellow-100 text-yellow-800",
      Avançado: "bg-red-100 text-red-800",
      Todos: "bg-blue-100 text-blue-800",
    };
    return colors[nivel] || "bg-gray-100 text-gray-800";
  };

  const getModalidadeColor = (modalidade: string) => {
    const colors: Record<string, string> = {
      Gi: "bg-blue-100 text-blue-800",
      NoGi: "bg-orange-100 text-orange-800",
      Misto: "bg-purple-100 text-purple-800",
    };
    return colors[modalidade] || "bg-gray-100 text-gray-800";
  };

  const horariosFiltrados = horarios.filter((horario) => {
    // Filtro por dia
    if (diaSelecionado !== "todos" && horario.diaSemana !== diaSelecionado) {
      return false;
    }

    // Filtros de categoria
    switch (filtroSelecionado) {
      case "minhas":
        return horario.inscrito;
      case "iniciante":
        return horario.nivel === "Iniciante" || horario.nivel === "Todos";
      case "gi":
        return horario.modalidade === "Gi";
      case "nogi":
        return horario.modalidade === "NoGi";
      default:
        return true;
    }
  });

  // Agrupar por dia da semana
  const horariosAgrupados = horariosFiltrados.reduce((acc, horario) => {
    const dia = horario.diaSemana;
    if (!acc[dia]) {
      acc[dia] = [];
    }
    acc[dia].push(horario);
    return acc;
  }, {} as Record<string, HorarioAula[]>);

  // Ordenar horários dentro de cada dia
  Object.keys(horariosAgrupados).forEach((dia) => {
    horariosAgrupados[dia].sort((a, b) =>
      a.horarioInicio.localeCompare(b.horarioInicio)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando horários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Horários das Aulas
              </h1>
            </div>
            <p className="text-gray-600">
              Confira os horários e se inscreva nas aulas
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filtro por Dia */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Dia da Semana
                </label>
                <div className="flex flex-wrap gap-2">
                  {diasSemana.map((dia) => (
                    <Button
                      key={dia.key}
                      variant={
                        diaSelecionado === dia.key ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setDiaSelecionado(dia.key)}
                    >
                      {dia.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Filtro por Categoria */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Categoria
                </label>
                <div className="flex flex-wrap gap-2">
                  {filtros.map((filtro) => (
                    <Button
                      key={filtro.key}
                      variant={
                        filtroSelecionado === filtro.key ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setFiltroSelecionado(filtro.key)}
                    >
                      {filtro.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horários por Dia */}
        {Object.keys(horariosAgrupados).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhuma aula encontrada
              </h3>
              <p className="text-gray-500">
                Tente ajustar os filtros para ver mais opções
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {diasSemana.slice(1).map(({ key: dia, label }) => {
              if (!horariosAgrupados[dia]) return null;

              return (
                <div key={dia}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="h-6 w-6 text-blue-600" />
                    {label}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {horariosAgrupados[dia].map((horario) => (
                      <Card
                        key={horario.id}
                        className={`transition-all hover:shadow-lg ${
                          horario.inscrito
                            ? "ring-2 ring-blue-200 bg-blue-50"
                            : ""
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {horario.nome}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Prof. {horario.professor}
                              </CardDescription>
                              {horario.descricao && (
                                <CardDescription className="mt-2 text-gray-600">
                                  {horario.descricao}
                                </CardDescription>
                              )}
                            </div>
                            {horario.inscrito && (
                              <Star className="h-5 w-5 text-yellow-500 fill-current" />
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            {horario.horarioInicio} - {horario.horarioFim}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            {horario.unidade}
                          </div>

                          <div className="flex gap-2">
                            <Badge className={getNivelColor(horario.nivel)}>
                              {horario.nivel}
                            </Badge>
                            <Badge
                              className={getModalidadeColor(horario.modalidade)}
                            >
                              {horario.modalidade}
                            </Badge>
                          </div>

                          {/* TODO: Implementar sistema de vagas */}
                          {/* <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">
                              {horario.vagasDisponiveis} vagas disponíveis de{" "}
                              {horario.vagasTotal}
                            </span>
                          </div> */}

                          {horario.observacoes && (
                            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                              <AlertCircle className="h-3 w-3 mt-0.5" />
                              {horario.observacoes}
                            </div>
                          )}

                          {/* TODO: Implementar sistema de inscrições */}
                          {/* <div className="pt-2">
                            {horario.inscrito ? (
                              <Button
                                onClick={() => desinscreverAula(horario.id)}
                                variant="outline"
                                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                              >
                                Cancelar Inscrição
                              </Button>
                            ) : (
                              <Button
                                onClick={() => inscreverAula(horario.id)}
                                disabled={horario.vagasDisponiveis === 0}
                                className="w-full"
                              >
                                {horario.vagasDisponiveis === 0
                                  ? "Lotado"
                                  : "Inscrever-se"}
                              </Button>
                            )}
                          </div> */}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
