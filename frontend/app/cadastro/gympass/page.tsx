"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

export default function CadastroGympassPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  // Dados pré-preenchidos vindos da URL
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: searchParams.get("email") || "",
    telefone: "",
    data_nascimento: "",
    cpf: "",
    senha: "",
    confirmar_senha: "",
    gympass_user_id: searchParams.get("gympass_user") || "",
    unidade_id: searchParams.get("unidade") || "",
  });

  useEffect(() => {
    // Preencher nome se first_name e last_name vieram da URL
    const firstName = searchParams.get("first_name");
    const lastName = searchParams.get("last_name");
    if (firstName || lastName) {
      setFormData(prev => ({
        ...prev,
        nome_completo: `${firstName || ""} ${lastName || ""}`.trim()
      }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.senha !== formData.confirmar_senha) {
      setErro("As senhas não coincidem");
      return;
    }

    if (formData.senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      // Criar aluno via API pública (sem autenticação)
      await api.post("/convites-cadastro/cadastro-publico", {
        nome_completo: formData.nome_completo,
        email: formData.email,
        telefone: formData.telefone,
        data_nascimento: formData.data_nascimento,
        cpf: formData.cpf,
        senha: formData.senha,
        unidade_id: formData.unidade_id,
        // Dados do convênio
        convenio_tipo: "GYMPASS",
        convenio_user_id: formData.gympass_user_id,
      });

      setSucesso(true);
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push(`/login?gympass_user=${formData.gympass_user_id}`);
      }, 3000);
    } catch (error: any) {
      console.error("Erro ao cadastrar:", error);
      setErro(
        error.response?.data?.message || 
        "Erro ao completar cadastro. Tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <CardTitle>Cadastro Concluído!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Seu cadastro Gympass foi completado com sucesso!
            </p>
            <p className="text-sm text-gray-600">
              Você será redirecionado para o login em alguns segundos...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Bem-vindo ao Gympass!</CardTitle>
          <CardDescription>
            Complete seu cadastro para começar a treinar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{erro}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nome_completo">Nome Completo *</Label>
                <Input
                  id="nome_completo"
                  value={formData.nome_completo}
                  onChange={(e) => updateField("nome_completo", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  placeholder="(11) 98765-4321"
                  value={formData.telefone}
                  onChange={(e) => updateField("telefone", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => updateField("data_nascimento", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => updateField("cpf", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="senha">Senha *</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.senha}
                  onChange={(e) => updateField("senha", e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirmar_senha">Confirmar Senha *</Label>
                <Input
                  id="confirmar_senha"
                  type="password"
                  value={formData.confirmar_senha}
                  onChange={(e) => updateField("confirmar_senha", e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Gympass ID:</strong> {formData.gympass_user_id || "Não informado"}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={carregando}
            >
              {carregando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Completar Cadastro"
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              Ao cadastrar, você concorda com nossos termos de uso e política de privacidade
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
