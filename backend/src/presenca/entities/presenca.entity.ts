import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Person } from '../../people/entities/person.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Unidade } from '../../people/entities/unidade.entity';

export enum PresencaMetodo {
  QR_CODE = 'qr_code',
  CPF = 'cpf',
  FACIAL = 'facial',
  NOME = 'nome',
  MANUAL = 'manual',
  RESPONSAVEL = 'responsavel',
}

export enum PresencaStatus {
  PRESENTE = 'presente',
  FALTA = 'falta',
  JUSTIFICADA = 'justificada',
  CANCELADA = 'cancelada',
}

@Entity({ name: 'presencas', schema: 'teamcruz' })
@Index(['aluno_id', 'aula_id'], { unique: true })
@Index(['aula_id'])
@Index(['aluno_id'])
export class Presenca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'aluno_id', type: 'uuid' })
  aluno_id: string;

  @Column({ name: 'aula_id', type: 'uuid' })
  aula_id: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'presente',
    enum: ['presente', 'falta', 'justificada', 'cancelada'],
  })
  status: string;

  @Column({
    name: 'modo_registro',
    type: 'varchar',
    length: 20,
    default: 'manual',
  })
  modo_registro: string;

  @Column({
    name: 'hora_checkin',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  hora_checkin: Date;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({
    name: 'peso_presenca',
    type: 'decimal',
    precision: 2,
    scale: 1,
    default: 1.0,
  })
  peso_presenca: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Person, { eager: false })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Person;

  @ManyToOne(() => require('./aula.entity').Aula, { eager: false })
  @JoinColumn({ name: 'aula_id' })
  aula: any; // Usar any para evitar circular dependency

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'created_by' })
  criador: Usuario;
}
