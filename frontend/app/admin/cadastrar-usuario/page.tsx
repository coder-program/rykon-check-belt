"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUnidades, getMyFranqueado } from "@/lib/peopleApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  UserPlus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function CadastrarUsuarioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
    password: "",
    confirmPassword: "",
    perfil_id: "",
    unidade_id: "",
    ativo: false,
    // Campos específicos para PROFESSOR/INSTRUTOR
    data_nascimento: "",
    genero: "",
    faixa_ministrante: "",
    // Campos específicos para RECEPCIONISTA
    turno: "",
    horario_entrada: "",
    horario_saida: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Buscar perfis disponíveis
  const { data: perfisData } = useQuery({
    queryKey: ["perfis"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/perfis`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Erro ao carregar perfis");
      return response.json();
    },
  });

  // Buscar franqueado do usuário logado
  const { data: franqueado } = useQuery({
    queryKey: ["franqueado-me", user?.id],
    queryFn: getMyFranqueado,
    enabled: !!user?.id,
  });

  // Verificar se usuário logado é gerente de unidade
  const isGerenteUnidade = user?.perfis?.some((perfil: any) => {
    const perfilNome =
      typeof perfil === "string" ? perfil : perfil.nome || perfil.perfil;
    return (
      perfilNome?.toLowerCase() === "gerente_unidade" ||
      perfilNome?.toLowerCase() === "gerente"
    );
  });

  // Buscar unidades do franqueado ou do gerente
  const { data: unidadesData } = useQuery({
    queryKey: ["unidades-franqueado", franqueado?.id, user?.id],
    queryFn: async () => {
      // Se for gerente de unidade, buscar apenas a unidade dele
      if (isGerenteUnidade) {
        const result = await listUnidades({ pageSize: 1 });
        return result;
      }
      // Se for franqueado, buscar todas as unidades da franquia
      if (!franqueado?.id) return { items: [] };
      const result = await listUnidades({
        pageSize: 100,
        franqueado_id: franqueado.id,
      });
      return result;
    },
    enabled: !!user?.id,
  });

  const unidades = unidadesData?.items || [];
  const minhaUnidade =
    isGerenteUnidade && unidades.length > 0 ? unidades[0] : null;

  // Preencher unidade automaticamente se for gerente
  React.useEffect(() => {
    if (isGerenteUnidade && minhaUnidade && !formData.unidade_id) {
      setFormData((prev) => ({
        ...prev,
        unidade_id: minhaUnidade.id,
      }));
    }
  }, [isGerenteUnidade, minhaUnidade, formData.unidade_id]);

  // Filtrar apenas perfis que o usuário pode cadastrar
  const perfisDisponiveis = perfisData?.filter((perfil: any) => {
    // Gerente de unidade pode cadastrar: ALUNO, PROFESSOR, INSTRUTOR, RECEPCIONISTA, GERENTE_UNIDADE
    if (isGerenteUnidade) {
      return [
        "ALUNO",
        "GERENTE_UNIDADE",
        "RECEPCIONISTA",
        "PROFESSOR",
        "INSTRUTOR",
      ].includes(perfil.nome);
    }
    // Franqueado pode cadastrar todos os perfis operacionais
    return [
      "ALUNO",
      "GERENTE_UNIDADE",
      "RECEPCIONISTA",
      "PROFESSOR",
      "INSTRUTOR",
    ].includes(perfil.nome);
  });

  // Detectar o perfil selecionado
  const perfilSelecionado = perfisDisponiveis?.find(
    (p: any) => p.id === formData.perfil_id
  );
  const perfilNome = perfilSelecionado?.nome || "";
  const isProfessor = ["PROFESSOR", "INSTRUTOR"].includes(perfilNome);
  const isRecepcionista = perfilNome === "RECEPCIONISTA";
  const isAluno = perfilNome === "ALUNO";

  // Mutation para criar usuário
  const createUserMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar usuário");
      }

      return response.json();
    },
    onSuccess: () => {
      setSuccess("Usuário cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
      setTimeout(() => {
        // Se o franqueado marcou como ativo, ir para a lista de usuários ativos,
        // caso contrário, ir para a lista de pendentes
        if (formData.ativo) {
          router.push("/admin/usuarios");
        } else {
          router.push("/admin/usuarios-pendentes");
        }
      }, 1200);
    },
    onError: (error: Error) => {
      setError(error.message || "Erro ao cadastrar usuário");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validações
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (formData.password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (!formData.perfil_id) {
      setError("Selecione um perfil");
      return;
    }

    if (!formData.unidade_id) {
      setError("Selecione uma unidade");
      return;
    }

    // Enviar dados
    const { confirmPassword: _, ...dataToSend } = formData;

    // Gerar username único baseado no email (remover domínio e adicionar timestamp)
    const emailPart = formData.email.split("@")[0];
    const timestamp = Date.now().toString().slice(-6);
    const username = `${emailPart}${timestamp}`;

    // Validações específicas por perfil
    if (isProfessor) {
      if (!formData.data_nascimento) {
        setError("Data de nascimento é obrigatória para Professor/Instrutor");
        return;
      }
      if (!formData.genero) {
        setError("Gênero é obrigatório para Professor/Instrutor");
        return;
      }
      if (!formData.faixa_ministrante) {
        setError("Faixa ministrante é obrigatória para Professor/Instrutor");
        return;
      }
    }

    // Remover formatação de CPF e telefone (apenas números)
    const cpfSemFormatacao = formData.cpf.replace(/\D/g, "");
    const telefoneSemFormatacao = formData.telefone.replace(/\D/g, "");

    // Preparar payload com campos condicionais
    const payload: any = {
      username,
      nome: formData.nome,
      email: formData.email,
      cpf: cpfSemFormatacao,
      telefone: telefoneSemFormatacao,
      password: formData.password,
      perfil_ids: [formData.perfil_id],
      unidade_id: formData.unidade_id,
      ativo: !!formData.ativo,
    };

    // Adicionar campos específicos de Professor/Instrutor
    if (isProfessor) {
      payload.data_nascimento = formData.data_nascimento;
      payload.genero = formData.genero;
      payload.faixa_ministrante = formData.faixa_ministrante;
    }

    // Adicionar campos específicos de Recepcionista
    if (isRecepcionista) {
      if (formData.turno) payload.turno = formData.turno;
      if (formData.horario_entrada)
        payload.horario_entrada = formData.horario_entrada;
      if (formData.horario_saida)
        payload.horario_saida = formData.horario_saida;
    }

    createUserMutation.mutate(payload);
  };

  // Função para formatar campos de texto (apenas letras)
  const formatTextOnly = (value: string, maxLength: number = 150) => {
    return value
      .replace(/[^a-zA-ZÀ-ÿ\s\-']+/g, "") // Remove números e caracteres não permitidos
      .slice(0, maxLength); // Limita ao comprimento máximo
  };

  const handleChange = (field: string, value: string) => {
    // Aplicar formatação específica para campo nome
    if (field === "nome") {
      setFormData((prev) => ({
        ...prev,
        [field]: formatTextOnly(value, 150),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <UserPlus className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Cadastrar Usuário
            </h1>
          </div>
          <p className="text-gray-600">
            Adicione um novo gerente, recepcionista ou professor às suas
            unidades
          </p>
        </div>

        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Usuário</CardTitle>
            <CardDescription>
              Preencha os dados do novo colaborador
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Alertas */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">{success}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  placeholder="Ex: João Silva"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Ex: joao@email.com"
                  required
                />
              </div>

              {/* CPF e Telefone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => handleChange("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleChange("telefone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              {/* Perfil e Unidade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="perfil">Perfil *</Label>
                  <Select
                    value={formData.perfil_id}
                    onValueChange={(value) => handleChange("perfil_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {perfisDisponiveis?.map((perfil: any) => (
                        <SelectItem key={perfil.id} value={perfil.id}>
                          {perfil.nome.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="unidade">Unidade *</Label>
                  {isGerenteUnidade && minhaUnidade ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                      {minhaUnidade.nome}
                      <input
                        type="hidden"
                        name="unidade_id"
                        value={minhaUnidade.id}
                      />
                    </div>
                  ) : (
                    <Select
                      value={formData.unidade_id}
                      onValueChange={(value) =>
                        handleChange("unidade_id", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades.map((unidade: any) => (
                          <SelectItem key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Senha e Confirmação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                    placeholder="Digite a senha novamente"
                    required
                  />
                </div>
              </div>

              {/* ===== CAMPOS ESPECÍFICOS PARA PROFESSOR/INSTRUTOR ===== */}
              {isProfessor && (
                <>
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Dados Específicos de Professor/Instrutor
                    </h3>

                    {/* Data de Nascimento e Gênero */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor="data_nascimento">
                          Data de Nascimento *
                        </Label>
                        <Input
                          id="data_nascimento"
                          type="date"
                          value={formData.data_nascimento}
                          onChange={(e) =>
                            handleChange("data_nascimento", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="genero">Gênero *</Label>
                        <Select
                          value={formData.genero}
                          onValueChange={(value) =>
                            handleChange("genero", value)
                          }
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
                    </div>

                    {/* Faixa Ministrante */}
                    <div>
                      <Label htmlFor="faixa_ministrante">
                        Faixa Ministrante *
                      </Label>
                      <Select
                        value={formData.faixa_ministrante}
                        onValueChange={(value) =>
                          handleChange("faixa_ministrante", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a faixa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AZUL">Azul</SelectItem>
                          <SelectItem value="ROXA">Roxa</SelectItem>
                          <SelectItem value="MARROM">Marrom</SelectItem>
                          <SelectItem value="PRETA">Preta</SelectItem>
                          <SelectItem value="CORAL">Coral</SelectItem>
                          <SelectItem value="VERMELHA">Vermelha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* ===== CAMPOS ESPECÍFICOS PARA RECEPCIONISTA ===== */}
              {isRecepcionista && (
                <>
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Dados Específicos de Recepcionista
                    </h3>

                    {/* Turno */}
                    <div className="mb-4">
                      <Label htmlFor="turno">Turno de Trabalho</Label>
                      <Select
                        value={formData.turno}
                        onValueChange={(value) => handleChange("turno", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o turno (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANHA">Manhã</SelectItem>
                          <SelectItem value="TARDE">Tarde</SelectItem>
                          <SelectItem value="NOITE">Noite</SelectItem>
                          <SelectItem value="INTEGRAL">Integral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Horários */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="horario_entrada">
                          Horário de Entrada
                        </Label>
                        <Input
                          id="horario_entrada"
                          type="time"
                          value={formData.horario_entrada}
                          onChange={(e) =>
                            handleChange("horario_entrada", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="horario_saida">Horário de Saída</Label>
                        <Input
                          id="horario_saida"
                          type="time"
                          value={formData.horario_saida}
                          onChange={(e) =>
                            handleChange("horario_saida", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Ativo checkbox (apenas visível para franqueado) */}
              {franqueado?.id && (
                <div className="flex items-center gap-3">
                  <input
                    id="ativo"
                    type="checkbox"
                    checked={!!formData.ativo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ativo: e.target.checked,
                      }))
                    }
                  />
                  <Label htmlFor="ativo" className="mb-0">
                    Deixar ativo (pular aprovação)
                  </Label>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Cadastrar Usuário
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Importante:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    {formData.ativo
                      ? "Usuário será criado como ATIVO e poderá acessar o sistema imediatamente"
                      : "O usuário será criado como INATIVO até que você aprove o cadastro"}
                  </li>
                  <li>
                    Gerentes e recepcionistas precisam estar vinculados a uma
                    unidade
                  </li>
                  {isProfessor && (
                    <li>
                      Professores/Instrutores requerem: data de nascimento,
                      gênero e faixa ministrante
                    </li>
                  )}
                  {isRecepcionista && (
                    <li>
                      Para recepcionistas, você pode definir turno e horários de
                      trabalho (opcional)
                    </li>
                  )}
                  <li>
                    O usuário receberá um email com as credenciais de acesso
                    após aprovação
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
