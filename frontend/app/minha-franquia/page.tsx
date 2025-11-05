"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { Building2, Save, ArrowLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// Funções de validação e formatação
const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  return numbers.replace(/(\d{5})(\d{3})/, "$1-$2");
};

const validateCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, "");
  if (numbers.length !== 11 || /^(\d)\1+$/.test(numbers)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;

  return digit1 === parseInt(numbers[9]) && digit2 === parseInt(numbers[10]);
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const numbers = phone.replace(/\D/g, "");
  return numbers.length >= 10 && numbers.length <= 11;
};

const validateCEP = (cep: string): boolean => {
  const numbers = cep.replace(/\D/g, "");
  return numbers.length === 8;
};

const onlyLetters = (value: string): string => {
  return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
};

const onlyNumbers = (value: string): string => {
  return value.replace(/\D/g, "");
};

interface FranqueadoData {
  id?: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  ativo: boolean;
}

export default function MinhaFranquiaPage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [franquiaExistente, setFranquiaExistente] =
    useState<FranqueadoData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FranqueadoData>({
    nome: user?.nome || "",
    cpf: user?.cpf || "",
    email: user?.email || "",
    telefone: user?.telefone || "",
    ativo: true,
  });

  // Verificar se usuário está autenticado
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !user) {
      console.log("Usuário não autenticado, redirecionando para login");
      router.push("/login");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.id) {
      verificarFranquiaExistente();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const verificarFranquiaExistente = async () => {
    if (!user?.id) return;

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const token = localStorage.getItem("token");

      // Se não há token, não tenta fazer a requisição
      if (!token) {
        console.log("Token não encontrado, usuário não está logado");
        return;
      }

      const response = await fetch(`${apiUrl}/franqueados/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const franquia = await response.json();
        if (franquia && franquia.id) {
          setFranquiaExistente(franquia);
          setFormData({
            nome: franquia.nome || user?.nome || "",
            cpf: franquia.cpf || user?.cpf || "",
            email: franquia.email || user?.email || "",
            telefone: franquia.telefone || user?.telefone || "",
            ativo: franquia.ativo !== undefined ? franquia.ativo : true,
          });

          // Se o cadastro está completo, redirecionar para o dashboard
          if (user?.cadastro_completo) {
            console.log(
              "Franquia já cadastrada e cadastro_completo = true - Redirecionando para dashboard"
            );
            toast.success(
              "Dados já cadastrados! Redirecionando para o dashboard..."
            );
            setTimeout(() => {
              router.push("/dashboard");
            }, 1500);
          }
        }
      } else if (response.status === 404) {
        // Franquia não encontrada é normal para primeira vez
        console.log("Franquia não encontrada - primeira vez usando a página");
        // Manter o formulário limpo para novo cadastro
      } else {
        console.error(
          "Erro na resposta:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Erro ao verificar franquia:", error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    let formattedValue = value;
    let error = "";

    // Aplicar formatação e validação baseada no campo
    switch (name) {
      case "cpf":
        formattedValue = formatCPF(onlyNumbers(value).slice(0, 11));
        if (
          formattedValue.replace(/\D/g, "").length === 11 &&
          !validateCPF(formattedValue)
        ) {
          error = "CPF inválido";
        }
        break;
      case "telefone":
        formattedValue = formatPhone(onlyNumbers(value).slice(0, 11));
        if (
          formattedValue.replace(/\D/g, "").length >= 10 &&
          !validatePhone(formattedValue)
        ) {
          error = "Telefone inválido";
        }
        break;
      case "cep":
        formattedValue = formatCEP(onlyNumbers(value).slice(0, 8));
        if (
          formattedValue.replace(/\D/g, "").length === 8 &&
          !validateCEP(formattedValue)
        ) {
          error = "CEP inválido";
        }
        break;
      case "email":
        if (value && !validateEmail(value)) {
          error = "E-mail inválido";
        }
        break;
      case "nome":
        formattedValue = onlyLetters(value);
        if (formattedValue.length < 2 && formattedValue.length > 0) {
          error = "Mínimo 2 caracteres";
        }
        break;
      default:
        break;
    }

    // Atualizar form data
    setFormData((prev) => ({ ...prev, [name]: formattedValue }));

    // Atualizar erros
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obrigatórios
    const newErrors: Record<string, string> = {};

    if (!formData.nome) newErrors.nome = "Nome é obrigatório";
    if (!formData.cpf) newErrors.cpf = "CPF é obrigatório";
    if (!formData.email) newErrors.email = "E-mail é obrigatório";
    if (!formData.telefone) newErrors.telefone = "Telefone é obrigatório";

    // Validar formatos
    if (formData.cpf && !validateCPF(formData.cpf)) {
      newErrors.cpf = "CPF inválido";
    }
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = "E-mail inválido";
    }
    if (formData.telefone && !validatePhone(formData.telefone)) {
      newErrors.telefone = "Telefone inválido";
    }

    setErrors(newErrors);

    // Se há erros, não enviar
    if (Object.keys(newErrors).length > 0) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    setLoading(true);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const token = localStorage.getItem("token");

      const url = franquiaExistente
        ? `${apiUrl}/franqueados/minha-franquia/${franquiaExistente.id}`
        : `${apiUrl}/franqueados/minha-franquia`;

      const method = franquiaExistente ? "PATCH" : "POST";

      // Preparar dados conforme esperado pelo backend
      const dataToSend = {
        nome: formData.nome,
        cpf: formData.cpf.replace(/\D/g, ""), // Backend espera apenas números no CPF
        email: formData.email,
        telefone: formData.telefone.replace(/\D/g, ""), // Backend espera apenas números no telefone
        ativo: formData.ativo,
        ...(user?.id && { usuario_id: user.id }), // Adicionar usuario_id apenas se existir
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        // Se foi um novo cadastro, redirecionar para o dashboard após um breve delay
        if (!franquiaExistente) {
          toast.success(
            "Franquia cadastrada com sucesso! Redirecionando para o dashboard..."
          );

          // Atualizar o estado do usuário para marcar cadastro como completo
          if (user && updateUser) {
            updateUser({
              ...user,
              cadastro_completo: true,
            });
          }

          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else {
          toast.success("Franquia atualizada com sucesso!");
        }

        // Se foi atualização, recarregar os dados
        if (franquiaExistente) {
          // Se foi atualização, apenas recarregar os dados
          await verificarFranquiaExistente();
        }
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

  // Mostrar loading enquanto não há usuário ou está redirecionando
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
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
                  className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none ${
                    errors.nome
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-600 focus:border-yellow-500"
                  }`}
                  placeholder="Digite seu nome completo"
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-red-400">{errors.nome}</p>
                )}
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
                  maxLength={14}
                  className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none ${
                    errors.cpf
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-600 focus:border-yellow-500"
                  }`}
                  placeholder="000.000.000-00"
                />
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-400">{errors.cpf}</p>
                )}
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
                  className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none ${
                    errors.email
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-600 focus:border-yellow-500"
                  }`}
                  placeholder="seu@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
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
                  maxLength={15}
                  className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none ${
                    errors.telefone
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-600 focus:border-yellow-500"
                  }`}
                  placeholder="(11) 99999-9999"
                />
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-400">{errors.telefone}</p>
                )}
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
  );
}
