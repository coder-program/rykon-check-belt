export type ProfessorEspecialidade =
  | 'No-Gi'
  | 'Gi'
  | 'Competição'
  | 'Kids'
  | 'Autodefesa'
  | 'Condicionamento';

export class Professor {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento: Date;
  genero: 'masculino' | 'feminino' | 'outro';
  // endereco removido: usar vinculos_endereco

  faixa: string; // faixa do professor
  certificacoes: string[]; // CBJJ, IBJJF etc
  unidades_atua: string[]; // IDs ou nomes de unidades
  data_contratacao: Date;
  salario_base: number;
  carga_horaria_semana: number; // horas
  especialidades: ProfessorEspecialidade[];
  ativo: boolean;

  created_at: Date;
  updated_at: Date;
}
