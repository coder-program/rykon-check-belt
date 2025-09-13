"use client";

import { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
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
import { Mail, Lock, AlertCircle, LogIn, Crown } from "lucide-react";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

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
      router.push("/dashboard");
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const handleKeycloakLogin = () => {
    alert("Integração com Keycloak será implementada em breve!");
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

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-black text-gray-400">OU</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-2 border-gray-600 bg-gray-800/30 hover:bg-gray-700/50 text-white"
                  onClick={() =>
                    (window.location.href = `${
                      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001"
                    }/auth/google`)
                  }
                  disabled={isLoading}
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="h-5 w-5 mr-3"
                  />
                  Entrar com Google
                </Button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-6 pt-6 px-6">
              {/* Credenciais de demonstração com estilo TeamCruz */}
              <div className="w-full p-5 bg-gradient-to-r from-red-900/30 to-black/50 border border-red-600/30 rounded-lg">
                <h4 className="font-bold text-lg text-red-400 mb-3 flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Credenciais de Acesso
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Email:</span>
                    <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded">
                      admin@teamcruz.com
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Senha:</span>
                    <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded">
                      admin123
                    </span>
                  </div>
                </div>
              </div>

              {/* Links de apoio */}
              <div className="text-center text-sm">
                <a
                  href="#forgot-password"
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Esqueceu sua senha?
                </a>
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
                <p>© 2024 Team Cruz Brazilian Jiu-Jitsu</p>
                <p className="mt-1">Tradição • Disciplina • Excelência</p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
