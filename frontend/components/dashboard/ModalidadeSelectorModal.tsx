"use client";

import React from "react";
import { Dumbbell, ChevronRight, Layers, ArrowLeftRight } from "lucide-react";
import { Modalidade } from "@/lib/peopleApi";
import {
  GiHighKick,
  GiBoxingGlove,
  GiKimono,
  GiFist,
  GiMeditation,
  GiWeightLiftingUp,
  GiSoccerBall,
  GiBasketballBall,
  GiTennisBall,
  GiRunningShoe,
  GiSwimfins,
  GiAcrobatic,
  GiBlackBelt,
  GiMuscleUp,
} from "react-icons/gi";

function getEsporteIconChip(nome?: string, size = 22): React.ReactNode {
  const n = (nome ?? "").toLowerCase();
  if (n.includes("muay") || n.includes("kickbox") || n.includes("karate") || n.includes("taekwondo"))
    return <GiHighKick size={size} />;
  if (n.includes("box"))
    return <GiBoxingGlove size={size} />;
  if (n.includes("jiu") || n.includes("judo") || n.includes("bjj"))
    return <GiKimono size={size} />;
  if (n.includes("mma") || n.includes("luta"))
    return <GiFist size={size} />;
  if (n.includes("yoga") || n.includes("pilates") || n.includes("medita"))
    return <GiMeditation size={size} />;
  if (n.includes("cross") || n.includes("funcional"))
    return <GiWeightLiftingUp size={size} />;
  if (n.includes("muscula") || n.includes("gym"))
    return <GiMuscleUp size={size} />;
  if (n.includes("futebol") || n.includes("soccer"))
    return <GiSoccerBall size={size} />;
  if (n.includes("basquet"))
    return <GiBasketballBall size={size} />;
  if (n.includes("tenis") || n.includes("tênis"))
    return <GiTennisBall size={size} />;
  if (n.includes("corrida") || n.includes("atletismo"))
    return <GiRunningShoe size={size} />;
  if (n.includes("nata") || n.includes("swim") || n.includes("aqua"))
    return <GiSwimfins size={size} />;
  if (n.includes("capoeira"))
    return <GiAcrobatic size={size} />;
  return <GiBlackBelt size={size} />;
}

interface Props {
  open: boolean;
  modalidades: Modalidade[];
  userName?: string;
  allowAll?: boolean;
  onSelect: (m: Modalidade | null) => void;
  onChangeClick?: () => void; // para abrir externamente
}

const ICON_MAP: Record<string, string> = {
  "Jiu-Jitsu": "🥋",
  "Muay Thai": "🥊",
  Boxe: "🥊",
  Judô: "🥋",
  Karatê: "🥋",
  Taekwondo: "🦵",
  Kickboxing: "🥊",
  MMA: "💪",
  "Luta Livre": "💪",
  Wrestling: "💪",
  Capoeira: "🤸",
  "Kung Fu": "🥋",
  "Krav Maga": "🛡️",
  CrossFit: "🏋️",
  Funcional: "🏃",
  Musculação: "🏋️",
  Submission: "🥋",
  "Defesa Pessoal": "🛡️",
};

function getEmoji(nome: string): string {
  return ICON_MAP[nome] || "🥋";
}

export default function ModalidadeSelectorModal({
  open,
  modalidades,
  userName,
  allowAll = true,
  onSelect,
}: Props) {
  if (!open) return null;

  const firstName = userName?.split(" ")[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-8 py-7 text-white text-center">
          <div className="text-4xl mb-2">👋</div>
          <h2 className="text-2xl font-bold">
            {firstName ? `Olá, ${firstName}!` : "Bem-vindo!"}
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Qual modalidade você quer ver hoje?
          </p>
        </div>

        {/* Modalidades */}
        <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
          {modalidades
            .filter((m) => m.ativo !== false)
            .map((m) => (
              <button
                key={m.id}
                onClick={() => onSelect(m)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:shadow-md transition-all text-left group"
                style={{ "--m-cor": m.cor || "#1E3A8A" } as React.CSSProperties}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = m.cor || "#1E3A8A";
                  el.style.background = (m.cor || "#1E3A8A") + "0D";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "";
                  el.style.background = "";
                }}
              >
                {/* Ícone colorido */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl"
                  style={{
                    backgroundColor: (m.cor || "#1E3A8A") + "22",
                    border: `2px solid ${m.cor || "#1E3A8A"}`,
                  }}
                >
                  <span style={{ color: m.cor || "#1E3A8A" }}>
                    {getEsporteIconChip(m.nome, 24)}
                  </span>
                </div>

                {/* Nome + desc */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{m.nome}</p>
                  {m.descricao && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {m.descricao}
                    </p>
                  )}
                  {m.totalAlunos !== undefined && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {m.totalAlunos} aluno{m.totalAlunos !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
              </button>
            ))}
        </div>

        {/* Ver todas */}
        {allowAll && (
          <div className="px-5 pb-5">
            <button
              onClick={() => onSelect(null)}
              className="w-full py-3 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
            >
              <Layers className="h-4 w-4" />
              Ver todas as modalidades
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Chip compacto para mostrar a seleção ativa no header do dash ─── */
interface ChipProps {
  modalidade: Modalidade | null;
  onClick: () => void;
  className?: string;
}

export function ModalidadeChip({ modalidade, onClick, className = "" }: ChipProps) {
  const cor = modalidade?.cor || "#1E3A8A";
  const label = modalidade ? modalidade.nome : "Todas as modalidades";

  return (
    <button
      onClick={onClick}
      title="Clique para trocar a modalidade"
      className={`cursor-pointer group relative flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-200 hover:scale-[1.05] hover:brightness-110 active:scale-95 select-none ${className}`}
      style={{
        background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 40%, #1d4ed8 100%)",
        border: "2px solid #991b1b",
        boxShadow: "0 6px 24px #dc262660, 0 2px 8px #1d4ed850",
      }}
    >
      {/* Ícone esportivo */}
      <span
        className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-md transition-transform duration-200 group-hover:scale-110"
        style={{
          background: "rgba(255,255,255,0.18)",
          border: "1.5px solid rgba(255,255,255,0.35)",
          color: "#fff",
        }}
      >
        {modalidade
          ? getEsporteIconChip(modalidade.nome, 22)
          : <Layers size={20} />}
      </span>

      {/* Texto */}
      <div className="flex flex-col items-start leading-none gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
          Modalidade
        </span>
        <span className="text-sm font-bold whitespace-nowrap text-white drop-shadow-sm">
          {label}
        </span>
      </div>

      {/* Ícone de troca */}
      <span
        className="flex items-center justify-center w-7 h-7 rounded-lg ml-1 transition-all duration-200 group-hover:rotate-180"
        style={{
          background: "rgba(255,255,255,0.18)",
          color: "rgba(255,255,255,0.85)",
        }}
      >
        <ArrowLeftRight size={14} />
      </span>
    </button>
  );
}
