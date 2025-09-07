"use client";

import React from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { listAlunos, approveAluno } from "@/lib/peopleApi";

export default function AprovacaoAlunosPage() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [unidade, setUnidade] = React.useState("");
  const [professorId, setProfessorId] = React.useState<string>("");
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["alunos-pendentes", debounced, unidade],
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) =>
      listAlunos({
        page: pageParam,
        pageSize: 30,
        search: debounced,
        unidade,
        status: "pendente",
      }),
  });
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (vars: { id: string }) =>
      approveAluno(vars.id, professorId || "prof-auto"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alunos-pendentes"] }),
  });

  const items = (query.data?.pages || []).flatMap((p) => p.items);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Aprovação de Alunos (Pendentes)</h1>
      <div className="flex gap-2 items-center">
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
        <input
          className="input input-bordered input-sm"
          placeholder="Professor ID"
          value={professorId}
          onChange={(e) => setProfessorId(e.target.value)}
        />
      </div>

      <div className="h-[700px] border rounded">
        <List
          height={700}
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
                className="px-3 py-2 border-b flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">
                    {a.nome}{" "}
                    <span className="text-xs opacity-60">
                      ({a.matricula || "sem matr."})
                    </span>
                  </div>
                  <div className="text-xs opacity-70">
                    Unidade: {a.academia_unidade || "-"} • Faixa: {a.faixa} •
                    Status: {a.status_validacao}
                  </div>
                </div>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => mut.mutate({ id: a.id })}
                  disabled={mut.isLoading}
                >
                  Aprovar
                </button>
              </div>
            );
          }}
        </List>
      </div>
    </div>
  );
}
