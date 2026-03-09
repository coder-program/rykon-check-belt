import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FranqueadoContrato } from './franqueado-contrato.entity';

export type StatusParcela =
  | 'PENDENTE'
  | 'PAGA'
  | 'ATRASADA'
  | 'NEGOCIADA'
  | 'ISENTA'
  | 'CANCELADA';

@Entity({ name: 'franqueado_setup_parcelas', schema: 'teamcruz' })
export class FranqueadoSetupParcela {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  contrato_id!: string;

  @ManyToOne(() => FranqueadoContrato, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contrato_id' })
  contrato!: FranqueadoContrato;

  @Column({ type: 'int', default: 1 })
  numero_parcela!: number;

  @Column({ type: 'int', nullable: true })
  total_parcelas!: number | null;

  @Column({ type: 'date', nullable: true })
  data_vencimento!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valor_parcela!: number;

  @Column({ type: 'varchar', length: 20, nullable: true, default: 'PENDENTE' })
  status!: StatusParcela | null;

  @Column({ type: 'date', nullable: true })
  data_pagamento!: string | null;

  @Column({ type: 'text', nullable: true })
  observacao!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
