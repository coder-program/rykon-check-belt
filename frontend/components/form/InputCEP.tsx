import React from "react";
import { validarCEP } from "@/utils/validacao";

interface InputCEPProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function InputCEP({ value, onChange, required }: InputCEPProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    onChange(v);
  };
  const isValid = value ? validarCEP(value) : true;
  return (
    <input
      type="text"
      className={`input input-bordered w-full ${
        value && !isValid ? "border-red-500" : ""
      }`}
      value={value}
      onChange={handleChange}
      placeholder="00000-000"
      required={required}
      maxLength={9}
    />
  );
}
