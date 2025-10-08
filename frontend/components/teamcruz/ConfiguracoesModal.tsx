"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Save, X, Plus, Trash2, Edit2 } from "lucide-react";
import toast from "react-hot-toast";

interface RegraGraduacao {
  id: string;
  faixa: string;
  aulasNecessarias: number;
  maxGraus: number;
  tempoMinimo: number; // em meses
}

interface ConfigUnidade {
  id: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  raioCheckin: number;
  ativa: boolean;
}

interface ConfiguracoesProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAIXAS_DEFAULT = [
  { nome: "Branca", cor: "bg-white border-gray-400" },
  { nome: "Cinza", cor: "bg-gray-400" },
  { nome: "Amarela", cor: "bg-yellow-400" },
  { nome: "Laranja", cor: "bg-orange-500" },
  { nome: "Verde", cor: "bg-green-500" },
  { nome: "Azul", cor: "bg-blue-500" },
  { nome: "Roxa", cor: "bg-purple-600" },
  { nome: "Marrom", cor: "bg-amber-800" },
  { nome: "Preta", cor: "bg-black" },
];

export default function ConfiguracoesModal({
  isOpen,
  onClose,
}: ConfiguracoesProps) {
  const [activeTab, setActiveTab] = useState("graduacao");
  const [regrasGraduacao, setRegrasGraduacao] = useState<RegraGraduacao[]>([]);
  const [unidades, setUnidades] = useState<ConfigUnidade[]>([]);
  const [editingRegra, setEditingRegra] = useState<string | null>(null);
  const [editingUnidade, setEditingUnidade] = useState<string | null>(null);

  // Carrega configurações do localStorage
  useEffect(() => {
    const savedRegras = localStorage.getItem("config_regras_graduacao");
    const savedUnidades = localStorage.getItem("config_unidades");

    if (savedRegras) {
      setRegrasGraduacao(JSON.parse(savedRegras));
    } else {
      // Configurações padrão
      const defaultRegras: RegraGraduacao[] = FAIXAS_DEFAULT.map(
        (faixa, idx) => ({
          id: `regra-${idx}`,
          faixa: faixa.nome,
          aulasNecessarias: 20,
          maxGraus: 4,
          tempoMinimo: 3,
        })
      );
      setRegrasGraduacao(defaultRegras);
    }

    if (savedUnidades) {
      setUnidades(JSON.parse(savedUnidades));
    } else {
      // Unidades padrão
      const defaultUnidades: ConfigUnidade[] = [
        {
          id: "unidade-1",
          nome: "TeamCruz CT - Matriz",
          endereco: "Rua Principal, 123 - São Paulo",
          latitude: -23.5505,
          longitude: -46.6333,
          raioCheckin: 100,
          ativa: true,
        },
        {
          id: "unidade-2",
          nome: "TeamCruz Unidade Norte",
          endereco: "Av. Norte, 456 - São Paulo",
          latitude: -23.5605,
          longitude: -46.6433,
          raioCheckin: 100,
          ativa: true,
        },
      ];
      setUnidades(defaultUnidades);
    }
  }, []);

  const salvarConfiguracoes = () => {
    localStorage.setItem(
      "config_regras_graduacao",
      JSON.stringify(regrasGraduacao)
    );
    localStorage.setItem("config_unidades", JSON.stringify(unidades));

    toast.success("Configurações salvas com sucesso!", {
      duration: 3000,
      position: "top-center",
    });
  };

  const atualizarRegra = (
    id: string,
    campo: keyof RegraGraduacao,
    valor: any
  ) => {
    setRegrasGraduacao((prev) =>
      prev.map((regra) =>
        regra.id === id ? { ...regra, [campo]: valor } : regra
      )
    );
  };

  const atualizarUnidade = (
    id: string,
    campo: keyof ConfigUnidade,
    valor: any
  ) => {
    setUnidades((prev) =>
      prev.map((unidade) =>
        unidade.id === id ? { ...unidade, [campo]: valor } : unidade
      )
    );
  };

  const adicionarUnidade = () => {
    const novaUnidade: ConfigUnidade = {
      id: `unidade-${Date.now()}`,
      nome: "Nova Unidade",
      endereco: "",
      latitude: 0,
      longitude: 0,
      raioCheckin: 100,
      ativa: false,
    };
    setUnidades((prev) => [...prev, novaUnidade]);
    setEditingUnidade(novaUnidade.id);
  };

  const removerUnidade = (id: string) => {
    if (window.confirm("Tem certeza que deseja remover esta unidade?")) {
      setUnidades((prev) => prev.filter((u) => u.id !== id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-6 w-6" />
              <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex gap-1 p-2">
            {[
              { id: "graduacao", label: "Regras de Graduação" },
              { id: "unidades", label: "Unidades" },
              { id: "sistema", label: "Sistema" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:bg-white/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === "graduacao" && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  Configure as regras de graduação para cada faixa. Estas
                  configurações determinam quantas aulas são necessárias para
                  cada grau e o tempo mínimo entre graduações.
                </p>
              </div>

              <div className="space-y-3">
                {regrasGraduacao.map((regra) => {
                  const faixaInfo = FAIXAS_DEFAULT.find(
                    (f) => f.nome === regra.faixa
                  );
                  const isEditing = editingRegra === regra.id;

                  return (
                    <div
                      key={regra.id}
                      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded border-2 ${faixaInfo?.cor}`}
                          />
                          <h3 className="font-semibold text-lg">
                            {regra.faixa}
                          </h3>
                        </div>
                        <button
                          onClick={() =>
                            setEditingRegra(isEditing ? null : regra.id)
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="text-xs text-gray-600">
                            Aulas por Grau
                          </label>
                          <input
                            type="number"
                            value={regra.aulasNecessarias}
                            onChange={(e) =>
                              atualizarRegra(
                                regra.id,
                                "aulasNecessarias",
                                parseInt(e.target.value)
                              )
                            }
                            disabled={!isEditing}
                            className={`w-full p-2 border rounded-lg ${
                              isEditing ? "bg-white" : "bg-gray-50"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Máximo de Graus
                          </label>
                          <input
                            type="number"
                            value={regra.maxGraus}
                            onChange={(e) =>
                              atualizarRegra(
                                regra.id,
                                "maxGraus",
                                parseInt(e.target.value)
                              )
                            }
                            disabled={!isEditing}
                            className={`w-full p-2 border rounded-lg ${
                              isEditing ? "bg-white" : "bg-gray-50"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Tempo Mínimo (meses)
                          </label>
                          <input
                            type="number"
                            value={regra.tempoMinimo}
                            onChange={(e) =>
                              atualizarRegra(
                                regra.id,
                                "tempoMinimo",
                                parseInt(e.target.value)
                              )
                            }
                            disabled={!isEditing}
                            className={`w-full p-2 border rounded-lg ${
                              isEditing ? "bg-white" : "bg-gray-50"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "unidades" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Gerenciar Unidades</h3>
                <button
                  onClick={adicionarUnidade}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Unidade
                </button>
              </div>

              <div className="space-y-3">
                {unidades.map((unidade) => {
                  const isEditing = editingUnidade === unidade.id;

                  return (
                    <div
                      key={unidade.id}
                      className={`bg-white border rounded-lg p-4 ${
                        unidade.ativa ? "border-green-300" : "border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <input
                              type="checkbox"
                              checked={unidade.ativa}
                              onChange={(e) =>
                                atualizarUnidade(
                                  unidade.id,
                                  "ativa",
                                  e.target.checked
                                )
                              }
                              className="w-5 h-5"
                            />
                            {isEditing ? (
                              <input
                                type="text"
                                value={unidade.nome}
                                onChange={(e) =>
                                  atualizarUnidade(
                                    unidade.id,
                                    "nome",
                                    e.target.value
                                  )
                                }
                                className="text-lg font-semibold border-b-2 border-blue-400 focus:outline-none"
                              />
                            ) : (
                              <h3 className="text-lg font-semibold">
                                {unidade.nome}
                              </h3>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-gray-600">
                                Endereço
                              </label>
                              <input
                                type="text"
                                value={unidade.endereco}
                                onChange={(e) =>
                                  atualizarUnidade(
                                    unidade.id,
                                    "endereco",
                                    e.target.value
                                  )
                                }
                                disabled={!isEditing}
                                className={`w-full p-2 border rounded-lg text-sm ${
                                  isEditing ? "bg-white" : "bg-gray-50"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">
                                Raio Check-in (metros)
                              </label>
                              <input
                                type="number"
                                value={unidade.raioCheckin}
                                onChange={(e) =>
                                  atualizarUnidade(
                                    unidade.id,
                                    "raioCheckin",
                                    parseInt(e.target.value)
                                  )
                                }
                                disabled={!isEditing}
                                className={`w-full p-2 border rounded-lg text-sm ${
                                  isEditing ? "bg-white" : "bg-gray-50"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">
                                Latitude
                              </label>
                              <input
                                type="number"
                                step="0.0001"
                                value={unidade.latitude}
                                onChange={(e) =>
                                  atualizarUnidade(
                                    unidade.id,
                                    "latitude",
                                    parseFloat(e.target.value)
                                  )
                                }
                                disabled={!isEditing}
                                className={`w-full p-2 border rounded-lg text-sm ${
                                  isEditing ? "bg-white" : "bg-gray-50"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">
                                Longitude
                              </label>
                              <input
                                type="number"
                                step="0.0001"
                                value={unidade.longitude}
                                onChange={(e) =>
                                  atualizarUnidade(
                                    unidade.id,
                                    "longitude",
                                    parseFloat(e.target.value)
                                  )
                                }
                                disabled={!isEditing}
                                className={`w-full p-2 border rounded-lg text-sm ${
                                  isEditing ? "bg-white" : "bg-gray-50"
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() =>
                              setEditingUnidade(isEditing ? null : unidade.id)
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => removerUnidade(unidade.id)}
                            className="p-2 hover:bg-red-100 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "sistema" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-5 h-5"
                        defaultChecked
                      />
                      <span>Permitir check-in fora do horário da aula</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-5 h-5"
                        defaultChecked
                      />
                      <span>Enviar notificações de lembrete de aula</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="w-5 h-5" />
                      <span>Modo de manutenção</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">
                      Tempo de expiração do token (minutos)
                    </label>
                    <input
                      type="number"
                      defaultValue={30}
                      className="w-full p-2 border rounded-lg mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Integração com Loja Virtual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">URL da Loja</label>
                    <input
                      type="text"
                      defaultValue="https://www.lojateamcruz.com.br/"
                      className="w-full p-2 border rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">
                      Código de Desconto Padrão
                    </label>
                    <input
                      type="text"
                      defaultValue="ALUNO10"
                      className="w-full p-2 border rounded-lg mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvarConfiguracoes}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
