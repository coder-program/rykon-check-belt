flowchart TD
    A[Cliente/Responsável] --> B[Frontend: Página Mensalidades]
    C[Admin Sistema] --> D[Frontend: Admin Transações]
    
    B --> E[POST /api/paytime/transactions]
    D --> F[GET /api/paytime/transactions]
    
    E --> G[PaytimeService Backend]
    F --> G
    
    G --> H[rykon-pay Middleware]
    G --> I[(PostgreSQL)]
    
    H --> J[POST /paytime/boletos]
    H --> K[POST /paytime/pix]
    H --> L[POST /paytime/cartao]
    H --> M[GET /paytime/plans]
    
    J --> N[Paytime API]
    K --> N
    L --> N
    M --> N
    
    N -.Webhook.-> O[POST /paytime/webhooks]
    O --> G
    G --> I
    
    style O fill:#ff9999
    style N fill:#99ccff
    style H fill:#ffcc99
    style G fill:#99ff99
    style I fill:#ffff99





sequenceDiagram
    participant P as Paytime API
    participant W as /paytime/webhooks<br/>(Público)
    participant S as PaytimeWebhookService
    participant DB as PostgreSQL
    participant A as Admin/Frontend

    Note over P,DB: EVENTO 1: Boleto Pago

    P->>W: POST webhook<br/>event: updated-billet-status<br/>status: PAID
    activate W
    W->>W: Log evento recebido
    W->>S: processarWebhookBoleto()
    activate S
    S->>S: Valida dados do boleto
    S->>DB: UPDATE transacoes<br/>SET status = 'PAID'
    DB-->>S: Transação atualizada
    S->>DB: INSERT historico_status
    S-->>W: {success: true, message: "Boleto atualizado"}
    deactivate S
    W-->>P: 200 OK
    deactivate W

    Note over P,A: EVENTO 2: Transação PIX Aprovada

    P->>W: POST webhook<br/>event: updated-sub-transaction<br/>status: APPROVED
    activate W
    W->>S: processarWebhookTransacao()
    activate S
    S->>DB: SELECT transacao<br/>WHERE paytime_transaction_id = ?
    DB-->>S: Transação encontrada
    S->>DB: UPDATE status = 'PAID'<br/>UPDATE paid_at = NOW()
    DB-->>S: Atualizado
    S->>S: Log detalhado processamento
    S-->>W: {success: true, transacao_id}
    deactivate S
    W-->>P: 200 OK
    deactivate W

    Note over A,DB: EVENTO 3: Admin Consulta Status

    A->>DB: GET /api/paytime/transactions<br/>?establishment_id=156655
    activate DB
    DB-->>A: Lista transações atualizadas<br/>(Status: PAID visible)
    deactivate DB

    Note over P,DB: EVENTO 4: Cartão Negado

    P->>W: POST webhook<br/>event: updated-sub-transaction<br/>status: DENIED
    activate W
    W->>S: processarWebhookTransacao()
    activate S
    S->>DB: UPDATE status = 'FAILED'
    S-->>W: {success: true}
    deactivate S
    W-->>P: 200 OK
    deactivate W

graph LR
    subgraph "Cliente"
        A[Navegador Web]
    end

    subgraph "rykon-check-belt<br/>(TeamCruz Backend)"
        B[JWT Auth Guard]
        C[Endpoints Protegidos<br/>/api/paytime/*]
        D[Webhook Endpoint<br/>/paytime/webhooks<br/>🔓 Público]
        E[PaytimeService]
    end

    subgraph "rykon-pay<br/>(Middleware Proxy)"
        F[Basic Auth]
        G[Proxy Service]
        H[Secrets Manager<br/>PAYTIME_USER<br/>PAYTIME_PASSWORD]
    end

    subgraph "Paytime API Externa"
        I[API Gateway]
        J[Endpoints Paytime]
    end

    A -->|1. JWT Token| B
    B -->|2. Valida Token| C
    C -->|3. Request| E
    E -->|4. HTTP Request<br/>Authorization: Basic| F
    F -->|5. Valida Basic Auth| G
    G -->|6. Carrega Secrets| H
    H -->|7. Credenciais Paytime| G
    G -->|8. Request Autenticado| I
    I -->|9. Processa| J
    J -->|10. Response| I
    I -->|11. Response| G
    G -->|12. Response| E
    E -->|13. Response| C
    C -->|14. JSON Response| A

    I -.->|Webhook Assíncrono| D
    D -->|Sem Auth JWT| E

    style B fill:#ff9999
    style F fill:#ffcc99
    style D fill:#ff9999,stroke:#ff0000,stroke-width:3px
    style H fill:#99ccff




graph LR
    START([Transação Criada]) --> PENDING[PENDING<br/>Aguardando Pagamento]
    
    PENDING -->|Pagamento OK| PAID[PAID<br/>Pago e Confirmado]
    PENDING -->|Falha/Expirado| FAILED[FAILED<br/>Não Pago]
    PENDING -->|Estorno Antes| REFUNDED[REFUNDED<br/>Estornado]
    
    PAID -->|Estorno Depois| REFUNDED
    PAID -->|Contestação| DISPUTED[DISPUTED<br/>Em Disputa]
    
    DISPUTED -->|Resolve a Favor| PAID
    DISPUTED -->|Resolve Contra| REFUNDED
    
    FAILED --> END1([Fim])
    REFUNDED --> END2([Fim])
    
    style PENDING fill:#fff3cd
    style PAID fill:#d4edda
    style FAILED fill:#f8d7da
    style REFUNDED fill:#d1ecf1
    style DISPUTED fill:#fff3cd



sequenceDiagram
    actor R as Responsável
    participant F as Frontend<br/>Mensalidades
    participant API as /api/paytime/transactions
    participant S as PaytimeService
    participant DB as PostgreSQL
    participant RP as rykon-pay<br/>/paytime/cartao
    participant PT as Paytime API
    participant W as Webhook

    R->>F: 1. Clica "Pagar Mensalidade"
    F->>F: 2. Modal pagamento abre
    R->>F: 3. Seleciona "Cartão de Crédito"
    R->>F: 4. Preenche dados do cartão<br/>(número, CVV, validade)
    
    F->>F: 5. Valida campos localmente
    F->>API: 6. POST /transactions<br/>{type: "CREDIT_CARD", card_data}
    
    activate API
    API->>S: 7. createTransaction()
    activate S
    
    S->>DB: 8. INSERT INTO transacoes<br/>status: PENDING
    DB-->>S: 9. transaction_id
    
    S->>RP: 10. POST /paytime/cartao<br/>{card_number, cvv, holder_name,<br/>expiry_date, amount, plan_id}
    activate RP
    
    RP->>RP: 11. Valida Basic Auth
    RP->>PT: 12. POST /credit-card/charge<br/>Authorization: Bearer [token]
    activate PT
    
    PT->>PT: 13. Processa com operadora
    
    alt Cartão Aprovado
        PT-->>RP: 14. {status: "APPROVED",<br/>transaction_id, auth_code}
        RP-->>S: 15. Dados da aprovação
        S->>DB: 16. UPDATE status = 'PAID'<br/>paytime_transaction_id<br/>paid_at = NOW()
        S-->>API: 17. {success: true, status: PAID}
        API-->>F: 18. Pagamento aprovado
        F->>F: 19. Exibe sucesso ✅
        F-->>R: 20. "Pagamento aprovado!"
    else Cartão Negado
        PT-->>RP: 14. {status: "DENIED",<br/>reason: "Insufficient funds"}
        RP-->>S: 15. Erro de pagamento
        S->>DB: 16. UPDATE status = 'FAILED'
        S-->>API: 17. {success: false, error}
        API-->>F: 18. Erro no pagamento
        F-->>R: 19. "Cartão recusado ❌"
    end
    
    deactivate PT
    deactivate RP
    deactivate S
    deactivate API

    Note over PT,W: Webhook Assíncrono (alguns segundos depois)
    
    PT->>W: 21. POST /paytime/webhooks<br/>event: updated-sub-transaction
    W->>DB: 22. Confirma status final
