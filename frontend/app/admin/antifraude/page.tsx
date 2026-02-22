"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAntifraud } from "@/hooks/useAntifraud";
import toast from "react-hot-toast";

export default function AntifraudePage() {
  const router = useRouter();
  const { 
    loadIdpaySdk, 
    loadThreeDsSdk, 
    loadClearSaleScript,
    generateSessionId,
    checkSdkStatus,
    idpayReady,
    threeDsLoaded,
    clearSaleLoaded,
    sessionId,
  } = useAntifraud();

  const [loading, setLoading] = useState(true);
  const [sdkStatus, setSdkStatus] = useState({
    idpay: { loaded: false, available: false },
    threeds: { loaded: false, available: false },
    clearsale: { loaded: false, available: false, session_id: null as string | null },
  });

  // Inicializar SDKs ao montar
  useEffect(() => {
    const initAntifraud = async () => {
      setLoading(true);
      try {
        await Promise.allSettled([
          loadIdpaySdk(),
          loadThreeDsSdk(),
          loadClearSaleScript(),
        ]);
        await generateSessionId();
        toast.success("✅ Verificação de antifraude concluída");
      } catch (error: any) {
        console.error("Erro ao inicializar antifraude:", error);
        toast.error(`❌ Erro: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    initAntifraud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualizar status REATIVAMENTE quando os estados dos SDKs mudarem
  useEffect(() => {
    if (!loading) {
      setSdkStatus(checkSdkStatus());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idpayReady, threeDsLoaded, clearSaleLoaded, sessionId, loading]);

  const getStatusDisplay = (loaded: boolean, available: boolean) => {
    if (loading) {
      return { text: "Verificando...", icon: Loader2, color: "gray", bgColor: "gray-100" };
    }
    if (loaded && available) {
      return { text: "Ativo", icon: CheckCircle, color: "green", bgColor: "green-100" };
    }
    return { text: "Inativo", icon: XCircle, color: "red", bgColor: "red-100" };
  };

  const clearSaleStatus = getStatusDisplay(sdkStatus.clearsale.loaded, sdkStatus.clearsale.available);
  const threeDsStatus = getStatusDisplay(sdkStatus.threeds.loaded, sdkStatus.threeds.available);
  const idpayStatus = getStatusDisplay(sdkStatus.idpay.loaded, sdkStatus.idpay.available);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Antifraude</h1>
          <p className="text-gray-600">ClearSale, 3DS e IDPAY</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-${clearSaleStatus.bgColor} rounded-lg`}>
                <Shield className={`h-6 w-6 text-${clearSaleStatus.color}-600`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">ClearSale</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{clearSaleStatus.text}</p>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : sdkStatus.clearsale.available ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                {sdkStatus.clearsale.session_id && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    Session: {sdkStatus.clearsale.session_id.substring(0, 16)}...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-${threeDsStatus.bgColor} rounded-lg`}>
                <Shield className={`h-6 w-6 text-${threeDsStatus.color}-600`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">3D Secure</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{threeDsStatus.text}</p>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : sdkStatus.threeds.available ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-${idpayStatus.bgColor} rounded-lg`}>
                <Shield className={`h-6 w-6 text-${idpayStatus.color}-600`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">IDPAY (Unico)</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{idpayStatus.text}</p>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : sdkStatus.idpay.available ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Antifraude</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p className="font-semibold text-blue-900">
                  ✅ Integração Ativa via RykonPay
                </p>
                <p className="text-sm text-blue-700">
                  Os SDKs de antifraude estão sendo carregados automaticamente nos pagamentos.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Reverificar"
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold mb-2">ClearSale</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Rastreamento de sessão</li>
                  <li>• Análise comportamental</li>
                  <li>• Score de risco</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">3D Secure (PagBank)</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Autenticação bancária</li>
                  <li>• Redirecionamento seguro</li>
                  <li>• Aprovação em tempo real</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">IDPAY (Unico)</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Biometria facial</li>
                  <li>• Validação de documentos</li>
                  <li>• Prova de vida</li>
                  <li>• SDK: <code className="bg-gray-100 px-1 rounded text-xs">idpay-b2b-sdk@2.1.2</code></li>
                  <li>• Modo: <code className="bg-gray-100 px-1 rounded text-xs">IFRAME / UAT</code></li>
                  <li>• Trigger: <code className="bg-gray-100 px-1 rounded text-xs">analyse_required = IDPAY</code></li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
