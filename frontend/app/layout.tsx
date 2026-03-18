import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth/AuthContext";
import React from "react";
import QueryProvider from "@/components/QueryProvider";
import { Toaster } from "react-hot-toast";
import { ProfileCompletionGuard } from "@/components/auth/ProfileCompletionGuard";
import { TokenExpirationChecker } from "@/components/auth/TokenExpirationChecker";
import LayoutContent from "@/components/layout/LayoutContent";
import { FetchInterceptorSetup } from "@/components/FetchInterceptorSetup";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Usar fontes do sistema como fallback
const fontVariables = "font-sans";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "TeamCruz Jiu-Jitsu - Sistema de Gestão",
  description:
    "Sistema de controle de presença e graduação da TeamCruz Jiu-Jitsu",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TeamCruz",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#dc2626",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TeamCruz" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#dc2626" />
        {/* Script para prevenir flash de tema incorreto - executa antes do React hidratar */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                console.log("🚀 Script de tema carregado");
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  console.log("🚀 Tema salvo:", theme);
                  
                  const isDark = theme === 'dark' || 
                    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  
                  console.log("🚀 Aplicar dark?", isDark);
                  
                  // Aplicar no HTML
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                  
                  // Aplicar no BODY (executar após DOM carregar)
                  if (document.body) {
                    if (isDark) {
                      document.body.classList.add('theme-dark');
                      document.body.classList.remove('theme-light');
                      document.body.setAttribute('data-theme', 'dark');
                    } else {
                      document.body.classList.add('theme-light');
                      document.body.classList.remove('theme-dark');
                      document.body.setAttribute('data-theme', 'light');
                    }
                  } else {
                    // Se body não existe ainda, aplicar quando carregar
                    document.addEventListener('DOMContentLoaded', function() {
                      if (isDark) {
                        document.body.classList.add('theme-dark');
                        document.body.classList.remove('theme-light');
                        document.body.setAttribute('data-theme', 'dark');
                      } else {
                        document.body.classList.add('theme-light');
                        document.body.classList.remove('theme-dark');
                        document.body.setAttribute('data-theme', 'light');
                      }
                    });
                  }
                  
                  console.log("🚀 Classes finais:", document.documentElement.className);
                } catch (e) {
                  console.error("🚀 Erro ao aplicar tema:", e);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${fontVariables} antialiased flex flex-col min-h-screen`}
      >
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <FetchInterceptorSetup />
              <TokenExpirationChecker />
              <ProfileCompletionGuard>
                <LayoutContent>{children}</LayoutContent>
              </ProfileCompletionGuard>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "#363636",
                    color: "#fff",
                  },
                  success: {
                    style: {
                      background: "green",
                    },
                  },
                  error: {
                    style: {
                      background: "red",
                    },
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
