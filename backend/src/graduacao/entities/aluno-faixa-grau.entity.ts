import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlunoFaixa } from './aluno-faixa.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum OrigemGrau {
  MANUAL = 'MANUAL',
  AUTOMATICO = 'AUTOMATICO',
  IMPORTACAO = 'IMPORTACAO',
}

@Entity({ name: 'aluno_faixa_grau', schema: 'teamcruz' })
export class AlunoFaixaGrau {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_faixa_id: string;

  @Column({ type: 'int' })
  grau_num: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dt_concessao: Date;

  @Column({ type: 'uuid', nullable: true })
  concedido_por: string;

  @Column({ type: 'text', nullable: true })
  observacao: string;

  @Column({ 
    type: 'varchar', 
    length: 20,
    default: OrigemGrau.MANUAL 
  })
  origem: OrigemGrau;

  @CreateDateColumn()
  created_at: Date;

  // Relações
  @ManyToOne(() => AlunoFaixa, (alunoFaixa) => alunoFaixa.graus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_faixa_id' })
  alunoFaixa: AlunoFaixa;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'concedido_por' })
  concedidoPor: Usuario;
}
