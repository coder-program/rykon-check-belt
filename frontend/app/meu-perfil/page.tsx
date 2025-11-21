"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

// Função para formatar data para input type="date" (YYYY-MM-DD)
const formatDateForInput = (dateString: string | undefined | null): string => {
  if (!dateString) return "";

  try {
    // Se já está no formato YYYY-MM-DD, retornar direto
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    // Tentar parsear a data
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    // Formatar para YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return "";
  }
};

// Função para formatar CPF
const formatCPF = (cpf: string): string => {
  if (!cpf) return "";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

// Interface para unidade
interface Unidade {
  id: string;
  nome: string;
}

// Interface para os dados do perfil
interface ProfileData {
  username?: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  foto?: string;
  data_nascimento?: string;
  genero?: string;
  numero_matricula?: string;
  data_matricula?: string;
  faixa_atual?: string;
  graus?: number;
  telefone_emergencia?: string;
  nome_contato_emergencia?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_telefone?: string;
  responsavel_parentesco?: string;
  faixa_ministrante?: string;
  data_inicio_docencia?: string;
  registro_profissional?: string;
  // Dados médicos
  observacoes_medicas?: string;
  alergias?: string;
  medicamentos_uso_continuo?: string;
  plano_saude?: string;
  atestado_medico_validade?: string;
  restricoes_medicas?: string;
  // Dados financeiros
  dia_vencimento?: number;
  valor_mensalidade?: number;
  desconto_percentual?: number;
  // Graduação
  data_ultima_graduacao?: string;
  // Observações e LGPD
  observacoes?: string;
  consent_lgpd?: boolean;
  consent_imagem?: boolean;
  // Campos específicos de franqueado
  nome_franquia?: string;
  email_franquia?: string;
  telefone_franquia?: string;
  cpf_franquia?: string;
  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  // Unidade
  unidade_id?: string;
  unidade_nome?: string;
  // Campos de senha
  senha_atual?: string;
  nova_senha?: string;
  confirmar_senha?: string;
}

export default function MeuPerfilPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ProfileData>({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    foto: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState<
    "aluno" | "professor" | "franqueado" | "usuario" | null
  >(null);
  const [unidadeOriginal, setUnidadeOriginal] = useState<string | null>(null);
  const [unidadeMudou, setUnidadeMudou] = useState(false);

  // Estados para controlar visibilidade das senhas
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  // Query para buscar dados específicos do aluno
  const {
    data: dadosAluno,
    error: errorAluno,
    isLoading: loadingAluno,
  } = useQuery({
    queryKey: ["aluno-by-usuario", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const response = await fetch(`${API_URL}/alunos/usuario/${user.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Não é aluno
        }
        return null; // Retorna null ao invés de lançar erro
      }

      const data = await response.json();
      return data;
    },
    enabled: !!user?.id && user?.perfis?.includes("ALUNO"),
    retry: false, // Não retentar se falhar
  });

  // Query para buscar dados específicos do professor
  const { data: dadosProfessor } = useQuery({
    queryKey: ["professor-by-usuario", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const response = await fetch(
        `${API_URL}/professores/usuario/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) return null; // Não é professor
        return null;
      }

      return response.json();
    },
    enabled: !!user?.id && user?.perfis?.includes("PROFESSOR"),
    retry: false,
  });

  // Query para buscar dados específicos do franqueado
  const { data: dadosFranqueado } = useQuery({
    queryKey: ["franqueado-by-usuario", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const response = await fetch(
        `${API_URL}/franqueados/usuario/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) return null; // Não é franqueado
        return null;
      }

      return response.json();
    },
    enabled: !!user?.id && user?.perfis?.includes("FRANQUEADO"),
    retry: false,
  });

  // Query para buscar dados específicos do gerente de unidade
  const { data: dadosGerente } = useQuery({
    queryKey: ["gerente-by-usuario", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const response = await fetch(
        `${API_URL}/gerente-unidades/usuario/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) return null; // Não é gerente
        return null;
      }

      return response.json();
    },
    enabled: !!user?.id && user?.perfis?.includes("GERENTE_UNIDADE"),
    retry: false,
  });

  // Query para buscar endereço do franqueado
  const { data: enderecoFranqueado } = useQuery({
    queryKey: ["endereco-franqueado", dadosFranqueado?.endereco_id],
    queryFn: async () => {
      if (!dadosFranqueado?.endereco_id) return null;

      const response = await fetch(
        `${API_URL}/enderecos/${dadosFranqueado.endereco_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    },
    enabled: !!dadosFranqueado?.endereco_id,
    retry: false,
  });

  // Query para buscar unidades disponíveis
  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades-list"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/unidades?pageSize=1000`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar unidades");
      }

      const data = await response.json();
      return data.items || [];
    },
    enabled: !!user?.id,
  });

  // Redirect se não autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, authLoading, router]);

  // Determinar tipo de usuário e preencher formulário
  useEffect(() => {
    if (user) {
      console.log("[DEBUG] user:", user);
      console.log("[DEBUG] user.perfis:", user.perfis);
      console.log(
        "[DEBUG] tem perfil FRANQUEADO?",
        user?.perfis?.includes("FRANQUEADO")
      );
      console.log("[DEBUG] dadosAluno:", dadosAluno);
      console.log("[DEBUG] dadosProfessor:", dadosProfessor);
      console.log("[DEBUG] dadosFranqueado:", dadosFranqueado);
      console.log("[DEBUG] enderecoFranqueado:", enderecoFranqueado);

      let dadosCompletos: ProfileData = {
        nome: user.nome || "",
        email: user.email || "",
        telefone: user.telefone || "",
        cpf: user.cpf || "",
        foto: user.foto || "",
      };

      // Se é aluno, usar dados da entidade aluno
      if (dadosAluno) {
        setTipoUsuario("aluno");
        dadosCompletos = {
          ...dadosCompletos,
          nome: dadosAluno.nome_completo || user.nome || "",
          cpf: dadosAluno.cpf || user.cpf || "",
          email: dadosAluno.email || user.email || "",
          telefone: dadosAluno.telefone || user.telefone || "",
          data_nascimento: formatDateForInput(dadosAluno.data_nascimento),
          genero: dadosAluno.genero || "",
          numero_matricula: dadosAluno.numero_matricula || "",
          data_matricula: dadosAluno.data_matricula || "",
          faixa_atual: dadosAluno.faixa_atual || "",
          graus: dadosAluno.graus || 0,
          telefone_emergencia: dadosAluno.telefone_emergencia || "",
          nome_contato_emergencia: dadosAluno.nome_contato_emergencia || "",
          responsavel_nome: dadosAluno.responsavel_nome || "",
          responsavel_cpf: dadosAluno.responsavel_cpf || "",
          responsavel_telefone: dadosAluno.responsavel_telefone || "",
          responsavel_parentesco: dadosAluno.responsavel_parentesco || "",
          // Dados médicos
          observacoes_medicas: dadosAluno.observacoes_medicas || "",
          alergias: dadosAluno.alergias || "",
          medicamentos_uso_continuo: dadosAluno.medicamentos_uso_continuo || "",
          plano_saude: dadosAluno.plano_saude || "",
          atestado_medico_validade: formatDateForInput(
            dadosAluno.atestado_medico_validade
          ),
          restricoes_medicas: dadosAluno.restricoes_medicas || "",
          // Dados financeiros
          dia_vencimento: dadosAluno.dia_vencimento || undefined,
          valor_mensalidade: dadosAluno.valor_mensalidade || undefined,
          desconto_percentual: dadosAluno.desconto_percentual || 0,
          // Graduação
          data_ultima_graduacao: formatDateForInput(
            dadosAluno.data_ultima_graduacao
          ),
          // Observações e LGPD
          observacoes: dadosAluno.observacoes || "",
          consent_lgpd: dadosAluno.consent_lgpd || false,
          consent_imagem: dadosAluno.consent_imagem || false,
        };
      }
      // Se é professor, usar dados da entidade professor
      else if (dadosProfessor) {
        setTipoUsuario("professor");
        dadosCompletos = {
          ...dadosCompletos,
          nome: dadosProfessor.nome_completo || user.nome || "",
          cpf: dadosProfessor.cpf || user.cpf || "",
          email: dadosProfessor.email || user.email || "",
          telefone: dadosProfessor.telefone_whatsapp || user.telefone || "",
          data_nascimento: formatDateForInput(dadosProfessor.data_nascimento),
          genero: dadosProfessor.genero || "",
          faixa_ministrante: dadosProfessor.faixa_ministrante || "",
          data_inicio_docencia: formatDateForInput(
            dadosProfessor.data_inicio_docencia
          ),
          registro_profissional: dadosProfessor.registro_profissional || "",
        };
      }
      // Se é franqueado, usar dados da entidade franqueado
      else if (dadosFranqueado) {
        setTipoUsuario("franqueado");
        dadosCompletos = {
          ...dadosCompletos,
          // Dados do usuário (mantém os originais de user)
          nome: user.nome || "",
          email: user.email || "",
          telefone: user.telefone || "",
          cpf: user.cpf || "",
          data_nascimento: formatDateForInput(user.data_nascimento),
          // Dados da franquia (vem de franqueado)
          nome_franquia: dadosFranqueado.nome || "",
          email_franquia: dadosFranqueado.email || "",
          telefone_franquia: dadosFranqueado.telefone || "",
          cpf_franquia: dadosFranqueado.cpf || "",
          // Dados do endereço (vem de enderecoFranqueado)
          cep: enderecoFranqueado?.cep || "",
          logradouro: enderecoFranqueado?.logradouro || "",
          numero: enderecoFranqueado?.numero || "",
          complemento: enderecoFranqueado?.complemento || "",
          bairro: enderecoFranqueado?.bairro || "",
          cidade: enderecoFranqueado?.cidade || "",
          uf: enderecoFranqueado?.estado || "",
        };
      }
      // Se não é aluno nem professor nem franqueado, usar apenas dados básicos do usuário
      else {
        setTipoUsuario("usuario");
        // Incluir data_nascimento para todos os tipos de usuário
        dadosCompletos.data_nascimento = formatDateForInput(
          user.data_nascimento
        );
      }

      // Adicionar username de todos os usuários
      dadosCompletos.username = user.username || "";

      // Garantir que data_nascimento sempre seja incluída se existir no user
      if (!dadosCompletos.data_nascimento && user.data_nascimento) {
        dadosCompletos.data_nascimento = formatDateForInput(
          user.data_nascimento
        );
      } // Adicionar dados de endereço e unidade se existirem
      if (dadosAluno || dadosProfessor) {
        const entidadeData = dadosAluno || dadosProfessor;
        dadosCompletos = {
          ...dadosCompletos,
          cep: entidadeData.cep || "",
          logradouro: entidadeData.logradouro || "",
          numero: entidadeData.numero || "",
          complemento: entidadeData.complemento || "",
          bairro: entidadeData.bairro || "",
          cidade: entidadeData.cidade || "",
          uf: entidadeData.uf || "",
          unidade_id: entidadeData.unidade_id || "",
          unidade_nome: entidadeData.unidade?.nome || "",
        };

        // Definir unidade original para detectar mudanças
        setUnidadeOriginal(entidadeData.unidade_id || "");
      }

      // Adicionar endereço do franqueado se existir
      if (dadosFranqueado && dadosFranqueado.endereco) {
        dadosCompletos = {
          ...dadosCompletos,
          cep: dadosFranqueado.endereco.cep || "",
          logradouro: dadosFranqueado.endereco.logradouro || "",
          numero: dadosFranqueado.endereco.numero || "",
          complemento: dadosFranqueado.endereco.complemento || "",
          bairro: dadosFranqueado.endereco.bairro || "",
          cidade: dadosFranqueado.endereco.cidade || "",
          uf: dadosFranqueado.endereco.uf || "",
        };
      }

      setFormData(dadosCompletos);
    }
  }, [user, dadosAluno, dadosProfessor, dadosFranqueado, enderecoFranqueado]);

  // Função para detectar mudança de unidade
  const handleUnidadeChange = (novaUnidadeId: string) => {
    if (novaUnidadeId !== unidadeOriginal && unidadeOriginal) {
      setUnidadeMudou(true);
      setWarningMessage(
        "⚠️ ATENÇÃO: Ao alterar sua unidade, seu cadastro ficará inativo até que o gerente da nova unidade aprove a transferência. Durante este período, você não conseguirá acessar o sistema."
      );
    } else {
      setUnidadeMudou(false);
      setWarningMessage("");
    }

    setFormData((prev) => ({ ...prev, unidade_id: novaUnidadeId }));
  };

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      if (!user?.id) throw new Error("Usuário não encontrado");

      // Validar senha se fornecida - só valida se o usuário realmente quer trocar a senha
      if (data.nova_senha || data.confirmar_senha) {
        if (!data.senha_atual) {
          throw new Error("Informe a senha atual para alterar a senha");
        }
        if (!data.nova_senha) {
          throw new Error("Informe a nova senha");
        }
        if (data.nova_senha !== data.confirmar_senha) {
          throw new Error("As senhas não conferem");
        }
        if (data.nova_senha.length < 6) {
          throw new Error("A nova senha deve ter no mínimo 6 caracteres");
        }
      }

      // Separar dados do usuário básico dos dados específicos
      const dadosUsuario: any = {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        cpf: data.cpf,
        foto: data.foto,
        data_nascimento: data.data_nascimento, // Adicionar data_nascimento na tabela usuarios
      };

      // Adicionar username se foi alterado
      if (data.username && data.username !== user.username) {
        dadosUsuario.username = data.username;
      }

      // Adicionar senha se foi fornecida
      if (data.senha_atual && data.nova_senha) {
        dadosUsuario.senha_atual = data.senha_atual;
        dadosUsuario.password = data.nova_senha;
      }

      // Atualizar dados básicos do usuário
      const userResponse = await fetch(`${API_URL}/usuarios/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(dadosUsuario),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.message || "Erro ao atualizar dados básicos");
      }

      // Se é aluno e tem dados específicos para atualizar
      if (tipoUsuario === "aluno" && dadosAluno) {
        const dadosAlunoUpdate = {
          nome_completo: data.nome,
          cpf: data.cpf,
          email: data.email,
          telefone: data.telefone,
          data_nascimento: data.data_nascimento,
          genero: data.genero,
          telefone_emergencia: data.telefone_emergencia,
          nome_contato_emergencia: data.nome_contato_emergencia,
          responsavel_nome: data.responsavel_nome,
          responsavel_cpf: data.responsavel_cpf,
          responsavel_telefone: data.responsavel_telefone,
          // Dados de endereço
          cep: data.cep,
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          uf: data.uf,
          // Unidade
          unidade_id: data.unidade_id,
        };

        const alunoResponse = await fetch(
          `${API_URL}/alunos/${dadosAluno.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(dadosAlunoUpdate),
          }
        );

        if (!alunoResponse.ok) {
          const errorData = await alunoResponse.json();
          throw new Error(
            errorData.message || "Erro ao atualizar dados do aluno"
          );
        }
      }

      // Se é professor e tem dados específicos para atualizar
      if (tipoUsuario === "professor" && dadosProfessor) {
        const dadosProfessorUpdate = {
          nome_completo: data.nome,
          cpf: data.cpf,
          email: data.email,
          telefone_whatsapp: data.telefone,
          data_nascimento: data.data_nascimento,
          genero: data.genero,
          data_inicio_docencia: data.data_inicio_docencia,
          registro_profissional: data.registro_profissional,
          // Dados de endereço
          cep: data.cep,
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          uf: data.uf,
          // Unidade
          unidade_id: data.unidade_id,
        };

        const professorResponse = await fetch(
          `${API_URL}/professores/${dadosProfessor.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(dadosProfessorUpdate),
          }
        );

        if (!professorResponse.ok) {
          const errorData = await professorResponse.json();
          throw new Error(
            errorData.message || "Erro ao atualizar dados do professor"
          );
        }
      }

      // Se é franqueado e tem dados específicos para atualizar
      if (tipoUsuario === "franqueado" && dadosFranqueado) {
        let enderecoId = dadosFranqueado.endereco_id;

        // Se tem dados de endereço, criar/atualizar o endereço primeiro
        if (data.cep && data.logradouro) {
          const enderecoData = {
            cep: data.cep.replace(/\D/g, ""),
            logradouro: data.logradouro,
            numero: data.numero || "S/N",
            complemento: data.complemento || null,
            bairro: data.bairro || null,
            cidade: data.cidade || null,
            estado: data.uf || null,
          };

          if (enderecoId) {
            // Atualizar endereço existente
            const enderecoResponse = await fetch(
              `${API_URL}/enderecos/${enderecoId}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(enderecoData),
              }
            );

            if (!enderecoResponse.ok) {
              const errorData = await enderecoResponse.json();
              throw new Error(
                errorData.message || "Erro ao atualizar endereço"
              );
            }
          } else {
            // Criar novo endereço
            const enderecoResponse = await fetch(`${API_URL}/enderecos`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify(enderecoData),
            });

            if (!enderecoResponse.ok) {
              const errorData = await enderecoResponse.json();
              throw new Error(errorData.message || "Erro ao criar endereço");
            }

            const novoEndereco = await enderecoResponse.json();
            enderecoId = novoEndereco.id;
          }
        }

        const dadosFranqueadoUpdate = {
          nome: data.nome_franquia,
          email: data.email_franquia,
          telefone: data.telefone_franquia,
          endereco_id: enderecoId,
        };

        const franqueadoResponse = await fetch(
          `${API_URL}/franqueados/minha-franquia/${dadosFranqueado.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(dadosFranqueadoUpdate),
          }
        );

        if (!franqueadoResponse.ok) {
          const errorData = await franqueadoResponse.json();
          throw new Error(
            errorData.message || "Erro ao atualizar dados do franqueado"
          );
        }
      }

      return await userResponse.json();
    },
    onSuccess: () => {
      setSuccessMessage("Perfil atualizado com sucesso!");
      setErrors({});

      // Invalidar queries para recarregar dados
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({
        queryKey: ["aluno-by-usuario", user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["professor-by-usuario", user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["franqueado-by-usuario", user?.id],
      });

      // Limpar campos de senha após sucesso
      setFormData((prev) => ({
        ...prev,
        senha_atual: "",
        nova_senha: "",
        confirmar_senha: "",
      }));

      // Limpar mensagem após 3 segundos
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: Error) => {
      console.error("❌ [DEBUG] Erro ao atualizar perfil:", error);
      setErrors({ general: error.message });
      setSuccessMessage("");
    },
  });

  // Função para formatar apenas texto (remover números e caracteres especiais)
  const formatTextOnly = (value: string): string => {
    return value.replace(/[^a-zA-ZÀ-ÿ\s\-'&.()]/g, "");
  };

  // Função para formatar telefone
  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4,5})(\d{4})$/, "$1-$2");
    }
    return value;
  };

  // Função para formatar CPF
  const formatCPF = (value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  // Função para formatar CEP
  const formatCEP = (value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  // Função para buscar endereço pelo CEP
  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
      return;
    }

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );
      const data = await response.json();

      if (data.erro) {
        setErrors((prev) => ({ ...prev, cep: "CEP não encontrado" }));
        return;
      }

      // Preencher campos de endereço automaticamente
      setFormData((prev) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));

      // Limpar erro do CEP
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.cep;
        return newErrors;
      });
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      setErrors((prev) => ({ ...prev, cep: "Erro ao buscar CEP" }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Aplicar formatação baseada no campo
    switch (name) {
      case "nome":
        formattedValue = formatTextOnly(value);
        break;
      case "telefone":
        formattedValue = formatPhone(value);
        break;
      case "cpf":
        formattedValue = formatCPF(value);
        break;
      case "cep":
        formattedValue = formatCEP(value);
        break;
      case "email":
        // Email não precisa de formatação especial
        break;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

    // Validação em tempo real para CPF e telefone
    if (name === "cpf" || name === "telefone") {
      const newErrors = { ...errors };

      if (name === "cpf" && formattedValue) {
        const cpfLimpo = formattedValue.replace(/\D/g, "");
        const cpfFormatado = formatCPF(formattedValue);

        if (
          cpfLimpo.length === 11 ||
          /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpfFormatado)
        ) {
          delete newErrors.cpf; // Remove erro se CPF estiver válido
        } else if (cpfLimpo.length > 0 && cpfLimpo.length < 11) {
          newErrors.cpf = "CPF deve ter 11 dígitos";
        }
      }

      if (name === "telefone" && formattedValue) {
        if (/^\(\d{2}\) \d{4,5}-\d{4}$/.test(formattedValue)) {
          delete newErrors.telefone; // Remove erro se telefone estiver válido
        } else {
          const numeros = formattedValue.replace(/\D/g, "");
          if (numeros.length > 0 && numeros.length < 10) {
            newErrors.telefone = "Telefone deve ter pelo menos 10 dígitos";
          }
        }
      }

      setErrors(newErrors);
    } else {
      // Limpar erro específico do campo para outros campos
      if (errors[name]) {
        setErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    } else if (formData.nome.length < 2) {
      newErrors.nome = "Nome deve ter pelo menos 2 caracteres";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    // REMOVIDA VALIDAÇÃO DE TELEFONE - aceita qualquer valor

    // Validação mais flexível para CPF - aceita tanto formatado quanto só números
    if (formData.cpf) {
      const cpfLimpo = formData.cpf.replace(/\D/g, "");
      const cpfFormatado = formatCPF(formData.cpf);

      // Aceita CPF com 11 dígitos (limpo) ou no formato xxx.xxx.xxx-xx
      if (
        cpfLimpo.length === 11 ||
        /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpfFormatado)
      ) {
        // CPF válido - não adiciona erro
      } else {
        newErrors.cpf = "CPF deve ter 11 dígitos";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Preparar dados para envio
    const dataToSubmit: Partial<ProfileData> = {
      nome: formData.nome.trim(),
      email: formData.email.trim(),
      telefone: formData.telefone ? formData.telefone.replace(/\D/g, "") : "",
      cpf: formData.cpf ? formData.cpf.replace(/\D/g, "") : "",
      foto: formData.foto,
      data_nascimento: formData.data_nascimento || undefined, // Incluir data_nascimento para todos os usuários
    };

    // Incluir username se foi fornecido
    if (formData.username) {
      dataToSubmit.username = formData.username.trim();
    }

    // Incluir senha apenas se o usuário realmente quer alterar a senha
    if (formData.nova_senha || formData.confirmar_senha) {
      dataToSubmit.senha_atual = formData.senha_atual;
      dataToSubmit.nova_senha = formData.nova_senha;
      dataToSubmit.confirmar_senha = formData.confirmar_senha;
    }

    // Se é aluno, incluir campos específicos
    if (tipoUsuario === "aluno") {
      dataToSubmit.data_nascimento = formData.data_nascimento;
      dataToSubmit.genero = formData.genero;
      dataToSubmit.telefone_emergencia = formData.telefone_emergencia;
      dataToSubmit.nome_contato_emergencia = formData.nome_contato_emergencia;
      dataToSubmit.responsavel_nome = formData.responsavel_nome;
      dataToSubmit.responsavel_cpf = formData.responsavel_cpf
        ? formData.responsavel_cpf.replace(/\D/g, "")
        : "";
      dataToSubmit.responsavel_telefone = formData.responsavel_telefone
        ? formData.responsavel_telefone.replace(/\D/g, "")
        : "";
      dataToSubmit.responsavel_parentesco = formData.responsavel_parentesco;
      // Dados médicos
      dataToSubmit.observacoes_medicas = formData.observacoes_medicas;
      dataToSubmit.alergias = formData.alergias;
      dataToSubmit.medicamentos_uso_continuo =
        formData.medicamentos_uso_continuo;
      dataToSubmit.plano_saude = formData.plano_saude;
      dataToSubmit.atestado_medico_validade = formData.atestado_medico_validade;
      dataToSubmit.restricoes_medicas = formData.restricoes_medicas;
      // Dados financeiros
      dataToSubmit.dia_vencimento = formData.dia_vencimento;
      dataToSubmit.valor_mensalidade = formData.valor_mensalidade;
      dataToSubmit.desconto_percentual = formData.desconto_percentual;
      // Graduação
      dataToSubmit.data_ultima_graduacao = formData.data_ultima_graduacao;
      // Observações e LGPD
      dataToSubmit.observacoes = formData.observacoes;
      dataToSubmit.consent_lgpd = formData.consent_lgpd;
      dataToSubmit.consent_imagem = formData.consent_imagem;
      // Dados de endereço
      dataToSubmit.cep = formData.cep ? formData.cep.replace(/\D/g, "") : "";
      dataToSubmit.logradouro = formData.logradouro;
      dataToSubmit.numero = formData.numero;
      dataToSubmit.complemento = formData.complemento;
      dataToSubmit.bairro = formData.bairro;
      dataToSubmit.cidade = formData.cidade;
      dataToSubmit.uf = formData.uf;
      // Unidade
      dataToSubmit.unidade_id = formData.unidade_id;
    }

    // Se é professor, incluir campos específicos
    if (tipoUsuario === "professor") {
      dataToSubmit.data_nascimento = formData.data_nascimento;
      dataToSubmit.genero = formData.genero;
      dataToSubmit.data_inicio_docencia = formData.data_inicio_docencia;
      dataToSubmit.registro_profissional = formData.registro_profissional;
      // Dados de endereço
      dataToSubmit.cep = formData.cep ? formData.cep.replace(/\D/g, "") : "";
      dataToSubmit.logradouro = formData.logradouro;
      dataToSubmit.numero = formData.numero;
      dataToSubmit.complemento = formData.complemento;
      dataToSubmit.bairro = formData.bairro;
      dataToSubmit.cidade = formData.cidade;
      dataToSubmit.uf = formData.uf;
      // Unidade
      dataToSubmit.unidade_id = formData.unidade_id;
    }

    // Se é franqueado, incluir campos específicos (endereço e dados da franquia)
    if (tipoUsuario === "franqueado") {
      dataToSubmit.data_nascimento = formData.data_nascimento;
      dataToSubmit.nome_franquia = formData.nome_franquia;
      dataToSubmit.email_franquia = formData.email_franquia;
      dataToSubmit.telefone_franquia = formData.telefone_franquia;
      dataToSubmit.cpf_franquia = formData.cpf_franquia
        ? formData.cpf_franquia.replace(/\D/g, "")
        : "";
      dataToSubmit.cep = formData.cep ? formData.cep.replace(/\D/g, "") : "";
      dataToSubmit.logradouro = formData.logradouro;
      dataToSubmit.numero = formData.numero;
      dataToSubmit.complemento = formData.complemento;
      dataToSubmit.bairro = formData.bairro;
      dataToSubmit.cidade = formData.cidade;
      dataToSubmit.uf = formData.uf;
    }

    // Remover campos vazios
    Object.keys(dataToSubmit).forEach((key) => {
      const value = dataToSubmit[key as keyof ProfileData];
      if (!value || value === "") {
        delete dataToSubmit[key as keyof ProfileData];
      }
    });

    updateProfileMutation.mutate(dataToSubmit);
  };

  if (authLoading || loadingAluno) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">
            {authLoading
              ? "Verificando autenticação..."
              : "Carregando dados do perfil..."}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Meu Perfil
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-gray-600">
                Atualize suas informações pessoais
              </p>
              {tipoUsuario && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    tipoUsuario === "aluno"
                      ? "bg-blue-100 text-blue-800"
                      : tipoUsuario === "professor"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                ></span>
              )}
            </div>
          </div>

          {/* Mensagens */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm font-medium">
                ✅ {successMessage}
              </p>
            </div>
          )}

          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm font-medium">
                ❌ {errors.general}
              </p>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção de Foto de Perfil */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                📸 Foto de Perfil
              </h3>

              <div className="flex items-center gap-6">
                {/* Preview da Foto */}
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300 flex-shrink-0">
                  {formData.foto ? (
                    <img
                      src={formData.foto}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                      {formData.nome?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>

                {/* Controles de Upload */}
                <div className="flex-1">
                  <div className="flex flex-wrap gap-3">
                    <label
                      htmlFor="foto-input"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors text-sm font-medium"
                    >
                      {formData.foto ? "Alterar Foto" : "Adicionar Foto"}
                    </label>

                    {formData.foto && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, foto: "" }))
                        }
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Formatos aceitos: JPG, PNG, WEBP • Tamanho máximo: 2MB
                  </p>

                  <input
                    type="file"
                    id="foto-input"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validar tamanho (2MB)
                        if (file.size > 2 * 1024 * 1024) {
                          setErrors((prev) => ({
                            ...prev,
                            foto: "Imagem muito grande. Máximo 2MB",
                          }));
                          e.target.value = "";
                          return;
                        }

                        // Ler e converter para base64
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData((prev) => ({
                            ...prev,
                            foto: reader.result as string,
                          }));
                          setErrors((prev) => ({ ...prev, foto: "" }));
                        };
                        reader.onerror = () => {
                          setErrors((prev) => ({
                            ...prev,
                            foto: "Erro ao carregar imagem",
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />

                  {errors.foto && (
                    <p className="mt-2 text-sm text-red-600">{errors.foto}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção de Dados do Usuário */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                👤 Dados do Usuário
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="seu.username"
                    minLength={3}
                    pattern="^[a-zA-Z0-9.]+$"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Apenas letras, números e ponto. Mínimo 3 caracteres
                  </p>
                </div>

                {/* Nome Completo */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="nome"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.nome ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Digite seu nome completo"
                    required
                  />
                  {errors.nome && (
                    <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
                  )}
                </div>

                {/* Email */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="seuemail@exemplo.com"
                    required
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Telefone */}
                <div>
                  <label
                    htmlFor="telefone"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Telefone
                  </label>
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.telefone ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                  {errors.telefone && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.telefone}
                    </p>
                  )}
                </div>

                {/* CPF */}
                <div>
                  <label
                    htmlFor="cpf"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    CPF
                  </label>
                  <input
                    type="text"
                    id="cpf"
                    name="cpf"
                    value={formatCPF(formData.cpf)}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.cpf ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {errors.cpf && (
                    <p className="mt-1 text-sm text-red-600">{errors.cpf}</p>
                  )}
                </div>

                {/* Data de Nascimento */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="data_nascimento_usuario"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    id="data_nascimento_usuario"
                    name="data_nascimento"
                    value={formData.data_nascimento || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Seção específica para Alunos */}
            {tipoUsuario === "aluno" && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  📚 Dados Acadêmicos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Data de Nascimento */}
                  <div>
                    <label
                      htmlFor="data_nascimento"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      id="data_nascimento"
                      name="data_nascimento"
                      value={formData.data_nascimento || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Gênero */}
                  <div>
                    <label
                      htmlFor="genero"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Gênero
                    </label>
                    <select
                      id="genero"
                      name="genero"
                      value={formData.genero || "MASCULINO"}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMININO">Feminino</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>

                  {/* Telefone de Emergência */}
                  <div>
                    <label
                      htmlFor="telefone_emergencia"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Telefone de Emergência
                    </label>
                    <input
                      type="tel"
                      id="telefone_emergencia"
                      name="telefone_emergencia"
                      value={formData.telefone_emergencia || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>

                  {/* Nome do Contato de Emergência */}
                  <div>
                    <label
                      htmlFor="nome_contato_emergencia"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nome do Contato de Emergência
                    </label>
                    <input
                      type="text"
                      id="nome_contato_emergencia"
                      name="nome_contato_emergencia"
                      value={formData.nome_contato_emergencia || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome da pessoa para contato"
                    />
                  </div>
                </div>

                {/* Dados de Matrícula (somente leitura) */}
                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    🎓 Informações de Matrícula
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Número de Matrícula
                      </label>
                      <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md">
                        {formData.numero_matricula || "Não informado"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Data de Matrícula
                      </label>
                      <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md">
                        {formData.data_matricula
                          ? new Date(
                              formData.data_matricula
                            ).toLocaleDateString("pt-BR")
                          : "Não informado"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Graduação Atual
                      </label>
                      <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md">
                        {formData.faixa_atual
                          ? `${formData.faixa_atual} - ${
                              formData.graus || 0
                            } grau(s)`
                          : "Não informado"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dados do Responsável (se existir) */}
                {(formData.responsavel_nome ||
                  formData.responsavel_cpf ||
                  formData.responsavel_telefone) && (
                  <div className="mt-6 bg-amber-50 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-gray-900 mb-3">
                      👨‍👩‍👧‍👦 Dados do Responsável
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label
                          htmlFor="responsavel_nome"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Nome do Responsável
                        </label>
                        <input
                          type="text"
                          id="responsavel_nome"
                          name="responsavel_nome"
                          value={formData.responsavel_nome || ""}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Nome completo do responsável"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="responsavel_cpf"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          CPF do Responsável
                        </label>
                        <input
                          type="text"
                          id="responsavel_cpf"
                          name="responsavel_cpf"
                          value={formData.responsavel_cpf || ""}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="responsavel_telefone"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Telefone do Responsável
                        </label>
                        <input
                          type="tel"
                          id="responsavel_telefone"
                          name="responsavel_telefone"
                          value={formData.responsavel_telefone || ""}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="(11) 99999-9999"
                          maxLength={15}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="responsavel_parentesco"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Parentesco
                        </label>
                        <input
                          type="text"
                          id="responsavel_parentesco"
                          name="responsavel_parentesco"
                          value={formData.responsavel_parentesco || ""}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Pai, Mãe, Tio(a), etc."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Data da Última Graduação */}
                <div className="mt-6 bg-purple-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    🏆 Graduação
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="data_ultima_graduacao"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Data da Última Graduação
                      </label>
                      <input
                        type="date"
                        id="data_ultima_graduacao"
                        name="data_ultima_graduacao"
                        value={formData.data_ultima_graduacao || ""}
                        onChange={handleChange}
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Data que você recebeu sua faixa atual
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dados Médicos */}
                <div className="mt-6 bg-red-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    🏥 Dados Médicos
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="plano_saude"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Plano de Saúde
                      </label>
                      <input
                        type="text"
                        id="plano_saude"
                        name="plano_saude"
                        value={formData.plano_saude || ""}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome do plano de saúde"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="atestado_medico_validade"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Validade do Atestado Médico
                      </label>
                      <input
                        type="date"
                        id="atestado_medico_validade"
                        name="atestado_medico_validade"
                        value={formData.atestado_medico_validade || ""}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="alergias"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Alergias
                      </label>
                      <textarea
                        id="alergias"
                        name="alergias"
                        value={formData.alergias || ""}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Descreva alergias conhecidas"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="medicamentos_uso_continuo"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Medicamentos de Uso Contínuo
                      </label>
                      <textarea
                        id="medicamentos_uso_continuo"
                        name="medicamentos_uso_continuo"
                        value={formData.medicamentos_uso_continuo || ""}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Liste medicamentos de uso contínuo"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="restricoes_medicas"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Restrições Médicas
                      </label>
                      <textarea
                        id="restricoes_medicas"
                        name="restricoes_medicas"
                        value={formData.restricoes_medicas || ""}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Descreva restrições médicas para atividades físicas"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="observacoes_medicas"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Observações Médicas
                      </label>
                      <textarea
                        id="observacoes_medicas"
                        name="observacoes_medicas"
                        value={formData.observacoes_medicas || ""}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Outras observações médicas relevantes"
                      />
                    </div>
                  </div>
                </div>

                {/* Dados Financeiros */}
                <div className="mt-6 bg-green-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    💰 Dados Financeiros
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="dia_vencimento"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Dia de Vencimento
                      </label>
                      <input
                        type="number"
                        id="dia_vencimento"
                        name="dia_vencimento"
                        value={formData.dia_vencimento || ""}
                        onChange={handleChange}
                        min="1"
                        max="31"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 10"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Dia do mês para vencimento
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="valor_mensalidade"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Valor da Mensalidade
                      </label>
                      <input
                        type="number"
                        id="valor_mensalidade"
                        name="valor_mensalidade"
                        value={formData.valor_mensalidade || ""}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 150.00"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="desconto_percentual"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Desconto (%)
                      </label>
                      <input
                        type="number"
                        id="desconto_percentual"
                        name="desconto_percentual"
                        value={formData.desconto_percentual || 0}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 10"
                      />
                    </div>
                  </div>
                </div>

                {/* Observações Gerais */}
                <div className="mt-6">
                  <label
                    htmlFor="observacoes"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    📝 Observações Gerais
                  </label>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    value={formData.observacoes || ""}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações adicionais sobre o aluno"
                  />
                </div>

                {/* LGPD */}
                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    🔒 Consentimentos LGPD
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="consent_lgpd"
                        name="consent_lgpd"
                        checked={formData.consent_lgpd || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            consent_lgpd: e.target.checked,
                          })
                        }
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="consent_lgpd"
                        className="ml-3 text-sm text-gray-700"
                      >
                        Autorizo o uso dos meus dados pessoais conforme a LGPD
                        (Lei Geral de Proteção de Dados)
                      </label>
                    </div>

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="consent_imagem"
                        name="consent_imagem"
                        checked={formData.consent_imagem || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            consent_imagem: e.target.checked,
                          })
                        }
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="consent_imagem"
                        className="ml-3 text-sm text-gray-700"
                      >
                        Autorizo o uso de imagem para divulgação nas redes
                        sociais e materiais de marketing
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Seção específica para Franqueado */}
            {tipoUsuario === "franqueado" && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  🏢 Dados da Franquia
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome da Franquia */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="nome_franquia"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nome da Franquia *
                    </label>
                    <input
                      type="text"
                      id="nome_franquia"
                      name="nome_franquia"
                      value={formData.nome_franquia || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome da franquia"
                    />
                  </div>

                  {/* Email da Franquia */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="email_franquia"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email da Franquia *
                    </label>
                    <input
                      type="email"
                      id="email_franquia"
                      name="email_franquia"
                      value={formData.email_franquia || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@franquia.com"
                    />
                  </div>

                  {/* Telefone da Franquia */}
                  <div>
                    <label
                      htmlFor="telefone_franquia"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Telefone da Franquia
                    </label>
                    <input
                      type="tel"
                      id="telefone_franquia"
                      name="telefone_franquia"
                      value={formData.telefone_franquia || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg mt-4">
                  <p className="text-sm text-gray-500">
                    Situação:{" "}
                    <strong>{dadosFranqueado?.situacao || "ATIVA"}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Dados de Endereço */}
            {(tipoUsuario === "aluno" ||
              tipoUsuario === "professor" ||
              tipoUsuario === "franqueado") && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  📍 Endereço
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="cep"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      CEP
                    </label>
                    <input
                      type="text"
                      id="cep"
                      name="cep"
                      value={formData.cep || ""}
                      onChange={handleChange}
                      onBlur={(e) => buscarCEP(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.cep ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.cep && (
                      <p className="mt-1 text-xs text-red-600">{errors.cep}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="logradouro"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Logradouro
                    </label>
                    <input
                      type="text"
                      id="logradouro"
                      name="logradouro"
                      value={formData.logradouro}
                      onChange={handleChange}
                      placeholder="Rua, Avenida, etc."
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="numero"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Número
                    </label>
                    <input
                      type="text"
                      id="numero"
                      name="numero"
                      value={formData.numero}
                      onChange={handleChange}
                      placeholder="123"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="complemento"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Complemento
                    </label>
                    <input
                      type="text"
                      id="complemento"
                      name="complemento"
                      value={formData.complemento}
                      onChange={handleChange}
                      placeholder="Apto, Casa, etc."
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bairro"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Bairro
                    </label>
                    <input
                      type="text"
                      id="bairro"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleChange}
                      placeholder="Nome do bairro"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cidade"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Cidade
                    </label>
                    <input
                      type="text"
                      id="cidade"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleChange}
                      placeholder="Nome da cidade"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="uf"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      UF
                    </label>
                    <select
                      id="uf"
                      name="uf"
                      value={formData.uf}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione</option>
                      <option value="AC">AC</option>
                      <option value="AL">AL</option>
                      <option value="AP">AP</option>
                      <option value="AM">AM</option>
                      <option value="BA">BA</option>
                      <option value="CE">CE</option>
                      <option value="DF">DF</option>
                      <option value="ES">ES</option>
                      <option value="GO">GO</option>
                      <option value="MA">MA</option>
                      <option value="MT">MT</option>
                      <option value="MS">MS</option>
                      <option value="MG">MG</option>
                      <option value="PA">PA</option>
                      <option value="PB">PB</option>
                      <option value="PR">PR</option>
                      <option value="PE">PE</option>
                      <option value="PI">PI</option>
                      <option value="RJ">RJ</option>
                      <option value="RN">RN</option>
                      <option value="RS">RS</option>
                      <option value="RO">RO</option>
                      <option value="RR">RR</option>
                      <option value="SC">SC</option>
                      <option value="SP">SP</option>
                      <option value="SE">SE</option>
                      <option value="TO">TO</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Dados de Unidade */}
            {(tipoUsuario === "aluno" || tipoUsuario === "professor") && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  🏢 Unidade
                </h3>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="unidade_id"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Unidade Atual
                    </label>
                    <select
                      id="unidade_id"
                      name="unidade_id"
                      value={formData.unidade_id}
                      onChange={(e) => handleUnidadeChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma unidade</option>
                      {unidades?.map((unidade: Unidade) => (
                        <option key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Aviso de mudança de unidade */}
                  {warningMessage && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <span className="text-amber-600">⚠️</span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-amber-700">
                            {warningMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informações do perfil (somente leitura) */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Informações da Conta
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Perfil
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {user?.perfis
                      ?.map((p: string | { nome: string }) =>
                        typeof p === "string" ? p : p.nome
                      )
                      .join(", ") || "Não definido"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Status da Conta
                  </label>
                  <p className="text-sm bg-gray-50 px-3 py-2 rounded-md">
                    {tipoUsuario === "franqueado" && dadosFranqueado ? (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          dadosFranqueado.situacao === "ATIVA"
                            ? "bg-green-100 text-green-800"
                            : dadosFranqueado.situacao === "EM_HOMOLOGACAO"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {dadosFranqueado.situacao === "ATIVA"
                          ? "✅ Ativo"
                          : dadosFranqueado.situacao === "EM_HOMOLOGACAO"
                          ? "⏳ Em Homologação"
                          : "❌ Inativo"}
                      </span>
                    ) : user?.perfis?.includes("GERENTE_UNIDADE") &&
                      dadosGerente ? (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          dadosGerente.ativo && user?.ativo
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {dadosGerente.ativo && user?.ativo
                          ? "✅ Ativo"
                          : "❌ Inativo"}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user?.ativo
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user?.ativo ? "✅ Ativo" : "❌ Inativo"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Alteração de Senha */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                🔒 Alterar Senha
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="senha_atual"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Senha Atual
                  </label>
                  <div className="relative">
                    <input
                      type={showSenhaAtual ? "text" : "password"}
                      id="senha_atual"
                      name="senha_atual"
                      value={formData.senha_atual || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite sua senha atual"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showSenhaAtual ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="nova_senha"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNovaSenha ? "text" : "password"}
                      id="nova_senha"
                      name="nova_senha"
                      value={formData.nova_senha || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite a nova senha"
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNovaSenha(!showNovaSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showNovaSenha ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmar_senha"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmarSenha ? "text" : "password"}
                      id="confirmar_senha"
                      name="confirmar_senha"
                      value={formData.confirmar_senha || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Confirme a nova senha"
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showConfirmarSenha ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  💡 Deixe em branco se não quiser alterar a senha. A nova senha
                  deve ter no mínimo 6 caracteres.
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateProfileMutation.isPending
                  ? "Salvando..."
                  : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
