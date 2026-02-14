"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  QrCode,
  CreditCard,
  FileText,
  Search,
  Download,
  RefreshCw,
  Eye,
  ArrowLeft,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Hash,
  Link as LinkIcon,
  Copy,
  Building2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Transaction {
  _id?: string;
  id: string;
  status: string;
  amount: number;
  original_amount?: number;
  fees?: number;
  interest?: string;
  payment_type: string;
  type?: string;
  created_at: string;
  updated_at?: string;
  description?: string;
  reference_id?: string;
  gateway_key?: string;
  gateway_authorization?: string;
  customer_name?: string;
  customer_email?: string;
  customer_document?: string;
  installments?: number;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  emv?: string;
  billet_url?: string;
  billet_barcode?: string;
  card_brand?: string;
  card_last_digits?: string;
  card?: {
    brand_name?: string;
    first4_digits?: string;
    last4_digits?: string;
    holder_name?: string;
    expiration_month?: string;
    expiration_year?: string;
    bin?: string;
  };
  establishment?: any;
  metadata?: any;
  customer?: {
    first_name?: string;
    last_name?: string;
    document?: string;
    email?: string;
    phone?: string;
    address?: any;
  };
  acquirer?: {
    name?: string;
    acquirer_nsu?: number;
    gateway_key?: string;
    mid?: string;
  };
  payment_response?: {
    code?: string;
    message?: string;
    authorization_code?: string;
    nsu?: string;
    reason_code?: string;
    reference?: string;
  };
  expected_on?: Array<{
    installment: number;
    date: string;
    amount: number;
    status: string;
    paid_at?: string;
  }>;
  antifraud?: Array<{
    analyse_required?: string;
    analyse_status?: string;
    antifraud_id?: string;
  }>;
  point_of_sale?: {
    type?: string;
    identification_type?: string;
  };
  aluno?: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    unidade_id: string;
    numero_matricula?: string;
    status: string;
  };
}

interface Establishment {
  id: number;
  nome: string;
}

export default function TransacoesPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingEstabelecimentos, setLoadingEstabelecimentos] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    carregarEstabelecimentos();
  }, []);

  useEffect(() => {
    if (selectedEstablishment) {
      carregarTransacoes();
    }
  }, [selectedEstablishment]);

  const carregarEstabelecimentos = async () => {
    try {
      setLoadingEstabelecimentos(true);
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
        console.log('📍 Estabelecimentos recebidos:', data);
        const estabs = data.data || [];
        console.log('📍 Lista de estabelecimentos:', estabs);
        setEstablishments(estabs);
        
        // NÃO seleciona automaticamente - usuário deve escolher
        if (estabs.length === 0) {
          console.warn('⚠️ Nenhum estabelecimento encontrado');
          toast.error("Nenhum estabelecimento encontrado");
        } else {
          console.log(`✅ ${estabs.length} estabelecimento(s) disponível(is). Selecione um no combo.`);
        }
      } else {
        console.error('❌ Erro na resposta:', response.status, response.statusText);
        toast.error("Erro ao buscar estabelecimentos");
      }
    } catch (error) {
      console.error("❌ Erro ao carregar estabelecimentos:", error);
      toast.error("Erro ao carregar estabelecimentos");
    } finally {
      setLoadingEstabelecimentos(false);
    }
  };

  const carregarTransacoes = async () => {
    if (!selectedEstablishment) {
      console.log('⚠️ Nenhum estabelecimento selecionado');
      return;
    }

    try {
      setLoading(true);
      console.log(`🔄 Carregando transações do estabelecimento ${selectedEstablishment}...`);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            establishment_id: selectedEstablishment,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Dados recebidos da API:', data);
        console.log('🔍 Primeira transação COMPLETA:', JSON.stringify(data.data?.[0], null, 2));
        console.log('👤 Dados do aluno (primeira transação):', data.data?.[0]?.aluno);
        console.log('📋 info_additional:', data.data?.[0]?.info_additional);
        console.log('📋 metadata:', data.data?.[0]?.metadata);
        setTransactions(data.data || []);
      } else {
        throw new Error("Erro ao carregar transações");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PAID: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      FAILED: "bg-red-100 text-red-800",
      CANCELED: "bg-gray-100 text-gray-800",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case "PIX":
        return <QrCode className="h-5 w-5 text-blue-600" />;
      case "CREDIT":
      case "DEBIT":
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      case "BILLET":
        return <FileText className="h-5 w-5 text-orange-600" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-600" />;
    }
  };

  const transacoesFiltradas = transactions.filter((t) => {
    if (filtroStatus !== "all" && t.status !== filtroStatus) return false;
    if (filtroTipo !== "all" && (t.type || t.payment_type) !== filtroTipo) return false;
    if (busca) {
      const buscaLower = busca.toLowerCase();
      const camposBusca = [
        t._id,
        t.id,
        t.reference_id,
        t.customer_name,
        t.customer_email,
        t.customer_document,
        t.aluno?.nome,
        t.aluno?.numero_matricula,
        t.aluno?.email,
        t.customer?.first_name,
        t.customer?.last_name,
        t.customer?.email,
        t.customer?.document,
        t.acquirer?.acquirer_nsu?.toString(),
        t.payment_response?.authorization_code,
        t.payment_response?.nsu,
        t.gateway_key,
      ].filter(Boolean);
      
      const encontrado = camposBusca.some(campo => 
        campo?.toString().toLowerCase().includes(buscaLower)
      );
      
      if (!encontrado) return false;
    }
    return true;
  });

  const calcularEstatisticas = () => {
    const totalPago = transactions
      .filter((t) => t.status === "PAID")
      .reduce((sum, t) => sum + t.amount, 0) / 100;
    
    const totalPendente = transactions
      .filter((t) => t.status === "PENDING")
      .reduce((sum, t) => sum + t.amount, 0) / 100;
    
    const totalFalha = transactions.filter((t) => t.status === "FAILED").length;
    const totalCancelado = transactions.filter((t) => t.status === "CANCELED").length;

    return { totalPago, totalPendente, totalFalha, totalCancelado };
  };

  const stats = calcularEstatisticas();

  const verDetalhes = async (transacao: Transaction) => {
    setSelectedTransaction(transacao);
    setShowModal(true);
  };

  const copiarTexto = (texto: string, mensagem: string) => {
    navigator.clipboard.writeText(texto);
    toast.success(mensagem);
  };

  const exportarTransacoes = () => {
    const csv = [
      [
        "ID_MongoDB",
        "ID",
        "Reference_ID",
        "Status",
        "Tipo",
        "Valor_Liquido",
        "Valor_Bruto",
        "Taxas",
        "Gateway",
        "Parcelas",
        "Cliente",
        "CPF/CNPJ",
        "Email",
        "Telefone",
        "Aluno",
        "Matricula",
        "Estabelecimento",
        "NSU_Adquirente",
        "Codigo_Autorizacao",
        "Data_Criacao",
        "Data_Atualizacao"
      ].join(","),
      ...transacoesFiltradas.map((t) =>
        [
          t._id || t.id,
          t.id,
          t.reference_id || "-",
          t.status,
          t.type || t.payment_type,
          (t.amount / 100).toFixed(2),
          (t.original_amount ? (t.original_amount / 100).toFixed(2) : (t.amount / 100).toFixed(2)),
          (t.fees ? (t.fees / 100).toFixed(2) : "0.00"),
          t.gateway_authorization || "-",
          t.installments || 1,
          t.customer_name || t.customer?.first_name || t.aluno?.nome || "-",
          t.customer_document || t.customer?.document || "-",
          t.customer_email || t.customer?.email || t.aluno?.email || "-",
          t.customer?.phone || t.aluno?.telefone || "-",
          t.aluno?.nome || "-",
          t.aluno?.numero_matricula || "-",
          t.establishment?.first_name || t.establishment?.name || "-",
          t.acquirer?.acquirer_nsu || "-",
          t.payment_response?.authorization_code || "-",
          new Date(t.created_at).toLocaleString("pt-BR"),
          t.updated_at ? new Date(t.updated_at).toLocaleString("pt-BR") : "-",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacoes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Transações exportadas com mais detalhes!");
  };

  if (loadingEstabelecimentos) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando estabelecimentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Transações</h1>
            <p className="text-gray-600">Gestão de pagamentos PIX, Cartão e Boleto</p>
          </div>
        </div>
        <Button onClick={carregarTransacoes}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recebido</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {stats.totalPago.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  R$ {stats.totalPendente.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Falhas</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalFalha}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelados</p>
                <p className="text-2xl font-bold text-gray-600">{stats.totalCancelado}</p>
              </div>
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              {establishments.length > 0 ? (
                <Select
                  value={selectedEstablishment}
                  onValueChange={setSelectedEstablishment}
                >
                  <SelectTrigger className="bg-white text-gray-900 font-medium border-gray-300">
                    <span className="block truncate text-gray-900 uppercase">
                      {selectedEstablishment 
                        ? establishments.find(e => e.id.toString() === selectedEstablishment)?.nome || "Selecione..."
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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar ID..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="FAILED">Falhou</SelectItem>
                <SelectItem value="CANCELED">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="CREDIT">Crédito</SelectItem>
                <SelectItem value="DEBIT">Débito</SelectItem>
                <SelectItem value="BILLET">Boleto</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportarTransacoes}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{transacoesFiltradas.length} Transação(ões)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-600">Carregando transações...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {!selectedEstablishment ? (
                <div className="col-span-full">
                  <Card className="border-2 border-dashed border-yellow-300 bg-yellow-50">
                    <CardContent className="py-12">
                      <div className="text-center">
                        <Building2 className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Selecione um Estabelecimento
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Escolha um estabelecimento no filtro acima para visualizar as transações
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-yellow-700 bg-yellow-100 px-4 py-2 rounded-lg inline-block">
                          <AlertCircle className="h-4 w-4" />
                          <span>Use o combo de estabelecimentos para começar</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : transacoesFiltradas.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Nenhuma transação encontrada
                </div>
              ) : (
                transacoesFiltradas.map((transacao, index) => (
                <Card
                  key={`${transacao._id || transacao.id}-${index}`}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => verDetalhes(transacao)}
                >
                  <CardContent className="p-4">
                    {/* Header com ícone, ID e status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          {getPaymentIcon(transacao.type || transacao.payment_type)}
                        </div>
                        <div>
                          <div className="flex flex-col gap-0.5 mb-1">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-xs text-gray-600">
                                {transacao._id ? transacao._id.substring(0, 12) + '...' : transacao.id}
                              </p>
                              <Badge className={getStatusBadge(transacao.status)}>
                                {transacao.status}
                              </Badge>
                            </div>
                            {transacao.reference_id && (
                              <p className="text-xs text-blue-600 font-medium">
                                Ref: {transacao.reference_id}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-medium text-gray-700">{transacao.type || transacao.payment_type}</span>
                            {transacao.installments && transacao.installments > 1 && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                                {transacao.installments}x
                              </span>
                            )}
                            {transacao.gateway_authorization && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                {transacao.gateway_authorization}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          R$ {(transacao.amount / 100).toFixed(2)}
                        </p>
                        {transacao.installments && transacao.installments > 1 && (
                          <p className="text-xs text-gray-500">
                            {transacao.installments}x R$ {(transacao.amount / 100 / transacao.installments).toFixed(2)}
                          </p>
                        )}
                        {transacao.original_amount && transacao.original_amount !== transacao.amount && (
                          <p className="text-xs text-gray-400 line-through">
                            R$ {(transacao.original_amount / 100).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Informações de Pagamento */}
                    {(transacao.card || transacao.card_brand) && (
                      <div className="mb-2 pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700 font-medium">
                            {transacao.card?.brand_name || transacao.card_brand} {transacao.card?.first4_digits || '••••'} •••• {transacao.card?.last4_digits || transacao.card_last_digits}
                          </span>
                        </div>
                        {transacao.card?.holder_name && (
                          <p className="text-xs text-gray-500 ml-6 mt-1">
                            {transacao.card.holder_name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Autorização/NSU */}
                    {(transacao.acquirer?.acquirer_nsu || transacao.payment_response?.authorization_code) && (
                      <div className="mb-2 pb-2 border-b">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          {transacao.acquirer?.acquirer_nsu && (
                            <span className="font-mono">
                              NSU: {transacao.acquirer.acquirer_nsu}
                            </span>
                          )}
                          {transacao.payment_response?.authorization_code && (
                            <span className="font-mono">
                              Auth: {transacao.payment_response.authorization_code}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Estabelecimento */}
                    {transacao.establishment && (
                      <div className="mb-2 pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {transacao.establishment.first_name || transacao.establishment.name}
                            </p>
                            {transacao.establishment.document && (
                              <p className="text-xs text-gray-500">
                                CNPJ: {transacao.establishment.document}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Informações do Cliente/Aluno */}
                    <div className="mb-2 pb-2 border-b">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          {transacao.aluno ? (
                            <>
                              <p className="text-sm font-medium text-green-700">
                                🎓 Aluno: {transacao.aluno.nome}
                              </p>
                              {transacao.aluno.numero_matricula && (
                                <p className="text-xs text-gray-500">
                                  Matrícula: {transacao.aluno.numero_matricula}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Status: {transacao.aluno.status}
                              </p>
                              {transacao.customer_name && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Cliente: {transacao.customer_name}
                                </p>
                              )}
                            </>
                          ) : transacao.customer_name ? (
                            <>
                              <p className="text-sm font-medium text-gray-900">{transacao.customer_name}</p>
                              {transacao.customer_email && (
                                <p className="text-xs text-gray-500">{transacao.customer_email}</p>
                              )}
                              {transacao.customer_document && (
                                <p className="text-xs text-gray-500">Doc: {transacao.customer_document}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-400 italic">
                              Sem informações do cliente
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Descrição */}
                    {transacao.description && (
                      <div className="mb-2 pb-2 border-b">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          💬 {transacao.description}
                        </p>
                      </div>
                    )}

                    {/* Rodapé com data e ação */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(transacao.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          verDetalhes(transacao);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      {showModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-2xl">Detalhes da Transação</CardTitle>
                <CardDescription className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <span className="font-mono text-xs">{selectedTransaction._id || selectedTransaction.id}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copiarTexto(
                        selectedTransaction._id || selectedTransaction.id,
                        "ID copiado!"
                      )}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {selectedTransaction.reference_id && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <LinkIcon className="h-3 w-3" />
                      Ref: {selectedTransaction.reference_id}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => copiarTexto(
                          selectedTransaction.reference_id!,
                          "Reference ID copiado!"
                        )}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status e Valores */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <Badge className={getStatusBadge(selectedTransaction.status)}>
                    {selectedTransaction.status}
                  </Badge>
                  {selectedTransaction.gateway_authorization && (
                    <p className="text-xs text-gray-500 mt-2">
                      Gateway: <span className="font-medium">{selectedTransaction.gateway_authorization}</span>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Valor Líquido</p>
                  <p className="text-3xl font-bold text-green-600">
                    R$ {(selectedTransaction.amount / 100).toFixed(2)}
                  </p>
                  {selectedTransaction.original_amount && selectedTransaction.original_amount !== selectedTransaction.amount && (
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <p>Bruto: R$ {(selectedTransaction.original_amount / 100).toFixed(2)}</p>
                      {selectedTransaction.fees && (
                        <p className="text-red-600">Taxas: -R$ {(selectedTransaction.fees / 100).toFixed(2)}</p>
                      )}
                      {selectedTransaction.interest && (
                        <p className="text-xs">Taxas: {selectedTransaction.interest === 'CLIENT' ? 'Cliente' : 'Loja'}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Informações do Estabelecimento */}
              {selectedTransaction.establishment && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Estabelecimento
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-blue-50 p-4 rounded-lg">
                    <div>
                      <p className="text-gray-600">Nome</p>
                      <p className="font-medium">{selectedTransaction.establishment.first_name || selectedTransaction.establishment.name}</p>
                    </div>
                    {selectedTransaction.establishment.document && (
                      <div>
                        <p className="text-gray-600">CNPJ</p>
                        <p className="font-medium">{selectedTransaction.establishment.document}</p>
                      </div>
                    )}
                    {selectedTransaction.establishment.email && (
                      <div>
                        <p className="text-gray-600">Email</p>
                        <p className="font-medium">{selectedTransaction.establishment.email}</p>
                      </div>
                    )}
                    {selectedTransaction.establishment.phone_number && (
                      <div>
                        <p className="text-gray-600">Telefone</p>
                        <p className="font-medium">{selectedTransaction.establishment.phone_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Informações do Pagamento */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Informações do Pagamento
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm bg-purple-50 p-4 rounded-lg">
                  <div>
                    <p className="text-gray-600">Tipo de Pagamento</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getPaymentIcon(selectedTransaction.type || selectedTransaction.payment_type)}
                      <span className="font-medium">{selectedTransaction.type || selectedTransaction.payment_type}</span>
                    </div>
                  </div>
                  {selectedTransaction.point_of_sale?.type && (
                    <div>
                      <p className="text-gray-600">Ponto de Venda</p>
                      <p className="font-medium">{selectedTransaction.point_of_sale.type}</p>
                      {selectedTransaction.point_of_sale.identification_type && (
                        <p className="text-xs text-gray-500">{selectedTransaction.point_of_sale.identification_type}</p>
                      )}
                    </div>
                  )}
                  {selectedTransaction.installments && (
                    <div>
                      <p className="text-gray-600">Parcelas</p>
                      <p className="font-medium">{selectedTransaction.installments}x de R$ {(selectedTransaction.amount / 100 / selectedTransaction.installments).toFixed(2)}</p>
                    </div>
                  )}
                  {(selectedTransaction.card || selectedTransaction.card_brand) && (
                    <>
                      <div>
                        <p className="text-gray-600">Bandeira</p>
                        <p className="font-medium">{selectedTransaction.card?.brand_name || selectedTransaction.card_brand}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cartão</p>
                        <p className="font-medium font-mono">
                          {selectedTransaction.card?.first4_digits || '••••'} •••• •••• {selectedTransaction.card?.last4_digits || selectedTransaction.card_last_digits}
                        </p>
                      </div>
                      {selectedTransaction.card?.holder_name && (
                        <div className="col-span-2">
                          <p className="text-gray-600">Portador</p>
                          <p className="font-medium">{selectedTransaction.card.holder_name}</p>
                        </div>
                      )}
                      {selectedTransaction.card?.expiration_month && (
                        <div>
                          <p className="text-gray-600">Validade</p>
                          <p className="font-medium">{selectedTransaction.card.expiration_month}/{selectedTransaction.card.expiration_year}</p>
                        </div>
                      )}
                      {selectedTransaction.card?.bin && (
                        <div>
                          <p className="text-gray-600">BIN</p>
                          <p className="font-medium font-mono">{selectedTransaction.card.bin}</p>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <p className="text-gray-600">Data de Criação</p>
                    <p className="font-medium">{new Date(selectedTransaction.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  {selectedTransaction.updated_at && (
                    <div>
                      <p className="text-gray-600">Última Atualização</p>
                      <p className="font-medium">{new Date(selectedTransaction.updated_at).toLocaleString("pt-BR")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Informações da Adquirente/Autorização */}
              {(selectedTransaction.acquirer || selectedTransaction.payment_response || selectedTransaction.gateway_key) && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Autorização e Processamento
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-green-50 p-4 rounded-lg">
                    {selectedTransaction.acquirer?.name && (
                      <div>
                        <p className="text-gray-600">Adquirente</p>
                        <p className="font-medium">{selectedTransaction.acquirer.name}</p>
                      </div>
                    )}
                    {selectedTransaction.acquirer?.acquirer_nsu && (
                      <div>
                        <p className="text-gray-600">NSU Adquirente</p>
                        <p className="font-medium font-mono">{selectedTransaction.acquirer.acquirer_nsu}</p>
                      </div>
                    )}
                    {selectedTransaction.acquirer?.mid && (
                      <div>
                        <p className="text-gray-600">MID</p>
                        <p className="font-medium font-mono">{selectedTransaction.acquirer.mid}</p>
                      </div>
                    )}
                    {selectedTransaction.gateway_key && (
                      <div className="col-span-2">
                        <p className="text-gray-600">Gateway Key</p>
                        <p className="font-medium font-mono text-xs break-all">{selectedTransaction.gateway_key}</p>
                      </div>
                    )}
                    {selectedTransaction.payment_response?.authorization_code && (
                      <div>
                        <p className="text-gray-600">Código de Autorização</p>
                        <p className="font-medium font-mono">{selectedTransaction.payment_response.authorization_code}</p>
                      </div>
                    )}
                    {selectedTransaction.payment_response?.nsu && (
                      <div>
                        <p className="text-gray-600">NSU</p>
                        <p className="font-medium font-mono">{selectedTransaction.payment_response.nsu}</p>
                      </div>
                    )}
                    {selectedTransaction.payment_response?.code && (
                      <div>
                        <p className="text-gray-600">Código Resposta</p>
                        <p className="font-medium">{selectedTransaction.payment_response.code}</p>
                      </div>
                    )}
                    {selectedTransaction.payment_response?.message && (
                      <div className="col-span-2">
                        <p className="text-gray-600">Mensagem</p>
                        <p className="font-medium">{selectedTransaction.payment_response.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Antifraude */}
              {selectedTransaction.antifraud && selectedTransaction.antifraud.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Análise Antifraude
                  </h3>
                  <div className="space-y-2">
                    {selectedTransaction.antifraud.map((af, idx) => (
                      <div key={idx} className="p-3 bg-yellow-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {af.analyse_required && (
                            <div>
                              <p className="text-gray-600">Tipo</p>
                              <p className="font-medium">{af.analyse_required}</p>
                            </div>
                          )}
                          {af.analyse_status && (
                            <div>
                              <p className="text-gray-600">Status</p>
                              <Badge variant={af.analyse_status === 'APPROVED' ? 'default' : 'secondary'}>
                                {af.analyse_status}
                              </Badge>
                            </div>
                          )}
                          {af.antifraud_id && (
                            <div className="col-span-2">
                              <p className="text-gray-600">ID Antifraude</p>
                              <p className="font-medium font-mono text-xs">{af.antifraud_id}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Previsão de Recebimento */}
              {selectedTransaction.expected_on && selectedTransaction.expected_on.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Previsão de Recebimento
                  </h3>
                  <div className="space-y-2">
                    {selectedTransaction.expected_on.map((exp, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium">Parcela {exp.installment}/{selectedTransaction.expected_on!.length}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(exp.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                          {exp.paid_at && (
                            <p className="text-xs text-green-600 mt-1">
                              Pago em {new Date(exp.paid_at).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-900">R$ {(exp.amount / 100).toFixed(2)}</p>
                          <Badge variant={exp.status === 'PAID' ? 'default' : 'secondary'} className="text-xs mt-1">
                            {exp.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informações do Aluno/Cliente */}
              {(selectedTransaction.aluno || selectedTransaction.customer || selectedTransaction.customer_name || selectedTransaction.customer_email) && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedTransaction.aluno ? 'Informações do Aluno' : 'Informações do Cliente'}
                  </h3>
                  <div className={`grid grid-cols-2 gap-4 text-sm p-4 rounded-lg ${
                    selectedTransaction.aluno ? 'bg-blue-50' : 'bg-green-50'
                  }`}>
                    {selectedTransaction.aluno ? (
                      <>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">👤 Nome do Aluno</p>
                          <p className="font-semibold text-blue-900">{selectedTransaction.aluno.nome}</p>
                        </div>
                        {selectedTransaction.aluno.email && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">📧 Email</p>
                            <p className="font-medium">{selectedTransaction.aluno.email}</p>
                          </div>
                        )}
                        {(selectedTransaction.customer_document || selectedTransaction.customer?.document) && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">🆔 CPF</p>
                            <p className="font-medium">{selectedTransaction.customer_document || selectedTransaction.customer?.document}</p>
                          </div>
                        )}
                        {selectedTransaction.aluno.numero_matricula && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">🎓 Matrícula</p>
                            <p className="font-medium">{selectedTransaction.aluno.numero_matricula}</p>
                          </div>
                        )}
                        {(selectedTransaction.aluno.telefone || selectedTransaction.customer?.phone) && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">📱 Telefone</p>
                            <p className="font-medium">{selectedTransaction.aluno.telefone || selectedTransaction.customer?.phone}</p>
                          </div>
                        )}
                        {selectedTransaction.aluno.status && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Status do Aluno</p>
                            <Badge variant={selectedTransaction.aluno.status === 'ATIVO' ? 'default' : 'secondary'}>
                              {selectedTransaction.aluno.status}
                            </Badge>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {(selectedTransaction.customer?.first_name || selectedTransaction.customer_name) && (
                          <div>
                            <p className="text-gray-600">Nome</p>
                            <p className="font-medium">
                              {selectedTransaction.customer?.first_name 
                                ? `${selectedTransaction.customer.first_name} ${selectedTransaction.customer.last_name || ''}`.trim()
                                : selectedTransaction.customer_name
                              }
                            </p>
                          </div>
                        )}
                        {(selectedTransaction.customer?.email || selectedTransaction.customer_email) && (
                          <div>
                            <p className="text-gray-600">Email</p>
                            <p className="font-medium">{selectedTransaction.customer?.email || selectedTransaction.customer_email}</p>
                          </div>
                        )}
                        {(selectedTransaction.customer?.document || selectedTransaction.customer_document) && (
                          <div>
                            <p className="text-gray-600">Documento</p>
                            <p className="font-medium">{selectedTransaction.customer?.document || selectedTransaction.customer_document}</p>
                          </div>
                        )}
                        {selectedTransaction.customer?.phone && (
                          <div>
                            <p className="text-gray-600">Telefone</p>
                            <p className="font-medium">{selectedTransaction.customer.phone}</p>
                          </div>
                        )}
                        {selectedTransaction.customer?.address && (
                          <div className="col-span-2">
                            <p className="text-gray-600 mb-1">Endereço</p>
                            <p className="font-medium text-sm">
                              {selectedTransaction.customer.address.street}, {selectedTransaction.customer.address.number}
                              {selectedTransaction.customer.address.complement && ` - ${selectedTransaction.customer.address.complement}`}
                              <br />
                              {selectedTransaction.customer.address.neighborhood} - {selectedTransaction.customer.address.city}/{selectedTransaction.customer.address.state}
                              <br />
                              CEP: {selectedTransaction.customer.address.zip_code}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Descrição */}
              {selectedTransaction.description && (
                <div>
                  <h3 className="font-semibold mb-2">Descrição</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedTransaction.description}
                  </p>
                </div>
              )}

              {/* PIX QR Code e Copia e Cola */}
              {(selectedTransaction.type === "PIX" || selectedTransaction.payment_type === "PIX") && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Informações PIX
                  </h3>
                  <div className="space-y-3">
                    {selectedTransaction.pix_qr_code && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">QR Code</p>
                        <img 
                          src={selectedTransaction.pix_qr_code} 
                          alt="QR Code PIX" 
                          className="w-48 h-48 border rounded mx-auto"
                        />
                      </div>
                    )}
                    {(selectedTransaction.pix_copy_paste || selectedTransaction.emv) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Copia e Cola (EMV)</p>
                        <div className="flex gap-2">
                          <Input 
                            value={selectedTransaction.pix_copy_paste || selectedTransaction.emv} 
                            readOnly 
                            className="font-mono text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copiarTexto(
                              selectedTransaction.pix_copy_paste || selectedTransaction.emv!,
                              "Código PIX copiado!"
                            )}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Boleto */}
              {(selectedTransaction.type === "BILLET" || selectedTransaction.payment_type === "BILLET") && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Informações do Boleto
                  </h3>
                  <div className="space-y-3">
                    {selectedTransaction.billet_url && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(selectedTransaction.billet_url, '_blank')}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Abrir Boleto PDF
                      </Button>
                    )}
                    {selectedTransaction.billet_barcode && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Código de Barras</p>
                        <div className="flex gap-2">
                          <Input 
                            value={selectedTransaction.billet_barcode} 
                            readOnly 
                            className="font-mono text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copiarTexto(selectedTransaction.billet_barcode!, "Código de barras copiado!")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
