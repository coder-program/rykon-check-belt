"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createAluno, createProfessor, listUnidades } from "@/lib/peopleApi";
import { InputCPF } from "@/components/form/InputCPF";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    defaultTipo
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

  // Estado para unidades adicionais do professor
  const [unidadesAdicionais, setUnidadesAdicionais] = useState<string[]>([]);

  const [isMinor, setIsMinor] = useState(false);

  // Carregar unidades disponíveis
  const { data: unidadesData } = useQuery({
    queryKey: ["unidades"],
    queryFn: () => listUnidades({ page: 1, pageSize: 100 }),
  });

  const unidadesDisponiveis = unidadesData?.items || [];

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setTipoCadastro(initialData.tipo_cadastro || defaultTipo);
      // Carregar unidades adicionais se for professor
      if (initialData.unidades && Array.isArray(initialData.unidades)) {
        const adiconais = initialData.unidades
          .filter((u: any) => !u.is_principal)
          .map((u: any) => u.id);
        setUnidadesAdicionais(adiconais);
      }
    } else {
      setTipoCadastro(defaultTipo);
      setFormData((prev) => ({ ...prev, tipo_cadastro: defaultTipo }));
    }
  }, [initialData, defaultTipo]);

  // Estados para controlar restrições de faixa por idade
  const [isUnder16, setIsUnder16] = useState(false);
  const [is16to18, setIs16to18] = useState(false);
  const [isOver18, setIsOver18] = useState(false);

  useEffect(() => {
    // Verificar restrições de idade apenas se data de nascimento for preenchida
    if (formData.data_nascimento) {
      const hoje = new Date();
      const nascimento = new Date(formData.data_nascimento);

      // Para menor de idade (18 anos) - cálculo preciso
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

      // Para faixas restritas - apenas verificar o ANO
      const anoAtual = hoje.getFullYear();
      const anoNascimento = nascimento.getFullYear();
      const idadePorAno = anoAtual - anoNascimento;

      setIsUnder16(idadePorAno < 16);
      setIs16to18(idadePorAno >= 16 && idadePorAno < 18);
      setIsOver18(idadePorAno >= 18);

      // Validações de faixa por idade
      if (
        idadePorAno < 16 &&
        ["AZUL", "ROXA", "MARROM", "PRETA"].includes(formData.faixa_atual)
      ) {
        setFormData((prev) => ({ ...prev, faixa_atual: "BRANCA" }));
        toast.error(
          "Alunos que fazem menos de 16 anos neste ano não podem ter faixas Azul, Roxa, Marrom ou Preta"
        );
      }

      // Nova regra: 16-18 anos só podem ter BRANCA, AZUL ou ROXA
      if (
        idadePorAno >= 16 &&
        idadePorAno < 18 &&
        !["BRANCA", "AZUL", "ROXA"].includes(formData.faixa_atual)
      ) {
        setFormData((prev) => ({ ...prev, faixa_atual: "BRANCA" }));
        toast.error(
          "Alunos de 16 a 17 anos podem ter apenas faixas Branca, Azul ou Roxa"
        );
      }

      // Nova regra: Maiores de 18 anos só podem ter faixas adultas (BRANCA, AZUL, ROXA, MARROM, PRETA)
      const faixasInfantisJuvenis = [
        "CINZA_BRANCA",
        "CINZA",
        "CINZA_PRETA",
        "AMARELA_BRANCA",
        "AMARELA",
        "AMARELA_PRETA",
        "LARANJA_BRANCA",
        "LARANJA",
        "LARANJA_PRETA",
        "VERDE_BRANCA",
        "VERDE",
        "VERDE_PRETA",
      ];

      if (
        idadePorAno >= 18 &&
        faixasInfantisJuvenis.includes(formData.faixa_atual)
      ) {
        setFormData((prev) => ({ ...prev, faixa_atual: "BRANCA" }));
        toast.error(
          "Pessoas maiores de 18 anos só podem ter faixas adultas: Branca, Azul, Roxa, Marrom ou Preta"
        );
      }
    } else {
      // Resetar estados se não houver data de nascimento
      setIsUnder16(false);
      setIs16to18(false);
      setIsOver18(false);
    }
  }, [formData.data_nascimento, formData.faixa_atual]);

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
        } cadastrado com sucesso!`
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
    // Validar apenas campos realmente obrigatórios
    if (
      !formData.nome_completo ||
      !formData.data_nascimento ||
      !formData.genero
    ) {
      toast.error(
        "Preencha todos os campos obrigatórios: Nome, Data de Nascimento e Gênero"
      );
      return;
    }

    // Validar campos específicos por tipo
    if (tipoCadastro === "ALUNO" && !formData.faixa_atual) {
      toast.error("Faixa é obrigatória para alunos");
      return;
    }

    // Validar regra de idade para faixas restritas
    if (tipoCadastro === "ALUNO" && isUnder16) {
      const faixasRestritas = ["AZUL", "ROXA", "MARROM", "PRETA"];
      if (faixasRestritas.includes(formData.faixa_atual)) {
        toast.error(
          "Alunos menores de 16 anos não podem ter faixas Azul, Roxa, Marrom ou Preta"
        );
        return;
      }
    }

    if (tipoCadastro === "PROFESSOR" && !formData.faixa_ministrante) {
      toast.error("Faixa ministrante é obrigatória para professores");
      return;
    }

    // Validar unidade principal para professor
    if (tipoCadastro === "PROFESSOR" && !formData.unidade_id) {
      toast.error("Selecione a unidade principal do professor");
      return;
    }

    // Preparar dados formatados (remover formatação de CPF/telefone)
    const dataToSend: any = {
      ...formData,
      tipo_cadastro: tipoCadastro,
      cpf: formData.cpf.replace(/\D/g, ""), // Remove formatação, mantém apenas números
      responsavel_cpf: formData.responsavel_cpf
        ? formData.responsavel_cpf.replace(/\D/g, "") // Remove formatação, mantém apenas números
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

    // Adicionar unidades adicionais se for professor
    if (tipoCadastro === "PROFESSOR" && unidadesAdicionais.length > 0) {
      dataToSend.unidades_adicionais = unidadesAdicionais;
    }

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
    >
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
      {/* Dados Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>
            Informações básicas do{" "}
            {tipoCadastro === "ALUNO" ? "aluno" : "professor"}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                <span className="label-text">CPF</span>
              </label>
              <InputCPF
                value={formData.cpf}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, cpf: value }))
                }
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
                <span className="label-text">Gênero *</span>
              </label>
              <select
                name="genero"
                value={formData.genero}
                onChange={handleChange}
                className="select select-bordered"
                required
              >
                <option value="">Selecione</option>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMININO">Feminino</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Telefone/WhatsApp</span>
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
        </CardContent>
      </Card>

      {/* Campos Específicos de Aluno */}
      {tipoCadastro === "ALUNO" && (
        <Card>
          <CardHeader>
            <CardTitle>Dados de Aluno</CardTitle>
            <CardDescription>
              Informações de graduação e responsabilidade
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  disabled={!formData.data_nascimento}
                  required
                >
                  {!formData.data_nascimento ? (
                    <option value="">
                      Preencha a data de nascimento primeiro
                    </option>
                  ) : (
                    <>
                      <option value="BRANCA">Branca</option>
                      <option
                        value="CINZA_BRANCA"
                        disabled={is16to18 || isOver18}
                      >
                        Cinza Branca{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option value="CINZA" disabled={is16to18 || isOver18}>
                        Cinza{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option
                        value="CINZA_PRETA"
                        disabled={is16to18 || isOver18}
                      >
                        Cinza Preta{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option
                        value="AMARELA_BRANCA"
                        disabled={is16to18 || isOver18}
                      >
                        Amarela Branca{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option value="AMARELA" disabled={is16to18 || isOver18}>
                        Amarela{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option
                        value="AMARELA_PRETA"
                        disabled={is16to18 || isOver18}
                      >
                        Amarela Preta{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option
                        value="LARANJA_BRANCA"
                        disabled={is16to18 || isOver18}
                      >
                        Laranja Branca{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option value="LARANJA" disabled={is16to18 || isOver18}>
                        Laranja{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option
                        value="LARANJA_PRETA"
                        disabled={is16to18 || isOver18}
                      >
                        Laranja Preta{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option
                        value="VERDE_BRANCA"
                        disabled={is16to18 || isOver18}
                      >
                        Verde Branca{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option value="VERDE" disabled={is16to18 || isOver18}>
                        Verde{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option
                        value="VERDE_PRETA"
                        disabled={is16to18 || isOver18}
                      >
                        Verde Preta{" "}
                        {is16to18
                          ? "(Não permitida 16-17 anos)"
                          : isOver18
                          ? "(Apenas menores de 18 anos)"
                          : ""}
                      </option>
                      <option value="AZUL" disabled={isUnder16}>
                        Azul {isUnder16 ? "(Apenas +16 anos)" : ""}
                      </option>
                      <option value="ROXA" disabled={isUnder16}>
                        Roxa {isUnder16 ? "(Apenas +16 anos)" : ""}
                      </option>
                      <option value="MARROM" disabled={isUnder16 || is16to18}>
                        Marrom{" "}
                        {isUnder16
                          ? "(Apenas +16 anos)"
                          : is16to18
                          ? "(Apenas +18 anos)"
                          : ""}
                      </option>
                      <option value="PRETA" disabled={isUnder16 || is16to18}>
                        Preta{" "}
                        {isUnder16
                          ? "(Apenas +16 anos)"
                          : is16to18
                          ? "(Apenas +18 anos)"
                          : ""}
                      </option>
                    </>
                  )}
                </select>
                {!formData.data_nascimento && (
                  <label className="label">
                    <span className="label-text-alt text-info">
                      ℹ️ Preencha a data de nascimento para liberar as opções de
                      faixa
                    </span>
                  </label>
                )}
                {isUnder16 && (
                  <label className="label">
                    <span className="label-text-alt text-warning">
                      ⚠️ Menores de 16 anos: apenas faixas infantis (Branca,
                      Cinza, Amarela, Laranja, Verde)
                    </span>
                  </label>
                )}
                {is16to18 && (
                  <label className="label">
                    <span className="label-text-alt text-warning">
                      ⚠️ De 16 a 17 anos: apenas Branca, Azul ou Roxa
                    </span>
                  </label>
                )}
                {isOver18 && (
                  <label className="label">
                    <span className="label-text-alt text-info">
                      ℹ️ Maiores de 18 anos: apenas faixas adultas (Branca,
                      Azul, Roxa, Marrom, Preta)
                    </span>
                  </label>
                )}
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
                <div className="divider">Dados do Responsável (opcional)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nome do Responsável</span>
                    </label>
                    <input
                      type="text"
                      name="responsavel_nome"
                      value={formData.responsavel_nome}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">CPF do Responsável</span>
                    </label>
                    <InputCPF
                      value={formData.responsavel_cpf}
                      onChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          responsavel_cpf: value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">
                        Telefone do Responsável
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
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Campos Específicos de Professor */}
      {tipoCadastro === "PROFESSOR" && (
        <Card>
          <CardHeader>
            <CardTitle>Dados de Professor</CardTitle>
            <CardDescription>
              Qualificações e unidades de atuação
            </CardDescription>
          </CardHeader>
          <CardContent>
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

            {/* Seleção de Unidades */}
            <div className="divider">Unidades</div>
            <div className="grid grid-cols-1 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Unidade Principal *</span>
                </label>
                <select
                  name="unidade_id"
                  value={formData.unidade_id}
                  onChange={handleChange}
                  className="select select-bordered"
                  required
                >
                  <option value="">Selecione a unidade principal</option>
                  {unidadesDisponiveis.map((unidade: any) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt text-info">
                    ℹ️ A unidade principal é onde o professor atua
                    prioritariamente
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    Unidades Adicionais (Opcional)
                  </span>
                </label>
                <div className="border border-base-300 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {unidadesDisponiveis
                    .filter((u: any) => u.id !== formData.unidade_id)
                    .map((unidade: any) => (
                      <label
                        key={unidade.id}
                        className="label cursor-pointer justify-start gap-3"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={unidadesAdicionais.includes(unidade.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUnidadesAdicionais([
                                ...unidadesAdicionais,
                                unidade.id,
                              ]);
                            } else {
                              setUnidadesAdicionais(
                                unidadesAdicionais.filter(
                                  (id) => id !== unidade.id
                                )
                              );
                            }
                          }}
                        />
                        <span className="label-text">{unidade.nome}</span>
                      </label>
                    ))}
                  {unidadesDisponiveis.filter(
                    (u: any) => u.id !== formData.unidade_id
                  ).length === 0 && (
                    <p className="text-sm text-gray-500">
                      Selecione uma unidade principal primeiro
                    </p>
                  )}
                </div>
                <label className="label">
                  <span className="label-text-alt text-info">
                    ℹ️ Selecione outras unidades onde o professor também pode
                    dar aulas
                  </span>
                </label>
              </div>

              {unidadesAdicionais.length > 0 && (
                <div className="alert alert-info">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="stroke-current shrink-0 w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span>
                    Professor vinculado a {unidadesAdicionais.length + 1}{" "}
                    unidade(s) no total
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
          <CardDescription>Anotações adicionais</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="outline">
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <span className="loading loading-spinner"></span>
          ) : isEdit ? (
            "Atualizar"
          ) : (
            "Cadastrar"
          )}
        </Button>
      </div>
    </form>
  );
}
