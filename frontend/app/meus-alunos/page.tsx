"use client";

import React from "react";
import { useAuth } from "@/app/auth/AuthContext";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { listAlunos, createAluno, listProfessores } from "@/lib/peopleApi";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function MeusAlunosPage() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [unidade, setUnidade] = React.useState("");
  const [professores, setProfessores] = React.useState<any[]>([]);
  const [form, setForm] = React.useState({
    nome: "",
    data_nascimento: "",
    academia_unidade: "",
    professor_id: "",
    peso: "",
    faixa: "Branca",
    tem_login_proprio: false,
    email: "",
    password: "",
  });
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    (async () => {
      if (!form.academia_unidade) {
        setProfessores([]);
        return;
      }
      const page = await listProfessores({
        page: 1,
        pageSize: 50,
        unidade: form.academia_unidade,
      });
      setProfessores(page.items || []);
    })();
  }, [form.academia_unidade]);

  const query = useInfiniteQuery({
    queryKey: ["meus-alunos", debounced, unidade, user?.id],
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) =>
      listAlunos({
        page: pageParam,
        pageSize: 100,
        search: debounced,
        unidade,
      }),
  });
  const items = (query.data?.pages || [])
    .flatMap((p) => p.items)
    .filter((a) => (!user?.id ? true : a.responsavel_id === user.id));

  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async () =>
      createAluno({
        ...form,
        responsavel_id: user?.id,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meus-alunos"] }),
  });

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Meus Alunos</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 border rounded p-3">
            <h2 className="font-semibold">Adicionar Filho</h2>
            <input
              className="input input-bordered w-full"
              placeholder="Nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
            <input
              className="input input-bordered w-full"
              type="date"
              value={form.data_nascimento}
              onChange={(e) =>
                setForm({ ...form, data_nascimento: e.target.value })
              }
            />
            <input
              className="input input-bordered w-full"
              placeholder="Unidade"
              value={form.academia_unidade}
              onChange={(e) =>
                setForm({
                  ...form,
                  academia_unidade: e.target.value,
                  professor_id: "",
                })
              }
            />
            <select
              className="select select-bordered w-full"
              value={form.professor_id}
              onChange={(e) =>
                setForm({ ...form, professor_id: e.target.value })
              }
            >
              <option value="">Selecione o professor</option>
              {professores.map((p) => (
                <option key={p.id || p.nome} value={p.id || p.nome}>
                  {p.nome}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                className="input input-bordered w-full"
                placeholder="Peso (kg)"
                value={form.peso}
                onChange={(e) => setForm({ ...form, peso: e.target.value })}
              />
              <select
                className="select select-bordered"
                value={form.faixa}
                onChange={(e) => setForm({ ...form, faixa: e.target.value })}
              >
                {[
                  "Branca",
                  "Cinza",
                  "Amarela",
                  "Laranja",
                  "Verde",
                  "Azul",
                  "Roxa",
                  "Marrom",
                  "Preta",
                ].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.tem_login_proprio}
                onChange={(e) =>
                  setForm({ ...form, tem_login_proprio: e.target.checked })
                }
              />
              <span>Criar login próprio para este aluno</span>
            </label>
            {form.tem_login_proprio && (
              <>
                <input
                  className="input input-bordered w-full"
                  placeholder="Email do aluno"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="input input-bordered w-full"
                  type="password"
                  placeholder="Senha"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </>
            )}
            <button
              className="btn btn-primary"
              onClick={() => mut.mutate()}
              disabled={mut.isLoading || !isAuthenticated}
            >
              Adicionar
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className="input input-bordered input-sm"
                placeholder="Buscar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <input
                className="input input-bordered input-sm"
                placeholder="Unidade"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
              />
            </div>
            <div className="h-[600px] border rounded">
              <List
                height={600}
                itemCount={items.length}
                itemSize={80}
                width={"100%"}
              >
                {({ index, style }) => {
                  const a = items[index];
                  return (
                    <div
                      style={style}
                      className="px-3 py-2 border-b flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {a.nome}{" "}
                          <span className="text-xs opacity-60">{a.faixa}</span>
                        </div>
                        <div className="text-xs opacity-70">
                          Unidade: {a.academia_unidade || "-"} • Professor:{" "}
                          {a.professor_id || "-"} •{" "}
                          {a.tem_login_proprio ? "Com login" : "Sem login"}
                        </div>
                      </div>
                    </div>
                  );
                }}
              </List>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
