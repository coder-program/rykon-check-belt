"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  History,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { contratosService, type ContratoUnidade, type HistoricoAssinatura } from "@/lib/services/contratosService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContratosManagerProps {
  unidadeId: string;
  unidadeNome: string;
}

export function ContratosManager({ unidadeId, unidadeNome }: ContratosManagerProps) {
  const [contratos, setContratos] = useState<ContratoUnidade[]>([]);
  const [contratoAtivo, setContratoAtivo] = useState<ContratoUnidade | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [deleteDialogAberto, setDeleteDialogAberto] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState<ContratoUnidade | null>(null);
  const [historico, setHistorico] = useState<HistoricoAssinatura[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [formData, setFormData] = useState({
    titulo: "",
    conteudo: "",
    tipo_contrato: "TERMO_ADESAO" as "TERMO_ADESAO" | "TERMO_RESPONSABILIDADE" | "LGPD" | "OUTRO",
    obrigatorio: true,
  });

  useEffect(() => {
    carregarContratos();
  }, [unidadeId]);

  const carregarContratos = async () => {
    setLoading(true);
    try {
      const [lista, ativo] = await Promise.all([
        contratosService.listarContratosPorUnidade(unidadeId),
        contratosService.buscarContratoAtivoUnidade(unidadeId),
      ]);
      setContratos(lista);
      setContratoAtivo(ativo);
    } catch (error: any) {
      console.error("Erro ao carregar contratos:", error);
      toast.error("Erro ao carregar contratos");
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogNovo = () => {
    setFormData({
      titulo: `Termo de Adesão - ${unidadeNome}`,
      conteudo: `TERMO DE ADESÃO E RESPONSABILIDADE

Eu, abaixo identificado(a), declaro para os devidos fins que:

1. Estou ciente dos riscos inerentes à prática de artes marciais;
2. Concordo em seguir todas as regras e normas estabelecidas pela unidade;
3. Autorizo o uso de minha imagem em materiais promocionais da academia;
4. Estou de acordo com as políticas de privacidade (LGPD);
5. Comprometo-me a manter a mensalidade em dia conforme o plano contratado.

Data de aceite será registrada no momento da assinatura.`,
      tipo_contrato: "TERMO_ADESAO",
      obrigatorio: true,
    });
    setContratoSelecionado(null);
    setDialogAberto(true);
  };

  const abrirDialogEditar = (contrato: ContratoUnidade) => {
    setFormData({
      titulo: contrato.titulo,
      conteudo: contrato.conteudo,
      tipo_contrato: contrato.tipo_contrato,
      obrigatorio: contrato.obrigatorio,
    });
    setContratoSelecionado(contrato);
    setDialogAberto(true);
  };

  const handleSalvar = async () => {
    if (!formData.titulo.trim() || !formData.conteudo.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSalvando(true);
    try {
      if (contratoSelecionado) {
        // Editar existente
        await contratosService.editarContrato(contratoSelecionado.id, formData);
        toast.success("Contrato atualizado! Nova versão criada automaticamente.");
      } else {
        // Criar novo
        await contratosService.criarContrato({
          unidade_id: unidadeId,
          ...formData,
        });
        toast.success("Contrato criado com sucesso!");
      }
      setDialogAberto(false);
      await carregarContratos();
    } catch (error: any) {
      console.error("Erro ao salvar contrato:", error);
      toast.error(error.message || "Erro ao salvar contrato");
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async () => {
    if (!contratoSelecionado) return;

    try {
      await contratosService.deletarContrato(contratoSelecionado.id);
      toast.success("Contrato deletado com sucesso!");
      setDeleteDialogAberto(false);
      setContratoSelecionado(null);
      await carregarContratos();
    } catch (error: any) {
      console.error("Erro ao deletar contrato:", error);
      toast.error(error.message || "Erro ao deletar contrato");
    }
  };

  const abrirHistorico = async (contrato: ContratoUnidade) => {
    setContratoSelecionado(contrato);
    setHistoricoAberto(true);
    setLoadingHistorico(true);

    try {
      const hist = await contratosService.buscarHistoricoContrato(contrato.id);
      setHistorico(hist);
    } catch (error: any) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoadingHistorico(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-red-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-red-400" />
            Contratos da Unidade
          </h2>
          <p className="text-sm text-gray-400 mt-1">{unidadeNome}</p>
        </div>
        <Button
          onClick={abrirDialogNovo}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Contrato Ativo */}
      {contratoAtivo && (
        <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-600/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Contrato Ativo
            </CardTitle>
            <CardDescription className="text-gray-300">
              Este é o contrato que novos alunos e responsáveis devem assinar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Título:</span>
                <p className="text-white font-medium">{contratoAtivo.titulo}</p>
              </div>
              <div>
                <span className="text-gray-400">Versão:</span>
                <p className="text-white font-medium">v{contratoAtivo.versao}</p>
              </div>
              <div>
                <span className="text-gray-400">Tipo:</span>
                <p className="text-white font-medium">{contratoAtivo.tipo_contrato}</p>
              </div>
              <div>
                <span className="text-gray-400">Obrigatório:</span>
                <p className="text-white font-medium">
                  {contratoAtivo.obrigatorio ? "Sim" : "Não"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => abrirDialogEditar(contratoAtivo)}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => abrirHistorico(contratoAtivo)}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                <History className="h-4 w-4 mr-1" />
                Histórico ({historico.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Contratos */}
      {contratos.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-600 mb-3" />
            <p className="text-gray-400 text-center">
              Nenhum contrato criado ainda.
              <br />
              Crie um contrato para que alunos e responsáveis possam assinar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contratos.map((contrato) => (
            <Card
              key={contrato.id}
              className={`bg-gray-800/50 border-gray-700 ${
                !contrato.ativo ? "opacity-60" : ""
              }`}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{contrato.titulo}</h3>
                    {contrato.ativo && (
                      <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs rounded-full border border-green-600/30">
                        ATIVO
                      </span>
                    )}
                    {!contrato.ativo && (
                      <span className="px-2 py-0.5 bg-gray-600/20 text-gray-400 text-xs rounded-full border border-gray-600/30">
                        INATIVO
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Versão: v{contrato.versao}</span>
                    <span>Tipo: {contrato.tipo_contrato}</span>
                    <span>
                      Criado em:{" "}
                      {format(new Date(contrato.created_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirDialogEditar(contrato)}
                    className="border-gray-600 text-white hover:bg-gray-800"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirHistorico(contrato)}
                    className="border-gray-600 text-white hover:bg-gray-800"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setContratoSelecionado(contrato);
                      setDeleteDialogAberto(true);
                    }}
                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-3xl bg-gray-900 border-red-600/30 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {contratoSelecionado ? "Editar Contrato" : "Novo Contrato"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {contratoSelecionado
                ? "Ao editar, uma nova versão será criada automaticamente"
                : "Crie um novo contrato para sua unidade"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titulo" className="text-white">
                Título *
              </Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({ ...formData, titulo: e.target.value })
                }
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Ex: Termo de Adesão - Nome da Unidade"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo" className="text-white">
                  Tipo de Contrato
                </Label>
                <Select
                  value={formData.tipo_contrato}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, tipo_contrato: value })
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="TERMO_ADESAO">Termo de Adesão</SelectItem>
                    <SelectItem value="TERMO_RESPONSABILIDADE">
                      Termo de Responsabilidade
                    </SelectItem>
                    <SelectItem value="LGPD">LGPD</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obrigatorio" className="text-white">
                  Obrigatório
                </Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="obrigatorio"
                    checked={formData.obrigatorio}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, obrigatorio: checked })
                    }
                  />
                  <span className="text-sm text-gray-400">
                    {formData.obrigatorio
                      ? "Assinatura obrigatória"
                      : "Assinatura opcional"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conteudo" className="text-white">
                Conteúdo do Contrato *
              </Label>
              <Textarea
                id="conteudo"
                value={formData.conteudo}
                onChange={(e) =>
                  setFormData({ ...formData, conteudo: e.target.value })
                }
                className="bg-gray-800 border-gray-700 text-white min-h-[300px] font-mono text-sm"
                placeholder="Digite o conteúdo do contrato..."
              />
              <p className="text-xs text-gray-500">
                {formData.conteudo.length} caracteres
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogAberto(false)}
              disabled={salvando}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={salvando}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {contratoSelecionado ? "Atualizar" : "Criar"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={historicoAberto} onOpenChange={setHistoricoAberto}>
        <DialogContent className="max-w-4xl bg-gray-900 border-red-600/30 text-white max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <History className="h-5 w-5 text-blue-400" />
              Histórico de Assinaturas
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {contratoSelecionado?.titulo}
            </DialogDescription>
          </DialogHeader>

          {loadingHistorico ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-400" />
            </div>
          ) : historico.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-gray-600 mb-3" />
              <p className="text-gray-400">Nenhuma assinatura registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {historico.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">
                      {item.tipo_usuario}
                    </span>
                    <span className="text-xs text-gray-400">
                      Versão: v{item.versao_contrato}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>
                      <span className="text-gray-500">Assinado em:</span>
                      <p className="text-gray-300">
                        {format(
                          new Date(item.assinado_em),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </p>
                    </div>
                    {item.ip_address && (
                      <div>
                        <span className="text-gray-500">IP:</span>
                        <p className="text-gray-300">{item.ip_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Delete */}
      <AlertDialog
        open={deleteDialogAberto}
        onOpenChange={setDeleteDialogAberto}
      >
        <AlertDialogContent className="bg-gray-900 border-red-600/30 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir este contrato? Esta ação não pode
              ser desfeita. O histórico de assinaturas também será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-white hover:bg-gray-800">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletar}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
