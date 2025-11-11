"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  QrCode,
  Users,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import toast from "react-hot-toast";

interface Aluno {
  id: string;
  nome: string;
  cpf: string;
  foto: string | null;
  faixa: string;
  corFaixa: string;
  numeroMatricula: string;
  unidade: string;
}

export default function TabletCheckinPage() {
  const router = useRouter();
  const { user } = useAuth();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunosFiltrados, setAlunosFiltrados] = useState<Aluno[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [aulaAtiva, setAulaAtiva] = useState<any>(null);

  // Buscar aula ativa
  useEffect(() => {
    const fetchAulaAtiva = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/presenca/aula-ativa`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAulaAtiva(data);
        }
      } catch (error) {
        console.error("Erro ao buscar aula ativa:", error);
      }
    };

    fetchAulaAtiva();
    const interval = setInterval(fetchAulaAtiva, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  // Buscar alunos da unidade
  useEffect(() => {
    const fetchAlunos = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/alunos/unidade/checkin`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAlunos(data);
          setAlunosFiltrados(data);
        } else {
          toast.error("Erro ao carregar alunos");
        }
      } catch (error) {
        console.error("Erro ao buscar alunos:", error);
        toast.error("Erro ao carregar alunos");
      } finally {
        setLoading(false);
      }
    };

    fetchAlunos();
  }, []);

  // Filtrar alunos por busca
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setAlunosFiltrados(alunos);
    } else {
      const term = searchTerm.toLowerCase();
      const filtrados = alunos.filter(
        (aluno) =>
          aluno.nome.toLowerCase().includes(term) ||
          aluno.cpf.includes(term) ||
          aluno.numeroMatricula?.toLowerCase().includes(term)
      );
      setAlunosFiltrados(filtrados);
    }
  }, [searchTerm, alunos]);

  // Inicializar scanner QR
  useEffect(() => {
    if (scannerActive && !scannerRef.current) {
      try {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            handleQRScan(decodedText);
            scanner.clear();
            setScannerActive(false);
            scannerRef.current = null;
          },
          (error) => {
            // Ignorar erros de scan contínuo
          }
        );

        scannerRef.current = scanner;
      } catch (error) {
        console.error("Erro ao inicializar scanner:", error);
        toast.error("Erro ao inicializar câmera");
        setScannerActive(false);
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [scannerActive]);

  const handleQRScan = async (qrCode: string) => {
    // Extrair ID do aluno do QR code
    // Formato esperado: aluno-{id} ou apenas {id}
    let alunoId = qrCode;
    if (qrCode.startsWith("aluno-")) {
      alunoId = qrCode.replace("aluno-", "");
    }

    const aluno = alunos.find((a) => a.id === alunoId);
    if (aluno) {
      await handleCheckin(aluno, "QR_CODE");
    } else {
      toast.error("Aluno não encontrado");
    }
  };

  const handleCheckin = async (aluno: Aluno, metodo: "LISTA" | "QR_CODE") => {
    if (!aulaAtiva) {
      toast.error("Nenhuma aula ativa no momento");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/checkin-tablet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            alunoId: aluno.id,
            aulaId: aulaAtiva.id,
            metodo: metodo,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Check-in registrado para ${aluno.nome}!\nAguardando aprovação.`,
          { duration: 3000 }
        );
      } else {
        toast.error(data.message || "Erro ao fazer check-in");
      }
    } catch (error) {
      console.error("Erro ao fazer check-in:", error);
      toast.error("Erro ao fazer check-in");
    }
  };

  return (
    <ProtectedRoute requiredPerfis={["TABLET_CHECKIN"]}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">
                Check-in Tablet
              </h1>
              <Badge
                variant="outline"
                className="text-base sm:text-lg px-3 sm:px-4 py-1 sm:py-2"
              >
                <Clock className="w-4 h-4 mr-2" />
                {new Date().toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Badge>
            </div>

            {aulaAtiva ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="py-2 sm:py-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-green-800 text-sm sm:text-base">
                        {aulaAtiva.nome}
                      </p>
                      <p className="text-xs sm:text-sm text-green-600">
                        Professor: {aulaAtiva.professor} |{" "}
                        {aulaAtiva.horarioInicio} - {aulaAtiva.horarioFim}
                      </p>
                    </div>
                    <Badge className="bg-green-600 text-xs sm:text-sm">
                      Aula Ativa
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="py-2 sm:py-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <p className="font-semibold text-sm sm:text-base">
                      Nenhuma aula ativa no momento
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Lista de Alunos */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        Alunos da Unidade
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Toque no aluno para fazer check-in
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      {alunosFiltrados.length} alunos
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Busca */}
                  <div className="relative mb-3 sm:mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                    <Input
                      type="text"
                      placeholder="Buscar por nome, CPF ou matrícula..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 sm:pl-10 text-base sm:text-lg h-10 sm:h-12"
                    />
                  </div>

                  {/* Grid de Alunos */}
                  {loading ? (
                    <div className="text-center py-8 sm:py-12">
                      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600 text-sm sm:text-base">
                        Carregando alunos...
                      </p>
                    </div>
                  ) : alunosFiltrados.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 text-sm sm:text-base">
                        Nenhum aluno encontrado
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto">
                      {alunosFiltrados.map((aluno) => (
                        <Card
                          key={aluno.id}
                          className="cursor-pointer hover:shadow-lg active:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border-2 hover:border-blue-400 touch-manipulation"
                          onClick={() => handleCheckin(aluno, "LISTA")}
                        >
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {/* Foto ou Avatar */}
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
                                {aluno.foto ? (
                                  <img
                                    src={aluno.foto}
                                    alt={aluno.nome}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  aluno.nome.charAt(0).toUpperCase()
                                )}
                              </div>

                              {/* Informações */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 truncate text-sm sm:text-base">
                                  {aluno.nome}
                                </p>
                                <div className="flex items-center gap-1 sm:gap-2 mt-1">
                                  <Badge
                                    style={{ backgroundColor: aluno.corFaixa }}
                                    className="text-[10px] sm:text-xs text-white px-1 sm:px-2"
                                  >
                                    {aluno.faixa}
                                  </Badge>
                                  <span className="text-[10px] sm:text-xs text-gray-500 truncate">
                                    {aluno.numeroMatricula}
                                  </span>
                                </div>
                              </div>

                              {/* Ícone Check-in */}
                              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Scanner QR */}
            <div className="lg:col-span-1 order-1 lg:order-2">
              <Card className="lg:sticky lg:top-4">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                    Scanner QR Code
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Aluno pode escanear seu QR code
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!scannerActive ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                        <QrCode className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                      </div>
                      <Button
                        onClick={() => setScannerActive(true)}
                        className="w-full touch-manipulation text-base sm:text-lg h-10 sm:h-12"
                        size="lg"
                      >
                        Ativar Scanner
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div id="qr-reader" className="w-full"></div>
                      <Button
                        onClick={() => {
                          setScannerActive(false);
                          if (scannerRef.current) {
                            scannerRef.current.clear().catch(console.error);
                            scannerRef.current = null;
                          }
                        }}
                        variant="outline"
                        className="w-full mt-3 sm:mt-4 touch-manipulation h-10 sm:h-11"
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}

                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-blue-800 font-semibold mb-2">
                      ℹ️ Instruções
                    </p>
                    <ul className="text-[10px] sm:text-xs text-blue-700 space-y-1">
                      <li>• Toque no nome do aluno na lista</li>
                      <li>• Ou ative o scanner para ler QR code</li>
                      <li>• Check-in será enviado para aprovação</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
