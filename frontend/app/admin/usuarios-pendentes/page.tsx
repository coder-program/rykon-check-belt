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
  Shield,
  AlertCircle,
  Search,
  Filter,
  Edit,
  Save,
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

function AprovacaoUsuariosPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pendentes"); // pendentes, todos, aprovados
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingPerson, setEditingPerson] = useState<any>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "approve" as "approve" | "reject",
    userId: "",
  });
  const [editUserForm, setEditUserForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    status: "PENDENTE",
  });
  const [editPersonForm, setEditPersonForm] = useState({
    cpf: "",
    genero: "",
    unidade_id: "",
    // Professor específico
    faixa_ministrante: "",
    data_inicio_docencia: "",
    registro_profissional: "",
    // Aluno específico
    faixa_atual: "",
    grau_atual: 0,
    data_matricula: "",
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_telefone: "",
  });
  const queryClient = useQueryClient();

  // Query separada para estatísticas (sempre busca todos os usuários)
  const { data: allUsersForStats = [] } = useQuery({
    queryKey: ["todos-usuarios-stats"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios`,
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
      return data.map((user: any) => ({
        id: user.id,
        ativo: user.ativo,
      }));
    },
  });

  // Query para buscar unidades
  const { data: unidadesData } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar unidades");
      }

      const data = await response.json();
      // A API retorna um objeto com items ou um array direto
      return data;
    },
  });

  // Extrair o array de unidades do objeto retornado
  const unidades = Array.isArray(unidadesData)
    ? unidadesData
    : unidadesData?.items || [];

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["usuarios-pendentes", search, filter],
    queryFn: async () => {
      // Buscar todos os usuários se o filtro for "todos" ou "aprovados"
      const endpoint =
        filter === "pendentes" ? "/usuarios/pendentes/list" : "/usuarios";

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar usuários");
      }

      const data = await response.json();

      console.log("🔍 DEBUG - Filter:", filter);
      console.log("🔍 DEBUG - Data recebida:", data);

      // Transformar dados para o formato esperado
      let allUsers = data.map((user: any) => ({
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        data_nascimento: user.data_nascimento,
        perfis: user.perfis?.map((p: any) => p.nome || p) || [],
        ativo: user.ativo,
        created_at: user.created_at,
        unidade: user.unidade, // Incluir dados da unidade
      }));

      console.log("🔍 DEBUG - AllUsers transformados:", allUsers);

      // Filtrar baseado no estado
      let filtered = allUsers;
      if (filter === "pendentes") {
        console.log("🔍 DEBUG - Filtrando pendentes (!u.ativo)");
        filtered = allUsers.filter((u: any) => {
          console.log(
            `User ${u.nome}: ativo = ${
              u.ativo
            }, tipo = ${typeof u.ativo}, !u.ativo = ${!u.ativo}`
          );
          return !u.ativo;
        });
        console.log("🔍 DEBUG - Filtrados pendentes:", filtered);
      } else if (filter === "aprovados") {
        filtered = allUsers.filter((u: any) => u.ativo);
      }
      // Se filter === "todos", não filtra por status

      // Filtrar por busca
      if (search) {
        filtered = filtered.filter(
          (u: any) =>
            u.nome.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        );
      }

      return filtered;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${userId}/aprovar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao aprovar usuário");
      }

      return response.json();
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${userId}/rejeitar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao rejeitar usuário");
      }

      return response.json();
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
    setConfirmModal({
      isOpen: true,
      title: "Aprovar Usuário",
      message:
        "Tem certeza que deseja aprovar este usuário? Ele terá acesso ao sistema.",
      type: "approve",
      userId,
    });
  };

  const handleReject = (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Rejeitar Usuário",
      message:
        "Tem certeza que deseja rejeitar este usuário? Esta ação não pode ser desfeita.",
      type: "reject",
      userId,
    });
  };

  const confirmAction = () => {
    if (confirmModal.type === "approve") {
      approveMutation.mutate(confirmModal.userId);
    } else {
      rejectMutation.mutate(confirmModal.userId);
    }
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const handleEditUser = async (userId: string) => {
    try {
      // Buscar dados do usuário
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!userResponse.ok) {
        throw new Error("Erro ao carregar dados do usuário");
      }

      const userData = await userResponse.json();

      // Preencher formulário de usuário
      setEditUserForm({
        nome: userData.nome || "",
        email: userData.email || "",
        telefone: userData.telefone || "",
        status: userData.ativo ? "ATIVO" : "PENDENTE",
      });

      setEditingUser(userData);
      setIsUserModalOpen(true);
    } catch (error) {
      toast.error("Erro ao carregar dados do usuário");
      console.error(error);
    }
  };

  const handleEditPersonalData = async (userId: string) => {
    try {
      // Buscar dados do aluno
      let personData = null;

      // Tentar buscar como aluno
      try {
        const alunoResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/alunos/usuario/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (alunoResponse.ok) {
          personData = await alunoResponse.json();
        }
      } catch (error) {
        console.log("Erro ao buscar aluno:", error);
      }

      // Se não encontrou como aluno, não há dados pessoais

      if (!personData) {
        throw new Error(
          "Usuário não possui dados pessoais cadastrados como aluno"
        );
      }

      // Adicionar o tipo como aluno
      personData.tipo_cadastro = "ALUNO";

      // Preencher formulário de dados pessoais
      setEditPersonForm({
        cpf: personData.cpf || "",
        genero: personData.genero || "",
        unidade_id: personData.unidade_id || "",
        // Professor
        faixa_ministrante: personData.faixa_ministrante || "",
        data_inicio_docencia: personData.data_inicio_docencia || "",
        registro_profissional: personData.registro_profissional || "",
        // Aluno
        faixa_atual: personData.faixa_atual || "",
        grau_atual: personData.grau_atual || 0,
        data_matricula: personData.data_matricula || "",
        responsavel_nome: personData.responsavel_nome || "",
        responsavel_cpf: personData.responsavel_cpf || "",
        responsavel_telefone: personData.responsavel_telefone || "",
      });

      setEditingPerson(personData);
      setIsPersonModalOpen(true);
    } catch (error) {
      toast.error("Erro ao carregar dados pessoais do usuário");
      console.error(error);
    }
  };

  // Mutation para salvar dados do usuário
  const saveUserMutation = useMutation({
    mutationFn: async () => {
      const userId = editingUser.id;

      const userUpdate = {
        nome: editUserForm.nome,
        email: editUserForm.email,
        telefone: editUserForm.telefone,
        ativo: editUserForm.status === "ATIVO",
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(userUpdate),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao atualizar dados do usuário");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Dados do usuário atualizados com sucesso!");
      setIsUserModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["todos-usuarios-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar usuário");
    },
  });

  // Mutation para salvar dados pessoais
  const savePersonMutation = useMutation({
    mutationFn: async () => {
      const personId = editingPerson.id;

      const personUpdate = {
        cpf: editPersonForm.cpf,
        genero: editPersonForm.genero,
        unidade_id: editPersonForm.unidade_id || null,
        faixa_ministrante: editPersonForm.faixa_ministrante || null,
        data_inicio_docencia: editPersonForm.data_inicio_docencia || null,
        registro_profissional: editPersonForm.registro_profissional || null,
        faixa_atual: editPersonForm.faixa_atual || null,
        grau_atual: editPersonForm.grau_atual || null,
        data_matricula: editPersonForm.data_matricula || null,
        responsavel_nome: editPersonForm.responsavel_nome || null,
        responsavel_cpf: editPersonForm.responsavel_cpf || null,
        responsavel_telefone: editPersonForm.responsavel_telefone || null,
      };

      // Determinar o endpoint correto baseado no tipo de cadastro
      const endpoint =
        editingPerson.tipo_cadastro === "PROFESSOR" ? "professores" : "alunos";

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/${endpoint}/${personId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(personUpdate),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao atualizar dados pessoais");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Dados pessoais atualizados com sucesso!");
      setIsPersonModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["todos-usuarios-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar dados pessoais");
    },
  });
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
                {allUsersForStats.filter((u) => !u.ativo).length}
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
                {allUsersForStats.filter((u) => u.ativo).length}
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
                {allUsersForStats.length}
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

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(userItem.id)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <User className="h-4 w-4 mr-1" />
                        Usuário
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPersonalData(userItem.id)}
                        className="text-purple-600 border-purple-600 hover:bg-purple-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Dados Pessoais
                      </Button>

                      {!userItem.ativo && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modal de Edição de Usuário */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Editar Dados do Usuário
              </h2>
              <Button
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Dados apenas para visualização */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-3">
                  Dados do Usuário (somente leitura)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Nome Completo
                    </label>
                    <p className="text-sm text-gray-800">{editUserForm.nome}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Email
                    </label>
                    <p className="text-sm text-gray-800">
                      {editUserForm.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Telefone
                    </label>
                    <p className="text-sm text-gray-800">
                      {editUserForm.telefone || "Não informado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Campo editável: Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status do Usuário
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  value={editUserForm.status}
                  onChange={(e) =>
                    setEditUserForm({ ...editUserForm, status: e.target.value })
                  }
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                  <option value="PENDENTE">Pendente</option>
                </select>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsUserModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => saveUserMutation.mutate()}
                  disabled={saveUserMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveUserMutation.isPending
                    ? "Salvando..."
                    : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Dados Pessoais */}
      {isPersonModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Editar Dados Pessoais
              </h2>
              <Button
                variant="outline"
                onClick={() => setIsPersonModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Informações Pessoais Básicas - somente leitura */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-800 mb-3">
                  Informações Pessoais (somente leitura)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Nome Completo
                    </label>
                    <p className="text-sm text-gray-800">
                      {editingPerson?.nome_completo || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      CPF
                    </label>
                    <p className="text-sm text-gray-800">
                      {editPersonForm.cpf || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Data de Nascimento
                    </label>
                    <p className="text-sm text-gray-800">
                      {editingPerson?.data_nascimento
                        ? new Date(
                            editingPerson.data_nascimento
                          ).toLocaleDateString("pt-BR")
                        : "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Gênero
                    </label>
                    <p className="text-sm text-gray-800">
                      {editPersonForm.genero === "MASCULINO"
                        ? "Masculino"
                        : editPersonForm.genero === "FEMININO"
                        ? "Feminino"
                        : editPersonForm.genero === "OUTRO"
                        ? "Outro"
                        : "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Email
                    </label>
                    <p className="text-sm text-gray-800">
                      {editingPerson?.email || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Telefone
                    </label>
                    <p className="text-sm text-gray-800">
                      {editingPerson?.telefone || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Status do Aluno
                    </label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        editingPerson?.status === "ATIVO"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {editingPerson?.status || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Número de Matrícula
                    </label>
                    <p className="text-sm text-gray-800">
                      {editingPerson?.numero_matricula || "Não gerado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Campos específicos por tipo - desabilitados */}
              {editingPerson?.tipo_cadastro === "PROFESSOR" && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-3">
                    Dados do Professor (somente leitura)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Início Docência
                      </label>
                      <Input
                        type="date"
                        value={editPersonForm.data_inicio_docencia || ""}
                        disabled
                        className="bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Registro Profissional
                      </label>
                      <Input
                        value={editPersonForm.registro_profissional || ""}
                        disabled
                        className="bg-gray-100 text-gray-600"
                        placeholder="Número do registro"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingPerson?.tipo_cadastro === "ALUNO" && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-800 mb-3">
                    Dados do Aluno (somente leitura)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Faixa Atual
                      </label>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          editPersonForm.faixa_atual
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {editPersonForm.faixa_atual || "Não informado"}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Graus
                      </label>
                      <p className="text-sm text-gray-800">
                        {editPersonForm.grau_atual || "0"} graus
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Data Matrícula
                      </label>
                      <p className="text-sm text-gray-800">
                        {editPersonForm.data_matricula
                          ? new Date(
                              editPersonForm.data_matricula
                            ).toLocaleDateString("pt-BR")
                          : "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Última Graduação
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.data_ultima_graduacao
                          ? new Date(
                              editingPerson.data_ultima_graduacao
                            ).toLocaleDateString("pt-BR")
                          : "Nunca graduou"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Telefone de Emergência
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.telefone_emergencia || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Contato de Emergência
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.nome_contato_emergencia ||
                          "Não informado"}
                      </p>
                    </div>
                  </div>

                  {(editPersonForm.responsavel_nome ||
                    editPersonForm.responsavel_cpf ||
                    editPersonForm.responsavel_telefone) && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <h4 className="text-xs font-medium text-green-700 mb-2">
                        Dados do Responsável (Menor de Idade)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Nome do Responsável
                          </label>
                          <p className="text-sm text-gray-800">
                            {editPersonForm.responsavel_nome || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            CPF do Responsável
                          </label>
                          <p className="text-sm text-gray-800">
                            {editPersonForm.responsavel_cpf || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Telefone do Responsável
                          </label>
                          <p className="text-sm text-gray-800">
                            {editPersonForm.responsavel_telefone ||
                              "Não informado"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Campos editáveis: Faixa e Unidade */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800 mb-3">
                  Campos Editáveis pelo Administrador
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo Unidade (sempre editável) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unidade *
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                      value={editPersonForm.unidade_id}
                      onChange={(e) =>
                        setEditPersonForm({
                          ...editPersonForm,
                          unidade_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecionar Unidade</option>
                      {Array.isArray(unidades) &&
                        unidades.map((unidade: any) => (
                          <option key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </option>
                        ))}
                      <option value="1">Matriz</option>
                      <option value="2">Filial Norte</option>
                      <option value="3">Filial Sul</option>
                    </select>
                  </div>

                  {/* Campo Faixa - condicional baseado no tipo */}
                  {editingPerson?.tipo_cadastro === "ALUNO" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Faixa Atual
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                        value={editPersonForm.faixa_atual}
                        onChange={(e) =>
                          setEditPersonForm({
                            ...editPersonForm,
                            faixa_atual: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecionar Faixa</option>
                        <option value="BRANCA">Branca</option>
                        <option value="AMARELA">Amarela</option>
                        <option value="LARANJA">Laranja</option>
                        <option value="VERDE">Verde</option>
                        <option value="AZUL">Azul</option>
                        <option value="ROXA">Roxa</option>
                        <option value="MARROM">Marrom</option>
                        <option value="PRETA">Preta</option>
                      </select>
                    </div>
                  )}

                  {editingPerson?.tipo_cadastro === "PROFESSOR" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Faixa Ministrante
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                        value={editPersonForm.faixa_ministrante}
                        onChange={(e) =>
                          setEditPersonForm({
                            ...editPersonForm,
                            faixa_ministrante: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecionar Faixa</option>
                        <option value="MARROM">Marrom</option>
                        <option value="PRETA">Preta</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsPersonModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => savePersonMutation.mutate()}
                  disabled={savePersonMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savePersonMutation.isPending
                    ? "Salvando..."
                    : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Moderno */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all">
            <div className="text-center">
              {/* Ícone baseado no tipo */}
              <div
                className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 ${
                  confirmModal.type === "approve"
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                {confirmModal.type === "approve" ? (
                  <svg
                    className="h-8 w-8 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>

              {/* Título */}
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {confirmModal.title}
              </h3>

              {/* Mensagem */}
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                {confirmModal.message}
              </p>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={closeConfirmModal}
                  className="px-6 py-3 text-gray-700 border-gray-300 hover:bg-gray-50 rounded-xl font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmAction}
                  className={`px-6 py-3 rounded-xl font-medium text-white transition-colors ${
                    confirmModal.type === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {confirmModal.type === "approve" ? "Aprovar" : "Rejeitar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtectedAprovacaoUsuariosPage() {
  return (
    <ProtectedRoute
      requiredPerfis={[
        "master",
        "franqueado",
        "gerente_unidade",
        "recepcionista",
      ]}
    >
      <AprovacaoUsuariosPage />
    </ProtectedRoute>
  );
}
