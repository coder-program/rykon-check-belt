"use client";

import React from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Users, Activity, Award, Calendar, Clock, Zap, CheckCircle, Trophy, Star, Bell, Search, GraduationCap } from 'lucide-react';
import { QrCodeIcon, CameraIcon, UserIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

// Dados mockados equivalentes ao CRA
const mockData = {
  stats: {
    totalAlunos: 287,
    aulaHoje: 12,
    proximosGraduaveis: 15,
    presencasHoje: 45,
  },
  proximosGraus: [
    { id: 1, nome: 'João Silva', faixa: 'Azul', graus: 3, faltam: 2, foto: null },
    { id: 2, nome: 'Maria Santos', faixa: 'Roxa', graus: 2, faltam: 3, foto: null },
    { id: 3, nome: 'Pedro Costa', faixa: 'Branca', graus: 1, faltam: 1, foto: null },
  ],
  aulasHoje: [
    { id: 1, horario: '07:00', turma: 'Adulto Manhã', instrutor: 'Carlos Cruz', status: 'concluída', alunos: 23 },
    { id: 2, horario: '09:00', turma: 'Competição', instrutor: 'Carlos Cruz', status: 'em andamento', alunos: 15 },
    { id: 3, horario: '16:00', turma: 'Kids Tarde', instrutor: 'João Silva', status: 'agendada', alunos: 0 },
    { id: 4, horario: '19:00', turma: 'Adulto Noite', instrutor: 'Carlos Cruz', status: 'agendada', alunos: 0 },
  ],
  ranking: [
    { id: 1, nome: 'Lucas Oliveira', presencas: 95, percent: 95, streak: 45 },
    { id: 2, nome: 'Ana Paula', presencas: 92, percent: 92, streak: 30 },
    { id: 3, nome: 'Roberto Lima', presencas: 88, percent: 88, streak: 21 },
  ],
};

const mockAulasAbertas = [
  { id: 1, horario: '07:00', turma: 'Adulto Manhã', instrutor: 'Carlos Cruz', vagas: 7 },
  { id: 2, horario: '09:00', turma: 'Competição', instrutor: 'Carlos Cruz', vagas: 3 },
  { id: 3, horario: '16:00', turma: 'Kids Tarde', instrutor: 'João Silva', vagas: 10 },
  { id: 4, horario: '19:00', turma: 'Adulto Noite', instrutor: 'Carlos Cruz', vagas: 5 },
];

const mockAlunos = [
  { id: 1, nome: 'João Silva', matricula: 'TC001', faixa: 'Azul', graus: 3 },
  { id: 2, nome: 'Maria Santos', matricula: 'TC002', faixa: 'Roxa', graus: 2 },
  { id: 3, nome: 'Pedro Costa', matricula: 'TC003', faixa: 'Branca', graus: 1 },
  { id: 4, nome: 'Ana Paula', matricula: 'TC004', faixa: 'Marrom', graus: 4 },
  { id: 5, nome: 'Lucas Oliveira', matricula: 'TC005', faixa: 'Verde', graus: 2 },
  { id: 6, nome: 'Carlos Pereira', matricula: 'TC006', faixa: 'Azul', graus: 1 },
];

const mockGraduacoesHistorico = [
  { id: 11, nome: 'Marcos Alves', faixaAnterior: 'Azul', novaFaixa: 'Roxa', data: '2025-06-10' },
  { id: 12, nome: 'Beatriz Cunha', faixaAnterior: 'Branca', novaFaixa: 'Azul', data: '2025-05-22' },
  { id: 13, nome: 'Felipe Ramos', faixaAnterior: 'Roxa', novaFaixa: 'Marrom', data: '2025-04-18' },
];

const mockAulasSemana = [
  { id: 21, dia: 'Qui', horario: '19:00', turma: 'Adulto Noite', instrutor: 'Carlos Cruz', vagas: 0, status: 'agendada' },
  { id: 22, dia: 'Sex', horario: '07:00', turma: 'Adulto Manhã', instrutor: 'Carlos Cruz', vagas: 4, status: 'agendada' },
  { id: 23, dia: 'Sab', horario: '09:00', turma: 'Competição', instrutor: 'Carlos Cruz', vagas: 1, status: 'agendada' },
];

function getBeltClass(faixa: string) {
  const classes: Record<string, string> = {
    'Branca': 'badge-ghost',
    'Cinza': 'badge-secondary',
    'Amarela': 'badge-warning',
    'Laranja': 'badge-warning',
    'Verde': 'badge-success',
    'Azul': 'badge-info',
    'Roxa': 'badge-primary',
    'Marrom': 'badge-accent',
    'Preta': 'badge-neutral',
    'Coral': 'badge-error',
    'Vermelha': 'badge-error',
  };
  return classes[faixa] || 'badge-ghost';
}

export default function DashboardNew() {
  const [selectedTab, setSelectedTab] = React.useState('overview');
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [selectedAula, setSelectedAula] = React.useState<any | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedAlunos, setSelectedAlunos] = React.useState<any[]>([]);

  React.useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'checkin', label: 'Check-in', icon: CheckCircle },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'graduacoes', label: 'Graduações', icon: Trophy },
    { id: 'aulas', label: 'Aulas', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50">
      <Toaster position="top-right" />

      <div className="navbar bg-white shadow-lg border-b-2 border-blue-100">
        <div className="flex-1">
          <div className="flex items-center gap-3 px-4">
            <div className="indicator">
              <Shield className="h-10 w-10 text-red-600" />
              <span className="indicator-item badge badge-warning badge-xs animate-pulse"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-black bg-clip-text text-transparent">
                TeamCruz Jiu-Jitsu
              </h1>
              <p className="text-xs text-blue-600">Sistema de Controle de Presença</p>
            </div>
          </div>
        </div>
        <div className="flex-none gap-2">
          <div className="text-right mr-4">
            <p className="text-sm opacity-70">
              {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-lg font-mono font-bold">
              {format(currentTime, 'HH:mm:ss')}
            </p>
          </div>
          <div className="indicator">
            <Bell className="h-5 w-5" />
            <span className="indicator-item badge badge-error badge-xs animate-pulse"></span>
          </div>
        </div>
      </div>

      {/* Nav Tabs - estilo pill sobre barra clara */}
      <div className="bg-gradient-to-r from-white to-blue-50 border-y border-blue-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center">
            <div className="flex gap-2 rounded-xl bg-white/90 backdrop-blur border border-blue-200 p-1 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    selectedTab === tab.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <AnimatePresence mode="wait">
          {selectedTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="stats shadow bg-gradient-to-br from-blue-500 to-blue-600">
                  <div className="stat text-white">
                    <div className="stat-figure">
                      <Users className="h-8 w-8 opacity-80" />
                    </div>
                    <div className="stat-title text-blue-100">Total de Alunos</div>
                    <div className="stat-value">{mockData.stats.totalAlunos}</div>
                    <div className="stat-desc text-blue-200">↗︎ 12% vs último mês</div>
                  </div>
                </div>
                <div className="stats shadow bg-gradient-to-br from-green-500 to-emerald-600">
                  <div className="stat text-white">
                    <div className="stat-figure">
                      <Activity className="h-8 w-8 opacity-80" />
                    </div>
                    <div className="stat-title text-green-100">Aulas Hoje</div>
                    <div className="stat-value">{mockData.stats.aulaHoje}</div>
                    <div className="stat-desc text-green-200">4 turmas agendadas</div>
                  </div>
                </div>
                <div className="stats shadow bg-gradient-to-br from-yellow-400 to-amber-500">
                  <div className="stat text-white">
                    <div className="stat-figure">
                      <Award className="h-8 w-8 opacity-80" />
                    </div>
                    <div className="stat-title text-yellow-100">Próximos Graduáveis</div>
                    <div className="stat-value">{mockData.stats.proximosGraduaveis}</div>
                    <div className="stat-desc text-yellow-200">↗︎ 5 novos este mês</div>
                  </div>
                </div>
                <div className="stats shadow bg-gradient-to-br from-purple-500 to-indigo-600">
                  <div className="stat text-white">
                    <div className="stat-figure">
                      <CheckCircle className="h-8 w-8 opacity-80" />
                    </div>
                    <div className="stat-title text-purple-100">Presenças Hoje</div>
                    <div className="stat-value">{mockData.stats.presencasHoje}</div>
                    <div className="stat-desc text-purple-200">↗︎ 18% vs média</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Próximos a Graduar */}
                <Card className="lg:col-span-2 bg-white border border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-warning" />
                      Próximos a Receber Grau
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mockData.proximosGraus.map((aluno) => (
                      <motion.div key={aluno.id} whileHover={{ scale: 1.02 }} className="bg-white border-2 border-blue-200 rounded-lg shadow-sm hover:shadow-md transition-all">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                {aluno.nome.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{aluno.nome}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={`badge ${getBeltClass(aluno.faixa)} badge-sm`}>
                                    {aluno.faixa}
                                  </div>
                                  <div className="flex gap-1">
                                    {[...Array(4)].map((_, i) => (
                                      <div key={i} className={`w-2 h-4 rounded-full ${i < aluno.graus ? 'bg-red-500' : 'bg-gray-300'}`} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Faltam</p>
                              <p className="text-3xl font-bold text-blue-600">{aluno.faltam}</p>
                              <p className="text-xs text-gray-600">aulas</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                {/* Ranking de Assiduidade */}
                <Card className="bg-white border border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-warning" />
                      Top Assiduidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mockData.ranking.map((aluno, index) => (
                      <div key={aluno.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-400 text-yellow-900' : 
                          index === 1 ? 'bg-gray-400 text-white' : 
                          'bg-orange-400 text-orange-900'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{aluno.nome}</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${aluno.percent}%` }} 
                              transition={{ duration: 1, delay: index * 0.1 }} 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full" 
                            />
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Zap className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs text-gray-600">{aluno.streak} dias consecutivos</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{aluno.percent}%</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Aulas do Dia */}
              <Card className="bg-white border border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-info" />
                    Aulas de Hoje
                  </CardTitle>
                  <Button className="btn btn-primary btn-sm">+ Nova Aula</Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mockData.aulasHoje.map((aula) => (
                      <motion.div 
                        key={aula.id} 
                        whileHover={{ scale: 1.03 }} 
                        className={`bg-white rounded-lg shadow-md p-4 border-2 ${
                          aula.status === 'concluída' ? 'border-green-500' : 
                          aula.status === 'em andamento' ? 'border-blue-500 animate-pulse' : 
                          'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">{aula.horario}</h3>
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                        <p className="font-semibold text-gray-800">{aula.turma}</p>
                        <p className="text-sm text-gray-600">Prof. {aula.instrutor}</p>
                        <div className="flex justify-between items-center mt-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            aula.status === 'concluída' ? 'bg-green-100 text-green-800' : 
                            aula.status === 'em andamento' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {aula.status}
                          </span>
                          {aula.alunos > 0 && (
                            <span className="text-xs text-gray-600">{aula.alunos} alunos</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {selectedTab === 'checkin' && (
            <motion.div key="checkin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {!selectedAula ? (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-900"><CheckCircle className="h-5 w-5 text-blue-600"/> Aulas Abertas</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockAulasAbertas.map((aula) => (
                      <div 
                        key={aula.id} 
                        className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-lg hover:border-blue-500 hover:shadow-xl cursor-pointer shadow-lg transition-all transform hover:scale-105" 
                        onClick={() => { setSelectedAula(aula); setSelectedAlunos([]); }}
                      >
                        <div className="p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-5 w-5 text-blue-600" />
                                <h3 className="text-2xl font-bold text-gray-900">{aula.horario}</h3>
                              </div>
                              <p className="font-semibold text-lg text-gray-800">{aula.turma}</p>
                              <p className="text-sm text-gray-600 mt-1">Prof. {aula.instrutor}</p>
                            </div>
                            <div className="text-center">
                              <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-md">
                                <span className="text-2xl font-bold">{aula.vagas}</span>
                              </div>
                              <p className="text-xs text-gray-700 font-medium mt-2">vagas</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                              Clique para fazer check-in
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button className="btn btn-ghost" onClick={() => setSelectedAula(null)}>
                      <ArrowLeftIcon className="h-5 w-5"/>
                      Voltar
                    </button>
                    <div className="text-right">
                      <p className="text-sm opacity-70">{selectedAlunos.length} presentes</p>
                      <p className="text-xs opacity-50">{selectedAula.turma} - {selectedAula.horario}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content/50"/>
                      <input
                        className="input input-bordered w-full pl-10"
                        placeholder="Buscar aluno por nome ou matrícula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {selectedAlunos.length > 0 && (
                      <button className="btn btn-primary" onClick={() => { setSelectedAula(null); setSelectedAlunos([]); }}>
                        Finalizar Check-in ({selectedAlunos.length})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockAlunos
                      .filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.matricula.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((aluno) => {
                        const marcado = selectedAlunos.some(a => a.id === aluno.id);
                        return (
                          <div key={aluno.id} className={`card ${marcado ? 'border-green-500 bg-green-50' : 'bg-white border-gray-200'} border-2 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition-all`} onClick={() => {
                            setSelectedAlunos(prev => marcado ? prev.filter(a => a.id !== aluno.id) : [...prev, aluno]);
                          }}>
                            <div className="card-body p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                    {aluno.nome.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{aluno.nome}</p>
                                    <p className="text-xs text-gray-600">{aluno.matricula}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`badge ${getBeltClass(aluno.faixa)} badge-sm`}>{aluno.faixa}</span>
                                  <div className="flex gap-0.5">
                                    {[...Array(4)].map((_, i) => (
                                      <div key={i} className={`w-1.5 h-3 rounded-full ${i < aluno.graus ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {selectedTab === 'alunos' && (
            <motion.div key="alunos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-blue-900"><Users className="h-5 w-5 text-blue-600"/> Lista de Alunos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockAlunos.map((aluno) => (
                  <div key={aluno.id} className="card bg-white border-2 border-blue-200 shadow-md hover:shadow-lg transition-all">
                    <div className="card-body p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            {aluno.nome.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{aluno.nome}</p>
                            <p className="text-xs text-gray-600">{aluno.matricula}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`badge ${getBeltClass(aluno.faixa)} mr-2`}>{aluno.faixa}</span>
                          <span className="text-xs opacity-60">{aluno.graus} graus</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {selectedTab === 'graduacoes' && (
            <motion.div key="graduacoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-white border border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-warning"/> Próximos a Graduar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mockData.proximosGraus.map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-white rounded-xl p-3 border-2 border-blue-100 hover:border-blue-300 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            {a.nome.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{a.nome}</p>
                            <span className={`badge ${getBeltClass(a.faixa)} badge-sm`}>{a.faixa}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-600">Faltam</span>
                          <div className="text-xl font-bold text-blue-600">{a.faltam}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-white border border-blue-200">
                  <CardHeader>
                    <CardTitle>Histórico de Graduações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mockGraduacoesHistorico.map((g) => (
                      <div key={g.id} className="bg-white p-3 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all">
                        <p className="font-medium text-gray-900">{g.nome}</p>
                        <p className="text-xs text-gray-600">{g.faixaAnterior} → {g.novaFaixa} • {new Date(g.data).toLocaleDateString('pt-BR')}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {selectedTab === 'aulas' && (
            <motion.div key="aulas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <Card className="bg-white border border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-info"/> Aulas de Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mockData.aulasHoje.map((aula) => (
                      <div key={aula.id} className={`bg-white rounded-lg shadow-md p-4 border-2 ${
                        aula.status === 'concluída' ? 'border-green-500' : 
                        aula.status === 'em andamento' ? 'border-blue-500 animate-pulse' : 
                        'border-gray-200'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">{aula.horario}</h3>
                          <Clock className="h-4 w-4 text-gray-400"/>
                        </div>
                        <p className="font-semibold text-gray-800">{aula.turma}</p>
                        <p className="text-sm text-gray-600">Prof. {aula.instrutor}</p>
                        <div className="flex justify-between items-center mt-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            aula.status === 'concluída' ? 'bg-green-100 text-green-800' : 
                            aula.status === 'em andamento' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {aula.status}
                          </span>
                          {aula.alunos > 0 && <span className="text-xs text-gray-600">{aula.alunos} alunos</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-blue-200">
                <CardHeader>
                  <CardTitle>Próximos Dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {mockAulasSemana.map((a) => (
                      <div key={a.id} className="bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-blue-300 transition-all">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600">{a.dia}</p>
                              <h3 className="text-xl font-bold text-gray-900">{a.horario}</h3>
                              <p className="font-medium text-gray-800">{a.turma}</p>
                              <p className="text-xs text-gray-600">Prof. {a.instrutor}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">{a.vagas}</div>
                              <p className="text-xs text-gray-600">vagas</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

