'use client';

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface FaceCaptureProps {
  onFaceDetected: (faceDescriptor: number[], imageBase64: string) => void;
  onError: (error: string) => void;
  className?: string;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ onFaceDetected, onError, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [componentReady, setComponentReady] = useState(false);
  const [forceRender, setForceRender] = useState(0); // Para forçar re-renderização
  const [isInitializing, setIsInitializing] = useState(false); // Flag para proteger durante inicialização
  const [isVideoReady, setIsVideoReady] = useState(false); // Flag para indicar se o vídeo está pronto para captura
  // const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  // Callback ref para o vídeo com proteção anti re-renderização
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    console.log('[VideoCallbackRef] Elemento recebido:', node);
    
    // Se estamos inicializando e recebemos null, ignorar para evitar interferência
    if (isInitializing && !node) {
      console.log('[VideoCallbackRef] Ignorando null durante inicialização');
      return;
    }
    
    // Se já temos um vídeo funcionando e recebemos null (re-render), ignorar completamente
    if (!node && videoRef.current && isCameraActive) {
      console.log('[VideoCallbackRef] Ignorando null - câmera ativa');
      return;
    }
    
    // Se recebemos um novo elemento video e já temos um com stream ativo, transferir
    if (node && videoRef.current && videoRef.current !== node && streamRef.current) {
      console.log('[VideoCallbackRef] Transferindo stream para novo elemento');
      const oldVideo = videoRef.current;
      const stream = oldVideo.srcObject as MediaStream;
      
      if (stream) {
        // Transferir stream para o novo elemento
        node.srcObject = stream;
        node.play().catch(err => console.error('Erro ao reproduzir no novo elemento:', err));
      }
    }
    
    if (node) {
      videoRef.current = node;
      console.log('[VideoCallbackRef] VideoRef atribuído imediatamente');
      // Só marcar como pronto se não estivermos inicializando
      if (!isInitializing) {
        setComponentReady(true);
        console.log('[VideoCallbackRef] Componente marcado como pronto');
      }
    } else {
      // Só limpar se não estivermos inicializando e a câmera não estiver ativa
      if (!isInitializing && !isCameraActive) {
        videoRef.current = null;
        setComponentReady(false);
      }
    }
  }, [isInitializing, isCameraActive]);

  // Verificar permissão da câmera
  const checkCameraPermission = useCallback(async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('Status da permissão da câmera:', permission.state);
        
        permission.onchange = () => {
          console.log('Mudança na permissão da câmera:', permission.state);
        };
      }
    } catch (err) {
      console.warn('Não foi possível verificar permissões:', err);
    }
  }, []);

  // Parar câmera com limpeza completa
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Force reload do elemento video
    }
    
    // Só alterar estados se não estivermos inicializando
    if (!isInitializing) {
      setIsCameraActive(false);
      setFaceDetected(false);
      setIsVideoReady(false); // Resetar estado do vídeo
      setError(null);
    }
  }, [isInitializing]);

  // Iniciar câmera com melhor tratamento de erro
  const startCamera = useCallback(async () => {
    console.log('=== Iniciando processo de câmera ===');
    console.log('ComponentReady:', componentReady);
    console.log('VideoRef.current:', videoRef.current);
    console.log('IsCameraActive:', isCameraActive);

    // Prevenir múltiplas execuções simultâneas
    if (isLoading || isInitializing) {
      console.log('Inicialização já em andamento, ignorando...');
      return;
    }

    // Capturar referência estável ANTES de qualquer mudança de estado
    const stableVideoRef = videoRef.current;
    if (!stableVideoRef) {
      console.error('Elemento de vídeo não disponível no início');
      setError('Elemento de vídeo não encontrado - tente recarregar a página');
      return;
    }

    console.log('Referência estável capturada:', stableVideoRef);

    try {
      // Marcar como inicializando PRIMEIRO para proteger contra re-renderizações
      // Agrupar mudanças de estado para evitar múltiplas re-renderizações
      setIsInitializing(true);
      
      // Aguardar um tick para que a flag seja aplicada antes de continuar
      await new Promise(resolve => setTimeout(resolve, 0));
      
      setIsLoading(true);
      setError(null);
      
      // Parar qualquer stream existente primeiro
      stopCamera();

      console.log('Elemento de vídeo encontrado! Solicitando acesso à câmera...');
      
      const constraints = {
        video: {
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream obtido:', stream.getVideoTracks().length, 'tracks');
      
      // Log das configurações da câmera
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('Configurações do video track:', videoTrack.getSettings());
      }

      // Usar a referência estável capturada no início
      console.log('Verificando referência estável após obter stream:', !!stableVideoRef);
      
      // Configurar o vídeo usando a referência estável
      stableVideoRef.srcObject = stream;
      streamRef.current = stream;
      
      console.log('Stream atribuído ao elemento de vídeo');

      // Aguardar o vídeo carregar e tentar play com retry
      let playAttempts = 0;
      const maxAttempts = 3;
      
      const attemptPlay = async (): Promise<void> => {
        try {
          playAttempts++;
          console.log(`Tentativa de play ${playAttempts}/${maxAttempts}`);
          
          // Verificar se o vídeo ainda existe
          if (!stableVideoRef.srcObject) {
            throw new Error('srcObject foi removido');
          }
          
          await stableVideoRef.play();
          console.log('Video.play() executado com sucesso');
          
        } catch (error: unknown) {
          const err = error as Error;
          console.error(`Erro na tentativa ${playAttempts}:`, err.name, err.message);
          
          if (err.name === 'AbortError' && playAttempts < maxAttempts) {
            console.log('⏳ AbortError detectado - aguardando 500ms antes de tentar novamente...');
            await new Promise(resolve => setTimeout(resolve, 500));
            return attemptPlay();
          } else if (err.name === 'NotAllowedError') {
            throw new Error('Permissão para reproduzir vídeo negada pelo browser');
          } else if (playAttempts >= maxAttempts) {
            throw new Error(`Falha após ${maxAttempts} tentativas: ${err.message}`);
          } else {
            throw error;
          }
        }
      };

      // Aguardar o vídeo carregar os metadados
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          stableVideoRef.removeEventListener('loadedmetadata', onLoadedMetadata);
          stableVideoRef.removeEventListener('error', onError);
          console.log('Vídeo carregado:', stableVideoRef.videoWidth, 'x', stableVideoRef.videoHeight);
          resolve();
        };

        const onError = (e: Event) => {
          console.error('Erro ao carregar vídeo:', e);
          stableVideoRef.removeEventListener('loadedmetadata', onLoadedMetadata);
          stableVideoRef.removeEventListener('error', onError);
          reject(new Error('Erro ao carregar vídeo'));
        };

        stableVideoRef.addEventListener('loadedmetadata', onLoadedMetadata);
        stableVideoRef.addEventListener('error', onError);

        // Timeout de segurança
        setTimeout(() => {
          if (!isCameraActive) {
            reject(new Error('Timeout ao carregar vídeo'));
          }
        }, 5000);
      });

      // Tentar reproduzir com retry para AbortError
      await attemptPlay();
      
      // Verificar se o vídeo está realmente reproduzindo
      setTimeout(() => {
        if (stableVideoRef.readyState >= 2) { // HAVE_CURRENT_DATA ou superior
          console.log('Vídeo está reproduzindo corretamente');
          console.log('ReadyState:', stableVideoRef.readyState);
          console.log('VideoWidth:', stableVideoRef.videoWidth);
          console.log('VideoHeight:', stableVideoRef.videoHeight);
          console.log('Paused:', stableVideoRef.paused);
          
          // Marcar como pronto independente do evento onPlay
          if (stableVideoRef.videoWidth > 0 && stableVideoRef.videoHeight > 0) {
            setIsVideoReady(true);
            console.log('✅ Vídeo marcado como pronto (verificação manual)');
          }
          
          // Se o vídeo estiver pausado, tentar play novamente
          if (stableVideoRef.paused) {
            console.log('⚠️ Vídeo pausado - tentando play novamente');
            stableVideoRef.play().catch(err => {
              console.error('Erro ao tentar play novamente:', err);
            });
          }
        } else {
          console.warn('⚠️ Vídeo não está pronto ainda, readyState:', stableVideoRef.readyState);
          // Tentar forçar o play mesmo assim
          if (stableVideoRef.paused) {
            console.log('🔄 Tentando forçar play...');
            stableVideoRef.play().catch(err => {
              console.error('Erro ao forçar play:', err);
            });
          }
        }
      }, 1000);
      
      setIsCameraActive(true);
      setIsInitializing(false); // Liberar flag após sucesso
      
      // Simular detecção após 3 segundos
      setTimeout(() => {
        if (streamRef.current) {
          setFaceDetected(true);
        }
      }, 3000);

    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      
      let errorMessage = 'Erro desconhecido ao acessar câmera';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Acesso à câmera negado. Por favor, permita o acesso à câmera nas configurações do navegador.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Câmera já está em uso por outro aplicativo. Feche outros aplicativos que possam estar usando a câmera.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Configurações de câmera não suportadas pelo dispositivo.';
        } else if (err.name === 'SecurityError') {
          errorMessage = 'Acesso à câmera bloqueado por questões de segurança. Verifique se está usando HTTPS.';
        } else {
          errorMessage = `Erro: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      onError(errorMessage);
      stopCamera();
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  }, [componentReady, isCameraActive, isInitializing, isLoading, onError, stopCamera]);

  // Capturar foto e gerar descriptor mock
  const captureFace = useCallback(async () => {
    if (!videoRef.current || !faceDetected || !isCameraActive) {
      console.log('⚠️ Condições não atendidas para captura:', {
        videoRef: !!videoRef.current,
        faceDetected,
        isCameraActive
      });
      return;
    }

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      
      // Verificações mais robustas do estado do vídeo
      console.log('📊 Estado do vídeo para captura:', {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        currentTime: video.currentTime
      });
      
      // Aguardar o vídeo estar completamente pronto se necessário
      if (video.readyState < 2) { // HAVE_CURRENT_DATA
        console.log('⏳ Aguardando vídeo carregar dados...');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout aguardando vídeo carregar'));
          }, 3000);
          
          const checkReady = () => {
            if (video.readyState >= 2) {
              clearTimeout(timeout);
              resolve(undefined);
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
      }
      
      // Verificação final
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Vídeo não tem dimensões válidas. Tente aguardar mais um pouco.');
      }
      
      console.log('✅ Vídeo pronto para captura:', video.videoWidth, 'x', video.videoHeight);
      
      // Criar canvas temporário para capturar a imagem
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth || 640;
      tempCanvas.height = video.videoHeight || 480;
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Não foi possível criar contexto do canvas');
      }

      // Desenhar frame do vídeo no canvas (espelhado)
      ctx.scale(-1, 1);
      ctx.drawImage(video, -tempCanvas.width, 0);
      
      // Obter imagem em base64
      const imageBase64 = tempCanvas.toDataURL('image/jpeg', 0.8);
      
      // Gerar descriptor facial simulado (128 dimensões)
      // Em produção, isso seria feito pelo face-api.js
      const faceDescriptor = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
      
      console.log('Foto capturada, enviando para processamento...');
      onFaceDetected(faceDescriptor, imageBase64);
      
    } catch (error) {
      const errorMsg = 'Erro ao capturar foto facial';
      console.error(errorMsg, error);
      setError(errorMsg);
      onError(errorMsg);
    } finally {
      setIsCapturing(false);
    }
  }, [videoRef, faceDetected, isCameraActive, onFaceDetected, onError]);

  // Verificar permissões ao montar o componente
  useEffect(() => {
    checkCameraPermission();
  }, [checkCameraPermission]);

  // Marcar componente como pronto após renderização (useLayoutEffect para execução síncrona)
  useLayoutEffect(() => {
    console.log('FaceCapture useLayoutEffect executado - sincronizando DOM');
    console.log('VideoRef.current no layoutEffect:', !!videoRef.current);
    setComponentReady(true);
  }, []);

  // Fallback com timer caso useLayoutEffect não seja suficiente
  useEffect(() => {
    console.log('FaceCapture useEffect executado');
    const timer = setTimeout(() => {
      if (!componentReady) {
        setComponentReady(true);
        console.log('Componente FaceCapture pronto via fallback - videoRef.current:', !!videoRef.current);
      }
    }, 300);
    
    return () => {
      console.log('Limpando timer de componentReady');
      clearTimeout(timer);
    };
  }, [componentReady]);

  // Limpar recursos na desmontagem - apenas se realmente estiver desmontando
  useEffect(() => {
    return () => {
      console.log('Limpando recursos do componente FaceCapture...');
      // Só limpar se não estivermos apenas re-renderizando com câmera ativa
      if (!document.body.contains(videoRef.current)) {
        stopCamera();
      } else {
        console.log('Componente sendo re-renderizado - não limpando câmera');
      }
    };
  }, [stopCamera]);

  // Mostrar loading
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Inicializando câmera...</p>
        <p className="text-sm text-gray-500 mt-2">Aguardando permissões...</p>
      </div>
    );
  }

  // Mostrar erro
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4 max-w-md">
          <div className="flex items-center mb-3">
            <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
            <span className="font-semibold text-red-700">Erro de Câmera</span>
          </div>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          
          <div className="space-y-2 text-xs text-red-500 mb-4">
            <p><strong>Possíveis soluções:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Feche outros aplicativos usando a câmera (Zoom, Skype, etc.)</li>
              <li>Atualize a página e tente novamente</li>
              <li>Permita o acesso à câmera quando solicitado</li>
              <li>Verifique se a câmera está funcionando em outras aplicações</li>
            </ul>
          </div>

          <button
            onClick={() => {
              setError(null);
              startCamera();
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className="relative">
        {/* Renderizar vídeo com key mais estável para evitar re-criação */}
        <video
          key="camera-video-stable" // Key completamente estática
          ref={videoCallbackRef}
          autoPlay={false} // Desabilitar autoplay para controlar manualmente
          playsInline
          muted
          controls={false} // Garantir que não mostra controles
          className="w-full max-w-md rounded-lg border-2 border-gray-300 bg-black" // Adicionar fundo preto
          style={{ 
            transform: 'scaleX(-1)', // Espelhar horizontalmente
            minHeight: '300px', // Altura mínima
            objectFit: 'cover', // Garantir que preencha o espaço
            backgroundColor: '#000000', // Forçar fundo preto
            display: 'block', // Garantir que está visível
            visibility: 'visible',
            opacity: 1
          }}
          onLoadedMetadata={() => {
            console.log('📊 Video loadedMetadata disparado');
            if (videoRef.current) {
              console.log(`Video dimensões: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
              console.log(`Video readyState: ${videoRef.current.readyState}`);
            }
          }}
          onCanPlay={() => {
            console.log('📹 Video canPlay disparado');
            if (videoRef.current) {
              console.log(`Video readyState: ${videoRef.current.readyState}`);
              console.log(`Video paused: ${videoRef.current.paused}`);
            }
          }}
          onPlay={() => {
            console.log('▶️ Video play disparado');
            // Verificação pós-play para garantir que tudo está funcionando
            setTimeout(() => {
              if (videoRef.current) {
                const video = videoRef.current;
                console.log('=== VERIFICAÇÃO PÓS-PLAY ===');
                console.log(`Dimensões: ${video.videoWidth}x${video.videoHeight}`);
                console.log(`Ready state: ${video.readyState}`);
                console.log(`Current time: ${video.currentTime}`);
                console.log(`Paused: ${video.paused}`);
                console.log(`srcObject ativo:`, video.srcObject ? 'SIM' : 'NÃO');
                
                // Marcar vídeo como pronto se tiver dimensões válidas
                if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
                  setIsVideoReady(true);
                  console.log('✅ Vídeo marcado como pronto para captura');
                } else {
                  console.log('⚠️ Vídeo ainda não está totalmente pronto');
                }
                
                if (video.srcObject) {
                  const stream = video.srcObject as MediaStream;
                  console.log(`Stream ativo: ${stream.active}`);
                  console.log('Tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled} (${t.readyState})`));
                }
              }
            }, 1000);
          }}
          onError={(e) => {
            console.error('❌ Erro no elemento video:', e);
          }}
        />
        
        <canvas
          ref={(el) => {
            canvasRef.current = el;
            console.log('Canvas ref atribuído:', !!el);
          }}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
        />
      
        {/* Indicador de detecção facial */}
        {isCameraActive && (
          <div className="absolute top-2 right-2 flex items-center space-x-2 bg-black bg-opacity-50 px-3 py-1 rounded-full">
            <div className={`w-3 h-3 rounded-full ${
              !isVideoReady 
                ? 'bg-blue-500 animate-pulse' 
                : faceDetected 
                  ? 'bg-green-500' 
                  : 'bg-yellow-500'
            }`}></div>
            <span className={`text-sm font-medium text-white`}>
              {!isVideoReady 
                ? 'Carregando vídeo...' 
                : faceDetected 
                  ? 'Rosto detectado' 
                  : 'Detectando...'
              }
            </span>
          </div>
        )}

        {/* Moldura para posicionamento */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                          w-48 h-56 border-2 border-dashed border-blue-400 rounded-lg opacity-70">
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                          w-44 h-52 border-2 border-blue-500 rounded-lg"></div>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        {!isCameraActive ? (
          <button
            onClick={startCamera}
            disabled={!componentReady || isLoading}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Camera className="w-5 h-5 mr-2" />
            {!componentReady ? 'Preparando...' : isLoading ? 'Iniciando...' : 'Iniciar Câmera'}
          </button>
        ) : (
          <>
            <button
              onClick={stopCamera}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <CameraOff className="w-5 h-5 mr-2" />
              Parar
            </button>
            
            <button
              onClick={captureFace}
              disabled={!faceDetected || !isVideoReady || isCapturing}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={
                !isVideoReady 
                  ? 'Aguardando vídeo carregar completamente...' 
                  : !faceDetected 
                    ? 'Aguardando detecção de rosto...' 
                    : 'Clique para capturar o rosto'
              }
            >
              {isCapturing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : !isVideoReady ? (
                <>
                  <div className="animate-pulse w-5 h-5 bg-white/50 rounded-full mr-2"></div>
                  Preparando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Capturar Rosto
                </>
              )}
            </button>
          </>
        )}

        {/* Botão de debug - apenas em desenvolvimento */}
        {process.env.NODE_ENV === 'development' && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                console.log('=== DEBUG INFO ===');
                console.log('VideoRef.current:', videoRef.current);
                console.log('ComponentReady:', componentReady);
                console.log('IsCameraActive:', isCameraActive);
                console.log('IsVideoReady:', isVideoReady);
                console.log('ForceRender:', forceRender);
                console.log('IsLoading:', isLoading);
                console.log('IsInitializing:', isInitializing);
                console.log('StreamRef.current:', streamRef.current);
                
                if (videoRef.current) {
                  const video = videoRef.current;
                  console.log('=== VIDEO ELEMENT INFO ===');
                  console.log('Video.readyState:', video.readyState);
                  console.log('Video.videoWidth:', video.videoWidth);
                  console.log('Video.videoHeight:', video.videoHeight);
                  console.log('Video.paused:', video.paused);
                  console.log('Video.ended:', video.ended);
                  console.log('Video.srcObject:', video.srcObject);
                  console.log('Video.currentTime:', video.currentTime);
                  
                  if (video.srcObject) {
                    const stream = video.srcObject as MediaStream;
                    console.log('Stream active:', stream.active);
                    console.log('Stream tracks:', stream.getTracks().map(t => ({
                      kind: t.kind,
                      enabled: t.enabled,
                      readyState: t.readyState
                    })));
                  }
                }
                
                setForceRender(prev => prev + 1);
              }}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded"
            >
              Debug
            </button>
            
            <button
              onClick={() => {
                if (videoRef.current) {
                  console.log('🎯 Tentando forçar visibilidade do vídeo...');
                  const video = videoRef.current;
                  
                  // Remover qualquer estilo que possa estar escondendo o vídeo
                  video.style.display = 'block';
                  video.style.visibility = 'visible';
                  video.style.opacity = '1';
                  
                  // Forçar dimensões
                  video.style.width = '100%';
                  video.style.height = 'auto';
                  video.style.minHeight = '300px';
                  
                  // Tentar play se estiver pausado
                  if (video.paused && video.srcObject) {
                    console.log('🎬 Tentando reproduzir vídeo...');
                    video.play().then(() => {
                      console.log('✅ Vídeo reproduzindo após forçar');
                      // Marcar como pronto manualmente
                      if (video.videoWidth > 0 && video.videoHeight > 0) {
                        setIsVideoReady(true);
                      }
                    }).catch(console.error);
                  }
                  
                  // Verificar se o srcObject está presente
                  if (!video.srcObject && streamRef.current) {
                    console.log('🔄 Reassociando stream ao vídeo...');
                    video.srcObject = streamRef.current;
                  }
                  
                  console.log('✅ Estilos aplicados ao vídeo');
                  console.log('Current styles:', {
                    display: video.style.display,
                    visibility: video.style.visibility,
                    opacity: video.style.opacity,
                    width: video.style.width,
                    height: video.style.height,
                    srcObject: !!video.srcObject,
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight
                  });
                }
              }}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded"
            >
              Forçar Visibilidade
            </button>
          </div>
        )}
      </div>

      {/* Instruções */}
      <div className="text-center max-w-md bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-center mb-2">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
          <span className="font-semibold text-blue-600">Como usar:</span>
        </div>
        <ul className="text-sm text-gray-700 space-y-1 text-left">
          <li>• Posicione seu rosto na moldura azul</li>
          <li>• Mantenha boa iluminação no ambiente</li>
          <li>• Evite óculos escuros ou máscaras</li>
          <li>• Aguarde a detecção automática</li>
          <li>• Clique em &quot;Capturar Rosto&quot; quando pronto</li>
        </ul>
      </div>
    </div>
  );
};

export default FaceCapture;