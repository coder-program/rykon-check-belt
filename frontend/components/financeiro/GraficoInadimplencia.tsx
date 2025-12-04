"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DadosInadimplencia {
  pagas: number;
  pendentes: number;
  vencidas: number;
  total: number;
}

interface GraficoInadimplenciaProps {
  dados: DadosInadimplencia;
}

const CORES = {
  pagas: "#10b981", // verde
  pendentes: "#f59e0b", // amarelo
  vencidas: "#ef4444", // vermelho
};

export default function GraficoInadimplencia({
  dados,
}: GraficoInadimplenciaProps) {
  const dadosPizza = [
    { name: "Pagas", value: dados.pagas, color: CORES.pagas },
    { name: "Pendentes", value: dados.pendentes, color: CORES.pendentes },
    { name: "Vencidas", value: dados.vencidas, color: CORES.vencidas },
  ].filter((item) => item.value > 0); // Remover fatias vazias

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Status de Faturas</h3>
      {dados.total > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={dadosPizza}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {dadosPizza.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value} faturas`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center text-gray-500 py-12">
          Nenhuma fatura encontrada
        </div>
      )}
    </div>
  );
}
