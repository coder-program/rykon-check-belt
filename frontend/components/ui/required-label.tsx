import React from "react";

interface RequiredLabelProps {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}

export function RequiredLabel({
  children,
  required = false,
  htmlFor,
  className = "",
}: RequiredLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}
    >
      {children}
      {required && (
        <span className="text-red-500 ml-1" title="Campo obrigatório">
          *
        </span>
      )}
    </label>
  );
}
