"use client";

import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, UserX, Menu } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm("Tem certeza que deseja sair?")) {
      logout();
      router.push("/login");
    }
  };

  const handleLogoutAll = () => {
    if (
      window.confirm(
        "Deseja encerrar TODAS as sessões em todos os dispositivos?\n\nVocê precisará fazer login novamente em todos os seus dispositivos."
      )
    ) {
      // Limpar token local
      logout();
      // Aqui você pode adicionar uma chamada ao backend para invalidar todos os tokens
      // await fetch('/auth/logout-all', { method: 'POST', ... });
      router.push("/login");
    }
  };

  // Não mostrar header nas páginas públicas
  if (!isAuthenticated) {
    return null;
  }

  // Pegar primeiro nome do usuário
  const firstName = user?.nome?.split(" ")[0] || "Usuário";

  // Determinar perfil para exibição
  const getPerfil = () => {
    if (!user?.perfis || user.perfis.length === 0) return "Usuário";
    
    const perfis = Array.isArray(user.perfis) ? user.perfis : [];
    const perfilNome = typeof perfis[0] === "string" 
      ? perfis[0] 
      : perfis[0]?.nome || perfis[0]?.name || "Usuário";
    
    return perfilNome;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logos */}
          <div className="flex items-center gap-4">
            {/* Logo TeamCruz */}
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push("/dashboard")}
              title="TeamCruz Jiu-Jitsu"
            >
              <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                <Image
                  src="/imgs/teamcruz.png"
                  alt="TeamCruz Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg font-bold text-gray-900">TeamCruz</h1>
                <p className="text-xs text-gray-600">Jiu-Jitsu</p>
              </div>
            </div>

            {/* Separador */}
            <div className="hidden lg:block h-8 w-px bg-gray-300"></div>

            {/* Logo Rykon */}
            <div className="hidden lg:flex items-center gap-2" title="Desenvolvido por Rykon">
              <div className="relative w-24 h-10">
                <Image
                  src="/imgs/logorykon.png"
                  alt="Rykon Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Desktop: Info do Usuário e Ações */}
          <div className="hidden md:flex items-center gap-4">
            {/* Saudação */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                Olá, {firstName}!
              </p>
              <p className="text-xs text-gray-500">{getPerfil()}</p>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2">
              {/* Encerrar Todas as Sessões */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogoutAll}
                className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                title="Encerrar todas as sessões"
              >
                <UserX className="h-4 w-4" />
                <span className="hidden lg:inline">Encerrar Todas</span>
              </Button>

              {/* Sair */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sair</span>
              </Button>
            </div>
          </div>

          {/* Mobile: Menu Button */}
          <div className="md:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-3">
              {/* Info do Usuário */}
              <div className="px-4 py-2 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  {user?.nome}
                </p>
                <p className="text-xs text-gray-500">{getPerfil()}</p>
              </div>

              {/* Botões Mobile */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogoutAll();
                  }}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Encerrar Todas as Sessões
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
