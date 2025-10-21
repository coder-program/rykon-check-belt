import { config } from "./config";

export const API_BASE_URL = config.apiUrl;

type HttpOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string;
  auth?: boolean; // inclui Authorization automaticamente
};

export async function http(path: string, opts: HttpOptions = {}) {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : "/" + path}`;
  console.log(
    "API Call - Path:",
    path,
    "Full URL:",
    url,
    "Base URL:",
    API_BASE_URL
  );
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  // Sempre tenta adicionar o token se ele existir (exceto se opts.auth === false)
  if (opts.auth !== false) {
    console.log(
      "🌍 Ambiente:",
      typeof window !== "undefined" ? "BROWSER" : "SERVER (SSR)"
    );
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      console.log(
        "🔑 Token do localStorage:",
        token ? token.substring(0, 50) + "..." : "NENHUM TOKEN"
      );
      if (!token && opts.auth === true) {
        // Se auth foi explicitamente requerido mas não tem token, lança erro
        throw new Error("No auth token");
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("✅ Authorization header adicionado");
      }
    } else {
      console.log("⚠️ Rodando no servidor - token não disponível");
    }
  }

  console.log(
    "📋 Headers finais sendo enviados:",
    JSON.stringify(headers, null, 2)
  );

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body:
      typeof opts.body === "string"
        ? opts.body
        : opts.body
        ? JSON.stringify(opts.body)
        : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data?.message || message;
      throw new Error(message);
    } catch (e) {
      throw new Error(message);
    }
  }

  // tenta json, se falhar retorna texto
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text as string;
  }
}
