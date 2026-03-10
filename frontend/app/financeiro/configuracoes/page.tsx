"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  CreditCard,
  Zap,
  DollarSign,
  MessageSquare,
  Shield,
  Save,
  CheckCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import FiltroUnidade from "@/components/financeiro/FiltroUnidade";
import { useFiltroUnidade } from "@/hooks/useFiltroUnidade";

interface ConfiguracaoCobranca {
  id?: string;
  unidade_id: string;
  aceita_pix: boolean;
  aceita_cartao: boolean;
  aceita_boleto: boolean;
  aceita_dinheiro: boolean;
  aceita_transferencia: boolean;
  multa_atraso_percentual: number;
  juros_diario_percentual: number;
  dias_bloqueio_inadimplencia: number;
  dia_vencimento_padrao: number;
  faturas_vencidas_para_inadimplencia: number;
  gateway_tipo?: string;
  gateway_api_key?: string;
  gateway_secret_key?: string;
  gateway_modo_producao: boolean;
  gympass_ativo: boolean;
  gympass_unidade_id?: string;
  gympass_percentual_repasse?: number;
  enviar_lembrete_vencimento: boolean;
  dias_antecedencia_lembrete: number;
}

export default function ConfiguracoesFinanceiro() {
  const {
    isFranqueado,
    unidades,
    unidadeSelecionada,
    unidadeIdAtual,
    setUnidadeSelecionada,
  } = useFiltroUnidade();
  const [config, setConfig] = useState<ConfiguracaoCobranca>({
    unidade_id: "",
    aceita_pix: true,
    aceita_cartao: true,
    aceita_boleto: true,
    aceita_dinheiro: true,
    aceita_transferencia: true,
    multa_atraso_percentual: 2.0,
    juros_diario_percentual: 0.033,
    dias_bloqueio_inadimplencia: 30,
    dia_vencimento_padrao: 10,
    faturas_vencidas_para_inadimplencia: 2,
    gateway_modo_producao: false,
    gympass_ativo: false,
    gympass_percentual_repasse: 70,
    enviar_lembrete_vencimento: true,
    dias_antecedencia_lembrete: 3,
  });

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // WhatsApp / rykon-notify state
  const [waStatus, setWaStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waPollingActive, setWaPollingActive] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      const isFranqueadoUser = user.perfis?.some(
        (p: any) =>
          (typeof p === "string" && p.toLowerCase() === "franqueado") ||
          (typeof p === "object" && p?.nome?.toLowerCase() === "franqueado")
      );

      // Para franqueados, esperar seleção de unidade
      // Para outros, usar unidade_id do usuário
      if (!isFranqueadoUser && user.unidade_id) {
        setConfig((prev) => ({ ...prev, unidade_id: user.unidade_id }));
        carregarConfiguracoes(user.unidade_id);
      } else if (isFranqueadoUser) {
        // Franqueado sem unidade selecionada - apenas para loading false
        setLoading(false);
      } else {
        console.warn("⚠️ Usuário sem unidade_id");
        setLoading(false);
      }
    } else {
      console.error(" Dados do usuário não encontrados");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unidadeIdAtual && isFranqueado) {
      setConfig((prev) => ({ ...prev, unidade_id: unidadeIdAtual }));
      carregarConfiguracoes(unidadeIdAtual);
    }
  }, [unidadeSelecionada]);

  // -- WhatsApp helpers ---------------------------------------------------------
  const rykonNotifyUrl = process.env.NEXT_PUBLIC_RYKON_NOTIFY_URL;
  const rykonNotifyToken = process.env.NEXT_PUBLIC_RYKON_NOTIFY_TOKEN;

  const waHeaders = () => ({
    "Content-Type": "application/json",
    ...(rykonNotifyToken ? { Authorization: `Bearer ${rykonNotifyToken}` } : {}),
  });

  const fetchWaStatus = async (unidadeId: string) => {
    if (!rykonNotifyUrl || !unidadeId) return;
    try {
      const res = await fetch(`${rykonNotifyUrl}/sessions/${unidadeId}`, {
        headers: waHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data.status === "connected" ? "connected" : data.status === "connecting" ? "connecting" : "disconnected");
      } else {
        setWaStatus("disconnected");
      }
    } catch {
      setWaStatus("disconnected");
    }
  };

  const fetchWaQr = async (unidadeId: string) => {
    if (!rykonNotifyUrl || !unidadeId) return;
    try {
      const res = await fetch(`${rykonNotifyUrl}/sessions/${unidadeId}/qr`, {
        headers: waHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setWaQr(data.qr || null);
        if (data.status === "connected") {
          setWaStatus("connected");
          setWaPollingActive(false);
        }
      } else {
        setWaQr(null);
      }
    } catch {
      setWaQr(null);
    }
  };

  // Poll for session status / QR while connecting
  useEffect(() => {
    if (!waPollingActive || !unidadeIdAtual) return;
    fetchWaQr(unidadeIdAtual);
    const interval = setInterval(() => fetchWaQr(unidadeIdAtual), 5000);
    return () => clearInterval(interval);
  }, [waPollingActive, unidadeIdAtual]);

  // Fetch initial status when unidade changes
  useEffect(() => {
    if (unidadeIdAtual) fetchWaStatus(unidadeIdAtual);
  }, [unidadeIdAtual]);

  const handleWaConnect = async () => {
    if (!rykonNotifyUrl || !unidadeIdAtual) {
      alert("Configure NEXT_PUBLIC_RYKON_NOTIFY_URL nas variáveis de ambiente.");
      return;
    }
    setWaLoading(true);
    setWaQr(null);
    try {
      await fetch(`${rykonNotifyUrl}/sessions/${unidadeIdAtual}/connect`, {
        method: "POST",
        headers: waHeaders(),
      });
      setWaStatus("connecting");
      setWaPollingActive(true);
    } catch (e) {
      alert("Erro ao iniciar conexão WhatsApp.");
    } finally {
      setWaLoading(false);
    }
  };

  const handleWaDisconnect = async () => {
    if (!rykonNotifyUrl || !unidadeIdAtual) return;
    if (!confirm("Desconectar WhatsApp desta unidade?")) return;
    setWaLoading(true);
    try {
      await fetch(`${rykonNotifyUrl}/sessions/${unidadeIdAtual}`, {
        method: "DELETE",
        headers: waHeaders(),
      });
      setWaStatus("disconnected");
      setWaQr(null);
      setWaPollingActive(false);
    } catch {
      alert("Erro ao desconectar WhatsApp.");
    } finally {
      setWaLoading(false);
    }
  };
  // ---------------------------------------------------------------------------

  const carregarConfiguracoes = async (unidadeId: string) => {
    try {
      const token = localStorage.getItem("token");
      const url = `${process.env.NEXT_PUBLIC_API_URL}/configuracoes-cobranca/unidade/${unidadeId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      } else {
        console.warn(
          " Configurações não encontradas (usando padrão):",
          response.status
        );
      }
    } catch (error) {
      console.error(" Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracoes = async () => {
    try {
      setSalvando(true);
      const token = localStorage.getItem("token");

      const url = `${process.env.NEXT_PUBLIC_API_URL}/configuracoes-cobranca/unidade/${config.unidade_id}`;

      // Remover campos de convênio (migrados para nova estrutura)
      const { 
        gympass_ativo, 
        gympass_unidade_id, 
        gympass_percentual_repasse,
        ...configParaSalvar 
      } = config;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configParaSalvar),
      });

      if (response.ok) {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 3000);
      } else {
        alert("Erro ao salvar configurações");
      }
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert("Erro ao salvar configurações");
    } finally {
      setSalvando(false);
    }
  };

  const updateConfig = (field: keyof ConfiguracaoCobranca, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando configurações...</p>
      </div>
    );
  }

  // Verificar se é franqueado e não tem unidade selecionada
  if (isFranqueado && !unidadeIdAtual) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Configurações de Cobrança
            </h1>
            <p className="text-gray-500 mt-1">
              Configure métodos de pagamento, regras financeiras e integrações
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
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg text-gray-600">
                Selecione uma unidade acima para visualizar e editar suas
                configurações
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configurações de Cobrança
          </h1>
          <p className="text-gray-500 mt-1">
            Configure métodos de pagamento, regras financeiras e integrações
          </p>
        </div>
        <Button
          onClick={salvarConfiguracoes}
          disabled={salvando}
          className="flex items-center gap-2"
        >
          {salvo ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Salvo!
            </>
          ) : salvando ? (
            "Salvando..."
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>

      {/* Filtro de Unidade */}
      <FiltroUnidade
        unidades={unidades}
        unidadeSelecionada={unidadeSelecionada}
        onUnidadeChange={setUnidadeSelecionada}
        isFranqueado={isFranqueado}
      />

      <Tabs defaultValue="metodos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="metodos">Métodos de Pagamento</TabsTrigger>
          <TabsTrigger value="regras">Regras Financeiras</TabsTrigger>
          <TabsTrigger value="gateway">Gateway</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* Métodos de Pagamento */}
        <TabsContent value="metodos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Métodos de Pagamento Aceitos
              </CardTitle>
              <CardDescription>
                Selecione quais formas de pagamento sua unidade aceita
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="aceita_pix">PIX</Label>
                  <p className="text-sm text-gray-500">
                    Pagamento instantâneo via QR Code
                  </p>
                </div>
                <Switch
                  id="aceita_pix"
                  checked={config.aceita_pix}
                  onCheckedChange={(checked) =>
                    updateConfig("aceita_pix", checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="aceita_cartao">
                    Cartão de Crédito/Débito
                  </Label>
                  <p className="text-sm text-gray-500">
                    Pagamento com cartão via gateway
                  </p>
                </div>
                <Switch
                  id="aceita_cartao"
                  checked={config.aceita_cartao}
                  onCheckedChange={(checked) =>
                    updateConfig("aceita_cartao", checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="aceita_boleto">Boleto Bancário</Label>
                  <p className="text-sm text-gray-500">
                    Geração de boleto via gateway
                  </p>
                </div>
                <Switch
                  id="aceita_boleto"
                  checked={config.aceita_boleto}
                  onCheckedChange={(checked) =>
                    updateConfig("aceita_boleto", checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="aceita_dinheiro">Dinheiro</Label>
                  <p className="text-sm text-gray-500">
                    Pagamento em espécie na recepção
                  </p>
                </div>
                <Switch
                  id="aceita_dinheiro"
                  checked={config.aceita_dinheiro}
                  onCheckedChange={(checked) =>
                    updateConfig("aceita_dinheiro", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regras Financeiras */}
        <TabsContent value="regras">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Juros e Multas
                </CardTitle>
                <CardDescription>
                  Configure penalidades para pagamentos em atraso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="multa">Multa por Atraso (%)</Label>
                    <Input
                      id="multa"
                      type="number"
                      step="0.01"
                      value={config.multa_atraso_percentual}
                      onChange={(e) =>
                        updateConfig(
                          "multa_atraso_percentual",
                          parseFloat(e.target.value)
                        )
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Aplicado sobre o valor original
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="juros">Juros Diário (%)</Label>
                    <Input
                      id="juros"
                      type="number"
                      step="0.001"
                      value={config.juros_diario_percentual}
                      onChange={(e) =>
                        updateConfig(
                          "juros_diario_percentual",
                          parseFloat(e.target.value)
                        )
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Acumulado por dia de atraso
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Inadimplência e Bloqueio
                </CardTitle>
                <CardDescription>
                  Regras para bloqueio automático de alunos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="faturas_vencidas">
                      Faturas Vencidas para Inadimplência
                    </Label>
                    <Input
                      id="faturas_vencidas"
                      type="number"
                      min="1"
                      value={config.faturas_vencidas_para_inadimplencia}
                      onChange={(e) =>
                        updateConfig(
                          "faturas_vencidas_para_inadimplencia",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Número de faturas vencidas para marcar como inadimplente
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dias_bloqueio">
                      Dias para Bloqueio de Check-in
                    </Label>
                    <Input
                      id="dias_bloqueio"
                      type="number"
                      min="1"
                      value={config.dias_bloqueio_inadimplencia}
                      onChange={(e) =>
                        updateConfig(
                          "dias_bloqueio_inadimplencia",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Dias de atraso para bloquear acesso
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Notificações
                </CardTitle>
                <CardDescription>
                  Configure lembretes automáticos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="lembretes">
                      Enviar Lembretes de Vencimento
                    </Label>
                    <p className="text-sm text-gray-500">
                      Notificar alunos antes do vencimento
                    </p>
                  </div>
                  <Switch
                    id="lembretes"
                    checked={config.enviar_lembrete_vencimento}
                    onCheckedChange={(checked) =>
                      updateConfig("enviar_lembrete_vencimento", checked)
                    }
                  />
                </div>

                {config.enviar_lembrete_vencimento && (
                  <div className="space-y-2">
                    <Label htmlFor="dias_antecedencia">
                      Dias de Antecedência
                    </Label>
                    <Input
                      id="dias_antecedencia"
                      type="number"
                      min="1"
                      value={config.dias_antecedencia_lembrete}
                      onChange={(e) =>
                        updateConfig(
                          "dias_antecedencia_lembrete",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Quantos dias antes do vencimento enviar o lembrete
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="dia_vencimento">
                    Dia de Vencimento Padrão
                  </Label>
                  <Input
                    id="dia_vencimento"
                    type="number"
                    min="1"
                    max="31"
                    value={config.dia_vencimento_padrao}
                    onChange={(e) =>
                      updateConfig(
                        "dia_vencimento_padrao",
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Dia padrão para vencimento de mensalidades
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gateway de Pagamento */}
        <TabsContent value="gateway">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Gateway de Pagamento
              </CardTitle>
              <CardDescription>
                Configure a integração com processador de pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gateway_tipo">Provedor do Gateway</Label>
                <Input
                  id="gateway_tipo"
                  placeholder="Ex: MercadoPago, PagSeguro, Stripe"
                  value={config.gateway_tipo || ""}
                  onChange={(e) => updateConfig("gateway_tipo", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_key">API Key (Public Key)</Label>
                <Input
                  id="api_key"
                  type="password"
                  placeholder="Digite a API Key"
                  value={config.gateway_api_key || ""}
                  onChange={(e) =>
                    updateConfig("gateway_api_key", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret_key">Secret Key (Private Key)</Label>
                <Input
                  id="secret_key"
                  type="password"
                  placeholder="Digite a Secret Key"
                  value={config.gateway_secret_key || ""}
                  onChange={(e) =>
                    updateConfig("gateway_secret_key", e.target.value)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="modo_producao">Modo Produção</Label>
                  <p className="text-sm text-gray-500">
                    Ativar apenas quando estiver pronto para produção
                  </p>
                </div>
                <Switch
                  id="modo_producao"
                  checked={config.gateway_modo_producao}
                  onCheckedChange={(checked) =>
                    updateConfig("gateway_modo_producao", checked)
                  }
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Atenção:</strong> Mantenha suas chaves em
                  segurança. Nunca compartilhe suas credenciais.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrações */}
        <TabsContent value="integracoes">
          {/* Configuração Gympass/Totalpass */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Convênios - Gympass & Totalpass</CardTitle>
              <CardDescription>
                Configure a integração com convênios corporativos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gympass */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-lg">Gympass</h3>
                    <p className="text-sm text-gray-500">
                      Integração com a plataforma Gympass/Wellhub
                    </p>
                  </div>
                  <Switch
                    id="gympass_ativo"
                    checked={config.gympass_ativo}
                    onCheckedChange={(checked) =>
                      updateConfig("gympass_ativo", checked)
                    }
                  />
                </div>

                {config.gympass_ativo && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="gympass_unidade_id">
                        ID da Unidade Parceira *
                      </Label>
                      <Input
                        id="gympass_unidade_id"
                        placeholder="Ex: UNIT123456"
                        value={config.gympass_unidade_id || ""}
                        onChange={(e) =>
                          updateConfig("gympass_unidade_id", e.target.value)
                        }
                      />
                      <p className="text-xs text-gray-500">
                        ID fornecido pelo Gympass para sua unidade
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gympass_repasse">
                          Percentual de Repasse (%)
                        </Label>
                        <Input
                          id="gympass_repasse"
                          type="number"
                          min="0"
                          max="100"
                          value={config.gympass_percentual_repasse || 70}
                          onChange={(e) =>
                            updateConfig(
                              "gympass_percentual_repasse",
                              parseFloat(e.target.value)
                            )
                          }
                        />
                        <p className="text-xs text-gray-500">
                          Valor que você recebe por check-in
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Status da Integração</Label>
                        <div className="flex items-center gap-2 h-10">
                          {config.gympass_unidade_id ? (
                            <Badge className="bg-green-100 text-green-800">
                              Configurado
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Pendente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                      <p className="font-medium text-blue-900 mb-1">
                        📋 Informações para o Gympass
                      </p>
                      <div className="text-blue-800 space-y-1">
                        <p>
                          <strong>URL de Registro:</strong>{" "}
                          <code className="bg-white px-1 py-0.5 rounded">
                            {typeof window !== "undefined"
                              ? `${window.location.origin}/api/convenios/gympass/register/${unidadeIdAtual}`
                              : "..."}
                          </code>
                        </p>
                        <p>
                          <strong>URL de Status:</strong>{" "}
                          <code className="bg-white px-1 py-0.5 rounded">
                            {typeof window !== "undefined"
                              ? `${window.location.origin}/api/convenios/gympass/status`
                              : "..."}
                          </code>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Totalpass */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-lg">Totalpass</h3>
                    <p className="text-sm text-gray-500">
                      Integração com a plataforma Totalpass
                    </p>
                  </div>
                  <Switch
                    id="totalpass_ativo"
                    checked={false}
                    onCheckedChange={(checked) => {
                      // TODO: Implementar configuração Totalpass
                      console.log("Totalpass:", checked);
                    }}
                  />
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-600">
                  Em breve disponível
                </div>
              </div>

              {/* Botão para ver alunos */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => (window.location.href = "/financeiro/convenios")}
                  variant="outline"
                >
                  Ver Alunos dos Convênios
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gateway de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Gateway de Pagamento</CardTitle>
              <CardDescription>
                Configure o processador de pagamentos online
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                ⚠️ <strong>Atenção:</strong> Mantenha suas chaves em
                segurança. Nunca compartilhe suas credenciais.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                WhatsApp — rykon-notify
              </CardTitle>
              <CardDescription>
                Conecte um número WhatsApp a esta unidade para envio de cobranças e lembretes automáticos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!rykonNotifyUrl && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                  ⚠️ <strong>Serviço não configurado.</strong> Defina{" "}
                  <code className="font-mono bg-yellow-100 px-1 rounded">NEXT_PUBLIC_RYKON_NOTIFY_URL</code>{" "}
                  no arquivo <code className="font-mono bg-yellow-100 px-1 rounded">.env.local</code>.
                </div>
              )}

              {/* Status da sessão */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Status da conexão</p>
                  {!unidadeIdAtual && (
                    <p className="text-sm text-gray-500 mt-0.5">Selecione uma unidade acima para gerenciar o WhatsApp.</p>
                  )}
                </div>
                <Badge
                  variant={waStatus === "connected" ? "default" : waStatus === "connecting" ? "secondary" : "outline"}
                  className={
                    waStatus === "connected"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : waStatus === "connecting"
                      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }
                >
                  {waStatus === "connected" ? "✅ Conectado" : waStatus === "connecting" ? "⏳ Aguardando QR" : "⚪ Desconectado"}
                </Badge>
              </div>

              <Separator />

              {/* Ações */}
              <div className="flex flex-wrap gap-3">
                {waStatus !== "connected" && (
                  <Button
                    onClick={handleWaConnect}
                    disabled={waLoading || !unidadeIdAtual || !rykonNotifyUrl}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {waLoading ? "Iniciando..." : "Conectar WhatsApp"}
                  </Button>
                )}
                {waStatus === "connected" && (
                  <Button
                    variant="destructive"
                    onClick={handleWaDisconnect}
                    disabled={waLoading}
                  >
                    Desconectar
                  </Button>
                )}
                {waStatus === "connecting" && !waPollingActive && (
                  <Button
                    variant="outline"
                    onClick={() => unidadeIdAtual && setWaPollingActive(true)}
                  >
                    Verificar QR
                  </Button>
                )}
              </div>

              {/* QR Code */}
              {waQr && waStatus !== "connected" && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-medium">
                    Escaneie o QR Code com o WhatsApp do número que deseja usar para cobranças:
                  </p>
                  <div className="inline-block border-2 border-gray-200 rounded-lg p-3 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={waQr.startsWith("data:") ? waQr : `data:image/png;base64,${waQr}`}
                      alt="QR Code WhatsApp"
                      className="w-56 h-56"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    O QR Code é atualizado automaticamente a cada 5 segundos. Se expirar, clique em "Conectar WhatsApp" novamente.
                  </p>
                </div>
              )}

              {waStatus === "connected" && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
                  ✅ WhatsApp conectado! Os envios de cobranças e lembretes para esta unidade estão ativos.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
