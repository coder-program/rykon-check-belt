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
import { Mail, Lock, User, Phone, Calendar, AlertCircle, UserPlus, User2, Shield } from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/services/authService";
import { getPerfis, type Perfil } from "@/lib/usuariosApi";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    password: "",
    confirmPassword: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    perfil_id: "", // Adicionar perfil selecionado
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loadingPerfis, setLoadingPerfis] = useState(true);

  const router = useRouter();

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

        // Filtrar apenas perfis públicos (aluno, instrutor)
        const perfisPublicos = data.filter(
          (p) =>
            p.nome.toLowerCase() === "aluno" ||
            p.nome.toLowerCase() === "instrutor" ||
            p.nome.toLowerCase() === "professor"
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
          console.warn("Perfil 'aluno' não encontrado, usando primeiro perfil disponível");
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({
      ...formData,
      telefone: formatted,
    });
    if (error) setError("");
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData({
      ...formData,
      cpf: formatted,
    });
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.nome.trim()) {
      setError("Nome é obrigatório");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email é obrigatório");
      return false;
    }
    if (!formData.cpf.trim()) {
      setError("CPF é obrigatório");
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
    if (!formData.data_nascimento) {
      setError("Data de nascimento é obrigatória");
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
      const registerData: any = {
        nome: formData.nome,
        email: formData.email,
        password: formData.password,
        cpf: formData.cpf,
        telefone: formData.telefone,
        data_nascimento: formData.data_nascimento,
      };

      // Adicionar perfil_id apenas se tiver valor e for um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (formData.perfil_id && uuidRegex.test(formData.perfil_id)) {
        registerData.perfil_id = formData.perfil_id;
      } else if (formData.perfil_id) {
        console.warn("perfil_id inválido, não enviando:", formData.perfil_id);
      }

      const response = await authService.register(registerData);

      // Verificar se o perfil escolhido requer aprovação
      const perfilEscolhido = perfis.find((p) => p.id === formData.perfil_id);
      const requerAprovacao =
        perfilEscolhido?.nome.toLowerCase() !== "aluno";

      if (requerAprovacao) {
        toast.success(
          "Cadastro realizado! Aguarde aprovação do administrador para acessar o sistema.",
          { duration: 6000 }
        );
        router.push("/login?message=pending-approval");
      } else {
        toast.success("Cadastro realizado com sucesso! Faça login para continuar.");
        router.push("/login?message=registration-success");
      }
    } catch (error: unknown) {
      console.error("Erro no cadastro:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao realizar cadastro";
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
                    <Label htmlFor="nome" className="flex items-center gap-2 text-gray-200">
                      <User className="h-4 w-4 text-red-400" />
                      Nome Completo
                    </Label>
                    <Input
                      id="nome"
                      name="nome"
                      type="text"
                      required
                      value={formData.nome}
                      onChange={handleChange}
                      className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-gray-200">
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
                    <Label htmlFor="cpf" className="flex items-center gap-2 text-gray-200">
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
                      className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="flex items-center gap-2 text-gray-200">
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
                      className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_nascimento" className="flex items-center gap-2 text-gray-200">
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
                    className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perfil" className="flex items-center gap-2 text-gray-200">
                    <Shield className="h-4 w-4 text-red-400" />
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
                        <SelectItem key={perfil.id} value={perfil.id} className="text-white hover:bg-gray-700 focus:bg-gray-700">
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
                    perfis.find((p) => p.id === formData.perfil_id)?.nome.toLowerCase() !==
                      "aluno" && (
                      <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3 mt-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-yellow-200">
                            <strong>Atenção:</strong> Cadastros com perfil de{" "}
                            <strong className="text-yellow-100">
                              {perfis.find((p) => p.id === formData.perfil_id)?.nome}
                            </strong>{" "}
                            requerem aprovação do administrador. Sua conta ficará
                            inativa até a aprovação.
                          </p>
                        </div>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2 text-gray-200">
                      <Lock className="h-4 w-4 text-red-400" />
                      Senha
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-gray-200">
                      <Lock className="h-4 w-4 text-red-400" />
                      Confirmar Senha
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="Repita sua senha"
                    />
                  </div>
                </div>

                <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mt-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-100">
                      <p className="font-medium mb-1">Informações importantes:</p>
                      <ul className="space-y-1 text-xs text-blue-200">
                        <li>• Selecione o perfil adequado ao seu papel no sistema</li>
                        <li>• Aguarde aprovação para acesso completo</li>
                        <li>• Em caso de dúvidas, entre em contato com sua academia</li>
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
