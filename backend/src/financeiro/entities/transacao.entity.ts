import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Aluno } from '../../people/entities/aluno.entity';
import { Fatura } from './fatura.entity';
import { Despesa } from './despesa.entity';
import { Unidade } from '../../people/entities/unidade.entity';
import { MetodoPagamento } from './assinatura.entity';

export enum TipoTransacao {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
}

export enum OrigemTransacao {
  FATURA = 'FATURA',
  VENDA = 'VENDA',
  DESPESA = 'DESPESA',
  MANUAL = 'MANUAL',
  ESTORNO = 'ESTORNO',
  GYMPASS = 'GYMPASS',
  CORPORATE = 'CORPORATE',
}

export enum StatusTransacao {
  CONFIRMADA = 'CONFIRMADA',
  PENDENTE = 'PENDENTE',
  CANCELADA = 'CANCELADA',
  ESTORNADA = 'ESTORNADA',
}

export enum CategoriaTransacao {
  SISTEMA = 'SISTEMA',
  MENSALIDADE = 'MENSALIDADE',
  PRODUTO = 'PRODUTO',
  AULA_AVULSA = 'AULA_AVULSA',
  COMPETICAO = 'COMPETICAO',
  TAXA = 'TAXA',
  ALUGUEL = 'ALUGUEL',
  SALARIO = 'SALARIO',
  FORNECEDOR = 'FORNECEDOR',
  UTILIDADE = 'UTILIDADE',
  OUTRO = 'OUTRO',
}

@Entity({ name: 'transacoes', schema: 'teamcruz' })
export class Transacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TipoTransacao,
  })
  tipo: TipoTransacao;

  @Column({
    type: 'enum',
    enum: OrigemTransacao,
  })
  origem: OrigemTransacao;

  @Column({
    type: 'enum',
    enum: CategoriaTransacao,
    default: CategoriaTransacao.OUTRO,
  })
  categoria: CategoriaTransacao;

  @Column({ type: 'varchar', length: 255 })
  descricao: string;

  @Column({ type: 'uuid', nullable: true })
  aluno_id: string;

  @ManyToOne(() => Aluno, { nullable: true })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @Column({ type: 'uuid', nullable: true })
  unidade_id: string;

  @ManyToOne(() => Unidade, { nullable: true })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({ type: 'uuid', nullable: true })
  fatura_id: string;

  @ManyToOne(() => Fatura, (fatura) => fatura.transacoes, { nullable: true })
  @JoinColumn({ name: 'fatura_id' })
  fatura: Fatura;

  @Column({ type: 'uuid', nullable: true })
  despesa_id: string;

  @ManyToOne(() => Despesa, (despesa) => despesa.transacoes, { nullable: true })
  @JoinColumn({ name: 'despesa_id' })
  despesa: Despesa;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'date' })
  data: Date;

  @Column({
    type: 'enum',
    enum: StatusTransacao,
    default: StatusTransacao.CONFIRMADA,
  })
  status: StatusTransacao;

  @Column({ type: 'varchar', length: 50, nullable: true })
  metodo_pagamento: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  comprovante: string;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ type: 'uuid', nullable: true })
  criado_por: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
