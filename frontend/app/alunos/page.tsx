"use client";

import React, { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { listAlunos, createAluno } from "@/lib/peopleApi";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { PersonForm } from "@/components/people/PersonForm";
import { useAuth } from "@/app/auth/AuthContext";

export default function PageAlunos() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [faixa, setFaixa] = useState<"todos" | "kids" | "adulto">("todos");
  const [unidade, setUnidade] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  
  // Temporariamente permitir para todos - ajustar depois
  const canCreate = true; // Sempre true por enquanto
  const canEdit = true; // Sempre true por enquanto
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["alunos", debounced, faixa, unidade],
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) =>
      listAlunos({
        page: pageParam,
        pageSize: 30,
        search: debounced,
        faixa,
        unidade,
      }),
  });

  const qc = useQueryClient();

  const items = (query.data?.pages || []).flatMap((p) => p.items);

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
        <h1 className="text-2xl font-bold mb-6">
          {editingPerson ? "Editar Cadastro" : "Novo Cadastro"}
        </h1>
        <PersonForm
          initialData={editingPerson}
          isEdit={!!editingPerson}
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

  return (
    <div className="min-h-screen">
      <div className="p-6 space-y-4">
        {/* Debug para verificar o problema */}
        <div className="alert alert-warning mb-4">
          <div>
            <span>Debug: Botão deve aparecer agora (canCreate = {String(canCreate)})</span>
            {user && (
              <>
                <br />
                <span>Usuário logado: {user.nome || user.email || 'Sem nome'}</span>
                <br />
                <span>Perfis do usuário: {JSON.stringify(user.perfis || user.perfil || user.roles || [])}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Lista de Alunos</h1>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Cadastro
          </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="input input-bordered w-full pl-9"
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select select-bordered"
            value={faixa}
            onChange={(e) => setFaixa(e.target.value as any)}
          >
            <option value="todos">Todas as Faixas</option>
            <option value="kids">Kids</option>
            <option value="adulto">Adulto</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <List
            height={600}
            itemCount={items.length + (query.hasNextPage ? 1 : 0)}
            itemSize={80}
            width={"100%"}
          onItemsRendered={({ visibleStopIndex }) => {
            if (
              visibleStopIndex >= items.length - 5 &&
              query.hasNextPage &&
              !query.isFetchingNextPage
            )
              query.fetchNextPage();
          }}
        >
          {({ index, style }) => {
            const a = items[index];
            if (!a)
              return (
                <div style={style} className="p-3">
                  <div className="skeleton h-10 w-full" />
                </div>
              );
            return (
              <div
                style={style}
                className="px-4 py-3 border-b hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-white rounded-full w-10">
                      <span className="text-xl">{a.nome?.charAt(0) || 'A'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold">
                      {a.nome || a.nome_completo}{" "}
                      <span className="text-xs text-gray-500">({a.matricula || a.cpf})</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {a.faixa || a.faixa_atual} • {a.graus || a.grau_atual || 0}º grau
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${a.status === 'ATIVO' ? 'badge-success' : 'badge-ghost'}`}>
                    {a.status || 'Ativo'}
                  </span>
                  <button 
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={() => {
                      setEditingPerson(a);
                      setShowForm(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          }}
          </List>
        </div>
      </div>
    </div>
  );
}
