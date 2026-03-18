"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { TimerDisplay } from "@/components/timer/TimerDisplay";
import { TimerConfigForm } from "@/components/timer/TimerConfigForm";
import { useTimerSocket } from "@/hooks/useTimerSocket";
import { timerApi, TimerConfig } from "@/lib/timerApi";
import toast from "react-hot-toast";

export default function TimerPage() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<TimerConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Usar unidade_id do usuário como academyId, ou o id do usuário como fallback
  const academyId: string = user?.unidade_id ?? user?.id ?? "default";

  const { state, connected, start, pause, resume, reset } = useTimerSocket({
    academyId,
    role: "admin",
  });

  const loadConfigs = useCallback(async () => {
    try {
      const list = await timerApi.list(academyId);
      setConfigs(list);
      if (list.length > 0 && !selectedConfigId) {
        setSelectedConfigId(list[0].id);
      }
    } catch (err: any) {
      toast.error("Erro ao carregar timers: " + (err.message ?? ""));
    } finally {
      setLoadingConfigs(false);
    }
  }, [academyId, selectedConfigId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // URL pública para a TV
  const tvUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tv/timer/${academyId}`
      : `/tv/timer/${academyId}`;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⏱</span>
          <h1 className="text-xl font-bold">Painel de Cronômetro</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          {connected ? "Conectado" : "Desconectado"}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Timer display */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <div className="w-full rounded-2xl overflow-hidden" style={{ minHeight: 400 }}>
            <TimerDisplay
              state={state}
              connected={connected}
              tvMode={false}
              configs={configs.map((c) => ({ id: c.id, nome: c.nome }))}
              selectedConfigId={selectedConfigId}
              onSelectConfig={setSelectedConfigId}
              onStart={start}
              onPause={pause}
              onResume={resume}
              onReset={reset}
            />
          </div>

          {/* TV URL share */}
          <div className="mt-4 w-full bg-gray-900 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">🖥 URL para TV / dispositivos</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-green-400 text-sm bg-gray-800 px-3 py-2 rounded-lg break-all">
                {tvUrl}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tvUrl);
                  toast.success("URL copiada!");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors"
              >
                Copiar
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Abra essa URL em qualquer TV, tablet ou celular para exibir o cronômetro sincronizado.
            </p>
          </div>
        </div>

        {/* Right: Timer configs */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-200">Configurações de Timer</h2>

          <TimerConfigForm
            academiaId={academyId}
            onCreated={loadConfigs}
          />

          {loadingConfigs ? (
            <p className="text-gray-500 text-sm">Carregando...</p>
          ) : configs.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Nenhum timer configurado. Crie um acima.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {configs.map((c) => (
                <li
                  key={c.id}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedConfigId === c.id
                      ? "border-green-500 bg-green-950"
                      : "border-gray-700 bg-gray-900 hover:border-gray-500"
                  }`}
                  onClick={() => setSelectedConfigId(c.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white text-sm">{c.nome}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.modo === "simple"
                          ? "bg-blue-900 text-blue-300"
                          : c.modo === "rounds"
                          ? "bg-red-900 text-red-300"
                          : "bg-orange-900 text-orange-300"
                      }`}
                    >
                      {c.modo === "simple"
                        ? "Simples"
                        : c.modo === "rounds"
                        ? "Rounds"
                        : "Circuito"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    {c.modo === "simple" &&
                      `${Math.floor((c.duracaoSegundos ?? 0) / 60)}min ${(c.duracaoSegundos ?? 0) % 60}s`}
                    {c.modo === "rounds" &&
                      `${c.numRounds} rounds × ${Math.floor((c.duracaoRoundSegundos ?? 0) / 60)}min | descanso ${c.duracaoDescansoSegundos}s`}
                    {c.modo === "circuit" &&
                      `${c.exercicios?.length ?? 0} exercícios`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
