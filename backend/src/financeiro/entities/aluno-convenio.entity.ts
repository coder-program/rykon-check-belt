import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Aluno } from '../../people/entities/aluno.entity';
import { Convenio } from './convenio.entity';
import { Unidade } from '../../people/entities/unidade.entity';

export enum AlunoConvenioStatus {
  ATIVO = 'ativo',
  CANCELADO = 'cancelado',
  PAUSADO = 'pausado',
  EXPIRADO = 'expirado',
}

@Entity('aluno_convenios', { schema: 'teamcruz' })
@Index(['convenio_id', 'convenio_user_id'], { unique: true })
@Index(['aluno_id'])
@Index(['status'])
@Index(['convenio_user_id'])
@Index(['unidade_id'])
export class AlunoConvenio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @Column({ type: 'uuid' })
  convenio_id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'varchar', length: 255 })
  convenio_user_id: string; // ID no sistema do convênio (gpw-xxx, tp-xxx)

  @Column({ 
    type: 'varchar', 
    length: 20, 
    default: AlunoConvenioStatus.ATIVO 
  })
  status: AlunoConvenioStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  data_ativacao: Date;

  @Column({ type: 'timestamp', nullable: true })
  data_cancelamento: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  data_expiracao: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'jsonb', nullable: true })
  dados_adicionais: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Aluno, aluno => aluno.convenios, { eager: false })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => Convenio, convenio => convenio.aluno_convenios, { eager: true })
  @JoinColumn({ name: 'convenio_id' })
  convenio: Convenio;

  @ManyToOne(() => Unidade, { eager: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  // Métodos auxiliares
  isAtivo(): boolean {
    return this.status === AlunoConvenioStatus.ATIVO;
  }

  cancelar(): void {
    this.status = AlunoConvenioStatus.CANCELADO;
    this.data_cancelamento = new Date();
  }

  pausar(): void {
    this.status = AlunoConvenioStatus.PAUSADO;
  }

  reativar(): void {
    this.status = AlunoConvenioStatus.ATIVO;
    this.data_ativacao = new Date();
    this.data_cancelamento = null as any; // Limpar data de cancelamento
  }
}
