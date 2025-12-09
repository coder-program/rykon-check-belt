"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { conviteApi, CompletarCadastroDto } from "@/lib/conviteApi";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FAIXAS_ALUNO = [
  "BRANCA",
  "CINZA_BRANCA",
  "CINZA",
  "CINZA_PRETA",
  "AMARELA_BRANCA",
  "AMARELA",
  "AMARELA_PRETA",
  "LARANJA_BRANCA",
  "LARANJA",
  "LARANJA_PRETA",
  "VERDE_BRANCA",
  "VERDE",
  "VERDE_PRETA",
  "AZUL",
  "ROXA",
  "MARROM",
  "PRETA",
];

export default function CadastroPublicoPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [validando, setValidando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [dadosPreCadastro, setDadosPreCadastro] = useState<{
    tipo_cadastro: string;
    nome_pre_cadastro?: string;
    email?: string;
    telefone?: string;
    cpf?: string;
  } | null>(null);

  const [formData, setFormData] = useState<CompletarCadastroDto>({
    token: token,
    nome_completo: "",
    cpf: "",
    email: "",
    telefone: "",
    data_nascimento: "",
    genero: undefined,
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    senha: "",
    faixa_atual: "",
    grau_atual: "0",
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_telefone: "",
  });

  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const validarToken = async () => {
    try {
      const response = await conviteApi.validarToken(token);

      if (response.valido && response.convite) {
        setTokenValido(true);
        setDadosPreCadastro(response.convite);

        // Pré-preencher formulário com dados do convite
        setFormData((prev) => ({
          ...prev,
          nome_completo: response.convite?.nome_pre_cadastro || "",
          email: response.convite?.email || "",
          telefone: response.convite?.telefone || "",
          cpf: response.convite?.cpf || "",
        }));
      } else {
        setTokenValido(false);
        setMensagemErro(response.mensagem || "Token inválido");
      }
    } catch (error) {
      setTokenValido(false);
      setMensagemErro(
        error instanceof Error ? error.message : "Erro ao validar convite"
      );
    } finally {
      setValidando(false);
    }
  };

  useEffect(() => {
    validarToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );
      const data = await response.json();

      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const calcularIdade = (dataNascimento: string): number => {
    if (!dataNascimento) return 0;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();

    if (
      mesAtual < mesNascimento ||
      (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
    ) {
      idade--;
    }

    return idade;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.nome_completo || !formData.cpf || !formData.data_nascimento) {
      alert("Preencha os campos obrigatórios: Nome, CPF e Data de Nascimento");
      return;
    }

    const idade = calcularIdade(formData.data_nascimento);
    const precisaSenha =
      dadosPreCadastro?.tipo_cadastro === "RESPONSAVEL" || idade >= 18;
    const isMenor = idade < 18 && dadosPreCadastro?.tipo_cadastro === "ALUNO";

    if (precisaSenha) {
      if (!formData.senha) {
        alert("Senha é obrigatória para maiores de 18 anos e responsáveis");
        return;
      }
      if (formData.senha.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres");
        return;
      }
      if (formData.senha !== confirmarSenha) {
        alert("As senhas não coincidem");
        return;
      }
    }

    if (isMenor && !formData.responsavel_nome) {
      alert("Dados do responsável são obrigatórios para menores de 18 anos");
      return;
    }

    setEnviando(true);

    try {
      await conviteApi.completarCadastro({
        ...formData,
        senha: precisaSenha ? formData.senha : undefined,
      });

      setSucesso(true);

      // Redirecionar após 3 segundos
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao completar cadastro"
      );
    } finally {
      setEnviando(false);
    }
  };

  if (validando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Validando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Convite Inválido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{mensagemErro}</p>
            <p className="text-sm text-gray-600 mb-4">
              Este link pode ter expirado, já foi utilizado, ou não é válido.
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              Ir para página inicial
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <CardTitle>Cadastro Concluído!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Seu cadastro foi completado com sucesso!
            </p>
            <p className="text-sm text-gray-600">
              Você será redirecionado para a página de login em alguns
              segundos...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const idade = calcularIdade(formData.data_nascimento);
  const precisaSenha =
    dadosPreCadastro?.tipo_cadastro === "RESPONSAVEL" || idade >= 18;
  const isMenor = idade < 18 && dadosPreCadastro?.tipo_cadastro === "ALUNO";

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 md:py-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">
              Complete seu Cadastro
            </CardTitle>
            <CardDescription>
              Tipo: <strong>{dadosPreCadastro?.tipo_cadastro}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base md:text-lg border-b pb-2">
                  Dados Pessoais
                </h3>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.nome_completo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nome_completo: e.target.value,
                      })
                    }
                    className="text-base"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      CPF <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) =>
                        setFormData({ ...formData, cpf: e.target.value })
                      }
                      placeholder="000.000.000-00"
                      className="text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Data de Nascimento <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          data_nascimento: e.target.value,
                        })
                      }
                      className="text-base"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@exemplo.com"
                      className="text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Telefone
                    </label>
                    <Input
                      type="tel"
                      value={formData.telefone || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, telefone: e.target.value })
                      }
                      placeholder="(11) 99999-9999"
                      className="text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Gênero
                  </label>
                  <select
                    value={formData.genero || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        genero: e.target.value as any,
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-base"
                  >
                    <option value="">Selecione...</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
              </div>

              {/* Faixa Atual (se for aluno) */}
              {dadosPreCadastro?.tipo_cadastro === "ALUNO" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-base md:text-lg border-b pb-2">
                    Informações de Graduação
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Faixa Atual
                      </label>
                      <select
                        value={formData.faixa_atual || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            faixa_atual: e.target.value,
                          })
                        }
                        className="w-full border rounded px-3 py-2 text-base"
                      >
                        <option value="">Selecione...</option>
                        {FAIXAS_ALUNO.map((faixa) => (
                          <option key={faixa} value={faixa}>
                            {faixa.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Graus
                      </label>
                      <select
                        value={formData.grau_atual || "0"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            grau_atual: e.target.value,
                          })
                        }
                        className="w-full border rounded px-3 py-2 text-base"
                      >
                        {[0, 1, 2, 3, 4].map((grau) => (
                          <option key={grau} value={grau}>
                            {grau} {grau === 1 ? "Grau" : "Graus"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base md:text-lg border-b pb-2">
                  Endereço
                </h3>

                <div>
                  <label className="block text-sm font-medium mb-1">CEP</label>
                  <Input
                    type="text"
                    value={formData.cep || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, cep: e.target.value });
                      if (e.target.value.replace(/\D/g, "").length === 8) {
                        buscarCep(e.target.value);
                      }
                    }}
                    placeholder="00000-000"
                    className="text-base"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Logradouro
                    </label>
                    <Input
                      type="text"
                      value={formData.logradouro || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, logradouro: e.target.value })
                      }
                      className="text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Número
                    </label>
                    <Input
                      type="text"
                      value={formData.numero || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, numero: e.target.value })
                      }
                      className="text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Complemento
                    </label>
                    <Input
                      type="text"
                      value={formData.complemento || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          complemento: e.target.value,
                        })
                      }
                      className="text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Bairro
                    </label>
                    <Input
                      type="text"
                      value={formData.bairro || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, bairro: e.target.value })
                      }
                      className="text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Cidade
                    </label>
                    <Input
                      type="text"
                      value={formData.cidade || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, cidade: e.target.value })
                      }
                      className="text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Estado
                    </label>
                    <Input
                      type="text"
                      value={formData.estado || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, estado: e.target.value })
                      }
                      maxLength={2}
                      placeholder="SP"
                      className="text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Responsável (se menor de 18) */}
              {isMenor && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-base md:text-lg border-b pb-2">
                    Dados do Responsável
                  </h3>
                  <p className="text-sm text-gray-600">
                    Como você é menor de 18 anos, precisamos dos dados de um
                    responsável
                  </p>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nome do Responsável{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.responsavel_nome || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          responsavel_nome: e.target.value,
                        })
                      }
                      className="text-base"
                      required={isMenor}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        CPF do Responsável
                      </label>
                      <Input
                        type="text"
                        value={formData.responsavel_cpf || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            responsavel_cpf: e.target.value,
                          })
                        }
                        placeholder="000.000.000-00"
                        className="text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Telefone do Responsável
                      </label>
                      <Input
                        type="tel"
                        value={formData.responsavel_telefone || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            responsavel_telefone: e.target.value,
                          })
                        }
                        placeholder="(11) 99999-9999"
                        className="text-base"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Senha (condicional) */}
              {precisaSenha && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-base md:text-lg border-b pb-2">
                    Credenciais de Acesso
                  </h3>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-800">
                      Como você tem {idade} anos ou é um responsável, você terá
                      acesso ao sistema. Crie uma senha para fazer login.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Senha <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="password"
                      value={formData.senha || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, senha: e.target.value })
                      }
                      placeholder="Mínimo 6 caracteres"
                      className="text-base"
                      required={precisaSenha}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Confirmar Senha <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Digite a senha novamente"
                      className="text-base"
                      required={precisaSenha}
                    />
                  </div>
                </div>
              )}

              {/* Botão Submit */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={enviando}
                  className="w-full text-base py-6"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Completar Cadastro"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
