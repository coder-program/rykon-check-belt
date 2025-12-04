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
import { Aluno } from '../../people/entities/aluno.entity';
import { Plano } from './plano.entity';
import { Unidade } from '../../people/entities/unidade.entity';
import { Fatura } from './fatura.entity';

export enum StatusAssinatura {
  ATIVA = 'ATIVA',
  PAUSADA = 'PAUSADA',
  CANCELADA = 'CANCELADA',
  INADIMPLENTE = 'INADIMPLENTE',
  EXPIRADA = 'EXPIRADA',
}

export enum MetodoPagamento {
  PIX = 'PIX',
  CARTAO = 'CARTAO',
  BOLETO = 'BOLETO',
  DINHEIRO = 'DINHEIRO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

@Entity({ name: 'assinaturas', schema: 'teamcruz' })
export class Assinatura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @Column({ type: 'uuid' })
  plano_id: string;

  @ManyToOne(() => Plano, (plano) => plano.assinaturas)
  @JoinColumn({ name: 'plano_id' })
  plano: Plano;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({
    type: 'enum',
    enum: StatusAssinatura,
    default: StatusAssinatura.ATIVA,
  })
  status: StatusAssinatura;

  @Column({
    type: 'enum',
    enum: MetodoPagamento,
    default: MetodoPagamento.PIX,
  })
  metodo_pagamento: MetodoPagamento;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'date' })
  data_inicio: Date;

  @Column({ type: 'date', nullable: true })
  data_fim: Date;

  @Column({ type: 'date', nullable: true })
  proxima_cobranca: Date;

  @Column({ type: 'int', default: 0 })
  dia_vencimento: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  token_cartao: string;

  @Column({ type: 'jsonb', nullable: true })
  dados_pagamento: any;

  @OneToMany(() => Fatura, (fatura) => fatura.assinatura)
  faturas: Fatura[];

  @Column({ type: 'uuid', nullable: true })
  cancelado_por: string;

  @Column({ type: 'timestamp', nullable: true })
  cancelado_em: Date;

  @Column({ type: 'text', nullable: true })
  motivo_cancelamento: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
