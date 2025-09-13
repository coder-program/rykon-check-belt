"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAluno, createProfessor } from "@/lib/peopleApi";
import { InputCPF } from "@/components/form/InputCPF";
import toast from "react-hot-toast";

interface PersonFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
  isEdit?: boolean;
  defaultTipo?: "ALUNO" | "PROFESSOR";
}

export function PersonForm({
  onSuccess,
  onCancel,
  initialData,
  isEdit = false,
  defaultTipo = "ALUNO",
}: PersonFormProps) {
  const [tipoCadastro, setTipoCadastro] = useState<"ALUNO" | "PROFESSOR">(
    defaultTipo,
  );
  const [formData, setFormData] = useState({
    tipo_cadastro: defaultTipo,
    nome_completo: "",
    cpf: "",
    data_nascimento: "",
    genero: "",
    telefone_whatsapp: "",
    email: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    unidade_id: "",
    status: "ATIVO",
    // Campos de aluno
    faixa_atual: "BRANCA",
    grau_atual: 0,
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_telefone: "",
    // Campos de professor
    faixa_ministrante: "",
    data_inicio_docencia: "",
    registro_profissional: "",
    observacoes: "",
  });

  const [isMinor, setIsMinor] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setTipoCadastro(initialData.tipo_cadastro || defaultTipo);
    } else {
      setTipoCadastro(defaultTipo);
      setFormData((prev) => ({ ...prev, tipo_cadastro: defaultTipo }));
    }
  }, [initialData, defaultTipo]);

  useEffect(() => {
    // Verificar se é menor de idade
    if (formData.data_nascimento) {
      const hoje = new Date();
      const nascimento = new Date(formData.data_nascimento);
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const mesAtual = hoje.getMonth();
      const mesNascimento = nascimento.getMonth();

      if (
        mesAtual < mesNascimento ||
        (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
      ) {
        idade--;
      }

      setIsMinor(idade < 18);
    }
  }, [formData.data_nascimento]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: any) => {
      // Usar a função correta baseada no tipo de cadastro
      if (data.tipo_cadastro === "PROFESSOR") {
        return createProfessor(data);
      }
      return createAluno(data);
    },
    onSuccess: () => {
      toast.success(
        `${
          tipoCadastro === "ALUNO" ? "Aluno" : "Professor"
        } cadastrado com sucesso!`,
      );
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["professores"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Erro ao cadastrar:", error);
      const message =
        error?.message || error?.response?.data?.message || "Erro ao cadastrar";
      toast.error(message);
    },
  });

  const formatCPF = (cpf: string) => {
    // Remove tudo que não é número
    const numbers = cpf.replace(/\D/g, "");
    // Formata como 000.000.000-00
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return cpf;
  };

  const formatCEP = (cep: string) => {
    // Remove tudo que não é número
    const numbers = cep.replace(/\D/g, "");
    // Formata como 00000-000
    if (numbers.length === 8) {
      return numbers.replace(/(\d{5})(\d{3})/, "$1-$2");
    }
    return cep;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações básicas
    if (
      !formData.nome_completo ||
      !formData.cpf ||
      !formData.data_nascimento ||
      !formData.telefone_whatsapp
    ) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Validar responsável se for menor
    if (tipoCadastro === "ALUNO" && isMinor) {
      if (
        !formData.responsavel_nome ||
        !formData.responsavel_cpf ||
        !formData.responsavel_telefone
      ) {
        toast.error(
          "Dados do responsável são obrigatórios para menores de 18 anos",
        );
        return;
      }
    }

    // Validar campos específicos
    if (tipoCadastro === "ALUNO" && !formData.faixa_atual) {
      toast.error("Faixa é obrigatória para alunos");
      return;
    }

    if (tipoCadastro === "PROFESSOR" && !formData.faixa_ministrante) {
      toast.error("Faixa ministrante é obrigatória para professores");
      return;
    }

    // Preparar dados formatados
    const dataToSend = {
      ...formData,
      tipo_cadastro: tipoCadastro,
      cpf: formatCPF(formData.cpf),
      responsavel_cpf: formData.responsavel_cpf
        ? formatCPF(formData.responsavel_cpf)
        : undefined,
      cep: formData.cep ? formatCEP(formData.cep) : undefined,
      grau_atual:
        tipoCadastro === "ALUNO" ? Number(formData.grau_atual) : undefined,
      // Converter strings vazias para null/undefined para campos UUID e opcionais
      unidade_id: formData.unidade_id || undefined,
      created_by: formData.created_by || undefined,
      updated_by: formData.updated_by || undefined,
      email: formData.email || undefined,
      logradouro: formData.logradouro || undefined,
      numero: formData.numero || undefined,
      complemento: formData.complemento || undefined,
      bairro: formData.bairro || undefined,
      cidade: formData.cidade || undefined,
      uf: formData.uf || undefined,
      observacoes: formData.observacoes || undefined,
      responsavel_nome: formData.responsavel_nome || undefined,
      responsavel_telefone: formData.responsavel_telefone || undefined,
      faixa_ministrante: formData.faixa_ministrante || undefined,
      data_inicio_docencia: formData.data_inicio_docencia || undefined,
      registro_profissional: formData.registro_profissional || undefined,
    };

    // Remover campos não necessários baseado no tipo
    if (tipoCadastro === "ALUNO") {
      delete dataToSend.faixa_ministrante;
      delete dataToSend.data_inicio_docencia;
      delete dataToSend.registro_profissional;
    } else {
      delete dataToSend.faixa_atual;
      delete dataToSend.grau_atual;
      delete dataToSend.responsavel_nome;
      delete dataToSend.responsavel_cpf;
      delete dataToSend.responsavel_telefone;
    }

    console.log("Enviando dados:", dataToSend);
    mutation.mutate(dataToSend);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      const match = numbers.match(/^(\d{2})(\d{5})(\d{4})$/);
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
      }
    }
    return value;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seleção de Tipo */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Tipo de Cadastro</h2>
          <div className="flex gap-4">
            <label className="label cursor-pointer flex items-center gap-2">
              <input
                type="radio"
                name="tipo"
                className="radio radio-primary"
                checked={tipoCadastro === "ALUNO"}
                onChange={() => {
                  setTipoCadastro("ALUNO");
                  setFormData((prev) => ({ ...prev, tipo_cadastro: "ALUNO" }));
                }}
                disabled={isEdit}
              />
              <span className="label-text">Aluno</span>
            </label>
            <label className="label cursor-pointer flex items-center gap-2">
              <input
                type="radio"
                name="tipo"
                className="radio radio-primary"
                checked={tipoCadastro === "PROFESSOR"}
                onChange={() => {
                  setTipoCadastro("PROFESSOR");
                  setFormData((prev) => ({
                    ...prev,
                    tipo_cadastro: "PROFESSOR",
                  }));
                }}
                disabled={isEdit}
              />
              <span className="label-text">Professor</span>
            </label>
          </div>
        </div>
      </div>

      {/* Dados Pessoais */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Dados Pessoais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Nome Completo *</span>
              </label>
              <input
                type="text"
                name="nome_completo"
                value={formData.nome_completo}
                onChange={handleChange}
                className="input input-bordered"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">CPF *</span>
              </label>
              <InputCPF
                value={formData.cpf}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, cpf: value }))
                }
                className="input input-bordered"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Data de Nascimento *</span>
              </label>
              <input
                type="date"
                name="data_nascimento"
                value={formData.data_nascimento}
                onChange={handleChange}
                className="input input-bordered"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Gênero</span>
              </label>
              <select
                name="genero"
                value={formData.genero}
                onChange={handleChange}
                className="select select-bordered"
              >
                <option value="">Selecione</option>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMININO">Feminino</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Telefone/WhatsApp *</span>
              </label>
              <input
                type="tel"
                name="telefone_whatsapp"
                value={formData.telefone_whatsapp}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    telefone_whatsapp: formatted,
                  }));
                }}
                className="input input-bordered"
                placeholder="(99) 99999-9999"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">E-mail</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input input-bordered"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Campos Específicos de Aluno */}
      {tipoCadastro === "ALUNO" && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Dados de Aluno</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Faixa Atual *</span>
                </label>
                <select
                  name="faixa_atual"
                  value={formData.faixa_atual}
                  onChange={handleChange}
                  className="select select-bordered"
                  required
                >
                  <option value="BRANCA">Branca</option>
                  <option value="CINZA">Cinza</option>
                  <option value="AMARELA">Amarela</option>
                  <option value="LARANJA">Laranja</option>
                  <option value="VERDE">Verde</option>
                  <option value="AZUL">Azul</option>
                  <option value="ROXA">Roxa</option>
                  <option value="MARROM">Marrom</option>
                  <option value="PRETA">Preta</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Grau</span>
                </label>
                <select
                  name="grau_atual"
                  value={formData.grau_atual}
                  onChange={handleChange}
                  className="select select-bordered"
                >
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
            </div>

            {/* Responsável (se menor de idade) */}
            {isMinor && (
              <>
                <div className="divider">
                  Dados do Responsável (obrigatório para menores)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nome do Responsável *</span>
                    </label>
                    <input
                      type="text"
                      name="responsavel_nome"
                      value={formData.responsavel_nome}
                      onChange={handleChange}
                      className="input input-bordered"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">CPF do Responsável *</span>
                    </label>
                    <InputCPF
                      value={formData.responsavel_cpf}
                      onChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          responsavel_cpf: value,
                        }))
                      }
                      className="input input-bordered"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">
                        Telefone do Responsável *
                      </span>
                    </label>
                    <input
                      type="tel"
                      name="responsavel_telefone"
                      value={formData.responsavel_telefone}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          responsavel_telefone: formatted,
                        }));
                      }}
                      className="input input-bordered"
                      placeholder="(99) 99999-9999"
                      required
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Campos Específicos de Professor */}
      {tipoCadastro === "PROFESSOR" && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Dados de Professor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Faixa Ministrante *</span>
                </label>
                <select
                  name="faixa_ministrante"
                  value={formData.faixa_ministrante}
                  onChange={handleChange}
                  className="select select-bordered"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="ROXA">Roxa</option>
                  <option value="MARROM">Marrom</option>
                  <option value="PRETA">Preta</option>
                  <option value="CORAL">Coral</option>
                  <option value="VERMELHA">Vermelha</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Data de Início da Docência</span>
                </label>
                <input
                  type="date"
                  name="data_inicio_docencia"
                  value={formData.data_inicio_docencia}
                  onChange={handleChange}
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Registro Profissional</span>
                </label>
                <input
                  type="text"
                  name="registro_profissional"
                  value={formData.registro_profissional}
                  onChange={handleChange}
                  className="input input-bordered"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Observações */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Observações</h2>
          <div className="form-control">
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              className="textarea textarea-bordered"
              rows={3}
              placeholder="Observações adicionais..."
            />
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <span className="loading loading-spinner"></span>
          ) : isEdit ? (
            "Atualizar"
          ) : (
            "Cadastrar"
          )}
        </button>
      </div>
    </form>
  );
}
