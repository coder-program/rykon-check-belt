"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserCheck,
  Building2,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Unidade {
  id: string;
  nome: string;
  cnpj: string;
  telefone_celular?: string;
  email?: string;
}

interface VinculoData {
  unidade_id: string;
  cargo: string;
  turno: string;
  horario_entrada: string;
  horario_saida: string;
  dias_semana: string[];
  observacoes?: string;
}

export default function RecepcionistaOnboarding() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    nome: user?.nome || "",
    cpf: user?.cpf || "",
    telefone: user?.telefone || "",
    email: user?.email || "",
  });
  const [vinculos, setVinculos] = useState<VinculoData[]>([]);

  // Buscar todas as unidades
  const { data: unidades = [], isLoading } = useQuery<Unidade[]>({
    queryKey: ["unidades-all"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/unidades?pageSize=100`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      return data.items || [];
    },
  });

  // Mutation para atualizar dados do usuário
  const updateUsuarioMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/usuarios/${user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar dados");
      return res.json();
    },
  });

  // Mutation para criar vínculos
  const createVinculosMutation = useMutation({
    mutationFn: async (vinculos: VinculoData[]) => {
      const promises = vinculos.map((vinculo) =>
        fetch(`${API_URL}/recepcionista-unidades`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            usuario_id: user?.id,
            ...vinculo,
            ativo: true,
          }),
        }).then((res) => {
          if (!res.ok) throw new Error("Erro ao criar vínculo");
          return res.json();
        })
      );
      return Promise.all(promises);
    },
    onSuccess: async () => {
      // Marcar cadastro como completo
      await updateUsuarioMutation.mutateAsync({
        ...formData,
        cadastro_completo: true,
      });

      // Atualizar contexto do usuário
      if (refreshUser) {
        await refreshUser();
      }

      toast.success("Cadastro concluído com sucesso!");
      router.push("/dashboard");
    },
    onError: () => {
      toast.error("Erro ao finalizar cadastro");
    },
  });

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(2);
  };

  const handleAddVinculo = () => {
    setVinculos([
      ...vinculos,
      {
        unidade_id: "",
        cargo: "Recepcionista",
        turno: "INTEGRAL",
        horario_entrada: "08:00",
        horario_saida: "18:00",
        dias_semana: ["SEG", "TER", "QUA", "QUI", "SEX"],
        observacoes: "",
      },
    ]);
  };

  const handleRemoveVinculo = (index: number) => {
    setVinculos(vinculos.filter((_, i) => i !== index));
  };

  const handleVinculoChange = (
    index: number,
    field: keyof VinculoData,
    value: any
  ) => {
    const newVinculos = [...vinculos];
    newVinculos[index] = {
      ...newVinculos[index],
      [field]: value,
    };
    setVinculos(newVinculos);
  };

  const handleFinalizarCadastro = async () => {
    if (vinculos.length === 0) {
      toast.error("Selecione pelo menos uma unidade");
      return;
    }

    // Validar que todas as unidades foram selecionadas
    const hasEmptyUnidade = vinculos.some((v) => !v.unidade_id);
    if (hasEmptyUnidade) {
      toast.error("Selecione uma unidade para todos os vínculos");
      return;
    }

    createVinculosMutation.mutate(vinculos);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <UserCheck className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete seu Cadastro
          </h1>
          <p className="text-gray-600">
            Bem-vindo ao sistema! Complete suas informações para começar.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              {currentStep > 1 ? <CheckCircle2 className="h-6 w-6" /> : "1"}
            </div>
            <div className="w-24 h-1 bg-gray-300 mx-2">
              <div
                className={`h-full ${
                  currentStep > 1 ? "bg-blue-600" : "bg-gray-300"
                } transition-all duration-300`}
              ></div>
            </div>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= 2
                  ? "bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              2
            </div>
          </div>
        </div>

        {/* Step 1: Dados Pessoais */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Etapa 1: Dados Pessoais
              </CardTitle>
              <CardDescription>
                Confirme ou complete suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nome Completo *
                  </label>
                  <Input
                    required
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      CPF *
                    </label>
                    <Input
                      required
                      value={formData.cpf}
                      onChange={(e) =>
                        setFormData({ ...formData, cpf: e.target.value })
                      }
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Telefone *
                    </label>
                    <Input
                      required
                      value={formData.telefone}
                      onChange={(e) =>
                        setFormData({ ...formData, telefone: e.target.value })
                      }
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email *
                  </label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit">
                    Próxima Etapa
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Seleção de Unidades */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Etapa 2: Unidades de Trabalho
              </CardTitle>
              <CardDescription>
                Selecione as unidades onde você irá trabalhar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {vinculos.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">
                      Nenhuma unidade selecionada ainda
                    </p>
                    <Button onClick={handleAddVinculo}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Adicionar Unidade
                    </Button>
                  </div>
                )}

                {vinculos.map((vinculo, index) => (
                  <Card key={index} className="border-2 border-blue-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Unidade {index + 1}
                        </CardTitle>
                        {vinculos.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVinculo(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Unidade *
                        </label>
                        <select
                          required
                          value={vinculo.unidade_id}
                          onChange={(e) =>
                            handleVinculoChange(
                              index,
                              "unidade_id",
                              e.target.value
                            )
                          }
                          className="w-full border rounded p-2"
                        >
                          <option value="">Selecione a unidade...</option>
                          {unidades.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nome} - {u.cnpj}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Cargo
                          </label>
                          <Input
                            value={vinculo.cargo}
                            onChange={(e) =>
                              handleVinculoChange(
                                index,
                                "cargo",
                                e.target.value
                              )
                            }
                            placeholder="Ex: Recepcionista"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Turno
                          </label>
                          <select
                            value={vinculo.turno}
                            onChange={(e) =>
                              handleVinculoChange(
                                index,
                                "turno",
                                e.target.value
                              )
                            }
                            className="w-full border rounded p-2"
                          >
                            <option value="MANHA">Manhã</option>
                            <option value="TARDE">Tarde</option>
                            <option value="NOITE">Noite</option>
                            <option value="INTEGRAL">Integral</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Horário Entrada
                          </label>
                          <Input
                            type="time"
                            value={vinculo.horario_entrada}
                            onChange={(e) =>
                              handleVinculoChange(
                                index,
                                "horario_entrada",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Horário Saída
                          </label>
                          <Input
                            type="time"
                            value={vinculo.horario_saida}
                            onChange={(e) =>
                              handleVinculoChange(
                                index,
                                "horario_saida",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Dias da Semana
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {[
                            "SEG",
                            "TER",
                            "QUA",
                            "QUI",
                            "SEX",
                            "SAB",
                            "DOM",
                          ].map((dia) => (
                            <label
                              key={dia}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Checkbox
                                checked={vinculo.dias_semana.includes(dia)}
                                onCheckedChange={(checked) => {
                                  const newDias = checked
                                    ? [...vinculo.dias_semana, dia]
                                    : vinculo.dias_semana.filter(
                                        (d) => d !== dia
                                      );
                                  handleVinculoChange(
                                    index,
                                    "dias_semana",
                                    newDias
                                  );
                                }}
                              />
                              <span className="text-sm">{dia}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Observações
                        </label>
                        <textarea
                          value={vinculo.observacoes}
                          onChange={(e) =>
                            handleVinculoChange(
                              index,
                              "observacoes",
                              e.target.value
                            )
                          }
                          className="w-full border rounded p-2"
                          rows={2}
                          placeholder="Informações adicionais sobre este vínculo..."
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {vinculos.length > 0 && vinculos.length < unidades.length && (
                  <Button
                    variant="outline"
                    onClick={handleAddVinculo}
                    className="w-full"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Adicionar Outra Unidade
                  </Button>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Voltar
                  </Button>
                  <Button
                    onClick={handleFinalizarCadastro}
                    disabled={
                      createVinculosMutation.isPending || vinculos.length === 0
                    }
                  >
                    {createVinculosMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Finalizando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Finalizar Cadastro
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
