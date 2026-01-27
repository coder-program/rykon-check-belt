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
import { Unidade } from '../../people/entities/unidade.entity';
import { Person } from '../../people/entities/person.entity';
import { Turma } from './turma.entity';

export enum DiaSemana {
  DOMINGO = 0,
  SEGUNDA = 1,
  TERCA = 2,
  QUARTA = 3,
  QUINTA = 4,
  SEXTA = 5,
  SABADO = 6,
}

export enum TipoAula {
  GI = 'GI',
  NO_GI = 'NO_GI',
  INFANTIL = 'INFANTIL',
  FEMININO = 'FEMININO',
  COMPETICAO = 'COMPETICAO',
  LIVRE = 'LIVRE',
}

@Entity({ name: 'aulas', schema: 'teamcruz' })
@Index(['unidade_id', 'dia_semana', 'data_hora_inicio'])
@Index(['professor_id'])
@Index(['ativo'])
export class Aula {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'uuid', nullable: true })
  turma_id: string;

  @Column({ type: 'uuid', nullable: true })
  professor_id: string;

  @Column({
    type: 'enum',
    enum: TipoAula,
    default: TipoAula.GI,
  })
  tipo: TipoAula;

  @Column({ type: 'int', nullable: true })
  dia_semana: DiaSemana;

  @Column({ type: 'timestamptz', nullable: true })
  data_hora_inicio: Date;

  @Column({ type: 'timestamptz', nullable: true })
  data_hora_fim: Date;

  // Propriedades calculadas para compatibilidade
  get hora_inicio(): string {
    if (!this.data_hora_inicio) return '00:00';
    return this.data_hora_inicio.toTimeString().slice(0, 5);
  }

  get hora_fim(): string {
    if (!this.data_hora_fim) return '00:00';
    return this.data_hora_fim.toTimeString().slice(0, 5);
  }

  @Column({ type: 'int', default: 30 })
  capacidade_maxima: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  qr_code: string;

  @Column({ type: 'timestamptz', nullable: true })
  qr_code_gerado_em: Date;

  @Column({ type: 'jsonb', nullable: true })
  configuracoes: {
    permite_checkin_antecipado_minutos?: number;
    permite_checkin_atrasado_minutos?: number;
    requer_aprovacao_professor?: boolean;
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Unidade, { eager: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => Turma, { eager: false })
  @JoinColumn({ name: 'turma_id' })
  turma: Turma;

  @ManyToOne(() => Person, { eager: false })
  @JoinColumn({ name: 'professor_id' })
  professor: Person;

  // Métodos auxiliares
  estaAtiva(): boolean {
    if (!this.ativo) return false;

    // SEMPRE usar horário de São Paulo (UTC-3)
    // Converter corretamente: pegar UTC e ajustar para São Paulo
    const agora = new Date();
    const agoraSaoPaulo = new Date(agora.getTime() - 3 * 60 * 60 * 1000); // UTC - 3 horas

    // PRIORIZAR dia_semana para aulas recorrentes
    if (this.dia_semana !== null && this.dia_semana !== undefined) {
      const diaHoje = agoraSaoPaulo.getUTCDay(); // Usar getUTCDay pois já ajustamos o timestamp
      const horaAgora = agoraSaoPaulo.getUTCHours() * 60 + agoraSaoPaulo.getUTCMinutes();

      if (diaHoje !== this.dia_semana) {
        return false;
      }

      const [horaInicio, minInicio] = this.hora_inicio.split(':').map(Number);
      const [horaFim, minFim] = this.hora_fim.split(':').map(Number);

      const minutosInicio = horaInicio * 60 + minInicio;
      const minutosFim = horaFim * 60 + minFim;

      const margemAntes =
        this.configuracoes?.permite_checkin_antecipado_minutos || 15;
      const margemDepois =
        this.configuracoes?.permite_checkin_atrasado_minutos || 30;

      const ativa = horaAgora >= minutosInicio - margemAntes && horaAgora <= minutosFim + margemDepois;
      return ativa;
    }

    // Fallback: Se tiver data_hora_inicio e data_hora_fim, usar timestamps completos (aulas únicas)
    if (this.data_hora_inicio && this.data_hora_fim) {
      const margemAntes =
        (this.configuracoes?.permite_checkin_antecipado_minutos || 15) *
        60 *
        1000;
      const margemDepois =
        (this.configuracoes?.permite_checkin_atrasado_minutos || 30) *
        60 *
        1000;

      const inicioComMargem = new Date(
        this.data_hora_inicio.getTime() - margemAntes,
      );
      const fimComMargem = new Date(
        this.data_hora_fim.getTime() + margemDepois,
      );

      const ativa = agoraSaoPaulo >= inicioComMargem && agoraSaoPaulo <= fimComMargem;
      return ativa;
    }

    return false;
  }

  gerarQRCode(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `QR-AULA-${this.id}-${timestamp}-${random}`;
  }
}
