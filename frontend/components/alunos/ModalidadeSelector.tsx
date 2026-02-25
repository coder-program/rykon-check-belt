"use client";

import { useQuery } from "@tanstack/react-query";
import { listModalidades, Modalidade } from "@/lib/peopleApi";
import { useEffect } from "react";

export interface ModalidadeSelecionada {
  modalidade_id: string;
  valor_praticado?: number; // undefined = usar valor padrão da modalidade
}

interface Props {
  unidade_id: string | undefined;
  selecionadas: ModalidadeSelecionada[];
  onChange: (selecionadas: ModalidadeSelecionada[]) => void;
  required?: boolean;
}

export default function ModalidadeSelector({
  unidade_id,
  selecionadas,
  onChange,
  required,
}: Props) {
  const { data: modalidades = [], isLoading } = useQuery<Modalidade[]>({
    queryKey: ["modalidades-ativas", unidade_id],
    queryFn: () =>
      listModalidades({ unidade_id, apenasAtivas: true }),
    enabled: !!unidade_id,
  });

  // Limpar seleção quando a unidade muda (se ids selecionados não estiverem na nova lista)
  useEffect(() => {
    if (selecionadas.length === 0) return;
    const ids = new Set(modalidades.map((m) => m.id));
    const validas = selecionadas.filter((s) => ids.has(s.modalidade_id));
    if (validas.length !== selecionadas.length) {
      onChange(validas);
    }
  }, [modalidades]); // eslint-disable-line react-hooks/exhaustive-deps

  const isChecked = (id: string) =>
    selecionadas.some((s) => s.modalidade_id === id);

  const getValor = (id: string) => {
    const found = selecionadas.find((s) => s.modalidade_id === id);
    return found?.valor_praticado;
  };

  const handleToggle = (modalidade: Modalidade) => {
    if (isChecked(modalidade.id)) {
      onChange(selecionadas.filter((s) => s.modalidade_id !== modalidade.id));
    } else {
      onChange([
        ...selecionadas,
        {
          modalidade_id: modalidade.id,
          valor_praticado: undefined, // usar valor padrão
        },
      ]);
    }
  };

  const handleValorChange = (id: string, valor: string) => {
    const parsed = valor === "" ? undefined : parseFloat(valor);
    onChange(
      selecionadas.map((s) =>
        s.modalidade_id === id ? { ...s, valor_praticado: parsed } : s
      )
    );
  };

  if (!unidade_id) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
        Selecione uma unidade para ver as modalidades disponíveis.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
        Carregando modalidades...
      </div>
    );
  }

  if (modalidades.length === 0) {
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
        Nenhuma modalidade ativa cadastrada nesta unidade. Cadastre modalidades
        antes de adicionar alunos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {required && selecionadas.length === 0 && (
        <p className="text-xs text-red-500">
          Selecione ao menos uma modalidade.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3">
        {modalidades.map((m) => {
          const checked = isChecked(m.id);
          const valor = getValor(m.id);

          return (
            <div
              key={m.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg transition-colors cursor-pointer ${
                checked
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              onClick={() => handleToggle(m)}
            >
              {/* Checkbox + Nome */}
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggle(m)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: m.cor || "#1E3A8A" }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.nome}
                  </p>
                  <p className="text-xs text-gray-500">
                    Valor padrão: R${" "}
                    {Number(m.valor_mensalidade || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Valor praticado — só exibe se selecionado */}
              {checked && (
                <div
                  className="flex items-center gap-2 sm:w-48"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="text-xs text-gray-600 whitespace-nowrap">
                    Valor (R$):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={Number(m.valor_mensalidade || 0).toFixed(2)}
                    value={valor !== undefined ? valor : ""}
                    onChange={(e) => handleValorChange(m.id, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
