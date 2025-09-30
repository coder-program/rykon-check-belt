"use client";

import { useState } from "react";
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
import { TeamCruzLogo } from "@/components/ui/teamcruz-logo";
import { JiuJitsuWatermark } from "@/components/ui/jiujitsu-watermark";
import { Mail, Lock, User, Phone, Calendar, AlertCircle, UserPlus, User2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/services/authService";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    password: "",
    confirmPassword: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

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
      await authService.register({
        nome: formData.nome,
        email: formData.email,
        password: formData.password,
        cpf: formData.cpf,
        telefone: formData.telefone,
        data_nascimento: formData.data_nascimento,
      });

      toast.success("Cadastro realizado com sucesso! Faça login para continuar.");
      router.push("/login?message=registration-success");
    } catch (error: unknown) {
      console.error("Erro no cadastro:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao realizar cadastro";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      <JiuJitsuWatermark />

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <TeamCruzLogo size={64} />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <UserPlus className="h-6 w-6 text-blue-600" />
              Criar Conta
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Cadastre-se para acessar o sistema TeamCruz
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium text-gray-700">
                Nome Completo
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="nome"
                  name="nome"
                  type="text"
                  required
                  value={formData.nome}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf" className="text-sm font-medium text-gray-700">
                CPF
              </Label>
              <div className="relative">
                <User2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="cpf"
                  name="cpf"
                  type="text"
                  required
                  value={formData.cpf}
                  onChange={handleCPFChange}
                  className="pl-10"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-sm font-medium text-gray-700">
                Telefone
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  required
                  value={formData.telefone}
                  onChange={handlePhoneChange}
                  className="pl-10"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_nascimento" className="text-sm font-medium text-gray-700">
                Data de Nascimento
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="data_nascimento"
                  name="data_nascimento"
                  type="date"
                  required
                  value={formData.data_nascimento}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="Repita sua senha"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Informações importantes:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Seu cadastro será criado com perfil de aluno</li>
                    <li>• Aguarde aprovação para acesso completo</li>
                    <li>• Em caso de dúvidas, entre em contato com sua academia</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Criando conta...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Criar Conta
                </div>
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Já tem uma conta?{" "}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Faça login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}