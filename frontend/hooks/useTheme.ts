"use client";

import { useEffect, useState } from "react";

/**
 * Tipos de tema disponíveis no sistema
 * - light: Modo claro
 * - dark: Modo escuro  
 * - system: Segue a preferência do sistema operacional
 */
export type Theme = "light" | "dark" | "system";

/**
 * Hook customizado para gerenciamento de tema
 * 
 * Recursos:
 * - Sincronização com localStorage
 * - Detecção automática do tema do sistema
 * - Aplicação automática da classe 'dark' no elemento HTML
 * - Prevenção de flash de tema incorreto (FOUC)
 * 
 * @returns {Object} Objeto contendo o tema atual e função para alterá-lo
 */
export function useTheme() {
  // Estado inicial: carrega do localStorage ou usa 'system' como padrão
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    
    const stored = localStorage.getItem("theme") as Theme | null;
    return stored || "system";
  });

  // Estado do tema efetivo (resolvido considerando 'system')
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    
    const stored = localStorage.getItem("theme") as Theme | null;
    const currentTheme = stored || "system";
    
    if (currentTheme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return currentTheme;
  });

  /**
   * Resolve qual tema deve ser aplicado considerando a preferência do sistema
   */
  const getEffectiveTheme = (currentTheme: Theme): "light" | "dark" => {
    if (currentTheme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return currentTheme;
  };

  /**
   * Aplica o tema no DOM
   */
  const applyTheme = (themeToApply: "light" | "dark") => {
    const root = document.documentElement;
    const body = document.body;
    
    console.log("🔧 Aplicando tema:", themeToApply);
    console.log("🔧 Classes ANTES:", root.className);
    
    // Aplicar no <html> (estratégia Tailwind)
    if (themeToApply === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }

    // Aplicar no <body> (compatibilidade adicional)
    if (themeToApply === "dark") {
      body.classList.add("theme-dark");
      body.classList.remove("theme-light");
      body.setAttribute("data-theme", "dark");
    } else {
      body.classList.add("theme-light");
      body.classList.remove("theme-dark");
      body.setAttribute("data-theme", "light");
    }

    console.log("🔧 Classes DEPOIS (html):", root.className);
    console.log("🔧 Classes DEPOIS (body):", body.className);
    console.log("🔧 Computed background:", window.getComputedStyle(document.body).backgroundColor);
    
    setEffectiveTheme(themeToApply);
  };

  /**
   * Atualiza o tema
   */
  const setTheme = (newTheme: Theme) => {
    console.log("⚡ setTheme chamado com:", newTheme);
    
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    console.log("⚡ Tema salvo no localStorage");
    
    const effective = getEffectiveTheme(newTheme);
    console.log("⚡ Tema efetivo calculado:", effective);
    
    applyTheme(effective);
  };

  // Aplica tema inicial ao montar o componente
  useEffect(() => {
    console.log("🎬 useTheme montado. Tema inicial:", theme);
    const effective = getEffectiveTheme(theme);
    console.log("🎬 Aplicando tema efetivo inicial:", effective);
    applyTheme(effective);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escuta mudanças na preferência do sistema quando theme === 'system'
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = (e: MediaQueryListEvent) => {
      const effective = e.matches ? "dark" : "light";
      applyTheme(effective);
    };

    mediaQuery.addEventListener("change", handleChange);
    
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return {
    theme,
    effectiveTheme,
    setTheme,
  };
}
