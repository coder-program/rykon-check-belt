"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Building2, Save, User, MapPin, Loader2, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  maskCNPJ,
  maskCPF,
  maskPhone,
  maskCEP,
  maskCNAE,
  unmask,
  isValidCNPJ,
  isValidCPF,
  isValidEmail,
  calculateAge,
} from "@/lib/masks";

export default function NovoEstabelecimentoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<any>(null);
  const [searchUnidade, setSearchUnidade] = useState("");
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [formData, setFormData] = useState({
    // Dados do Estabelecimento
    type: "BUSINESS" as "BUSINESS" | "INDIVIDUAL",
    document: "",
    email: "",
    phone_number: "",
    cnae: "",
    format: "LTDA",
    first_name: "", // Razão Social
    last_name: "", // Nome Fantasia
    birthdate: "", // Data de abertura
    revenue: "",
    gmv: "",
    
    // Responsável
    responsible_email: "",
    responsible_document: "",
    responsible_first_name: "",
    responsible_phone: "",
    responsible_birthdate: "",
    
    // Endereço
    zip_code: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    
    // Opcionais
    activity_id: "",
    representative_id: "",
    visited: false,
    notes: "",
  });

  // Carregar unidades ao montar
  useEffect(() => {
    carregarUnidades();
  }, []);

  // Buscar endereço pelo CEP
  useEffect(() => {
    const cepLimpo = unmask(formData.zip_code);
    
    if (cepLimpo.length === 8) {
      buscarCep(cepLimpo);
    }
  }, [formData.zip_code]);

  const carregarUnidades = async () => {
    try {
      setLoadingUnidades(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/unidades`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Erro ao carregar unidades");

      const data = await response.json();
      // Se for objeto paginado, pegar o array items
      const unidadesArray = Array.isArray(data) ? data : (data.items || []);

      // Filtrar apenas unidades SEM vínculo com estabelecimento
      const unidadesSemVinculo = unidadesArray.filter(u => !u.paytime_establishment_id);

      setUnidades(unidadesSemVinculo);
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar unidades");
      setUnidades([]); // Garantir array vazio em caso de erro
    } finally {
      setLoadingUnidades(false);
    }
  };

  const preencherComDadosUnidade = async (unidade: any) => {
    if (!unidade) return;

    // Buscar detalhes completos da unidade com endereço
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/unidades/${unidade.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Erro ao buscar detalhes da unidade");

      const unidadeCompleta = await response.json();
      const endereco = unidadeCompleta.endereco;

      setFormData(prev => ({
        ...prev,
        // Dados básicos da unidade
        type: "BUSINESS",
        document: unidade.cnpj || "",
        first_name: unidade.nome || "",
        last_name: unidade.nome || "",
        email: unidade.email || "",
        phone_number: unidade.telefone || "",
        
        // Endereço (se existir)
        zip_code: endereco?.cep || "",
        street: endereco?.logradouro || "",
        number: endereco?.numero || "",
        complement: endereco?.complemento || "",
        neighborhood: endereco?.bairro || "",
        city: endereco?.cidade || "",
        state: endereco?.estado || "",

        // Responsável (usar dados do franqueado ou deixar vazio para preenchimento manual)
        responsible_email: unidadeCompleta.franqueado?.email || "",
        responsible_first_name: unidadeCompleta.franqueado?.nome || "",
        responsible_document: unidadeCompleta.franqueado?.cpf || "",
        responsible_phone: unidadeCompleta.franqueado?.telefone || "",
      }));

      toast.success(`Dados da unidade "${unidade.nome}" carregados!`);
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados da unidade");
    }
  };

  const buscarCep = async (cep: string) => {
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      // Preencher automaticamente os campos
      setFormData(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));

      toast.success("Endereço encontrado!");
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    let maskedValue = value;

    // Aplicar máscaras conforme o campo
    if (name === "document") {
      maskedValue = formData.type === "BUSINESS" ? maskCNPJ(value) : maskCPF(value);
    } else if (name === "responsible_document") {
      maskedValue = maskCPF(value);
    } else if (name === "phone_number" || name === "responsible_phone") {
      maskedValue = maskPhone(value);
    } else if (name === "zip_code") {
      maskedValue = maskCEP(value);
    } else if (name === "cnae") {
      maskedValue = maskCNAE(value);
    } else if (name === "state") {
      // Estado sempre em maiúsculas e apenas letras
      maskedValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    }

    setFormData({
      ...formData,
      [name]: maskedValue,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = (): string | null => {
    // Estados brasileiros válidos
    const estadosValidos = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    // Validar documento do estabelecimento
    const doc = unmask(formData.document);
    if (formData.type === "BUSINESS") {
      if (!isValidCNPJ(doc)) return "CNPJ inválido";
      if (doc.length !== 14) return "CNPJ deve ter 14 dígitos";
    } else {
      if (!isValidCPF(doc)) return "CPF inválido";
      if (doc.length !== 11) return "CPF deve ter 11 dígitos";
    }

    // Validar CPF do responsável
    const respDoc = unmask(formData.responsible_document);
    if (!isValidCPF(respDoc)) return "CPF do responsável inválido";
    if (respDoc.length !== 11) return "CPF do responsável deve ter 11 dígitos";

    // Validar emails
    if (!isValidEmail(formData.email)) return "Email do estabelecimento inválido";
    if (!isValidEmail(formData.responsible_email)) return "Email do responsável inválido";

    // Validar estado (UF)
    if (!formData.state || formData.state.length !== 2) {
      return "Estado deve ter 2 letras (ex: ES, SP, RJ)";
    }
    if (!estadosValidos.includes(formData.state.toUpperCase())) {
      return "Estado inválido. Use a sigla correta (ex: ES, SP, RJ)";
    }

    // Validar idade do responsável
    if (formData.responsible_birthdate) {
      const age = calculateAge(formData.responsible_birthdate);
      if (age < 18) return "Responsável deve ter no mínimo 18 anos";
    } else {
      return "Data de nascimento do responsável é obrigatória";
    }

    // Validar CEP
    const cep = unmask(formData.zip_code);
    if (cep.length !== 8) return "CEP deve ter 8 dígitos";

    // Validar telefones (devem ter 10 ou 11 dígitos)
    const phone = unmask(formData.phone_number);
    if (phone.length < 10 || phone.length > 11) return "Telefone do estabelecimento deve ter 10 ou 11 dígitos";

    const respPhone = unmask(formData.responsible_phone);
    if (respPhone.length < 10 || respPhone.length > 11) return "Telefone do responsável deve ter 10 ou 11 dígitos";

    // Validar CNAE
    const cnae = unmask(formData.cnae);
    if (cnae.length !== 7) return "CNAE deve ter 7 dígitos";

    // Validar campos obrigatórios
    if (!formData.first_name) return "Razão Social é obrigatória";
    if (!formData.responsible_first_name) return "Nome do responsável é obrigatório";
    if (!formData.street) return "Logradouro é obrigatório";
    if (!formData.number) return "Número do endereço é obrigatório";
    if (!formData.neighborhood) return "Bairro é obrigatório";
    if (!formData.city) return "Cidade é obrigatória";
    if (!formData.state) return "Estado é obrigatório";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulário
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);

    try {
      // Montar payload conforme API Paytime (ordem e formato exatos)
      const payload: any = {
        type: formData.type,
        activity_id: formData.activity_id ? parseInt(formData.activity_id) : 30,
        visited: formData.visited,
        responsible: {
          email: formData.responsible_email,
          document: unmask(formData.responsible_document), // SEM formatação
          first_name: formData.responsible_first_name,
          phone: unmask(formData.responsible_phone), // SEM formatação
          birthdate: formData.responsible_birthdate,
        },
        address: {
          zip_code: unmask(formData.zip_code),
          street: formData.street,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state.toUpperCase(),
          number: formData.number,
        },
        first_name: formData.first_name,
        last_name: formData.last_name || formData.first_name,
        cnae: unmask(formData.cnae),
        document: unmask(formData.document), // SEM formatação
        phone_number: unmask(formData.phone_number), // SEM formatação
        email: formData.email,
        birthdate: formData.birthdate || new Date().toISOString().split('T')[0],
        revenue: formData.revenue ? parseFloat(formData.revenue) : 0,
        format: formData.format,
        gmv: formData.gmv ? parseFloat(formData.gmv) : 0,
      };

      // Adicionar campos opcionais apenas se preenchidos
      if (formData.notes) {
        payload.notes = formData.notes;
      }
      
      if (formData.complement) {
        payload.address.complement = formData.complement;
      }
      
      // NÃO enviar representative_id na criação - a API cria automaticamente
      // baseado nos dados do responsible

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();

      // Se foi selecionada uma unidade, vincular automaticamente
      if (selectedUnidade && data.id) {
        try {
          const vincularResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${data.id}/vincular-unidade/${selectedUnidade.id}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (vincularResponse.ok) {
            toast.success("Estabelecimento criado e vinculado à unidade com sucesso!");
          } else {
            console.warn("⚠️ Estabelecimento criado mas falha ao vincular unidade");
            toast.success("Estabelecimento criado! Porém, falha ao vincular com a unidade.");
          }
        } catch (vincularError) {
          console.error("❌ Erro ao vincular:", vincularError);
          toast.success("Estabelecimento criado! Porém, falha ao vincular com a unidade.");
        }
      } else {
        toast.success("Estabelecimento cadastrado com sucesso no Paytime!");
      }

      router.push("/admin/estabelecimentos");
    } catch (error: any) {
      console.error("❌ Erro:", error);
      toast.error(error.message || "Erro ao cadastrar estabelecimento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push("/admin/sistema")}
            variant="outline"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Cadastrar Novo Estabelecimento
          </h1>
          <p className="text-gray-600">
            Preencha as informações do estabelecimento
          </p>
        </div>

        {/* Form Cards */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seletor de Unidade TeamCruz */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Building2 className="w-5 h-5" />
                Vincular com Unidade TeamCruz (Opcional)
              </CardTitle>
              <CardDescription>
                Selecione uma unidade existente para preencher automaticamente os campos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Unidade Selecionada */}
                {selectedUnidade && (
                  <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-blue-900">
                            {selectedUnidade.nome.toUpperCase()}
                          </h3>
                        </div>
                        {selectedUnidade.cidade && (
                          <div className="flex items-center gap-2 text-sm text-blue-700">
                            <MapPin className="w-4 h-4" />
                            <span>{selectedUnidade.cidade}/{selectedUnidade.estado}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUnidade(null);
                          setSearchUnidade("");
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-200"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-blue-600 mt-2">
                      ✓ Unidade será automaticamente vinculada ao estabelecimento após criação
                    </p>
                  </div>
                )}

                {/* Busca de Unidades */}
                {!selectedUnidade && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Busque por nome ou localização..."
                        value={searchUnidade}
                        onChange={(e) => setSearchUnidade(e.target.value)}
                        className="pl-10"
                        disabled={loadingUnidades}
                      />
                    </div>

                    {/* Lista de Unidades */}
                    {searchUnidade && (
                      <div className="border rounded-lg max-h-60 overflow-y-auto">
                        {loadingUnidades ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                          </div>
                        ) : unidades
                            .filter(u => 
                              !u.paytime_establishment_id &&
                              (u.nome?.toLowerCase().includes(searchUnidade.toLowerCase()) ||
                              u.cidade?.toLowerCase().includes(searchUnidade.toLowerCase()) ||
                              u.estado?.toLowerCase().includes(searchUnidade.toLowerCase()))
                            ).length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>Nenhuma unidade encontrada</p>
                          </div>
                        ) : (
                          unidades
                            .filter(u => 
                              !u.paytime_establishment_id &&
                              (u.nome?.toLowerCase().includes(searchUnidade.toLowerCase()) ||
                              u.cidade?.toLowerCase().includes(searchUnidade.toLowerCase()) ||
                              u.estado?.toLowerCase().includes(searchUnidade.toLowerCase()))
                            )
                            .map((unidade) => (
                              <button
                                key={unidade.id}
                                type="button"
                                onClick={() => {
                                  setSelectedUnidade(unidade);
                                  setSearchUnidade("");
                                  preencherComDadosUnidade(unidade);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 truncate">
                                      {unidade.nome.toUpperCase()}
                                    </div>
                                    {unidade.cidade && (
                                      <div className="flex items-center gap-1 text-sm text-gray-500">
                                        <MapPin className="w-3 h-3" />
                                        <span>{unidade.cidade}/{unidade.estado}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

            {/* Tipo e Dados Básicos do Estabelecimento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Dados do Estabelecimento
                </CardTitle>
                <CardDescription>
                  Informações da empresa ou pessoa física
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleSelectChange("type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUSINESS">Pessoa Jurídica</SelectItem>
                        <SelectItem value="INDIVIDUAL">Pessoa Física</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">
                      {formData.type === "BUSINESS" ? "CNPJ *" : "CPF *"}
                    </Label>
                    <Input
                      id="document"
                      name="document"
                      value={formData.document}
                      onChange={handleChange}
                      placeholder={
                        formData.type === "BUSINESS"
                          ? "00.000.000/0000-00"
                          : "000.000.000-00"
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">
                      {formData.type === "BUSINESS" ? "Razão Social *" : "Nome Completo *"}
                    </Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="Nome da empresa ou pessoa"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">
                      {formData.type === "BUSINESS" ? "Nome Fantasia" : "Sobrenome"}
                    </Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder={
                        formData.type === "BUSINESS"
                          ? "Nome fantasia"
                          : "Sobrenome"
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email do Estabelecimento *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="contato@empresa.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Telefone *</Label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnae">CNAE *</Label>
                    <Input
                      id="cnae"
                      name="cnae"
                      value={formData.cnae}
                      onChange={handleChange}
                      placeholder="0000-0/00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Formato Jurídico *</Label>
                    <Select
                      value={formData.format}
                      onValueChange={(value) => handleSelectChange("format", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LTDA">LTDA</SelectItem>
                        <SelectItem value="SA">S.A.</SelectItem>
                        <SelectItem value="ME">ME</SelectItem>
                        <SelectItem value="MEI">MEI</SelectItem>
                        <SelectItem value="EI">EI</SelectItem>
                        <SelectItem value="EIRELI">EIRELI</SelectItem>
                        <SelectItem value="SLU">SLU</SelectItem>
                        <SelectItem value="ESI">ESI</SelectItem>
                        <SelectItem value="SS">SS</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="SPE">SPE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthdate">
                      {formData.type === "BUSINESS" ? "Data de Abertura" : "Data de Nascimento"}
                    </Label>
                    <Input
                      id="birthdate"
                      name="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="revenue">Faturamento Mensal (R$)</Label>
                    <Input
                      id="revenue"
                      name="revenue"
                      type="number"
                      value={formData.revenue}
                      onChange={handleChange}
                      placeholder="50000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gmv">Meta de Faturamento Anual (R$)</Label>
                    <Input
                      id="gmv"
                      name="gmv"
                      type="number"
                      value={formData.gmv}
                      onChange={handleChange}
                      placeholder="600000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados do Responsável */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Dados do Responsável
                </CardTitle>
                <CardDescription>
                  Pessoa responsável pelo estabelecimento (maior de 18 anos)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsible_first_name">Nome Completo *</Label>
                    <Input
                      id="responsible_first_name"
                      name="responsible_first_name"
                      value={formData.responsible_first_name}
                      onChange={handleChange}
                      placeholder="João da Silva"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsible_document">CPF *</Label>
                    <Input
                      id="responsible_document"
                      name="responsible_document"
                      value={formData.responsible_document}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsible_email">Email *</Label>
                    <Input
                      id="responsible_email"
                      name="responsible_email"
                      type="email"
                      value={formData.responsible_email}
                      onChange={handleChange}
                      placeholder="responsavel@email.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsible_phone">Telefone *</Label>
                    <Input
                      id="responsible_phone"
                      name="responsible_phone"
                      value={formData.responsible_phone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible_birthdate">Data de Nascimento *</Label>
                  <Input
                    id="responsible_birthdate"
                    name="responsible_birthdate"
                    type="date"
                    value={formData.responsible_birthdate}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    O responsável deve ter no mínimo 18 anos
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Endereço
                </CardTitle>
                <CardDescription>
                  Localização do estabelecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="zip_code">CEP *</Label>
                    <div className="relative">
                      <Input
                        id="zip_code"
                        name="zip_code"
                        value={formData.zip_code}
                        onChange={handleChange}
                        placeholder="00000-000"
                        required
                        disabled={loadingCep}
                      />
                      {loadingCep && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Logradouro *</Label>
                    <Input
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="Rua dos Desenvolvedores"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      name="number"
                      value={formData.number}
                      onChange={handleChange}
                      placeholder="123"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      name="complement"
                      value={formData.complement}
                      onChange={handleChange}
                      placeholder="Sala 01, Bloco A"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      name="neighborhood"
                      value={formData.neighborhood}
                      onChange={handleChange}
                      placeholder="Centro"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Vitória"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado (UF) *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => handleSelectChange("state", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="AC">AC - Acre</SelectItem>
                        <SelectItem value="AL">AL - Alagoas</SelectItem>
                        <SelectItem value="AP">AP - Amapá</SelectItem>
                        <SelectItem value="AM">AM - Amazonas</SelectItem>
                        <SelectItem value="BA">BA - Bahia</SelectItem>
                        <SelectItem value="CE">CE - Ceará</SelectItem>
                        <SelectItem value="DF">DF - Distrito Federal</SelectItem>
                        <SelectItem value="ES">ES - Espírito Santo</SelectItem>
                        <SelectItem value="GO">GO - Goiás</SelectItem>
                        <SelectItem value="MA">MA - Maranhão</SelectItem>
                        <SelectItem value="MT">MT - Mato Grosso</SelectItem>
                        <SelectItem value="MS">MS - Mato Grosso do Sul</SelectItem>
                        <SelectItem value="MG">MG - Minas Gerais</SelectItem>
                        <SelectItem value="PA">PA - Pará</SelectItem>
                        <SelectItem value="PB">PB - Paraíba</SelectItem>
                        <SelectItem value="PR">PR - Paraná</SelectItem>
                        <SelectItem value="PE">PE - Pernambuco</SelectItem>
                        <SelectItem value="PI">PI - Piauí</SelectItem>
                        <SelectItem value="RJ">RJ - Rio de Janeiro</SelectItem>
                        <SelectItem value="RN">RN - Rio Grande do Norte</SelectItem>
                        <SelectItem value="RS">RS - Rio Grande do Sul</SelectItem>
                        <SelectItem value="RO">RO - Rondônia</SelectItem>
                        <SelectItem value="RR">RR - Roraima</SelectItem>
                        <SelectItem value="SC">SC - Santa Catarina</SelectItem>
                        <SelectItem value="SP">SP - São Paulo</SelectItem>
                        <SelectItem value="SE">SE - Sergipe</SelectItem>
                        <SelectItem value="TO">TO - Tocantins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações Adicionais */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Adicionais</CardTitle>
                <CardDescription>Campos opcionais para gestão (opcional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="activity_id">ID Atividade Econômica</Label>
                    <Input
                      id="activity_id"
                      name="activity_id"
                      type="number"
                      value={formData.activity_id}
                      onChange={handleChange}
                      placeholder="Ex: 123"
                    />
                  </div>

                  {/* Campo representative_id removido - a API cria automaticamente baseado nos dados do responsible */}

                  <div className="space-y-2">
                    <Label htmlFor="visited" className="flex items-center gap-2">
                      Estabelecimento Visitado
                    </Label>
                    <Select
                      value={formData.visited.toString()}
                      onValueChange={(value) => 
                        setFormData({ ...formData, visited: value === "true" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Não</SelectItem>
                        <SelectItem value="true">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações Internas</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Observações internas sobre o estabelecimento..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/sistema")}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  "Cadastrando..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Cadastrar no Paytime
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </ProtectedRoute>
    );
  }
