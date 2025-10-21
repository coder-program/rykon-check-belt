"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, X, Save, Edit, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth/AuthContext";

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
}

export default function MeuProgressoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isGrauModalOpen, setIsGrauModalOpen] = useState(false);
  const [isFaixaModalOpen, setIsFaixaModalOpen] = useState(false);
  const [editingFaixa, setEditingFaixa] = useState<string | null>(null);
  const [editDates, setEditDates] = useState({ dt_inicio: "", dt_fim: "" });
  
  // Limpar cache quando o usuário mudar
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["meu-historico"] });
    queryClient.invalidateQueries({ queryKey: ["faixas-disponiveis"] });
  }, [user?.id, queryClient]);

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
  }); // Query para buscar histórico
  const { data: historico } = useQuery({
    queryKey: ["meu-historico"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/progresso/meu-historico`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Erro ao carregar histórico");
      return response.json();
    },
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
      alert("Grau adicionado com sucesso!");
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
      alert("Erro ao adicionar grau: " + error.message);
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
      alert("Faixa adicionada com sucesso!");
      setIsFaixaModalOpen(false);
      setFaixaForm({
        faixaOrigemId: "",
        faixaDestinoId: "",
        dt_inicio: "",
        dt_fim: "",
      });
      queryClient.invalidateQueries({ queryKey: ["meu-historico"] });
    },
    onError: (error) => {
      alert("Erro ao adicionar faixa: " + error.message);
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
      alert("Datas atualizadas com sucesso!");
      setEditingFaixa(null);
      setEditDates({ dt_inicio: "", dt_fim: "" });
      queryClient.invalidateQueries({ queryKey: ["meu-historico"] });
    },
    onError: (error) => {
      alert("Erro ao atualizar faixa: " + error.message);
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
      alert("Por favor, preencha a faixa e a data da graduação.");
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
    if (!faixaForm.faixaDestinoId || !faixaForm.dt_inicio) {
      alert("Por favor, preencha a faixa conquistada e a data de início.");
      return;
    }

    const dados: FaixaForm & { dt_fim?: string } = {
      faixaOrigemId: faixaForm.faixaOrigemId || "",
      faixaDestinoId: faixaForm.faixaDestinoId,
      dt_inicio: faixaForm.dt_inicio,
      dt_fim: faixaForm.dt_fim || "",
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
    const inicio = new Date(dt_inicio);
    const fim = dt_fim ? new Date(dt_fim) : new Date(); // Se não tem fim, usa data atual

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

  // Função para verificar se é a faixa atual (não tem data fim)
  const isFaixaAtual = (dt_fim?: string) => !dt_fim;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Meu Progresso
              </h1>
              <p className="text-gray-600">
                Sistema para gerenciar seu histórico de graduações
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleAdicionarGrau}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Grau
            </Button>
            <Button variant="outline" onClick={handleAdicionarFaixa}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Faixa Antiga
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Histórico de Faixas */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Faixas</CardTitle>
            </CardHeader>
            <CardContent>
              {historico?.historicoFaixas?.length > 0 ? (
                <div className="space-y-4">
                  {historico.historicoFaixas
                    .sort((a: HistoricoFaixa, b: HistoricoFaixa) => {
                      // Faixas atuais (sem dt_fim) primeiro
                      if (!a.dt_fim && b.dt_fim) return -1;
                      if (a.dt_fim && !b.dt_fim) return 1;
                      // Se ambas têm dt_fim ou ambas não têm, ordena por dt_inicio DESC
                      return (
                        new Date(b.dt_inicio).getTime() -
                        new Date(a.dt_inicio).getTime()
                      );
                    })
                    .map((faixa: HistoricoFaixa) => (
                      <div
                        key={faixa.id}
                        className={`border-l-4 ${
                          isFaixaAtual(faixa.dt_fim)
                            ? "border-green-500 bg-green-50"
                            : "border-purple-500 bg-white"
                        } pl-4 py-2 rounded-r-lg`}
                      >
                        {editingFaixa === faixa.id ? (
                          // Modo de edição
                          <div className="space-y-3">
                            <div>
                              <p className="font-medium mb-2">
                                {faixa.faixaOrigem
                                  ? `${faixa.faixaOrigem} → `
                                  : ""}
                                <span className="text-purple-600">
                                  {faixa.faixaDestino}
                                </span>
                              </p>
                              <div className="grid grid-cols-2 gap-3">
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
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleSalvarEdicaoFaixa(faixa.id)
                                  }
                                  disabled={atualizarFaixaMutation.isPending}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelarEdicao}
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
                                  <span className="text-purple-600">
                                    {faixa.faixaDestino}
                                  </span>
                                </p>
                                {isFaixaAtual(faixa.dt_fim) && (
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                                    Atual
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 space-y-1">
                                <p>
                                  <strong>Início:</strong>{" "}
                                  {new Date(faixa.dt_inicio).toLocaleDateString(
                                    "pt-BR"
                                  )}
                                </p>
                                {faixa.dt_fim ? (
                                  <p>
                                    <strong>Fim:</strong>{" "}
                                    {new Date(faixa.dt_fim).toLocaleDateString(
                                      "pt-BR"
                                    )}
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
                              <Edit className="w-4 h-4" />
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
            <CardHeader>
              <CardTitle>Histórico de Graus</CardTitle>
            </CardHeader>
            <CardContent>
              {historico?.historicoGraus?.length > 0 ? (
                <div className="space-y-6">
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
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: faixaCor }}
                          >
                            {faixaNome.charAt(0)}
                          </div>
                          <h3
                            className="font-semibold text-lg"
                            style={{ color: faixaCor }}
                          >
                            Faixa {faixaNome}
                          </h3>
                          <span className="text-sm text-gray-500">
                            ({grausDaFaixa.length}{" "}
                            {grausDaFaixa.length === 1 ? "grau" : "graus"})
                          </span>
                        </div>

                        {/* Graus da Faixa */}
                        <div className="ml-10 space-y-2">
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
                                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  {/* Indicador do Grau */}
                                  <div
                                    className="flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold shadow-sm"
                                    style={{ backgroundColor: faixaCor }}
                                  >
                                    {grauNum}º
                                  </div>

                                  {/* Informações do Grau */}
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium text-gray-800">
                                          Grau {grauNum}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                          <span className="inline-flex items-center gap-1">
                                            <svg
                                              className="w-3 h-3"
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
                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
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
                  {faixas?.map((faixa: FaixaDef) => (
                    <option key={faixa.id} value={faixa.id}>
                      {faixa.nome}
                    </option>
                  ))}
                </select>
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
                    Data de Fim
                  </label>
                  <Input
                    type="date"
                    value={faixaForm.dt_fim}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFaixaForm({ ...faixaForm, dt_fim: e.target.value })
                    }
                    placeholder="Quando você terminou nesta faixa"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700">
                  💡 <strong>Dica:</strong> Registre apenas faixas antigas que
                  você conquistou no passado. A data de início é obrigatória. A
                  data de fim é opcional (deixe em branco se ainda está nesta
                  faixa).
                </p>
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
