import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { cep: string } }
) {
  try {
    const { cep } = params;
    console.log("🔍 [API CEP] Recebido CEP:", cep);

    // Validar formato do CEP (apenas números, 8 dígitos)
    const cepNumeros = cep.replace(/\D/g, "");
    console.log("🔍 [API CEP] CEP formatado:", cepNumeros);

    if (cepNumeros.length !== 8) {
      console.log("❌ [API CEP] CEP inválido - tamanho:", cepNumeros.length);
      return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
    }

    // Fazer requisição para ViaCEP
    console.log("📡 [API CEP] Chamando ViaCEP...");
    const response = await fetch(
      `https://viacep.com.br/ws/${cepNumeros}/json/`,
      {
        headers: {
          Accept: "application/json",
        },
        // Timeout de 5 segundos
        signal: AbortSignal.timeout(5000),
      }
    );

    console.log("📡 [API CEP] Status da resposta:", response.status);

    if (!response.ok) {
      throw new Error(`ViaCEP retornou status ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ [API CEP] Dados recebidos:", data);

    // ViaCEP retorna {erro: true} quando CEP não existe
    if (data.erro) {
      console.log("❌ [API CEP] CEP não encontrado");
      return NextResponse.json(
        { error: "CEP não encontrado" },
        { status: 404 }
      );
    }

    console.log("✅ [API CEP] Retornando dados com sucesso");
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [API CEP] Erro ao buscar CEP:", error);

    return NextResponse.json(
      { error: "Erro ao buscar CEP. Tente novamente." },
      { status: 500 }
    );
  }
}
