"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

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
  faixa_ministrante?: string;
  data_inicio_docencia?: string;
  registro_profissional?: string;
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
        const errorText = await response.text();
        console.error("[DEBUG] Erro ao buscar aluno:", errorText);
        throw new Error("Erro ao carregar dados do aluno");
      }

      const data = await response.json();
      return data;
    },
    enabled: !!user?.id,
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
        throw new Error("Erro ao carregar dados do professor");
      }

      return response.json();
    },
    enabled: !!user?.id,
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
        throw new Error("Erro ao carregar dados do franqueado");
      }

      return response.json();
    },
    enabled: !!user?.id,
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
          data_nascimento: dadosAluno.data_nascimento || "",
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
          data_nascimento: dadosProfessor.data_nascimento || "",
          genero: dadosProfessor.genero || "",
          faixa_ministrante: dadosProfessor.faixa_ministrante || "",
          data_inicio_docencia: dadosProfessor.data_inicio_docencia || "",
          registro_profissional: dadosProfessor.registro_profissional || "",
        };
      }
      // Se é franqueado, usar dados da entidade franqueado
      else if (dadosFranqueado) {
        setTipoUsuario("franqueado");
        dadosCompletos = {
          ...dadosCompletos,
          nome: dadosFranqueado.nome || user.nome || "",
          email: dadosFranqueado.email || user.email || "",
          telefone: dadosFranqueado.telefone || user.telefone || "",
          cpf: dadosFranqueado.cpf || user.cpf || "",
        };
      }
      // Se não é aluno nem professor nem franqueado, usar apenas dados básicos do usuário
      else {
        setTipoUsuario("usuario");
      }

      // Adicionar username de todos os usuários
      dadosCompletos.username = user.username || "";

      // Adicionar dados de endereço e unidade se existirem
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
  }, [user, dadosAluno, dadosProfessor, dadosFranqueado]);

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

      // Validar senha se fornecida
      if (data.nova_senha || data.confirmar_senha || data.senha_atual) {
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
      case "email":
        // Email não precisa de formatação especial
        break;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

    // Limpar erro específico do campo
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
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

    if (
      formData.telefone &&
      !/^\(\d{2}\) \d{4,5}-\d{4}$/.test(formData.telefone)
    ) {
      newErrors.telefone = "Telefone deve estar no formato (xx) xxxxx-xxxx";
    }

    if (formData.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(formData.cpf)) {
      newErrors.cpf = "CPF deve estar no formato xxx.xxx.xxx-xx";
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
    };

    // Incluir username se foi fornecido
    if (formData.username) {
      dataToSubmit.username = formData.username.trim();
    }

    // Incluir senha se foi fornecida
    if (formData.senha_atual || formData.nova_senha) {
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
    }

    // Se é professor, incluir campos específicos
    if (tipoUsuario === "professor") {
      dataToSubmit.data_nascimento = formData.data_nascimento;
      dataToSubmit.genero = formData.genero;
      dataToSubmit.data_inicio_docencia = formData.data_inicio_docencia;
      dataToSubmit.registro_profissional = formData.registro_profissional;
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
                  <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
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
                  value={formData.cpf}
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
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Seção específica para Franqueado */}
            {tipoUsuario === "franqueado" && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  🏢 Dados da Franquia
                </h3>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    ℹ️ Os dados da franquia (nome, email, telefone, CPF) são
                    exibidos acima nos campos básicos.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
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
                      value={formData.cep}
                      onChange={handleChange}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user?.ativo
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user?.ativo ? "✅ Ativo" : "❌ Inativo"}
                    </span>
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
                  <input
                    type="password"
                    id="senha_atual"
                    name="senha_atual"
                    value={formData.senha_atual || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite sua senha atual"
                    autoComplete="current-password"
                  />
                </div>

                <div>
                  <label
                    htmlFor="nova_senha"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    id="nova_senha"
                    name="nova_senha"
                    value={formData.nova_senha || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite a nova senha"
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmar_senha"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    id="confirmar_senha"
                    name="confirmar_senha"
                    value={formData.confirmar_senha || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirme a nova senha"
                    autoComplete="new-password"
                    minLength={6}
                  />
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
