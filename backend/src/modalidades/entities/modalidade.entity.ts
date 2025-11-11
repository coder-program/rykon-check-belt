import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlunoModalidade } from '../../people/entities/aluno-modalidade.entity';
import { Unidade } from '../../people/entities/unidade.entity';

@Entity({ name: 'modalidades', schema: 'teamcruz' })
export class Modalidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor_mensalidade: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'varchar', length: 7, default: '#1E3A8A' })
  cor: string; // Código hex: #FF5733

  @ManyToOne(() => Unidade, { eager: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  // Many-to-Many com Alunos via tabela intermediária
  @OneToMany(
    () => AlunoModalidade,
    (alunoModalidade) => alunoModalidade.modalidade,
  )
  alunoModalidades: AlunoModalidade[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
