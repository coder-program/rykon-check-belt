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
import { Mail, Lock, AlertCircle, LogIn, Eye, EyeOff } from "lucide-react";

function LoginContent() {
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Verificar se está na seção de esqueci a senha
    if (window.location.hash === "#forgot-password") {
      setShowForgotPassword(true);
    }

    // Abrir painel de suporte se vier com hash #support
    if (window.location.hash === "#support") {
      setShowSupport(true);
      // pequena rolagem para garantir visibilidade do painel
      setTimeout(() => {
        document.getElementById("support")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
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

    // ⏰ Verificar se o usuário foi redirecionado por token expirado
    const expired = searchParams.get("expired");
    if (expired === "true") {
      toast.error("⏰ Sua sessão expirou! Por favor, faça login novamente.", {
        duration: 5000,
        position: "top-center",
        icon: "🔒",
      });
      // Limpar a query string da URL
      window.history.replaceState({}, document.title, "/login");
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
      // Limpar a query string da URL para evitar reexibição
      window.history.replaceState({}, document.title, "/login");
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
      // Limpar a query string da URL para evitar reexibição
      window.history.replaceState({}, document.title, "/login");
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

    const result = await login(formData.emailOrUsername, formData.password);
    if (result.success) {
      // Verificar se é franqueado primeiro - usando mesma lógica dos outros componentes
      const isFranqueado = result.user?.perfis?.some(
        (perfil: string | { nome?: string; name?: string }) => {
          if (typeof perfil === "string")
            return perfil.toLowerCase() === "franqueado";
          if (typeof perfil === "object" && perfil?.nome)
            return perfil.nome.toLowerCase() === "franqueado";
          if (typeof perfil === "object" && perfil?.name)
            return perfil.name.toLowerCase() === "franqueado";
          return String(perfil).toLowerCase() === "franqueado";
        }
      );

      // Verificar se é tablet_checkin
      const isTabletCheckin = result.user?.perfis?.some(
        (perfil: string | { nome?: string; name?: string }) => {
          if (typeof perfil === "string")
            return perfil.toLowerCase() === "tablet_checkin";
          if (typeof perfil === "object" && perfil?.nome)
            return perfil.nome.toLowerCase() === "tablet_checkin";
          if (typeof perfil === "object" && perfil?.name)
            return perfil.name.toLowerCase() === "tablet_checkin";
          return String(perfil).toLowerCase() === "tablet_checkin";
        }
      );

      if (isFranqueado) {
        // Franqueado SEMPRE vai para /minha-franquia (lá tem a tela de aceitar contrato)
        if (result.user?.cadastro_completo === false) {
          toast("Complete o cadastro da sua franquia para acessar o sistema", {
            icon: "📋",
            duration: 3000,
          });
        }
        router.push("/minha-franquia");
      } else if (isTabletCheckin) {
        // Tablet checkin sempre vai para a rota de check-in
        router.push("/checkin/tablet");
      } else if (result.user?.cadastro_completo === false) {
        // Outros perfis com cadastro incompleto vão para complete-profile
        toast("Complete seu cadastro para acessar o sistema", {
          icon: "📋",
          duration: 3000,
        });
        router.push("/complete-profile");
      } else {
        // Outros perfis com cadastro completo vão para dashboard
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

      // Verificar se o email foi encontrado
      if (data.found === false) {
        // Email não encontrado
        toast.error(data.message || "Email não encontrado no sistema.", {
          duration: 6000,
        });
        return;
      }

      // Email encontrado e processado com sucesso
      toast.success(
        data.message ||
          "Email de recuperação enviado com sucesso! Verifique sua caixa de entrada.",
        {
          duration: 5000,
        }
      );
    } catch (error) {
      console.error("Erro na recuperação de senha:", error);
      toast.error(
        "Erro ao processar solicitação. Verifique sua conexão e tente novamente."
      );
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
                      htmlFor="emailOrUsername"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <Mail className="h-4 w-4 text-red-400" />
                      E-mail ou Username
                    </Label>
                    <Input
                      type="text"
                      id="emailOrUsername"
                      name="emailOrUsername"
                      value={formData.emailOrUsername}
                      onChange={handleChange}
                      placeholder="seu.email@teamcruz.com.br ou seu.username"
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
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Digite sua senha"
                        required
                        disabled={isLoading}
                        className="h-12 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors"
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
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
                <button
                  type="button"
                  onClick={() => {
                    setShowSupport(true);
                    window.location.hash = "#support";
                    setTimeout(() => {
                      document.getElementById("support")?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }, 50);
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors bg-transparent border-none cursor-pointer"
                >
                  Suporte Técnico
                </button>
              </div>

              {/* Modal de Suporte */}
              {showSupport && (
                <>
                  {/* Overlay escuro */}
                  <div
                    className="fixed inset-0 bg-black/60 z-40"
                    onClick={() => {
                      setShowSupport(false);
                      setSupportEmail("");
                      setSupportMessage("");
                      if (window.location.hash === "#support") {
                        history.replaceState({}, "", window.location.pathname);
                      }
                    }}
                  />

                  {/* Modal */}
                  <div
                    id="support"
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
                  >
                    <div className="rounded-lg border-2 border-red-600/30 bg-gray-900 shadow-2xl">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-gray-700 p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-red-400" />
                          <h3 className="font-bold text-white text-lg">
                            Suporte Técnico
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSupport(false);
                            setSupportEmail("");
                            setSupportMessage("");
                            if (window.location.hash === "#support") {
                              history.replaceState(
                                {},
                                "",
                                window.location.pathname
                              );
                            }
                          }}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                          aria-label="Fechar"
                        >
                          <span className="text-2xl">×</span>
                        </button>
                      </div>

                      {/* Body */}
                      <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-300">
                          Está com problemas para acessar? Descreva o que está
                          acontecendo e enviaremos um email para nossa equipe.
                        </p>

                        <div className="space-y-2">
                          <Label
                            htmlFor="support-email"
                            className="text-gray-200"
                          >
                            Seu email
                          </Label>
                          <Input
                            type="email"
                            id="support-email"
                            value={supportEmail}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) => setSupportEmail(e.target.value)}
                            placeholder="seu.email@exemplo.com"
                            className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="support-message"
                            className="text-gray-200"
                          >
                            Descreva o problema
                          </Label>
                          <textarea
                            id="support-message"
                            value={supportMessage}
                            onChange={(
                              e: React.ChangeEvent<HTMLTextAreaElement>
                            ) => setSupportMessage(e.target.value)}
                            placeholder="Ex: Não consigo fazer login, minha senha não está funcionando..."
                            rows={5}
                            className="w-full rounded-md bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 px-3 py-2 focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-700 p-4 space-y-3">
                        <a
                          href={`https://wa.me/5511960656955?text=${encodeURIComponent(
                            `Olá, preciso de suporte no login do Team Cruz.\n\nMeu email: ${
                              supportEmail || "(não informado)"
                            }\n\nProblema: ${
                              supportMessage || "Problema com acesso ao sistema"
                            }`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-full rounded-md border border-emerald-600/40 bg-emerald-600/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-600/20"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                </>
              )}

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
