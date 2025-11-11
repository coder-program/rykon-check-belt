"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  GraduationCap,
  Calendar,
  TrendingUp,
  DollarSign,
  Settings,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";

export default function UnidadeDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const unidadeId = params.id as string;

  // Buscar dados da unidade
  const { data: unidade, isLoading } = useQuery({
    queryKey: ["unidade", unidadeId],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades/${unidadeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar unidade");
      }

      const data = await response.json();
      return data;
    },
  });

  // Buscar estatísticas da unidade
  const { data: stats } = useQuery({
    queryKey: ["unidade-stats", unidadeId],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/alunos?unidade_id=${unidadeId}&pageSize=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar estatísticas");
      }

      const data = await response.json();
      const alunos = data.items || [];
      const alunosAtivos = alunos.filter(
        (a: any) => a.status === "ATIVO" || a.ativo
      ).length;

      return {
        totalAlunos: alunos.length,
        alunosAtivos,
        alunosInativos: alunos.length - alunosAtivos,
        ocupacao: unidade?.capacidade_max_alunos
          ? Math.round((alunosAtivos / unidade.capacidade_max_alunos) * 100)
          : 0,
      };
    },
    enabled: !!unidade,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados da unidade...</p>
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
            A unidade solicitada não existe ou você não tem permissão para
            visualizá-la.
          </p>
          <button
            onClick={() => router.push("/unidades")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar para Unidades
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {unidade.nome}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      unidade.status === "ATIVA"
                        ? "bg-green-100 text-green-700"
                        : unidade.status === "HOMOLOGACAO"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {unidade.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    CNPJ: {unidade.cnpj}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push(`/unidades`)}
              className="btn btn-primary gap-2"
            >
              <Settings className="h-4 w-4" />
              Editar Unidade
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Alunos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalAlunos || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.alunosAtivos || 0} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ocupação</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.ocupacao || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.alunosAtivos || 0} de {unidade.capacidade_max_alunos}{" "}
                vagas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Professores</CardTitle>
              <GraduationCap className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {unidade.qtde_instrutores || 0}
              </div>
              <p className="text-xs text-muted-foreground">Instrutores</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Receita Estimada
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R${" "}
                {(
                  (stats?.alunosAtivos || 0) * (unidade.valor_plano_padrao || 0)
                ).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Por mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Informações Detalhadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Dados da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Razão Social
                </label>
                <p className="text-gray-900">{unidade.razao_social || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Nome Fantasia
                </label>
                <p className="text-gray-900">{unidade.nome_fantasia || "-"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    CNPJ
                  </label>
                  <p className="text-gray-900">{unidade.cnpj}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Inscrição Estadual
                  </label>
                  <p className="text-gray-900">
                    {unidade.inscricao_estadual || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Inscrição Municipal
                  </label>
                  <p className="text-gray-900">
                    {unidade.inscricao_municipal || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Informações de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </label>
                <p className="text-gray-900">{unidade.email || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone Fixo
                </label>
                <p className="text-gray-900">{unidade.telefone_fixo || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone Celular
                </label>
                <p className="text-gray-900">
                  {unidade.telefone_celular || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </label>
                {unidade.endereco ? (
                  <>
                    <p className="text-gray-900">
                      {unidade.endereco.logradouro || "-"},{" "}
                      {unidade.endereco.numero || "S/N"}
                      {unidade.endereco.complemento
                        ? ` - ${unidade.endereco.complemento}`
                        : ""}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {unidade.endereco.bairro || "-"} -{" "}
                      {unidade.endereco.cidade || "-"} /{" "}
                      {unidade.endereco.estado || "-"}
                    </p>
                    <p className="text-gray-600 text-sm">
                      CEP: {unidade.endereco.cep || "-"}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500 italic">
                    Endereço não cadastrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estrutura e Capacidade */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Estrutura Física
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <label className="text-sm font-semibold text-blue-700">
                    Quantidade de Tatames
                  </label>
                  <p className="text-2xl font-bold text-blue-600">
                    {unidade.qtde_tatames || 0}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <label className="text-sm font-semibold text-green-700">
                    Área do Tatame
                  </label>
                  <p className="text-2xl font-bold text-green-600">
                    {unidade.area_tatame_m2 || 0} m²
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <label className="text-sm font-semibold text-purple-700">
                    Área Total
                  </label>
                  <p className="text-2xl font-bold text-purple-600">
                    {unidade.area_total_m2 || 0} m²
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <label className="text-sm font-semibold text-orange-700">
                    Capacidade Máxima
                  </label>
                  <p className="text-2xl font-bold text-orange-600">
                    {unidade.capacidade_max_alunos || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Responsável */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Responsável pela Unidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Nome
                </label>
                <p className="text-gray-900">
                  {unidade.responsavel_nome || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  CPF
                </label>
                <p className="text-gray-900">
                  {unidade.responsavel_cpf || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Papel
                </label>
                <p className="text-gray-900">
                  {unidade.responsavel_papel || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Instrutores
                </label>
                <p className="text-gray-900">
                  {unidade.qtde_instrutores || 0} cadastrados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações Financeiras */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Informações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-green-50 rounded-lg">
                <label className="text-sm font-semibold text-green-700">
                  Valor do Plano Padrão
                </label>
                <p className="text-3xl font-bold text-green-600">
                  R$ {(unidade.valor_plano_padrao || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">Por mês</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <label className="text-sm font-semibold text-blue-700">
                  Receita Mensal Estimada
                </label>
                <p className="text-3xl font-bold text-blue-600">
                  R${" "}
                  {(
                    (stats?.alunosAtivos || 0) *
                    (unidade.valor_plano_padrao || 0)
                  ).toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {stats?.alunosAtivos || 0} alunos ativos
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <label className="text-sm font-semibold text-purple-700">
                  Receita Anual Projetada
                </label>
                <p className="text-3xl font-bold text-purple-600">
                  R${" "}
                  {(
                    (stats?.alunosAtivos || 0) *
                    (unidade.valor_plano_padrao || 0) *
                    12
                  ).toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">Estimativa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push("/alunos")}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
              >
                <Users className="h-6 w-6 text-blue-600 mb-2" />
                <h3 className="font-semibold text-gray-900">Ver Alunos</h3>
                <p className="text-sm text-gray-600">
                  Gerenciar alunos desta unidade
                </p>
              </button>

              <button
                onClick={() => router.push("/professores")}
                className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-left transition-colors"
              >
                <GraduationCap className="h-6 w-6 text-indigo-600 mb-2" />
                <h3 className="font-semibold text-gray-900">Ver Professores</h3>
                <p className="text-sm text-gray-600">
                  Gerenciar instrutores e professores
                </p>
              </button>

              <button
                onClick={() => router.push("/aulas")}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
              >
                <Calendar className="h-6 w-6 text-green-600 mb-2" />
                <h3 className="font-semibold text-gray-900">Ver Aulas</h3>
                <p className="text-sm text-gray-600">
                  Gerenciar horários e aulas
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
