"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NameInput } from "@/components/ui/name-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamCruzLogo } from "@/components/ui/teamcruz-logo";
import { JiuJitsuWatermark } from "@/components/ui/jiujitsu-watermark";
import {
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  AlertCircle,
  UserPlus,
  User2,
  CheckCircle,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/services/authService";
import {
  getPerfisPublicos,
  type Perfil,
  getUnidadesAtivas,
  type Unidade,
} from "@/lib/usuariosApi";
import {
  formatCPF,
  isValidCPF,
  getCPFValidationMessage,
  cleanCPF,
} from "@/lib/utils/cpf-validator";

function RegisterPageContent() {
  const [formData, setFormData] = useState({
    nome: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    genero: "", // Adicionar gênero
    perfil_id: "", // Adicionar perfil selecionado
    unidade_id: "", // Adicionar unidade selecionada
    responsavel_nome: "", // Nome do responsável (se menor de 18)
    responsavel_cpf: "", // CPF do responsável (se menor de 18)
    responsavel_telefone: "", // Telefone do responsável (se menor de 18)
    consent_uso_dados_lgpd: false, // Consentimento LGPD
    consent_uso_imagem: false, // Consentimento uso de imagem
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loadingPerfis, setLoadingPerfis] = useState(true);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [cpfError, setCpfError] = useState("");
  const [telefoneError, setTelefoneError] = useState("");
  const [responsavelCpfError, setResponsavelCpfError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMenorDeIdade, setIsMenorDeIdade] = useState(false);
  const [unidadeSearchTerm, setUnidadeSearchTerm] = useState("");
  const [showUnidadeDropdown, setShowUnidadeDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();

  // Ler parâmetros da URL (vindo de convite)
  const unidadeFromUrl = searchParams?.get("unidade");
  const perfilFromUrl = searchParams?.get("perfil");

  // Função para calcular idade que vai completar no ano atual
  const calcularIdade = (dataNascimento: string): number => {
    if (!dataNascimento) return 0;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    // Retorna a idade que vai completar no ano (ano atual - ano de nascimento)
    return hoje.getFullYear() - nascimento.getFullYear();
  };

  // Verificar se é menor de 16 quando data de nascimento mudar
  useEffect(() => {
    if (formData.data_nascimento) {
      const idade = calcularIdade(formData.data_nascimento);
      setIsMenorDeIdade(idade <= 15);
    } else {
      setIsMenorDeIdade(false);
    }
  }, [formData.data_nascimento]);

  // Carregar unidades ativas disponíveis
  useEffect(() => {
    const loadUnidades = async () => {
      try {
        const data = await getUnidadesAtivas();
        if (!data || !Array.isArray(data)) {
          console.error("Resposta da API de unidades inválida:", data);
          throw new Error("Formato de resposta inválido");
        }

        if (data.length === 0) {
          console.warn("Nenhuma unidade ativa encontrada");
          throw new Error("Nenhuma unidade disponível para cadastro");
        }

        setUnidades(data);
      } catch (error) {
        console.error("Erro ao carregar unidades:", error);

        // Não criar unidade fallback - exigir que as unidades sejam carregadas
        setUnidades([]);

        toast.error(
          "Erro ao carregar unidades. Por favor, tente novamente ou entre em contato com a administração.",
          { duration: 7000 }
        );
      } finally {
        setLoadingUnidades(false);
      }
    };
    loadUnidades();
  }, []);

  // Preencher unidade e perfil automaticamente se vierem da URL (convite)
  useEffect(() => {
    if (unidadeFromUrl && perfilFromUrl) {
      setFormData((prev) => ({
        ...prev,
        unidade_id: unidadeFromUrl,
        perfil_id: perfilFromUrl,
      }));

      // Preencher o campo de busca com o nome da unidade
      const unidade = unidades.find((u) => u.id === unidadeFromUrl);
      if (unidade) {
        setUnidadeSearchTerm(unidade.nome);
      }

      toast.success("Dados do convite carregados! Complete seu cadastro.", {
        duration: 4000,
      });
    }
  }, [unidadeFromUrl, perfilFromUrl, unidades]);

  // Carregar perfis disponíveis
  useEffect(() => {
    const loadPerfis = async () => {
      try {
        // Usar endpoint otimizado que já retorna apenas perfis públicos
        const data = await getPerfisPublicos();

        // Validar se data é um array
        if (!data || !Array.isArray(data)) {
          console.error("Resposta da API de perfis inválida:", data);
          throw new Error("Formato de resposta inválido");
        }

        // Se for menor de idade, filtrar para mostrar apenas ALUNO
        let perfisDisponiveis = data;
        if (isMenorDeIdade) {
          perfisDisponiveis = data.filter(
            (p) => p.nome.toLowerCase() === "aluno"
          );
        }

        if (perfisDisponiveis.length === 0) {
          console.warn("Nenhum perfil público encontrado");
          throw new Error("Nenhum perfil disponível");
        }

        setPerfis(perfisDisponiveis);

        // APENAS definir perfil padrão se ainda não tiver um perfil selecionado
        if (!formData.perfil_id) {
          const perfilAluno = perfisDisponiveis.find(
            (p) => p.nome.toLowerCase() === "aluno"
          );
          if (perfilAluno) {
            setFormData((prev) => ({ ...prev, perfil_id: perfilAluno.id }));
          } else {
            console.warn(
              "Perfil 'aluno' não encontrado, usando primeiro perfil disponível"
            );
            setFormData((prev) => ({ ...prev, perfil_id: perfisDisponiveis[0].id }));
          }
        } else {
          // Se já tem perfil selecionado, verificar se ainda é válido
          const perfilAtualValido = perfisDisponiveis.find(
            (p) => p.id === formData.perfil_id
          );
          
          // Se for menor de idade e o perfil atual não é aluno, forçar para aluno
          if (isMenorDeIdade && !perfilAtualValido) {
            const perfilAluno = perfisDisponiveis.find(
              (p) => p.nome.toLowerCase() === "aluno"
            );
            if (perfilAluno) {
              setFormData((prev) => ({ ...prev, perfil_id: perfilAluno.id }));
              toast("Menores de 16 anos devem se cadastrar como Aluno", {
                duration: 3000,
              });
            }
          }
          // Se o perfil atual não está mais disponível (mas não é caso de menor de idade), manter o atual
        }
      } catch (error) {
        console.error("Erro ao carregar perfis:", error);
        // Se falhar, cria perfil padrão com ID válido
        const perfilPadrao = {
          id: "aluno-padrao",
          nome: "ALUNO",
          descricao: "Praticante de Jiu-Jitsu (perfil padrão)",
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setPerfis([perfilPadrao]);
        
        // Apenas setar perfil padrão se não tiver um
        if (!formData.perfil_id) {
          setFormData((prev) => ({ ...prev, perfil_id: perfilPadrao.id }));
        }

        toast.error(
          "Não foi possível carregar os perfis. Você será cadastrado como Aluno.",
          { duration: 5000 }
        );
      } finally {
        setLoadingPerfis(false);
      }
    };
    loadPerfis();
  }, [isMenorDeIdade]);

  // useEffect para formatar telefone automaticamente quando dados vierem do banco
  useEffect(() => {
    if (
      formData.telefone &&
      formData.telefone.replace(/\D/g, "").length >= 10
    ) {
      const formatted = formatPhone(formData.telefone);
      if (formatted !== formData.telefone) {
        setFormData((prev) => ({
          ...prev,
          telefone: formatted,
        }));
      }
    }
  }, [formData.telefone]); // Monitora mudanças no telefone

  // Fechar dropdown de unidades ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("#unidade") && !target.closest(".absolute.z-50")) {
        setShowUnidadeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Obter nome da unidade selecionada
  const getUnidadeNome = (unidadeId: string) => {
    if (!unidadeId || !unidades || unidades.length === 0) return "";
    
    const unidade = unidades.find((u) => u.id === unidadeId);
    if (!unidade) return "";
    
    return `${unidade.nome.toUpperCase()}${
      unidade.cidade || unidade.bairro
        ? ` - ${unidade.cidade || ""}${
            unidade.cidade && unidade.bairro ? " - " : ""
          }${unidade.bairro || ""}`
        : ""
    }`;
  };

  // Filtrar unidades baseado no termo de busca
  const unidadesFiltradas = unidades.filter((unidade) => {
    // Se não há termo de busca, mostrar todas
    if (!unidadeSearchTerm || unidadeSearchTerm.trim() === '') {
      return true;
    }
    
    const searchLower = unidadeSearchTerm.toLowerCase().trim();
    const nomeCompleto = getUnidadeNome(unidade.id).toLowerCase();
    
    // Buscar em nome, cidade e bairro individualmente
    return (
      unidade.nome.toLowerCase().includes(searchLower) ||
      (unidade.cidade && unidade.cidade.toLowerCase().includes(searchLower)) ||
      (unidade.bairro && unidade.bairro.toLowerCase().includes(searchLower)) ||
      nomeCompleto.includes(searchLower)
    );
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Se for o campo username, remove espaços e converte para minúsculas
    let processedValue = value;
    if (name === 'username') {
      processedValue = value.replace(/\s/g, '').toLowerCase();
    }
    
    setFormData({
      ...formData,
      [name]: processedValue,
    });
    if (error) setError("");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");

    // Formatação progressiva baseada na quantidade de números
    if (numbers.length === 0) {
      return "";
    } else if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(
        6
      )}`;
    } else {
      // Para celular com 11 dígitos: (11) 96065-6955
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
        7,
        11
      )}`;
    }
  };

  // Função para validar telefone - aceita tanto fixo quanto celular
  const isValidPhone = (phone: string): boolean => {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, "");

    // Aceita telefones com 10 dígitos (fixo) ou 11 dígitos (celular)
    if (cleaned.length < 10 || cleaned.length > 11) return false;

    // Rejeitar números com todos os dígitos iguais (00000000000, 11111111111, etc)
    if (/^(\d)\1+$/.test(cleaned)) return false;

    // Validar DDD (primeiros 2 dígitos) - deve estar entre 11 e 99
    const ddd = parseInt(cleaned.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;

    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // FORCA a formatação sempre, independente do valor de entrada
    const inputValue = e.target.value;

    // Remove tudo que não é número antes de formatar
    const onlyNumbers = inputValue.replace(/\D/g, "");
    const formatted = formatPhone(onlyNumbers);

    setFormData({
      ...formData,
      telefone: formatted,
    });

    // Validação em tempo real mais robusta
    const numbers = formatted.replace(/\D/g, "");

    if (numbers.length === 0) {
      setTelefoneError("");
    } else if (numbers.length < 10) {
      setTelefoneError("Telefone deve ter pelo menos 10 dígitos");
    } else if (numbers.length > 11) {
      setTelefoneError("Telefone deve ter no máximo 11 dígitos");
    } else if (numbers.length === 10 || numbers.length === 11) {
      // Para números completos, aceita qualquer formato
      setTelefoneError(""); // Telefone válido
    }

    if (error) setError("");
  };

  // UseEffect para garantir formatação quando o valor do telefone muda
  useEffect(() => {
    if (formData.telefone) {
      const formatted = formatPhone(formData.telefone);
      if (formatted !== formData.telefone) {
        setFormData((prev) => ({
          ...prev,
          telefone: formatted,
        }));
      }
    }
  }, [formData.telefone]);

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não é número antes de formatar
    const onlyNumbers = e.target.value.replace(/\D/g, "");
    // Limita a 11 dígitos
    const limitedNumbers = onlyNumbers.slice(0, 11);
    const formatted = formatCPF(limitedNumbers);
    setFormData({
      ...formData,
      cpf: formatted,
    });

    // Validação em tempo real do CPF
    if (formatted.length >= 14) {
      // CPF completo formatado
      const validationMessage = getCPFValidationMessage(formatted);
      setCpfError(validationMessage || "");
    } else {
      setCpfError("");
    }

    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.nome.trim()) {
      setError("Nome é obrigatório");
      return false;
    }
    if (!formData.username.trim()) {
      setError("Username é obrigatório");
      return false;
    }
    if (!/^[a-z0-9.]+$/.test(formData.username)) {
      setError("Username deve conter apenas letras minúsculas, números e ponto (sem espaços)");
      return false;
    }
    if (formData.username.length < 3) {
      setError("Username deve ter pelo menos 3 caracteres");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email é obrigatório");
      return false;
    }
    // Validação completa do CPF
    const cpfValidationMessage = getCPFValidationMessage(formData.cpf);
    if (cpfValidationMessage) {
      setError(cpfValidationMessage);
      return false;
    }
    if (!formData.password) {
      setError("Senha é obrigatória");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Senhas não coincidem");
      return false;
    }
    if (!formData.telefone.trim()) {
      setError("Telefone é obrigatório");
      return false;
    }
    // REMOVIDA VALIDAÇÃO ESPECÍFICA DE TELEFONE - aceita qualquer valor preenchido
    if (!formData.data_nascimento) {
      setError("Data de nascimento é obrigatória");
      return false;
    }
    if (!formData.genero) {
      setError("Gênero é obrigatório");
      return false;
    }
    if (!formData.perfil_id) {
      setError("Seleção do perfil é obrigatória");
      return false;
    }
    if (!formData.unidade_id) {
      setError("Seleção da unidade é obrigatória");
      return false;
    }

    // Validar idade mínima de 10 anos
    const dataNascimento = new Date(formData.data_nascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = dataNascimento.getMonth();

    // Ajustar idade se ainda não fez aniversário este ano
    if (
      mesAtual < mesNascimento ||
      (mesAtual === mesNascimento && hoje.getDate() < dataNascimento.getDate())
    ) {
      idade--;
    }

    if (idade < 10) {
      setError("Idade mínima para cadastro é de 10 anos");
      return false;
    }

    // Se menor de 16 anos, validar dados do responsável
    if (isMenorDeIdade) {
      if (!formData.responsavel_nome.trim()) {
        setError(
          "Nome do responsável é obrigatório para quem tem 15 anos ou menos"
        );
        return false;
      }

      const responsavelCpfValidation = getCPFValidationMessage(
        formData.responsavel_cpf
      );
      if (responsavelCpfValidation) {
        setError(`CPF do responsável: ${responsavelCpfValidation}`);
        return false;
      }

      if (!formData.responsavel_telefone.trim()) {
        setError(
          "Telefone do responsável é obrigatório para quem tem 15 anos ou menos"
        );
        return false;
      }
    }

    // perfil_id é opcional - se não selecionado, backend usa "aluno" como padrão

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação crítica de perfil ANTES de qualquer outra validação
    if (!formData.perfil_id || formData.perfil_id.trim() === '') {
      setError("Você precisa selecionar um perfil para se cadastrar");
      toast.error("Selecione um perfil antes de continuar");
      return;
    }

    // Validação crítica de unidade ANTES de qualquer outra validação
    if (!formData.unidade_id || formData.unidade_id.trim() === '') {
      setError("Você precisa selecionar uma unidade para se cadastrar");
      toast.error("Selecione uma unidade antes de continuar");
      return;
    }
    
    // Verificar se a unidade_id corresponde a uma unidade válida e ativa
    const unidadeSelecionada = unidades.find(u => u.id === formData.unidade_id);
    if (!unidadeSelecionada) {
      setError("A unidade selecionada não é válida. Por favor, selecione uma unidade da lista.");
      toast.error("Unidade inválida. Selecione uma unidade da lista.");
      setFormData({ ...formData, unidade_id: '' });
      setUnidadeSearchTerm('');
      return;
    }
    
    if (unidadeSelecionada.status !== 'ATIVA') {
      setError(`A unidade "${unidadeSelecionada.nome}" não está ativa e não pode receber cadastros no momento.`);
      toast.error("Unidade inativa. Selecione uma unidade ativa.");
      setFormData({ ...formData, unidade_id: '' });
      setUnidadeSearchTerm('');
      return;
    }

    // Validação dos consentimentos LGPD obrigatórios
    if (!formData.consent_uso_dados_lgpd) {
      setError("Você precisa autorizar o uso de dados pessoais conforme a LGPD para se cadastrar");
      toast.error("Consentimento LGPD obrigatório");
      return;
    }

    if (!formData.consent_uso_imagem) {
      setError("Você precisa autorizar o uso de imagem para se cadastrar");
      toast.error("Consentimento de uso de imagem obrigatório");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Validar data de nascimento antes de enviar
      if (!formData.data_nascimento || formData.data_nascimento.trim() === '') {
        console.error('[REGISTER] Data de nascimento vazia');
        setError('Data de nascimento é obrigatória');
        setIsLoading(false);
        return;
      }

      // Verificar se a data é válida
      const testDate = new Date(formData.data_nascimento);
      console.log('[REGISTER] TestDate:', testDate);
      console.log('[REGISTER] TestDate.getTime():', testDate.getTime());
      if (isNaN(testDate.getTime())) {
        console.error('[REGISTER] Data de nascimento inválida - NaN');
        setError('Data de nascimento inválida');
        setIsLoading(false);
        return;
      }

      const registerData: {
        nome: string;
        username: string;
        email: string;
        password: string;
        cpf: string;
        telefone: string;
        data_nascimento: string;
        genero?: string;
        perfil_id?: string;
        unidade_id?: string;
        responsavel_nome?: string;
        responsavel_cpf?: string;
        responsavel_telefone?: string;
        consent_uso_dados_lgpd?: boolean;
        consent_uso_imagem?: boolean;
      } = {
        nome: formData.nome,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        cpf: cleanCPF(formData.cpf), // Remove pontos, traços e outros caracteres, mantendo apenas números
        telefone: formData.telefone.replace(/\D/g, ""), // Remove formatação do telefone também
        data_nascimento: formData.data_nascimento,
        genero: formData.genero || "OUTRO", // Incluir gênero
        unidade_id: formData.unidade_id,
        consent_uso_dados_lgpd: formData.consent_uso_dados_lgpd || false,
        consent_uso_imagem: formData.consent_uso_imagem || false,
      };

      // Se for menor de 18 anos, incluir dados do responsável
      if (isMenorDeIdade) {
        registerData.responsavel_nome = formData.responsavel_nome;
        registerData.responsavel_cpf = cleanCPF(formData.responsavel_cpf);
        registerData.responsavel_telefone =
          formData.responsavel_telefone.replace(/\D/g, "");
      }

      // Adicionar perfil_id apenas se tiver valor e for um UUID válido
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (formData.perfil_id && uuidRegex.test(formData.perfil_id)) {
        registerData.perfil_id = formData.perfil_id;
      } else if (formData.perfil_id) {
        console.warn("perfil_id inválido, não enviando:", formData.perfil_id);
      }

      console.log('[REGISTER] Dados que serão enviados:', JSON.stringify(registerData, null, 2));
      await authService.register(registerData);

      // Verificar se o perfil escolhido requer aprovação
      const perfilEscolhido = perfis.find((p) => p.id === formData.perfil_id);
      const perfilNome = perfilEscolhido?.nome.toLowerCase() || "aluno";
      const unidadeSelecionada = unidades.find((u) => u.id === formData.unidade_id);

      // Definir mensagem de sucesso baseada no perfil
      let mensagem = "";
      if (perfilNome === "aluno") {
        mensagem = `Cadastro realizado com sucesso na unidade ${unidadeSelecionada?.nome || ''}!\n\nSeu cadastro está aguardando aprovação da unidade. Você receberá uma notificação por email assim que for aprovado e poderá acessar o sistema.`;
      } else {
        mensagem = `Cadastro realizado com sucesso!\n\nSeu cadastro como ${perfilEscolhido?.nome || ''} está aguardando aprovação do administrador. Você receberá uma notificação por email assim que for aprovado e poderá acessar o sistema.`;
      }

      setSuccessMessage(mensagem);
      setShowSuccessModal(true);
    } catch (error: unknown) {
      console.error("Erro no cadastro:", error);
      let errorMessage = "Erro ao realizar cadastro";

      if (error instanceof Error) {
        // Mensagens de erro específicas
        if (error.message.includes("Já existe um usuário com este CPF")) {
          errorMessage =
            "Este CPF já está cadastrado no sistema. Se você já possui uma conta, faça login. Se esqueceu sua senha, utilize a opção 'Esqueci minha senha'.";
        } else if (error.message.includes("CPF")) {
          errorMessage = "CPF inválido ou já cadastrado";
        } else if (error.message.includes("email")) {
          errorMessage = "Este email já está cadastrado no sistema";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Marca d'água de fundo */}
      <JiuJitsuWatermark />

      {/* Gradiente de fundo temático TeamCruz */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-red-900"></div>

      {/* Conteúdo principal */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6">
        <div className="w-full max-w-2xl">
          <Card className="shadow-2xl border-2 border-red-600/20 bg-black/90 backdrop-blur-md">
            <CardHeader className="space-y-1 text-center pb-4 sm:pb-6 px-3 sm:px-6 pt-4 sm:pt-6">
              {/* Logo TeamCruz */}
              <div className="flex justify-center mb-3 sm:mb-4">
                <TeamCruzLogo size={60} />
              </div>

              <CardTitle className="text-xl sm:text-2xl font-bold text-white flex items-center justify-center gap-2">
                <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
                CRIAR CONTA
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-300 mt-2">
                Cadastre-se para acessar o sistema TeamCruz
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="px-3 sm:px-4 md:px-6 space-y-3 sm:space-y-4">
                {/* Aviso sobre campos obrigatórios */}
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-2 sm:p-3 flex items-start gap-2">
                  <span className="text-blue-400 text-xs sm:text-sm font-medium mt-0.5">
                    ℹ️
                  </span>
                  <p className="text-xs sm:text-sm text-blue-200">
                    Campos marcados com{" "}
                    <span className="text-red-400 font-bold">*</span> são
                    obrigatórios
                  </p>
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-600/50 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-red-200">
                      {error}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="nome"
                      className="flex items-center gap-2 text-gray-200 text-xs sm:text-sm"
                    >
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                      Nome Completo <span className="text-red-400">*</span>
                    </Label>
                    <NameInput
                      id="nome"
                      name="nome"
                      required
                      value={formData.nome}
                      onChange={handleChange}
                      className="h-10 sm:h-11 bg-gray-800/50 border-gray-600 text-white text-sm sm:text-base placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className="flex items-center gap-2 text-gray-200 text-xs sm:text-sm"
                    >
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                      Username <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="h-10 sm:h-11 bg-gray-800/50 border-gray-600 text-white text-sm sm:text-base placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="seu.username"
                      minLength={3}
                      pattern="[a-z0-9.]+"
                      title="Apenas letras minúsculas, números e ponto. Sem espaços."
                    />
                    <p className="text-[10px] sm:text-xs text-gray-400">
                      Usado para login. Apenas letras minúsculas, números e ponto (sem espaços)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="flex items-center gap-2 text-gray-200 text-xs sm:text-sm"
                    >
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                      Email <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="h-10 sm:h-11 bg-gray-800/50 border-gray-600 text-white text-sm sm:text-base placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                {/* PERFIL - MOVIDO PARA O TOPO E EM DESTAQUE */}
                <div className="space-y-2 bg-red-900/20 border-2 border-red-500/50 rounded-lg p-3 sm:p-4">
                  <Label
                    htmlFor="perfil"
                    className="flex items-center gap-2 text-gray-200 text-base sm:text-lg font-semibold"
                  >
                    <User2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                    Perfil * (Escolha primeiro!)
                  </Label>
                  <Select
                    value={formData.perfil_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, perfil_id: value });
                    }}
                    disabled={loadingPerfis || !!perfilFromUrl}
                    required
                  >
                    <SelectTrigger className="h-11 sm:h-12 bg-gray-800/50 border-gray-600 text-white text-sm sm:text-base focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="👤 Selecione seu perfil" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {perfis.map((perfil) => (
                        <SelectItem
                          key={perfil.id}
                          value={perfil.id}
                          className="text-white hover:bg-gray-700 focus:bg-gray-700 py-2 sm:py-3"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-sm sm:text-base">
                              {perfil.nome}
                            </span>
                            {perfil.descricao && (
                              <span className="text-[10px] sm:text-xs text-gray-400 mt-1">
                                {perfil.descricao}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {perfilFromUrl ? (
                    <p className="text-[10px] sm:text-xs text-green-400 font-medium flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      Perfil pré-definido pelo convite
                    </p>
                  ) : (
                    <p className="text-[10px] sm:text-xs text-gray-300 font-medium">
                      ℹ️ Selecione o perfil que melhor descreve você no sistema.
                      Os campos a seguir serão ajustados conforme sua escolha.
                    </p>
                  )}
                  {formData.perfil_id &&
                    perfis.find((p) => p.id === formData.perfil_id)?.nome ===
                      "RESPONSAVEL" && (
                      <div className="mt-2 sm:mt-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-2 sm:p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] sm:text-xs text-yellow-200">
                            <strong>Atenção:</strong> Cadastros com perfil de
                            RESPONSAVEL requerem aprovação do administrador. Sua
                            conta ficará inativa até a aprovação.
                          </p>
                        </div>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="cpf"
                      className="flex items-center gap-2 text-gray-200 text-xs sm:text-sm"
                    >
                      <User2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                      CPF <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      type="text"
                      required
                      value={formData.cpf}
                      onChange={handleCPFChange}
                      className={`h-10 sm:h-11 bg-gray-800/50 text-white text-sm sm:text-base placeholder-gray-400 focus:ring-red-500 ${
                        cpfError
                          ? "border-red-500 focus:border-red-600"
                          : formData.cpf.length >= 14 &&
                            !cpfError &&
                            isValidCPF(formData.cpf)
                          ? "border-green-500 focus:border-green-600"
                          : "border-gray-600 focus:border-red-500"
                      }`}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                    {cpfError && (
                      <div className="flex items-center gap-2 text-red-400 text-xs sm:text-sm">
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{cpfError}</span>
                      </div>
                    )}
                    {!cpfError &&
                      formData.cpf.length >= 14 &&
                      isValidCPF(formData.cpf) && (
                        <div className="flex items-center gap-2 text-green-400 text-xs sm:text-sm">
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>CPF válido</span>
                        </div>
                      )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="telefone"
                      className="flex items-center gap-2 text-gray-200 text-xs sm:text-sm"
                    >
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                      Telefone <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      type="tel"
                      required
                      value={formData.telefone}
                      onChange={handlePhoneChange}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                        // Força formatação ao sair do campo
                        const formatted = formatPhone(e.target.value);
                        if (formatted !== formData.telefone) {
                          setFormData((prev) => ({
                            ...prev,
                            telefone: formatted,
                          }));
                        }
                      }}
                      className={`h-10 sm:h-11 bg-gray-800/50 text-white text-sm sm:text-base placeholder-gray-400 focus:ring-red-500 ${
                        telefoneError
                          ? "border-red-500 focus:border-red-600"
                          : formData.telefone && isValidPhone(formData.telefone)
                          ? "border-green-500 focus:border-green-600"
                          : "border-gray-600 focus:border-red-500"
                      }`}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                    {telefoneError && (
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{telefoneError}</span>
                      </div>
                    )}
                    {!telefoneError &&
                      formData.telefone &&
                      isValidPhone(formData.telefone) && (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          <span>Telefone válido</span>
                        </div>
                      )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="data_nascimento"
                    className="flex items-center gap-2 text-gray-200"
                  >
                    <Calendar className="h-4 w-4 text-red-400" />
                    Data de Nascimento <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="data_nascimento"
                    name="data_nascimento"
                    type="date"
                    required
                    value={formData.data_nascimento}
                    onChange={handleChange}
                    max={(() => {
                      const hoje = new Date();
                      hoje.setFullYear(hoje.getFullYear() - 10);
                      return hoje.toISOString().split("T")[0];
                    })()}
                    className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-400">Idade mínima: 10 anos</p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="genero"
                    className="flex items-center gap-2 text-gray-200"
                  >
                    <User2 className="h-4 w-4 text-red-400" />
                    Gênero *
                  </Label>
                  <Select
                    value={formData.genero}
                    onValueChange={(value) =>
                      setFormData({ ...formData, genero: value })
                    }
                  >
                    <SelectTrigger className="h-11 bg-gray-800/50 border-gray-600 text-white focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="MASCULINO" className="text-white">
                        Masculino
                      </SelectItem>
                      <SelectItem value="FEMININO" className="text-white">
                        Feminino
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campos do Responsável (apenas se menor de 18) */}
                {isMenorDeIdade && (
                  <>
                    <div className="col-span-2 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <h3 className="text-sm font-semibold text-red-400">
                          Dados do Responsável Legal
                        </h3>
                      </div>
                      <p className="text-xs text-gray-300 mb-4">
                        Como você tem 15 anos ou menos, é necessário informar os
                        dados de um responsável legal.
                      </p>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="responsavel_nome"
                            className="flex items-center gap-2 text-gray-200"
                          >
                            <User className="h-4 w-4 text-red-400" />
                            Nome Completo do Responsável *
                          </Label>
                          <NameInput
                            id="responsavel_nome"
                            name="responsavel_nome"
                            required
                            value={formData.responsavel_nome}
                            onChange={handleChange}
                            className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="responsavel_cpf"
                            className="flex items-center gap-2 text-gray-200"
                          >
                            <User className="h-4 w-4 text-red-400" />
                            CPF do Responsável *
                          </Label>
                          <Input
                            id="responsavel_cpf"
                            name="responsavel_cpf"
                            type="text"
                            required
                            placeholder="000.000.000-00"
                            maxLength={14}
                            value={formatCPF(formData.responsavel_cpf)}
                            onChange={(e) => {
                              // Remove tudo que não é número antes de formatar
                              const onlyNumbers = e.target.value.replace(
                                /\D/g,
                                ""
                              );
                              // Limita a 11 dígitos
                              const limitedNumbers = onlyNumbers.slice(0, 11);
                              const formatted = formatCPF(limitedNumbers);
                              setFormData({
                                ...formData,
                                responsavel_cpf: formatted,
                              });

                              // Validar CPF em tempo real
                              if (formatted.replace(/\D/g, "").length === 11) {
                                const validationMessage =
                                  getCPFValidationMessage(formatted);
                                setResponsavelCpfError(validationMessage || "");
                              } else {
                                setResponsavelCpfError("");
                              }
                            }}
                            className={`h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 ${
                              responsavelCpfError ? "border-red-500" : ""
                            }`}
                          />
                          {responsavelCpfError && (
                            <p className="text-xs text-red-400">
                              {responsavelCpfError}
                            </p>
                          )}
                          {!responsavelCpfError &&
                            formData.responsavel_cpf.replace(/\D/g, "")
                              .length === 11 && (
                              <p className="text-xs text-green-400 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                CPF válido
                              </p>
                            )}
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="responsavel_telefone"
                            className="flex items-center gap-2 text-gray-200"
                          >
                            <Phone className="h-4 w-4 text-red-400" />
                            Telefone do Responsável *
                          </Label>
                          <Input
                            id="responsavel_telefone"
                            name="responsavel_telefone"
                            type="tel"
                            required
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            value={formatPhone(formData.responsavel_telefone)}
                            onChange={(e) => {
                              // Remove tudo que não é número antes de formatar
                              const onlyNumbers = e.target.value.replace(
                                /\D/g,
                                ""
                              );
                              // Limita a 11 dígitos
                              const limitedNumbers = onlyNumbers.slice(0, 11);
                              const formatted = formatPhone(limitedNumbers);
                              setFormData({
                                ...formData,
                                responsavel_telefone: formatted,
                              });
                            }}
                            className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="unidade"
                    className="flex items-center gap-2 text-gray-200"
                  >
                    <Building2 className="h-4 w-4 text-red-400" />
                    Unidade *
                  </Label>
                  <div className="relative">
                    <Input
                      id="unidade"
                      type="text"
                      required
                      placeholder={
                        loadingUnidades
                          ? "Carregando unidades..."
                          : "Digite para buscar a unidade..."
                      }
                      value={unidadeSearchTerm}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setUnidadeSearchTerm(newValue);
                        setShowUnidadeDropdown(true);
                        
                        // Limpar unidade selecionada quando usuário está digitando
                        if (formData.unidade_id && newValue.trim() !== getUnidadeNome(formData.unidade_id)) {
                          setFormData(prev => ({ ...prev, unidade_id: '' }));
                        }
                      }}
                      onFocus={() => {
                        setShowUnidadeDropdown(true);
                      }}
                      onBlur={() => {
                        // Fechar dropdown após um delay para permitir clique nas opções
                        setTimeout(() => {
                          setShowUnidadeDropdown(false);
                          
                          // Se tem unidade selecionada, mostrar seu nome completo
                          if (formData.unidade_id) {
                            setUnidadeSearchTerm(getUnidadeNome(formData.unidade_id));
                          }
                        }, 200);
                      }}
                      disabled={loadingUnidades || !!unidadeFromUrl}
                      className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                    />
                    {showUnidadeDropdown && unidadesFiltradas.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {unidadesFiltradas.map((unidade) => (
                          <div
                            key={unidade.id}
                            onClick={() => {
                              // Validar se a unidade está ativa antes de permitir seleção
                              if (unidade.status !== 'ATIVA') {
                                toast.error(`A unidade "${unidade.nome}" não está ativa e não pode receber cadastros no momento.`);
                                return;
                              }
                              
                              setFormData({
                                ...formData,
                                unidade_id: unidade.id,
                              });
                              setUnidadeSearchTerm(getUnidadeNome(unidade.id));
                              setShowUnidadeDropdown(false);
                              toast.success(`Unidade "${unidade.nome}" selecionada`);
                            }}
                            className="px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700 last:border-b-0"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-white uppercase flex items-center gap-2">
                                {unidade.nome}
                                {unidade.status !== 'ATIVA' && (
                                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">INATIVA</span>
                                )}
                              </span>
                              {(unidade.cidade || unidade.bairro) && (
                                <span className="text-xs text-gray-400">
                                  {unidade.cidade}
                                  {unidade.cidade && unidade.bairro
                                    ? " - "
                                    : ""}
                                  {unidade.bairro}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {unidadeFromUrl ? (
                    <p className="text-xs text-green-400 font-medium flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Unidade pré-definida pelo convite
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Selecione a unidade onde deseja se cadastrar
                    </p>
                  )}
                  {formData.unidade_id && (
                    <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3 mt-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-200">
                          <strong>Unidade selecionada:</strong> Seu cadastro
                          será direcionado para aprovação pelos responsáveis
                          desta unidade.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Campos de Senha */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <Lock className="h-4 w-4 text-red-400" />
                      Senha <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 pr-10"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="flex items-center gap-2 text-gray-200"
                    >
                      <Lock className="h-4 w-4 text-red-400" />
                      Confirmar Senha <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="h-11 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500 pr-10"
                        placeholder="Repita sua senha"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Consentimentos LGPD */}
                <div className="space-y-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    Consentimentos LGPD <span className="text-red-400">*</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        required
                        checked={formData.consent_uso_dados_lgpd}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            consent_uso_dados_lgpd: e.target.checked,
                          })
                        }
                        className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800/50 text-red-600 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                        Autorizo o uso dos meus dados pessoais conforme a LGPD (Lei Geral de Proteção de Dados) <span className="text-red-400">*</span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        required
                        checked={formData.consent_uso_imagem}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            consent_uso_imagem: e.target.checked,
                          })
                        }
                        className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800/50 text-red-600 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                        Autorizo o uso de minha imagem para divulgação nas redes sociais e materiais de marketing <span className="text-red-400">*</span>
                      </span>
                    </label>
                  </div>

                  <p className="text-[10px] text-red-400 font-medium">
                    * Estes consentimentos são obrigatórios para o cadastro
                  </p>
                </div>

                <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3 sm:p-4 mt-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs sm:text-sm text-blue-100">
                      <p className="font-medium mb-1">
                        Informações importantes:
                      </p>
                      <ul className="space-y-1 text-[10px] sm:text-xs text-blue-200">
                        <li>• Selecione a unidade onde deseja se cadastrar</li>
                        <li>
                          • Selecione o perfil adequado ao seu papel no sistema
                        </li>
                        <li>
                          • Seu cadastro será enviado para aprovação da unidade
                          selecionada
                        </li>
                        <li>
                          • Em caso de dúvidas, entre em contato com sua
                          academia
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 sm:space-y-4 px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
                <Button
                  type="submit"
                  className="w-full h-11 sm:h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold tracking-wide border border-red-500 shadow-lg shadow-red-900/50 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Criando conta...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                      CRIAR CONTA
                    </span>
                  )}
                </Button>

                <div className="text-center text-xs sm:text-sm">
                  <p className="text-gray-400">
                    Já tem uma conta?{" "}
                    <Link
                      href="/login"
                      className="text-red-400 hover:text-red-300 font-medium transition-colors"
                    >
                      Faça login
                    </Link>
                  </p>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full shadow-2xl border-2 border-green-500/30 bg-black/95">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-500/20 p-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Cadastro Realizado com Sucesso!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                <p className="text-gray-200 text-center whitespace-pre-line leading-relaxed">
                  {successMessage}
                </p>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-200 text-sm text-center">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  Aguarde a aprovação para fazer login no sistema
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center pb-6">
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/login");
                }}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold px-8 py-2 rounded-lg transition-all duration-200"
              >
                IR PARA LOGIN
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">Carregando...</p>
          </div>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
