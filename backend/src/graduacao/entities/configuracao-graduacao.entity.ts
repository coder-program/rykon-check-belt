import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';

export interface ConfigFaixa {
  tempo_minimo_meses: number | null;
  aulas_por_grau: number;
  graus_maximos: number;
}

export interface ConfigFaixas {
  [faixaCodigo: string]: ConfigFaixa;
}

@Entity('configuracoes_graduacao', { schema: 'teamcruz' })
export class ConfiguracaoGraduacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  unidade_id: string;

  @ManyToOne(() => Unidade, { eager: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({ type: 'jsonb' })
  config_faixas: ConfigFaixas;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 75.0 })
  percentual_frequencia_minima: number;

  @Column({ type: 'jsonb', nullable: true })
  config_adicional: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
