import React from "react";

interface InputNumeroProps {
  value: string | number;
  onChange: (value: number) => void;
  required?: boolean;
  min?: number;
  step?: number;
  placeholder?: string;
}

export function InputNumero({
  value,
  onChange,
  required,
  min = 0,
  step = 1,
  placeholder,
}: InputNumeroProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "");
    onChange(v ? parseInt(v) : 0);
  };
  return (
    <input
      type="number"
      className="input input-bordered w-full"
      value={value || ""}
      onChange={handleChange}
      required={required}
      min={min}
      step={step}
      placeholder={placeholder}
    />
  );
}
