"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ProtegerRotaFinanceira from "@/components/financeiro/ProtegerRotaFinanceira";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarData, formatarMoeda, dataAtualISO } from "@/lib/utils/dateUtils";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  ativo?: boolean;
  max_alunos?: number;
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
  dia_vencimento: number;
  observacoes?: string;
}

export default function Assinaturas() {
  const queryClient = useQueryClient();
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planosComContagem, setPlanosComContagem] = useState<
    Map<string, number>
  >(new Map());
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [isFranqueado, setIsFranqueado] = useState(false);
  const [filteredAssinaturas, setFilteredAssinaturas] = useState<Assinatura[]>(
    []
  );
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todas");
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [alunoSearchTerm, setAlunoSearchTerm] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ATIVA");
  const [showDialog, setShowDialog] = useState(false);
  const [showDetalhesDialog, setShowDetalhesDialog] = useState(false);
  const [selectedAssinatura, setSelectedAssinatura] =
    useState<Assinatura | null>(null);
  const [mensagemModal, setMensagemModal] = useState<{
    aberto: boolean;
    titulo: string;
    descricao: string;
    tipo: "sucesso" | "erro" | "confirmacao";
    onConfirm?: () => void;
  }>({
    aberto: false,
    titulo: "",
    descricao: "",
    tipo: "sucesso",
  });

  const [formData, setFormData] = useState({
    aluno_id: "",
    plano_id: "",
    unidade_id: "",
    data_inicio: dataAtualISO(),
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
        setPlanos(data);

        // Contar alunos ativos para cada plano
        const contagens = new Map<string, number>();
        for (const plano of data) {
          if (plano.max_alunos && plano.max_alunos > 0) {
            const count = assinaturas.filter(
              (a) => a.plano_id === plano.id && a.status === "ATIVA"
            ).length;
            contagens.set(plano.id, count);
          }
        }
        setPlanosComContagem(contagens);
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
        // A API também retorna paginado
        const alunosArray = alunosData.items || alunosData.data || alunosData;
        setAlunos(Array.isArray(alunosArray) ? alunosArray : []);
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setLoading(false);
    }
  };

  const mostrarMensagem = (
    titulo: string,
    descricao: string,
    tipo: "sucesso" | "erro" = "sucesso"
  ) => {
    setMensagemModal({
      aberto: true,
      titulo,
      descricao,
      tipo,
    });
  };

  const mostrarConfirmacao = (
    titulo: string,
    descricao: string,
    onConfirm: () => void
  ) => {
    setMensagemModal({
      aberto: true,
      titulo,
      descricao,
      tipo: "confirmacao",
      onConfirm,
    });
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

    if (processando) return; // Prevenir cliques múltiplos

    const userData = localStorage.getItem("user");
    const user = JSON.parse(userData || "{}");

    // Validar se unidade_id está presente
    if (!formData.unidade_id) {
      mostrarMensagem(
        "Atenção",
        "Por favor, selecione um aluno com unidade válida!",
        "erro"
      );
      return;
    }

    // Validar limite de alunos no plano
    const planoSelecionado = planos.find((p) => p.id === formData.plano_id);
    if (planoSelecionado?.max_alunos && planoSelecionado.max_alunos > 0) {
      const alunosAtivos = planosComContagem.get(formData.plano_id) || 0;
      if (alunosAtivos >= planoSelecionado.max_alunos) {
        mostrarMensagem(
          "Limite Atingido",
          `Este plano permite no máximo ${planoSelecionado.max_alunos} aluno(s). Já existem ${alunosAtivos} aluno(s) ativo(s) neste plano.`,
          "erro"
        );
        return;
      }
    }

    // Validar se a assinatura não estaria expirada
    if (planoSelecionado && formData.data_inicio) {
      const dataInicio = new Date(formData.data_inicio);
      const dataFim = new Date(dataInicio);

      // Buscar duracao_meses do plano (assumindo 1 mês = 30 dias)
      const duracaoMeses =
        planoSelecionado.tipo === "MENSAL"
          ? 1
          : planoSelecionado.tipo === "SEMESTRAL"
          ? 6
          : planoSelecionado.tipo === "ANUAL"
          ? 12
          : 1;

      dataFim.setMonth(dataFim.getMonth() + duracaoMeses);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      dataFim.setHours(0, 0, 0, 0);

      if (dataFim < hoje) {
        mostrarMensagem(
          "Data Inválida",
          `A assinatura terminaria em ${dataFim.toLocaleDateString(
            "pt-BR"
          )}, que já passou. Por favor, ajuste a data de início.`,
          "erro"
        );
        return;
      }
    }

    try {
      setProcessando(true);
      const token = localStorage.getItem("token");

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
        setShowDialog(false);
        resetForm();
        carregarDados();
        mostrarMensagem(
          "Sucesso!",
          "Assinatura criada com sucesso!",
          "sucesso"
        );
      } else {
        const errorData = await response.json();
        console.error(" Erro ao criar:", errorData);
        mostrarMensagem(
          "Erro",
          "Erro ao criar assinatura: " +
            (errorData.message || "Erro desconhecido"),
          "erro"
        );
      }
    } catch (error) {
      console.error("Erro ao criar assinatura:", error);
      mostrarMensagem("Erro", "Erro ao criar assinatura", "erro");
    } finally {
      setProcessando(false);
    }
  };

  const handleRenovar = async (id: string) => {
    if (processando) return; // Prevenir cliques múltiplos

    mostrarConfirmacao(
      "Renovar Assinatura",
      "Deseja renovar esta assinatura?",
      async () => {
        if (processando) return; // Prevenir cliques múltiplos

        try {
          setProcessando(true);
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
            carregarDados();
            queryClient.invalidateQueries({ queryKey: ["transacoes"] });
            mostrarMensagem(
              "Sucesso!",
              "Assinatura renovada com sucesso!",
              "sucesso"
            );
          } else {
            mostrarMensagem("Erro", "Erro ao renovar assinatura", "erro");
          }
        } catch (error) {
          console.error("Erro ao renovar assinatura:", error);
          mostrarMensagem("Erro", "Erro ao renovar assinatura", "erro");
        } finally {
          setProcessando(false);
        }
      }
    );
  };

  const handleCancelar = async (id: string) => {
    if (processando) return; // Prevenir cliques múltiplos

    mostrarConfirmacao(
      "Cancelar Assinatura",
      "Deseja realmente cancelar esta assinatura? Esta ação não pode ser desfeita.",
      async () => {
        if (processando) return; // Prevenir cliques múltiplos

        try {
          setProcessando(true);
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/financeiro/assinaturas/${id}/cancelar`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                motivo_cancelamento: "Cancelado pelo usuário",
              }),
            }
          );

          if (response.ok) {
            carregarDados();
            queryClient.invalidateQueries({ queryKey: ["transacoes"] });
            mostrarMensagem(
              "Sucesso!",
              "Assinatura cancelada com sucesso!",
              "sucesso"
            );
          } else {
            mostrarMensagem("Erro", "Erro ao cancelar assinatura", "erro");
          }
        } catch (error) {
          console.error("Erro ao cancelar assinatura:", error);
          mostrarMensagem("Erro", "Erro ao cancelar assinatura", "erro");
        } finally {
          setProcessando(false);
        }
      }
    );
  };

  const handlePausar = async (id: string) => {
    if (processando) return;

    mostrarConfirmacao(
      "Pausar Assinatura",
      "Deseja pausar esta assinatura? Não serão geradas faturas enquanto estiver pausada.",
      async () => {
        if (processando) return;

        try {
          setProcessando(true);
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/financeiro/assinaturas/${id}/pausar`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            carregarDados();
            queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
            mostrarMensagem(
              "Sucesso!",
              "Assinatura pausada com sucesso!",
              "sucesso"
            );
          } else {
            mostrarMensagem("Erro", "Erro ao pausar assinatura", "erro");
          }
        } catch (error) {
          console.error("Erro ao pausar assinatura:", error);
          mostrarMensagem("Erro", "Erro ao pausar assinatura", "erro");
        } finally {
          setProcessando(false);
        }
      }
    );
  };

  const handleReativar = async (id: string) => {
    if (processando) return;

    mostrarConfirmacao(
      "Reativar Assinatura",
      "Deseja reativar esta assinatura? As faturas voltarão a ser geradas.",
      async () => {
        if (processando) return;

        try {
          setProcessando(true);
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/financeiro/assinaturas/${id}/reativar`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            carregarDados();
            queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
            mostrarMensagem(
              "Sucesso!",
              "Assinatura reativada com sucesso!",
              "sucesso"
            );
          } else {
            mostrarMensagem("Erro", "Erro ao reativar assinatura", "erro");
          }
        } catch (error) {
          console.error("Erro ao reativar assinatura:", error);
          mostrarMensagem("Erro", "Erro ao reativar assinatura", "erro");
        } finally {
          setProcessando(false);
        }
      }
    );
  };

  const resetForm = () => {
    setFormData({
      aluno_id: "",
      plano_id: "",
      unidade_id: "",
      data_inicio: dataAtualISO(),
      metodo_pagamento: "PIX",
      dia_vencimento: "10",
      observacoes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      ATIVA: <Badge className="bg-green-100 text-green-800">✓ Ativa</Badge>,
      PAUSADA: (
        <Badge className="bg-yellow-100 text-yellow-800">⏸ Pausada</Badge>
      ),
      CANCELADA: <Badge className="bg-red-100 text-red-800">✗ Cancelada</Badge>,
      EXPIRADA: (
        <Badge className="bg-gray-100 text-gray-800">⏰ Expirada</Badge>
      ),
      INADIMPLENTE: (
        <Badge className="bg-orange-100 text-orange-800">⚠ Inadimplente</Badge>
      ),
    };
    return badges[status as keyof typeof badges] || null;
  };

  const calcularDiasParaVencimento = (dataFim: string): number => {
    const hoje = new Date();
    const vencimento = new Date(dataFim);
    const diffTime = vencimento.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getAlertaVencimento = (dataFim: string) => {
    const dias = calcularDiasParaVencimento(dataFim);

    if (dias < 0) {
      return (
        <span className="text-xs text-red-600 font-medium">
          ⚠️ Vencida há {Math.abs(dias)} dia(s)
        </span>
      );
    } else if (dias <= 7) {
      return (
        <span className="text-xs text-orange-600 font-medium">
          ⚡ Vence em {dias} dia(s)
        </span>
      );
    } else if (dias <= 15) {
      return (
        <span className="text-xs text-yellow-600">
          ⏰ Vence em {dias} dia(s)
        </span>
      );
    }
    return null;
  };

  // Removido - usando formatarMoeda do dateUtils

  // Removido - usando formatarData do dateUtils

  const totais = {
    ativas: assinaturas.filter((a) => a.status === "ATIVA").length,
    pausadas: assinaturas.filter((a) => a.status === "PAUSADA").length,
    canceladas: assinaturas.filter((a) => a.status === "CANCELADA").length,
    expiradas: assinaturas.filter((a) => a.status === "EXPIRADA").length,
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
                <p className="text-sm text-gray-600">Expiradas</p>
                <p className="text-2xl font-bold text-gray-600">
                  {totais.expiradas}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Receita Mensal</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatarMoeda(totais.receita)}
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
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500">
                      Início: {formatarData(assinatura.data_inicio)}
                      {assinatura.data_fim &&
                        ` • Fim: ${formatarData(assinatura.data_fim)}`}
                    </p>
                    {assinatura.data_fim &&
                      assinatura.status === "ATIVA" &&
                      getAlertaVencimento(assinatura.data_fim)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatarMoeda(assinatura.valor_mensal)}
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
                      title="Ver Detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {assinatura.status === "ATIVA" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRenovar(assinatura.id)}
                          disabled={processando}
                          title="Renovar Assinatura"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${
                              processando ? "animate-spin" : ""
                            }`}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePausar(assinatura.id)}
                          disabled={processando}
                          title="Pausar Assinatura"
                        >
                          <PauseCircle className="h-4 w-4 text-orange-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelar(assinatura.id)}
                          disabled={processando}
                          title="Cancelar Assinatura"
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                    {assinatura.status === "PAUSADA" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReativar(assinatura.id)}
                        disabled={processando}
                        title="Reativar Assinatura"
                      >
                        <RefreshCw className="h-4 w-4 text-green-600" />
                      </Button>
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
                onChange={(e) => {
                  setAlunoSearchTerm(e.target.value);
                  setAlunoSelecionado(null);
                }}
              />
              {alunoSelecionado && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-green-900">
                        ✓{" "}
                        {alunoSelecionado.nome_completo ||
                          alunoSelecionado.nome}
                      </div>
                      {alunoSelecionado.cpf && (
                        <div className="text-sm text-green-700">
                          CPF: {alunoSelecionado.cpf}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAlunoSelecionado(null);
                        setFormData({ ...formData, aluno_id: "" });
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
              {alunoSearchTerm && !alunoSelecionado && (
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
                          setAlunoSelecionado(aluno);
                          setAlunoSearchTerm("");
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
                    .map((plano) => {
                      const alunosAtivos = planosComContagem.get(plano.id) || 0;
                      const limiteAtingido = !!(
                        plano.max_alunos &&
                        plano.max_alunos > 0 &&
                        alunosAtivos >= plano.max_alunos
                      );

                      return (
                        <SelectItem
                          key={plano.id}
                          value={plano.id}
                          disabled={limiteAtingido}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>
                              {plano.nome} - {formatarMoeda(plano.valor)}
                            </span>
                            {plano.max_alunos && plano.max_alunos > 0 && (
                              <span
                                className={`ml-2 text-xs ${
                                  limiteAtingido
                                    ? "text-red-600 font-semibold"
                                    : "text-gray-500"
                                }`}
                              >
                                ({alunosAtivos}/{plano.max_alunos} alunos)
                                {limiteAtingido && " - COMPLETO"}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              {formData.plano_id &&
                (() => {
                  const planoSelecionado = planos.find(
                    (p) => p.id === formData.plano_id
                  );
                  if (
                    planoSelecionado?.max_alunos &&
                    planoSelecionado.max_alunos > 0
                  ) {
                    const alunosAtivos =
                      planosComContagem.get(formData.plano_id) || 0;
                    const vagasRestantes =
                      planoSelecionado.max_alunos - alunosAtivos;
                    return (
                      <p
                        className={`text-xs mt-1 ${
                          vagasRestantes === 0
                            ? "text-red-600"
                            : vagasRestantes <= 2
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      >
                        {vagasRestantes > 0
                          ? `✓ ${vagasRestantes} vaga(s) disponível(is)`
                          : "✗ Plano completo - sem vagas disponíveis"}
                      </p>
                    );
                  }
                  return null;
                })()}
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
                disabled={processando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={processando}>
                {processando ? "Criando..." : "Criar Assinatura"}
              </Button>
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
                  {formatarMoeda(selectedAssinatura.valor_mensal)}
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
                <p className="text-sm text-gray-600">Dia do Vencimento</p>
                <p className="font-semibold">
                  Dia {selectedAssinatura.dia_vencimento} de cada mês
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Período</p>
                <p className="font-semibold">
                  {formatarData(selectedAssinatura.data_inicio)}
                  {selectedAssinatura.data_fim &&
                    ` até ${formatarData(selectedAssinatura.data_fim)}`}
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

      {/* Modal de Mensagem */}
      <AlertDialog
        open={mensagemModal.aberto}
        onOpenChange={(aberto) =>
          setMensagemModal({ ...mensagemModal, aberto })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{mensagemModal.titulo}</AlertDialogTitle>
            <AlertDialogDescription>
              {mensagemModal.descricao}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {mensagemModal.tipo === "confirmacao" ? (
              <>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    mensagemModal.onConfirm?.();
                    setMensagemModal({ ...mensagemModal, aberto: false });
                  }}
                >
                  Confirmar
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={() =>
                  setMensagemModal({ ...mensagemModal, aberto: false })
                }
              >
                OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
