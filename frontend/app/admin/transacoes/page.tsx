"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Transaction {
  id: string;
  status: string;
  amount: number;
  payment_type: string;
  created_at: string;
  establishment?: any;
}

interface Establishment {
  id: number;
  name: string;
}

export default function TransacoesPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [busca, setBusca] = useState("");

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
        
        // Seleciona o primeiro estabelecimento automaticamente
        if (estabs.length > 0) {
          setSelectedEstablishment(estabs[0].id.toString());
        }
      }
    } catch (error) {
      console.error("Erro ao carregar estabelecimentos:", error);
      toast.error("Erro ao carregar estabelecimentos");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
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

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              value={selectedEstablishment}
              onValueChange={setSelectedEstablishment}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione estabelecimento" />
              </SelectTrigger>
              <SelectContent>
                {establishments.map((est) => (
                  <SelectItem key={est.id} value={est.id.toString()}>
                    {est.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            <Button variant="outline">
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
          <div className="space-y-3">
            {transacoesFiltradas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma transação encontrada
              </div>
            ) : (
              transacoesFiltradas.map((transacao, index) => (
                <div
                  key={`${transacao.id}-${index}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                <div className="flex items-center gap-4">
                  {getPaymentIcon(transacao.payment_type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">ID: {transacao.id}</p>
                      <Badge className={getStatusBadge(transacao.status)}>
                        {transacao.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {transacao.payment_type} •{" "}
                      {new Date(transacao.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-bold">
                    R$ {(transacao.amount / 100).toFixed(2)}
                  </p>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
