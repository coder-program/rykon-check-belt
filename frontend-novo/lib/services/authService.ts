export const authService = {
  async login(email: string, password: string) {
    if (email === 'admin@gestao.gov.br' && password === 'admin123') {
      const mockResponse = {
        access_token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: 1,
          name: 'Administrador',
          email: 'admin@gestao.gov.br',
          role: 'admin',
          permissions: ['all']
        }
      };
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockResponse;
    }
    throw new Error('Credenciais inválidas');
  },

  async validateToken(token: string) {
    if (token.startsWith('mock-jwt-token-')) {
      return {
        id: 1,
        name: 'Administrador',
        email: 'admin@gestao.gov.br',
        role: 'admin',
        permissions: ['all']
      };
    }
    throw new Error('Token inválido');
  },
};

