import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';
import { Convenio } from './convenio.entity';

@Entity({ schema: 'teamcruz', name: 'configuracoes_convenio_unidade' })
@Unique('unique_unidade_convenio', ['unidade_id', 'convenio_id'])
export class ConfiguracaoConvenioUnidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'uuid' })
  convenio_id: string;

  @Column({ type: 'boolean', default: false })
  ativo: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  unidade_id_no_convenio: string; // ID da academia no sistema do convênio

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentual_repasse: number; // Ex: 70.00

  @Column({ type: 'varchar', length: 500, nullable: true })
  api_key: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unidade_parceira_id: string;

  @Column({ type: 'jsonb', nullable: true })
  configuracoes_extras: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Unidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => Convenio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'convenio_id' })
  convenio: Convenio;
}
