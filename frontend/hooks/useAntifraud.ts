"use client";

import { useState, useCallback } from "react";
import { IDPaySDK } from "idpay-b2b-sdk";

declare global {
  interface Window {
    // 3DS SDK
    PagSeguro?: unknown;
    // ClearSale
    csdm?: unknown;
  }
}

/** Dados retornados pelo callback onFinish do SDK IDPAY */
export interface IdpayFinishData {
  id: string;            // antifraud_id
  concluded: boolean;
  captureConcluded?: boolean;   // camelCase (nosso mapeamento)
  capture_concluded?: boolean;  // snake_case (retorno real do SDK)
}

interface IdpayConfig {
  npmPackage: string;
  environment: string;  // 'uat' | 'prod'
  initCode?: string;
  openCode?: string;
}

interface ThreeDsConfig {
  scriptUrl: string;
  scriptTag: string;
  setupCode: string;
  authenticationCode: string;
  environment: string;
  instructions: string[];
}

interface ClearSaleConfig {
  appKey: string;
  scriptUrl: string;
  environment: string;
}

interface SessionIdResponse {
  session_id: string;
  user_id: string;
}

export function useAntifraud() {
  const [idpayReady, setIdpayReady] = useState(false);
  const [threeDsLoaded, setThreeDsLoaded] = useState(false);
  const [clearSaleLoaded, setClearSaleLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [idpaySdkConfig, setIdpaySdkConfig] = useState<IdpayConfig | null>(null);

  /**
   * Carregar configuração do SDK IDPAY
   */
  const loadIdpaySdkConfig = useCallback(async (): Promise<IdpayConfig> => {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/paytime/antifraud/idpay/sdk-config`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao obter configuração SDK IDPAY");
    }

    return response.json();
  }, []);

  /**
   * Inicializar SDK IDPAY (idpay-b2b-sdk)
   * Deve ser chamado assim que o componente montar para pré-carregar o iframe
   */
  const loadIdpaySdk = useCallback(async () => {
    if (idpayReady) {
      console.log("✅ SDK IDPAY já inicializado");
      return;
    }

    try {
      console.log("🔐 Buscando configuração SDK IDPAY...");
      const config = await loadIdpaySdkConfig();
      setIdpaySdkConfig(config);

      console.log("📦 SDK IDPAY config recebida:", {
        environment: config.environment,
      });

      // Inicializar SDK — pré-carrega o iframe para experiência mais fluida
      const env = (config.environment?.toLowerCase() === "prod" || config.environment?.toLowerCase() === "production")
        ? undefined  // produção: não passa env
        : "uat";    // sandbox/homologação

      IDPaySDK.init({
        type: "IFRAME",
        ...(env ? { env } : {}),
      } as Parameters<typeof IDPaySDK.init>[0]);

      console.log("✅ SDK IDPAY inicializado com type=IFRAME, env=", env ?? "prod");
      setIdpayReady(true);
    } catch (error) {
      console.error("❌ Erro ao inicializar SDK IDPAY:", error);
      throw error;
    }
  }, [idpayReady, loadIdpaySdkConfig]);

  /**
   * Abrir iframe biométrico do IDPAY (idpay-b2b-sdk)
   * @param antifraudId  - antifraud_id retornado pelo Paytime na criação da transação
   * @param sessionToken - session retornado pelo Paytime na criação da transação
   * @returns dados do callback onFinish: { id, concluded, captureConcluded }
   */
  const openIdpayIframe = useCallback(
    async (
      antifraudId: string,
      sessionToken: string,
      /**
       * Callback chamado quando onFinish chega APÓS o timeout ter disparado.
       * Garante que authenticateIdpay seja sempre executado mesmo em fluxos lentos (QR code no celular).
       */
      onLateFinish?: (transaction: IdpayFinishData) => void
    ): Promise<IdpayFinishData> => {
      console.log("🪪 [IDPAY] Abrindo iframe biométrico...", { antifraudId });

      return new Promise((resolve, reject) => {
        // Timeout de segurança: SDK pode não chamar onFinish em caso de
        // "Domain not allowed" ou erros silenciosos — restaura o modal após 300s
        // (5 minutos: tempo suficiente para o usuário escanear QR + completar biometria no celular)
        let settled = false;
        const timeoutId = setTimeout(() => {
          if (settled) return;
          settled = true;
          console.error("❌ [IDPAY] Timeout: onFinish não foi chamado em 300s. Possível erro de domínio não permitido ou SDK bloqueado.");
          console.error("❌ [IDPAY] Verifique: window.location.origin =", window.location.origin);
          reject(new Error("IDPAY_ERROR: timeout — verifique se o domínio está na whitelist do IDPAY. Origin: " + window.location.origin));
        }, 300000);

        try {
          IDPaySDK.open({
            transactionId: antifraudId,
            token: sessionToken,
            onFinish: (transaction: IdpayFinishData, type: string) => {
              clearTimeout(timeoutId);
              console.log("📸 [IDPAY] onFinish:", { transaction, type, settled });

              if (type === "ERROR") {
                console.warn("⚠️ [IDPAY] Fluxo interrompido por erro");
                if (!settled) {
                  settled = true;
                  reject(new Error("IDPAY_ERROR: fluxo interrompido. O usuário pode tentar novamente."));
                }
                return;
              }

              // type === 'FINISH' ou undefined — captura biométrica concluída
              console.log("✅ [IDPAY] Captura biométrica concluída:", { transaction, type });

              if (!settled) {
                // Caminho normal: promise ainda não foi resolvida/rejeitada
                settled = true;
                resolve(transaction);
              } else {
                // onFinish chegou DEPOIS do timeout — promise já rejeitada
                // Chamar onLateFinish para garantir que a autenticação ocorra mesmo assim
                console.warn("⏰ [IDPAY] onFinish tardio recebido após timeout — executando autenticação via onLateFinish");
                onLateFinish?.(transaction);
              }
            },
          } as Parameters<typeof IDPaySDK.open>[0]);
        } catch (error) {
          clearTimeout(timeoutId);
          console.error("❌ [IDPAY] Erro ao abrir iframe:", error);
          if (!settled) {
            settled = true;
            reject(error);
          }
        }
      });
    },
    []
  );

  /** @deprecated Use openIdpayIframe */
  const openIdpayCamera = openIdpayIframe;

  /**
   * Autenticar com IDPAY — envia resultado do SDK para o backend
   * @param transactionId - _id da transação (usado na URL)
   * @param authData - dados retornados pelo onFinish do IDPaySDK
   */
  const authenticateIdpay = useCallback(
    async (transactionId: string, authData: {
      id: string;                // antifraud_id
      concluded: boolean;
      capture_concluded: boolean;
    }) => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/antifraud/idpay/${transactionId}/authenticate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(authData),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao autenticar com IDPAY");
      }

      return response.json();
    },
    []
  );

  /**
   * Carregar configuração do SDK 3DS
   */
  const loadThreeDsSdkConfig = useCallback(async (): Promise<ThreeDsConfig> => {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/paytime/antifraud/threeds/sdk-config`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao obter configuração SDK 3DS");
    }

    return response.json();
  }, []);

  /**
   * Obter cartões de teste 3DS
   */
  const getThreeDsTestCards = useCallback(async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/paytime/antifraud/threeds/test-cards`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao obter cartões de teste 3DS");
    }

    return response.json();
  }, []);

  /**
   * Carregar SDK 3DS (PagBank)
   */
  const loadThreeDsSdk = useCallback(async () => {
    if (threeDsLoaded || window.PagSeguro) {
      console.log("✅ SDK 3DS já carregado");
      return;
    }

    try {
      console.log("🔐 Carregando SDK 3DS...");
      const config = await loadThreeDsSdkConfig();

      if (!config.scriptUrl) {
        console.error("❌ scriptUrl está undefined! Config completa:", config);
        throw new Error("scriptUrl não foi retornado pelo backend");
      }

      // Carregar script do SDK
      const script = document.createElement("script");
      script.src = config.scriptUrl;
      script.async = true;
      script.onload = () => {
        console.log("✅ SDK 3DS carregado com sucesso");
        setThreeDsLoaded(true);
      };
      script.onerror = () => {
        console.error("❌ Erro ao carregar SDK 3DS da URL:", config.scriptUrl);
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error("❌ Erro ao carregar configuração 3DS:", error);
      throw error;
    }
  }, [threeDsLoaded, loadThreeDsSdkConfig]);

  /**
   * Autenticar com 3DS
   */
  const authenticateThreeDs = useCallback(
    async (transactionId: string, authData: {
      authentication_token: string;
      redirect_url?: string;
    }) => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/antifraud/threeds/${transactionId}/authenticate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(authData),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao autenticar com 3DS");
      }

      return response.json();
    },
    []
  );

  /**
   * Carregar configuração ClearSale
   */
  const loadClearSaleConfig = useCallback(async (): Promise<ClearSaleConfig> => {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/paytime/antifraud/script-config`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao obter configuração ClearSale");
    }

    return response.json();
  }, []);

  /**
   * Carregar script ClearSale
   */
  const loadClearSaleScript = useCallback(async () => {
    if (clearSaleLoaded || window.csdm) {
      console.log("✅ Script ClearSale já carregado");
      return;
    }

    try {
      console.log("🔐 Carregando script ClearSale...");
      const config = await loadClearSaleConfig();

      // Carregar script
      const script = document.createElement("script");
      script.src = config.scriptUrl;
      script.async = true;
      script.onload = () => {
        console.log("✅ Script ClearSale carregado com sucesso");
        setClearSaleLoaded(true);
      };
      script.onerror = () => {
        console.error("❌ Erro ao carregar script ClearSale");
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error("❌ Erro ao carregar configuração ClearSale:", error);
      throw error;
    }
  }, [clearSaleLoaded, loadClearSaleConfig]);

  /**
   * Gerar Session ID ClearSale
   */
  const generateSessionId = useCallback(
    async (): Promise<SessionIdResponse> => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/antifraud/session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}), // Body vazio - backend gera automaticamente
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao gerar Session ID");
      }

      const data = await response.json();
      setSessionId(data.sessionId || data.session_id);
      return data;
    },
    []
  );

  /**
   * Verificar status dos SDKs
   */
  const checkSdkStatus = useCallback(() => {
    return {
      idpay: {
        loaded: idpayReady,
        available: idpayReady,
      },
      threeds: {
        loaded: threeDsLoaded || !!window.PagSeguro,
        available: !!window.PagSeguro,
      },
      clearsale: {
        loaded: clearSaleLoaded || !!window.csdm,
        available: !!window.csdm,
        session_id: sessionId,
      },
    };
  }, [idpayReady, threeDsLoaded, clearSaleLoaded, sessionId]);

  return {
    // IDPAY (idpay-b2b-sdk)
    idpayLoaded: idpayReady,
    idpayReady,
    idpaySdkConfig,
    loadIdpaySdk,
    loadIdpaySdkConfig,
    openIdpayIframe,
    openIdpayCamera, // alias deprecated
    authenticateIdpay,

    // 3DS (PagBank)
    threeDsLoaded,
    loadThreeDsSdk,
    loadThreeDsSdkConfig,
    getThreeDsTestCards,
    authenticateThreeDs,

    // ClearSale
    clearSaleLoaded,
    sessionId,
    loadClearSaleScript,
    loadClearSaleConfig,
    generateSessionId,

    // Status
    checkSdkStatus,
  };
}
