import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Unidade } from './unidade.entity';

export enum TipoPeriodoGraduacao {
  MEIO_ANO = 'MEIO_ANO',
  FIM_ANO = 'FIM_ANO',
  ESPECIAL = 'ESPECIAL',
}

@Entity({ schema: 'teamcruz', name: 'graduacao_parametros' })
export class GraduacaoParametro {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao?: string;

  @Column({ type: 'date' })
  data_inicio: Date;

  @Column({ type: 'date' })
  data_fim: Date;

  @Column({
    type: 'varchar',
    length: 20,
    enum: TipoPeriodoGraduacao,
  })
  tipo_periodo: TipoPeriodoGraduacao;

  @Column({ type: 'integer', default: 4 })
  graus_minimos: number;

  @Column({ type: 'integer', default: 160 })
  presencas_minimas: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'uuid', nullable: true })
  unidade_id?: string;

  @ManyToOne(() => Unidade, { nullable: true })
  @JoinColumn({ name: 'unidade_id' })
  unidade?: Unidade;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
