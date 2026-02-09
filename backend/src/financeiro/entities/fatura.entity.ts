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
import { Assinatura } from './assinatura.entity';
import { Aluno } from '../../people/entities/aluno.entity';
import { Transacao } from './transacao.entity';
import { MetodoPagamento } from './assinatura.entity';
import { DateTransformer } from '../../common/transformers/date.transformer';

export enum StatusFatura {
  PENDENTE = 'PENDENTE',
  PAGA = 'PAGA',
  VENCIDA = 'VENCIDA',
  CANCELADA = 'CANCELADA',
  PARCIALMENTE_PAGA = 'PARCIALMENTE_PAGA',
  NEGOCIADA = 'NEGOCIADA',
}

@Entity({ name: 'faturas', schema: 'teamcruz' })
export class Fatura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  assinatura_id: string;

  @ManyToOne(() => Assinatura, (assinatura) => assinatura.faturas, {
    nullable: true,
  })
  @JoinColumn({ name: 'assinatura_id' })
  assinatura: Assinatura;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @Column({ type: 'varchar', length: 50, unique: true })
  numero_fatura: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
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
  valor_original: number;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    default: 0,
    transformer: {
      to: (value) => value,
      from: (value) => parseFloat(value) || 0,
    }
  })
  valor_desconto: number;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    default: 0,
    transformer: {
      to: (value) => value,
      from: (value) => parseFloat(value) || 0,
    }
  })
  valor_acrescimo: number;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2,
    transformer: {
      to: (value) => value,
      from: (value) => parseFloat(value) || 0,
    }
  })
  valor_total: number;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    default: 0,
    transformer: {
      to: (value) => value,
      from: (value) => parseFloat(value) || 0,
    }
  })
  valor_pago: number;

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
  data_pagamento: Date | null;

  @Column({
    type: 'enum',
    enum: StatusFatura,
    default: StatusFatura.PENDENTE,
  })
  status: StatusFatura;

  @Column({ type: 'varchar', length: 50, nullable: true })
  metodo_pagamento: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gateway_payment_id: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  link_pagamento: string;

  @Column({ type: 'text', nullable: true })
  qr_code_pix: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  codigo_barras_boleto: string;

  @Column({ type: 'jsonb', nullable: true })
  dados_gateway: any;

  @OneToMany(() => Transacao, (transacao) => transacao.fatura)
  transacoes: Transacao[];

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ type: 'uuid', nullable: true })
  criado_por: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
