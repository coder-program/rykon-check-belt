"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NameInput } from "@/components/ui/name-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamCruzLogo } from "@/components/ui/teamcruz-logo";
import { JiuJitsuWatermark } from "@/components/ui/jiujitsu-watermark";
import {
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  AlertCircle,
  UserPlus,
  User2,
  CheckCircle,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/services/authService";
import {
  getPerfis,
  type Perfil,
  getUnidadesAtivas,
  type Unidade,
} from "@/lib/usuariosApi";
import {
  formatCPF,
  isValidCPF,
  getCPFValidationMessage,
  cleanCPF,
} from "@/lib/utils/cpf-validator";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nome: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    genero: "", // Adicionar gênero
    perfil_id: "", // Adicionar perfil selecionado
    unidade_id: "", // Adicionar unidade selecionada
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loadingPerfis, setLoadingPerfis] = useState(true);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [cpfError, setCpfError] = useState("");
  const [telefoneError, setTelefoneError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  // Carregar unidades ativas disponíveis
  useEffect(() => {
    const loadUnidades = async () => {
      try {
        const data = await getUnidadesAtivas();
        if (!data || !Array.isArray(data)) {
          console.error("Resposta da API de unidades inválida:", data);
          throw new Error("Formato de resposta inválido");
        }

        if (data.length === 0) {
          console.warn("Nenhuma unidade ativa encontrada");
          throw new Error("Nenhuma unidade disponível para cadastro");
        }

        setUnidades(data);
      } catch (error) {
        console.error("Erro ao carregar unidades:", error);
        toast.error("Não foi possível carregar as unidades disponíveis", {
          duration: 5000,
        });
      } finally {
        setLoadingUnidades(false);
      }
    };
    loadUnidades();
  }, []);

  // Carregar perfis disponíveis
  useEffect(() => {
    const loadPerfis = async () => {
      try {
        const data = await getPerfis();

        // Validar se data é um array
        if (!data || !Array.isArray(data)) {
          console.error("Resposta da API de perfis inválida:", data);
          throw new Error("Formato de resposta inválido");
        }

        // Filtrar apenas perfis públicos (aluno, responsavel)
        const perfisPublicos = data.filter(
          (p) =>
            p.nome.toLowerCase() === "aluno" ||
            p.nome.toLowerCase() === "responsavel"
        );

        if (perfisPublicos.length === 0) {
          console.warn("Nenhum perfil público encontrado");
          throw new Error("Nenhum perfil disponível");
        }

        setPerfis(perfisPublicos);

        // Definir "aluno" como padrão
        const perfilAluno = perfisPublicos.find(
          (p) => p.nome.toLowerCase() === "aluno"
        );
        if (perfilAluno) {
          setFormData((prev) => ({ ...prev, perfil_id: perfilAluno.id }));
        } else {
          console.warn(
            "Perfil 'aluno' não encontrado, usando primeiro perfil disponível"
          );
          setFormData((prev) => ({ ...prev, perfil_id: perfisPublicos[0].id }));
        }
      } catch (error) {
        console.error("Erro ao carregar perfis:", error);
        // Se falhar, não envia perfil_id (backend usará "aluno" como padrão)
        setPerfis([
          {
            id: "", // Deixa vazio para usar padrão do backend
            nome: "Aluno",
            descricao: "Perfil padrão (auto-selecionado)",
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        setFormData((prev) => ({ ...prev, perfil_id: "" }));
        toast.error(
          "Não foi possível carregar os perfis. Você será cadastrado como Aluno.",
          { duration: 5000 }
        );
      } finally {
        setLoadingPerfis(false);
      }
    };
    loadPerfis();
  }, []);

  // useEffect para formatar telefone automaticamente quando dados vierem do banco
  useEffect(() => {
    if (
      formData.telefone &&
      formData.telefone.replace(/\D/g, "").length >= 10
    ) {
      const formatted = formatPhone(formData.telefone);
      if (formatted !== formData.telefone) {
        setFormData((prev) => ({
          ...prev,
          telefone: formatted,
        }));
      }
    }
  }, [formData.telefone]); // Monitora mudanças no telefone

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");

    // Formatação progressiva baseada na quantidade de números
    if (numbers.length === 0) {
      return "";
    } else if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(
        6
      )}`;
    } else {
      // Para celular com 11 dígitos: (11) 96065-6955
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
        7,
        11
      )}`;
    }
  };

  // Função para validar telefone - aceita tanto fixo quanto celular
  const isValidPhone = (phone: string): boolean => {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, "");

    // Aceita telefones com 10 dígitos (fixo) ou 11 dígitos (celular)
    if (cleaned.length < 10 || cleaned.length > 11) return false;

    // Se tem 10 ou 11 dígitos, considera válido (flexível para dados vindos do banco)
    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // FORÇA a formatação sempre, independente do valor de entrada
    const inputValue = e.target.value;

    // Se o usuário colou um número só com dígitos, força formatação
    const formatted = formatPhone(inputValue);

    setFormData({
      ...formData,
      telefone: formatted,
    });

    // Validação em tempo real mais robusta
    const numbers = formatted.replace(/\D/g, "");

    if (numbers.length === 0) {
      setTelefoneError("");
    } else if (numbers.length < 10) {
      setTelefoneError("Telefone deve ter pelo menos 10 dígitos");
    } else if (numbers.length > 11) {
      setTelefoneError("Telefone deve ter no máximo 11 dígitos");
    } else if (numbers.length === 10 || numbers.length === 11) {
      // Para números completos, aceita qualquer formato
      setTelefoneError(""); // Telefone válido
    }

    if (error) setError("");
  };

  // UseEffect para garantir formatação quando o valor do telefone muda
  useEffect(() => {
    if (formData.telefone) {
      const formatted = formatPhone(formData.telefone);
      if (formatted !== formData.telefone) {
        setFormData((prev) => ({
          ...prev,
          telefone: formatted,
        }));
      }
    }
  }, [formData.telefone]);

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData({
      ...formData,
      cpf: formatted,
    });

    // Validação em tempo real do CPF
    if (formatted.length >= 14) {
      // CPF completo formatado
      const validationMessage = getCPFValidationMessage(formatted);
      setCpfError(validationMessage || "");
    } else {
      setCpfError("");
    }

    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.nome.trim()) {
      setError("Nome é obrigatório");
      return false;
    }
    if (!formData.username.trim()) {
      setError("Username é obrigatório");
      return false;
    }
    if (!/^[a-zA-Z0-9.]+$/.test(formData.username)) {
      setError("Username deve conter apenas letras, números e ponto");
      return false;
    }
    if (formData.username.length < 3) {
      setError("Username deve ter pelo menos 3 caracteres");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email é obrigatório");
      return false;
    }
    // Validação completa do CPF
    const cpfValidationMessage = getCPFValidationMessage(formData.cpf);
    if (cpfValidationMessage) {
      setError(cpfValidationMessage);
      return false;
    }
    if (!formData.password) {
      setError("Senha é obrigatória");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Senhas não coincidem");
      return false;
    }
    if (!formData.telefone.trim()) {
      setError("Telefone é obrigatório");
      return false;
    }
    // REMOVIDA VALIDAÇÃO ESPECÍFICA DE TELEFONE - aceita qualquer valor preenchido
    if (!formData.data_nascimento) {
      setError("Data de nascimento é obrigatória");
      return false;
    }
    if (!formData.genero) {
      setError("Gênero é obrigatório");
      return false;
    }
    if (!formData.unidade_id) {
      setError("Seleção da unidade é obrigatória");
      return false;
    }

    // Validar idade mínima de 10 anos
    const dataNascimento = new Date(formData.data_nascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = dataNascimento.getMonth();

    // Ajustar idade se ainda não fez aniversário este ano
    if (
      mesAtual < mesNascimento ||
      (mesAtual === mesNascimento && hoje.getDate() < dataNascimento.getDate())
    ) {
      idade--;
    }

    if (idade < 10) {
      setError("Idade mínima para cadastro é de 10 anos");
      return false;
    }

    // perfil_id é opcional - se não selecionado, backend usa "aluno" como padrão

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const registerData: {
        nome: string;
        username: string;
        email: string;
        password: string;
        cpf: string;
        telefone: string;
        data_nascimento: string;
        genero?: string;
        perfil_id?: string;
        unidade_id?: string;
      } = {
        nome: formData.nome,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        cpf: cleanCPF(formData.cpf), // Remove pontos, traços e outros caracteres, mantendo apenas números
        telefone: formData.telefone.replace(/\D/g, ""), // Remove formatação do telefone também
        data_nascimento: formData.data_nascimento,
        genero: formData.genero || "OUTRO", // Incluir gênero
        unidade_id: formData.unidade_id,
      };

      // Adicionar perfil_id apenas se tiver valor e for um UUID válido
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (formData.perfil_id && uuidRegex.test(formData.perfil_id)) {
        registerData.perfil_id = formData.perfil_id;
      } else if (formData.perfil_id) {
        console.warn("perfil_id inválido, não enviando:", formData.perfil_id);
      }

      await authService.register(registerData);

      // Verificar se o perfil escolhido requer aprovação
      const perfilEscolhido = perfis.find((p) => p.id === formData.perfil_id);
      const requerAprovacao = perfilEscolhido?.nome.toLowerCase() !== "aluno";

      if (requerAprovacao) {
        router.push("/login?message=pending-approval");
      } else {
        router.push("/login?message=registration-success");
      }
    } catch (error: unknown) {
      console.error("Erro no cadastro:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao realizar cadastro";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Marca d'água de fundo */}
      <JiuJitsuWatermark />

      {/* Gradiente de fundo temático TeamCruz */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-red-900"></div>

      {/* Conteúdo principal */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="shadow-2xl border-2 border-red-600/20 bg-black/90 backdrop-blur-md">
            <CardHeader className="space-y-1 text-center pb-6">
              {/* Logo TeamCruz */}
              <div className="flex justify-center mb-4">
                <TeamCruzLogo size={80} />
              </div>

              <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                <UserPlus className="h-6 w-6 text-red-400" />
                CRIAR CONTA
              </CardTitle>
              <CardDescription className="text-gray-300 mt-2">
                Cadastre-se para acessar o sistema TeamCruz
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="px-6 space-y-4">
                {error && (
                  <div className="bg-red-900/50 border border-red-600/50 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <span className="text-red-200">{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="nome"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <User className="h-4 w-4 text-red-400" />
                      Nome Completo
                    </Label>
                    <NameInput
                      id="nome"
                      name="nome"
                      required
                      value={formData.nome}
                      onChange={handleChange}
                      className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <User className="h-4 w-4 text-red-400" />
                      Username
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="seu.username (letras, números e ponto)"
                      minLength={3}
                    />
                    <p className="text-xs text-gray-400">
                      Usado para login. Apenas letras, números e ponto (sem
                      espaços)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <Mail className="h-4 w-4 text-red-400" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="cpf"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <User2 className="h-4 w-4 text-red-400" />
                      CPF
                    </Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      type="text"
                      required
                      value={formData.cpf}
                      onChange={handleCPFChange}
                      className={`h-11 bg-gray-800/50 text-white placeholder-gray-400 focus:ring-red-500 ${
                        cpfError
                          ? "border-red-500 focus:border-red-600"
                          : formData.cpf.length >= 14 &&
                            !cpfError &&
                            isValidCPF(formData.cpf)
                          ? "border-green-500 focus:border-green-600"
                          : "border-gray-600 focus:border-red-500"
                      }`}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                    {cpfError && (
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{cpfError}</span>
                      </div>
                    )}
                    {!cpfError &&
                      formData.cpf.length >= 14 &&
                      isValidCPF(formData.cpf) && (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          <span>CPF válido</span>
                        </div>
                      )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="telefone"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <Phone className="h-4 w-4 text-red-400" />
                      Telefone
                    </Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      type="tel"
                      required
                      value={formData.telefone}
                      onChange={handlePhoneChange}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                        // Força formatação ao sair do campo
                        const formatted = formatPhone(e.target.value);
                        if (formatted !== formData.telefone) {
                          setFormData((prev) => ({
                            ...prev,
                            telefone: formatted,
                          }));
                        }
                      }}
                      className={`h-11 bg-gray-800/50 text-white placeholder-gray-400 focus:ring-red-500 ${
                        telefoneError
                          ? "border-red-500 focus:border-red-600"
                          : formData.telefone && isValidPhone(formData.telefone)
                          ? "border-green-500 focus:border-green-600"
                          : "border-gray-600 focus:border-red-500"
                      }`}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                    {telefoneError && (
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{telefoneError}</span>
                      </div>
                    )}
                    {!telefoneError &&
                      formData.telefone &&
                      isValidPhone(formData.telefone) && (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          <span>Telefone válido</span>
                        </div>
                      )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="data_nascimento"
                    className="flex items-center gap-2 text-gray-200"
                  >
                    <Calendar className="h-4 w-4 text-red-400" />
                    Data de Nascimento
                  </Label>
                  <Input
                    id="data_nascimento"
                    name="data_nascimento"
                    type="date"
                    required
                    value={formData.data_nascimento}
                    onChange={handleChange}
                    max={(() => {
                      const hoje = new Date();
                      const dataMaxima = new Date(
                        hoje.getFullYear() - 10,
                        hoje.getMonth(),
                        hoje.getDate()
                      );
                      return dataMaxima.toISOString().split("T")[0];
                    })()}
                    className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-400">Idade mínima: 10 anos</p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="genero"
                    className="flex items-center gap-2 text-gray-200"
                  >
                    <User2 className="h-4 w-4 text-red-400" />
                    Gênero *
                  </Label>
                  <Select
                    value={formData.genero}
                    onValueChange={(value) =>
                      setFormData({ ...formData, genero: value })
                    }
                  >
                    <SelectTrigger className="h-11 bg-gray-800/50 border-gray-600 text-white focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="MASCULINO" className="text-white">
                        Masculino
                      </SelectItem>
                      <SelectItem value="FEMININO" className="text-white">
                        Feminino
                      </SelectItem>
                      <SelectItem value="OUTRO" className="text-white">
                        Outro
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="unidade"
                    className="flex items-center gap-2 text-gray-200"
                  >
                    <Building2 className="h-4 w-4 text-red-400" />
                    Unidade *
                  </Label>
                  <Select
                    value={formData.unidade_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unidade_id: value })
                    }
                    disabled={loadingUnidades}
                  >
                    <SelectTrigger className="h-11 bg-gray-800/50 border-gray-600 text-white focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={
                          loadingUnidades
                            ? "Carregando unidades..."
                            : "Selecione a unidade"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {unidades.map((unidade) => (
                        <SelectItem
                          key={unidade.id}
                          value={unidade.id}
                          className="text-white hover:bg-gray-700 focus:bg-gray-700"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{unidade.nome}</span>
                            {(unidade.cidade || unidade.bairro) && (
                              <span className="text-xs text-gray-400">
                                {unidade.cidade}
                                {unidade.cidade && unidade.bairro ? " - " : ""}
                                {unidade.bairro}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">
                    Selecione a unidade onde deseja se cadastrar
                  </p>
                  {formData.unidade_id && (
                    <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3 mt-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-200">
                          <strong>Unidade selecionada:</strong> Seu cadastro
                          será direcionado para aprovação pelos responsáveis
                          desta unidade.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="perfil"
                    className="flex items-center gap-2 text-gray-200"
                  >
                    <User2 className="h-4 w-4 text-red-400" />
                    Perfil *
                  </Label>
                  <Select
                    value={formData.perfil_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, perfil_id: value })
                    }
                    disabled={loadingPerfis}
                  >
                    <SelectTrigger className="h-11 bg-gray-800/50 border-gray-600 text-white focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Selecione seu perfil" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {perfis.map((perfil) => (
                        <SelectItem
                          key={perfil.id}
                          value={perfil.id}
                          className="text-white hover:bg-gray-700 focus:bg-gray-700"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{perfil.nome}</span>
                            {perfil.descricao && (
                              <span className="text-xs text-gray-400">
                                {perfil.descricao}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">
                    Selecione o perfil que melhor descreve você no sistema
                  </p>
                  {formData.perfil_id &&
                    perfis
                      .find((p) => p.id === formData.perfil_id)
                      ?.nome.toLowerCase() !== "aluno" && (
                      <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3 mt-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-yellow-200">
                            <strong>Atenção:</strong> Cadastros com perfil de{" "}
                            <strong className="text-yellow-100">
                              {
                                perfis.find((p) => p.id === formData.perfil_id)
                                  ?.nome
                              }
                            </strong>{" "}
                            requerem aprovação do administrador. Sua conta
                            ficará inativa até a aprovação.
                          </p>
                        </div>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <Lock className="h-4 w-4 text-red-400" />
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 pr-10"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <Lock className="h-4 w-4 text-red-400" />
                      Confirmar Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 pr-10"
                        placeholder="Repita sua senha"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mt-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-100">
                      <p className="font-medium mb-1">
                        Informações importantes:
                      </p>
                      <ul className="space-y-1 text-xs text-blue-200">
                        <li>• Selecione a unidade onde deseja se cadastrar</li>
                        <li>
                          • Selecione o perfil adequado ao seu papel no sistema
                        </li>
                        <li>
                          • Seu cadastro será enviado para aprovação da unidade
                          selecionada
                        </li>
                        <li>
                          • Em caso de dúvidas, entre em contato com sua
                          academia
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 px-6 pb-6">
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold tracking-wide border border-red-500 shadow-lg shadow-red-900/50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Criando conta...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      CRIAR CONTA
                    </span>
                  )}
                </Button>

                <div className="text-center text-sm">
                  <p className="text-gray-400">
                    Já tem uma conta?{" "}
                    <Link
                      href="/login"
                      className="text-red-400 hover:text-red-300 font-medium transition-colors"
                    >
                      Faça login
                    </Link>
                  </p>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
