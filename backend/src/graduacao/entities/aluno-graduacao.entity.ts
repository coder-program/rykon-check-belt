import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Person } from '../../people/entities/person.entity';
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

  @Column({ type: 'uuid', nullable: true })
  concedido_por: string;

  @Column({ type: 'text', nullable: true })
  observacao: string;

  @CreateDateColumn()
  created_at: Date;

  // Relações
  @ManyToOne(() => Person, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Person;

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
