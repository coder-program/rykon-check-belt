import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Aluno } from '../../alunos/entities/aluno.entity';
import { Instrutor } from '../../instrutores/entities/instrutor.entity';
import { HistoricoGrau } from '../../graduacoes/entities/historico-grau.entity';

@Entity('faixas', { schema: 'teamcruz' })
export class Faixa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  nome: string;

  @Column({ type: 'int', unique: true })
  ordem: number;

  @Column({ type: 'varchar', length: 30 })
  cor: string;

  @Column({ type: 'varchar', length: 7, name: 'hex_color' })
  hexColor: string;

  @Column({ type: 'int', default: 4, name: 'max_graus' })
  maxGraus: number;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Aluno, aluno => aluno.faixaAtual)
  alunos: Aluno[];

  @OneToMany(() => Instrutor, instrutor => instrutor.faixa)
  instrutores: Instrutor[];

  @OneToMany(() => HistoricoGrau, historico => historico.faixa)
  historicoGraus: HistoricoGrau[];
}
