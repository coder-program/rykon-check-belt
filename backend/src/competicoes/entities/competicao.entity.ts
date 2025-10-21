import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { AlunoCompeticao } from './aluno-competicao.entity';

export enum TipoCompeticao {
  LOCAL = 'LOCAL',
  REGIONAL = 'REGIONAL',
  ESTADUAL = 'ESTADUAL',
  NACIONAL = 'NACIONAL',
  INTERNACIONAL = 'INTERNACIONAL',
  INTERNO = 'INTERNO',
}

export enum ModalidadeCompeticao {
  GI = 'GI',
  NO_GI = 'NO_GI',
  AMBOS = 'AMBOS',
}

export enum StatusCompeticao {
  AGENDADA = 'AGENDADA',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
}

@Entity({ name: 'competicoes', schema: 'teamcruz' })
@Index(['data_inicio'])
@Index(['tipo'])
@Index(['status'])
@Index(['cidade'])
export class Competicao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organizador: string;

  @Column({
    type: 'enum',
    enum: TipoCompeticao,
    default: TipoCompeticao.LOCAL,
  })
  tipo: TipoCompeticao;

  @Column({
    type: 'enum',
    enum: ModalidadeCompeticao,
    default: ModalidadeCompeticao.GI,
  })
  modalidade: ModalidadeCompeticao;

  @Column({ type: 'date' })
  data_inicio: Date;

  @Column({ type: 'date', nullable: true })
  data_fim: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  local: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cidade: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  estado: string;

  @Column({ type: 'varchar', length: 50, default: 'Brasil' })
  pais: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  site_url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  regulamento_url: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_inscricao: number;

  @Column({
    type: 'enum',
    enum: StatusCompeticao,
    default: StatusCompeticao.AGENDADA,
  })
  status: StatusCompeticao;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;

  // Relacionamentos
  @OneToMany(
    () => AlunoCompeticao,
    (alunoCompeticao) => alunoCompeticao.competicao,
  )
  participacoes: AlunoCompeticao[];

  // Métodos auxiliares
  isAberta(): boolean {
    return this.status === StatusCompeticao.AGENDADA && this.ativo;
  }

  isFinalizada(): boolean {
    return this.status === StatusCompeticao.FINALIZADA;
  }

  getDataFormatada(): string {
    return new Date(this.data_inicio).toLocaleDateString('pt-BR');
  }
}
