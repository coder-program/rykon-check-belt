"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import {
  Building2,
  Save,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface FranqueadoData {
  id?: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  usuario_id?: string;
  endereco_id?: string;
  unidades_gerencia?: string[];
  situacao?: "ATIVA" | "INATIVA" | "EM_HOMOLOGACAO";
  ativo?: boolean;
}

export default function MinhaFranquiaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [franquiaExistente, setFranquiaExistente] =
    useState<FranqueadoData | null>(null);

  const [formData, setFormData] = useState<FranqueadoData>({
    nome: user?.nome || "",
    cpf: user?.cpf || "",
    email: user?.email || "",
    telefone: user?.telefone || "",
    usuario_id: user?.id,
    situacao: "EM_HOMOLOGACAO",
    ativo: true,
    unidades_gerencia: [],
  });

  useEffect(() => {
    if (user?.id) {
      verificarFranquiaExistente();
    }
  }, [user]);

  const verificarFranquiaExistente = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${apiUrl}/franqueados?usuario_id=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const franquia = data.items[0];
          setFranquiaExistente(franquia);
          setFormData({
            id: franquia.id,
            nome: franquia.nome || user?.nome || "",
            cpf: franquia.cpf || user?.cpf || "",
            email: franquia.email || user?.email || "",
            telefone: franquia.telefone || user?.telefone || "",
            usuario_id: franquia.usuario_id || user?.id,
            endereco_id: franquia.endereco_id,
            unidades_gerencia: franquia.unidades_gerencia || [],
            situacao: franquia.situacao || "EM_HOMOLOGACAO",
            ativo: franquia.ativo ?? true,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao verificar franquia:", error);
      toast.error("Erro ao carregar dados da franquia");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.nome ||
      !formData.cpf ||
      !formData.email ||
      !formData.telefone
    ) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setLoading(true);
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const token = localStorage.getItem("token");

      const dataToSend = {
        nome: formData.nome,
        cpf: formData.cpf.replace(/\D/g, ""), // Remove formatação
        email: formData.email,
        telefone: formData.telefone.replace(/\D/g, ""), // Remove formatação
        usuario_id: formData.usuario_id,
        endereco_id: formData.endereco_id,
        unidades_gerencia: formData.unidades_gerencia,
        situacao: formData.situacao,
        ativo: formData.ativo,
      };

      const url = franquiaExistente
        ? `${apiUrl}/franqueados/${franquiaExistente.id}`
        : `${apiUrl}/franqueados`;

      const method = franquiaExistente ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao salvar franquia");
      }

      const result = await response.json();

      if (franquiaExistente) {
        toast.success("Dados atualizados com sucesso!", {
          duration: 3000,
        });
        setFranquiaExistente(result);
      } else {
        toast.success("Franquia cadastrada com sucesso! Aguarde a aprovação.", {
          duration: 3000,
        });
        setFranquiaExistente(result);
        setFormData((prev) => ({ ...prev, id: result.id }));
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar dados");
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .replace(/(\d{4})-(\d)(\d{4})/, "$1$2-$3")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  if (loading && !franquiaExistente) {
    return (
      <ProtectedRoute requiredPermissions={["franqueado:read"]}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados da franquia...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={["franqueado:read"]}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Minha Franquia
                  </h1>
                  <p className="text-sm text-gray-600">
                    {franquiaExistente
                      ? "Gerencie os dados da sua franquia"
                      : "Complete o cadastro da sua franquia"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </button>
            </div>
          </div>

          {/* Status da Franquia */}
          {franquiaExistente && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Status da Franquia
              </h2>
              <div className="flex items-center space-x-4">
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    formData.situacao === "ATIVA"
                      ? "bg-green-100 text-green-800"
                      : formData.situacao === "EM_HOMOLOGACAO"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {formData.situacao === "ATIVA"
                    ? "✓ Ativa"
                    : formData.situacao === "EM_HOMOLOGACAO"
                    ? "⏳ Em Homologação"
                    : "✗ Inativa"}
                </div>
                {formData.situacao === "EM_HOMOLOGACAO" && (
                  <p className="text-sm text-gray-600">
                    Sua franquia está sendo analisada pela equipe. Você será
                    notificado quando for aprovada.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Dados Pessoais */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <User className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">
                  Dados Pessoais do Responsável
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
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
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite o nome completo"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cpf"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    CPF *
                  </label>
                  <input
                    type="text"
                    id="cpf"
                    name="cpf"
                    value={formatCPF(formData.cpf)}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cpf: e.target.value }))
                    }
                    required
                    maxLength={14}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Phone className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">
                  Informações de Contato
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="telefone"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Telefone/WhatsApp *
                  </label>
                  <input
                    type="text"
                    id="telefone"
                    name="telefone"
                    value={formatPhone(formData.telefone)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        telefone: e.target.value,
                      }))
                    }
                    required
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {franquiaExistente
                      ? "Atualizar Dados"
                      : "Cadastrar Franquia"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        <Toaster position="top-right" />
      </div>
    </ProtectedRoute>
  );
}
