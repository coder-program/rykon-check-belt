"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  TrendingUp,
  Activity,
  Award,
  ChevronDown,
  MapPin,
  DollarSign,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UnidadeData {
  id: string;
  nome: string;
  endereco: string;
  totalAlunos: number;
  aulasHoje: number;
  presencasHoje: number;
  receitaMes: number;
  crescimento: number;
  coordenadas: { lat: number; lng: number };
}

const mockUnidadesData: UnidadeData[] = [
  {
    id: "unidade-1",
    nome: "TeamCruz CT - Matriz",
    endereco: "Rua Principal, 123 - São Paulo",
    totalAlunos: 287,
    aulasHoje: 12,
    presencasHoje: 145,
    receitaMes: 45000,
    crescimento: 12,
    coordenadas: { lat: -23.5505, lng: -46.6333 },
  },
  {
    id: "unidade-2",
    nome: "TeamCruz Norte",
    endereco: "Av. Norte, 456 - São Paulo",
    totalAlunos: 198,
    aulasHoje: 8,
    presencasHoje: 89,
    receitaMes: 32000,
    crescimento: 8,
    coordenadas: { lat: -23.5605, lng: -46.6433 },
  },
  {
    id: "unidade-3",
    nome: "TeamCruz Sul",
    endereco: "Rua Sul, 789 - São Paulo",
    totalAlunos: 156,
    aulasHoje: 6,
    presencasHoje: 72,
    receitaMes: 28000,
    crescimento: 15,
    coordenadas: { lat: -23.5705, lng: -46.6533 },
  },
  {
    id: "unidade-4",
    nome: "TeamCruz Leste",
    endereco: "Av. Leste, 321 - São Paulo",
    totalAlunos: 142,
    aulasHoje: 7,
    presencasHoje: 65,
    receitaMes: 25000,
    crescimento: -3,
    coordenadas: { lat: -23.5805, lng: -46.6233 },
  },
];

interface Props {
  onSelectUnidade?: (unidadeId: string) => void;
}

export default function DashboardMultiUnidade({ onSelectUnidade }: Props) {
  const [selectedUnidade, setSelectedUnidade] = useState<string>("todas");
  const [showDropdown, setShowDropdown] = useState(false);
  const [unidadesData, setUnidadesData] =
    useState<UnidadeData[]>(mockUnidadesData);
  const [totaisRede, setTotaisRede] = useState({
    totalAlunos: 0,
    totalAulas: 0,
    totalPresencas: 0,
    receitaTotal: 0,
    crescimentoMedio: 0,
  });

  useEffect(() => {
    // Calcular totais da rede
    const totais = unidadesData.reduce(
      (acc, unidade) => ({
        totalAlunos: acc.totalAlunos + unidade.totalAlunos,
        totalAulas: acc.totalAulas + unidade.aulasHoje,
        totalPresencas: acc.totalPresencas + unidade.presencasHoje,
        receitaTotal: acc.receitaTotal + unidade.receitaMes,
        crescimentoMedio: acc.crescimentoMedio + unidade.crescimento,
      }),
      {
        totalAlunos: 0,
        totalAulas: 0,
        totalPresencas: 0,
        receitaTotal: 0,
        crescimentoMedio: 0,
      },
    );

    totais.crescimentoMedio = totais.crescimentoMedio / unidadesData.length;
    setTotaisRede(totais);
  }, [unidadesData]);

  const handleSelectUnidade = (unidadeId: string) => {
    setSelectedUnidade(unidadeId);
    setShowDropdown(false);
    if (onSelectUnidade) {
      onSelectUnidade(unidadeId);
    }
  };

  const getUnidadeNome = () => {
    if (selectedUnidade === "todas") return "Todas as Unidades";
    const unidade = unidadesData.find((u) => u.id === selectedUnidade);
    return unidade?.nome || "Selecione uma unidade";
  };

  const getDataExibicao = () => {
    if (selectedUnidade === "todas") {
      return {
        totalAlunos: totaisRede.totalAlunos,
        aulasHoje: totaisRede.totalAulas,
        presencasHoje: totaisRede.totalPresencas,
        receitaMes: totaisRede.receitaTotal,
        crescimento: totaisRede.crescimentoMedio,
      };
    }

    const unidade = unidadesData.find((u) => u.id === selectedUnidade);
    return (
      unidade || {
        totalAlunos: 0,
        aulasHoje: 0,
        presencasHoje: 0,
        receitaMes: 0,
        crescimento: 0,
      }
    );
  };

  const dadosExibicao = getDataExibicao();

  return (
    <div className="space-y-6">
      {/* Seletor de Unidade */}
      <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Visão Multi-Unidade
            </h2>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-700">
                {getUnidadeNome()}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-gray-600 transition-transform ${showDropdown ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                >
                  <div className="p-2">
                    <button
                      onClick={() => handleSelectUnidade("todas")}
                      className={`w-full text-left px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors ${
                        selectedUnidade === "todas"
                          ? "bg-blue-100 text-blue-700"
                          : ""
                      }`}
                    >
                      <div className="font-medium">Todas as Unidades</div>
                      <div className="text-xs text-gray-500">
                        Visão consolidada da rede
                      </div>
                    </button>

                    <div className="border-t my-2"></div>

                    {unidadesData.map((unidade) => (
                      <button
                        key={unidade.id}
                        onClick={() => handleSelectUnidade(unidade.id)}
                        className={`w-full text-left px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors ${
                          selectedUnidade === unidade.id
                            ? "bg-blue-100 text-blue-700"
                            : ""
                        }`}
                      >
                        <div className="font-medium">{unidade.nome}</div>
                        <div className="text-xs text-gray-500">
                          {unidade.endereco}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total de Alunos</p>
                <p className="text-3xl font-bold">
                  {dadosExibicao.totalAlunos}
                </p>
              </div>
              <Users className="h-8 w-8 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Aulas Hoje</p>
                <p className="text-3xl font-bold">{dadosExibicao.aulasHoje}</p>
              </div>
              <Calendar className="h-8 w-8 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Presenças Hoje</p>
                <p className="text-3xl font-bold">
                  {dadosExibicao.presencasHoje}
                </p>
              </div>
              <Activity className="h-8 w-8 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Receita Mensal</p>
                <p className="text-2xl font-bold">
                  R$ {(dadosExibicao.receitaMes / 1000).toFixed(0)}k
                </p>
              </div>
              <DollarSign className="h-8 w-8 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`${dadosExibicao.crescimento >= 0 ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-red-500 to-red-600"} text-white`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm">Crescimento</p>
                <p className="text-3xl font-bold">
                  {dadosExibicao.crescimento > 0 ? "+" : ""}
                  {dadosExibicao.crescimento.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento por Unidade */}
      {selectedUnidade === "todas" && (
        <Card className="bg-white border border-blue-200">
          <CardHeader>
            <CardTitle>Performance por Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unidadesData.map((unidade) => (
                <motion.div
                  key={unidade.id}
                  whileHover={{ scale: 1.01 }}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => handleSelectUnidade(unidade.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {unidade.nome}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {unidade.endereco}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {unidade.totalAlunos}
                        </p>
                        <p className="text-xs text-gray-500">Alunos</p>
                      </div>

                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {unidade.presencasHoje}
                        </p>
                        <p className="text-xs text-gray-500">Presenças</p>
                      </div>

                      <div className="text-center">
                        <p className="text-xl font-bold text-yellow-600">
                          R$ {(unidade.receitaMes / 1000).toFixed(0)}k
                        </p>
                        <p className="text-xs text-gray-500">Receita/mês</p>
                      </div>

                      <div className="text-center">
                        <p
                          className={`text-xl font-bold ${unidade.crescimento >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {unidade.crescimento > 0 ? "+" : ""}
                          {unidade.crescimento}%
                        </p>
                        <p className="text-xs text-gray-500">Crescimento</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Comparação */}
      {selectedUnidade === "todas" && (
        <Card className="bg-white border border-blue-200">
          <CardHeader>
            <CardTitle>Comparativo de Desempenho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unidadesData.map((unidade) => {
                const percentualAlunos =
                  (unidade.totalAlunos / totaisRede.totalAlunos) * 100;
                const percentualReceita =
                  (unidade.receitaMes / totaisRede.receitaTotal) * 100;

                return (
                  <div key={unidade.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {unidade.nome}
                      </span>
                      <span className="text-xs text-gray-500">
                        {unidade.totalAlunos} alunos
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16">
                          Alunos:
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentualAlunos}%` }}
                            transition={{ duration: 1, delay: 0.1 }}
                            className="bg-blue-600 h-full rounded-full"
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-12 text-right">
                          {percentualAlunos.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16">
                          Receita:
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentualReceita}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="bg-green-600 h-full rounded-full"
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-12 text-right">
                          {percentualReceita.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
