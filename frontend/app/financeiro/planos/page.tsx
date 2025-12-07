"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, XCircle, DollarSign } from "lucide-react";

interface Plano {
  id: string;
  unidade_id: string;
  unidade_nome?: string;
  nome: string;
  descricao?: string;
  tipo: "MENSAL" | "SEMESTRAL" | "ANUAL" | "AVULSO";
  valor: number;
  duracao_dias: number;
  ativo: boolean;
  beneficios?: string;
  max_alunos?: number;
  created_at: string;
}

interface Unidade {
  id: string;
  nome: string;
}

const TIPOS_PLANO = [
  { value: "MENSAL", label: "Mensal", dias: 30 },
  { value: "SEMESTRAL", label: "Semestral", dias: 180 },
  { value: "ANUAL", label: "Anual", dias: 365 },
  { value: "AVULSO", label: "Avulso", dias: 1 },
];

export default function Planos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [filteredPlanos, setFilteredPlanos] = useState<Plano[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [isFranqueado, setIsFranqueado] = useState(false);
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>("todas");
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    tipo: "MENSAL",
    valor: "",
    duracao_dias: "30",
    beneficios: "",
    max_alunos: "",
    unidade_id: "",
    ativo: true,
  });

  useEffect(() => {
    carregarPlanos();
  }, []);

  useEffect(() => {
    // Filtrar planos por unidade
    if (unidadeFiltro === "todas") {
      setFilteredPlanos(planos);
    } else {
      setFilteredPlanos(planos.filter((p) => p.unidade_id === unidadeFiltro));
    }
  }, [planos, unidadeFiltro]);

  const carregarPlanos = async () => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      const user = JSON.parse(userData || "{}");

      // Detectar franqueado
      const franqueadoDetected = user.perfis?.some(
        (p: any) =>
          (typeof p === "string" && p.toLowerCase() === "franqueado") ||
          (typeof p === "object" && p?.nome?.toLowerCase() === "franqueado")
      );
      setIsFranqueado(franqueadoDetected);

      // Se não é franqueado, setar unidade_id no formData
      if (!franqueadoDetected && user.unidade_id) {
        setFormData((prev) => ({ ...prev, unidade_id: user.unidade_id }));
      }

      // Carregar unidades se for franqueado
      if (franqueadoDetected) {
        const unidadesRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/unidades?pageSize=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (unidadesRes.ok) {
          const unidadesData = await unidadesRes.json();
          // A API retorna { items: [...], page, pageSize, total }
          const unidadesArray = unidadesData.items || [];
          setUnidades(unidadesArray);
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/planos?unidadeId=${user.unidade_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlanos(data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar planos:", error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData = localStorage.getItem("user");
    const user = JSON.parse(userData || "{}");

    try {
      const token = localStorage.getItem("token");
      const url = editingPlano
        ? `${process.env.NEXT_PUBLIC_API_URL}/financeiro/planos/${editingPlano.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/financeiro/planos`;

      const response = await fetch(url, {
        method: editingPlano ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          valor: parseFloat(formData.valor),
          duracao_dias: parseInt(formData.duracao_dias),
          max_alunos: formData.max_alunos
            ? parseInt(formData.max_alunos)
            : null,
          unidade_id: formData.unidade_id,
        }),
      });

      if (response.ok) {
        alert(editingPlano ? "Plano atualizado!" : "Plano criado!");
        setShowDialog(false);
        resetForm();
        carregarPlanos();
      } else {
        alert("Erro ao salvar plano");
      }
    } catch (error) {
      console.error("Erro ao salvar plano:", error);
      alert("Erro ao salvar plano");
    }
  };

  const handleEdit = (plano: Plano) => {
    setEditingPlano(plano);
    setFormData({
      nome: plano.nome || "",
      descricao: plano.descricao || "",
      tipo: plano.tipo || "MENSAL",
      valor: plano.valor?.toString() || "0",
      duracao_dias: plano.duracao_dias?.toString() || "30",
      beneficios: plano.beneficios || "",
      max_alunos: plano.max_alunos?.toString() || "",
      unidade_id: plano.unidade_id || "",
      ativo: plano.ativo ?? true,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Deseja inativar este plano? Ele não poderá mais ser atribuído a novos alunos."
      )
    )
      return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/planos/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert("Plano inativado com sucesso!");
        carregarPlanos();
      }
    } catch (error) {
      console.error("Erro ao inativar plano:", error);
    }
  };

  const handleTipoChange = (tipo: string) => {
    const tipoSelecionado = TIPOS_PLANO.find((t) => t.value === tipo);
    setFormData({
      ...formData,
      tipo,
      duracao_dias: tipoSelecionado?.dias.toString() || "30",
    });
  };

  const resetForm = () => {
    setEditingPlano(null);
    setFormData({
      nome: "",
      descricao: "",
      tipo: "MENSAL",
      valor: "",
      duracao_dias: "30",
      beneficios: "",
      max_alunos: "",
      ativo: true,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      MENSAL: "bg-blue-100 text-blue-800",
      SEMESTRAL: "bg-purple-100 text-purple-800",
      ANUAL: "bg-orange-100 text-orange-800",
      AVULSO: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={colors[tipo] || "bg-gray-100 text-gray-800"}>
        {TIPOS_PLANO.find((t) => t.value === tipo)?.label || tipo}
      </Badge>
    );
  };

  const getPeriodoTexto = (tipo: string, duracao_dias: number) => {
    const periodos: Record<string, string> = {
      MENSAL: "por mês",
      SEMESTRAL: "por semestre",
      ANUAL: "por ano",
      AVULSO: "por dia",
    };
    return periodos[tipo] || `${duracao_dias} dias`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planos</h1>
          <p className="text-gray-600 mt-1">Gerencie os planos de assinatura</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {/* Filtro por Unidade (apenas para franqueados) */}
      {isFranqueado && unidades.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Filtrar por Unidade:
              </label>
              <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Unidades</SelectItem>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlanos.map((plano) => (
          <Card
            key={plano.id}
            className={
              !plano.ativo
                ? "border-2 border-red-300 bg-gray-50 opacity-75"
                : ""
            }
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle
                    className={`text-xl ${!plano.ativo ? "text-gray-500" : ""}`}
                  >
                    {plano.nome}
                    {!plano.ativo && (
                      <span className="text-red-600 ml-2">(Inativo)</span>
                    )}
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    {getTipoBadge(plano.tipo)}
                    {!plano.ativo && (
                      <Badge className="bg-red-100 text-red-800 border border-red-300">
                        🚫 Indisponível
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(plano)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(plano.id)}
                    title="Inativar plano"
                  >
                    <XCircle className="h-4 w-4 text-orange-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preço */}
              <div className="text-center py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
                <p className="text-3xl font-bold">
                  {formatCurrency(plano.valor)}
                </p>
                <p className="text-sm mt-1">
                  {getPeriodoTexto(plano.tipo, plano.duracao_dias)}
                </p>
              </div>

              {/* Descrição */}
              {plano.descricao && (
                <div>
                  <p className="text-sm text-gray-600">{plano.descricao}</p>
                </div>
              )}

              {/* Benefícios */}
              {plano.beneficios && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Benefícios:
                  </p>
                  <div className="space-y-1">
                    {plano.beneficios.split("\n").map((beneficio, index) => (
                      <p
                        key={index}
                        className="text-sm text-gray-600 flex items-start"
                      >
                        <span className="text-green-600 mr-2">✓</span>
                        {beneficio}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Limite de Alunos */}
              {plano.max_alunos && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">
                    Máximo de {plano.max_alunos} alunos
                  </p>
                </div>
              )}

              {/* Informações Extras */}
              <div className="pt-2 border-t text-xs text-gray-500 space-y-1">
                <p>
                  Duração:{" "}
                  {TIPOS_PLANO.find((t) => t.value === plano.tipo)?.label ||
                    plano.duracao_dias + " dias"}
                </p>
                {plano.unidade_nome && (
                  <p className="text-blue-600 font-medium">
                    📍 {plano.unidade_nome}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredPlanos.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              {planos.length === 0
                ? "Nenhum plano cadastrado"
                : "Nenhum plano encontrado para esta unidade"}
            </p>
            <p className="text-sm mt-2">
              {planos.length === 0
                ? "Comece criando seu primeiro plano de assinatura"
                : "Selecione outra unidade ou crie um novo plano"}
            </p>
            <Button onClick={() => setShowDialog(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              {planos.length === 0 ? "Criar Primeiro Plano" : "Novo Plano"}
            </Button>
          </div>
        )}
      </div>

      {/* Dialog de Plano */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlano ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nome do Plano
                </label>
                <Input
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Plano Mensal Premium"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Tipo
                </label>
                <Select value={formData.tipo} onValueChange={handleTipoChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PLANO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campo de Unidade - Select para Franqueado, Readonly para outros */}
            {isFranqueado ? (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Unidade *
                </label>
                <Select
                  value={formData.unidade_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unidade_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(unidades) && unidades.length > 0 ? (
                      unidades.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500 text-center">
                        Nenhuma unidade disponível
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Unidade
                </label>
                <Input
                  value={formData.unidade_id}
                  disabled
                  className="bg-gray-100"
                  placeholder="Unidade padrão"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">
                Descrição
              </label>
              <Textarea
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Descreva o plano"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Valor (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Duração (dias)
                </label>
                <Input
                  type="number"
                  value={formData.duracao_dias}
                  onChange={(e) =>
                    setFormData({ ...formData, duracao_dias: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Benefícios (um por linha)
              </label>
              <Textarea
                value={formData.beneficios}
                onChange={(e) =>
                  setFormData({ ...formData, beneficios: e.target.value })
                }
                placeholder="Acesso ilimitado&#10;2 aulas por semana&#10;Suporte prioritário"
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Máximo de Alunos (opcional)
              </label>
              <Input
                type="number"
                value={formData.max_alunos}
                onChange={(e) =>
                  setFormData({ ...formData, max_alunos: e.target.value })
                }
                placeholder="Deixe em branco para ilimitado"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) =>
                  setFormData({ ...formData, ativo: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <label
                htmlFor="ativo"
                className="text-sm font-medium text-gray-700"
              >
                Plano ativo (disponível para assinaturas)
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingPlano ? "Atualizar" : "Criar"} Plano
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
