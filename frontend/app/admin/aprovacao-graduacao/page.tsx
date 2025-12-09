"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  listarParametros,
  listarAlunosAptos,
  aprovarGraduacao,
  graduarAlunoManual,
  listarFaixasValidasParaGraduacaoManual,
  listarGraduacoesPendentes,
  listarGraduacoesAprovadas,
  aprovarGraduacoesEmMassa,
  type AlunoAptoGraduacao,
  type GraduacaoDetalhada,
} from "@/lib/graduacaoParametrosApi";
import { listAlunos } from "@/lib/peopleApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Trophy,
  Users,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Settings,
  Award,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AprovacaoGraduacaoPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [parametroSelecionado, setParametroSelecionado] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "pendente" | "aprovado"
  >("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAluno, setSelectedAluno] = useState<AlunoAptoGraduacao | null>(
    null
  );
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [observacao, setObservacao] = useState("");
  // Estados para graduação manual
  const [activeTab, setActiveTab] = useState<
    "automatica" | "manual" | "pendentes" | "aprovados"
  >("manual");
  const [searchAlunoManual, setSearchAlunoManual] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<
    "todos" | "kids" | "adulto"
  >("todos");
  const [filtroFaixa, setFiltroFaixa] = useState<string>("todas");
  const [selectedAlunoManual, setSelectedAlunoManual] = useState<{
    id: string;
    nome: string;
    faixa_nome: string;
    faixa_cor: string;
    unidade_nome: string;
    data_nascimento: string;
  } | null>(null);
  const [showGraduacaoManualModal, setShowGraduacaoManualModal] =
    useState(false);

  const [faixaDestinoId, setFaixaDestinoId] = useState("");
  const [observacaoManual, setObservacaoManual] = useState("");
  const [tamanhoFaixa, setTamanhoFaixa] = useState("");
  const [aprovarDireto, setAprovarDireto] = useState(false);
  const [graduacoesSelecionadas, setGraduacoesSelecionadas] = useState<
    string[]
  >([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Verificar permissões
  const hasPerfil = (p: string) =>
    (user?.perfis || [])
      .map((x: string) => x.toLowerCase())
      .includes(p.toLowerCase());

  const podeAprovar =
    hasPerfil("master") ||
    hasPerfil("admin") ||
    hasPerfil("professor") ||
    hasPerfil("instrutor") ||
    hasPerfil("gerente_unidade") ||
    hasPerfil("franqueado");

  // Queries
  const parametrosQuery = useQuery({
    queryKey: ["parametros-graduacao"],
    queryFn: () => listarParametros(),
  });

  const alunosAptosQuery = useQuery({
    queryKey: ["alunos-aptos", parametroSelecionado],
    queryFn: () => listarAlunosAptos(parametroSelecionado || undefined),
    enabled: !!parametroSelecionado || parametroSelecionado === "",
  });

  // Query para buscar todos os alunos (graduação manual)
  const todosAlunosQuery = useQuery({
    queryKey: ["todos-alunos-graduacao"],
    queryFn: async () => {
      // Se for franqueado, buscar alunos de todas as unidades
      // Se for gerente/professor, buscar apenas da unidade dele
      const params: any = { pageSize: 1000, status: "ATIVO" };

      // Não aplicar filtro de unidade se for franqueado (verá todas as unidades)
      // O backend já filtra automaticamente baseado no perfil

      return listAlunos(params);
    },
    enabled: activeTab === "manual",
  });

  // Query para buscar faixas disponíveis (válidas para graduação)
  const faixasQuery = useQuery({
    queryKey: [
      "faixas-graduacao",
      selectedAlunoManual?.id,
      showGraduacaoManualModal,
    ],
    queryFn: async () => {
      if (!selectedAlunoManual?.id) {
        return [];
      }

      try {
        // Buscar próxima faixa usando endpoint de graduação MANUAL (sem validar graus)
        const faixasValidas = await listarFaixasValidasParaGraduacaoManual(
          selectedAlunoManual.id,
          "ADULTO"
        );

        return faixasValidas;
      } catch (error) {
        console.error(" Erro ao buscar faixas válidas:", error);
        // Retorna array vazio em caso de erro
        return [];
      }
    },
    enabled:
      activeTab === "manual" &&
      !!selectedAlunoManual &&
      showGraduacaoManualModal,
  });

  // Query para graduações pendentes
  const graduacoesPendentesQuery = useQuery({
    queryKey: ["graduacoes-pendentes"],
    queryFn: listarGraduacoesPendentes,
    enabled: activeTab === "pendentes",
  });

  // Query para graduações aprovadas
  const graduacoesAprovadasQuery = useQuery({
    queryKey: ["graduacoes-aprovadas"],
    queryFn: listarGraduacoesAprovadas,
    enabled: activeTab === "aprovados",
  });

  // Mutations
  const aprovarMutation = useMutation({
    mutationFn: (data: {
      aluno_id: string;
      faixa_origem_id: string;
      faixa_destino_id: string;
      parametro_id?: string;
      observacao_aprovacao?: string;
    }) => aprovarGraduacao(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alunos-aptos"] });
      toast.success("Graduação aprovada com sucesso!");
      setShowAprovarModal(false);
      setSelectedAluno(null);
      setObservacao("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao aprovar graduação");
    },
  });

  // Mutation para graduação manual
  const graduarManualMutation = useMutation({
    mutationFn: (data: {
      alunoId: string;
      faixaDestinoId: string;
      observacao?: string;
      tamanhoFaixa?: string;
      aprovarDireto?: boolean;
    }) =>
      graduarAlunoManual(data.alunoId, {
        faixaDestinoId: data.faixaDestinoId,
        observacao: data.observacao,
        tamanhoFaixa: data.tamanhoFaixa,
        aprovarDireto: data.aprovarDireto,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["todos-alunos-graduacao"] });
      queryClient.invalidateQueries({ queryKey: ["alunos-aptos"] });
      const mensagem = variables.aprovarDireto
        ? "Aluno graduado e aprovado com sucesso!"
        : "Graduação solicitada! Aguardando aprovação.";
      toast.success(mensagem);
      setShowGraduacaoManualModal(false);
      setSelectedAlunoManual(null);
      setObservacaoManual("");
      setFaixaDestinoId("");
      setTamanhoFaixa("");
      setAprovarDireto(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao graduar aluno");
    },
  });

  // Mutation para aprovar graduações em massa
  const aprovarEmMassaMutation = useMutation({
    mutationFn: aprovarGraduacoesEmMassa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graduacoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["graduacoes-aprovadas"] });
      queryClient.invalidateQueries({ queryKey: ["todos-alunos-graduacao"] });
      toast.success(
        `${graduacoesSelecionadas.length} graduação(ões) aprovada(s) com sucesso!`
      );
      setGraduacoesSelecionadas([]);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao aprovar graduações");
    },
  });

  // Effect para selecionar automaticamente a primeira faixa válida quando as faixas forem carregadas
  useEffect(() => {
    if (
      faixasQuery.data &&
      faixasQuery.data.length > 0 &&
      showGraduacaoManualModal
    ) {
      // Selecionar automaticamente a primeira faixa (próxima faixa em ordem)
      setFaixaDestinoId(faixasQuery.data[0].id);
    }
  }, [faixasQuery.data, showGraduacaoManualModal]);

  const handleAprovar = (aluno: AlunoAptoGraduacao) => {
    if (!aluno.proxima_faixa_id) {
      toast.error("Não foi possível identificar a próxima faixa");
      return;
    }

    setSelectedAluno(aluno);
    setShowAprovarModal(true);
  };

  const confirmarAprovacao = () => {
    if (!selectedAluno || !selectedAluno.proxima_faixa_id) return;

    aprovarMutation.mutate({
      aluno_id: selectedAluno.aluno_id,
      faixa_origem_id: selectedAluno.faixa_atual_id,
      faixa_destino_id: selectedAluno.proxima_faixa_id,
      parametro_id: parametroSelecionado || undefined,
      observacao_aprovacao: observacao || undefined,
    });
  };

  const parametros = parametrosQuery.data || [];
  const alunosAptos = alunosAptosQuery.data || [];

  // Filtros
  const alunosFiltrados = alunosAptos
    .filter((aluno) => {
      if (filtroStatus === "pendente") return !aluno.graduacao_aprovada;
      if (filtroStatus === "aprovado") return aluno.graduacao_aprovada;
      return true;
    })
    .filter((aluno) =>
      aluno.aluno_nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Estatísticas
  const stats = {
    total: alunosAptos.length,
    pendentes: alunosAptos.filter((a) => !a.graduacao_aprovada).length,
    aprovados: alunosAptos.filter((a) => a.graduacao_aprovada).length,
  };

  // Mapear cores das faixas baseado no enum
  const getFaixaCorByEnum = (faixaEnum: string): string => {
    const coresFaixas: Record<string, string> = {
      BRANCA: "#FFFFFF",
      CINZA_BRANCA: "#CCCCCC",
      CINZA: "#808080",
      CINZA_PRETA: "#404040",
      AMARELA_BRANCA: "#FFFF99",
      AMARELA: "#FFFF00",
      AMARELA_PRETA: "#CCCC00",
      LARANJA_BRANCA: "#FFCC99",
      LARANJA: "#FF7F50",
      LARANJA_PRETA: "#FF4500",
      VERDE_BRANCA: "#99FF99",
      VERDE: "#00FF00",
      VERDE_PRETA: "#008000",
      AZUL: "#0066CC",
      ROXA: "#6600CC",
      MARROM: "#8B4513",
      PRETA: "#000000",
      CORAL: "#FF7F50",
      VERMELHA: "#FF0000",
    };
    return coresFaixas[faixaEnum] || "#FFFFFF";
  };

  const getFaixaCorClass = (cor: string) => {
    const cores: Record<string, string> = {
      "#FFFFFF": "bg-gray-100 text-gray-800 border-gray-300",
      "#0066CC": "bg-blue-100 text-blue-800 border-blue-300",
      "#6600CC": "bg-purple-100 text-purple-800 border-purple-300",
      "#8B4513": "bg-amber-100 text-amber-800 border-amber-300",
      "#000000": "bg-gray-900 text-white border-gray-700",
      "#FF7F50": "bg-orange-100 text-orange-800 border-orange-300",
      "#FF0000": "bg-red-100 text-red-800 border-red-300",
      "#CCCCCC": "bg-gray-200 text-gray-800 border-gray-400",
      "#808080": "bg-gray-300 text-gray-800 border-gray-500",
      "#404040": "bg-gray-600 text-white border-gray-700",
      "#FFFF99": "bg-yellow-100 text-yellow-800 border-yellow-300",
      "#FFFF00": "bg-yellow-200 text-yellow-800 border-yellow-400",
      "#CCCC00": "bg-yellow-300 text-yellow-800 border-yellow-500",
      "#FFCC99": "bg-orange-50 text-orange-800 border-orange-200",
      "#FF4500": "bg-orange-200 text-orange-800 border-orange-400",
      "#99FF99": "bg-green-50 text-green-800 border-green-200",
      "#00FF00": "bg-green-200 text-green-800 border-green-400",
      "#008000": "bg-green-600 text-white border-green-700",
    };
    return cores[cor] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Função para calcular categoria do aluno (Kids ou Adulto)
  const calcularCategoria = (dataNascimento: string): "kids" | "adulto" => {
    if (!dataNascimento) return "adulto";
    const anoNascimento = new Date(dataNascimento).getFullYear();
    const anoAtual = new Date().getFullYear();
    const idade = anoAtual - anoNascimento;
    return idade <= 15 ? "kids" : "adulto";
  };

  // Função para obter cor de fundo da faixa
  const colorBgClass = (nome: string): string => {
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
      Roxo: "bg-purple-700",
      Marrom: "bg-amber-800",
      Coral: "bg-red-500",
      Vermelha: "bg-red-600",
      // Variações com hífen
      "Cinza-Branca": "bg-gray-400",
      "Cinza-Preta": "bg-gray-400",
      "Amarela-Branca": "bg-yellow-400",
      "Amarela-Preta": "bg-yellow-400",
      "Laranja-Branca": "bg-orange-500",
      "Laranja-Preta": "bg-orange-500",
      "Verde-Branca": "bg-green-600",
      "Verde-Preta": "bg-green-600",
      // Variações com underscore (do banco)
      BRANCA: "bg-white",
      CINZA: "bg-gray-400",
      PRETA: "bg-black",
      AMARELA: "bg-yellow-400",
      LARANJA: "bg-orange-500",
      VERDE: "bg-green-600",
      AZUL: "bg-blue-600",
      ROXA: "bg-purple-700",
      MARROM: "bg-amber-800",
      CINZA_BRANCA: "bg-gray-400",
      CINZA_PRETA: "bg-gray-400",
      AMARELA_BRANCA: "bg-yellow-400",
      AMARELA_PRETA: "bg-yellow-400",
      LARANJA_BRANCA: "bg-orange-500",
      LARANJA_PRETA: "bg-orange-500",
      VERDE_BRANCA: "bg-green-600",
      VERDE_PRETA: "bg-green-600",
      AZUL_BRANCA: "bg-blue-600",
      AZUL_PRETA: "bg-blue-600",
      // Variações lowercase
      branca: "bg-white",
      cinza: "bg-gray-400",
      preta: "bg-black",
      amarela: "bg-yellow-400",
      laranja: "bg-orange-500",
      verde: "bg-green-600",
      azul: "bg-blue-600",
      roxa: "bg-purple-700",
      roxo: "bg-purple-700",
      marrom: "bg-amber-800",
    };
    return map[nome] || "bg-gray-300";
  };

  // Função para verificar se é faixa kids e extrair padrão
  const KIDS_BASES = ["Cinza", "Amarela", "Laranja", "Verde"];
  const parseKidsPattern = (
    faixa: string
  ): {
    isKids: boolean;
    base?: string;
    stripe?: "white" | "black" | null;
  } => {
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
  };

  // Função para obter segmentos principais da faixa
  const getBeltMainSegments = (faixa: string): string[] => {
    const raw = faixa.replace(/\s+/g, " ").trim();
    // Suporta separadores: -, /, "e", " e "
    const parts = raw.split(/\s*[-\/]\s*|\s+e\s+/i).map((p) => p.trim());
    if (parts.length >= 2) return [parts[0], parts[1]];
    return [raw];
  };

  // Componente visual da faixa
  const BeltDisplay = ({
    faixa,
    graus = 0,
  }: {
    faixa: string;
    graus?: number;
  }) => {
    const kids = parseKidsPattern(faixa);
    const segments = kids.isKids
      ? [kids.base as string]
      : getBeltMainSegments(faixa);

    return (
      <div className="flex items-center w-28 h-4 rounded-sm overflow-hidden ring-1 ring-black/20 shadow-sm">
        <div className="relative flex-1 h-full flex">
          {segments.length === 2 ? (
            <>
              <div
                className={`flex-1 h-full ${colorBgClass(segments[0])}`}
              ></div>
              <div
                className={`flex-1 h-full ${colorBgClass(segments[1])}`}
              ></div>
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
        {/* Ponteira preta sempre visível */}
        <div className="flex items-center justify-start bg-black h-full w-9 px-1 gap-0.5">
          {graus > 0 ? (
            // Se tem graus, mostrar os graus brancos
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`h-2.5 w-1 rounded-sm ${
                  i < graus ? "bg-white" : "bg-white/30"
                }`}
              />
            ))
          ) : (
            // Se não tem graus, mostrar apenas a ponteira preta
            <div className="w-full h-full"></div>
          )}
        </div>
      </div>
    );
  };

  if (!podeAprovar) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Restrito
          </h1>
          <p className="text-gray-600">
            Você não tem permissão para aprovar graduações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-3 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Aprovação de Graduações
            </h1>
          </div>
          <p className="text-gray-600">
            Gerencie e aprove solicitações de graduação de alunos
          </p>
        </div>

        {/* Tabs para Graduação */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("manual")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "manual"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Graduação Manual
            </button>
            <button
              onClick={() => setActiveTab("automatica")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "automatica"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Graduação Automática
            </button>
            <button
              onClick={() => setActiveTab("pendentes")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "pendentes"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Aprovar Graduações
            </button>
            <button
              onClick={() => setActiveTab("aprovados")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "aprovados"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Relatório de Graduados
            </button>
          </nav>
        </div>

        {/* Conteúdo da Tab Automática */}
        {activeTab === "automatica" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Alunos Aptos
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    Prontos para graduar
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pendentes
                  </CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.pendentes}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Aguardando aprovação
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Aprovadas
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.aprovados}
                  </div>
                  <p className="text-xs text-muted-foreground">Já aprovadas</p>
                </CardContent>
              </Card>
            </div>

            {/* Filtros */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Período de Graduação
                    </label>
                    <select
                      value={parametroSelecionado}
                      onChange={(e) => setParametroSelecionado(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos os Períodos</option>
                      {parametros.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} (
                          {new Date(p.data_inicio).toLocaleDateString()} -{" "}
                          {new Date(p.data_fim).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={filtroStatus}
                      onChange={(e) =>
                        setFiltroStatus(
                          e.target.value as "todos" | "pendente" | "aprovado"
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="todos">Todos</option>
                      <option value="pendente">Pendentes</option>
                      <option value="aprovado">Aprovados</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar Aluno
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nome do aluno..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações do Período */}
            {parametroSelecionado && (
              <Card className="mb-6 bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-blue-900">
                        Período Selecionado:{" "}
                        {
                          parametros.find((p) => p.id === parametroSelecionado)
                            ?.nome
                        }
                      </p>
                      <p className="text-sm text-blue-700">
                        Critérios: Mínimo{" "}
                        {
                          parametros.find((p) => p.id === parametroSelecionado)
                            ?.graus_minimos
                        }{" "}
                        graus |{" "}
                        {
                          parametros.find((p) => p.id === parametroSelecionado)
                            ?.presencas_minimas
                        }{" "}
                        presenças
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de Alunos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Alunos Aptos para Graduação ({alunosFiltrados.length})
                </CardTitle>
                <CardDescription>
                  {filtroStatus === "pendente"
                    ? "Alunos aguardando aprovação"
                    : filtroStatus === "aprovado"
                    ? "Alunos com graduação aprovada"
                    : "Todos os alunos aptos para graduar"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alunosFiltrados.map((aluno) => (
                    <div
                      key={aluno.aluno_id}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        aluno.graduacao_aprovada
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              {aluno.aluno_nome}
                            </h3>
                            {aluno.graduacao_aprovada && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Aprovada
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-sm text-gray-600">
                              📍 {aluno.unidade_nome}
                            </span>
                            <span className="text-sm text-gray-600">
                              CPF: {aluno.aluno_cpf}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700 font-medium">
                                Atual:
                              </span>
                              <BeltDisplay
                                faixa={aluno.faixa_atual_nome}
                                graus={aluno.graus_atual}
                              />
                            </div>
                            <span className="text-gray-400 text-xl">→</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700 font-medium">
                                Próxima:
                              </span>
                              <BeltDisplay
                                faixa={aluno.proxima_faixa_nome || "N/A"}
                                graus={0}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Presenças:</span>
                              <span className="ml-2 font-semibold">
                                {aluno.presencas_total}
                              </span>
                              {aluno.presencas_suficientes ? (
                                <span className="ml-1 text-green-600">✓</span>
                              ) : (
                                <span className="ml-1 text-red-600">✗</span>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-600">Graus:</span>
                              <span className="ml-2 font-semibold">
                                {aluno.graus_atual}
                              </span>
                              {aluno.graus_suficientes ? (
                                <span className="ml-1 text-green-600">✓</span>
                              ) : (
                                <span className="ml-1 text-red-600">✗</span>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-600">
                                Na faixa desde:
                              </span>
                              <span className="ml-2 font-semibold">
                                {new Date(
                                  aluno.data_inicio_faixa
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {aluno.graduacao_data_aprovacao && (
                            <div className="mt-2 text-sm text-green-700">
                              Aprovada em:{" "}
                              {new Date(
                                aluno.graduacao_data_aprovacao
                              ).toLocaleDateString()}
                            </div>
                          )}

                          {aluno.observacao_aprovacao && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded">
                              <strong>Obs:</strong> {aluno.observacao_aprovacao}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {!aluno.graduacao_aprovada && (
                            <button
                              onClick={() => handleAprovar(aluno)}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Aprovar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {alunosFiltrados.length === 0 && (
                    <div className="text-center py-12">
                      <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg">
                        Nenhum aluno encontrado
                      </p>
                      <p className="text-gray-500 text-sm">
                        Ajuste os filtros ou selecione outro período
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Modal de Aprovação */}
            {showAprovarModal && selectedAluno && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Aprovar Graduação
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {selectedAluno.aluno_nome}
                    </p>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex items-center justify-center gap-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-600 mb-2">
                            Faixa Atual
                          </p>
                          <BeltDisplay
                            faixa={selectedAluno.faixa_atual_nome}
                            graus={selectedAluno.graus_atual}
                          />
                        </div>
                        <div className="text-gray-400 text-2xl font-light">
                          →
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-600 mb-2">
                            Nova Faixa
                          </p>
                          <BeltDisplay
                            faixa={selectedAluno.proxima_faixa_nome || "N/A"}
                            graus={0}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações da Aprovação (opcional)
                      </label>
                      <textarea
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Ex: Excelente evolução técnica, dedicação exemplar..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAprovarModal(false);
                        setSelectedAluno(null);
                        setObservacao("");
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmarAprovacao}
                      disabled={aprovarMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {aprovarMutation.isPending && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      <CheckCircle className="h-4 w-4" />
                      Confirmar Aprovação
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Conteúdo da Tab Manual */}
        {activeTab === "manual" && (
          <div className="space-y-6">
            {/* Buscar Aluno */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar Aluno para Graduação Manual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={filtroCategoria}
                      onChange={(e) =>
                        setFiltroCategoria(
                          e.target.value as "todos" | "kids" | "adulto"
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="todos">Todos</option>
                      <option value="kids">Kids (≤15 anos)</option>
                      <option value="adulto">Adulto (16+ anos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Faixa Atual
                    </label>
                    <select
                      value={filtroFaixa}
                      onChange={(e) => setFiltroFaixa(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="todas">Todas as Faixas</option>
                      <option value="BRANCA">Branca</option>
                      <option value="CINZA_BRANCA">Cinza-Branca</option>
                      <option value="CINZA">Cinza</option>
                      <option value="CINZA_PRETA">Cinza-Preta</option>
                      <option value="AMARELA_BRANCA">Amarela-Branca</option>
                      <option value="AMARELA">Amarela</option>
                      <option value="AMARELA_PRETA">Amarela-Preta</option>
                      <option value="LARANJA_BRANCA">Laranja-Branca</option>
                      <option value="LARANJA">Laranja</option>
                      <option value="LARANJA_PRETA">Laranja-Preta</option>
                      <option value="VERDE_BRANCA">Verde-Branca</option>
                      <option value="VERDE">Verde</option>
                      <option value="VERDE_PRETA">Verde-Preta</option>
                      <option value="AZUL">Azul</option>
                      <option value="ROXA">Roxa</option>
                      <option value="MARROM">Marrom</option>
                      <option value="PRETA">Preta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Buscar por Nome
                    </label>
                    <input
                      type="text"
                      placeholder="Digite o nome do aluno..."
                      value={searchAlunoManual}
                      onChange={(e) => setSearchAlunoManual(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowGraduacaoManualModal(true)}
                    disabled={!selectedAlunoManual}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Graduar Aluno Selecionado
                  </button>
                </div>

                {/* Lista de Alunos Filtrados */}
                <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                  {todosAlunosQuery.data?.items
                    ?.filter((aluno) => {
                      // Filtro por nome
                      const matchNome = searchAlunoManual
                        ? aluno.nome_completo
                            ?.toLowerCase()
                            ?.includes(searchAlunoManual.toLowerCase())
                        : true;

                      // Filtro por categoria
                      const categoria = calcularCategoria(
                        aluno.data_nascimento
                      );
                      const matchCategoria =
                        filtroCategoria === "todos" ||
                        filtroCategoria === categoria;

                      // Filtro por faixa
                      const matchFaixa =
                        filtroFaixa === "todas" ||
                        aluno.faixa_atual === filtroFaixa;

                      return matchNome && matchCategoria && matchFaixa;
                    })
                    .map((aluno) => {
                      const faixaAtiva =
                        aluno.faixas?.find((f) => f.ativa) || aluno.faixas?.[0];
                      const faixaNome =
                        faixaAtiva?.faixaDef?.nome_exibicao ||
                        aluno.faixa_atual?.replace(/_/g, " ") ||
                        "Sem faixa";
                      const faixaCor =
                        faixaAtiva?.faixaDef?.cor_hex ||
                        getFaixaCorByEnum(aluno.faixa_atual) ||
                        "#FFFFFF";
                      const grausAtual = faixaAtiva?.graus || 0;
                      const categoria = calcularCategoria(
                        aluno.data_nascimento
                      );

                      return (
                        <div
                          key={aluno.id}
                          onClick={() => {
                            setSelectedAlunoManual({
                              id: aluno.id,
                              nome: aluno.nome_completo,
                              faixa_nome: faixaNome,
                              faixa_cor: faixaCor,
                              unidade_nome:
                                aluno.unidade?.nome || "Sem unidade",
                              data_nascimento: aluno.data_nascimento,
                            });
                            setSearchAlunoManual(aluno.nome_completo);
                          }}
                          className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedAlunoManual?.id === aluno.id
                              ? "bg-blue-50"
                              : ""
                          }`}
                        >
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {aluno.nome_completo}
                              </p>
                              <p className="text-sm text-gray-500 mt-0.5">
                                Unidade: {aluno.unidade?.nome || "Sem unidade"}{" "}
                                |
                                <span
                                  className={`ml-1 font-medium ${
                                    categoria === "kids"
                                      ? "text-blue-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {categoria === "kids" ? "Kids" : "Adulto"}
                                </span>
                                {aluno.data_nascimento && (
                                  <>
                                    {" | "}
                                    <span className="text-gray-600">
                                      Nasc:{" "}
                                      {new Date(
                                        aluno.data_nascimento
                                      ).toLocaleDateString("pt-BR")}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <BeltDisplay
                                faixa={faixaNome}
                                graus={grausAtual}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {todosAlunosQuery.data?.items?.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      Nenhum aluno encontrado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informações do Aluno Selecionado */}
            {selectedAlunoManual && (
              <Card>
                <CardHeader>
                  <CardTitle>Aluno Selecionado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Nome</p>
                      <p className="font-medium">{selectedAlunoManual.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Faixa Atual</p>
                      <p className="text-base font-semibold text-gray-900 mb-1">
                        {selectedAlunoManual.faixa_nome}
                      </p>
                      <BeltDisplay
                        faixa={selectedAlunoManual.faixa_nome}
                        graus={0}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Unidade</p>
                      <p className="font-medium">
                        {selectedAlunoManual.unidade_nome}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        Data de Nascimento
                      </p>
                      <p className="font-medium">
                        {new Date(
                          selectedAlunoManual.data_nascimento
                        ).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {/* Botão de Graduação */}
                  <div className="mt-6">
                    <button
                      onClick={() => setShowGraduacaoManualModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Graduar Aluno
                    </button>
                  </div>

                  {/* Campo de Observação */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observação (opcional)
                    </label>
                    <textarea
                      value={observacaoManual}
                      onChange={(e) => setObservacaoManual(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Adicione uma observação sobre esta graduação..."
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Conteúdo da Tab Pendentes */}
        {activeTab === "pendentes" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Graduações Aguardando Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {graduacoesPendentesQuery.isLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : graduacoesPendentesQuery.data?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma graduação pendente de aprovação
                </div>
              ) : (
                <div className="space-y-4">
                  {graduacoesSelecionadas.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium">
                        {graduacoesSelecionadas.length} selecionada(s)
                      </span>
                      <button
                        onClick={() =>
                          aprovarEmMassaMutation.mutate(graduacoesSelecionadas)
                        }
                        disabled={aprovarEmMassaMutation.isPending}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        Aprovar Selecionadas
                      </button>
                    </div>
                  )}

                  {/* Checkbox Selecionar Todos */}
                  {graduacoesPendentesQuery.data &&
                    graduacoesPendentesQuery.data.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="checkbox"
                            checked={
                              graduacoesSelecionadas.length ===
                                graduacoesPendentesQuery.data.filter((grad) => {
                                  if (!dataInicio && !dataFim) return true;
                                  const gradDate = new Date(grad.created_at);
                                  const inicio = dataInicio
                                    ? new Date(dataInicio)
                                    : null;
                                  const fim = dataFim
                                    ? new Date(dataFim + "T23:59:59")
                                    : null;
                                  if (inicio && gradDate < inicio) return false;
                                  if (fim && gradDate > fim) return false;
                                  return true;
                                }).length &&
                              graduacoesPendentesQuery.data.filter((grad) => {
                                if (!dataInicio && !dataFim) return true;
                                const gradDate = new Date(grad.created_at);
                                const inicio = dataInicio
                                  ? new Date(dataInicio)
                                  : null;
                                const fim = dataFim
                                  ? new Date(dataFim + "T23:59:59")
                                  : null;
                                if (inicio && gradDate < inicio) return false;
                                if (fim && gradDate > fim) return false;
                                return true;
                              }).length > 0
                            }
                            onChange={(e) => {
                              const graduacoesFiltradas =
                                graduacoesPendentesQuery.data.filter((grad) => {
                                  if (!dataInicio && !dataFim) return true;
                                  const gradDate = new Date(grad.created_at);
                                  const inicio = dataInicio
                                    ? new Date(dataInicio)
                                    : null;
                                  const fim = dataFim
                                    ? new Date(dataFim + "T23:59:59")
                                    : null;
                                  if (inicio && gradDate < inicio) return false;
                                  if (fim && gradDate > fim) return false;
                                  return true;
                                });
                              if (e.target.checked) {
                                setGraduacoesSelecionadas(
                                  graduacoesFiltradas.map((g) => g.id)
                                );
                              } else {
                                setGraduacoesSelecionadas([]);
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <label className="text-sm font-medium text-gray-700">
                            Selecionar todos (
                            {
                              graduacoesPendentesQuery.data.filter((grad) => {
                                if (!dataInicio && !dataFim) return true;
                                const gradDate = new Date(grad.created_at);
                                const inicio = dataInicio
                                  ? new Date(dataInicio)
                                  : null;
                                const fim = dataFim
                                  ? new Date(dataFim + "T23:59:59")
                                  : null;
                                if (inicio && gradDate < inicio) return false;
                                if (fim && gradDate > fim) return false;
                                return true;
                              }).length
                            }
                            )
                          </label>
                        </div>

                        {/* Filtro de Data */}
                        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">
                              De:
                            </label>
                            <input
                              type="date"
                              value={dataInicio}
                              onChange={(e) => setDataInicio(e.target.value)}
                              max={new Date().toISOString().split("T")[0]}
                              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">
                              Até:
                            </label>
                            <input
                              type="date"
                              value={dataFim}
                              onChange={(e) => setDataFim(e.target.value)}
                              max={new Date().toISOString().split("T")[0]}
                              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          {(dataInicio || dataFim) && (
                            <button
                              onClick={() => {
                                setDataInicio("");
                                setDataFim("");
                              }}
                              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Limpar filtro
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  {graduacoesPendentesQuery.data
                    ?.filter((grad) => {
                      if (!dataInicio && !dataFim) return true;
                      const gradDate = new Date(grad.created_at);
                      const inicio = dataInicio ? new Date(dataInicio) : null;
                      const fim = dataFim
                        ? new Date(dataFim + "T23:59:59")
                        : null;
                      if (inicio && gradDate < inicio) return false;
                      if (fim && gradDate > fim) return false;
                      return true;
                    })
                    .map((grad: GraduacaoDetalhada) => (
                      <div
                        key={grad.id}
                        className="p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={graduacoesSelecionadas.includes(grad.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setGraduacoesSelecionadas([
                                    ...graduacoesSelecionadas,
                                    grad.id,
                                  ]);
                                } else {
                                  setGraduacoesSelecionadas(
                                    graduacoesSelecionadas.filter(
                                      (id) => id !== grad.id
                                    )
                                  );
                                }
                              }}
                              className="mt-1"
                            />
                            <div>
                              <p className="font-semibold">
                                {grad.aluno?.nome_completo}
                              </p>
                              <p className="text-sm text-gray-600">
                                {grad.faixaOrigem?.nome_exibicao} →{" "}
                                {grad.faixaDestino?.nome_exibicao}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Solicitado em:{" "}
                                {new Date(grad.created_at).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </p>
                              {grad.tamanho_faixa && (
                                <p className="text-xs text-gray-500">
                                  Tamanho: {grad.tamanho_faixa}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Conteúdo da Tab Aprovados */}
        {activeTab === "aprovados" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Relatório de Graduações Aprovadas
                </CardTitle>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  Imprimir Relatório
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {graduacoesAprovadasQuery.isLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : graduacoesAprovadasQuery.data?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma graduação aprovada ainda
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Aluno
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Faixa Origem
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Faixa Destino
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tamanho
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Data Aprovação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {graduacoesAprovadasQuery.data?.map(
                        (grad: GraduacaoDetalhada) => (
                          <tr key={grad.id}>
                            <td className="px-4 py-3">
                              {grad.aluno?.nome_completo}
                            </td>
                            <td className="px-4 py-3">
                              {grad.faixaOrigem?.nome_exibicao}
                            </td>
                            <td className="px-4 py-3 font-semibold text-green-600">
                              {grad.faixaDestino?.nome_exibicao}
                            </td>
                            <td className="px-4 py-3">
                              {grad.tamanho_faixa || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {new Date(grad.dt_aprovacao).toLocaleDateString(
                                "pt-BR"
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal de Graduação Manual */}
        {showGraduacaoManualModal && selectedAlunoManual && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Graduação Manual - {selectedAlunoManual.nome}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                {/* Faixa Atual */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Faixa Atual do Aluno
                  </p>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-gray-900">
                      {selectedAlunoManual.faixa_nome}
                    </p>
                    <BeltDisplay
                      faixa={selectedAlunoManual.faixa_nome}
                      graus={0}
                    />
                  </div>
                </div>

                {/* Seleção de Faixa */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Faixa de Destino
                  </label>
                  <div className="mb-3 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded border">
                    ℹ️ Apenas faixas com ordem superior à atual são exibidas
                    (graduação sequencial)
                  </div>
                  <select
                    value={faixaDestinoId}
                    onChange={(e) => setFaixaDestinoId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-500">
                      Selecione uma faixa
                    </option>
                    {(() => {
                      if (faixasQuery.isLoading) {
                        return <option value="">Carregando faixas...</option>;
                      }

                      if (faixasQuery.error) {
                        return (
                          <option value="">Erro ao carregar faixas</option>
                        );
                      }

                      if (!faixasQuery.data || faixasQuery.data.length === 0) {
                        return (
                          <option value="">Nenhuma faixa encontrada</option>
                        );
                      }

                      return faixasQuery.data.map((faixa) => (
                        <option
                          key={faixa.id}
                          value={faixa.id}
                          className="text-gray-900"
                        >
                          {faixa.nome_exibicao}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Tamanho da Faixa */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Tamanho da Faixa
                  </label>
                  <input
                    type="text"
                    value={tamanhoFaixa}
                    onChange={(e) => setTamanhoFaixa(e.target.value)}
                    placeholder="Ex: M2, M3, A1, A2..."
                    maxLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  />
                </div>

                {/* Observação */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Observação (opcional)
                  </label>
                  <textarea
                    value={observacaoManual}
                    onChange={(e) => setObservacaoManual(e.target.value)}
                    placeholder="Digite uma observação sobre esta graduação..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Aprovação */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aprovarDireto}
                      onChange={(e) => setAprovarDireto(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Aprovar graduação imediatamente
                      </p>
                      <p className="text-xs text-gray-600">
                        Se desmarcado, a graduação ficará pendente de aprovação
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowGraduacaoManualModal(false);
                    setFaixaDestinoId("");
                    setObservacaoManual("");
                    setTamanhoFaixa("");
                    setAprovarDireto(false);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!faixaDestinoId) {
                      toast.error("Selecione uma faixa de destino");
                      return;
                    }
                    graduarManualMutation.mutate({
                      alunoId: selectedAlunoManual.id,
                      faixaDestinoId,
                      observacao: observacaoManual || undefined,
                      tamanhoFaixa: tamanhoFaixa || undefined,
                      aprovarDireto,
                    });
                  }}
                  disabled={!faixaDestinoId || graduarManualMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {graduarManualMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <CheckCircle className="h-4 w-4" />
                  Confirmar Graduação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
