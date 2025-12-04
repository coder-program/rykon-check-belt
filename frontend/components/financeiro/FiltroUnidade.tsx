"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Unidade {
  id: string;
  nome: string;
}

interface FiltroUnidadeProps {
  unidades: Unidade[];
  unidadeSelecionada: string;
  onUnidadeChange: (unidadeId: string) => void;
  isFranqueado: boolean;
}

export default function FiltroUnidade({
  unidades,
  unidadeSelecionada,
  onUnidadeChange,
  isFranqueado,
}: FiltroUnidadeProps) {
  if (!isFranqueado || unidades.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filtrar por Unidade:
          </label>
          <Select value={unidadeSelecionada} onValueChange={onUnidadeChange}>
            <SelectTrigger className="w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">📊 Todas as Unidades</SelectItem>
              {unidades.map((unidade) => (
                <SelectItem key={unidade.id} value={unidade.id}>
                  🏢 {unidade.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
