"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  ArrowLeft,
  Calendar,
  Building2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Establishment {
  id: number;
  nome: string;
}

export default function BankingPage() {
  const router = useRouter();
  const [saldo, setSaldo] = useState<any>(null);
  const [extrato, setExtrato] = useState<any[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [establishmentId, setEstablishmentId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [semContaBancaria, setSemContaBancaria] = useState(false);

  useEffect(() => {
    carregarEstabelecimentos();
    
    // Definir datas padrão (último mês)
    const hoje = new Date();
    const mesPassado = new Date(hoje);
    mesPassado.setMonth(mesPassado.getMonth() - 1);
    
    setDataInicio(mesPassado.toISOString().split("T")[0]);
    setDataFim(hoje.toISOString().split("T")[0]);
  }, []);

  // Removido auto-carregamento - usuário deve clicar no botão Consultar

  const carregarEstabelecimentos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const estabs = data.data || [];
        setEstablishments(estabs);
        // Não seleciona automaticamente - usuário deve escolher
      }
    } catch (error) {
      console.error("Erro ao carregar estabelecimentos:", error);
      toast.error("Erro ao carregar estabelecimentos");
    } finally {
      setLoading(false);
    }
  };

  const carregarSaldo = async () => {
    if (!establishmentId) {
      toast.error("Selecione um estabelecimento");
      return;
    }

    try {
      setLoadingData(true);
      setSemContaBancaria(false);
      const token = localStorage.getItem("token");
      
      console.log("🏦 Buscando saldo para estabelecimento:", establishmentId);
      const saldoResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/banking/balance?establishment_id=${establishmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (saldoResponse.ok) {
        const saldoData = await saldoResponse.json();
        console.log("💰 Saldo recebido (objeto completo):", saldoData);
        console.log("💰 Campos disponíveis:", Object.keys(saldoData));
        console.log("💰 Saldo disponível (balance):", saldoData.balance);
        console.log("💰 Saldo bloqueado (blocked_balance):", saldoData.blocked_balance);
        console.log("💰 Saldo total (total_balance):", saldoData.total_balance);
        setSaldo(saldoData);
        setSemContaBancaria(false);
      } else {
        const errorText = await saldoResponse.text();
        console.error("❌ Erro ao buscar saldo:", saldoResponse.status, errorText);
        
        // Trata erro específico de conta bancária não encontrada
        if (saldoResponse.status === 400 || saldoResponse.status === 403) {
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.message?.includes("Conta bancária não encontrada") || 
                errorJson.message?.includes("dados bancários") ||
                errorJson.code === "BNK000142") {
              console.log("🏦 Estabelecimento sem conta bancária configurada");
              toast.error("Este estabelecimento não possui conta bancária configurada no PayTime");
              setSaldo(null);
              setExtrato([]);
              setSemContaBancaria(true);
              setLoadingData(false);
              return;
            }
          } catch (e) {
            // Se não conseguir parsear o JSON, continua com erro genérico
          }
        }
        
        throw new Error("Erro ao buscar saldo");
      }

      console.log("📊 Buscando extrato:", { establishmentId, dataInicio, dataFim });
      const extratoResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/banking/extract?establishment_id=${establishmentId}&start_date=${dataInicio}&end_date=${dataFim}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (extratoResponse.ok) {
        const extratoData = await extratoResponse.json();
        console.log("📋 Extrato recebido (objeto completo):", extratoData);
        console.log("📝 Número de lançamentos:", extratoData.data?.length || 0);
        console.log("📝 Estrutura dos dados:", extratoData.data);
        
        if (extratoData.data && extratoData.data.length > 0) {
          console.log("📝 Primeiro lançamento:", extratoData.data[0]);
          console.log("📝 Último lançamento:", extratoData.data[extratoData.data.length - 1]);
        }
        
        setExtrato(extratoData.data || []);
        
        if (!extratoData.data || extratoData.data.length === 0) {
          toast("ℹ️ Nenhum lançamento encontrado no período selecionado");
        } else {
          toast.success(`${extratoData.data.length} lançamento(s) encontrado(s)`);
        }
      } else {
        const errorText = await extratoResponse.text();
        console.error("❌ Erro ao buscar extrato:", extratoResponse.status, errorText);
        throw new Error("Erro ao buscar extrato");
      }
    } catch (error) {
      console.error("❌ Erro geral:", error);
      toast.error("Erro ao carregar dados bancários");
    } finally {
      setLoadingData(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Banking</h1>
            <p className="text-gray-600">Saldo, extrato e transferências</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              {establishments.length > 0 ? (
                <Select
                  value={establishmentId}
                  onValueChange={setEstablishmentId}
                >
                  <SelectTrigger className="bg-white text-gray-900 font-medium border-gray-300">
                    <span className="block truncate text-gray-900 uppercase">
                      {establishmentId 
                        ? establishments.find(e => e.id.toString() === establishmentId)?.nome || "Selecione..."
                        : "Selecione estabelecimento"}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50 border border-gray-200">
                    {establishments.map((est) => (
                      <SelectItem 
                        key={est.id} 
                        value={est.id.toString()}
                        className="text-gray-900 bg-white hover:bg-gray-100 cursor-pointer focus:bg-gray-100 focus:text-gray-900"
                      >
                        <span className="text-gray-900 font-medium uppercase">{est.nome}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 flex items-center px-3 bg-gray-100 border border-gray-300 rounded-md">
                  <span className="text-gray-500 text-sm">Nenhum estabelecimento</span>
                </div>
              )}
            </div>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
            <Button onClick={carregarSaldo} disabled={!establishmentId || loadingData}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
              {loadingData ? 'Consultando...' : 'Consultar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Informações Bancárias do PayTime</h3>
            <p className="text-sm text-blue-800 mb-2">
              Esta página exibe o <b>saldo bancário</b> e o <b>extrato de movimentações</b> do estabelecimento no PayTime. 
              O extrato mostra créditos (recebimentos) e débitos (saques, taxas, transferências) no período selecionado.
            </p>
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded">
              <p className="text-sm text-yellow-800">
                <b>⚠️ Pré-requisito:</b> O estabelecimento precisa ter <b>conta bancária configurada</b> no PayTime para ter saldo e movimentações. 
                Sem conta bancária vinculada, você verá o erro &quot;Conta bancária não encontrada&quot; (BNK000142).
              </p>
            </div>
            {extrato.length === 0 && saldo && (
              <p className="text-sm text-orange-700 mt-2 font-medium">
                ⚠️ Nenhum lançamento encontrado no período. Isso pode significar que não houve movimentações bancárias 
                ou o estabelecimento ainda não realizou transações que gerassem entradas no extrato.
              </p>
            )}
          </div>
        </div>
      </div>

      {saldo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Saldo Disponível</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {((saldo.balance || 0) / 100).toFixed(2)}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bloqueado</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    R$ {((saldo.blocked_balance || 0) / 100).toFixed(2)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {((saldo.total_balance || 0) / 100).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Extrato</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando extrato...</p>
            </div>
          ) : extrato.length > 0 ? (
            <div className="space-y-3">
              {extrato.map((lancamento: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {lancamento.type === "CREDIT" ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{lancamento.description}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(lancamento.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      lancamento.type === "CREDIT"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {lancamento.type === "CREDIT" ? "+" : "-"}R${" "}
                    {((lancamento.amount || 0) / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          ) : semContaBancaria ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 max-w-2xl mx-auto">
                <div className="flex justify-center mb-4">
                  <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center">
                    <Wallet className="h-10 w-10 text-red-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-red-900 mb-3">
                  🏦 Conta Bancária Não Configurada
                </h3>
                <p className="text-red-800 mb-4">
                  O estabelecimento selecionado não possui conta bancária vinculada no PayTime.
                </p>
                <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-left">
                  <p className="text-sm text-red-900 font-semibold mb-2">📋 O que isso significa?</p>
                  <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                    <li>Sem conta bancária vinculada, não é possível ter saldo</li>
                    <li>Não haverá movimentações (créditos/débitos) para exibir</li>
                    <li>É necessário configurar dados bancários primeiro</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-left mt-4">
                  <p className="text-sm text-yellow-900 font-semibold mb-2">⚙️ Como resolver?</p>
                  <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                    <li>
                      Vá para{" "}
                      <button
                        onClick={() => router.push("/admin/estabelecimentos")}
                        className="underline font-semibold hover:text-yellow-900"
                      >
                        Estabelecimentos Paytime
                      </button>
                    </li>
                    <li>Localize o estabelecimento desejado na lista</li>
                    <li>Clique no botão verde <span className="font-mono bg-yellow-200 px-1">⚡ Gateway</span></li>
                    <li>No modal que abrir, selecione a aba <span className="font-semibold">BankAccount</span></li>
                    <li>Preencha: banco, agência, conta, tipo de conta, planos</li>
                    <li>Clique em "Ativar BankAccount" para salvar</li>
                    <li>Volte aqui e consulte novamente o saldo</li>
                  </ol>
                  <p className="text-xs text-yellow-700 mt-2">
                    💡 O estabelecimento deve estar <span className="font-semibold">APPROVED</span> (aprovado) para poder ativar o gateway com conta bancária.
                  </p>
                </div>
                <p className="text-xs text-red-600 mt-4 font-mono">
                  Código: BNK000142 - Conta bancária não encontrada
                </p>
                <Button
                  onClick={() => router.push("/admin/estabelecimentos")}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Ir para Estabelecimentos
                </Button>
              </div>
            </div>
          ) : !saldo ? (
            <div className="text-center py-12">
              <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">
                Clique em &quot;Consultar&quot; para carregar os dados
              </p>
              <p className="text-sm text-gray-500">
                Selecione o estabelecimento e o período desejado acima
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">
                Nenhum lançamento encontrado
              </p>
              <p className="text-sm text-gray-500">
                Não há movimentações bancárias no período de {new Date(dataInicio).toLocaleDateString('pt-BR')} a {new Date(dataFim).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Tente selecionar outro período ou estabelecimento
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
