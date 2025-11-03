import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlunoUnidade } from '../entities/aluno-unidade.entity';
import { AlunoUnidadeDto } from '../dto/create-aluno.dto';

@Injectable()
export class AlunoUnidadeService {
  constructor(
    @InjectRepository(AlunoUnidade)
    private alunoUnidadeRepository: Repository<AlunoUnidade>,
  ) {}

  /**
   * Vincula um aluno a múltiplas unidades
   */
  async vincularAlunoUnidades(
    alunoId: string,
    unidades: AlunoUnidadeDto[],
  ): Promise<AlunoUnidade[]> {
    const vinculos = unidades.map((unidadeDto) => {
      const vinculo = new AlunoUnidade();
      vinculo.aluno_id = alunoId;
      vinculo.unidade_id = unidadeDto.unidade_id;
      vinculo.data_matricula = unidadeDto.data_matricula
        ? new Date(unidadeDto.data_matricula)
        : new Date();
      vinculo.is_principal = unidadeDto.is_principal || false;
      vinculo.observacoes = unidadeDto.observacoes;
      return vinculo;
    });

    // Garantir que pelo menos uma unidade seja principal
    const temPrincipal = vinculos.some((v) => v.is_principal);
    if (!temPrincipal && vinculos.length > 0) {
      vinculos[0].is_principal = true;
    }

    return await this.alunoUnidadeRepository.save(vinculos);
  }

  /**
   * Atualiza as unidades de um aluno (remove antigas e adiciona novas)
   */
  async atualizarUnidadesAluno(
    alunoId: string,
    novasUnidades: AlunoUnidadeDto[],
  ): Promise<AlunoUnidade[]> {
    // Remover vínculos existentes
    await this.alunoUnidadeRepository.delete({ aluno_id: alunoId });

    // Criar novos vínculos
    return await this.vincularAlunoUnidades(alunoId, novasUnidades);
  }

  /**
   * Lista unidades de um aluno
   */
  async listarUnidadesAluno(alunoId: string): Promise<AlunoUnidade[]> {
    return await this.alunoUnidadeRepository.find({
      where: { aluno_id: alunoId, ativo: true },
      relations: ['unidade'],
      order: { is_principal: 'DESC', data_matricula: 'ASC' },
    });
  }

  /**
   * Obtém a unidade principal de um aluno
   */
  async getUnidadePrincipal(alunoId: string): Promise<AlunoUnidade | null> {
    return await this.alunoUnidadeRepository.findOne({
      where: { aluno_id: alunoId, is_principal: true, ativo: true },
      relations: ['unidade'],
    });
  }

  /**
   * Altera qual é a unidade principal do aluno
   */
  async alterarUnidadePrincipal(
    alunoId: string,
    novaUnidadePrincipalId: string,
  ): Promise<void> {
    // Remover is_principal de todas as unidades do aluno
    await this.alunoUnidadeRepository.update(
      { aluno_id: alunoId },
      { is_principal: false },
    );

    // Definir nova unidade principal
    await this.alunoUnidadeRepository.update(
      { aluno_id: alunoId, unidade_id: novaUnidadePrincipalId },
      { is_principal: true },
    );
  }

  /**
   * Adiciona uma nova unidade ao aluno
   */
  async adicionarUnidade(
    alunoId: string,
    unidadeDto: AlunoUnidadeDto,
  ): Promise<AlunoUnidade> {
    // Verificar se já existe vínculo
    const vinculoExistente = await this.alunoUnidadeRepository.findOne({
      where: { aluno_id: alunoId, unidade_id: unidadeDto.unidade_id },
    });

    if (vinculoExistente) {
      throw new Error('Aluno já está matriculado nesta unidade');
    }

    const vinculo = new AlunoUnidade();
    vinculo.aluno_id = alunoId;
    vinculo.unidade_id = unidadeDto.unidade_id;
    vinculo.data_matricula = unidadeDto.data_matricula
      ? new Date(unidadeDto.data_matricula)
      : new Date();
    vinculo.is_principal = unidadeDto.is_principal || false;
    vinculo.observacoes = unidadeDto.observacoes;

    return await this.alunoUnidadeRepository.save(vinculo);
  }

  /**
   * Remove uma unidade do aluno
   */
  async removerUnidade(alunoId: string, unidadeId: string): Promise<void> {
    const vinculo = await this.alunoUnidadeRepository.findOne({
      where: { aluno_id: alunoId, unidade_id: unidadeId },
    });

    if (!vinculo) {
      throw new Error('Vínculo não encontrado');
    }

    if (vinculo.is_principal) {
      // Se está removendo a unidade principal, verificar se há outras
      const outrasUnidades = await this.alunoUnidadeRepository.find({
        where: {
          aluno_id: alunoId,
          unidade_id: unidadeId, // Excluir a atual
          ativo: true,
        },
      });

      if (outrasUnidades.length > 0) {
        // Definir uma nova unidade como principal
        await this.alunoUnidadeRepository.update(
          { id: outrasUnidades[0].id },
          { is_principal: true },
        );
      }
    }

    // Marcar como inativo ao invés de deletar (soft delete)
    await this.alunoUnidadeRepository.update(
      { id: vinculo.id },
      { ativo: false },
    );
  }

  /**
   * Lista alunos de uma unidade específica
   */
  async listarAlunosUnidade(unidadeId: string): Promise<AlunoUnidade[]> {
    return await this.alunoUnidadeRepository.find({
      where: { unidade_id: unidadeId, ativo: true },
      relations: ['aluno'],
      order: { data_matricula: 'DESC' },
    });
  }
}
