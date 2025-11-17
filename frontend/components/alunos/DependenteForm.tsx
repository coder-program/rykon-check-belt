"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Genero = "MASCULINO" | "FEMININO" | "OUTRO";

interface DependenteFormData {
  // Dados Pessoais
  nome_completo: string;
  cpf?: string;
  data_nascimento: string;
  genero: Genero;
  email?: string;
  telefone?: string;
  telefone_emergencia?: string;
  nome_contato_emergencia?: string;

  // Matrícula
  unidade_id: string;
  numero_matricula?: string;
  data_matricula?: string;
  faixa_atual?: string;
  graus?: string;

  // Dados Médicos
  observacoes_medicas?: string;
  alergias?: string;
  medicamentos_uso_continuo?: string;
  plano_saude?: string;
  atestado_medico_validade?: string;
  restricoes_medicas?: string;

  // Responsável (caso seja menor e precise outro responsável)
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_telefone?: string;
  responsavel_parentesco?: string;

  // Financeiro
  dia_vencimento?: string;
  valor_mensalidade?: string;
  desconto_percentual?: string;

  // Consentimentos
  consent_lgpd?: string;
  consent_imagem?: string;

  // Outros
  observacoes?: string;

  [key: string]: string | undefined;
}

interface DependenteFormProps {
  formData: DependenteFormData;
  setFormData: (data: DependenteFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isLoading: boolean;
  unidades: Array<{ id: string; nome: string }>;
  isEditMode?: boolean;
}

export default function DependenteForm({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isLoading,
  unidades,
  isEditMode = false,
}: DependenteFormProps) {
  const handleChange = (field: keyof DependenteFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {isEditMode ? "Editar Dependente" : "Cadastrar Dependente"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Dados Pessoais
            </h3>

            <div>
              <Label htmlFor="nome_completo">
                Nome Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("nome_completo", e.target.value)
                }
                required
                placeholder="Nome completo do dependente"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleChange("cpf", formatCPF(e.target.value));
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div>
                <Label htmlFor="data_nascimento">
                  Data de Nascimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("data_nascimento", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="genero">
                  Gênero <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.genero}
                  onValueChange={(value) => handleChange("genero", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASCULINO">Masculino</SelectItem>
                    <SelectItem value="FEMININO">Feminino</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="unidade_id">
                  Unidade <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.unidade_id}
                  onValueChange={(value) => handleChange("unidade_id", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Informações de Contato */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Informações de Contato
            </h3>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("email", e.target.value)
                }
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                <Input
                  id="telefone"
                  value={formData.telefone || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("telefone", formatPhone(e.target.value))
                  }
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>

              <div>
                <Label htmlFor="telefone_emergencia">
                  Telefone de Emergência
                </Label>
                <Input
                  id="telefone_emergencia"
                  value={formData.telefone_emergencia || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange(
                      "telefone_emergencia",
                      formatPhone(e.target.value)
                    )
                  }
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="nome_contato_emergencia">
                Nome do Contato de Emergência
              </Label>
              <Input
                id="nome_contato_emergencia"
                value={formData.nome_contato_emergencia || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("nome_contato_emergencia", e.target.value)
                }
                placeholder="Nome completo"
              />
            </div>
          </div>

          {/* Informações de Matrícula */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Informações de Matrícula
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numero_matricula">Número de Matrícula</Label>
                <Input
                  id="numero_matricula"
                  value={formData.numero_matricula || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("numero_matricula", e.target.value)
                  }
                  placeholder="Ex: 2024001"
                />
              </div>

              <div>
                <Label htmlFor="data_matricula">Data de Matrícula</Label>
                <Input
                  id="data_matricula"
                  type="date"
                  value={formData.data_matricula || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("data_matricula", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="faixa_atual">Faixa Atual</Label>
                <Select
                  value={formData.faixa_atual || "BRANCA"}
                  onValueChange={(value) => handleChange("faixa_atual", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRANCA">Branca</SelectItem>
                    <SelectItem value="CINZA">Cinza</SelectItem>
                    <SelectItem value="AMARELA">Amarela</SelectItem>
                    <SelectItem value="LARANJA">Laranja</SelectItem>
                    <SelectItem value="VERDE">Verde</SelectItem>
                    <SelectItem value="AZUL">Azul</SelectItem>
                    <SelectItem value="ROXA">Roxa</SelectItem>
                    <SelectItem value="MARROM">Marrom</SelectItem>
                    <SelectItem value="VERMELHA">Vermelha</SelectItem>
                    <SelectItem value="PRETA">Preta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="graus">Graus (0-4)</Label>
                <Input
                  id="graus"
                  type="number"
                  min="0"
                  max="4"
                  value={formData.graus || "0"}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("graus", e.target.value)
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Informações de Saúde */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Informações de Saúde
            </h3>

            <div>
              <Label htmlFor="observacoes_medicas">Observações Médicas</Label>
              <textarea
                id="observacoes_medicas"
                value={formData.observacoes_medicas || ""}
                onChange={(e) =>
                  handleChange("observacoes_medicas", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Ex: Problemas cardíacos, restrições físicas, etc."
              />
            </div>

            <div>
              <Label htmlFor="alergias">Alergias</Label>
              <textarea
                id="alergias"
                value={formData.alergias || ""}
                onChange={(e) => handleChange("alergias", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Ex: Alergia a medicamentos, alimentos, etc."
              />
            </div>

            <div>
              <Label htmlFor="medicamentos_uso_continuo">
                Medicamentos de Uso Contínuo
              </Label>
              <textarea
                id="medicamentos_uso_continuo"
                value={formData.medicamentos_uso_continuo || ""}
                onChange={(e) =>
                  handleChange("medicamentos_uso_continuo", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Ex: Nome do medicamento, dosagem e horário"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plano_saude">Plano de Saúde</Label>
                <Input
                  id="plano_saude"
                  value={formData.plano_saude || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("plano_saude", e.target.value)
                  }
                  placeholder="Nome do plano de saúde"
                />
              </div>

              <div>
                <Label htmlFor="atestado_medico_validade">
                  Validade do Atestado Médico
                </Label>
                <Input
                  id="atestado_medico_validade"
                  type="date"
                  value={formData.atestado_medico_validade || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("atestado_medico_validade", e.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="restricoes_medicas">Restrições Médicas</Label>
              <textarea
                id="restricoes_medicas"
                value={formData.restricoes_medicas || ""}
                onChange={(e) =>
                  handleChange("restricoes_medicas", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Ex: Não pode fazer exercícios de alto impacto"
              />
            </div>
          </div>

          {/* Dados do Responsável Adicional */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Responsável Adicional (Opcional)
            </h3>
            <p className="text-sm text-gray-600">
              Preencha caso o dependente precise de outro responsável além de
              você
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responsavel_nome">Nome do Responsável</Label>
                <Input
                  id="responsavel_nome"
                  value={formData.responsavel_nome || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("responsavel_nome", e.target.value)
                  }
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <Label htmlFor="responsavel_cpf">CPF do Responsável</Label>
                <Input
                  id="responsavel_cpf"
                  value={formData.responsavel_cpf || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("responsavel_cpf", formatCPF(e.target.value))
                  }
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responsavel_telefone">
                  Telefone do Responsável
                </Label>
                <Input
                  id="responsavel_telefone"
                  value={formData.responsavel_telefone || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange(
                      "responsavel_telefone",
                      formatPhone(e.target.value)
                    )
                  }
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>

              <div>
                <Label htmlFor="responsavel_parentesco">Parentesco</Label>
                <Input
                  id="responsavel_parentesco"
                  value={formData.responsavel_parentesco || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("responsavel_parentesco", e.target.value)
                  }
                  placeholder="Ex: Pai, Mãe, Avô, Tio, etc."
                />
              </div>
            </div>
          </div>

          {/* Informações Financeiras */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Informações Financeiras (Opcional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dia_vencimento">Dia de Vencimento</Label>
                <Input
                  id="dia_vencimento"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dia_vencimento || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("dia_vencimento", e.target.value)
                  }
                  placeholder="Ex: 10"
                />
              </div>

              <div>
                <Label htmlFor="valor_mensalidade">Valor da Mensalidade</Label>
                <Input
                  id="valor_mensalidade"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_mensalidade || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("valor_mensalidade", e.target.value)
                  }
                  placeholder="Ex: 150.00"
                />
              </div>

              <div>
                <Label htmlFor="desconto_percentual">Desconto (%)</Label>
                <Input
                  id="desconto_percentual"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.desconto_percentual || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("desconto_percentual", e.target.value)
                  }
                  placeholder="Ex: 10"
                />
              </div>
            </div>
          </div>

          {/* Consentimentos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Consentimentos
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent_lgpd"
                  checked={formData.consent_lgpd === "true"}
                  onChange={(e) =>
                    handleChange(
                      "consent_lgpd",
                      e.target.checked ? "true" : "false"
                    )
                  }
                  className="mt-1"
                />
                <Label
                  htmlFor="consent_lgpd"
                  className="font-normal cursor-pointer"
                >
                  Autorizo o uso dos meus dados pessoais conforme a Lei Geral de
                  Proteção de Dados (LGPD)
                </Label>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent_imagem"
                  checked={formData.consent_imagem === "true"}
                  onChange={(e) =>
                    handleChange(
                      "consent_imagem",
                      e.target.checked ? "true" : "false"
                    )
                  }
                  className="mt-1"
                />
                <Label
                  htmlFor="consent_imagem"
                  className="font-normal cursor-pointer"
                >
                  Autorizo o uso de imagem para divulgação em redes sociais e
                  materiais de marketing da academia
                </Label>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Observações Gerais
            </h3>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={formData.observacoes || ""}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Qualquer informação adicional relevante"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading
                ? isEditMode
                  ? "Salvando..."
                  : "Cadastrando..."
                : isEditMode
                ? "Salvar Alterações"
                : "Cadastrar Dependente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
