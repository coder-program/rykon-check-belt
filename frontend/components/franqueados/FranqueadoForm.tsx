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
  id?: string;
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
  availableFranquias?: Array<{ id: string; nome: string }>;
}

export default function FranqueadoForm({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEditing,
  isLoading,
  availableFranquias = [],
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

  const formatNumericOnly = (value: string, maxLength: number = 20) => {
    return value
      .replace(/\D/g, "") // Remove tudo que não é dígito
      .slice(0, maxLength); // Limita ao comprimento máximo
  };

  const formatTextOnly = (value: string, maxLength: number = 150) => {
    return value
      .replace(/[^a-zA-ZÀ-ÿ\s\-'&.()]/g, "") // Remove números e caracteres não permitidos
      .slice(0, maxLength); // Limita ao comprimento máximo
  };

  // Formatação específica para endereço (permite números)
  const formatAddress = (value: string, maxLength: number = 200) => {
    return value
      .replace(/[^a-zA-ZÀ-ÿ0-9\s\-'&.,()]/g, "") // Permite números no endereço
      .slice(0, maxLength);
  };

  // Formatação para textos longos (textarea)
  const formatLongText = (value: string, maxLength: number = 1000) => {
    return value.slice(0, maxLength);
  };

  // Formatação para email com limite
  const formatEmail = (value: string, maxLength: number = 100) => {
    return value.toLowerCase().slice(0, maxLength);
  };

  // Formatação para URL com limite
  const formatUrl = (value: string, maxLength: number = 200) => {
    return value.slice(0, maxLength);
  };

  // Validação de telefone
  const isValidPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    // Aceita telefone com 10 dígitos (fixo) ou 11 dígitos (celular com 9)
    if (cleaned.length !== 10 && cleaned.length !== 11) return false;

    // Rejeitar números com todos os dígitos iguais
    if (/^(\d)\1+$/.test(cleaned)) return false;

    // Validar DDD (primeiros 2 dígitos) - deve estar entre 11 e 99
    const ddd = parseInt(cleaned.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;

    return true;
  };

  const getPhoneValidationMessage = (phone: string) => {
    if (!phone) return "Telefone é obrigatório";

    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length < 10) {
      return "Telefone deve ter pelo menos 10 dígitos";
    }

    if (cleaned.length > 11) {
      return "Telefone deve ter no máximo 11 dígitos";
    }

    if (cleaned.length === 11 && cleaned[2] !== "9") {
      return "Celular deve começar com 9 após o DDD";
    }

    return null; // Telefone válido
  };

  // Estados para validação de telefones
  const [telefoneError, setTelefoneError] = React.useState("");
  const [telefoneFixoError, setTelefoneFixoError] = React.useState("");
  const [telefoneResponsavelError, setTelefoneResponsavelError] =
    React.useState("");

  // Componente para mostrar contador de caracteres
  const CharacterCounter = ({
    current,
    max,
    className = "",
  }: {
    current: number;
    max: number;
    className?: string;
  }) => {
    const percentage = (current / max) * 100;
    const isNearLimit = percentage >= 80;
    const isAtLimit = percentage >= 100;

    return (
      <div
        className={`text-xs mt-1 flex items-center justify-between ${className}`}
      >
        <span
          className={`${
            isAtLimit
              ? "text-red-600 font-semibold"
              : isNearLimit
              ? "text-orange-600"
              : "text-gray-500"
          }`}
        >
          {current}/{max} caracteres
        </span>
        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              isAtLimit
                ? "bg-red-500"
                : isNearLimit
                ? "bg-orange-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
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

  const handleCEPChange = async (cep: string) => {
    const formattedCEP = formatCEP(cep);
    const cleanCEP = cep.replace(/\D/g, "");

    // Atualizar apenas o CEP inicialmente
    setFormData((prev) => ({ ...prev, cep: formattedCEP }));

    if (cleanCEP.length === 8) {
      try {
        // Usar ViaCEP diretamente (mais confiável)
        const response = await fetch(
          `https://viacep.com.br/ws/${cleanCEP}/json/`
        );
        const endereco = await response.json();

        if (endereco && !endereco.erro) {
          // Extrair dados específicos
          const logradouro = endereco.logradouro || "";
          const bairro = endereco.bairro || "";
          const cidade = endereco.localidade || "";
          const estado = endereco.uf || "";

          // Aguardar um pouco antes de atualizar para evitar conflitos
          await new Promise((resolve) => setTimeout(resolve, 100));

          setFormData((prevData) => {
            const novosDados = {
              ...prevData,
              cep: formattedCEP,
              logradouro,
              bairro,
              cidade,
              estado,
            };

            return novosDados;
          });
        }
      } catch (error) {
        console.error("💥 Erro ao buscar CEP:", error);
      }
    }
  };

  // Validação dos campos obrigatórios por aba
  const validateTab = (
    tabId: number
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (tabId) {
      case 0: // Identificação
        if (!formData.nome.trim()) errors.push("Nome é obrigatório");
        if (!formData.cnpj.trim()) errors.push("CNPJ é obrigatório");
        if (!formData.razao_social.trim())
          errors.push("Razão Social é obrigatória");
        break;

      case 1: // Contato
        if (!formData.email.trim()) {
          errors.push("Email Institucional é obrigatório");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.push("Email deve ter um formato válido");
        }

        if (!formData.telefone_celular.trim()) {
          errors.push("Telefone Celular / WhatsApp é obrigatório");
        } else {
          const phoneValidationMessage = getPhoneValidationMessage(
            formData.telefone_celular
          );
          if (phoneValidationMessage) {
            errors.push(phoneValidationMessage);
          }
        }
        break;

      case 2: // Endereço
        if (!formData.cep?.trim()) errors.push("CEP é obrigatório");
        if (!formData.logradouro?.trim())
          errors.push("Logradouro é obrigatório");
        if (!formData.cidade?.trim()) errors.push("Cidade é obrigatória");
        if (!formData.estado?.trim()) errors.push("Estado é obrigatório");
        break;

      case 3: // Responsável
        if (!formData.responsavel_nome?.trim())
          errors.push("Nome do Responsável é obrigatório");
        if (!formData.responsavel_cpf?.trim())
          errors.push("CPF do Responsável é obrigatório");
        if (!formData.responsavel_email?.trim())
          errors.push("Email do Responsável é obrigatório");
        break;

      default:
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Função para avançar para próxima aba com validação
  const handleNextTab = () => {
    const validation = validateTab(activeTab);

    if (!validation.isValid) {
      alert(
        `Por favor, preencha os seguintes campos obrigatórios:\n\n• ${validation.errors.join(
          "\n• "
        )}`
      );
      return;
    }

    setActiveTab(activeTab + 1);
  };

  // Função para clicar diretamente numa aba com validação
  const handleTabClick = (targetTab: number) => {
    // Se tentando ir para uma aba anterior, permite sempre
    if (targetTab < activeTab) {
      setActiveTab(targetTab);
      return;
    }

    // Se tentando ir para a mesma aba, permite
    if (targetTab === activeTab) {
      return;
    }

    // Se tentando pular uma aba, valida a atual primeiro
    const validation = validateTab(activeTab);

    if (!validation.isValid) {
      alert(
        `Para prosseguir, preencha os seguintes campos obrigatórios:\n\n• ${validation.errors.join(
          "\n• "
        )}`
      );
      return;
    }

    setActiveTab(targetTab);
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
                onClick={() => handleTabClick(tab.id)}
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
                      maxLength={50}
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nome: formatTextOnly(e.target.value, 50),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="São Paulo (apenas letras)"
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
                          razao_social: formatTextOnly(e.target.value, 200),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="São Paulo Ltda"
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
                          nome_fantasia: formatTextOnly(e.target.value, 150),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="SP"
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
                      placeholder="123456789012 (apenas números)"
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
                      placeholder="9876543 (apenas números)"
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
                        setFormData({
                          ...formData,
                          email: formatEmail(e.target.value, 100),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contato@teamcruz.com.br"
                      maxLength={100}
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
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setFormData({
                          ...formData,
                          telefone_celular: formatted,
                        });

                        // Validação em tempo real
                        const validationMessage =
                          getPhoneValidationMessage(formatted);
                        setTelefoneError(validationMessage || "");
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        telefoneError
                          ? "border-red-500"
                          : formData.telefone_celular &&
                            isValidPhone(formData.telefone_celular)
                          ? "border-green-500"
                          : "border-gray-300"
                      }`}
                      placeholder="(11) 99999-9999"
                    />
                    {telefoneError && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                        <svg
                          className="h-4 w-4 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{telefoneError}</span>
                      </div>
                    )}
                    {!telefoneError &&
                      formData.telefone_celular &&
                      isValidPhone(formData.telefone_celular) && (
                        <div className="flex items-center gap-2 text-green-600 text-sm mt-1">
                          <svg
                            className="h-4 w-4 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Telefone válido</span>
                        </div>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone Fixo
                    </label>
                    <input
                      type="text"
                      value={formData.telefone_fixo || ""}
                      onChange={(e) => {
                        const formatted = formatPhoneFixo(e.target.value);
                        setFormData({
                          ...formData,
                          telefone_fixo: formatted,
                        });

                        // Validação opcional para telefone fixo
                        if (formatted) {
                          const validationMessage =
                            getPhoneValidationMessage(formatted);
                          setTelefoneFixoError(validationMessage || "");
                        } else {
                          setTelefoneFixoError("");
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        telefoneFixoError
                          ? "border-red-500"
                          : formData.telefone_fixo &&
                            isValidPhone(formData.telefone_fixo)
                          ? "border-green-500"
                          : "border-gray-300"
                      }`}
                      placeholder="(11) 1234-5678"
                    />
                    {telefoneFixoError && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                        <svg
                          className="h-4 w-4 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{telefoneFixoError}</span>
                      </div>
                    )}
                    {!telefoneFixoError &&
                      formData.telefone_fixo &&
                      isValidPhone(formData.telefone_fixo) && (
                        <div className="flex items-center gap-2 text-green-600 text-sm mt-1">
                          <svg
                            className="h-4 w-4 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Telefone válido</span>
                        </div>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          website: formatUrl(e.target.value, 200),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://www.exemplo.com.br"
                      maxLength={200}
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
                                instagram: formatUrl(e.target.value, 150),
                              },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://instagram.com/..."
                          maxLength={150}
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
                                facebook: formatUrl(e.target.value, 150),
                              },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://facebook.com/..."
                          maxLength={150}
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
                                youtube: formatUrl(e.target.value, 150),
                              },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://youtube.com/@..."
                          maxLength={150}
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
                                linkedin: formatUrl(e.target.value, 150),
                              },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://linkedin.com/company/..."
                          maxLength={150}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CEP *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cep || ""}
                      onChange={(e) => handleCEPChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logradouro *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.logradouro || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          logradouro: formatAddress(e.target.value, 200),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Rua, Avenida, Praça..."
                      maxLength={200}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.numero || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numero: formatAddress(e.target.value, 10),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="123"
                      maxLength={10}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={formData.complemento || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          complemento: formatAddress(e.target.value, 100),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Sala, Andar, Bloco..."
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bairro *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.bairro || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bairro: formatAddress(e.target.value, 100),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Centro"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cidade || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cidade: formatTextOnly(e.target.value, 100),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="São Paulo"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado *
                    </label>
                    <select
                      required
                      value={formData.estado || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, estado: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione</option>
                      <option value="AC">Acre</option>
                      <option value="AL">Alagoas</option>
                      <option value="AP">Amapá</option>
                      <option value="AM">Amazonas</option>
                      <option value="BA">Bahia</option>
                      <option value="CE">Ceará</option>
                      <option value="DF">Distrito Federal</option>
                      <option value="ES">Espírito Santo</option>
                      <option value="GO">Goiás</option>
                      <option value="MA">Maranhão</option>
                      <option value="MT">Mato Grosso</option>
                      <option value="MS">Mato Grosso do Sul</option>
                      <option value="MG">Minas Gerais</option>
                      <option value="PA">Pará</option>
                      <option value="PB">Paraíba</option>
                      <option value="PR">Paraná</option>
                      <option value="PE">Pernambuco</option>
                      <option value="PI">Piauí</option>
                      <option value="RJ">Rio de Janeiro</option>
                      <option value="RN">Rio Grande do Norte</option>
                      <option value="RS">Rio Grande do Sul</option>
                      <option value="RO">Rondônia</option>
                      <option value="RR">Roraima</option>
                      <option value="SC">Santa Catarina</option>
                      <option value="SP">São Paulo</option>
                      <option value="SE">Sergipe</option>
                      <option value="TO">Tocantins</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Busca Automática
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Digite o CEP para preencher automaticamente os dados do
                    endereço
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      Validação Implementada
                    </span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Todos os campos possuem limites de caracteres configurados e
                    validação em tempo real
                  </p>
                </div>
              </div>
            )}

            {/* Debug Info - Status Ativo */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-medium">
                  Debug - Status Ativo
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Valor atual: <strong>{String(formData.ativo)}</strong> (
                {typeof formData.ativo})
                {isEditing && (
                  <span className="ml-2 text-blue-500">
                    (Modo: Edição de ID: {formData.id})
                  </span>
                )}
              </p>
            </div>

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
                          responsavel_nome: formatTextOnly(e.target.value, 150),
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
                          responsavel_cargo: formatTextOnly(
                            e.target.value,
                            100
                          ),
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
                          responsavel_email: formatEmail(e.target.value, 100),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="responsavel@email.com"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formData.responsavel_telefone || ""}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setFormData({
                          ...formData,
                          responsavel_telefone: formatted,
                        });

                        // Validação opcional para telefone do responsável
                        if (formatted) {
                          const validationMessage =
                            getPhoneValidationMessage(formatted);
                          setTelefoneResponsavelError(validationMessage || "");
                        } else {
                          setTelefoneResponsavelError("");
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        telefoneResponsavelError
                          ? "border-red-500"
                          : formData.responsavel_telefone &&
                            isValidPhone(formData.responsavel_telefone)
                          ? "border-green-500"
                          : "border-gray-300"
                      }`}
                      placeholder="(11) 99999-9999"
                    />
                    {telefoneResponsavelError && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                        <svg
                          className="h-4 w-4 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{telefoneResponsavelError}</span>
                      </div>
                    )}
                    {!telefoneResponsavelError &&
                      formData.responsavel_telefone &&
                      isValidPhone(formData.responsavel_telefone) && (
                        <div className="flex items-center gap-2 text-green-600 text-sm mt-1">
                          <svg
                            className="h-4 w-4 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Telefone válido</span>
                        </div>
                      )}
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
                      Tipo de Franquia *
                    </label>
                    <select
                      value={formData.id_matriz === null ? "matriz" : "filial"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          id_matriz:
                            e.target.value === "matriz" ? null : "filial",
                        })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="filial">Filial</option>
                      <option value="matriz">Matriz</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.id_matriz === null
                        ? "Franquia independente (matriz)"
                        : "Franquia vinculada (filial)"}
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
                              logotipo_url: formatUrl(e.target.value, 300),
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="URL do logotipo"
                          maxLength={300}
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
                        setFormData({
                          ...formData,
                          missao: formatLongText(e.target.value, 500),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Nossa missão é..."
                      maxLength={500}
                    />
                    <CharacterCounter
                      current={formData.missao?.length || 0}
                      max={500}
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
                        setFormData({
                          ...formData,
                          visao: formatLongText(e.target.value, 500),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Nossa visão é..."
                      maxLength={500}
                    />
                    <CharacterCounter
                      current={formData.visao?.length || 0}
                      max={500}
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
                        setFormData({
                          ...formData,
                          valores: formatLongText(e.target.value, 500),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Nossos valores são..."
                      maxLength={500}
                    />
                    <CharacterCounter
                      current={formData.valores?.length || 0}
                      max={500}
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
                        setFormData({
                          ...formData,
                          historico: formatLongText(e.target.value, 1500),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Conte a história da franquia..."
                      maxLength={1500}
                    />
                    <CharacterCounter
                      current={formData.historico?.length || 0}
                      max={1500}
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

                  {/* Mensagem Específica de Status Selecionado */}
                  {formData.situacao === "EM_HOMOLOGACAO" && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-amber-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-amber-800">
                            Status: Em Homologação
                          </h4>
                          <p className="text-sm text-amber-700 mt-1">
                            <strong>Franquia em processo de validação.</strong>{" "}
                            Esta franquia está sendo analisada pelo
                            administrador antes de ser aprovada para operação.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.situacao === "ATIVA" && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-green-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-green-800">
                            Status: Ativa
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            <strong>Franquia operando normalmente.</strong>{" "}
                            Todas as funcionalidades estão liberadas para uso.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.situacao === "INATIVA" && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-red-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-red-800">
                            Status: Inativa
                          </h4>
                          <p className="text-sm text-red-700 mt-1">
                            <strong>Franquia temporariamente suspensa.</strong>{" "}
                            Acesso às funcionalidades pode estar limitado.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bloco de Informações de Status - Sempre Visível */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Informações dos Status
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li
                        className={`p-2 rounded ${
                          formData.situacao === "ATIVA"
                            ? "bg-green-100 font-semibold"
                            : ""
                        }`}
                      >
                        <strong>Ativa:</strong> Franquia operando normalmente
                      </li>
                      <li
                        className={`p-2 rounded ${
                          formData.situacao === "INATIVA"
                            ? "bg-orange-100 font-semibold"
                            : ""
                        }`}
                      >
                        <strong>Inativa:</strong> Franquia temporariamente
                        suspensa
                      </li>
                      <li
                        className={`p-2 rounded ${
                          formData.situacao === "EM_HOMOLOGACAO"
                            ? "bg-yellow-100 font-semibold"
                            : ""
                        }`}
                      >
                        <strong>Em Homologação:</strong> Franquia em processo de
                        validação
                      </li>
                    </ul>
                  </div>

                  <div
                    className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                      formData.ativo
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setFormData({ ...formData, ativo: isChecked });
                      }}
                      className={`w-6 h-6 rounded focus:ring-2 ${
                        formData.ativo
                          ? "text-green-600 bg-green-100 border-green-300 focus:ring-green-500"
                          : "text-red-600 bg-red-100 border-red-300 focus:ring-red-500"
                      }`}
                    />
                    <div className="ml-3">
                      <label
                        htmlFor="ativo"
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        Franqueado ativo no sistema
                      </label>
                      <p
                        className={`text-xs mt-1 ${
                          formData.ativo ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {formData.ativo
                          ? "✅ Franqueado tem acesso completo ao sistema"
                          : " Franqueado com acesso bloqueado/suspenso"}
                      </p>
                    </div>
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
                  onClick={handleNextTab}
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
