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
    let data: any = {};

    try {
      data = await res.json();
      message = data?.message || message;
    } catch (e) {
      // Se não conseguir parsear o JSON, usa a mensagem padrão
    }

    // Tratamento especial para erro 401 (Não Autorizado)
    if (res.status === 401) {
      // Se o token expirou ou é inválido
      if (typeof window !== "undefined") {
        const isTokenExpired =
          data?.message?.toLowerCase().includes("expired") ||
          data?.message?.toLowerCase().includes("unauthorized") ||
          data?.message?.toLowerCase().includes("invalid token");

        if (isTokenExpired && window.location.pathname !== "/login") {
          console.warn("⚠️ Token expirado! Fazendo logout automático...");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login?expired=true";
          throw new Error(
            "Sua sessão expirou. Por favor, faça login novamente."
          );
        }
      }

      // Se for erro de login (credenciais inválidas)
      if (data?.message?.toLowerCase().includes("senha incorreta")) {
        throw new Error(
          "❌ Senha incorreta. Verifique sua senha e tente novamente."
        );
      }
      if (
        data?.message
          ?.toLowerCase()
          .includes("email ou username não encontrado") ||
        data?.message?.toLowerCase().includes("usuário não encontrado")
      ) {
        throw new Error(
          "❌ Usuário não encontrado. Verifique seu email/username."
        );
      }
      if (
        data?.message?.toLowerCase().includes("conta está inativa") ||
        data?.message?.toLowerCase().includes("sua conta está inativa")
      ) {
        throw new Error(
          "⚠️ Sua conta está inativa. Entre em contato com o administrador."
        );
      }

      // Mensagem genérica para outros casos de 401
      throw new Error(message || "❌ Email/username ou senha incorretos.");
    }

    // Outros erros HTTP
    throw new Error(message);
  }

  // tenta json, se falhar retorna texto
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text as string;
  }
}
