"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Webhook,
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function WebhooksPage() {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [novoWebhook, setNovoWebhook] = useState({
    url: "",
    events: [] as string[],
  });

  const eventosDisponiveis = [
    "transaction.paid",
    "transaction.failed",
    "transaction.refunded",
    "transaction.chargeback",
    "establishment.approved",
    "establishment.disapproved",
  ];

  const carregarWebhooks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("rykon_pay_token");
      const response = await fetch(
        "https://rykon-pay-production.up.railway.app/api/webhooks",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.data || []);
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar webhooks");
    } finally {
      setLoading(false);
    }
  };

  const criarWebhook = async () => {
    try {
      const token = localStorage.getItem("rykon_pay_token");
      const response = await fetch(
        "https://rykon-pay-production.up.railway.app/api/webhooks",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(novoWebhook),
        }
      );

      if (response.ok) {
        toast.success("Webhook criado com sucesso!");
        setModalOpen(false);
        setNovoWebhook({ url: "", events: [] });
        carregarWebhooks();
      } else {
        toast.error("Erro ao criar webhook");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao criar webhook");
    }
  };

  const deletarWebhook = async (id: string) => {
    if (!confirm("Deseja realmente excluir este webhook?")) return;

    try {
      const token = localStorage.getItem("rykon_pay_token");
      const response = await fetch(
        `https://rykon-pay-production.up.railway.app/api/webhooks/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        toast.success("Webhook excluído!");
        carregarWebhooks();
      } else {
        toast.error("Erro ao excluir webhook");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao excluir webhook");
    }
  };

  useEffect(() => {
    carregarWebhooks();
  }, []);

  const toggleEvento = (evento: string) => {
    setNovoWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(evento)
        ? prev.events.filter((e) => e !== evento)
        : [...prev.events, evento],
    }));
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Webhooks</h1>
            <p className="text-gray-600">Eventos e notificações</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={carregarWebhooks} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Webhook</DialogTitle>
                <DialogDescription>
                  Configure um webhook para receber notificações
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>URL</Label>
                  <Input
                    placeholder="https://seu-dominio.com/webhook"
                    value={novoWebhook.url}
                    onChange={(e) =>
                      setNovoWebhook({ ...novoWebhook, url: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Eventos</Label>
                  <div className="space-y-2 mt-2">
                    {eventosDisponiveis.map((evento) => (
                      <label
                        key={evento}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={novoWebhook.events.includes(evento)}
                          onChange={() => toggleEvento(evento)}
                          className="rounded"
                        />
                        <span className="text-sm">{evento}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={criarWebhook} className="w-full">
                  Criar Webhook
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{webhooks.length} Webhook(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : webhooks.length > 0 ? (
            <div className="space-y-3">
              {webhooks.map((webhook: any) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-pink-100 rounded-lg">
                      <Webhook className="h-5 w-5 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{webhook.url}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {webhook.events?.map((evento: string) => (
                          <Badge
                            key={evento}
                            variant="outline"
                            className="text-xs"
                          >
                            {evento}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {webhook.active ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletarWebhook(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-12 text-gray-500">
              Nenhum webhook configurado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
