import React from "react";
import { validarCPF } from "@/utils/validacao";

interface InputCPFProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function InputCPF({ value, onChange, required }: InputCPFProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    onChange(v);
  };
  const isValid = value ? validarCPF(value) : true;
  return (
    <input
      type="text"
      className={`input input-bordered w-full ${
        value && !isValid ? "border-red-500" : ""
      }`}
      value={value}
      onChange={handleChange}
      placeholder="000.000.000-00"
      required={required}
      maxLength={14}
    />
  );
}
