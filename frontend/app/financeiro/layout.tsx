"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FinanceiroNav from "@/components/financeiro/FinanceiroNav";

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
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

      console.log("🔍 [FINANCEIRO LAYOUT] Perfis:", userPerfis);
      console.log("🎓 [FINANCEIRO LAYOUT] É aluno?", isAluno);

      if (isAluno) {
        console.log(
          "❌ [FINANCEIRO LAYOUT] Aluno tentou acessar financeiro - redirecionando"
        );
        router.push("/dashboard");
        return;
      }

      setHasAccess(true);
    }
    setLoading(false);
  }, [router]);

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <FinanceiroNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
