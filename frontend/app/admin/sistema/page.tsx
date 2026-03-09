"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import toast from "react-hot-toast";
import {
  Building2,
  Settings,
  CreditCard,
  Webhook,
  Shield,
  DollarSign,
  Zap,
  Users,
  Package,
  Wallet,
  List,
  ChevronRight,
  ChevronDown,
  MonitorPlay,
  LayoutDashboard,
  FileText,
  ReceiptText,
  Blocks,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SubMenuItem = {
  icon: React.ElementType;
  title: string;
  description: string;
  route?: string;
  active: boolean;
  badge?: string;
};

type MenuGroup = {
  id: string;
  label: string;
  sectionLabel?: string;
  color: string;
  items: SubMenuItem[];
};

const rykonPayItems: SubMenuItem[] = [
  {
    icon: Building2,
    title: "Estabelecimentos",
    description: "Cadastro e gestão de estabelecimentos",
    route: "/admin/estabelecimentos",
    active: true,
  },
  {
    icon: CreditCard,
    title: "Transações",
    description: "Pix, Cartão, Boleto e Split",
    route: "/admin/transacoes",
    active: true,
  },
  {
    icon: Wallet,
    title: "Banking",
    description: "Saldo, extrato e transferências",
    route: "/admin/banking",
    active: true,
  },
  {
    icon: DollarSign,
    title: "Liquidações",
    description: "Extratos do marketplace",
    route: "/admin/liquidacoes",
    active: true,
  },
  {
    icon: Shield,
    title: "Antifraude",
    description: "ClearSale, 3DS e IDPAY",
    route: "/admin/antifraude",
    active: true,
  },
  {
    icon: Zap,
    title: "Gateways",
    description: "Provedores de pagamento",
    route: "/admin/gateways",
    active: true,
  },
  {
    icon: Package,
    title: "Planos",
    description: "Planos comerciais e tarifas",
    route: "/admin/plans",
    active: true,
  },
  {
    icon: Building2,
    title: "Unidades & Planos",
    description: "Vincular estabelecimentos e planos às unidades",
    route: "/admin/unidades-planos",
    active: true,
  },
  {
    icon: Users,
    title: "Representantes",
    description: "Gestão de representantes comerciais",
    route: "/admin/representantes",
    active: true,
  },
  {
    icon: List,
    title: "Atividades",
    description: "CNAEs e atividades econômicas",
    route: "/admin/atividades",
    active: true,
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description: "Eventos e notificações",
    route: "/admin/webhooks",
    active: true,
  },
  {
    icon: Settings,
    title: "Configurações",
    description: "Parâmetros globais do sistema",
    route: "/admin/configuracoes",
    active: true,
  },
];

const franqueadosItems: SubMenuItem[] = [
  {
    icon: LayoutDashboard,
    title: "Painel",
    description: "KPIs, franqueados e unidades",
    route: "/admin/franqueados",
    active: true,
  },
  {
    icon: FileText,
    title: "Contratos",
    description: "Carência, setup e mensalidade",
    route: "/admin/franqueados/contratos",
    active: true,
  },
  {
    icon: ReceiptText,
    title: "Cobranças",
    description: "Faturas e inadimplência",
    route: "/admin/franqueados/cobrancas",
    active: true,
  },
  {
    icon: Blocks,
    title: "Catálogo de Módulos",
    description: "Módulos disponíveis e preços",
    route: "/admin/franqueados/modulos",
    active: true,
  },
];

const teamcruzItems: SubMenuItem[] = [
  {
    icon: MonitorPlay,
    title: "Tutoriais do Sistema",
    description: "Vídeos explicativos sobre as funcionalidades",
    route: "/admin/videos",
    active: true,
  },
];

const menuGroups: MenuGroup[] = [
  {
    id: "rykon-pay",
    label: "Rykon-Pay",
    sectionLabel: "Administração",
    color: "blue",
    items: rykonPayItems,
  },
  {
    id: "franqueados",
    label: "Gestão de Franqueados",
    sectionLabel: "TeamCruz",
    color: "violet",
    items: franqueadosItems,
  },
  {
    id: "teamcruz",
    label: "TeamCruz",
    sectionLabel: "Sistema",
    color: "emerald",
    items: teamcruzItems,
  },
];

export default function AdminSistemaPage() {
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "rykon-pay": false,
    "franqueados": false,
    "teamcruz": false,
  });
  const [activeRoute, setActiveRoute] = useState<string | undefined>(undefined);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleClick = (item: SubMenuItem) => {
    if (!item.active) {
      toast("Módulo em desenvolvimento", { icon: "🚧" });
      return;
    }
    if (item.route) {
      setActiveRoute(item.route);
      router.push(item.route);
    }
  };

  const groupAccentBg: Record<string, string> = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    violet: "bg-violet-600",
  };
  const groupAccentText: Record<string, string> = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    violet: "text-violet-600",
  };
  const groupAccentBorder: Record<string, string> = {
    blue: "border-blue-600",
    emerald: "border-emerald-600",
    violet: "border-violet-600",
  };
  const groupBadgeClass: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet-100 text-violet-700",
  };

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
          {/* Logo / Header */}
          <div className="p-5 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">R</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Painel Admin
                </p>
              </div>
            </div>
          </div>

          {/* Menu Groups */}
          <nav className="flex-1 py-2">
            {menuGroups.map((group) => {
              const isOpen = openGroups[group.id] ?? true;
              return (
                <div key={group.id} className="mb-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          groupAccentBg[group.color],
                        )}
                      />
                      <span className="text-sm font-bold text-gray-800">
                        {group.label}
                      </span>
                      {group.sectionLabel && (
                        <span className="text-xs text-gray-400 font-normal">
                          — {group.sectionLabel}
                        </span>
                      )}
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Sub-items */}
                  {isOpen && (
                    <div className="ml-4 border-l-2 border-gray-100">
                      {group.items.map((item, idx) => {
                        const Icon = item.icon;
                        const isActive = activeRoute === item.route;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleClick(item)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group",
                              isActive
                                ? cn("bg-gray-50 border-l-2 -ml-0.5", groupAccentBorder[group.color])
                                : "hover:bg-gray-50",
                              !item.active && "opacity-60",
                            )}
                          >
                            <div
                              className={cn(
                                "p-1.5 rounded-md shrink-0",
                                isActive
                                  ? cn("bg-opacity-15", `bg-${group.color}-100`)
                                  : "bg-gray-100 group-hover:bg-gray-200",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "w-4 h-4",
                                  isActive
                                    ? groupAccentText[group.color]
                                    : "text-gray-500",
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "text-sm font-medium truncate",
                                    isActive
                                      ? groupAccentText[group.color]
                                      : "text-gray-700 group-hover:text-gray-900",
                                  )}
                                >
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none shrink-0", groupBadgeClass[group.color])}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">
                                {item.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Painel Administrativo
            </h2>
            <p className="text-gray-500 mb-8">
              Selecione um módulo no menu lateral para começar
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rykon-Pay Card */}
              <Card className="border-blue-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                    <CardTitle className="text-base">Rykon-Pay</CardTitle>
                  </div>
                  <CardDescription>
                    Gestão completa do marketplace de pagamentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li>• <strong>Estabelecimentos:</strong> Cadastro e gestão</li>
                    <li>• <strong>Transações:</strong> Pix, cartão, boleto e split</li>
                    <li>• <strong>Banking:</strong> Saldo, extrato e transferências</li>
                    <li>• <strong>Antifraude:</strong> ClearSale, 3DS e IDPAY</li>
                    <li>• <strong>Gateways:</strong> Provedores de pagamento</li>
                    <li>• <strong>Planos:</strong> Tarifas e planos comerciais</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Gestão de Franqueados Card */}
              <Card className="border-violet-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-violet-600" />
                    <CardTitle className="text-base">Gestão de Franqueados</CardTitle>
                  </div>
                  <CardDescription>
                    Controle comercial, implantação e cobrança B2B
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li>• <strong>Painel:</strong> KPIs, franqueados e unidades</li>
                    <li>• <strong>Contratos:</strong> Carência, setup e mensalidade</li>
                    <li>• <strong>Cobranças:</strong> Faturas e inadimplência</li>
                    <li>• <strong>Catálogo:</strong> Módulos disponíveis e preços</li>
                  </ul>
                </CardContent>
              </Card>

              {/* TeamCruz Card */}
              <Card className="border-emerald-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-600" />
                    <CardTitle className="text-base">TeamCruz</CardTitle>
                  </div>
                  <CardDescription>
                    Recursos e tutoriais do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li>• <strong>Tutoriais do Sistema:</strong> Vídeos explicativos sobre as funcionalidades</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
