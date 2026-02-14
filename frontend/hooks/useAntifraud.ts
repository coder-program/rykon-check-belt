"use client";

import { useState, useCallback } from "react";

declare global {
  interface Window {
    // IDPAY (Unico) SDK
    AcessoBioListener?: unknown;
    AcessoBio?: unknown;
    // 3DS SDK  
    PagSeguro?: unknown;
    // ClearSale
    csdm?: unknown;
  }
}

interface IdpayConfig {
  npmPackage: string;
  environment: string;
  initCode: string;
  openCode: string;
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
  const [idpayLoaded, setIdpayLoaded] = useState(false);
  const [threeDsLoaded, setThreeDsLoaded] = useState(false);
  const [clearSaleLoaded, setClearSaleLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

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
   * Carregar SDK IDPAY (Unico)
   */
  const loadIdpaySdk = useCallback(async () => {
    if (idpayLoaded || window.AcessoBio) {
      console.log("✅ SDK IDPAY já carregado");
      return;
    }

    try {
      console.log("🔐 Carregando SDK IDPAY...");
      const config = await loadIdpaySdkConfig();

      // IDPAY retorna código pronto (initCode/openCode)
      // Não precisa carregar script via URL
      console.log("✅ IDPAY configuração recebida:", config.environment);
      setIdpayLoaded(true);
    } catch (error) {
      console.error("❌ Erro ao carregar configuração IDPAY:", error);
      throw error;
    }
  }, [idpayLoaded, loadIdpaySdkConfig]);

  /**
   * Autenticar com IDPAY
   */
  const authenticateIdpay = useCallback(
    async (transactionId: string, authData: {
      encrypted: string;
      jwt?: string;
      uniqueness_id: string;
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
        console.error("❌ Erro ao carregar SDK 3DS da URL:", config.sdkUrl);
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
        loaded: idpayLoaded || !!window.AcessoBio,
        available: !!window.AcessoBio,
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
  }, [idpayLoaded, threeDsLoaded, clearSaleLoaded, sessionId]);

  return {
    // IDPAY (Unico)
    idpayLoaded,
    loadIdpaySdk,
    loadIdpaySdkConfig,
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
