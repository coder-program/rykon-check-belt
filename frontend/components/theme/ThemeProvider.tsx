"use client";

import { createContext, useContext, ReactNode } from "react";
import { Theme, useTheme as useThemeHook } from "@/hooks/useTheme";

/**
 * Interface do contexto de tema
 */
interface ThemeContextType {
  theme: Theme;
  effectiveTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

// Criação do contexto
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider - Provedor de contexto de tema
 * 
 * Envolve a aplicação e fornece acesso global ao estado do tema
 * Previne FOUC (Flash of Unstyled Content) ao carregar tema salvo
 * 
 * @param children - Componentes filhos
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeData = useThemeHook();

  return (
    <ThemeContext.Provider value={themeData}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook para consumir o contexto de tema
 * 
 * @throws Error se usado fora do ThemeProvider
 * @returns Objeto com tema atual e função para alterá-lo
 * 
 * @example
 * const { theme, effectiveTheme, setTheme } = useTheme();
 * 
 * // Alterar para modo escuro
 * setTheme('dark');
 * 
 * // Alterar para seguir o sistema
 * setTheme('system');
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  }
  
  return context;
}
