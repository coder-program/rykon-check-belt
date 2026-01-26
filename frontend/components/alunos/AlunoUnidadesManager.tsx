"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  Trash2,
  Star,
  StarOff,
  Calendar,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/peopleApi";

interface AlunoUnidade {
  id: string;
  aluno_id: string;
  unidade_id: string;
  data_matricula: string;
  is_principal: boolean;
  ativo: boolean;
  observacoes?: string;
  unidade: {
    id: string;
    nome: string;
    endereco?: string;
  };
}

interface AlunoUnidadesManagerProps {
  alunoId: string;
  readOnly?: boolean;
}

interface NovaUnidadeForm {
  unidade_id: string;
  data_matricula: string;
  is_principal: boolean;
  observacoes?: string;
}

export default function AlunoUnidadesManager({
  alunoId,
  readOnly = false,
}: AlunoUnidadesManagerProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [novaUnidade, setNovaUnidade] = useState<NovaUnidadeForm>({
    unidade_id: "",
    data_matricula: new Date().toISOString().split("T")[0],
    is_principal: false,
    observacoes: "",
  });

  // Query para listar unidades do aluno
  const { data: unidadesAluno = [], isLoading } = useQuery({
    queryKey: ["aluno-unidades", alunoId],
    queryFn: () =>
      apiClient.get(`/alunos/${alunoId}/unidades`).then((res: { data: unknown }) => res.data),
    enabled: !!alunoId,
  });

  // Query para listar todas as unidades disponíveis
  const { data: todasUnidades = [] } = useQuery({
    queryKey: ["unidades"],
    queryFn: () =>
      apiClient.get("/unidades").then((res: { data: { data?: unknown } }) => res.data.data || []),
  });

  // Mutation para adicionar unidade
  const adicionarUnidadeMutation = useMutation({
    mutationFn: (dados: NovaUnidadeForm) =>
      peopleApi.post(`/alunos/${alunoId}/unidades`, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aluno-unidades", alunoId] });
      toast.success("Unidade adicionada com sucesso!");
      setShowAddForm(false);
      setNovaUnidade({
        unidade_id: "",
        data_matricula: new Date().toISOString().split("T")[0],
        is_principal: false,
        observacoes: "",
      });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Erro ao adicionar unidade");
    },
  });

  // Mutation para remover unidade
  const removerUnidadeMutation = useMutation({
    mutationFn: (unidadeId: string) =>
      peopleApi.delete(`/alunos/${alunoId}/unidades/${unidadeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aluno-unidades", alunoId] });
      toast.success("Unidade removida com sucesso!");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Erro ao remover unidade");
    },
  });

  // Mutation para alterar unidade principal
  const alterarPrincipalMutation = useMutation({
    mutationFn: (unidadeId: string) =>
      peopleApi.patch(`/alunos/${alunoId}/unidades/${unidadeId}/principal`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aluno-unidades", alunoId] });
      toast.success("Unidade principal alterada!");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error.response?.data?.message || "Erro ao alterar unidade principal"
      );
    },
  });

  const handleAdicionarUnidade = () => {
    if (!novaUnidade.unidade_id) {
      toast.error("Selecione uma unidade");
      return;
    }

    // Verificar se já está matriculado nesta unidade
    const jaMatriculado = unidadesAluno.some(
      (au: AlunoUnidade) => au.unidade_id === novaUnidade.unidade_id
    );

    if (jaMatriculado) {
      toast.error("Aluno já está matriculado nesta unidade");
      return;
    }

    adicionarUnidadeMutation.mutate(novaUnidade);
  };

  const handleRemoverUnidade = (unidadeId: string) => {
    const unidade = unidadesAluno.find(
      (au: AlunoUnidade) => au.unidade_id === unidadeId
    );

    if (unidade?.is_principal && unidadesAluno.length > 1) {
      if (
        !confirm(
          "Esta é a unidade principal do aluno. Tem certeza que deseja remover?"
        )
      ) {
        return;
      }
    }

    if (unidadesAluno.length === 1) {
      if (
        !confirm(
          "Esta é a única unidade do aluno. Tem certeza que deseja remover?"
        )
      ) {
        return;
      }
    }

    removerUnidadeMutation.mutate(unidadeId);
  };

  const handleAlterarPrincipal = (unidadeId: string) => {
    alterarPrincipalMutation.mutate(unidadeId);
  };

  const unidadesDisponiveis = todasUnidades.filter(
    (unidade: { id: number; nome: string }) =>
      !unidadesAluno.some((au: AlunoUnidade) => au.unidade_id === unidade.id)
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Unidades do Aluno
          </h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {unidadesAluno.length}
          </span>
        </div>

        {!readOnly && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar Unidade
          </button>
        )}
      </div>

      {/* Formulário para adicionar nova unidade */}
      {showAddForm && !readOnly && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Nova Matrícula
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidade *
              </label>
              <select
                value={novaUnidade.unidade_id}
                onChange={(e) =>
                  setNovaUnidade({ ...novaUnidade, unidade_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione uma unidade</option>
                {unidadesDisponiveis.map((unidade: { id: number; nome: string }) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Matrícula
              </label>
              <input
                type="date"
                value={novaUnidade.data_matricula}
                onChange={(e) =>
                  setNovaUnidade({
                    ...novaUnidade,
                    data_matricula: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={novaUnidade.is_principal}
                  onChange={(e) =>
                    setNovaUnidade({
                      ...novaUnidade,
                      is_principal: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Definir como unidade principal
                </span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={novaUnidade.observacoes || ""}
                onChange={(e) =>
                  setNovaUnidade({
                    ...novaUnidade,
                    observacoes: e.target.value,
                  })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Observações sobre esta matrícula..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdicionarUnidade}
              disabled={adicionarUnidadeMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {adicionarUnidadeMutation.isPending
                ? "Adicionando..."
                : "Adicionar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de unidades do aluno */}
      <div className="space-y-3">
        {unidadesAluno.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma unidade encontrada</p>
          </div>
        ) : (
          unidadesAluno.map((alunoUnidade: AlunoUnidade) => (
            <div
              key={alunoUnidade.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                alunoUnidade.is_principal
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {alunoUnidade.is_principal ? (
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  ) : (
                    <Building2 className="h-5 w-5 text-gray-400" />
                  )}

                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      {alunoUnidade.unidade.nome}
                      {alunoUnidade.is_principal && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          Principal
                        </span>
                      )}
                    </h4>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Matrícula:{" "}
                        {new Date(
                          alunoUnidade.data_matricula
                        ).toLocaleDateString()}
                      </div>

                      {alunoUnidade.unidade.endereco && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {alunoUnidade.unidade.endereco}
                        </div>
                      )}
                    </div>

                    {alunoUnidade.observacoes && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        {alunoUnidade.observacoes}
                      </p>
                    )}
                  </div>
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-2">
                    {!alunoUnidade.is_principal && (
                      <button
                        onClick={() =>
                          handleAlterarPrincipal(alunoUnidade.unidade_id)
                        }
                        disabled={alterarPrincipalMutation.isPending}
                        className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                        title="Definir como principal"
                      >
                        <StarOff className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() =>
                        handleRemoverUnidade(alunoUnidade.unidade_id)
                      }
                      disabled={removerUnidadeMutation.isPending}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remover matrícula"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {unidadesAluno.length === 0 && !readOnly && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Dica:</strong> Um aluno pode estar matriculado em
            múltiplas unidades. Clique em &quot;Adicionar Unidade&quot; para matriculá-lo
            em outras academias.
          </p>
        </div>
      )}
    </div>
  );
}
