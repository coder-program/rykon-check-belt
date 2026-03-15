import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { FranqueadoContrato } from './franqueado-contrato.entity';
import { FranqueadoCobrancaItem } from './franqueado-cobranca-item.entity';

export type StatusCobranca =
  | 'PENDENTE'
  | 'PAGA'
  | 'ATRASADA'
  | 'NEGOCIADA'
  | 'ISENTA'
  | 'CANCELADA';

export type OrigemCobranca = 'AUTOMATICA' | 'MANUAL';

@Entity({ name: 'franqueado_cobrancas' })
export class FranqueadoCobranca {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  contrato_id!: string;

  @ManyToOne(() => FranqueadoContrato, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'contrato_id' })
  contrato!: FranqueadoContrato;

  // ── Identificação ────────────────────────────────────────────
  @Column({ type: 'varchar', length: 7, nullable: true }) // e.g. "2026-03"
  competencia!: string | null;

  @Column({ type: 'date', nullable: true })
  data_emissao!: string | null;

  @Column({ type: 'date', nullable: true })
  data_vencimento!: string | null;

  // ── Valores ─────────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valor_total!: number;

  // ── Status ──────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 20, nullable: true, default: 'PENDENTE' })
  status!: StatusCobranca | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: 'MANUAL' })
  origem!: OrigemCobranca | null;

  @Column({ type: 'boolean', default: false })
  carencia_aplicada!: boolean;

  // ── Pagamento ────────────────────────────────────────────────
  @Column({ type: 'date', nullable: true })
  data_pagamento!: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  forma_pagamento!: string | null;

  @Column({ type: 'text', nullable: true })
  observacao!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // ── Relations ────────────────────────────────────────────────
  @OneToMany(() => FranqueadoCobrancaItem, (i) => i.cobranca, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  itens!: FranqueadoCobrancaItem[];
}
