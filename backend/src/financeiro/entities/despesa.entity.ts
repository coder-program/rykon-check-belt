import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';
import { Transacao } from './transacao.entity';
import { DateTransformer } from '../../common/transformers/date.transformer';

export enum CategoriaDespesa {
  SISTEMA = 'SISTEMA',
  ALUGUEL = 'ALUGUEL',
  AGUA = 'AGUA',
  LUZ = 'LUZ',
  INTERNET = 'INTERNET',
  TELEFONE = 'TELEFONE',
  SALARIO = 'SALARIO',
  FORNECEDOR = 'FORNECEDOR',
  MANUTENCAO = 'MANUTENCAO',
  MATERIAL = 'MATERIAL',
  LIMPEZA = 'LIMPEZA',
  MARKETING = 'MARKETING',
  TAXA = 'TAXA',
  OUTRO = 'OUTRO',
}

export enum RecorrenciaDespesa {
  UNICA = 'UNICA',
  MENSAL = 'MENSAL',
  BIMESTRAL = 'BIMESTRAL',
  TRIMESTRAL = 'TRIMESTRAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL',
}

export enum StatusDespesa {
  A_PAGAR = 'A_PAGAR',
  PAGA = 'PAGA',
  ATRASADA = 'ATRASADA',
  CANCELADA = 'CANCELADA',
  PARCIALMENTE_PAGA = 'PARCIALMENTE_PAGA',
}

@Entity({ name: 'despesas', schema: 'teamcruz' })
export class Despesa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({
    type: 'enum',
    enum: CategoriaDespesa,
  })
  categoria: CategoriaDespesa;

  @Column({ type: 'varchar', length: 255 })
  descricao: string;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2,
    transformer: {
      to: (value) => value,
      from: (value) => parseFloat(value) || 0,
    }
  })
  valor: number;

  @Column({ 
    type: 'date',
    transformer: DateTransformer,
  })
  data_vencimento: Date;

  @Column({ 
    type: 'date', 
    nullable: true,
    transformer: DateTransformer,
  })
  data_pagamento: Date;

  @Column({
    type: 'enum',
    enum: RecorrenciaDespesa,
    default: RecorrenciaDespesa.UNICA,
  })
  recorrencia: RecorrenciaDespesa;

  @Column({
    type: 'enum',
    enum: StatusDespesa,
    default: StatusDespesa.A_PAGAR,
  })
  status: StatusDespesa;

  @Column({ type: 'varchar', length: 500, nullable: true })
  anexo: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fornecedor: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  numero_documento: string;

  @OneToMany(() => Transacao, (transacao) => transacao.despesa)
  transacoes: Transacao[];

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ type: 'uuid', nullable: true })
  criado_por: string;

  @Column({ type: 'uuid', nullable: true })
  pago_por: string;

  @Column({ type: 'boolean', default: false })
  lembrete_enviado: boolean;

  @Column({ 
    type: 'date', 
    nullable: true,
    transformer: DateTransformer,
  })
  data_proximo_vencimento: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
