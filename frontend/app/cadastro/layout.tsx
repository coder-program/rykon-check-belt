import React from "react";

// Layout público sem autenticação para a rota de cadastro via convite
export default function CadastroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
