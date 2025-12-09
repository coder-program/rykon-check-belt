"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Páginas que não devem ter Header/Footer
  const pagesWithoutHeaderFooter = [
    "/complete-profile",
    "/login",
    "/register",
    "/reset-password",
    "/cadastro-concluido",
  ];

  // Verificar se a rota começa com /cadastro/ (rotas de convite)
  const isCadastroRoute = pathname?.startsWith("/cadastro/");

  const shouldShowHeaderFooter =
    !pagesWithoutHeaderFooter.includes(pathname) && !isCadastroRoute;

  if (shouldShowHeaderFooter) {
    return (
      <>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </>
    );
  }

  return <main className="min-h-screen">{children}</main>;
}
