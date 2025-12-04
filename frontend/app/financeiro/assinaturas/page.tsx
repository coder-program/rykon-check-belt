"use client";

import { useState, useEffect } from "react";
import ProtegerRotaFinanceira from "@/components/financeiro/ProtegerRotaFinanceira";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  UserCheck,
  Users,
  PauseCircle,
  XCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import FiltroUnidade from "@/components/financeiro/FiltroUnidade";

interface Plano {
  id: string;
  nome: string;
  tipo: string;
  valor: number;
}

interface Unidade {
  id: string;
  nome: string;
}

interface Aluno {
  id: string;
  nome?: string;
  nome_completo?: string;
  cpf?: string;
  unidade_id?: string;
  unidade_nome?: string;
}

interface Assinatura {
  id: string;
  aluno_id: string;
  aluno_nome?: string;
  plano_id: string;
  plano_nome?: string;
  unidade_id: string;
  status: "ATIVA" | "PAUSADA" | "CANCELADA" | "EXPIRADA";
  data_inicio: string;
  data_fim?: string;
  valor_mensal: number;
  metodo_pagamento: string;
  observacoes?: string;
}

export default function Assinaturas() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [isFranqueado, setIsFranqueado] = useState(false);
  const [filteredAssinaturas, setFilteredAssinaturas] = useState<Assinatura[]>(
    []
  );
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todas");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [alunoSearchTerm, setAlunoSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [showDetalhesDialog, setShowDetalhesDialog] = useState(false);
  const [selectedAssinatura, setSelectedAssinatura] =
    useState<Assinatura | null>(null);

  const [formData, setFormData] = useState({
    aluno_id: "",
    plano_id: "",
    unidade_id: "",
    data_inicio: new Date().toISOString().split("T")[0],
    metodo_pagamento: "PIX",
    dia_vencimento: "10",
    observacoes: "",
  });

  useEffect(() => {
    carregarDados();
  }, [unidadeSelecionada]);

  useEffect(() => {
    filtrarAssinaturas();
  }, [assinaturas, searchTerm, statusFilter]);

  const carregarDados = async () => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      const user = JSON.parse(userData || "{}");

      // Detectar tipo de usuário pelo perfis array (backend retorna perfis, não tipo_usuario)
      const franqueadoDetected = user.perfis?.some(
        (p: any) =>
          (typeof p === "string" && p.toLowerCase() === "franqueado") ||
          (typeof p === "object" && p?.nome?.toLowerCase() === "franqueado")
      );
      setIsFranqueado(franqueadoDetected);

      // Determinar unidade_id baseado no filtro
      const unidadeAtual =
        unidadeSelecionada === "todas" ? "" : unidadeSelecionada;
      const unidadeParam = franqueadoDetected
        ? unidadeAtual
        : user.unidade_id || "";

      // Se não é franqueado, setar unidade_id no formData
      if (!franqueadoDetected && user.unidade_id) {
        setFormData((prev) => ({ ...prev, unidade_id: user.unidade_id }));
      }

      // Carregar assinaturas
      const assinaturasRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/assinaturas${
          unidadeParam ? `?unidade_id=${unidadeParam}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (assinaturasRes.ok) {
        const data = await assinaturasRes.json();
        setAssinaturas(data);
      }

      // Carregar planos
      const planosRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/planos${
          unidadeParam ? `?unidadeId=${unidadeParam}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (planosRes.ok) {
        const data = await planosRes.json();
        console.log("📦 Planos carregados:", data);
        console.log(
          "✅ Planos ativos:",
          data.filter((p: any) => p.ativo)
        );
        setPlanos(data);
      }

      // Se for franqueado, carregar unidades
      if (franqueadoDetected) {
        const unidadesRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/unidades?pageSize=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (unidadesRes.ok) {
          const unidadesData = await unidadesRes.json();
          console.log("🏢 Unidades carregadas:", unidadesData);
          // A API retorna { items: [...], page, pageSize, total }
          const unidadesArray = unidadesData.items || [];
          setUnidades(unidadesArray);
        }
      }

      // Carregar alunos
      const alunosRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/alunos?pageSize=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (alunosRes.ok) {
        const alunosData = await alunosRes.json();
        console.log("👥 Alunos carregados (raw):", alunosData);
        // A API também retorna paginado
        const alunosArray = alunosData.items || alunosData.data || alunosData;
        console.log("📋 Array de alunos:", alunosArray);
        console.log(
          "📊 Total de alunos:",
          Array.isArray(alunosArray) ? alunosArray.length : 0
        );
        setAlunos(Array.isArray(alunosArray) ? alunosArray : []);
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setLoading(false);
    }
  };

  const filtrarAssinaturas = () => {
    let filtered = assinaturas;

    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((a) =>
        a.aluno_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAssinaturas(filtered);
  };

  const handleSelectAluno = (alunoId: string) => {
    const alunoSelecionado = alunos.find((a) => a.id === alunoId);

    setFormData({
      ...formData,
      aluno_id: alunoId,
      unidade_id: alunoSelecionado?.unidade_id || formData.unidade_id,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData = localStorage.getItem("user");
    const user = JSON.parse(userData || "{}");

    // Validar se unidade_id está presente
    if (!formData.unidade_id) {
      alert("Por favor, selecione um aluno com unidade válida!");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      console.log("📤 Enviando assinatura:", formData);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/assinaturas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            dia_vencimento: parseInt(formData.dia_vencimento),
          }),
        }
      );

      if (response.ok) {
        alert("Assinatura criada com sucesso!");
        setShowDialog(false);
        resetForm();
        carregarDados();
      } else {
        const errorData = await response.json();
        console.error("❌ Erro ao criar:", errorData);
        alert(
          "Erro ao criar assinatura: " +
            (errorData.message || "Erro desconhecido")
        );
      }
    } catch (error) {
      console.error("Erro ao criar assinatura:", error);
      alert("Erro ao criar assinatura");
    }
  };

  const handleRenovar = async (id: string) => {
    if (!confirm("Deseja renovar esta assinatura?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/assinaturas/renovar/${id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert("Assinatura renovada!");
        carregarDados();
      }
    } catch (error) {
      console.error("Erro ao renovar assinatura:", error);
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm("Deseja cancelar esta assinatura?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/assinaturas/cancelar/${id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert("Assinatura cancelada!");
        carregarDados();
      }
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      aluno_id: "",
      plano_id: "",
      data_inicio: new Date().toISOString().split("T")[0],
      metodo_pagamento: "PIX",
      observacoes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      ATIVA: <Badge className="bg-green-100 text-green-800">Ativa</Badge>,
      PAUSADA: <Badge className="bg-yellow-100 text-yellow-800">Pausada</Badge>,
      CANCELADA: <Badge className="bg-red-100 text-red-800">Cancelada</Badge>,
      EXPIRADA: <Badge className="bg-gray-100 text-gray-800">Expirada</Badge>,
    };
    return badges[status as keyof typeof badges] || null;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const totais = {
    ativas: assinaturas.filter((a) => a.status === "ATIVA").length,
    pausadas: assinaturas.filter((a) => a.status === "PAUSADA").length,
    canceladas: assinaturas.filter((a) => a.status === "CANCELADA").length,
    receita: assinaturas
      .filter((a) => a.status === "ATIVA")
      .reduce((sum, a) => sum + Number(a.valor_mensal || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando assinaturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assinaturas</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as assinaturas dos alunos
          </p>
        </div>
        <Button
          onClick={() => {
            setAlunoSearchTerm("");
            setShowDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Assinatura
        </Button>
      </div>

      {/* Filtro de Unidade */}
      <FiltroUnidade
        unidades={unidades}
        unidadeSelecionada={unidadeSelecionada}
        onUnidadeChange={setUnidadeSelecionada}
        isFranqueado={isFranqueado}
      />

      {/* Cards de Totais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ativas</p>
                <p className="text-2xl font-bold text-green-600">
                  {totais.ativas}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pausadas</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {totais.pausadas}
                </p>
              </div>
              <PauseCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">
                  {totais.canceladas}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Receita Mensal</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totais.receita)}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome do aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ATIVA">Ativa</SelectItem>
                <SelectItem value="PAUSADA">Pausada</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
                <SelectItem value="EXPIRADA">Expirada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Assinaturas */}
      <Card>
        <CardHeader>
          <CardTitle>Assinaturas ({filteredAssinaturas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAssinaturas.map((assinatura) => (
              <div
                key={assinatura.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900">
                      {assinatura.aluno_nome || "Aluno N/A"}
                    </p>
                    {getStatusBadge(assinatura.status)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Plano: {assinatura.plano_nome || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Início: {formatDate(assinatura.data_inicio)}
                    {assinatura.data_fim &&
                      ` • Fim: ${formatDate(assinatura.data_fim)}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(assinatura.valor_mensal)}
                    </p>
                    <p className="text-xs text-gray-500">/mês</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAssinatura(assinatura);
                        setShowDetalhesDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {assinatura.status === "ATIVA" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRenovar(assinatura.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelar(assinatura.id)}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredAssinaturas.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhuma assinatura encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Nova Assinatura */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Assinatura</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Aluno *
              </label>
              <Input
                placeholder="🔍 Buscar aluno por nome..."
                value={alunoSearchTerm}
                onChange={(e) => setAlunoSearchTerm(e.target.value)}
                list="alunos-list"
              />
              <datalist id="alunos-list">
                {alunos
                  .filter((aluno) =>
                    aluno.nome
                      ?.toLowerCase()
                      .includes(alunoSearchTerm.toLowerCase())
                  )
                  .map((aluno) => (
                    <option key={aluno.id} value={aluno.nome}>
                      {aluno.cpf && `CPF: ${aluno.cpf}`}
                      {aluno.unidade_nome && ` - ${aluno.unidade_nome}`}
                    </option>
                  ))}
              </datalist>
              {alunoSearchTerm && (
                <div className="mt-2 max-h-[200px] overflow-y-auto border rounded-md bg-white shadow-lg">
                  {alunos
                    .filter((aluno) => {
                      const nomeAluno = aluno.nome_completo || aluno.nome || "";
                      return nomeAluno
                        .toLowerCase()
                        .includes(alunoSearchTerm.toLowerCase());
                    })
                    .map((aluno) => (
                      <div
                        key={aluno.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            aluno_id: aluno.id,
                            unidade_id: aluno.unidade_id || formData.unidade_id,
                          });
                          setAlunoSearchTerm(
                            aluno.nome_completo || aluno.nome || ""
                          );
                        }}
                      >
                        <div className="font-medium">
                          {aluno.nome_completo || aluno.nome}
                        </div>
                        {aluno.cpf && (
                          <div className="text-sm text-gray-600">
                            CPF: {aluno.cpf}
                          </div>
                        )}
                        {aluno.unidade_nome && (
                          <div className="text-xs text-blue-600">
                            📍 {aluno.unidade_nome}
                          </div>
                        )}
                      </div>
                    ))}
                  {alunos.filter((aluno) => {
                    const nomeAluno = aluno.nome_completo || aluno.nome || "";
                    return nomeAluno
                      .toLowerCase()
                      .includes(alunoSearchTerm.toLowerCase());
                  }).length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      Nenhum aluno encontrado
                    </div>
                  )}
                </div>
              )}
            </div>
            {isFranqueado ? (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Unidade
                </label>
                <Select
                  value={formData.unidade_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unidade_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Unidade
                </label>
                <Input
                  value={formData.unidade_id}
                  disabled
                  className="bg-gray-100"
                  placeholder="Unidade padrão"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">Plano</label>
              <Select
                value={formData.plano_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, plano_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {planos
                    .filter((plano) => plano.ativo)
                    .map((plano) => (
                      <SelectItem key={plano.id} value={plano.id}>
                        {plano.nome} - {formatCurrency(plano.valor)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Data de Início
                </label>
                <Input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) =>
                    setFormData({ ...formData, data_inicio: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Dia do Vencimento
                </label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={formData.dia_vencimento}
                  onChange={(e) =>
                    setFormData({ ...formData, dia_vencimento: e.target.value })
                  }
                  placeholder="Ex: 10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Método de Pagamento
              </label>
              <Select
                value={formData.metodo_pagamento}
                onValueChange={(value) =>
                  setFormData({ ...formData, metodo_pagamento: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CARTAO">Cartão</SelectItem>
                  <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Observações
              </label>
              <Input
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Criar Assinatura</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetalhesDialog} onOpenChange={setShowDetalhesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Assinatura</DialogTitle>
          </DialogHeader>
          {selectedAssinatura && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Aluno</p>
                <p className="font-semibold">{selectedAssinatura.aluno_nome}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Plano</p>
                <p className="font-semibold">{selectedAssinatura.plano_nome}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor Mensal</p>
                <p className="font-semibold">
                  {formatCurrency(selectedAssinatura.valor_mensal)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                {getStatusBadge(selectedAssinatura.status)}
              </div>
              <div>
                <p className="text-sm text-gray-600">Método de Pagamento</p>
                <p className="font-semibold">
                  {selectedAssinatura.metodo_pagamento}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Período</p>
                <p className="font-semibold">
                  {formatDate(selectedAssinatura.data_inicio)}
                  {selectedAssinatura.data_fim &&
                    ` até ${formatDate(selectedAssinatura.data_fim)}`}
                </p>
              </div>
              {selectedAssinatura.observacoes && (
                <div>
                  <p className="text-sm text-gray-600">Observações</p>
                  <p className="text-sm">{selectedAssinatura.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
