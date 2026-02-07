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
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Establishment {
  id: number;
  name: string;
}

export default function BankingPage() {
  const router = useRouter();
  const [saldo, setSaldo] = useState<any>(null);
  const [extrato, setExtrato] = useState<any[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [establishmentId, setEstablishmentId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    carregarEstabelecimentos();
    
    // Definir datas padrão (último mês)
    const hoje = new Date();
    const mesPassado = new Date(hoje);
    mesPassado.setMonth(mesPassado.getMonth() - 1);
    
    setDataInicio(mesPassado.toISOString().split("T")[0]);
    setDataFim(hoje.toISOString().split("T")[0]);
  }, []);

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
          setEstablishmentId(estabs[0].id.toString());
        }
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
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const saldoResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/banking/balance?establishment_id=${establishmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (saldoResponse.ok) {
        const saldoData = await saldoResponse.json();
        setSaldo(saldoData);
      } else {
        throw new Error("Erro ao buscar saldo");
      }

      const extratoResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/banking/extract?establishment_id=${establishmentId}&start_date=${dataInicio}&end_date=${dataFim}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (extratoResponse.ok) {
        const extratoData = await extratoResponse.json();
        setExtrato(extratoData.data || []);
      } else {
        throw new Error("Erro ao buscar extrato");
      }

      toast.success("Dados carregados com sucesso!");
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados bancários");
    } finally {
      setLoading(false);
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
            <Select
              value={establishmentId}
              onValueChange={setEstablishmentId}
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
            <Button onClick={carregarSaldo} disabled={!establishmentId}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Consultar
            </Button>
          </div>
        </CardContent>
      </Card>

      {saldo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Saldo Disponível</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {((saldo.available || 0) / 100).toFixed(2)}
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
                    R$ {((saldo.blocked || 0) / 100).toFixed(2)}
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
                    R$ {((saldo.total || 0) / 100).toFixed(2)}
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
          {extrato.length > 0 ? (
            <div className="space-y-3">
              {extrato.map((lancamento: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
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
          ) : (
            <p className="text-center py-12 text-gray-500">
              Selecione um estabelecimento e período para ver o extrato
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
