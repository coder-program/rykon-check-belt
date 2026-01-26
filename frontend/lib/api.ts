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
    let data: { message?: string; error?: string } = {};

    try {
      data = await res.json();
      // Capturar a mensagem do backend (pode estar em message ou error)
      message = data?.message || data?.error || message;
    } catch (e) {
      // Se não conseguir parsear o JSON, usa a mensagem padrão
      console.error("Erro ao parsear resposta JSON:", e);
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

      // Se for erro de login - verificar diferentes mensagens
      const msgLower = (data?.message || message).toLowerCase();

      // Conta inativa
      if (
        msgLower.includes("conta está inativa") ||
        msgLower.includes("sua conta está inativa") ||
        msgLower.includes("usuário inativo") ||
        msgLower.includes("usuário está inativo") ||
        msgLower.includes("entre em contato com o administrador")
      ) {
        throw new Error(
          "⚠️ Usuário inativo – agora é só aguardar. A gestão da sua unidade irá aprovar seu acesso em breve."
        );
      }

      // Senha incorreta
      if (msgLower.includes("senha incorreta")) {
        throw new Error(
          " Senha incorreta. Verifique sua senha e tente novamente."
        );
      }

      // Usuário não encontrado ou senha incorreta
      if (
        msgLower.includes("email ou username não encontrado") ||
        msgLower.includes("usuário não encontrado") ||
        msgLower.includes("email não encontrado")
      ) {
        throw new Error(
          " Email/username ou senha incorretos. Verifique suas credenciais e tente novamente."
        );
      }

      // Mensagem genérica para outros casos de 401
      throw new Error(message || " Email/username ou senha incorretos.");
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
