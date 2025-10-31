"use client";

import React from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import {
  listFranqueados,
  createFranqueado,
  updateFranqueado,
} from "@/lib/peopleApi";
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  FileText,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  User,
  X,
  ArrowLeft,
  Filter,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import FranqueadoForm from "@/components/franqueados/FranqueadoForm";

interface RedesSociais {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
}

type SituacaoFranqueado = "ATIVA" | "INATIVA" | "EM_HOMOLOGACAO";

interface Franqueado {
  id: string;
  // Identificação
  nome: string;
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  // Contato
  email?: string;
  telefone?: string;
  telefone_fixo?: string;
  telefone_celular?: string;
  website?: string;
  redes_sociais?: RedesSociais;
  // Endereço
  endereco_id?: string;
  endereco?: any;
  // Responsável Legal
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_cargo?: string;
  responsavel_email?: string;
  responsavel_telefone?: string;
  // Informações
  ano_fundacao?: number;
  total_unidades?: number; // Calculado automaticamente
  missao?: string;
  visao?: string;
  valores?: string;
  historico?: string;
  logotipo_url?: string;
  // Relacionamento Hierárquico
  id_matriz?: string | null; // Se NULL = matriz, se preenchido = filial
  matriz?: any;
  // Gestão
  unidades_gerencia: string[];
  data_contrato?: string;
  taxa_franquia?: number;
  dados_bancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    titular: string;
    documento: string;
  };
  // Status
  situacao: SituacaoFranqueado;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface FranqueadoFormData {
  id?: string;
  // Identificação
  nome: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  // Contato
  email: string;
  telefone_fixo?: string;
  telefone_celular: string;
  website?: string;
  redes_sociais?: RedesSociais;
  // Endereço
  endereco_id?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  // Responsável Legal
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_cargo?: string;
  responsavel_email?: string;
  responsavel_telefone?: string;
  // Informações
  ano_fundacao?: number;
  missao?: string;
  visao?: string;
  valores?: string;
  historico?: string;
  logotipo_url?: string;
  // Relacionamento Hierárquico
  id_matriz?: string | null;
  // Status
  situacao: SituacaoFranqueado;
  ativo: boolean;
}

export default function PageFranqueados() {
  const { user } = useAuth();
  const router = useRouter();
  const hasPerfil = (p: string) =>
    (user?.perfis || [])
      .map((x: string) => x.toLowerCase())
      .includes(p.toLowerCase());
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [showModal, setShowModal] = React.useState(false);
  const [editingFranqueado, setEditingFranqueado] =
    React.useState<Franqueado | null>(null);
  const [formData, setFormData] = React.useState<FranqueadoFormData>({
    nome: "",
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    email: "",
    telefone_fixo: "",
    telefone_celular: "",
    website: "",
    redes_sociais: {},
    endereco_id: undefined,
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    pais: "Brasil",
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_cargo: "",
    responsavel_email: "",
    responsavel_telefone: "",
    ano_fundacao: undefined,
    missao: "",
    visao: "",
    valores: "",
    historico: "",
    logotipo_url: "",
    id_matriz: "filial",
    situacao: "EM_HOMOLOGACAO",
    ativo: true,
  });

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["franqueados", debounced, statusFilter],
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) => {
      const params = {
        page: pageParam,
        pageSize: 15,
        search: debounced,
        situacao: statusFilter || undefined,
      };
      return listFranqueados(params);
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Mantém em cache por 10 minutos
  });

  // Query para buscar todas as franquias matrizes (para seleção no formulário)
  const matrizesQuery = useQuery({
    queryKey: ["franqueados-matrizes"],
    queryFn: async () => {
      const result = await listFranqueados({ page: 1, pageSize: 100 }); // Busca até 100 franquias
      return result.data.filter((franquia: any) => !franquia.id_matriz); // Só as matrizes
    },
    staleTime: 5 * 60 * 1000,
  });

  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createFranqueado,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["franqueados"] });
      toast.success("Franqueado criado com sucesso!");
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar franqueado");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<FranqueadoFormData>;
    }) => updateFranqueado(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["franqueados"] });

      // Mostrar mensagem específica baseada no status
      if (variables.data.situacao === "EM_HOMOLOGACAO") {
        toast.success(
          "Franqueado atualizado! Status: Em Homologação - Franquia em processo de validação.",
          {
            duration: 5000,
            icon: "⚠️",
          }
        );
      } else if (variables.data.situacao === "ATIVA") {
        toast.success(
          "Franqueado atualizado! Status: Ativa - Franquia aprovada para operação.",
          {
            duration: 4000,
            icon: "✅",
          }
        );
      } else if (variables.data.situacao === "INATIVA") {
        toast.success(
          "Franqueado atualizado! Status: Inativa - Franquia temporariamente suspensa.",
          {
            duration: 4000,
            icon: "❌",
          }
        );
      } else {
        toast.success("Franqueado atualizado com sucesso!");
      }

      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar franqueado");
    },
  });

  const items = (query.data?.pages || []).flatMap((p) => p.items);

  const resetForm = () => {
    setFormData({
      nome: "",
      cnpj: "",
      razao_social: "",
      nome_fantasia: "",
      inscricao_estadual: "",
      inscricao_municipal: "",
      email: "",
      telefone_fixo: "",
      telefone_celular: "",
      website: "",
      redes_sociais: {},
      endereco_id: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      pais: "Brasil",
      responsavel_nome: "",
      responsavel_cpf: "",
      responsavel_cargo: "",
      responsavel_email: "",
      responsavel_telefone: "",
      ano_fundacao: undefined,
      missao: "",
      visao: "",
      valores: "",
      historico: "",
      logotipo_url: "",
      id_matriz: null,
      situacao: "EM_HOMOLOGACAO",
      ativo: true,
    });
    setEditingFranqueado(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = async (franqueado: Franqueado) => {
    setEditingFranqueado(franqueado);

    // Dados básicos do franqueado
    const baseFormData = {
      id: franqueado.id,
      nome: franqueado.nome,
      cnpj: franqueado.cnpj,
      razao_social: franqueado.razao_social || "",
      nome_fantasia: franqueado.nome_fantasia || "",
      inscricao_estadual: franqueado.inscricao_estadual || "",
      inscricao_municipal: franqueado.inscricao_municipal || "",
      email: franqueado.email || "",
      telefone_fixo: franqueado.telefone_fixo || "",
      telefone_celular: franqueado.telefone_celular || "",
      website: franqueado.website || "",
      redes_sociais: franqueado.redes_sociais || {},
      endereco_id: franqueado.endereco_id || "",
      // Valores padrão para endereço
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      pais: "Brasil",
      responsavel_nome: franqueado.responsavel_nome || "",
      responsavel_cpf: franqueado.responsavel_cpf || "",
      responsavel_cargo: franqueado.responsavel_cargo || "",
      responsavel_email: franqueado.responsavel_email || "",
      responsavel_telefone: franqueado.responsavel_telefone || "",
      ano_fundacao: franqueado.ano_fundacao,
      missao: franqueado.missao || "",
      visao: franqueado.visao || "",
      valores: franqueado.valores || "",
      historico: franqueado.historico || "",
      logotipo_url: franqueado.logotipo_url || "",
      id_matriz: franqueado.id_matriz ? "filial" : "matriz",
      situacao: franqueado.situacao,
      ativo: franqueado.ativo,
    };

    // Buscar dados do endereço se houver endereco_id
    if (franqueado.endereco_id) {
      try {
        const { getEndereco } = await import("@/lib/peopleApi");
        const endereco = await getEndereco(franqueado.endereco_id);

        // Atualizar formData com os dados do endereço
        baseFormData.cep = endereco.cep
          ? `${endereco.cep.slice(0, 5)}-${endereco.cep.slice(5)}`
          : "";
        baseFormData.logradouro = endereco.logradouro || "";
        baseFormData.numero = endereco.numero || "";
        baseFormData.complemento = endereco.complemento || "";
        baseFormData.bairro = endereco.bairro || "";
        baseFormData.cidade = endereco.cidade || "";
        baseFormData.estado = endereco.estado || "";
        baseFormData.pais = endereco.pais || "Brasil";
      } catch (error) {
        console.error("Erro ao carregar endereço:", error);
      }
    }

    setFormData(baseFormData);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.cnpj || !formData.razao_social) {
      toast.error("Nome, CNPJ e Razão Social são obrigatórios");
      return;
    }

    if (!formData.email || !formData.telefone_celular) {
      toast.error("Email institucional e Telefone celular são obrigatórios");
      return;
    }

    if (!formData.responsavel_nome || !formData.responsavel_cpf) {
      toast.error("Nome e CPF do responsável legal são obrigatórios");
      return;
    }

    // Primeiro criar/atualizar endereço se houver dados
    let enderecoId = formData.endereco_id || null;

    if (
      formData.cep &&
      formData.logradouro &&
      formData.numero &&
      formData.bairro &&
      formData.cidade &&
      formData.estado
    ) {
      try {
        const { createEndereco, updateEndereco } = await import(
          "@/lib/peopleApi"
        );
        const enderecoData = {
          cep: formData.cep.replace(/\D/g, ""),
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento || "",
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
          pais: formData.pais || "Brasil",
        };

        if (enderecoId) {
          // Atualizar endereço existente
          await updateEndereco(enderecoId, enderecoData);
        } else {
          // Criar novo endereço
          const novoEndereco = await createEndereco(enderecoData);
          enderecoId = novoEndereco.id;
        }
      } catch (error) {
        console.error("Erro ao salvar endereço:", error);
        toast.error("Erro ao salvar endereço");
        return;
      }
    }

    // Enviar dados sem formatação - backend armazena apenas números
    const cleanedData = {
      ...formData,
      cnpj: formData.cnpj.replace(/\D/g, ""), // Remove formatação do CNPJ
      telefone_celular: formData.telefone_celular?.replace(/\D/g, "") || "",
      telefone_fixo: formData.telefone_fixo?.replace(/\D/g, "") || "",
      responsavel_cpf: formData.responsavel_cpf?.replace(/\D/g, "") || "",
      responsavel_telefone:
        formData.responsavel_telefone?.replace(/\D/g, "") || "",
      endereco_id: enderecoId || null, // ID do endereço criado/atualizado - null se vazio
      // Converter tipo selecionado para valor do banco: "matriz" = null, "filial" = null (por enquanto)
      id_matriz: formData.id_matriz === "matriz" ? null : null, // Ambos são null por enquanto
      // Garantir que ativo seja sempre um boolean
      ativo: Boolean(formData.ativo),
      // Remover campos de endereço dos dados do franqueado
      cep: undefined,
      logradouro: undefined,
      numero: undefined,
      complemento: undefined,
      bairro: undefined,
      cidade: undefined,
      estado: undefined,
      pais: undefined,
    };

    // Debug: verificar valor do campo ativo
    console.log("🔍 FormData ativo:", formData.ativo, typeof formData.ativo);
    console.log(
      "🔍 CleanedData ativo:",
      cleanedData.ativo,
      typeof cleanedData.ativo
    );

    if (editingFranqueado) {
      updateMutation.mutate({ id: editingFranqueado.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  return (
    <ProtectedRoute requiredPerfis={["master", "franqueado"]}>
      <>
        <Toaster position="top-right" />
        <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 p-6">
          {/* Header */}
          <div className="mb-6">
            {/* Breadcrumb/Navigation */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="group flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
                title="Voltar ao Dashboard"
              >
                <div className="p-1 rounded-full group-hover:bg-blue-100 transition-colors duration-200">
                  <ArrowLeft className="h-4 w-4" />
                </div>
                <span>Dashboard</span>
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Franqueados</span>
            </div>

            {/* Title Section */}
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Franqueados</h1>
            </div>
            <p className="text-gray-600">
              Gerencie os franqueados da rede TeamCruz
            </p>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Buscar por nome, email ou CNPJ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="relative w-full sm:w-48">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <select
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Todas as situações</option>
                    <option value="ATIVA">Ativa</option>
                    <option value="EM_HOMOLOGACAO">Em Homologação</option>
                    <option value="INATIVA">Inativa</option>
                  </select>
                </div>
              </div>

              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Novo Franqueado
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {query.data?.pages[0]?.total || 0} franqueado(s)
                    encontrado(s)
                  </p>
                  {(search || statusFilter) && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        Filtros ativos:
                      </span>
                      {search && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Busca: "{search}"
                        </span>
                      )}
                      {statusFilter && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Status:{" "}
                          {statusFilter === "ATIVA"
                            ? "Ativa"
                            : statusFilter === "EM_HOMOLOGACAO"
                            ? "Em Homologação"
                            : "Inativa"}
                        </span>
                      )}
                      {(search || statusFilter) && (
                        <button
                          onClick={() => {
                            setSearch("");
                            setStatusFilter("");
                          }}
                          className="text-xs text-red-600 hover:text-red-700 underline ml-2"
                        >
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {query.isFetching && (
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Atualizando...
                  </div>
                )}
              </div>
            </div>

            <div className="h-[600px]">
              {items.length > 0 ? (
                <List
                  height={600}
                  itemCount={items.length + (query.hasNextPage ? 1 : 0)}
                  itemSize={120}
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
                    const f = items[index];
                    if (!f)
                      return (
                        <div style={style} className="p-4">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">
                              Carregando mais franqueados...
                            </span>
                          </div>
                        </div>
                      );
                    return (
                      <div
                        style={style}
                        className="p-4 border-b border-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {f.nome}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {f.cnpj}
                                </span>
                                {f.email && (
                                  <span className="text-sm text-gray-600 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {f.email}
                                  </span>
                                )}
                                {f.telefone && (
                                  <span className="text-sm text-gray-600 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {f.telefone}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {f.total_unidades || 0} unidade(s)
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    f.situacao === "ATIVA"
                                      ? "bg-green-100 text-green-800"
                                      : f.situacao === "EM_HOMOLOGACAO"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {f.situacao === "ATIVA"
                                    ? "Ativa"
                                    : f.situacao === "EM_HOMOLOGACAO"
                                    ? "Em Homologação"
                                    : "Inativa"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(f)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar franqueado"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </List>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum franqueado encontrado</p>
                    <p className="text-sm mt-1">
                      Clique em "Novo Franqueado" para criar o primeiro
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal - Novo Componente */}
        {showModal && (
          <FranqueadoForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onClose={() => setShowModal(false)}
            isEditing={!!editingFranqueado}
            isLoading={createMutation.isPending || updateMutation.isPending}
            availableFranquias={matrizesQuery.data || []}
          />
        )}
      </>
    </ProtectedRoute>
  );
}
