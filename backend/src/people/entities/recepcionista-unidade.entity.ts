import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Unidade } from './unidade.entity';

export enum TurnoTrabalho {
  MANHA = 'MANHA',
  TARDE = 'TARDE',
  NOITE = 'NOITE',
  INTEGRAL = 'INTEGRAL',
}

@Entity('recepcionista_unidades', { schema: 'teamcruz' })
export class RecepcionistaUnidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relacionamentos
  @Column('uuid', { name: 'usuario_id' })
  usuario_id: string;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column('uuid', { name: 'unidade_id' })
  unidade_id: string;

  @ManyToOne(() => Unidade, { eager: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade?: Unidade;

  // Informações do vínculo
  @Column({ type: 'varchar', length: 100, nullable: true })
  cargo?: string;

  @Column({
    type: 'enum',
    enum: TurnoTrabalho,
    nullable: true,
  })
  turno?: TurnoTrabalho;

  @Column({ type: 'time', nullable: true })
  horario_entrada?: string;

  @Column({ type: 'time', nullable: true })
  horario_saida?: string;

  @Column('varchar', { array: true, nullable: true })
  dias_semana?: string[];

  // Status
  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'date', nullable: true, default: () => 'CURRENT_DATE' })
  data_inicio?: Date;

  @Column({ type: 'date', nullable: true })
  data_fim?: Date;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  // Auditoria
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column('uuid', { nullable: true })
  created_by?: string;

  @Column('uuid', { nullable: true })
  updated_by?: string;
}
