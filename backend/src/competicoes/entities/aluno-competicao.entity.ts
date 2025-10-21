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
import { Aluno } from '../../people/entities/aluno.entity';
import { Competicao } from './competicao.entity';

export enum PosicaoCompeticao {
  OURO = 'OURO',
  PRATA = 'PRATA',
  BRONZE = 'BRONZE',
  PARTICIPOU = 'PARTICIPOU',
  DESCLASSIFICADO = 'DESCLASSIFICADO',
}

@Entity({ name: 'aluno_competicoes', schema: 'teamcruz' })
@Index(['aluno_id'])
@Index(['competicao_id'])
@Index(['posicao'])
@Index(['created_at'])
export class AlunoCompeticao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  aluno_id: string;

  @Column({ type: 'uuid' })
  competicao_id: string;

  // Categoria
  @Column({ type: 'varchar', length: 50, nullable: true })
  categoria_peso: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  categoria_idade: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  categoria_faixa: string;

  // Resultado
  @Column({ type: 'int', nullable: true })
  colocacao: number;

  @Column({
    type: 'enum',
    enum: PosicaoCompeticao,
    nullable: true,
  })
  posicao: PosicaoCompeticao;

  @Column({ type: 'int', default: 0 })
  total_lutas: number;

  @Column({ type: 'int', default: 0 })
  vitorias: number;

  @Column({ type: 'int', default: 0 })
  derrotas: number;

  // Detalhes
  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  peso_pesagem: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tempo_total_lutas: string;

  // Premiação
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  premiacao_valor: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  premiacao_descricao: string;

  // Documentos/Mídia
  @Column({ type: 'varchar', length: 500, nullable: true })
  certificado_url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  foto_premiacao_url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  video_url: string;

  // Auditoria
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;

  // Relacionamentos
  @ManyToOne(() => Aluno, { eager: false })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => Competicao, (competicao) => competicao.participacoes, {
    eager: true,
  })
  @JoinColumn({ name: 'competicao_id' })
  competicao: Competicao;

  // Métodos auxiliares
  isPodio(): boolean {
    return (
      this.posicao === PosicaoCompeticao.OURO ||
      this.posicao === PosicaoCompeticao.PRATA ||
      this.posicao === PosicaoCompeticao.BRONZE
    );
  }

  getMedalhaCor(): string {
    switch (this.posicao) {
      case PosicaoCompeticao.OURO:
        return '#FFD700';
      case PosicaoCompeticao.PRATA:
        return '#C0C0C0';
      case PosicaoCompeticao.BRONZE:
        return '#CD7F32';
      default:
        return '#808080';
    }
  }

  getMedalhaEmoji(): string {
    switch (this.posicao) {
      case PosicaoCompeticao.OURO:
        return '🥇';
      case PosicaoCompeticao.PRATA:
        return '🥈';
      case PosicaoCompeticao.BRONZE:
        return '🥉';
      default:
        return '🎖️';
    }
  }

  getAproveitamento(): number {
    if (this.total_lutas === 0) return 0;
    return Math.round((this.vitorias / this.total_lutas) * 100);
  }
}
