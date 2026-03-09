import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { UnidadeRecado } from './unidade-recado.entity';
import { Aluno } from '../../people/entities/aluno.entity';

@Entity({ name: 'unidade_recados_lidos', schema: 'teamcruz' })
@Unique(['recado_id', 'aluno_id'])
export class UnidadeRecadoLido {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  recado_id!: string;

  @ManyToOne(() => UnidadeRecado, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recado_id' })
  recado!: UnidadeRecado;

  @Column({ type: 'uuid' })
  aluno_id!: string;

  @ManyToOne(() => Aluno, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno!: Aluno;

  @CreateDateColumn({ name: 'lido_em' })
  lido_em!: Date;
}
