"use client";

import React, { useState } from "react";
import { timerApi, TimerConfigDto } from "@/lib/timerApi";
import toast from "react-hot-toast";

interface TimerConfigFormProps {
  academiaId?: string;
  onCreated?: () => void;
}

const DEFAULT_FORM: TimerConfigDto = {
  nome: "",
  modo: "simple",
  duracaoSegundos: 300,
  numRounds: 3,
  duracaoRoundSegundos: 300,
  duracaoDescansoSegundos: 60,
  exercicios: [{ nome: "", duracaoSegundos: 40, descansoSegundos: 20 }],
};

export function TimerConfigForm({ academiaId, onCreated }: TimerConfigFormProps) {
  const [form, setForm] = useState<TimerConfigDto>({ ...DEFAULT_FORM, academiaId });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const set = (field: keyof TimerConfigDto, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setExercise = (idx: number, field: string, value: any) =>
    setForm((prev) => ({
      ...prev,
      exercicios: (prev.exercicios ?? []).map((e, i) =>
        i === idx ? { ...e, [field]: value } : e
      ),
    }));

  const addExercise = () =>
    setForm((prev) => ({
      ...prev,
      exercicios: [
        ...(prev.exercicios ?? []),
        { nome: "", duracaoSegundos: 40, descansoSegundos: 20 },
      ],
    }));

  const removeExercise = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      exercicios: (prev.exercicios ?? []).filter((_, i) => i !== idx),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) return toast.error("Informe o nome do timer");
    setLoading(true);
    try {
      await timerApi.create(form);
      toast.success("Timer criado com sucesso!");
      setForm({ ...DEFAULT_FORM, academiaId });
      setOpen(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar timer");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        + Novo Timer
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-xl font-bold">Novo Timer</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ✕
        </button>
      </div>

      {/* Nome */}
      <label className="block mb-3">
        <span className="text-gray-400 text-sm">Nome</span>
        <input
          value={form.nome}
          onChange={(e) => set("nome", e.target.value)}
          className="mt-1 w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Ex: Treino de Jiu-Jitsu"
        />
      </label>

      {/* Modo */}
      <label className="block mb-4">
        <span className="text-gray-400 text-sm">Modo</span>
        <select
          value={form.modo}
          onChange={(e) => set("modo", e.target.value)}
          className="mt-1 w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="simple">⏱ Simples (contagem regressiva)</option>
          <option value="rounds">🥊 Rounds (luta/esporte)</option>
          <option value="circuit">🔥 Circuito (HIIT/funcional)</option>
        </select>
      </label>

      {/* SIMPLE fields */}
      {form.modo === "simple" && (
        <label className="block mb-3">
          <span className="text-gray-400 text-sm">Duração total (segundos)</span>
          <input
            type="number"
            min={1}
            value={form.duracaoSegundos}
            onChange={(e) => set("duracaoSegundos", Number(e.target.value))}
            className="mt-1 w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
      )}

      {/* ROUNDS fields */}
      {form.modo === "rounds" && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          <label className="block">
            <span className="text-gray-400 text-xs">Nº Rounds</span>
            <input
              type="number"
              min={1}
              value={form.numRounds}
              onChange={(e) => set("numRounds", Number(e.target.value))}
              className="mt-1 w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-gray-400 text-xs">Duração round (s)</span>
            <input
              type="number"
              min={1}
              value={form.duracaoRoundSegundos}
              onChange={(e) => set("duracaoRoundSegundos", Number(e.target.value))}
              className="mt-1 w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-gray-400 text-xs">Descanso (s)</span>
            <input
              type="number"
              min={0}
              value={form.duracaoDescansoSegundos}
              onChange={(e) => set("duracaoDescansoSegundos", Number(e.target.value))}
              className="mt-1 w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}

      {/* CIRCUIT fields */}
      {form.modo === "circuit" && (
        <div className="mb-3">
          <p className="text-gray-400 text-sm mb-2">Exercícios</p>
          {(form.exercicios ?? []).map((ex, i) => (
            <div key={i} className="flex gap-2 mb-2 items-end">
              <div className="flex-1">
                <span className="text-gray-500 text-xs">Nome</span>
                <input
                  value={ex.nome}
                  onChange={(e) => setExercise(i, "nome", e.target.value)}
                  placeholder="Burpee"
                  className="mt-1 w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div className="w-16">
                <span className="text-gray-500 text-xs">Dur (s)</span>
                <input
                  type="number"
                  min={1}
                  value={ex.duracaoSegundos}
                  onChange={(e) => setExercise(i, "duracaoSegundos", Number(e.target.value))}
                  className="mt-1 w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div className="w-16">
                <span className="text-gray-500 text-xs">Desc (s)</span>
                <input
                  type="number"
                  min={0}
                  value={ex.descansoSegundos}
                  onChange={(e) => setExercise(i, "descansoSegundos", Number(e.target.value))}
                  className="mt-1 w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeExercise(i)}
                className="text-red-500 hover:text-red-400 pb-1.5 text-lg"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addExercise}
            className="text-green-400 hover:text-green-300 text-sm mt-1"
          >
            + Adicionar exercício
          </button>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading ? "Salvando..." : "Salvar Timer"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
