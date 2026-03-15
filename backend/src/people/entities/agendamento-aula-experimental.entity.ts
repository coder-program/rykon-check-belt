import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Unidade } from './unidade.entity';
import { ConviteCadastro } from './convite-cadastro.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Modalidade } from '../../modalidades/entities/modalidade.entity';

export type StatusAgendamento =
  | 'PENDENTE'
  | 'CONFIRMADO'
  | 'CANCELADO'
  | 'REALIZADO';

@Entity({ name: 'agendamentos_aula_experimental' })
export class AgendamentoAulaExperimental {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'uuid' })
  modalidade_id: string;

  @Column({ type: 'uuid', nullable: true })
  convite_id: string | null;

  @Column({ type: 'varchar', length: 255 })
  nome: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefone: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cpf: string | null;

  @Column({ type: 'date' })
  data_aula: string;

  @Column({ type: 'time' })
  horario: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDENTE',
  })
  status: StatusAgendamento;

  @Column({ type: 'text', nullable: true })
  observacoes: string | null;

  @Column({ type: 'uuid', nullable: true })
  criado_por: string | null;

  @CreateDateColumn()
  criado_em: Date;

  @UpdateDateColumn()
  atualizado_em: Date;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => ConviteCadastro, { nullable: true })
  @JoinColumn({ name: 'convite_id' })
  convite: ConviteCadastro;

  @ManyToOne(() => Modalidade, { nullable: true, eager: false })
  @JoinColumn({ name: 'modalidade_id' })
  modalidade: Modalidade;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'criado_por' })
  criador: Usuario;
}
