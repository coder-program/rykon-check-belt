import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { AlunoFaixa } from './aluno-faixa.entity';
import { AlunoGraduacao } from './aluno-graduacao.entity';

export enum CategoriaFaixa {
  ADULTO = 'ADULTO',
  INFANTIL = 'INFANTIL',
  MESTRE = 'MESTRE',
}

@Entity({ name: 'faixa_def', schema: 'teamcruz' })
@Index(['codigo'], { unique: true })
@Index(['ordem'])
export class FaixaDef {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 40 })
  nome_exibicao: string;

  @Column({ type: 'varchar', length: 7 })
  cor_hex: string;

  @Column({ type: 'int' })
  ordem: number;

  @Column({ type: 'int', default: 4 })
  graus_max: number;

  @Column({ type: 'int', default: 40 })
  aulas_por_grau: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: CategoriaFaixa.ADULTO,
  })
  categoria: CategoriaFaixa;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relações
  @OneToMany(() => AlunoFaixa, (alunoFaixa) => alunoFaixa.faixaDef)
  alunoFaixas: AlunoFaixa[];

  @OneToMany(() => AlunoGraduacao, (graduacao) => graduacao.faixaOrigem)
  graduacoesOrigem: AlunoGraduacao[];

  @OneToMany(() => AlunoGraduacao, (graduacao) => graduacao.faixaDestino)
  graduacoesDestino: AlunoGraduacao[];
}
