import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Convenio } from './convenio.entity';
import { Unidade } from '../../people/entities/unidade.entity';

@Entity('unidade_convenios', { schema: 'teamcruz' })
@Index(['unidade_id', 'convenio_id'], { unique: true })
@Index(['unidade_id'])
export class UnidadeConvenio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'uuid' })
  convenio_id: string;

  @Column({ type: 'boolean', default: false })
  ativo: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location_id: string; // ID da unidade no sistema do convênio

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentual_repasse: number;

  @Column({ type: 'text', nullable: true })
  api_key_encrypted: string;

  @Column({ type: 'jsonb', nullable: true })
  configuracao_extra: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Unidade, { eager: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => Convenio, convenio => convenio.unidade_convenios, { eager: true })
  @JoinColumn({ name: 'convenio_id' })
  convenio: Convenio;

  // Métodos auxiliares
  getPercentualRepasse(): number {
    return this.percentual_repasse ?? this.convenio.percentual_repasse_padrao;
  }

  isConfigured(): boolean {
    return this.ativo && !!this.location_id;
  }
}
