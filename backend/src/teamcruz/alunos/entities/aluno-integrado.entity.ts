import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Faixa } from '../../faixas/entities/faixa.entity';
import { Unidade } from '../../../people/entities/unidade.entity';
import { Presenca } from '../../presencas/entities/presenca.entity';
// import { HistoricoGrau } from '../../graduacoes/entities/historico-grau.entity';
// import { HistoricoFaixa } from '../../graduacoes/entities/historico-faixa.entity';
import { Usuario } from '../../../usuarios/entities/usuario.entity';

export enum StatusType {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
  SUSPENSO = 'suspenso',
}

@Entity('alunos', { schema: 'teamcruz' })
export class Aluno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'varchar', length: 14, nullable: true })
  cpf: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  rg: string;

  @Column({ type: 'date', nullable: true, name: 'data_nascimento' })
  dataNascimento: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefone: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'telefone_emergencia',
  })
  telefoneEmergencia: string;

  @Column({ type: 'text', nullable: true })
  endereco: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cidade: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  estado: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  cep: string;

  @Column({ type: 'text', nullable: true, name: 'foto_url' })
  fotoUrl: string;

  // Dados de Graduação
  @Column({ name: 'faixa_atual_id' })
  faixaAtualId: string;

  @ManyToOne(() => Faixa)
  @JoinColumn({ name: 'faixa_atual_id' })
  faixaAtual: Faixa;

  @Column({ type: 'int', default: 0, name: 'graus_atual' })
  grausAtual: number;

  @Column({ type: 'int', default: 0, name: 'aulas_desde_ultimo_grau' })
  aulasDesdeUltimoGrau: number;

  @Column({ type: 'date', nullable: true, name: 'data_ultima_graduacao' })
  dataUltimaGraduacao: Date;

  // Dados administrativos
  @Column({
    type: 'date',
    default: () => 'CURRENT_DATE',
    name: 'data_matricula',
  })
  dataMatricula: Date;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: true,
    name: 'numero_matricula',
  })
  numeroMatricula: string;

  @Column({ name: 'unidade_id', nullable: true })
  unidadeId: string;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ type: 'date', nullable: true, name: 'atestado_medico_validade' })
  atestadoMedicoValidade: Date;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'plano_saude' })
  planoSaude: string;

  @Column({ type: 'text', nullable: true, name: 'restricoes_medicas' })
  restricoesMedicas: string;

  // Responsável (para menores)
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'responsavel_nome',
  })
  responsavelNome: string;

  @Column({
    type: 'varchar',
    length: 14,
    nullable: true,
    name: 'responsavel_cpf',
  })
  responsavelCpf: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'responsavel_telefone',
  })
  responsavelTelefone: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'responsavel_parentesco',
  })
  responsavelParentesco: string;

  // Controle e LGPD
  @Column({ type: 'enum', enum: StatusType, default: StatusType.ATIVO })
  status: StatusType;

  @Column({ type: 'boolean', default: false, name: 'consent_lgpd' })
  consentLgpd: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'consent_lgpd_date' })
  consentLgpdDate: Date;

  @Column({ type: 'boolean', default: false, name: 'consent_imagem' })
  consentImagem: boolean;

  // INTEGRAÇÃO COM SISTEMA DE USUÁRIOS EXISTENTE
  @Column({ nullable: true, name: 'usuario_id' })
  usuarioId: string;

  @OneToOne(() => Usuario, { nullable: true, eager: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Presenca, (presenca) => presenca.aluno)
  presencas: Presenca[];

  // TODO: Ativar quando GraduacoesModule for criado
  // @OneToMany(() => HistoricoGrau, (historico) => historico.aluno)
  // historicoGraus: HistoricoGrau[];

  // @OneToMany(() => HistoricoFaixa, (historico) => historico.aluno)
  // historicoFaixas: HistoricoFaixa[];

  // Virtual properties
  get isElegivelPromocao(): boolean {
    return this.grausAtual >= (this.faixaAtual?.maxGraus || 4);
  }

  get progressoGrau(): number {
    const aulasNecessarias = 20; // TODO: Buscar da configuração
    return Math.min((this.aulasDesdeUltimoGrau / aulasNecessarias) * 100, 100);
  }

  // Método para verificar permissões do usuário
  hasPermission(permissao: string): boolean {
    if (!this.usuario || !this.usuario.perfis) return false;

    return this.usuario.perfis.some((perfil) =>
      perfil.permissoes?.some((p) => p.nome === permissao),
    );
  }

  // Método para verificar se é aluno
  isAluno(): boolean {
    return this.usuario?.perfis?.some((p) => p.nome === 'ALUNO') || false;
  }
}
