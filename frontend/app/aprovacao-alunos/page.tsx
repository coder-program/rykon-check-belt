"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  User,
  Check,
  X,
  Clock,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Search,
  Filter,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";

interface PendingAluno {
  id: string;
  nome_completo: string;
  cpf: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  unidade?: { nome: string };
  faixa_atual?: string;
  status: string; // Status do aluno (ATIVO/INATIVO)
  status_usuario?: string; // Status do usuário (para aprovação)
  created_at: string;
}

function AprovacaoAlunosPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pendentes"); // pendentes, todos, aprovados
  const queryClient = useQueryClient();

  // Query separada para estatísticas (sempre busca todos os alunos)
  const { data: allAlunosForStats = [] } = useQuery({
    queryKey: ["todos-alunos-stats"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/alunos?pageSize=1000`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar estatísticas");
      }

      const data = await response.json();
      return data.items.map(
        (aluno: { id: string; status_usuario?: string }) => ({
          id: aluno.id,
          status_usuario: aluno.status_usuario,
        })
      );
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ["alunos-pendentes", search, filter],
    queryFn: async () => {
      // Buscar todos os alunos
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/alunos?pageSize=1000`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar alunos");
      }

      const data = await response.json();

      // Transformar dados para o formato esperado
      const allAlunos = data.items.map(
        (aluno: {
          id: string;
          nome_completo: string;
          cpf: string;
          email?: string;
          telefone?: string;
          data_nascimento?: string;
          unidade?: { nome: string };
          faixa_atual?: string;
          status: string;
          status_usuario?: string;
          created_at: string;
        }) => ({
          id: aluno.id,
          nome_completo: aluno.nome_completo,
          cpf: aluno.cpf,
          email: aluno.email,
          telefone: aluno.telefone,
          data_nascimento: aluno.data_nascimento,
          unidade: aluno.unidade,
          faixa_atual: aluno.faixa_atual,
          status: aluno.status,
          status_usuario: aluno.status_usuario,
          created_at: aluno.created_at,
        })
      );

      // Filtrar baseado no estado do USUÁRIO (não do aluno)
      let filtered = allAlunos;
      if (filter === "pendentes") {
        filtered = allAlunos.filter(
          (a: any) => a.status_usuario === "INATIVO" || !a.status_usuario
        );
      } else if (filter === "aprovados") {
        filtered = allAlunos.filter((a: any) => a.status_usuario === "ATIVO");
      }
      // Se filter === "todos", não filtra por status

      // Filtrar por busca
      if (search) {
        filtered = filtered.filter(
          (a) =>
            a.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
            a.cpf.includes(search) ||
            (a.email && a.email.toLowerCase().includes(search.toLowerCase()))
        );
      }

      return filtered;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const approveMutation = useMutation({
    mutationFn: async (alunoId: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/alunos/${alunoId}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao aprovar aluno");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Aluno aprovado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["alunos-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["todos-alunos-stats"] });
    },
    onError: () => {
      toast.error("Erro ao aprovar aluno");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (alunoId: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/alunos/${alunoId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao rejeitar aluno");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Aluno rejeitado");
      queryClient.invalidateQueries({ queryKey: ["alunos-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["todos-alunos-stats"] });
    },
    onError: () => {
      toast.error("Erro ao rejeitar aluno");
    },
  });

  const handleApprove = (alunoId: string) => {
    if (window.confirm("Tem certeza que deseja aprovar este aluno?")) {
      approveMutation.mutate(alunoId);
    }
  };

  const handleReject = (alunoId: string) => {
    if (window.confirm("Tem certeza que deseja rejeitar este aluno?")) {
      rejectMutation.mutate(alunoId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Aprovação de Alunos
          </h1>
          <p className="text-gray-600">
            Gerencie as solicitações de cadastro de novos alunos
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome ou CPF..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {["pendentes", "todos", "aprovados"].map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    onClick={() => setFilter(f)}
                    className="capitalize"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {f}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {
                  allAlunosForStats.filter(
                    (a: { status_usuario?: string }) =>
                      a.status_usuario === "INATIVO" || !a.status_usuario
                  ).length
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {
                  allAlunosForStats.filter(
                    (a: { status_usuario?: string }) =>
                      a.status_usuario === "ATIVO"
                  ).length
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <GraduationCap className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {allAlunosForStats.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de alunos */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando alunos...</p>
            </div>
          ) : alunos.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum aluno encontrado
                  </h3>
                  <p className="text-gray-600">
                    {filter === "pendentes"
                      ? "Não há alunos aguardando aprovação no momento."
                      : "Nenhum aluno corresponde aos filtros aplicados."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            alunos.map((alunoItem: PendingAluno) => (
              <Card
                key={alunoItem.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          alunoItem.status_usuario === "ATIVO"
                            ? "bg-green-100"
                            : "bg-yellow-100"
                        }`}
                      >
                        <GraduationCap
                          className={`h-6 w-6 ${
                            alunoItem.status_usuario === "ATIVO"
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {alunoItem.nome_completo}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              alunoItem.status_usuario === "ATIVO"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {alunoItem.status_usuario === "ATIVO"
                              ? "Aprovado"
                              : "Pendente"}
                          </span>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {alunoItem.cpf}
                          </div>
                          {alunoItem.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {alunoItem.email}
                            </div>
                          )}
                          {alunoItem.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {alunoItem.telefone}
                            </div>
                          )}
                          {alunoItem.data_nascimento && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(
                                alunoItem.data_nascimento
                              ).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </div>

                        <div className="mt-2">
                          <span className="text-xs text-gray-500">
                            Unidade: {alunoItem.unidade?.nome || "N/A"} • Faixa:{" "}
                            {alunoItem.faixa_atual || "N/A"} • Cadastrado em{" "}
                            {new Date(alunoItem.created_at).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(alunoItem.status_usuario === "INATIVO" ||
                      !alunoItem.status_usuario) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(alunoItem.id)}
                          disabled={rejectMutation.isPending}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(alunoItem.id)}
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProtectedAprovacaoAlunosPage() {
  return (
    <ProtectedRoute requiredPerfis={["master", "franqueado", "instrutor"]}>
      <AprovacaoAlunosPage />
    </ProtectedRoute>
  );
}
