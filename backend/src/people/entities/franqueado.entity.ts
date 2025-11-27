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

  @Column({ length: 14, nullable: true })
  cpf: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  telefone: string;

  @Column({ type: 'uuid', nullable: true })
  endereco_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  unidades_gerencia: string[] | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    default: 'ATIVA',
  })
  situacao: SituacaoFranqueado;

  // Campos do contrato
  @Column({ type: 'boolean', default: false })
  contrato_aceito: boolean;

  @Column({ type: 'timestamp', nullable: true })
  contrato_aceito_em: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contrato_versao: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contrato_ip: string | null;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
