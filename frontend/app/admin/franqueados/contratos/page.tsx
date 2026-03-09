"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listFranqueados, createFranqueadoContrato } from "@/lib/peopleApi";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ArrowLeft, FileText, DollarSign, Calendar,
  User, Building2, ChevronRight, ChevronLeft,
  CheckCircle2, Package, Wrench, Save, Search, AlertCircle,
} from "lucide-react";

// ── Catalogue ────────────────────────────────────────────────
const MODULOS_CATALOGO = [
  { codigo: "CORE",   nome: "Rykon FIT Core",           tipo: "base",  valorPadrao: 0 },
  { codigo: "FIN",    nome: "Financeiro / Assinaturas",  tipo: "extra", valorPadrao: 120 },
  { codigo: "CHECKIN",nome: "Check-in / Presença",       tipo: "extra", valorPadrao: 80 },
  { codigo: "CATRAC", nome: "Catraca / Biometria",       tipo: "extra", valorPadrao: 150 },
  { codigo: "GRAD",   nome: "Graduação",                 tipo: "extra", valorPadrao: 90 },
  { codigo: "REL",    nome: "Relatórios Avançados",      tipo: "extra", valorPadrao: 100 },
  { codigo: "WHATS",  nome: "WhatsApp / Comunicação",    tipo: "extra", valorPadrao: 110 },
  { codigo: "COMP",   nome: "Competições / Eventos",     tipo: "extra", valorPadrao: 130 },
  { codigo: "MULTI",  nome: "Multiunidades",             tipo: "extra", valorPadrao: 200 },
  { codigo: "API",    nome: "API / Integrações",         tipo: "extra", valorPadrao: 250 },
];

const STEPS = [
  { id: 1, label: "Identificação", icon: Building2 },
  { id: 2, label: "Contato",       icon: User },
  { id: 3, label: "Comercial",     icon: DollarSign },
  { id: 4, label: "Módulos",       icon: Package },
  { id: 5, label: "Implantação",   icon: Wrench },
];

// ── Field helpers ─────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-white";
const selectCls = inputCls + " appearance-none cursor-pointer";

// ── Main page ─────────────────────────────────────────────────
export default function FranqueadosContratosPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [franqueadoBusca, setFranqueadoBusca] = useState("");
  const [franqueadoSelecionado, setFranqueadoSelecionado] = useState<{ id: string; nome: string } | null>(null);
  const [showFranqueadoDropdown, setShowFranqueadoDropdown] = useState(false);

  // ── Form state ───────────────────────────────────────────────
  const [form, setForm] = useState({
    // 6.1
    codigo: "", nome: "", nomeFantasia: "", cnpjCpf: "", razaoSocial: "",
    segmento: "", statusComercial: "CONTRATO_FECHADO",
    // 6.2
    contatoNome: "", contatoCargo: "", contatoEmail: "", contatoTelefone: "",
    financeiroNome: "", financeiroEmail: "", financeiroWhatsapp: "",
    // 6.3
    dataImplantacao: "", dataGoLive: "", responsavelComercial: "", responsavelImplantacao: "",
    mensalidadeBase: "", setupValor: "", setupParcelas: "1",
    setupDuranteCarencia: "nao", possuiDesconto: "nao", descontoValor: "", descontoMotivo: "",
    tipoCobranca: "PIX", diaVencimento: "10", carenciaMeses: "3", formaReajuste: "",
    // 6.4
    moduloBase: "CORE", modulosExtras: [] as string[],
    // 6.5
    usuariosEsperados: "", unidadesEsperadas: "1", familiaridade: "media",
    statusImplantacao: "NAO_INICIADA", integracaoExterna: "nao",
    integracoesPrevistas: "", observacoes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));
  const toggleModulo = (cod: string) =>
    setForm((prev) => ({
      ...prev,
      modulosExtras: prev.modulosExtras.includes(cod)
        ? prev.modulosExtras.filter((m) => m !== cod)
        : [...prev.modulosExtras, cod],
    }));

  // ── Franqueado search ────────────────────────────────────────
  const { data: franqueadosResp } = useQuery({
    queryKey: ["contratos-franqueados", franqueadoBusca],
    queryFn: () => listFranqueados({ busca: franqueadoBusca || undefined, limit: 10 }),
    enabled: showFranqueadoDropdown,
  });
  const franqueados = (franqueadosResp?.items ?? []) as { id: string; nome?: string }[];
  // ── Mutation ──────────────────────────────────────────────────
  const salvarMutation = useMutation({
    mutationFn: createFranqueadoContrato,
    onSuccess: () => {
      toast.success("Contrato salvo com sucesso!");
      router.push("/admin/franqueados");
    },
    onError: () => {
      toast.error("Erro ao salvar contrato. Tente novamente.");
    },
  });
  // ── Calculated values ────────────────────────────────────────
  const dataInicioCobranca = useMemo(() => {
    if (!form.dataImplantacao) return "";
    const d = new Date(form.dataImplantacao);
    d.setMonth(d.getMonth() + parseInt(form.carenciaMeses || "0", 10));
    return d.toISOString().slice(0, 10);
  }, [form.dataImplantacao, form.carenciaMeses]);

  const valorModulosExtras = useMemo(
    () => MODULOS_CATALOGO.filter((m) => form.modulosExtras.includes(m.codigo))
             .reduce((s, m) => s + m.valorPadrao, 0),
    [form.modulosExtras]
  );

  const valorMensalTotal = useMemo(() => {
    const base = parseFloat(form.mensalidadeBase || "0");
    const desconto = form.possuiDesconto === "sim" ? parseFloat(form.descontoValor || "0") : 0;
    return Math.max(0, base + valorModulosExtras - desconto);
  }, [form.mensalidadeBase, form.possuiDesconto, form.descontoValor, valorModulosExtras]);

  const handleSalvar = () => {
    if (!franqueadoSelecionado) {
      toast.error("Selecione um franqueado antes de salvar.");
      return;
    }
    const modulosSelecionados = MODULOS_CATALOGO.filter(
      (m) => m.codigo === form.moduloBase || form.modulosExtras.includes(m.codigo),
    ).map((m) => ({
      codigo: m.codigo,
      nome_comercial: m.nome,
      tipo: m.tipo,
      valor_mensal_contratado: m.valorPadrao,
      data_inicio: form.dataImplantacao || undefined,
    }));

    salvarMutation.mutate({
      franqueado_id: franqueadoSelecionado.id,
      // 6.1
      codigo: form.codigo || undefined,
      nome_fantasia: form.nomeFantasia || undefined,
      cnpj_cpf: form.cnpjCpf || undefined,
      razao_social: form.razaoSocial || undefined,
      segmento: form.segmento || undefined,
      status_comercial: form.statusComercial || undefined,
      // 6.2
      contato_nome: form.contatoNome || undefined,
      contato_cargo: form.contatoCargo || undefined,
      contato_email: form.contatoEmail || undefined,
      contato_telefone: form.contatoTelefone || undefined,
      financeiro_nome: form.financeiroNome || undefined,
      financeiro_email: form.financeiroEmail || undefined,
      financeiro_whatsapp: form.financeiroWhatsapp || undefined,
      // 6.3
      data_implantacao: form.dataImplantacao || undefined,
      data_go_live: form.dataGoLive || undefined,
      data_inicio_cobranca: dataInicioCobranca || undefined,
      carencia_meses: parseInt(form.carenciaMeses || "3", 10),
      responsavel_comercial: form.responsavelComercial || undefined,
      responsavel_implantacao: form.responsavelImplantacao || undefined,
      mensalidade_base: parseFloat(form.mensalidadeBase || "0"),
      desconto_mensal: form.possuiDesconto === "sim" ? parseFloat(form.descontoValor || "0") : 0,
      desconto_motivo: form.possuiDesconto === "sim" ? form.descontoMotivo || undefined : undefined,
      setup_valor_total: parseFloat(form.setupValor || "0"),
      setup_parcelas: parseInt(form.setupParcelas || "1", 10),
      setup_cobrar_durante_carencia: form.setupDuranteCarencia === "sim",
      tipo_cobranca: form.tipoCobranca || undefined,
      dia_vencimento: parseInt(form.diaVencimento || "10", 10),
      forma_reajuste: form.formaReajuste || undefined,
      // 6.5
      usuarios_ativos_esperados: form.usuariosEsperados ? parseInt(form.usuariosEsperados, 10) : undefined,
      unidades_esperadas: parseInt(form.unidadesEsperadas || "1", 10),
      familiaridade_tecnologia: form.familiaridade || undefined,
      status_implantacao: form.statusImplantacao || undefined,
      integracao_externa: form.integracaoExterna === "sim",
      integracoes_previstas: form.integracoesPrevistas || undefined,
      observacoes: form.observacoes || undefined,
      // módulos
      modulos: modulosSelecionados,
    });
  };

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #f5f3ff 0%, #ede9fe 30%, #f3f4f6 100%)" }}>

        {/* ── Header ── */}
        <div className="bg-linear-to-r from-[#1e1b4b] via-[#312e81] to-[#4c1d95] shadow-xl">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/admin/franqueados")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white rounded-lg text-sm transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Novo Contrato</h1>
                  <p className="text-violet-200 text-sm mt-0.5">Cadastro comercial, carência, módulos e implantação</p>
                </div>
              </div>
              <button
                onClick={handleSalvar}
                disabled={salvarMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-violet-800 rounded-xl font-semibold text-sm hover:bg-violet-50 transition-all shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {salvarMutation.isPending ? "Salvando…" : "Salvar contrato"}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

          {/* ── Franqueado selector ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Franqueado</p>
            {franqueadoSelecionado ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-violet-600">{franqueadoSelecionado.nome[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{franqueadoSelecionado.nome}</p>
                    <p className="text-xs text-gray-400">ID: {franqueadoSelecionado.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setFranqueadoSelecionado(null); setFranqueadoBusca(""); }}
                  className="text-xs text-violet-500 hover:text-violet-700 font-medium transition-colors"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={franqueadoBusca}
                  onFocus={() => setShowFranqueadoDropdown(true)}
                  onChange={(e) => { setFranqueadoBusca(e.target.value); setShowFranqueadoDropdown(true); }}
                  placeholder="Buscar franqueado pelo nome…"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                {showFranqueadoDropdown && franqueados.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {franqueados.map((f) => (
                      <button
                        key={f.id}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-violet-50 transition-colors flex items-center gap-2"
                        onClick={() => { setFranqueadoSelecionado({ id: f.id, nome: f.nome ?? f.id }); setShowFranqueadoDropdown(false); setFranqueadoBusca(""); }}
                      >
                        <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {(f.nome || "?")[0].toUpperCase()}
                        </span>
                        {f.nome || f.id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Stepper ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Step tabs */}
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {STEPS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all shrink-0",
                    step === s.id
                      ? "border-violet-600 text-violet-700 bg-violet-50/60"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <s.icon className="w-4 h-4" />
                  {s.label}
                  {s.id < step && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-1" />}
                </button>
              ))}
            </div>

            {/* ── Step content ── */}
            <div className="p-6 space-y-6">

              {/* STEP 1 — Identificação */}
              {step === 1 && (
                <>
                  <p className="text-sm font-semibold text-violet-700 border-b border-violet-100 pb-2">6.1 Identificação do cliente</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Código interno" required>
                      <input value={form.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="ex: FRQ-0001" className={inputCls} />
                    </Field>
                    <Field label="Nome / Empresa" required>
                      <input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome principal da operação" className={inputCls} />
                    </Field>
                    <Field label="Nome fantasia">
                      <input value={form.nomeFantasia} onChange={(e) => set("nomeFantasia", e.target.value)} placeholder="Se diferente da razão social" className={inputCls} />
                    </Field>
                    <Field label="CNPJ / CPF" required>
                      <input value={form.cnpjCpf} onChange={(e) => set("cnpjCpf", e.target.value)} placeholder="00.000.000/0001-00" className={inputCls} />
                    </Field>
                    <Field label="Razão social">
                      <input value={form.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Segmento">
                      <select value={form.segmento} onChange={(e) => set("segmento", e.target.value)} className={selectCls}>
                        <option value="">Selecione…</option>
                        <option>Academia</option>
                        <option>Studio</option>
                        <option>Franquia</option>
                        <option>Matriz</option>
                        <option>Outros</option>
                      </select>
                    </Field>
                    <Field label="Status comercial" required>
                      <select value={form.statusComercial} onChange={(e) => set("statusComercial", e.target.value)} className={selectCls}>
                        <option value="LEAD">Lead</option>
                        <option value="PROPOSTA_ENVIADA">Proposta enviada</option>
                        <option value="CONTRATO_FECHADO">Contrato fechado</option>
                        <option value="EM_IMPLANTACAO">Em implantação</option>
                        <option value="EM_CARENCIA">Em carência</option>
                        <option value="ATIVO_COBRANCA">Ativo — cobrança</option>
                        <option value="INADIMPLENTE">Inadimplente</option>
                        <option value="SUSPENSO">Suspenso</option>
                        <option value="CANCELADO">Cancelado</option>
                      </select>
                    </Field>
                  </div>
                </>
              )}

              {/* STEP 2 — Contato */}
              {step === 2 && (
                <>
                  <p className="text-sm font-semibold text-violet-700 border-b border-violet-100 pb-2">6.2 Contato principal</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nome do contato" required>
                      <input value={form.contatoNome} onChange={(e) => set("contatoNome", e.target.value)} placeholder="Responsável pela operação" className={inputCls} />
                    </Field>
                    <Field label="Cargo">
                      <input value={form.contatoCargo} onChange={(e) => set("contatoCargo", e.target.value)} placeholder="Diretor, gestor, franqueado…" className={inputCls} />
                    </Field>
                    <Field label="E-mail" required>
                      <input type="email" value={form.contatoEmail} onChange={(e) => set("contatoEmail", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Telefone / WhatsApp" required>
                      <input value={form.contatoTelefone} onChange={(e) => set("contatoTelefone", e.target.value)} placeholder="(00) 00000-0000" className={inputCls} />
                    </Field>
                  </div>
                  <p className="text-sm font-semibold text-violet-700 border-b border-violet-100 pb-2 pt-2">Contato financeiro (se diferente)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nome financeiro">
                      <input value={form.financeiroNome} onChange={(e) => set("financeiroNome", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="E-mail financeiro">
                      <input type="email" value={form.financeiroEmail} onChange={(e) => set("financeiroEmail", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="WhatsApp financeiro">
                      <input value={form.financeiroWhatsapp} onChange={(e) => set("financeiroWhatsapp", e.target.value)} placeholder="(00) 00000-0000" className={inputCls} />
                    </Field>
                  </div>
                </>
              )}

              {/* STEP 3 — Comercial */}
              {step === 3 && (
                <>
                  <p className="text-sm font-semibold text-violet-700 border-b border-violet-100 pb-2">6.3 Comercial e contrato</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Data da implantação" required>
                      <input type="date" value={form.dataImplantacao} onChange={(e) => set("dataImplantacao", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Data prevista de go-live">
                      <input type="date" value={form.dataGoLive} onChange={(e) => set("dataGoLive", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Responsável comercial (Rykon)" required>
                      <input value={form.responsavelComercial} onChange={(e) => set("responsavelComercial", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Responsável implantação (Rykon)">
                      <input value={form.responsavelImplantacao} onChange={(e) => set("responsavelImplantacao", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Mensalidade base (R$)" required>
                      <input type="number" min="0" step="0.01" value={form.mensalidadeBase} onChange={(e) => set("mensalidadeBase", e.target.value)} placeholder="0,00" className={inputCls} />
                    </Field>
                    <Field label="Valor do setup (R$)" required>
                      <input type="number" min="0" step="0.01" value={form.setupValor} onChange={(e) => set("setupValor", e.target.value)} placeholder="0,00" className={inputCls} />
                    </Field>
                    <Field label="Parcelas do setup" required>
                      <select value={form.setupParcelas} onChange={(e) => set("setupParcelas", e.target.value)} className={selectCls}>
                        {[1,2,3,4,5,6,8,10,12].map((n) => <option key={n} value={n}>{n}x</option>)}
                      </select>
                    </Field>
                    <Field label="Setup cobre carência?" required>
                      <select value={form.setupDuranteCarencia} onChange={(e) => set("setupDuranteCarencia", e.target.value)} className={selectCls}>
                        <option value="sim">Sim — cobrado mesmo na carência</option>
                        <option value="nao">Não — começa após carência</option>
                      </select>
                    </Field>
                    <Field label="Meses de carência" required>
                      <input type="number" min="0" max="36" value={form.carenciaMeses} onChange={(e) => set("carenciaMeses", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Data início de cobrança">
                      <div className={cn(inputCls, "flex items-center gap-2 text-gray-500 bg-gray-50")}>
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{dataInicioCobranca || "preencha implantação + carência"}</span>
                      </div>
                    </Field>
                    <Field label="Tipo de cobrança" required>
                      <select value={form.tipoCobranca} onChange={(e) => set("tipoCobranca", e.target.value)} className={selectCls}>
                        <option>PIX</option>
                        <option>Boleto</option>
                        <option>Cartão</option>
                        <option>Transferência</option>
                        <option>Manual</option>
                      </select>
                    </Field>
                    <Field label="Dia de vencimento" required>
                      <input type="number" min="1" max="28" value={form.diaVencimento} onChange={(e) => set("diaVencimento", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Possui desconto comercial?" required>
                      <select value={form.possuiDesconto} onChange={(e) => set("possuiDesconto", e.target.value)} className={selectCls}>
                        <option value="nao">Não</option>
                        <option value="sim">Sim</option>
                      </select>
                    </Field>
                    {form.possuiDesconto === "sim" && (
                      <>
                        <Field label="Valor do desconto (R$)">
                          <input type="number" min="0" step="0.01" value={form.descontoValor} onChange={(e) => set("descontoValor", e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Motivo do desconto">
                          <input value={form.descontoMotivo} onChange={(e) => set("descontoMotivo", e.target.value)} className={inputCls} />
                        </Field>
                      </>
                    )}
                    <Field label="Forma de reajuste">
                      <select value={form.formaReajuste} onChange={(e) => set("formaReajuste", e.target.value)} className={selectCls}>
                        <option value="">Não definido</option>
                        <option>Manual</option>
                        <option>Anual</option>
                        <option>Indexado (IGPM/IPCA)</option>
                      </select>
                    </Field>
                  </div>

                  {/* Summary card */}
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 mt-2">
                    <p className="text-xs font-semibold text-violet-700 mb-3">Resumo financeiro</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Mensalidade base</span><span className="font-medium">R$ {parseFloat(form.mensalidadeBase || "0").toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Módulos extras</span><span className="font-medium">R$ {valorModulosExtras.toFixed(2)}</span></div>
                      {form.possuiDesconto === "sim" && <div className="flex justify-between text-red-600"><span>Desconto</span><span>− R$ {parseFloat(form.descontoValor || "0").toFixed(2)}</span></div>}
                      <div className="flex justify-between border-t border-violet-200 pt-1.5 font-bold text-violet-800"><span>Total mensal</span><span>R$ {valorMensalTotal.toFixed(2)}</span></div>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 4 — Módulos */}
              {step === 4 && (
                <>
                  <p className="text-sm font-semibold text-violet-700 border-b border-violet-100 pb-2">6.4 Módulos contratados</p>

                  {/* Base module */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3">Módulo base (obrigatório)</p>
                    <div className="p-4 border-2 border-violet-400 rounded-xl bg-violet-50 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-violet-800">Rykon FIT Core</p>
                        <p className="text-xs text-violet-600">Módulo principal — obrigatório em todos os contratos</p>
                      </div>
                    </div>
                  </div>

                  {/* Extra modules */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3">Módulos extras</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {MODULOS_CATALOGO.filter((m) => m.tipo === "extra").map((m) => {
                        const active = form.modulosExtras.includes(m.codigo);
                        return (
                          <button
                            key={m.codigo}
                            type="button"
                            onClick={() => toggleModulo(m.codigo)}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all",
                              active
                                ? "border-violet-400 bg-violet-50"
                                : "border-gray-100 bg-white hover:border-violet-200"
                            )}
                          >
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", active ? "bg-violet-200" : "bg-gray-100")}>
                              <Package className={cn("w-4 h-4", active ? "text-violet-600" : "text-gray-400")} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-semibold truncate", active ? "text-violet-800" : "text-gray-700")}>{m.nome}</p>
                              <p className="text-xs text-gray-400">R$ {m.valorPadrao}/mês</p>
                            </div>
                            {active && <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-violet-700 mb-1">Módulos selecionados: {form.modulosExtras.length}</p>
                    <p className="text-sm font-bold text-violet-800">Valor extras: R$ {valorModulosExtras.toFixed(2)}/mês · Total mensal: R$ {valorMensalTotal.toFixed(2)}/mês</p>
                    <p className="text-xs text-violet-500 mt-1">Os valores padrão podem ser ajustados no contrato final.</p>
                  </div>
                </>
              )}

              {/* STEP 5 — Implantação */}
              {step === 5 && (
                <>
                  <p className="text-sm font-semibold text-violet-700 border-b border-violet-100 pb-2">6.5 Implantação e maturidade</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Usuários ativos esperados" required>
                      <input type="number" min="1" value={form.usuariosEsperados} onChange={(e) => set("usuariosEsperados", e.target.value)} placeholder="ex: 200" className={inputCls} />
                    </Field>
                    <Field label="Unidades iniciais" required>
                      <input type="number" min="1" value={form.unidadesEsperadas} onChange={(e) => set("unidadesEsperadas", e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Familiaridade com software" required>
                      <select value={form.familiaridade} onChange={(e) => set("familiaridade", e.target.value)} className={selectCls}>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </Field>
                    <Field label="Status da implantação" required>
                      <select value={form.statusImplantacao} onChange={(e) => set("statusImplantacao", e.target.value)} className={selectCls}>
                        <option value="NAO_INICIADA">Não iniciada</option>
                        <option value="EM_ANDAMENTO">Em andamento</option>
                        <option value="HOMOLOGACAO">Homologação</option>
                        <option value="CONCLUIDA">Concluída</option>
                      </select>
                    </Field>
                    <Field label="Necessita integração externa?">
                      <select value={form.integracaoExterna} onChange={(e) => set("integracaoExterna", e.target.value)} className={selectCls}>
                        <option value="nao">Não</option>
                        <option value="sim">Sim</option>
                      </select>
                    </Field>
                    {form.integracaoExterna === "sim" && (
                      <Field label="Integrações previstas">
                        <input value={form.integracoesPrevistas} onChange={(e) => set("integracoesPrevistas", e.target.value)} placeholder="Catraca, pagamento, WhatsApp…" className={inputCls} />
                      </Field>
                    )}
                    <div className="sm:col-span-2">
                      <Field label="Observações adicionais">
                        <textarea rows={4} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} className={cn(inputCls, "resize-none")} placeholder="Livre…" />
                      </Field>
                    </div>
                  </div>

                  {/* Final summary */}
                  <div className="bg-linear-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5 space-y-3">
                    <p className="text-sm font-bold text-violet-800">Resumo do contrato</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Franqueado</span><span className="font-medium">{franqueadoSelecionado?.nome ?? "—"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Status comercial</span><span className="font-medium">{form.statusComercial}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Implantação</span><span className="font-medium">{form.dataImplantacao || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Carência</span><span className="font-medium">{form.carenciaMeses} mes{parseInt(form.carenciaMeses) !== 1 ? "es" : ""}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Início cobrança</span><span className="font-medium">{dataInicioCobranca || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Módulos extras</span><span className="font-medium">{form.modulosExtras.length}</span></div>
                      <div className="flex justify-between col-span-2 border-t border-violet-200 pt-2 font-bold text-violet-800"><span>Total mensal</span><span>R$ {valorMensalTotal.toFixed(2)}</span></div>
                    </div>
                    <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-yellow-700">O backend para persistir contratos ainda não está implementado. Os dados ficarão registrados no console até a integração com a API.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Step navigation ── */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <div className="flex items-center gap-1.5">
                {STEPS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStep(s.id)}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all",
                      s.id === step ? "bg-violet-600 scale-125" : s.id < step ? "bg-violet-300" : "bg-gray-200"
                    )}
                  />
                ))}
              </div>
              {step < 5 ? (
                <button
                  onClick={() => setStep((s) => Math.min(5, s + 1))}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSalvar}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
