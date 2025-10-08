"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/AuthContext";
import { authService } from "@/lib/services/authService";
import LoadingPage from "@/components/LoadingPage";

interface Unidade {
  id: string;
  nome: string;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    loading: authLoading,
    checkAuthStatus,
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [unidades, setUnidades] = useState<Unidade[]>([]);

  const [formData, setFormData] = useState({
    // Dados obrigatórios
    unidade_id: "",
    data_nascimento: "",
    genero: "OUTRO",

    // Graduação (aluno)
    faixa_atual: "BRANCA",
    graus: 0,

    // Contato
    telefone_emergencia: "",
    nome_contato_emergencia: "",

    // Dados médicos
    observacoes_medicas: "",
    alergias: "",
    medicamentos_uso_continuo: "",
    plano_saude: "",
    atestado_medico_validade: "",
    restricoes_medicas: "",

    // Responsável (menor de idade)
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_telefone: "",
    responsavel_parentesco: "",

    // Dados financeiros
    dia_vencimento: "",
    valor_mensalidade: "",
    desconto_percentual: 0,

    // Consentimentos LGPD
    consent_lgpd: false,
    consent_imagem: false,

    // Outros
    especialidades: [] as string[],
    observacoes: "",
    foto_url: "",
  });

  useEffect(() => {
    // Verificar se está autenticado
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    // Verificar se o cadastro já foi completo
    if (user?.cadastro_completo) {
      router.push("/dashboard");
      return;
    }

    loadUnidades();
  }, [user, isAuthenticated, authLoading, router]);

  const loadUnidades = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/unidades");
      const data = await response.json();
      // Garantir que data seja um array
      if (Array.isArray(data)) {
        setUnidades(data);
      } else if (data?.items && Array.isArray(data.items)) {
        setUnidades(data.items);
      } else {
        console.warn("Resposta da API não é um array:", data);
        setUnidades([]);
      }
    } catch (err) {
      console.error("Erro ao carregar unidades:", err);
      setUnidades([]);
    }
  };

  const calcularIdade = (dataNascimento: string): number => {
    if (!dataNascimento) return 0;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const isMenorDeIdade = (): boolean => {
    return calcularIdade(formData.data_nascimento) < 18;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Validar campos obrigatórios
      if (!formData.unidade_id) {
        throw new Error("Selecione uma unidade");
      }

      if (!formData.data_nascimento) {
        throw new Error("Informe sua data de nascimento");
      }

      // Se for menor de idade, validar responsável
      if (isMenorDeIdade()) {
        if (
          !formData.responsavel_nome ||
          !formData.responsavel_cpf ||
          !formData.responsavel_telefone
        ) {
          throw new Error(
            "Para menores de 18 anos é obrigatório informar os dados do responsável"
          );
        }
      }

      const response = await authService.completeProfile(formData);

      // Se retornou um novo token, salvar no localStorage
      if (response.access_token) {
        localStorage.setItem("token", response.access_token);
        console.log("✅ Novo token salvo após completar perfil");
      }

      // Cadastro completado com sucesso, limpar dados e redirecionar
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Redirecionar para página de sucesso
      router.push("/cadastro-concluido");
    } catch (err: any) {
      const errorMessage = err.message || "Erro ao completar cadastro";

      // Detectar erro de token inválido
      if (
        errorMessage.includes("invalid signature") ||
        errorMessage.includes("401")
      ) {
        setError(
          'Sua sessão expirou ou é inválida. Por favor, clique em "Sair" e faça login novamente.'
        );
      } else {
        setError(errorMessage);
      }

      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Garantir que perfis existe e o primeiro item é uma string
  const perfilPrincipal = user?.perfis?.[0]
    ? (typeof user.perfis[0] === "string"
        ? user.perfis[0]
        : user.perfis[0]?.nome || user.perfis[0]?.name || ""
      )?.toLowerCase()
    : "";

  const isAluno = perfilPrincipal === "aluno";
  const isProfessor =
    perfilPrincipal === "professor" || perfilPrincipal === "instrutor";

  // Mostrar loading enquanto carrega autenticação
  if (authLoading) {
    return <LoadingPage message="Verificando autenticação..." />;
  }

  // Mostrar loading enquanto processa o cadastro
  if (loading) {
    return <LoadingPage message="Finalizando seu cadastro..." />;
  }

  // Se não estiver autenticado, não renderiza nada (o useEffect vai redirecionar)
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    // Limpar localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Redirecionar para login
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-white">
            Complete seu Cadastro
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            Sair
          </button>
        </div>
        <p className="text-gray-400 mb-6">
          Preencha os dados abaixo para completar seu cadastro
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Unidade */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Unidade *
            </label>
            <select
              name="unidade_id"
              value={formData.unidade_id}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
            >
              <option value="">Selecione uma unidade</option>
              {unidades.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Data de Nascimento */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Data de Nascimento *
            </label>
            <input
              type="date"
              name="data_nascimento"
              value={formData.data_nascimento}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Gênero */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gênero
            </label>
            <select
              name="genero"
              value={formData.genero}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
            >
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>

          {/* Campos específicos para ALUNO */}
          {isAluno && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Faixa Atual
                </label>
                <select
                  name="faixa_atual"
                  value={formData.faixa_atual}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Observações Médicas
                </label>
                <textarea
                  name="observacoes_medicas"
                  value={formData.observacoes_medicas}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                  placeholder="Alguma condição médica que devemos saber?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Alergias
                </label>
                <input
                  type="text"
                  name="alergias"
                  value={formData.alergias}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                  placeholder="Liste suas alergias, se houver"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Medicamentos de Uso Contínuo
                </label>
                <input
                  type="text"
                  name="medicamentos_uso_continuo"
                  value={formData.medicamentos_uso_continuo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                  placeholder="Medicamentos que você usa regularmente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Plano de Saúde
                </label>
                <input
                  type="text"
                  name="plano_saude"
                  value={formData.plano_saude}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                  placeholder="Nome do plano de saúde (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Validade do Atestado Médico
                </label>
                <input
                  type="date"
                  name="atestado_medico_validade"
                  value={formData.atestado_medico_validade}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Restrições Médicas
                </label>
                <textarea
                  name="restricoes_medicas"
                  value={formData.restricoes_medicas}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                  placeholder="Alguma restrição para atividades físicas?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telefone de Emergência
                  </label>
                  <input
                    type="tel"
                    name="telefone_emergencia"
                    value={formData.telefone_emergencia}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome do Contato
                  </label>
                  <input
                    type="text"
                    name="nome_contato_emergencia"
                    value={formData.nome_contato_emergencia}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                    placeholder="Nome da pessoa de contato"
                  />
                </div>
              </div>

              {/* Dados Financeiros */}
              <div className="border border-blue-600 rounded-lg p-4 bg-blue-900/20">
                <h3 className="text-lg font-semibold text-blue-400 mb-3">
                  Dados Financeiros (Opcional)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Dia Vencimento
                    </label>
                    <input
                      type="number"
                      name="dia_vencimento"
                      value={formData.dia_vencimento}
                      onChange={handleChange}
                      min="1"
                      max="31"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                      placeholder="1-31"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Valor Mensalidade (R$)
                    </label>
                    <input
                      type="number"
                      name="valor_mensalidade"
                      value={formData.valor_mensalidade}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Desconto (%)
                    </label>
                    <input
                      type="number"
                      name="desconto_percentual"
                      value={formData.desconto_percentual}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Consentimentos LGPD */}
              <div className="border border-green-600 rounded-lg p-4 bg-green-900/20 space-y-3">
                <h3 className="text-lg font-semibold text-green-400 mb-3">
                  Consentimentos
                </h3>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent_lgpd"
                    name="consent_lgpd"
                    checked={formData.consent_lgpd}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        consent_lgpd: e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500"
                  />
                  <label
                    htmlFor="consent_lgpd"
                    className="text-sm text-gray-300"
                  >
                    Autorizo o uso dos meus dados pessoais para fins cadastrais,
                    conforme a Lei Geral de Proteção de Dados (LGPD).
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent_imagem"
                    name="consent_imagem"
                    checked={formData.consent_imagem}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        consent_imagem: e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500"
                  />
                  <label
                    htmlFor="consent_imagem"
                    className="text-sm text-gray-300"
                  >
                    Autorizo o uso de minha imagem em fotos e vídeos para
                    divulgação da academia nas redes sociais e materiais
                    promocionais.
                  </label>
                </div>
              </div>

              {/* Dados do Responsável (se menor de idade) */}
              {isMenorDeIdade() && (
                <div className="border border-yellow-600 rounded-lg p-4 bg-yellow-900/20">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3">
                    Dados do Responsável (obrigatório para menores de 18 anos)
                  </h3>

                  <div className="space-y-3">
                    <input
                      type="text"
                      name="responsavel_nome"
                      value={formData.responsavel_nome}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                      placeholder="Nome completo do responsável *"
                    />

                    <input
                      type="text"
                      name="responsavel_cpf"
                      value={formData.responsavel_cpf}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                      placeholder="CPF do responsável *"
                    />

                    <input
                      type="tel"
                      name="responsavel_telefone"
                      value={formData.responsavel_telefone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                      placeholder="Telefone do responsável *"
                    />

                    <input
                      type="text"
                      name="responsavel_parentesco"
                      value={formData.responsavel_parentesco}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                      placeholder="Parentesco (ex: pai, mãe, tutor)"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Campos específicos para PROFESSOR/INSTRUTOR */}
          {isProfessor && (
            <>
              <div className="border border-purple-600 rounded-lg p-4 bg-purple-900/20">
                <h3 className="text-lg font-semibold text-purple-400 mb-3">
                  🥋 Dados do Instrutor
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Graduação/Faixa
                  </label>
                  <select
                    name="faixa_atual"
                    value={formData.faixa_atual}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="AZUL">Faixa Azul</option>
                    <option value="ROXA">Faixa Roxa</option>
                    <option value="MARROM">Faixa Marrom</option>
                    <option value="PRETA">Faixa Preta</option>
                    <option value="CORAL">Faixa Coral</option>
                  </select>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Especialidades (separe por vírgula)
                  </label>
                  <input
                    type="text"
                    name="especialidades"
                    value={formData.especialidades.join(", ")}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        especialidades: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter((s) => s),
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="Ex: Jiu-Jitsu Gi, NoGi, MMA, Defesa Pessoal"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Suas áreas de especialização como instrutor
                  </p>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telefone de Contato
                  </label>
                  <input
                    type="tel"
                    name="telefone_emergencia"
                    value={formData.telefone_emergencia}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </>
          )}

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Observações Adicionais
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
              placeholder="Alguma informação adicional que gostaria de compartilhar?"
            />
          </div>

          {/* Botão Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Enviando..." : "Completar Cadastro"}
          </button>
        </form>
      </div>
    </div>
  );
}
