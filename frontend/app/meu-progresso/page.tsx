"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, X, Save, Edit, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth/AuthContext";
import toast from "react-hot-toast";

interface FaixaDef {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
}

interface HistoricoFaixa {
  id: string;
  faixaOrigem?: string;
  faixaDestino: string;
  dataPromocao: string;
  dt_inicio: string;
  dt_fim?: string;
}

interface HistoricoGrau {
  id: string;
  faixa: string;
  grauNumero?: number; // Pode vir como grauNumero ou grau
  grau?: number; // Compatibilidade com o backend
  dataConcessao: string;
  justificativa?: string;
  origemGrau?: string;
}

interface GrauForm {
  faixaId: string;
  grauNumero: number;
  dataConcessao: string;
  justificativa: string;
  aulasAcumuladas: number;
  origemGrau: string;
  instrutorResponsavel: string;
}

interface FaixaForm {
  faixaOrigemId: string;
  faixaDestinoId: string;
  dt_inicio: string;
  dt_fim: string;
  isFaixaAtual: boolean;
}

// Função para obter a cor da faixa
const getFaixaColor = (faixa: string) => {
  const faixaUpper = faixa?.toUpperCase() || "";
  const colorMap: { [key: string]: string } = {
    BRANCA: "text-gray-600",
    CINZA: "text-gray-500",
    AMARELA: "text-yellow-600",
    LARANJA: "text-orange-600",
    VERDE: "text-green-600",
    AZUL: "text-blue-600",
    ROXA: "text-purple-600",
    MARROM: "text-yellow-800",
    PRETA: "text-gray-900",
    CORAL: "text-red-600",
  };
  return colorMap[faixaUpper] || "text-purple-600";
};

// Função para obter a cor da borda da faixa
const getFaixaBorderColor = (faixa: string) => {
  const faixaUpper = faixa?.toUpperCase() || "";
  const colorMap: { [key: string]: string } = {
    BRANCA: "border-gray-400",
    CINZA: "border-gray-500",
    AMARELA: "border-yellow-500",
    LARANJA: "border-orange-500",
    VERDE: "border-green-500",
    AZUL: "border-blue-500",
    ROXA: "border-purple-500",
    MARROM: "border-yellow-800",
    PRETA: "border-gray-900",
    CORAL: "border-red-500",
  };
  return colorMap[faixaUpper] || "border-purple-500";
};

export default function MeuProgressoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isGrauModalOpen, setIsGrauModalOpen] = useState(false);
  const [isFaixaModalOpen, setIsFaixaModalOpen] = useState(false);
  const [editingFaixa, setEditingFaixa] = useState<string | null>(null);
  const [editDates, setEditDates] = useState({ dt_inicio: "", dt_fim: "" });

  // Pegar alunoId da query string (para visualizar progresso de dependentes)
  const [targetAlunoId, setTargetAlunoId] = useState<string | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const alunoIdParam = params.get('alunoId');
    setTargetAlunoId(alunoIdParam);
  }, []);

  // Limpar cache quando o usuário ou targetAlunoId mudar
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["meu-historico", targetAlunoId] });
    queryClient.invalidateQueries({ queryKey: ["faixas-disponiveis"] });
  }, [user?.id, targetAlunoId, queryClient]);

  const [grauForm, setGrauForm] = useState<GrauForm>({
    faixaId: "",
    grauNumero: 1,
    dataConcessao: "",
    justificativa: "",
    aulasAcumuladas: 0,
    origemGrau: "manual",
    instrutorResponsavel: "",
  });

  const [faixaForm, setFaixaForm] = useState<FaixaForm>({
    faixaOrigemId: "",
    faixaDestinoId: "",
    dt_inicio: "",
    dt_fim: "",
    isFaixaAtual: false,
  }); // Query para buscar histórico
  const { data: historico } = useQuery({
    queryKey: ["meu-historico", targetAlunoId],
    queryFn: async () => {
      const endpoint = targetAlunoId
        ? `${process.env.NEXT_PUBLIC_API_URL}/progresso/historico-aluno/${targetAlunoId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/progresso/meu-historico`;
        
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Erro ao carregar histórico");
      return response.json();
    },
    enabled: !targetAlunoId || !!targetAlunoId, // Sempre habilitado
  });

  // Query para buscar faixas disponíveis
  const { data: faixas } = useQuery({
    queryKey: ["faixas-disponiveis"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/progresso/faixas-disponiveis`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Erro ao carregar faixas");
      return response.json();
    },
  });

  // Mutation para adicionar grau
  const adicionarGrauMutation = useMutation({
    mutationFn: async (dados: GrauForm & { origemGrau: string }) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/progresso/adicionar-grau`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(dados),
        }
      );
      if (!response.ok) throw new Error("Erro ao adicionar grau");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Grau adicionado com sucesso!", {
        duration: 3000,
      });
      setIsGrauModalOpen(false);
      setGrauForm({
        faixaId: "",
        grauNumero: 1,
        dataConcessao: "",
        justificativa: "",
        aulasAcumuladas: 0,
        origemGrau: "manual",
        instrutorResponsavel: "",
      });
      queryClient.invalidateQueries({ queryKey: ["meu-historico"] });
    },
    onError: (error) => {
      toast.error("Erro ao adicionar grau: " + error.message);
    },
  });

  // Mutation para adicionar faixa
  const adicionarFaixaMutation = useMutation({
    mutationFn: async (dados: FaixaForm & { dt_fim?: string }) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/progresso/adicionar-faixa`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(dados),
        }
      );
      if (!response.ok) throw new Error("Erro ao adicionar faixa");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Faixa adicionada com sucesso!", {
        duration: 3000,
      });
      setIsFaixaModalOpen(false);
      setFaixaForm({
        faixaOrigemId: "",
        faixaDestinoId: "",
        dt_inicio: "",
        dt_fim: "",
        isFaixaAtual: false,
      });
      queryClient.invalidateQueries({ queryKey: ["meu-historico"] });
    },
    onError: (error) => {
      toast.error("Erro ao adicionar faixa: " + error.message);
    },
  });

  // Mutation para atualizar datas da faixa
  const atualizarFaixaMutation = useMutation({
    mutationFn: async (dados: {
      faixaId: string;
      dt_inicio: string;
      dt_fim: string;
    }) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/progresso/atualizar-faixa/${dados.faixaId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            dt_inicio: dados.dt_inicio,
            dt_fim: dados.dt_fim,
          }),
        }
      );
      if (!response.ok) throw new Error("Erro ao atualizar faixa");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Datas atualizadas com sucesso!", {
        duration: 3000,
      });
      setEditingFaixa(null);
      setEditDates({ dt_inicio: "", dt_fim: "" });
      queryClient.invalidateQueries({ queryKey: ["meu-historico"] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar faixa: " + error.message);
    },
  });

  const handleAdicionarGrau = () => {
    setIsGrauModalOpen(true);
  };

  const handleAdicionarFaixa = () => {
    setIsFaixaModalOpen(true);
  };

  const handleSalvarGrau = () => {
    if (!grauForm.faixaId || !grauForm.dataConcessao) {
      toast.error("Por favor, preencha a faixa e a data da graduação.");
      return;
    }

    adicionarGrauMutation.mutate({
      faixaId: grauForm.faixaId,
      grauNumero: grauForm.grauNumero,
      dataConcessao: grauForm.dataConcessao,
      origemGrau: grauForm.origemGrau || "manual",
      aulasAcumuladas: grauForm.aulasAcumuladas || 0,
      justificativa: grauForm.justificativa,
      instrutorResponsavel: grauForm.instrutorResponsavel,
    });
  };

  const handleSalvarFaixa = () => {
    // Validação: Faixa e Data de Início são sempre obrigatórios
    if (!faixaForm.faixaDestinoId || !faixaForm.dt_inicio) {
      toast.error(
        "Por favor, preencha a faixa conquistada e a data de início."
      );
      return;
    }

    // Se NÃO é a faixa atual (é uma faixa antiga concluída), Data de Fim é obrigatória
    if (!faixaForm.isFaixaAtual && !faixaForm.dt_fim) {
      toast.error(
        "Para faixas antigas concluídas, a Data de Fim é obrigatória. Se esta é sua faixa atual, marque a opção 'Esta é minha faixa atual'."
      );
      return;
    }

    // Se marcou como faixa atual, não pode ter Data de Fim
    if (faixaForm.isFaixaAtual && faixaForm.dt_fim) {
      toast.error(
        "Faixa atual não pode ter Data de Fim. Desmarque 'Esta é minha faixa atual' se a faixa já foi concluída."
      );
      return;
    }

    // Validar que a Data de Fim não é anterior à Data de Início
    if (faixaForm.dt_fim && faixaForm.dt_inicio) {
      const inicio = new Date(faixaForm.dt_inicio + "T00:00:00");
      const fim = new Date(faixaForm.dt_fim + "T00:00:00");

      if (fim < inicio) {
        toast.error("A Data de Fim não pode ser anterior à Data de Início.");
        return;
      }
    }

    const dados: FaixaForm & { dt_fim?: string } = {
      faixaOrigemId: faixaForm.faixaOrigemId || "",
      faixaDestinoId: faixaForm.faixaDestinoId,
      dt_inicio: faixaForm.dt_inicio,
      dt_fim: faixaForm.dt_fim || "",
      isFaixaAtual: faixaForm.isFaixaAtual,
    };

    adicionarFaixaMutation.mutate(dados);
  };

  const handleEditarFaixa = (faixa: HistoricoFaixa) => {
    setEditingFaixa(faixa.id);
    setEditDates({
      dt_inicio: faixa.dt_inicio,
      dt_fim: faixa.dt_fim || "",
    });
  };

  const handleSalvarEdicaoFaixa = (faixaId: string) => {
    atualizarFaixaMutation.mutate({
      faixaId,
      dt_inicio: editDates.dt_inicio,
      dt_fim: editDates.dt_fim,
    });
  };

  const handleCancelarEdicao = () => {
    setEditingFaixa(null);
    setEditDates({ dt_inicio: "", dt_fim: "" });
  };

  // Função para calcular o tempo em uma faixa
  const calcularTempoFaixa = (dt_inicio: string, dt_fim?: string) => {
    const inicio = new Date(dt_inicio + "T00:00:00"); // Força timezone local
    const fim = dt_fim ? new Date(dt_fim + "T00:00:00") : new Date(); // Se não tem fim, usa data atual

    const diffMs = fim.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;

      if (remainingDays === 0) {
        return `${months} ${months === 1 ? "mês" : "meses"}`;
      } else {
        return `${months} ${
          months === 1 ? "mês" : "meses"
        } e ${remainingDays} ${remainingDays === 1 ? "dia" : "dias"}`;
      }
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      const months = Math.floor(remainingDays / 30);

      let result = `${years} ${years === 1 ? "ano" : "anos"}`;
      if (months > 0) {
        result += ` e ${months} ${months === 1 ? "mês" : "meses"}`;
      }
      return result;
    }
  };

  // Função para formatar data sem problema de timezone
  const formatarData = (dataString: string) => {
    const data = new Date(dataString + "T00:00:00"); // Força timezone local
    return data.toLocaleDateString("pt-BR");
  };

  // Função para verificar se é a faixa atual (não tem data fim)
  const isFaixaAtual = (dt_fim?: string) => !dt_fim;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                Meu Progresso
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                Histórico de graduações
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleAdicionarFaixa}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Adicionar Faixa Antiga</span>
              <span className="sm:hidden">Nova Faixa</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Histórico de Faixas */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">
                Histórico de Faixas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {historico?.historicoFaixas?.length > 0 ? (
                <div className="space-y-3 sm:space-y-4 max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
                  {historico.historicoFaixas
                    .sort((a: HistoricoFaixa, b: HistoricoFaixa) => {
                      // Faixas atuais (sem dt_fim) primeiro
                      if (!a.dt_fim && b.dt_fim) return -1;
                      if (a.dt_fim && !b.dt_fim) return 1;
                      // Se ambas têm dt_fim ou ambas não têm, ordena por dt_inicio DESC
                      return (
                        new Date(b.dt_inicio + "T00:00:00").getTime() -
                        new Date(a.dt_inicio + "T00:00:00").getTime()
                      );
                    })
                    .map((faixa: HistoricoFaixa) => (
                      <div
                        key={faixa.id}
                        className={`border-l-2 sm:border-l-4 ${
                          isFaixaAtual(faixa.dt_fim)
                            ? "border-green-500 bg-green-50"
                            : `${getFaixaBorderColor(
                                faixa.faixaDestino
                              )} bg-white`
                        } pl-2 sm:pl-4 py-2 rounded-r-lg`}
                      >
                        {editingFaixa === faixa.id ? (
                          // Modo de edição
                          <div className="space-y-3">
                            <div>
                              <p className="font-medium mb-2">
                                {faixa.faixaOrigem
                                  ? `${faixa.faixaOrigem} → `
                                  : ""}
                                <span
                                  className={getFaixaColor(faixa.faixaDestino)}
                                >
                                  {faixa.faixaDestino}
                                </span>
                              </p>
                              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">
                                    Data Início
                                  </label>
                                  <Input
                                    type="date"
                                    value={editDates.dt_inicio}
                                    onChange={(
                                      e: React.ChangeEvent<HTMLInputElement>
                                    ) =>
                                      setEditDates({
                                        ...editDates,
                                        dt_inicio: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">
                                    Data Fim
                                  </label>
                                  <Input
                                    type="date"
                                    value={editDates.dt_fim}
                                    onChange={(
                                      e: React.ChangeEvent<HTMLInputElement>
                                    ) =>
                                      setEditDates({
                                        ...editDates,
                                        dt_fim: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2 sm:mt-3">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleSalvarEdicaoFaixa(faixa.id)
                                  }
                                  disabled={atualizarFaixaMutation.isPending}
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelarEdicao}
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Modo de visualização
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium">
                                  {faixa.faixaOrigem
                                    ? `${faixa.faixaOrigem} → `
                                    : ""}
                                  <span
                                    className={getFaixaColor(
                                      faixa.faixaDestino
                                    )}
                                  >
                                    {faixa.faixaDestino}
                                  </span>
                                </p>
                                {isFaixaAtual(faixa.dt_fim) && (
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 sm:py-1 rounded-full font-medium flex-shrink-0">
                                    Atual
                                  </span>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                                <p>
                                  <strong>Início:</strong>{" "}
                                  {formatarData(faixa.dt_inicio)}
                                </p>
                                {faixa.dt_fim ? (
                                  <p>
                                    <strong>Fim:</strong>{" "}
                                    {formatarData(faixa.dt_fim)}
                                  </p>
                                ) : (
                                  <p className="text-green-600 font-medium">
                                    <strong>Status:</strong> Atual
                                  </p>
                                )}
                                <p>
                                  <strong>Tempo na faixa:</strong>{" "}
                                  <span
                                    className={
                                      isFaixaAtual(faixa.dt_fim)
                                        ? "text-green-600 font-medium"
                                        : "text-gray-600"
                                    }
                                  >
                                    {calcularTempoFaixa(
                                      faixa.dt_inicio,
                                      faixa.dt_fim
                                    )}
                                    {isFaixaAtual(faixa.dt_fim)
                                      ? " (em andamento)"
                                      : ""}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditarFaixa(faixa)}
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nenhuma faixa registrada ainda.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Graus */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">
                Histórico de Graus
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {historico?.historicoGraus?.length > 0 ? (
                <div className="space-y-4 sm:space-y-6 max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
                  {/* Agrupar graus por faixa */}
                  {Object.entries(
                    historico.historicoGraus.reduce(
                      (acc: any, grau: HistoricoGrau) => {
                        if (!acc[grau.faixa]) {
                          acc[grau.faixa] = [];
                        }
                        acc[grau.faixa].push(grau);
                        return acc;
                      },
                      {}
                    )
                  ).map(([faixaNome, grausDaFaixa]: [string, any]) => {
                    // Obter a cor da faixa correspondente
                    const faixaInfo = faixas?.find(
                      (f: FaixaDef) => f.nome === faixaNome
                    );
                    const faixaCor = faixaInfo?.cor || "#6B46C1"; // Cor padrão se não encontrar

                    return (
                      <div key={faixaNome} className="space-y-3">
                        {/* Header da Faixa */}
                        <div
                          className="flex items-center gap-2 pb-2 border-b"
                          style={{ borderColor: faixaCor }}
                        >
                          <div
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-base font-bold"
                            style={{ backgroundColor: faixaCor }}
                          >
                            {faixaNome.charAt(0)}
                          </div>
                          <h3
                            className="font-semibold text-sm sm:text-base md:text-lg"
                            style={{ color: faixaCor }}
                          >
                            Faixa {faixaNome}
                          </h3>
                          <span className="text-xs sm:text-sm text-gray-500">
                            ({grausDaFaixa.length}{" "}
                            {grausDaFaixa.length === 1 ? "grau" : "graus"})
                          </span>
                        </div>

                        {/* Graus da Faixa */}
                        <div className="ml-4 sm:ml-10 space-y-2">
                          {grausDaFaixa
                            .sort((a: HistoricoGrau, b: HistoricoGrau) => {
                              const aNum = a.grauNumero || a.grau || 0;
                              const bNum = b.grauNumero || b.grau || 0;
                              return aNum - bNum;
                            })
                            .map((grau: HistoricoGrau) => {
                              const grauNum = grau.grauNumero || grau.grau || 0;
                              return (
                                <div
                                  key={grau.id}
                                  className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  {/* Indicador do Grau */}
                                  <div
                                    className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-white text-xs sm:text-base font-bold shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: faixaCor }}
                                  >
                                    {grauNum}º
                                  </div>

                                  {/* Informações do Grau */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm sm:text-base text-gray-800">
                                          Grau {grauNum}
                                        </p>
                                        <p className="text-xs sm:text-sm text-gray-500">
                                          <span className="inline-flex items-center gap-1">
                                            <svg
                                              className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                              />
                                            </svg>
                                            {new Date(
                                              grau.dataConcessao
                                            ).toLocaleDateString("pt-BR")}
                                          </span>
                                        </p>
                                        {grau.justificativa && (
                                          <p className="text-xs text-gray-600 mt-1 italic">
                                            "{grau.justificativa}"
                                          </p>
                                        )}
                                      </div>
                                      {grau.origemGrau && (
                                        <span className="text-xs px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                                          {grau.origemGrau === "manual"
                                            ? "Manual"
                                            : grau.origemGrau}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nenhum grau registrado ainda.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Adicionar Grau */}
      {isGrauModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Adicionar Grau
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsGrauModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Faixa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Faixa <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={grauForm.faixaId}
                  onChange={(e) =>
                    setGrauForm({ ...grauForm, faixaId: e.target.value })
                  }
                  required
                >
                  <option value="">Selecionar Faixa</option>
                  {faixas?.map((faixa: FaixaDef) => (
                    <option key={faixa.id} value={faixa.id}>
                      {faixa.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Grau Número */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grau <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={grauForm.grauNumero}
                    onChange={(e) =>
                      setGrauForm({
                        ...grauForm,
                        grauNumero: parseInt(e.target.value) || 1,
                      })
                    }
                  >
                    <option value={1}>1º Grau</option>
                    <option value={2}>2º Grau</option>
                    <option value={3}>3º Grau</option>
                    <option value={4}>4º Grau</option>
                  </select>
                </div>

                {/* Data da Graduação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data da Graduação <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={grauForm.dataConcessao}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setGrauForm({
                        ...grauForm,
                        dataConcessao: e.target.value,
                      })
                    }
                    className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Número de Aulas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aulas Acumuladas
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={grauForm.aulasAcumuladas}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setGrauForm({
                        ...grauForm,
                        aulasAcumuladas: parseInt(e.target.value) || 0,
                      })
                    }
                    className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Origem do Grau */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Origem do Grau <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={grauForm.origemGrau}
                    onChange={(e) =>
                      setGrauForm({ ...grauForm, origemGrau: e.target.value })
                    }
                  >
                    <option value="manual">Manual</option>
                    <option value="automatico">Automático</option>
                    <option value="importado">Importado</option>
                    <option value="migrado">Migrado</option>
                  </select>
                </div>
              </div>

              {/* Instrutor Responsável */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instrutor Responsável
                </label>
                <Input
                  placeholder="Nome do instrutor que concedeu o grau..."
                  value={grauForm.instrutorResponsavel}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setGrauForm({
                      ...grauForm,
                      instrutorResponsavel: e.target.value,
                    })
                  }
                  className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Justificativa/Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações / Justificativa
                </label>
                <textarea
                  placeholder="Adicione observações ou justificativas..."
                  value={grauForm.justificativa}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setGrauForm({ ...grauForm, justificativa: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Informação Helper */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  📌 <strong>Nota:</strong> Os campos marcados com{" "}
                  <span className="text-red-500">*</span> são obrigatórios. O
                  sistema manterá um histórico completo de todos os graus
                  conquistados.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsGrauModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvarGrau}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Faixa */}
      {isFaixaModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Adicionar Faixa Antiga
                </h2>
                <p className="text-sm text-gray-600">
                  Registre faixas que você conquistou no passado
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFaixaModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Faixa Conquistada *
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={faixaForm.faixaDestinoId}
                  onChange={(e) =>
                    setFaixaForm({
                      ...faixaForm,
                      faixaDestinoId: e.target.value,
                    })
                  }
                >
                  <option value="">
                    Selecionar a faixa que você conquistou
                  </option>
                  {faixas
                    ?.filter((faixa: FaixaDef) => {
                      // Buscar a faixa atual do aluno no histórico
                      const faixaAtual = historico?.historicoFaixas?.find(
                        (f: HistoricoFaixa) => !f.dt_fim
                      );

                      if (!faixaAtual) return true; // Se não tem faixa atual, mostra todas

                      // Buscar a ordem da faixa atual
                      const faixaAtualObj = faixas.find(
                        (f: FaixaDef) => f.nome === faixaAtual.faixaDestino
                      );

                      if (!faixaAtualObj) return true;

                      // Mostrar apenas faixas com ordem menor ou igual à atual
                      return faixa.ordem <= faixaAtualObj.ordem;
                    })
                    .map((faixa: FaixaDef) => (
                      <option key={faixa.id} value={faixa.id}>
                        {faixa.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={faixaForm.isFaixaAtual}
                    onChange={(e) => {
                      const isAtual = e.target.checked;
                      setFaixaForm({
                        ...faixaForm,
                        isFaixaAtual: isAtual,
                        dt_fim: isAtual ? "" : faixaForm.dt_fim, // Limpa Data de Fim se marcar como atual
                      });
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    ✓ Esta é minha faixa atual (ainda não concluí)
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Início *
                  </label>
                  <Input
                    type="date"
                    value={faixaForm.dt_inicio}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFaixaForm({ ...faixaForm, dt_inicio: e.target.value })
                    }
                    placeholder="Quando você começou nesta faixa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Fim {!faixaForm.isFaixaAtual && "*"}
                  </label>
                  <Input
                    type="date"
                    value={faixaForm.dt_fim}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFaixaForm({ ...faixaForm, dt_fim: e.target.value })
                    }
                    placeholder="Quando você terminou nesta faixa"
                    disabled={faixaForm.isFaixaAtual}
                    className={
                      faixaForm.isFaixaAtual
                        ? "bg-gray-100 cursor-not-allowed"
                        : ""
                    }
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  📋 Importante: Preencha os campos corretamente
                </p>
                <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                  <li>
                    <strong>Faixa antiga (já concluída):</strong> Deixe o
                    checkbox desmarcado e preencha tanto a{" "}
                    <strong>Data de Início</strong> quanto a{" "}
                    <strong>Data de Fim</strong> - ambos campos são obrigatórios
                  </li>
                  <li>
                    <strong>Faixa atual (em progresso):</strong> Marque o
                    checkbox "✓ Esta é minha faixa atual" e preencha apenas a{" "}
                    <strong>Data de Início</strong> - a Data de Fim será
                    desabilitada
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsFaixaModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvarFaixa}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
