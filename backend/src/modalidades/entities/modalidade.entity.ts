import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AlunoModalidade } from '../../people/entities/aluno-modalidade.entity';
import { UnidadeModalidade } from './unidade-modalidade.entity';

@Entity({ name: 'modalidades', schema: 'teamcruz' })
export class Modalidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'varchar', length: 7, default: '#1E3A8A' })
  cor: string;

  @Column({ type: 'varchar', length: 20, default: 'NENHUM' })
  tipo_graduacao: string; // FAIXA | GRAU | KYU_DAN | CORDAO | LIVRE | NENHUM

  @Column({ type: 'varchar', length: 50, nullable: true })
  icone: string | null;

  // Unidades que oferecem esta modalidade (via junction table)
  @OneToMany(() => UnidadeModalidade, (um) => um.modalidade)
  unidadeModalidades: UnidadeModalidade[];

  // Alunos matriculados nesta modalidade
  @OneToMany(() => AlunoModalidade, (am) => am.modalidade)
  alunoModalidades: AlunoModalidade[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
