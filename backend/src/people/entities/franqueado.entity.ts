import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Endereco } from '../../enderecos/endereco.entity';

export type SituacaoFranqueado = 'ATIVA' | 'INATIVA' | 'EM_HOMOLOGACAO';

@Entity({ name: 'franqueados', schema: 'teamcruz' })
export class Franqueado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identificação
  @Column({ length: 150 })
  nome: string;

  @Column({ length: 18, unique: true })
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
  @Column({ length: 120, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  telefone: string; // Mantido para compatibilidade

  @Column({ length: 20, nullable: true })
  telefone_fixo: string;

  @Column({ length: 20, nullable: true })
  telefone_celular: string;

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

  // Endereço
  @Column({ type: 'uuid', nullable: true })
  endereco_id: string;

  @ManyToOne(() => Endereco, { eager: false })
  @JoinColumn({ name: 'endereco_id' })
  endereco?: Endereco;

  // Dados do Responsável Legal
  @Column({ length: 150, nullable: true })
  responsavel_nome: string;

  @Column({ length: 14, nullable: true })
  responsavel_cpf: string;

  @Column({ length: 100, nullable: true })
  responsavel_cargo: string;

  @Column({ length: 120, nullable: true })
  responsavel_email: string;

  @Column({ length: 20, nullable: true })
  responsavel_telefone: string;

  // Informações da Franquia
  @Column({ type: 'int', nullable: true })
  ano_fundacao: number;

  @Column({ type: 'text', nullable: true })
  missao: string;

  @Column({ type: 'text', nullable: true })
  visao: string;

  @Column({ type: 'text', nullable: true })
  valores: string;

  @Column({ type: 'text', nullable: true })
  historico: string;

  @Column({ length: 500, nullable: true })
  logotipo_url: string;

  // Relacionamento Hierárquico (Matriz/Filial)
  @Column({ type: 'uuid', nullable: true })
  id_matriz: string | null; // Se NULL = é matriz, se preenchido = é filial

  @ManyToOne(() => Franqueado, { nullable: true })
  @JoinColumn({ name: 'id_matriz' })
  matriz?: Franqueado;

  // Gestão
  @Column({ type: 'simple-array', nullable: true })
  unidades_gerencia: string[]; // IDs das unidades

  // Campo calculado (não persiste no banco)
  total_unidades?: number; // Quantidade de academias credenciadas

  @Column({ type: 'date', nullable: true })
  data_contrato: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  taxa_franquia: number;

  @Column({ type: 'jsonb', nullable: true })
  dados_bancarios: {
    banco: string;
    agencia: string;
    conta: string;
    titular: string;
    documento: string;
  } | null;

  // Status
  @Column({ length: 20, default: 'ATIVA' })
  situacao: SituacaoFranqueado;

  @Column({ default: true })
  ativo: boolean; // Mantido para compatibilidade

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
