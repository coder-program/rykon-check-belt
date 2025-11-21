import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Aluno } from '../../people/entities/aluno.entity';
import { FaixaDef } from './faixa-def.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'aluno_graduacao', schema: 'teamcruz' })
export class AlunoGraduacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @Column({ type: 'uuid' })
  faixa_origem_id: string;

  @Column({ type: 'uuid' })
  faixa_destino_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dt_graduacao: Date;

  @Column({ type: 'varchar', nullable: true })
  concedido_por: string | null;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @Column({ type: 'boolean', default: false })
  aprovado: boolean;

  @Column({ type: 'varchar', nullable: true })
  aprovado_por: string | null;

  @Column({ type: 'timestamp', nullable: true })
  dt_aprovacao: Date | null;

  @Column({ type: 'uuid', nullable: true })
  parametro_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  solicitado_em: Date | null;

  @Column({ type: 'text', nullable: true })
  observacao_aprovacao: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  tamanho_faixa: string | null;

  @CreateDateColumn()
  created_at: Date;

  // Relações
  @ManyToOne(() => Aluno, (aluno) => aluno.graduacoes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => FaixaDef, (faixaDef) => faixaDef.graduacoesOrigem)
  @JoinColumn({ name: 'faixa_origem_id' })
  faixaOrigem: FaixaDef;

  @ManyToOne(() => FaixaDef, (faixaDef) => faixaDef.graduacoesDestino)
  @JoinColumn({ name: 'faixa_destino_id' })
  faixaDestino: FaixaDef;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'concedido_por' })
  concedidoPor: Usuario;
}
