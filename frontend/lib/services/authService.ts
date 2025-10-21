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
    console.log("🌐 [authService.validateToken] Chamando /auth/profile...");
    // backend valida via guard, apenas chama o profile
    const user = await http("/auth/profile", { auth: true });
    console.log(
      "📥 [authService.validateToken] Resposta:",
      JSON.stringify(user, null, 2)
    );
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
    console.log("🌐 [authService.completeProfile] Enviando para API...");
    console.log(
      "📤 [authService.completeProfile] profileData:",
      JSON.stringify(profileData, null, 2)
    );

    const data = await http("/auth/complete-profile", {
      method: "POST",
      body: profileData,
      auth: true,
    });

    console.log(
      "📥 [authService.completeProfile] Resposta da API:",
      JSON.stringify(data, null, 2)
    );
    return data;
  },
};
