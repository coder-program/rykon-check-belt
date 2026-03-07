"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { conviteApi, aulaExperimentalApi, CriarConviteDto, ConfigAulaExperimental } from "@/lib/conviteApi";
import { listUnidadeModalidades, UnidadeModalidade } from "@/lib/peopleApi";
import { Copy, Share2, X, Calendar, Mail, Dumbbell } from "lucide-react";
import toast from "react-hot-toast";
import {
  GiHighKick,
  GiBoxingGlove,
  GiKimono,
  GiFist,
  GiMeditation,
  GiWeightLiftingUp,
  GiMuscleUp,
} from "react-icons/gi";

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

function getEsporteIcon(nome?: string): React.ReactNode {
  const n = (nome ?? "").toLowerCase();
  if (n.includes("muay") || n.includes("kickbox") || n.includes("karate") || n.includes("taekwondo"))
    return <GiHighKick size={15} />;
  if (n.includes("box"))
    return <GiBoxingGlove size={15} />;
  if (n.includes("jiu") || n.includes("judo") || n.includes("bjj"))
    return <GiKimono size={15} />;
  if (n.includes("mma") || n.includes("luta") || n.includes("wrestling") || n.includes("krav"))
    return <GiFist size={15} />;
  if (n.includes("yoga") || n.includes("pilates") || n.includes("medita"))
    return <GiMeditation size={15} />;
  if (n.includes("cross") || n.includes("funcional"))
    return <GiWeightLiftingUp size={15} />;
  if (n.includes("muscula") || n.includes("gym"))
    return <GiMuscleUp size={15} />;
  return <Dumbbell size={15} />;
}

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

  // Aula experimental
  const [modalidades, setModalidades] = useState<UnidadeModalidade[]>([]);
  const [modalidadeAulaId, setModalidadeAulaId] = useState("");
  const [config, setConfig] = useState<ConfigAulaExperimental | null>(null);
  const [agendamentoAtivado, setAgendamentoAtivado] = useState(false);
  const [dataAula, setDataAula] = useState("");
  const [horarioAula, setHorarioAula] = useState("");

  // Carregar modalidades da unidade
  useEffect(() => {
    if (unidadeId) {
      listUnidadeModalidades({ unidade_id: unidadeId })
        .then((data) => setModalidades(data.filter((m) => m.ativa)))
        .catch(() => setModalidades([]));
    } else {
      setModalidades([]);
    }
  }, [unidadeId]);

  // Carregar config da modalidade selecionada
  useEffect(() => {
    if (unidadeId && modalidadeAulaId) {
      aulaExperimentalApi
        .getConfig(unidadeId, modalidadeAulaId)
        .then(setConfig)
        .catch(() => setConfig(null));
    } else {
      setConfig(null);
    }
  }, [unidadeId, modalidadeAulaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (agendamentoAtivado && (!modalidadeAulaId || !dataAula || !horarioAula)) {
      toast.error("Preencha modalidade, data e horário da aula experimental");
      return;
    }

    setLoading(true);

    try {
      const response = await conviteApi.criarConvite(formData);

      // Se agendamento ativado, criar junto
      if (agendamentoAtivado && formData.unidade_id && modalidadeAulaId && dataAula && horarioAula) {
        await aulaExperimentalApi.criar({
          unidade_id: formData.unidade_id,
          modalidade_id: modalidadeAulaId,
          convite_id: response.convite?.id,
          nome: formData.nome_pre_cadastro || "Não informado",
          email: formData.email,
          telefone: formData.telefone,
          cpf: formData.cpf,
          data_aula: dataAula,
          horario: horarioAula,
        });
        toast.success("Agendamento de aula experimental criado!");
      }

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
    setAgendamentoAtivado(false);
    setModalidadeAulaId("");
    setDataAula("");
    setHorarioAula("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll do body quando modal estiver aberto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className="bg-linear-to-r from-[#0f172a] via-[#1e3a8a] to-[#312e81] px-6 py-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Novo Convite</h2>
              <p className="text-blue-200/70 text-xs">Link de cadastro para o aluno</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
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
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50"
                required
              >
                <option value="ALUNO">Aluno</option>
                <option value="RESPONSAVEL">Responsável</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
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
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50"
                placeholder="Nome para pré-preenchimento"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Email (opcional)
              </label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50"
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Telefone
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  CPF
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Observações (opcional)
              </label>
              <textarea
                value={formData.observacoes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50 resize-none"
                rows={2}
                placeholder="Informações adicionais sobre o convite"
              />
            </div>

            {/* Agendar Aula Experimental */}
            {formData.tipo_cadastro === "ALUNO" && modalidades.length > 0 && (
              <div className="border rounded-xl p-4 space-y-3 bg-linear-to-br from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                      <Calendar size={14} className="text-white" />
                    </div>
                    Agendar Aula Experimental
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAgendamentoAtivado(!agendamentoAtivado);
                      if (agendamentoAtivado) {
                        setModalidadeAulaId("");
                        setDataAula("");
                        setHorarioAula("");
                      }
                    }}
                    className={`relative w-10 h-6 rounded-full transition-colors ${agendamentoAtivado ? "bg-blue-600" : "bg-gray-300"}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${agendamentoAtivado ? "translate-x-5" : "translate-x-1"}`}
                    />
                  </button>
                </div>

                {agendamentoAtivado && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        Modalidade *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {modalidades.map((m) => (
                          <button
                            key={m.modalidade_id}
                            type="button"
                            onClick={() => setModalidadeAulaId(m.modalidade_id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              modalidadeAulaId === m.modalidade_id
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-400/30"
                                : "bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
                            }`}
                          >
                            {getEsporteIcon(m.modalidade?.nome)}
                            {m.modalidade?.nome ?? m.modalidade_id}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                          Data da Aula *
                        </label>
                        <input
                          type="date"
                          value={dataAula}
                          onChange={(e) => setDataAula(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
                          required={agendamentoAtivado}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                          Horário *
                        </label>
                        <input
                          type="time"
                          value={horarioAula}
                          onChange={(e) => setHorarioAula(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
                          required={agendamentoAtivado}
                        />
                      </div>
                    </div>

                    {config && (
                      <p className="text-xs text-blue-600">
                        {config.max_aulas > 1
                          ? `Até ${config.max_aulas} aulas experimentais permitidas`
                          : "1 aula experimental permitida"}{" "}
                        · {config.duracao_minutos} min
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300 shadow-lg shadow-blue-500/25 transition-colors"
                disabled={loading}
              >
                {loading ? "Criando..." : "Criar Convite"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-emerald-400/30">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <div>
                <p className="text-emerald-800 font-semibold">Convite criado com sucesso!</p>
                <p className="text-sm text-emerald-600 mt-0.5">
                  Válido por 7 dias · uso único
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Link de Cadastro
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={result.link}
                  readOnly
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-sm font-mono text-slate-600 focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
                  title="Copiar link"
                >
                  <Copy size={15} />
                  Copiar
                </button>
              </div>
            </div>

            <button
              onClick={handleWhatsApp}
              className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-colors"
            >
              <Share2 size={16} />
              Enviar por WhatsApp
            </button>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Criar Outro
              </button>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
