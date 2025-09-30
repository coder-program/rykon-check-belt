"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAlunos } from "@/lib/peopleApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Clock,
  Users,
  QrCode,
  UserCheck,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  Search,
  Camera,
  Smartphone,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";

interface Aluno {
  id: string;
  nome_completo: string;
  cpf: string;
  unidade_id: string;
  status: string;
}

interface PresencaRegistro {
  id: string;
  alunoId: string;
  nomeAluno: string;
  dataHora: Date;
  unidadeId: string;
  metodoCheckin: "QR_CODE" | "CPF" | "MANUAL" | "BUSCA_NOME";
}

export default function SistemaPresencaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedTab, setSelectedTab] = useState<
    "checkin" | "registros" | "relatorios"
  >("checkin");
  const [metodoCheckin, setMetodoCheckin] = useState<
    "qr" | "cpf" | "busca" | "manual"
  >("qr");
  const [searchTerm, setSearchTerm] = useState("");
  const [cpfInput, setCpfInput] = useState("");
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [presencasHoje, setPresencasHoje] = useState<PresencaRegistro[]>([]);
  const [showConfirmacao, setShowConfirmacao] = useState(false);

  const qrScannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  // Verificar permissões
  const hasPerfil = (p: string) =>
    (user?.perfis || [])
      .map((x: string) => x.toLowerCase())
      .includes(p.toLowerCase());

  const podeRegistrarPresenca =
    hasPerfil("master") ||
    hasPerfil("instrutor") ||
    hasPerfil("franqueado") ||
    hasPerfil("gerente_unidade");

  const alunosQuery = useQuery({
    queryKey: ["alunos-presenca"],
    queryFn: () => listAlunos({ pageSize: 500, status: "ATIVO" }),
  });

  const registrarPresencaMutation = useMutation({
    mutationFn: async ({
      alunoId,
      metodo,
    }: {
      alunoId: string;
      metodo: string;
    }) => {
      // Simular API de registro de presença
      const novaPresenca: PresencaRegistro = {
        id: Date.now().toString(),
        alunoId,
        nomeAluno:
          alunosQuery.data?.items.find((a: Aluno) => a.id === alunoId)
            ?.nome_completo || "",
        dataHora: new Date(),
        unidadeId: user?.unidade_id || "unidade-1",
        metodoCheckin: metodo as any,
      };

      // Adicionar ao localStorage para persistir durante a sessão
      const presencasExistentes = JSON.parse(
        localStorage.getItem("presencas-hoje") || "[]"
      );
      presencasExistentes.push(novaPresenca);
      localStorage.setItem(
        "presencas-hoje",
        JSON.stringify(presencasExistentes)
      );

      return novaPresenca;
    },
    onSuccess: (novaPresenca) => {
      setPresencasHoje((prev) => [...prev, novaPresenca]);
      toast.success(`Presença registrada: ${novaPresenca.nomeAluno}`);
      setSelectedAluno(null);
      setShowConfirmacao(false);
      setCpfInput("");
      setSearchTerm("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao registrar presença");
    },
  });

  // Carregar presenças do localStorage ao inicializar
  useEffect(() => {
    const presencasSalvas = JSON.parse(
      localStorage.getItem("presencas-hoje") || "[]"
    );
    const presencasHoje = presencasSalvas.filter((p: PresencaRegistro) => {
      const dataPresenca = new Date(p.dataHora);
      const hoje = new Date();
      return dataPresenca.toDateString() === hoje.toDateString();
    });
    setPresencasHoje(presencasHoje);
  }, []);

  // Inicializar QR Scanner
  useEffect(() => {
    if (showQrScanner && qrReaderRef.current) {
      qrScannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      qrScannerRef.current.render(
        (decodedText) => {
          // Procurar aluno pelo código QR (pode ser CPF ou ID)
          const aluno = alunosQuery.data?.items.find(
            (a: Aluno) => a.cpf === decodedText || a.id === decodedText
          );

          if (aluno) {
            setSelectedAluno(aluno);
            setShowConfirmacao(true);
            setShowQrScanner(false);
            qrScannerRef.current?.clear();
          } else {
            toast.error("Aluno não encontrado com este código QR");
          }
        },
        (error) => {
          console.log("QR Scan error:", error);
        }
      );
    }

    return () => {
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.clear();
        } catch (e) {
          console.log("Error clearing QR scanner:", e);
        }
      }
    };
  }, [showQrScanner, alunosQuery.data]);

  const buscarPorCpf = () => {
    if (!cpfInput.trim()) return;

    const cpfLimpo = cpfInput.replace(/\D/g, "");
    const aluno = alunosQuery.data?.items.find(
      (a: Aluno) => a.cpf.replace(/\D/g, "") === cpfLimpo
    );

    if (aluno) {
      // Verificar se já fez check-in hoje
      const jaFezCheckin = presencasHoje.some((p) => p.alunoId === aluno.id);
      if (jaFezCheckin) {
        toast.error("Este aluno já fez check-in hoje!");
        return;
      }

      setSelectedAluno(aluno);
      setShowConfirmacao(true);
    } else {
      toast.error("Aluno não encontrado com este CPF");
    }
  };

  const buscarPorNome = (termo: string) => {
    return (
      alunosQuery.data?.items
        .filter((aluno: Aluno) =>
          aluno.nome_completo.toLowerCase().includes(termo.toLowerCase())
        )
        .slice(0, 10) || []
    );
  };

  const confirmarPresenca = () => {
    if (!selectedAluno) return;

    // Verificar se já fez check-in hoje
    const jaFezCheckin = presencasHoje.some(
      (p) => p.alunoId === selectedAluno.id
    );
    if (jaFezCheckin) {
      toast.error("Este aluno já fez check-in hoje!");
      return;
    }

    const metodoMap = {
      qr: "QR_CODE",
      cpf: "CPF",
      busca: "BUSCA_NOME",
      manual: "MANUAL",
    };

    registrarPresencaMutation.mutate({
      alunoId: selectedAluno.id,
      metodo: metodoMap[metodoCheckin],
    });
  };

  const formatCpf = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const alunosBusca = searchTerm ? buscarPorNome(searchTerm) : [];
  const alunos = alunosQuery.data?.items || [];

  // Estatísticas
  const stats = {
    presencasHoje: presencasHoje.length,
    totalAlunos: alunos.length,
    taxaPresenca:
      alunos.length > 0
        ? Math.round((presencasHoje.length / alunos.length) * 100)
        : 0,
    porQrCode: presencasHoje.filter((p) => p.metodoCheckin === "QR_CODE")
      .length,
    porCpf: presencasHoje.filter((p) => p.metodoCheckin === "CPF").length,
    porBusca: presencasHoje.filter((p) => p.metodoCheckin === "BUSCA_NOME")
      .length,
    porManual: presencasHoje.filter((p) => p.metodoCheckin === "MANUAL").length,
  };

  if (!podeRegistrarPresenca) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <Clock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Restrito
          </h1>
          <p className="text-gray-600">
            Você não tem permissão para registrar presenças.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Sistema de Presença
            </h1>
          </div>
          <p className="text-gray-600">
            Registre presenças através de QR Code, CPF ou busca manual
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Presenças Hoje
              </CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.presencasHoje}
              </div>
              <p className="text-xs text-muted-foreground">
                Check-ins registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Alunos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlunos}</div>
              <p className="text-xs text-muted-foreground">Alunos ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa Presença
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.taxaPresenca}%
              </div>
              <p className="text-xs text-muted-foreground">
                Do total de alunos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">QR Code</CardTitle>
              <QrCode className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.porQrCode}
              </div>
              <p className="text-xs text-muted-foreground">Via QR Code</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setSelectedTab("checkin")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === "checkin"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Check-in
            </button>
            <button
              onClick={() => setSelectedTab("registros")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === "registros"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Registros Hoje
            </button>
            <button
              onClick={() => setSelectedTab("relatorios")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === "relatorios"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Relatórios
            </button>
          </div>
        </div>

        {/* Check-in Tab */}
        {selectedTab === "checkin" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Métodos de Check-in */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Métodos de Check-in
                </CardTitle>
                <CardDescription>
                  Escolha como registrar a presença do aluno
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR Code */}
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    metodoCheckin === "qr"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setMetodoCheckin("qr")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <QrCode className="h-6 w-6 text-purple-600" />
                    <div>
                      <h3 className="font-semibold">QR Code</h3>
                      <p className="text-sm text-gray-600">
                        Escaneie o código QR do aluno
                      </p>
                    </div>
                  </div>
                  {metodoCheckin === "qr" && (
                    <button
                      onClick={() => setShowQrScanner(true)}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      Abrir Scanner
                    </button>
                  )}
                </div>

                {/* CPF */}
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    metodoCheckin === "cpf"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setMetodoCheckin("cpf")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <UserCheck className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold">CPF</h3>
                      <p className="text-sm text-gray-600">
                        Digite o CPF do aluno
                      </p>
                    </div>
                  </div>
                  {metodoCheckin === "cpf" && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Digite o CPF..."
                        value={cpfInput}
                        onChange={(e) => setCpfInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={buscarPorCpf}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Buscar
                      </button>
                    </div>
                  )}
                </div>

                {/* Busca por Nome */}
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    metodoCheckin === "busca"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setMetodoCheckin("busca")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Search className="h-6 w-6 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">Busca por Nome</h3>
                      <p className="text-sm text-gray-600">
                        Procure o aluno pelo nome
                      </p>
                    </div>
                  </div>
                  {metodoCheckin === "busca" && (
                    <div>
                      <input
                        type="text"
                        placeholder="Digite o nome do aluno..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {searchTerm && alunosBusca.length > 0 && (
                        <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                          {alunosBusca.map((aluno: Aluno) => (
                            <div
                              key={aluno.id}
                              onClick={() => {
                                setSelectedAluno(aluno);
                                setShowConfirmacao(true);
                              }}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium">
                                {aluno.nome_completo}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatCpf(aluno.cpf)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resumo do Dia */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resumo de Hoje
                </CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString("pt-BR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">QR Code</span>
                    </div>
                    <span className="text-xl font-bold text-purple-600">
                      {stats.porQrCode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-600" />
                      <span className="font-medium">CPF</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      {stats.porCpf}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Search className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Busca</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600">
                      {stats.porBusca}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Manual</span>
                    </div>
                    <span className="text-xl font-bold text-gray-600">
                      {stats.porManual}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Registros Tab */}
        {selectedTab === "registros" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Registros de Presença - Hoje
              </CardTitle>
              <CardDescription>
                Lista de todos os check-ins realizados hoje (
                {stats.presencasHoje} registros)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {presencasHoje.map((presenca) => (
                  <div
                    key={presenca.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{presenca.nomeAluno}</h3>
                        <p className="text-sm text-gray-600">
                          Via {presenca.metodoCheckin.replace("_", " ")}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-medium">
                        {new Date(presenca.dataHora).toLocaleTimeString(
                          "pt-BR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(presenca.dataHora).toLocaleDateString(
                          "pt-BR"
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {presencasHoje.length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Nenhuma presença registrada hoje
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Relatórios Tab */}
        {selectedTab === "relatorios" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Métodos de Check-in
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>QR Code</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{
                            width: `${
                              stats.presencasHoje > 0
                                ? (stats.porQrCode / stats.presencasHoje) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {stats.porQrCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>CPF</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${
                              stats.presencasHoje > 0
                                ? (stats.porCpf / stats.presencasHoje) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {stats.porCpf}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Busca</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${
                              stats.presencasHoje > 0
                                ? (stats.porBusca / stats.presencasHoje) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {stats.porBusca}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
                    <div className="text-3xl font-bold">
                      {stats.taxaPresenca}%
                    </div>
                    <div className="text-sm opacity-90">Taxa de Presença</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {stats.presencasHoje}
                      </div>
                      <div className="text-sm text-gray-600">Presentes</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {stats.totalAlunos - stats.presencasHoje}
                      </div>
                      <div className="text-sm text-gray-600">Ausentes</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* QR Scanner Modal */}
        {showQrScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-purple-600" />
                  Scanner QR Code
                </h2>
              </div>

              <div className="p-6">
                <div id="qr-reader" ref={qrReaderRef} className="w-full"></div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowQrScanner(false);
                    if (qrScannerRef.current) {
                      qrScannerRef.current.clear();
                    }
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmação Modal */}
        {showConfirmacao && selectedAluno && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Confirmar Presença
                </h2>
              </div>

              <div className="p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {selectedAluno.nome_completo}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    CPF: {formatCpf(selectedAluno.cpf)}
                  </p>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Registrar presença via{" "}
                      {metodoCheckin === "qr"
                        ? "QR Code"
                        : metodoCheckin === "cpf"
                        ? "CPF"
                        : "Busca por Nome"}
                      ?
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowConfirmacao(false);
                    setSelectedAluno(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarPresenca}
                  disabled={registrarPresencaMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {registrarPresencaMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Confirmar Presença
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
