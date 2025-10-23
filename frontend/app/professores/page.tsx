"use client";

import React, { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { listProfessores } from "@/lib/peopleApi";
import { Search, Plus, Edit, BookOpen, Users, Award } from "lucide-react";
import { PersonForm } from "@/components/people/PersonForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

export default function PageProfessores() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [unidade] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<unknown | null>(null);

  // Temporariamente permitir para todos - ajustar depois
  const canCreate = true;
  const canEdit = true;

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["professores", debounced, unidade],
    initialPageParam: 1,
    getNextPageParam: (lastPage: PageData) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string | number> = {
        page: pageParam as number,
        pageSize: 30,
        search: debounced,
      };

      // Adicionar filtro de unidade se fornecido
      if (unidade) {
        params.unidade_id = unidade;
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
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Buscar professor por nome ou CPF..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {/* Filtro de unidades será implementado quando necessário */}
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
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Edit className="h-4 w-4" />
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
