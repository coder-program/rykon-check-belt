import { useEffect, useState } from "react";

interface Permissoes {
  podeAcessarDashboardFinanceiro: boolean;
  podeAcessarFaturas: boolean;
  podeAcessarDespesas: boolean;
  podeAcessarTransacoes: boolean;
  podeAcessarExtrato: boolean;
  podeAcessarAssinaturas: boolean;
  podeAcessarVendasOnline: boolean;
  podeEnviarLinkPagamento: boolean;
}

export function usePermissoes() {
  const [permissoes, setPermissoes] = useState<Permissoes>({
    podeAcessarDashboardFinanceiro: false,
    podeAcessarFaturas: false,
    podeAcessarDespesas: false,
    podeAcessarTransacoes: false,
    podeAcessarExtrato: false,
    podeAcessarAssinaturas: false,
    podeAcessarVendasOnline: false,
    podeEnviarLinkPagamento: false,
  });

  const [perfis, setPerfis] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      const userPerfis = (user.perfis || []).map((p: any) =>
        typeof p === "string" ? p.toLowerCase() : p?.nome?.toLowerCase()
      );

      setPerfis(userPerfis);

      // Definir permissões baseadas no perfil
      const isAdmin = userPerfis.includes("admin");
      const isFranqueado = userPerfis.includes("franqueado");
      const isGerente =
        userPerfis.includes("gerente") ||
        userPerfis.includes("gerente_unidade");
      const isRecepcionista = userPerfis.includes("recepcionista");

      setPermissoes({
        // Dashboard completo: apenas admin, franqueado e gerente
        podeAcessarDashboardFinanceiro: isAdmin || isFranqueado || isGerente,

        // Faturas (A Receber): todos que trabalham na unidade
        podeAcessarFaturas:
          isAdmin || isFranqueado || isGerente || isRecepcionista,

        // Despesas (A Pagar): apenas admin, franqueado e gerente
        podeAcessarDespesas: isAdmin || isFranqueado || isGerente,

        // Transações: apenas admin, franqueado e gerente
        podeAcessarTransacoes: isAdmin || isFranqueado || isGerente,

        // Extrato: apenas admin, franqueado e gerente
        podeAcessarExtrato: isAdmin || isFranqueado || isGerente,

        // Assinaturas: apenas admin, franqueado e gerente
        podeAcessarAssinaturas: isAdmin || isFranqueado || isGerente,

        // Vendas Online: apenas admin, franqueado e gerente
        podeAcessarVendasOnline: isAdmin || isFranqueado || isGerente,

        // Enviar link de pagamento: todos que trabalham na unidade
        podeEnviarLinkPagamento:
          isAdmin || isFranqueado || isGerente || isRecepcionista,
      });
    }
    setLoading(false);
  }, []);

  return { permissoes, perfis, loading };
}
