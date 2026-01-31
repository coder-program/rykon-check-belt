"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Receipt,
  Wallet,
  List,
  ChevronRight,
} from "lucide-react";

export default function AdminSistemaPage() {
  const router = useRouter();

  const menuItems = [
    {
      icon: Building2,
      title: "Estabelecimentos",
      description: "Cadastro e gestão de estabelecimentos",
      color: "indigo",
      route: "/admin/estabelecimentos",
      active: true,
    },
    {
      icon: CreditCard,
      title: "Transações",
      description: "Pix, Cartão, Boleto e Split",
      color: "green",
      route: null,
      active: false,
    },
    {
      icon: Wallet,
      title: "Banking",
      description: "Saldo, extrato e transferências",
      color: "emerald",
      route: null,
      active: false,
    },
    {
      icon: DollarSign,
      title: "Liquidações",
      description: "Extratos do marketplace",
      color: "blue",
      route: null,
      active: false,
    },
    {
      icon: Shield,
      title: "Antifraude",
      description: "ClearSale, 3DS e IDPAY",
      color: "red",
      route: null,
      active: false,
    },
    {
      icon: Zap,
      title: "Gateways",
      description: "Provedores de pagamento",
      color: "orange",
      route: null,
      active: false,
    },
    {
      icon: Package,
      title: "Planos",
      description: "Planos comerciais e tarifas",
      color: "cyan",
      route: null,
      active: false,
    },
    {
      icon: Users,
      title: "Representantes",
      description: "Gestão de representantes comerciais",
      color: "purple",
      route: null,
      active: false,
    },
    {
      icon: List,
      title: "Atividades",
      description: "CNAEs e atividades econômicas",
      color: "amber",
      route: null,
      active: false,
    },
    {
      icon: Webhook,
      title: "Webhooks",
      description: "Eventos e notificações",
      color: "pink",
      route: null,
      active: false,
    },
    {
      icon: Settings,
      title: "Configurações",
      description: "Parâmetros globais do sistema",
      color: "gray",
      route: "/admin/configuracoes",
      active: true,
    },
  ];

  const handleClick = (item: any) => {
    if (item.route) {
      router.push(item.route);
    } else {
      toast.info("Módulo em desenvolvimento");
    }
  };

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Paytime
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Administração
            </p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const bgColor = `bg-${item.color}-100`;
              const textColor = `text-${item.color}-600`;
              
              return (
                <button
                  key={index}
                  onClick={() => handleClick(item)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group text-left"
                >
                  <div className={`p-2 rounded-lg ${bgColor} flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${textColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Bem-vindo ao Paytime
            </h2>
            <p className="text-gray-600 mb-8">
              Selecione um módulo no menu lateral para começar
            </p>
            
            <Card>
              <CardHeader>
                <CardTitle>Central de Gerenciamento</CardTitle>
                <CardDescription>
                  Sistema completo para gestão do marketplace de pagamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Módulos Disponíveis</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Estabelecimentos:</strong> Cadastro e gestão completa</li>
                      <li>• <strong>Transações:</strong> Processamento de pagamentos</li>
                      <li>• <strong>Banking:</strong> Gestão financeira</li>
                      <li>• <strong>Antifraude:</strong> Segurança das transações</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
