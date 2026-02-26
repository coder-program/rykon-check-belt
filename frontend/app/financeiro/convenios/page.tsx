"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { http } from "@/lib/api";

interface AlunoConvenio {
  id: string;
  aluno: {
    id: string;
    nome_completo: string;
    email: string;
    telefone: string;
  };
  convenio: {
    nome: string;
    codigo: string;
  };
  convenio_user_id: string;
  status: string;
  data_ativacao: string;
  data_cancelamento?: string;
  created_at: string;
}

interface Estatisticas {
  totalCheckIns: number;
  receitaEstimada: number;
  valorMedioCheckin: number;
  percentualRepasse: number;
  usuariosAtivos: number;
  unidade_parceira_id?: string;
}

export default function ConveniosPage() {
  const [loading, setLoading] = useState(true);
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [alunos, setAlunos] = useState<AlunoConvenio[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [busca, setBusca] = useState("");
  const [convenioSelecionado, setConvenioSelecionado] = useState<"GYMPASS" | "TOTALPASS">("GYMPASS");

  useEffect(() => {
    // Pegar unidade do usuário do localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUnidadeId(user.unidade_id || "");
    }
  }, []);

  useEffect(() => {
    if (unidadeId) {
      carregarDados();
    }
  }, [unidadeId, convenioSelecionado]);

  const carregarDados = async () => {
    if (!unidadeId) return;

    setLoading(true);
    try {
      // Buscar alunos do convênio
      const alunosParams = new URLSearchParams({ unidadeId, convenio: convenioSelecionado }).toString();
      const responseAlunos = await http(`/convenios/alunos?${alunosParams}`, { auth: true });
      setAlunos(responseAlunos);

      // Buscar estatísticas
      const statsParams = new URLSearchParams({ unidadeId, convenio: convenioSelecionado }).toString();
      const responseStats = await http(`/convenios/estatisticas?${statsParams}`, { auth: true });
      setEstatisticas(responseStats);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const alunosFiltrados = alunos.filter(aluno => {
    const matchStatus = filtroStatus === "all" || aluno.status.toLowerCase() === filtroStatus;
    const matchBusca = 
      aluno.aluno.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      aluno.aluno.email.toLowerCase().includes(busca.toLowerCase()) ||
      aluno.convenio_user_id.toLowerCase().includes(busca.toLowerCase());
    
    return matchStatus && matchBusca;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      ativo: { label: "Ativo", className: "bg-green-100 text-green-800" },
      cancelado: { label: "Cancelado", className: "bg-red-100 text-red-800" },
      pausado: { label: "Pausado", className: "bg-yellow-100 text-yellow-800" },
      pendente: { label: "Pendente", className: "bg-gray-100 text-gray-800" },
    };
    
    const statusLower = status.toLowerCase();
    const { label, className } = config[statusLower as keyof typeof config] || config.pendente;
    
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Convênios</h1>
        <p className="text-gray-600 mt-1">
          Gerencie alunos Gympass e Totalpass
        </p>
      </div>

      {/* Tabs Gympass/Totalpass */}
      <Tabs value={convenioSelecionado} onValueChange={(v) => setConvenioSelecionado(v as "GYMPASS" | "TOTALPASS")}>
        <TabsList>
          <TabsTrigger value="GYMPASS">Gympass</TabsTrigger>
          <TabsTrigger value="TOTALPASS">Totalpass</TabsTrigger>
        </TabsList>

        <TabsContent value={convenioSelecionado} className="space-y-6">
          {/* Cards de Estatísticas */}
          {estatisticas && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Usuários Ativos</p>
                      <p className="text-2xl font-bold">{estatisticas.usuariosAtivos}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Check-ins</p>
                      <p className="text-2xl font-bold">{estatisticas.totalCheckIns}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Receita Estimada</p>
                      <p className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(estatisticas.receitaEstimada)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Repasse</p>
                      <p className="text-2xl font-bold">{estatisticas.percentualRepasse}%</p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filtros e Busca */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alunos {convenioSelecionado}</CardTitle>
                  <CardDescription>
                    {alunosFiltrados.length} alunos encontrados
                  </CardDescription>
                </div>
                <Button onClick={carregarDados} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barra de filtros */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nome, email ou ID..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={filtroStatus === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroStatus("all")}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filtroStatus === "ativo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroStatus("ativo")}
                  >
                    Ativos
                  </Button>
                  <Button
                    variant={filtroStatus === "cancelado" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroStatus("cancelado")}
                  >
                    Cancelados
                  </Button>
                </div>

                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>

              {/* Lista de Alunos */}
              <div className="space-y-2">
                {loading ? (
                  <p className="text-center py-8 text-gray-500">Carregando...</p>
                ) : alunosFiltrados.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    Nenhum aluno encontrado
                  </p>
                ) : (
                  alunosFiltrados.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{item.aluno.nome_completo}</h3>
                            {getStatusBadge(item.status)}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Email: {item.aluno.email}</p>
                            <p>Telefone: {item.aluno.telefone || "Não informado"}</p>
                            <p>ID {convenioSelecionado}: {item.convenio_user_id}</p>
                            <p>
                              Ativo desde:{" "}
                              {new Date(item.data_ativacao).toLocaleDateString("pt-BR")}
                            </p>
                            {item.data_cancelamento && (
                              <p className="text-red-600">
                                Cancelado em:{" "}
                                {new Date(item.data_cancelamento).toLocaleDateString("pt-BR")}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
