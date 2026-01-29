import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AlunoConvenio } from './aluno-convenio.entity';
import { UnidadeConvenio } from './unidade-convenio.entity';

@Entity('convenios', { schema: 'teamcruz' })
export class Convenio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  codigo: string; // 'GYMPASS', 'TOTALPASS', etc

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentual_repasse_padrao: number;

  @Column({ type: 'text', nullable: true })
  api_url: string;

  @Column({ type: 'boolean', default: true })
  requer_api_key: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @OneToMany(() => AlunoConvenio, alunoConvenio => alunoConvenio.convenio)
  aluno_convenios: AlunoConvenio[];

  @OneToMany(() => UnidadeConvenio, unidadeConvenio => unidadeConvenio.convenio)
  unidade_convenios: UnidadeConvenio[];
}
