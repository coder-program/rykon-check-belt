import { http } from "@/lib/api";

export const authService = {
  async login(email: string, password: string) {
    const data = await http("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    // Se o login foi bem-sucedido e temos um token
    if (typeof window !== "undefined" && data?.access_token) {
      // Salva o token imediatamente
      localStorage.setItem("token", data.access_token);

      try {
        // Agora busca o perfil com o token já salvo
        const user = await http("/auth/profile", { auth: true });
        return { ...data, user };
      } catch (error) {
        console.error("Erro ao buscar perfil após login:", error);
        // Se falhar ao buscar o perfil, ainda retorna os dados do login
        // O backend já retorna o user básico no login
        return data;
      }
    }
    return data;
  },

  async validateToken(_token: string) {
    // backend valida via guard, apenas chama o profile
    const user = await http("/auth/profile", { auth: true });
    return user;
  },

  async register(userData: {
    nome: string;
    email: string;
    password: string;
    cpf: string;
    telefone: string;
    data_nascimento: string;
    perfil_id?: string;
  }) {
    const data = await http("/auth/register", {
      method: "POST",
      body: userData,
    });
    return data;
  },
};
