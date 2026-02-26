"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

interface PresencaPendente {
  id: string;
  aluno: {
    id: string;
    nome: string;
    foto: string | null;
    cpf: string;
  };
  aula: {
    id: string;
    nome: string;
    professor: string;
    horario: string;
  };
  metodo: string;
  dataCheckin: string;
  status: string;
}

export default function AprovacaoCheckinPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [presencaSelecionada, setPresencaSelecionada] =
    useState<PresencaPendente | null>(null);
  const [acao, setAcao] = useState<"aprovar" | "rejeitar" | null>(null);
  const [observacao, setObservacao] = useState("");

  // Query para buscar presenças pendentes
  const { data: presencasPendentes = [], isLoading } = useQuery({
    queryKey: ["presencas-pendentes"],
    queryFn: async () => {
      console.log("📡 [Frontend] Buscando presenças pendentes...");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/pendentes`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar presenças pendentes");
      }

      const data = await response.json();
      
      console.log("📡 [Frontend] Presenças recebidas:", data.length);
      console.log("📡 [Frontend] Primeira presença (amostra):", data[0]);
      
      if (data.length > 0) {
        console.log("🕐 [Frontend] Debug horário primeira presença:", {
          horario: data[0]?.aula?.horario,
          hora_inicio: data[0]?.aula?.hora_inicio,
          hora_fim: data[0]?.aula?.hora_fim,
          aula_completa: data[0]?.aula,
        });
      }

      return data;
    },
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });

  // Mutation para aprovar presença
  const aprovarMutation = useMutation({
    mutationFn: async ({
      id,
      observacao,
    }: {
      id: string;
      observacao?: string;
    }) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/${id}/aprovar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ observacao }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao aprovar presença");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Presença aprovada com sucesso!", {
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["presencas-pendentes"] });
      setDialogAberto(false);
      setPresencaSelecionada(null);
      setObservacao("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation para rejeitar presença
  const rejeitarMutation = useMutation({
    mutationFn: async ({
      id,
      observacao,
    }: {
      id: string;
      observacao: string;
    }) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/${id}/rejeitar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ observacao }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao rejeitar presença");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Presença rejeitada com sucesso!", {
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["presencas-pendentes"] });
      setDialogAberto(false);
      setPresencaSelecionada(null);
      setObservacao("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAprovar = (presenca: PresencaPendente) => {
    setPresencaSelecionada(presenca);
    setAcao("aprovar");
    setDialogAberto(true);
  };

  const handleRejeitar = (presenca: PresencaPendente) => {
    setPresencaSelecionada(presenca);
    setAcao("rejeitar");
    setDialogAberto(true);
  };

  const confirmarAcao = () => {
    if (!presencaSelecionada) return;

    if (acao === "aprovar") {
      aprovarMutation.mutate({
        id: presencaSelecionada.id,
        observacao,
      });
    } else if (acao === "rejeitar") {
      if (!observacao.trim()) {
        toast.error("Informe o motivo da rejeição");
        return;
      }
      rejeitarMutation.mutate({
        id: presencaSelecionada.id,
        observacao,
      });
    }
  };

  const getMetodoLabel = (metodo: string) => {
    const labels: Record<string, string> = {
      LISTA: "Lista",
      QR_CODE: "QR Code",
      CPF: "CPF",
      FACIAL: "Facial",
      MANUAL: "Manual",
    };
    return labels[metodo] || metodo;
  };

  const formatTime = (val: any) => {
    if (!val && val !== 0) return null;
    // If already in HH:mm format
    if (typeof val === "string" && /^\d{1,2}:\d{2}$/.test(val)) return val;
    // Try parseable date string or timestamp
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    // Fallback to string representation
    if (typeof val === "string") return val;
    return null;
  };

  const getHorarioDisplay = (presenca: PresencaPendente) => {
    const aula: any = presenca?.aula || {};
    const rawHorario = aula?.horario;
    
    console.log("🕐 [Frontend getHorarioDisplay] Processando:", {
      presencaId: presenca?.id,
      alunoNome: presenca?.aluno?.nome,
      rawHorario,
      hora_inicio: aula?.hora_inicio,
      hora_fim: aula?.hora_fim,
      horaInicio: aula?.horaInicio,
      horaFim: aula?.horaFim,
    });
    
    if (rawHorario && typeof rawHorario === "string" && !/NaN|Invalid Date/.test(rawHorario)) {
      console.log("✅ [Frontend] Usando horario direto:", rawHorario);
      return rawHorario;
    }

    const inicio = aula?.hora_inicio || aula?.horaInicio || aula?.hora_inicio_iso;
    const fim = aula?.hora_fim || aula?.horaFim || aula?.hora_fim_iso;

    const fInicio = formatTime(inicio);
    const fFim = formatTime(fim);
    
    console.log("🕐 [Frontend] Horários formatados:", { fInicio, fFim });

    if (fInicio && fFim) return `${fInicio} - ${fFim}`;
    if (fInicio) return fInicio;
    if (rawHorario) return String(rawHorario);
    
    console.warn("⚠️ [Frontend] Nenhum horário disponível!");
    return "Horário indisponível";
  };

  return (
    <ProtectedRoute
      requiredPerfis={[
        "RECEPCIONISTA",
        "PROFESSOR",
        "INSTRUTOR",
        "GERENTE_UNIDADE",
        "FRANQUEADO",
      ]}
    >
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-3 mb-1 sm:mb-2">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">
                Aprovação de Check-ins
              </h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600">
              Aprove ou rejeite check-ins realizados via tablet
            </p>
          </div>

          {/* Stats Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 md:mb-6">
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Pendentes
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                      {presencasPendentes.length}
                    </p>
                  </div>
                  <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Presenças Pendentes */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">
                Check-ins Pendentes
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {presencasPendentes.length > 0
                  ? `${presencasPendentes.length} check-in(s) aguardando aprovação`
                  : "Nenhum check-in pendente no momento"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 text-sm sm:text-base">
                    Carregando...
                  </p>
                </div>
              ) : presencasPendentes.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-base sm:text-lg">
                    Nenhum check-in pendente!
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-2">
                    Todos os check-ins foram processados
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {presencasPendentes.map((presenca) => (
                    <Card
                      key={presenca.id}
                      className="border-2 border-yellow-200 bg-yellow-50"
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                          {/* Info do Aluno */}
                          <div className="flex items-start gap-2 sm:gap-4 flex-1 w-full">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
                              {presenca.aluno.foto ? (
                                <img
                                  src={presenca.aluno.foto}
                                  alt={presenca.aluno.nome}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                presenca.aluno.nome.charAt(0).toUpperCase()
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                                  {presenca.aluno.nome}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs w-fit"
                                >
                                  Pendente
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 mt-2">
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span className="truncate">
                                    CPF: {presenca.aluno.cpf}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span className="truncate">
                                    {new Date(
                                      presenca.dataCheckin
                                    ).toLocaleString("pt-BR")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span className="truncate">
                                    {presenca.aula.nome}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] sm:text-xs"
                                  >
                                    {getMetodoLabel(presenca.metodo)}
                                  </Badge>
                                </div>
                              </div>

                              <p className="text-xs sm:text-sm text-gray-600 mt-2">
                                <span className="font-medium">Professor:</span>{" "}
                                {presenca.aula.professor || "Não informado"} |{" "}
                                <span className="font-medium">Horário:</span>{" "}
                                {getHorarioDisplay(presenca)}
                              </p>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
                            <Button
                              onClick={() => handleAprovar(presenca)}
                              className="bg-green-600 hover:bg-green-700 touch-manipulation w-full sm:w-auto h-10 sm:h-9 text-sm"
                              size="sm"
                            >
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                              Aprovar
                            </Button>
                            <Button
                              onClick={() => handleRejeitar(presenca)}
                              variant="destructive"
                              className="touch-manipulation w-full sm:w-auto h-10 sm:h-9 text-sm"
                              size="sm"
                            >
                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Confirmação */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {acao === "aprovar" ? "Aprovar Check-in" : "Rejeitar Check-in"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {presencaSelecionada && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-800 text-sm sm:text-base">
                    {presencaSelecionada.aluno.nome}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {presencaSelecionada.aula.nome} -{" "}
                    {new Date(presencaSelecionada.dataCheckin).toLocaleString(
                      "pt-BR"
                    )}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 sm:py-4">
            <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
              {acao === "aprovar"
                ? "Observação (opcional)"
                : "Motivo da rejeição *"}
            </label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={
                acao === "aprovar"
                  ? "Adicione uma observação..."
                  : "Informe o motivo da rejeição..."
              }
              rows={4}
              className="w-full text-sm"
            />
            {acao === "rejeitar" && (
              <p className="text-[10px] sm:text-xs text-gray-500 mt-2">
                * O motivo é obrigatório para rejeições
              </p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDialogAberto(false);
                setObservacao("");
              }}
              className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarAcao}
              disabled={aprovarMutation.isPending || rejeitarMutation.isPending}
              className={`w-full sm:w-auto h-10 sm:h-9 touch-manipulation ${
                acao === "aprovar"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {aprovarMutation.isPending || rejeitarMutation.isPending ? (
                "Processando..."
              ) : acao === "aprovar" ? (
                <>
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Confirmar Aprovação
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Confirmar Rejeição
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
