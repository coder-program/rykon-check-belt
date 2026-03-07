import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Unidade } from './unidade.entity';

@Unique(['unidade_id', 'modalidade_id'])
@Entity({ name: 'config_aula_experimental', schema: 'teamcruz' })
export class ConfigAulaExperimental {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'uuid' })
  modalidade_id: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  /** Quantas aulas experimentais um prospect pode agendar para esta modalidade */
  @Column({ type: 'int', default: 1 })
  max_aulas: number;

  @Column({ type: 'int', default: 60 })
  duracao_minutos: number;

  @CreateDateColumn()
  criado_em: Date;

  @UpdateDateColumn()
  atualizado_em: Date;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;
}
