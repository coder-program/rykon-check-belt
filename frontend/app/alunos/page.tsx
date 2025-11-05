"use client";

import React, { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  GraduationCap,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import AlunoForm from "@/components/alunos/AlunoForm";
import { useRouter } from "next/navigation";
import { http } from "@/lib/api";
import { useAuth } from "@/app/auth/AuthContext";
import { getMyFranqueado } from "@/lib/peopleApi";

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
  return http(`/alunos?${qs}`, { auth: true });
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
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(filteredParams).toString();
  return http(`/unidades?${qs}`, { auth: true });
}

async function getAlunosStats(params: any) {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(filteredParams).toString();
  return http(`/alunos/stats/counts?${qs}`, { auth: true });
}

export default function PageAlunos() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("todos");
  const [unidadeId, setUnidadeId] = useState("");
  const [faixa, setFaixa] = useState("todos");
  const [categoria, setCategoria] = useState("todos");
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
    const id = setTimeout(() => setDebounced(search), 500); // Aumentei para 500ms
    return () => clearTimeout(id);
  }, [search]);

  // Buscar franqueado do usuário logado (se for franqueado)
  const isFranqueado = user?.perfis?.some((perfil: any) => {
    const perfilNome =
      typeof perfil === "string" ? perfil : perfil.nome || perfil.perfil;
    return perfilNome?.toLowerCase() === "franqueado";
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

  const { data: myFranqueado } = useQuery({
    queryKey: ["franqueado-me", user?.id],
    queryFn: getMyFranqueado,
    enabled: !!user?.id && isFranqueado,
  });

  // Buscar unidade do gerente (se for gerente de unidade)
  const { data: minhaUnidadeData } = useQuery({
    queryKey: ["minha-unidade-gerente", user?.id],
    queryFn: async () => {
      const result = await listUnidades({ pageSize: 1 });
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
    queryKey: ["alunos", debounced, status, unidadeId, faixa, categoria],
    initialPageParam: 1,
    getNextPageParam: (last: any) =>
      last.hasNextPage ? last.page + 1 : undefined,
    queryFn: async ({ pageParam }) => {
      const params: any = {
        page: pageParam,
        pageSize: 20,
      };

      // Só adicionar parâmetros que têm valor
      if (debounced && debounced.trim()) params.search = debounced;
      if (status && status !== "todos") params.status = status;
      if (unidadeId && unidadeId.trim()) params.unidade_id = unidadeId;
      if (faixa && faixa !== "todos") params.faixa = faixa;
      if (categoria && categoria !== "todos") params.categoria = categoria;

      return listAlunos(params);
    },
    enabled: true, // Só executa uma vez quando o componente monta
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    staleTime: Infinity, // Nunca considera os dados como "stale"
    gcTime: Infinity, // Mantém no cache para sempre
  });

  const unidadesQuery = useQuery({
    queryKey: ["unidades", myFranqueado?.id],
    queryFn: () =>
      listUnidades({
        pageSize: 100,
        franqueado_id: myFranqueado?.id, // Filtrar por franqueado se for franqueado
      }),
    staleTime: Infinity, // Unidades nunca ficam stale
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const statsQuery = useQuery({
    queryKey: ["alunos-stats", debounced, unidadeId, categoria],
    queryFn: () => {
      const params: any = {};
      if (debounced && debounced.trim()) params.search = debounced;
      if (unidadeId && unidadeId.trim()) params.unidade_id = unidadeId;
      if (categoria && categoria !== "todos") params.categoria = categoria;
      return getAlunosStats(params);
    },
    staleTime: Infinity, // Stats nunca ficam stale - só atualiza quando filtros mudam
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
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

  // Debug para verificar se os dados estão chegando

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

    // Limpar formatação do CPF e telefone antes de enviar
    const cleanedData = {
      ...formData,
      cpf: formData.cpf.replace(/\D/g, ""), // Remove pontos, traços e outros caracteres
      telefone: formData.telefone?.replace(/\D/g, "") || "", // Remove formatação do telefone
      telefone_emergencia:
        formData.telefone_emergencia?.replace(/\D/g, "") || "",
      responsavel_cpf: formData.responsavel_cpf?.replace(/\D/g, "") || "",
      responsavel_telefone:
        formData.responsavel_telefone?.replace(/\D/g, "") || "",
    };

    if (editingAluno?.id) {
      updateMutation.mutate({ id: editingAluno.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
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
    <ProtectedRoute>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Voltar ao Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Alunos
            </h1>
          </div>
          {/* <button
          className="btn btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingAluno(null);
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Aluno
        </button> */}
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="relative flex-1">
            <label className="label">
              <span className="label-text">
                Buscar por nome, CPF ou matrícula
              </span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="input input-bordered w-full pl-9"
                placeholder="Digite para buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Categoria</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="kids">👶 Kids</option>
              <option value="adulto">🥋 Adulto</option>
            </select>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Status</span>
            </label>
            <select
              className="select select-bordered w-full"
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

          <div>
            <label className="label">
              <span className="label-text">Unidade</span>
            </label>
            {isGerenteUnidade && minhaUnidade ? (
              <div className="select select-bordered w-full bg-gray-100 cursor-not-allowed flex items-center">
                {minhaUnidade.nome}
              </div>
            ) : (
              <select
                className="select select-bordered w-full"
                value={unidadeId}
                onChange={(e) => setUnidadeId(e.target.value)}
              >
                <option value="">Todas as Unidades</option>
                {unidadesQuery.data?.items?.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label">
              <span className="label-text">Faixa</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={faixa}
              onChange={(e) => setFaixa(e.target.value)}
            >
              <option value="todos">Todas as Faixas</option>
              <option value="BRANCA">Branca</option>
              <option value="CINZA_BRANCA">Cinza Branca</option>
              <option value="CINZA">Cinza</option>
              <option value="CINZA_PRETA">Cinza Preta</option>
              <option value="AMARELA_BRANCA">Amarela Branca</option>
              <option value="AMARELA">Amarela</option>
              <option value="AMARELA_PRETA">Amarela Preta</option>
              <option value="LARANJA_BRANCA">Laranja Branca</option>
              <option value="LARANJA">Laranja</option>
              <option value="LARANJA_PRETA">Laranja Preta</option>
              <option value="VERDE_BRANCA">Verde Branca</option>
              <option value="VERDE">Verde</option>
              <option value="VERDE_PRETA">Verde Preta</option>
              <option value="AZUL">Azul</option>
              <option value="ROXA">Roxa</option>
              <option value="MARROM">Marrom</option>
              <option value="PRETA">Preta</option>
            </select>
          </div>
        </div>

        {/* Estatísticas */}
        {statsQuery.data && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-800">
                {statsQuery.data.total}
              </div>
              <div className="text-sm text-blue-600">Total</div>
            </div>

            <div className="bg-green-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-800">
                {statsQuery.data.porStatus?.ativos || 0}
              </div>
              <div className="text-sm text-green-600">Ativos</div>
            </div>

            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                {statsQuery.data.porStatus?.inativos || 0}
              </div>
              <div className="text-sm text-gray-600">Inativos</div>
            </div>

            <div className="bg-yellow-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-yellow-800">
                {statsQuery.data.porStatus?.suspensos || 0}
              </div>
              <div className="text-sm text-yellow-600">Suspensos</div>
            </div>

            <div className="bg-red-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-red-800">
                {statsQuery.data.porStatus?.cancelados || 0}
              </div>
              <div className="text-sm text-red-600">Cancelados</div>
            </div>

            {Object.entries(statsQuery.data.porFaixa || {}).length > 0 && (
              <div className="bg-purple-100 p-3 rounded-lg">
                <div className="text-sm font-semibold text-purple-800 mb-1">
                  Por Faixa (Ativos)
                </div>
                <div className="text-xs text-purple-600 space-y-1">
                  {Object.entries(statsQuery.data.porFaixa || {})
                    .slice(0, 3)
                    .map(([faixa, count]) => (
                      <div key={faixa} className="flex justify-between">
                        <span>{faixa.replace(/_/g, " ")}</span>
                        <span className="font-semibold">{count as number}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

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
              editingAluno ? updateMutation.isPending : createMutation.isPending
            }
            unidades={unidadesQuery.data?.items || []}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
