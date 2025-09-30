"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth/AuthContext";
import {
  User,
  Check,
  X,
  Clock,
  Mail,
  Phone,
  Calendar,
  Shield,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";

interface PendingUser {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  data_nascimento?: string;
  perfis: string[];
  ativo: boolean;
  created_at: string;
}

export default function AprovacaoUsuariosPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pendentes"); // pendentes, todos, aprovados
  const queryClient = useQueryClient();

  // Verificar se usuário tem permissão (apenas master/admin)
  const hasPermission = (currentUser?.perfis || []).some((p: any) =>
    ["master", "admin", "administrador"].includes(p.toLowerCase())
  );

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["usuarios-pendentes", search, filter],
    queryFn: async () => {
      // Mock data - você pode substituir pela chamada real da API
      const mockUsers: PendingUser[] = [
        {
          id: "1",
          nome: "João Silva",
          email: "joao@email.com",
          telefone: "(11) 99999-9999",
          data_nascimento: "1990-01-01",
          perfis: ["aluno"],
          ativo: false,
          created_at: "2025-01-01T10:00:00Z",
        },
        {
          id: "2",
          nome: "Maria Santos",
          email: "maria@email.com",
          telefone: "(11) 88888-8888",
          data_nascimento: "1995-05-15",
          perfis: ["aluno"],
          ativo: false,
          created_at: "2025-01-01T11:30:00Z",
        },
        {
          id: "3",
          nome: "Pedro Costa",
          email: "pedro@email.com",
          telefone: "(11) 77777-7777",
          data_nascimento: "1988-08-20",
          perfis: ["aluno"],
          ativo: true,
          created_at: "2025-01-01T09:15:00Z",
        },
      ];

      // Filtrar baseado no estado
      let filtered = mockUsers;
      if (filter === "pendentes") {
        filtered = mockUsers.filter((u) => !u.ativo);
      } else if (filter === "aprovados") {
        filtered = mockUsers.filter((u) => u.ativo);
      }

      // Filtrar por busca
      if (search) {
        filtered = filtered.filter(
          (u) =>
            u.nome.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        );
      }

      return filtered;
    },
    enabled: hasPermission,
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Aqui você faria a chamada real para a API
      // return http(`/usuarios/${userId}/approve`, { method: 'PATCH', auth: true });

      // Mock - simular aprovação
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Usuário aprovado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
    },
    onError: () => {
      toast.error("Erro ao aprovar usuário");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Aqui você faria a chamada real para a API
      // return http(`/usuarios/${userId}/reject`, { method: 'PATCH', auth: true });

      // Mock - simular rejeição
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Usuário rejeitado");
      queryClient.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
    },
    onError: () => {
      toast.error("Erro ao rejeitar usuário");
    },
  });

  const handleApprove = (userId: string) => {
    if (window.confirm("Tem certeza que deseja aprovar este usuário?")) {
      approveMutation.mutate(userId);
    }
  };

  const handleReject = (userId: string) => {
    if (window.confirm("Tem certeza que deseja rejeitar este usuário?")) {
      rejectMutation.mutate(userId);
    }
  };

  if (!hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
              <p className="text-gray-600">
                Você não tem permissão para acessar esta área.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Aprovação de Usuários
          </h1>
          <p className="text-gray-600">
            Gerencie as solicitações de cadastro de novos usuários
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
                    placeholder="Buscar por nome ou email..."
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
                {users.filter((u) => !u.ativo).length}
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
                {users.filter((u) => u.ativo).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {users.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de usuários */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando usuários...</p>
            </div>
          ) : users.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum usuário encontrado
                  </h3>
                  <p className="text-gray-600">
                    {filter === "pendentes"
                      ? "Não há usuários aguardando aprovação no momento."
                      : "Nenhum usuário corresponde aos filtros aplicados."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            users.map((userItem) => (
              <Card
                key={userItem.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          userItem.ativo ? "bg-green-100" : "bg-yellow-100"
                        }`}
                      >
                        <User
                          className={`h-6 w-6 ${
                            userItem.ativo
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {userItem.nome}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              userItem.ativo
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {userItem.ativo ? "Aprovado" : "Pendente"}
                          </span>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {userItem.email}
                          </div>
                          {userItem.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {userItem.telefone}
                            </div>
                          )}
                          {userItem.data_nascimento && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(
                                userItem.data_nascimento
                              ).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </div>

                        <div className="mt-2">
                          <span className="text-xs text-gray-500">
                            Perfis: {userItem.perfis.join(", ")} • Cadastrado em{" "}
                            {new Date(userItem.created_at).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!userItem.ativo && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(userItem.id)}
                          disabled={rejectMutation.isPending}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(userItem.id)}
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
