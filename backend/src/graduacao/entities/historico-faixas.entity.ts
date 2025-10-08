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

@Entity('historico_faixas')
@Index(['aluno_id'])
export class HistoricoFaixas {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  aluno_id: string;

  @Column({ type: 'uuid', nullable: true })
  faixa_origem_id?: string;

  @Column({ type: 'uuid' })
  faixa_destino_id: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  data_promocao: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  evento?: string;

  @Column({ type: 'text', nullable: true })
  certificado_url?: string;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  @CreateDateColumn()
  created_at: Date;

  // Relacionamentos
  @ManyToOne(() => Aluno, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => FaixaDef, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'faixa_origem_id' })
  faixaOrigem?: FaixaDef;

  @ManyToOne(() => FaixaDef, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'faixa_destino_id' })
  faixaDestino: FaixaDef;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  criadoPor?: Usuario;
}
