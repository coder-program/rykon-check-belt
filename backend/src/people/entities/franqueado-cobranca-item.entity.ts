import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FranqueadoCobranca } from './franqueado-cobranca.entity';

export type TipoItemCobranca =
  | 'MENSALIDADE_BASE'
  | 'MODULO_EXTRA'
  | 'SETUP'
  | 'DESCONTO'
  | 'AJUSTE';

@Entity({ name: 'franqueado_cobranca_itens', schema: 'teamcruz' })
export class FranqueadoCobrancaItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  cobranca_id!: string;

  @ManyToOne(() => FranqueadoCobranca, (c) => c.itens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cobranca_id' })
  cobranca!: FranqueadoCobranca;

  @Column({ type: 'varchar', length: 30, nullable: true })
  tipo_item!: TipoItemCobranca | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  descricao!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  referencia_id!: string | null;

  @Column({ type: 'int', default: 1 })
  quantidade!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valor_unitario!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valor_total!: number;
}
