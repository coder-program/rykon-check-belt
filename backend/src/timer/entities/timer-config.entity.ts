import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TimerMode {
  SIMPLE = 'simple',
  ROUNDS = 'rounds',
  CIRCUIT = 'circuit',
}

export interface CircuitExercise {
  nome: string;
  duracaoSegundos: number;
  descansoSegundos: number;
}

@Entity({ name: 'timer_configs', schema: 'teamcruz' })
export class TimerConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ type: 'varchar', default: TimerMode.SIMPLE })
  modo: TimerMode;

  @Column({ name: 'academia_id', nullable: true })
  academiaId: string;

  /** Duração total em segundos (modo SIMPLE) */
  @Column({ name: 'duracao_segundos', default: 300 })
  duracaoSegundos: number;

  /** Número de rounds (modo ROUNDS) */
  @Column({ name: 'num_rounds', default: 3 })
  numRounds: number;

  /** Duração de cada round em segundos (modo ROUNDS) */
  @Column({ name: 'duracao_round_segundos', default: 300 })
  duracaoRoundSegundos: number;

  /** Tempo de descanso entre rounds em segundos (modo ROUNDS) */
  @Column({ name: 'duracao_descanso_segundos', default: 60 })
  duracaoDescansoSegundos: number;

  /** Lista de exercícios do circuito (modo CIRCUIT) */
  @Column({ name: 'exercicios', type: 'jsonb', nullable: true })
  exercicios: CircuitExercise[];

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
