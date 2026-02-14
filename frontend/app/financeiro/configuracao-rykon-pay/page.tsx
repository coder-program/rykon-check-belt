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
  rates?: {
    debit_rate: number;
    credit_rate: number;
    installment_base_rate: number;
    installment_additional_rate: number;
    pix_rate: number | null;
  } | null;
}

interface SelectedPlan {
  id: number;
  active: boolean;
  name: string;
}

interface BankAccount {
  id: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo: string;
  titular: string;
  cpf_cnpj: string;
  principal: boolean;
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

  // Contas bancárias
  const [contasBancarias, setContasBancarias] = useState<BankAccount[]>([]);
  const [showAddConta, setShowAddConta] = useState(false);

  // Regras de split
  const [splitRules, setSplitRules] = useState<SplitRule[]>([]);

  // Maquininha
  const [maquininhaIntegrada, setMaquininhaIntegrada] = useState(false);

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
      console.log("📋 DADOS COMPLETOS DOS PLANOS:", JSON.stringify(plansData.data, null, 2));
      
      // Verificar se os planos têm informações de taxas
      if (plansData.data && plansData.data.length > 0) {
        console.log("🔍 ESTRUTURA DO PRIMEIRO PLANO:");
        console.log("   - Chaves disponíveis:", Object.keys(plansData.data[0]));
        console.log("   - Plano completo:", plansData.data[0]);
        
        // Procurar por campos relacionados a taxas
        const firstPlan = plansData.data[0];
        const possibleFeeFields = ['fees', 'rates', 'charges', 'debit_fee', 'credit_fee', 'installment_fee', 'taxa', 'taxas'];
        console.log("🔍 CAMPOS DE TAXAS ENCONTRADOS:");
        possibleFeeFields.forEach(field => {
          if (firstPlan[field] !== undefined) {
            console.log(`   ✅ ${field}:`, firstPlan[field]);
          }
        });
      }
      
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
      
      if (unidadeResponse.ok) {
        const unidadeData = await unidadeResponse.json();
        console.log("🏢 Dados da unidade:", unidadeData);
        console.log("🏢 Dados COMPLETOS da API:", JSON.stringify(unidadeData, null, 2));
        console.log("🏢 Establishment ID:", unidadeData.paytime_establishment_id);
        console.log("🏢 Tipo do Establishment ID:", typeof unidadeData.paytime_establishment_id);
        console.log("🏢 Nome da unidade:", unidadeData.nome);
        console.log("🏢 Todas as chaves do objeto:", Object.keys(unidadeData));
        
        setUnidadeNome(unidadeData.nome || "Unidade");
        
        // Verifica se existe e não é null/undefined
        if (unidadeData.paytime_establishment_id) {
          console.log("✅ Establishment ID ENCONTRADO:", unidadeData.paytime_establishment_id);
          setEstablishmentId(unidadeData.paytime_establishment_id);
        } else {
          console.warn("⚠️ Unidade não possui paytime_establishment_id configurado");
          console.log("🔍 Valor exato recebido:", unidadeData.paytime_establishment_id);
          setEstablishmentId(null);
        }
        
        setMaquininhaIntegrada(unidadeData.maquininha_habilitada || false);
      } else {
        console.warn("⚠️ Erro ao buscar dados da unidade:", unidadeResponse.status);
        setEstablishmentId(null);
      }

      // TODO: Buscar contas bancárias e regras de split do backend
      // Por enquanto, dados de exemplo
      setContasBancarias([
        {
          id: "1",
          banco: "Banco do Brasil",
          agencia: "1234",
          conta: "56789-0",
          tipo: "Corrente",
          titular: unidadeNome,
          cpf_cnpj: "12.345.678/0001-90",
          principal: true,
        },
      ]);

      setSplitRules([
        {
          id: "1",
          nome: "Comissão Instrutor",
          tipo: "PERCENTUAL",
          valor: 10,
          conta_destino_id: "2",
          ativo: true,
        },
      ]);

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

  const calcularTaxas = () => {
    const valor = parseFloat(valorSimulacao);
    const parcelas = parseInt(parcelasSim);
    
    console.log("💰 SIMULADOR - Dados de entrada:");
    console.log("   - Valor:", valor);
    console.log("   - Parcelas:", parcelas);
    console.log("   - Plano selecionado ID:", planoSelecionadoSim);
    console.log("   - Planos disponíveis:", availablePlans.length);
    console.log("   - Planos selecionados:", selectedPlans.length);
    
    if (!valor || valor <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    // Buscar o plano selecionado nos planos disponíveis
    const planoEncontrado = availablePlans.find(p => p.id.toString() === planoSelecionadoSim);
    console.log("🔍 Plano encontrado:", planoEncontrado);
    
    if (!planoEncontrado) {
      toast.error("⚠️ Plano não encontrado!");
      console.error("❌ Plano não encontrado:", planoSelecionadoSim);
      return;
    }

    // Verificar se o plano tem taxas configuradas
    if (!planoEncontrado.rates) {
      toast.error("⚠️ Taxas não configuradas para este plano. Entre em contato com o suporte.");
      console.error("❌ Plano sem taxas configuradas:", planoEncontrado);
      return;
    }

    console.log("✅ Usando taxas reais do plano:", planoEncontrado.rates);
    const taxas = planoEncontrado.rates;
    
    // Calcular taxa de crédito parcelado (taxa base + adicional por parcela)
    const taxaCreditoParcelado = parcelas > 1 
      ? taxas.installment_base_rate + (parcelas - 1) * taxas.installment_additional_rate
      : taxas.credit_rate;
    
    const valorDebito = valor - (valor * taxas.debit_rate / 100);
    const valorCredito = valor - (valor * taxas.credit_rate / 100);
    const valorCreditoParcelado = valor - (valor * taxaCreditoParcelado / 100);
    const valorParcela = valorCreditoParcelado / parcelas;

    console.log("💰 Resultado da simulação:");
    console.log("   - Débito: R$", valorDebito.toFixed(2), `(taxa ${taxas.debit_rate}%)`);
    console.log("   - Crédito: R$", valorCredito.toFixed(2), `(taxa ${taxas.credit_rate}%)`);
    console.log("   - Parcelado:", `${parcelas}x R$ ${valorParcela.toFixed(2)}`, `(taxa ${taxaCreditoParcelado.toFixed(2)}%)`);

    toast.success(
      `Simulação:\n📱 Débito: R$ ${valorDebito.toFixed(2)} (taxa ${taxas.debit_rate}%)\n💳 Crédito: R$ ${valorCredito.toFixed(2)} (taxa ${taxas.credit_rate}%)\n💳 ${parcelas}x: ${parcelas}x R$ ${valorParcela.toFixed(2)} (taxa ${taxaCreditoParcelado.toFixed(2)}%)`,
      { duration: 8000 }
    );
  };

  const getPlanTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      COMMERCIAL: "bg-blue-100 text-blue-800 border-blue-300",
      TECHNICAL: "bg-purple-100 text-purple-800 border-purple-300",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-300";
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
                Configure como os comprovantes de pagamento são gerados e enviados
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Envio automático por email</h3>
                    <p className="text-sm text-gray-600">Enviar comprovante automaticamente após pagamento</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Impressão automática</h3>
                    <p className="text-sm text-gray-600">Imprimir comprovante ao confirmar pagamento no balcão</p>
                  </div>
                  <Checkbox />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">Modelo de Comprovante</h3>
                  <div className="bg-gray-50 p-4 rounded border">
                    <p className="text-sm text-gray-600 mb-2">Preview do comprovante:</p>
                    <div className="bg-white p-6 rounded border shadow-sm space-y-2 text-sm">
                      <div className="text-center font-bold text-lg border-b pb-2">COMPROVANTE DE PAGAMENTO</div>
                      <div className="flex justify-between"><span>Data:</span><span>26/01/2025</span></div>
                      <div className="flex justify-between"><span>Aluno:</span><span>Nome do Aluno</span></div>
                      <div className="flex justify-between"><span>Valor:</span><span className="font-bold">R$ 100,00</span></div>
                      <div className="flex justify-between"><span>Forma:</span><span>Crédito 1x</span></div>
                      <div className="text-center text-xs text-gray-500 pt-4 border-t">
                        Processado via Rykon-Pay • {unidadeNome}
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  <Receipt className="h-4 w-4 mr-2" />
                  Personalizar Modelo
                </Button>
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
              {splitRules.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{rule.nome}</h3>
                    <p className="text-sm text-gray-600">
                      {rule.tipo === "PERCENTUAL" ? `${rule.valor}% do valor` : `R$ ${rule.valor.toFixed(2)} fixo`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.ativo ? "default" : "secondary"}>
                      {rule.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button size="sm" variant="outline">Editar</Button>
                  </div>
                </div>
              ))}
              
              <Button className="w-full" variant="outline">
                + Adicionar Nova Regra
              </Button>

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
                  <p className="text-2xl font-bold text-green-600">R$ 50.000,00</p>
                  <p className="text-sm text-gray-600 mt-1">Valor máximo por pagamento</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Limite Diário</h3>
                  <p className="text-2xl font-bold text-blue-600">R$ 200.000,00</p>
                  <p className="text-sm text-gray-600 mt-1">Volume máximo por dia</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Limite Mensal</h3>
                  <p className="text-2xl font-bold text-purple-600">R$ 3.000.000,00</p>
                  <p className="text-sm text-gray-600 mt-1">Volume máximo por mês</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Utilizado Hoje</h3>
                  <p className="text-2xl font-bold text-orange-600">R$ 12.450,00</p>
                  <p className="text-sm text-gray-600 mt-1">6.2% do limite diário</p>
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
              {contasBancarias.map((conta) => (
                <div key={conta.id} className="border rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{conta.banco}</h3>
                      {conta.principal && (
                        <Badge className="bg-green-600">Principal</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Agência: {conta.agencia} | Conta: {conta.conta} ({conta.tipo})</p>
                      <p>Titular: {conta.titular}</p>
                      <p>CPF/CNPJ: {conta.cpf_cnpj}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Editar</Button>
                </div>
              ))}
              
              {showAddConta ? (
                <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                  <h3 className="font-semibold">Adicionar Nova Conta</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Banco</Label>
                      <Input placeholder="Ex: Banco do Brasil" />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <select className="w-full h-10 px-3 rounded-md border border-gray-300">
                        <option>Conta Corrente</option>
                        <option>Conta Poupança</option>
                      </select>
                    </div>
                    <div>
                      <Label>Agência</Label>
                      <Input placeholder="1234" />
                    </div>
                    <div>
                      <Label>Conta</Label>
                      <Input placeholder="56789-0" />
                    </div>
                    <div>
                      <Label>Titular</Label>
                      <Input placeholder="Nome completo" />
                    </div>
                    <div>
                      <Label>CPF/CNPJ</Label>
                      <Input placeholder="000.000.000-00" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1">Salvar Conta</Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddConta(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => setShowAddConta(true)}
                >
                  + Adicionar Nova Conta
                </Button>
              )}

              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Sobre contas bancárias</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• A conta principal recebe todos os repasses automaticamente</li>
                  <li>• Você pode cadastrar múltiplas contas para regras de split</li>
                  <li>• Alterações precisam ser validadas pelo Rykon-Pay (até 48h)</li>
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
              <div className="bg-gray-50 p-6 rounded border max-h-96 overflow-y-auto space-y-4 text-sm">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-bold">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>
                  <h3 className="text-md font-semibold">PROCESSAMENTO DE PAGAMENTOS RYKON-PAY</h3>
                </div>

                <div>
                  <h3 className="font-bold mb-2">1. PARTES CONTRATANTES</h3>
                  <p className="text-gray-700">
                    <strong>CONTRATANTE:</strong> {unidadeNome}
                    <br />
                    <strong>Establishment ID:</strong> {establishmentId}
                    <br />
                    <strong>CONTRATADA:</strong> Rykon Tecnologia LTDA
                  </p>
                </div>

                <div>
                  <h3 className="font-bold mb-2">2. OBJETO DO CONTRATO</h3>
                  <p className="text-gray-700">
                    O presente contrato tem por objeto a prestação de serviços de processamento de pagamentos 
                    eletrônicos, incluindo cartões de crédito e débito, através da plataforma Rykon-Pay.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold mb-2">3. TAXAS E TARIFAS</h3>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• Débito: 2,5% por transação</li>
                    <li>• Crédito à vista: 3,5% por transação</li>
                    <li>• Crédito parcelado: a partir de 4,0% por transação</li>
                    <li>• Sem taxa de adesão ou mensalidade</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold mb-2">4. PRAZO DE REPASSE</h3>
                  <p className="text-gray-700">
                    Os valores serão repassados à conta bancária cadastrada conforme os seguintes prazos:
                  </p>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• Débito: D+1 dia útil</li>
                    <li>• Crédito à vista: D+30 dias</li>
                    <li>• Crédito parcelado: Conforme calendário de parcelas</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold mb-2">5. VIGÊNCIA</h3>
                  <p className="text-gray-700">
                    Este contrato entra em vigor na data de sua assinatura e possui prazo indeterminado, 
                    podendo ser rescindido por qualquer das partes mediante aviso prévio de 30 dias.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold mb-2">6. PROTEÇÃO DE DADOS</h3>
                  <p className="text-gray-700">
                    A CONTRATADA compromete-se a tratar todos os dados pessoais coletados em conformidade 
                    com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                  </p>
                </div>

                <div className="border-t pt-4 mt-6">
                  <p className="text-xs text-gray-600 text-center">
                    Documento assinado digitalmente em 15/01/2025 às 14:32
                    <br />
                    Chave de verificação: {establishmentId}-2025-CONTRACT
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
                <Button variant="outline" className="flex-1">
                  Enviar por Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
