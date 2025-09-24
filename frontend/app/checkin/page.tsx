'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, QrCode, Tablet, User, MapPin, Loader2 } from 'lucide-react';
import QRCodeScanner from '../../components/QRCodeScanner';
import FaceCapture from '../../components/FaceCapture';
import { http } from '../../lib/api'; // Descomentado para usar API real
import { listUnidades } from '../../lib/peopleApi';

interface CheckinResponse {
  id: string;
  message: string;
  progresso: {
    nome: string;
    faixaAtual: string;
    grauAtual: number;
    aulasRealizadas: number;
    aulasFaltantes: number;
    proximaGraduacao: string;
    porcentagemProgresso: number;
  };
  dataHora: string;
}

interface Unidade {
  id: string;
  nome: string;
  endereco?: string;
  latitude?: number;
  longitude?: number;
}

export default function CheckinPage() {
  const [aba, setAba] = useState<'tablet' | 'qrcode' | 'face'>('tablet');
  const [cpfOuTelefone, setCpfOuTelefone] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [alunoId, setAlunoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<CheckinResponse | null>(null);
  const [erro, setErro] = useState('');
  const [alunoEncontrado, setAlunoEncontrado] = useState<{ 
    id: string; 
    nome: string; 
    faixa: string; 
    grau: number;
  } | null>(null);
  
  // Estados para geolocalização e unidades
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<Unidade | null>(null);
  const [buscandoUnidade, setBuscandoUnidade] = useState(false);
  const [localizacaoAtual, setLocalizacaoAtual] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Função para buscar aluno por CPF/telefone
  const buscarAluno = async () => {
    if (!cpfOuTelefone.trim()) return;
    
    setLoading(true);
    setErro('');
    
    try {
      const response = await http(`/teamcruz/presencas/buscar-aluno?cpfOuTelefone=${encodeURIComponent(cpfOuTelefone)}`, {
        auth: true,
      });
      
      if (response.ok) {
        const aluno = await response.json();
        setAlunoEncontrado(aluno);
        setAlunoId(aluno.id);
      } else {
        const error = await response.json().catch(() => ({ message: 'Aluno não encontrado' }));
        setErro(error.message || 'Aluno não encontrado');
        setAlunoEncontrado(null);
      }
    } catch {
      setErro('Erro ao buscar aluno');
      setAlunoEncontrado(null);
    } finally {
      setLoading(false);
    }
  };

  // Função para lidar com o resultado do QR Code
  const handleQRCodeScan = (qrData: string) => {
    try {
      // Tentar parsear como JSON primeiro (caso seja um QR code estruturado)
      const data = JSON.parse(qrData);
      if (data.alunoId) {
        setAlunoId(data.alunoId);
      }
      if (data.unidadeId) {
        setUnidadeId(data.unidadeId);
      }
    } catch {
      // Se não for JSON válido, usar como ID do aluno diretamente
      setAlunoId(qrData);
    }
  };

  // Função para lidar com o reconhecimento facial
  const handleFaceRecognition = async (faceDescriptor: number[], imageBase64: string) => {
    if (!unidadeId) {
      setErro('Por favor, selecione a unidade antes de usar o reconhecimento facial');
      return;
    }

    setLoading(true);
    setErro('');
    setResultado(null);

    try {
      // Converter base64 para blob
      const base64Response = await fetch(imageBase64);
      const imageBlob = await base64Response.blob();

      // Criar FormData com a imagem e dados
      const formData = new FormData();
      formData.append('image', imageBlob, 'face-capture.jpg');
      formData.append('faceDescriptor', JSON.stringify(faceDescriptor));
      formData.append('unidadeId', unidadeId);

      // Se tiver geolocalização, adicionar
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              formData.append('latitude', position.coords.latitude.toString());
              formData.append('longitude', position.coords.longitude.toString());
              resolve(null);
            },
            () => {
              // Se falhar geolocalização, continua sem
              resolve(null);
            }
          );
        });
      }

      // Chamar API de reconhecimento facial
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/teamcruz/presencas/checkin/face`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setResultado(result);
        // Limpar formulário após sucesso
        setUnidadeId('');
      } else {
        const error = await response.json().catch(() => ({ message: 'Erro no reconhecimento facial' }));
        setErro(error.message || 'Falha no reconhecimento facial');
      }
    } catch (error) {
      console.error('Erro no reconhecimento facial:', error);
      setErro('Erro de conexão durante o reconhecimento facial');
    } finally {
      setLoading(false);
    }
  };

  // Função para registrar presença
  const registrarPresenca = async () => {
    if (!alunoId || !unidadeId) {
      setErro('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    setErro('');
    setResultado(null);

    try {
      // MOCK TEMPORÁRIO - Simulando registro de presença
      // Buscar dados do aluno pelos IDs fictícios
      const alunosMock = [
        { id: '4b770747-02e7-4712-9b3f-83ce306d8719', nome: 'João Silva Santos', faixa: 'Branca', grau: 2, aulas: 15 },
        { id: '0abede3a-f265-47ee-8bdb-ce8427e0b6a7', nome: 'Maria Oliveira Costa', faixa: 'Cinza', grau: 1, aulas: 8 },
        { id: '5ebd4b46-e14a-47ec-b3cf-a142de7bd57a', nome: 'Pedro Rodrigues Lima', faixa: 'Branca', grau: 3, aulas: 22 },
        { id: 'aea68283-3c95-476d-8076-4c04a45691df', nome: 'Ana Paula Ferreira', faixa: 'Amarela', grau: 0, aulas: 5 },
        { id: '781fcafc-c063-4ff0-b96c-9339510ad449', nome: 'Carlos Eduardo Souza', faixa: 'Branca', grau: 4, aulas: 35 }
      ];

      // Simular delay da rede
      await new Promise(resolve => setTimeout(resolve, 1500));

      const aluno = alunosMock.find(a => a.id === alunoId);
      
      if (!aluno) {
        setErro('Aluno não encontrado');
        return;
      }

      // Simular cálculo de progresso
      const aulasNecessarias = 20;
      const aulasRealizadas = aluno.aulas + 1; // +1 pela aula atual
      const aulasFaltantes = Math.max(aulasNecessarias - aulasRealizadas, 0);
      const porcentagemProgresso = Math.min((aulasRealizadas / aulasNecessarias) * 100, 100);
      
      let proximaGraduacao = '';
      if (aluno.faixa === 'Branca' && aluno.grau < 4) {
        proximaGraduacao = `Branca ${aluno.grau + 1}º grau`;
      } else if (aluno.faixa === 'Branca' && aluno.grau >= 4) {
        proximaGraduacao = 'Cinza 0º grau';
      } else if (aluno.faixa === 'Cinza' && aluno.grau < 4) {
        proximaGraduacao = `Cinza ${aluno.grau + 1}º grau`;
      } else if (aluno.faixa === 'Amarela') {
        proximaGraduacao = `Amarela ${aluno.grau + 1}º grau`;
      }

      const resultadoMock = {
        id: `presenca_${Date.now()}`,
        message: 'Presença registrada com sucesso!',
        progresso: {
          nome: aluno.nome,
          faixaAtual: aluno.faixa,
          grauAtual: aluno.grau,
          aulasRealizadas,
          aulasFaltantes,
          proximaGraduacao,
          porcentagemProgresso: Math.round(porcentagemProgresso)
        },
        dataHora: new Date().toISOString()
      };

      setResultado(resultadoMock);
      
      // Limpar formulário após sucesso
      setCpfOuTelefone('');
      setAlunoId('');
      setAlunoEncontrado(null);
      setUnidadeId('');

      /* CÓDIGO ORIGINAL PARA QUANDO O BACKEND ESTIVER FUNCIONANDO:
      let endpoint = '';
      let body = {};

      switch (aba) {
        case 'tablet':
          endpoint = '/teamcruz/presencas/checkin';
          body = {
            alunoId,
            unidadeId,
            origemRegistro: 'TABLET'
          };
          break;
        case 'qrcode':
          endpoint = '/teamcruz/presencas/checkin/qrcode';
          body = {
            alunoId,
            tokenUnidade: unidadeId
          };
          break;
      }

      const response = await http(endpoint, {
        method: 'POST',
        auth: true,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        setResultado(result);
        setCpfOuTelefone('');
        setAlunoId('');
        setAlunoEncontrado(null);
      } else {
        const error = await response.json();
        setErro(error.message || 'Erro ao registrar presença');
      }
      */
    } catch {
      setErro('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar unidades disponíveis
  const buscarUnidades = async () => {
    try {
      const response = await listUnidades({ page: 1, size: 100 });
      const unidadesList = Array.isArray(response) ? response : response.data || [];
      
      // Para teste, vou adicionar coordenadas fictícias para algumas unidades
      const unidadesComCoordenadas = unidadesList.map((unidade: Unidade) => ({
        ...unidade,
        // Coordenadas fictícias para São Paulo (será substituído por dados reais)
        latitude: unidade.latitude || -23.5505 + (Math.random() - 0.5) * 0.1,
        longitude: unidade.longitude || -46.6333 + (Math.random() - 0.5) * 0.1,
      }));
      
      setUnidades(unidadesComCoordenadas);
      return unidadesComCoordenadas;
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
      // Fallback com unidade padrão
      const unidadePadrao = [{
        id: 'teamcruz-matriz',
        nome: 'TeamCruz Matriz',
        endereco: 'Rua das Artes Marciais, 1000 - Centro',
        latitude: -23.5505,
        longitude: -46.6333,
      }];
      setUnidades(unidadePadrao);
      return unidadePadrao;
    }
  };

  // Função para calcular distância entre dois pontos (Haversine)
  const calcularDistancia = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distância em km
  };

  // Função para encontrar unidade mais próxima
  const encontrarUnidadeMaisProxima = (
    latitude: number,
    longitude: number,
    unidadesList: Unidade[]
  ): Unidade | null => {
    if (unidadesList.length === 0) return null;

    let unidadeMaisProxima = unidadesList[0];
    let menorDistancia = calcularDistancia(
      latitude,
      longitude,
      unidadeMaisProxima.latitude || 0,
      unidadeMaisProxima.longitude || 0
    );

    for (const unidade of unidadesList) {
      if (unidade.latitude && unidade.longitude) {
        const distancia = calcularDistancia(
          latitude,
          longitude,
          unidade.latitude,
          unidade.longitude
        );

        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          unidadeMaisProxima = unidade;
        }
      }
    }

    return unidadeMaisProxima;
  };

  // Função para obter geolocalização e identificar unidade
  const identificarUnidadePorLocalizacao = async () => {
    setBuscandoUnidade(true);
    setErro('');

    try {
      // Buscar unidades primeiro
      const unidadesList = await buscarUnidades();

      // Obter localização atual
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocalizacaoAtual({ latitude, longitude });
            
            console.log('Localização atual:', { latitude, longitude });

            // Encontrar unidade mais próxima
            const unidadeProxima = encontrarUnidadeMaisProxima(
              latitude,
              longitude,
              unidadesList
            );

            if (unidadeProxima) {
              const distancia = calcularDistancia(
                latitude,
                longitude,
                unidadeProxima.latitude || 0,
                unidadeProxima.longitude || 0
              );

              setUnidadeSelecionada(unidadeProxima);
              setUnidadeId(unidadeProxima.id);
              
              console.log(`Unidade mais próxima: ${unidadeProxima.nome} (${distancia.toFixed(2)} km)`);
              
              // Só mostrar aviso se a distância for maior que 5km
              if (distancia > 5) {
                setErro(`Você está a ${distancia.toFixed(1)} km da unidade mais próxima (${unidadeProxima.nome}). Verifique se está na localização correta.`);
              }
            } else {
              setErro('Nenhuma unidade encontrada');
            }

            setBuscandoUnidade(false);
          },
          (error) => {
            console.warn('Erro de geolocalização:', error);
            let errorMessage = 'Erro ao obter localização';
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Permissão de localização negada. Por favor, permita o acesso à localização para identificar automaticamente a unidade.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Localização não disponível';
                break;
              case error.TIMEOUT:
                errorMessage = 'Timeout ao obter localização';
                break;
            }
            
            setErro(errorMessage);
            setBuscandoUnidade(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutos
          }
        );
      } else {
        setErro('Geolocalização não é suportada neste navegador');
        setBuscandoUnidade(false);
      }
    } catch (error) {
      console.error('Erro ao identificar unidade:', error);
      setErro('Erro ao buscar unidades');
      setBuscandoUnidade(false);
    }
  };

  useEffect(() => {
    // Identificar unidade automaticamente ao carregar a página
    identificarUnidadePorLocalizacao();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
            Sistema de Check-in TeamCruz
          </h1>

          {/* Abas */}
          <div className="flex mb-6 border-b">
            <button
              onClick={() => setAba('tablet')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                aba === 'tablet' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Tablet size={20} />
              Tablet/App
            </button>
            <button
              onClick={() => setAba('qrcode')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                aba === 'qrcode' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <QrCode size={20} />
              QR Code
            </button>
            <button
              onClick={() => setAba('face')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                aba === 'face' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User size={20} />
              Face
            </button>
          </div>

          {/* Formulário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {aba === 'tablet' && 'Check-in via Tablet/App'}
                {aba === 'qrcode' && 'Check-in via QR Code'}
                {aba === 'face' && 'Check-in via Reconhecimento Facial'}
              </h2>

              {/* Campo CPF/Telefone para busca */}
              {aba === 'tablet' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF ou Telefone
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cpfOuTelefone}
                      onChange={(e) => setCpfOuTelefone(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                      placeholder="Digite o CPF ou telefone"
                    />
                    <button
                      onClick={buscarAluno}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Buscar
                    </button>
                  </div>
                </div>
              )}

              {/* Campo Aluno ID para QR Code */}
              {aba === 'qrcode' && (
                <div className="space-y-4">
                  {/* Scanner QR Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scanner QR Code
                    </label>
                    <QRCodeScanner 
                      onScan={handleQRCodeScan}
                      onError={(error) => setErro(error)}
                    />
                  </div>

                  {/* Campo manual para ID do Aluno */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID do Aluno (manual)
                    </label>
                    <input
                      type="text"
                      value={alunoId}
                      onChange={(e) => setAlunoId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                      placeholder="ID do aluno"
                    />
                  </div>
                </div>
              )}

              {/* Reconhecimento Facial */}
              {aba === 'face' && (
                <div className="space-y-4">
                  {/* Seleção de Unidade com detecção automática para Face */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Unidade
                    </label>
                    
                    {/* Botão para identificar unidade automaticamente */}
                    <button
                      onClick={identificarUnidadePorLocalizacao}
                      disabled={buscandoUnidade}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
                    >
                      {buscandoUnidade ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Identificando...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          Identificar por Localização
                        </>
                      )}
                    </button>

                    {/* Unidade identificada */}
                    {unidadeSelecionada && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-800">Unidade Identificada:</span>
                        </div>
                        <p className="text-green-700 font-medium">{unidadeSelecionada.nome}</p>
                        {unidadeSelecionada.endereco && (
                          <p className="text-sm text-green-600">{unidadeSelecionada.endereco}</p>
                        )}
                      </div>
                    )}

                    {/* Select manual de unidades */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Ou selecione manualmente:
                      </label>
                      <select
                        value={unidadeId}
                        onChange={(e) => {
                          setUnidadeId(e.target.value);
                          const unidade = unidades.find(u => u.id === e.target.value);
                          setUnidadeSelecionada(unidade || null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                      >
                        <option value="">Selecione uma unidade</option>
                        {unidades.map((unidade) => (
                          <option key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* FaceCapture com delay para garantir renderização estável */}
                  <div key={`face-capture-${aba}`}>
                    <FaceCapture 
                      onFaceDetected={handleFaceRecognition}
                      onError={(error) => setErro(error)}
                    />
                  </div>
                </div>
              )}

              {/* Informações do aluno encontrado */}
              {alunoEncontrado && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="font-medium text-green-800">Aluno encontrado:</p>
                  <p className="text-green-700">{alunoEncontrado.nome}</p>
                  <p className="text-sm text-green-600">Faixa: {alunoEncontrado.faixa}</p>
                </div>
              )}

              {/* Seleção de Unidade com detecção automática */}
              {(aba === 'tablet' || aba === 'qrcode') && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Unidade
                  </label>
                  
                  {/* Botão para identificar unidade automaticamente */}
                  <button
                    onClick={identificarUnidadePorLocalizacao}
                    disabled={buscandoUnidade}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
                  >
                    {buscandoUnidade ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Identificando...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        Identificar por Localização
                      </>
                    )}
                  </button>

                  {/* Unidade identificada */}
                  {unidadeSelecionada && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800">Unidade Identificada:</span>
                      </div>
                      <p className="text-green-700 font-medium">{unidadeSelecionada.nome}</p>
                      {unidadeSelecionada.endereco && (
                        <p className="text-sm text-green-600">{unidadeSelecionada.endereco}</p>
                      )}
                    </div>
                  )}

                  {/* Select manual de unidades */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Ou selecione manualmente:
                    </label>
                    <select
                      value={unidadeId}
                      onChange={(e) => {
                        setUnidadeId(e.target.value);
                        const unidade = unidades.find(u => u.id === e.target.value);
                        setUnidadeSelecionada(unidade || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="">Selecione uma unidade</option>
                      {unidades.map((unidade) => (
                        <option key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Botão de check-in para Tablet e QR Code */}
              {(aba === 'tablet' || aba === 'qrcode') && (
                <button
                  onClick={registrarPresenca}
                  disabled={loading || !alunoId || !unidadeId}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    'Registrando...'
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Registrar Presença
                    </>
                  )}
                </button>
              )}

              {/* Erro */}
              {erro && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800">{erro}</p>
                </div>
              )}
            </div>

            {/* Resultado */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Resultado</h2>
              
              {resultado ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="text-green-600" size={24} />
                    <p className="text-green-800 font-medium">{resultado.message}</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Aluno:</span>
                        <p>{resultado.progresso.nome}</p>
                      </div>
                      <div>
                        <span className="font-medium">Faixa Atual:</span>
                        <p>{resultado.progresso.faixaAtual} {resultado.progresso.grauAtual}º grau</p>
                      </div>
                      <div>
                        <span className="font-medium">Aulas Realizadas:</span>
                        <p>{resultado.progresso.aulasRealizadas}</p>
                      </div>
                      <div>
                        <span className="font-medium">Faltam:</span>
                        <p>{resultado.progresso.aulasFaltantes} aulas</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <span className="font-medium">Próxima Graduação:</span>
                      <p>{resultado.progresso.proximaGraduacao}</p>
                    </div>
                    
                    <div className="mt-3">
                      <span className="font-medium">Progresso:</span>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${resultado.progresso.porcentagemProgresso}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{resultado.progresso.porcentagemProgresso}% completo</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
                  Nenhum check-in realizado ainda
                </div>
              )}
            </div>
          </div>

          {/* Informações de debug (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === 'development' && localizacaoAtual && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
              <p className="font-medium text-gray-700 mb-1">Debug - Localização:</p>
              <p className="text-gray-600">
                Lat: {localizacaoAtual.latitude.toFixed(6)}, 
                Lng: {localizacaoAtual.longitude.toFixed(6)}
              </p>
              {unidadeSelecionada && (
                <p className="text-gray-600">
                  Distância: {calcularDistancia(
                    localizacaoAtual.latitude,
                    localizacaoAtual.longitude,
                    unidadeSelecionada.latitude || 0,
                    unidadeSelecionada.longitude || 0
                  ).toFixed(2)} km
                </p>
              )}
            </div>
          )}

          {/* Instruções */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Instruções:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>Tablet/App:</strong> Busque o aluno por CPF ou telefone, selecione a unidade e registre a presença.</li>
              <li><strong>QR Code:</strong> Use a câmera para escanear o QR Code do aluno ou digite o ID manualmente. Também insira o token da unidade.</li>
              <li><strong>Face:</strong> Selecione a unidade, posicione-se na frente da câmera e aguarde o reconhecimento facial automático.</li>
              <li><strong>Câmera:</strong> Permite o acesso à câmera para leitura automática de QR Codes e reconhecimento facial. Funciona melhor com boa iluminação.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
