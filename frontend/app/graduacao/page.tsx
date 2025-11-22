"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFranqueadoProtection } from "@/hooks/useFranqueadoProtection";
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
import { http } from "@/lib/api";
import {
  getProximosGraduar,
  getHistoricoGraduacoes,
  getPendentesAprovacao,
  aprovarGraduacao,
} from "@/lib/graduacaoApi";

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
  const { shouldBlock } = useFranqueadoProtection();

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroFaixa, setFiltroFaixa] = useState("todos");
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [showAprovacaoModal, setShowAprovacaoModal] = useState(false);
  const [graduacaoParaAprovar, setGraduacaoParaAprovar] = useState<any>(null);
  const [observacaoAprovacao, setObservacaoAprovacao] = useState("");

  if (shouldBlock) return null;

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
      const response = await http("/graduacao/faixas-definicao");
      return response.data;
    },
  });

  const { data: estatisticasGraduacao } = useQuery({
    queryKey: ["estatisticas-graduacao"],
    queryFn: async () => {
      const response = await http("/graduacao/estatisticas");
      return response.data;
    },
  });

  const { data: historicoData, isLoading: historicoLoading } = useQuery({
    queryKey: ["historico-graduacoes", alunoSelecionado?.id],
    queryFn: () =>
      getHistoricoGraduacoes({
        alunoId: alunoSelecionado?.id,
        pageSize: 50,
      }),
    enabled: !!alunoSelecionado?.id,
  });

  const { data: pendentesAprovacao, refetch: refetchPendentes } = useQuery({
    queryKey: ["pendentes-aprovacao"],
    queryFn: () => getPendentesAprovacao({ pageSize: 50 }),
  });

  // Funções
  const handleGraduar = async (alunoId: string) => {
    try {
      await http(`/graduacao/graduar/${alunoId}`, {
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
      await http(`/graduacao/adicionar-grau/${alunoId}`, {
        method: "POST",
        body: JSON.stringify({ observacao }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Erro ao adicionar grau:", error);
    }
  };

  const handleAprovarGraduacao = async (
    graduacaoId: string,
    observacao?: string
  ) => {
    try {
      await aprovarGraduacao(graduacaoId, observacao);
      refetchPendentes();
      setShowAprovacaoModal(false);
      setGraduacaoParaAprovar(null);
      alert("Gradua\u00e7\u00e3o aprovada com sucesso!");
    } catch (error) {
      console.error("Erro ao aprovar gradua\u00e7\u00e3o:", error);
      alert("Erro ao aprovar gradua\u00e7\u00e3o");
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
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pendentes Aprova\u00e7\u00e3o
            </CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendentesAprovacao?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              aguardando aprova\u00e7\u00e3o
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prontos para Graduar
            </CardTitle>
            <Trophy className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
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

      {/* Graduações Pendentes de Aprovação */}
      {pendentesAprovacao &&
        pendentesAprovacao.items &&
        pendentesAprovacao.items.length > 0 && (
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Graduações Pendentes de Aprovação
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {pendentesAprovacao.total} graduação(es) aguardando aprovação do
                professor
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendentesAprovacao.items.map((grad: any) => (
                  <div
                    key={grad.id}
                    className="border rounded-lg p-4 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-lg">
                            {grad.aluno_nome}
                          </h4>
                          <Badge
                            style={{
                              backgroundColor: getCorFaixa(grad.faixa),
                              color: grad.faixa === "BRANCA" ? "#000" : "#fff",
                            }}
                          >
                            {grad.faixa} - {grad.grau}º Grau
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Data:</span>{" "}
                            <strong>
                              {new Date(grad.data_graduacao).toLocaleDateString(
                                "pt-BR"
                              )}
                            </strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Categoria:
                            </span>{" "}
                            <strong>{grad.categoria}</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Aulas Completadas:
                            </span>{" "}
                            <strong>{grad.aulas_completadas || 0}</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Tempo na Faixa:
                            </span>{" "}
                            <strong>{grad.tempo_na_faixa || 0} meses</strong>
                          </div>
                        </div>
                        {grad.observacao && (
                          <div className="text-sm mt-2">
                            <span className="text-muted-foreground">
                              Observação:
                            </span>
                            <p className="mt-1 text-gray-700">
                              {grad.observacao}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setGraduacaoParaAprovar(grad);
                            setShowAprovacaoModal(true);
                          }}
                        >
                          <Award className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAlunoSelecionado({
                              id: grad.aluno_id,
                              nome_completo: grad.aluno_nome,
                              faixa_atual: grad.faixa,
                              grau_atual: grad.grau,
                              categoria: grad.categoria,
                              aulas_restantes: 0,
                              progresso: 100,
                              total_presencas: grad.aulas_completadas || 0,
                            });
                          }}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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

                                <TabsContent
                                  value="historico"
                                  className="space-y-4"
                                >
                                  {historicoLoading ? (
                                    <p className="text-muted-foreground">
                                      Carregando histórico...
                                    </p>
                                  ) : historicoData?.items &&
                                    historicoData.items.length > 0 ? (
                                    <div className="space-y-3">
                                      {historicoData.items.map(
                                        (grad: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="border rounded-lg p-4 space-y-2"
                                          >
                                            <div className="flex justify-between items-center">
                                              <Badge
                                                style={{
                                                  backgroundColor: getCorFaixa(
                                                    grad.faixa
                                                  ),
                                                  color:
                                                    grad.faixa === "BRANCA"
                                                      ? "#000"
                                                      : "#fff",
                                                }}
                                              >
                                                {grad.faixa} - {grad.grau}º Grau
                                              </Badge>
                                              <span className="text-sm text-muted-foreground">
                                                {new Date(
                                                  grad.data_graduacao
                                                ).toLocaleDateString("pt-BR")}
                                              </span>
                                            </div>
                                            <div className="text-sm">
                                              <strong>Status:</strong>{" "}
                                              <Badge
                                                variant={
                                                  grad.status === "APROVADA"
                                                    ? "default"
                                                    : "secondary"
                                                }
                                              >
                                                {grad.status}
                                              </Badge>
                                            </div>
                                            {grad.observacao && (
                                              <p className="text-sm text-muted-foreground">
                                                <strong>Observação:</strong>{" "}
                                                {grad.observacao}
                                              </p>
                                            )}
                                            {grad.aprovado_por && (
                                              <p className="text-xs text-muted-foreground">
                                                Aprovado por:{" "}
                                                {grad.aprovado_por}
                                              </p>
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">
                                      Nenhuma graduação registrada ainda.
                                    </p>
                                  )}
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

      {/* Modal de Aprovação */}
      <Dialog open={showAprovacaoModal} onOpenChange={setShowAprovacaoModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              Aprovar Graduação
            </DialogTitle>
          </DialogHeader>
          {graduacaoParaAprovar && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-lg">
                    {graduacaoParaAprovar.aluno_nome}
                  </h4>
                  <Badge
                    style={{
                      backgroundColor: getCorFaixa(graduacaoParaAprovar.faixa),
                      color:
                        graduacaoParaAprovar.faixa === "BRANCA"
                          ? "#000"
                          : "#fff",
                    }}
                  >
                    {graduacaoParaAprovar.faixa} - {graduacaoParaAprovar.grau}º
                    Grau
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Data:</span>{" "}
                    <strong>
                      {new Date(
                        graduacaoParaAprovar.data_graduacao
                      ).toLocaleDateString("pt-BR")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Categoria:</span>{" "}
                    <strong>{graduacaoParaAprovar.categoria}</strong>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="observacao-aprovacao"
                  className="text-sm font-medium mb-2 block"
                >
                  Observação (opcional)
                </label>
                <textarea
                  id="observacao-aprovacao"
                  className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                  placeholder="Adicione uma observação sobre esta aprovação..."
                  value={observacaoAprovacao}
                  onChange={(e) => setObservacaoAprovacao(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAprovacaoModal(false);
                    setGraduacaoParaAprovar(null);
                    setObservacaoAprovacao("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    handleAprovarGraduacao(
                      graduacaoParaAprovar.id,
                      observacaoAprovacao || undefined
                    );
                    setObservacaoAprovacao("");
                  }}
                >
                  <Award className="w-4 h-4 mr-2" />
                  Confirmar Aprovação
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
