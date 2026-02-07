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

export interface PaytimePlan {
  id: number;
  name: string;
  gateway_id: number;
  active: boolean;
  type: "COMMERCIAL" | "CUSTOM";
  modality: "ONLINE" | "PRESENCIAL" | "AMBOS";
  created_at: string;
  updated_at: string;
}

export interface PaytimePlansResponse {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  data: PaytimePlan[];
}

// Mapeamentos para Planos
export const PLAN_TYPE_LABELS: Record<string, string> = {
  COMMERCIAL: "Comercial",
  CUSTOM: "Personalizado",
};

export const PLAN_MODALITY_LABELS: Record<string, string> = {
  ONLINE: "Online",
  PRESENCIAL: "Presencial",
  AMBOS: "Ambos",
};

export const PLAN_MODALITY_COLORS: Record<string, { bg: string; text: string }> = {
  ONLINE: {
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  PRESENCIAL: {
    bg: "bg-green-50",
    text: "text-green-700",
  },
  AMBOS: {
    bg: "bg-purple-50",
    text: "text-purple-700",
  },
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

// Gateway Configuration
export interface PaytimeGatewayConfig {
  id: number;
  gateway: {
    id: number;
    name: string;
  };
  status: "PENDING" | "APPROVED" | "DISAPPROVED";
  active: boolean;
  reference_id?: string;
  form_receipt?: string;
  statement_descriptor?: string;
  fees_banking_id?: number;
  metadata?: {
    url_documents_copy?: string;
    email?: string;
    token?: string;
  };
  plans?: Array<{
    id: number;
    active: boolean;
  }>;
  created_at: string;
  updated_at: string;
}

export interface PaytimeGatewayConfigsResponse {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  data: PaytimeGatewayConfig[];
}

export interface ActivateGatewayRequest {
  reference_id: string;
  gateway_id: number;
  active: boolean;
  form_receipt: string;
  fees_banking_id?: number; // Banking (gateway 6)
  statement_descriptor?: string; // SubPaytime (gateway 4)
  plans?: Array<{
    id: number;
    active: boolean;
  }>; // SubPaytime (gateway 4)
}

export const GATEWAY_CONFIG_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  DISAPPROVED: "Reprovado",
};

export const GATEWAY_CONFIG_STATUS_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  PENDING: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
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
};

// Transactions
export interface PaytimeTransaction {
  id: string;
  status:
    | "PENDING"
    | "PAID"
    | "FAILED"
    | "REFUNDED"
    | "CANCELED"
    | "EXPIRED";
  payment_type?: "PIX" | "CREDIT" | "DEBIT" | "BILLET";
  amount: number;
  installments?: number;
  customer: {
    first_name: string;
    last_name: string;
    document: string;
    email: string;
    phone?: string;
  };
  pix?: {
    qr_code: string;
    qr_code_url: string;
    expires_at: string;
  };
  card?: {
    brand: string;
    last4_digits: string;
  };
  billet?: {
    barcode: string;
    digitable_line: string;
    pdf_url: string;
    due_date: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PaytimeTransactionsResponse {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  data: PaytimeTransaction[];
}

export interface CreatePixTransactionRequest {
  amount: number;
  customer: {
    first_name: string;
    last_name: string;
    document: string;
    email: string;
  };
  expires_in: number;
}

export interface CreateCardTransactionRequest {
  payment_type: "CREDIT" | "DEBIT";
  amount: number;
  installments: number;
  interest: "ESTABLISHMENT" | "CUSTOMER";
  customer: {
    first_name: string;
    last_name: string;
    document: string;
    email: string;
    phone: string;
  };
  card: {
    number: string;
    holder_name: string;
    expiration_month: string;
    expiration_year: string;
    cvv: string;
  };
  billing_address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
    complement?: string;
  };
}

export interface CreateBilletTransactionRequest {
  amount: number;
  customer: {
    first_name: string;
    last_name: string;
    document: string;
    email: string;
  };
  due_date: string;
}

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
  CANCELED: "Cancelado",
  EXPIRED: "Expirado",
};

export const TRANSACTION_STATUS_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  PENDING: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  PAID: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  FAILED: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  REFUNDED: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  CANCELED: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  },
  EXPIRED: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  PIX: "PIX",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  BILLET: "Boleto",
};

export const PAYMENT_TYPE_ICONS: Record<string, string> = {
  PIX: "💰",
  CREDIT: "💳",
  DEBIT: "💳",
  BILLET: "📄",
};
