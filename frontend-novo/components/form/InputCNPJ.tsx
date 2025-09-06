import React from "react";
import { validarCNPJ } from "@/utils/validacao";

interface InputCNPJProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export function InputCNPJ({ value, onChange, required, disabled }: InputCNPJProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 14) v = v.slice(0, 14);
    v = v.replace(/(\d{2})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
    onChange(v);
  };
  const isValid = value ? validarCNPJ(value) : true;
  return (
    <input
      type="text"
      className={`input input-bordered w-full ${
        value && !isValid ? "border-red-500" : ""
      } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      value={value}
      onChange={handleChange}
      placeholder="00.000.000/0001-00"
      required={required}
      maxLength={18}
      disabled={disabled}
    />
  );
}
