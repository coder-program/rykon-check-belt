export const ENV = {
  PRODUCTION: process.env.NODE_ENV === "production",
  DEV: process.env.NODE_ENV === "development",
};

const getApiUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL não está definida! " +
        "Defina esta variável de ambiente no arquivo .env.local para desenvolvimento " +
        "ou nas configurações do Cloud Run para produção."
    );
  }
  return apiUrl;
};

export const config = {
  apiUrl: getApiUrl(),
  region: "southamerica-east1",
  projectId: "teamcruz-controle-alunos",
} as const;
