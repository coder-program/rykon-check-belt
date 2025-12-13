"use client";

import { useState, useEffect } from "react";
import ProtegerRotaFinanceira from "@/components/financeiro/ProtegerRotaFinanceira";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  DollarSign,
  CreditCard,
  Eye,
  Send,
  Filter,
  TrendingUp,
  TrendingDown,
  Plus,
  CheckCircle,
} from "lucide-react";
import FiltroUnidade from "@/components/financeiro/FiltroUnidade";
import { useFiltroUnidade } from "@/hooks/useFiltroUnidade";

interface Aluno {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string;
}

interface Venda {
  id: string;
  numero_venda: string;
  aluno: {
    id: string;
    nome_completo: string;
    email: string;
    telefone: string;
  };
  valor: number;
  metodo_pagamento: string;
  status: string;
  link_pagamento?: string;
  data_pagamento?: string;
  created_at: string;
}

interface Estatisticas {
  totalVendas: number;
  vendasPagas: number;
  vendasPendentes: number;
  vendasFalhas: number;
  valorTotal: number;
  valorPago: number;
}

const statusConfig = {
  PAGO: { label: "Pago", color: "bg-green-500" },
  PENDENTE: { label: "Pendente", color: "bg-yellow-500" },
  AGUARDANDO: { label: "Aguardando", color: "bg-blue-500" },
  FALHOU: { label: "Falhou", color: "bg-red-500" },
  PROCESSANDO: { label: "Processando", color: "bg-purple-500" },
  CANCELADO: { label: "Cancelado", color: "bg-gray-500" },
  ESTORNADO: { label: "Estornado", color: "bg-orange-500" },
};

const metodoConfig = {
  PIX: "Pix",
  CARTAO: "Cartão",
  BOLETO: "Boleto",
  DINHEIRO: "Dinheiro",
  TRANSFERENCIA: "Transferência",
};

export default function VendasOnline() {
  const {
    isFranqueado,
    unidades,
    unidadeSelecionada,
    unidadeIdAtual,
    setUnidadeSelecionada,
  } = useFiltroUnidade();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("all");
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);

  // Estados para criação de venda
  const [modalAberto, setModalAberto] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [unidadeVenda, setUnidadeVenda] = useState(""); // Unidade da venda
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState("PIX");
  const [buscaAluno, setBuscaAluno] = useState("");

  // Estados para pagamento
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [vendaPagamento, setVendaPagamento] = useState<Venda | null>(null);

  useEffect(() => {
    carregarDados(unidadeIdAtual);
  }, [unidadeSelecionada, filtroStatus, filtroMetodo]);

  useEffect(() => {
    if (modalAberto) {
      carregarAlunos();
      // Se é franqueado e tem unidade selecionada no filtro, pré-selecionar
      if (
        isFranqueado &&
        unidadeSelecionada &&
        unidadeSelecionada !== "todas"
      ) {
        setUnidadeVenda(unidadeSelecionada);
      } else if (!isFranqueado) {
        // Se não é franqueado, pegar a unidade do usuário
        const userData = localStorage.getItem("user");
        const user = userData ? JSON.parse(userData) : null;
        if (user?.unidade_id) {
          setUnidadeVenda(user.unidade_id);
        }
      }
    }
  }, [modalAberto, unidadeIdAtual]);

  const carregarAlunos = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ pageSize: "1000" });

      if (unidadeIdAtual) {
        params.append("unidadeId", unidadeIdAtual);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/alunos?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAlunos(data.items || data);
      }
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
    }
  };

  const criarVenda = async () => {
    if (!alunoSelecionado || !descricao || !valor) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    // Validar unidade para franqueados
    if (isFranqueado && !unidadeVenda) {
      alert("Selecione a unidade para esta venda");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/vendas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            aluno_id: alunoSelecionado,
            unidade_id: unidadeVenda || user?.unidade_id,
            descricao,
            valor: parseFloat(valor),
            metodo_pagamento: metodoPagamento,
          }),
        }
      );

      if (response.ok) {
        alert("✅ Venda criada com sucesso!");
        setModalAberto(false);
        setAlunoSelecionado("");
        setUnidadeVenda("");
        setDescricao("");
        setValor("");
        setBuscaAluno("");
        carregarDados(unidadeIdAtual);
      } else {
        const error = await response.text();
        alert(` Erro ao criar venda: ${error}`);
      }
    } catch (error) {
      console.error("Erro ao criar venda:", error);
      alert(" Erro ao criar venda");
    }
  };

  const carregarDados = async (unidadeId: string) => {
    const timeoutId = setTimeout(() => {
      console.warn("⏰ Timeout: A requisição está demorando muito (>10s)");
    }, 10000);

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Buscar vendas
      const paramsVendas = new URLSearchParams();
      if (unidadeId) {
        paramsVendas.append("unidadeId", unidadeId);
      }
      if (filtroStatus !== "all") paramsVendas.append("status", filtroStatus);
      if (filtroMetodo !== "all") paramsVendas.append("metodo", filtroMetodo);

      const vendasUrl = `${
        process.env.NEXT_PUBLIC_API_URL
      }/vendas?${paramsVendas.toString()}`;
      const statsUrl = unidadeId
        ? `${process.env.NEXT_PUBLIC_API_URL}/vendas/estatisticas?unidadeId=${unidadeId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/vendas/estatisticas`;

      const [resVendas, resStats] = await Promise.all([
        fetch(vendasUrl, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(statsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      clearTimeout(timeoutId);

      if (!resVendas.ok) {
        console.error(
          " Erro ao buscar vendas:",
          resVendas.status,
          resVendas.statusText
        );
        throw new Error(`Erro ao buscar vendas: ${resVendas.status}`);
      }

      if (!resStats.ok) {
        console.error(
          " Erro ao buscar estatísticas:",
          resStats.status,
          resStats.statusText
        );
        throw new Error(`Erro ao buscar estatísticas: ${resStats.status}`);
      }

      const dataVendas = await resVendas.json();
      const dataStats = await resStats.json();

      setVendas(dataVendas);
      setEstatisticas(dataStats);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(" Erro ao carregar vendas:", error);
      setVendas([]);
      setEstatisticas({
        totalVendas: 0,
        vendasPagas: 0,
        vendasPendentes: 0,
        vendasFalhas: 0,
        valorTotal: 0,
        valorPago: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const registrarPagamento = async () => {
    if (!vendaPagamento) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/vendas/${vendaPagamento.id}/baixar`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            metodo_pagamento: vendaPagamento.metodo_pagamento,
            observacoes: "",
          }),
        }
      );

      if (response.ok) {
        alert("✅ Pagamento registrado com sucesso!");
        setModalPagamentoAberto(false);
        setVendaPagamento(null);
        carregarDados(unidadeIdAtual);
      } else {
        const error = await response.text();
        alert(` Erro ao registrar pagamento: ${error}`);
      }
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      alert(" Erro ao registrar pagamento");
    }
  };

  const reenviarLink = async (vendaId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/vendas/reenviar-link`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ vendaId }),
        }
      );

      if (response.ok) {
        alert("Link de pagamento reenviado com sucesso!");
      } else {
        alert("Erro ao reenviar link");
      }
    } catch (error) {
      console.error("Erro ao reenviar link:", error);
      alert("Erro ao reenviar link");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando vendas online...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">💳 Vendas Online</h1>
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Venda Online</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Aluno */}
              <div>
                <label className="text-sm font-medium">Aluno *</label>
                <Select
                  value={alunoSelecionado}
                  onValueChange={(value) => {
                    setAlunoSelecionado(value);
                    setBuscaAluno("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2">
                      <Input
                        placeholder="🔍 Buscar aluno..."
                        value={buscaAluno}
                        onChange={(e) => setBuscaAluno(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {alunos
                      .filter((a) =>
                        a.nome_completo
                          .toLowerCase()
                          .includes(buscaAluno.toLowerCase())
                      )
                      .map((aluno) => (
                        <SelectItem key={aluno.id} value={aluno.id}>
                          {aluno.nome_completo}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unidade (somente para franqueados) */}
              {isFranqueado && (
                <div>
                  <label className="text-sm font-medium">Unidade *</label>
                  <Select value={unidadeVenda} onValueChange={setUnidadeVenda}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          🏢 {unidade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Descrição */}
              <div>
                <label className="text-sm font-medium">Descrição *</label>
                <Input
                  placeholder="Ex: Mensalidade Dezembro, Kimono, etc"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              {/* Valor */}
              <div>
                <label className="text-sm font-medium">Valor (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>

              {/* Método de Pagamento */}
              <div>
                <label className="text-sm font-medium">
                  Método de Pagamento
                </label>
                <Select
                  value={metodoPagamento}
                  onValueChange={setMetodoPagamento}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">Pix</SelectItem>
                    <SelectItem value="CARTAO">Cartão</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setModalAberto(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={criarVenda} className="flex-1">
                  Criar Venda
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro de Unidade */}
      <FiltroUnidade
        unidades={unidades}
        unidadeSelecionada={unidadeSelecionada}
        onUnidadeChange={setUnidadeSelecionada}
        isFranqueado={isFranqueado}
      />

      {/* KPIs */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Vendas
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estatisticas.totalVendas}
              </div>
              <p className="text-xs text-muted-foreground">
                R$ {Number(estatisticas.valorTotal).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {estatisticas.vendasPagas}
              </div>
              <p className="text-xs text-muted-foreground">
                R$ {Number(estatisticas.valorPago).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <CreditCard className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {estatisticas.vendasPendentes}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Falhas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {estatisticas.vendasFalhas}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                  <SelectItem value="FALHOU">Falhou</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
                <SelectTrigger>
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Métodos</SelectItem>
                  <SelectItem value="PIX">Pix</SelectItem>
                  <SelectItem value="CARTAO">Cartão</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Vendas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Nenhuma venda encontrada
                  </TableCell>
                </TableRow>
              ) : (
                vendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell className="font-mono text-sm">
                      {venda.numero_venda}
                    </TableCell>
                    <TableCell>
                      {(venda as any).aluno_nome ||
                        venda.aluno?.nome_completo ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {metodoConfig[
                          venda.metodo_pagamento as keyof typeof metodoConfig
                        ] || venda.metodo_pagamento}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {Number(venda.valor).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusConfig[
                            venda.status as keyof typeof statusConfig
                          ]?.color
                        }
                      >
                        {statusConfig[venda.status as keyof typeof statusConfig]
                          ?.label || venda.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(venda.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {venda.status === "PENDENTE" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setVendaPagamento(venda);
                              setModalPagamentoAberto(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Registrar Pagamento
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setVendaSelecionada(venda)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Detalhes da Venda {venda.numero_venda}
                              </DialogTitle>
                            </DialogHeader>
                            {vendaSelecionada && (
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm text-gray-500">Aluno</p>
                                  <p className="font-semibold">
                                    {vendaSelecionada.aluno?.nome_completo ||
                                      "-"}
                                  </p>
                                  <p className="text-sm">
                                    {vendaSelecionada.aluno?.email || "-"}
                                  </p>
                                  <p className="text-sm">
                                    {vendaSelecionada.aluno?.telefone || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Valor</p>
                                  <p className="text-2xl font-bold">
                                    R${" "}
                                    {Number(vendaSelecionada.valor).toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Método de Pagamento
                                  </p>
                                  <p>
                                    {
                                      metodoConfig[
                                        vendaSelecionada.metodo_pagamento as keyof typeof metodoConfig
                                      ]
                                    }
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Status
                                  </p>
                                  <Badge
                                    className={
                                      statusConfig[
                                        vendaSelecionada.status as keyof typeof statusConfig
                                      ]?.color
                                    }
                                  >
                                    {
                                      statusConfig[
                                        vendaSelecionada.status as keyof typeof statusConfig
                                      ]?.label
                                    }
                                  </Badge>
                                </div>
                                {vendaSelecionada.link_pagamento && (
                                  <div>
                                    <p className="text-sm text-gray-500">
                                      Link de Pagamento
                                    </p>
                                    <a
                                      href={vendaSelecionada.link_pagamento}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline text-sm"
                                    >
                                      {vendaSelecionada.link_pagamento}
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {(venda.status === "PENDENTE" ||
                          venda.status === "AGUARDANDO") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reenviarLink(venda.id)}
                          >
                            <Send className="h-4 w-4" />
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

      {/* Modal de Confirmação de Pagamento */}
      <Dialog
        open={modalPagamentoAberto}
        onOpenChange={setModalPagamentoAberto}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          {vendaPagamento && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Confirme o recebimento do pagamento da venda:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p>
                  <strong>Venda:</strong> {vendaPagamento.numero_venda}
                </p>
                <p>
                  <strong>Aluno:</strong> {(vendaPagamento as any).aluno_nome}
                </p>
                <p>
                  <strong>Descrição:</strong> {vendaPagamento.descricao}
                </p>
                <p>
                  <strong>Valor:</strong> R${" "}
                  {Number(vendaPagamento.valor).toFixed(2)}
                </p>
                <p>
                  <strong>Método:</strong>{" "}
                  {
                    metodoConfig[
                      vendaPagamento.metodo_pagamento as keyof typeof metodoConfig
                    ]
                  }
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setModalPagamentoAberto(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={registrarPagamento} className="flex-1">
                  Confirmar Pagamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
