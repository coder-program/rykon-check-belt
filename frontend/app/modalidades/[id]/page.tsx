"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/app/auth/AuthContext";
import {
  getModalidadeById,
  getModalidadeAlunos,
  getModalidadeEstatisticas,
} from "@/lib/peopleApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  Dumbbell,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
type UserPerfil = { nome?: string; perfil?: string } | string;
type AuthUser = { perfis?: UserPerfil[]; unidade_id?: string } | null;

function hasPerfil(user: AuthUser, p: string): boolean {
  if (!user?.perfis) return false;
  return user.perfis.some(
    (perfil: UserPerfil) =>
      (typeof perfil === "string" ? perfil : perfil?.nome || "")
        .toLowerCase() === p.toLowerCase()
  );
}

function podeGerenciar(user: AuthUser): boolean {
  return (
    hasPerfil(user, "master") ||
    hasPerfil(user, "franqueado") ||
    hasPerfil(user, "gerente_unidade") ||
    hasPerfil(user, "gerente")
  );
}

function formatCurrency(val?: number | null): string {
  if (val === undefined || val === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------
export default function ModalidadeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: modalidade, isLoading: loadingMod, error: errorMod } = useQuery({
    queryKey: ["modalidade", id],
    queryFn: () => getModalidadeById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ["modalidade-alunos", id],
    queryFn: () => getModalidadeAlunos(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["modalidade-estatisticas", id],
    queryFn: () => getModalidadeEstatisticas(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = loadingMod || loadingAlunos || loadingStats;

  return (
    <ProtectedRoute
      requiredPerfis={["master", "franqueado", "gerente_unidade", "gerente"]}
    >
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Botão voltar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/modalidades")}
            className="mb-4 -ml-2 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para Modalidades
          </Button>

          {/* Loading global */}
          {isLoading && !modalidade && (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {/* Erro */}
          {errorMod && (
            <div className="flex flex-col items-center py-20 gap-3">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-gray-600 font-medium">Modalidade não encontrada</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/modalidades")}
              >
                Voltar para a lista
              </Button>
            </div>
          )}

          {/* Conteúdo */}
          {modalidade && (
            <div className="space-y-6">
              {/* Header da modalidade */}
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: modalidade.cor + "22", border: `2px solid ${modalidade.cor}` }}
                    >
                      <Dumbbell
                        className="h-6 w-6"
                        style={{ color: modalidade.cor }}
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {modalidade.nome}
                      </h1>
                      {modalidade.descricao && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {modalidade.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={modalidade.ativo ? "default" : "secondary"}
                      className={
                        modalidade.ativo
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500"
                      }
                    >
                      {modalidade.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                    {podeGerenciar(user) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/modalidades")}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        Gerenciar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span>
                      <span className="text-gray-400 mr-1">Graduação:</span>
                      {modalidade.tipo_graduacao || "Sem graduação"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span>
                      <span className="text-gray-400 mr-1">Mensalidade base:</span>
                      {formatCurrency(modalidade.valor_mensalidade)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cards de estatísticas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<Users className="h-5 w-5 text-blue-500" />}
                  label="Total de Alunos"
                  value={loadingStats ? null : (stats?.totalAlunos ?? alunos.length)}
                  colorClass="bg-blue-50 border-blue-100"
                  format="number"
                />
                <StatCard
                  icon={<DollarSign className="h-5 w-5 text-green-500" />}
                  label="Mensalidade Base"
                  value={loadingMod ? null : modalidade.valor_mensalidade}
                  colorClass="bg-green-50 border-green-100"
                  format="currency"
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
                  label="Fat. Potencial"
                  value={loadingStats ? null : stats?.faturamentoPotencial}
                  colorClass="bg-emerald-50 border-emerald-100"
                  format="currency"
                  tooltip="Valor base × total de alunos ativos"
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
                  label="Fat. Real"
                  value={loadingStats ? null : stats?.faturamentoReal}
                  colorClass="bg-purple-50 border-purple-100"
                  format="currency"
                  tooltip="Soma dos valores praticados dos alunos ativos"
                />
              </div>

              {/* Tabela de alunos */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Alunos Matriculados
                    {!loadingAlunos && (
                      <span className="text-sm font-normal text-gray-500">
                        ({alunos.length})
                      </span>
                    )}
                  </h2>
                </div>

                {loadingAlunos ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  </div>
                ) : alunos.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-2">
                    <Users className="h-8 w-8 text-gray-300" />
                    <p className="text-gray-500 text-sm">Nenhum aluno matriculado nesta modalidade</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-6 py-3 font-medium text-gray-500">
                            Aluno
                          </th>
                          <th className="text-left px-6 py-3 font-medium text-gray-500">
                            Matrícula
                          </th>
                          <th className="text-left px-6 py-3 font-medium text-gray-500">
                            Valor Praticado
                          </th>
                          <th className="text-left px-6 py-3 font-medium text-gray-500">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {alunos.map((a) => (
                          <tr
                            key={a.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-3">
                              <div>
                                <p className="font-medium text-gray-900 truncate max-w-xs">
                                  {a.nome}
                                </p>
                                {a.email && (
                                  <p className="text-xs text-gray-400 truncate max-w-xs">
                                    {a.email}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                              {formatDate(a.data_matricula)}
                            </td>
                            <td className="px-6 py-3 text-gray-900 font-medium whitespace-nowrap">
                              {formatCurrency(a.valor_praticado)}
                            </td>
                            <td className="px-6 py-3">
                              {a.ativo && a.aluno_ativo ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle className="h-3 w-3" />
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                                  <XCircle className="h-3 w-3" />
                                  Inativo
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
function StatCard({
  icon,
  label,
  value,
  colorClass,
  format,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null | undefined;
  colorClass: string;
  format: "number" | "currency";
  tooltip?: string;
}) {
  const display =
    value === null || value === undefined ? (
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    ) : format === "currency" ? (
      formatCurrency(value)
    ) : (
      value.toString()
    );

  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-2 ${colorClass}`}
      title={tooltip}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{display}</div>
    </div>
  );
}
