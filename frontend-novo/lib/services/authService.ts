import { http } from "@/lib/api";

export const authService = {
  async login(email: string, password: string) {
    const data = await http("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    // após login, buscar o perfil para ter dados completos do usuário
    if (typeof window !== "undefined" && data?.access_token) {
      localStorage.setItem("token", data.access_token);
      const user = await http("/auth/profile", { auth: true });
      return { ...data, user };
    }
    return data;
  },

  async validateToken(_token: string) {
    // backend valida via guard, apenas chama o profile
    const user = await http("/auth/profile", { auth: true });
    return user;
  },
};
