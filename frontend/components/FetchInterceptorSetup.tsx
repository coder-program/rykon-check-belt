"use client";

import { useEffect } from "react";
import { setupFetchInterceptor } from "@/lib/fetch-interceptor";

/**
 * Componente sem UI que instala o fetch interceptor no lado do cliente.
 * Incluído no layout raiz para garantir que rode antes de qualquer fetch.
 */
export function FetchInterceptorSetup() {
  useEffect(() => {
    setupFetchInterceptor();
  }, []);

  return null;
}
