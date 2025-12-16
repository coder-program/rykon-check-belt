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
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: "" });
  const [errorDialog, setErrorDialog] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: "" });
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    planoId: string | null;
  }>({ isOpen: false, planoId: null });

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

      console.log("=== CARREGANDO PLANOS ===");
      console.log("User:", user);

      // Detectar franqueado
      const franqueadoDetected = user.perfis?.some(
        (p: any) =>
          (typeof p === "string" && p.toLowerCase() === "franqueado") ||
          (typeof p === "object" && p?.nome?.toLowerCase() === "franqueado")
      );
      console.log("É franqueado?", franqueadoDetected);
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
          console.log("Unidades carregadas:", unidadesArray);
          setUnidades(unidadesArray);

          // Se o franqueado tem apenas 1 unidade, seleciona automaticamente
          if (unidadesArray.length === 1) {
            console.log(
              "✅ Franqueado com 1 unidade - aplicando filtro automático:",
              unidadesArray[0].id
            );
            setUnidadeFiltro(unidadesArray[0].id);
          }
        }
      }

      // Carregar planos
      // Para franqueado: buscar todos os planos (sem filtro de unidade)
      // Para outros perfis: filtrar por unidade_id do usuário
      const planosUrl = franqueadoDetected
        ? `${process.env.NEXT_PUBLIC_API_URL}/financeiro/planos`
        : `${process.env.NEXT_PUBLIC_API_URL}/financeiro/planos?unidadeId=${user.unidade_id}`;

      console.log("URL para buscar planos:", planosUrl);

      const response = await fetch(planosUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Planos carregados (raw):", data);
        console.log("Tipo de data:", typeof data, Array.isArray(data));
        setPlanos(data);
      } else {
        const errorText = await response.text();
        console.error(
          "Erro ao carregar planos:",
          response.status,
          response.statusText,
          errorText
        );
      }
      setLoading(false);
    } catch (error) {
      console.error("=== ERRO AO CARREGAR PLANOS ===");
      console.error("Erro ao carregar planos:", error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData = localStorage.getItem("user");
    const user = JSON.parse(userData || "{}");

    console.log("=== SUBMITTING PLANO ===");
    console.log("User data:", user);
    console.log("Form data:", formData);
    console.log("Editing plano:", editingPlano);

    try {
      const token = localStorage.getItem("token");
      const url = editingPlano
        ? `${process.env.NEXT_PUBLIC_API_URL}/financeiro/planos/${editingPlano.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/financeiro/planos`;

      const payload = {
        ...formData,
        valor: parseFloat(formData.valor),
        duracao_dias: parseInt(formData.duracao_dias),
        max_alunos: formData.max_alunos ? parseInt(formData.max_alunos) : null,
        // Se não é franqueado, garantir que sempre envie a unidade do usuário
        unidade_id:
          formData.unidade_id ||
          (isFranqueado ? null : user.unidade_id) ||
          null,
      };

      console.log("URL:", url);
      console.log("Method:", editingPlano ? "PATCH" : "POST");
      console.log("Payload:", payload);

      const response = await fetch(url, {
        method: editingPlano ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (response.ok) {
        const responseData = await response.json();
        console.log("Response data:", responseData);
        setSuccessDialog({
          isOpen: true,
          message: editingPlano
            ? "Plano atualizado com sucesso!"
            : "Plano criado com sucesso!",
        });
        setShowDialog(false);
        resetForm();
        carregarPlanos();
      } else {
        const errorData = await response.text();
        console.error("Error response:", errorData);
        setErrorDialog({
          isOpen: true,
          message: "Erro ao salvar plano",
        });
      }
    } catch (error) {
      console.error("=== ERRO AO SALVAR PLANO ===");
      console.error("Erro ao salvar plano:", error);
      setErrorDialog({
        isOpen: true,
        message: "Erro ao salvar plano",
      });
    }
  };

  const handleEdit = (plano: Plano) => {
    const userData = localStorage.getItem("user");
    const user = JSON.parse(userData || "{}");

    setEditingPlano(plano);
    setFormData({
      nome: plano.nome || "",
      descricao: plano.descricao || "",
      tipo: plano.tipo || "MENSAL",
      valor: plano.valor?.toString() || "0",
      duracao_dias: plano.duracao_dias?.toString() || "30",
      beneficios: plano.beneficios || "",
      max_alunos: plano.max_alunos?.toString() || "",
      // Se não é franqueado, usar sempre a unidade do usuário
      unidade_id: isFranqueado
        ? plano.unidade_id || ""
        : user.unidade_id || plano.unidade_id || "",
      ativo: plano.ativo ?? true,
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDelete({ isOpen: true, planoId: id });
  };

  const confirmDeletePlano = async () => {
    if (!confirmDelete.planoId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/planos/${confirmDelete.planoId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setSuccessDialog({
          isOpen: true,
          message: "Plano inativado com sucesso!",
        });
        carregarPlanos();
      } else {
        setErrorDialog({
          isOpen: true,
          message: "Erro ao inativar plano",
        });
      }
    } catch (error) {
      console.error("Erro ao inativar plano:", error);
      setErrorDialog({
        isOpen: true,
        message: "Erro ao inativar plano",
      });
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {editingPlano ? "✏️ Editar Plano" : "➕ Novo Plano"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  📝 Nome do Plano
                </label>
                <Input
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Plano Mensal Premium"
                  required
                  className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  🏷️ Tipo
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
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  🏢 Unidade *
                </label>
                <Select
                  value={formData.unidade_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unidade_id: value })
                  }
                >
                  <SelectTrigger className="bg-white">
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
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  🏢 Unidade
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
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                📄 Descrição
              </label>
              <Textarea
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Descreva o plano"
                rows={2}
                className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  💰 Valor (R$)
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
                  className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  ⏱️ Duração (dias)
                </label>
                <Input
                  type="number"
                  value={formData.duracao_dias}
                  onChange={(e) =>
                    setFormData({ ...formData, duracao_dias: e.target.value })
                  }
                  required
                  className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                ✨ Benefícios (um por linha)
              </label>
              <Textarea
                value={formData.beneficios}
                onChange={(e) =>
                  setFormData({ ...formData, beneficios: e.target.value })
                }
                placeholder="Acesso ilimitado&#10;2 aulas por semana&#10;Suporte prioritário"
                rows={4}
                className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                👥 Máximo de Alunos (opcional)
              </label>
              <Input
                type="number"
                value={formData.max_alunos}
                onChange={(e) =>
                  setFormData({ ...formData, max_alunos: e.target.value })
                }
                placeholder="Deixe em branco para ilimitado"
                className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) =>
                  setFormData({ ...formData, ativo: e.target.checked })
                }
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label
                htmlFor="ativo"
                className="text-sm font-semibold text-gray-700 cursor-pointer"
              >
                Plano ativo (disponível para assinaturas)
              </label>
            </div>
            <DialogFooter className="border-t pt-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="hover:bg-gray-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {editingPlano ? "💾 Atualizar" : "➕ Criar"} Plano
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <ConfirmDialog
        isOpen={successDialog.isOpen}
        onClose={() => setSuccessDialog({ isOpen: false, message: "" })}
        onConfirm={() => setSuccessDialog({ isOpen: false, message: "" })}
        title="Sucesso!"
        message={successDialog.message}
        confirmText="OK"
        type="info"
        icon="warning"
      />

      {/* Error Dialog */}
      <ConfirmDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ isOpen: false, message: "" })}
        onConfirm={() => setErrorDialog({ isOpen: false, message: "" })}
        title="Erro"
        message={errorDialog.message}
        confirmText="OK"
        cancelText=""
        type="danger"
        icon="warning"
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, planoId: null })}
        onConfirm={confirmDeletePlano}
        title="Inativar Plano"
        message="Deseja inativar este plano? Ele não poderá mais ser atribuído a novos alunos."
        confirmText="Inativar"
        cancelText="Cancelar"
        type="warning"
        icon="warning"
      />
    </div>
  );
}
