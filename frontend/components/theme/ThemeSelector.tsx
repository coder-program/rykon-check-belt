"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import type { Theme } from "@/hooks/useTheme";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

/**
 * ThemeSelector - Componente de seleção de tema
 * 
 * Dropdown elegante para alternar entre modos:
 * - Claro
 * - Escuro
 * - Dispositivo (automático)
 * 
 * Integrado com ThemeProvider para sincronização global
 * Salva preferência no localStorage
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  console.log("🔍 ThemeSelector montado. Tema atual:", theme);

  const themeOptions = [
    {
      value: "light",
      label: "Claro",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Escuro",
      icon: Moon,
    },
    {
      value: "system",
      label: "Dispositivo",
      icon: Monitor,
    },
  ] as const;

  // Encontra o ícone do tema atual
  const CurrentIcon = themeOptions.find((opt) => opt.value === theme)?.icon || Monitor;

  const handleThemeChange = (value: string) => {
    console.log("🎨 TEMA ALTERADO PARA:", value);
    console.log("🎨 Classe HTML antes:", document.documentElement.className);
    setTheme(value as Theme);
    
    // Verificar após um pequeno delay
    setTimeout(() => {
      console.log("🎨 Classe HTML depois:", document.documentElement.className);
      console.log("🎨 LocalStorage:", localStorage.getItem("theme"));
    }, 100);
  };

  return (
    <Select value={theme} onValueChange={handleThemeChange}>
      <SelectTrigger className="w-[50px] h-[40px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors px-2">
        <div className="flex items-center justify-center w-full">
          <CurrentIcon className="h-5 w-5" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <SelectItem
              key={option.value}
              value={option.value}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
