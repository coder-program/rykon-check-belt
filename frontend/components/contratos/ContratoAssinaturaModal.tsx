"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, FileText, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { contratosService, type ContratoUnidade } from "@/lib/services/contratosService";

interface ContratoAssinaturaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunoId?: string;
  responsavelId?: string;
  onAssinado?: () => void;
}

export function ContratoAssinaturaModal({
  open,
  onOpenChange,
  alunoId,
  responsavelId,
  onAssinado,
}: ContratoAssinaturaModalProps) {
  const [contrato, setContrato] = useState<ContratoUnidade | null>(null);
  const [loading, setLoading] = useState(true);
  const [assinando, setAssinando] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      carregarContrato();
    } else {
      // Reset ao fechar
      setAceito(false);
      setError(null);
    }
  }, [open, alunoId, responsavelId]);

  const carregarContrato = async () => {
    setLoading(true);
    setError(null);

    try {
      let status;
      
      if (alunoId) {
        status = await contratosService.verificarStatusAluno(alunoId);
      } else if (responsavelId) {
        status = await contratosService.verificarStatusResponsavel(responsavelId);
      } else {
        throw new Error("ID de aluno ou responsável não fornecido");
      }

      if (!status.contrato_pendente) {
        toast.success("Você já assinou o contrato!");
        onOpenChange(false);
        return;
      }

      if (!status.contrato) {
        throw new Error("Nenhum contrato ativo encontrado para esta unidade");
      }

      setContrato(status.contrato);
    } catch (err: any) {
      console.error("Erro ao carregar contrato:", err);
      setError(err.message || "Erro ao carregar contrato");
      toast.error("Erro ao carregar contrato");
    } finally {
      setLoading(false);
    }
  };

  const handleAssinar = async () => {
    if (!aceito) {
      toast.error("Você precisa aceitar os termos para continuar");
      return;
    }

    setAssinando(true);
    try {
      if (alunoId) {
        await contratosService.assinarContratoAluno(alunoId);
      } else if (responsavelId) {
        await contratosService.assinarContratoResponsavel(responsavelId);
      }

      toast.success("Contrato assinado com sucesso!");
      onOpenChange(false);
      onAssinado?.();
    } catch (err: any) {
      console.error("Erro ao assinar contrato:", err);
      toast.error(err.message || "Erro ao assinar contrato");
    } finally {
      setAssinando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-gray-900 border-red-600/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <FileText className="h-5 w-5 text-red-400" />
            {contrato?.titulo || "Termo de Adesão"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Leia atentamente o termo abaixo e aceite para continuar
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <p className="text-gray-300 text-center">{error}</p>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Fechar
            </Button>
          </div>
        ) : (
          <>
            {/* Conteúdo do contrato */}
            <ScrollArea className="h-[400px] border border-gray-700 rounded-lg bg-gray-800/50 p-4">
              <div className="whitespace-pre-wrap text-sm text-gray-200 leading-relaxed">
                {contrato?.conteudo}
              </div>
              
              {/* Informações do contrato */}
              <div className="mt-6 pt-4 border-t border-gray-700 text-xs text-gray-400">
                <p>Versão: {contrato?.versao}</p>
                <p>Tipo: {contrato?.tipo_contrato}</p>
              </div>
            </ScrollArea>

            {/* Checkbox de aceite */}
            <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
              <Checkbox
                id="aceito"
                checked={aceito}
                onCheckedChange={(checked) => setAceito(checked === true)}
                className="mt-1 border-gray-500 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
              />
              <label
                htmlFor="aceito"
                className="text-sm text-gray-200 cursor-pointer leading-relaxed"
              >
                Declaro que li e concordo com todos os termos descritos acima. 
                Estou ciente de que esta assinatura possui validade legal e será 
                registrada com data, hora e identificação.
              </label>
            </div>

            {/* Aviso sobre obrigatoriedade */}
            {contrato?.obrigatorio && (
              <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-200">
                  Este termo é obrigatório. Você precisa aceitá-lo para continuar utilizando o sistema.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={assinando}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAssinar}
                disabled={!aceito || assinando}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
              >
                {assinando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assinando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aceitar e Assinar
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
