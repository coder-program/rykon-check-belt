const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface RankingFrequencia {
  id: string;
  nome: string;
  totalPresencas: number;
  diasPresentes: number;
  taxaFrequencia: number;
  streak: number;
  percent: number;
}

export async function getRankingAlunosFrequencia(
  unidadeId?: string,
  limit: number = 10
): Promise<RankingFrequencia[]> {
  const token = localStorage.getItem("token");

  const queryParams = new URLSearchParams();
  if (unidadeId) queryParams.append("unidadeId", unidadeId);
  queryParams.append("limit", limit.toString());

  const url = `${API_URL}/presenca/alunos/ranking-frequencia${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Erro ao buscar ranking de frequência");
  }

  return response.json();
}
