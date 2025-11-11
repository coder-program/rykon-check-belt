"use client";

import React from "react";
import { useAuth } from "@/app/auth/AuthContext";
import {
  X,
  Building2,
  Phone,
  MapPin,
  FileText,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
} from "lucide-react";

interface RedesSociais {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
}

type StatusUnidade = "ATIVA" | "INATIVA" | "HOMOLOGACAO";

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
  cnpj?: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
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
  horarios_funcionamento?: HorariosFuncionamento;
  status: StatusUnidade;
}

interface Franqueado {
  id: string;
  nome: string;
  razao_social?: string;
}

interface UnidadeFormProps {
  formData: UnidadeFormData;
  setFormData: React.Dispatch<React.SetStateAction<UnidadeFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isEditing: boolean;
  isLoading: boolean;
  franqueados: Franqueado[];
  myFranqueado?: Franqueado; // Franqueado do usuário logado (se aplicável)
}

export default function UnidadeForm({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEditing,
  isLoading,
  franqueados,
  myFranqueado,
}: UnidadeFormProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState(0);

  // Verificar se usuário é franqueado - perfis pode ser array de strings ou objetos
  const isFranqueado = user?.perfis?.some((perfil: any) => {
    const perfilNome =
      typeof perfil === "string" ? perfil : perfil.nome || perfil.perfil;
    return perfilNome?.toLowerCase() === "franqueado";
  });

  // Verificar se usuário é MASTER
  const isMaster = user?.perfis?.some((perfil: any) => {
    const perfilNome =
      typeof perfil === "string" ? perfil : perfil.nome || perfil.perfil;
    return perfilNome?.toUpperCase() === "MASTER";
  });

  // Set franqueado_id automatically if user is franqueado and myFranqueado is provided
  React.useEffect(() => {
    if (isFranqueado && myFranqueado?.id) {
      // Sempre forçar o franqueado_id quando for usuário franqueado
      if (formData.franqueado_id !== myFranqueado.id) {
        setFormData((prev) => ({
          ...prev,
          franqueado_id: myFranqueado.id,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFranqueado, myFranqueado?.id]);

  const tabs = [
    { id: 0, label: "Identificação", icon: Building2 },
    { id: 1, label: "Contato", icon: Phone },
    { id: 2, label: "Endereço", icon: MapPin },
    { id: 3, label: "Administração", icon: FileText },
  ];

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1-$2")
      .slice(0, 14);
  };

  const formatNumericOnly = (value: string, maxLength: number = 20) => {
    return value
      .replace(/\D/g, "") // Remove tudo que não é dígito
      .slice(0, maxLength); // Limita ao comprimento máximo
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  const formatPhoneFixo = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 10) {
      return cleaned
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .slice(0, 14);
    }
    return formatPhone(value);
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);
  };

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = formatCEP(e.target.value);
    setFormData({ ...formData, cep });

    console.log("🔍 [FORM] CEP digitado:", cep, "- Tamanho:", cep.length);

    // Se CEP tem 9 caracteres (formato 00000-000), buscar endereço
    if (cep.length === 9) {
      try {
        const cepNumeros = cep.replace("-", "");
        console.log("📡 [FORM] Buscando CEP:", cepNumeros);

        // Chamar ViaCEP diretamente
        const response = await fetch(
          `https://viacep.com.br/ws/${cepNumeros}/json/`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );
        console.log("📡 [FORM] Resposta recebida - Status:", response.status);

        if (!response.ok) {
          console.log("❌ [FORM] Erro na resposta:", response.status);
          // Se der erro, não faz nada - usuário preenche manualmente
          return;
        }

        const data = await response.json();
        console.log("✅ [FORM] Dados do CEP:", data);

        if (data && !data.erro) {
          console.log("✅ [FORM] Preenchendo endereço automaticamente");
          setFormData((prev) => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro || "",
            bairro: data.bairro || prev.bairro || "",
            cidade: data.localidade || prev.cidade || "",
            estado: data.uf || prev.estado || "",
            pais: "Brasil",
          }));
        } else {
          console.log("⚠️ [FORM] CEP não encontrado");
        }
      } catch (error) {
        console.error("❌ [FORM] Erro ao buscar CEP:", error);
        // Silenciosamente falha - usuário pode preencher manualmente
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            {isEditing ? "Editar Unidade" : "Nova Unidade"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Tab 0: Identificação */}
            {activeTab === 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Identificação da Unidade
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Franquia *
                    </label>
                    {(() => {
                      return isFranqueado && myFranqueado ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                          {myFranqueado.nome}{" "}
                          {myFranqueado.razao_social &&
                            `- ${myFranqueado.razao_social}`}
                          <input
                            type="hidden"
                            name="franqueado_id"
                            value={myFranqueado.id}
                          />
                        </div>
                      ) : (
                        <select
                          required
                          value={formData.franqueado_id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              franqueado_id: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Selecione uma franquia</option>
                          {franqueados.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.nome} {f.razao_social && `- ${f.razao_social}`}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Unidade *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CNPJ{" "}
                      <span className="text-gray-500 text-xs">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cnpj: formatCNPJ(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe em branco para projetos sociais ou igrejas
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razão Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.razao_social}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          razao_social: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      value={formData.nome_fantasia || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nome_fantasia: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inscrição Estadual
                    </label>
                    <input
                      type="text"
                      value={formData.inscricao_estadual || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inscricao_estadual: formatNumericOnly(
                            e.target.value,
                            20
                          ),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inscrição Municipal
                    </label>
                    <input
                      type="text"
                      value={formData.inscricao_municipal || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inscricao_municipal: formatNumericOnly(
                            e.target.value,
                            20
                          ),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 1: Contato */}
            {activeTab === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Informações de Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email da Unidade *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone Celular / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.telefone_celular}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telefone_celular: formatPhone(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone Fixo
                    </label>
                    <input
                      type="text"
                      value={formData.telefone_fixo || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telefone_fixo: formatPhoneFixo(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Redes Sociais
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-5 w-5 text-pink-600" />
                        <input
                          type="url"
                          value={formData.redes_sociais?.instagram || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              redes_sociais: {
                                ...formData.redes_sociais,
                                instagram: e.target.value,
                              },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Facebook className="h-5 w-5 text-blue-600" />
                        <input
                          type="url"
                          value={formData.redes_sociais?.facebook || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              redes_sociais: {
                                ...formData.redes_sociais,
                                facebook: e.target.value,
                              },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Youtube className="h-5 w-5 text-red-600" />
                        <input
                          type="url"
                          value={formData.redes_sociais?.youtube || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              redes_sociais: {
                                ...formData.redes_sociais,
                                youtube: e.target.value,
                              },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Linkedin className="h-5 w-5 text-blue-700" />
                        <input
                          type="url"
                          value={formData.redes_sociais?.linkedin || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              redes_sociais: {
                                ...formData.redes_sociais,
                                linkedin: e.target.value,
                              },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Endereço */}
            {activeTab === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CEP *
                    </label>
                    <input
                      type="text"
                      value={formData.cep || ""}
                      onChange={handleCEPChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={9}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logradouro *
                    </label>
                    <input
                      type="text"
                      value={formData.logradouro || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, logradouro: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número *
                    </label>
                    <input
                      type="text"
                      value={formData.numero || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, numero: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={formData.complemento || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          complemento: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bairro *
                    </label>
                    <input
                      type="text"
                      value={formData.bairro || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, bairro: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={formData.cidade || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, cidade: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado *
                    </label>
                    <input
                      type="text"
                      value={formData.estado || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, estado: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      País
                    </label>
                    <input
                      type="text"
                      value={formData.pais || "Brasil"}
                      onChange={(e) =>
                        setFormData({ ...formData, pais: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Administração */}
            {activeTab === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Administração
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Situação da Unidade
                    </label>

                    {/* Apenas MASTER pode alterar o status */}
                    {isMaster ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(
                          ["ATIVA", "INATIVA", "HOMOLOGACAO"] as StatusUnidade[]
                        ).map((sit) => (
                          <label
                            key={sit}
                            className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              formData.status === sit
                                ? "border-blue-600 bg-blue-50"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            <input
                              type="radio"
                              name="status"
                              value={sit}
                              checked={formData.status === sit}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  status: e.target.value as StatusUnidade,
                                })
                              }
                              className="mr-3"
                            />
                            <span className="font-medium">
                              {sit === "HOMOLOGACAO"
                                ? "Em Homologação"
                                : sit.charAt(0) + sit.slice(1).toLowerCase()}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-100 border-2 border-gray-300 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              formData.status === "ATIVA"
                                ? "bg-green-500"
                                : formData.status === "HOMOLOGACAO"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                          ></div>
                          <span className="font-semibold text-gray-800">
                            {formData.status === "HOMOLOGACAO"
                              ? "Em Homologação - Aguardando Aprovação"
                              : formData.status === "ATIVA"
                              ? "Ativa"
                              : "Inativa"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          {!isEditing &&
                            "Novas unidades são criadas em homologação. "}
                          Apenas administradores podem alterar o status.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Informações de Status
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>
                        <strong>Ativa:</strong> Unidade operando normalmente
                      </li>
                      <li>
                        <strong>Inativa:</strong> Unidade temporariamente
                        suspensa
                      </li>
                      <li>
                        <strong>Em Homologação:</strong> Unidade em processo de
                        validação
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Requisitos
                    </h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>✓ CNPJ opcional (único se informado)</li>
                      <li>✓ Email único para cada unidade</li>
                      <li>
                        ⚠️ Se a franquia for inativada, todas as unidades
                        vinculadas também serão inativadas
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              {activeTab > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab - 1)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  Anterior
                </button>
              )}
              {activeTab < tabs.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab + 1)}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Próximo
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isEditing ? "Atualizar" : "Criar"} Unidade
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
