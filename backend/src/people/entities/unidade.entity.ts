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

export interface HorariosFuncionamento {
  seg?: string; // "08:00-22:00"
  ter?: string;
  qua?: string;
  qui?: string;
  sex?: string;
  sab?: string;
  dom?: string;
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

  // Parametrização de aprovação de check-ins
  @Column({
    type: 'boolean',
    default: false,
    name: 'requer_aprovacao_checkin',
  })
  requer_aprovacao_checkin: boolean;

  // Dados estruturais (JSONB)
  @Column({ type: 'jsonb', nullable: true })
  horarios_funcionamento: HorariosFuncionamento | null;

  // Endereço
  @Column({ type: 'uuid', nullable: true })
  endereco_id: string | null;

  // Metadados
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
