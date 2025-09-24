import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">Frontend Next.js + Tailwind 4</h1>
        <p className="text-muted-foreground">
          Projeto migrado do CRA (react-scripts) para Next.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a className="btn btn-primary" href="/login">
            Ir para Login
          </a>
          <a className="btn" href="/dashboard">
            Ir para Dashboard
          </a>
          <a className="btn" href="/teamcruz">
            TeamCruz
          </a>
          <a className="btn bg-green-600 text-white hover:bg-green-700" href="/checkin">
            Check-in Presenças
          </a>
          <a className="btn" href="/alunos">
            Alunos
          </a>
          <a className="btn" href="/professores">
            Professores
          </a>
          <a className="btn" href="/franqueados">
            Franqueados
          </a>
          <a className="btn" href="/unidades">
            Unidades
          </a>
          <a className="btn btn-outline" href="/registro">
            Auto-cadastro de Aluno
          </a>
          <a className="btn btn-outline" href="/aprovacao-alunos">
            Aprovação de Alunos
          </a>
          <a className="btn btn-outline" href="/meus-alunos">
            Meus Alunos
          </a>
        </div>
      </div>
    </div>
  );
}
