"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
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
import { Mail, Lock, AlertCircle, LogIn } from "lucide-react";

function LoginContent() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Verificar se está na seção de esqueci a senha
    if (window.location.hash === "#forgot-password") {
      setShowForgotPassword(true);
    }

    // 🔒 SEGURANÇA: Limpar credenciais da URL se existirem
    const email = searchParams.get("email");
    const password = searchParams.get("password");

    if (email || password) {
      // Remover credenciais da URL imediatamente
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      toast.error(
        "⚠️ ATENÇÃO DE SEGURANÇA: Nunca compartilhe URLs com senhas! As credenciais foram removidas.",
        {
          duration: 6000,
          position: "top-center",
        }
      );
      return;
    }

    const message = searchParams.get("message");
    if (message === "registration-success") {
      toast.success(
        "Cadastro realizado com sucesso! Faça login para continuar.",
        {
          duration: 4000,
          position: "top-center",
        }
      );
    } else if (message === "pending-approval") {
      toast(
        "⚠️ Cadastro realizado! Sua conta está aguardando aprovação do administrador. Você receberá um email quando for aprovado.",
        {
          duration: 8000,
          position: "top-center",
          icon: "⚠️",
          style: {
            background: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fbbf24",
          },
        }
      );
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await login(formData.email, formData.password);
    if (result.success) {
      // Verificar se o cadastro está completo
      if (result.user?.cadastro_completo === false) {
        toast("Complete seu cadastro para acessar o sistema", {
          icon: "\uD83D\uDCCB",
          duration: 3000,
        });
        router.push("/complete-profile");
      } else {
        router.push("/dashboard");
      }
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotPasswordEmail.trim()) {
      toast.error("Por favor, digite seu email");
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: forgotPasswordEmail.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro na requisição");
      }

      const data = await response.json();

      toast.success(
        data.message ||
          "Email de recuperação enviado! Verifique sua caixa de entrada.",
        {
          duration: 5000,
        }
      );

      setShowForgotPassword(false);
      setForgotPasswordEmail("");
      window.location.hash = "";
    } catch {
      toast.error("Erro ao enviar email de recuperação. Tente novamente.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail("");
    window.location.hash = "";
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Marca d'água de fundo */}
      <JiuJitsuWatermark />

      {/* Gradiente de fundo temático TeamCruz */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-red-900"></div>

      {/* Conteúdo principal */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-2 border-red-600/20 bg-black/90 backdrop-blur-md">
            <CardHeader className="space-y-1 text-center pb-8">
              {/* Logo TeamCruz */}
              <div className="flex justify-center mb-6">
                <TeamCruzLogo size={100} />
              </div>

              <CardTitle className="text-3xl font-bold text-white mb-2">
                TEAM CRUZ
              </CardTitle>
              <CardDescription className="text-red-400 font-medium text-lg">
                BRAZILIAN JIU-JITSU
              </CardDescription>
              <p className="text-gray-300 text-sm mt-2">
                Sistema de Gestão de Academia
              </p>
            </CardHeader>

            <CardContent className="px-6">
              {showForgotPassword ? (
                // Formulário de Recuperação de Senha
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">
                      Recuperar Senha
                    </h3>
                    <p className="text-gray-400">
                      Digite seu email para receber instruções de recuperação
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="forgot-email"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <Mail className="h-4 w-4 text-red-400" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      id="forgot-email"
                      value={forgotPasswordEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setForgotPasswordEmail(e.target.value)
                      }
                      placeholder="seu.email@teamcruz.com.br"
                      required
                      disabled={forgotPasswordLoading}
                      className="h-12 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold tracking-wide border border-red-500 shadow-lg shadow-red-900/50"
                      disabled={forgotPasswordLoading}
                    >
                      {forgotPasswordLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                          Enviando...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Mail className="h-5 w-5" />
                          Enviar Email de Recuperação
                        </span>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToLogin}
                      className="w-full h-12 border-2 border-gray-600 bg-gray-800/30 hover:bg-gray-700/50 text-white"
                      disabled={forgotPasswordLoading}
                    >
                      Voltar ao Login
                    </Button>
                  </div>
                </form>
              ) : (
                // Formulário de Login Normal
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-900/50 border border-red-600/50 rounded-lg p-4 flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                      <span className="text-red-200">{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <Mail className="h-4 w-4 text-red-400" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="seu.email@teamcruz.com.br"
                      required
                      disabled={isLoading}
                      className="h-12 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <Lock className="h-4 w-4 text-red-400" />
                      Senha
                    </Label>
                    <Input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Digite sua senha"
                      required
                      disabled={isLoading}
                      className="h-12 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold tracking-wide border border-red-500 shadow-lg shadow-red-900/50"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        Entrando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <LogIn className="h-5 w-5" />
                        ENTRAR
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {/* Link de cadastro */}
              <div className="text-center mt-6">
                <p className="text-gray-400 text-sm">
                  Não tem uma conta?{" "}
                  <Link
                    href="/register"
                    className="text-red-400 hover:text-red-300 font-medium transition-colors"
                  >
                    Cadastre-se aqui
                  </Link>
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-6 pt-6 px-6">
              {/* Links de apoio */}
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-red-400 hover:text-red-300 transition-colors bg-transparent border-none cursor-pointer"
                >
                  Esqueceu sua senha?
                </button>
                <span className="mx-3 text-gray-500">|</span>
                <a
                  href="#support"
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Suporte Técnico
                </a>
              </div>

              {/* Rodapé */}
              <div className="text-center text-xs text-gray-500 border-t border-gray-700 pt-4">
                <p>© 2025 Team Cruz Brazilian Jiu-Jitsu</p>
                <p className="mt-1">Aqui ninguém treina sozinho</p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
