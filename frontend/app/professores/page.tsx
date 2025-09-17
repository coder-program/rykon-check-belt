"use client";

import React, { useState } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { listAlunos } from "@/lib/peopleApi";
import { Search, Plus, Edit, BookOpen, Users, Award } from "lucide-react";
import { PersonForm } from "@/components/people/PersonForm";

// Types
interface QueryParams {
  page: number;
  pageSize: number;
  search: string;
  faixa: string;
  unidade: string;
  tipo_cadastro: string;
}

interface PageData {
  hasNextPage: boolean;
  page: number;
  items: unknown[];
}

interface ListCallbackProps {
  visibleStopIndex: number;
}

interface ListItemProps {
  index: number;
  style: React.CSSProperties;
}

export default function PageProfessores() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [faixa, setFaixa] = useState<"todos" | "kids" | "adulto">("todos");
  const [unidade, setUnidade] = useState("");
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
    queryKey: ["professores", debounced, faixa, unidade],
    initialPageParam: 1,
    getNextPageParam: (lastPage: PageData) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    queryFn: async ({ pageParam }) => {
      const params: QueryParams = {
        page: pageParam as number,
        pageSize: 30,
        search: debounced,
        faixa,
        unidade,
        tipo_cadastro: "PROFESSOR", // Filtrar apenas professores
      };

      return listAlunos(params);
    },
  });

  const items = (query.data?.pages || []).flatMap((page) => page.items);

  console.log("Professores Query data:", query.data);
  console.log("Professores Items:", items);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="p-6 space-y-4">
        {query.isLoading && (
          <div className="alert alert-info">
            <span className="loading loading-spinner"></span>
            <span>Carregando professores...</span>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <BookOpen className="mr-3 h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Professores TeamCruz
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Gestão completa dos instrutores de Jiu-Jitsu
              </p>
            </div>
          </div>
          {canCreate && (
            <button
              className="btn btn-primary bg-red-600 hover:bg-red-700 border-red-600 text-white"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Professor
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card bg-white dark:bg-slate-800 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Total</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {items.length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="card bg-white dark:bg-slate-800 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Ativos</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {items.filter((p) => p.status === "ATIVO").length}
                  </p>
                </div>
                <Award className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card bg-white dark:bg-slate-800 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Faixas Pretas</h3>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {
                      items.filter((p) =>
                        p.faixa_ministrante?.toLowerCase().includes("preta")
                      ).length
                    }
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="card bg-white dark:bg-slate-800 shadow-sm mb-6">
          <div className="card-body p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="input input-bordered w-full pl-9"
                  placeholder="Buscar professor por nome ou CPF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="select select-bordered"
                value={faixa}
                onChange={(e) =>
                  setFaixa(e.target.value as "todos" | "kids" | "adulto")
                }
              >
                <option value="todos">Todas as Categorias</option>
                <option value="kids">Kids</option>
                <option value="adulto">Adulto</option>
              </select>

              {unidade && (
                <select
                  className="select select-bordered"
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                >
                  <option value="">Todas as Unidades</option>
                  {/* Adicionar opções de unidades aqui */}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Professores */}
        <div className="card bg-white dark:bg-slate-800 shadow-sm">
          <div className="card-body p-0">
            {items.length === 0 && !query.isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum professor encontrado</p>
                {canCreate && (
                  <button
                    className="btn btn-primary mt-4 bg-red-600 hover:bg-red-700 border-red-600"
                    onClick={() => setShowForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeiro Professor
                  </button>
                )}
              </div>
            ) : (
              <List
                height={600}
                itemCount={items.length + (query.hasNextPage ? 1 : 0)}
                itemSize={100}
                width={"100%"}
                onItemsRendered={({ visibleStopIndex }: ListCallbackProps) => {
                  if (
                    visibleStopIndex >= items.length - 5 &&
                    query.hasNextPage &&
                    !query.isFetchingNextPage
                  )
                    query.fetchNextPage();
                }}
              >
                {({ index, style }: ListItemProps) => {
                  const professor = items[index];
                  if (!professor)
                    return (
                      <div style={style} className="p-4">
                        <div className="skeleton h-16 w-full" />
                      </div>
                    );

                  return (
                    <div
                      style={style}
                      className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="avatar placeholder">
                          <div className="bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center">
                            <span className="text-lg font-semibold">
                              {professor.nome_completo?.charAt(0) || "P"}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-lg text-slate-900 dark:text-white">
                            {professor.nome_completo}{" "}
                            <span className="text-sm text-gray-500">
                              ({professor.cpf})
                            </span>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-4">
                            <span className="flex items-center">
                              <Award className="h-4 w-4 mr-1" />
                              Faixa:{" "}
                              {professor.faixa_ministrante || "Não informada"}
                            </span>
                            {professor.especialidades && (
                              <span className="flex items-center">
                                <BookOpen className="h-4 w-4 mr-1" />
                                {professor.especialidades}
                              </span>
                            )}
                            {professor.unidade_nome && (
                              <span className="text-xs badge badge-outline">
                                {professor.unidade_nome}
                              </span>
                            )}
                          </div>
                          {professor.telefone && (
                            <div className="text-xs text-slate-500 mt-1">
                              Tel: {professor.telefone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`badge ${
                            professor.status === "ATIVO"
                              ? "badge-success"
                              : "badge-ghost"
                          }`}
                        >
                          {professor.status || "Ativo"}
                        </span>
                        {canEdit && (
                          <button
                            className="btn btn-ghost btn-sm btn-circle hover:bg-red-100 hover:text-red-600"
                            onClick={() => {
                              setEditingPerson(professor);
                              setShowForm(true);
                            }}
                            title="Editar professor"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }}
              </List>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
