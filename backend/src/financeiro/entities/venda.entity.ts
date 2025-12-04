import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Aluno } from '../../people/entities/aluno.entity';
import { Unidade } from '../../people/entities/unidade.entity';
import { Fatura } from './fatura.entity';

export enum StatusVenda {
  PENDENTE = 'PENDENTE',
  PROCESSANDO = 'PROCESSANDO',
  PAGO = 'PAGO',
  AGUARDANDO = 'AGUARDANDO',
  FALHOU = 'FALHOU',
  CANCELADO = 'CANCELADO',
  ESTORNADO = 'ESTORNADO',
}

export enum MetodoPagamentoVenda {
  PIX = 'PIX',
  CARTAO = 'CARTAO',
  BOLETO = 'BOLETO',
  DINHEIRO = 'DINHEIRO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

@Entity('vendas', { schema: 'teamcruz' })
export class Venda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  numero_venda: string;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @Column({ type: 'uuid', nullable: true })
  unidade_id: string;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({ type: 'uuid', nullable: true })
  fatura_id: string;

  @ManyToOne(() => Fatura, { nullable: true })
  @JoinColumn({ name: 'fatura_id' })
  fatura: Fatura;

  @Column({ type: 'varchar', length: 255 })
  descricao: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({
    type: 'enum',
    enum: MetodoPagamentoVenda,
    default: MetodoPagamentoVenda.PIX,
  })
  metodo_pagamento: MetodoPagamentoVenda;

  @Column({
    type: 'enum',
    enum: StatusVenda,
    default: StatusVenda.PENDENTE,
  })
  status: StatusVenda;

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

  @Column({ type: 'timestamp', nullable: true })
  data_pagamento: Date;

  @Column({ type: 'timestamp', nullable: true })
  data_expiracao: Date;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ip_origem: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
