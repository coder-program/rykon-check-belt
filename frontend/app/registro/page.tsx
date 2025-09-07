"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { http } from "@/lib/api";
import { listProfessores } from "@/lib/peopleApi";

function ageAtEndOfYear(dateStr?: string) {
  if (!dateStr) return undefined;
  const dob = new Date(dateStr);
  const end = new Date(new Date().getFullYear(), 11, 31);
  const diff = end.getTime() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}
function categoriaKidsIBJJF(dateStr?: string) {
  const idade = ageAtEndOfYear(dateStr);
  if (idade === undefined) return null;
  if (idade >= 13 && idade <= 15) return "Infanto-Juvenil";
  if (idade >= 10 && idade <= 12) return "Infantil";
  if (idade >= 7 && idade <= 9) return "Mirim";
  if (idade >= 4 && idade <= 6) return "Pré-Mirim";
  return null;
}

export default function RegistroAlunoPage() {
  const router = useRouter();
  const [form, setForm] = React.useState({
    nome: "",
    email: "",
    password: "",
    academia_unidade: "",
    professor_id: "",
    data_nascimento: "",
    peso: "",
    faixa: "Branca",
    graus: 0,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [unidades, setUnidades] = React.useState<string[]>([]);
  const [professores, setProfessores] = React.useState<any[]>([]);

  React.useEffect(() => {
    // tentar carregar unidades da config localStorage
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("config_unidades");
      if (raw) {
        try {
          const arr = JSON.parse(raw);
          setUnidades(arr.map((u: any) => u.nome || u.id));
        } catch {}
      } else {
        setUnidades(["Matriz - Centro", "Unidade Norte", "Unidade Sul"]);
      }
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!form.academia_unidade) {
        setProfessores([]);
        return;
      }
      try {
        const page = await listProfessores({
          page: 1,
          pageSize: 50,
          unidade: form.academia_unidade,
        });
        setProfessores(page.items || []);
      } catch {
        setProfessores([]);
      }
    })();
  }, [form.academia_unidade]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const categoria_ibjjf =
        idadeAno !== undefined && idadeAno < 16
          ? categoriaKidsIBJJF(form.data_nascimento) || undefined
          : undefined;
      await http("/auth/register", {
        method: "POST",
        body: { ...form, categoria_ibjjf },
      });
      router.push("/teamcruz");
    } catch (e: any) {
      setError(e.message || "Erro no registro");
    } finally {
      setLoading(false);
    }
  };

  const idadeAno = ageAtEndOfYear(form.data_nascimento);
  const faixaEtaria =
    idadeAno === undefined
      ? ""
      : idadeAno > 18
        ? "Adulto"
        : idadeAno >= 16
          ? "Juvenil"
          : "Infantil";
  const faixasKids = ["Branca", "Cinza", "Amarela", "Laranja", "Verde"];
  const faixasAdulto = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];
  const opcoesFaixa =
    faixaEtaria === "Infantil" || faixaEtaria === "Juvenil"
      ? faixasKids
      : faixasAdulto;

  React.useEffect(() => {
    if (!opcoesFaixa.includes(form.faixa)) {
      setForm((f) => ({ ...f, faixa: "Branca" }));
    }
  }, [faixaEtaria]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-3 bg-white p-4 rounded border"
      >
        <h1 className="text-xl font-bold">Cadastro de Aluno</h1>
        {error && <div className="alert alert-error text-sm">{error}</div>}
        <input
          className="input input-bordered w-full"
          placeholder="Nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          required
        />
        <input
          className="input input-bordered w-full"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="input input-bordered w-full"
          placeholder="Senha"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium">Unidade</label>
          <select
            className="select select-bordered w-full"
            value={form.academia_unidade}
            onChange={(e) =>
              setForm({
                ...form,
                academia_unidade: e.target.value,
                professor_id: "",
              })
            }
            required
          >
            <option value="">Selecione a unidade</option>
            {unidades.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium">Professor</label>
          <select
            className="select select-bordered w-full"
            value={form.professor_id}
            onChange={(e) => setForm({ ...form, professor_id: e.target.value })}
            required
          >
            <option value="">Selecione o professor</option>
            {professores.map((p) => (
              <option key={p.id || p.nome} value={p.id || p.nome}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium">
            Data de Nascimento{" "}
            {idadeAno !== undefined && (
              <span className="badge badge-outline ml-2">
                {idadeAno} anos em {new Date().getFullYear()} • {faixaEtaria}
                {idadeAno !== undefined &&
                idadeAno < 16 &&
                categoriaKidsIBJJF(form.data_nascimento)
                  ? ` • ${categoriaKidsIBJJF(form.data_nascimento)}`
                  : ""}
              </span>
            )}
          </label>
          <input
            className="input input-bordered w-full"
            type="date"
            value={form.data_nascimento}
            onChange={(e) =>
              setForm({ ...form, data_nascimento: e.target.value })
            }
            required
          />
        </div>

        <div className="flex gap-2">
          <input
            className="input input-bordered w-full"
            placeholder="Peso (kg)"
            value={form.peso}
            onChange={(e) => setForm({ ...form, peso: e.target.value })}
          />
          <select
            className="select select-bordered"
            value={form.faixa}
            onChange={(e) => setForm({ ...form, faixa: e.target.value })}
          >
            {opcoesFaixa.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>
    </div>
  );
}
