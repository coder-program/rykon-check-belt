"use client";

import React from "react";
import {
  X,
  User,
  Phone,
  MapPin,
  Heart,
  GraduationCap,
  Shield,
  Calendar,
} from "lucide-react";

type Genero = "MASCULINO" | "FEMININO" | "OUTRO";
type StatusAluno = "ATIVO" | "INATIVO" | "SUSPENSO" | "CANCELADO";
type FaixaEnum =
  | "BRANCA"
  | "CINZA_BRANCA"
  | "CINZA"
  | "CINZA_PRETA"
  | "AMARELA_BRANCA"
  | "AMARELA"
  | "AMARELA_PRETA"
  | "LARANJA_BRANCA"
  | "LARANJA"
  | "LARANJA_PRETA"
  | "VERDE_BRANCA"
  | "VERDE"
  | "VERDE_PRETA"
  | "AZUL"
  | "ROXA"
  | "MARROM"
  | "PRETA";

interface AlunoFormData {
  // Dados Pessoais
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  genero: Genero;
  email?: string;
  telefone?: string;
  telefone_emergencia?: string;
  nome_contato_emergencia?: string;

  // Matrícula
  unidade_id: string;
  data_matricula?: string;
  numero_matricula?: string;
  status?: StatusAluno;

  // Graduação
  faixa_atual?: FaixaEnum;
  graus?: number;
  data_ultima_graduacao?: string;

  // Responsável (menores)
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_telefone?: string;
  responsavel_parentesco?: string;

  // Dados Médicos
  observacoes_medicas?: string;
  alergias?: string;
  medicamentos_uso_continuo?: string;

  // Financeiro
  dia_vencimento?: number;
  valor_mensalidade?: number;
  desconto_percentual?: number;

  // Outros
  observacoes?: string;
}

interface Unidade {
  id: string;
  nome: string;
}

interface AlunoFormProps {
  formData: AlunoFormData;
  setFormData: React.Dispatch<React.SetStateAction<AlunoFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isEditing: boolean;
  isLoading: boolean;
  unidades: Unidade[];
}

const faixas: { value: FaixaEnum; label: string; color: string }[] = [
  { value: "BRANCA", label: "Branca", color: "#FFFFFF" },
  { value: "CINZA_BRANCA", label: "Cinza-Branca", color: "#808080" },
  { value: "CINZA", label: "Cinza", color: "#696969" },
  { value: "CINZA_PRETA", label: "Cinza-Preta", color: "#404040" },
  { value: "AMARELA_BRANCA", label: "Amarela-Branca", color: "#FFD700" },
  { value: "AMARELA", label: "Amarela", color: "#FFC700" },
  { value: "AMARELA_PRETA", label: "Amarela-Preta", color: "#DAA520" },
  { value: "LARANJA_BRANCA", label: "Laranja-Branca", color: "#FFA500" },
  { value: "LARANJA", label: "Laranja", color: "#FF8C00" },
  { value: "LARANJA_PRETA", label: "Laranja-Preta", color: "#D2691E" },
  { value: "VERDE_BRANCA", label: "Verde-Branca", color: "#32CD32" },
  { value: "VERDE", label: "Verde", color: "#228B22" },
  { value: "VERDE_PRETA", label: "Verde-Preta", color: "#006400" },
  { value: "AZUL", label: "Azul", color: "#0000FF" },
  { value: "ROXA", label: "Roxa", color: "#8B008B" },
  { value: "MARROM", label: "Marrom", color: "#8B4513" },
  { value: "PRETA", label: "Preta", color: "#000000" },
];

export default function AlunoForm({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEditing,
  isLoading,
  unidades,
}: AlunoFormProps) {
  const [activeTab, setActiveTab] = React.useState(0);
  const [isMenor, setIsMenor] = React.useState(false);

  const tabs = [
    { id: 0, label: "Dados Pessoais", icon: User },
    { id: 1, label: "Contato", icon: Phone },
    { id: 2, label: "Matrícula", icon: GraduationCap },
    { id: 3, label: "Responsável", icon: Shield },
    { id: 4, label: "Saúde", icon: Heart },
    { id: 5, label: "Financeiro", icon: Calendar },
  ];

  // Calcular idade e determinar se é menor
  React.useEffect(() => {
    if (formData.data_nascimento) {
      const nascimento = new Date(formData.data_nascimento);
      const hoje = new Date();
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const mesAtual = hoje.getMonth();
      const mesNascimento = nascimento.getMonth();

      if (
        mesAtual < mesNascimento ||
        (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
      ) {
        idade--;
      }

      setIsMenor(idade < 18);
    }
  }, [formData.data_nascimento]);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {isEditing ? "Editar Aluno" : "Novo Aluno"}
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
            {/* Tab 0: Dados Pessoais */}
            {activeTab === 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome_completo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nome_completo: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome completo do aluno"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPF *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cpf}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cpf: formatCPF(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Nascimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.data_nascimento}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          data_nascimento: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {isMenor && (
                      <p className="text-xs text-yellow-600 mt-1">
                        ⚠️ Menor de 18 anos - responsável obrigatório
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gênero *
                    </label>
                    <select
                      required
                      value={formData.genero}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          genero: e.target.value as Genero,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMININO">Feminino</option>
                      <option value="OUTRO">Outro</option>
                    </select>
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
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formData.telefone || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telefone: formatPhone(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone de Emergência
                    </label>
                    <input
                      type="text"
                      value={formData.telefone_emergencia || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telefone_emergencia: formatPhone(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Contato de Emergência
                    </label>
                    <input
                      type="text"
                      value={formData.nome_contato_emergencia || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nome_contato_emergencia: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome completo"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Matrícula */}
            {activeTab === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Dados de Matrícula
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidade *
                    </label>
                    <select
                      required
                      value={formData.unidade_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          unidade_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione a unidade</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Faixa Atual
                    </label>
                    <select
                      value={formData.faixa_atual || "BRANCA"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          faixa_atual: e.target.value as FaixaEnum,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {faixas.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Graus (0-4)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      value={formData.graus || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          graus: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Matrícula
                    </label>
                    <input
                      type="date"
                      value={formData.data_matricula || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          data_matricula: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status || "ATIVO"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as StatusAluno,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                      <option value="SUSPENSO">Suspenso</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Responsável */}
            {activeTab === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Dados do Responsável
                </h3>
                {isMenor && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>Obrigatório:</strong> Este aluno é menor de 18
                      anos. Preencha os dados do responsável legal.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Responsável {isMenor && "*"}
                    </label>
                    <input
                      type="text"
                      required={isMenor}
                      value={formData.responsavel_nome || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          responsavel_nome: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome completo do responsável"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPF do Responsável {isMenor && "*"}
                    </label>
                    <input
                      type="text"
                      required={isMenor}
                      value={formData.responsavel_cpf || ""}
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
                      Telefone do Responsável {isMenor && "*"}
                    </label>
                    <input
                      type="text"
                      required={isMenor}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parentesco
                    </label>
                    <input
                      type="text"
                      value={formData.responsavel_parentesco || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          responsavel_parentesco: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Pai, Mãe, Tutor"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Saúde */}
            {activeTab === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Informações de Saúde
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observações Médicas
                    </label>
                    <textarea
                      value={formData.observacoes_medicas || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          observacoes_medicas: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Condições médicas relevantes..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alergias
                    </label>
                    <textarea
                      value={formData.alergias || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          alergias: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Alergias conhecidas..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medicamentos de Uso Contínuo
                    </label>
                    <textarea
                      value={formData.medicamentos_uso_continuo || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          medicamentos_uso_continuo: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Medicamentos em uso..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Financeiro */}
            {activeTab === 5 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Dados Financeiros
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dia de Vencimento (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dia_vencimento || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dia_vencimento: parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor Mensalidade (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.valor_mensalidade || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valor_mensalidade:
                            parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="150.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desconto (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.desconto_percentual || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          desconto_percentual: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações Gerais
                  </label>
                  <textarea
                    value={formData.observacoes || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        observacoes: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Observações adicionais sobre o aluno..."
                  />
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
                {isEditing ? "Atualizar" : "Cadastrar"} Aluno
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
