"use client";

import React from "react";

const SimpleModal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999999,
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          border: "3px solid #28a745",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "2px solid #28a745",
            background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
            color: "white",
            borderRadius: "12px 12px 0 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px" }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "50%",
              width: "35px",
              height: "35px",
              fontSize: "18px",
              cursor: "pointer",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
};

export default SimpleModal;
