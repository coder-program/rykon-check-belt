"use client";

import React, { useState } from "react";
import { Building2, Plus, X, Star } from "lucide-react";

interface Unidade {
  id: string;
  nome: string;
  endereco?: string;
}

interface UnidadeSelecionada {
  unidade_id: string;
  data_matricula: string;
  is_principal: boolean;
  observacoes?: string;
}

interface MultiUnidadeSelectorProps {
  unidades: Unidade[];
  unidadesSelecionadas: UnidadeSelecionada[];
  onChange: (unidades: UnidadeSelecionada[]) => void;
  required?: boolean;
}

export default function MultiUnidadeSelector({
  unidades,
  unidadesSelecionadas,
  onChange,
  required = true,
}: MultiUnidadeSelectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [novaUnidade, setNovaUnidade] = useState<UnidadeSelecionada>({
    unidade_id: "",
    data_matricula: new Date().toISOString().split("T")[0],
    is_principal: false,
    observacoes: "",
  });

  const adicionarUnidade = () => {
    if (!novaUnidade.unidade_id) return;

    // Verificar se já está selecionada
    const jaExiste = unidadesSelecionadas.some(
      (u) => u.unidade_id === novaUnidade.unidade_id
    );

    if (jaExiste) return;

    const novasUnidades = [...unidadesSelecionadas, { ...novaUnidade }];

    // Se é a primeira unidade ou está marcada como principal, definir como principal
    if (novasUnidades.length === 1 || novaUnidade.is_principal) {
      // Remover principal das outras
      novasUnidades.forEach((u, index) => {
        u.is_principal =
          index === novasUnidades.length - 1 &&
          (novasUnidades.length === 1 || novaUnidade.is_principal);
      });
    }

    onChange(novasUnidades);
    setNovaUnidade({
      unidade_id: "",
      data_matricula: new Date().toISOString().split("T")[0],
      is_principal: false,
      observacoes: "",
    });
    setShowAddForm(false);
  };

  const removerUnidade = (unidadeId: string) => {
    const novasUnidades = unidadesSelecionadas.filter(
      (u) => u.unidade_id !== unidadeId
    );

    // Se removeu a principal e ainda há outras, definir a primeira como principal
    const removidaEraPrincipal = unidadesSelecionadas.find(
      (u) => u.unidade_id === unidadeId
    )?.is_principal;

    if (removidaEraPrincipal && novasUnidades.length > 0) {
      novasUnidades[0].is_principal = true;
    }

    onChange(novasUnidades);
  };

  const definirPrincipal = (unidadeId: string) => {
    const novasUnidades = unidadesSelecionadas.map((u) => ({
      ...u,
      is_principal: u.unidade_id === unidadeId,
    }));
    onChange(novasUnidades);
  };

  const unidadesDisponiveis = unidades.filter(
    (u) => !unidadesSelecionadas.some((us) => us.unidade_id === u.id)
  );

  const getUnidadeNome = (unidadeId: string) => {
    return (
      unidades.find((u) => u.id === unidadeId)?.nome || "Unidade não encontrada"
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Unidades {required && "*"}
        </label>
        {unidadesDisponiveis.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar Unidade
          </button>
        )}
      </div>

      {/* Formulário para adicionar nova unidade */}
      {showAddForm && (
        <div className="p-4 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Nova Matrícula
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Unidade
              </label>
              <select
                value={novaUnidade.unidade_id}
                onChange={(e) =>
                  setNovaUnidade({
                    ...novaUnidade,
                    unidade_id: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione uma unidade</option>
                {unidadesDisponiveis.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm">
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
                <span className="text-gray-700">Unidade Principal</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Observações
              </label>
              <input
                type="text"
                value={novaUnidade.observacoes || ""}
                onChange={(e) =>
                  setNovaUnidade({
                    ...novaUnidade,
                    observacoes: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Observações sobre esta matrícula..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={adicionarUnidade}
              disabled={!novaUnidade.unidade_id}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Lista de unidades selecionadas */}
      <div className="space-y-2">
        {unidadesSelecionadas.length === 0 ? (
          <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Nenhuma unidade selecionada</p>
            {required && (
              <p className="text-xs text-red-500 mt-1">
                Selecione pelo menos uma unidade
              </p>
            )}
          </div>
        ) : (
          unidadesSelecionadas.map((unidadeSel) => (
            <div
              key={unidadeSel.unidade_id}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                unidadeSel.is_principal
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                {unidadeSel.is_principal ? (
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                ) : (
                  <Building2 className="h-4 w-4 text-gray-400" />
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">
                      {getUnidadeNome(unidadeSel.unidade_id)}
                    </span>
                    {unidadeSel.is_principal && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                        Principal
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-600 mt-0.5">
                    Matrícula:{" "}
                    {new Date(unidadeSel.data_matricula).toLocaleDateString()}
                    {unidadeSel.observacoes && (
                      <span className="ml-2 italic">
                        • {unidadeSel.observacoes}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!unidadeSel.is_principal &&
                  unidadesSelecionadas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => definirPrincipal(unidadeSel.unidade_id)}
                      className="p-1.5 text-gray-400 hover:text-yellow-500 transition-colors"
                      title="Definir como principal"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => removerUnidade(unidadeSel.unidade_id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remover"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {unidadesDisponiveis.length === 0 && unidadesSelecionadas.length > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Todas as unidades disponíveis foram selecionadas.
          </p>
        </div>
      )}
    </div>
  );
}
