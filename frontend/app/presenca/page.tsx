"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useFranqueadoProtection } from "@/hooks/useFranqueadoProtection";
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
import { Label } from "@/components/ui/label";
import {
  QrCode,
  Clock,
  CheckCircle,
  MapPin,
  Calendar,
  Trophy,
  TrendingUp,
  History,
  ArrowLeft,
  Camera,
  UserCheck,
  Users,
  Search,
  CreditCard,
  User,
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import QRCode from "qrcode";
import toast from "react-hot-toast";

interface Aluno {
  id: string;
  nome: string;
  cpf?: string;
  graduacao?: string;
  jaFezCheckin?: boolean;
}

interface Presenca {
  id: string;
  data: string;
  horario: string;
  tipo: "entrada" | "saida";
  aula: {
    nome: string;
    professor: string;
    unidade: string;
  };
}

interface AulaAtiva {
  id: string;
  nome: string;
  professor: string;
  unidade: string;
  horarioInicio: string;
  horarioFim: string;
  qrCode: string;
}

export default function PresencaPage() {
  const { shouldBlock } = useFranqueadoProtection();

  const router = useRouter();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  if (shouldBlock) return null; // Estados existentes
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [aulaAtiva, setAulaAtiva] = useState<AulaAtiva | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string>("");
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    presencaMensal: 0,
    aulasMes: 0,
    sequenciaAtual: 0,
    ultimaPresenca: null as string | null,
  });

  // Novos estados para funcionalidades expandidas
  const [metodoCheckin, setMetodoCheckin] = useState<
    "QR_CODE" | "CPF" | "FACIAL" | "NOME"
  >("QR_CODE");
  const [cpfInput, setCpfInput] = useState("");
  const [nomeInput, setNomeInput] = useState("");
  const [sugestoesNomes, setSugestoesNomes] = useState<
    Array<{ id: string; nome: string; cpf: string }>
  >([]);
  const [mostrandoSugestoes, setMostrandoSugestoes] = useState(false);
  const [facialActive, setFacialActive] = useState(false);
  const [alunosEncontrados, setAlunosEncontrados] = useState<Aluno[]>([]);
  const [meusFilhos, setMeusFilhos] = useState<Aluno[]>([]);
  const [showResponsavelMode, setShowResponsavelMode] = useState(false);
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [presencasPendentes, setPresencasPendentes] = useState<any[]>([]);

  useEffect(() => {
    loadAulaAtiva();
    loadHistoricoPresenca();
    loadPresencasPendentes();
    loadEstatisticas();
    loadMeusFilhos();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Verificar se é responsável e tem filhos cadastrados
    if (user && meusFilhos.length > 0) {
      setShowResponsavelMode(true);
    }
  }, [user, meusFilhos]);

  const loadAulaAtiva = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/aula-ativa`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim() !== "") {
          try {
            const data = JSON.parse(text);
            // Se o servidor retorna null explicitamente, aceitar
            if (data === null) {
              setAulaAtiva(null);
            } else {
              setAulaAtiva(data);
              // Gerar QR code visual
              if (data.qrCode) {
                generateQRCodeImage(data.qrCode);
              }
            }
          } catch (parseError) {
            console.error("Erro ao fazer parse do JSON:", parseError);
            console.error("Texto recebido:", text);
            setAulaAtiva(null);
          }
        } else {
          setAulaAtiva(null);
        }
      } else {
        console.error(
          "Erro na resposta da API:",
          response.status,
          response.statusText
        );
        setAulaAtiva(null);
      }
    } catch (error) {
      console.error("Erro ao carregar aula ativa:", error);
      setAulaAtiva(null);
    }
  };

  const generateQRCodeImage = async (qrText: string) => {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(qrText, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeImageUrl(qrCodeDataURL);
    } catch (error) {
      console.error("Erro ao gerar QR code:", error);
    }
  };

  const loadHistoricoPresenca = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/minha-historico`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPresencas(data.slice(0, 10)); // Últimas 10 presenças
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const loadPresencasPendentes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/minhas-pendentes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPresencasPendentes(data);
      }
    } catch (error) {
      console.error("Erro ao carregar pendentes:", error);
    }
  };

  const loadEstatisticas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/minhas-estatisticas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadMeusFilhos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/meus-filhos`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMeusFilhos(data);
      }
    } catch (error) {
      console.error("Erro ao carregar filhos:", error);
    }
  };

  const startQRScanner = () => {
    if (scanner) {
      scanner.clear();
    }

    // Primeiro ativa o scanner state para renderizar o elemento
    setScannerActive(true);

    // Aguarda o próximo tick para garantir que o elemento foi renderizado
    setTimeout(() => {
      const element = document.getElementById("qr-reader");
      if (!element) {
        console.error("Elemento qr-reader não encontrado");
        setMessage({ type: "error", text: "Erro ao inicializar scanner" });
        setScannerActive(false);
        return;
      }

      const newScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      newScanner.render(
        (decodedText) => {
          processQRCode(decodedText);
          newScanner.clear();
          setScannerActive(false);
        },
        (error) => {
          // Silenciar erros de scan contínuo
          if (!error.includes("QR code parse error")) {
            console.warn("Erro no scanner:", error);
          }
        }
      );

      setScanner(newScanner);
    }, 100);
  };

  const processQRCode = async (qrData: string) => {
    setLoading(true);
    try {
      // Obter geolocalização do usuário
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              });
            }
          );
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }
      } catch (geoError) {
        console.warn("⚠️ Não foi possível obter localização:", geoError);
        // Continua sem localização - o backend decidirá se bloqueia ou não
      }

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/check-in-qr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            qrCode: qrData,
            latitude,
            longitude,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Check-in realizado com sucesso!",
        });
        loadHistoricoPresenca();
        loadPresencasPendentes();
        loadEstatisticas();
      } else {
        setMessage({
          type: "error",
          text: result.message || "Erro ao realizar check-in",
        });
      }
    } catch (error) {
      console.error("Erro no check-in:", error);
      setMessage({ type: "error", text: "Erro ao processar check-in" });
    } finally {
      setLoading(false);
    }
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setScannerActive(false);
  };

  const checkInManual = async () => {
    if (!aulaAtiva) return;

    setLoading(true);
    try {
      // Obter geolocalização do usuário
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              });
            }
          );
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }
      } catch (geoError) {
        console.warn(" Não foi possível obter localização:", geoError);
        toast.error(
          "Não foi possível obter sua localização. Verifique as permissões do navegador."
        );
        setLoading(false);
        return; // Bloqueia o check-in se não conseguir a localização
      }

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/check-in-manual`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            aulaId: aulaAtiva.id,
            latitude,
            longitude,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Check-in manual realizado com sucesso!", {
          duration: 3000,
        });
        setMessage({
          type: "success",
          text: "Check-in manual realizado com sucesso!",
        });
        loadHistoricoPresenca();
        loadEstatisticas();
      } else {
        toast.error(result.message || "Erro ao realizar check-in manual");
        setMessage({
          type: "error",
          text: result.message || "Erro ao realizar check-in manual",
        });
      }
    } catch (error) {
      console.error("Erro no check-in manual:", error);
      toast.error("Erro ao processar check-in manual");
      setMessage({ type: "error", text: "Erro ao processar check-in manual" });
    } finally {
      setLoading(false);
    }
  };

  const checkInCPF = async () => {
    if (!aulaAtiva || !cpfInput.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/check-in-cpf`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cpf: cpfInput.replace(/\D/g, ""),
            aulaId: aulaAtiva.id,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Check-in por CPF realizado com sucesso!", {
          duration: 3000,
        });
        setCpfInput("");
        loadHistoricoPresenca();
        loadEstatisticas();
      } else {
        toast.error(result.message || "Erro ao realizar check-in por CPF");
      }
    } catch (error) {
      console.error("Erro no check-in por CPF:", error);
      toast.error("Erro ao processar check-in por CPF");
    } finally {
      setLoading(false);
    }
  };

  const buscarSugestoesNome = async (termo: string) => {
    if (termo.length < 2) {
      setSugestoesNomes([]);
      setMostrandoSugestoes(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/alunos/buscar-por-nome?nome=${encodeURIComponent(termo)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const pessoas = await response.json();
        const sugestoes = pessoas
          .slice(0, 5)
          .map(
            (pessoa: {
              id: string;
              nome_completo: string;
              cpf?: string;
              documento?: string;
            }) => ({
              id: pessoa.id,
              nome: pessoa.nome_completo,
              cpf: pessoa.cpf || pessoa.documento,
            })
          );
        setSugestoesNomes(sugestoes);
        setMostrandoSugestoes(true);
      }
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error);
    }
  };

  const buscarPorNome = async () => {
    if (!nomeInput.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/presenca/alunos/buscar?termo=${encodeURIComponent(nomeInput)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const alunos = await response.json();
        setAlunosEncontrados(alunos);
      }
    } catch (error) {
      console.error("Erro ao buscar alunos:", error);
      toast.error("Erro ao buscar alunos");
    } finally {
      setLoading(false);
    }
  };

  const checkInPorSugestao = async (pessoa: {
    id: string;
    nome: string;
    cpf: string;
  }) => {
    if (!aulaAtiva) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/check-in-nome`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            aulaId: aulaAtiva.id,
            nomeCompleto: pessoa.nome,
            alunoId: pessoa.id,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Check-in realizado para ${pessoa.nome}!`,
        });
        setNomeInput("");
        setSugestoesNomes([]);
        setMostrandoSugestoes(false);
        loadHistoricoPresenca();
        loadEstatisticas();
      } else {
        setMessage({
          type: "error",
          text: result.message || "Erro ao realizar check-in",
        });
      }
    } catch (error) {
      console.error("Erro no check-in:", error);
      setMessage({ type: "error", text: "Erro ao processar check-in" });
    } finally {
      setLoading(false);
    }
  };

  const checkInAluno = async (alunoId: string) => {
    if (!aulaAtiva) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/check-in-responsavel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            alunoId,
            aulaId: aulaAtiva.id,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Check-in realizado com sucesso!", {
          duration: 3000,
        });
        setAlunosEncontrados([]);
        setNomeInput("");
        loadHistoricoPresenca();
        loadEstatisticas();
      } else {
        toast.error(result.message || "Erro ao realizar check-in");
      }
    } catch (error) {
      console.error("Erro no check-in:", error);
      toast.error("Erro ao processar check-in");
    } finally {
      setLoading(false);
    }
  };

  const startFacialRecognition = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setFacialActive(true);

        // Simular captura após 3 segundos
        setTimeout(() => {
          capturarFoto();
        }, 3000);
      }
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      toast.error("Erro ao acessar câmera para reconhecimento facial");
    }
  };

  const capturarFoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        const fotoBase64 = canvas.toDataURL("image/jpeg");
        processarFacial(fotoBase64);
      }
    }
  };

  const processarFacial = async (fotoBase64: string) => {
    if (!aulaAtiva) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/check-in-facial`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            foto: fotoBase64,
            aulaId: aulaAtiva.id,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Check-in facial realizado com sucesso!", {
          duration: 3000,
        });
        stopFacialRecognition();
        loadHistoricoPresenca();
        loadEstatisticas();
      } else {
        toast.error(result.message || "Erro no reconhecimento facial");
      }
    } catch (error) {
      console.error("Erro no check-in facial:", error);
      toast.error("Reconhecimento facial ainda não disponível");
    } finally {
      setLoading(false);
      stopFacialRecognition();
    }
  };

  const stopFacialRecognition = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setFacialActive(false);
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-8 w-8 text-green-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Marcar Presença
                </h1>
              </div>
              <p className="text-gray-600">
                Faça seu check-in nas aulas usando QR Code ou manualmente
              </p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === "success" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
                {message.text}
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-500 rounded-xl shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-700">
                      {statsLoading ? "..." : `${stats.presencaMensal}%`}
                    </div>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-green-900 mb-1">
                  Presença Mensal
                </h3>
                <p className="text-xs text-green-700">
                  {stats.presencaMensal >= 80
                    ? "🔥 Excelente!"
                    : "📈 Pode melhorar"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-700">
                      {statsLoading ? "..." : stats.aulasMes}
                    </div>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  Aulas Este Mês
                </h3>
                <p className="text-xs text-blue-700">Aulas frequentadas</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-500 rounded-xl shadow-lg">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-yellow-700">
                      {statsLoading ? "..." : stats.sequenciaAtual}
                    </div>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                  Sequência Atual
                </h3>
                <p className="text-xs text-yellow-700">
                  🔥 {stats.sequenciaAtual} dias consecutivos
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
                    <History className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-700">
                      {statsLoading
                        ? "..."
                        : stats.ultimaPresenca
                        ? formatDate(stats.ultimaPresenca).split(" ")[0]
                        : "---"}
                    </div>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-purple-900 mb-1">
                  Última Presença
                </h3>
                <p className="text-xs text-purple-700">
                  {stats.ultimaPresenca
                    ? "Último check-in"
                    : "Faça seu primeiro check-in!"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Check-in Section */}
            <div className="space-y-6">
              {/* Seletor de Método de Check-in */}
              {aulaAtiva && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle>Métodos de Check-in</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Button
                        variant={
                          metodoCheckin === "QR_CODE" ? "default" : "outline"
                        }
                        onClick={() => setMetodoCheckin("QR_CODE")}
                        className="flex items-center gap-2"
                      >
                        <QrCode className="h-4 w-4" />
                        QR Code
                      </Button>
                      {!user?.perfis?.some(
                        (p: string) => p.toLowerCase() === "aluno"
                      ) && (
                        <>
                          <Button
                            variant={
                              metodoCheckin === "CPF" ? "default" : "outline"
                            }
                            onClick={() => setMetodoCheckin("CPF")}
                            className="flex items-center gap-2"
                          >
                            <CreditCard className="h-4 w-4" />
                            CPF
                          </Button>
                          <Button
                            variant={
                              metodoCheckin === "FACIAL" ? "default" : "outline"
                            }
                            onClick={() => setMetodoCheckin("FACIAL")}
                            className="flex items-center gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            Facial
                          </Button>
                          <Button
                            variant={
                              metodoCheckin === "NOME" ? "default" : "outline"
                            }
                            onClick={() => setMetodoCheckin("NOME")}
                            className="flex items-center gap-2"
                          >
                            <Search className="h-4 w-4" />
                            Nome
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Check-in por QR Code */}
              {aulaAtiva && metodoCheckin === "QR_CODE" && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5" />
                      Scanner QR Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!scannerActive ? (
                      <div className="space-y-4">
                        <p className="text-gray-600">
                          Posicione o QR Code da carteirinha em frente à câmera
                          para fazer o check-in automaticamente.
                        </p>
                        <Button onClick={startQRScanner} className="w-full">
                          <QrCode className="mr-2 h-4 w-4" />
                          Iniciar Scanner
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div id="qr-reader" className="w-full"></div>
                        <Button
                          onClick={stopScanner}
                          variant="outline"
                          className="w-full"
                        >
                          Parar Scanner
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Check-in por CPF */}
              {aulaAtiva && metodoCheckin === "CPF" && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Check-in por CPF
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cpf">Digite seu CPF</Label>
                        <Input
                          id="cpf"
                          type="text"
                          placeholder="000.000.000-00"
                          value={cpfInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCpfInput(formatCPF(e.target.value))
                          }
                          maxLength={14}
                        />
                      </div>
                      <Button
                        onClick={checkInCPF}
                        className="w-full"
                        disabled={loading || !cpfInput.trim()}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        {loading ? "Processando..." : "Fazer Check-in"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Check-in Facial */}
              {aulaAtiva && metodoCheckin === "FACIAL" && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Reconhecimento Facial
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {facialActive ? (
                        <div className="space-y-4">
                          <video
                            ref={videoRef}
                            autoPlay
                            muted
                            className="w-full max-w-md mx-auto rounded-lg border"
                          />
                          <div className="text-center">
                            <p className="text-sm text-gray-600">
                              Posicione seu rosto na câmera...
                            </p>
                          </div>
                          <Button
                            onClick={stopFacialRecognition}
                            variant="outline"
                            className="w-full"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-gray-600">
                            Use o reconhecimento facial para fazer check-in de
                            forma rápida e segura.
                          </p>
                          <Button
                            onClick={startFacialRecognition}
                            className="w-full"
                            disabled={loading}
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            {loading
                              ? "Processando..."
                              : "Iniciar Reconhecimento"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Check-in por Nome */}
              {aulaAtiva && metodoCheckin === "NOME" && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Buscar por Nome
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="relative">
                        <Label htmlFor="nome">Digite o nome do aluno</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="nome"
                              type="text"
                              placeholder="Nome do aluno..."
                              value={nomeInput}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => {
                                const valor = e.target.value;
                                setNomeInput(valor);
                                buscarSugestoesNome(valor);
                              }}
                              onFocus={() => {
                                if (
                                  nomeInput.length >= 2 &&
                                  sugestoesNomes.length > 0
                                ) {
                                  setMostrandoSugestoes(true);
                                }
                              }}
                            />

                            {/* Dropdown de Sugestões */}
                            {mostrandoSugestoes &&
                              sugestoesNomes.length > 0 && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                  {sugestoesNomes.map((pessoa) => (
                                    <div
                                      key={pessoa.id}
                                      className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      onClick={() => checkInPorSugestao(pessoa)}
                                    >
                                      <div className="font-medium text-sm">
                                        {pessoa.nome}
                                      </div>
                                      {pessoa.cpf && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          CPF: {pessoa.cpf}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                          <Button
                            onClick={buscarPorNome}
                            disabled={loading || !nomeInput.trim()}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Clique fora para fechar sugestões */}
                        {mostrandoSugestoes && (
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMostrandoSugestoes(false)}
                          />
                        )}
                      </div>

                      {alunosEncontrados.length > 0 && (
                        <div className="space-y-2">
                          <Label>Alunos encontrados:</Label>
                          {alunosEncontrados.map((aluno) => (
                            <div
                              key={aluno.id}
                              className="flex justify-between items-center p-2 border rounded"
                            >
                              <span>{aluno.nome}</span>
                              <Button
                                size="sm"
                                onClick={() => checkInAluno(aluno.id)}
                                disabled={loading}
                              >
                                Check-in
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Check-in para Responsáveis */}
              {aulaAtiva && showResponsavelMode && meusFilhos.length > 0 && (
                <Card className="border-2 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Check-in dos seus dependentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {meusFilhos.map((filho) => (
                        <div
                          key={filho.id}
                          className="flex justify-between items-center p-2 border rounded"
                        >
                          <div>
                            <span className="font-medium">{filho.nome}</span>
                            <p className="text-sm text-gray-500">
                              {filho.graduacao}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => checkInAluno(filho.id)}
                            disabled={loading || filho.jaFezCheckin}
                            variant={filho.jaFezCheckin ? "outline" : "default"}
                          >
                            {filho.jaFezCheckin ? (
                              <span className="flex items-center gap-1">
                                <UserCheck className="h-4 w-4" />
                                Presente
                              </span>
                            ) : (
                              "Check-in"
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Check-in Manual (mantido como fallback) */}
              {aulaAtiva && (
                <Card className="border-2 border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Check-in Manual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-gray-600 text-sm">
                        Use apenas quando outros métodos não funcionarem.
                      </p>
                      <Button
                        onClick={checkInManual}
                        variant="outline"
                        className="w-full"
                        disabled={loading}
                      >
                        <User className="mr-2 h-4 w-4" />
                        {loading ? "Processando..." : "Check-in Manual"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* QR Scanner */}
              {scannerActive && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Scanner QR Code</span>
                      <Button onClick={stopScanner} variant="outline" size="sm">
                        Cancelar
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Aponte a câmera para o QR Code da aula
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div id="qr-reader" className="w-full"></div>
                  </CardContent>
                </Card>
              )}

              {/* No Active Class */}
              {!aulaAtiva && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Nenhuma Aula Ativa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      Não há aulas acontecendo agora. Verifique os horários ou
                      entre em contato com sua unidade.
                    </p>
                    <Button
                      onClick={() => router.push("/horarios")}
                      variant="outline"
                    >
                      Ver Horários
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Histórico */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Histórico Recente
                    </CardTitle>
                    <CardDescription>
                      Suas últimas presenças registradas
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/historico-presenca")}
                    className="flex items-center gap-2"
                  >
                    <History className="h-4 w-4" />
                    Ver Histórico Completo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Aviso de Pendentes */}
                {presencasPendentes.length > 0 && (
                  <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-900">
                          {presencasPendentes.length} check-in
                          {presencasPendentes.length > 1 ? "s" : ""} aguardando
                          aprovação
                        </h4>
                        <p className="text-sm text-amber-700 mt-1">
                          Seu check-in foi registrado e está aguardando
                          confirmação da recepção/professor.
                        </p>
                        <ul className="mt-2 space-y-1">
                          {presencasPendentes.map((p) => (
                            <li key={p.id} className="text-sm text-amber-600">
                              • {p.aula} -{" "}
                              {new Date(p.data).toLocaleString("pt-BR")}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filtros */}
                <div className="space-y-3 mb-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="🔍 Buscar no histórico..."
                      value={buscaHistorico}
                      onChange={(e) => setBuscaHistorico(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                {presencas.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Nenhuma presença registrada ainda.</p>
                    <p className="text-sm">Faça seu primeiro check-in!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {presencas
                      .filter((p) => {
                        // Filtro de busca
                        if (buscaHistorico) {
                          const termo = buscaHistorico.toLowerCase();
                          return (
                            p.aula.nome.toLowerCase().includes(termo) ||
                            p.aula.professor.toLowerCase().includes(termo) ||
                            p.aula.unidade.toLowerCase().includes(termo)
                          );
                        }
                        return true;
                      })
                      .map((presenca) => (
                        <div
                          key={presenca.id}
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                {presenca.aula.nome}
                              </div>
                              <div className="text-xs text-gray-600">
                                Prof. {presenca.aula.professor}
                              </div>
                              <div className="text-xs text-gray-500">
                                {presenca.aula.unidade}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {formatDate(presenca.data).split(" ")[0]}
                            </div>
                            <div className="text-xs text-gray-600">
                              {presenca.horario}
                            </div>
                            <Badge
                              variant={
                                presenca.tipo === "entrada"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs mt-1"
                            >
                              {presenca.tipo === "entrada"
                                ? "Entrada"
                                : "Saída"}
                            </Badge>
                          </div>
                        </div>
                      ))}

                    <div className="pt-3 border-t">
                      <Button
                        onClick={() => router.push("/historico-presenca")}
                        variant="ghost"
                        className="w-full"
                      >
                        Ver Histórico Completo
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
