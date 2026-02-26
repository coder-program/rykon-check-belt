"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GiHighKick,
  GiBoxingGlove,
  GiKimono,
  GiFist,
  GiMeditation,
  GiWeightLiftingUp,
  GiSoccerBall,
  GiBasketballBall,
  GiTennisBall,
  GiRunningShoe,
  GiSwimfins,
  GiAcrobatic,
  GiBlackBelt,
  GiMuscleUp,
} from "react-icons/gi";

import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Users,
  MapPin,
  ArrowLeft,
  Save,
  Check,
  ChevronRight,
} from "lucide-react";

interface Unidade {
  id: string;
  nome: string;
}

interface Modalidade {
  id: string;
  nome: string;
  cor?: string;
  ativo?: boolean;
}

interface Professor {
  id: string;
  nome_completo: string;
}

interface Aula {
  id: string;
  nome: string;
  descricao?: string;
  unidade_id: string;
  unidade?: {
    nome: string;
  };
  professor_id?: string;
  professor?: {
    nome_completo: string;
  };
  tipo: string;
  dia_semana: number;
  data_hora_inicio?: string;
  data_hora_fim?: string;
  capacidade_maxima: number;
  ativo: boolean;
  created_at: string;
  modalidade_id?: string;
  modalidade?: { id: string; nome: string; cor?: string };
}

function getDiaSemanaLabel(dia: number): string {
  const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  return dias[dia] ?? `Dia ${dia}`;
}

function getEsporteIcon(nome?: string): React.ReactNode {
  const n = (nome ?? "").toLowerCase();
  if (n.includes("muay") || n.includes("kickbox") || n.includes("karate") || n.includes("taekwondo"))
    return <GiHighKick size={28} />;
  if (n.includes("box"))
    return <GiBoxingGlove size={28} />;
  if (n.includes("jiu") || n.includes("judo") || n.includes("bjj"))
    return <GiKimono size={28} />;
  if (n.includes("mma") || n.includes("luta"))
    return <GiFist size={28} />;
  if (n.includes("yoga") || n.includes("pilates") || n.includes("medita"))
    return <GiMeditation size={28} />;
  if (n.includes("cross") || n.includes("funcional"))
    return <GiWeightLiftingUp size={28} />;
  if (n.includes("muscula") || n.includes("gym") || n.includes("academia"))
    return <GiMuscleUp size={28} />;
  if (n.includes("futebol") || n.includes("soccer"))
    return <GiSoccerBall size={28} />;
  if (n.includes("basquet"))
    return <GiBasketballBall size={28} />;
  if (n.includes("tenis") || n.includes("tênis"))
    return <GiTennisBall size={28} />;
  if (n.includes("corrida") || n.includes("atletismo") || n.includes("run"))
    return <GiRunningShoe size={28} />;
  if (n.includes("nata") || n.includes("swim") || n.includes("aqua"))
    return <GiSwimfins size={28} />;
  if (n.includes("capoeira") || n.includes("acrobat"))
    return <GiAcrobatic size={28} />;
  return <GiBlackBelt size={28} />;
}

export default function AulasPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [modalidadesDoForm, setModalidadesDoForm] = useState<Modalidade[]>([]);
  const [filtroUnidadeId, setFiltroUnidadeId] = useState<string | null>(null);
  const [filtroModalidadeId, setFiltroModalidadeId] = useState<string | null>(null);
  const [filtroDiaSemana, setFiltroDiaSemana] = useState<number | null>(null);
  const [, setProfessores] = useState<Professor[]>([]);
  const [professoresFiltrados, setProfessoresFiltrados] = useState<Professor[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAula, setEditingAula] = useState<Aula | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    unidade_id: "",
    professor_id: "",
    modalidade_id: "",
    tipo: "GI",
    dia_semana: 1,
    hora_inicio: "19:00",
    hora_fim: "20:30",
    capacidade_maxima: 30,
    ativo: true,
  });

  // Inicializar filtro de modalidade da lista a partir do sessionStorage — APENAS franqueado
  // Para gerente/instrutor o sessionStorage só serve para pré-preencher o form (useEffect abaixo)
  useEffect(() => {
    if (!user?.id) return;
    const perfis: Array<string | { nome?: string }> = Array.isArray(user?.perfis) ? user.perfis : [];
    const ehFranqueado = perfis.some((x) => (typeof x === "string" ? x : x?.nome || "").toLowerCase() === "franqueado");
    if (!ehFranqueado) return; // gerente/instrutor: lista não filtra por sessionStorage
    const key = `rykon_modalidade_${user.id}`;
    const stored = sessionStorage.getItem(key);
    if (!stored || stored === "all") {
      setFiltroModalidadeId(null);
    } else {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.id) setFiltroModalidadeId(parsed.id);
      } catch { /* ignorar */ }
    }
  }, [user?.id, user?.perfis]);

  // Após as aulas carregarem, validar se o filtro salvo ainda é aplicável.
  // O sessionStorage pode ter um ID de modalidade da sessão do dashboard que não existe
  // nas aulas atuais — isso faria o franqueado ver 0 aulas sem saber o motivo.
  useEffect(() => {
    if (aulas.length === 0 || !filtroModalidadeId) return;
    const existe = aulas.some((a) => a.modalidade_id === filtroModalidadeId);
    if (!existe) {
      setFiltroModalidadeId(null);
      setFiltroDiaSemana(null);
      // Limpar o valor salvo para não reaplicar na próxima visita
      if (user?.id) {
        sessionStorage.setItem(`rykon_modalidade_${user.id}`, "all");
      }
    }
  }, [aulas]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detectar se é franqueado
  const isFranqueado = Array.isArray(user?.perfis) && user.perfis.some(
    (x: string | { nome?: string }) => {
      const s = typeof x === "string" ? x : x?.nome || "";
      return s.toLowerCase() === "franqueado";
    }
  );

  // 1° filtro: unidade (só franqueado)
  const aulasFiltradasPorUnidade = isFranqueado && filtroUnidadeId
    ? aulas.filter((a) => a.unidade_id === filtroUnidadeId)
    : aulas;

  // Modalidades que de fato aparecem nas aulas — derivado das próprias aulas
  const modalidadesNasAulas = Array.from(
    new Map(
      aulasFiltradasPorUnidade
        .filter((a) => a.modalidade)
        .map((a) => [a.modalidade!.id, a.modalidade!])
    ).values()
  ).sort((a, b) => a.nome.localeCompare(b.nome));

  // 2° filtro: modalidade
  const aulasFiltPorModalidade = filtroModalidadeId
    ? aulasFiltradasPorUnidade.filter((a) => a.modalidade_id === filtroModalidadeId)
    : aulasFiltradasPorUnidade;

  // Dias da semana que aparecem nas aulas após filtro de modalidade
  const diasNasAulas = Array.from(
    new Set(aulasFiltPorModalidade.map((a) => a.dia_semana))
  ).sort((a, b) => a - b);

  // 3° filtro: dia da semana
  const aulasFiltradas = filtroDiaSemana !== null
    ? aulasFiltPorModalidade.filter((a) => a.dia_semana === filtroDiaSemana)
    : aulasFiltPorModalidade;

  // Validação para nome da aula
  const validateNomeAula = (value: string): string => {
    return value.replace(/[^a-zA-ZÀ-ÿ\s\-\(\)0-9]/g, "");
  };

  // Validação para descrição
  const validateDescricao = (value: string): string => {
    return value.replace(/[^a-zA-ZÀ-ÿ\s\-\(\)\.\,\;0-9]/g, "");
  };

  const diasSemana = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Segunda-feira" },
    { value: 2, label: "Terça-feira" },
    { value: 3, label: "Quarta-feira" },
    { value: 4, label: "Quinta-feira" },
    { value: 5, label: "Sexta-feira" },
    { value: 6, label: "Sábado" },
  ];

  const loadProfessoresDaUnidade = async (unidadeId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/professores?unidade_id=${unidadeId}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (response.ok) {
        const data = await response.json();
        setProfessoresFiltrados(Array.isArray(data) ? data : data.items || []);
      } else {
        setProfessoresFiltrados([]);
      }
    } catch { setProfessoresFiltrados([]); }
  };

  const loadModalidadesDaUnidade = async (unidadeId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/modalidades?unidade_id=${unidadeId}&apenasAtivas=true`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (response.ok) {
        const data = await response.json();
        const arr: Modalidade[] = Array.isArray(data) ? data : data.items || [];
        setModalidadesDoForm(arr);
      } else {
        setModalidadesDoForm([]);
      }
    } catch { setModalidadesDoForm([]); }
  };

  useEffect(() => { loadData(); }, []);

  // Carregar professores + modalidades quando unidade mudar no form
  useEffect(() => {
    if (formData.unidade_id) {
      loadProfessoresDaUnidade(formData.unidade_id);
      loadModalidadesDaUnidade(formData.unidade_id);
    } else {
      setProfessoresFiltrados([]);
      setModalidadesDoForm([]);
    }
  }, [formData.unidade_id]);

  // Scroll para o topo quando abrir o formulário
  // Para gerente (unidade fixa): carrega professores e modalidades ao abrir
  useEffect(() => {
    if (!showForm) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (formData.unidade_id && !isFranqueado) {
      loadProfessoresDaUnidade(formData.unidade_id);
      loadModalidadesDaUnidade(formData.unidade_id);
    }
  }, [showForm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-preencher modalidade do sessionStorage quando lista carregar (gerente)
  useEffect(() => {
    if (!user?.id || isFranqueado || modalidadesDoForm.length === 0) return;
    if (formData.modalidade_id) return; // já tem seleção manual ou de edição
    const key = `rykon_modalidade_${user.id}`;
    const stored = sessionStorage.getItem(key);
    if (!stored || stored === 'all') return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.id && modalidadesDoForm.some((m) => m.id === parsed.id)) {
        setFormData((prev) => ({ ...prev, modalidade_id: parsed.id }));
      }
    } catch { /* ignorar */ }
  }, [modalidadesDoForm]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Buscar dados do usuário para pegar a unidade (se houver)
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/me`,
        { headers }
      );
      let unidadeDoUsuario = null;

      if (userResponse.ok) {
        const userData = await userResponse.json();

        // Tentar pegar unidade do aluno
        if (userData.aluno?.unidade_id) {
          unidadeDoUsuario = userData.aluno.unidade_id;
        }
        // Se não for aluno, tentar pegar da primeira unidade como gerente
        else if (userData.unidades?.length > 0) {
          unidadeDoUsuario = userData.unidades[0].id;
        }
        // Se for professor
        else if (userData.professor?.unidade_id) {
          unidadeDoUsuario = userData.professor.unidade_id;
        }
      }

      // Carregar aulas - o backend já filtra automaticamente por perfil
      // Franqueados verão todas as suas unidades, outros perfis verão apenas a sua unidade
      const aulasUrl = `${process.env.NEXT_PUBLIC_API_URL}/aulas`;

      // Carregar aulas, unidades e professores em paralelo
      const [aulasRes, unidadesRes, professoresRes] = await Promise.all([
        fetch(aulasUrl, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/professores`, { headers }),
      ]);

      if (aulasRes.ok) {
        const data = await aulasRes.json();
        setAulas(data);
      } else {
        console.error('❌ [LOADDATA] aulas status:', aulasRes.status);
      }

      if (unidadesRes.ok) {
        const data = await unidadesRes.json();
        const unidadesArray = Array.isArray(data) ? data : data.items || [];

        // Para não-franqueados, filtrar apenas sua unidade
        if (unidadeDoUsuario) {
          const unidadesFiltradas = unidadesArray.filter(
            (u: Unidade) => u.id === unidadeDoUsuario
          );
          setUnidades(unidadesFiltradas);
          // Já preencher a unidade no form
          if (unidadesFiltradas.length > 0) {
            setFormData((prev) => ({
              ...prev,
              unidade_id: unidadesFiltradas[0].id,
            }));
          }
        } else {
          // Franqueado vê todas as unidades
          setUnidades(unidadesArray);
        }
      }

      if (professoresRes.ok) {
        const data = await professoresRes.json();
        setProfessores(Array.isArray(data) ? data : data.items || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 3) return;  // só salva no último step
    setSubmitting(true);

    // Validações de frontend
    if (formData.nome.length < 3) {
      alert("Nome da aula deve ter pelo menos 3 caracteres");
      setSubmitting(false);
      return;
    }

    if (formData.nome.length > 80) {
      alert("Nome da aula deve ter no máximo 80 caracteres");
      setSubmitting(false);
      return;
    }

    if (formData.descricao.length > 500) {
      alert("Descrição deve ter no máximo 500 caracteres");
      setSubmitting(false);
      return;
    }

    // Verificar se contém apenas caracteres válidos
    const nomeValido = /^[a-zA-ZÀ-ÿ\s\-\(\)0-9]+$/.test(formData.nome);
    if (!nomeValido) {
      alert(
        "Nome da aula contém caracteres não permitidos. Use apenas letras, números, espaços, hífens e parênteses."
      );
      setSubmitting(false);
      return;
    }

    const descricaoValida = /^[a-zA-ZÀ-ÿ\s\-\(\)\.\,\;0-9]*$/.test(
      formData.descricao
    );
    if (!descricaoValida) {
      alert(
        "Descrição contém caracteres não permitidos. Use apenas letras, números, espaços e pontuação básica."
      );
      setSubmitting(false);
      return;
    }

    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Para aulas recorrentes, usamos apenas hora sem data específica
    // O backend vai criar timestamps genéricos com o dia da semana
    const [horaInicio, minInicio] = formData.hora_inicio.split(":").map(Number);
    const [horaFim, minFim] = formData.hora_fim.split(":").map(Number);

    // Usar uma data base qualquer (próximo dia da semana escolhido)
    const hoje = new Date();
    const diasAte = (formData.dia_semana - hoje.getDay() + 7) % 7;
    const dataBase = new Date(hoje);
    dataBase.setDate(hoje.getDate() + diasAte);
    dataBase.setHours(0, 0, 0, 0);

    const data_hora_inicio = new Date(dataBase);
    data_hora_inicio.setHours(horaInicio, minInicio, 0, 0);

    const data_hora_fim = new Date(dataBase);
    data_hora_fim.setHours(horaFim, minFim, 0, 0);

    const payload = {
      nome: formData.nome,
      descricao: formData.descricao || undefined,
      unidade_id: formData.unidade_id,
      professor_id: formData.professor_id || undefined,
      modalidade_id: formData.modalidade_id || undefined,
      tipo: formData.tipo,
      dia_semana: formData.dia_semana,
      data_hora_inicio: data_hora_inicio.toISOString(),
      data_hora_fim: data_hora_fim.toISOString(),
      capacidade_maxima: formData.capacidade_maxima,
      ativo: formData.ativo,
    };


    try {
      const url = editingAula
        ? `${process.env.NEXT_PUBLIC_API_URL}/aulas/${editingAula.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/aulas`;

      const method = editingAula ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });


      if (response.ok) {
        const saved = await response.json();
        await loadData();
        handleCancel();
      } else {
        const error = await response.json();
        console.error('❌ [SUBMIT] Erro:', error);
        alert(`Erro: ${error.message || JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error("❌ [FRONTEND] Erro ao salvar aula:", error);
      alert("Erro ao salvar aula");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (aula: Aula) => {
    setEditingAula(aula);

    // Extrair hora de data_hora_inicio
    const inicio = aula.data_hora_inicio
      ? new Date(aula.data_hora_inicio)
      : null;
    const fim = aula.data_hora_fim ? new Date(aula.data_hora_fim) : null;

    const novoFormData = {
      nome: aula.nome,
      descricao: aula.descricao || "",
      unidade_id: aula.unidade_id,
      professor_id: aula.professor_id || "",
      modalidade_id: aula.modalidade_id || "",
      tipo: aula.tipo,
      dia_semana: aula.dia_semana,
      hora_inicio: inicio
        ? `${String(inicio.getHours()).padStart(2, "0")}:${String(
            inicio.getMinutes()
          ).padStart(2, "0")}`
        : "19:00",
      hora_fim: fim
        ? `${String(fim.getHours()).padStart(2, "0")}:${String(
            fim.getMinutes()
          ).padStart(2, "0")}`
        : "20:30",
      capacidade_maxima: aula.capacidade_maxima,
      ativo: aula.ativo,
    };

    setFormData(novoFormData);
    
    // Carregar professores e modalidades da unidade
    if (aula.unidade_id) {
      loadProfessoresDaUnidade(aula.unidade_id);
      loadModalidadesDaUnidade(aula.unidade_id);
    }
    
    setCurrentStep(1);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aulas/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        await loadData();
      } else {
        alert("Erro ao excluir aula");
      }
    } catch (error) {
      console.error("Erro ao excluir aula:", error);
      alert("Erro ao excluir aula");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAula(null);
    setCurrentStep(1);
    setProfessoresFiltrados([]);
    setModalidadesDoForm([]);
    // Gerente: preserva unidade fixa; franqueado: limpa
    const unidadeFixa = !isFranqueado && unidades[0]?.id ? unidades[0].id : "";
    setFormData({
      nome: "",
      descricao: "",
      unidade_id: unidadeFixa,
      professor_id: "",
      modalidade_id: "",
      tipo: "GI",
      dia_semana: 1,
      hora_inicio: "19:00",
      hora_fim: "20:30",
      capacidade_maxima: 30,
      ativo: true,
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #e2e6f3 0%, #eaecf8 40%, #e6e9f5 100%)" }}>
      {/* Hero Header */}
      <div className="bg-linear-to-r from-[#0f172a] via-[#1e3a8a] to-[#312e81] shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                title="Voltar ao dashboard"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 h-auto text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Voltar
              </Button>
              <div className="w-px h-8 bg-white/20" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight leading-tight">
                    Gerenciamento de Aulas
                  </h1>
                  <p className="text-blue-200/70 text-xs mt-0.5">
                    Cadastre e gerencie as aulas das unidades
                  </p>
                </div>
              </div>
            </div>

            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                title="Cadastrar nova aula recorrente"
                className="bg-white text-blue-800 hover:bg-blue-50 font-semibold shadow-lg shadow-black/20 border-0 px-4 py-2 h-auto text-sm rounded-xl transition-all hover:scale-[1.03]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Aula
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Formulário — Step Wizard */}
        {showForm && (
          <div className="mb-6 rounded-2xl overflow-hidden shadow-xl border border-white/60">
            {/* Cabeçalho com steps */}
            <div className="bg-linear-to-r from-[#0f172a] via-[#1e3a8a] to-[#312e81] px-8 py-6">
              <h2 className="text-white font-bold text-lg mb-5">
                {editingAula ? "✏️ Editar Aula" : "➕ Nova Aula Recorrente"}
              </h2>
              <div className="flex items-center">
                {[{id:1,label:"Identificação"},{id:2,label:"Local & Turma"},{id:3,label:"Horário"}].map((step, idx) => (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                        currentStep > step.id
                          ? "bg-white border-white text-blue-600"
                          : currentStep === step.id
                          ? "bg-white border-white text-blue-700 shadow-lg scale-110"
                          : "bg-transparent border-white/40 text-white/60"
                      }`}>
                        {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                      </div>
                      <span className={`text-xs font-medium mt-1.5 whitespace-nowrap ${
                        currentStep >= step.id ? "text-white" : "text-white/50"
                      }`}>{step.label}</span>
                    </div>
                    {idx < 2 && (
                      <div className={`flex-1 h-0.5 mx-3 mb-5 rounded-full transition-all ${
                        currentStep > step.id ? "bg-white" : "bg-white/25"
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Conteúdo do step */}
            <div className="bg-white px-8 py-6">
              <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}>

                {/* ── Step 1: Identificação ─────────────────────── */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome da Aula *</label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => {
                          const v = validateNomeAula(e.target.value);
                          if (v.length <= 80) setFormData({ ...formData, nome: v });
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                        placeholder="Ex: Jiu-Jitsu Gi Fundamental"
                        maxLength={80}
                      />
                      <p className="text-xs text-gray-400 mt-1">{formData.nome.length}/80 caracteres</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Aula</label>
                      <input
                        type="text"
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                        placeholder="Ex: Gi, NoGi, Infantil, Competição..."
                      />
                      <p className="text-xs text-gray-400 mt-1">Campo livre</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição</label>
                      <textarea
                        value={formData.descricao}
                        onChange={(e) => {
                          const v = validateDescricao(e.target.value);
                          if (v.length <= 500) setFormData({ ...formData, descricao: v });
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                        rows={3}
                        placeholder="Descrição da aula (opcional)"
                        maxLength={500}
                      />
                      <p className="text-xs text-gray-400 mt-1">{formData.descricao.length}/500 caracteres</p>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Local & Turma ─────────────────────── */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unidade *</label>
                      <select
                        value={formData.unidade_id}
                        onChange={(e) => {
                          const id = e.target.value;
                          setFormData({ ...formData, unidade_id: id, professor_id: "", modalidade_id: "" });
                          if (id) { loadProfessoresDaUnidade(id); loadModalidadesDaUnidade(id); }
                        }}
                        disabled={!isFranqueado}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      >
                        <option value="">Selecione uma unidade</option>
                        {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Modalidade *</label>
                      <select
                        value={formData.modalidade_id}
                        onChange={(e) => setFormData({ ...formData, modalidade_id: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:opacity-50"
                        disabled={!formData.unidade_id}
                      >
                        <option value="">
                          {!formData.unidade_id ? "Selecione uma unidade primeiro"
                            : modalidadesDoForm.length === 0 ? "Nenhuma modalidade habilitada nesta unidade"
                            : "Selecione a modalidade"}
                        </option>
                        {modalidadesDoForm.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                      {formData.unidade_id && modalidadesDoForm.length === 0 && (
                        <p className="text-xs text-orange-500 mt-1">Esta unidade não tem modalidades habilitadas. Acesse Modalidades para vincular.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Professor</label>
                      <select
                        value={formData.professor_id}
                        onChange={(e) => setFormData({ ...formData, professor_id: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:opacity-50"
                        disabled={!formData.unidade_id}
                      >
                        <option value="">
                          {!formData.unidade_id ? "Selecione uma unidade primeiro"
                            : professoresFiltrados.length === 0 ? "Nenhum professor nesta unidade"
                            : "A definir (opcional)"}
                        </option>
                        {professoresFiltrados.map((p) => (
                          <option key={p.id} value={p.id}>{p.nome_completo}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Horário & Config ─────────────────── */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dia da Semana *</label>
                      <select
                        value={formData.dia_semana}
                        onChange={(e) => setFormData({ ...formData, dia_semana: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        {diasSemana.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hora Início *</label>
                        <input
                          type="time"
                          value={formData.hora_inicio}
                          onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hora Fim *</label>
                        <input
                          type="time"
                          value={formData.hora_fim}
                          onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Capacidade Máxima *</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.capacidade_maxima}
                        onChange={(e) => setFormData({ ...formData, capacidade_maxima: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          formData.ativo ? "bg-blue-600" : "bg-gray-300"
                        }`}
                        onClick={() => setFormData({ ...formData, ativo: !formData.ativo })}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          formData.ativo ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">Aula Ativa</span>
                    </label>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs text-blue-700">
                        <strong>ℹ️ Aula Recorrente:</strong> Aparece automaticamente toda semana no dia e horário escolhidos.
                      </p>
                    </div>
                  </div>
                )}

                {/* Navegação entre steps */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    title={currentStep === 1 ? "Cancelar e fechar formulário" : "Voltar ao passo anterior"}
                    onClick={() => currentStep === 1 ? handleCancel() : setCurrentStep(currentStep - 1)}
                    className="cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {currentStep === 1 ? "Cancelar" : "Anterior"}
                  </button>

                  <span className="text-xs text-gray-400">{currentStep} de 3</span>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      title="Avançar para o próximo passo"
                      onClick={() => {
                        if (currentStep === 1 && formData.nome.length < 3) {
                          alert("Digite o nome da aula (mínimo 3 caracteres)");
                          return;
                        }
                        if (currentStep === 2 && !formData.unidade_id) {
                          alert("Selecione uma unidade");
                          return;
                        }
                        if (currentStep === 2 && !formData.modalidade_id) {
                          alert("Selecione uma modalidade");
                          return;
                        }
                        setCurrentStep(currentStep + 1);
                      }}
                      className="cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      title={editingAula ? "Salvar alterações da aula" : "Cadastrar nova aula"}
                      onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                      disabled={submitting}
                      className="cursor-pointer flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      {submitting ? "Salvando..." : editingAula ? "Atualizar Aula" : "Cadastrar Aula"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de Aulas */}
        {loading ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3 animate-pulse">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-sm text-gray-400 font-medium">Carregando aulas...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Barra de filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-white/60 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-linear-to-r from-gray-50 to-white">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Filtros</span>
                <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2.5 py-0.5 rounded-full">
                  {aulasFiltradas.length} aula{aulasFiltradas.length !== 1 ? "s" : ""}
                  {filtroDiaSemana !== null || filtroModalidadeId !== null || filtroUnidadeId !== null ? " encontrada" + (aulasFiltradas.length !== 1 ? "s" : "") : " no total"}
                </span>
              </div>

              <div className="px-5 py-4 flex flex-col gap-3.5">
                {/* Filtro de unidade — só franqueado */}
                {isFranqueado && unidades.length > 1 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.12em] w-20 shrink-0">Unidade</span>
                    <button
                      title="Mostrar todas as unidades"
                      onClick={() => { setFiltroUnidadeId(null); setFiltroModalidadeId(null); setFiltroDiaSemana(null); }}
                      className={`cursor-pointer px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                        filtroUnidadeId === null
                          ? "bg-slate-800 text-white shadow-md shadow-slate-800/25"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >Todas</button>
                    {unidades.map((u) => (
                      <button key={u.id}
                        title={`Filtrar por: ${u.nome}`}
                        onClick={() => { setFiltroUnidadeId(u.id); setFiltroModalidadeId(null); setFiltroDiaSemana(null); }}
                        className={`cursor-pointer px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                          filtroUnidadeId === u.id
                            ? "bg-slate-800 text-white shadow-md shadow-slate-800/25"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >{u.nome}</button>
                    ))}
                  </div>
                )}
                {isFranqueado && unidades.length > 1 && <div className="border-t border-dashed border-gray-100" />}

                {/* Filtro de modalidade */}
                {modalidadesNasAulas.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.12em] w-20 shrink-0">Modalidade</span>
                    <button
                      title="Mostrar todas as modalidades"
                      onClick={() => { setFiltroModalidadeId(null); setFiltroDiaSemana(null); }}
                      className={`cursor-pointer px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                        filtroModalidadeId === null
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                          : "bg-blue-50 text-blue-500 hover:bg-blue-100"
                      }`}
                    >Todas</button>
                    {modalidadesNasAulas.map((m) => (
                      <button key={m.id}
                        title={`Filtrar por: ${m.nome}`}
                        onClick={() => { setFiltroModalidadeId(m.id); setFiltroDiaSemana(null); }}
                        className="cursor-pointer px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                        style={filtroModalidadeId === m.id
                          ? { backgroundColor: m.cor || "#1E3A8A", color: "white", boxShadow: `0 4px 12px ${m.cor || "#1E3A8A"}40` }
                          : { backgroundColor: (m.cor || "#1E3A8A") + "15", color: m.cor || "#1E3A8A" }
                        }
                      >{m.nome}</button>
                    ))}
                  </div>
                )}
                {modalidadesNasAulas.length > 0 && diasNasAulas.length > 1 && <div className="border-t border-dashed border-gray-100" />}

                {/* Filtro de dia da semana */}
                {diasNasAulas.length > 1 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.12em] w-20 shrink-0">Dia</span>
                    <button
                      title="Mostrar todos os dias"
                      onClick={() => setFiltroDiaSemana(null)}
                      className={`cursor-pointer px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                        filtroDiaSemana === null
                          ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                          : "bg-violet-50 text-violet-500 hover:bg-violet-100"
                      }`}
                    >Todos</button>
                    {diasNasAulas.map((d) => (
                      <button key={d}
                        title={`Filtrar por: ${getDiaSemanaLabel(d)}`}
                        onClick={() => setFiltroDiaSemana(d)}
                        className={`cursor-pointer px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                          filtroDiaSemana === d
                            ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                            : "bg-violet-50 text-violet-500 hover:bg-violet-100"
                        }`}
                      >{getDiaSemanaLabel(d).replace("-feira", "").replace("Quarta", "Qua.").replace("Quinta", "Qui.")}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {aulasFiltradas.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-white/80 p-12 text-center">
                <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Calendar className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-gray-700 mb-1">
                  {filtroModalidadeId
                    ? "Nenhuma aula para esta modalidade"
                    : filtroUnidadeId
                    ? "Nenhuma aula nesta unidade"
                    : "Ainda não há aulas cadastradas"}
                </h3>
                <p className="text-sm text-gray-400 mb-5 max-w-xs mx-auto">
                  {filtroModalidadeId || filtroUnidadeId
                    ? "Tente ajustar os filtros ou cadastre uma nova aula."
                    : "Cadastre a primeira aula para começar a gerenciar os horários."}
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 border-0 rounded-xl px-5"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeira Aula
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aulasFiltradas.map((aula) => {
                const cor = aula.modalidade?.cor || "#1E3A8A";
                return (
                <div
                  key={aula.id}
                  className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-white/80"
                >
                  {/* Colored top strip */}
                  <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${cor}, ${cor}99)` }} />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      {/* Bloco esquerdo: ícone + conteúdo */}
                      <div className="flex gap-4 flex-1 min-w-0">

                        {/* Ícone da modalidade — estilo badge esportivo */}
                        <div
                          className="shrink-0 select-none relative"
                          style={{ width: 52, height: 52 }}
                          title={aula.modalidade?.nome || "Aula"}
                        >
                          <div
                            className="w-full h-full rounded-2xl flex items-center justify-center shadow-md"
                            style={{
                              background: `linear-gradient(135deg, ${cor}dd, ${cor}88)`,
                              boxShadow: `0 4px 14px ${cor}45`,
                            }}
                          >
                            <span className="flex items-center justify-center text-white" role="img" aria-label={aula.modalidade?.nome || "esporte"}>
                              {getEsporteIcon(aula.modalidade?.nome)}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Tags top row */}
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            {aula.modalidade && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                                style={{ backgroundColor: cor + "18", color: cor }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: cor }} />
                                {aula.modalidade.nome}
                              </span>
                            )}
                            {aula.tipo && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500">{aula.tipo}</span>
                            )}
                            {aula.ativo
                              ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-emerald-50 text-emerald-600">● Ativa</span>
                              : <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-400">○ Inativa</span>
                            }
                          </div>

                          {/* Nome */}
                          <h3 className="text-[15px] font-bold text-gray-900 mb-0.5 truncate leading-snug">{aula.nome}</h3>

                          {/* Descrição */}
                          {aula.descricao && (
                            <p className="text-xs text-gray-400 mb-2 line-clamp-1">{aula.descricao}</p>
                          )}

                          {/* Info chips */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-100">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              {aula.unidade?.nome || "N/A"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-100">
                              <Users className="h-3 w-3 text-slate-400 shrink-0" />
                              {aula.professor?.nome_completo || "A definir"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1 border" style={{ color: cor, backgroundColor: cor + "10", borderColor: cor + "25" }}>
                              <Calendar className="h-3 w-3 shrink-0" />
                              {getDiaSemanaLabel(aula.dia_semana)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-100">
                              <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                              {aula.data_hora_inicio
                                ? new Date(aula.data_hora_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                : "N/A"}{" – "}
                              {aula.data_hora_fim
                                ? new Date(aula.data_hora_fim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botões */}
                      <div className="flex flex-col gap-1.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          title="Editar aula"
                          onClick={() => handleEdit(aula)}
                          className="cursor-pointer w-8 h-8 rounded-xl bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 flex items-center justify-center transition-all"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Excluir aula"
                          onClick={() => handleDelete(aula.id)}
                          className="cursor-pointer w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-500 flex items-center justify-center transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
