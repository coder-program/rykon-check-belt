"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Calculator,
  Receipt,
  Split,
  CreditCard as CreditCardIcon,
  DollarSign,
  Landmark,
  FileText
} from "lucide-react";
import { toast } from "react-hot-toast";
import FiltroUnidade from "@/components/financeiro/FiltroUnidade";
import { useFiltroUnidade } from "@/hooks/useFiltroUnidade";

interface PaytimePlan {
  id: number;
  name: string;
  gateway_id: number;
  active: boolean;
  type: string;
  modality: string;
  allow_anticipation?: boolean;
  days_anticipation?: number;
}

interface SelectedPlan {
  id: number;
  active: boolean;
  name: string;
}

interface BankAccount {
  id: string;
  banco_codigo: string;
  banco_nome: string;
  agencia: string;
  agencia_digito?: string;
  conta: string;
  conta_digito: string;
  tipo: "CORRENTE" | "POUPANCA";
  titular_nome: string;
  titular_cpf_cnpj: string;
  principal: boolean;
  ativo: boolean;
}

interface Contract {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: string;
  versao: string;
  status: string;
  assinado: boolean;
  data_assinatura?: string;
  data_inicio: string;
  data_fim?: string;
  valor_mensal?: number;
  taxa_transacao?: number;
}

interface SplitRule {
  id: string;
  nome: string;
  tipo: "PERCENTUAL" | "FIXO";
  valor: number;
  conta_destino_id: string;
  ativo: boolean;
}

export default function ConfiguracaoRykonPay() {
  const {
    isFranqueado,
    unidades,
    unidadeSelecionada,
    unidadeIdAtual,
    setUnidadeSelecionada,
  } = useFiltroUnidade();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<PaytimePlan[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<SelectedPlan[]>([]);
  const [unidadeNome, setUnidadeNome] = useState<string>("");
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Simulador
  const [valorSimulacao, setValorSimulacao] = useState("");
  const [planoSelecionadoSim, setPlanoSelecionadoSim] = useState("");
  const [parcelasSim, setParcelasSim] = useState("1");
  const [resultadoSimulacao, setResultadoSimulacao] = useState<{
    valorOriginal: number;
    bandeira: string;
    planoNome: string;
    parcelas: number;
    taxas: {
      pix?: { taxa: number; valorLiquido: number; };
      debito?: { taxa: number; valorLiquido: number; };
      credito?: { taxa: number; valorLiquido: number; };
      parcelado?: { taxa: number; valorLiquido: number; valorParcela: number; };
    };
  } | null>(null);

  // Contas bancárias
  const [contasBancarias, setContasBancarias] = useState<BankAccount[]>([]);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [bankAccountFormData, setBankAccountFormData] = useState({
    banco_codigo: "",
    banco_nome: "",
    agencia: "",
    agencia_digito: "",
    conta: "",
    conta_digito: "",
    tipo: "CORRENTE" as "CORRENTE" | "POUPANCA",
    titular_nome: "",
    titular_cpf_cnpj: "",
    principal: false,
  });

  // Contrato
  const [contrato, setContrato] = useState<Contract | null>(null);
  const [loadingContract, setLoadingContract] = useState(false);

  // Regras de split
  const [splitRules, setSplitRules] = useState<SplitRule[]>([]);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [editingSplit, setEditingSplit] = useState<SplitRule | null>(null);
  const [splitFormData, setSplitFormData] = useState({
    nome: "",
    tipo: "PERCENTUAL" as "PERCENTUAL" | "FIXO",
    valor: 0,
    conta_destino_id: "",
    description: "",
  });
  const [showDeleteSplitModal, setShowDeleteSplitModal] = useState(false);
  const [deletingSplitId, setDeletingSplitId] = useState<string | null>(null);

  // Maquininha
  const [maquininhaIntegrada, setMaquininhaIntegrada] = useState(false);

  // Limites de transação
  const [transactionLimits, setTransactionLimits] = useState({
    daily_limit: 50000.00,
    transaction_limit: 5000.00,
    monthly_transactions: 300,
    chargeback_limit: 5,
  });

  useEffect(() => {
    if (unidadeIdAtual) {
      console.log("🔄 Carregando dados para unidade:", unidadeIdAtual);
      carregarDados();
    } else {
      console.log("⏸️ Aguardando seleção de unidade...");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeIdAtual]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      console.log("🔑 Token:", token ? "Presente" : "Ausente");
      console.log("🌐 API URL:", process.env.NEXT_PUBLIC_API_URL);

      // Buscar planos disponíveis na API Paytime (filtrar apenas SubPaytime - gateway_id = 4)
      console.log("📋 Buscando planos disponíveis...");
      const plansResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/plans?filters=${encodeURIComponent(JSON.stringify({ gateway_id: 4, active: true }))}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("📋 Resposta planos:", plansResponse.status);
      
      if (!plansResponse.ok) {
        throw new Error(`Erro ao buscar planos disponíveis: ${plansResponse.status}`);
      }

      const plansData = await plansResponse.json();
      console.log("📋 Planos carregados:", plansData.data?.length || 0);
      
      setAvailablePlans(plansData.data || []);

      // Buscar planos selecionados da unidade
      console.log("✅ Buscando planos selecionados da unidade...");
      const selectedResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/unidades/${unidadeIdAtual}/plans`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Resposta planos selecionados:", selectedResponse.status);
      
      if (selectedResponse.ok) {
        const selectedData = await selectedResponse.json();
        console.log("✅ Planos selecionados:", selectedData?.length || 0);
        setSelectedPlans(selectedData || []);
      } else {
        console.warn("⚠️ Erro ao buscar planos selecionados:", selectedResponse.status);
      }

      // Buscar informações da unidade para verificar establishment_id
      console.log("🏢 Buscando informações da unidade...");
      const unidadeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades/${unidadeIdAtual}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("🏢 Resposta unidade:", unidadeResponse.status);
      
      let unidadeData = null;
      
      if (unidadeResponse.ok) {
        unidadeData = await unidadeResponse.json();
        console.log("🏢 Dados da unidade:", unidadeData);
        
        setUnidadeNome(unidadeData.nome || "Unidade");
        
        // Verifica se existe e não é null/undefined
        if (unidadeData.paytime_establishment_id) {
          console.log("✅ Establishment ID encontrado:", unidadeData.paytime_establishment_id);
          setEstablishmentId(unidadeData.paytime_establishment_id);
        } else {
          console.warn("⚠️ Unidade não possui paytime_establishment_id configurado");
          setEstablishmentId(null);
        }
        
        setMaquininhaIntegrada(unidadeData.maquininha_habilitada || false);
      } else {
        console.warn("⚠️ Erro ao buscar dados da unidade:", unidadeResponse.status);
        setEstablishmentId(null);
      }

      // Buscar limites de transação da unidade
      console.log("💳 Buscando limites de transação...");
      const limitsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades/${unidadeIdAtual}/transaction-limits`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json();
        console.log("💳 Limites carregados:", limitsData.limits);
        setTransactionLimits(limitsData.limits);
      } else {
        console.warn("⚠️ Erro ao buscar limites:", limitsResponse.status);
        // Mantém valores padrão já definidos no useState
      }

      // Buscar regras de split se tiver establishment_id
      if (unidadeData?.paytime_establishment_id) {
        console.log("💰 Buscando regras de split...");
        const splitsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${unidadeData.paytime_establishment_id}/splits`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (splitsResponse.ok) {
          const splitsData = await splitsResponse.json();
          console.log("💰 Splits carregados:", splitsData.data?.length || 0);
          
          // Mapear dados da API para o formato esperado pelo frontend
          const mappedSplits = (splitsData.data || []).map((split: any) => ({
            id: split.id,
            nome: split.name,
            tipo: "PERCENTUAL", // A API Paytime usa percentual
            valor: split.percentage || 0,
            conta_destino_id: split.establishments?.[0]?.establishment_id?.toString() || "",
            ativo: split.active !== false,
            description: split.description,
          }));
          
          setSplitRules(mappedSplits);
        } else {
          console.warn("⚠️ Erro ao buscar splits:", splitsResponse.status);
          setSplitRules([]);
        }
      } else {
        console.warn("⚠️ Unidade sem establishment_id, não é possível buscar splits");
        setSplitRules([]);
      }

      // Buscar contas bancárias
      console.log("💳 Buscando contas bancárias...");
      const contasResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/contas-bancarias?unidadeId=${unidadeIdAtual}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (contasResponse.ok) {
        const contasData = await contasResponse.json();
        console.log("💳 Contas carregadas:", contasData.length);
        setContasBancarias(contasData);
      } else {
        console.warn("⚠️ Erro ao buscar contas bancárias:", contasResponse.status);
        setContasBancarias([]);
      }

      // Buscar contrato ativo da unidade
      console.log("📄 Buscando contrato...");
      const contratoResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/contratos/unidade/${unidadeIdAtual}?tipo=rykon-pay`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (contratoResponse.ok) {
        const contratoData = await contratoResponse.json();
        console.log("📄 Contrato carregado:", contratoData.id);
        setContrato(contratoData);
      } else {
        console.warn("⚠️ Erro ao buscar contrato:", contratoResponse.status);
        setContrato(null);
      }

    } catch (error: unknown) {
      console.error("❌ Erro ao carregar dados:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao carregar configurações";
      toast.error(errorMessage);
      // Mesmo com erro, permite continuar
      setEstablishmentId(null);
    } finally {
      console.log("✅ Carregamento finalizado");
      setLoading(false);
    }
  };

  const isPlanSelected = (planId: number): boolean => {
    return selectedPlans.some(p => p.id === planId && p.active);
  };

  const handleTogglePlan = (plan: PaytimePlan) => {
    setHasChanges(true);
    
    if (isPlanSelected(plan.id)) {
      // Remover plano
      setSelectedPlans(prev => prev.filter(p => p.id !== plan.id));
    } else {
      // Adicionar plano
      setSelectedPlans(prev => [
        ...prev,
        { id: plan.id, active: true, name: plan.name }
      ]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/unidades/${unidadeIdAtual}/plans`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plans: selectedPlans }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao salvar planos");
      }

      toast.success("✅ Planos salvos com sucesso!");
      setHasChanges(false);
      await carregarDados();

    } catch (error: unknown) {
      console.error("Erro ao salvar planos:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao salvar planos";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const calcularTaxas = async () => {
    const valor = parseFloat(valorSimulacao);
    const parcelas = parseInt(parcelasSim);
    
    console.log("💰 SIMULADOR - Dados de entrada:");
    console.log("   - Valor:", valor);
    console.log("   - Parcelas:", parcelas);
    console.log("   - Plano selecionado ID:", planoSelecionadoSim);
    
    if (!valor || valor <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    if (!planoSelecionadoSim) {
      toast.error("⚠️ Selecione um plano para simular");
      return;
    }

    try {
      // Buscar os detalhes do plano com as taxas
      const token = localStorage.getItem("token");
      const loadingToast = toast.loading("🔄 Buscando taxas do plano...");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/plans/${planoSelecionadoSim}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.dismiss(loadingToast);

      if (!response.ok) {
        throw new Error("Erro ao buscar detalhes do plano");
      }

      const planDetails = await response.json();
      console.log("📋 Detalhes do plano:", planDetails);

      // Verificar se o plano tem flags (bandeiras) com taxas configuradas
      if (!planDetails.flags || planDetails.flags.length === 0) {
        toast.error("⚠️ Plano sem taxas configuradas. Entre em contato com o suporte.");
        return;
      }

      // Usar a primeira bandeira ativa como padrão (geralmente MASTERCARD ou VISA)
      const bandeiraAtiva = planDetails.flags.find((f: any) => f.active) || planDetails.flags[0];
      
      if (!bandeiraAtiva.fees) {
        toast.error("⚠️ Taxas não disponíveis para este plano.");
        return;
      }

      const taxas = bandeiraAtiva.fees;
      console.log("✅ Usando taxas da bandeira:", bandeiraAtiva.name, taxas);
      
      // Calcular valores
      const taxaDebito = taxas.debit || 0;
      const taxaCreditoVista = taxas.credit?.["1x"] || 0;
      const taxaCreditoParcelado = taxas.credit?.[`${parcelas}x`] || taxaCreditoVista;
      const taxaPix = taxas.pix || 0;
      
      const valorDebito = valor - (valor * taxaDebito / 100);
      const valorCredito = valor - (valor * taxaCreditoVista / 100);
      const valorCreditoParcelado = valor - (valor * taxaCreditoParcelado / 100);
      const valorParcela = valorCreditoParcelado / parcelas;
      const valorPix = valor - (valor * taxaPix / 100);

      console.log("💰 Resultado da simulação:");
      console.log("   - PIX: R$", valorPix.toFixed(2), `(taxa ${taxaPix}%)`);
      console.log("   - Débito: R$", valorDebito.toFixed(2), `(taxa ${taxaDebito}%)`);
      console.log("   - Crédito: R$", valorCredito.toFixed(2), `(taxa ${taxaCreditoVista}%)`);
      console.log("   - Parcelado:", `${parcelas}x R$ ${valorParcela.toFixed(2)}`, `(taxa ${taxaCreditoParcelado}%)`);

      // Encontrar o nome do plano
      const planoNome = selectedPlans.find(p => p.id.toString() === planoSelecionadoSim)?.name || "Plano";

      // Salvar resultados no estado
      const resultados: any = {
        valorOriginal: valor,
        bandeira: bandeiraAtiva.name,
        planoNome: planoNome,
        parcelas: parcelas,
        taxas: {}
      };

      if (taxaPix > 0) {
        resultados.taxas.pix = { taxa: taxaPix, valorLiquido: valorPix };
      }
      
      if (taxaDebito > 0) {
        resultados.taxas.debito = { taxa: taxaDebito, valorLiquido: valorDebito };
      }
      
      if (taxaCreditoVista > 0) {
        resultados.taxas.credito = { taxa: taxaCreditoVista, valorLiquido: valorCredito };
      }
      
      if (parcelas > 1 && taxaCreditoParcelado > 0) {
        resultados.taxas.parcelado = { 
          taxa: taxaCreditoParcelado, 
          valorLiquido: valorCreditoParcelado,
          valorParcela: valorParcela
        };
      }

      setResultadoSimulacao(resultados);
      toast.success("✅ Simulação calculada com sucesso!", { duration: 3000 });

    } catch (error) {
      console.error("❌ Erro ao calcular taxas:", error);
      toast.error("Erro ao buscar taxas do plano. Tente novamente.");
    }
  };

  const getPlanTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      COMMERCIAL: "bg-blue-100 text-blue-800 border-blue-300",
      TECHNICAL: "bg-purple-100 text-purple-800 border-purple-300",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  // ========== FUNÇÕES DE CONTAS BANCÁRIAS ==========
  
  const handleAddBankAccount = () => {
    setBankAccountFormData({
      banco_codigo: "",
      banco_nome: "",
      agencia: "",
      agencia_digito: "",
      conta: "",
      conta_digito: "",
      tipo: "CORRENTE",
      titular_nome: unidadeNome,
      titular_cpf_cnpj: "",
      principal: contasBancarias.length === 0, // Primeira conta é principal
    });
    setEditingBankAccount(null);
    setShowBankAccountModal(true);
  };

  const handleEditBankAccount = (conta: BankAccount) => {
    setEditingBankAccount(conta);
    setBankAccountFormData({
      banco_codigo: conta.banco_codigo,
      banco_nome: conta.banco_nome,
      agencia: conta.agencia,
      agencia_digito: conta.agencia_digito || "",
      conta: conta.conta,
      conta_digito: conta.conta_digito,
      tipo: conta.tipo,
      titular_nome: conta.titular_nome,
      titular_cpf_cnpj: conta.titular_cpf_cnpj,
      principal: conta.principal,
    });
    setShowBankAccountModal(true);
  };

  const handleSaveBankAccount = async () => {
    try {
      // Validações básicas
      if (!bankAccountFormData.banco_codigo || !bankAccountFormData.banco_nome || 
          !bankAccountFormData.agencia || !bankAccountFormData.conta || 
          !bankAccountFormData.conta_digito || !bankAccountFormData.titular_nome || 
          !bankAccountFormData.titular_cpf_cnpj) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      setSaving(true);
      const token = localStorage.getItem("token");
      
      const url = editingBankAccount
        ? `${process.env.NEXT_PUBLIC_API_URL}/financeiro/contas-bancarias/${editingBankAccount.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/financeiro/contas-bancarias`;
      
      const method = editingBankAccount ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...bankAccountFormData,
          unidadeId: unidadeIdAtual,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao salvar conta");
      }

      toast.success(editingBankAccount ? "Conta atualizada!" : "Conta criada!");
      setShowBankAccountModal(false);
      carregarDados();
    } catch (error: any) {
      console.error("Erro ao salvar conta:", error);
      toast.error(error.message || "Erro ao salvar conta");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta conta?")) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/contas-bancarias/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao remover conta");
      }

      toast.success("Conta removida!");
      carregarDados();
    } catch (error) {
      console.error("Erro ao remover conta:", error);
      toast.error("Erro ao remover conta");
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrincipalAccount = async (id: string) => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/contas-bancarias/${id}/set-principal`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao definir conta principal");
      }

      toast.success("Conta principal atualizada!");
      carregarDados();
    } catch (error) {
      console.error("Erro ao definir conta principal:", error);
      toast.error("Erro ao definir conta principal");
    } finally {
      setSaving(false);
    }
  };

  // ========== FUNÇÕES DE CONTRATO ==========
  
  const handleDownloadContract = async () => {
    if (!contrato) return;

    try {
      setLoadingContract(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/contratos/${contrato.id}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao gerar PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrato-rykon-pay-${contrato.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao baixar PDF:", error);
      toast.error("Erro ao gerar PDF do contrato");
    } finally {
      setLoadingContract(false);
    }
  };

  // ========== FUNÇÕES DE SPLIT ==========

  const handleEditSplit = (split: SplitRule) => {
    setEditingSplit(split);
    setSplitFormData({
      nome: split.nome,
      tipo: split.tipo,
      valor: split.valor,
      conta_destino_id: split.conta_destino_id,
      description: "",
    });
    setShowSplitModal(true);
  };

  const handleSaveSplit = async () => {
    if (!establishmentId) {
      toast.error("⚠️ Esta unidade não possui establishment_id configurado");
      return;
    }

    if (!splitFormData.nome.trim()) {
      toast.error("Digite um nome para a regra");
      return;
    }

    if (splitFormData.valor <= 0 || splitFormData.valor > 100) {
      toast.error("O percentual deve estar entre 1 e 100");
      return;
    }

    // Validar se a soma dos percentuais não excede 100%
    const somaPercentuais = splitRules
      .filter(r => r.id !== editingSplit?.id && r.tipo === "PERCENTUAL" && r.ativo)
      .reduce((sum, r) => sum + r.valor, 0) + splitFormData.valor;

    if (splitFormData.tipo === "PERCENTUAL" && somaPercentuais > 100) {
      toast.error(`⚠️ A soma dos percentuais ativos (${somaPercentuais}%) não pode exceder 100%`);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const isEditing = !!editingSplit;

      const payload = {
        name: splitFormData.nome,
        description: splitFormData.description,
        percentage: splitFormData.valor,
        establishments: [
          {
            establishment_id: parseInt(splitFormData.conta_destino_id || establishmentId),
            percentage: splitFormData.valor,
          },
        ],
      };

      const url = isEditing
        ? `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/splits/${editingSplit.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/splits`;

      const method = isEditing ? "PUT" : "POST";

      const loadingToast = toast.loading(isEditing ? "Atualizando split..." : "Criando split...");

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      toast.dismiss(loadingToast);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao salvar split");
      }

      toast.success(isEditing ? "✅ Split atualizado com sucesso!" : "✅ Split criado com sucesso!");
      setShowSplitModal(false);
      await carregarDados();
    } catch (error: unknown) {
      console.error("Erro ao salvar split:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao salvar split";
      toast.error(errorMessage);
    }
  };

  const handleToggleSplit = async (splitId: string, ativo: boolean) => {
    if (!establishmentId) return;

    try {
      const token = localStorage.getItem("token");
      const split = splitRules.find(r => r.id === splitId);
      
      if (!split) return;

      // Se estiver ativando, validar soma de percentuais
      if (ativo && split.tipo === "PERCENTUAL") {
        const somaPercentuais = splitRules
          .filter(r => r.id !== splitId && r.tipo === "PERCENTUAL" && r.ativo)
          .reduce((sum, r) => sum + r.valor, 0) + split.valor;

        if (somaPercentuais > 100) {
          toast.error(`⚠️ A soma dos percentuais ativos (${somaPercentuais}%) não pode exceder 100%`);
          return;
        }
      }

      const payload = {
        name: split.nome,
        percentage: split.valor,
        active: ativo,
        establishments: [
          {
            establishment_id: parseInt(split.conta_destino_id || establishmentId),
            percentage: split.valor,
          },
        ],
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/splits/${splitId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao atualizar status do split");
      }

      toast.success(ativo ? "✅ Split ativado" : "⚠️ Split desativado");
      await carregarDados();
    } catch (error) {
      console.error("Erro ao atualizar split:", error);
      toast.error("Erro ao atualizar status do split");
    }
  };

  const handleDeleteSplit = async () => {
    if (!establishmentId || !deletingSplitId) return;

    try {
      const token = localStorage.getItem("token");
      const loadingToast = toast.loading("Excluindo split...");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/splits/${deletingSplitId}/delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.dismiss(loadingToast);

      if (!response.ok) {
        throw new Error("Erro ao excluir split");
      }

      toast.success("🗑️ Split excluído com sucesso!");
      setShowDeleteSplitModal(false);
      setDeletingSplitId(null);
      await carregarDados();
    } catch (error) {
      console.error("Erro ao excluir split:", error);
      toast.error("Erro ao excluir split");
    }
  };

  const getModalityBadge = (modality: string) => {
    const colors: Record<string, string> = {
      ONLINE: "bg-green-100 text-green-800 border-green-300",
      OFFLINE: "bg-orange-100 text-orange-800 border-orange-300",
    };
    return colors[modality] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Carregando configurações do Rykon-Pay...</p>
          <p className="mt-2 text-xs text-gray-500">Unidade: {unidadeNome}</p>
        </div>
      </div>
    );
  }

  // UI: Aguardando seleção de unidade (para franqueados)
  if (isFranqueado && !unidadeIdAtual) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configuração Rykon-Pay</h1>
            <p className="text-muted-foreground mt-1">
              Configure os planos comerciais e integrações do Rykon-Pay
            </p>
          </div>
        </div>

        <FiltroUnidade
          unidades={unidades}
          unidadeSelecionada={unidadeSelecionada}
          onUnidadeChange={setUnidadeSelecionada}
          isFranqueado={isFranqueado}
        />

        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-blue-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Selecione uma unidade</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha uma unidade acima para visualizar e configurar o Rykon-Pay
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!establishmentId) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <CardTitle className="text-yellow-900">
                Estabelecimento Rykon-Pay não configurado
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-yellow-700">
              A unidade <strong>{unidadeNome}</strong> ainda não possui um estabelecimento Rykon-Pay vinculado.
            </p>
            
            <div className="bg-white p-4 rounded border border-yellow-300">
              <h3 className="font-semibold text-gray-900 mb-2">📋 Informações de Debug:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Unidade ID: <code className="bg-gray-100 px-2 py-1 rounded">{unidadeIdAtual || "Não encontrado"}</code></li>
                <li>• Nome da Unidade: <code className="bg-gray-100 px-2 py-1 rounded">{unidadeNome}</code></li>
                <li>• Establishment ID: <code className="bg-gray-100 px-2 py-1 rounded">{establishmentId || "NULL"}</code></li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded border border-blue-300">
              <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Como configurar:</h3>
              <ol className="text-sm text-blue-800 space-y-1 ml-4">
                <li>1. Verifique se o usuário tem uma unidade vinculada</li>
                <li>2. Configure o <code>paytime_establishment_id</code> na tabela <code>unidades</code></li>
                <li>3. Esse ID é fornecido pela API Rykon-Pay após cadastro do estabelecimento</li>
              </ol>
            </div>

            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="w-full"
            >
              🔄 Recarregar Página
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ⚙️ Configuração Rykon-Pay
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie planos, taxas, contas e configurações de pagamento
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      {/* Filtro de unidade (apenas para franqueados) */}
      {isFranqueado && (
        <FiltroUnidade
          unidades={unidades}
          unidadeSelecionada={unidadeSelecionada}
          onUnidadeChange={setUnidadeSelecionada}
          isFranqueado={isFranqueado}
        />
      )}

      {/* Informações da Unidade */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Unidade Atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Nome:</span>
            <span className="text-gray-900">{unidadeNome}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Establishment ID:</span>
            <Badge className="bg-blue-600">{establishmentId}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Planos Selecionados:</span>
            <Badge className="bg-green-600">{selectedPlans.length}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para organizar funcionalidades */}
      <Tabs defaultValue="planos" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="planos">
            <CreditCardIcon className="h-4 w-4 mr-2" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="simulador">
            <Calculator className="h-4 w-4 mr-2" />
            Simulador
          </TabsTrigger>
          <TabsTrigger value="comprovante">
            <Receipt className="h-4 w-4 mr-2" />
            Comprovante
          </TabsTrigger>
          <TabsTrigger value="split">
            <Split className="h-4 w-4 mr-2" />
            Split
          </TabsTrigger>
          <TabsTrigger value="limites">
            <DollarSign className="h-4 w-4 mr-2" />
            Limites
          </TabsTrigger>
          <TabsTrigger value="contas">
            <Landmark className="h-4 w-4 mr-2" />
            Contas
          </TabsTrigger>
          <TabsTrigger value="contrato">
            <FileText className="h-4 w-4 mr-2" />
            Contrato
          </TabsTrigger>
        </TabsList>

        {/* Tab: Planos Comerciais */}
        <TabsContent value="planos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                💳 Planos Comerciais Rykon-Pay
                <Badge variant="outline">{availablePlans.length} disponíveis</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Selecione os planos comerciais que serão utilizados para processar pagamentos nesta unidade.
                Cada plano possui diferentes taxas e condições de processamento.
              </p>
            </CardHeader>
            <CardContent>
              {availablePlans.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                  <p>Nenhum plano comercial disponível</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availablePlans.map((plan, index) => {
                    const isSelected = isPlanSelected(plan.id);
                    
                    return (
                      <div
                        key={`plan-${plan.id}-${index}`}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? "border-green-500 bg-green-50 shadow-md"
                            : "border-gray-200 hover:border-blue-300 hover:shadow"
                        }`}
                        onClick={() => handleTogglePlan(plan)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleTogglePlan(plan)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              )}
                              <h3 className="font-semibold text-gray-900">
                                {plan.name}
                              </h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge 
                                variant="outline" 
                                className={getPlanTypeBadge(plan.type)}
                              >
                                {plan.type}
                              </Badge>
                              <Badge 
                                variant="outline"
                                className={getModalityBadge(plan.modality)}
                              >
                                {plan.modality}
                              </Badge>
                              <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                                ID: {plan.id}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planos Selecionados - Resumo */}
          {selectedPlans.length > 0 && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Planos Selecionados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedPlans.map((plan, index) => (
                    <Badge 
                      key={`selected-${plan.id}-${index}`}
                      className="bg-green-600 text-white py-2 px-3"
                    >
                      {plan.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Simulador de Vendas */}
        <TabsContent value="simulador" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Simulador de Taxas
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Simule o valor líquido que você receberá após as taxas do Rykon-Pay
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="valor">Valor da Venda (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    placeholder="100.00"
                    value={valorSimulacao}
                    onChange={(e) => setValorSimulacao(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="plano">Plano Comercial</Label>
                  <select
                    id="plano"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
                    value={planoSelecionadoSim}
                    onChange={(e) => setPlanoSelecionadoSim(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {selectedPlans.map((plan, index) => (
                      <option key={`sim-${plan.id}-${index}`} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="parcelas">Parcelas</Label>
                  <Input
                    id="parcelas"
                    type="number"
                    min="1"
                    max="12"
                    value={parcelasSim}
                    onChange={(e) => setParcelasSim(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={calcularTaxas} className="w-full">
                <Calculator className="h-4 w-4 mr-2" />
                Calcular Taxas
              </Button>

              {/* Resultado da Simulação */}
              {resultadoSimulacao && (
                <div className="mt-6 space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-blue-900">📊 Resultado da Simulação</h3>
                        <p className="text-sm text-blue-700">
                          Valor: R$ {resultadoSimulacao.valorOriginal.toFixed(2)} • {resultadoSimulacao.planoNome} • {resultadoSimulacao.bandeira}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setResultadoSimulacao(null)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* PIX */}
                      {resultadoSimulacao.taxas.pix && (
                        <div className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-medium">PIX</p>
                              <p className="text-xs text-purple-600">Taxa {resultadoSimulacao.taxas.pix.taxa}%</p>
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-purple-900">
                            R$ {resultadoSimulacao.taxas.pix.valorLiquido.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Valor líquido</p>
                        </div>
                      )}

                      {/* Débito */}
                      {resultadoSimulacao.taxas.debito && (
                        <div className="bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <CreditCardIcon className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-medium">Débito</p>
                              <p className="text-xs text-green-600">Taxa {resultadoSimulacao.taxas.debito.taxa}%</p>
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-green-900">
                            R$ {resultadoSimulacao.taxas.debito.valorLiquido.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Valor líquido</p>
                        </div>
                      )}

                      {/* Crédito à vista */}
                      {resultadoSimulacao.taxas.credito && (
                        <div className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <CreditCardIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-medium">Crédito à vista</p>
                              <p className="text-xs text-blue-600">Taxa {resultadoSimulacao.taxas.credito.taxa}%</p>
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-blue-900">
                            R$ {resultadoSimulacao.taxas.credito.valorLiquido.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Valor líquido</p>
                        </div>
                      )}

                      {/* Crédito Parcelado */}
                      {resultadoSimulacao.taxas.parcelado && (
                        <div className="bg-white rounded-lg p-4 border-2 border-orange-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <CreditCardIcon className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-medium">{resultadoSimulacao.parcelas}x Parcelado</p>
                              <p className="text-xs text-orange-600">Taxa {resultadoSimulacao.taxas.parcelado.taxa}%</p>
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-orange-900">
                            R$ {resultadoSimulacao.taxas.parcelado.valorLiquido.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {resultadoSimulacao.parcelas}x de R$ {resultadoSimulacao.taxas.parcelado.valorParcela.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-gray-600">
                        💡 <strong>Dica:</strong> Os valores líquidos já estão com as taxas descontadas. Este é o valor que você receberá em sua conta.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/*   id="parcelas"
                    type="number"
                    min="1"
                    max="12"
                    value={parcelasSim}
                    onChange={(e) => setParcelasSim(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={calcularTaxas} className="w-full">
                <Calculator className="h-4 w-4 mr-2" />
                Calcular Taxas
              </Button>

              {/* Tabela de Taxas */}
              <div className="border rounded-lg overflow-hidden mt-6">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Forma de Pagamento</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Taxa</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Prazo Repasse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-3">Débito</td>
                      <td className="px-4 py-3">2,5%</td>
                      <td className="px-4 py-3">D+1</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Crédito à vista</td>
                      <td className="px-4 py-3">3,5%</td>
                      <td className="px-4 py-3">D+30</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Crédito 2x</td>
                      <td className="px-4 py-3">4,0%</td>
                      <td className="px-4 py-3">D+30/60</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Crédito 3-6x</td>
                      <td className="px-4 py-3">4,5%</td>
                      <td className="px-4 py-3">D+ mensal</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Crédito 7-12x</td>
                      <td className="px-4 py-3">5,5%</td>
                      <td className="px-4 py-3">D+ mensal</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Geração de Comprovante */}
        <TabsContent value="comprovante" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Geração de Comprovantes
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Os comprovantes de pagamento são gerados automaticamente para cada fatura paga
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Como gerar comprovantes?</h3>
                <ul className="text-sm text-blue-800 space-y-1 ml-4">
                  <li>• Acesse <strong>Financeiro &gt; A Receber</strong></li>
                  <li>• Localize faturas com status <strong>PAGA</strong></li>
                  <li>• Clique no botão <strong>"Gerar Comprovante"</strong></li>
                  <li>• O PDF será baixado automaticamente</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">🎨 Modelo do Comprovante</h3>
                <p className="text-sm text-gray-600">
                  O comprovante gerado inclui automaticamente:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded border">
                    <h4 className="font-semibold mb-2 text-green-700">✅ Dados incluídos</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Nome e dados da unidade</li>
                      <li>• Número do recibo/fatura</li>
                      <li>• Data e hora do pagamento</li>
                      <li>• Nome completo do aluno</li>
                      <li>• CPF, email do aluno</li>
                      <li>• Valor pago e forma de pagamento</li>
                      <li>• Detalhamento (acréscimos/descontos)</li>
                      <li>• Plano contratado</li>
                      <li>• Logo da unidade (quando configurado)</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border">
                    <h4 className="font-semibold mb-2 text-blue-700">📄 Formato</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Formato: <strong>PDF (A4)</strong></li>
                      <li>• Layout profissional</li>
                      <li>• Header com dados da academia</li>
                      <li>• Box colorido com informações principais</li>
                      <li>• Tabela detalhada de valores</li>
                      <li>• Footer com timestamp e validação</li>
                      <li>• Pronto para impressão</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-6 rounded border shadow-sm space-y-2">
                  <div className="text-center font-bold text-lg text-blue-900 border-b pb-3">
                    📄 PREVIEW SIMPLIFICADO
                  </div>
                  <div className="space-y-3 mt-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">Data do Pagamento:</span>
                        <span>{new Date().toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="font-semibold">Forma de Pagamento:</span>
                        <span>PIX / Cartão / Boleto</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="font-semibold">Valor Pago:</span>
                        <span className="text-lg font-bold text-green-600">R$ XXX,XX</span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <p className="text-sm font-semibold mb-2">Dados do Aluno:</p>
                      <p className="text-sm text-gray-600">Nome: <strong>Nome Completo do Aluno</strong></p>
                      <p className="text-sm text-gray-600">CPF: XXX.XXX.XXX-XX</p>
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-sm font-semibold mb-2">Detalhes da Fatura:</p>
                      <div className="bg-gray-50 p-2 rounded text-sm">
                        <div className="flex justify-between">
                          <span>Valor Original:</span>
                          <span>R$ XXX,XX</span>
                        </div>
                        <div className="flex justify-between mt-1 font-bold">
                          <span>Total Pago:</span>
                          <span className="text-green-600">R$ XXX,XX</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-xs text-gray-500 pt-4 border-t mt-4">
                    Processado via Rykon-Pay • {unidadeNome}
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
                  <p className="text-sm text-green-800">
                    <strong>✅ Pronto para usar!</strong> A funcionalidade de geração de comprovantes PDF está 100% implementada e disponível.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Regras de Split */}
        <TabsContent value="split" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Split className="h-5 w-5" />
                Regras de Split de Pagamento
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Configure como os valores recebidos são divididos entre diferentes contas
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {splitRules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Split className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma regra de split configurada</p>
                  <p className="text-sm">Clique em "Adicionar Nova Regra" para criar</p>
                </div>
              ) : (
                splitRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex-1">
                      <h3 className="font-semibold">{rule.nome}</h3>
                      <p className="text-sm text-gray-600">
                        {rule.tipo === "PERCENTUAL" ? `${rule.valor}% do valor` : `R$ ${rule.valor.toFixed(2)} fixo`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={rule.ativo}
                        onCheckedChange={async (checked) => {
                          await handleToggleSplit(rule.id, checked as boolean);
                        }}
                        title={rule.ativo ? "Clique para desativar" : "Clique para ativar"}
                      />
                      <Badge variant={rule.ativo ? "default" : "secondary"}>
                        {rule.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditSplit(rule)}
                      >
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          setDeletingSplitId(rule.id);
                          setShowDeleteSplitModal(true);
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))
              )}
              
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => {
                  setEditingSplit(null);
                  setSplitFormData({
                    nome: "",
                    tipo: "PERCENTUAL",
                    valor: 0,
                    conta_destino_id: "",
                    description: "",
                  });
                  setShowSplitModal(true);
                }}
                disabled={!establishmentId}
              >
                + Adicionar Nova Regra
              </Button>

              {!establishmentId && (
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-800">
                  ⚠️ Esta unidade não possui establishment_id configurado. Configure o ID do estabelecimento no Paytime para gerenciar splits.
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Como funcionam as regras de split</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Split percentual: divide uma porcentagem do valor para outra conta</li>
                  <li>• Split fixo: deduz um valor fixo antes de depositar na conta principal</li>
                  <li>• É possível ter múltiplas regras ativas simultaneamente</li>
                  <li>• Configuração de maquininha integrada</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Seção Maquininha */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCardIcon className="h-5 w-5" />
                Integração com Maquininha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Habilitar Maquininha de Cartão</h3>
                  <p className="text-sm text-gray-600">
                    Permite processar pagamentos presenciais via maquininha Stone/Cielo integrada
                  </p>
                </div>
                <Checkbox 
                  checked={maquininhaIntegrada}
                  onCheckedChange={(checked) => {
                    setMaquininhaIntegrada(checked as boolean);
                    setHasChanges(true);
                  }}
                />
              </div>

              {maquininhaIntegrada && (
                <div className="bg-gray-50 p-4 rounded border space-y-3">
                  <div>
                    <Label>Modelo da Maquininha</Label>
                    <select className="w-full h-10 px-3 rounded-md border border-gray-300 mt-1">
                      <option>Stone T1</option>
                      <option>Stone T2+</option>
                      <option>Cielo LIO</option>
                      <option>PagSeguro Moderninha</option>
                    </select>
                  </div>
                  <div>
                    <Label>Serial Number</Label>
                    <Input placeholder="Ex: SN123456789" />
                  </div>
                  <Button variant="outline" className="w-full">
                    Testar Conexão
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Limites de Transação */}
        <TabsContent value="limites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Limites de Transação
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Limites aplicados pelo Rykon-Pay para sua unidade
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Limite por Transação</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactionLimits.transaction_limit)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Valor máximo por pagamento</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Limite Diário</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactionLimits.daily_limit)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Volume máximo por dia</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Transações Mensais</h3>
                  <p className="text-2xl font-bold text-purple-600">{transactionLimits.monthly_transactions}</p>
                  <p className="text-sm text-gray-600 mt-1">Quantidade máxima por mês</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Limite de Chargebacks</h3>
                  <p className="text-2xl font-bold text-orange-600">{transactionLimits.chargeback_limit}</p>
                  <p className="text-sm text-gray-600 mt-1">Contestações permitidas mensais</p>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mt-4">
                <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Solicitar Aumento de Limite</h4>
                <p className="text-sm text-yellow-800 mb-3">
                  Caso precise processar valores acima dos limites atuais, entre em contato com o suporte Rykon-Pay.
                </p>
                <Button variant="outline" size="sm">
                  Solicitar Aumento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Contas Bancárias */}
        <TabsContent value="contas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Contas Bancárias Cadastradas
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Gerencie as contas bancárias para recebimento via Rykon-Pay
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {contasBancarias.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Landmark className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conta bancária cadastrada</p>
                  <p className="text-sm">Clique em "Adicionar Conta" para começar</p>
                </div>
              ) : (
                contasBancarias.map((conta) => (
                  <div key={conta.id} className="border rounded-lg p-4 flex items-start justify-between hover:bg-gray-50 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{conta.banco_nome}</h3>
                        {conta.principal && (
                          <Badge className="bg-green-600">Principal</Badge>
                        )}
                        <Badge variant={conta.ativo ? "default" : "secondary"}>
                          {conta.ativo ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Banco:</strong> {conta.banco_codigo} - {conta.banco_nome}
                        </p>
                        <p>
                          <strong>Agência:</strong> {conta.agencia}{conta.agencia_digito && `-${conta.agencia_digito}`} | 
                          <strong> Conta:</strong> {conta.conta}-{conta.conta_digito} ({conta.tipo})
                        </p>
                        <p>
                          <strong>Titular:</strong> {conta.titular_nome}
                        </p>
                        <p>
                          <strong>CPF/CNPJ:</strong> {conta.titular_cpf_cnpj}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {!conta.principal && conta.ativo && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSetPrincipalAccount(conta.id)}
                          disabled={saving}
                        >
                          Tornar Principal
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditBankAccount(conta)}
                      >
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteBankAccount(conta.id)}
                        disabled={saving}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))
              )}
              
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handleAddBankAccount}
              >
                + Adicionar Nova Conta
              </Button>

              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Sobre contas bancárias</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• A conta principal recebe todos os repasses automaticamente</li>
                  <li>• Você pode cadastrar múltiplas contas para regras de split</li>
                  <li>• Apenas uma conta pode ser marcada como principal por vez</li>
                  <li>• Valide sempre os dados bancários antes de confirmar</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Contrato */}
        <TabsContent value="contrato" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contrato Rykon-Pay
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Visualize os termos do seu contrato com o Rykon-Pay
              </p>
            </CardHeader>
            <CardContent>
              {!contrato ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Carregando contrato...</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 p-6 rounded border max-h-96 overflow-y-auto space-y-4 text-sm"
                       dangerouslySetInnerHTML={{ __html: contrato.conteudo }}
                  />

                  {contrato.assinado && (
                    <div className="bg-green-50 p-4 rounded border border-green-200 mt-4">
                      <h4 className="font-semibold text-green-900 mb-2">✓ Contrato Assinado Digitalmente</h4>
                      <div className="text-sm text-green-800 space-y-1">
                        <p><strong>Assinado por:</strong> {contrato.assinado}</p>
                        {contrato.data_assinatura && (
                          <p><strong>Data:</strong> {new Date(contrato.data_assinatura).toLocaleString('pt-BR')}</p>
                        )}
                        <p><strong>Versão:</strong> {contrato.versao}</p>
                      </div>
                    </div>
                  )}

                  {contrato.taxa_transacao && (
                    <div className="bg-blue-50 p-4 rounded border border-blue-200 mt-4">
                      <h4 className="font-semibold text-blue-900 mb-2">💰 Taxas Contratuais</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p><strong>Taxa por transação:</strong> {contrato.taxa_transacao}%</p>
                        {contrato.valor_mensal && contrato.valor_mensal > 0 && (
                          <p><strong>Valor mensal:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contrato.valor_mensal)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleDownloadContract}
                      disabled={loadingContract}
                    >
                      {loadingContract ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Gerando PDF...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Baixar PDF
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="flex-1" disabled>
                      Enviar por Email (Em breve)
                    </Button>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📋 Informações do Contrato</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>ID:</strong> {contrato.id}</p>
                      <p><strong>Tipo:</strong> {contrato.tipo.toUpperCase()}</p>
                      <p><strong>Status:</strong> <span className={contrato.status === 'ATIVO' ? 'text-green-600 font-semibold' : ''}>{contrato.status}</span></p>
                      <p><strong>Versão:</strong> {contrato.versao}</p>
                      <p><strong>Vigência:</strong> {new Date(contrato.data_inicio).toLocaleDateString('pt-BR')} {contrato.data_fim && ` até ${new Date(contrato.data_fim).toLocaleDateString('pt-BR')}`}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Criar/Editar Split */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingSplit ? "Editar Regra de Split" : "Nova Regra de Split"}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSplitModal(false)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Nome da Regra *</Label>
                  <Input
                    placeholder="Ex: Comissão Instrutor"
                    value={splitFormData.nome}
                    onChange={(e) => setSplitFormData({ ...splitFormData, nome: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Tipo</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
                    value={splitFormData.tipo}
                    onChange={(e) => setSplitFormData({ ...splitFormData, tipo: e.target.value as "PERCENTUAL" | "FIXO" })}
                  >
                    <option value="PERCENTUAL">Percentual (%)</option>
                    <option value="FIXO" disabled>Valor Fixo (R$) - Em breve</option>
                  </select>
                </div>

                <div>
                  <Label>Percentual *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="10.00"
                      value={splitFormData.valor || ""}
                      onChange={(e) => setSplitFormData({ ...splitFormData, valor: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Soma atual dos splits ativos: {splitRules.filter(r => r.id !== editingSplit?.id && r.ativo && r.tipo === "PERCENTUAL").reduce((sum, r) => sum + r.valor, 0).toFixed(2)}%
                  </p>
                </div>

                <div>
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Descreva o propósito deste split"
                    value={splitFormData.description}
                    onChange={(e) => setSplitFormData({ ...splitFormData, description: e.target.value })}
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-blue-800">
                  <strong>ℹ️ Atenção:</strong> A soma de todos os splits ativos não pode exceder 100%.
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSplitModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveSplit}
                >
                  {editingSplit ? "Salvar Alterações" : "Criar Split"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Split */}
      {showDeleteSplitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Excluir Regra de Split</h2>
                  <p className="text-sm text-gray-600">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-gray-700">
                Tem certeza que deseja excluir esta regra de split? Todas as transações futuras não terão mais este split aplicado.
              </p>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteSplitModal(false);
                    setDeletingSplitId(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteSplit}
                >
                  Sim, Excluir
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar/Editar Conta Bancária */}
      {showBankAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingBankAccount ? "Editar Conta Bancária" : "Nova Conta Bancária"}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBankAccountModal(false)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Código do Banco *</Label>
                  <Input
                    placeholder="Ex: 341 (Itaú), 001 (BB), 104 (CEF)"
                    value={bankAccountFormData.banco_codigo}
                    onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, banco_codigo: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Nome do Banco *</Label>
                  <Input
                    placeholder="Ex: Itaú Unibanco"
                    value={bankAccountFormData.banco_nome}
                    onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, banco_nome: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Agência *</Label>
                  <Input
                    placeholder="1234"
                    value={bankAccountFormData.agencia}
                    onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, agencia: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Dígito da Agência</Label>
                  <Input
                    placeholder="5"
                    maxLength={2}
                    value={bankAccountFormData.agencia_digito}
                    onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, agencia_digito: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Conta *</Label>
                  <Input
                    placeholder="12345"
                    value={bankAccountFormData.conta}
                    onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, conta: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Dígito da Conta *</Label>
                  <Input
                    placeholder="6"
                    maxLength={2}
                    value={bankAccountFormData.conta_digito}
                    onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, conta_digito: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Tipo de Conta *</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
                    value={bankAccountFormData.tipo}
                    onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, tipo: e.target.value as "CORRENTE" | "POUPANCA" })}
                  >
                    <option value="CORRENTE">Conta Corrente</option>
                    <option value="POUPANCA">Conta Poupança</option>
                  </select>
                </div>

                <div>
                  <Label>Nome do Titular *</Label>
                  <Input
                    placeholder="Nome completo ou Razão Social"
                    value={bankAccountFormData.titular_nome}
                    onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, titular_nome: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>CPF ou CNPJ do Titular *</Label>
                  <Input
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    value={bankAccountFormData.titular_cpf_cnpj}
                    onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, titular_cpf_cnpj: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <Checkbox
                    checked={bankAccountFormData.principal}
                    onCheckedChange={(checked) => setBankAccountFormData({ ...bankAccountFormData, principal: checked as boolean })}
                  />
                  <Label>Marcar como conta principal</Label>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-blue-800">
                <strong>ℹ️ Atenção:</strong> Verifique cuidadosamente os dados antes de salvar. Contas com informações incorretas podem causar problemas nos repasses.
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowBankAccountModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveBankAccount}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingBankAccount ? "Salvar Alterações" : "Adicionar Conta"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
