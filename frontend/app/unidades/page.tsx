"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { useAuth } from "@/app/auth/AuthContext";
import {
  listUnidades,
  createUnidade,
  updateUnidade,
  deleteUnidade,
  listFranqueados,
  listInstrutores,
  createEndereco,
  updateEndereco,
  getEndereco,
  getMyFranqueado,
} from "@/lib/peopleApi";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Building2,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import UnidadeForm from "@/components/unidades/UnidadeForm";

type StatusUnidade = "ATIVA" | "INATIVA" | "HOMOLOGACAO";
type PapelResponsavel =
  | "PROPRIETARIO"
  | "GERENTE"
  | "INSTRUTOR"
  | "ADMINISTRATIVO";
type Modalidade =
  | "INFANTIL"
  | "ADULTO"
  | "NO_GI"
  | "COMPETICAO"
  | "FEMININO"
  | "AUTODEFESA"
  | "CONDICIONAMENTO";

interface RedesSociais {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
}

interface HorariosFuncionamento {
  seg?: string;
  ter?: string;
  qua?: string;
  qui?: string;
  sex?: string;
  sab?: string;
  dom?: string;
}

interface UnidadeFormData {
  franqueado_id: string;
  nome: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  codigo_interno?: string;
  telefone_fixo?: string;
  telefone_celular: string;
  email: string;
  website?: string;
  redes_sociais?: RedesSociais;
  endereco_id?: string;
  // Campos de endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_papel: PapelResponsavel;
  responsavel_contato: string;
  qtde_tatames?: number;
  area_tatame_m2?: number;
  capacidade_max_alunos?: number;
  qtde_instrutores?: number;
  valor_plano_padrao?: number;
  horarios_funcionamento?: HorariosFuncionamento;
  modalidades?: Modalidade[];
  instrutor_principal_id?: string;
  status: StatusUnidade;
}

export default function PageUnidades() {
  const { user } = useAuth();

  // Log temporário para debug
  React.useEffect(() => {
    console.log("User object:", user);
    console.log("User perfis:", user?.perfis);
  }, [user]);

  const hasPerfil = (p: string) => {
    if (!user?.perfis) return false;
    return user.perfis.some(
      (perfil: any) => perfil.nome?.toLowerCase() === p.toLowerCase()
    );
  };
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [debounced, setDebounced] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<any>(null);
  const [formData, setFormData] = useState<UnidadeFormData>({
    franqueado_id: "",
    nome: "",
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    codigo_interno: "",
    telefone_fixo: "",
    telefone_celular: "",
    email: "",
    website: "",
    redes_sociais: {},
    status: "HOMOLOGACAO",
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_papel: "PROPRIETARIO",
    responsavel_contato: "",
    qtde_tatames: undefined,
    area_tatame_m2: undefined,
    capacidade_max_alunos: undefined,
    qtde_instrutores: undefined,
    valor_plano_padrao: undefined,
    horarios_funcionamento: {},
    modalidades: [],
    instrutor_principal_id: undefined,
  });

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Buscar franqueado do usuário logado (se for franqueado)
  const isFranqueado = user?.perfis?.some(
    (perfil: any) => perfil.nome?.toLowerCase() === "franqueado"
  );
  const { data: myFranqueado } = useQuery({
    queryKey: ["franqueado-me", user?.id],
    queryFn: getMyFranqueado,
    enabled: !!user?.id && isFranqueado,
  });

  const query = useInfiniteQuery({
    queryKey: ["unidades", debounced, status, myFranqueado?.id],
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) =>
      listUnidades({
        page: pageParam,
        pageSize: 15, // Reduzido para melhor performance
        search: debounced,
        status: status === "todos" ? undefined : status,
        franqueado_id: myFranqueado?.id, // Filtrar por franqueado se for franqueado
      }),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Mantém em cache por 10 minutos
  });

  const franqueadosQuery = useQuery({
    queryKey: ["franqueados"],
    queryFn: () => listFranqueados({ pageSize: 100 }),
  });

  const instrutoresQuery = useQuery({
    queryKey: ["instrutores"],
    queryFn: () => listInstrutores({ pageSize: 200 }),
  });

  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async (data: UnidadeFormData) => {
      console.log("[DEBUG] Creating unidade", data);
      return createUnidade(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unidades"] });
      setShowModal(false);
      resetForm();
      toast.success("Unidade cadastrada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar unidade");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<UnidadeFormData>;
    }) => {
      console.log("[DEBUG] Updating unidade", id, data);
      return updateUnidade(id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unidades"] });
      setEditingUnidade(null);
      setShowModal(false);
      resetForm();
      toast.success("Unidade atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao atualizar unidade");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUnidade,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unidades"] });
      toast.success("Unidade removida com sucesso!");
    },
  });

  const items = (query.data?.pages || []).flatMap((p) => p.items);

  const resetForm = () => {
    setFormData({
      franqueado_id: "",
      nome: "",
      cnpj: "",
      razao_social: "",
      nome_fantasia: "",
      inscricao_estadual: "",
      inscricao_municipal: "",
      codigo_interno: "",
      telefone_fixo: "",
      telefone_celular: "",
      email: "",
      website: "",
      redes_sociais: {},
      endereco_id: undefined,
      // Campos de endereço
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      pais: "Brasil",
      status: "HOMOLOGACAO",
      responsavel_nome: "",
      responsavel_cpf: "",
      responsavel_papel: "PROPRIETARIO",
      responsavel_contato: "",
      qtde_tatames: undefined,
      area_tatame_m2: undefined,
      capacidade_max_alunos: undefined,
      qtde_instrutores: undefined,
      valor_plano_padrao: undefined,
      horarios_funcionamento: {},
      modalidades: [],
      instrutor_principal_id: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[DEBUG] handleSubmit", formData);

    try {
      let endereco_id = formData.endereco_id;

      // Criar ou atualizar endereço se há dados de endereço preenchidos
      const hasAddressData =
        formData.cep ||
        formData.logradouro ||
        formData.numero ||
        formData.bairro ||
        formData.cidade;

      if (hasAddressData) {
        const enderecoData = {
          cep: formData.cep?.replace(/\D/g, "") || "",
          logradouro: formData.logradouro || "",
          numero: formData.numero || "",
          complemento: formData.complemento || "",
          bairro: formData.bairro || "",
          cidade: formData.cidade || "",
          estado: formData.estado || "",
          pais: formData.pais || "Brasil",
        };

        if (endereco_id) {
          // Atualizar endereço existente
          console.log("🔄 Atualizando endereço existente:", endereco_id);
          await updateEndereco(endereco_id, enderecoData);
        } else {
          // Criar novo endereço
          console.log("🏠 Criando novo endereço:", enderecoData);
          const novoEndereco = await createEndereco(enderecoData);
          endereco_id = novoEndereco.id;
          console.log("✅ Endereço criado com ID:", endereco_id);
        }
      }

      // Limpar formatação antes de enviar
      const cleanedData = {
        ...formData,
        cnpj: formData.cnpj?.replace(/\D/g, "") || "",
        telefone_celular: formData.telefone_celular?.replace(/\D/g, "") || "",
        telefone_fixo: formData.telefone_fixo?.replace(/\D/g, "") || "",
        responsavel_cpf: formData.responsavel_cpf?.replace(/\D/g, "") || "",
        responsavel_contato:
          formData.responsavel_contato?.replace(/\D/g, "") || "",
        endereco_id,
        // Remover campos de endereço pois são salvos separadamente
        cep: undefined,
        logradouro: undefined,
        numero: undefined,
        complemento: undefined,
        bairro: undefined,
        cidade: undefined,
        estado: undefined,
        pais: undefined,
      };

      if (editingUnidade?.id) {
        updateMutation.mutate({ id: editingUnidade.id, data: cleanedData });
      } else {
        createMutation.mutate(cleanedData);
      }
    } catch (error) {
      console.error("❌ Erro ao processar endereço:", error);
      // Continuar com o salvamento mesmo se o endereço der erro
      const cleanedData = {
        ...formData,
        cnpj: formData.cnpj?.replace(/\D/g, "") || "",
        telefone_celular: formData.telefone_celular?.replace(/\D/g, "") || "",
        telefone_fixo: formData.telefone_fixo?.replace(/\D/g, "") || "",
        responsavel_cpf: formData.responsavel_cpf?.replace(/\D/g, "") || "",
        responsavel_contato:
          formData.responsavel_contato?.replace(/\D/g, "") || "",
      };

      if (editingUnidade?.id) {
        updateMutation.mutate({ id: editingUnidade.id, data: cleanedData });
      } else {
        createMutation.mutate(cleanedData);
      }
    }
  };

  const handleEdit = async (unidade: any) => {
    setEditingUnidade(unidade);
    setShowModal(true);

    const baseFormData = {
      franqueado_id: unidade.franqueado_id || "",
      nome: unidade.nome || "",
      cnpj: unidade.cnpj || "",
      razao_social: unidade.razao_social || "",
      nome_fantasia: unidade.nome_fantasia || "",
      inscricao_estadual: unidade.inscricao_estadual || "",
      inscricao_municipal: unidade.inscricao_municipal || "",
      codigo_interno: unidade.codigo_interno || "",
      telefone_fixo: unidade.telefone_fixo || "",
      telefone_celular: unidade.telefone_celular || "",
      email: unidade.email || "",
      website: unidade.website || "",
      redes_sociais: unidade.redes_sociais || {},
      endereco_id: unidade.endereco_id,
      // Campos de endereço vazios por padrão
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      pais: "Brasil",
      status: unidade.status || "HOMOLOGACAO",
      responsavel_nome: unidade.responsavel_nome || "",
      responsavel_cpf: unidade.responsavel_cpf || "",
      responsavel_papel: unidade.responsavel_papel || "PROPRIETARIO",
      responsavel_contato: unidade.responsavel_contato || "",
      qtde_tatames: unidade.qtde_tatames,
      area_tatame_m2: unidade.area_tatame_m2,
      capacidade_max_alunos: unidade.capacidade_max_alunos,
      qtde_instrutores: unidade.qtde_instrutores,
      valor_plano_padrao: unidade.valor_plano_padrao,
      horarios_funcionamento: unidade.horarios_funcionamento || {},
      modalidades: unidade.modalidades || [],
      instrutor_principal_id: unidade.instrutor_principal_id,
    };

    // Buscar dados do endereço se houver endereco_id
    if (unidade.endereco_id) {
      try {
        const endereco = await getEndereco(unidade.endereco_id);
        console.log("📍 Endereço carregado para unidade:", endereco);

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
        console.error("Erro ao carregar endereço da unidade:", error);
      }
    }

    setFormData(baseFormData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ATIVA":
        return "text-green-600 bg-green-100";
      case "INATIVA":
        return "text-red-600 bg-red-100";
      case "HOMOLOGACAO":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ATIVA":
        return <CheckCircle2 className="h-4 w-4" />;
      case "INATIVA":
        return <AlertCircle className="h-4 w-4" />;
      case "HOMOLOGACAO":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Botão Voltar */}
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
        <span className="text-gray-900 font-medium">Unidades</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Unidades
        </h1>
        {/* Temporário: mostrar para todos os usuários */}
        <button
          className="btn btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingUnidade(null);
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nova Unidade
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input input-bordered w-full pl-9"
            placeholder="Buscar por nome, CNPJ ou responsável"
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
          <option value="ATIVA">Ativas</option>
          <option value="HOMOLOGACAO">Em Homologação</option>
          <option value="INATIVA">Inativas</option>
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
            const unidade = items[index];
            if (!unidade)
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
                      <h3 className="font-semibold text-lg">{unidade.nome}</h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          unidade.status
                        )}`}
                      >
                        {getStatusIcon(unidade.status)}
                        {unidade.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>CNPJ: {unidade.cnpj}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{unidade.responsavel_nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{unidade.responsavel_contato}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {unidade.capacidade_max_alunos
                            ? `${unidade.capacidade_max_alunos} alunos`
                            : "Cap. não definida"}
                          {unidade.qtde_tatames &&
                            ` • ${unidade.qtde_tatames} tatames`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(unidade)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Tem certeza que deseja remover a unidade "${unidade.nome}"?`
                          )
                        ) {
                          deleteMutation.mutate(unidade.id);
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

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <UnidadeForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setEditingUnidade(null);
            resetForm();
          }}
          isEditing={!!editingUnidade}
          isLoading={
            editingUnidade ? updateMutation.isPending : createMutation.isPending
          }
          franqueados={franqueadosQuery.data?.items || []}
          instrutores={instrutoresQuery.data?.items || []}
        />
      )}
    </div>
  );
}
