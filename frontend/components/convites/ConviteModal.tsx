"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { conviteApi, CriarConviteDto } from "@/lib/conviteApi";
import { Copy, Share2, X } from "lucide-react";
import toast from "react-hot-toast";

// Funções de máscara
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
};

interface ConviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidadeId?: string;
}

export default function ConviteModal({
  isOpen,
  onClose,
  unidadeId,
}: ConviteModalProps) {
  const [formData, setFormData] = useState<CriarConviteDto>({
    tipo_cadastro: "ALUNO",
    unidade_id: unidadeId,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    link: string;
    linkWhatsApp: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar se unidade_id está presente
    if (!formData.unidade_id) {
      toast.error("É necessário selecionar uma unidade antes de criar o convite");
      return;
    }

    setLoading(true);

    try {
      const response = await conviteApi.criarConvite(formData);
      setResult({
        link: response.link,
        linkWhatsApp: response.linkWhatsApp,
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar convite");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (result?.link) {
      navigator.clipboard.writeText(result.link);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const handleWhatsApp = () => {
    if (result?.linkWhatsApp) {
      window.open(result.linkWhatsApp, "_blank");
    }
  };

  const handleReset = () => {
    setFormData({
      tipo_cadastro: "ALUNO",
      unidade_id: unidadeId,
    });
    setResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Enviar Convite de Cadastro</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tipo de Cadastro <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tipo_cadastro}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tipo_cadastro: e.target.value as "ALUNO" | "RESPONSAVEL",
                  })
                }
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="ALUNO">Aluno</option>
                <option value="RESPONSAVEL">Responsável</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Nome (opcional)
              </label>
              <input
                type="text"
                value={formData.nome_pre_cadastro || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nome_pre_cadastro: e.target.value,
                  })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="Nome para pré-preenchimento"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email (opcional)
              </label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Telefone (opcional)
              </label>
              <input
                type="tel"
                value={formData.telefone || ""}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  if (formatted.replace(/\D/g, "").length <= 11) {
                    setFormData({ ...formData, telefone: formatted });
                  }
                }}
                className="w-full border rounded px-3 py-2"
                placeholder="(11) 99999-9999"
                maxLength={15}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                CPF (opcional)
              </label>
              <input
                type="text"
                value={formData.cpf || ""}
                onChange={(e) => {
                  const formatted = formatCPF(e.target.value);
                  if (formatted.replace(/\D/g, "").length <= 11) {
                    setFormData({ ...formData, cpf: formatted });
                  }
                }}
                className="w-full border rounded px-3 py-2"
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Observações (opcional)
              </label>
              <textarea
                value={formData.observacoes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="Informações adicionais sobre o convite"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                disabled={loading}
              >
                {loading ? "Criando..." : "Criar Convite"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-800 font-medium mb-2">
                ✓ Convite criado com sucesso!
              </p>
              <p className="text-sm text-green-700">
                O link é válido por 7 dias e pode ser usado uma única vez.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Link de Cadastro:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={result.link}
                  readOnly
                  className="flex-1 border rounded px-3 py-2 bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                  title="Copiar link"
                >
                  <Copy size={16} />
                  Copiar
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleWhatsApp}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                Enviar por WhatsApp
              </button>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Criar Outro Convite
              </button>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
