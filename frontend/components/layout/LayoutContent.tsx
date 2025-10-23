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

  const shouldShowHeaderFooter = !pagesWithoutHeaderFooter.includes(pathname);

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
