import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Aluno } from '../../people/entities/aluno.entity';
import { Unidade } from '../../people/entities/unidade.entity';
import { ProdutoPedidoItem } from './produto-pedido-item.entity';
import { Fatura } from '../../financeiro/entities/fatura.entity';

export enum StatusPedido {
  PENDENTE  = 'PENDENTE',
  APROVADO  = 'APROVADO',
  RECUSADO  = 'RECUSADO',
  CANCELADO = 'CANCELADO',
  ESTORNADO = 'ESTORNADO',
}

export enum MetodoPagamento {
  PIX    = 'PIX',
  BOLETO = 'BOLETO',
  CARTAO = 'CARTAO',
}

@Entity({ name: 'produto_pedidos', schema: 'teamcruz' })
export class ProdutoPedido {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  aluno_id!: string;

  @ManyToOne(() => Aluno, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'aluno_id' })
  aluno!: Aluno;

  @Column({ type: 'uuid' })
  unidade_vendedora_id!: string;

  @ManyToOne(() => Unidade, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unidade_vendedora_id' })
  unidade_vendedora!: Unidade;

  @Column({
    type: 'enum', enum: StatusPedido,
    default: StatusPedido.PENDENTE,
  })
  status_pagamento!: StatusPedido;

  @Column({ type: 'enum', enum: MetodoPagamento, nullable: true })
  metodo_pagamento!: MetodoPagamento | null;

  @Column({ default: 1 })
  parcelas!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  valor_total_produtos!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  taxa_gateway!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  taxa_plataforma_split!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  valor_liquido_unidade!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transacao_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  fatura_id!: string | null;

  @ManyToOne(() => Fatura, { nullable: true, eager: false })
  @JoinColumn({ name: 'fatura_id' })
  fatura!: Fatura | null;

  @Column({ type: 'timestamptz', nullable: true })
  pago_em!: Date | null;

  @OneToMany(() => ProdutoPedidoItem, (item) => item.pedido, { cascade: true, eager: true })
  itens!: ProdutoPedidoItem[];

  @CreateDateColumn({ name: 'criado_em' })
  criado_em!: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em!: Date;
}
