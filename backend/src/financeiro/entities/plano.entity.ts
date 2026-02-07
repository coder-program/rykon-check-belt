import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Unidade } from '../../people/entities/unidade.entity';
import { Assinatura } from './assinatura.entity';

export enum TipoPlano {
  MENSAL = 'MENSAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL',
  AVULSO = 'AVULSO',
}

@Entity({ name: 'planos', schema: 'teamcruz' })
export class Plano {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nome: string;

  @Column({
    type: 'enum',
    enum: TipoPlano,
    default: TipoPlano.MENSAL,
  })
  tipo: TipoPlano;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2,
    transformer: {
      to: (value) => value,
      from: (value) => parseFloat(value) || 0,
    }
  })
  valor: number;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'text', nullable: true })
  beneficios: string;

  @Column({ type: 'int', default: 1, comment: 'Duração em meses' })
  duracao_meses: number;

  @Column({ type: 'int', nullable: true, comment: 'Duração em dias' })
  duracao_dias: number;

  @Column({ type: 'int', nullable: true, comment: 'Número de aulas inclusas' })
  numero_aulas: number;

  @Column({ type: 'int', nullable: true, comment: 'Máximo de alunos permitidos' })
  max_alunos: number;

  @Column({ type: 'boolean', default: true })
  recorrencia_automatica: boolean;

  @Column({ type: 'uuid', nullable: true })
  unidade_id: string;

  @ManyToOne(() => Unidade, { nullable: true })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @OneToMany(() => Assinatura, (assinatura) => assinatura.plano)
  assinaturas: Assinatura[];

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
