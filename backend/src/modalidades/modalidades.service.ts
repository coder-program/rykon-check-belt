import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modalidade } from './entities/modalidade.entity';
import { CreateModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';

@Injectable()
export class ModalidadesService {
  constructor(
    @InjectRepository(Modalidade)
    private modalidadeRepository: Repository<Modalidade>,
  ) {}

  async create(createModalidadeDto: CreateModalidadeDto): Promise<Modalidade> {
    // Verificar se já existe modalidade com mesmo nome NA MESMA UNIDADE
    const existente = await this.modalidadeRepository.findOne({
      where: {
        nome: createModalidadeDto.nome,
        unidade_id: createModalidadeDto.unidade_id,
      },
    });

    if (existente) {
      throw new ConflictException(
        `Modalidade ${createModalidadeDto.nome} já existe nesta unidade`,
      );
    }

    const modalidade = this.modalidadeRepository.create(createModalidadeDto);
    return this.modalidadeRepository.save(modalidade);
  }

  async findAll(
    unidade_id?: string,
    apenasAtivas?: boolean,
  ): Promise<Modalidade[]> {
    const query = this.modalidadeRepository.createQueryBuilder('modalidade');

    // FILTRAR POR UNIDADE
    if (unidade_id) {
      query.where('modalidade.unidade_id = :unidade_id', { unidade_id });
    }

    if (apenasAtivas) {
      query.andWhere('modalidade.ativo = :ativo', { ativo: true });
    }

    query.orderBy('modalidade.nome', 'ASC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Modalidade> {
    const modalidade = await this.modalidadeRepository.findOne({
      where: { id },
    });

    if (!modalidade) {
      throw new NotFoundException(`Modalidade com ID ${id} não encontrada`);
    }

    return modalidade;
  }

  async update(
    id: string,
    updateModalidadeDto: UpdateModalidadeDto,
  ): Promise<Modalidade> {
    const modalidade = await this.findOne(id);

    // Se está mudando o nome, verificar se não conflita NA MESMA UNIDADE
    if (
      updateModalidadeDto.nome &&
      updateModalidadeDto.nome !== modalidade.nome
    ) {
      const existente = await this.modalidadeRepository.findOne({
        where: {
          nome: updateModalidadeDto.nome,
          unidade_id: modalidade.unidade_id,
        },
      });

      if (existente) {
        throw new ConflictException(
          `Modalidade ${updateModalidadeDto.nome} já existe nesta unidade`,
        );
      }
    }

    Object.assign(modalidade, updateModalidadeDto);
    return this.modalidadeRepository.save(modalidade);
  }

  async remove(id: string): Promise<void> {
    const modalidade = await this.findOne(id);
    await this.modalidadeRepository.remove(modalidade);
  }

  async desativar(id: string): Promise<Modalidade> {
    const modalidade = await this.findOne(id);
    modalidade.ativo = false;
    return this.modalidadeRepository.save(modalidade);
  }

  async ativar(id: string): Promise<Modalidade> {
    const modalidade = await this.findOne(id);
    modalidade.ativo = true;
    return this.modalidadeRepository.save(modalidade);
  }

  // Estatísticas
  async getEstatisticas(id: string): Promise<any> {
    const modalidade = await this.modalidadeRepository
      .createQueryBuilder('modalidade')
      .leftJoinAndSelect('modalidade.alunoModalidades', 'alunoModalidade')
      .leftJoinAndSelect('alunoModalidade.aluno', 'aluno')
      .where('modalidade.id = :id', { id })
      .andWhere('alunoModalidade.ativo = :ativo', { ativo: true })
      .andWhere('aluno.ativo = :alunoAtivo', { alunoAtivo: true })
      .getOne();

    if (!modalidade) {
      throw new NotFoundException(`Modalidade com ID ${id} não encontrada`);
    }

    const totalAlunos = modalidade.alunoModalidades?.length || 0;
    const faturamentoReal =
      modalidade.alunoModalidades?.reduce((total, am) => {
        const valor = am.valor_praticado || modalidade.valor_mensalidade || 0;
        return total + Number(valor);
      }, 0) || 0;

    return {
      modalidade: {
        id: modalidade.id,
        nome: modalidade.nome,
        cor: modalidade.cor,
        valor_mensalidade: modalidade.valor_mensalidade,
      },
      totalAlunos,
      faturamentoPotencial: totalAlunos * (modalidade.valor_mensalidade || 0),
      faturamentoReal, // Considera descontos individuais
    };
  }
}
