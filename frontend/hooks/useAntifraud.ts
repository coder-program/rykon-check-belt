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

      // Inicializar SDK — pré-carrega o iframe para experiência mais fluida
      // Só passa env:'uat' se explicitamente configurado como sandbox.
      // Se o rykon-pay removeu o campo ou retorna 'prod'/'production'/null → produção sem env
      const env = config.environment?.toLowerCase() === "uat" ? "uat" : undefined;

      console.log(`🔐 [IDPAY] Ambiente SDK: ${env ?? "produção (sem env)"} (config.environment=${config.environment})`);

      IDPaySDK.init({
        type: "IFRAME",
        ...(env ? { env } : {}),
      } as Parameters<typeof IDPaySDK.init>[0]);

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

      return new Promise((resolve, reject) => {
        let settled = false;
        // eslint-disable-next-line prefer-const
        let timeoutId: ReturnType<typeof setTimeout>;
        let domCheckId: ReturnType<typeof setTimeout> | null = null;
        let observer: MutationObserver | null = null;

        const settle = (fn: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          if (domCheckId) clearTimeout(domCheckId);
          observer?.disconnect();
          fn();
        };

        // Detectar remoção do iframe do IDPAY do DOM.
        // Quando o SDK recebe "Domain not allowed" ele chama "reset iframe"
        // e remove o elemento quase imediatamente (< 3s) SEM chamar onFinish.
        // Usamos MutationObserver para detectar isso rapidamente.
        let iframeInserted = false;

        console.log(`🌐 [IDPAY] Domínio atual (deve estar na whitelist Unico): ${window.location.origin}`);

        observer = new MutationObserver(() => {
          const idpayIframe = document.querySelector<HTMLIFrameElement>('iframe[src*="idpay"], iframe[src*="unico"]');
          if (idpayIframe && !iframeInserted) {
            iframeInserted = true;
            console.log("✅ [IDPAY] Iframe inserido no DOM");

            // Monitorar remoção do iframe (indica "reset iframe" / Domain not allowed)
            const removalObserver = new MutationObserver(() => {
              const stillExists = document.querySelector('iframe[src*="idpay"], iframe[src*="unico"]');
              if (!stillExists && iframeInserted) {
                removalObserver.disconnect();
                // Aguardar brevemente para ver se onFinish chega junto
                setTimeout(() => {
                  settle(() => {
                    console.error("❌ [IDPAY] Iframe removido pelo SDK sem onFinish — 'Domain not allowed' ou token inválido.");
                    console.error("❌ [IDPAY] Origin atual:", window.location.origin);
                    reject(new Error(
                      "IDPAY_DOMAIN_ERROR: O domínio " + window.location.origin +
                      " não está na whitelist do IDPAY. Cadastre este domínio no painel da Unico/IDPAY."
                    ));
                  });
                }, 1500);
              }
            });
            removalObserver.observe(document.body, { childList: true, subtree: true });
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Verificar após 8s se o iframe sequer foi inserido (SDK bloqueado antes de montar)
        domCheckId = setTimeout(() => {
          if (!iframeInserted) {
            settle(() => {
              console.error("❌ [IDPAY] Iframe não foi inserido em 8s — SDK bloqueado. Origin:", window.location.origin);
              reject(new Error(
                "IDPAY_DOMAIN_ERROR: O SDK IDPAY não abriu em 8 segundos. Verifique se o domínio " +
                window.location.origin + " está na whitelist do IDPAY."
              ));
            });
          }
        }, 8000);

        // Timeout máximo de 300s para fluxo via QR code no celular (usuário demora)
        timeoutId = setTimeout(() => {
          settle(() => {
            console.error("❌ [IDPAY] Timeout: onFinish não foi chamado em 300s.");
            reject(new Error("IDPAY_ERROR: timeout — verifique se o domínio está na whitelist do IDPAY. Origin: " + window.location.origin));
          });
        }, 300000);

        try {
          IDPaySDK.open({
            transactionId: antifraudId,
            token: sessionToken,
            onFinish: (transaction: IdpayFinishData, type: string) => {
              if (type === "ERROR") {
                console.warn("⚠️ [IDPAY] Fluxo interrompido por erro");
                settle(() => reject(new Error("IDPAY_ERROR: fluxo interrompido. O usuário pode tentar novamente.")));
                return;
              }

              // type === 'FINISH' ou undefined — captura biométrica concluída
              if (!settled) {
                settle(() => resolve(transaction));
              } else {
                // onFinish chegou DEPOIS do timeout — promise já rejeitada
                // Chamar onLateFinish para garantir que a autenticação ocorra mesmo assim
                console.warn("⏰ [IDPAY] onFinish tardio recebido após timeout — executando autenticação via onLateFinish");
                onLateFinish?.(transaction);
              }
            },
          } as Parameters<typeof IDPaySDK.open>[0]);
        } catch (error) {
          console.error("❌ [IDPAY] Erro ao abrir iframe:", error);
          settle(() => reject(error));
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
