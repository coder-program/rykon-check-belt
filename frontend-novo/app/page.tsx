import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">Frontend Next.js + Tailwind 4</h1>
        <p className="text-muted-foreground">Projeto migrado do CRA (react-scripts) para Next.</p>
        <div className="flex gap-4 justify-center">
          <a className="btn btn-primary" href="/login">Ir para Login</a>
          <a className="btn" href="/dashboard">Ir para Dashboard</a>
          <a className="btn" href="/teamcruz">TeamCruz</a>
        </div>
      </div>
    </div>
  );
}
