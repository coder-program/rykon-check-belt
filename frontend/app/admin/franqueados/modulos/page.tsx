"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { ArrowLeft, Blocks, Package, Plus, Tag, ToggleLeft } from "lucide-react";

const MODULOS_PREVIEW = [
  { codigo: "CORE", nome: "Rykon FIT Core", tipo: "Base", valor: "—", obrigatorio: true },
  { codigo: "FIN", nome: "Financeiro / Assinaturas", tipo: "Extra", valor: "—", obrigatorio: false },
  { codigo: "CHECKIN", nome: "Check-in / Presença", tipo: "Extra", valor: "—", obrigatorio: false },
  { codigo: "CATRAC", nome: "Catraca / Biometria", tipo: "Extra", valor: "—", obrigatorio: false },
  { codigo: "GRAD", nome: "Graduação", tipo: "Extra", valor: "—", obrigatorio: false },
  { codigo: "REL", nome: "Relatórios Avançados", tipo: "Extra", valor: "—", obrigatorio: false },
  { codigo: "WHATS", nome: "WhatsApp / Comunicação", tipo: "Extra", valor: "—", obrigatorio: false },
  { codigo: "COMP", nome: "Competições / Eventos", tipo: "Extra", valor: "—", obrigatorio: false },
  { codigo: "MULTI", nome: "Multiunidades", tipo: "Extra", valor: "—", obrigatorio: false },
  { codigo: "API", nome: "API / Integrações", tipo: "Extra", valor: "—", obrigatorio: false },
];

export default function FranqueadosModulosPage() {
  const router = useRouter();

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div
        className="min-h-screen"
        style={{ background: "linear-gradient(160deg, #f5f3ff 0%, #ede9fe 30%, #f3f4f6 100%)" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#4c1d95] shadow-xl">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/admin/franqueados")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white rounded-lg text-sm transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <Blocks className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Catálogo de Módulos</h1>
                  <p className="text-violet-200 text-sm mt-0.5">Módulos disponíveis para contratação</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          {/* Notice */}
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-violet-600 text-sm">🚧</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-800">Catálogo em desenvolvimento — Fase 2</p>
              <p className="text-xs text-violet-600 mt-1 leading-relaxed">
                O catálogo abaixo mostra os módulos previstos conforme a documentação funcional.
                Quando implementado, será possível definir preços, ativar/desativar e vincular módulos a contratos de franqueados.
              </p>
            </div>
          </div>

          {/* Modules table preview */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Módulos previstos</h2>
              <span className="text-xs text-gray-400">{MODULOS_PREVIEW.length} módulos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Módulo</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Código</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Tipo</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Valor padrão</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Obrigatório</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MODULOS_PREVIEW.map((m) => (
                    <tr key={m.codigo} className="hover:bg-violet-50/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-violet-500" />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{m.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                          {m.codigo}
                        </code>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={
                            m.tipo === "Base"
                              ? "text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700"
                              : "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
                          }
                        >
                          {m.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-sm text-gray-400 italic">A definir</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={
                            m.obrigatorio
                              ? "text-xs font-medium text-green-600"
                              : "text-xs text-gray-400"
                          }
                        >
                          {m.obrigatorio ? "Sim" : "Não"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
