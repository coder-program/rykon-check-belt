"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  Hash,
  Home,
  Search,
  Sparkles,
  Globe,
  Instagram,
  Navigation,
  Crosshair,
  Settings2,
  FileText,
} from "lucide-react";
import { createUnidade, buscarViaCep, createEndereco } from "@/lib/peopleApi";
import toast from "react-hot-toast";

interface UnidadeOnboardingProps {
  franqueadoId: string;
  franqueadoNome: string;
}

// ── Step configs ─────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Identificação",  icon: Building2  },
  { id: 2, label: "Contato",        icon: Phone      },
  { id: 3, label: "Endereço",       icon: MapPin     },
  { id: 4, label: "GPS & Config.",  icon: Settings2  },
  { id: 5, label: "Confirmação",    icon: CheckCircle },
];

// ── Reusable input ────────────────────────────────────────────
const Input = ({
  icon: Icon,
  label,
  required,
  optional,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ElementType;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
      {optional && <span className="text-gray-500 text-xs ml-1">(opcional)</span>}
    </label>
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      )}
      <input
        {...props}
        className={`w-full ${Icon ? "pl-11" : "pl-4"} pr-4 py-3 bg-gray-700/50 border rounded-xl text-white placeholder-gray-500
          focus:outline-none focus:ring-2 transition-colors
          ${error ? "border-red-500 focus:ring-red-500/30" : "border-gray-600 focus:border-yellow-500 focus:ring-yellow-500/20"}`}
      />
    </div>
    {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
  </div>
);

function SummaryCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    yellow: "text-yellow-400", blue: "text-blue-400", green: "text-green-400", purple: "text-purple-400",
  };
  return (
    <div className="bg-gray-700/40 rounded-xl p-5 border border-gray-600/50">
      <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${colors[color] ?? "text-gray-400"}`}>{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-gray-400">{label}:</span>{" "}
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}
function formatCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

export default function UnidadeOnboarding({ franqueadoId, franqueadoNome }: UnidadeOnboardingProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [createdNome, setCreatedNome] = useState("");

  // ── Step 1: Identificação ─────────────────────────────────
  const [step1, setStep1] = useState({
    nome: "", razao_social: "", nome_fantasia: "",
    cnpj: "", inscricao_estadual: "", inscricao_municipal: "",
  });

  // ── Step 2: Contato ───────────────────────────────────────
  const [step2, setStep2] = useState({
    email: "", telefone_celular: "", telefone_fixo: "",
    website: "", instagram: "", facebook: "",
  });

  // ── Step 3: Endereço ──────────────────────────────────────
  const [step3, setStep3] = useState({
    cep: "", logradouro: "", numero: "", complemento: "",
    bairro: "", cidade: "", estado: "", pais: "Brasil",
  });

  // ── Step 4: GPS & Config ──────────────────────────────────
  const [step4, setStep4] = useState({
    latitude: "", longitude: "", requer_aprovacao_checkin: false,
  });

  // ── Handlers ─────────────────────────────────────────────
  const handleS1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let v = value;
    if (name === "cnpj") v = formatCNPJ(value);
    setStep1((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!step1.nome.trim() || step1.nome.trim().length < 3) e.nome = "Nome é obrigatório (mín. 3 caracteres)";
    if (!step1.razao_social.trim()) e.razao_social = "Razão Social é obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleS2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let v = value;
    if (name === "telefone_celular" || name === "telefone_fixo") v = formatPhone(value);
    setStep2((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };
  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!step2.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step2.email)) e.email = "E-mail inválido";
    if (!step2.telefone_celular.trim()) e.telefone_celular = "Telefone celular é obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleS3 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let v = value;
    if (name === "cep") v = formatCEP(value);
    setStep3((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };
  const handleBuscarCEP = async () => {
    const cepNum = step3.cep.replace(/\D/g, "");
    if (cepNum.length !== 8) { setErrors((p) => ({ ...p, cep: "CEP deve ter 8 dígitos" })); return; }
    setCepLoading(true);
    try {
      const data = await buscarViaCep(cepNum);
      if (data && (data.logradouro !== undefined || data.cidade_nome !== undefined)) {
        setStep3((p) => ({
          ...p,
          logradouro: data.logradouro || p.logradouro,
          bairro: data.bairro || p.bairro,
          cidade: data.cidade_nome || data.localidade || p.cidade,
          estado: data.estado || data.uf || p.estado,
        }));
        setErrors((p) => ({ ...p, cep: "" }));
        toast.success("Endereço encontrado!");
      } else {
        setErrors((p) => ({ ...p, cep: "CEP não encontrado" }));
      }
    } catch { setErrors((p) => ({ ...p, cep: "Erro ao buscar CEP" })); }
    finally { setCepLoading(false); }
  };
  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!step3.cep.trim()) e.cep = "CEP é obrigatório";
    if (!step3.logradouro.trim()) e.logradouro = "Logradouro é obrigatório";
    if (!step3.numero.trim()) e.numero = "Número é obrigatório";
    if (!step3.bairro.trim()) e.bairro = "Bairro é obrigatório";
    if (!step3.cidade.trim()) e.cidade = "Cidade é obrigatória";
    if (!step3.estado.trim()) e.estado = "Estado é obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleUsarLocalizacaoAtual = () => {
    if (!navigator.geolocation) { toast.error("Geolocalização não suportada neste navegador"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStep4((p) => ({ ...p, latitude: pos.coords.latitude.toFixed(8), longitude: pos.coords.longitude.toFixed(8) }));
        toast.success("Localização obtida!");
        setGpsLoading(false);
      },
      () => { toast.error("Não foi possível obter a localização"); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const handleBuscarGPS = async (autoFirst = false) => {
    const query = [step3.logradouro, step3.numero, step3.bairro, step3.cidade, step3.estado, "Brasil"].filter(Boolean).join(", ");
    if (!query.trim()) { toast.error("Preencha pelo menos Cidade e Estado primeiro"); return; }
    setGeocodeLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=br`;
      const resp = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
      const results = await resp.json();
      if (!results || results.length === 0) { toast.error("Endereço não encontrado. Tente preencher mais campos."); return; }
      const r = results[0];
      setStep4((p) => ({ ...p, latitude: parseFloat(r.lat).toFixed(8), longitude: parseFloat(r.lon).toFixed(8) }));
      if (!autoFirst) toast.success(`Localização: ${(r.display_name as string).slice(0, 60)}...`, { duration: 5000 });
      else toast.success("Coordenadas preenchidas (1º resultado)");
    } catch { toast.error("Erro ao buscar coordenadas"); }
    finally { setGeocodeLoading(false); }
  };
  const handleS4 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") setStep4((p) => ({ ...p, [name]: checked }));
    else setStep4((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };
  const validateStep4 = () => {
    const e: Record<string, string> = {};
    if (step4.latitude && (isNaN(+step4.latitude) || +step4.latitude < -90 || +step4.latitude > 90)) e.latitude = "Latitude deve estar entre -90 e 90";
    if (step4.longitude && (isNaN(+step4.longitude) || +step4.longitude < -180 || +step4.longitude > 180)) e.longitude = "Longitude deve estar entre -180 e 180";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    const validators: Record<number, () => boolean> = { 1: validateStep1, 2: validateStep2, 3: validateStep3, 4: validateStep4 };
    if (validators[currentStep]?.()) setCurrentStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let endereco_id: string | undefined;
      const cepNum = step3.cep.replace(/\D/g, "");
      if (cepNum.length === 8 && step3.logradouro) {
        const endereco = await createEndereco({
          cep: cepNum, logradouro: step3.logradouro,
          numero: step3.numero || "S/N", complemento: step3.complemento || undefined,
          bairro: step3.bairro, cidade: step3.cidade, estado: step3.estado, pais: step3.pais || "Brasil",
        });
        if (endereco?.id) endereco_id = endereco.id;
      }

      const redes: Record<string, string> = {};
      if (step2.instagram.trim()) redes.instagram = step2.instagram.trim();
      if (step2.facebook.trim()) redes.facebook = step2.facebook.trim();

      const payload: Record<string, unknown> = {
        franqueado_id: franqueadoId, nome: step1.nome.trim(),
        razao_social: step1.razao_social.trim(), status: "HOMOLOGACAO", ativo: true,
      };
      if (step1.nome_fantasia.trim()) payload.nome_fantasia = step1.nome_fantasia.trim();
      if (step1.cnpj) payload.cnpj = step1.cnpj.replace(/\D/g, "");
      if (step1.inscricao_estadual.trim()) payload.inscricao_estadual = step1.inscricao_estadual.trim();
      if (step1.inscricao_municipal.trim()) payload.inscricao_municipal = step1.inscricao_municipal.trim();
      if (step2.email.trim()) payload.email = step2.email.trim();
      if (step2.telefone_celular) payload.telefone_celular = step2.telefone_celular.replace(/\D/g, "");
      if (step2.telefone_fixo) payload.telefone_fixo = step2.telefone_fixo.replace(/\D/g, "");
      if (step2.website.trim()) payload.website = step2.website.trim();
      if (Object.keys(redes).length > 0) payload.redes_sociais = redes;
      if (endereco_id) payload.endereco_id = endereco_id;
      if (step4.latitude) payload.latitude = parseFloat(step4.latitude);
      if (step4.longitude) payload.longitude = parseFloat(step4.longitude);
      payload.requer_aprovacao_checkin = step4.requer_aprovacao_checkin;

      await createUnidade(payload);
      setCreatedNome(step1.nome.trim());
      setDone(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar unidade");
    } finally { setLoading(false); }
  };

  // ── Success ───────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/40">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Unidade cadastrada! 🎉</h1>
          <p className="text-gray-400 mb-2">
            <span className="text-yellow-400 font-semibold">{createdNome}</span> foi cadastrada com sucesso.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Status: <span className="text-yellow-500 font-medium">Em Homologação</span>. Nossa equipe ativará a unidade em breve.
          </p>
          <button onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 px-8 py-4 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-yellow-500/25">
            Ir para o Dashboard <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ── Nav buttons ───────────────────────────────────────────
  const NavButtons = ({ onNext, nextLabel = "Próximo", isSubmit = false }: { onNext?: () => void; nextLabel?: string; isSubmit?: boolean }) => (
    <div className="flex justify-between mt-8 pt-6 border-t border-gray-700/50">
      {currentStep > 1 ? (
        <button type="button" onClick={() => setCurrentStep((s) => s - 1)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      ) : <div />}
      <button type="button" onClick={onNext ?? handleNext} disabled={loading}
        className="inline-flex items-center gap-2 px-7 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-all shadow-lg hover:shadow-yellow-500/25">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Cadastrando...</>
          : <>{nextLabel} {isSubmit ? <CheckCircle className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}</>}
      </button>
    </div>
  );

  const baseInput = "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-colors";

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-2xl mb-4 border border-yellow-500/30">
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Bem-vindo, {franqueadoNome.split(" ")[0]}!</h1>
          <p className="text-gray-400 text-lg">Cadastre sua primeira unidade</p>
        </div>

        {/* Steps */}
        <div className="flex items-start justify-center mb-8 px-2 gap-0">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center min-w-13">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${isDone ? "bg-green-500/20 border-green-500 text-green-400" : isActive ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-lg shadow-yellow-500/20" : "bg-gray-800 border-gray-600 text-gray-500"}`}>
                    {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`mt-1.5 text-[10px] font-medium text-center leading-tight ${isActive ? "text-yellow-400" : isDone ? "text-green-400" : "text-gray-500"}`}>{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 mt-5 transition-colors duration-300 ${currentStep > step.id ? "bg-green-500/50" : "bg-gray-700"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/80 shadow-2xl overflow-hidden">

          {/* ══ STEP 1: Identificação ══ */}
          {currentStep === 1 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center border border-yellow-500/30">
                  <Building2 className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Identificação</h2>
                  <p className="text-gray-400 text-sm">Dados de registro da unidade</p>
                </div>
              </div>
              <div className="space-y-5">
                <Input icon={Building2} label="Nome da Unidade" name="nome" value={step1.nome} onChange={handleS1} maxLength={150} required placeholder="Ex: TeamCruz Unidade Centro" error={errors.nome} />
                <Input icon={FileText} label="Razão Social" name="razao_social" value={step1.razao_social} onChange={handleS1} maxLength={200} required placeholder="Razão Social Ltda." error={errors.razao_social} />
                <Input icon={Building2} label="Nome Fantasia" name="nome_fantasia" value={step1.nome_fantasia} onChange={handleS1} maxLength={150} optional placeholder="Nome comercial (se diferente)" error={errors.nome_fantasia} />
                <Input icon={Hash} label="CNPJ" name="cnpj" value={step1.cnpj} onChange={handleS1} maxLength={18} optional placeholder="00.000.000/0000-00" error={errors.cnpj} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Inscrição Estadual" name="inscricao_estadual" value={step1.inscricao_estadual} onChange={handleS1} maxLength={20} optional placeholder="IE" error={errors.inscricao_estadual} />
                  <Input label="Inscrição Municipal" name="inscricao_municipal" value={step1.inscricao_municipal} onChange={handleS1} maxLength={20} optional placeholder="IM" error={errors.inscricao_municipal} />
                </div>
              </div>
              <NavButtons />
            </div>
          )}

          {/* ══ STEP 2: Contato ══ */}
          {currentStep === 2 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                  <Phone className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Contato</h2>
                  <p className="text-gray-400 text-sm">Como os alunos entrarão em contato</p>
                </div>
              </div>
              <div className="space-y-5">
                <Input icon={Mail} label="E-mail da Unidade" name="email" type="email" value={step2.email} onChange={handleS2} required placeholder="contato@academia.com.br" error={errors.email} />
                <Input icon={Phone} label="Telefone Celular / WhatsApp" name="telefone_celular" type="tel" value={step2.telefone_celular} onChange={handleS2} maxLength={15} required placeholder="(11) 99999-9999" error={errors.telefone_celular} />
                <Input icon={Phone} label="Telefone Fixo" name="telefone_fixo" type="tel" value={step2.telefone_fixo} onChange={handleS2} maxLength={14} optional placeholder="(11) 3333-3333" error={errors.telefone_fixo} />
                <Input icon={Globe} label="Website" name="website" type="url" value={step2.website} onChange={handleS2} optional placeholder="https://www.academia.com.br" error={errors.website} />
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-3">Redes Sociais <span className="text-gray-500 text-xs">(opcional)</span></p>
                  <div className="space-y-3">
                    <div className="relative">
                      <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400 pointer-events-none" />
                      <input name="instagram" value={step2.instagram} onChange={handleS2} placeholder="https://instagram.com/sua_academia" className={`${baseInput} pl-11`} />
                    </div>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
                      <input name="facebook" value={step2.facebook} onChange={handleS2} placeholder="https://facebook.com/sua_academia" className={`${baseInput} pl-11`} />
                    </div>
                  </div>
                </div>
              </div>
              <NavButtons />
            </div>
          )}

          {/* ══ STEP 3: Endereço ══ */}
          {currentStep === 3 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center border border-green-500/30">
                  <MapPin className="w-5 h-5 text-green-400" />
                </div>
                <div><h2 className="text-xl font-semibold text-white">Endereço</h2><p className="text-gray-400 text-sm">Localização física da unidade</p></div>
              </div>
              <div className="space-y-5">
                {/* CEP */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">CEP <span className="text-red-400">*</span></label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input name="cep" value={step3.cep} onChange={handleS3} maxLength={9} placeholder="00000-000"
                        className={`w-full pl-11 pr-4 py-3 bg-gray-700/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${errors.cep ? "border-red-500 focus:ring-red-500/30" : "border-gray-600 focus:border-yellow-500 focus:ring-yellow-500/20"}`} />
                    </div>
                    <button type="button" onClick={handleBuscarCEP} disabled={cepLoading}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl flex items-center gap-2 font-medium whitespace-nowrap transition-colors">
                      {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar
                    </button>
                  </div>
                  {errors.cep && <p className="mt-1.5 text-sm text-red-400">{errors.cep}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2"><Input label="Logradouro" name="logradouro" value={step3.logradouro} onChange={handleS3} required placeholder="Rua, Avenida..." error={errors.logradouro} /></div>
                  <Input label="Número" name="numero" value={step3.numero} onChange={handleS3} required placeholder="123" error={errors.numero} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Complemento" name="complemento" value={step3.complemento} onChange={handleS3} optional placeholder="Sala, Andar..." />
                  <Input label="Bairro" name="bairro" value={step3.bairro} onChange={handleS3} required placeholder="Bairro" error={errors.bairro} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2"><Input label="Cidade" name="cidade" value={step3.cidade} onChange={handleS3} required placeholder="São Paulo" error={errors.cidade} /></div>
                  <Input label="Estado" name="estado" value={step3.estado} onChange={handleS3} required maxLength={2} placeholder="SP" error={errors.estado} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">País</label>
                  <input value="Brasil" readOnly className="w-full px-4 py-3 bg-gray-700/30 border border-gray-700 rounded-xl text-gray-400 cursor-not-allowed" />
                </div>
              </div>
              <NavButtons />
            </div>
          )}

          {/* ══ STEP 4: GPS & Configurações ══ */}
          {currentStep === 4 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                  <Navigation className="w-5 h-5 text-purple-400" />
                </div>
                <div><h2 className="text-xl font-semibold text-white">Localização GPS</h2><p className="text-gray-400 text-sm">Necessário para validar check-in dos alunos</p></div>
              </div>
              <div className="mb-5 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-gray-300">
                <p className="font-medium text-blue-400 mb-1">Por que isso é necessário?</p>
                <p>A localização da unidade é usada para garantir que os alunos façam check-in apenas quando estiverem fisicamente na academia (dentro de um raio de 100 metros).</p>
              </div>
              <div className="grid grid-cols-1 gap-3 mb-5">
                <button type="button" onClick={() => handleBuscarGPS(false)} disabled={geocodeLoading || gpsLoading}
                  className="flex items-center gap-3 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-300 transition-colors disabled:opacity-50">
                  {geocodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="font-medium">🔍 Buscar Localização Precisa</span>
                </button>
                <button type="button" onClick={() => handleBuscarGPS(true)} disabled={geocodeLoading || gpsLoading}
                  className="flex items-center gap-3 px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-xl text-yellow-300 transition-colors disabled:opacity-50">
                  {geocodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                  <span className="font-medium">⚡ Busca Rápida (1º Resultado)</span>
                </button>
                <button type="button" onClick={handleUsarLocalizacaoAtual} disabled={gpsLoading || geocodeLoading}
                  className="flex items-center gap-3 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl text-green-300 transition-colors disabled:opacity-50">
                  {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  <span className="font-medium">📍 Usar Minha Localização Atual</span>
                </button>
              </div>
              <div className="mb-5 p-3 bg-gray-700/30 border border-gray-600/40 rounded-xl text-xs text-gray-400 space-y-1">
                <p>💡 <span className="text-gray-300 font-medium">Escolha a melhor opção:</span></p>
                <p>🔍 <b>Buscar Localização Precisa:</b> Mostra o resultado mais exato (RECOMENDADO)</p>
                <p>⚡ <b>Busca Rápida:</b> Usa o 1º resultado (mais rápido, pode ser impreciso)</p>
                <p>📍 <b>Usar Minha Localização:</b> Somente se você estiver fisicamente na unidade</p>
                <p className="text-yellow-400">⚠️ Preencha pelo menos Cidade e Estado para buscar automaticamente.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Latitude <span className="text-gray-500 text-xs">(opcional)</span></label>
                  <input name="latitude" value={step4.latitude} onChange={handleS4} placeholder="Ex: -23.550520" type="number" step="any"
                    className={`${baseInput} ${errors.latitude ? "border-red-500" : ""}`} />
                  <p className="mt-1 text-xs text-gray-500">Valor entre -90 e 90</p>
                  {errors.latitude && <p className="mt-1 text-sm text-red-400">{errors.latitude}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Longitude <span className="text-gray-500 text-xs">(opcional)</span></label>
                  <input name="longitude" value={step4.longitude} onChange={handleS4} placeholder="Ex: -46.633308" type="number" step="any"
                    className={`${baseInput} ${errors.longitude ? "border-red-500" : ""}`} />
                  <p className="mt-1 text-xs text-gray-500">Valor entre -180 e 180</p>
                  {errors.longitude && <p className="mt-1 text-sm text-red-400">{errors.longitude}</p>}
                </div>
              </div>
              <div className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors
                ${step4.requer_aprovacao_checkin ? "bg-yellow-500/10 border-yellow-500/30" : "bg-gray-700/30 border-gray-600/40"}`}
                onClick={() => setStep4((p) => ({ ...p, requer_aprovacao_checkin: !p.requer_aprovacao_checkin }))}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${step4.requer_aprovacao_checkin ? "bg-yellow-500 border-yellow-500" : "border-gray-500"}`}>
                  {step4.requer_aprovacao_checkin && <CheckCircle className="w-3 h-3 text-black" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Requer aprovação de check-ins</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {step4.requer_aprovacao_checkin ? "✓ Ativado: Check-ins precisam de aprovação manual." : "✗ Desativado: Check-ins são aprovados automaticamente assim que registrados."}
                  </p>
                </div>
              </div>
              <NavButtons />
            </div>
          )}

          {/* ══ STEP 5: Confirmação ══ */}
          {currentStep === 5 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center border border-green-500/30">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div><h2 className="text-xl font-semibold text-white">Confirmar Dados</h2><p className="text-gray-400 text-sm">Revise antes de cadastrar</p></div>
              </div>
              <div className="space-y-4 mb-2">
                <SummaryCard title="Identificação" color="yellow">
                  <SummaryRow label="Nome" value={step1.nome} />
                  <SummaryRow label="Razão Social" value={step1.razao_social} />
                  <SummaryRow label="Nome Fantasia" value={step1.nome_fantasia} />
                  <SummaryRow label="CNPJ" value={step1.cnpj} />
                  <SummaryRow label="Insc. Estadual" value={step1.inscricao_estadual} />
                  <SummaryRow label="Insc. Municipal" value={step1.inscricao_municipal} />
                </SummaryCard>
                <SummaryCard title="Contato" color="blue">
                  <SummaryRow label="E-mail" value={step2.email} />
                  <SummaryRow label="Celular" value={step2.telefone_celular} />
                  <SummaryRow label="Fixo" value={step2.telefone_fixo} />
                  <SummaryRow label="Website" value={step2.website} />
                  <SummaryRow label="Instagram" value={step2.instagram} />
                  <SummaryRow label="Facebook" value={step2.facebook} />
                </SummaryCard>
                {(step3.cep || step3.cidade) && (
                  <SummaryCard title="Endereço" color="green">
                    <SummaryRow label="CEP" value={step3.cep} />
                    <SummaryRow label="Logradouro" value={`${step3.logradouro}, ${step3.numero}${step3.complemento ? " – " + step3.complemento : ""}`} />
                    <SummaryRow label="Bairro" value={step3.bairro} />
                    <SummaryRow label="Cidade/UF" value={`${step3.cidade} – ${step3.estado}`} />
                    <SummaryRow label="País" value={step3.pais} />
                  </SummaryCard>
                )}
                {(step4.latitude || step4.longitude) && (
                  <SummaryCard title="GPS & Config." color="purple">
                    <SummaryRow label="Latitude" value={step4.latitude} />
                    <SummaryRow label="Longitude" value={step4.longitude} />
                    <SummaryRow label="Aprovação Check-in" value={step4.requer_aprovacao_checkin ? "Sim (manual)" : "Não (automático)"} />
                  </SummaryCard>
                )}
                <div className="flex gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <span className="text-yellow-500 text-lg mt-0.5">ℹ️</span>
                  <p className="text-sm text-gray-300">
                    Unidade criada com status <span className="text-yellow-400 font-semibold">Em Homologação</span>. Nossa equipe verificará os dados e ativará em breve.
                  </p>
                </div>
              </div>
              <NavButtons onNext={handleSubmit} nextLabel="Cadastrar Unidade" isSubmit />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

