"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DadosUnidade {
  unidade_id: string;
  nome: string;
  receita: number;
}

interface GraficoComparacaoUnidadesProps {
  dados: DadosUnidade[];
}

export default function GraficoComparacaoUnidades({
  dados,
}: GraficoComparacaoUnidadesProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Comparação entre Unidades</h3>
      {dados.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nome" />
            <YAxis />
            <Tooltip
              formatter={(value: number) =>
                `R$ ${Number(value || 0).toFixed(2)}`
              }
              labelStyle={{ color: "#000" }}
            />
            <Legend />
            <Bar dataKey="receita" fill="#3b82f6" name="Receita" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center text-gray-500 py-12">
          Nenhuma unidade encontrada
        </div>
      )}
    </div>
  );
}
