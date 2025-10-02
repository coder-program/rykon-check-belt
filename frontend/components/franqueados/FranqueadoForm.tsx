"use client";

import React from "react";
import {
  X,
  Building2,
  User,
  Phone,
  MapPin,
  Info,
  FileText,
  Upload,
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

type SituacaoFranqueado = "ATIVA" | "INATIVA" | "EM_HOMOLOGACAO";

interface FranqueadoFormData {
  nome: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  email: string;
  telefone_fixo?: string;
  telefone_celular: string;
  website?: string;
  redes_sociais?: RedesSociais;
  endereco_id?: string;
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_cargo?: string;
  responsavel_email?: string;
  responsavel_telefone?: string;
  ano_fundacao?: number;
  missao?: string;
  visao?: string;
  valores?: string;
  historico?: string;
  logotipo_url?: string;
  id_matriz?: string | null;
  situacao: SituacaoFranqueado;
  ativo: boolean;
}

interface FranqueadoFormProps {
  formData: FranqueadoFormData;
  setFormData: React.Dispatch<React.SetStateAction<FranqueadoFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isEditing: boolean;
  isLoading: boolean;
}

export default function FranqueadoForm({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEditing,
  isLoading,
}: FranqueadoFormProps) {
  const [activeTab, setActiveTab] = React.useState(0);

  const tabs = [
    { id: 0, label: "Identificação", icon: Building2 },
    { id: 1, label: "Contato", icon: Phone },
    { id: 2, label: "Endereço", icon: MapPin },
    { id: 3, label: "Responsável", icon: User },
    { id: 4, label: "Informações", icon: Info },
    { id: 5, label: "Status", icon: FileText },
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            {isEditing ? "Editar Franqueado" : "Novo Franqueado"}
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
                  Identificação da Franquia
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Franquia *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="TeamCruz São Paulo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CNPJ *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cnpj}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cnpj: formatCNPJ(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="00.000.000/0000-00"
                    />
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
                      placeholder="TeamCruz São Paulo Ltda"
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
                      placeholder="TeamCruz SP"
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
                          inscricao_estadual: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="123.456.789.012"
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
                          inscricao_municipal: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="9876543"
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
                      Email Institucional *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contato@teamcruz.com.br"
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
                      placeholder="(00) 00000-0000"
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
                      placeholder="(00) 0000-0000"
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
                      placeholder="https://www.exemplo.com.br"
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
                          placeholder="https://instagram.com/..."
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
                          placeholder="https://facebook.com/..."
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
                          placeholder="https://youtube.com/@..."
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
                          placeholder="https://linkedin.com/company/..."
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
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Funcionalidade de endereço em desenvolvimento</p>
                  <p className="text-sm mt-2">
                    Você poderá vincular um endereço à franquia em breve
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Responsável */}
            {activeTab === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Responsável Legal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.responsavel_nome}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          responsavel_nome: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="João da Silva"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPF *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.responsavel_cpf}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          responsavel_cpf: formatCPF(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      value={formData.responsavel_cargo || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          responsavel_cargo: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Diretor, Mestre, Gestor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.responsavel_email || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          responsavel_email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="responsavel@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formData.responsavel_telefone || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          responsavel_telefone: formatPhone(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Informações */}
            {activeTab === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Informações da Franquia
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ano de Fundação
                      </label>
                      <input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        value={formData.ano_fundacao || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ano_fundacao: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="2020"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Franquia
                    </label>
                    <select
                      value={formData.id_matriz || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          id_matriz: e.target.value || null,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Franquia Matriz</option>
                      <option value="filial" disabled>
                        Franquia Filial (em breve)
                      </option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Matriz = franquia principal. Filial = vinculada a uma
                      matriz.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Logotipo
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={formData.logotipo_url || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              logotipo_url: e.target.value,
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="URL do logotipo"
                        />
                        <button
                          type="button"
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Upload de imagem (em breve)"
                        >
                          <Upload className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Missão
                    </label>
                    <textarea
                      rows={3}
                      value={formData.missao || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, missao: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Nossa missão é..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visão
                    </label>
                    <textarea
                      rows={3}
                      value={formData.visao || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, visao: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Nossa visão é..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valores
                    </label>
                    <textarea
                      rows={3}
                      value={formData.valores || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, valores: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Nossos valores são..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Histórico / Descrição
                    </label>
                    <textarea
                      rows={5}
                      value={formData.historico || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, historico: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Conte a história da franquia..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Status */}
            {activeTab === 5 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Status</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Situação da Franquia
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(
                        [
                          "ATIVA",
                          "INATIVA",
                          "EM_HOMOLOGACAO",
                        ] as SituacaoFranqueado[]
                      ).map((sit) => (
                        <label
                          key={sit}
                          className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.situacao === sit
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          <input
                            type="radio"
                            name="situacao"
                            value={sit}
                            checked={formData.situacao === sit}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                situacao: e.target.value as SituacaoFranqueado,
                              })
                            }
                            className="mr-3"
                          />
                          <span className="font-medium">
                            {sit === "EM_HOMOLOGACAO"
                              ? "Em Homologação"
                              : sit.charAt(0) + sit.slice(1).toLowerCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) =>
                        setFormData({ ...formData, ativo: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="ativo"
                      className="ml-3 text-sm font-medium text-gray-700"
                    >
                      Franqueado ativo no sistema
                    </label>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Informações de Status
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>
                        <strong>Ativa:</strong> Franquia operando normalmente
                      </li>
                      <li>
                        <strong>Inativa:</strong> Franquia temporariamente
                        suspensa
                      </li>
                      <li>
                        <strong>Em Homologação:</strong> Franquia em processo
                        de validação
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
                {isEditing ? "Atualizar" : "Criar"} Franqueado
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
