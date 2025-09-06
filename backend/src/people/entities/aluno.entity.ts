export class Aluno {
  id: string;

  // Dados básicos
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento: Date;
  idade?: number; // calculado
  genero: 'masculino' | 'feminino' | 'outro';
  // endereco removido: usar vinculos_endereco
  peso: number; // em kg
  altura: number; // em cm
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;

  // Dados específicos de jiu-jitsu
  matricula: string; // código único do aluno
  faixa: string; // Branca, Azul, Roxa, Marrom, Preta, etc.
  graus: number; // 0-4 graus na faixa atual
  data_inicio_jiu_jitsu: Date;
  academia_unidade: string; // qual unidade/franquia
  turma: string; // Infantil, Adulto Iniciante, Competição, etc.
  categoria_peso: string; // calculado baseado no peso
  objetivo: string; // Saúde, Competição, Defesa Pessoal, etc.

  // Classificação etária/competição
  categoria_ibjjf: string | null; // Pré-Mirim, Mirim, Infantil, Infanto-Juvenil, etc.

  // Dados de frequência e presença
  dias_ausentes: number;
  dias_consecutivos: number;
  ultima_presenca: Date | null;
  total_aulas_mes: number;
  percentual_frequencia: number; // %

  // Vínculos e status
  professor_id: string | null;
  status_validacao: 'pendente' | 'aprovado' | 'rejeitado';

  // Dados financeiros
  plano: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  valor_mensalidade: number;
  status_pagamento: 'em_dia' | 'atrasado' | 'cancelado';
  data_vencimento: Date;

  // Dados médicos e observações
  restricoes_medicas: string | null;
  observacoes: string | null;
  liberacao_imagem: boolean; // autoriza uso de fotos/videos

  // Dados de controle
  ativo: boolean;
  data_matricula: Date;
  data_inativacao: Date | null;
  motivo_inativacao: string | null;

  // Metadados
  created_at: Date;
  updated_at: Date;
}
