import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AlunoConvenio } from './aluno-convenio.entity';
import { Presenca } from '../../presenca/entities/presenca.entity';
import { Convenio } from './convenio.entity';

export type TipoEventoConvenio = 'check_in' | 'check_out' | 'cancelamento';

@Entity({ schema: 'teamcruz', name: 'eventos_convenio' })
export class EventoConvenio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_convenio_id: string;

  @Column({ type: 'uuid' })
  presenca_id: string;

  @Column({ type: 'uuid' })
  convenio_id: string;

  @Column({ type: 'varchar', length: 50 })
  tipo_evento: TipoEventoConvenio;

  @Column({ type: 'boolean', default: false })
  enviado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  data_envio: Date;

  @Column({ type: 'integer', nullable: true })
  response_status: number;

  @Column({ type: 'jsonb', nullable: true })
  response_body: any;

  @Column({ type: 'integer', default: 0 })
  tentativas: number;

  @Column({ type: 'text', nullable: true })
  erro: string;

  @CreateDateColumn()
  created_at: Date;

  // Relacionamentos
  @ManyToOne(() => AlunoConvenio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_convenio_id' })
  aluno_convenio: AlunoConvenio;

  @ManyToOne(() => Presenca, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'presenca_id' })
  presenca: Presenca;

  @ManyToOne(() => Convenio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'convenio_id' })
  convenio: Convenio;
}
