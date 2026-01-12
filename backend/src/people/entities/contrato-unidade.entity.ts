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
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoContrato {
  TERMO_ADESAO = 'TERMO_ADESAO',
  TERMO_RESPONSABILIDADE = 'TERMO_RESPONSABILIDADE',
  LGPD = 'LGPD',
  OUTRO = 'OUTRO',
}

@Entity('contratos_unidades', { schema: 'teamcruz' })
export class ContratoUnidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'text' })
  conteudo: string;

  @Column({ type: 'integer', default: 1 })
  versao: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'boolean', default: true })
  obrigatorio: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    default: TipoContrato.TERMO_ADESAO,
  })
  tipo_contrato: TipoContrato;

  // Relacionamentos
  @ManyToOne(() => Unidade, { eager: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'created_by' })
  criador: Usuario;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'updated_by' })
  atualizador: Usuario;

  // Auditoria
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;
}
