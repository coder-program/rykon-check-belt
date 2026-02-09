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
  id: string;
  status: string;
  amount: number;
  payment_type: string;
  created_at: string;
  updated_at?: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  customer_document?: string;
  installments?: number;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  billet_url?: string;
  billet_barcode?: string;
  card_brand?: string;
  card_last_digits?: string;
  establishment?: any;
  metadata?: any;
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
        
        // Seleciona o primeiro estabelecimento automaticamente
        if (estabs.length > 0) {
          setSelectedEstablishment(estabs[0].id.toString());
          console.log('✅ Estabelecimento selecionado:', estabs[0].id, estabs[0].nome);
        } else {
          console.warn('⚠️ Nenhum estabelecimento encontrado');
          toast.error("Nenhum estabelecimento encontrado");
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
      return;
    }

    try {
      setLoading(true);
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
    if (filtroTipo !== "all" && t.payment_type !== filtroTipo) return false;
    if (busca && !t.id.toLowerCase().includes(busca.toLowerCase())) return false;
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
      ["ID", "Status", "Tipo", "Valor", "Cliente", "Email", "Data"].join(","),
      ...transacoesFiltradas.map((t) =>
        [
          t.id,
          t.status,
          t.payment_type,
          (t.amount / 100).toFixed(2),
          t.customer_name || "-",
          t.customer_email || "-",
          new Date(t.created_at).toLocaleString("pt-BR"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacoes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Transações exportadas!");
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
              {transacoesFiltradas.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  {selectedEstablishment 
                    ? "Nenhuma transação encontrada"
                    : "Selecione um estabelecimento para ver as transações"}
                </div>
              ) : (
                transacoesFiltradas.map((transacao, index) => (
                <Card
                  key={`${transacao.id}-${index}`}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => verDetalhes(transacao)}
                >
                  <CardContent className="p-4">
                    {/* Header com ícone, ID e status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          {getPaymentIcon(transacao.payment_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm text-gray-900">ID: {transacao.id}</p>
                            <Badge className={getStatusBadge(transacao.status)}>
                              {transacao.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-700">{transacao.payment_type}</span>
                            {transacao.installments && transacao.installments > 1 && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                                {transacao.installments}x
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
                      </div>
                    </div>

                    {/* Informações de Pagamento */}
                    {transacao.card_brand && (
                      <div className="mb-2 pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700 font-medium">
                            {transacao.card_brand} •••• {transacao.card_last_digits}
                          </span>
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
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Hash className="h-4 w-4" />
                  ID: {selectedTransaction.id}
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
              {/* Status e Valor */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={getStatusBadge(selectedTransaction.status)}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Valor</p>
                  <p className="text-3xl font-bold text-gray-900">
                    R$ {(selectedTransaction.amount / 100).toFixed(2)}
                  </p>
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
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Tipo de Pagamento</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getPaymentIcon(selectedTransaction.payment_type)}
                      <span className="font-medium">{selectedTransaction.payment_type}</span>
                    </div>
                  </div>
                  {selectedTransaction.installments && (
                    <div>
                      <p className="text-gray-600">Parcelas</p>
                      <p className="font-medium">{selectedTransaction.installments}x de R$ {(selectedTransaction.amount / 100 / selectedTransaction.installments).toFixed(2)}</p>
                    </div>
                  )}
                  {selectedTransaction.card_brand && (
                    <>
                      <div>
                        <p className="text-gray-600">Bandeira</p>
                        <p className="font-medium">{selectedTransaction.card_brand}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Final do Cartão</p>
                        <p className="font-medium">•••• {selectedTransaction.card_last_digits}</p>
                      </div>
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

              {/* Informações do Aluno/Cliente */}
              {(selectedTransaction.aluno || selectedTransaction.customer_name || selectedTransaction.customer_email) && (
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
                        {selectedTransaction.customer_document && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">🆔 CPF</p>
                            <p className="font-medium">{selectedTransaction.customer_document}</p>
                          </div>
                        )}
                        {selectedTransaction.aluno.numero_matricula && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">🎓 Matrícula</p>
                            <p className="font-medium">{selectedTransaction.aluno.numero_matricula}</p>
                          </div>
                        )}
                        {selectedTransaction.aluno.telefone && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">📱 Telefone</p>
                            <p className="font-medium">{selectedTransaction.aluno.telefone}</p>
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
                        {selectedTransaction.customer_name && (
                          <div>
                            <p className="text-gray-600">Nome</p>
                            <p className="font-medium">{selectedTransaction.customer_name}</p>
                          </div>
                        )}
                        {selectedTransaction.customer_email && (
                          <div>
                            <p className="text-gray-600">Email</p>
                            <p className="font-medium">{selectedTransaction.customer_email}</p>
                          </div>
                        )}
                        {selectedTransaction.customer_document && (
                          <div>
                            <p className="text-gray-600">Documento</p>
                            <p className="font-medium">{selectedTransaction.customer_document}</p>
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
              {selectedTransaction.payment_type === "PIX" && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Informações PIX
                  </h3>
                  {selectedTransaction.pix_qr_code && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-2">QR Code</p>
                      <img 
                        src={selectedTransaction.pix_qr_code} 
                        alt="QR Code PIX" 
                        className="w-48 h-48 border rounded"
                      />
                    </div>
                  )}
                  {selectedTransaction.pix_copy_paste && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Copia e Cola</p>
                      <div className="flex gap-2">
                        <Input 
                          value={selectedTransaction.pix_copy_paste} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copiarTexto(selectedTransaction.pix_copy_paste!, "Código PIX copiado!")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Boleto */}
              {selectedTransaction.payment_type === "BILLET" && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Informações do Boleto
                  </h3>
                  {selectedTransaction.billet_url && (
                    <div className="mb-3">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(selectedTransaction.billet_url, '_blank')}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Abrir Boleto
                      </Button>
                    </div>
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
