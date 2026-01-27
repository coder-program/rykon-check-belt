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

    // Usar toLocaleString para obter hora de São Paulo
    const agora = new Date();
    const spDate = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    console.log(`   [estaAtiva] ${this.nome}:`);
    console.log(`      Hora UTC agora: ${agora.toISOString()}`);
    console.log(`      Hora SP: ${spDate.toISOString()}`);

    // PRIORIZAR dia_semana para aulas recorrentes
    if (this.dia_semana !== null && this.dia_semana !== undefined) {
      const diaHoje = spDate.getDay();
      const horaAgora = spDate.getHours() * 60 + spDate.getMinutes();

      console.log(`      Dia hoje: ${diaHoje}, Dia aula: ${this.dia_semana}`);
      console.log(`      Hora agora (minutos): ${horaAgora}`);

      if (diaHoje !== this.dia_semana) {
        console.log(`      ❌ Dia diferente: ${diaHoje} !== ${this.dia_semana}`);
        return false;
      }

      // Extrair horários dos timestamps usando toLocaleString
      let horaInicio = 0, minInicio = 0, horaFim = 0, minFim = 0;
      
      if (this.data_hora_inicio) {
        const horaStr = this.data_hora_inicio.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        [horaInicio, minInicio] = horaStr.split(':').map(Number);
      }
      
      if (this.data_hora_fim) {
        const horaStr = this.data_hora_fim.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        [horaFim, minFim] = horaStr.split(':').map(Number);
      }

      const minutosInicio = horaInicio * 60 + minInicio;
      const minutosFim = horaFim * 60 + minFim;

      const margemAntes =
        this.configuracoes?.permite_checkin_antecipado_minutos || 15;
      const margemDepois =
        this.configuracoes?.permite_checkin_atrasado_minutos || 30;

      console.log(`      Minutos inicio: ${minutosInicio}, fim: ${minutosFim}`);
      console.log(`      Margem antes: ${margemAntes}, depois: ${margemDepois}`);
      console.log(`      Range válido: ${minutosInicio - margemAntes} até ${minutosFim + margemDepois}`);
      console.log(`      Hora atual: ${horaAgora}`);

      const ativa = horaAgora >= minutosInicio - margemAntes && horaAgora <= minutosFim + margemDepois;
      console.log(`      Resultado: ${ativa}`);
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

      const ativa = spDate >= inicioComMargem && spDate <= fimComMargem;
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
