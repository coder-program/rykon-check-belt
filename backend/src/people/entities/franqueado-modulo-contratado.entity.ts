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

export type StatusModulo = 'ATIVO' | 'INATIVO' | 'CANCELADO' | 'PENDENTE';
export type TipoModulo = 'base' | 'extra';

@Entity({ name: 'franqueado_modulos_contratados', schema: 'teamcruz' })
export class FranqueadoModuloContratado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  contrato_id!: string;

  @ManyToOne(() => FranqueadoContrato, (c) => c.modulos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contrato_id' })
  contrato!: FranqueadoContrato;

  @Column({ length: 20 })
  codigo!: string;

  @Column({ length: 150 })
  nome_comercial!: string;

  @Column({ type: 'varchar', length: 20, nullable: true, default: 'extra' })
  tipo!: TipoModulo | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  valor_mensal_contratado!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  valor_setup_contratado!: number | null;

  @Column({ type: 'date', nullable: true })
  data_inicio!: string | null;

  @Column({ type: 'date', nullable: true })
  data_fim!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: 'ATIVO' })
  status!: StatusModulo | null;

  @Column({ type: 'text', nullable: true })
  observacoes!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
