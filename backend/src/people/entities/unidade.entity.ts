import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Franqueado } from './franqueado.entity';

export enum StatusUnidade {
  ATIVA = 'ATIVA',
  INATIVA = 'INATIVA',
  HOMOLOGACAO = 'HOMOLOGACAO',
}

export enum PapelResponsavel {
  PROPRIETARIO = 'PROPRIETARIO',
  GERENTE = 'GERENTE',
  INSTRUTOR = 'INSTRUTOR',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
}

export interface HorariosFuncionamento {
  seg?: string; // "08:00-22:00"
  ter?: string;
  qua?: string;
  qui?: string;
  sex?: string;
  sab?: string;
  dom?: string;
}

export enum Modalidade {
  INFANTIL = 'INFANTIL',
  ADULTO = 'ADULTO',
  NO_GI = 'NO-GI',
  COMPETICAO = 'COMPETICAO',
  FEMININO = 'FEMININO',
  AUTODEFESA = 'AUTODEFESA',
  CONDICIONAMENTO = 'CONDICIONAMENTO',
}

@Entity({ name: 'unidades', schema: 'teamcruz' })
export class Unidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Referência ao franqueado
  @Column({ type: 'uuid' })
  franqueado_id: string;

  @ManyToOne(() => Franqueado)
  @JoinColumn({ name: 'franqueado_id' })
  franqueado: Franqueado | null;

  // Identificação da Unidade
  @Column({ length: 150 })
  nome: string;

  @Column({ length: 18, nullable: true })
  cnpj: string;

  @Column({ length: 200, nullable: true })
  razao_social: string;

  @Column({ length: 150, nullable: true })
  nome_fantasia: string;

  @Column({ length: 20, nullable: true })
  inscricao_estadual: string;

  @Column({ length: 20, nullable: true })
  inscricao_municipal: string;

  @Column({ length: 50, nullable: true })
  codigo_interno: string;

  // Contato
  @Column({ length: 20, nullable: true })
  telefone_fixo: string;

  @Column({ length: 20, nullable: true })
  telefone_celular: string;

  @Column({ length: 120, nullable: true })
  email: string;

  @Column({ length: 200, nullable: true })
  website: string;

  @Column({ type: 'jsonb', nullable: true })
  redes_sociais: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
  } | null;

  @Column({
    type: 'enum',
    enum: StatusUnidade,
    default: StatusUnidade.HOMOLOGACAO,
  })
  status: StatusUnidade;

  // Dados do responsável pela unidade
  @Column({ length: 150 })
  responsavel_nome: string;

  @Column({ length: 14 })
  responsavel_cpf: string;

  @Column({ type: 'enum', enum: PapelResponsavel })
  responsavel_papel: PapelResponsavel;

  @Column({ length: 120 })
  responsavel_contato: string;

  // Estrutura da Unidade
  @Column({ type: 'int', nullable: true })
  qtde_tatames: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area_tatame_m2: number | null;

  @Column({ type: 'int', nullable: true })
  capacidade_max_alunos: number | null;

  @Column({ type: 'int', default: 0 })
  qtde_instrutores: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_plano_padrao: number | null;

  // Dados estruturais (JSONB)
  @Column({ type: 'jsonb', nullable: true })
  horarios_funcionamento: HorariosFuncionamento | null;

  @Column({ type: 'jsonb', nullable: true })
  modalidades: Modalidade[] | null;

  // Responsável Técnico (Instrutor Principal)
  @Column({ type: 'uuid', nullable: true })
  instrutor_principal_id: string | null;

  // Endereço
  @Column({ type: 'uuid', nullable: true })
  endereco_id: string | null;

  // Metadados
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
