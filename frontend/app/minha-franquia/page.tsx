"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { Building2, Save, ArrowLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface FranqueadoData {
  id?: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  nome_franquia: string;
  descricao: string;
  observacoes: string;
  ativo: boolean;
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
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    nome_franquia: "",
    descricao: "",
    observacoes: "",
    ativo: true,
  });

  useEffect(() => {
    verificarFranquiaExistente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const verificarFranquiaExistente = async () => {
    if (!user?.id) return;

    try {
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
            nome: franquia.nome || user?.nome || "",
            cpf: franquia.cpf || user?.cpf || "",
            email: franquia.email || user?.email || "",
            telefone: franquia.telefone || user?.telefone || "",
            cep: franquia.cep || "",
            logradouro: franquia.logradouro || "",
            numero: franquia.numero || "",
            complemento: franquia.complemento || "",
            bairro: franquia.bairro || "",
            cidade: franquia.cidade || "",
            estado: franquia.estado || "",
            nome_franquia: franquia.nome_franquia || "",
            descricao: franquia.descricao || "",
            observacoes: franquia.observacoes || "",
            ativo: franquia.ativo !== undefined ? franquia.ativo : true,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao verificar franquia:", error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const token = localStorage.getItem("token");

      const url = franquiaExistente
        ? `${apiUrl}/franqueados/${franquiaExistente.id}`
        : `${apiUrl}/franqueados`;

      const method = franquiaExistente ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          usuario_id: user?.id,
        }),
      });

      if (response.ok) {
        toast.success(
          franquiaExistente
            ? "Franquia atualizada com sucesso!"
            : "Franquia cadastrada com sucesso!"
        );
        // Recarregar os dados
        await verificarFranquiaExistente();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Erro ao salvar franquia");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
        <Toaster position="top-right" />

        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-yellow-500" />
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {franquiaExistente
                    ? "Minha Franquia"
                    : "Cadastrar Minha Franquia"}
                </h1>
                <p className="text-gray-400">
                  {franquiaExistente
                    ? "Atualize os dados da sua franquia"
                    : "Preencha os dados da sua franquia para começar"}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados Pessoais */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Dados do Responsável
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telefone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Endereço
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CEP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="00000-000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Logradouro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Apto, Bloco, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bairro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Nome do bairro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Nome da cidade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="SP, RJ, MG, etc."
                  />
                </div>
              </div>
            </div>

            {/* Informações da Franquia */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Informações da Franquia
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome da Franquia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nome_franquia"
                    value={formData.nome_franquia}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Ex: Team Cruz São Paulo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição
                  </label>
                  <textarea
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Breve descrição da franquia..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Observações
                  </label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Observações adicionais..."
                  />
                </div>
              </div>
            </div>

            {/* Botão Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {loading
                  ? "Salvando..."
                  : franquiaExistente
                  ? "Atualizar Franquia"
                  : "Cadastrar Franquia"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
