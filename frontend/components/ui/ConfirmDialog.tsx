"use client";

import React from "react";
import { AlertTriangle, LogOut, UserX, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  icon?: "logout" | "userX" | "warning";
  autoCloseOnConfirm?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning",
  icon = "warning",
  autoCloseOnConfirm = true,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (icon) {
      case "logout":
        return <LogOut className="h-12 w-12" />;
      case "userX":
        return <UserX className="h-12 w-12" />;
      default:
        return <AlertTriangle className="h-12 w-12" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "danger":
        return {
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
          buttonBg:
            "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
          buttonText: "text-white",
        };
      case "warning":
        return {
          iconBg: "bg-orange-100",
          iconColor: "text-orange-600",
          buttonBg:
            "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
          buttonText: "text-white",
        };
      default:
        return {
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          buttonBg:
            "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
          buttonText: "text-white",
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={`${colors.iconBg} ${colors.iconColor} p-4 rounded-full`}
          >
            {getIcon()}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {title}
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6 whitespace-pre-line">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-200 hover:shadow-md"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              if (autoCloseOnConfirm) {
                onClose();
              }
            }}
            className={`flex-1 px-4 py-3 ${colors.buttonBg} ${colors.buttonText} font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
