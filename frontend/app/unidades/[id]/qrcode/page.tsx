"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QRCodeUnidadePage() {
  const params = useParams();
  const router = useRouter();
  const unidadeId = params.id as string;
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [unidade, setUnidade] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadUnidade();
    generateQRCode();
  }, [unidadeId]);

  const loadUnidade = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades/${unidadeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setUnidade(data);
      }
    } catch (error) {
      console.error("Erro ao carregar unidade:", error);
    }
  };

  const generateQRCode = async () => {
    try {
      // QR Code contém apenas o ID da unidade
      const url = await QRCode.toDataURL(unidadeId, {
        width: 800,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.download = `qrcode-${unidade?.nome || "unidade"}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Botões de ação - não aparecem na impressão */}
        <div className="mb-6 flex gap-4 print:hidden">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Baixar PNG
          </Button>
        </div>

        {/* Cartaz para impressão */}
        <Card className="bg-white">
          <CardHeader className="text-center border-b-4 border-blue-600">
            <CardTitle className="text-3xl font-bold">
              CHECK-IN
            </CardTitle>
            <p className="text-xl text-gray-700 mt-2">
              {unidade?.nome || "Carregando..."}
            </p>
          </CardHeader>
          <CardContent className="p-12">
            <div className="text-center space-y-8">
              {/* QR Code */}
              <div className="flex justify-center">
                {qrCodeUrl && (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code da Unidade"
                    className="w-96 h-96 border-8 border-gray-200 rounded-lg"
                  />
                )}
              </div>

              {/* Instruções */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Como fazer check-in?
                </h2>
                <ol className="text-left text-lg space-y-3 max-w-2xl mx-auto">
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                      1
                    </span>
                    <span>Abra o aplicativo Team Cruz no seu celular</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                      2
                    </span>
                    <span>Vá para a página de Presença/Check-in</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                      3
                    </span>
                    <span>Aponte a câmera para este QR Code</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                      4
                    </span>
                    <span>Pronto! Check-in realizado automaticamente</span>
                  </li>
                </ol>
              </div>

              {/* Informações adicionais */}
              <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                <p className="text-lg text-blue-900 font-semibold">
                  📍 Faça check-in ao chegar na academia
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  O check-in registra sua presença na aula do dia
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ID da unidade - apenas para referência */}
        <div className="mt-4 text-center text-sm text-gray-500 print:hidden">
          ID da Unidade: {unidadeId}
        </div>
      </div>

      {/* Estilos de impressão */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
