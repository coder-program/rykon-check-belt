import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ContratoUnidade } from './contrato-unidade.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoUsuarioAssinatura {
  ALUNO = 'ALUNO',
  RESPONSAVEL = 'RESPONSAVEL',
}

@Entity('contratos_assinaturas_historico', { schema: 'teamcruz' })
export class ContratoAssinaturaHistorico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contrato_id: string;

  @Column({ type: 'uuid' })
  usuario_id: string;

  @Column({ type: 'varchar', length: 20 })
  tipo_usuario: TipoUsuarioAssinatura;

  @Column({ type: 'integer' })
  versao_contrato: number;

  @CreateDateColumn()
  assinado_em: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ type: 'boolean', default: true })
  aceito: boolean;

  // Relacionamentos
  @ManyToOne(() => ContratoUnidade, { eager: false })
  @JoinColumn({ name: 'contrato_id' })
  contrato: ContratoUnidade;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}
