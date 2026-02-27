"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Calendar,
  Trophy,
  TrendingUp,
  Clock,
  Star,
  Target,
  Award,
  Building2,
  Users,
  UserPlus,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { getStatusGraduacao, StatusGraduacao } from "@/lib/graduacaoApi";
import { http } from "@/lib/api";
import { Modalidade } from "@/lib/peopleApi";
import DependenteForm from "@/components/alunos/DependenteForm";
import CompleteProfileWizardModal from "@/components/aluno/CompleteProfileWizardModal";
import ModalidadeSelectorModal, { ModalidadeChip } from "@/components/dashboard/ModalidadeSelectorModal";
import { useModalidadeSelector } from "@/hooks/useModalidadeSelector";

type Genero = "MASCULINO" | "FEMININO" | "OUTRO";

interface DependenteFormData {
  // Dados Pessoais
  nome_completo: string;
  cpf?: string;
  data_nascimento: string;
  genero: Genero;
  foto?: string;
  email?: string;
  telefone?: string;
  telefone_emergencia?: string;
  nome_contato_emergencia?: string;

  // Matrícula
  unidade_id: string;
  numero_matricula?: string;
  data_matricula?: string;
  faixa_atual?: string;
  graus?: string;

  // Dados Médicos
  observacoes_medicas?: string;
  alergias?: string;
  medicamentos_uso_continuo?: string;
  plano_saude?: string;
  atestado_medico_validade?: string;
  restricoes_medicas?: string;

  // Responsável (caso seja menor e precise outro responsável)
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_telefone?: string;
  responsavel_parentesco?: string;

  // Financeiro
  dia_vencimento?: string;
  valor_mensalidade?: string;
  desconto_percentual?: string;

  // Consentimentos
  consent_lgpd?: string;
  consent_imagem?: string;

  // Outros
  observacoes?: string;

  [key: string]: string | undefined;
}

interface EstatisticasPresenca {
  presencaMensal: number;
  aulasMes: number;
  sequenciaAtual: number;
  ultimaPresenca: string | null;
}

interface RankingData {
  posicao: number | null;
  presencas: number;
  totalAlunos: number;
  mes: number;
  ano: number;
  categoria: "INFANTIL" | "ADULTO" | null;
  ranking: Array<{
    posicao: number;
    nome: string;
    graduacao: string;
    presencas: number;
    isUsuarioAtual: boolean;
  }>;
}

interface AulaDisponivel {
  id: string;
  nome: string;
  professor: string;
  unidade: string;
  horarioInicio: string;
  horarioFim: string;
  data: string;
}

interface HistoricoCompeticao {
  id: string;
  competicao: {
    nome: string;
    tipo: string;
    data: string;
    local: string;
    cidade: string;
  };
  posicao: string;
  categoria_peso: string;
  categoria_faixa: string;
  medalha_emoji: string;
  total_lutas: number;
  vitorias: number;
  derrotas: number;
  aproveitamento: number;
}

interface EstatisticasCompeticoes {
  totalCompeticoes: number;
  totalOuros: number;
  totalPratas: number;
  totalBronzes: number;
  totalPodios: number;
  totalLutas: number;
  totalVitorias: number;
  totalDerrotas: number;
  aproveitamento: number;
}

interface Dependente {
  id: string;
  nome_completo: string;
  faixa_atual: string;
  graus: number;
  status: string;
  data_nascimento: string;
  unidade?: {
    nome: string;
  };
}

// Interface para futura implementação
// interface HistoricoPresenca {
//   id: string;
//   data: string;
//   horario: string;
//   tipo: "entrada" | "saida";
//   aula: {
//     nome: string;
//     professor: string;
//   };
// }

// Função para obter as cores da faixa (para texto em fundo azul)
function getFaixaColors(faixa: string) {
  const faixaUpper = faixa?.toUpperCase() || "";
  const colorMap: { [key: string]: { text: string } } = {
    BRANCA: { text: "text-white" },
    CINZA: { text: "text-gray-300" },
    AMARELA: { text: "text-yellow-300" },
    LARANJA: { text: "text-orange-300" },
    VERDE: { text: "text-green-300" },
    AZUL: { text: "text-blue-200" },
    ROXA: { text: "text-purple-300" },
    MARROM: { text: "text-yellow-700" },
    PRETA: { text: "text-gray-800" },
    CORAL: { text: "text-red-300" },
  };
  return colorMap[faixaUpper] || { text: "text-white" };
}

// Helper para converter dias em anos e meses
function formatarTempoNaFaixa(dias: number): string {
  if (dias < 30) {
    return `${dias} dia${dias !== 1 ? "s" : ""}`;
  }

  const anos = Math.floor(dias / 365);
  const mesesRestantes = Math.floor((dias % 365) / 30);
  const diasRestantes = dias % 30;

  const partes: string[] = [];

  if (anos > 0) {
    partes.push(`${anos} ano${anos > 1 ? "s" : ""}`);
  }

  if (mesesRestantes > 0) {
    partes.push(`${mesesRestantes} mes${mesesRestantes > 1 ? "es" : ""}`);
  }

  // Opcional: incluir dias restantes se for menos de 1 mes desde o ultimo mes completo
  if (diasRestantes > 0 && anos === 0 && mesesRestantes === 0) {
    partes.push(`${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`);
  }

  return partes.join(" e ");
}

interface AlunoDashboardProps {
  alunoId?: string; // ID do aluno para visualização (opcional, usa user.id se não fornecido)
  showBackButton?: boolean; // Exibir botão de voltar
}

export default function AlunoDashboard({
  alunoId,
  showBackButton = false,
}: AlunoDashboardProps = {}) {
  const { user } = useAuth();
  const router = useRouter();

  // Determinar qual ID usar (prop ou user.id)
  const targetAlunoId = alunoId || user?.id;

  // Estados para dados reais
  const [statusGraduacao, setStatusGraduacao] =
    useState<StatusGraduacao | null>(null);
  const [estatisticasPresenca, setEstatisticasPresenca] =
    useState<EstatisticasPresenca | null>(null);
  const [proximasAulas, setProximasAulas] = useState<AulaDisponivel[]>([]);
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [historicoCompeticoes, setHistoricoCompeticoes] = useState<
    HistoricoCompeticao[]
  >([]);
  const [estatisticasCompeticoes, setEstatisticasCompeticoes] =
    useState<EstatisticasCompeticoes | null>(null);
  const [unidadeAluno, setUnidadeAluno] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [alunoNome, setAlunoNome] = useState<string | null>(null);
  const [alunoFoto, setAlunoFoto] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh
  const [modalidadesAluno, setModalidadesAluno] = useState<Modalidade[]>([]);
  const [resolvedAlunoId, setResolvedAlunoId] = useState<string | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [showFaixaModal, setShowFaixaModal] = useState(false);
  const [faixaInicial, setFaixaInicial] = useState({
    faixa: "BRANCA",
    graus: 0,
    data_graduacao: new Date().toISOString().split("T")[0],
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDependenteId, setEditingDependenteId] = useState<string | null>(
    null
  );
  const [formData, setFormData] = useState<DependenteFormData>({
    nome_completo: "",
    cpf: "",
    data_nascimento: "",
    genero: "MASCULINO",
    foto: "",
    email: "",
    telefone: "",
    telefone_emergencia: "",
    nome_contato_emergencia: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    unidade_id: "",
    numero_matricula: "",
    data_matricula: "",
    faixa_atual: "",
    graus: "",
    observacoes_medicas: "",
    alergias: "",
    medicamentos_uso_continuo: "",
    plano_saude: "",
    atestado_medico_validade: "",
    restricoes_medicas: "",
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_telefone: "",
    responsavel_parentesco: "",
    dia_vencimento: "",
    valor_mensalidade: "",
    desconto_percentual: "",
    consent_lgpd: "",
    consent_imagem: "",
    observacoes: "",
  });
  // Histórico será implementado futuramente
  // const [historicoPresenca, setHistoricoPresenca] = useState<HistoricoPresenca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingCheckin, setLoadingCheckin] = useState<string | null>(null);

  // Seletor de modalidade (igual ao dash de gerente/franqueado)
  const modalidadeSelector = useModalidadeSelector(
    user?.id,
    modalidadesAluno.length > 0 ? modalidadesAluno : undefined
  );
  const hasJiu = modalidadeSelector.selectedModalidade
    ? ((n) => n.includes("jiu") || n.includes("jitsu") || n.includes("bjj"))(
        (modalidadeSelector.selectedModalidade.nome ?? "").toLowerCase()
      )
    : modalidadesAluno.some((m) =>
        ((m.nome ?? "").toLowerCase()).includes("jiu") ||
        ((m.nome ?? "").toLowerCase()).includes("jitsu") ||
        ((m.nome ?? "").toLowerCase()).includes("bjj")
      );

  // Re-buscar ranking quando modalidade selecionada mudar
  useEffect(() => {
    if (!resolvedAlunoId || !modalidadeSelector.initialized) return;
    const fetchRanking = async () => {
      try {
        const params = new URLSearchParams();
        if (modalidadeSelector.selectedModalidade?.id) {
          params.set("modalidadeId", modalidadeSelector.selectedModalidade.id);
        }
        if (alunoId) params.set("alunoId", alunoId);
        const data = await http(`/presenca/ranking-unidade?${params}`, { auth: true });
        setRankingData(data);
      } catch {
        // silencioso
      }
    };
    fetchRanking();
  }, [modalidadeSelector.selectedModalidade?.id, resolvedAlunoId, modalidadeSelector.initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar dados do aluno logado ou do aluno especificado
  useEffect(() => {
    if (targetAlunoId) {
      loadDashboardData();
    }
  }, [targetAlunoId, alunoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardData = async () => {
    if (!targetAlunoId) return;

    try {
      setLoading(true);
      setError(null);

      // Primeiro, precisamos obter o ID real do aluno
      let realAlunoId = alunoId; // Se foi passado como prop, usar

      // Se não foi passado alunoId, precisamos buscar pelo usuario_id
      if (!realAlunoId) {
        try {
          const alunoByUsuario = await http(
            `/alunos/usuario/${targetAlunoId}`,
            { auth: true }
          );
          realAlunoId = alunoByUsuario.id; // Usar o ID do aluno, não do usuário
        } catch (err) {
          console.error(
            "❌ [ALUNO DASHBOARD] Erro ao buscar aluno por usuario_id:",
            err
          );
          setError("Não foi possível carregar os dados do aluno.");
          setLoading(false);
          return;
        }
      }

      // Se está visualizando outro aluno (não o próprio), verificar permissões
      if (alunoId && alunoId !== user?.id) {
        const alunoResponse = await http(`/alunos/${alunoId}`, { auth: true });

        const userPerfis = user?.perfis || [];
        const isResponsavel = userPerfis.some(
          (p: any) => p === "responsavel" || p.nome === "responsavel"
        );

        if (isResponsavel) {
          const responsavelResponse = await http("/usuarios/responsavel/me", {
            auth: true,
          });
          const responsavelId = responsavelResponse.id;

          if (alunoResponse.responsavel_id !== responsavelId) {
            setError("Você não tem permissão para visualizar este aluno.");
            setLoading(false);
            return;
          }
        }

        setAlunoNome(alunoResponse.nome_completo);
        setCanAccess(true);
      } else {
        setCanAccess(true);
      }

      // Guardar o ID real do aluno para o useEffect do ranking
      setResolvedAlunoId(realAlunoId);

      // Cache-busting timestamp para garantir dados frescos
      const timestamp = `${Date.now()}_${refreshKey}`;

      // Carregar dados em paralelo - USAR realAlunoId para graduação
      const [
        graduacaoData,
        presencaData,
        aulasData,
        rankingDataResult,
        competicoesData,
        alunoData,
        dependentesData,
        modalidadesData,
      ] = await Promise.allSettled([
        // 1. Status de Graduação - USAR realAlunoId (ID do aluno, não do usuário)
        getStatusGraduacao(realAlunoId),

        // 2. Estatísticas de Presença - usar endpoint específico quando visualizando dependente
        http(
          alunoId ? `/presenca/estatisticas-aluno/${realAlunoId}` : "/presenca/minhas-estatisticas",
          { auth: true }
        ),

        // 3. Próximas Aulas Disponíveis - passar alunoId se estiver visualizando dependente
        http(
          `/presenca/aulas-disponiveis${
            realAlunoId ? `?alunoId=${realAlunoId}` : ""
          }`,
          { auth: true }
        ),

        // 4. Ranking da Unidade - filtrado por modalidade
        http(
          `/presenca/ranking-unidade?${new URLSearchParams({
            ...(realAlunoId ? { alunoId: realAlunoId } : {}),
          }).toString()}`,
          { auth: true }
        ),

        // 5. Histórico de Competições - usar endpoint específico quando visualizando dependente
        http(
          alunoId ? `/competicoes/historico-aluno/${realAlunoId}` : "/competicoes/meu-historico",
          { auth: true }
        ),

        // 6. Dados do Aluno (inclui unidade)
        // Usar realAlunoId que já foi resolvido
        http(`/alunos/${realAlunoId}?_t=${timestamp}`, { auth: true }),

        // 7. Dependentes do aluno (se ele for responsável)
        http(`/alunos/meus-dependentes?_t=${timestamp}`, { auth: true }),

        // 8. Modalidades do aluno
        http(`/alunos/${realAlunoId}/modalidades`, { auth: true }),
      ]);

      // Determinar modalidades do aluno (hook cuida da seleção e do hasJiu)
      let jiuDetected = false;
      if (modalidadesData.status === "fulfilled") {
        const mods = Array.isArray(modalidadesData.value) ? modalidadesData.value : [];
        setModalidadesAluno(mods.map((m: any) => ({ ...m, ativo: true })) as Modalidade[]);
        jiuDetected = mods.some((m: any) => {
          const n = (m.nome ?? "").toLowerCase();
          return n.includes("jiu") || n.includes("jitsu") || n.includes("bjj");
        });
      }

      // Processar resultados
      if (graduacaoData.status === "fulfilled") {
        setStatusGraduacao(graduacaoData.value);
      } else {
        console.error(
          "❌ [ALUNO DASHBOARD] Erro ao carregar status de graduação:",
          graduacaoData.reason
        );
        // Se não tem faixa ativa, abrir modal para cadastrar (apenas para alunos de Jiu-Jitsu)
        if (graduacaoData.reason?.message?.includes("não possui faixa ativa") && jiuDetected) {
          setShowFaixaModal(true);
        }
      }

      if (presencaData.status === "fulfilled") {
        setEstatisticasPresenca(presencaData.value);
      }

      if (aulasData.status === "fulfilled") {
        setProximasAulas(Array.isArray(aulasData.value) ? aulasData.value : []);
      } else {
        console.error("❌ [ALUNO DASHBOARD] Erro ao carregar aulas:", aulasData.reason);
      }

      if (rankingDataResult.status === "fulfilled") {
        setRankingData(rankingDataResult.value);
      } else {
        console.error(" Erro ao carregar ranking:", rankingDataResult.reason);
      }

      if (competicoesData.status === "fulfilled") {
        const data = competicoesData.value;
        setHistoricoCompeticoes(
          Array.isArray(data.participacoes) ? data.participacoes : []
        );
        setEstatisticasCompeticoes(data.estatisticas || null);
      } else {
        console.error(" Erro ao carregar competições:", competicoesData.reason);
      }

      if (alunoData.status === "fulfilled") {
        const aluno = alunoData.value;

        // Se estamos visualizando um dependente (alunoId passado como prop), pegar o nome e foto
        if (alunoId && aluno.nome_completo) {
          setAlunoNome(aluno.nome_completo);
          // Buscar a foto do dependente (pode estar em foto_url ou através do usuario)
          if (aluno.foto_url) {
            setAlunoFoto(aluno.foto_url);
          } else if (aluno.usuario?.foto) {
            setAlunoFoto(aluno.usuario.foto);
          }
        }

        if (aluno.unidade) {
          setUnidadeAluno({
            id: aluno.unidade.id || aluno.unidade_id,
            nome: aluno.unidade.nome || "Unidade",
          });
        }
      } else {
        console.error(" Erro ao carregar dados do aluno:", alunoData.reason);
      }

      if (dependentesData.status === "fulfilled") {
        const dependentesArray = Array.isArray(dependentesData.value)
          ? dependentesData.value
          : [];
        setDependentes([...dependentesArray]); // Force new array reference
      }
      // Histórico será implementado futuramente
      // if (historicoData.status === "fulfilled") {
      //   setHistoricoPresenca(Array.isArray(historicoData.value) ? historicoData.value : []);
      // }
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
      setError("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Buscar unidades
  const { data: unidades } = useQuery({
    queryKey: ["unidades-publicas-ativas-aluno"],
    queryFn: async () => {
      const data = await http("/unidades/public/ativas", { auth: false });
      return data || [];
    },
    staleTime: 0,
    gcTime: 0,
  });

  const handleCheckin = async (alunoId: string) => {
    setLoadingCheckin(alunoId);
    try {
      // Buscar aula ativa
      const aulaAtiva = await http("/presenca/aula-ativa", { auth: true });

      if (!aulaAtiva || !aulaAtiva.id) {
        toast.error("Não há aula ativa no momento");
        return;
      }

      // Fazer check-in
      const result = await http("/presenca/check-in-dependente", {
        method: "POST",
        body: {
          dependenteId: alunoId,
          aulaId: aulaAtiva.id,
        },
        auth: true,
      });

      toast.success(result.message || "Check-in realizado com sucesso!");
      loadDashboardData();
    } catch (error: any) {
      console.error("Erro ao fazer check-in:", error);
      toast.error(error.message || "Erro ao processar check-in");
    } finally {
      setLoadingCheckin(null);
    }
  };

  const handleEditDependente = async (dependente: Dependente) => {
    try {
      // Limpar formData primeiro para evitar dados residuais
      setFormData({
        nome_completo: "",
        cpf: "",
        data_nascimento: "",
        genero: "MASCULINO",
        foto: "",
        email: "",
        telefone: "",
        telefone_emergencia: "",
        nome_contato_emergencia: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
        unidade_id: "",
        numero_matricula: "",
        data_matricula: "",
        faixa_atual: "",
        graus: "",
        observacoes_medicas: "",
        alergias: "",
        medicamentos_uso_continuo: "",
        plano_saude: "",
        atestado_medico_validade: "",
        restricoes_medicas: "",
        responsavel_nome: "",
        responsavel_cpf: "",
        responsavel_telefone: "",
        responsavel_parentesco: "",
        dia_vencimento: "",
        valor_mensalidade: "",
        desconto_percentual: "",
        consent_lgpd: "",
        consent_imagem: "",
        observacoes: "",
      });
      
      // Buscar dados completos do dependente (SEMPRE FRESH, SEM CACHE)
      const timestamp = `${Date.now()}_${refreshKey}`;
      const dadosCompletos = await http(`/alunos/${dependente.id}?_t=${timestamp}`, {
        auth: true,
      });

      // Buscar graduação atual do aluno
      let faixaValue = "";
      let grausValue = "0";
      
      try {
        const statusGraduacao = await http(`/graduacao/alunos/${dependente.id}/status`, {
          auth: true,
        });
        // Pegar faixa e graus da graduação ativa
        if (statusGraduacao?.faixaAtual) {
          faixaValue = statusGraduacao.faixaAtual.toUpperCase();
        }
        if (statusGraduacao?.grausAtuais !== undefined) {
          grausValue = statusGraduacao.grausAtuais.toString();
        }
      } catch (error) {
        console.warn("⚠️ Não foi possível buscar graduação, usando valores padrão");
        // Se não conseguir buscar graduação, tenta pegar do alunoUnidades
        if (dadosCompletos.alunoUnidades && dadosCompletos.alunoUnidades[0]) {
          const unidadeData = dadosCompletos.alunoUnidades[0];
          faixaValue = unidadeData.faixa_atual || "";
          grausValue = unidadeData.graus?.toString() || "0";
        }
      }

      setIsEditMode(true);
      setEditingDependenteId(dependente.id);
      
      const formDataToSet = {
        nome_completo: dadosCompletos.nome_completo || "",
        cpf: dadosCompletos.cpf || "",
        data_nascimento: dadosCompletos.data_nascimento || "",
        genero: dadosCompletos.genero || "MASCULINO",
        foto: dadosCompletos.foto_url || dadosCompletos.usuario?.foto || "",
        email: dadosCompletos.email || "",
        telefone: dadosCompletos.telefone || "",
        telefone_emergencia: dadosCompletos.telefone_emergencia || "",
        nome_contato_emergencia: dadosCompletos.nome_contato_emergencia || "",
        // Endereço
        cep: dadosCompletos.endereco?.cep || "",
        logradouro: dadosCompletos.endereco?.logradouro || "",
        numero: dadosCompletos.endereco?.numero || "",
        complemento: dadosCompletos.endereco?.complemento || "",
        bairro: dadosCompletos.endereco?.bairro || "",
        cidade: dadosCompletos.endereco?.cidade || "",
        uf: dadosCompletos.endereco?.estado || "",
        unidade_id:
          dadosCompletos.unidade_id || dadosCompletos.unidade?.id || "",
        numero_matricula: dadosCompletos.numero_matricula || "",
        data_matricula: dadosCompletos.data_matricula || "",
        faixa_atual: faixaValue,
        graus: grausValue,
        observacoes_medicas: dadosCompletos.observacoes_medicas || "",
        alergias: dadosCompletos.alergias || "",
        medicamentos_uso_continuo:
          dadosCompletos.medicamentos_uso_continuo || "",
        plano_saude: dadosCompletos.plano_saude || "",
        atestado_medico_validade: dadosCompletos.atestado_medico_validade || "",
        restricoes_medicas: dadosCompletos.restricoes_medicas || "",
        responsavel_nome: dadosCompletos.responsavel_nome || "",
        responsavel_cpf: dadosCompletos.responsavel_cpf || "",
        responsavel_telefone: dadosCompletos.responsavel_telefone || "",
        responsavel_parentesco: dadosCompletos.responsavel_parentesco || "",
        dia_vencimento: dadosCompletos.dia_vencimento?.toString() || "",
        valor_mensalidade: dadosCompletos.valor_mensalidade?.toString() || "",
        desconto_percentual:
          dadosCompletos.desconto_percentual?.toString() || "",
        consent_lgpd: dadosCompletos.consent_lgpd?.toString() || "",
        consent_imagem: dadosCompletos.consent_imagem?.toString() || "",
        observacoes: dadosCompletos.observacoes || "",
      };
      
      setFormData(formDataToSet);

      setShowModal(true);
    } catch (error) {
      console.error("Erro ao carregar dados do dependente:", error);
      toast.error("Erro ao carregar dados do dependente");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir múltiplas submissões
    if (isLoading) return;

    // Validar consentimentos obrigatórios
    if (formData.consent_lgpd !== "true") {
      toast.error(
        "É obrigatório autorizar o uso dos dados pessoais conforme a LGPD"
      );
      return;
    }

    if (formData.consent_imagem !== "true") {
      toast.error("É obrigatório autorizar o uso de imagem para divulgação");
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode && editingDependenteId) {
        // Editar dependente existente - remover campos vazios e limpar máscaras
        const dataToSend = Object.entries(formData).reduce(
          (acc, [key, value]) => {
            // Apenas incluir campos que não são strings vazias
            if (value !== "" && value !== null && value !== undefined) {
              // Remover máscara de CPF (manter apenas números)
              if (key === "cpf" || key === "responsavel_cpf") {
                const cpfLimpo = String(value).replace(/\D/g, "");
                // Só incluir CPF se tiver algum número (não vazio)
                if (cpfLimpo.length > 0) {
                  acc[key] = cpfLimpo;
                }
              }
              // Converter campos numéricos inteiros
              else if (key === "graus" || key === "dia_vencimento") {
                const numValue = parseInt(String(value));
                if (!isNaN(numValue)) {
                  acc[key] = numValue;
                }
              }
              // Converter campos numéricos decimais
              else if (key === "valor_mensalidade" || key === "desconto_percentual") {
                const numValue = parseFloat(String(value));
                if (!isNaN(numValue)) {
                  acc[key] = numValue;
                }
              }
              // Renomear foto para foto_url (campo correto na entidade Aluno)
              else if (key === "foto") {
                acc["foto_url"] = value;
              }
              else {
                acc[key] = value;
              }
            }
            return acc;
          },
          {} as Record<string, unknown>
        );

        const response = await http(`/alunos/${editingDependenteId}`, {
          method: "PATCH",
          body: dataToSend,
          auth: true,
        });

        if (response) {
          toast.success("Dependente atualizado com sucesso!");
        }
      } else {
        // Criar novo dependente

        const response = await http("/alunos", {
          method: "POST",
          body: formData as Record<string, unknown>,
          auth: true,
        });

        if (response) {
          toast.success("Dependente cadastrado com sucesso!");
        }
      }

      // Incrementar refreshKey para forçar re-fetch
      setRefreshKey(prev => prev + 1);
      
      // Aguardar um pouco para o backend processar
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await loadDashboardData();
      // Aguardar 200ms para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 200));

      // Limpar e fechar modal
      setShowModal(false);
      setIsEditMode(false);
      setEditingDependenteId(null);
      setFormData({
        nome_completo: "",
        cpf: "",
        data_nascimento: "",
        genero: "MASCULINO",
        foto: "",
        email: "",
        telefone: "",
        telefone_emergencia: "",
        nome_contato_emergencia: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
        unidade_id: "",
        numero_matricula: "",
        data_matricula: "",
        faixa_atual: "",
        graus: "",
        observacoes_medicas: "",
        alergias: "",
        medicamentos_uso_continuo: "",
        plano_saude: "",
        atestado_medico_validade: "",
        restricoes_medicas: "",
        responsavel_nome: "",
        responsavel_cpf: "",
        responsavel_telefone: "",
        responsavel_parentesco: "",
        dia_vencimento: "",
        valor_mensalidade: "",
        desconto_percentual: "",
        consent_lgpd: "",
        consent_imagem: "",
        observacoes: "",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Erro ao ${isEditMode ? "atualizar" : "cadastrar"} dependente`;
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvarFaixaInicial = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

      const response = await fetch(
        `${API_URL}/graduacao/cadastrar-faixa-inicial`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            faixa_codigo: faixaInicial.faixa,
            graus: faixaInicial.graus,
            data_graduacao: faixaInicial.data_graduacao,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao cadastrar faixa");
      }

      toast.success("Faixa cadastrada com sucesso!");
      setShowFaixaModal(false);
      await loadDashboardData();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao cadastrar faixa";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Dados calculados baseados nos dados reais
  const graduacaoAtual = statusGraduacao?.faixaAtual || "Carregando...";
  const proximaGraduacao = statusGraduacao?.proximaFaixa || "A definir";
  const aulasMes = estatisticasPresenca?.aulasMes || 0;
  const presencaMensal = estatisticasPresenca?.presencaMensal || 0;
  const pontosGraduacao = statusGraduacao?.presencasNoCiclo || 0;
  const pontosNecessarios = statusGraduacao?.aulasPorGrau || 0;
  const ranking = rankingData?.posicao || null;

  // Calcular progresso percentual
  const progressoPercentual = statusGraduacao?.progressoPercentual
    ? statusGraduacao.progressoPercentual * 100
    : 0;

  const proximasAulasFormatadas = proximasAulas.map((aula) => {
    return {
      data: new Date(aula.data).toLocaleDateString("pt-BR"),
      horario: `${aula.horarioInicio} - ${aula.horarioFim}`,
      tipo: aula.nome,
      professor: aula.professor,
      local: aula.unidade,
    };
  });

  // Conquistas baseadas em dados reais
  const conquistas = [];

  // Adicionar conquista de assiduidade se tiver 100% de presença
  if (presencaMensal === 100) {
    conquistas.push({
      titulo: "Assiduidade Perfeita!",
      descricao: "100% de presença neste mês",
      data: new Date().toLocaleDateString("pt-BR"),
      icon: Star,
      color: "text-blue-600",
    });
  }

  // Adicionar conquista de sequência
  if ((estatisticasPresenca?.sequenciaAtual || 0) >= 10) {
    conquistas.push({
      titulo: "Sequência Impressionante!",
      descricao: `${estatisticasPresenca?.sequenciaAtual} aulas consecutivas`,
      data: new Date().toLocaleDateString("pt-BR"),
      icon: Target,
      color: "text-green-600",
    });
  }

  // Adicionar conquista de graduação próxima
  if (progressoPercentual >= 90) {
    conquistas.push({
      titulo: "Quase Lá!",
      descricao: `${Math.round(progressoPercentual)}% para próxima graduação`,
      data: new Date().toLocaleDateString("pt-BR"),
      icon: Trophy,
      color: "text-yellow-600",
    });
  }

  const quickActions = [
    {
      title: "Marcar Presença",
      description: "Check-in na aula de hoje",
      icon: Clock,
      action: () => {
        // Se estiver visualizando um dependente, passa o alunoId como query param
        if (alunoId) {
          router.push(`/presenca?alunoId=${alunoId}`);
        } else {
          router.push("/presenca");
        }
      },
      color: "bg-green-500",
      urgent: true,
    },
    {
      title: "Meu Progresso",
      description: "Ver evolução e graduações",
      icon: TrendingUp,
      action: () => {
        if (alunoId) {
          router.push(`/meu-progresso?alunoId=${alunoId}`);
        } else {
          router.push("/meu-progresso");
        }
      },
      color: "bg-blue-500",
    },
    {
      title: "Horários",
      description: "Ver grade de horários",
      icon: Calendar,
      action: () => {
        if (alunoId) {
          router.push(`/horarios?alunoId=${alunoId}`);
        } else {
          router.push("/horarios");
        }
      },
      color: "bg-purple-500",
    },
    {
      title: "Minhas Faturas",
      description: "Ver e pagar faturas online",
      icon: CreditCard,
      action: () => {
        console.log("Navegando para /financeiro/minhas-faturas");
        router.push("/financeiro/minhas-faturas");
      },
      color: "bg-green-500",
    },
    ...(hasJiu ? [{
      title: "TeamCruz Jiu-Jitsu",
      description: "Ranking, aulas e check-in",
      icon: Trophy,
      action: () => {
        const params = new URLSearchParams();
        if (modalidadeSelector.selectedModalidade?.id) {
          params.set("modalidadeId", modalidadeSelector.selectedModalidade.id);
          params.set("modalidadeNome", modalidadeSelector.selectedModalidade.nome ?? "");
        }
        router.push(`/teamcruz${params.toString() ? `?${params.toString()}` : ""}`);
      },
      color: "bg-yellow-500",
    }] : []),
    {
      title: "Competições",
      description: "Inscreva-se em campeonatos",
      icon: Award,
      action: () => router.push("/competicoes"),
      color: "bg-orange-500",
    },
  ];

  return (
    <>
      {/* Wizard de cadastro completo — aparece enquanto o aluno não tem endereço */}
      {!alunoId && (
        <CompleteProfileWizardModal
          onComplete={() => {
            // reload to refresh data
            window.location.reload();
          }}
        />
      )}
      {/* Seletor de modalidade */}
      <ModalidadeSelectorModal
        open={modalidadeSelector.showSelector}
        modalidades={modalidadesAluno}
        userName={alunoNome || user?.nome}
        allowAll={false}
        onSelect={modalidadeSelector.selectModalidade}
      />
    <div className="min-h-screen p-3 sm:p-6" style={{ background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 40%, #ede9fe 100%)"}}>
      <div className="max-w-7xl mx-auto">
        {/* Botão Voltar para Meus Dados (se estiver visualizando dependente) */}
        {alunoId && alunoId !== user?.id && (
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-3 sm:mb-4 flex items-center gap-2 px-3 py-2 sm:px-4 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <span>←</span>
            <span className="hidden sm:inline">Voltar para Meus Dados</span>
            <span className="sm:hidden">Voltar</span>
          </button>
        )}

        {/* Botão Voltar genérico (se habilitado via prop) */}
        {showBackButton && !alunoId && (
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>←</span>
            Voltar
          </button>
        )}

        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Foto de Perfil */}
              {(alunoId ? alunoFoto : user?.foto) ? (
                <img
                  src={alunoId ? alunoFoto! : user!.foto}
                  alt={alunoNome || user?.nome || "Aluno"}
                  className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover border-2 sm:border-4 border-blue-500 shadow-lg"
                />
              ) : (
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 sm:border-4 border-blue-400 shadow-lg">
                  <span className="text-lg sm:text-2xl font-bold text-white">
                    {(alunoNome || user?.nome || "A").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
                  Meu Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Bem-vindo,{" "}
                  <span className="font-semibold">
                    {alunoNome || user?.nome}
                  </span>
                  <span className="hidden sm:inline">
                    {hasJiu
                      ? "! Acompanhe sua jornada no Jiu-Jitsu."
                      : modalidadeSelector.selectedModalidade
                      ? `! Modalidade: ${modalidadeSelector.selectedModalidade.nome}.`
                      : modalidadesAluno.length > 0
                      ? `! Suas modalidades: ${modalidadesAluno.map((m) => m.nome).join(", ")}.`
                      : "! Acompanhe sua evolução."}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Chip de modalidade (só aparece quando tem mais de 1) */}
              {modalidadesAluno.length > 1 && (
                <ModalidadeChip
                  modalidade={modalidadeSelector.selectedModalidade}
                  onClick={() => modalidadeSelector.setShowSelector(true)}
                />
              )}
              {/* Badge da Unidade */}
              {unidadeAluno && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg w-full sm:w-auto">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <div className="text-left">
                    <p className="text-xs font-medium opacity-90">
                      Minha Unidade
                    </p>
                    <p className="text-sm sm:text-lg font-bold truncate">
                      {unidadeAluno.nome}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                Carregando dados do dashboard...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="text-red-600">{error}</div>
              <button
                onClick={loadDashboardData}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Tentar Novamente
              </button>
            </CardContent>
          </Card>
        )}

        {/* Graduação Atual */}
        {!loading && !error && hasJiu && (
          <Card className="mb-4 sm:mb-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                Graduação Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <h3
                    className={`text-xl sm:text-2xl font-bold ${
                      getFaixaColors(graduacaoAtual).text
                    }`}
                  >
                    {graduacaoAtual}
                  </h3>
                  <p className="text-sm sm:text-base text-blue-100">
                    {statusGraduacao?.grausAtual || 0} /{" "}
                    {statusGraduacao?.grausMax || 4} graus
                  </p>
                  <p className="text-xs text-blue-200">
                    {formatarTempoNaFaixa(statusGraduacao?.diasNaFaixa || 0)} na
                    faixa
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">
                    Progresso para próximo grau
                  </h4>
                  <div className="bg-white/20 rounded-full h-3 mb-2">
                    <div
                      className="bg-white rounded-full h-3 transition-all"
                      style={{
                        width: `${Math.min(progressoPercentual, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-100">
                    {pontosGraduacao} / {pontosNecessarios} presenças
                  </p>
                  <p className="text-xs text-blue-200">
                    Falta{statusGraduacao?.faltamAulas === 1 ? "" : "m"}{" "}
                    {statusGraduacao?.faltamAulas || 0} aula
                    {statusGraduacao?.faltamAulas === 1 ? "" : "s"} para o
                    próximo grau
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">Próxima Graduação</h4>
                  <p
                    className={`text-xl font-bold ${
                      getFaixaColors(proximaGraduacao).text
                    }`}
                  >
                    {proximaGraduacao}
                  </p>
                  {statusGraduacao && (
                    <>
                      <p className="text-sm text-blue-100 mt-1">
                        {statusGraduacao.grausAtual < statusGraduacao.grausMax
                          ? `${
                              statusGraduacao.grausMax -
                              statusGraduacao.grausAtual
                            } grau${
                              statusGraduacao.grausMax -
                                statusGraduacao.grausAtual >
                              1
                                ? "s"
                                : ""
                            } restante${
                              statusGraduacao.grausMax -
                                statusGraduacao.grausAtual >
                              1
                                ? "s"
                                : ""
                            }`
                          : "Graus completos ✓"}
                      </p>
                      <p className="text-xs text-blue-200">
                        {statusGraduacao.diasRestantes > 0
                          ? `Falta${
                              Math.ceil(statusGraduacao.diasRestantes / 30) > 1
                                ? "m"
                                : ""
                            } ${Math.ceil(
                              statusGraduacao.diasRestantes / 30
                            )} mes${
                              Math.ceil(statusGraduacao.diasRestantes / 30) !==
                              1
                                ? "es"
                                : ""
                            } para tempo mínimo`
                          : "Tempo mínimo atingido ✓"}
                      </p>
                      <p className="text-xs text-blue-200 mt-1">
                        Mínimo: aprox. {statusGraduacao.tempoMinimoAnos} ano
                        {statusGraduacao.tempoMinimoAnos > 1 ? "s" : ""} +{" "}
                        {statusGraduacao.grausMax} graus
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Aulas Este Mês
                </CardTitle>
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-1">
                <div className="text-xl sm:text-2xl font-bold">{aulasMes}</div>
                <p className="text-xs text-muted-foreground">
                  {aulasMes > 0 ? "Mantendo frequência" : "Nenhuma aula ainda"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Presença Mensal
                </CardTitle>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-1">
                <div className="text-xl sm:text-2xl font-bold">
                  {presencaMensal}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {presencaMensal >= 80
                    ? "Excelente frequência"
                    : presencaMensal >= 60
                    ? "Boa frequência"
                    : "Pode melhorar"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Ranking Turma
                </CardTitle>
                <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
              </CardHeader>
              <CardContent className="pt-1">
                {ranking ? (
                  <>
                    <div className="text-2xl font-bold text-yellow-600">
                      #{ranking}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rankingData?.presencas || 0} aula
                      {rankingData?.presencas === 1 ? "" : "s"} no mês
                    </p>
                    <p className="text-xs text-gray-400">
                      de {rankingData?.totalAlunos || 0} alunos
                    </p>
                  </>
                ) : loading ? (
                  <>
                    <div className="text-2xl font-bold text-gray-400">-</div>
                    <p className="text-xs text-muted-foreground">
                      Calculando...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-gray-400">-</div>
                    <p className="text-xs text-muted-foreground">
                      Sem presenças
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Pontos Graduação
                </CardTitle>
                <Star className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="pt-1">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {pontosGraduacao}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(progressoPercentual)}% para próxima
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={`cursor-pointer hover:shadow-lg transition-all transform hover:scale-105 text-left w-full ${
                  action.urgent ? "ring-2 ring-green-400 bg-green-50" : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  action.action();
                }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${action.color} text-white`}
                        >
                          <action.icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm">{action.title}</span>
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Próximas Aulas */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Próximas Aulas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 sm:space-y-4">
                {proximasAulasFormatadas.length > 0 ? (
                  proximasAulasFormatadas.map((aula, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-semibold text-sm sm:text-base">
                          {aula.tipo}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {aula.professor}
                        </div>
                        <div className="text-xs text-gray-500">
                          {aula.local}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-600 text-xs sm:text-sm">
                          {aula.data}
                        </div>
                        <div className="text-xs text-gray-600">
                          {aula.horario}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 sm:py-6 text-gray-500">
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm sm:text-base">
                      Nenhuma aula disponível no momento
                    </p>
                    <p className="text-xs sm:text-sm">
                      Verifique a programação na seção Horários
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Competições */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                Histórico de Competições
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {estatisticasCompeticoes &&
                estatisticasCompeticoes.totalCompeticoes > 0
                  ? `${estatisticasCompeticoes.totalOuros} 🥇 | ${estatisticasCompeticoes.totalPratas} 🥈 | ${estatisticasCompeticoes.totalBronzes} 🥉 - ${estatisticasCompeticoes.aproveitamento}% de aproveitamento`
                  : "Suas participações em campeonatos"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {historicoCompeticoes.length > 0 ? (
                  historicoCompeticoes.slice(0, 5).map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-start gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <div className="text-2xl sm:text-4xl">
                        {comp.medalha_emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm sm:text-base truncate">
                          {comp.competicao.nome}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {comp.competicao.tipo} - {comp.categoria_peso} (
                          {comp.categoria_faixa})
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(comp.competicao.data).toLocaleDateString(
                            "pt-BR"
                          )}{" "}
                          • {comp.competicao.cidade}
                        </div>
                        {comp.total_lutas > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {comp.vitorias}V / {comp.derrotas}D -{" "}
                            {comp.aproveitamento}% de aproveitamento
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div
                          className={`text-sm sm:text-lg font-bold ${
                            comp.posicao === "OURO"
                              ? "text-yellow-600"
                              : comp.posicao === "PRATA"
                              ? "text-gray-500"
                              : comp.posicao === "BRONZE"
                              ? "text-amber-700"
                              : "text-gray-400"
                          }`}
                        >
                          {comp.posicao}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma competição registrada</p>
                    <p className="text-sm mt-1">
                      Participe de campeonatos e registre seus resultados aqui
                    </p>
                    <button
                      onClick={() => router.push("/competicoes")}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Ver Competições Disponíveis
                    </button>
                  </div>
                )}
                {historicoCompeticoes.length > 5 && (
                  <button
                    onClick={() => router.push("/meu-historico-competicoes")}
                    className="w-full mt-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Ver todas ({historicoCompeticoes.length} competições)
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ranking Completo - Top 10 */}
        {rankingData && rankingData.ranking.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Top 10 - Ranking de Frequência
                {rankingData.categoria ? ` ${rankingData.categoria}` : ""} (
                {rankingData.mes}/{rankingData.ano})
              </CardTitle>
              <CardDescription>
                Os alunos mais frequentes da sua unidade este mes
                {rankingData.categoria
                  ? ` - Categoria ${rankingData.categoria}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rankingData.ranking.map((item) => (
                  <div
                    key={item.posicao}
                    className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                      item.isUsuarioAtual
                        ? "bg-yellow-50 border-2 border-yellow-300 shadow-md"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                          item.posicao === 1
                            ? "bg-yellow-400 text-yellow-900"
                            : item.posicao === 2
                            ? "bg-gray-300 text-gray-700"
                            : item.posicao === 3
                            ? "bg-amber-600 text-white"
                            : item.isUsuarioAtual
                            ? "bg-yellow-200 text-yellow-800"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {item.posicao === 1 && "🥇"}
                        {item.posicao === 2 && "🥈"}
                        {item.posicao === 3 && "🥉"}
                        {item.posicao > 3 && `#${item.posicao}`}
                      </div>
                      <div>
                        <div
                          className={`font-semibold ${
                            item.isUsuarioAtual ? "text-yellow-800" : ""
                          }`}
                        >
                          {item.nome} {item.isUsuarioAtual && "(Você)"}
                        </div>
                        {item.graduacao && item.graduacao !== "Sem graduação" && (
                          <div className="text-sm text-gray-600">
                            {item.graduacao}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {item.presencas}
                      </div>
                      <div className="text-xs text-gray-500">
                        aula{item.presencas === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {rankingData.totalAlunos > 10 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  Mostrando top 10 de {rankingData.totalAlunos} alunos ativos
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Seção de Dependentes */}
        {dependentes.length > 0 && (
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-2xl flex items-center gap-2">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    Meus Dependentes
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Gerencie e acompanhe os treinos dos seus dependentes
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Dependente
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {dependentes.map((dependente) => (
                  <Card
                    key={dependente.id}
                    className="border-2 hover:border-blue-300 transition-colors"
                  >
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-3 sm:mb-4">
                        <div
                          className="flex-1 cursor-pointer w-full"
                          onClick={() =>
                            router.push(`/alunos/${dependente.id}`)
                          }
                        >
                          <h3 className="font-semibold text-base sm:text-lg">
                            {dependente.nome_completo}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500">
                            {new Date().getFullYear() -
                              new Date(
                                dependente.data_nascimento
                              ).getFullYear()}{" "}
                            anos
                          </p>
                          {dependente.unidade && (
                            <p className="text-xs text-gray-400 mt-1">
                              📍 {dependente.unidade.nome}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                          <span
                            className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                              dependente.status === "ATIVO"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {dependente.status}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDependente(dependente);
                            }}
                            className="h-7 sm:h-8 px-2 text-xs"
                          >
                            Editar
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Award className="h-4 w-4 mr-2 text-yellow-500" />
                          <span>
                            Faixa {dependente.faixa_atual} -{" "}
                            {dependente.graus || 0} graus
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckin(dependente.id);
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={
                            dependente.status !== "ATIVO" ||
                            loadingCheckin === dependente.id
                          }
                        >
                          {loadingCheckin === dependente.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Check-in
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/alunos/${dependente.id}`);
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botão para adicionar dependente se não tiver nenhum */}
        {dependentes.length === 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center text-blue-800">
                <Users className="h-5 w-5 mr-2" />
                Cadastre seus Dependentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  Você pode cadastrar seus dependentes menores de idade para que
                  eles também possam treinar!
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Gerencie o treino de toda a família</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Acompanhe a evolução de cada dependente</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Realize check-in para seus dependentes</span>
                  </li>
                </ul>
                <Button
                  onClick={() => setShowModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar Dependente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Cadastro/Edição de Dependente */}
      {showModal && (
        <DependenteForm
          formData={formData}
          setFormData={(data) => {
            setFormData(data);
          }}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setIsEditMode(false);
            setEditingDependenteId(null);
            setFormData({
              nome_completo: "",
              cpf: "",
              data_nascimento: "",
              genero: "MASCULINO",
              foto: "",
              email: "",
              telefone: "",
              telefone_emergencia: "",
              nome_contato_emergencia: "",
              cep: "",
              logradouro: "",
              numero: "",
              complemento: "",
              bairro: "",
              cidade: "",
              uf: "",
              unidade_id: "",
              numero_matricula: "",
              data_matricula: "",
              faixa_atual: "",
              graus: "",
              observacoes_medicas: "",
              alergias: "",
              medicamentos_uso_continuo: "",
              plano_saude: "",
              atestado_medico_validade: "",
              restricoes_medicas: "",
              responsavel_nome: "",
              responsavel_cpf: "",
              responsavel_telefone: "",
              responsavel_parentesco: "",
              dia_vencimento: "",
              valor_mensalidade: "",
              desconto_percentual: "",
              consent_lgpd: "",
              consent_imagem: "",
              observacoes: "",
            });
          }}
          isLoading={isLoading}
          unidades={unidades || []}
          isEditMode={isEditMode}
        />
      )}

      {/* Modal de Cadastro de Faixa Inicial */}
      {showFaixaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Cadastrar Faixa Inicial</h2>
            <p className="text-gray-600 mb-4">
              Você ainda não possui uma faixa cadastrada. Por favor, informe sua
              faixa atual:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faixa <span className="text-red-500">*</span>
                </label>
                <select
                  value={faixaInicial.faixa}
                  onChange={(e) =>
                    setFaixaInicial({ ...faixaInicial, faixa: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BRANCA">Branca</option>
                  <option value="CINZA">Cinza</option>
                  <option value="AMARELA">Amarela</option>
                  <option value="LARANJA">Laranja</option>
                  <option value="VERDE">Verde</option>
                  <option value="AZUL">Azul</option>
                  <option value="ROXA">Roxa</option>
                  <option value="MARROM">Marrom</option>
                  <option value="PRETA">Preta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Graus <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={faixaInicial.graus}
                  onChange={(e) =>
                    setFaixaInicial({
                      ...faixaInicial,
                      graus: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data em que recebeu esta faixa{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={faixaInicial.data_graduacao}
                  onChange={(e) =>
                    setFaixaInicial({
                      ...faixaInicial,
                      data_graduacao: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowFaixaModal(false)}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvarFaixaInicial}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
