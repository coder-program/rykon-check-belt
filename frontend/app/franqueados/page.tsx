"use client";

import React from "react";
import { useAuth } from "@/app/auth/AuthContext";
import {
  useInfiniteQuery,
  useMutation,
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

type SituacaoFranqueado = 'ATIVA' | 'INATIVA' | 'EM_HOMOLOGACAO';

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
  const hasPerfil = (p: string) =>
    (user?.perfis || [])
      .map((x: string) => x.toLowerCase())
      .includes(p.toLowerCase());
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
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
    endereco_id: "",
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

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["franqueados", debounced],
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) =>
      listFranqueados({ page: pageParam, pageSize: 15, search: debounced }),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Mantém em cache por 10 minutos
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["franqueados"] });
      toast.success("Franqueado atualizado com sucesso!");
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

  const openEditModal = (franqueado: Franqueado) => {
    setEditingFranqueado(franqueado);
    setFormData({
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
      id_matriz: franqueado.id_matriz || null,
      situacao: franqueado.situacao,
      ativo: franqueado.ativo,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    if (editingFranqueado) {
      updateMutation.mutate({ id: editingFranqueado.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 p-6">
        {/* Header */}
        <div className="mb-6">
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
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Buscar por nome, email ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
            <p className="text-sm text-gray-600">
              {query.data?.pages[0]?.total || 0} franqueado(s) encontrado(s)
            </p>
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
                        <div className="animate-pulse bg-gray-200 h-20 rounded-lg" />
                      </div>
                    );
                  return (
                    <div style={style} className="p-4 border-b border-gray-100">
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
                                {Array.isArray(f.unidades_gerencia)
                                  ? f.unidades_gerencia.length
                                  : 0}{" "}
                                unidade(s)
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  f.ativo
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {f.ativo ? "Ativo" : "Inativo"}
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
        />
      )}
    </>
  );
}
