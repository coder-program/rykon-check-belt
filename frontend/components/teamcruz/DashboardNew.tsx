"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import { listAlunos } from "@/lib/peopleApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import {
  Shield,
  Users,
  Activity,
  Award,
  Calendar,
  Clock,
  Zap,
  CheckCircle,
  Trophy,
  Star,
  Bell,
  Search,
  GraduationCap,
  ShoppingBag,
  ExternalLink,
  Package,
  Tag,
  MapPin,
  AlertTriangle,
  Settings,
  Building2,
  TrendingUp,
  FileText,
  Megaphone,
  Share2,
} from "lucide-react";
import {
  QrCodeIcon,
  CameraIcon,
  UserIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useUnidadesStats } from "@/hooks/useUnidadesStats";
import ConfiguracoesModal from "./ConfiguracoesModal";
import CampanhasManager from "./CampanhasManager";
import RedeSocialTeam from "./RedeSocialTeam";
import {
  getProximosGraduar,
  getHistoricoGraduacoes,
  type ProximoGraduar,
  type HistoricoGraduacao,
} from "@/lib/graduacaoApi";

// Dados mockados equivalentes ao CRA
const mockData = {
  stats: {
    totalAlunos: 287,
    aulaHoje: 12,
    proximosGraduaveis: 15,
    presencasHoje: 45,
  },
  proximosGraus: [
    {
      id: 1,
      nome: "João Silva",
      faixa: "Azul",
      graus: 3,
      faltam: 2,
      foto: null,
    },
    {
      id: 2,
      nome: "Maria Santos",
      faixa: "Roxa",
      graus: 2,
      faltam: 3,
      foto: null,
    },
    {
      id: 3,
      nome: "Pedro Costa",
      faixa: "Branca",
      graus: 1,
      faltam: 1,
      foto: null,
    },
    {
      id: 4,
      nome: "Rafael Dias",
      faixa: "Marrom",
      graus: 4,
      faltam: 5,
      foto: null,
    },
    {
      id: 5,
      nome: "Bia Kids",
      faixa: "Cinza e Branco",
      graus: 1,
      faltam: 3,
      foto: null,
    },
    {
      id: 6,
      nome: "Léo Kids",
      faixa: "Cinza e Preto",
      graus: 2,
      faltam: 4,
      foto: null,
    },
    {
      id: 7,
      nome: "Nina Kids",
      faixa: "Amarela e Branca",
      graus: 1,
      faltam: 2,
      foto: null,
    },
    {
      id: 8,
      nome: "Otávio Kids",
      faixa: "Laranja e Branca",
      graus: 3,
      faltam: 1,
      foto: null,
    },
    {
      id: 9,
      nome: "Gui Kids",
      faixa: "Verde e Preta",
      graus: 0,
      faltam: 4,
      foto: null,
    },
  ],
  aulasHoje: [
    {
      id: 1,
      horario: "07:00",
      turma: "Adulto Manhã",
      instrutor: "Carlos Cruz",
      status: "concluída",
      alunos: 23,
    },
    {
      id: 2,
      horario: "09:00",
      turma: "Competição",
      instrutor: "Carlos Cruz",
      status: "em andamento",
      alunos: 15,
    },
    {
      id: 3,
      horario: "16:00",
      turma: "Kids Tarde",
      instrutor: "João Silva",
      status: "agendada",
      alunos: 0,
    },
    {
      id: 4,
      horario: "19:00",
      turma: "Adulto Noite",
      instrutor: "Carlos Cruz",
      status: "agendada",
      alunos: 0,
    },
  ],
  ranking: [
    { id: 1, nome: "Lucas Oliveira", presencas: 95, percent: 95, streak: 45 },
    { id: 2, nome: "Ana Paula", presencas: 92, percent: 92, streak: 30 },
    { id: 3, nome: "Roberto Lima", presencas: 88, percent: 88, streak: 21 },
  ],
};

const mockAulasAbertas = [
  {
    id: 1,
    horario: "07:00",
    turma: "Adulto Manhã",
    instrutor: "Carlos Cruz",
    vagas: 7,
  },
  {
    id: 2,
    horario: "09:00",
    turma: "Competição",
    instrutor: "Carlos Cruz",
    vagas: 3,
  },
  {
    id: 3,
    horario: "16:00",
    turma: "Kids Tarde",
    instrutor: "João Silva",
    vagas: 10,
  },
  {
    id: 4,
    horario: "19:00",
    turma: "Adulto Noite",
    instrutor: "Carlos Cruz",
    vagas: 5,
  },
];

const mockAlunos = [
  {
    id: 1,
    nome: "João Silva",
    matricula: "TC001",
    faixa: "Azul",
    graus: 3,
    cpf: "123.456.789-00",
    token: "TKN001",
  },
  {
    id: 2,
    nome: "Maria Santos",
    matricula: "TC002",
    faixa: "Roxa",
    graus: 2,
    cpf: "987.654.321-00",
    token: "TKN002",
  },
  {
    id: 3,
    nome: "Pedro Costa",
    matricula: "TC003",
    faixa: "Branca",
    graus: 1,
    cpf: "456.789.123-00",
    token: "TKN003",
  },
  {
    id: 4,
    nome: "Ana Paula",
    matricula: "TC004",
    faixa: "Marrom",
    graus: 4,
    cpf: "789.123.456-00",
    token: "TKN004",
  },
  {
    id: 5,
    nome: "Lucas Oliveira",
    matricula: "TC005",
    faixa: "Verde",
    graus: 2,
    cpf: "321.654.987-00",
    token: "TKN005",
  },
  {
    id: 6,
    nome: "Carlos Pereira",
    matricula: "TC006",
    faixa: "Azul",
    graus: 1,
    cpf: "654.321.789-00",
    token: "TKN006",
  },
  {
    id: 7,
    nome: "Bia Kids",
    matricula: "TK007",
    faixa: "Cinza",
    graus: 1,
    cpf: "111.222.333-44",
    token: "TKN007",
  },
  {
    id: 8,
    nome: "Léo Kids",
    matricula: "TK008",
    faixa: "Cinza e Preto",
    graus: 2,
    cpf: "555.666.777-88",
    token: "TKN008",
  },
  {
    id: 9,
    nome: "Nina Kids",
    matricula: "TK009",
    faixa: "Amarela e Branca",
    graus: 0,
    cpf: "999.888.777-66",
    token: "TKN009",
  },
  {
    id: 10,
    nome: "Otávio Kids",
    matricula: "TK010",
    faixa: "Laranja e Branca",
    graus: 3,
    cpf: "222.333.444-55",
    token: "TKN010",
  },
  {
    id: 11,
    nome: "Gui Kids",
    matricula: "TK011",
    faixa: "Verde e Preta",
    graus: 1,
    cpf: "333.444.555-66",
    token: "TKN011",
  },
];

const mockGraduacoesHistorico = [
  {
    id: 11,
    nome: "Marcos Alves",
    faixaAnterior: "Azul",
    novaFaixa: "Roxa",
    data: "2025-06-10",
  },
  {
    id: 12,
    nome: "Beatriz Cunha",
    faixaAnterior: "Branca",
    novaFaixa: "Azul",
    data: "2025-05-22",
  },
  {
    id: 13,
    nome: "Felipe Ramos",
    faixaAnterior: "Roxa",
    novaFaixa: "Marrom",
    data: "2025-04-18",
  },
];

const mockAulasSemana = [
  {
    id: 21,
    dia: "Qui",
    horario: "19:00",
    turma: "Adulto Noite",
    instrutor: "Carlos Cruz",
    vagas: 0,
    status: "agendada",
  },
  {
    id: 22,
    dia: "Sex",
    horario: "07:00",
    turma: "Adulto Manhã",
    instrutor: "Carlos Cruz",
    vagas: 4,
    status: "agendada",
  },
  {
    id: 23,
    dia: "Sab",
    horario: "09:00",
    turma: "Competição",
    instrutor: "Carlos Cruz",
    vagas: 1,
    status: "agendada",
  },
];

function getBeltClass(faixa: string) {
  const classes: Record<string, string> = {
    Branca: "badge-ghost",
    Cinza: "badge-secondary",
    Amarela: "badge-warning",
    Laranja: "badge-warning",
    Verde: "badge-success",
    Azul: "badge-info",
    Roxa: "badge-primary",
    Marrom: "badge-accent",
    Preta: "badge-neutral",
    Coral: "badge-error",
    Vermelha: "badge-error",
  };
  return classes[faixa] || "badge-ghost";
}

// Converter enum de faixa para nome exibível
function convertFaixaEnumToDisplayName(faixaEnum: string): string {
  const faixaMap: Record<string, string> = {
    BRANCA: "Branca",
    CINZA_BRANCA: "Cinza e Branca",
    CINZA: "Cinza",
    CINZA_PRETA: "Cinza e Preta",
    AMARELA_BRANCA: "Amarela e Branca",
    AMARELA: "Amarela",
    AMARELA_PRETA: "Amarela e Preta",
    LARANJA_BRANCA: "Laranja e Branca",
    LARANJA: "Laranja",
    LARANJA_PRETA: "Laranja e Preta",
    VERDE_BRANCA: "Verde e Branca",
    VERDE: "Verde",
    VERDE_PRETA: "Verde e Preta",
    AZUL: "Azul",
    ROXA: "Roxa",
    MARROM: "Marrom",
    PRETA: "Preta",
    CORAL: "Coral",
    VERMELHA: "Vermelha",
  };

  return faixaMap[faixaEnum] || "Branca";
}

// Visual da ponteira (tip) com graus. Regra padrão: ponteira preta com graus brancos.
function getBeltTipStyle(faixa: string) {
  let tip = "bg-black";
  let stripeActive = "bg-white";
  let stripeInactive = "bg-white/30";

  if (faixa === "Preta") {
    tip = "bg-red-600";
    stripeActive = "bg-white";
    stripeInactive = "bg-white/30";
  }
  if (faixa === "Coral" || faixa === "Vermelha") {
    tip = "bg-white";
    stripeActive = "bg-black";
    stripeInactive = "bg-black/30";
  }
  return { tip, stripeActive, stripeInactive } as const;
}

function colorBgClass(nome: string) {
  const map: Record<string, string> = {
    Branca: "bg-white",
    Cinza: "bg-gray-400",
    Preta: "bg-black",
    Amarela: "bg-yellow-400",
    Amarelo: "bg-yellow-400",
    Laranja: "bg-orange-500",
    Verde: "bg-green-600",
    Azul: "bg-blue-600",
    Roxa: "bg-purple-700",
    Marrom: "bg-amber-800",
    Coral: "bg-red-500",
    Vermelha: "bg-red-600",
  };
  return map[nome] || "bg-gray-300";
}

// Helpers de Kids: base + listra central opcional (branca ou preta)
const KIDS_BASES = ["Cinza", "Amarela", "Laranja", "Verde"];
function parseKidsPattern(faixa: string): {
  isKids: boolean;
  base?: string;
  stripe?: "white" | "black" | null;
} {
  const raw = faixa.trim();
  const lower = raw.toLowerCase();
  const base = KIDS_BASES.find((b) => lower.startsWith(b.toLowerCase()));
  if (!base) return { isKids: false };
  const hasWhite = /e\s+branc[oa]/i.test(raw) || /\/\s*branc[ao]/i.test(raw);
  const hasBlack = /e\s+pret[ao]/i.test(raw) || /\/\s*pret[ao]/i.test(raw);
  return {
    isKids: true,
    base,
    stripe: hasWhite ? "white" : hasBlack ? "black" : null,
  };
}

// Retorna 1 ou 2 segmentos de cor para faixas não-kids (fallback para casos especiais)
function getBeltMainSegments(faixa: string): string[] {
  const raw = faixa.replace(/\s+/g, " ").trim();
  const parts = raw.split(/\s*\/\s*|\s+e\s+/i).map((p) => p.trim());
  if (parts.length >= 2) return [parts[0], parts[1]];
  return [raw];
}

function BeltTip({ faixa, graus }: { faixa: string; graus: number }) {
  const { tip, stripeActive, stripeInactive } = getBeltTipStyle(faixa);
  const kids = parseKidsPattern(faixa);
  const segments = kids.isKids
    ? [kids.base as string]
    : getBeltMainSegments(faixa);
  // Barra da faixa
  return (
    <div className="flex items-center w-24 h-3 rounded-sm overflow-hidden ring-1 ring-black/10">
      <div className="relative flex-1 h-full flex">
        {segments.length === 2 ? (
          <>
            <div className={`flex-1 h-full ${colorBgClass(segments[0])}`}></div>
            <div className={`flex-1 h-full ${colorBgClass(segments[1])}`}></div>
          </>
        ) : (
          <div
            className={`flex-1 h-full ${colorBgClass(segments[0])} ${
              segments[0] === "Branca" ? "border border-gray-300" : ""
            }`}
          ></div>
        )}
        {kids.isKids && kids.stripe && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 ${
              kids.stripe === "white" ? "bg-white" : "bg-black"
            } h-0.5`}
          ></div>
        )}
      </div>
      <div className={`flex items-center justify-start ${tip} h-full w-8 px-1`}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`h-2 w-1 rounded-sm ${
              i < graus ? stripeActive : stripeInactive
            } ${i < 3 ? "mr-0.5" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardNew() {
  // Estados
  const [selectedTab, setSelectedTab] = React.useState("overview");
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [selectedAula, setSelectedAula] = React.useState<any | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedAlunos, setSelectedAlunos] = React.useState<any[]>([]);
  const [presencasRegistradas, setPresencasRegistradas] = React.useState<any[]>(
    []
  );
  const [totalPresencasHoje, setTotalPresencasHoje] = React.useState(0);
  const [showQRModal, setShowQRModal] = React.useState(false);
  const [showCPFModal, setShowCPFModal] = React.useState(false);
  const [showConfigModal, setShowConfigModal] = React.useState(false);
  const [cpfInput, setCpfInput] = React.useState("");

  // Configurações de graduação
  const [graduationConfig, setGraduationConfig] = React.useState({
    BRANCA: { aulasPorGrau: 20, maximoGraus: 4, tempoMinimo: 3 },
    CINZA: { aulasPorGrau: 20, maximoGraus: 4, tempoMinimo: 3 },
    AMARELA: { aulasPorGrau: 20, maximoGraus: 4, tempoMinimo: 3 },
    LARANJA: { aulasPorGrau: 20, maximoGraus: 4, tempoMinimo: 3 },
    VERDE: { aulasPorGrau: 20, maximoGraus: 4, tempoMinimo: 3 },
    AZUL: { aulasPorGrau: 20, maximoGraus: 4, tempoMinimo: 3 },
    ROXA: { aulasPorGrau: 20, maximoGraus: 4, tempoMinimo: 3 },
    MARROM: { aulasPorGrau: 20, maximoGraus: 4, tempoMinimo: 3 },
    PRETA: { aulasPorGrau: 20, maximoGraus: 4, tempoMinimo: 3 },
  });
  const [selectedAlunoQR, setSelectedAlunoQR] = React.useState<any | null>(
    null
  );
  const [showLocationModal, setShowLocationModal] = React.useState(false);

  // Estado do filtro de unidade - deve vir antes das queries
  const [selectedUnidade, setSelectedUnidade] = React.useState<string>("todas");

  // Paginação e filtros
  const pageSize = 30; // quantidade por página para infinite scroll
  const [filterFaixa, setFilterFaixa] = React.useState<
    "todos" | "kids" | "adulto"
  >("todos");

  // Função de filtragem local (mock) — futuramente mover para servidor
  const filterLocal = React.useCallback(
    (items: typeof mockAlunos) => {
      const q = debouncedSearch.toLowerCase();
      return items
        .filter(
          (a) =>
            a.nome.toLowerCase().includes(q) ||
            a.matricula.toLowerCase().includes(q)
        )
        .filter((a) => {
          const isKids = parseKidsPattern(a.faixa).isKids;
          if (filterFaixa === "kids") return isKids;
          if (filterFaixa === "adulto") return !isKids;
          return true;
        });
    },
    [debouncedSearch, filterFaixa]
  );

  // QUERIES - Todas as queries vêm depois dos estados

  // Hook para buscar estatísticas reais das unidades
  const unidadesStats = useUnidadesStats();

  // Query para buscar unidades disponíveis
  const unidadesQuery = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/unidades`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Erro ao buscar unidades");
        }

        const data = await response.json();
        return data.items || [];
      } catch (error) {
        console.error("Erro ao buscar unidades:", error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // Considerar fresh por 10 minutos
  });

  // Query para buscar estatísticas reais do dashboard
  const statsQuery = useQuery({
    queryKey: ["dashboard-stats", selectedUnidade],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();

        if (selectedUnidade && selectedUnidade !== "todas") {
          params.append("unidadeId", selectedUnidade);
        }

        const url = `${process.env.NEXT_PUBLIC_API_URL}/dashboard/stats${
          params.toString() ? `?${params.toString()}` : ""
        }`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao buscar estatísticas");
        }

        const data = await response.json();

        return {
          totalAlunos: data.totalAlunos || 0,
          aulaHoje: data.aulasHoje || 0,
          proximosGraduaveis: data.proximosGraduaveis || 0,
          presencasHoje: data.presencasHoje || 0,
          totalUsuarios: data.totalUsuarios || 0,
          totalFranqueados: data.totalFranqueados || 0,
          totalProfessores: data.totalProfessores || 0,
          totalUnidades: data.totalUnidades || 0,
        };
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
        // Fallback para dados zerados em caso de erro
        return {
          totalAlunos: 0,
          aulaHoje: 0,
          proximosGraduaveis: 0,
          presencasHoje: 0,
          totalUsuarios: 0,
          totalFranqueados: 0,
          totalProfessores: 0,
          totalUnidades: 0,
        };
      }
    },
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
    staleTime: 2 * 60 * 1000, // Considerar fresh por 2 minutos
  });

  // Query para Alunos (aba Alunos) - DADOS REAIS DO BANCO
  const alunosQuery = useInfiniteQuery({
    queryKey: ["alunos", debouncedSearch, filterFaixa],
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    queryFn: async ({ pageParam }) => {
      // Buscar dados reais do banco
      const response = await listAlunos({
        page: pageParam,
        pageSize: 30,
        search: debouncedSearch,
        faixa: filterFaixa,
      });

      // Adaptar os dados para o formato esperado pelo componente
      const adaptedItems = response.items.map((aluno: any) => ({
        id: aluno.id,
        nome: aluno.nome || aluno.nome_completo,
        matricula: aluno.matricula || aluno.id.substring(0, 8).toUpperCase(),
        faixa: aluno.faixa || aluno.faixa_atual || "Branca",
        graus: aluno.graus || aluno.grau_atual || 0,
        cpf: aluno.cpf,
        token: `TKN-${aluno.id.substring(0, 8)}`,
      }));

      return {
        items: adaptedItems,
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        hasNextPage: response.hasNextPage,
        nextPage: response.hasNextPage ? response.page + 1 : null,
      };
    },
  });

  // Query para Professores (aba Professores) - DADOS REAIS DO BANCO
  const professoresQuery = useInfiniteQuery({
    queryKey: ["professores", debouncedSearch, filterFaixa],
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    queryFn: async ({ pageParam }) => {
      const response = await listAlunos({
        page: pageParam,
        pageSize: 30,
        search: debouncedSearch,
        faixa: filterFaixa,
        tipo_cadastro: "PROFESSOR", // Filtrar apenas professores
      });
      return {
        items: response.items,
        page: response.page,
        total: response.total,
        hasNextPage: response.hasNextPage,
        nextPage: response.hasNextPage ? response.page + 1 : null,
      };
    },
  });

  // Query para Check-in (dentro da aula selecionada) - DADOS REAIS DO BANCO
  const checkinQuery = useInfiniteQuery({
    queryKey: [
      "alunos-checkin",
      selectedAula ? selectedAula.id : "none",
      debouncedSearch,
      filterFaixa,
    ],
    enabled: !!selectedAula, // só quando há aula selecionada
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    queryFn: async ({ pageParam }) => {
      // Buscar dados reais do banco
      const response = await listAlunos({
        page: pageParam,
        pageSize: 30,
        search: debouncedSearch,
        faixa: filterFaixa,
      });

      // Adaptar os dados
      const adaptedItems = response.items.map((aluno: any) => ({
        id: aluno.id,
        nome: aluno.nome || aluno.nome_completo,
        matricula: aluno.matricula || aluno.id.substring(0, 8).toUpperCase(),
        faixa: aluno.faixa || aluno.faixa_atual || "Branca",
        graus: aluno.graus || aluno.grau_atual || 0,
        cpf: aluno.cpf,
        token: `TKN-${aluno.id.substring(0, 8)}`,
      }));

      return {
        items: adaptedItems,
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        hasNextPage: response.hasNextPage,
        nextPage: response.hasNextPage ? response.page + 1 : null,
      };
    },
  });

  // Hook de geolocalização
  const {
    isInAcademy,
    getCurrentPosition,
    validateCheckinLocation,
    isLoading: locationLoading,
    error: locationError,
    latitude,
    longitude,
  } = useGeolocation();

  React.useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Debounce da busca
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Quando filtros/busca mudam, as queries se reexecutam automaticamente por causa do queryKey

  // Solicita localização ao entrar na aba de check-in
  React.useEffect(() => {
    if (selectedTab === "checkin") {
      getCurrentPosition();
    }
  }, [selectedTab, getCurrentPosition]);

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: Activity },
    // { id: "checkin", label: "Check-in", icon: CheckCircle }, // Comentado temporariamente
    { id: "alunos", label: "Alunos", icon: Users },
    { id: "professores", label: "Professores", icon: GraduationCap },
    { id: "unidades", label: "Unidades", icon: Building2 },
    { id: "graduacoes", label: "Graduações", icon: Trophy },
    // { id: "aulas", label: "Aulas", icon: Calendar }, // Comentado temporariamente
    // { id: "social", label: "Comunidade", icon: Share2 }, // Comentado temporariamente
    { id: "campanhas", label: "Campanhas", icon: Megaphone },
    { id: "loja", label: "Loja Virtual", icon: ShoppingBag },
  ];

  // Estado de filtros na Visão Geral (Próximos a Receber Grau)
  const [overviewSearch, setOverviewSearch] = React.useState("");
  const [overviewDebounced, setOverviewDebounced] = React.useState("");
  const [overviewFilterFaixa, setOverviewFilterFaixa] = React.useState<
    "todos" | "kids" | "adulto"
  >("todos");
  const [overviewSort, setOverviewSort] = React.useState<
    "faltam-asc" | "faltam-desc"
  >("faltam-asc");
  React.useEffect(() => {
    const id = setTimeout(() => setOverviewDebounced(overviewSearch), 300);
    return () => clearTimeout(id);
  }, [overviewSearch]);

  // Query para buscar dados REAIS dos alunos para mostrar próximos graduáveis
  const proximosQuery = useQuery({
    queryKey: [
      "proximos-graus",
      overviewFilterFaixa,
      selectedUnidade,
      overviewDebounced,
    ],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({
          page: "1",
          pageSize: "50",
          faixa:
            overviewFilterFaixa === "todos" ? "todos" : overviewFilterFaixa,
        });

        if (overviewDebounced) {
          params.append("search", overviewDebounced);
        }

        if (selectedUnidade && selectedUnidade !== "todas") {
          params.append("unidadeId", selectedUnidade);
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/alunos?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Erro ao buscar alunos");
        }

        const data = await response.json();

        // Mapear os dados reais dos alunos para o formato esperado
        const items = data.items.map((aluno: any) => {
          const faixaEnum = aluno.faixa_atual || "BRANCA";
          const faixaNome = convertFaixaEnumToDisplayName(faixaEnum);

          // Buscar a faixa ativa do aluno (relacionamento com aluno_faixa)
          const faixaAtiva = aluno.faixas?.find((f: any) => f.ativa === true);
          const grausAtual = faixaAtiva?.graus_atual || 0;
          const presencasNoCiclo = faixaAtiva?.presencas_no_ciclo || 0;

          // Obter configuração para a faixa atual
          const configFaixa =
            graduationConfig[faixaEnum as keyof typeof graduationConfig] ||
            graduationConfig.BRANCA;
          const aulasPorGrau = configFaixa.aulasPorGrau;
          const faltamAulas = Math.max(
            0,
            aulasPorGrau - (presencasNoCiclo % aulasPorGrau)
          );

          return {
            id: aluno.id,
            nome: aluno.nome_completo || aluno.nome,
            faixa: faixaNome,
            graus: grausAtual, // Graus reais da tabela aluno_faixa
            faltam: faltamAulas, // Cálculo real baseado nas presenças
            foto: null,
            categoria: aluno.categoria || "adulto",
          };
        });

        return {
          items,
          total: data.total || 0,
          page: 1,
          pageSize: 50,
          hasNextPage: false,
        };
      } catch (error) {
        console.error("Erro ao buscar alunos para próximos graduáveis:", error);
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: 50,
          hasNextPage: false,
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Query para buscar dados de graduação para aba de graduações (DESABILITADA)
  const graduacoesQuery = useQuery({
    queryKey: ["proximos-graus-graduacoes", selectedUnidade],
    queryFn: async () => {
      return [];
    },
    enabled: false, // Desabilitada para evitar queries automáticas
  });

  // Query para buscar histórico de graduações (DESABILITADA)
  const historicoQuery = useQuery({
    queryKey: ["historico-graduacoes", selectedUnidade],
    queryFn: async () => {
      return [];
    },
    enabled: false, // Desabilitada para evitar queries automáticas
  });

  // Função para registrar check-in e presença automaticamente
  const handleCheckinAluno = (
    aluno: any,
    aula: any,
    skipLocationCheck: boolean = false
  ) => {
    // Valida localização antes do check-in (exceto se skipLocationCheck for true)
    if (!skipLocationCheck) {
      const locationValidation = validateCheckinLocation();

      if (!locationValidation.valid) {
        // Se requer confirmação do instrutor
        if (locationValidation.requireConfirmation) {
          const confirmed = window.confirm(
            `${locationValidation.message}\n\nDeseja continuar com o check-in mesmo assim?\n(Requer autorização do instrutor)`
          );

          if (!confirmed) {
            toast.error("Check-in cancelado", {
              duration: 2000,
              position: "top-center",
              icon: "📍",
            });
            return;
          }
        } else {
          // Mostra modal para ativar localização
          toast.error(locationValidation.message, {
            duration: 3000,
            position: "top-center",
            icon: "📍",
          });
          setShowLocationModal(true);
          return;
        }
      }
    }

    const jaPresente = selectedAlunos.some((a) => a.id === aluno.id);

    if (!jaPresente) {
      // Adiciona o aluno à lista de presentes
      setSelectedAlunos((prev) => [...prev, aluno]);

      // Registra a presença (simulado com localStorage)
      const hoje = format(new Date(), "yyyy-MM-dd");
      const presencaKey = `presenca_${aluno.id}_${hoje}`;

      // Verifica se já não foi registrada hoje
      const presencasHoje = JSON.parse(
        localStorage.getItem("presencas_hoje") || "[]"
      );

      if (
        !presencasHoje.find(
          (p: any) => p.alunoId === aluno.id && p.data === hoje
        )
      ) {
        const novaPresenca = {
          id: Date.now(),
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          data: hoje,
          hora: format(new Date(), "HH:mm:ss"),
          aula: `${aula.turma} - ${aula.horario}`,
          instrutor: aula.instrutor,
        };

        presencasHoje.push(novaPresenca);
        localStorage.setItem("presencas_hoje", JSON.stringify(presencasHoje));

        // Adiciona à lista de presenças registradas
        setPresencasRegistradas((prev) => [...prev, novaPresenca]);

        // Atualiza o contador total de presenças
        setTotalPresencasHoje((prev) => prev + 1);

        // Mostra notificação de sucesso
        toast.success(
          `✅ Check-in realizado!\n${aluno.nome} - Presença registrada`,
          {
            duration: 3000,
            position: "top-right",
            style: {
              background: "#10b981",
              color: "white",
            },
          }
        );
      } else {
        toast.error(`${aluno.nome} já fez check-in hoje!`, {
          duration: 2000,
          position: "top-right",
        });
      }
    } else {
      // Remove o aluno da lista (desfaz check-in)
      setSelectedAlunos((prev) => prev.filter((a) => a.id !== aluno.id));

      // Remove a presença do localStorage
      const hoje = format(new Date(), "yyyy-MM-dd");
      const presencasHoje = JSON.parse(
        localStorage.getItem("presencas_hoje") || "[]"
      );
      const novasPresencas = presencasHoje.filter(
        (p: any) => !(p.alunoId === aluno.id && p.data === hoje)
      );
      localStorage.setItem("presencas_hoje", JSON.stringify(novasPresencas));

      setPresencasRegistradas((prev) =>
        prev.filter((p) => p.alunoId !== aluno.id)
      );
      setTotalPresencasHoje((prev) => Math.max(0, prev - 1));

      toast(`Check-in removido: ${aluno.nome}`, {
        icon: "↩️",
        duration: 2000,
      });
    }
  };

  // Função para finalizar check-in da aula
  const finalizarCheckin = () => {
    if (selectedAlunos.length > 0) {
      toast.success(
        `🎯 Check-in finalizado!\n${selectedAlunos.length} presenças registradas para ${selectedAula.turma}`,
        {
          duration: 4000,
          position: "top-center",
          style: {
            background: "#3b82f6",
            color: "white",
            fontSize: "16px",
          },
        }
      );

      // Salva histórico da aula
      const historico = JSON.parse(
        localStorage.getItem("historico_aulas") || "[]"
      );
      historico.push({
        id: Date.now(),
        data: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        aula: `${selectedAula.turma} - ${selectedAula.horario}`,
        instrutor: selectedAula.instrutor,
        totalAlunos: selectedAlunos.length,
        alunos: selectedAlunos.map((a) => ({ id: a.id, nome: a.nome })),
      });
      localStorage.setItem("historico_aulas", JSON.stringify(historico));
    }

    setSelectedAula(null);
    setSelectedAlunos([]);
    setSearchTerm("");
  };

  // Função para check-in por CPF
  const handleCheckinByCPF = () => {
    const cpfLimpo = cpfInput.replace(/\D/g, "");
    const aluno = mockAlunos.find((a) => a.cpf.replace(/\D/g, "") === cpfLimpo);

    if (aluno && selectedAula) {
      handleCheckinAluno(aluno, selectedAula);
      setShowCPFModal(false);
      setCpfInput("");
    } else {
      toast.error("CPF não encontrado!", {
        duration: 2000,
        position: "top-center",
      });
    }
  };

  // Carrega presenças do dia ao montar o componente
  React.useEffect(() => {
    const hoje = format(new Date(), "yyyy-MM-dd");
    const presencasHoje = JSON.parse(
      localStorage.getItem("presencas_hoje") || "[]"
    );
    const presencasDeHoje = presencasHoje.filter((p: any) => p.data === hoje);
    setPresencasRegistradas(presencasDeHoje);
    setTotalPresencasHoje(
      (statsQuery.data?.presencasHoje || 0) + presencasDeHoje.length
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50">
      <Toaster position="top-right" />

      <div className="navbar bg-white shadow-lg border-b-2 border-blue-100">
        <div className="flex-1">
          <div className="flex items-center gap-3 px-4">
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="btn btn-primary gap-2 shadow-md"
              title="Voltar ao Dashboard"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Voltar
            </button>
            <div className="divider divider-horizontal mx-2"></div>
            <div className="indicator">
              <Shield className="h-10 w-10 text-red-600" />
              <span className="indicator-item badge badge-warning badge-xs animate-pulse"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-black bg-clip-text text-transparent">
                TeamCruz Jiu-Jitsu
              </h1>
              <p className="text-xs text-blue-600">
                Sistema de Controle de Presença
              </p>
            </div>
          </div>
        </div>
        <div className="flex-none gap-4 items-center">
          <div className="text-right mr-4">
            <p className="text-sm opacity-70">
              {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-lg font-mono font-bold">
              {format(currentTime, "HH:mm:ss")}
            </p>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="btn btn-ghost btn-circle"
            title="Configurações"
          >
            <Settings className="h-5 w-5" />
          </button>
          <div className="indicator">
            <Bell className="h-5 w-5" />
            <span className="indicator-item badge badge-error badge-xs animate-pulse"></span>
          </div>
        </div>
      </div>

      {/* Nav Tabs - estilo pill sobre barra clara */}
      <div className="bg-gradient-to-r from-white to-blue-50 border-y border-blue-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 rounded-xl bg-white/90 backdrop-blur border border-blue-200 p-1 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    selectedTab === tab.id
                      ? "bg-blue-600 text-white shadow"
                      : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filtro de Unidade - MELHORADO */}
            <div className="flex items-center gap-3 bg-white backdrop-blur-sm border-2 border-blue-400 rounded-xl px-5 py-3 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Filtrar Unidade
                </span>
                <select
                  className="text-base font-semibold text-gray-800 bg-transparent border-none outline-none cursor-pointer w-56 hover:text-blue-600 transition-colors"
                  value={selectedUnidade}
                  onChange={(e) => setSelectedUnidade(e.target.value)}
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.5rem center",
                    backgroundSize: "1.25rem",
                    paddingRight: "2rem",
                  }}
                >
                  <option value="todas">📍 Todas as Unidades</option>
                  {Array.isArray(unidadesQuery.data) &&
                    unidadesQuery.data?.map((unidade: any) => (
                      <option key={unidade.id} value={unidade.id}>
                        📍 {unidade.nome}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <AnimatePresence mode="wait">
          {selectedTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Cards - Grid Responsivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total de Alunos */}
                <div className="stats shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-xl transition-shadow">
                  <div className="stat text-white p-4">
                    <div className="stat-figure">
                      <Users className="h-10 w-10 opacity-80" />
                    </div>
                    <div className="stat-title text-blue-100 font-medium">
                      Total de Alunos
                    </div>
                    <div className="stat-value text-4xl">
                      {statsQuery.isLoading
                        ? "..."
                        : statsQuery.data?.totalAlunos || 0}
                    </div>
                    <div className="stat-desc text-blue-200 mt-1">
                      ↗︎ 12% vs ultimo mes
                    </div>
                  </div>
                </div>

                {/* Aulas Hoje */}
                <div className="stats shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 hover:shadow-xl transition-shadow">
                  <div className="stat text-white p-4">
                    <div className="stat-figure">
                      <Activity className="h-10 w-10 opacity-80" />
                    </div>
                    <div className="stat-title text-green-100 font-medium">
                      Aulas Hoje
                    </div>
                    <div className="stat-value text-4xl">
                      {statsQuery.isLoading
                        ? "..."
                        : statsQuery.data?.aulaHoje || 0}
                    </div>
                    <div className="stat-desc text-green-200 mt-1">
                      4 turmas agendadas
                    </div>
                  </div>
                </div>

                {/* Próximos Graduáveis */}
                <div className="stats shadow-lg bg-gradient-to-br from-yellow-400 to-amber-500 hover:shadow-xl transition-shadow">
                  <div className="stat text-white p-4">
                    <div className="stat-figure">
                      <Award className="h-10 w-10 opacity-80" />
                    </div>
                    <div className="stat-title text-yellow-100 font-medium">
                      Próximos Graduáveis
                    </div>
                    <div className="stat-value text-4xl">
                      {statsQuery.isLoading
                        ? "..."
                        : statsQuery.data?.proximosGraduaveis || 0}
                    </div>
                    <div className="stat-desc text-yellow-200 mt-1">
                      ↗︎ 5 novos este mes
                    </div>
                  </div>
                </div>

                {/* Presenças Hoje */}
                <div className="stats shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600 hover:shadow-xl transition-shadow">
                  <div className="stat text-white p-4">
                    <div className="stat-figure">
                      <CheckCircle className="h-10 w-10 opacity-80" />
                    </div>
                    <div className="stat-title text-purple-100 font-medium">
                      Presenças Hoje
                    </div>
                    <div className="stat-value text-4xl">
                      {statsQuery.isLoading
                        ? "..."
                        : statsQuery.data?.presencasHoje || 0}
                    </div>
                    <div className="stat-desc text-purple-200 mt-1">
                      ↗︎ 18% vs média
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Próximos a Graduar */}
                <Card className="lg:col-span-2 bg-white border border-blue-200 shadow-lg">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-warning" />
                        Próximos a Receber Grau
                      </CardTitle>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:w-80">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/50" />
                          <input
                            className="input input-bordered w-full pl-9 input-sm"
                            placeholder="Buscar por nome"
                            value={overviewSearch}
                            onChange={(e) => setOverviewSearch(e.target.value)}
                          />
                        </div>
                        <select
                          className="select select-bordered select-sm"
                          value={overviewFilterFaixa}
                          onChange={(e) =>
                            setOverviewFilterFaixa(e.target.value as any)
                          }
                        >
                          <option value="todos">Todos</option>
                          <option value="kids">Kids</option>
                          <option value="adulto">Adulto</option>
                        </select>
                        <select
                          className="select select-bordered select-sm"
                          value={overviewSort}
                          onChange={(e) =>
                            setOverviewSort(e.target.value as any)
                          }
                        >
                          <option value="faltam-asc">
                            Menos aulas primeiro
                          </option>
                          <option value="faltam-desc">
                            Mais aulas primeiro
                          </option>
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-[420px]">
                      {(() => {
                        const items = proximosQuery.data?.items || [];
                        const itemCount = items.length;
                        const loadMoreIfNeeded = ({
                          visibleStopIndex,
                        }: {
                          visibleStopIndex: number;
                        }) => {
                          // Não é mais necessário com useQuery simples
                        };
                        const Row = ({
                          index,
                          style,
                        }: {
                          index: number;
                          style: React.CSSProperties;
                        }) => {
                          const aluno = items[index];
                          if (!aluno)
                            return (
                              <div style={style} className="p-4">
                                <div className="skeleton h-16 w-full" />
                              </div>
                            );
                          return (
                            <div style={style}>
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-white border-2 border-blue-200 rounded-lg shadow-sm hover:shadow-md transition-all"
                              >
                                <div className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      {aluno.foto ? (
                                        <img
                                          src={aluno.foto}
                                          alt={aluno.nome}
                                          className="w-12 h-12 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                          {aluno.nome
                                            .split(" ")
                                            .map((n: string) => n[0])
                                            .join("")}
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-semibold text-gray-900">
                                          {aluno.nome}
                                        </p>
                                        <div className="mt-1">
                                          <BeltTip
                                            faixa={aluno.faixa}
                                            graus={aluno.graus}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-gray-600">
                                        Faltam
                                      </p>
                                      <p className="text-3xl font-bold text-blue-600">
                                        {aluno.faltam}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        aulas
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </div>
                          );
                        };
                        return (
                          <List
                            height={420}
                            itemCount={itemCount}
                            itemSize={88}
                            width={"100%"}
                            onItemsRendered={({
                              visibleStartIndex,
                              visibleStopIndex,
                            }) => loadMoreIfNeeded({ visibleStopIndex })}
                          >
                            {Row as any}
                          </List>
                        );
                      })()}
                    </div>
                    {proximosQuery.isLoading && (
                      <div className="flex justify-center py-2 text-sm text-gray-500">
                        Carregando...
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ranking de Assiduidade */}
                <Card className="bg-white border border-blue-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Top Assiduidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* TODO: Implementar API de ranking quando disponível */}
                    {(statsQuery.data ? [] : mockData.ranking).map(
                      (aluno, index) => (
                        <div
                          key={aluno.id}
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                              index === 0
                                ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900"
                                : index === 1
                                ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white"
                                : "bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {aluno.nome}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1.5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${aluno.percent}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full shadow-sm"
                              />
                            </div>
                            <div className="flex items-center gap-1 mt-1.5">
                              <Zap className="h-3.5 w-3.5 text-yellow-500" />
                              <span className="text-xs text-gray-600 font-medium">
                                {aluno.streak} dias consecutivos
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-bold text-blue-600">
                              {aluno.percent}%
                            </span>
                          </div>
                        </div>
                      )
                    )}
                    {statsQuery.data &&
                      (!mockData.ranking || mockData.ranking.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          <Zap className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">
                            Ranking será calculado com base nas presenças
                          </p>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </div>

              {/* Aulas do Dia */}
              <Card className="bg-white border border-blue-200 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-info" />
                    Aulas de Hoje
                  </CardTitle>
                  <Button
                    className="btn btn-primary btn-sm"
                    onClick={() => (window.location.href = "/aulas")}
                  >
                    + Nova Aula
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* TODO: Implementar API de aulas quando disponível */}
                    {(statsQuery.data ? [] : mockData.aulasHoje).map((aula) => (
                      <motion.div
                        key={aula.id}
                        whileHover={{ scale: 1.03 }}
                        className={`bg-white rounded-lg shadow-md p-4 border-2 ${
                          aula.status === "concluída"
                            ? "border-green-500"
                            : aula.status === "em andamento"
                            ? "border-blue-500 animate-pulse"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">
                            {aula.horario}
                          </h3>
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                        <p className="font-semibold text-gray-800">
                          {aula.turma}
                        </p>
                        <p className="text-sm text-gray-600">
                          Prof. {aula.instrutor}
                        </p>
                        <div className="flex justify-between items-center mt-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              aula.status === "concluída"
                                ? "bg-green-100 text-green-800"
                                : aula.status === "em andamento"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {aula.status}
                          </span>
                          {aula.alunos > 0 && (
                            <span className="text-xs text-gray-600">
                              {aula.alunos} alunos
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {statsQuery.data &&
                      (!mockData.aulasHoje ||
                        mockData.aulasHoje.length === 0) && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
                          <p className="text-lg font-medium mb-2">
                            Nenhuma aula agendada para hoje
                          </p>
                          <p className="text-sm mb-4">
                            Cadastre aulas para começar a gerenciar presenças
                          </p>
                          <Button
                            className="btn btn-primary"
                            onClick={() => (window.location.href = "/aulas")}
                          >
                            Cadastrar Primeira Aula
                          </Button>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {selectedTab === "checkin" && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {!selectedAula ? (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-900">
                    <CheckCircle className="h-5 w-5 text-blue-600" /> Aulas
                    Abertas
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockAulasAbertas.map((aula) => (
                      <div
                        key={aula.id}
                        className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-lg hover:border-blue-500 hover:shadow-xl cursor-pointer shadow-lg transition-all transform hover:scale-105"
                        onClick={() => {
                          setSelectedAula(aula);
                          setSelectedAlunos([]);
                        }}
                      >
                        <div className="p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-5 w-5 text-blue-600" />
                                <h3 className="text-2xl font-bold text-gray-900">
                                  {aula.horario}
                                </h3>
                              </div>
                              <p className="font-semibold text-lg text-gray-800">
                                {aula.turma}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Prof. {aula.instrutor}
                              </p>
                            </div>
                            <div className="text-center">
                              <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-md">
                                <span className="text-2xl font-bold">
                                  {aula.vagas}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 font-medium mt-2">
                                vagas
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                              Clique para fazer check-in
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setSelectedAula(null)}
                    >
                      <ArrowLeftIcon className="h-5 w-5" />
                      Voltar
                    </button>
                    <div className="text-right">
                      <p className="text-sm opacity-70">
                        {selectedAlunos.length} presentes
                      </p>
                      <p className="text-xs opacity-50">
                        {selectedAula.turma} - {selectedAula.horario}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Indicador de Localização */}
                    {selectedAula && (
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isInAcademy === true
                            ? "bg-green-50 border border-green-300"
                            : isInAcademy === false
                            ? "bg-yellow-50 border border-yellow-300"
                            : "bg-gray-50 border border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin
                            className={`h-5 w-5 ${
                              isInAcademy === true
                                ? "text-green-600"
                                : isInAcademy === false
                                ? "text-yellow-600"
                                : "text-gray-600"
                            }`}
                          />
                          <span className="text-sm font-medium">
                            {isInAcademy === true
                              ? "✅ Você está dentro da academia"
                              : isInAcademy === false
                              ? "⚠️ Você está fora da academia"
                              : locationLoading
                              ? "📍 Obtendo localização..."
                              : "📍 Localização não disponível"}
                          </span>
                        </div>
                        {!locationLoading && (
                          <button
                            className="text-xs text-blue-600 hover:underline"
                            onClick={getCurrentPosition}
                          >
                            Atualizar
                          </button>
                        )}
                      </div>
                    )}

                    {/* Botões de Check-in Alternativos */}
                    <div className="flex items-center justify-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
                      <button
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                        onClick={() => setShowCPFModal(true)}
                      >
                        <UserIcon className="h-5 w-5" />
                        Check-in por CPF
                      </button>
                      <button
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                        onClick={() => setShowQRModal(true)}
                      >
                        <QrCodeIcon className="h-5 w-5" />
                        Gerar QR Codes
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/50" />
                        <input
                          className="input input-bordered w-full pl-10"
                          placeholder="Buscar aluno por nome ou matrícula..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <select
                        className="select select-bordered select-sm"
                        value={filterFaixa}
                        onChange={(e) => setFilterFaixa(e.target.value as any)}
                      >
                        <option value="todos">Todos</option>
                        <option value="kids">Kids</option>
                        <option value="adulto">Adulto</option>
                      </select>
                      {selectedAlunos.length > 0 && (
                        <button
                          className="btn btn-primary"
                          onClick={finalizarCheckin}
                        >
                          Finalizar Check-in ({selectedAlunos.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="h-[600px]">
                    {(() => {
                      const items = (checkinQuery.data?.pages || []).flatMap(
                        (p) => p.items
                      );
                      const itemCount = items.length;
                      const isItemLoaded = (index: number) => index < itemCount;
                      const loadMoreIfNeeded = ({
                        visibleStopIndex,
                      }: {
                        visibleStopIndex: number;
                      }) => {
                        if (
                          visibleStopIndex >= itemCount - 5 &&
                          checkinQuery.hasNextPage &&
                          !checkinQuery.isFetchingNextPage
                        ) {
                          checkinQuery.fetchNextPage();
                        }
                      };
                      const Row = ({
                        index,
                        style,
                      }: {
                        index: number;
                        style: React.CSSProperties;
                      }) => {
                        if (!isItemLoaded(index)) {
                          return (
                            <div style={style} className="p-4">
                              <div className="skeleton h-16 w-full" />
                            </div>
                          );
                        }
                        const aluno = items[index];
                        const marcado = selectedAlunos.some(
                          (aa) => aa.id === aluno.id
                        );
                        return (
                          <div style={style}>
                            <div
                              className={`card ${
                                marcado
                                  ? "border-green-500 bg-green-50"
                                  : "bg-white border-gray-200"
                              } border-2 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition-all`}
                              onClick={() => {
                                handleCheckinAluno(aluno, selectedAula);
                              }}
                            >
                              <div className="card-body p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {(aluno as any).foto ? (
                                      <img
                                        src={(aluno as any).foto}
                                        alt={aluno.nome}
                                        className="w-10 h-10 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                        {aluno.nome
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {aluno.nome}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        {aluno.matricula}
                                      </p>
                                      <div className="mt-1">
                                        <BeltTip
                                          faixa={aluno.faixa}
                                          graus={aluno.graus}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      };
                      return (
                        <List
                          height={600}
                          itemCount={
                            itemCount + (checkinQuery.hasNextPage ? 1 : 0)
                          }
                          itemSize={96}
                          width={"100%"}
                          onItemsRendered={({
                            visibleStartIndex,
                            visibleStopIndex,
                          }) => loadMoreIfNeeded({ visibleStopIndex })}
                        >
                          {Row as any}
                        </List>
                      );
                    })()}
                  </div>
                  {/* Indicador de carregamento da próxima página */}
                  {checkinQuery.isFetchingNextPage && (
                    <div className="flex justify-center py-2 text-sm text-gray-500">
                      Carregando mais...
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {selectedTab === "alunos" && (
            <motion.div
              key="alunos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold flex items-center gap-2 text-blue-900">
                <Users className="h-5 w-5 text-blue-600" /> Lista de Alunos
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/50" />
                  <input
                    className="input input-bordered w-full pl-10"
                    placeholder="Buscar aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="select select-bordered select-sm"
                  value={filterFaixa}
                  onChange={(e) => setFilterFaixa(e.target.value as any)}
                >
                  <option value="todos">Todos</option>
                  <option value="kids">Kids</option>
                  <option value="adulto">Adulto</option>
                </select>
              </div>

              <div className="h-[700px]">
                {(() => {
                  const items = (alunosQuery.data?.pages || []).flatMap(
                    (p) => p.items
                  );
                  const itemCount = items.length;
                  const loadMoreIfNeeded = ({
                    visibleStopIndex,
                  }: {
                    visibleStopIndex: number;
                  }) => {
                    if (
                      visibleStopIndex >= itemCount - 5 &&
                      alunosQuery.hasNextPage &&
                      !alunosQuery.isFetchingNextPage
                    ) {
                      alunosQuery.fetchNextPage();
                    }
                  };
                  const Row = ({
                    index,
                    style,
                  }: {
                    index: number;
                    style: React.CSSProperties;
                  }) => {
                    const aluno = items[index];
                    if (!aluno) {
                      return (
                        <div style={style} className="p-4">
                          <div className="skeleton h-16 w-full" />
                        </div>
                      );
                    }
                    return (
                      <div style={style}>
                        <div className="card bg-white border-2 border-blue-200 shadow-md hover:shadow-lg transition-all">
                          <div className="card-body p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                  {aluno.nome
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {aluno.nome}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {aluno.matricula}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`badge ${getBeltClass(
                                    aluno.faixa
                                  )} mr-2`}
                                >
                                  {aluno.faixa}
                                </span>
                                <span className="text-xs opacity-60">
                                  {aluno.graus} graus
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };
                  return (
                    <List
                      height={700}
                      itemCount={itemCount + (alunosQuery.hasNextPage ? 1 : 0)}
                      itemSize={90}
                      width={"100%"}
                      onItemsRendered={({
                        visibleStartIndex,
                        visibleStopIndex,
                      }) => loadMoreIfNeeded({ visibleStopIndex })}
                    >
                      {Row as any}
                    </List>
                  );
                })()}
              </div>
              {alunosQuery.isFetchingNextPage && (
                <div className="flex justify-center py-2 text-sm text-gray-500">
                  Carregando mais...
                </div>
              )}
            </motion.div>
          )}

          {selectedTab === "professores" && (
            <motion.div
              key="professores"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="h-5 w-5 text-red-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Professores
                  </h2>
                  <span className="text-sm text-gray-500">
                    ({professoresQuery.data?.pages[0]?.total || 0} professores)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar professores..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <select
                    value={filterFaixa}
                    onChange={(e) => setFilterFaixa(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="todos">Todas as Categorias</option>
                    <option value="kids">Kids</option>
                    <option value="adulto">Adulto</option>
                  </select>
                </div>
              </div>

              {professoresQuery.isLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              )}

              {professoresQuery.isError && (
                <div className="text-center py-8 text-red-600">
                  Erro ao carregar professores:{" "}
                  {professoresQuery.error?.message}
                </div>
              )}

              {professoresQuery.data && (
                <List
                  height={600}
                  itemCount={
                    professoresQuery.data.pages.reduce(
                      (acc, page) => acc + page.items.length,
                      0
                    ) + (professoresQuery.hasNextPage ? 1 : 0)
                  }
                  itemSize={120}
                  onItemsRendered={({ visibleStopIndex }) => {
                    const totalItems = professoresQuery.data.pages.reduce(
                      (acc, page) => acc + page.items.length,
                      0
                    );
                    if (
                      visibleStopIndex >= totalItems - 5 &&
                      professoresQuery.hasNextPage &&
                      !professoresQuery.isFetchingNextPage
                    ) {
                      professoresQuery.fetchNextPage();
                    }
                  }}
                >
                  {({ index, style }) => {
                    const allItems = professoresQuery.data.pages.reduce(
                      (acc, page) => [...acc, ...page.items],
                      []
                    );
                    const professor = allItems[index];

                    if (!professor) {
                      return (
                        <div style={style} className="px-4 py-3">
                          <div className="animate-pulse bg-gray-200 rounded-lg h-20"></div>
                        </div>
                      );
                    }

                    return (
                      <div style={style} className="px-4 py-3">
                        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                {professor.nome_completo?.charAt(0) || "P"}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                  {professor.nome_completo}
                                </h3>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    professor.status === "ATIVO"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {professor.status || "Ativo"}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="flex items-center text-sm text-gray-600">
                                  <Award className="h-4 w-4 mr-1" />
                                  {professor.faixa_ministrante ||
                                    "Faixa não informada"}
                                </span>
                                {professor.telefone_whatsapp && (
                                  <span className="text-sm text-gray-500">
                                    Tel: {professor.telefone_whatsapp}
                                  </span>
                                )}
                              </div>
                              {professor.especialidades && (
                                <div className="mt-1">
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {professor.especialidades}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                Ver Perfil
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </List>
              )}

              {professoresQuery.isFetchingNextPage && (
                <div className="flex justify-center py-2 text-sm text-gray-500">
                  Carregando mais professores...
                </div>
              )}
            </motion.div>
          )}

          {selectedTab === "unidades" && (
            <motion.div
              key="unidades"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Building2 className="h-8 w-8" />
                        Gerenciamento de Unidades
                      </h2>
                      <p className="text-lg opacity-90 mb-4">
                        Cadastre e gerencie as unidades da franquia
                      </p>
                      <a
                        href="/unidades"
                        className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
                      >
                        Acessar Gerenciamento
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </div>
                    <div className="hidden lg:block">
                      <Building2 className="h-32 w-32 opacity-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      Funcionalidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">📍</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Cadastro Completo
                          </h4>
                          <p className="text-sm text-gray-600">
                            Nome, endereço, responsável e contatos
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">⏰</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Horários de Funcionamento
                          </h4>
                          <p className="text-sm text-gray-600">
                            Configure os horários de cada dia da semana
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">🥋</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Modalidades
                          </h4>
                          <p className="text-sm text-gray-600">
                            Jiu-Jitsu, MMA, Muay Thai e mais
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">🔍</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Busca e Filtros
                          </h4>
                          <p className="text-sm text-gray-600">
                            Encontre unidades por localização ou nome
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-blue-200">
                  <CardHeader>
                    <CardTitle>Estatísticas Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {unidadesStats.isLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="skeleton h-20 w-full rounded-lg"
                          />
                        ))}
                      </div>
                    ) : unidadesStats.error ? (
                      <div className="text-center text-gray-500 py-8">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                        <p>Erro ao carregar estatísticas</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold text-blue-600">
                                {unidadesStats.data?.total || 0}
                              </p>
                              <p className="text-sm text-gray-600">
                                Total de Unidades
                              </p>
                            </div>
                            <Building2 className="h-8 w-8 text-blue-600" />
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold text-green-600">
                                {unidadesStats.data?.ativas || 0}
                              </p>
                              <p className="text-sm text-gray-600">
                                Unidades Ativas
                              </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold text-yellow-600">
                                {unidadesStats.data?.homologacao || 0}
                              </p>
                              <p className="text-sm text-gray-600">
                                Em Planejamento
                              </p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-600" />
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold text-red-600">
                                {unidadesStats.data?.inativas || 0}
                              </p>
                              <p className="text-sm text-gray-600">
                                Inativa
                                {(unidadesStats.data?.inativas || 0) !== 1
                                  ? "s"
                                  : ""}
                              </p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border border-blue-200">
                  <CardHeader>
                    <CardTitle>Ações Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <a
                        href="/unidades"
                        className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-gray-900">
                            Nova Unidade
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </a>

                      <a
                        href="/unidades"
                        className="w-full flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <Search className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-gray-900">
                            Buscar Unidades
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                      </a>

                      <a
                        href="/unidades"
                        className="w-full flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-purple-600" />
                          <span className="font-medium text-gray-900">
                            Relatórios
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                      </a>

                      <a
                        href="/franqueados"
                        className="w-full flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-orange-600" />
                          <span className="font-medium text-gray-900">
                            Ver Franqueados
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-orange-600" />
                      </a>
                    </div>

                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-700 text-center">
                        💡 <strong>Dica:</strong> Use a página de unidades para
                        gerenciar completamente suas franquias
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {selectedTab === "graduacoes" &&
            (() => {
              // Extrair os dados das queries para usar no JSX
              const proximosGraduar = graduacoesQuery.data || [];
              const historicoGraduacoes = historicoQuery.data || [];

              return (
                <motion.div
                  key="graduacoes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 bg-white border border-blue-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-warning" />{" "}
                            Próximos a Graduar
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open("/graduacao", "_blank")}
                            className="flex items-center gap-2"
                          >
                            <Settings className="h-4 w-4" />
                            Gerenciar Graduação
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {graduacoesQuery.isLoading ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="skeleton h-20 w-full rounded-lg"
                              />
                            ))}
                          </div>
                        ) : proximosGraduar.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <GraduationCap className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p>Nenhum aluno próximo a graduar</p>
                          </div>
                        ) : (
                          proximosGraduar.slice(0, 10).map((a: any) => (
                            <div
                              key={a.alunoId || a.id}
                              className="flex items-center justify-between bg-white rounded-xl p-3 border-2 border-blue-100 hover:border-blue-300 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                {a.foto ? (
                                  <img
                                    src={a.foto}
                                    alt={a.nomeCompleto || a.nome}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                    {(a.nomeCompleto || a.nome)
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {a.nomeCompleto || a.nome}
                                  </p>
                                  <div className="mt-1">
                                    <BeltTip
                                      faixa={a.faixa}
                                      graus={a.grausAtual || a.graus || 0}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-gray-600">
                                  Faltam
                                </span>
                                <div className="text-xl font-bold text-blue-600">
                                  {a.faltamAulas || a.faltam || 0}
                                </div>
                                <span className="text-xs text-gray-600">
                                  aulas
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-white border border-blue-200">
                      <CardHeader>
                        <CardTitle>Histórico de Graduações</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {historicoQuery.isLoading ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="skeleton h-16 w-full rounded-lg"
                              />
                            ))}
                          </div>
                        ) : historicoGraduacoes.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Trophy className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">
                              Nenhuma graduação registrada
                            </p>
                            <p className="text-xs mt-1">
                              As graduações aparecerão aqui
                            </p>
                          </div>
                        ) : (
                          historicoGraduacoes.map((g: HistoricoGraduacao) => (
                            <div
                              key={g.id}
                              className="bg-white p-3 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all"
                            >
                              <p className="font-medium text-gray-900">
                                {g.nomeAluno}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: g.faixaAnteriorCor + "20",
                                    color: g.faixaAnteriorCor,
                                  }}
                                >
                                  {g.faixaAnterior}
                                </span>
                                <span className="text-xs text-gray-500">→</span>
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: g.novaFaixaCor + "20",
                                    color: g.novaFaixaCor,
                                  }}
                                >
                                  {g.novaFaixa}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(g.dataGraduacao).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </p>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              );
            })()}

          {selectedTab === "loja" && (
            <motion.div
              key="loja"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Banner Principal da Loja */}
              <Card className="bg-gradient-to-r from-red-600 to-black text-white border-0">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <ShoppingBag className="h-8 w-8" />
                        Loja Virtual TeamCruz
                      </h2>
                      <p className="text-lg opacity-90 mb-4">
                        Equipamentos, uniformes e produtos oficiais da equipe
                      </p>
                      <a
                        href="https://www.lojateamcruz.com.br/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-white text-red-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
                      >
                        Acessar Loja Virtual
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </div>
                    <div className="hidden lg:block">
                      <Package className="h-32 w-32 opacity-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Promoções Ativas */}
              <Card className="bg-white border border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-red-600" />
                    Promoções Ativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border-2 border-yellow-300">
                      <div className="flex items-start justify-between mb-2">
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                          -20%
                        </span>
                        <Tag className="h-4 w-4 text-yellow-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">Kit Iniciante</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Kimono + Faixa + Sacola
                      </p>
                      <p className="text-2xl font-bold text-red-600 mt-2">
                        R$ 199,90
                      </p>
                      <p className="text-xs text-gray-500 line-through">
                        R$ 249,90
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-300">
                      <div className="flex items-start justify-between mb-2">
                        <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                          NOVO
                        </span>
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">
                        Rashguard TeamCruz
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Camiseta de competição
                      </p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        R$ 89,90
                      </p>
                      <p className="text-xs text-green-600">Lançamento</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-300">
                      <div className="flex items-start justify-between mb-2">
                        <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                          COMBO
                        </span>
                        <ShoppingBag className="h-4 w-4 text-purple-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">
                        Pack Competidor
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        3 kimonos + acessórios
                      </p>
                      <p className="text-2xl font-bold text-purple-600 mt-2">
                        R$ 549,90
                      </p>
                      <p className="text-xs text-purple-600">
                        Economize R$ 150
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Categorias de Produtos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white border border-blue-200">
                  <CardHeader>
                    <CardTitle>Categorias Populares</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { nome: "Kimonos", qtd: 24, icon: "🥋" },
                        { nome: "Faixas", qtd: 12, icon: "🎗️" },
                        { nome: "Proteções", qtd: 18, icon: "🛡️" },
                        { nome: "Acessórios", qtd: 35, icon: "🎒" },
                        { nome: "Suplementos", qtd: 8, icon: "💊" },
                      ].map((cat, idx) => (
                        <a
                          key={idx}
                          href="https://www.lojateamcruz.com.br/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{cat.icon}</span>
                            <span className="font-medium text-gray-900">
                              {cat.nome}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {cat.qtd} produtos
                            </span>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-blue-200">
                  <CardHeader>
                    <CardTitle>Benefícios Exclusivos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">✨</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            10% OFF para Alunos
                          </h4>
                          <p className="text-sm text-gray-600">
                            Desconto exclusivo em todos os produtos
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">🚚</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Frete Grátis
                          </h4>
                          <p className="text-sm text-gray-600">
                            Em compras acima de R$ 199
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">🎁</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Pontos de Fidelidade
                          </h4>
                          <p className="text-sm text-gray-600">
                            Acumule pontos e troque por produtos
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">💳</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Parcelamento
                          </h4>
                          <p className="text-sm text-gray-600">
                            Em até 12x sem juros
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-yellow-50 rounded-lg border border-red-200">
                      <p className="text-sm text-gray-700 text-center">
                        <strong>Código Promocional:</strong>{" "}
                        <code className="bg-white px-2 py-1 rounded text-red-600 font-mono">
                          ALUNO10
                        </code>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {selectedTab === "social" && (
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <RedeSocialTeam />
            </motion.div>
          )}

          {selectedTab === "campanhas" && (
            <motion.div
              key="campanhas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CampanhasManager />
            </motion.div>
          )}

          {selectedTab === "aulas" && (
            <motion.div
              key="aulas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Card className="bg-white border border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-info" /> Aulas de Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mockData.aulasHoje.map((aula) => (
                      <div
                        key={aula.id}
                        className={`bg-white rounded-lg shadow-md p-4 border-2 ${
                          aula.status === "concluída"
                            ? "border-green-500"
                            : aula.status === "em andamento"
                            ? "border-blue-500 animate-pulse"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">
                            {aula.horario}
                          </h3>
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                        <p className="font-semibold text-gray-800">
                          {aula.turma}
                        </p>
                        <p className="text-sm text-gray-600">
                          Prof. {aula.instrutor}
                        </p>
                        <div className="flex justify-between items-center mt-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              aula.status === "concluída"
                                ? "bg-green-100 text-green-800"
                                : aula.status === "em andamento"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {aula.status}
                          </span>
                          {aula.alunos > 0 && (
                            <span className="text-xs text-gray-600">
                              {aula.alunos} alunos
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-blue-200">
                <CardHeader>
                  <CardTitle>Próximos Dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {mockAulasSemana.map((a) => (
                      <div
                        key={a.id}
                        className="bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-blue-300 transition-all"
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600">{a.dia}</p>
                              <h3 className="text-xl font-bold text-gray-900">
                                {a.horario}
                              </h3>
                              <p className="font-medium text-gray-800">
                                {a.turma}
                              </p>
                              <p className="text-xs text-gray-600">
                                Prof. {a.instrutor}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {a.vagas}
                              </div>
                              <p className="text-xs text-gray-600">vagas</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de Check-in por CPF */}
      {showCPFModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Check-in por CPF</h3>
            <p className="text-sm text-gray-600 mb-4">
              Digite o CPF do aluno para fazer check-in
            </p>
            <input
              type="text"
              placeholder="Digite o CPF (ex: 123.456.789-00)"
              className="input input-bordered w-full"
              value={cpfInput}
              onChange={(e) => setCpfInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCheckinByCPF()}
              autoFocus
            />
            <div className="text-xs text-gray-500 mt-2">
              CPFs disponíveis para teste:
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {mockAlunos.map((a) => (
                <div key={a.id}>
                  {a.nome}: {a.cpf}
                </div>
              ))}
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowCPFModal(false);
                  setCpfInput("");
                }}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleCheckinByCPF}>
                Confirmar Check-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Localização */}
      {showLocationModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              Ativação de Localização Necessária
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-700">
                    Para fazer check-in, você precisa estar dentro da academia.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Por favor, ative a localização do seu dispositivo e
                    certifique-se de estar na academia.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-800 font-medium mb-2">
                  Como ativar a localização:
                </p>
                <ol className="text-xs text-blue-700 space-y-1">
                  <li>1. Abra as configurações do navegador</li>
                  <li>2. Procure por "Localização" ou "Privacidade"</li>
                  <li>3. Permita o acesso à localização para este site</li>
                  <li>4. Recarregue a página se necessário</li>
                </ol>
              </div>

              {locationError && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-red-700">{locationError}</p>
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowLocationModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  getCurrentPosition();
                  setShowLocationModal(false);
                }}
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de QR Codes */}
      {showQRModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">QR Codes dos Alunos</h3>
            <p className="text-sm text-gray-600 mb-4">
              QR Codes para check-in via celular
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {mockAlunos.map((aluno) => (
                <div
                  key={aluno.id}
                  className="border rounded-lg p-3 text-center"
                >
                  <QRCodeSVG
                    value={`CHECKIN:${aluno.token}:${aluno.id}`}
                    size={100}
                    className="mx-auto mb-2"
                  />
                  <p className="text-sm font-semibold">{aluno.nome}</p>
                  <p className="text-xs text-gray-500">{aluno.matricula}</p>
                  <p className="text-xs text-gray-400">Token: {aluno.token}</p>
                </div>
              ))}
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setShowQRModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações do Sistema */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Configurações do Sistema
                </h2>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="btn btn-ghost btn-circle"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Regras de Graduação
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure as regras de graduação para cada faixa. Estas
                    configurações determinam quantas aulas são necessárias para
                    cada grau e o tempo mínimo entre graduações.
                  </p>

                  <div className="grid gap-4">
                    {Object.entries(graduationConfig).map(([faixa, config]) => (
                      <div key={faixa} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded ${colorBgClass(
                              convertFaixaEnumToDisplayName(faixa)
                            )}`}
                          ></div>
                          {convertFaixaEnumToDisplayName(faixa)}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Aulas por Grau
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={config.aulasPorGrau}
                              onChange={(e) => {
                                const newConfig = { ...graduationConfig };
                                newConfig[
                                  faixa as keyof typeof graduationConfig
                                ].aulasPorGrau = parseInt(e.target.value) || 20;
                                setGraduationConfig(newConfig);
                              }}
                              className="input input-bordered w-full input-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Máximo de Graus
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={config.maximoGraus}
                              onChange={(e) => {
                                const newConfig = { ...graduationConfig };
                                newConfig[
                                  faixa as keyof typeof graduationConfig
                                ].maximoGraus = parseInt(e.target.value) || 4;
                                setGraduationConfig(newConfig);
                              }}
                              className="input input-bordered w-full input-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tempo Minimo (meses)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="24"
                              value={config.tempoMinimo}
                              onChange={(e) => {
                                const newConfig = { ...graduationConfig };
                                newConfig[
                                  faixa as keyof typeof graduationConfig
                                ].tempoMinimo = parseInt(e.target.value) || 3;
                                setGraduationConfig(newConfig);
                              }}
                              className="input input-bordered w-full input-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // TODO: Salvar configurações no backend
                    setShowConfigModal(false);
                  }}
                  className="btn btn-primary"
                >
                  Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
