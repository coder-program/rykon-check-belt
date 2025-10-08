"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity, // NUNCA considera dados como stale
            gcTime: Infinity, // NUNCA remove do cache
            refetchOnWindowFocus: false, // NUNCA refaz request ao focar
            refetchOnMount: false, // NUNCA refaz request ao montar
            refetchOnReconnect: false, // NUNCA refaz request ao reconectar
            refetchInterval: false, // NUNCA refaz request por intervalo
            refetchIntervalInBackground: false, // NUNCA refaz em background
            retry: 0, // NUNCA tenta novamente em caso de erro
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
