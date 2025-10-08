"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import MasterDashboard from "@/components/dashboard/MasterDashboard";
import FranqueadoDashboard from "@/components/dashboard/FranqueadoDashboard";
import AlunoDashboard from "@/components/dashboard/AlunoDashboard";
import InstrutorDashboard from "@/components/dashboard/InstrutorDashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Shield,
  Lock,
  CheckCircle,
  Grid3X3,
  Key,
  FileText,
  Mail,
  Plus,
  Building2,
  Calendar,
  UserCheck,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  perfis: string[];
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const hasPerfil = (p: string) => {
    if (!user?.perfis || !Array.isArray(user.perfis)) return false;

    return user.perfis
      .map((x: string | { nome?: string; name?: string }) => {
        // Se x é uma string, retorna ela mesma
        if (typeof x === "string") return x.toLowerCase();
        // Se x é um objeto com propriedade nome, usa nome
        if (typeof x === "object" && x?.nome) return x.nome.toLowerCase();
        // Se x é um objeto com propriedade name, usa name
        if (typeof x === "object" && x?.name) return x.name.toLowerCase();
        // Caso contrário, converte para string
        return String(x).toLowerCase();
      })
      .includes(p.toLowerCase());
  };
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/usuarios", {
          headers: {
            "Content-Type": "application/json",
            ...(typeof window !== "undefined" && localStorage.getItem("token")
              ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
              : {}),
          },
        });
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Erro ao carregar usuários", e);
        setUsers([]);
      }
    };
    load();
  }, []);

  // Renderizar dashboard específico por perfil
  if (hasPerfil("master")) {
    return <MasterDashboard />;
  }

  if (hasPerfil("franqueado")) {
    return <FranqueadoDashboard />;
  }

  if (hasPerfil("aluno")) {
    return <AlunoDashboard />;
  }

  if (hasPerfil("instrutor")) {
    return <InstrutorDashboard />;
  }

  // Debug do usuário
  console.log("User:", user);
  console.log("User perfis:", user?.perfis);
  console.log("hasPerfil master:", hasPerfil("master"));
  console.log("hasPerfil franqueado:", hasPerfil("franqueado"));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Sistema de Autenticação e Usuários
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Bem-vindo, <span className="font-medium">{user?.name}</span>!
              </span>
              <Button
                onClick={logout}
                variant="outline"
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                Usuários cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Autenticação
              </CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">JWT</div>
              <p className="text-xs text-muted-foreground">Sistema ativo</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Permissões</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ativo</div>
              <p className="text-xs text-muted-foreground">Sistema de roles</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Online</div>
              <p className="text-xs text-muted-foreground">
                Sistema operacional
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
            <Lock className="mr-2 h-5 w-5" />
            Módulos Disponíveis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
              onClick={() => router.push("/usuarios")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Gestão de Usuários
                  </span>
                  <span className="badge badge-success text-xs">Ativo</span>
                </CardTitle>
                <CardDescription>
                  CRUD completo de usuários, perfis e permissões
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Key className="mr-2 h-5 w-5" />
                    Autenticação JWT
                  </span>
                  <span className="badge badge-success text-xs">Ativo</span>
                </CardTitle>
                <CardDescription>
                  Login, logout, refresh tokens e proteção de rotas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Sistema de Auditoria
                  </span>
                  <span className="badge badge-success text-xs">Ativo</span>
                </CardTitle>
                <CardDescription>
                  Logs automáticos de todas as ações do sistema
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Mail className="mr-2 h-5 w-5" />
                    Reset de Senha
                  </span>
                  <span className="badge badge-warning text-xs">
                    Implementado
                  </span>
                </CardTitle>
                <CardDescription>
                  Recuperação de senha via email (estrutura implementada)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
              onClick={() => router.push("/alunos")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Alunos
                  </span>
                  <span className="badge badge-primary text-xs">Ativo</span>
                </CardTitle>
                <CardDescription>
                  Gestão completa de alunos da TeamCruz com controle de
                  graduações
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
              onClick={() => router.push("/professores")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Professores
                  </span>
                  <span className="badge badge-secondary text-xs animate-pulse">
                    Novo!
                  </span>
                </CardTitle>
                <CardDescription>
                  Cadastro e gestão dos instrutores e professores da academia
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
              onClick={() => router.push("/admin/usuarios-pendentes")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <UserCheck className="mr-2 h-5 w-5" />
                    Aprovar Usuários
                  </span>
                  <span className="badge badge-success text-xs">Master</span>
                </CardTitle>
                <CardDescription>
                  Aprovar cadastros de instrutores, franqueados e gestores
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20"
              onClick={() => router.push("/aprovacao-alunos")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Aprovação de Alunos
                  </span>
                  <span className="badge badge-warning text-xs">🥋 Alunos</span>
                </CardTitle>
                <CardDescription>
                  Aprovar cadastros de ALUNOS de Jiu-Jitsu (estudantes)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20"
              onClick={() => router.push("/meus-alunos")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Meus Alunos
                  </span>
                  <span className="badge badge-info text-xs">
                    Personalizado
                  </span>
                </CardTitle>
                <CardDescription>
                  Visualização personalizada dos alunos sob sua responsabilidade
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-800/20"
              onClick={() => router.push("/teamcruz")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Grid3X3 className="mr-2 h-5 w-5" />
                    TeamCruz Jiu-Jitsu
                  </span>
                  <span className="badge badge-error text-xs">Sistema</span>
                </CardTitle>
                <CardDescription>
                  Sistema completo de controle de presença e graduação
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20"
              onClick={() => router.push("/franqueados")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Franqueados
                  </span>
                  <span className="badge badge-success text-xs">Master</span>
                </CardTitle>
                <CardDescription>
                  Gestão de franquias e contratos de franqueados
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20"
              onClick={() => router.push("/unidades")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Unidades
                  </span>
                  <span className="badge badge-success text-xs">Restrito</span>
                </CardTitle>
                <CardDescription>
                  Cadastro e administração de todas as unidades
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-pink-200 bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20"
              onClick={() => router.push("/horarios")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Horários de Aulas
                  </span>
                  <span className="badge badge-success text-xs">Novo!</span>
                </CardTitle>
                <CardDescription>
                  Visualize os horários das aulas disponíveis na sua unidade
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20"
              onClick={() => router.push("/aulas")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Gerenciamento de Aulas
                  </span>
                  <span className="badge badge-warning text-xs animate-pulse">Admin</span>
                </CardTitle>
                <CardDescription>
                  Cadastre, edite e gerencie as aulas das unidades
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20"
              onClick={() => router.push("/presenca")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Presença
                  </span>
                  <span className="badge badge-success text-xs">Ativo</span>
                </CardTitle>
                <CardDescription>
                  Registre sua presença nas aulas e acompanhe sua evolução
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-dashed border-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Plus className="mr-2 h-5 w-5" />
                    Seu Módulo
                  </span>
                  <span className="badge badge-info text-xs">Extensível</span>
                </CardTitle>
                <CardDescription>
                  Adicione novos módulos baseados nesta estrutura
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
