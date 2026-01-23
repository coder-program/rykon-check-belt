import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { Unidade } from './unidade.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { AlunoFaixa } from '../../graduacao/entities/aluno-faixa.entity';
import { AlunoGraduacao } from '../../graduacao/entities/aluno-graduacao.entity';
import { AlunoUnidade } from './aluno-unidade.entity';
import { AlunoModalidade } from './aluno-modalidade.entity';
import { Endereco } from '../../enderecos/endereco.entity';

export enum Genero {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
  OUTRO = 'OUTRO',
}

export enum StatusAluno {
  ATIVO = 'ATIVO',
  INATIVO = 'INATIVO',
  SUSPENSO = 'SUSPENSO',
  CANCELADO = 'CANCELADO',
}

// NOTA: StatusAprovacao removido - usamos StatusAluno.INATIVO para pendente e ATIVO para aprovado

export enum FaixaEnum {
  // Faixas Infantis
  BRANCA = 'BRANCA',
  CINZA_BRANCA = 'CINZA_BRANCA',
  CINZA = 'CINZA',
  CINZA_PRETA = 'CINZA_PRETA',
  AMARELA_BRANCA = 'AMARELA_BRANCA',
  AMARELA = 'AMARELA',
  AMARELA_PRETA = 'AMARELA_PRETA',
  LARANJA_BRANCA = 'LARANJA_BRANCA',
  LARANJA = 'LARANJA',
  LARANJA_PRETA = 'LARANJA_PRETA',
  VERDE_BRANCA = 'VERDE_BRANCA',
  VERDE = 'VERDE',
  VERDE_PRETA = 'VERDE_PRETA',

  // Faixas Adultas
  AZUL = 'AZUL',
  ROXA = 'ROXA',
  MARROM = 'MARROM',
  PRETA = 'PRETA',
  CORAL = 'CORAL',
  VERMELHA = 'VERMELHA',
}

@Entity({ name: 'alunos', schema: 'teamcruz' })
@Index(['cpf'], { unique: true })
@Index(['numero_matricula'], { unique: true })
@Index(['nome_completo'])
@Index(['unidade_id'])
@Index(['status'])
export class Aluno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== DADOS PESSOAIS =====
  @Column({ type: 'varchar', length: 255 })
  nome_completo: string;

  @Column({ type: 'varchar', length: 14, unique: true, nullable: true })
  cpf: string;

  @Column({ type: 'date' })
  data_nascimento: Date;

  @Column({
    type: 'enum',
    enum: Genero,
  })
  genero: Genero;

  // ===== CONTATO =====
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefone: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefone_emergencia: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nome_contato_emergencia: string;

  // ===== ENDEREÇO =====
  @Column({ type: 'uuid', nullable: true })
  endereco_id: string;

  // ===== DADOS DE MATRÍCULA =====
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  numero_matricula: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  data_matricula: Date;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string;

  @Column({ type: 'uuid' })
  unidade_id: string;

  @Column({
    type: 'enum',
    enum: StatusAluno,
    default: StatusAluno.ATIVO,
  })
  status: StatusAluno;

  // ===== GRADUAÇÃO =====
  // NOTA: faixa_atual e graus removidos - usar tabela aluno_faixas

  @Column({ type: 'date', nullable: true })
  data_ultima_graduacao: Date;

  // ===== DADOS MÉDICOS =====
  @Column({ type: 'text', nullable: true })
  observacoes_medicas: string;

  @Column({ type: 'text', nullable: true })
  alergias: string;

  @Column({ type: 'text', nullable: true })
  medicamentos_uso_continuo: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  plano_saude: string;

  @Column({ type: 'date', nullable: true })
  atestado_medico_validade: Date;

  @Column({ type: 'text', nullable: true })
  restricoes_medicas: string;

  // ===== RESPONSÁVEL (para menores) =====
  // Campos legados (ainda usados se não tiver responsavel_id)
  @Column({ type: 'varchar', length: 255, nullable: true })
  responsavel_nome: string;

  @Column({ type: 'varchar', length: 14, nullable: true })
  responsavel_cpf: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  responsavel_telefone: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  responsavel_parentesco: string;

  // Novo relacionamento com tabela responsaveis
  @Column({ type: 'uuid', nullable: true })
  responsavel_id: string;

  @ManyToOne('Responsavel', 'dependentes', {
    nullable: true,
  })
  @JoinColumn({ name: 'responsavel_id' })
  responsavel: any;

  // ===== DADOS FINANCEIROS =====
  @Column({ type: 'int', nullable: true })
  dia_vencimento: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_mensalidade: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  desconto_percentual: number;

  // ===== CONSENTIMENTOS LGPD =====
  @Column({ type: 'boolean', default: false, nullable: true })
  consent_lgpd: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  consent_lgpd_date: Date;

  @Column({ type: 'boolean', default: false, nullable: true })
  consent_imagem: boolean;

  @Column({ type: 'boolean', default: false, nullable: true })
  consent_uso_dados_lgpd: boolean;

  @Column({ type: 'boolean', default: false, nullable: true })
  consent_uso_imagem: boolean;

  // ===== METADADOS =====
  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ type: 'text', nullable: true })
  foto_url: string;

  // ===== APROVAÇÃO DE CADASTRO =====
  // NOTA: O sistema usa o campo 'status' para aprovação
  // INATIVO = pendente de aprovação
  // ATIVO = aprovado
  // Campos status_aprovacao, aprovado_por_id, aprovado_em, observacao_aprovacao
  // foram removidos pois não existem no banco de dados

  // ===== ASSINATURA DE CONTRATO =====
  @Column({ type: 'boolean', default: false, nullable: true })
  contrato_assinado: boolean;

  @Column({ type: 'uuid', nullable: true })
  contrato_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  contrato_assinado_em: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  contrato_assinado_ip: string;

  @Column({ type: 'integer', nullable: true })
  contrato_versao_assinada: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  // ===== RELAÇÕES =====
  @ManyToOne(() => Unidade, { eager: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Endereco, { eager: false })
  @JoinColumn({ name: 'endereco_id' })
  endereco: Endereco;

  // Many-to-Many com Modalidades via tabela intermediária
  @OneToMany(() => AlunoModalidade, (alunoModalidade) => alunoModalidade.aluno)
  alunoModalidades: AlunoModalidade[];

  @OneToMany(() => AlunoFaixa, (alunoFaixa) => alunoFaixa.aluno)
  faixas: AlunoFaixa[];

  @OneToMany(() => AlunoGraduacao, (graduacao) => graduacao.aluno)
  graduacoes: AlunoGraduacao[];

  @OneToMany(() => AlunoUnidade, (alunoUnidade) => alunoUnidade.aluno)
  alunoUnidades: AlunoUnidade[];

  // ===== MÉTODOS HELPER =====
  calcularIdade(): number {
    const hoje = new Date();
    const nascimento = new Date(this.data_nascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();

    if (
      mesAtual < mesNascimento ||
      (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
    ) {
      idade--;
    }

    return idade;
  }

  isMenorDeIdade(): boolean {
    return this.calcularIdade() < 18;
  }
}
