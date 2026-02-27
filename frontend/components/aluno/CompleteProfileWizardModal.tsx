"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Award,
  Check,
  ChevronRight,
  Loader2,
  AlertCircle,
  User,
  Heart,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const FAIXAS = [
  { value: "BRANCA", label: "Branca", bg: "#f3f4f6", text: "#374151" },
  { value: "CINZA", label: "Cinza", bg: "#9ca3af", text: "#fff" },
  { value: "AMARELA", label: "Amarela", bg: "#fbbf24", text: "#111827" },
  { value: "LARANJA", label: "Laranja", bg: "#f97316", text: "#fff" },
  { value: "VERDE", label: "Verde", bg: "#22c55e", text: "#fff" },
  { value: "AZUL", label: "Azul", bg: "#3b82f6", text: "#fff" },
  { value: "ROXA", label: "Roxa", bg: "#7c3aed", text: "#fff" },
  { value: "MARROM", label: "Marrom", bg: "#92400e", text: "#fff" },
  { value: "PRETA", label: "Preta", bg: "#111827", text: "#fff" },
];

type Step = "loading" | "address" | "dados" | "saude" | "outras" | "jiu" | "done";

interface ModalidadeInfo {
  id: string; // modalidade_id
  nome: string;
  cor?: string;
  graduacao_atual?: string | null;
  data_ultima_graduacao?: string | null;
}

interface Props {
  onComplete?: () => void;
}

export default function CompleteProfileWizardModal({ onComplete }: Props) {
  const { user, checkAuthStatus } = useAuth();
  const [step, setStep] = useState<Step>("loading");
  const [alunoId, setAlunoId] = useState<string | null>(null);
  const [hasJiu, setHasJiu] = useState(false);
  const [hasOutras, setHasOutras] = useState(false);
  const [outrasMods, setOutrasMods] = useState<ModalidadeInfo[]>([]);
  const [outraGraduacoes, setOutraGraduacoes] = useState<
    Record<string, { graduacao_atual: string; data_ultima_graduacao: string }>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  const [dados, setDados] = useState({
    nome_completo: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    genero: "",
    email: "",
  });

  const [saude, setSaude] = useState({
    telefone_emergencia: "",
    nome_contato_emergencia: "",
    plano_saude: "",
    observacoes_medicas: "",
    alergias: "",
    medicamentos_uso_continuo: "",
    restricoes_medicas: "",
  });

  const [address, setAddress] = useState({
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

  const [jiu, setJiu] = useState({
    faixa_atual: "BRANCA",
    graus: 0,
    data_ultima_graduacao: new Date().toISOString().split("T")[0],
  });

  // Load aluno data on mount
  useEffect(() => {
    if (!user?.id) return;

    // ── Primary trigger: if cadastro_completo is true, skip wizard ──
    if (user?.cadastro_completo === true) {
      setStep("done");
      return;
    }

    const token = localStorage.getItem("token");

    fetch(`${API_URL}/alunos/usuario/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(async (aluno) => {
        if (!aluno?.id) {
          setStep("address");
          return;
        }
        setAlunoId(aluno.id);

        // Pre-fill personal data from registration
        setDados({
          nome_completo: aluno.nome_completo ?? "",
          cpf: aluno.cpf ?? "",
          telefone: aluno.telefone ?? "",
          data_nascimento: aluno.data_nascimento
            ? String(aluno.data_nascimento).split("T")[0]
            : "",
          genero: aluno.genero ?? "",
          email: aluno.email ?? user?.email ?? "",
        });

        // Pre-fill health data if already saved
        setSaude({
          telefone_emergencia: aluno.telefone_emergencia ?? "",
          nome_contato_emergencia: aluno.nome_contato_emergencia ?? "",
          plano_saude: aluno.plano_saude ?? "",
          observacoes_medicas: aluno.observacoes_medicas ?? "",
          alergias: aluno.alergias ?? "",
          medicamentos_uso_continuo: aluno.medicamentos_uso_continuo ?? "",
          restricoes_medicas: aluno.restricoes_medicas ?? "",
        });

        // Fetch modalidades to classify jiu vs outras
        const isJiuNome = (nome: string) => {
          const n = nome.toLowerCase();
          return n.includes("jiu") || n.includes("jitsu") || n.includes("bjj");
        };

        try {
          const modsRes = await fetch(`${API_URL}/alunos/${aluno.id}/modalidades`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const mods: ModalidadeInfo[] = modsRes.ok ? await modsRes.json() : [];

          const outrasList = mods.filter((m) => !isJiuNome(m.nome));
          const jiuList = mods.filter((m) => isJiuNome(m.nome));

          setHasJiu(jiuList.length > 0);
          setHasOutras(outrasList.length > 0);
          setOutrasMods(outrasList);

          // Pre-fill with existing graduacao_atual
          const initGrads: Record<string, { graduacao_atual: string; data_ultima_graduacao: string }> = {};
          for (const m of outrasList) {
            initGrads[m.id] = {
              graduacao_atual: m.graduacao_atual ?? "",
              data_ultima_graduacao: m.data_ultima_graduacao
                ? String(m.data_ultima_graduacao).split("T")[0]
                : new Date().toISOString().split("T")[0],
            };
          }
          setOutraGraduacoes(initGrads);
        } catch {
          // ignore — just skip the step
        }

        setStep("address");
      })
      .catch(() => {
        setStep("address");
      });
  }, [user?.id, user?.email, user?.cadastro_completo]);

  // CEP auto-fill from ViaCEP
  const fetchCep = async (raw: string) => {
    const clean = raw.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress((prev) => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          uf: data.uf || prev.uf,
          complemento: data.complemento || prev.complemento,
        }));
      }
    } finally {
      setLoadingCep(false);
    }
  };

  const goBack = () => {
    if (step === "dados") setStep("address");
    else if (step === "saude") setStep("dados");
    else if (step === "outras") setStep("saude");
    else if (step === "jiu") setStep(hasOutras ? "outras" : "saude");
  };

  const goNext = () => {
    if (step === "address") {
      if (!address.cep.trim() || !address.logradouro.trim() || !address.numero.trim()) {
        toast.error("Preencha CEP, logradouro e número.");
        return;
      }
      setStep("dados");
    } else if (step === "dados") {
      if (!dados.nome_completo.trim() || !dados.data_nascimento || !dados.genero) {
        toast.error("Nome, data de nascimento e gênero são obrigatórios.");
        return;
      }
      setStep("saude");
    } else if (step === "saude") {
      if (hasOutras) {
        setStep("outras");
      } else if (hasJiu) {
        setStep("jiu");
      } else {
        handleSubmit();
      }
    } else if (step === "outras") {
      if (hasJiu) {
        setStep("jiu");
      } else {
        handleSubmit();
      }
    } else if (step === "jiu") {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!alunoId || !user?.id) return;
    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      // Build update payload
      const body: Record<string, unknown> = {
        // address
        cep: address.cep.replace(/\D/g, ""),
        logradouro: address.logradouro,
        numero: address.numero,
        complemento: address.complemento,
        bairro: address.bairro,
        cidade: address.cidade,
        uf: address.uf,
        // personal data
        nome_completo: dados.nome_completo,
        cpf: dados.cpf.replace(/\D/g, "") || undefined,
        telefone: dados.telefone,
        data_nascimento: dados.data_nascimento || undefined,
        genero: dados.genero || undefined,
        email: dados.email || undefined,
        // health / emergency
        telefone_emergencia: saude.telefone_emergencia || undefined,
        nome_contato_emergencia: saude.nome_contato_emergencia || undefined,
        plano_saude: saude.plano_saude || undefined,
        observacoes_medicas: saude.observacoes_medicas || undefined,
        alergias: saude.alergias || undefined,
        medicamentos_uso_continuo: saude.medicamentos_uso_continuo || undefined,
        restricoes_medicas: saude.restricoes_medicas || undefined,
      };

      if (hasJiu || step === "jiu") {
        body.faixa_atual = jiu.faixa_atual;
        body.graus = Number(jiu.graus);
        body.data_ultima_graduacao = jiu.data_ultima_graduacao;
      }

      // 1. Update aluno data (address + optional jiu graduation)
      const alunoRes = await fetch(`${API_URL}/alunos/${alunoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!alunoRes.ok) {
        const err = await alunoRes.json().catch(() => ({}));
        throw new Error(err?.message || "Erro ao salvar dados do aluno");
      }

      // 2. Salvar graduações das outras modalidades
      for (const mod of outrasMods) {
        const grad = outraGraduacoes[mod.id];
        if (grad?.graduacao_atual?.trim()) {
          await fetch(`${API_URL}/alunos/${alunoId}/modalidades/${mod.id}/graduacao`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              graduacao_atual: grad.graduacao_atual,
              data_ultima_graduacao: grad.data_ultima_graduacao,
            }),
          });
        }
      }

      // 3. Mark user as cadastro_completo = true
      await fetch(`${API_URL}/usuarios/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cadastro_completo: true }),
      });

      // Refresh auth context so user.cadastro_completo updates
      if (checkAuthStatus) await checkAuthStatus();

      toast.success("Perfil completado com sucesso! 🎉");
      setStep("done");
      setTimeout(() => onComplete?.(), 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar. Tente novamente.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Don't render if done
  if (step === "done") return null;

  const allSteps = [
    "address",
    "dados",
    "saude",
    ...(hasOutras ? ["outras"] : []),
    ...(hasJiu ? ["jiu"] : []),
  ] as Step[];
  const totalSteps = allSteps.length;
  const currentStep = step === "loading" ? 0 : allSteps.indexOf(step) + 1;
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              {step === "address" ? (
                <MapPin className="h-5 w-5" />
              ) : step === "dados" ? (
                <User className="h-5 w-5" />
              ) : step === "saude" ? (
                <Heart className="h-5 w-5" />
              ) : step === "outras" ? (
                <Award className="h-5 w-5" />
              ) : (
                <Award className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">Complete seu perfil</h2>
              <p className="text-blue-100 text-sm">
                {step === "loading" && "Carregando seus dados..."}
                {step === "address" && `Passo 1 de ${totalSteps} — Endereço`}
                {step === "dados" &&
                  `Passo ${allSteps.indexOf("dados") + 1} de ${totalSteps} — Dados Pessoais`}
                {step === "saude" &&
                  `Passo ${allSteps.indexOf("saude") + 1} de ${totalSteps} — Saúde & Emergência`}
                {step === "outras" &&
                  `Passo ${allSteps.indexOf("outras") + 1} de ${totalSteps} — Suas Modalidades`}
                {step === "jiu" &&
                  `Passo ${allSteps.indexOf("jiu") + 1} de ${totalSteps} — Jiu-Jitsu`}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-gray-500 text-sm">Carregando seus dados...</p>
            </div>
          )}

          {/* Step 1 — Address */}
          {step === "address" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700">
                  Para continuar, preencha seu endereço residencial. O CEP
                  preencherá os campos automaticamente.
                </p>
              </div>

              {/* CEP */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                    CEP *
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    placeholder="00000-000"
                    value={address.cep}
                    onChange={(e) =>
                      setAddress({ ...address, cep: e.target.value })
                    }
                    onBlur={(e) => fetchCep(e.target.value)}
                    maxLength={9}
                  />
                </div>
                {loadingCep && (
                  <div className="pb-2.5">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  </div>
                )}
              </div>

              {/* Logradouro */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                  Logradouro *
                </label>
                <input
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="Rua, Avenida, Travessa..."
                  value={address.logradouro}
                  onChange={(e) =>
                    setAddress({ ...address, logradouro: e.target.value })
                  }
                />
              </div>

              {/* Número + Complemento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                    Número *
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    placeholder="123"
                    value={address.numero}
                    onChange={(e) =>
                      setAddress({ ...address, numero: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                    Complemento
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    placeholder="Apto, Bloco..."
                    value={address.complemento}
                    onChange={(e) =>
                      setAddress({ ...address, complemento: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Bairro + Cidade + UF */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                    Bairro
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={address.bairro}
                    onChange={(e) =>
                      setAddress({ ...address, bairro: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                    Cidade
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={address.cidade}
                    onChange={(e) =>
                      setAddress({ ...address, cidade: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                    UF
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition uppercase"
                    maxLength={2}
                    value={address.uf}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        uf: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step — Dados Pessoais */}
          {step === "dados" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 mb-1">
                <User className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700">
                  Confirme e complete seus dados pessoais. Os campos com *
                  são obrigatórios.
                </p>
              </div>

              {/* Nome */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nome completo *</label>
                <input
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  value={dados.nome_completo}
                  onChange={(e) => setDados({ ...dados, nome_completo: e.target.value })}
                />
              </div>

              {/* CPF + Telefone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">CPF</label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={dados.cpf}
                    onChange={(e) => setDados({ ...dados, cpf: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Telefone / WhatsApp</label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    placeholder="(00) 00000-0000"
                    value={dados.telefone}
                    onChange={(e) => setDados({ ...dados, telefone: e.target.value })}
                  />
                </div>
              </div>

              {/* Data nasc + Gênero */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Data de nascimento *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={dados.data_nascimento}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDados({ ...dados, data_nascimento: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Gênero *</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white"
                    value={dados.genero}
                    onChange={(e) => setDados({ ...dados, genero: e.target.value })}
                  >
                    <option value="">Selecionar</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                    <option value="OUTRO">Outro</option>
                    <option value="NAO_INFORMADO">Prefiro não informar</option>
                  </select>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">E-mail</label>
                <input
                  type="email"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="seu@email.com"
                  value={dados.email}
                  onChange={(e) => setDados({ ...dados, email: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step — Saúde & Emergência */}
          {step === "saude" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100 mb-1">
                <Heart className="h-4 w-4 text-rose-500 shrink-0" />
                <p className="text-xs text-rose-700">
                  Informações de saúde e contato de emergência. Todos os campos
                  são opcionais, mas nos ajudam a cuidar melhor de você.
                </p>
              </div>

              {/* Contato emergência */}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Emergência</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nome do contato</label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
                    placeholder="Nome do responsável"
                    value={saude.nome_contato_emergencia}
                    onChange={(e) => setSaude({ ...saude, nome_contato_emergencia: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                    <Phone className="inline h-3 w-3 mr-1" />Telefone emergência
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
                    placeholder="(00) 00000-0000"
                    value={saude.telefone_emergencia}
                    onChange={(e) => setSaude({ ...saude, telefone_emergencia: e.target.value })}
                  />
                </div>
              </div>

              {/* Saúde */}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-1">Saúde</p>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Plano de saúde</label>
                <input
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
                  placeholder="Ex: Unimed, Bradesco Saúde..."
                  value={saude.plano_saude}
                  onChange={(e) => setSaude({ ...saude, plano_saude: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Alergias</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition resize-none"
                  placeholder="Alergias conhecidas..."
                  value={saude.alergias}
                  onChange={(e) => setSaude({ ...saude, alergias: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Medicamentos de uso contínuo</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition resize-none"
                  placeholder="Medicamentos em uso..."
                  value={saude.medicamentos_uso_continuo}
                  onChange={(e) => setSaude({ ...saude, medicamentos_uso_continuo: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Restrições / Observações médicas</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition resize-none"
                  placeholder="Restrições médicas ou observações relevantes..."
                  value={saude.restricoes_medicas}
                  onChange={(e) => setSaude({ ...saude, restricoes_medicas: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step — Outras Modalidades */}
          {step === "outras" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 mb-2">
                <Award className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">
                  Informe sua graduação atual em cada modalidade. Este campo é
                  opcional — você pode preencher depois no seu perfil.
                </p>
              </div>

              {outrasMods.map((mod) => {
                const grad = outraGraduacoes[mod.id] ?? {
                  graduacao_atual: "",
                  data_ultima_graduacao: new Date().toISOString().split("T")[0],
                };
                return (
                  <div
                    key={mod.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      {mod.cor && (
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: mod.cor }}
                        />
                      )}
                      <span className="font-semibold text-sm text-gray-800">
                        {mod.nome}
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                        Graduação atual
                      </label>
                      <input
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                        placeholder="Ex: Faixa Amarela, Kyu 7, Intermediário..."
                        value={grad.graduacao_atual}
                        onChange={(e) =>
                          setOutraGraduacoes((prev) => ({
                            ...prev,
                            [mod.id]: { ...grad, graduacao_atual: e.target.value },
                          }))
                        }
                      />
                    </div>

                    {grad.graduacao_atual.trim() && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                          Data da graduação
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                          value={grad.data_ultima_graduacao}
                          max={new Date().toISOString().split("T")[0]}
                          onChange={(e) =>
                            setOutraGraduacoes((prev) => ({
                              ...prev,
                              [mod.id]: { ...grad, data_ultima_graduacao: e.target.value },
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step — Jiu-Jitsu */}
          {step === "jiu" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100 mb-2">
                <Award className="h-4 w-4 text-purple-500 shrink-0" />
                <p className="text-xs text-purple-700">
                  Você está matriculado em Jiu-Jitsu. Informe sua graduação
                  atual para que seu progresso seja registrado corretamente.
                </p>
              </div>

              {/* Faixa pills */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2.5 block">
                  Faixa Atual
                </label>
                <div className="flex flex-wrap gap-2">
                  {FAIXAS.map((f) => {
                    const selected = jiu.faixa_atual === f.value;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() =>
                          setJiu({ ...jiu, faixa_atual: f.value })
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                          selected
                            ? "scale-110 shadow-md border-transparent"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                        }`}
                        style={
                          selected
                            ? {
                                background: f.bg,
                                color: f.text,
                                borderColor: f.bg,
                              }
                            : {}
                        }
                      >
                        {selected && <span className="mr-1">✓</span>}
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Graus */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2.5 block">
                  Graus
                </label>
                <div className="flex gap-3">
                  {[0, 1, 2, 3, 4].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setJiu({ ...jiu, graus: g })}
                      className={`w-11 h-11 rounded-full font-bold text-sm border-2 transition-all ${
                        jiu.graus === g
                          ? "bg-purple-600 border-purple-600 text-white scale-110 shadow-md"
                          : "bg-white border-gray-200 text-gray-700 hover:border-purple-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data última graduação */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                  Data da última graduação
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                  value={jiu.data_ultima_graduacao}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    setJiu({ ...jiu, data_ultima_graduacao: e.target.value })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {step !== "loading" && (
          <div className="px-6 pb-6 flex gap-3">
            {allSteps.indexOf(step) > 0 && (
              <Button
                variant="outline"
                onClick={goBack}
                disabled={submitting}
                className="h-11 px-4"
              >
                ← Voltar
              </Button>
            )}
            <Button
              onClick={goNext}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </span>
              ) : step === "jiu" ||
                (step === "saude" && !hasOutras && !hasJiu) ||
                (step === "outras" && !hasJiu) ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" /> Concluir
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Próximo <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
