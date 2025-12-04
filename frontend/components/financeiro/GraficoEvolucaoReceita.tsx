"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DadosEvolucao {
  data: string;
  receita: number;
  despesas: number;
  saldo: number;
}

interface GraficoEvolucaoReceitaProps {
  dados: DadosEvolucao[];
}

export default function GraficoEvolucaoReceita({
  dados,
}: GraficoEvolucaoReceitaProps) {
  // Formatar data para exibir apenas mês/ano
  const dadosFormatados = dados.map((item) => ({
    ...item,
    mes: new Date(item.data).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Evolução da Receita Mensal</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={dadosFormatados}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip
            formatter={(value: number) => `R$ ${Number(value || 0).toFixed(2)}`}
            labelStyle={{ color: "#000" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="receita"
            stroke="#10b981"
            name="Receita"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="despesas"
            stroke="#ef4444"
            name="Despesas"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="saldo"
            stroke="#3b82f6"
            name="Saldo"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
