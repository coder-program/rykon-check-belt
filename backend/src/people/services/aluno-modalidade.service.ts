import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
import { AlunoModalidade } from '../entities/aluno-modalidade.entity';
import { Aluno } from '../entities/aluno.entity';
import { Modalidade } from '../../modalidades/entities/modalidade.entity';
import { Presenca } from '../../presenca/entities/presenca.entity';

export interface MatricularAlunoDto {
  aluno_id: string;
  modalidade_id: string;
  valor_praticado?: number; // Opcional: desconto
}

@Injectable()
export class AlunoModalidadeService {
  constructor(
    @InjectRepository(AlunoModalidade)
    private alunoModalidadeRepository: Repository<AlunoModalidade>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(Modalidade)
    private modalidadeRepository: Repository<Modalidade>,
    @InjectRepository(Presenca)
    private presencaRepository: Repository<Presenca>,
  ) {}

  // Matricular aluno em uma modalidade
  async matricular(dto: MatricularAlunoDto): Promise<AlunoModalidade> {
    // Verificar se aluno existe
    const aluno = await this.alunoRepository.findOne({
      where: { id: dto.aluno_id },
    });
    if (!aluno) {
      throw new NotFoundException(`Aluno ${dto.aluno_id} não encontrado`);
    }

    // Verificar se modalidade existe
    const modalidade = await this.modalidadeRepository.findOne({
      where: { id: dto.modalidade_id },
    });
    if (!modalidade) {
      throw new NotFoundException(
        `Modalidade ${dto.modalidade_id} não encontrada`,
      );
    }

    // Verificar se já está matriculado
    const existente = await this.alunoModalidadeRepository.findOne({
      where: {
        aluno_id: dto.aluno_id,
        modalidade_id: dto.modalidade_id,
      },
    });

    if (existente) {
      throw new ConflictException('Aluno já está matriculado nesta modalidade');
    }

    // Criar nova matrícula
    const matricula = this.alunoModalidadeRepository.create({
      aluno_id: dto.aluno_id,
      modalidade_id: dto.modalidade_id,
      valor_praticado: dto.valor_praticado,
      ativo: true,
    });

    const agoraBrasil = dayjs().tz('America/Sao_Paulo').toDate();
    matricula.data_matricula = agoraBrasil;
    matricula.created_at = agoraBrasil;
    matricula.updated_at = agoraBrasil;

    return this.alunoModalidadeRepository.save(matricula);
  }

  // Cancelar matrícula em uma modalidade (hard delete)
  async cancelar(aluno_id: string, modalidade_id: string): Promise<void> {
    // Verificar se existem presenças registradas nesta modalidade; se sim, impedir para manter histórico
    const totalPresencas = await this.presencaRepository.count({
      where: { aluno_id, modalidade_id },
    });

    if (totalPresencas > 0) {
      throw new ConflictException(
        `Este aluno possui ${totalPresencas} presença(s) registrada(s) nesta modalidade. ` +
          'Não é possível remover a matrícula para preservar o histórico.',
      );
    }

    const result = await this.alunoModalidadeRepository.delete({
      aluno_id,
      modalidade_id,
    });

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException('Matrícula não encontrada');
    }
  }

  // Listar modalidades de um aluno
  async getModalidadesAluno(aluno_id: string): Promise<any[]> {
    const matriculas = await this.alunoModalidadeRepository
      .createQueryBuilder('am')
      .leftJoinAndSelect('am.modalidade', 'modalidade')
      .where('am.aluno_id = :aluno_id', { aluno_id })
      .andWhere('am.ativo = :ativo', { ativo: true })
      .getMany();

    return matriculas.map((m) => ({
      id: m.modalidade.id,
      nome: m.modalidade.nome,
      descricao: m.modalidade.descricao,
      valor_praticado: m.valor_praticado,
      cor: m.modalidade.cor,
      data_matricula: m.data_matricula,
      graduacao_atual: m.graduacao_atual ?? null,
      data_ultima_graduacao: m.data_ultima_graduacao ?? null,
    }));
  }

  // Calcular mensalidade total de um aluno
  async calcularMensalidadeTotal(aluno_id: string): Promise<number> {
    const matriculas = await this.alunoModalidadeRepository
      .createQueryBuilder('am')
      .leftJoinAndSelect('am.modalidade', 'modalidade')
      .where('am.aluno_id = :aluno_id', { aluno_id })
      .andWhere('am.ativo = :ativo', { ativo: true })
      .getMany();

    return matriculas.reduce((total, m) => {
      const valor = m.valor_praticado || 0;
      return total + Number(valor);
    }, 0);
  }

  // Atualizar valor praticado (desconto)
  async atualizarValor(
    aluno_id: string,
    modalidade_id: string,
    valor_praticado: number,
  ): Promise<AlunoModalidade> {
    const matricula = await this.alunoModalidadeRepository.findOne({
      where: { aluno_id, modalidade_id, ativo: true },
    });

    if (!matricula) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    matricula.valor_praticado = valor_praticado;
    return this.alunoModalidadeRepository.save(matricula);
  }

  // Atualizar graduação atual numa modalidade (não é jiu-jitsu)
  async atualizarGraduacao(
    aluno_id: string,
    modalidade_id: string,
    graduacao_atual?: string,
    data_ultima_graduacao?: string,
  ): Promise<AlunoModalidade> {
    const matricula = await this.alunoModalidadeRepository.findOne({
      where: { aluno_id, modalidade_id, ativo: true },
    });

    if (!matricula) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    if (graduacao_atual !== undefined) matricula.graduacao_atual = graduacao_atual || null;
    if (data_ultima_graduacao !== undefined) {
      // Passa a string YYYY-MM-DD diretamente — evita shift de fuso ao usar new Date()
      matricula.data_ultima_graduacao = data_ultima_graduacao
        ? (data_ultima_graduacao as any)
        : null;
    }

    matricula.updated_at = dayjs().tz('America/Sao_Paulo').toDate();
    return this.alunoModalidadeRepository.save(matricula);
  }
}
