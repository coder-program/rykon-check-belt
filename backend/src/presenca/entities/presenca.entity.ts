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
  QR_CODE = 'QR_CODE',
  CPF = 'CPF',
  FACIAL = 'FACIAL',
  NOME = 'NOME',
  MANUAL = 'MANUAL',
  RESPONSAVEL = 'RESPONSAVEL',
}

export enum PresencaStatus {
  PRESENTE = 'PRESENTE',
  AUSENTE = 'AUSENTE',
  ATRASADO = 'ATRASADO',
  JUSTIFICADO = 'JUSTIFICADO',
  CANCELADO = 'CANCELADO',
}

@Entity({ name: 'presencas', schema: 'teamcruz' })
@Index(['pessoaId', 'dataPresenca'], { unique: true })
@Index(['unidadeId', 'dataPresenca'])
@Index(['dataPresenca'])
@Index(['metodoCheckin'])
export class Presenca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pessoa_id', type: 'uuid' })
  pessoaId: string;

  @Column({ name: 'unidade_id', type: 'uuid', nullable: true })
  unidadeId: string;

  @Column({ name: 'aula_id', type: 'uuid', nullable: true })
  aulaId: string;

  @Column({ name: 'data_presenca', type: 'date' })
  dataPresenca: Date;

  @Column({
    name: 'hora_checkin',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  horaCheckin: Date;

  @Column({ name: 'hora_checkout', type: 'timestamp', nullable: true })
  horaCheckout: Date;

  @Column({
    name: 'metodo_checkin',
    type: 'enum',
    enum: PresencaMetodo,
    default: PresencaMetodo.MANUAL,
  })
  metodoCheckin: PresencaMetodo;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PresencaStatus,
    default: PresencaStatus.PRESENTE,
  })
  status: PresencaStatus;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ name: 'ip_checkin', type: 'varchar', length: 45, nullable: true })
  ipCheckin: string;

  @Column({ name: 'dispositivo_info', type: 'jsonb', nullable: true })
  dispositivoInfo: any;

  @Column({ name: 'localizacao_gps', type: 'jsonb', nullable: true })
  localizacaoGps: {
    latitude: number;
    longitude: number;
    precisao: number;
  };

  @Column({ name: 'foto_checkin', type: 'text', nullable: true })
  fotoCheckin: string;

  @Column({ name: 'responsavel_checkin_id', type: 'uuid', nullable: true })
  responsavelCheckinId: string;

  @Column({ name: 'validado_por', type: 'uuid', nullable: true })
  validadoPor: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => Person, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pessoa_id' })
  pessoa: Person;

  @ManyToOne(() => Unidade, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => Person, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsavel_checkin_id' })
  responsavelCheckin: Person;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'validado_por' })
  validadoPorUsuario: Usuario;

  // Métodos auxiliares
  isCheckinHoje(): boolean {
    const hoje = new Date();
    const dataPresenca = new Date(this.dataPresenca);
    return dataPresenca.toDateString() === hoje.toDateString();
  }

  temCheckout(): boolean {
    return this.horaCheckout !== null;
  }

  duracao(): number | null {
    if (!this.horaCheckout) return null;
    return (
      (this.horaCheckout.getTime() - this.horaCheckin.getTime()) / (1000 * 60)
    ); // em minutos
  }
}
