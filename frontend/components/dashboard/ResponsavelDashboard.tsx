"use client";

import { useAuth } from "@/app/auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import DependenteForm from "@/components/alunos/DependenteForm";
import { http } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type Genero = "MASCULINO" | "FEMININO" | "OUTRO";

interface DependenteFormData {
  nome_completo: string;
  data_nascimento: string;
  genero: Genero;
  cpf?: string;
  observacoes_medicas?: string;
  alergias?: string;
  medicamentos_uso_continuo?: string;
  unidade_id: string;
  email?: string;
  telefone?: string;
  telefone_emergencia?: string;
  nome_contato_emergencia?: string;
  numero_matricula?: string;
  data_matricula?: string;
  faixa_atual?: string;
  graus?: string;
  plano_saude?: string;
  atestado_medico_validade?: string;
  restricoes_medicas?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_telefone?: string;
  responsavel_parentesco?: string;
  dia_vencimento?: string;
  valor_mensalidade?: string;
  desconto_percentual?: string;
  consent_lgpd?: string;
  consent_imagem?: string;
  observacoes?: string;
  [key: string]: string | undefined;
}

interface Aluno {
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

export default function ResponsavelDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loadingCheckin, setLoadingCheckin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDependenteId, setEditingDependenteId] = useState<string | null>(
    null
  );
  const [formData, setFormData] = useState<DependenteFormData>({
    nome_completo: "",
    cpf: "",
    data_nascimento: "",
    genero: "MASCULINO",
    email: "",
    telefone: "",
    telefone_emergencia: "",
    nome_contato_emergencia: "",
    unidade_id: "",
    observacoes_medicas: "",
    alergias: "",
    medicamentos_uso_continuo: "",
  });

  // Buscar alunos vinculados ao responsável
  const {
    data: alunos,
    isLoading: loadingAlunos,
    error,
    refetch,
  } = useQuery<Aluno[]>({
    queryKey: ["meus-dependentes", user?.id],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/alunos/meus-dependentes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        console.error(
          "[RESPONSAVEL DASHBOARD] Erro na resposta:",
          response.status
        );
        throw new Error("Erro ao carregar alunos");
      }
      const data = await response.json();
      return data;
    },
    enabled: !!user?.id,
  });

  // Buscar unidades
  const { data: unidades } = useQuery({
    queryKey: ["unidades-publicas-ativas-v2"],
    queryFn: async () => {
      const data = await http("/unidades/public/ativas", { auth: false });
      return data || [];
    },
    staleTime: 0,
    gcTime: 0,
  });

  const handleEditDependente = (aluno: Aluno) => {
    setIsEditMode(true);
    setEditingDependenteId(aluno.id);
    setFormData({
      nome_completo: aluno.nome_completo || "",
      cpf: (aluno as any).cpf || "",
      data_nascimento: aluno.data_nascimento || "",
      genero: (aluno as any).genero || "MASCULINO",
      email: (aluno as any).email || "",
      telefone: (aluno as any).telefone || "",
      telefone_emergencia: (aluno as any).telefone_emergencia || "",
      nome_contato_emergencia: (aluno as any).nome_contato_emergencia || "",
      unidade_id: (aluno as any).unidade_id || "",
      observacoes_medicas: (aluno as any).observacoes_medicas || "",
      alergias: (aluno as any).alergias || "",
      medicamentos_uso_continuo: (aluno as any).medicamentos_uso_continuo || "",
    });
    setShowModal(true);
  };

  const handleAddAluno = () => {
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir múltiplas submissões
    if (isLoading) return;

    setIsLoading(true);
    try {
      // Corrigir timezone na data de nascimento antes de enviar
      const dataParaEnviar = { ...formData };
      if (dataParaEnviar.data_nascimento) {
        // Garantir que a data seja enviada no formato correto sem conversão de timezone
        const [ano, mes, dia] = dataParaEnviar.data_nascimento.split("-");
        dataParaEnviar.data_nascimento = `${ano}-${mes}-${dia}`;
      }

      if (isEditMode && editingDependenteId) {
        // Editar dependente existente
        const response = await http(`/alunos/${editingDependenteId}`, {
          method: "PATCH",
          body: dataParaEnviar as Record<string, unknown>,
          auth: true,
        });

        if (response) {
          toast.success("Dependente atualizado com sucesso!");
        }
      } else {
        // Criar novo dependente
        const response = await http("/alunos", {
          method: "POST",
          body: dataParaEnviar as Record<string, unknown>,
          auth: true,
        });

        if (response) {
          toast.success("Dependente cadastrado com sucesso!");
        }
      }

      // Limpar e fechar modal
      setShowModal(false);
      setIsEditMode(false);
      setEditingDependenteId(null);
      setFormData({
        nome_completo: "",
        cpf: "",
        data_nascimento: "",
        genero: "MASCULINO",
        email: "",
        telefone: "",
        telefone_emergencia: "",
        nome_contato_emergencia: "",
        unidade_id: "",
        observacoes_medicas: "",
        alergias: "",
        medicamentos_uso_continuo: "",
      });
      refetch(); // Atualizar lista
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

  const handleTornarMeAluno = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/alunos/responsavel-vira-aluno`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Agora você também é um aluno! Redirecionando...");
        setTimeout(() => {
          window.location.reload(); // Recarrega para atualizar o perfil
        }, 2000);
      } else {
        toast.error(result.message || "Erro ao se tornar aluno");
      }
    } catch (error) {
      console.error("Erro ao se tornar aluno:", error);
      toast.error("Erro ao processar solicitação");
    }
  };

  const handleCheckin = async (alunoId: string) => {
    setLoadingCheckin(alunoId);
    try {
      const token = localStorage.getItem("token");

      // Primeiro buscar a aula ativa
      const aulaResponse = await fetch(`${API_URL}/presenca/aula-ativa`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!aulaResponse.ok) {
        console.error("[CHECKIN] Não há aula ativa");
        toast.error("Não há aula ativa no momento");
        return;
      }

      // Pegar o texto antes de parsear
      const aulaText = await aulaResponse.text();

      let aulaAtiva;
      try {
        aulaAtiva = aulaText ? JSON.parse(aulaText) : null;
      } catch (parseError) {
        console.error(
          "[CHECKIN] Erro ao parsear resposta da aula:",
          parseError
        );
        toast.error("Erro ao processar resposta da aula ativa");
        return;
      }

      // Verificar se realmente tem aula ativa
      if (!aulaAtiva || !aulaAtiva.id) {
        console.error("[CHECKIN] Nenhuma aula ativa no momento");
        toast.error("Não há aula ativa no momento");
        return;
      }

      // Fazer check-in usando o ID do aluno

      const checkinResponse = await fetch(
        `${API_URL}/presenca/check-in-dependente`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            alunoId: alunoId,
            aulaId: aulaAtiva.id,
          }),
        }
      );

      const result = await checkinResponse.json();

      if (checkinResponse.ok) {
        toast.success(result.message || "Check-in realizado com sucesso!");
        refetch(); // Atualizar lista
      } else {
        console.error("[CHECKIN] Erro no check-in:", result);
        toast.error(result.message || "Erro ao realizar check-in");
      }
    } catch (error) {
      console.error("[CHECKIN] Erro capturado:", error);
      console.error(
        "[CHECKIN] Stack trace:",
        error instanceof Error ? error.stack : "N/A"
      );
      toast.error("Erro ao processar check-in");
    } finally {
      setLoadingCheckin(null);
    }
  };

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();

    if (
      mesAtual < mesNascimento ||
      (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
    ) {
      idade--;
    }
    return idade;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                Bem-vindo(a), {user?.nome || "Responsável"}!
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Gerencie os treinos dos seus dependentes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Total de Dependentes
              </CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-2xl sm:text-3xl font-bold">
                {alunos?.length || 0}
              </div>
              <p className="text-xs opacity-80 mt-1">Alunos cadastrados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Ativos
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-2xl sm:text-3xl font-bold">
                {alunos?.filter((a) => a.status === "ATIVO").length || 0}
              </div>
              <p className="text-xs opacity-80 mt-1">Treinando regularmente</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Graduações
              </CardTitle>
              <Award className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-2xl sm:text-3xl font-bold">
                {alunos?.reduce(
                  (total, aluno) => total + (aluno.graus || 0),
                  0
                ) || 0}
              </div>
              <p className="text-xs opacity-80 mt-1">
                Total de graus conquistados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Próxima Graduação
              </CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-2xl sm:text-3xl font-bold">
                {alunos?.filter((a) => (a.graus || 0) >= 3).length || 0}
              </div>
              <p className="text-xs opacity-80 mt-1">Elegíveis para avançar</p>
            </CardContent>
          </Card>
        </div>

        {/* Meus Dependentes */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <CardTitle className="text-xl sm:text-2xl">
                  Meus Dependentes
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Gerencie os alunos sob sua responsabilidade
                </p>
              </div>
              <Button
                onClick={handleAddAluno}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Dependente
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAlunos ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando alunos...</p>
              </div>
            ) : alunos && alunos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {alunos.map((aluno) => (
                  <Card
                    key={aluno.id}
                    className="border-2 hover:border-blue-300 transition-colors"
                  >
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-3 sm:mb-4">
                        <div>
                          <h3 className="font-semibold text-base sm:text-lg">
                            {aluno.nome_completo}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500">
                            {calcularIdade(aluno.data_nascimento)} anos
                          </p>
                          {aluno.unidade && (
                            <p className="text-xs text-gray-400 mt-1">
                              📍 {aluno.unidade.nome}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              aluno.status === "ATIVO"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {aluno.status}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDependente(aluno);
                            }}
                            className="h-8 px-2"
                          >
                            Editar
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm">
                          <Award className="h-4 w-4 mr-2 text-yellow-500" />
                          <span>
                            Faixa {aluno.faixa_atual} - {aluno.graus || 0} graus
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={() => handleCheckin(aluno.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                          disabled={
                            aluno.status !== "ATIVO" ||
                            loadingCheckin === aluno.id
                          }
                        >
                          {loadingCheckin === aluno.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2" />
                              <span className="hidden sm:inline">
                                Processando...
                              </span>
                              <span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                              Check-in
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => router.push(`/alunos/${aluno.id}`)}
                          variant="outline"
                          className="flex-1 text-xs sm:text-sm"
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Nenhum dependente cadastrado
                </h3>
                <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6 px-4">
                  Adicione seus dependentes para gerenciar os treinos deles
                </p>
                <Button
                  onClick={handleAddAluno}
                  className="bg-blue-600 hover:bg-blue-700 text-sm"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Dependentes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card para Responsável se tornar Aluno */}
        <Card className="mt-4 sm:mt-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg flex items-center text-green-800">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Quero Treinar Também!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-gray-700">
                Você trouxe seus dependentes para treinar e agora quer
                participar também? Ótimo! Clique no botão abaixo para se
                cadastrar como aluno e começar a treinar conosco.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Mantenha o acesso aos seus dependentes</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Acesse seu próprio dashboard de aluno</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Acompanhe sua evolução e graduações</span>
                </li>
              </ul>
              <Button
                onClick={handleTornarMeAluno}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Quero me Tornar Aluno
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Avisos Importantes */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
              Informações Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>
                  Você pode realizar check-in para seus dependentes menores de
                  idade
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>
                  Acompanhe o progresso e graduações de cada aluno
                  individualmente
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>
                  Mantenha os dados de contato atualizados para receber
                  comunicados da academia
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
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
              email: "",
              telefone: "",
              telefone_emergencia: "",
              nome_contato_emergencia: "",
              unidade_id: "",
              observacoes_medicas: "",
              alergias: "",
              medicamentos_uso_continuo: "",
            });
          }}
          isLoading={false}
          unidades={(() => {
            return unidades || [];
          })()}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
}
