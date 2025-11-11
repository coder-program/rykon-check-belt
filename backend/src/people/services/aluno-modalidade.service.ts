import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlunoModalidade } from '../entities/aluno-modalidade.entity';
import { Aluno } from '../entities/aluno.entity';
import { Modalidade } from '../../modalidades/entities/modalidade.entity';

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

    // Verificar se aluno e modalidade são da mesma unidade
    if (aluno.unidade_id !== modalidade.unidade_id) {
      throw new BadRequestException(
        'Aluno e modalidade precisam ser da mesma unidade',
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
      if (existente.ativo) {
        throw new ConflictException(
          'Aluno já está matriculado nesta modalidade',
        );
      }
      // Reativar matrícula existente
      existente.ativo = true;
      if (dto.valor_praticado !== undefined) {
        existente.valor_praticado = dto.valor_praticado;
      }
      return this.alunoModalidadeRepository.save(existente);
    }

    // Criar nova matrícula
    const matricula = this.alunoModalidadeRepository.create({
      aluno_id: dto.aluno_id,
      modalidade_id: dto.modalidade_id,
      valor_praticado: dto.valor_praticado,
      ativo: true,
    });

    return this.alunoModalidadeRepository.save(matricula);
  }

  // Cancelar matrícula em uma modalidade
  async cancelar(aluno_id: string, modalidade_id: string): Promise<void> {
    const matricula = await this.alunoModalidadeRepository.findOne({
      where: { aluno_id, modalidade_id },
    });

    if (!matricula) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    matricula.ativo = false;
    await this.alunoModalidadeRepository.save(matricula);
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
      valor_mensalidade: m.modalidade.valor_mensalidade,
      valor_praticado: m.valor_praticado,
      valor_final: m.valor_praticado || m.modalidade.valor_mensalidade,
      cor: m.modalidade.cor,
      data_matricula: m.data_matricula,
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
      const valor = m.valor_praticado || m.modalidade.valor_mensalidade || 0;
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
}
