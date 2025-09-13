export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api";

type HttpOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
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
    API_BASE_URL,
  );
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  if (opts.auth) {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    // tentativa automática de refresh quando 401
    if (res.status === 401) {
      try {
        // API_BASE_URL já tem /api, então a URL fica: /api/auth/refresh-cookie
        await fetch(
          `${API_BASE_URL.replace("/api", "")}/api/auth/refresh-cookie`,
          {
            method: "POST",
            credentials: "include",
          },
        );
        const retry = await fetch(url, {
          method: opts.method || "GET",
          headers,
          body: opts.body ? JSON.stringify(opts.body) : undefined,
          credentials: "include",
        });
        if (!retry.ok) throw new Error(`HTTP ${retry.status}`);
        const rt = await retry.text();
        try {
          return JSON.parse(rt);
        } catch {
          return rt as any;
        }
      } catch (e) {
        // segue para erro normal
      }
    }
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
    return text as any;
  }
}
