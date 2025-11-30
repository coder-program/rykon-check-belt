"use client";

import React from "react";
import { useAuth } from "@/app/auth/AuthContext";
import toast from "react-hot-toast";
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
  requer_aprovacao_checkin?: boolean;
  // Geolocalização
  latitude?: number;
  longitude?: number;
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
  // Estados de erro para validação visual
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {}
  );
  const [phoneError, setPhoneError] = React.useState<string>("");
  const [fixoError, setFixoError] = React.useState<string>("");
  const [cnpjError, setCnpjError] = React.useState<string>("");

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

  // Validação para nomes - apenas letras, espaços e acentos
  const validateName = (value: string): string => {
    // Remove caracteres especiais, mantendo apenas letras, espaços, acentos e hífen
    return value.replace(/[^a-zA-ZÀ-ÿ\s\-]/g, "");
  };

  // Validação para endereços - permite letras, números, espaços, acentos e alguns caracteres comuns
  const validateAddress = (value: string): string => {
    // Remove caracteres especiais perigosos, mantendo apenas letras, números, espaços, acentos, hífen, vírgula e ponto
    return value.replace(/[^a-zA-ZÀ-ÿ0-9\s\-\,\.º°ª]/g, "");
  };

  // Validação para número de endereço - apenas números e letras (para casos como "123A")
  const validateAddressNumber = (value: string): string => {
    return value.replace(/[^a-zA-Z0-9\s\-]/g, "");
  };

  const validateCNPJ = (cnpj: string): boolean => {
    // Remove formatação
    const cleanedCNPJ = cnpj.replace(/\D/g, "");

    // CNPJ deve ter 14 dígitos
    if (cleanedCNPJ.length !== 14) {
      return false;
    }

    // Elimina CNPJs inválidos conhecidos
    if (/^(\d)\1+$/.test(cleanedCNPJ)) {
      return false;
    }

    // Valida DVs (dígitos verificadores)
    let tamanho = cleanedCNPJ.length - 2;
    let numeros = cleanedCNPJ.substring(0, tamanho);
    const digitos = cleanedCNPJ.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) {
      return false;
    }

    tamanho = tamanho + 1;
    numeros = cleanedCNPJ.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) {
      return false;
    }

    return true;
  };

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const limited = cleaned.slice(0, 14);

    // Validar CNPJ se tiver conteúdo
    if (limited.length > 0) {
      if (limited.length < 14) {
        setCnpjError("CNPJ incompleto (14 dígitos necessários)");
      } else if (!validateCNPJ(limited)) {
        setCnpjError("CNPJ inválido");
      } else {
        setCnpjError("");
      }
    } else {
      setCnpjError(""); // Limpar erro se campo estiver vazio (opcional)
    }

    // Formatar
    return limited
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
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
    const cleaned = value.replace(/\D/g, "");

    // Limita a 11 dígitos
    const limited = cleaned.slice(0, 11);

    // Valida o telefone
    if (limited.length > 0 && limited.length < 10) {
      setPhoneError("Telefone deve ter 10 ou 11 dígitos");
    } else {
      setPhoneError("");
    }

    // Formata conforme a quantidade de dígitos
    if (limited.length === 11) {
      return limited.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (limited.length === 10) {
      return limited.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    } else if (limited.length >= 6) {
      return limited.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (limited.length >= 2) {
      return limited.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    }

    return limited;
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

    // Se CEP tem 9 caracteres (formato 00000-000), buscar endereço
    if (cep.length === 9) {
      try {
        const cepNumeros = cep.replace("-", "");
        // Chamar ViaCEP diretamente
        const response = await fetch(
          `https://viacep.com.br/ws/${cepNumeros}/json/`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );
        if (!response.ok) {
          // Se der erro, não faz nada - usuário preenche manualmente
          return;
        }

        const data = await response.json();

        if (data && !data.erro) {
          setFormData((prev) => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro || "",
            bairro: data.bairro || prev.bairro || "",
            cidade: data.localidade || prev.cidade || "",
            estado: data.uf || prev.estado || "",
            pais: "Brasil",
          }));
        }
      } catch (error) {
        console.error("❌ [FORM] Erro ao buscar CEP:", error);
        // Silenciosamente falha - usuário pode preencher manualmente
      }
    }
  };

  // Função utilitária para verificar se um campo tem erro
  const hasFieldError = (fieldName: string) => {
    return fieldErrors[fieldName] || false;
  };

  const handleSubmitWithValidation = (e: React.FormEvent) => {
    console.log("🚀 SUBMIT INICIADO - handleSubmitWithValidation chamado");
    console.log("📋 Dados do formulário:", formData);

    e.preventDefault(); // Sempre prevenir o submit padrão

    // Limpar todos os erros anteriores
    setFieldErrors({});
    setPhoneError("");
    setFixoError("");
    setCnpjError("");

    // 1. Verificar campos obrigatórios manualmente (já que HTML5 validation não funciona com campos ocultos)
    const requiredFields = [
      { field: "franqueado_id", name: "Franquia", tab: 0 },
      { field: "nome", name: "Nome da Unidade", tab: 0 },
      { field: "razao_social", name: "Razão Social", tab: 0 },
      { field: "email", name: "Email da Unidade", tab: 1 },
      { field: "telefone_celular", name: "WhatsApp da Unidade", tab: 1 },
      { field: "cep", name: "CEP", tab: 2 },
      { field: "logradouro", name: "Logradouro", tab: 2 },
      { field: "numero", name: "Número", tab: 2 },
      { field: "bairro", name: "Bairro", tab: 2 },
      { field: "cidade", name: "Cidade", tab: 2 },
      { field: "estado", name: "Estado", tab: 2 },
    ];

    const emptyFields = requiredFields.filter(({ field }) => {
      const value = formData[field as keyof typeof formData];
      return !value || (typeof value === "string" && value.trim() === "");
    });

    if (emptyFields.length > 0) {
      // Marcar campos com erro
      const newErrors: Record<string, string> = {};
      emptyFields.forEach(({ field, name }) => {
        newErrors[field] = `${name} é obrigatório`;
      });
      setFieldErrors(newErrors);

      // Navegar para a primeira aba com campo vazio
      const firstEmptyField = emptyFields[0];
      setActiveTab(firstEmptyField.tab);

      // Mostrar erro
      const missingFieldNames = emptyFields.map((f) => f.name).join(", ");
      toast.error(
        `Por favor, preencha os campos obrigatórios: ${missingFieldNames}`
      );
      console.log("❌ Campos obrigatórios vazios:", emptyFields);
      return;
    }

    console.log(
      "✅ Campos obrigatórios preenchidos, fazendo validações adicionais..."
    );

    // 2. Validar CNPJ antes de submeter (se preenchido)
    if (formData.cnpj) {
      const cleanedCNPJ = formData.cnpj.replace(/\D/g, "");
      if (cleanedCNPJ.length > 0 && cleanedCNPJ.length < 14) {
        setCnpjError("CNPJ incompleto (14 dígitos necessários)");
        setActiveTab(0); // Voltar para a aba de identificação
        return;
      }
      if (cleanedCNPJ.length === 14 && !validateCNPJ(cleanedCNPJ)) {
        setCnpjError("CNPJ inválido");
        setActiveTab(0); // Voltar para a aba de identificação
        return;
      }
    }

    // Validar telefone celular antes de submeter
    const cleanedPhone = formData.telefone_celular.replace(/\D/g, "");
    if (cleanedPhone.length > 0 && cleanedPhone.length < 10) {
      setPhoneError("Telefone inválido. Deve ter 10 ou 11 dígitos");
      setActiveTab(1); // Voltar para a aba de contato
      return;
    }

    // Validar telefone fixo antes de submeter (se preenchido)
    if (formData.telefone_fixo) {
      const cleanedFixo = formData.telefone_fixo.replace(/\D/g, "");
      if (cleanedFixo.length > 0 && cleanedFixo.length < 10) {
        setFixoError(
          "Telefone fixo incompleto. Deve ter 10 ou 11 dígitos (DDD + número)"
        );
        setActiveTab(1); // Voltar para a aba de contato
        return;
      }
    }

    // Se passou na validação, submeter
    console.log("🎯 Todas as validações passaram, submetendo formulário...");
    onSubmit(e);
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
        <form
          onSubmit={(e) => {
            console.log("🔥 EVENTO FORM SUBMIT CAPTURADO!", e);
            handleSubmitWithValidation(e);
          }}
          className="flex-1 overflow-y-auto"
        >
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
                        <div>
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
                        </div>
                      ) : (
                        <div>
                          <select
                            required
                            value={formData.franqueado_id}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                franqueado_id: e.target.value,
                              });
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              hasFieldError("franqueado_id")
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          >
                            <option value="">Selecione uma franquia</option>
                            {franqueados.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.nome}{" "}
                                {f.razao_social && `- ${f.razao_social}`}
                              </option>
                            ))}
                          </select>
                          {hasFieldError("franqueado_id") && (
                            <p className="mt-1 text-sm text-red-600">
                              {fieldErrors.franqueado_id}
                            </p>
                          )}
                        </div>
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
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          nome: validateName(e.target.value),
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        hasFieldError("nome")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {hasFieldError("nome") && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.nome}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CNPJ{" "}
                      <span className="text-gray-500 text-xs">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.cnpj || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cnpj: formatCNPJ(e.target.value),
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        cnpjError ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {cnpjError && (
                      <p className="text-red-500 text-xs mt-1">{cnpjError}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razão Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.razao_social}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          razao_social: validateName(e.target.value),
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        hasFieldError("razao_social")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {hasFieldError("razao_social") && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.razao_social}
                      </p>
                    )}
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
                          nome_fantasia: validateName(e.target.value),
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
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        hasFieldError("email")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {hasFieldError("email") && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone Celular / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.telefone_celular}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace") {
                          const input = e.currentTarget;
                          const cursorPos = input.selectionStart || 0;
                          const value = input.value;

                          // Se o cursor está logo após um caractere especial, remove-o também
                          if (
                            cursorPos > 0 &&
                            ["-", " ", "(", ")"].includes(value[cursorPos - 1])
                          ) {
                            e.preventDefault();
                            const newValue =
                              value.slice(0, cursorPos - 1) +
                              value.slice(cursorPos);
                            const formatted = formatPhone(newValue);
                            setFormData({
                              ...formData,
                              telefone_celular: formatted,
                            });
                            // Reposicionar cursor
                            setTimeout(() => {
                              const newPos = Math.max(0, cursorPos - 1);
                              input.setSelectionRange(newPos, newPos);
                            }, 0);
                          }
                        }
                      }}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          telefone_celular: formatPhone(e.target.value),
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        phoneError || hasFieldError("telefone_celular")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {phoneError && (
                      <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                    )}
                    {hasFieldError("telefone_celular") && !phoneError && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.telefone_celular}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone Fixo
                    </label>
                    <input
                      type="text"
                      value={formData.telefone_fixo || ""}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace") {
                          const input = e.currentTarget;
                          const cursorPos = input.selectionStart || 0;
                          const value = input.value;

                          // Se o cursor está logo após um caractere especial, remove-o também
                          if (
                            cursorPos > 0 &&
                            ["-", " ", "(", ")"].includes(value[cursorPos - 1])
                          ) {
                            e.preventDefault();
                            const newValue =
                              value.slice(0, cursorPos - 1) +
                              value.slice(cursorPos);
                            const formatted = formatPhoneFixo(newValue);
                            setFormData({
                              ...formData,
                              telefone_fixo: formatted,
                            });
                            // Reposicionar cursor
                            setTimeout(() => {
                              const newPos = Math.max(0, cursorPos - 1);
                              input.setSelectionRange(newPos, newPos);
                            }, 0);
                          }
                        }
                      }}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telefone_fixo: formatPhoneFixo(e.target.value),
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        fixoError ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {fixoError && (
                      <p className="text-red-500 text-xs mt-1">{fixoError}</p>
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
                      required
                      value={formData.cep || ""}
                      onChange={handleCEPChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        hasFieldError("cep")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      maxLength={9}
                    />
                    {hasFieldError("cep") && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.cep}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logradouro *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.logradouro || ""}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          logradouro: validateAddress(e.target.value),
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        hasFieldError("logradouro")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {hasFieldError("logradouro") && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.logradouro}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.numero || ""}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          numero: validateAddressNumber(e.target.value),
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        hasFieldError("numero")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {hasFieldError("numero") && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.numero}
                      </p>
                    )}
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
                          complemento: validateAddress(e.target.value),
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
                      required
                      value={formData.bairro || ""}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          bairro: validateAddress(e.target.value),
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        hasFieldError("bairro")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {hasFieldError("bairro") && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.bairro}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cidade || ""}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          cidade: validateName(e.target.value),
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        hasFieldError("cidade")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {hasFieldError("cidade") && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.cidade}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.estado || ""}
                      onChange={(e) => {
                        // Remove caracteres especiais e números, mantém apenas letras
                        const cleanValue = e.target.value.replace(
                          /[^a-zA-Z]/g,
                          ""
                        );
                        setFormData({
                          ...formData,
                          estado: cleanValue.toUpperCase(),
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        hasFieldError("estado")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      maxLength={2}
                    />
                    {hasFieldError("estado") && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldErrors.estado}
                      </p>
                    )}
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
                        setFormData({
                          ...formData,
                          pais: validateName(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Seção de Geolocalização */}
                <div className="border-t pt-6 mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    📍 Localização GPS
                    <span className="text-xs font-normal text-gray-500">
                      (necessário para validar check-in dos alunos)
                    </span>
                  </h4>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Por que isso é necessário?</strong>
                    </p>
                    <p className="text-sm text-blue-700">
                      A localização da unidade é usada para garantir que os
                      alunos façam check-in apenas quando estiverem fisicamente
                      na academia (dentro de um raio de 100 metros).
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.geolocation) {
                            toast.loading("Obtendo sua localização...");
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                toast.dismiss();
                                setFormData({
                                  ...formData,
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude,
                                });
                                toast.success(
                                  "Localização obtida com sucesso!"
                                );
                              },
                              (error) => {
                                toast.dismiss();
                                toast.error(
                                  "Erro ao obter localização. Verifique se você permitiu o acesso à localização."
                                );
                                console.error("Erro de geolocalização:", error);
                              }
                            );
                          } else {
                            toast.error(
                              "Seu navegador não suporta geolocalização"
                            );
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        📍 Obter Minha Localização Atual
                      </button>

                      {(formData.latitude || formData.longitude) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              latitude: undefined,
                              longitude: undefined,
                            });
                            toast.success("Localização removida");
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          🗑️ Remover Localização
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="0.00000001"
                          value={formData.latitude || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              latitude: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Ex: -23.550520"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Valor entre -90 e 90
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="0.00000001"
                          value={formData.longitude || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              longitude: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Ex: -46.633308"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Valor entre -180 e 180
                        </p>
                      </div>
                    </div>

                    {formData.latitude && formData.longitude && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800 font-medium mb-2">
                          ✅ Localização configurada
                        </p>
                        <p className="text-sm text-green-700">
                          Coordenadas: {formData.latitude.toFixed(6)},{" "}
                          {formData.longitude.toFixed(6)}
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                        >
                          🗺️ Ver no Google Maps
                        </a>
                      </div>
                    )}
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

                  {/* Configuração de Aprovação de Check-ins */}
                  <div className="border-t pt-4">
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.requer_aprovacao_checkin || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requer_aprovacao_checkin: e.target.checked,
                          })
                        }
                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          Requer aprovação de check-ins
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {formData.requer_aprovacao_checkin
                            ? "✓ Ativado: Todos os check-ins desta unidade precisarão ser aprovados por gerente, recepcionista ou professor na tela de aprovações."
                            : "✗ Desativado: Check-ins são aprovados automaticamente assim que registrados."}
                        </p>
                      </div>
                    </label>
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
