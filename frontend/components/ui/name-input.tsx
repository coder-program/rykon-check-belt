"use client";

import React from "react";
import { Input } from "@/components/ui/input";

interface NameInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

export function NameInput({
  onValueChange,
  onChange,
  ...props
}: NameInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Remove números e caracteres especiais, mantém apenas letras, espaços e acentos
    value = value.replace(/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, "");

    // Capitaliza primeira letra de cada palavra, respeitando caracteres acentuados
    value = value
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    // Atualiza o valor no input
    e.target.value = value;

    // Chama callbacks
    if (onChange) onChange(e);
    if (onValueChange) onValueChange(value);
  };

  return (
    <Input
      {...props}
      onChange={handleChange}
      title="Digite apenas letras e espaços"
      placeholder={props.placeholder || "Digite o nome completo"}
    />
  );
}
