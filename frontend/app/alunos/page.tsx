"use client";

import React, { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { Search, Plus, Edit2, Trash2, Users, GraduationCap } from "lucide-react";
import toast from "react-hot-toast";
import AlunoForm from "@/components/alunos/AlunoForm";
import { http } from "@/lib/api";

// Tipos
type Genero = "MASCULINO" | "FEMININO" | "OUTRO";
type StatusAluno = "ATIVO" | "INATIVO" | "SUSPENSO" | "CANCELADO";

interface AlunoFormData {
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  genero: Genero;
  email?: string;
  telefone?: string;
  telefone_emergencia?: string;
  nome_contato_emergencia?: string;
  unidade_id: string;
  data_matricula?: string;
  numero_matricula?: string;
  status?: StatusAluno;
  faixa_atual?: string;
  graus?: number;
  data_ultima_graduacao?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_telefone?: string;
  responsavel_parentesco?: string;
  observacoes_medicas?: string;
  alergias?: string;
  medicamentos_uso_continuo?: string;
  dia_vencimento?: number;
  valor_mensalidade?: number;
  desconto_percentual?: number;
  observacoes?: string;
}

// API functions
async function listAlunos(params: any) {
  const qs = new URLSearchParams(params).toString();
  return http(`/alunos?${qs}`);
}

async function createAluno(data: AlunoFormData) {
  return http("/alunos", { method: "POST", body: data, auth: true });
}

async function updateAluno(id: string, data: Partial<AlunoFormData>) {
  return http(`/alunos/${id}`, { method: "PATCH", body: data, auth: true });
}

async function deleteAluno(id: string) {
  return http(`/alunos/${id}`, { method: "DELETE", auth: true });
}

async function listUnidades(params: any) {
  const qs = new URLSearchParams(params).toString();
  return http(`/unidades?${qs}`);
}

export default function PageAlunos() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [editingAluno, setEditingAluno] = useState<any>(null);
  const [formData, setFormData] = useState<AlunoFormData>({
    nome_completo: "",
    cpf: "",
    data_nascimento: "",
    genero: "MASCULINO",
    unidade_id: "",
    graus: 0,
    desconto_percentual: 0,
  });

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["alunos", debounced, status],
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) =>
      listAlunos({
        page: pageParam,
        pageSize: 20,
        search: debounced,
        status: status === "todos" ? undefined : status,
      }),
  });

  const unidadesQuery = useQuery({
    queryKey: ["unidades"],
    queryFn: () => listUnidades({ pageSize: 100 }),
  });

  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createAluno,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alunos"] });
      setShowModal(false);
      resetForm();
      toast.success("Aluno cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar aluno");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AlunoFormData> }) =>
      updateAluno(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alunos"] });
      setEditingAluno(null);
      setShowModal(false);
      resetForm();
      toast.success("Aluno atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao atualizar aluno");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAluno,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alunos"] });
      toast.success("Aluno removido com sucesso!");
    },
  });

  const items = (query.data?.pages || []).flatMap((p) => p.items);

  const resetForm = () => {
    setFormData({
      nome_completo: "",
      cpf: "",
      data_nascimento: "",
      genero: "MASCULINO",
      unidade_id: "",
      graus: 0,
      desconto_percentual: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingAluno?.id) {
      updateMutation.mutate({ id: editingAluno.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (aluno: any) => {
    setEditingAluno(aluno);
    setShowModal(true);
    setFormData({
      nome_completo: aluno.nome_completo || "",
      cpf: aluno.cpf || "",
      data_nascimento: aluno.data_nascimento || "",
      genero: aluno.genero || "MASCULINO",
      email: aluno.email,
      telefone: aluno.telefone,
      telefone_emergencia: aluno.telefone_emergencia,
      nome_contato_emergencia: aluno.nome_contato_emergencia,
      unidade_id: aluno.unidade_id || "",
      data_matricula: aluno.data_matricula,
      numero_matricula: aluno.numero_matricula,
      status: aluno.status || "ATIVO",
      faixa_atual: aluno.faixa_atual,
      graus: aluno.graus || 0,
      data_ultima_graduacao: aluno.data_ultima_graduacao,
      responsavel_nome: aluno.responsavel_nome,
      responsavel_cpf: aluno.responsavel_cpf,
      responsavel_telefone: aluno.responsavel_telefone,
      responsavel_parentesco: aluno.responsavel_parentesco,
      observacoes_medicas: aluno.observacoes_medicas,
      alergias: aluno.alergias,
      medicamentos_uso_continuo: aluno.medicamentos_uso_continuo,
      dia_vencimento: aluno.dia_vencimento,
      valor_mensalidade: aluno.valor_mensalidade,
      desconto_percentual: aluno.desconto_percentual || 0,
      observacoes: aluno.observacoes,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ATIVO":
        return "text-green-600 bg-green-100";
      case "INATIVO":
        return "text-gray-600 bg-gray-100";
      case "SUSPENSO":
        return "text-yellow-600 bg-yellow-100";
      case "CANCELADO":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Alunos
        </h1>
        <button
          className="btn btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingAluno(null);
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Aluno
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input input-bordered w-full pl-9"
            placeholder="Buscar por nome, CPF ou matrícula"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select select-bordered"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="todos">Todos os Status</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
          <option value="SUSPENSO">Suspensos</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
      </div>

      {/* Lista */}
      <div className="h-[600px] border rounded-lg">
        <List
          height={600}
          itemCount={items.length + (query.hasNextPage ? 1 : 0)}
          itemSize={120}
          width="100%"
          onItemsRendered={({ visibleStopIndex }) => {
            if (
              visibleStopIndex >= items.length - 3 &&
              query.hasNextPage &&
              !query.isFetchingNextPage
            )
              query.fetchNextPage();
          }}
        >
          {({ index, style }) => {
            const aluno = items[index];
            if (!aluno)
              return (
                <div style={style} className="p-4">
                  <div className="skeleton h-20 w-full rounded-lg" />
                </div>
              );

            return (
              <div
                style={style}
                className="px-4 py-3 border-b hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between h-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {aluno.nome_completo}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          aluno.status
                        )}`}
                      >
                        {aluno.status}
                      </span>
                      {aluno.faixa_atual && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <GraduationCap className="h-3 w-3" />
                          {aluno.faixa_atual}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>CPF: {aluno.cpf}</div>
                      <div>Matrícula: {aluno.numero_matricula || "N/A"}</div>
                      <div>
                        Unidade:{" "}
                        {aluno.unidade?.nome || aluno.unidade_id || "N/A"}
                      </div>
                      <div>
                        {aluno.graus !== undefined
                          ? `${aluno.graus} graus`
                          : "0 graus"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(aluno)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Tem certeza que deseja remover o aluno "${aluno.nome_completo}"?`
                          )
                        ) {
                          deleteMutation.mutate(aluno.id);
                        }
                      }}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        </List>
      </div>

      {/* Modal */}
      {showModal && (
        <AlunoForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingAluno(null);
            resetForm();
          }}
          isEditing={!!editingAluno}
          isLoading={
            editingAluno
              ? updateMutation.isPending
              : createMutation.isPending
          }
          unidades={unidadesQuery.data?.items || []}
        />
      )}
    </div>
  );
}
