"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Users,
  MapPin,
  ArrowLeft,
  Save,
  X,
} from "lucide-react";

interface Unidade {
  id: string;
  nome: string;
}

interface Professor {
  id: string;
  nome_completo: string;
}

interface Aula {
  id: string;
  nome: string;
  descricao?: string;
  unidade_id: string;
  unidade?: {
    nome: string;
  };
  professor_id?: string;
  professor?: {
    nome_completo: string;
  };
  tipo: string;
  dia_semana: number;
  data_hora_inicio?: string;
  data_hora_fim?: string;
  capacidade_maxima: number;
  ativo: boolean;
  created_at: string;
}

export default function AulasPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [professoresFiltrados, setProfessoresFiltrados] = useState<Professor[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAula, setEditingAula] = useState<Aula | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    unidade_id: "",
    professor_id: "",
    tipo: "GI",
    dia_semana: 1,
    hora_inicio: "19:00",
    hora_fim: "20:30",
    capacidade_maxima: 30,
    ativo: true,
  });

  // Validação para nome da aula
  const validateNomeAula = (value: string): string => {
    // Remove caracteres não permitidos: apenas letras, números, espaços, hífens e parênteses
    return value.replace(/[^a-zA-ZÀ-ÿ\s\-\(\)0-9]/g, "");
  };

  // Validação para descrição
  const validateDescricao = (value: string): string => {
    // Remove caracteres não permitidos: apenas letras, números, espaços e pontuação básica
    return value.replace(/[^a-zA-ZÀ-ÿ\s\-\(\)\.\,\;0-9]/g, "");
  };

  const diasSemana = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Segunda-feira" },
    { value: 2, label: "Terça-feira" },
    { value: 3, label: "Quarta-feira" },
    { value: 4, label: "Quinta-feira" },
    { value: 5, label: "Sexta-feira" },
    { value: 6, label: "Sábado" },
  ];

  const tiposAula = [
    { value: "GI", label: "Gi (com kimono)" },
    { value: "NO_GI", label: "NoGi (sem kimono)" },
    { value: "INFANTIL", label: "Infantil" },
    { value: "FEMININO", label: "Feminino" },
    { value: "COMPETICAO", label: "Competição" },
    { value: "LIVRE", label: "Livre / Open Mat" },
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar professores quando unidade mudar
  useEffect(() => {
    if (formData.unidade_id) {
      loadProfessoresDaUnidade(formData.unidade_id);
    } else {
      setProfessoresFiltrados([]);
    }
  }, [formData.unidade_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Buscar dados do usuário para pegar a unidade (se houver)
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/me`,
        { headers }
      );
      let unidadeDoUsuario = null;

      if (userResponse.ok) {
        const userData = await userResponse.json();

        // Tentar pegar unidade do aluno
        if (userData.aluno?.unidade_id) {
          unidadeDoUsuario = userData.aluno.unidade_id;
        }
        // Se não for aluno, tentar pegar da primeira unidade como gerente
        else if (userData.unidades?.length > 0) {
          unidadeDoUsuario = userData.unidades[0].id;
        }
        // Se for professor
        else if (userData.professor?.unidade_id) {
          unidadeDoUsuario = userData.professor.unidade_id;
        }
      }

      // Carregar aulas - o backend já filtra automaticamente por perfil
      // Franqueados verão todas as suas unidades, outros perfis verão apenas a sua unidade
      const aulasUrl = `${process.env.NEXT_PUBLIC_API_URL}/aulas`;

      // Carregar aulas, unidades e professores em paralelo
      const [aulasRes, unidadesRes, professoresRes] = await Promise.all([
        fetch(aulasUrl, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/unidades`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/professores`, { headers }),
      ]);

      if (aulasRes.ok) {
        const data = await aulasRes.json();
        console.log("📋 Aulas carregadas:", data.length);
        setAulas(data);
      }

      if (unidadesRes.ok) {
        const data = await unidadesRes.json();
        const unidadesArray = Array.isArray(data) ? data : data.items || [];

        // Para não-franqueados, filtrar apenas sua unidade
        if (unidadeDoUsuario) {
          const unidadesFiltradas = unidadesArray.filter(
            (u: Unidade) => u.id === unidadeDoUsuario
          );
          setUnidades(unidadesFiltradas);
          // Já preencher a unidade no form
          if (unidadesFiltradas.length > 0) {
            setFormData((prev) => ({
              ...prev,
              unidade_id: unidadesFiltradas[0].id,
            }));
          }
        } else {
          // Franqueado vê todas as unidades
          setUnidades(unidadesArray);
        }
      }

      if (professoresRes.ok) {
        const data = await professoresRes.json();
        setProfessores(Array.isArray(data) ? data : data.items || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfessoresDaUnidade = async (unidadeId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/professores?unidade_id=${unidadeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const professoresList = Array.isArray(data) ? data : data.items || [];
        setProfessoresFiltrados(professoresList);
      } else {
        console.warn("Nenhum professor encontrado para esta unidade");
        setProfessoresFiltrados([]);
      }
    } catch (error) {
      console.error("Erro ao carregar professores da unidade:", error);
      setProfessoresFiltrados([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações de frontend
    if (formData.nome.length < 3) {
      alert("Nome da aula deve ter pelo menos 3 caracteres");
      return;
    }

    if (formData.nome.length > 80) {
      alert("Nome da aula deve ter no máximo 80 caracteres");
      return;
    }

    if (formData.descricao.length > 500) {
      alert("Descrição deve ter no máximo 500 caracteres");
      return;
    }

    // Verificar se contém apenas caracteres válidos
    const nomeValido = /^[a-zA-ZÀ-ÿ\s\-\(\)0-9]+$/.test(formData.nome);
    if (!nomeValido) {
      alert(
        "Nome da aula contém caracteres não permitidos. Use apenas letras, números, espaços, hífens e parênteses."
      );
      return;
    }

    const descricaoValida = /^[a-zA-ZÀ-ÿ\s\-\(\)\.\,\;0-9]*$/.test(
      formData.descricao
    );
    if (!descricaoValida) {
      alert(
        "Descrição contém caracteres não permitidos. Use apenas letras, números, espaços e pontuação básica."
      );
      return;
    }

    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Para aulas recorrentes, usamos apenas hora sem data específica
    // O backend vai criar timestamps genéricos com o dia da semana
    const [horaInicio, minInicio] = formData.hora_inicio.split(":").map(Number);
    const [horaFim, minFim] = formData.hora_fim.split(":").map(Number);

    // Usar uma data base qualquer (próximo dia da semana escolhido)
    const hoje = new Date();
    const diasAte = (formData.dia_semana - hoje.getDay() + 7) % 7;
    const dataBase = new Date(hoje);
    dataBase.setDate(hoje.getDate() + diasAte);
    dataBase.setHours(0, 0, 0, 0);

    const data_hora_inicio = new Date(dataBase);
    data_hora_inicio.setHours(horaInicio, minInicio, 0, 0);

    const data_hora_fim = new Date(dataBase);
    data_hora_fim.setHours(horaFim, minFim, 0, 0);

    const payload = {
      nome: formData.nome,
      descricao: formData.descricao || undefined,
      unidade_id: formData.unidade_id,
      professor_id: formData.professor_id || undefined,
      tipo: formData.tipo,
      dia_semana: formData.dia_semana,
      data_hora_inicio: data_hora_inicio.toISOString(),
      data_hora_fim: data_hora_fim.toISOString(),
      capacidade_maxima: formData.capacidade_maxima,
      ativo: formData.ativo,
    };

    try {
      const url = editingAula
        ? `${process.env.NEXT_PUBLIC_API_URL}/aulas/${editingAula.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/aulas`;

      const method = editingAula ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await loadData();
        handleCancel();
      } else {
        const error = await response.json();
        alert(`Erro: ${error.message || "Erro ao salvar aula"}`);
      }
    } catch (error) {
      console.error("Erro ao salvar aula:", error);
      alert("Erro ao salvar aula");
    }
  };

  const handleEdit = (aula: Aula) => {
    setEditingAula(aula);

    // Extrair hora de data_hora_inicio
    const inicio = aula.data_hora_inicio
      ? new Date(aula.data_hora_inicio)
      : null;
    const fim = aula.data_hora_fim ? new Date(aula.data_hora_fim) : null;

    setFormData({
      nome: aula.nome,
      descricao: aula.descricao || "",
      unidade_id: aula.unidade_id,
      professor_id: aula.professor_id || "",
      tipo: aula.tipo,
      dia_semana: aula.dia_semana,
      hora_inicio: inicio
        ? `${String(inicio.getHours()).padStart(2, "0")}:${String(
            inicio.getMinutes()
          ).padStart(2, "0")}`
        : "19:00",
      hora_fim: fim
        ? `${String(fim.getHours()).padStart(2, "0")}:${String(
            fim.getMinutes()
          ).padStart(2, "0")}`
        : "20:30",
      capacidade_maxima: aula.capacidade_maxima,
      ativo: aula.ativo,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aulas/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        await loadData();
      } else {
        alert("Erro ao excluir aula");
      }
    } catch (error) {
      console.error("Erro ao excluir aula:", error);
      alert("Erro ao excluir aula");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAula(null);
    setFormData({
      nome: "",
      descricao: "",
      unidade_id: "",
      professor_id: "",
      tipo: "GI",
      dia_semana: 1,
      hora_inicio: "19:00",
      hora_fim: "20:30",
      capacidade_maxima: 30,
      ativo: true,
    });
  };

  const getDiaSemanaLabel = (dia: number) => {
    return diasSemana.find((d) => d.value === dia)?.label || "N/A";
  };

  const getTipoAulaLabel = (tipo: string) => {
    return tiposAula.find((t) => t.value === tipo)?.label || tipo;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Gerenciamento de Aulas
                </h1>
                <p className="text-gray-600">
                  Cadastre e gerencie as aulas das unidades
                </p>
              </div>
            </div>
          </div>

          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Aula
            </Button>
          )}
        </div>

        {/* Formulário */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {editingAula ? "Editar Aula" : "Cadastrar Nova Aula Recorrente"}
              </CardTitle>
              <CardDescription>
                As aulas cadastradas se repetem automaticamente todas as semanas
                no mesmo dia e horário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Aula Recorrente:</strong> Você cadastra a aula uma
                  vez e ela aparecerá automaticamente toda semana no dia e
                  horário escolhidos. Não precisa cadastrar novamente!
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome da Aula *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => {
                        const validatedValue = validateNomeAula(e.target.value);
                        if (validatedValue.length <= 80) {
                          setFormData({ ...formData, nome: validatedValue });
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Jiu-Jitsu Gi Fundamental"
                      maxLength={80}
                      minLength={3}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.nome.length}/80 caracteres - Apenas letras,
                      números, espaços, hífens e parênteses
                    </p>
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo de Aula *
                    </label>
                    <select
                      required
                      value={formData.tipo}
                      onChange={(e) =>
                        setFormData({ ...formData, tipo: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {tiposAula.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unidade */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Unidade *
                    </label>
                    <select
                      required
                      value={formData.unidade_id}
                      onChange={(e) => {
                        const newUnidadeId = e.target.value;
                        setFormData({
                          ...formData,
                          unidade_id: newUnidadeId,
                          professor_id: "", // Limpa professor ao mudar unidade
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Selecione uma unidade</option>
                      {unidades.map((unidade) => (
                        <option key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Professor */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Professor
                    </label>
                    <select
                      value={formData.professor_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professor_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      disabled={!formData.unidade_id}
                    >
                      <option value="">
                        {!formData.unidade_id
                          ? "Selecione uma unidade primeiro"
                          : professoresFiltrados.length === 0
                          ? "Nenhum professor nesta unidade"
                          : "A definir"}
                      </option>
                      {professoresFiltrados.map((prof) => (
                        <option key={prof.id} value={prof.id}>
                          {prof.nome_completo}
                        </option>
                      ))}
                    </select>
                    {formData.unidade_id &&
                      professoresFiltrados.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Esta unidade ainda não tem professores cadastrados
                        </p>
                      )}
                  </div>

                  {/* Dia da Semana */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Dia da Semana *
                    </label>
                    <select
                      required
                      value={formData.dia_semana}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dia_semana: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {diasSemana.map((dia) => (
                        <option key={dia.value} value={dia.value}>
                          {dia.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Horários */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Hora Início *
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.hora_inicio}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hora_inicio: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Hora Fim *
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.hora_fim}
                        onChange={(e) =>
                          setFormData({ ...formData, hora_fim: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Capacidade */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Capacidade Máxima *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.capacidade_maxima}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacidade_maxima: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  {/* Ativo */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.ativo}
                      onChange={(e) =>
                        setFormData({ ...formData, ativo: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium">Aula Ativa</label>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => {
                      const validatedValue = validateDescricao(e.target.value);
                      if (validatedValue.length <= 500) {
                        setFormData({ ...formData, descricao: validatedValue });
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Descrição da aula (opcional)"
                    maxLength={500}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.descricao.length}/500 caracteres - Apenas letras,
                    números, espaços e pontuação básica
                  </p>
                </div>

                {/* Botões */}
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingAula ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Aulas */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">Carregando aulas...</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {aulas.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">
                    Nenhuma aula cadastrada ainda.
                  </p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeira Aula
                  </Button>
                </CardContent>
              </Card>
            ) : (
              aulas.map((aula) => (
                <Card
                  key={aula.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{aula.nome}</h3>
                          {aula.ativo ? (
                            <Badge className="bg-green-100 text-green-800">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">
                              Inativa
                            </Badge>
                          )}
                          <Badge className="bg-blue-100 text-blue-800">
                            {getTipoAulaLabel(aula.tipo)}
                          </Badge>
                        </div>

                        {aula.descricao && (
                          <p className="text-gray-600 mb-3">{aula.descricao}</p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{aula.unidade?.nome || "N/A"}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>
                              {aula.professor?.nome_completo || "A definir"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{getDiaSemanaLabel(aula.dia_semana)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>
                              {aula.data_hora_inicio
                                ? new Date(
                                    aula.data_hora_inicio
                                  ).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "N/A"}{" "}
                              -{" "}
                              {aula.data_hora_fim
                                ? new Date(
                                    aula.data_hora_fim
                                  ).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(aula)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(aula.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
