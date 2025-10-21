"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  Search,
} from "lucide-react";

// Tipos
interface RecepcionistaUnidade {
  id: string;
  usuario_id: string;
  unidade_id: string;
  cargo?: string;
  turno?: "MANHA" | "TARDE" | "NOITE" | "INTEGRAL";
  horario_entrada?: string;
  horario_saida?: string;
  dias_semana?: string[];
  ativo: boolean;
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    cpf: string;
  };
  unidade?: {
    id: string;
    nome: string;
    cnpj: string;
  };
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
}

interface Unidade {
  id: string;
  nome: string;
  cnpj: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function RecepcionistaUnidadesManager() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingVinculo, setEditingVinculo] =
    useState<RecepcionistaUnidade | null>(null);
  const [filterUsuario, setFilterUsuario] = useState("");
  const [filterUnidade, setFilterUnidade] = useState("");

  // Buscar vínculos
  const { data: vinculos = [], isLoading } = useQuery({
    queryKey: ["recepcionista-unidades", filterUsuario, filterUnidade],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterUsuario) params.append("usuario_id", filterUsuario);
      if (filterUnidade) params.append("unidade_id", filterUnidade);

      const res = await fetch(`${API_URL}/recepcionista-unidades?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return res.json();
    },
  });

  // Buscar usuários com perfil recepcionista
  const { data: usuarios = [] } = useQuery<Usuario[]>({
    queryKey: ["usuarios-recepcionistas"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/usuarios`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      // Filtrar apenas recepcionistas
      return data.filter((u: any) =>
        u.perfis?.some((p: any) => p.nome === "recepcionista")
      );
    },
  });

  // Buscar unidades
  const { data: unidades = [] } = useQuery<Unidade[]>({
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

  // Mutation para criar vínculo
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/recepcionista-unidades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar vínculo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recepcionista-unidades"] });
      setShowModal(false);
      setEditingVinculo(null);
      toast.success("Vínculo criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar vínculo");
    },
  });

  // Mutation para atualizar vínculo
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`${API_URL}/recepcionista-unidades/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar vínculo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recepcionista-unidades"] });
      setShowModal(false);
      setEditingVinculo(null);
      toast.success("Vínculo atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar vínculo");
    },
  });

  // Mutation para desativar vínculo
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/recepcionista-unidades/${id}/soft`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Erro ao desativar vínculo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recepcionista-unidades"] });
      toast.success("Vínculo desativado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao desativar vínculo");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      usuario_id: formData.get("usuario_id") as string,
      unidade_id: formData.get("unidade_id") as string,
      cargo: formData.get("cargo") as string,
      turno: formData.get("turno") as string,
      horario_entrada: formData.get("horario_entrada") as string,
      horario_saida: formData.get("horario_saida") as string,
      dias_semana: formData.getAll("dias_semana") as string[],
      observacoes: formData.get("observacoes") as string,
      ativo: true,
    };

    if (editingVinculo) {
      updateMutation.mutate({ id: editingVinculo.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Vínculos Recepcionista ↔ Unidade
              </CardTitle>
              <CardDescription>
                Gerencie quais recepcionistas trabalham em quais unidades
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingVinculo(null);
                setShowModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Vínculo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Filtrar por Recepcionista
              </label>
              <Select value={filterUsuario} onValueChange={setFilterUsuario}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Filtrar por Unidade
              </label>
              <Select value={filterUnidade} onValueChange={setFilterUnidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de Vínculos */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Recepcionista</th>
                  <th className="text-left p-3">Unidade</th>
                  <th className="text-left p-3">Cargo</th>
                  <th className="text-left p-3">Turno</th>
                  <th className="text-left p-3">Horário</th>
                  <th className="text-left p-3">Dias</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vinculos.map((v: RecepcionistaUnidade) => (
                  <tr key={v.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{v.usuario?.nome}</div>
                        <div className="text-sm text-gray-500">
                          {v.usuario?.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{v.unidade?.nome}</div>
                        <div className="text-sm text-gray-500">
                          {v.unidade?.cnpj}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{v.cargo || "—"}</td>
                    <td className="p-3">{v.turno || "—"}</td>
                    <td className="p-3">
                      {v.horario_entrada && v.horario_saida
                        ? `${v.horario_entrada} - ${v.horario_saida}`
                        : "—"}
                    </td>
                    <td className="p-3">
                      {v.dias_semana ? v.dias_semana.join(", ") : "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          v.ativo
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {v.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingVinculo(v);
                            setShowModal(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Deseja desativar este vínculo?")) {
                              deleteMutation.mutate(v.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingVinculo ? "Editar Vínculo" : "Novo Vínculo"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Recepcionista *
                    </label>
                    <select
                      name="usuario_id"
                      required
                      defaultValue={editingVinculo?.usuario_id}
                      className="w-full border rounded p-2"
                    >
                      <option value="">Selecione...</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Unidade *
                    </label>
                    <select
                      name="unidade_id"
                      required
                      defaultValue={editingVinculo?.unidade_id}
                      className="w-full border rounded p-2"
                    >
                      <option value="">Selecione...</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Cargo
                    </label>
                    <Input
                      name="cargo"
                      defaultValue={editingVinculo?.cargo}
                      placeholder="Ex: Recepcionista"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Turno
                    </label>
                    <select
                      name="turno"
                      defaultValue={editingVinculo?.turno}
                      className="w-full border rounded p-2"
                    >
                      <option value="">Selecione...</option>
                      <option value="MANHA">Manhã</option>
                      <option value="TARDE">Tarde</option>
                      <option value="NOITE">Noite</option>
                      <option value="INTEGRAL">Integral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Horário Entrada
                    </label>
                    <Input
                      name="horario_entrada"
                      type="time"
                      defaultValue={editingVinculo?.horario_entrada}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Horário Saída
                    </label>
                    <Input
                      name="horario_saida"
                      type="time"
                      defaultValue={editingVinculo?.horario_saida}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Dias da Semana
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"].map(
                      (dia) => (
                        <label key={dia} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="dias_semana"
                            value={dia}
                            defaultChecked={editingVinculo?.dias_semana?.includes(
                              dia
                            )}
                          />
                          {dia}
                        </label>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Observações
                  </label>
                  <textarea
                    name="observacoes"
                    defaultValue={editingVinculo?.observacoes}
                    className="w-full border rounded p-2"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingVinculo(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingVinculo ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
