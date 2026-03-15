import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ProdutoPedido } from './produto-pedido.entity';
import { UnidadeProduto } from './unidade-produto.entity';

@Entity({ name: 'produto_pedidos_itens' })
export class ProdutoPedidoItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pedido_id!: string;

  @ManyToOne(() => ProdutoPedido, (p) => p.itens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido!: ProdutoPedido;

  @Column({ type: 'uuid' })
  produto_id!: string;

  @ManyToOne(() => UnidadeProduto, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'produto_id' })
  produto!: UnidadeProduto;

  @Column({ default: 1 })
  quantidade!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  preco_unitario!: number;
}
