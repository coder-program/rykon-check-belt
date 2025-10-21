import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Aluno } from '../../people/entities/aluno.entity';
import { FaixaDef } from './faixa-def.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum OrigemGrau {
  AUTOMATICO = 'automatico',
  MANUAL = 'manual',
  EVENTO = 'evento',
}

@Entity({ name: 'historico_graus', schema: 'teamcruz' })
@Index(['aluno_id'])
export class HistoricoGraus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  aluno_id: string;

  @Column({ type: 'uuid' })
  faixa_id: string;

  @Column({ type: 'int' })
  grau_numero: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  data_concessao: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrigemGrau.AUTOMATICO,
    enum: OrigemGrau,
  })
  origem_grau: OrigemGrau;

  @Column({ type: 'int', nullable: true })
  aulas_acumuladas?: number;

  @Column({ type: 'text', nullable: true })
  justificativa?: string;

  @Column({ type: 'text', nullable: true })
  certificado_url?: string;

  @Column({ type: 'uuid', nullable: true })
  evento_id?: string;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  @CreateDateColumn()
  created_at: Date;

  // Relacionamentos
  @ManyToOne(() => Aluno, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => FaixaDef, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'faixa_id' })
  faixa: FaixaDef;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  criadoPor?: Usuario;
}
