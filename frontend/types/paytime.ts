// Tipos Paytime API

export interface PaytimeGateway {
  id: number;
  name: "PAYTIME" | "PAGSEGURO" | "CELCOIN";
  type: "ACQUIRER" | "BANKING";
  created_at: string;
  updated_at: string;
}

export interface PaytimeGatewaysResponse {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  data: PaytimeGateway[];
}

export interface PaytimeEstablishment {
  id: number;
  type: "INDIVIDUAL" | "BUSINESS";
  status:
    | "PENDING"
    | "VALIDATION"
    | "RISK_ANALYSIS"
    | "APPROVED"
    | "DISAPPROVED"
    | "DISCREDITED"
    | "BACKGROUND_CHECK";
  risk: "LOW" | "MEDIUM" | "HIGH";
  access_type: "ACQUIRER";
  document: string;
  email: string;
  first_name: string;
  last_name?: string;
  phone_number: string;
  cnae?: string;
  format?: string;
  birthdate?: string;
  revenue?: number;
  gmv?: number;
  notes?: string;
  visited: boolean;
  address: {
    zip_code: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    number: string;
    complement?: string;
  };
  responsible?: {
    email: string;
    document: string;
    first_name: string;
    phone: string;
    birthdate: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PaytimeEstablishmentsResponse {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  data: PaytimeEstablishment[];
}

export interface PaytimeFilters {
  status?: string;
  type?: string;
  risk?: string;
  [key: string]: any;
}

export interface PaytimeSorter {
  column: string;
  direction: "ASC" | "DESC";
}

// Mapeamentos úteis
export const GATEWAY_NAMES: Record<number, string> = {
  2: "PAGSEGURO",
  4: "PAYTIME",
  6: "CELCOIN",
};

export const GATEWAY_DESCRIPTIONS: Record<number, string> = {
  2: "Integração com PagSeguro para processamento de pagamentos",
  4: "SubPaytime - Plataforma de subadquirência com split de pagamentos",
  6: "Banking Paytime - Serviços bancários, transferências e P2P",
};

export const GATEWAY_TYPES: Record<string, string> = {
  ACQUIRER: "Adquirente",
  BANKING: "Bancário",
};

export const ESTABLISHMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  VALIDATION: "Em Validação",
  RISK_ANALYSIS: "Análise de Risco",
  APPROVED: "Aprovado",
  DISAPPROVED: "Reprovado",
  DISCREDITED: "Desacreditado",
  BACKGROUND_CHECK: "Verificação de Antecedentes",
};

export const ESTABLISHMENT_STATUS_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  PENDING: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  VALIDATION: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  RISK_ANALYSIS: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  APPROVED: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  DISAPPROVED: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  DISCREDITED: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  },
  BACKGROUND_CHECK: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
};
