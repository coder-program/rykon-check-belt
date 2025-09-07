"use client";

import React from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { listProfessores, createProfessor } from "@/lib/peopleApi";
import { Search } from "lucide-react";

export default function PageProfessores() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [unidade, setUnidade] = React.useState("");
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["professores", debounced, unidade],
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) =>
      listProfessores({
        page: pageParam,
        pageSize: 30,
        search: debounced,
        unidade,
      }),
  });

  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: createProfessor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["professores"] }),
  });

  const items = (query.data?.pages || []).flatMap((p) => p.items);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Professores</h1>
      <div className="flex gap-2 items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input input-bordered w-full pl-9 input-sm"
            placeholder="Buscar por nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          className="input input-bordered input-sm"
          placeholder="Unidade"
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            const nome = prompt("Nome do professor?");
            if (!nome) return;
            mutation.mutate({ nome });
          }}
        >
          Novo Professor
        </button>
      </div>

      <div className="h-[700px] border rounded">
        <List
          height={700}
          itemCount={items.length + (query.hasNextPage ? 1 : 0)}
          itemSize={72}
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
            const p = items[index];
            if (!p)
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
                  <div className="font-medium">{p.nome}</div>
                  <div className="text-xs opacity-70">
                    Faixa {p.faixa} •{" "}
                    {Array.isArray(p.unidades_atua)
                      ? p.unidades_atua.join(", ")
                      : ""}
                  </div>
                </div>
                <div className="text-xs text-right opacity-70">
                  {Array.isArray(p.especialidades)
                    ? p.especialidades.join(" · ")
                    : ""}
                </div>
              </div>
            );
          }}
        </List>
      </div>
    </div>
  );
}
