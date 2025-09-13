"use client";

import React, { useState } from "react";
import { InputCPF } from "@/components/form/InputCPF";
import { InputCNPJ } from "@/components/form/InputCNPJ";
import { InputNumero } from "@/components/form/InputNumero";
import { InputCEP } from "@/components/form/InputCEP";
import { validarCPF, validarCNPJ, validarCEP } from "@/utils/validacao";

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
  buscarViaCep,
  createEndereco,
  updateEndereco,
  vincularEndereco,
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
} from "lucide-react";
import toast from "react-hot-toast";

interface UnidadeFormData {
  franqueado_id: string;
  nome: string;
  cnpj: string;
  status: "ATIVA" | "INATIVA" | "HOMOLOGACAO";
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_papel:
    | "PROPRIETARIO"
    | "GERENTE"
    | "INSTRUTOR"
    | "ADMINISTRATIVO";
  responsavel_contato: string;
  qtde_tatames?: number;
  capacidade_max_alunos?: number;
  valor_plano_padrao?: number;
  horarios_funcionamento?: any;
  modalidades?: string[];
  endereco?: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro?: string;
    cidade_nome?: string;
    estado?: string;
  };
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
      (perfil: any) => perfil.nome?.toLowerCase() === p.toLowerCase(),
    );
  };
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [debounced, setDebounced] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<any>(null);
  const [formData, setFormData] = useState<UnidadeFormData>({
    franqueado_id: "",
    nome: "",
    cnpj: "",
    status: "HOMOLOGACAO",
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_papel: "PROPRIETARIO",
    responsavel_contato: "",
    endereco: {
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade_nome: "",
      estado: "",
    },
  });
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  function setFieldError(field: string, message: string) {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["unidades", debounced, status],
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) =>
      listUnidades({
        page: pageParam,
        pageSize: 15, // Reduzido para melhor performance
        search: debounced,
        status: status === "todos" ? undefined : status,
      }),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Mantém em cache por 10 minutos
  });

  const franqueadosQuery = useQuery({
    queryKey: ["franqueados"],
    queryFn: () => listFranqueados({ pageSize: 100 }),
  });

  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async (data: UnidadeFormData) => {
      console.log("[DEBUG] mutationFn chamado", data);
      // 1. Criar endereço se fornecido
      let enderecoId = null;
      if (data.endereco && data.endereco.cep) {
        const endereco = await createEndereco(data.endereco);
        enderecoId = endereco.id;
        console.log("[DEBUG] Endereço criado", endereco);
      }

      // 2. Criar unidade com endereco_id
      const { endereco, ...unidadeData } = data;
      const unidade = await createUnidade({
        ...unidadeData,
        endereco_id: enderecoId,
      });
      console.log("[DEBUG] Unidade criada", unidade);

      // 3. Criar vínculo na tabela auxiliar (opcional, para controle adicional)
      if (enderecoId) {
        await vincularEndereco(enderecoId, {
          tipo_dono: "UNIDADE",
          dono_id: unidade.id,
          finalidade: "COMERCIAL",
          principal: true,
        });
        console.log("[DEBUG] Vínculo de endereço criado");
      }

      return unidade;
    },
    onSuccess: () => {
      console.log("[DEBUG] createMutation onSuccess");
      qc.invalidateQueries({ queryKey: ["unidades"] });
      setShowModal(false);
      resetForm();
      toast.success("Unidade cadastrada com sucesso!");
    },
    onError: (error: any) => {
      console.log("[DEBUG] createMutation onError", error);
      toast.error(error.message || "Erro ao cadastrar unidade");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<UnidadeFormData> & { endereco_id?: string };
    }) => {
      // 1) Se houver dados de endereço no formulário
      if (data.endereco) {
        const addr = data.endereco as any;
        // Se a unidade já tem endereço, atualiza-o; senão, cria um novo e vincula
        if (editingUnidade?.endereco_id) {
          const sanitizedAddr: any = {
            cep: addr.cep,
            logradouro: addr.logradouro,
            numero: addr.numero,
            complemento: addr.complemento,
            bairro: addr.bairro,
            cidade_nome: addr.cidade_nome,
            estado: addr.estado,
          };
          Object.keys(sanitizedAddr).forEach(
            (k) => sanitizedAddr[k] === undefined && delete sanitizedAddr[k],
          );
          await updateEndereco(editingUnidade.endereco_id, sanitizedAddr);
        } else if (addr.cep) {
          const novo = await createEndereco({
            cep: addr.cep,
            logradouro: addr.logradouro,
            numero: addr.numero,
            complemento: addr.complemento,
            bairro: addr.bairro,
            cidade_nome: addr.cidade_nome,
            estado: addr.estado,
          });
          // vincula como COMERCIAL principal
          await vincularEndereco(novo.id, {
            tipo_dono: "UNIDADE",
            dono_id: id,
            finalidade: "COMERCIAL",
            principal: true,
          });
          // vamos incorporar o endereco_id novo no update da unidade
          (data as any).endereco_id = novo.id;
        }
      }

      // 2) Sanitiza o payload de unidade e executa PATCH
      const payload: any = {
        franqueado_id: data.franqueado_id,
        nome: data.nome,
        cnpj: data.cnpj,
        status: data.status,
        responsavel_nome: data.responsavel_nome,
        responsavel_cpf: data.responsavel_cpf,
        responsavel_papel: data.responsavel_papel,
        responsavel_contato: data.responsavel_contato,
        qtde_tatames: data.qtde_tatames,
        capacidade_max_alunos: data.capacidade_max_alunos,
        valor_plano_padrao: data.valor_plano_padrao,
        horarios_funcionamento: data.horarios_funcionamento,
        modalidades: data.modalidades,
        endereco_id: (data as any).endereco_id,
      };
      // Em edição, não permite atualizar franqueado_id, cnpj e nome
      if (editingUnidade) {
        delete payload.franqueado_id;
        delete payload.cnpj;
        delete payload.nome;
      }
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k],
      );
      return updateUnidade(id, payload);
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

  const buscarCepMutation = useMutation({
    mutationFn: buscarViaCep,
    onSuccess: (data) => {
      setFormData((prev) => ({
        ...prev,
        endereco: {
          ...prev.endereco!,
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          cidade_nome: data.cidade_nome || "",
          estado: data.estado || "",
        },
      }));
      toast.success("CEP encontrado!");
    },
    onError: () => {
      toast.error("CEP não encontrado");
    },
  });

  const items = (query.data?.pages || []).flatMap((p) => p.items);

  const resetForm = () => {
    setFormData({
      franqueado_id: "",
      nome: "",
      cnpj: "",
      status: "HOMOLOGACAO",
      responsavel_nome: "",
      responsavel_cpf: "",
      responsavel_papel: "PROPRIETARIO",
      responsavel_contato: "",
      endereco: {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade_nome: "",
        estado: "",
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[DEBUG] handleSubmit chamado", formData);
    // Validação de obrigatórios
    if (
      !formData.franqueado_id ||
      !formData.nome ||
      !formData.cnpj ||
      !formData.responsavel_nome ||
      !formData.responsavel_cpf ||
      !formData.responsavel_contato
    ) {
      toast.error("Preencha todos os campos obrigatórios");
      console.log("[DEBUG] Falha obrigatórios");
      return;
    }
    // Validação CNPJ
    if (!validarCNPJ(formData.cnpj)) {
      toast.error("CNPJ inválido", { id: "cnpj-invalido" });
      setFieldError("cnpj", "CNPJ inválido");
      console.log("[DEBUG] Falha CNPJ");
      return;
    }
    // Validação CPF
    if (!validarCPF(formData.responsavel_cpf)) {
      toast.error("CPF do responsável inválido", { id: "cpf-invalido" });
      setFieldError("responsavel_cpf", "CPF do responsável inválido");
      console.log("[DEBUG] Falha CPF");
      return;
    }
    // Validação campos numéricos
    if (formData.qtde_tatames !== undefined && isNaN(formData.qtde_tatames)) {
      toast.error("Quantidade de tatames deve ser um número");
      console.log("[DEBUG] Falha qtde_tatames");
      return;
    }
    if (
      formData.capacidade_max_alunos !== undefined &&
      isNaN(formData.capacidade_max_alunos)
    ) {
      toast.error("Capacidade máxima de alunos deve ser um número");
      console.log("[DEBUG] Falha capacidade_max_alunos");
      return;
    }
    if (
      formData.valor_plano_padrao !== undefined &&
      isNaN(formData.valor_plano_padrao)
    ) {
      toast.error("Valor do plano deve ser um número");
      console.log("[DEBUG] Falha valor_plano_padrao");
      return;
    }
    // Validação CEP
    if (formData.endereco?.cep && !validarCEP(formData.endereco.cep)) {
      toast.error("CEP inválido");
      console.log("[DEBUG] Falha CEP");
      return;
    }

    if (editingUnidade?.id) {
      console.log(
        "[DEBUG] Chamando updateMutation.mutate",
        editingUnidade.id,
        formData,
      );
      updateMutation.mutate({ id: editingUnidade.id, data: formData as any });
    } else {
      console.log("[DEBUG] Chamando createMutation.mutate", formData);
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (unidade: any) => {
    setEditingUnidade(unidade);
    setShowModal(true);
    setFormData({
      ...unidade,
      endereco: unidade.endereco || {
        cep: unidade.cep || "",
        logradouro: unidade.logradouro || "",
        numero: unidade.numero || "",
        complemento: unidade.complemento || "",
        bairro: unidade.bairro || "",
        cidade_nome: unidade.cidade_nome || "",
        estado: unidade.estado || "",
      },
    });
  };

  const handleCepChange = (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    setFormData((prev) => ({
      ...prev,
      endereco: { ...prev.endereco!, cep: cleanCep },
    }));

    if (cleanCep.length === 8) {
      buscarCepMutation.mutate(cleanCep);
    }
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
                          unidade.status,
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
                            `Tem certeza que deseja remover a unidade "${unidade.nome}"?`,
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingUnidade ? "Editar Unidade" : "Nova Unidade"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Franqueado *
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.franqueado_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        franqueado_id: e.target.value,
                      }))
                    }
                    required
                    disabled={Boolean(editingUnidade)}
                    title={
                      editingUnidade ? "Não alterável em edição" : undefined
                    }
                  >
                    <option value="">Selecione o franqueado</option>
                    {franqueadosQuery.data?.items?.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as any,
                      }))
                    }
                  >
                    <option value="HOMOLOGACAO">Em Homologação</option>
                    <option value="ATIVA">Ativa</option>
                    <option value="INATIVA">Inativa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nome da Unidade *
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nome: e.target.value }))
                    }
                    placeholder="Ex: TeamCruz Barueri - Matriz"
                    required
                    disabled={Boolean(editingUnidade)}
                    title={
                      editingUnidade ? "Não alterável em edição" : undefined
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    CNPJ *
                  </label>
                  <InputCNPJ
                    value={formData.cnpj}
                    onChange={(v) => {
                      setFormData((prev) => ({ ...prev, cnpj: v }));
                      setFieldError("cnpj", "");
                    }}
                    required
                    disabled={Boolean(editingUnidade)}
                  />
                  {fieldErrors.cnpj && (
                    <span className="text-red-600 text-xs">
                      {fieldErrors.cnpj}
                    </span>
                  )}
                </div>
              </div>

              {/* Dados do Responsável */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">
                  Responsável pela Unidade
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nome do Responsável *
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.responsavel_nome}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          responsavel_nome: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      CPF do Responsável *
                    </label>
                    <InputCPF
                      value={formData.responsavel_cpf}
                      onChange={(v) => {
                        setFormData((prev) => ({
                          ...prev,
                          responsavel_cpf: v,
                        }));
                        setFieldError("responsavel_cpf", "");
                      }}
                      required
                    />
                    {fieldErrors.responsavel_cpf && (
                      <span className="text-red-600 text-xs">
                        {fieldErrors.responsavel_cpf}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Papel do Responsável
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={formData.responsavel_papel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          responsavel_papel: e.target.value as any,
                        }))
                      }
                    >
                      <option value="PROPRIETARIO">Proprietário</option>
                      <option value="GERENTE">Gerente</option>
                      <option value="INSTRUTOR">Instrutor</option>
                      <option value="ADMINISTRATIVO">Administrativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Contato do Responsável *
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.responsavel_contato}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          responsavel_contato: e.target.value,
                        }))
                      }
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Dados Operacionais */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Dados Operacionais</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Qtd. Tatames
                    </label>
                    <InputNumero
                      value={formData.qtde_tatames || ""}
                      onChange={(v) =>
                        setFormData((prev) => ({ ...prev, qtde_tatames: v }))
                      }
                      min={0}
                      required={false}
                      placeholder="Qtd. Tatames"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Capacidade Máx. Alunos
                    </label>
                    <InputNumero
                      value={formData.capacidade_max_alunos || ""}
                      onChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          capacidade_max_alunos: v,
                        }))
                      }
                      min={0}
                      required={false}
                      placeholder="Capacidade Máx. Alunos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Valor Plano Padrão (R$)
                    </label>
                    <InputNumero
                      value={formData.valor_plano_padrao || ""}
                      onChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          valor_plano_padrao: v,
                        }))
                      }
                      min={0}
                      required={false}
                      placeholder="Valor Plano Padrão (R$)"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Endereço</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      CEP
                    </label>
                    <InputCEP
                      value={formData.endereco?.cep || ""}
                      onChange={(v) => handleCepChange(v)}
                      required={false}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Logradouro
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.endereco?.logradouro || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endereco: {
                            ...prev.endereco!,
                            logradouro: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.endereco?.numero || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endereco: {
                            ...prev.endereco!,
                            numero: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.endereco?.complemento || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endereco: {
                            ...prev.endereco!,
                            complemento: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.endereco?.bairro || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endereco: {
                            ...prev.endereco!,
                            bairro: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.endereco?.cidade_nome || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endereco: {
                            ...prev.endereco!,
                            cidade_nome: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Estado
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={formData.endereco?.estado || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endereco: {
                            ...prev.endereco!,
                            estado: e.target.value,
                          },
                        }))
                      }
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUnidade(null);
                    resetForm();
                  }}
                  className="btn btn-outline flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    editingUnidade
                      ? updateMutation.isPending
                      : createMutation.isPending
                  }
                  className="btn btn-primary flex-1"
                >
                  {editingUnidade
                    ? updateMutation.isPending
                      ? "Salvando..."
                      : "Salvar alterações"
                    : createMutation.isPending
                      ? "Cadastrando..."
                      : "Cadastrar Unidade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
