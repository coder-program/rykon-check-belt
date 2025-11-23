import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Endereco } from '../../enderecos/endereco.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export type SituacaoFranqueado = 'ATIVA' | 'INATIVA' | 'EM_HOMOLOGACAO';

@Entity({ name: 'franqueados', schema: 'teamcruz' })
export class Franqueado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Vínculo com usuário
  @Column({ type: 'uuid', nullable: true })
  usuario_id: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  // Apenas campos essenciais que sabemos que existem
  @Column({ length: 150, nullable: true })
  nome: string;

  @Column({ type: 'jsonb', nullable: true })
  unidades_gerencia: string[] | null;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
