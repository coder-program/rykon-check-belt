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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  // Sempre tenta adicionar o token se ele existir (exceto se opts.auth === false)
  if (opts.auth !== false) {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (!token && opts.auth === true) {
        // Se auth foi explicitamente requerido mas não tem token, lança erro
        throw new Error("No auth token");
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
  }

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
