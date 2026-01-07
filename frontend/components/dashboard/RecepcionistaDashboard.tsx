"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUnidades, listAlunos } from "@/lib/peopleApi";
import { getAulas } from "@/lib/aulasApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Users,
  CheckCircle,
  Clock,
  Search,
  QrCode,
  UserCheck,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  Check,
  DollarSign,
  Mail,
  BarChart3,
} from "lucide-react";
import { toast } from "react-hot-toast";
import ConviteModal from "@/components/convites/ConviteModal";

interface CheckInModalData {
  isOpen: boolean;
  aluno?: {
    id: string;
    nome_completo: string;
    numero_matricula: string;
    faixa_atual: string;
  };
}

export default function RecepcionistaDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchAluno, setSearchAluno] = useState("");
  const [checkInModal, setCheckInModal] = useState<CheckInModalData>({
    isOpen: false,
  });
  const [conviteModalOpen, setConviteModalOpen] = useState(false);

  // Buscar a unidade do recepcionista
  const { data: unidadesData, isLoading: loadingUnidade } = useQuery({
    queryKey: ["unidade-recepcionista", user?.id],
    queryFn: async () => {
      const result = await listUnidades({ pageSize: 1 });
      return result;
    },
    enabled: !!user?.id,
  });

  const unidade = unidadesData?.items?.[0];

  // Buscar aulas de hoje (dia da semana atual)
  const diaSemanaHoje = new Date().getDay(); // 0 = domingo, 1 = segunda, etc.
  const { data: aulasHoje = [], isLoading: loadingAulas } = useQuery({
    queryKey: ["aulas-hoje", unidade?.id, diaSemanaHoje],
    queryFn: async () => {
      if (!unidade?.id) return [];
      return getAulas({
        unidade_id: unidade.id,
        dia_semana: diaSemanaHoje,
        ativo: true,
      });
    },
    enabled: !!unidade?.id,
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });

  // Verificar se há aulas acontecendo agora
  const aulaAtual = aulasHoje.find((aula) => {
    try {
      const agora = new Date();
      const inicio = new Date(aula.data_hora_inicio);
      const fim = new Date(aula.data_hora_fim);
      
      return agora >= inicio && agora <= fim;
    } catch (error) {
      console.error("Erro ao verificar horário da aula:", error);
      return false;
    }
  });

  const temAulaAgora = !!aulaAtual;

  // Formatar horários para exibição
  const aulasFormatadas = aulasHoje.map((aula) => ({
    ...aula,
    horarioInicio: new Date(aula.data_hora_inicio).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    horarioFim: new Date(aula.data_hora_fim).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  // Buscar alunos da unidade
  const { data: alunosData, isLoading: loadingAlunos } = useQuery({
    queryKey: ["alunos-unidade-recep", unidade?.id, searchAluno],
    queryFn: async () => {
      if (!unidade?.id) return { items: [] };
      const result = await listAlunos({
        pageSize: 100,
        unidade_id: unidade.id,
        search: searchAluno || undefined,
      });
      return result;
    },
    enabled: !!unidade?.id,
  });

  // Buscar check-ins de hoje
  const { data: checkInsData } = useQuery({
    queryKey: ["checkins-hoje", unidade?.id],
    queryFn: async () => {
      if (!unidade?.id) return { total: 0 };
      const token = localStorage.getItem("token");
      const hoje = new Date().toISOString().split("T")[0];
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/relatorio-presencas?dataInicio=${hoje}&dataFim=${hoje}&unidadeId=${unidade.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        console.error("Erro ao buscar check-ins:", response.status);
        return { total: 0 };
      }
      
      const data = await response.json();
      console.log("Check-ins recebidos:", data);
      
      // O backend agora retorna um array diretamente
      const checkIns = Array.isArray(data) ? data : [];
      const total = checkIns.length;
      console.log("Total de check-ins hoje:", total);
      
      return { total, checkIns };
    },
    enabled: !!unidade?.id,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const alunos = alunosData?.items || [];
  const alunosAtivos = alunos.filter(
    (a: { status?: string; ativo?: boolean }) => a.status === "ATIVO" || a.ativo
  );
  
  // Lista de IDs dos alunos que já fizeram check-in hoje
  const alunosComCheckIn = new Set(
    (checkInsData?.checkIns || []).map((c: any) => c.aluno?.id)
  );

  // Mutation para check-in manual
  const checkInMutation = useMutation({
    mutationFn: async (alunoId: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presenca/checkin-manual`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            aluno_id: alunoId,
            // Pode adicionar aula_id se necessário
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao registrar check-in");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Check-in registrado com sucesso!");
      setCheckInModal({ isOpen: false });
      queryClient.invalidateQueries({ queryKey: ["alunos-unidade-recep"] });
      queryClient.invalidateQueries({ queryKey: ["checkins-hoje"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao registrar check-in");
    },
  });

  const handleCheckIn = (aluno: {
    id: string;
    nome_completo: string;
    numero_matricula: string;
    faixa_atual: string;
  }) => {
    setCheckInModal({
      isOpen: true,
      aluno,
    });
  };

  const confirmCheckIn = () => {
    if (checkInModal.aluno) {
      checkInMutation.mutate(checkInModal.aluno.id);
    }
  };

  const stats = {
    totalAlunos: alunos.length,
    alunosAtivos: alunosAtivos.length,
    checkInsHoje: checkInsData?.total || 0,
    aulasHoje: aulasHoje.length,
  };

  const isLoading = loadingUnidade || loadingAlunos || loadingAulas;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!unidade) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Unidade não encontrada
          </h2>
          <p className="text-gray-600 mb-4">
            Seu usuário não está vinculado a nenhuma unidade.
          </p>
          <p className="text-sm text-gray-500">
            Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "Enviar Convite",
      description: "Link de cadastro para aluno",
      icon: Mail,
      action: () => setConviteModalOpen(true),
      color: "bg-blue-500",
    },
    {
      title: "TeamCruz Dashboard",
      description: "Ver estatísticas e visão geral",
      icon: BarChart3,
      action: () => router.push("/teamcruz"),
      color: "bg-red-600",
    },
    {
      title: "Aprovar Check-ins",
      description: "Aprovar check-ins do tablet",
      icon: UserCheck,
      action: () => router.push("/checkin/aprovacao"),
      color: "bg-purple-500",
    },
    {
      title: "Relatório de Presenças",
      description: "Ver relatório completo de presenças",
      icon: CheckCircle,
      action: () => router.push("/relatorio-presencas"),
      color: "bg-green-600",
    },
    {
      title: "Horários",
      description: "Ver horários das aulas",
      icon: Calendar,
      action: () => router.push("/horarios"),
      color: "bg-cyan-500",
    },
    {
      title: "Contas a Receber",
      description: "Gerenciar faturas de alunos",
      icon: DollarSign,
      action: () => router.push("/financeiro/a-receber"),
      color: "bg-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Recepção</h1>
                <p className="text-gray-600">
                  Bem-vindo, <span className="font-semibold">{user?.nome}</span>
                  !
                </p>
              </div>
            </div>

            {/* Badge da Unidade - Destacado */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
              <Building2 className="h-5 w-5" />
              <div className="text-left">
                <p className="text-xs font-medium opacity-90">Unidade</p>
                <p className="text-lg font-bold">
                  {unidade?.nome || "Carregando..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Alunos Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.alunosAtivos}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalAlunos} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Check-ins Hoje
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.checkInsHoje}
              </div>
              <p className="text-xs text-muted-foreground">
                Presenças registradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aulas Hoje</CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.aulasHoje}
              </div>
              <p className="text-xs text-muted-foreground">Aulas programadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unidade</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{unidade.nome}</div>
              <p className="text-xs text-muted-foreground">
                {unidade.capacidade_max_alunos || "-"} alunos máx
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-105"
                onClick={action.action}
              >
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
            ))}
          </div>
        </div>

        {/* Lista de Alunos para Check-in - Só aparece se houver aula no horário */}
        {temAulaAgora ? (
          <Card id="lista-alunos">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Check-in de Alunos
                </CardTitle>
                <CardDescription>
                  Aula em andamento: {aulaAtual?.nome || "Aula Regular"} (
                  {new Date(aulaAtual.data_hora_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - 
                  {new Date(aulaAtual.data_hora_fim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})
                </CardDescription>
              </div>
            </CardHeader>
          <CardContent>
            {/* Busca */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar aluno por nome, matrícula ou CPF..."
                  value={searchAluno}
                  onChange={(e) => setSearchAluno(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lista de Alunos */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {alunosAtivos.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchAluno
                      ? "Nenhum aluno encontrado"
                      : "Nenhum aluno ativo nesta unidade"}
                  </p>
                </div>
              ) : (
                alunosAtivos.map(
                  (aluno: {
                    id: string;
                    nome_completo: string;
                    numero_matricula: string;
                    faixa_atual: string;
                    cpf: string;
                  }) => (
                    <div
                      key={aluno.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {aluno.nome_completo}
                          </h3>
                          <div className="flex gap-3 text-sm text-gray-600">
                            <span>Mat: {aluno.numero_matricula || "N/A"}</span>
                            <span>•</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                aluno.faixa_atual
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {aluno.faixa_atual || "Sem faixa"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {alunosComCheckIn.has(aluno.id) ? (
                        <Button
                          disabled
                          className="bg-gray-400 cursor-not-allowed"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Já fez check-in
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleCheckIn(aluno)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Check-in
                        </Button>
                      )}
                    </div>
                  )
                )
              )}
            </div>
          </CardContent>
        </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Check-in Indisponível
              </CardTitle>
              <CardDescription>
                O check-in só está disponível durante o horário das aulas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  {aulasHoje.length === 0
                    ? "Não há aulas cadastradas para hoje"
                    : "Não há aulas em andamento no momento"}
                </p>
                {aulasHoje.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Próximas aulas de hoje:</p>
                    <div className="space-y-2">
                      {aulasFormatadas.slice(0, 3).map((aula, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          {aula.horarioInicio} - {aula.horarioFim}: {aula.nome || "Aula Regular"}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  onClick={() => router.push("/horarios")}
                  variant="outline"
                  className="mt-4"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver Horários Completos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Confirmação de Check-in */}
      {checkInModal.isOpen && checkInModal.aluno && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all">
            <div className="text-center">
              {/* Ícone */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>

              {/* Título */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Confirmar Check-in
              </h3>

              {/* Dados do Aluno */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Nome:</span>
                    <p className="font-semibold text-gray-900">
                      {checkInModal.aluno.nome_completo}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Matrícula:</span>
                    <p className="font-medium text-gray-700">
                      {checkInModal.aluno.numero_matricula || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Faixa:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        checkInModal.aluno.faixa_atual
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {checkInModal.aluno.faixa_atual || "Sem faixa"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mensagem */}
              <p className="text-gray-600 mb-8 text-sm">
                Tem certeza que deseja registrar a presença deste aluno?
              </p>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setCheckInModal({ isOpen: false })}
                  disabled={checkInMutation.isPending}
                  className="px-6 py-3 text-gray-700 border-gray-300 hover:bg-gray-50 rounded-xl font-medium"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={confirmCheckIn}
                  disabled={checkInMutation.isPending}
                  className="px-6 py-3 rounded-xl font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  {checkInMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Convite */}
      <ConviteModal
        isOpen={conviteModalOpen}
        onClose={() => setConviteModalOpen(false)}
        unidadeId={unidade?.id}
      />
    </div>
  );
}
