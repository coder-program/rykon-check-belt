"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  TrendingUp,
  Calendar,
  Star,
  Target,
  Clock,
  Award,
  BookOpen,
  ArrowLeft,
  CheckCircle,
  Circle,
} from "lucide-react";

interface GraduacaoAtual {
  id: string;
  faixa: string;
  grau: number;
  dataConcessao: string;
  pontosAtuais: number;
  pontosNecessarios: number;
  proximaFaixa: string;
  proximoGrau: number;
  tempoNaGraduacao: string;
}

interface HistoricoGraduacao {
  id: string;
  faixa: string;
  grau: number;
  dataConcessao: string;
  professor: string;
  observacoes?: string;
}

interface CompetenciasTecnicas {
  nome: string;
  categoria: string;
  dominada: boolean;
  progresso: number;
  descricao: string;
}

interface Objetivo {
  id: string;
  titulo: string;
  descricao: string;
  prazo: string;
  progresso: number;
  concluido: boolean;
  categoria: "tecnica" | "fisica" | "competicao" | "graduacao";
}

export default function MeuProgressoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [graduacaoAtual, setGraduacaoAtual] = useState<GraduacaoAtual | null>(
    null
  );
  const [historicoGraduacao, setHistoricoGraduacao] = useState<
    HistoricoGraduacao[]
  >([]);
  const [competencias, setCompetencias] = useState<CompetenciasTecnicas[]>([]);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressoData();
  }, []);

  const loadProgressoData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Carregar graduação atual
      const graduacaoResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graduacao/minha-graduacao`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (graduacaoResponse.ok) {
        const graduacaoData = await graduacaoResponse.json();
        setGraduacaoAtual(graduacaoData);
      }

      // Carregar histórico
      const historicoResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graduacao/meu-historico`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (historicoResponse.ok) {
        const historicoData = await historicoResponse.json();
        setHistoricoGraduacao(historicoData);
      }

      // Carregar competências técnicas
      const competenciasResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graduacao/minhas-competencias`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (competenciasResponse.ok) {
        const competenciasData = await competenciasResponse.json();
        setCompetencias(competenciasData);
      } else {
        // Dados mockados se a API não estiver disponível
        setCompetencias([
          {
            nome: "Guarda Fechada",
            categoria: "Posições Básicas",
            dominada: true,
            progresso: 100,
            descricao:
              "Domínio completo da guarda fechada defensiva e ofensiva",
          },
          {
            nome: "Passagem de Guarda",
            categoria: "Técnicas de Passagem",
            dominada: false,
            progresso: 75,
            descricao: "Técnicas de passagem de guarda lateral e por cima",
          },
          {
            nome: "Finalizações Básicas",
            categoria: "Submissões",
            dominada: false,
            progresso: 60,
            descricao: "Armlock, triângulo e estrangulamentos básicos",
          },
          {
            nome: "Escapadas",
            categoria: "Defesa",
            dominada: true,
            progresso: 100,
            descricao: "Escapadas do mount, side control e back control",
          },
        ]);
      }

      // Carregar objetivos
      const objetivosResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graduacao/meus-objetivos`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (objetivosResponse.ok) {
        const objetivosData = await objetivosResponse.json();
        setObjetivos(objetivosData);
      } else {
        // Dados mockados se a API não estiver disponível
        setObjetivos([
          {
            id: "1",
            titulo: "Próxima Graduação",
            descricao: "Alcançar Faixa Azul 3° Grau",
            prazo: "2025-03-15",
            progresso: 72,
            concluido: false,
            categoria: "graduacao",
          },
          {
            id: "2",
            titulo: "Competição Regional",
            descricao: "Participar do campeonato estadual",
            prazo: "2025-02-20",
            progresso: 40,
            concluido: false,
            categoria: "competicao",
          },
          {
            id: "3",
            titulo: "Dominar Berimbolo",
            descricao: "Executar o berimbolo com fluência",
            prazo: "2025-01-30",
            progresso: 85,
            concluido: false,
            categoria: "tecnica",
          },
        ]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados de progresso:", error);

      // Dados mockados em caso de erro
      setGraduacaoAtual({
        id: "1",
        faixa: "Azul",
        grau: 2,
        dataConcessao: "2024-04-15",
        pontosAtuais: 180,
        pontosNecessarios: 250,
        proximaFaixa: "Azul",
        proximoGrau: 3,
        tempoNaGraduacao: "8 meses",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getFaixaColor = (faixa: string) => {
    const colors: Record<string, string> = {
      Branca: "bg-gray-100 text-gray-800",
      Azul: "bg-blue-100 text-blue-800",
      Roxa: "bg-purple-100 text-purple-800",
      Marrom: "bg-amber-100 text-amber-800",
      Preta: "bg-gray-800 text-white",
    };
    return colors[faixa] || "bg-gray-100 text-gray-800";
  };

  const getCategoriaIcon = (categoria: string) => {
    const icons: Record<string, any> = {
      graduacao: Trophy,
      competicao: Award,
      tecnica: Target,
      fisica: TrendingUp,
    };
    return icons[categoria] || Target;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando seu progresso...</p>
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
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Meu Progresso
              </h1>
            </div>
            <p className="text-gray-600">
              Acompanhe sua evolução no Jiu-Jitsu e suas metas
            </p>
          </div>
        </div>

        {/* Graduação Atual */}
        {graduacaoAtual && (
          <Card className="mb-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Graduação Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-3xl font-bold mb-2">
                    Faixa {graduacaoAtual.faixa} {graduacaoAtual.grau}° Grau
                  </h3>
                  <p className="text-blue-100 mb-1">
                    Conquistada em {formatDate(graduacaoAtual.dataConcessao)}
                  </p>
                  <p className="text-blue-100">
                    Há {graduacaoAtual.tempoNaGraduacao}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">
                    Progresso para próxima graduação
                  </h4>
                  <div className="bg-white/20 rounded-full h-4 mb-3">
                    <div
                      className="bg-white rounded-full h-4 transition-all duration-1000"
                      style={{
                        width: `${
                          (graduacaoAtual.pontosAtuais /
                            graduacaoAtual.pontosNecessarios) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-100">
                    {graduacaoAtual.pontosAtuais} de{" "}
                    {graduacaoAtual.pontosNecessarios} pontos (
                    {Math.round(
                      (graduacaoAtual.pontosAtuais /
                        graduacaoAtual.pontosNecessarios) *
                        100
                    )}
                    %)
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Próxima Meta</h4>
                  <p className="text-2xl font-bold mb-1">
                    Faixa {graduacaoAtual.proximaFaixa}{" "}
                    {graduacaoAtual.proximoGrau}° Grau
                  </p>
                  <p className="text-sm text-blue-100">
                    Faltam{" "}
                    {graduacaoAtual.pontosNecessarios -
                      graduacaoAtual.pontosAtuais}{" "}
                    pontos
                  </p>
                  <div className="mt-3">
                    <Badge
                      variant="secondary"
                      className="bg-white/20 text-white"
                    >
                      {Math.round(
                        (graduacaoAtual.pontosNecessarios -
                          graduacaoAtual.pontosAtuais) /
                          10
                      )}{" "}
                      aulas estimadas
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Competências Técnicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Competências Técnicas
              </CardTitle>
              <CardDescription>
                Seu domínio das técnicas fundamentais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {competencias.map((comp, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {comp.dominada ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                          {comp.nome}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {comp.categoria}
                        </p>
                      </div>
                      <Badge
                        variant={comp.dominada ? "default" : "secondary"}
                        className={
                          comp.dominada ? "bg-green-100 text-green-800" : ""
                        }
                      >
                        {comp.progresso}%
                      </Badge>
                    </div>
                    <div>
                      <Progress value={comp.progresso} className="h-2" />
                    </div>
                    <p className="text-xs text-gray-600">{comp.descricao}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Objetivos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Meus Objetivos
              </CardTitle>
              <CardDescription>Metas e objetivos definidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {objetivos.map((objetivo) => {
                  const IconComponent = getCategoriaIcon(objetivo.categoria);
                  const diasRestantes = Math.ceil(
                    (new Date(objetivo.prazo).getTime() -
                      new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div
                      key={objetivo.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              objetivo.categoria === "graduacao"
                                ? "bg-yellow-100 text-yellow-600"
                                : objetivo.categoria === "competicao"
                                ? "bg-red-100 text-red-600"
                                : objetivo.categoria === "tecnica"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{objetivo.titulo}</h4>
                            <p className="text-sm text-gray-600">
                              {objetivo.descricao}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {diasRestantes > 0
                                ? `${diasRestantes} dias restantes`
                                : "Prazo vencido"}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={objetivo.concluido ? "default" : "secondary"}
                          className={
                            objetivo.concluido
                              ? "bg-green-100 text-green-800"
                              : ""
                          }
                        >
                          {objetivo.progresso}%
                        </Badge>
                      </div>
                      <div>
                        <Progress value={objetivo.progresso} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Graduações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Histórico de Graduações
            </CardTitle>
            <CardDescription>Sua jornada no Jiu-Jitsu</CardDescription>
          </CardHeader>
          <CardContent>
            {historicoGraduacao.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Seu histórico de graduações aparecerá aqui.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historicoGraduacao.map((graduacao, index) => (
                  <div
                    key={graduacao.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getFaixaColor(
                        graduacao.faixa
                      )}`}
                    >
                      {graduacao.faixa} {graduacao.grau}°
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">
                        Faixa {graduacao.faixa} {graduacao.grau}° Grau
                      </div>
                      <div className="text-sm text-gray-600">
                        Graduado por {graduacao.professor}
                      </div>
                      {graduacao.observacoes && (
                        <div className="text-xs text-gray-500 mt-1">
                          {graduacao.observacoes}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatDate(graduacao.dataConcessao)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Graduação #{historicoGraduacao.length - index}
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
  );
}
