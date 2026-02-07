"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  ListChecks,
  Settings,
  Tags,
  CreditCard,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/financeiro/dashboard",
    description: "Resumo financeiro",
  },
  {
    title: "Extrato",
    icon: FileText,
    href: "/financeiro/extrato",
    description: "Histórico completo",
  },
  {
    title: "Planos",
    icon: Tags,
    href: "/financeiro/planos",
    description: "Gerenciar planos",
  },
  {
    title: "Assinaturas",
    icon: Repeat,
    href: "/financeiro/assinaturas",
    description: "Mensalidades",
  },
  {
    title: "Vendas Online",
    icon: ShoppingCart,
    href: "/financeiro/vendas-online",
    description: "Pagamentos online",
  },
  {
    title: "A Receber",
    icon: ArrowDownCircle,
    href: "/financeiro/a-receber",
    description: "Faturas pendentes",
  },
  {
    title: "A Pagar",
    icon: ArrowUpCircle,
    href: "/financeiro/a-pagar",
    description: "Contas a pagar",
  },
  {
    title: "Transações",
    icon: ListChecks,
    href: "/financeiro/transacoes",
    description: "Todas transações",
  },
  {
    title: "Configurações",
    icon: Settings,
    href: "/financeiro/configuracoes",
    description: "Configurar cobrança",
  },
  {
    title: "Rykon-Pay",
    icon: CreditCard,
    href: "/financeiro/configuracao-paytime",
    description: "Planos Rykon-Pay",
  },
];

export default function FinanceiroNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">💰 Financeiro</h2>
        <p className="text-xs text-gray-500">Gestão Financeira</p>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`
                w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <Icon
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  isActive ? "text-blue-600" : "text-gray-400"
                }`}
              />
              <div className="flex-1 text-left">
                <div
                  className={`text-sm font-medium ${
                    isActive ? "text-blue-700" : "text-gray-900"
                  }`}
                >
                  {item.title}
                </div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
