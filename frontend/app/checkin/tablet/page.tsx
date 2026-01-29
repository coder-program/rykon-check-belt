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
  graus?: number;
}

// Funções auxiliares para renderização visual das faixas
function getBeltTipStyle(faixa: string) {
  let tip = "bg-black";
  let stripeActive = "bg-white";
  let stripeInactive = "bg-white/30";

  if (faixa === "Preta") {
    tip = "bg-red-600";
    stripeActive = "bg-white";
    stripeInactive = "bg-white/30";
  }
  if (faixa === "Coral" || faixa === "Vermelha") {
    tip = "bg-white";
    stripeActive = "bg-black";
    stripeInactive = "bg-black/30";
  }
  return { tip, stripeActive, stripeInactive } as const;
}

function colorBgClass(nome: string) {
  const map: Record<string, string> = {
    Branca: "bg-white",
    Cinza: "bg-gray-400",
    Preta: "bg-black",
    Amarela: "bg-yellow-400",
    Amarelo: "bg-yellow-400",
    Laranja: "bg-orange-500",
    Verde: "bg-green-600",
    Azul: "bg-blue-600",
    Roxa: "bg-purple-700",
    Marrom: "bg-amber-800",
    Coral: "bg-red-500",
    Vermelha: "bg-red-600",
  };
  return map[nome] || "bg-gray-300";
}

const KIDS_BASES = ["Cinza", "Amarela", "Laranja", "Verde"];
function parseKidsPattern(faixa: string): {
  isKids: boolean;
  base?: string;
  stripe?: "white" | "black" | null;
} {
  const raw = faixa.trim();
  const lower = raw.toLowerCase();
  const base = KIDS_BASES.find((b) => lower.startsWith(b.toLowerCase()));
  if (!base) return { isKids: false };
  const hasWhite = /e\s+branc[oa]/i.test(raw) || /\/\s*branc[ao]/i.test(raw);
  const hasBlack = /e\s+pret[ao]/i.test(raw) || /\/\s*pret[ao]/i.test(raw);
  return {
    isKids: true,
    base,
    stripe: hasWhite ? "white" : hasBlack ? "black" : null,
  };
}

function getBeltMainSegments(faixa: string): string[] {
  const raw = faixa.replace(/\s+/g, " ").trim();
  const parts = raw.split(/\s*\/\s*|\s+e\s+/i).map((p) => p.trim());
  if (parts.length >= 2) return [parts[0], parts[1]];
  return [raw];
}

function BeltTip({ faixa, graus }: { faixa: string; graus?: number }) {
  const { tip, stripeActive, stripeInactive } = getBeltTipStyle(faixa);
  const kids = parseKidsPattern(faixa);
  const segments = kids.isKids
    ? [kids.base as string]
    : getBeltMainSegments(faixa);
  const grauCount = graus || 0;

  return (
    <div className="flex items-center w-32 h-4 rounded-sm overflow-hidden ring-1 ring-black/10 shadow-sm">
      <div className="relative flex-1 h-full flex">
        {segments.length === 2 ? (
          <>
            <div className={`flex-1 h-full ${colorBgClass(segments[0])}`}></div>
            <div className={`flex-1 h-full ${colorBgClass(segments[1])}`}></div>
          </>
        ) : (
          <div
            className={`flex-1 h-full ${colorBgClass(segments[0])} ${
              segments[0] === "Branca" ? "border border-gray-300" : ""
            }`}
          ></div>
        )}
        {kids.isKids && kids.stripe && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 ${
              kids.stripe === "white" ? "bg-white" : "bg-black"
            } h-0.5`}
          ></div>
        )}
      </div>
      <div className={`flex items-center justify-start ${tip} h-full w-9 px-1 gap-0.5`}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`h-2.5 w-1 rounded-sm ${
              i < grauCount ? stripeActive : stripeInactive
            }`}
          />
        ))}
      </div>
    </div>
  );
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
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [checkinMethod, setCheckinMethod] = useState<"LISTA" | "QR_CODE">("LISTA");

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
          const text = await response.text();
          if (text) {
            const data = JSON.parse(text);
            setAulaAtiva(data);
          } else {
            setAulaAtiva(null);
          }
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
      handleAlunoClick(aluno, "QR_CODE");
    } else {
      toast.error("Aluno não encontrado");
    }
  };

  const handleAlunoClick = (aluno: Aluno, metodo: "LISTA" | "QR_CODE" = "LISTA") => {
    setSelectedAluno(aluno);
    setCheckinMethod(metodo);
    setShowConfirmModal(true);
  };

  const handleConfirmCheckin = async () => {
    if (!selectedAluno) return;
    
    setShowConfirmModal(false);
    await handleCheckin(selectedAluno, checkinMethod);
    setSelectedAluno(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setSelectedAluno(null);
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
        
        // Remover aluno da lista após check-in bem-sucedido
        setAlunos((prev) => prev.filter((a) => a.id !== aluno.id));
        setAlunosFiltrados((prev) => prev.filter((a) => a.id !== aluno.id));
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
      <div className="min-h-screen bg-gradient-to-br from-slate-700 via-gray-800 to-slate-900 p-3">
        <div className="max-w-2xl mx-auto">
          {/* Header Compacto */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Check-in
                  </h1>
                  <p className="text-xs text-white/80">TeamCruz</p>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  {new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Status da Aula */}
            {aulaAtiva ? (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-top duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-white uppercase tracking-wide">
                        Aula em Andamento
                      </span>
                    </div>
                    <p className="font-bold text-white text-lg mb-1">
                      {aulaAtiva.nome}
                    </p>
                    <p className="text-sm text-white/90">
                      👨‍🏫 {aulaAtiva.professor}
                    </p>
                    <p className="text-xs text-white/80 mt-1">
                      ⏰ {aulaAtiva.horarioInicio} - {aulaAtiva.horarioFim}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <CheckCircle className="w-9 h-9 text-white" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-base">
                      Nenhuma aula ativa
                    </p>
                    <p className="text-sm text-white/90">
                      Aguardando início da próxima aula
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card Principal */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header do Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Alunos Disponíveis
                    </h2>
                    <p className="text-xs text-white/80">
                      Toque para registrar presença
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <span className="text-sm font-bold text-white">
                    {alunosFiltrados.length}
                  </span>
                </div>
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar aluno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl text-white placeholder-white/60 text-base focus:outline-none focus:border-white/60 focus:bg-white/30 transition-all"
                />
              </div>
            </div>

            {/* Lista de Alunos */}
            <div className="p-3">
              {loading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500 font-medium">
                    Carregando alunos...
                  </p>
                </div>
              ) : alunosFiltrados.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium text-base">
                    Nenhum aluno encontrado
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Todos já fizeram check-in hoje
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1 custom-scrollbar">
                  {alunosFiltrados.map((aluno, index) => (
                    <div
                      key={aluno.id}
                      className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 shadow-md hover:shadow-xl active:shadow-2xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-400 active:scale-[0.98] touch-manipulation animate-in fade-in slide-in-from-bottom"
                      style={{ animationDelay: `${index * 30}ms` }}
                      onClick={() => handleAlunoClick(aluno, "LISTA")}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-blue-100">
                            {aluno.foto ? (
                              <img
                                src={aluno.foto}
                                alt={aluno.nome}
                                className="w-full h-full rounded-2xl object-cover"
                              />
                            ) : (
                              aluno.nome.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        {/* Informações */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-base mb-1.5 truncate">
                            {aluno.nome}
                          </p>
                          <div className="mb-1.5">
                            <BeltTip faixa={aluno.faixa} graus={aluno.graus || 0} />
                          </div>
                          <p className="text-xs text-gray-500 font-medium">
                            📋 {aluno.numeroMatricula}
                          </p>
                        </div>

                        {/* Ícone de Ação */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg animate-pulse">
                            <CheckCircle className="w-7 h-7 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmModal && selectedAluno && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            {/* Foto */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div 
                  className="w-48 h-48 rounded-full flex items-center justify-center text-white font-bold text-6xl shadow-xl ring-8"
                  style={{ 
                    background: selectedAluno.foto 
                      ? 'transparent' 
                      : `linear-gradient(135deg, ${selectedAluno.corFaixa}, ${selectedAluno.corFaixa}dd)`,
                    ringColor: selectedAluno.corFaixa + '40'
                  }}
                >
                  {selectedAluno.foto ? (
                    <img
                      src={selectedAluno.foto}
                      alt={selectedAluno.nome}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    selectedAluno.nome.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
            </div>

            {/* Informações */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {selectedAluno.nome}
              </h2>
              <div className="flex items-center justify-center mb-3">
                <BeltTip faixa={selectedAluno.faixa} graus={selectedAluno.graus || 0} />
              </div>
              <p className="text-sm text-gray-500">
                📋 Matrícula: {selectedAluno.numeroMatricula}
              </p>
            </div>

            {/* Mensagem de Confirmação */}
            <div className="text-center mb-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
              <p className="text-xl font-semibold text-gray-800">
                É você mesmo? 🤔
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Confirme sua identidade para fazer check-in
              </p>
            </div>

            {/* Botões */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCancelConfirm}
                className="bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
              >
                <span className="text-xl">❌</span>
                <span>NÃO</span>
              </button>
              <button
                onClick={handleConfirmCheckin}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
              >
                <span className="text-xl">✅</span>
                <span>SIM, SOU EU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #6366f1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #4f46e5);
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slide-in-from-bottom {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slide-in-from-top {
          from {
            transform: translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-in {
          animation-duration: 0.4s;
          animation-fill-mode: both;
        }
        .fade-in {
          animation-name: fade-in;
        }
        .slide-in-from-bottom {
          animation-name: slide-in-from-bottom;
        }
        .slide-in-from-top {
          animation-name: slide-in-from-top;
        }
      `}</style>
    </ProtectedRoute>
  );
}
