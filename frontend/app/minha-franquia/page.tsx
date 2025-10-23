"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { Building2, Save, ArrowLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function MinhaFranquiaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [franquiaExistente, setFranquiaExistente] = useState<any>(null);

  const [formData, setFormData] = useState({
    // Identificação
    nome: "",
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    // Contato
    email: "",
    telefone_fixo: "",
    telefone_celular: "",
    website: "",
    redes_sociais: {
      instagram: "",
      facebook: "",
      youtube: "",
      linkedin: "",
      tiktok: "",
    },
    // Endereço
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    pais: "Brasil",
    // Responsável Legal
    responsavel_nome: user?.nome || "",
    responsavel_cpf: user?.cpf || "",
    responsavel_cargo: "",
    responsavel_email: user?.email || "",
    responsavel_telefone: user?.telefone || "",
    // Informações
    ano_fundacao: undefined as number | undefined,
    missao: "",
    visao: "",
    valores: "",
    historico: "",
    logotipo_url: "",
    // Financeiro
    data_contrato: "",
    taxa_franquia: undefined as number | undefined,
    dados_bancarios: {
      banco: "",
      agencia: "",
      conta: "",
      titular: "",
      documento: "",
    },
    // Gestão
    unidades_gerencia: [] as string[],
    // Tipo
    id_matriz: null as string | null,
    // Status
    situacao: "EM_HOMOLOGACAO" as "ATIVA" | "INATIVA" | "EM_HOMOLOGACAO",
    ativo: true,
  });

  useEffect(() => {
    // Verificar se já existe franqueado cadastrado para este usuário
    verificarFranquiaExistente();
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
          // Já existe franquia cadastrada
          setFranquiaExistente(data.items[0]);
          // Preencher formulário com dados existentes
          const franquia = data.items[0];
          setFormData({
            nome: franquia.nome || "",
            cnpj: franquia.cnpj || "",
            razao_social: franquia.razao_social || "",
            nome_fantasia: franquia.nome_fantasia || "",
            inscricao_estadual: franquia.inscricao_estadual || "",
            inscricao_municipal: franquia.inscricao_municipal || "",
            email: franquia.email || "",
            telefone_fixo: franquia.telefone_fixo || "",
            telefone_celular: franquia.telefone_celular || "",
            website: franquia.website || "",
            redes_sociais: franquia.redes_sociais || {
              instagram: "",
              facebook: "",
              youtube: "",
              linkedin: "",
              tiktok: "",
            },
            cep: franquia.endereco?.cep || "",
            logradouro: franquia.endereco?.logradouro || "",
            numero: franquia.endereco?.numero || "",
            complemento: franquia.endereco?.complemento || "",
            bairro: franquia.endereco?.bairro || "",
            cidade: franquia.endereco?.cidade || "",
            estado: franquia.endereco?.estado || "",
            pais: franquia.endereco?.pais || "Brasil",
            responsavel_nome: franquia.responsavel_nome || user?.nome || "",
            responsavel_cpf: franquia.responsavel_cpf || user?.cpf || "",
            responsavel_cargo: franquia.responsavel_cargo || "",
            responsavel_email: franquia.responsavel_email || user?.email || "",
            responsavel_telefone:
              franquia.responsavel_telefone || user?.telefone || "",
            ano_fundacao: franquia.ano_fundacao,
            missao: franquia.missao || "",
            visao: franquia.visao || "",
            valores: franquia.valores || "",
            historico: franquia.historico || "",
            logotipo_url: franquia.logotipo_url || "",
            data_contrato: franquia.data_contrato || "",
            taxa_franquia: franquia.taxa_franquia,
            dados_bancarios: franquia.dados_bancarios || {
              banco: "",
              agencia: "",
              conta: "",
              titular: "",
              documento: "",
            },
            unidades_gerencia: franquia.unidades_gerencia || [],
            id_matriz: franquia.id_matriz,
            situacao: franquia.situacao || "EM_HOMOLOGACAO",
            ativo: franquia.ativo !== false,
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

      // Limpar dados antes de enviar (remover formatação)
      const dadosLimpos = {
        ...formData,
        // Remover formatação de CNPJ, CPF e telefones
        cnpj: formData.cnpj.replace(/\D/g, ""),
        responsavel_cpf: formData.responsavel_cpf.replace(/\D/g, ""),
        telefone_celular: formData.telefone_celular.replace(/\D/g, ""),
        telefone_fixo: formData.telefone_fixo
          ? formData.telefone_fixo.replace(/\D/g, "")
          : undefined,
        responsavel_telefone: formData.responsavel_telefone
          ? formData.responsavel_telefone.replace(/\D/g, "")
          : undefined,
        cep: formData.cep ? formData.cep.replace(/\D/g, "") : undefined,
        // Remover campos vazios (string vazia para undefined)
        inscricao_estadual: formData.inscricao_estadual || undefined,
        inscricao_municipal: formData.inscricao_municipal || undefined,
        nome_fantasia: formData.nome_fantasia || undefined,
        website: formData.website || undefined,
        complemento: formData.complemento || undefined,
        responsavel_cargo: formData.responsavel_cargo || undefined,
        responsavel_email: formData.responsavel_email || undefined,
        ano_fundacao: formData.ano_fundacao || undefined,
        missao: formData.missao || undefined,
        visao: formData.visao || undefined,
        valores: formData.valores || undefined,
        historico: formData.historico || undefined,
        logotipo_url: formData.logotipo_url || undefined,
        usuario_id: user?.id,
        situacao: "EM_HOMOLOGACAO",
        ativo: true,
      };

      const url = franquiaExistente
        ? `${apiUrl}/franqueados/minha-franquia/${franquiaExistente.id}`
        : `${apiUrl}/franqueados/minha-franquia`;

      const method = franquiaExistente ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dadosLimpos),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar franquia");
      }

      toast.success(
        franquiaExistente
          ? "Franquia atualizada com sucesso!"
          : "Franquia cadastrada com sucesso! Aguarde aprovação do administrador."
      );

      // Atualizar cadastro_completo do usuário
      await fetch(`${apiUrl}/usuarios/${user?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cadastro_completo: true }),
      });

      // Atualizar localStorage
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      userData.cadastro_completo = true;
      localStorage.setItem("user", JSON.stringify(userData));

      // Redirecionar para dashboard e recarregar página para atualizar cache
      setTimeout(() => {
        router.push("/dashboard");
        // Forçar reload após navegação para atualizar cache do React Query
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }, 2000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar franquia. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const buscarCEP = async () => {
    if (!formData.cep || formData.cep.replace(/\D/g, "").length !== 8) return;

    try {
      const cep = formData.cep.replace(/\D/g, "");
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf,
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
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
            {/* Identificação */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Identificação da Franquia
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome da Franquia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Ex: Team Cruz São Paulo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CNPJ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Razão Social <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="razao_social"
                    value={formData.razao_social}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Razão Social da Empresa"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    name="nome_fantasia"
                    value={formData.nome_fantasia}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Nome comercial (opcional)"
                  />
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Contato</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="contato@franquia.com.br"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telefone Celular <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="telefone_celular"
                    value={formData.telefone_celular}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="(11) 98765-4321"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telefone Fixo
                  </label>
                  <input
                    type="tel"
                    name="telefone_fixo"
                    value={formData.telefone_fixo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="(11) 1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="https://www.suafranquia.com.br"
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
                    CEP
                  </label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    onBlur={buscarCEP}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="00000-000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Número
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
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
                    placeholder="Sala, Andar, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bairro
                  </label>
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Bairro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Cidade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    maxLength={2}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="SP"
                  />
                </div>
              </div>
            </div>

            {/* Inscrições */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Inscrições Fiscais
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Inscrição Estadual
                  </label>
                  <input
                    type="text"
                    name="inscricao_estadual"
                    value={formData.inscricao_estadual}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="123.456.789.012"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Inscrição Municipal
                  </label>
                  <input
                    type="text"
                    name="inscricao_municipal"
                    value={formData.inscricao_municipal}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="9876543"
                  />
                </div>
              </div>
            </div>

            {/* Redes Sociais */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Redes Sociais
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Instagram
                  </label>
                  <input
                    type="text"
                    name="redes_sociais.instagram"
                    value={formData.redes_sociais.instagram}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        redes_sociais: {
                          ...formData.redes_sociais,
                          instagram: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="@suafranquia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Facebook
                  </label>
                  <input
                    type="text"
                    name="redes_sociais.facebook"
                    value={formData.redes_sociais.facebook}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        redes_sociais: {
                          ...formData.redes_sociais,
                          facebook: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="@suafranquia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    YouTube
                  </label>
                  <input
                    type="text"
                    name="redes_sociais.youtube"
                    value={formData.redes_sociais.youtube}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        redes_sociais: {
                          ...formData.redes_sociais,
                          youtube: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="@suafranquia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    LinkedIn
                  </label>
                  <input
                    type="text"
                    name="redes_sociais.linkedin"
                    value={formData.redes_sociais.linkedin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        redes_sociais: {
                          ...formData.redes_sociais,
                          linkedin: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="company/suafranquia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    TikTok
                  </label>
                  <input
                    type="text"
                    name="redes_sociais.tiktok"
                    value={formData.redes_sociais.tiktok}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        redes_sociais: {
                          ...formData.redes_sociais,
                          tiktok: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="@suafranquia"
                  />
                </div>
              </div>
            </div>

            {/* Informações da Franquia */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Informações da Franquia
              </h2>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Ano de Fundação
                    </label>
                    <input
                      type="number"
                      name="ano_fundacao"
                      value={formData.ano_fundacao || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ano_fundacao: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      min="1900"
                      max={new Date().getFullYear()}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                      placeholder="2020"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Logotipo (URL)
                    </label>
                    <input
                      type="url"
                      name="logotipo_url"
                      value={formData.logotipo_url}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Missão
                  </label>
                  <textarea
                    name="missao"
                    value={formData.missao}
                    onChange={(e) =>
                      setFormData({ ...formData, missao: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Descreva a missão da franquia..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Visão
                  </label>
                  <textarea
                    name="visao"
                    value={formData.visao}
                    onChange={(e) =>
                      setFormData({ ...formData, visao: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Descreva a visão da franquia..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valores
                  </label>
                  <textarea
                    name="valores"
                    value={formData.valores}
                    onChange={(e) =>
                      setFormData({ ...formData, valores: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Descreva os valores da franquia..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Histórico / Sobre
                  </label>
                  <textarea
                    name="historico"
                    value={formData.historico}
                    onChange={(e) =>
                      setFormData({ ...formData, historico: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Conte a história da franquia..."
                  />
                </div>
              </div>
            </div>

            {/* Dados Financeiros */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Dados Financeiros
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Data do Contrato
                  </label>
                  <input
                    type="date"
                    name="data_contrato"
                    value={formData.data_contrato}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Taxa de Franquia (R$)
                  </label>
                  <input
                    type="number"
                    name="taxa_franquia"
                    value={formData.taxa_franquia || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        taxa_franquia: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-medium text-white mb-3">
                  Dados Bancários
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={formData.dados_bancarios.banco}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dados_bancarios: {
                            ...formData.dados_bancarios,
                            banco: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                      placeholder="Ex: Banco do Brasil"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Agência
                    </label>
                    <input
                      type="text"
                      value={formData.dados_bancarios.agencia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dados_bancarios: {
                            ...formData.dados_bancarios,
                            agencia: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                      placeholder="1234-5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Conta
                    </label>
                    <input
                      type="text"
                      value={formData.dados_bancarios.conta}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dados_bancarios: {
                            ...formData.dados_bancarios,
                            conta: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                      placeholder="12345-6"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Titular
                    </label>
                    <input
                      type="text"
                      value={formData.dados_bancarios.titular}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dados_bancarios: {
                            ...formData.dados_bancarios,
                            titular: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                      placeholder="Nome do titular"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CPF/CNPJ do Titular
                    </label>
                    <input
                      type="text"
                      value={formData.dados_bancarios.documento}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dados_bancarios: {
                            ...formData.dados_bancarios,
                            documento: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Responsável Legal */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Responsável Legal
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="responsavel_nome"
                    value={formData.responsavel_nome}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="responsavel_cpf"
                    value={formData.responsavel_cpf}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cargo/Função
                  </label>
                  <input
                    type="text"
                    name="responsavel_cargo"
                    value={formData.responsavel_cargo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Ex: Diretor, Gerente, Proprietário"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="responsavel_email"
                    value={formData.responsavel_email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="responsavel@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    name="responsavel_telefone"
                    value={formData.responsavel_telefone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    placeholder="(11) 98765-4321"
                  />
                </div>
              </div>
            </div>

            {/* Aviso */}
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                ℹ️ <strong>Importante:</strong> Após o cadastro, seu perfil de
                franqueado ficará em status "EM HOMOLOGAÇÃO" até a aprovação do
                administrador. Você será notificado quando suas unidades forem
                vinculadas ao seu perfil.
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
