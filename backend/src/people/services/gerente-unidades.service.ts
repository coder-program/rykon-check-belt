import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GerenteUnidade } from '../entities/gerente-unidade.entity';

@Injectable()
export class GerenteUnidadesService {
  constructor(
    @InjectRepository(GerenteUnidade)
    private readonly gerenteUnidadeRepository: Repository<GerenteUnidade>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Vincular um gerente a uma unidade
   */
  async vincular(
    usuarioId: string,
    unidadeId: string,
  ): Promise<GerenteUnidade> {
    // ✅ Verificar se a unidade existe e está ativa
    const unidadeData = await this.dataSource.query(
      `SELECT id, nome, status FROM teamcruz.unidades WHERE id = $1`,
      [unidadeId],
    );

    if (!unidadeData || unidadeData.length === 0) {
      throw new NotFoundException(
        'Unidade não encontrada. Verifique o ID informado.',
      );
    }

    if (unidadeData[0].status !== 'ATIVA') {
      throw new BadRequestException(
        `Não é possível vincular gerente à unidade "${unidadeData[0].nome}" pois ela está com status "${unidadeData[0].status}". Apenas unidades ATIVAS podem receber novos vínculos.`,
      );
    }

    // Verificar se já existe vínculo ativo
    const vinculoExistente = await this.gerenteUnidadeRepository.findOne({
      where: { usuario_id: usuarioId, ativo: true },
    });

    if (vinculoExistente) {
      throw new ConflictException(
        'Gerente já está vinculado a uma unidade. Desvincule primeiro.',
      );
    }

    const vinculo = this.gerenteUnidadeRepository.create({
      usuario_id: usuarioId,
      unidade_id: unidadeId,
      ativo: true,
    });

    return await this.gerenteUnidadeRepository.save(vinculo);
  }

  /**
   * Desvincular gerente de uma unidade
   */
  async desvincular(usuarioId: string): Promise<void> {
    const vinculo = await this.gerenteUnidadeRepository.findOne({
      where: { usuario_id: usuarioId, ativo: true },
    });

    if (!vinculo) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    vinculo.ativo = false;
    await this.gerenteUnidadeRepository.save(vinculo);
  }

  /**
   * Buscar unidade do gerente
   */
  async buscarUnidadeDoGerente(usuarioId: string): Promise<string | null> {
    const vinculo = await this.gerenteUnidadeRepository.findOne({
      where: { usuario_id: usuarioId, ativo: true },
      select: ['unidade_id'],
    });

    return vinculo?.unidade_id || null;
  }

  /**
   * Buscar gerentes de uma unidade
   */
  async buscarGerentesDaUnidade(unidadeId: string): Promise<GerenteUnidade[]> {
    return await this.gerenteUnidadeRepository.find({
      where: { unidade_id: unidadeId, ativo: true },
      relations: ['usuario'],
    });
  }

  /**
   * Verificar se usuário é gerente de uma unidade específica
   */
  async isGerenteDaUnidade(
    usuarioId: string,
    unidadeId: string,
  ): Promise<boolean> {
    const count = await this.gerenteUnidadeRepository.count({
      where: {
        usuario_id: usuarioId,
        unidade_id: unidadeId,
        ativo: true,
      },
    });

    return count > 0;
  }
}
