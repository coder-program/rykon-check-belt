const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Aula {
  id: string;
  unidade_id: string;
  nome: string;
  dia_semana: number;
  data_hora_inicio: string;
  data_hora_fim: string;
  tipo?: string;
  professor?: {
    id: string;
    nome: string;
  };
  turma?: {
    id: string;
    nome: string;
  };
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AulaHoje {
  id: string;
  horario: string;
  turma?: string;
  instrutor?: string;
  status: "agendada" | "em andamento" | "concluída";
  presencas?: number;
}

/**
 * Busca todas as aulas com filtros opcionais
 */
export async function getAulas(params?: {
  unidade_id?: string;
  ativo?: boolean;
  dia_semana?: number;
}): Promise<Aula[]> {
  const token = localStorage.getItem("token");

  const queryParams = new URLSearchParams();
  if (params?.unidade_id) queryParams.append("unidade_id", params.unidade_id);
  if (params?.ativo !== undefined)
    queryParams.append("ativo", String(params.ativo));
  if (params?.dia_semana !== undefined)
    queryParams.append("dia_semana", String(params.dia_semana));

  const url = `${API_URL}/aulas${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  console.log("🔥 [AULAS API] Buscando aulas:", {
    url,
    params,
    API_URL,
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(
      "❌ [AULAS API] Erro na resposta:",
      response.status,
      response.statusText
    );
    throw new Error("Erro ao buscar aulas");
  }

  const data = await response.json();
  console.log("✅ [AULAS API] Aulas recebidas:", data);

  return data;
}

/**
 * Busca aulas de hoje para uma unidade específica
 */
export async function getAulasHoje(unidade_id?: string): Promise<AulaHoje[]> {
  const token = localStorage.getItem("token");
  const dataHoje = new Date().toLocaleDateString("pt-BR");

  console.log("🔥 [AULAS HOJE] Iniciando busca:", {
    unidade_id,
    data_hoje: dataHoje,
  });

  const queryParams = new URLSearchParams();
  if (unidade_id) queryParams.append("unidade_id", unidade_id);

  const url = `${API_URL}/aulas/hoje/lista${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  console.log("🔥 [AULAS HOJE API] URL:", url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(
      "❌ [AULAS HOJE API] Erro na resposta:",
      response.status,
      response.statusText
    );
    throw new Error("Erro ao buscar aulas de hoje");
  }

  const aulas = await response.json();
  console.log(
    "✅ [AULAS HOJE API] Aulas recebidas do backend:",
    aulas.length,
    aulas
  );

  // Transformar para formato do dashboard
  const aulasFormatadas = aulas.map((aula: any, index: number) => {
    try {
      console.log(`🔥 [AULAS HOJE] Processando aula ${index}:`, aula);

      // Extrair horário do data_hora_inicio (formato: HH:MM)
      const horario = aula.data_hora_inicio
        ? new Date(aula.data_hora_inicio).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "00:00";

      console.log(`🔥 [AULAS HOJE] Horário extraído:`, horario);

      const aulaFormatada = {
        id: aula.id,
        horario,
        turma: aula.turma?.nome || aula.nome || "Turma Regular",
        instrutor:
          aula.professor?.nome_completo || aula.professor?.nome || "A definir",
        status: determinarStatus(horario),
        presencas: 0,
      };

      console.log("✅ [AULAS HOJE] Aula formatada:", aulaFormatada);
      return aulaFormatada;
    } catch (error) {
      console.error(
        `❌ [AULAS HOJE] Erro ao formatar aula ${index}:`,
        error,
        aula
      );
      throw error;
    }
  });

  console.log(
    "✅ [AULAS HOJE] Total formatadas:",
    aulasFormatadas.length,
    aulasFormatadas
  );

  return aulasFormatadas;
}

/**
 * Determina o status da aula com base no horário
 */
function determinarStatus(
  horario: string
): "agendada" | "em andamento" | "concluída" {
  const agora = new Date();
  const horaAtual = agora.getHours() * 60 + agora.getMinutes();

  const [hora, minuto] = horario.split(":").map(Number);
  const horaAula = hora * 60 + minuto;
  const fimAula = horaAula + 60; // Considera 1 hora de duração

  // Em andamento: da hora de início até 1 hora depois
  if (horaAtual >= horaAula && horaAtual <= fimAula) {
    return "em andamento";
  }

  // Resto do dia: apenas "agendada" (hoje)
  return "agendada";
}

/**
 * Conta quantas aulas estão agendadas para hoje
 */
export async function countAulasHoje(unidade_id?: string): Promise<number> {
  const token = localStorage.getItem("token");

  const queryParams = new URLSearchParams();
  if (unidade_id) queryParams.append("unidade_id", unidade_id);

  const url = `${API_URL}/aulas/hoje${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Erro ao contar aulas de hoje");
  }

  const data = await response.json();
  return data.count || 0;
}
