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

  // ==============================================
  // VÍNCULO COM USUÁRIO
  // ==============================================
  @Column({ type: 'uuid', nullable: true })
  usuario_id: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  // ==============================================
  // DADOS PESSOAIS DO RESPONSÁVEL (PESSOA FÍSICA)
  // ==============================================
  @Column({ length: 150 })
  nome: string; // Nome completo do responsável pela franquia

  @Column({ length: 14, unique: true })
  cpf: string; // CPF do responsável (substitui CNPJ)

  @Column({ length: 120 })
  email: string; // Email principal de contato

  @Column({ length: 20 })
  telefone: string; // Telefone/WhatsApp principal

  // ==============================================
  // ENDEREÇO (OPCIONAL)
  // ==============================================
  @Column({ type: 'uuid', nullable: true })
  endereco_id: string | null;

  @ManyToOne(() => Endereco, { eager: false })
  @JoinColumn({ name: 'endereco_id' })
  endereco?: Endereco;

  // ==============================================
  // GESTÃO DE UNIDADES (CORE DO SISTEMA)
  // ==============================================
  @Column({ type: 'simple-array', nullable: true })
  unidades_gerencia: string[]; // IDs das unidades que este franqueado gerencia

  // Campo calculado (não persiste no banco)
  total_unidades?: number; // Quantidade de unidades vinculadas

  // ==============================================
  // STATUS E CONTROLE
  // ==============================================
  @Column({
    type: 'enum',
    enum: ['ATIVA', 'INATIVA', 'EM_HOMOLOGACAO'],
    default: 'EM_HOMOLOGACAO',
  })
  situacao: SituacaoFranqueado;

  @Column({ default: true })
  ativo: boolean;

  // ==============================================
  // TIMESTAMPS
  // ==============================================
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
