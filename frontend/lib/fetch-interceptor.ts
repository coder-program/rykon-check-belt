/**
 * Interceptor global de fetch — injeta X-Tenant-ID automaticamente em todas
 * as chamadas ao backend (NEXT_PUBLIC_API_URL).
 * Instalado uma única vez no layout raiz via setupFetchInterceptor().
 */

function getTenantSlugFromCookie(): string {
  if (typeof document === "undefined") return "teamcruz";
  const match = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("tenant-slug="));
  return match?.split("=")[1]?.toLowerCase().trim() || "teamcruz";
}

let installed = false;

export function setupFetchInterceptor(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  const originalFetch = window.fetch.bind(window);

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const url =
      input instanceof Request
        ? input.url
        : typeof input === "string"
        ? input
        : input.toString();

    // Injetar header apenas em chamadas ao backend API
    if (url.startsWith(apiBase) || url.includes("/api/")) {
      const tenantSlug = getTenantSlugFromCookie();
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );

      // Nunca sobrescreve se já estiver presente
      if (!headers.has("X-Tenant-ID")) {
        headers.set("X-Tenant-ID", tenantSlug);
      }

      if (input instanceof Request) {
        const newRequest = new Request(input, { ...init, headers });
        return originalFetch(newRequest);
      }

      return originalFetch(input, { ...init, headers });
    }

    return originalFetch(input, init);
  };
}
