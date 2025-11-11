"use client";

import React, { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { listProfessores, deleteProfessor } from "@/lib/peopleApi";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Users,
  Award,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { http } from "@/lib/api";
import { PersonForm } from "@/components/people/PersonForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/auth/AuthContext";
import toast, { Toaster } from "react-hot-toast";

// Types
interface Professor {
  id: string;
  nome: string;
  nome_completo?: string;
  email: string;
  telefone: string;
  cpf?: string;
  perfis: string[];
  unidades: { id: string; nome: string; is_principal?: boolean }[];
  faixas?: string[];
  faixa_ministrante?: string;
  especialidades?: string;
  status: string;
  dataCadastro: string;
}

interface PageData {
  items: Professor[];
  hasNextPage: boolean;
  page: number;
}

// Funções auxiliares
async function listUnidades(params: Record<string, string>) {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  ) as Record<string, string>;
  const qs = new URLSearchParams(filteredParams).toString();
  return http(`/unidades?${qs}`, { auth: true });
}

async function getProfessoresStats(params: Record<string, string>) {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  ) as Record<string, string>;
  const qs = new URLSearchParams(filteredParams).toString();
  return http(`/professores/stats/counts?${qs}`, { auth: true });
}

export default function PageProfessores() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [status, setStatus] = useState("todos");
  const [faixa, setFaixa] = useState("todos");
  const [especialidade, setEspecialidade] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<unknown | null>(null);

  // Verificar se é MASTER
  const isMaster = user?.perfis?.some((perfil: any) => {
    const perfilNome =
      typeof perfil === "string" ? perfil : perfil.nome || perfil.perfil;
    return perfilNome?.toLowerCase() === "master";
  });

  // Verificar se é gerente de unidade
  const isGerenteUnidade = user?.perfis?.some((perfil: any) => {
    const perfilNome =
      typeof perfil === "string" ? perfil : perfil.nome || perfil.perfil;
    return (
      perfilNome?.toLowerCase() === "gerente_unidade" ||
      perfilNome?.toLowerCase() === "gerente"
    );
  });

  // Temporariamente permitir para todos - ajustar depois
  const canCreate = true;
  const canEdit = true;
  const canDelete = isMaster; // Apenas MASTER pode excluir

  // Mutation para deletar professor
  const deleteMutation = useMutation({
    mutationFn: deleteProfessor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores"] });
      toast.success("Professor excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao excluir professor");
    },
  });

  const handleDelete = (professor: Professor) => {
    if (
      confirm(
        `Tem certeza que deseja excluir ${
          professor.nome_completo || professor.nome
        }?`
      )
    ) {
      deleteMutation.mutate(professor.id);
    }
  };

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Query das unidades
  const unidadesQuery = useQuery({
    queryKey: ["unidades"],
    queryFn: () => listUnidades({}),
  });

  // Buscar unidade do gerente (se for gerente de unidade)
  const { data: minhaUnidadeData } = useQuery({
    queryKey: ["minha-unidade-gerente", user?.id],
    queryFn: async () => {
      const result = await listUnidades({ pageSize: "1" });
      return result.items?.[0] || null;
    },
    enabled: !!user?.id && isGerenteUnidade,
  });

  const minhaUnidade = isGerenteUnidade ? minhaUnidadeData : null;

  // Se for gerente de unidade, forçar filtro pela unidade dele
  React.useEffect(() => {
    if (isGerenteUnidade && minhaUnidade?.id && !unidadeId) {
      setUnidadeId(minhaUnidade.id);
    }
  }, [isGerenteUnidade, minhaUnidade, unidadeId]);

  const query = useInfiniteQuery({
    queryKey: [
      "professores",
      debounced,
      unidadeId,
      status,
      faixa,
      especialidade,
    ],
    initialPageParam: 1,
    getNextPageParam: (lastPage: PageData) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string | number> = {
        page: pageParam as number,
        pageSize: 30,
        search: debounced,
      };

      // Adicionar filtros se fornecidos
      if (unidadeId) {
        params.unidade_id = unidadeId;
      }
      if (status !== "todos") {
        params.status = status;
      }
      if (faixa !== "todos") {
        params.faixa_ministrante = faixa;
      }
      if (especialidade !== "todos") {
        params.especialidades = especialidade;
      }

      return listProfessores(params);
    },
  });

  const items = (query.data?.pages || []).flatMap((page) => page.items);

  if (showForm) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <button
            onClick={() => {
              setShowForm(false);
              setEditingPerson(null);
            }}
            className="btn btn-ghost btn-sm"
          >
            ← Voltar
          </button>
        </div>
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <BookOpen className="mr-3 h-7 w-7 text-red-600" />
          {editingPerson ? "Editar Professor" : "Novo Professor"}
        </h1>
        <PersonForm
          initialData={editingPerson}
          isEdit={!!editingPerson}
          defaultTipo="PROFESSOR"
          onSuccess={() => {
            setShowForm(false);
            setEditingPerson(null);
            query.refetch();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingPerson(null);
          }}
        />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="min-h-screen p-6">
        <div className="alert alert-error">
          <span>Erro ao carregar professores: {query.error?.message}</span>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {query.isLoading && (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                <span>Carregando professores...</span>
              </CardContent>
            </Card>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="p-2 bg-red-600 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Professores TeamCruz
                </h1>
                <p className="text-gray-600">
                  Gestão completa dos instrutores de Jiu-Jitsu
                </p>
              </div>
            </div>
            {canCreate && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Professor
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total</p>
                    <p className="text-3xl font-bold text-red-600">
                      {items.length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <Users className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ativos</p>
                    <p className="text-3xl font-bold text-green-600">
                      {
                        items.filter((p: Professor) => p.status === "ATIVO")
                          .length
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Faixas Pretas
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {
                        items.filter((p: Professor) =>
                          p.faixa_ministrante?.toLowerCase().includes("preta")
                        ).length
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-full">
                    <BookOpen className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="relative flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar por nome, CPF ou email
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Digite para buscar..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="ATIVO">Ativos</option>
                    <option value="INATIVO">Inativos</option>
                    <option value="SUSPENSO">Suspensos</option>
                    <option value="AFASTADO">Afastados</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidade
                  </label>
                  {isGerenteUnidade && minhaUnidade ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed">
                      {minhaUnidade.nome}
                    </div>
                  ) : (
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      value={unidadeId}
                      onChange={(e) => setUnidadeId(e.target.value)}
                    >
                      <option value="">Todas as Unidades</option>
                      {unidadesQuery.data?.items?.map(
                        (unidade: { id: string; nome: string }) => (
                          <option key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </option>
                        )
                      )}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Faixa
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    value={faixa}
                    onChange={(e) => setFaixa(e.target.value)}
                  >
                    <option value="todos">Todas as Faixas</option>
                    <option value="BRANCA">Branca</option>
                    <option value="AZUL">Azul</option>
                    <option value="ROXA">Roxa</option>
                    <option value="MARROM">Marrom</option>
                    <option value="PRETA">Preta</option>
                    <option value="CORAL">Coral</option>
                    <option value="VERMELHA">Vermelha</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Especialidade
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value)}
                  >
                    <option value="todos">Todas as Especialidades</option>
                    <option value="Jiu-Jitsu">Jiu-Jitsu</option>
                    <option value="MMA">MMA</option>
                    <option value="Muay Thai">Muay Thai</option>
                    <option value="Boxe">Boxe</option>
                    <option value="Wrestling">Wrestling</option>
                    <option value="Judô">Judô</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Professores */}
          <Card>
            <CardContent className="p-0">
              {items.length === 0 && !query.isLoading ? (
                <div className="p-12 text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum professor encontrado
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Cadastre o primeiro professor para começar
                  </p>
                  {canCreate && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Primeiro Professor
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {items.map((professor: Professor, index: number) => (
                    <div
                      key={professor.id || index}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center">
                            <span className="text-lg font-semibold">
                              {professor.nome_completo?.charAt(0) || "P"}
                            </span>
                          </div>

                          {/* Informações do Professor */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {professor.nome_completo}
                              </h3>
                              <Badge
                                variant={
                                  professor.status === "ATIVO"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  professor.status === "ATIVO"
                                    ? "bg-green-100 text-green-800"
                                    : ""
                                }
                              >
                                {professor.status || "Ativo"}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              {professor.cpf && (
                                <span>CPF: {professor.cpf}</span>
                              )}

                              {professor.faixa_ministrante && (
                                <span className="flex items-center gap-1">
                                  <Award className="h-4 w-4" />
                                  Faixa: {professor.faixa_ministrante}
                                </span>
                              )}

                              {professor.especialidades && (
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-4 w-4" />
                                  {professor.especialidades}
                                </span>
                              )}
                            </div>

                            {professor.telefone && (
                              <div className="text-sm text-gray-500 mt-1">
                                Tel: {professor.telefone}
                              </div>
                            )}

                            {professor.unidades &&
                              professor.unidades.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {professor.unidades.map(
                                    (u: {
                                      id: string;
                                      nome: string;
                                      is_principal?: boolean;
                                    }) => (
                                      <Badge
                                        key={u.id}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {u.nome}
                                        {u.is_principal ? " ⭐" : ""}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPerson(professor);
                                setShowForm(true);
                              }}
                              className="hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(professor)}
                              className="hover:bg-red-50 hover:text-red-600"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Load More Button */}
                  {query.hasNextPage && (
                    <div className="p-6 text-center border-t">
                      <Button
                        variant="outline"
                        onClick={() => query.fetchNextPage()}
                        disabled={query.isFetchingNextPage}
                      >
                        {query.isFetchingNextPage
                          ? "Carregando..."
                          : "Carregar Mais"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
