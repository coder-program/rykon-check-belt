"use client";

import React, { useEffect, useRef, useState } from "react";
import { TimerState } from "@/lib/timerApi";

interface TimerDisplayProps {
  state: TimerState | null;
  connected: boolean;
  /** se true, esconde os botões de controle */
  tvMode?: boolean;
  onStart?: (configId: string) => void;
  onPause?: () => void;
  onResume?: () => void;
  onReset?: () => void;
  configs?: { id: string; nome: string }[];
  selectedConfigId?: string;
  onSelectConfig?: (id: string) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimerDisplay({
  state,
  connected,
  tvMode = false,
  onStart,
  onPause,
  onResume,
  onReset,
  configs = [],
  selectedConfigId,
  onSelectConfig,
}: TimerDisplayProps) {
  const [flash, setFlash] = useState(false);
  const wasFinished = useRef(false);

  // Detectar quando termina e piscar a tela
  useEffect(() => {
    if (state?.status === "finished" && !wasFinished.current) {
      wasFinished.current = true;
      let count = 0;
      const id = setInterval(() => {
        setFlash((f) => !f);
        count++;
        if (count >= 10) {
          clearInterval(id);
          setFlash(false);
        }
      }, 300);
    }
    if (state?.status !== "finished") {
      wasFinished.current = false;
    }
  }, [state?.status]);

  const isLastTen =
    state?.status === "running" &&
    !state.isResting &&
    state.timeRemaining <= 10 &&
    state.timeRemaining > 0;

  const bgColor = flash
    ? "bg-white"
    : state?.status === "finished"
    ? "bg-red-900"
    : state?.isResting
    ? "bg-yellow-900"
    : isLastTen
    ? "bg-red-900"
    : "bg-gray-950";

  const timeColor = flash
    ? "text-gray-900"
    : state?.status === "finished"
    ? "text-red-400 animate-pulse"
    : state?.isResting
    ? "text-yellow-300"
    : isLastTen
    ? "text-red-400"
    : state?.status === "running"
    ? "text-green-400"
    : state?.status === "paused"
    ? "text-yellow-400"
    : "text-white";

  const statusLabel =
    state?.status === "running"
      ? state.isResting
        ? "DESCANSO"
        : "EM ANDAMENTO"
      : state?.status === "paused"
      ? "PAUSADO"
      : state?.status === "finished"
      ? "FINALIZADO"
      : "AGUARDANDO";

  const statusColor =
    state?.isResting
      ? "text-yellow-400"
      : state?.status === "running"
      ? "text-green-400"
      : state?.status === "paused"
      ? "text-yellow-400"
      : state?.status === "finished"
      ? "text-red-400"
      : "text-gray-400";

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center transition-colors duration-150 select-none ${bgColor}`}
    >
      {/* Connection indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span
          className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span className="text-gray-400 text-sm">
          {connected ? "Conectado" : "Desconectado"}
        </span>
      </div>

      {/* Nome do treino */}
      <h1 className="text-2xl md:text-4xl font-bold text-gray-300 mb-2 tracking-widest uppercase">
        {state?.nome ?? "Cronômetro de Treino"}
      </h1>

      {/* Status */}
      <p className={`text-xl md:text-2xl font-semibold mb-4 ${statusColor} tracking-widest`}>
        {statusLabel}
      </p>

      {/* Round info */}
      {state && state.totalRounds > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-gray-400 text-lg md:text-2xl">
            {state.isResting ? "DESCANSO" : `ROUND ${state.currentRound}`}
          </span>
          <span className="text-gray-600 text-lg md:text-2xl">
            / {state.totalRounds}
          </span>
        </div>
      )}

      {/* Exercício atual (modo circuito) */}
      {state?.mode === "circuit" && state.exercicioAtual && (
        <p className="text-yellow-300 text-2xl md:text-4xl font-bold mb-4 uppercase tracking-wider">
          {state.isResting ? "Descanso" : state.exercicioAtual}
        </p>
      )}

      {/* Cronômetro */}
      <div
        className={`font-mono font-black leading-none tabular-nums ${timeColor}`}
        style={{ fontSize: "clamp(5rem, 22vw, 20rem)" }}
      >
        {formatTime(state?.timeRemaining ?? 0)}
      </div>

      {/* Round dots */}
      {state && state.totalRounds > 1 && (
        <div className="flex gap-3 mt-6">
          {Array.from({ length: state.totalRounds }).map((_, i) => (
            <span
              key={i}
              className={`w-4 h-4 md:w-5 md:h-5 rounded-full ${
                i < state.currentRound - 1
                  ? "bg-gray-600"
                  : i === state.currentRound - 1
                  ? state.isResting
                    ? "bg-yellow-400"
                    : "bg-green-400"
                  : "bg-gray-800"
              }`}
            />
          ))}
        </div>
      )}

      {/* Controls — só aparecem fora do modo TV */}
      {!tvMode && (
        <div className="mt-10 flex flex-col items-center gap-6 w-full max-w-md px-4">
          {/* Config selector */}
          {configs.length > 0 && (
            <div className="w-full">
              <label className="text-gray-400 text-sm mb-1 block">
                Configuração do Timer
              </label>
              <select
                value={selectedConfigId ?? ""}
                onChange={(e) => onSelectConfig?.(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selecione...</option>
                {configs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Button row */}
          <div className="flex gap-4 w-full justify-center flex-wrap">
            {/* Start */}
            {(!state || state.status === "idle" || state.status === "finished") && (
              <button
                onClick={() => selectedConfigId && onStart?.(selectedConfigId)}
                disabled={!selectedConfigId}
                className="flex-1 min-w-30 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-2xl font-bold py-5 rounded-2xl transition-colors shadow-lg"
              >
                ▶ START
              </button>
            )}

            {/* Pause */}
            {state?.status === "running" && (
              <button
                onClick={onPause}
                className="flex-1 min-w-30 bg-yellow-600 hover:bg-yellow-500 text-white text-2xl font-bold py-5 rounded-2xl transition-colors shadow-lg"
              >
                ⏸ PAUSE
              </button>
            )}

            {/* Resume */}
            {state?.status === "paused" && (
              <button
                onClick={onResume}
                className="flex-1 min-w-30 bg-green-600 hover:bg-green-500 text-white text-2xl font-bold py-5 rounded-2xl transition-colors shadow-lg"
              >
                ▶ RESUME
              </button>
            )}

            {/* Reset */}
            {state && state.status !== "idle" && (
              <button
                onClick={onReset}
                className="flex-1 min-w-30 bg-red-700 hover:bg-red-600 text-white text-2xl font-bold py-5 rounded-2xl transition-colors shadow-lg"
              >
                ↺ RESET
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
