"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CreditCard,
  Calendar,
  ArrowUpRight,
  FileText,
  Send,
  Plus,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import GraficoEvolucaoReceita from "@/components/financeiro/GraficoEvolucaoReceita";
import GraficoInadimplencia from "@/components/financeiro/GraficoInadimplencia";
import GraficoComparacaoUnidades from "@/components/financeiro/GraficoComparacaoUnidades";
import ProtegerRotaFinanceira from "@/components/financeiro/ProtegerRotaFinanceira";

interface ResumoFinanceiro {
  totalReceitasMes: number;
  totalDespesasMes: number;
  saldoMes: number;
  faturasPendentes: number;
  faturasPagas: number;
  faturasAtrasadas: number;
  totalAssinaturasAtivas: number;
  previsaoReceitaMesProximo: number;
}

interface FluxoCaixaItem {
  data: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

interface DadosInadimplencia {
  pagas: number;
  pendentes: number;
  vencidas: number;
  total: number;
}

interface DadosUnidade {
  unidade_id: string;
  nome: string;
  receita: number;
}

function DashboardFinanceiro() {
  const router = useRouter();
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [fluxoCaixa, setFluxoCaixa] = useState<FluxoCaixaItem[]>([]);
  const [inadimplencia, setInadimplencia] = useState<DadosInadimplencia | null>(
    null
  );
  const [comparacaoUnidades, setComparacaoUnidades] = useState<DadosUnidade[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [isProfessor, setIsProfessor] = useState(false);
  const [isFranqueado, setIsFranqueado] = useState(false);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todas");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setIsProfessor(user.tipo_usuario === "PROFESSOR");

      const isFranqueadoUser = user.perfis?.some(
        (p: any) =>
          (typeof p === "string" && p.toLowerCase() === "franqueado") ||
          (typeof p === "object" && p?.nome?.toLowerCase() === "franqueado")
      );
      setIsFranqueado(isFranqueadoUser);

      // Para franqueados, carregar lista de unidades
      if (isFranqueadoUser) {
        carregarUnidades();
      }

      // Para franqueados, não precisa de unidade_id específico (busca todas as unidades dele)
      // Para gerentes e recepcionistas, usa a unidade_id
      const unidadeParam = isFranqueadoUser ? "" : user.unidade_id || "";

      if (user.unidade_id) {
      } else if (!isFranqueadoUser) {
        console.warn("⚠️ Usuário sem unidade_id");
      }

      setUnidadeId(unidadeParam);
      carregarDados(unidadeParam, user.tipo_usuario);
    } else {
      console.error(" Dados do usuário não encontrados");
      setLoading(false);
    }
  }, []);

  const carregarUnidades = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades?pageSize=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const unidadesData = data.items || data;
        setUnidades(unidadesData);
      }
    } catch (error) {
      console.error(" Erro ao carregar unidades:", error);
    }
  };

  const carregarDados = async (unidadeId: string, tipoUsuario: string) => {
    try {
      const token = localStorage.getItem("token");

      // Carregar resumo financeiro
      const resumoUrl = `${process.env.NEXT_PUBLIC_API_URL}/dashboard-financeiro?unidade_id=${unidadeId}`;

      const resumoRes = await fetch(resumoUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resumoRes.ok) {
        const resumoData = await resumoRes.json();
        console.log("📊 [DASHBOARD-FRONTEND] Resumo recebido:", resumoData);
        setResumo(resumoData);
      } else {
        console.error(" Erro ao carregar resumo:", resumoRes.statusText);
      }

      // Carregar evolução de receita
      const evolucaoUrl = `${process.env.NEXT_PUBLIC_API_URL}/dashboard-financeiro/evolucao-receita?unidade_id=${unidadeId}&meses=6`;
      const evolucaoRes = await fetch(evolucaoUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (evolucaoRes.ok) {
        const evolucaoData = await evolucaoRes.json();
        setFluxoCaixa(evolucaoData);
      } else {
        console.error(" Erro ao carregar evolução:", evolucaoRes.statusText);
      }

      // Carregar inadimplência
      const inadimplenciaUrl = `${process.env.NEXT_PUBLIC_API_URL}/dashboard-financeiro/inadimplencia?unidade_id=${unidadeId}`;

      const inadimplenciaRes = await fetch(inadimplenciaUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (inadimplenciaRes.ok) {
        const inadimplenciaData = await inadimplenciaRes.json();
        console.log(
          "📊 [DASHBOARD-FRONTEND] Inadimplência recebida:",
          inadimplenciaData
        );
        setInadimplencia(inadimplenciaData);
      }

      // Carregar comparação de unidades (apenas para master/franqueado)
      if (tipoUsuario === "MASTER" || tipoUsuario === "FRANQUEADO") {
        const comparacaoUrl = `${process.env.NEXT_PUBLIC_API_URL}/dashboard-financeiro/comparacao-unidades`;

        const comparacaoRes = await fetch(comparacaoUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (comparacaoRes.ok) {
          const comparacaoData = await comparacaoRes.json();
          setComparacaoUnidades(comparacaoData);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error(" Erro ao carregar dados financeiros:", error);
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleCriarFatura = () => {
    router.push("/financeiro/vendas-online");
  };

  const handleRegistrarPagamento = () => {
    // TODO: Abrir modal de registro de pagamento manual
    alert(
      "Modal de Registro de Pagamento será implementado aqui.\n\nPor enquanto, vá em 'A Receber' e clique em 'Marcar como Pago' na fatura desejada."
    );
  };

  const handleGerarRelatorio = () => {
    // TODO: Gerar PDF do relatório financeiro
    alert(
      "Geração de Relatório PDF será implementado aqui.\n\nPor enquanto, vá em 'Extrato' e use o botão 'Exportar CSV'."
    );
  };

  const handleEnviarCobranca = () => {
    // TODO: Abrir modal para selecionar faturas e enviar por WhatsApp
    alert(
      "Envio de Cobrança por WhatsApp será implementado aqui.\n\nPor enquanto, vá em 'A Receber' e clique em 'Enviar Cobrança' na fatura desejada."
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Botão Voltar */}
      <Button
        onClick={() => router.push("/dashboard")}
        variant="outline"
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar ao Dashboard Principal
      </Button>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Financeiro
          </h1>
          <p className="text-gray-600 mt-1">
            Visão geral das finanças da unidade
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/financeiro/extrato")}
            variant="outline"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Ver Extrato
          </Button>
          <Button onClick={() => router.push("/financeiro/a-receber")}>
            <DollarSign className="mr-2 h-4 w-4" />
            Contas a Receber
          </Button>
        </div>
      </div>

      {/* Filtro de Unidade para Franqueados */}
      {isFranqueado && unidades.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Filtrar por Unidade:
              </label>
              <Select
                value={unidadeSelecionada}
                onValueChange={(value) => {
                  setUnidadeSelecionada(value);
                  const userData = localStorage.getItem("user");
                  if (userData) {
                    const user = JSON.parse(userData);
                    const unidadeParam = value === "todas" ? "" : value;
                    carregarDados(unidadeParam, user.tipo_usuario);
                  }
                }}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">📊 Todas as Unidades</SelectItem>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      🏢 {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Receitas do Mês */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Receitas do Mês
            </CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(resumo?.totalReceitasMes || 0))}
            </div>
            <p className="text-xs text-green-100 mt-1">
              {resumo?.faturasPagas || 0} faturas pagas
            </p>
          </CardContent>
        </Card>

        {/* Despesas do Mês */}
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Despesas do Mês
            </CardTitle>
            <TrendingDown className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(resumo?.totalDespesasMes || 0))}
            </div>
            <p className="text-xs text-red-100 mt-1">Despesas operacionais</p>
          </CardContent>
        </Card>

        {/* Saldo do Mês */}
        <Card
          className={`bg-gradient-to-br ${
            Number(resumo?.saldoMes || 0) >= 0
              ? "from-blue-500 to-blue-600"
              : "from-orange-500 to-orange-600"
          } text-white`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo do Mês</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(resumo?.saldoMes || 0))}
            </div>
            <p className="text-xs text-blue-100 mt-1">Receitas - Despesas</p>
          </CardContent>
        </Card>

        {/* Faturas Pendentes */}
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Faturas Pendentes
            </CardTitle>
            <AlertCircle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resumo?.faturasPendentes || 0}
            </div>
            <p className="text-xs text-yellow-100 mt-1">
              {resumo?.faturasAtrasadas || 0} em atraso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={handleCriarFatura}
              className="h-24 flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-6 w-6" />
              <span>Criar Fatura</span>
            </Button>
            <Button
              onClick={handleRegistrarPagamento}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span>Registrar Pagamento</span>
            </Button>
            <Button
              onClick={handleGerarRelatorio}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <FileText className="h-6 w-6 text-purple-600" />
              <span>Gerar Relatório</span>
            </Button>
            <Button
              onClick={handleEnviarCobranca}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <Send className="h-6 w-6 text-orange-600" />
              <span>Enviar Cobrança</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Evolução de Receita */}
        {fluxoCaixa.length > 0 && (
          <div className="lg:col-span-2">
            <GraficoEvolucaoReceita dados={fluxoCaixa} />
          </div>
        )}

        {/* Gráfico de Inadimplência */}
        {inadimplencia && <GraficoInadimplencia dados={inadimplencia} />}

        {/* Gráfico de Comparação de Unidades (apenas para master/franqueado) */}
        {!isProfessor && comparacaoUnidades.length > 0 && (
          <GraficoComparacaoUnidades dados={comparacaoUnidades} />
        )}
      </div>

      {/* Grid de Informações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assinaturas Ativas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Assinaturas e Previsões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Assinaturas Ativas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {resumo?.totalAssinaturasAtivas || 0}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Previsão Próximo Mês</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    Number(resumo?.previsaoReceitaMesProximo || 0)
                  )}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <Button
              onClick={() => router.push("/financeiro/assinaturas")}
              className="w-full"
              variant="outline"
            >
              Gerenciar Assinaturas
            </Button>
          </CardContent>
        </Card>

        {/* Resumo de Faturas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Resumo de Faturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">Pagas</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {resumo?.faturasPagas || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-sm text-gray-600">Pendentes</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">
                {resumo?.faturasPendentes || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm text-gray-600">Vencidas</span>
              </div>
              <span className="text-lg font-bold text-red-600">
                {resumo?.faturasAtrasadas || 0}
              </span>
            </div>
            <Button
              onClick={() => router.push("/financeiro/vendas")}
              className="w-full"
              variant="outline"
            >
              Ver Todas as Faturas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardFinanceiroPage() {
  return (
    <ProtegerRotaFinanceira requerPermissao="podeAcessarDashboardFinanceiro">
      <DashboardFinanceiro />
    </ProtegerRotaFinanceira>
  );
}
