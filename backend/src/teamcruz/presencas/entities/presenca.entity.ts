import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Aluno } from '../../alunos/entities/aluno.entity';
import { Unidade } from '../../../people/entities/unidade.entity';

export enum OrigemRegistro {
  TABLET = 'TABLET',
  QR_CODE = 'QR_CODE',
  MANUAL = 'MANUAL',
}

@Entity('presencas', { schema: 'teamcruz' })
export class Presenca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'data_hora' })
  dataHora: Date;

  @Column({
    type: 'enum',
    enum: OrigemRegistro,
    name: 'origem_registro',
  })
  origemRegistro: OrigemRegistro;

  @Column({ type: 'uuid', name: 'aluno_id' })
  alunoId: string;

  @Column({ type: 'uuid', name: 'unidade_id' })
  unidadeId: string;

  // Campos opcionais para validação
  @Column({ type: 'varchar', length: 50, nullable: true })
  latitude: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  longitude: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'endereco_ip' })
  enderecoIp: string;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  // Relacionamentos
  @ManyToOne(() => Aluno, (aluno) => aluno.presencas)
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;
}
