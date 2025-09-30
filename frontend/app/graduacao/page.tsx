"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  Trophy,
  Users,
  Search,
  Filter,
  Plus,
  Calendar,
  Award,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { getProximosGraduar } from "@/lib/graduacaoApi";

// Tipos
interface Aluno {
  id: string;
  nome_completo: string;
  faixa_atual: string;
  grau_atual: number;
  total_presencas: number;
  aulas_restantes: number;
  progresso: number;
  data_ultima_graduacao?: string;
  categoria: "ADULTO" | "INFANTIL";
}

interface FaixaDefinicao {
  id: string;
  codigo: string;
  nome_exibicao: string;
  cor_hex: string;
  categoria: "ADULTO" | "INFANTIL";
  graus_max: number;
  aulas_por_grau: number;
}

export default function GraduacaoPage() {
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroFaixa, setFiltroFaixa] = useState("todos");
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);

  // Queries
  const { data: proximosGraduar, isLoading: loadingProximos } = useQuery({
    queryKey: ["proximos-graduar"],
    queryFn: () =>
      getProximosGraduar({
        page: 1,
        pageSize: 100,
        categoria: filtroCategoria,
      }),
  });

  const { data: faixasDefinicao } = useQuery({
    queryKey: ["faixas-definicao"],
    queryFn: async () => {
      const response = await api("/graduacao/faixas-definicao");
      return response.data;
    },
  });

  const { data: estatisticasGraduacao } = useQuery({
    queryKey: ["estatisticas-graduacao"],
    queryFn: async () => {
      const response = await api("/graduacao/estatisticas");
      return response.data;
    },
  });

  // Funções
  const handleGraduar = async (alunoId: string) => {
    try {
      await api(`/graduacao/graduar/${alunoId}`, {
        method: "POST",
      });
      // Refresh da query
      window.location.reload();
    } catch (error) {
      console.error("Erro ao graduar aluno:", error);
    }
  };

  const handleAdicionarGrau = async (alunoId: string, observacao: string) => {
    try {
      await api(`/graduacao/adicionar-grau/${alunoId}`, {
        method: "POST",
        body: JSON.stringify({ observacao }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Erro ao adicionar grau:", error);
    }
  };

  const getCorFaixa = (faixa: string) => {
    const cores: { [key: string]: string } = {
      BRANCA: "#FFFFFF",
      AZUL: "#0066CC",
      ROXA: "#663399",
      MARROM: "#8B4513",
      PRETA: "#000000",
      CINZA: "#808080",
      AMARELA: "#FFD700",
      LARANJA: "#FF8C00",
      VERDE: "#008000",
    };
    return cores[faixa.toUpperCase()] || "#808080";
  };

  const alunos = proximosGraduar?.items || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Graduação</h1>
          <p className="text-muted-foreground">
            Controle e acompanhe o progresso de graduação dos alunos
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Graduação
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prontos para Graduar
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alunos.filter((a) => a.aulas_restantes === 0).length}
            </div>
            <p className="text-xs text-muted-foreground">alunos prontos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alunos.filter((a) => a.aulas_restantes > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adultos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alunos.filter((a) => a.categoria === "ADULTO").length}
            </div>
            <p className="text-xs text-muted-foreground">categoria adulto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Infantil</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alunos.filter((a) => a.categoria === "INFANTIL").length}
            </div>
            <p className="text-xs text-muted-foreground">categoria infantil</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Categorias</SelectItem>
                <SelectItem value="ADULTO">Adulto</SelectItem>
                <SelectItem value="INFANTIL">Infantil</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroFaixa} onValueChange={setFiltroFaixa}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Faixa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Faixas</SelectItem>
                <SelectItem value="BRANCA">Branca</SelectItem>
                <SelectItem value="AZUL">Azul</SelectItem>
                <SelectItem value="ROXA">Roxa</SelectItem>
                <SelectItem value="MARROM">Marrom</SelectItem>
                <SelectItem value="PRETA">Preta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Alunos */}
      <Card>
        <CardHeader>
          <CardTitle>Alunos por Graduação</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Faixa Atual</TableHead>
                <TableHead>Grau</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Aulas Restantes</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingProximos ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : alunos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Nenhum aluno encontrado
                  </TableCell>
                </TableRow>
              ) : (
                alunos
                  .filter(
                    (aluno) =>
                      aluno.nome_completo
                        .toLowerCase()
                        .includes(filtroNome.toLowerCase()) &&
                      (filtroCategoria === "todos" ||
                        aluno.categoria === filtroCategoria) &&
                      (filtroFaixa === "todos" ||
                        aluno.faixa_atual === filtroFaixa)
                  )
                  .map((aluno) => (
                    <TableRow key={aluno.id}>
                      <TableCell className="font-medium">
                        {aluno.nome_completo}
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            backgroundColor: getCorFaixa(aluno.faixa_atual),
                            color:
                              aluno.faixa_atual === "BRANCA" ? "#000" : "#fff",
                          }}
                        >
                          {aluno.faixa_atual}
                        </Badge>
                      </TableCell>
                      <TableCell>{aluno.grau_atual}º Grau</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={aluno.progresso} className="w-20" />
                          <span className="text-sm">{aluno.progresso}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            aluno.aulas_restantes === 0
                              ? "default"
                              : "secondary"
                          }
                        >
                          {aluno.aulas_restantes === 0
                            ? "Pronto!"
                            : `${aluno.aulas_restantes} aulas`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{aluno.categoria}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAlunoSelecionado(aluno)}
                              >
                                Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Graduação - {alunoSelecionado?.nome_completo}
                                </DialogTitle>
                              </DialogHeader>

                              <Tabs
                                defaultValue="progresso"
                                className="max-w-full"
                              >
                                <TabsList>
                                  <TabsTrigger value="progresso">
                                    Progresso
                                  </TabsTrigger>
                                  <TabsTrigger value="historico">
                                    Histórico
                                  </TabsTrigger>
                                  <TabsTrigger value="acoes">Ações</TabsTrigger>
                                </TabsList>

                                <TabsContent
                                  value="progresso"
                                  className="space-y-4"
                                >
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold">
                                        Faixa Atual
                                      </h4>
                                      <Badge
                                        style={{
                                          backgroundColor: getCorFaixa(
                                            alunoSelecionado?.faixa_atual || ""
                                          ),
                                          color:
                                            alunoSelecionado?.faixa_atual ===
                                            "BRANCA"
                                              ? "#000"
                                              : "#fff",
                                        }}
                                      >
                                        {alunoSelecionado?.faixa_atual}
                                      </Badge>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold">
                                        Grau Atual
                                      </h4>
                                      <p>
                                        {alunoSelecionado?.grau_atual}º Grau
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold">
                                        Total de Presenças
                                      </h4>
                                      <p>{alunoSelecionado?.total_presencas}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold">
                                        Aulas Restantes
                                      </h4>
                                      <p>{alunoSelecionado?.aulas_restantes}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold mb-2">
                                      Progresso para Próximo Grau
                                    </h4>
                                    <Progress
                                      value={alunoSelecionado?.progresso || 0}
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {alunoSelecionado?.progresso}% concluído
                                    </p>
                                  </div>
                                </TabsContent>

                                <TabsContent value="historico">
                                  <p className="text-muted-foreground">
                                    Histórico de graduações será implementado
                                    aqui
                                  </p>
                                </TabsContent>

                                <TabsContent
                                  value="acoes"
                                  className="space-y-4"
                                >
                                  <div className="flex flex-col space-y-2">
                                    <Button
                                      onClick={() =>
                                        handleAdicionarGrau(
                                          alunoSelecionado?.id || "",
                                          "Grau adicionado manualmente"
                                        )
                                      }
                                      disabled={!alunoSelecionado}
                                    >
                                      <Award className="w-4 h-4 mr-2" />
                                      Adicionar Grau
                                    </Button>

                                    {alunoSelecionado?.aulas_restantes ===
                                      0 && (
                                      <Button
                                        onClick={() =>
                                          handleGraduar(alunoSelecionado.id)
                                        }
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <Trophy className="w-4 h-4 mr-2" />
                                        Graduar para Próxima Faixa
                                      </Button>
                                    )}
                                  </div>
                                </TabsContent>
                              </Tabs>
                            </DialogContent>
                          </Dialog>

                          {aluno.aulas_restantes === 0 && (
                            <Button
                              onClick={() => handleGraduar(aluno.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Trophy className="w-4 h-4 mr-1" />
                              Graduar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
