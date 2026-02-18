import { useState, useEffect } from "react";

interface Unidade {
  id: string;
  nome: string;
}

interface UseFiltroUnidadeReturn {
  isFranqueado: boolean;
  unidades: Unidade[];
  unidadeSelecionada: string;
  unidadeIdAtual: string;
  setUnidadeSelecionada: (value: string) => void;
}

export function useFiltroUnidade(): UseFiltroUnidadeReturn {
  const [isFranqueado, setIsFranqueado] = useState(false);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todas");
  const [unidadeIdUsuario, setUnidadeIdUsuario] = useState<string>("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);

      const isFranqueadoUser = user.perfis?.some(
        (p: any) =>
          (typeof p === "string" && p.toLowerCase() === "franqueado") ||
          (typeof p === "object" && p?.nome?.toLowerCase() === "franqueado")
      );

      setIsFranqueado(isFranqueadoUser);
      const userUnidadeId = user.unidade_id || "";
      setUnidadeIdUsuario(userUnidadeId);

      // Se não for franqueado, inicializa com a unidade do usuário
      if (!isFranqueadoUser && userUnidadeId) {
        setUnidadeSelecionada(userUnidadeId);
      }

      if (isFranqueadoUser) {
        carregarUnidades();
      }
    }
  }, []);

  const carregarUnidades = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades?pageSize=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const unidadesData = data.items || data;
        setUnidades(unidadesData);
      }
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
    }
  };

  // Para franqueados: retorna a unidade selecionada (se não for "todas")
  // Para não-franqueados: sempre retorna a unidade do usuário
  const unidadeIdAtual = isFranqueado
    ? (unidadeSelecionada === "todas" ? "" : unidadeSelecionada)
    : unidadeIdUsuario;

  return {
    isFranqueado,
    unidades,
    unidadeSelecionada,
    unidadeIdAtual,
    setUnidadeSelecionada,
  };
}
