"use client";

import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
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
import { http } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

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
  const [unidadeSearchTerm, setUnidadeSearchTerm] = useState("");
  const [showUnidadeDropdown, setShowUnidadeDropdown] = useState(false);
  const [erroIdade, setErroIdade] = useState<string>("");

  // 🎨 Buscar faixas disponíveis do backend - APENAS INFANTIS para dependentes
  const { data: faixas, isLoading: loadingFaixas } = useQuery({
    queryKey: ["faixas-disponiveis-kids"],
    queryFn: async () => {
      try {
        const data = await http("/graduacao/faixas?categoria=INFANTIL", {
          auth: true,
        });
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(" Erro ao buscar faixas:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: 1,
  });

  // ✅ Validar idade - permitir apenas quem completa 15 anos ou menos no ano atual
  useEffect(() => {
    if (formData.data_nascimento) {
      const dataNasc = new Date(formData.data_nascimento);
      const anoAtual = new Date().getFullYear();
      const anoNascimento = dataNasc.getFullYear();
      const idadeNoAnoAtual = anoAtual - anoNascimento;

      if (idadeNoAnoAtual > 15) {
        setErroIdade(
          `Apenas dependentes que fazem até 15 anos em ${anoAtual} podem ser cadastrados. Esta pessoa faz ${idadeNoAnoAtual} anos em ${anoAtual}.`
        );
      } else {
        setErroIdade("");
      }
    } else {
      setErroIdade("");
    }
  }, [formData.data_nascimento]);

  // Sincronizar o campo de busca com a unidade selecionada
  useEffect(() => {
    if (formData.unidade_id && unidades.length > 0) {
      const unidadeSelecionada = unidades.find(
        (u) => u.id === formData.unidade_id
      );
      if (unidadeSelecionada) {
        setUnidadeSearchTerm(unidadeSelecionada.nome);
      }
    }
  }, [formData.unidade_id, unidades]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest("#unidade_id") &&
        !target.closest(".unidade-dropdown")
      ) {
        setShowUnidadeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrar unidades baseado no termo de busca
  const unidadesFiltradas = unidades.filter((unidade) => {
    const searchLower = unidadeSearchTerm.toLowerCase();
    return unidade.nome.toLowerCase().includes(searchLower);
  });

  // Obter nome da unidade selecionada
  const getUnidadeNome = (unidadeId: string) => {
    const unidade = unidades.find((u) => u.id === unidadeId);
    return unidade ? unidade.nome : "";
  };

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
                  className={erroIdade ? "border-red-500" : ""}
                />
                {erroIdade && (
                  <p className="text-sm text-red-600 mt-1">{erroIdade}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Dependentes devem fazer até 15 anos em{" "}
                  {new Date().getFullYear()}
                </p>
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
                  {formData.unidade_id && (
                    <span className="ml-2 text-xs text-green-600">
                      ✓ Selecionada
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="unidade_id"
                    type="text"
                    placeholder="Digite para buscar a unidade..."
                    value={unidadeSearchTerm}
                    onChange={(e) => {
                      const valorDigitado = e.target.value;
                      setUnidadeSearchTerm(valorDigitado);
                      setShowUnidadeDropdown(true);

                      // Se o usuário apagar tudo MANUALMENTE, limpar a unidade selecionada
                      // Só limpa se o campo estava preenchido antes (unidadeSearchTerm tinha valor)
                      if (!valorDigitado && unidadeSearchTerm) {
                        handleChange("unidade_id", "");
                      }
                    }}
                    onFocus={() => setShowUnidadeDropdown(true)}
                    onBlur={() => {
                      // Ao perder o foco, verificar se o texto digitado corresponde a uma unidade
                      setTimeout(() => {
                        const unidadeExata = unidades.find(
                          (u) =>
                            u.nome.toLowerCase() ===
                            unidadeSearchTerm.toLowerCase()
                        );
                        if (unidadeExata) {
                          handleChange("unidade_id", unidadeExata.id);
                        } else if (unidadeSearchTerm && !formData.unidade_id) {
                          // Se digitou algo mas não selecionou, limpar
                          setUnidadeSearchTerm("");
                        }
                      }, 200);
                    }}
                    required
                  />
                  {showUnidadeDropdown && unidadesFiltradas.length > 0 && (
                    <div className="unidade-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {unidadesFiltradas.map((unidade) => (
                        <div
                          key={unidade.id}
                          onClick={() => {
                            handleChange("unidade_id", unidade.id);
                            setUnidadeSearchTerm(unidade.nome);
                            setShowUnidadeDropdown(false);
                          }}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors border-b border-gray-200 last:border-b-0"
                        >
                          <span className="font-medium text-gray-900">
                            {unidade.nome}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                  value={formData.faixa_atual || "CINZA"}
                  onValueChange={(value) => handleChange("faixa_atual", value)}
                  disabled={loadingFaixas}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingFaixas ? (
                      <SelectItem value="LOADING">
                        Carregando faixas...
                      </SelectItem>
                    ) : faixas && faixas.length > 0 ? (
                      faixas
                        .sort((a: any, b: any) => a.ordem - b.ordem)
                        .map((faixa: any) => (
                          <SelectItem key={faixa.codigo} value={faixa.codigo}>
                            {faixa.nome_exibicao}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="CINZA">Cinza (padrão)</SelectItem>
                    )}
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
              disabled={isLoading || !!erroIdade}
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
