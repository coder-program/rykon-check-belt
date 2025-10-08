import { http } from "@/lib/api";

export const authService = {
  async login(email: string, password: string) {
    const data = await http("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    // O backend já retorna todos os dados do usuário no login
    // incluindo access_token e user com cadastro_completo
    if (typeof window !== "undefined" && data?.access_token) {
      localStorage.setItem("token", data.access_token);
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

  async getMe() {
    const data = await http("/auth/me", { auth: true });
    return data;
  },

  async completeProfile(profileData: any) {
    const data = await http("/auth/complete-profile", {
      method: "POST",
      body: profileData,
      auth: true,
    });
    return data;
  },
};
