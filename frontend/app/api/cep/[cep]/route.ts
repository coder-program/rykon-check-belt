import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { cep: string } }
) {
  try {
    const { cep } = params;

    // Validar formato do CEP (apenas números, 8 dígitos)
    const cepNumeros = cep.replace(/\D/g, "");

    if (cepNumeros.length !== 8) {
      return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
    }

    // Fazer requisição para ViaCEP
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

    if (!response.ok) {
      throw new Error(`ViaCEP retornou status ${response.status}`);
    }

    const data = await response.json();
    // ViaCEP retorna {erro: true} quando CEP não existe
    if (data.erro) {
      return NextResponse.json(
        { error: "CEP não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [API CEP] Erro ao buscar CEP:", error);

    return NextResponse.json(
      { error: "Erro ao buscar CEP. Tente novamente." },
      { status: 500 }
    );
  }
}
