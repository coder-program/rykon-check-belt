"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import FinanceiroNav from "@/components/financeiro/FinanceiroNav";

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      const userPerfis = (user.perfis || []).map((p: any) =>
        typeof p === "string" ? p.toLowerCase() : p?.nome?.toLowerCase()
      );

      const isAluno = userPerfis.includes("aluno");

      // Alunos só podem acessar /financeiro/minhas-faturas
      if (isAluno) {
        if (pathname === "/financeiro/minhas-faturas") {
          setHasAccess(true);
        } else {
          router.push("/dashboard");
          return;
        }
      } else {
        setHasAccess(true);
      }
    }
    setLoading(false);
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  // Verificar se é aluno para ocultar a navegação lateral
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;
  const userPerfis = (user?.perfis || []).map((p: any) =>
    typeof p === "string" ? p.toLowerCase() : p?.nome?.toLowerCase()
  );
  const isAluno = userPerfis.includes("aluno");

  return (
    <div className="flex min-h-screen bg-gray-50">
      {!isAluno && <FinanceiroNav />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
