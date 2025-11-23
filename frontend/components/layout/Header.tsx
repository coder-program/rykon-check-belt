"use client";

import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, UserX, Menu, User, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutAllDialogOpen, setLogoutAllDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Formatar data e hora
  const formatDateTime = () => {
    const days = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];
    const dayName = days[currentTime.getDay()];
    const day = currentTime.getDate().toString().padStart(2, "0");
    const months = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const month = months[currentTime.getMonth()];
    const time = currentTime.toLocaleTimeString("pt-BR");

    return {
      date: `${dayName}, ${day} de ${month}`,
      time: time,
    };
  };

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    // Fecha o modal primeiro
    setLogoutDialogOpen(false);

    // Limpa o estado de autenticação
    logout();

    // Força redirecionamento usando window.location para evitar problemas com guards
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  };

  const handleLogoutAll = () => {
    setLogoutAllDialogOpen(true);
  };

  const confirmLogoutAll = async () => {
    try {
      // Primeiro fecha o modal
      setLogoutAllDialogOpen(false);

      // Aqui você pode adicionar uma chamada ao backend para invalidar todos os tokens
      // await fetch('/auth/logout-all', { method: 'POST', ... });

      // Limpar estado de autenticação
      logout();

      // Força recarregamento da página diretamente para o login
      // Isso evita problemas com o roteamento do Next.js
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    } catch (error) {
      console.error("Erro ao encerrar todas as sessões:", error);
      // Em caso de erro, força redirecionamento de qualquer forma
      logout();
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
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
    const perfilNome =
      typeof perfis[0] === "string"
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
            </div>

            {/* Separador */}
            <div className="hidden lg:block h-8 w-px bg-gray-300"></div>

            {/* Logo Rykon */}
            <div
              className="hidden lg:flex items-center gap-2"
              title="Desenvolvido por Rykon"
            >
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
            {/* Relógio */}
            <div className="text-center">
              <p className="text-xs text-gray-600">{formatDateTime().date}</p>
              <p className="text-sm font-bold text-gray-900">
                {formatDateTime().time}
              </p>
            </div>

            {/* Saudação */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                Olá, {firstName}!
              </p>
              <p className="text-xs text-gray-500">{getPerfil()}</p>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2">
              {/* Meu Perfil - mostrar para todos exceto franqueados inativos */}
              {(() => {
                const isFranqueado = user?.perfis?.some((p: any) => {
                  const perfilNome =
                    typeof p === "string" ? p : p?.nome || p?.perfil;
                  return perfilNome?.toLowerCase() === "franqueado";
                });
                const franqueadoAtivo = user?.franqueado_ativo !== false;
                return !isFranqueado || franqueadoAtivo;
              })() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/meu-perfil")}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-300 hover:from-blue-100 hover:to-blue-200 hover:shadow-md transition-all duration-200 font-medium"
                  title="Editar meu perfil"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline">Meu Perfil</span>
                </Button>
              )}

              {/* Encerrar Todas as Sessões - Desabilitado temporariamente */}
              {/* <Button
                variant="outline"
                size="sm"
                onClick={handleLogoutAll}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-300 hover:from-orange-100 hover:to-orange-200 hover:shadow-md transition-all duration-200 font-medium"
                title="Encerrar todas as sessões"
              >
                <UserX className="h-4 w-4" />
                <span className="hidden lg:inline">Encerrar Todas</span>
              </Button> */}

              {/* Sair */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600 hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
                title="Sair da conta"
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
                {/* Meu Perfil - mostrar para todos exceto franqueados inativos */}
                {(() => {
                  const isFranqueado = user?.perfis?.some((p: any) => {
                    const perfilNome =
                      typeof p === "string" ? p : p?.nome || p?.perfil;
                    return perfilNome?.toLowerCase() === "franqueado";
                  });
                  const franqueadoAtivo = user?.franqueado_ativo !== false;
                  return !isFranqueado || franqueadoAtivo;
                })() && (
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-300 hover:from-blue-100 hover:to-blue-200 hover:shadow-md transition-all duration-200 font-medium"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push("/meu-perfil");
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Meu Perfil
                  </Button>
                )}

                {/* Encerrar Todas as Sessões - Desabilitado temporariamente */}
                {/* <Button
                  variant="outline"
                  className="w-full justify-start bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-300 hover:from-orange-100 hover:to-orange-200 hover:shadow-md transition-all duration-200 font-medium"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogoutAll();
                  }}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Encerrar Todas as Sessões
                </Button> */}

                <Button
                  variant="outline"
                  className="w-full justify-start bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600 hover:from-red-600 hover:to-red-700 hover:shadow-lg transition-all duration-200 font-medium"
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

      {/* Modais de Confirmação */}
      <ConfirmDialog
        isOpen={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={confirmLogout}
        title="Tem certeza que deseja sair?"
        message="Você será desconectado e precisará fazer login novamente para acessar o sistema."
        confirmText="Sim, Sair"
        cancelText="Cancelar"
        type="danger"
        icon="logout"
        autoCloseOnConfirm={false}
      />

      <ConfirmDialog
        isOpen={logoutAllDialogOpen}
        onClose={() => setLogoutAllDialogOpen(false)}
        onConfirm={confirmLogoutAll}
        title="Encerrar Todas as Sessões?"
        message="Deseja encerrar TODAS as sessões em todos os dispositivos?

Você precisará fazer login novamente em todos os seus dispositivos."
        confirmText="Sim, Encerrar Todas"
        cancelText="Cancelar"
        type="warning"
        icon="userX"
        autoCloseOnConfirm={false}
      />
    </header>
  );
}
