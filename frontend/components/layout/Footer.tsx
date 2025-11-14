"use client";

import { useAuth } from "@/app/auth/AuthContext";
import Image from "next/image";

export default function Footer() {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();

  // Não mostrar footer nas páginas públicas
  if (!isAuthenticated) {
    return null;
  }

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* TeamCruz Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <Image
                  src="/imgs/teamcruz.png"
                  alt="TeamCruz Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold">TeamCruz</h3>
                <p className="text-sm text-gray-400">Jiu-Jitsu Academy</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Sistema de gestão completo para academias de Jiu-Jitsu.
            </p>
            <p className="text-sm text-gray-400">
              © {currentYear} TeamCruz Jiu-Jitsu. Todos os direitos reservados.
            </p>
          </div>

          {/* Desenvolvido por Rykon - Alinhado à direita */}
          <div className="space-y-4 md:text-right md:ml-auto">
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Desenvolvido por
            </h4>
            <div className="space-y-3 md:flex md:flex-col md:items-end">
              <div className="relative w-32 h-12">
                <Image
                  src="/imgs/logorykonfooter.png"
                  alt="Rykon Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <p className="text-sm text-gray-400 max-w-xs">
                Soluções tecnológicas personalizadas para seu negócio.
              </p>
              <div className="flex gap-2 md:justify-end">
                <a
                  href="mailto:contato@rykon.com.br"
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  contato@rykon.com.br
                </a>
              </div>
              <a
                href="https://www.rykon.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Image
                  src="/imgs/simbolorykon.png"
                  alt="Rykon"
                  width={20}
                  height={20}
                  className="object-contain"
                />
                <span>www.rykon.com.br</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
