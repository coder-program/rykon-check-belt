import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracaoCobranca } from '../entities/configuracao-cobranca.entity';

@Injectable()
export class ConfiguracoesCobrancaService {
  constructor(
    @InjectRepository(ConfiguracaoCobranca)
    private configRepository: Repository<ConfiguracaoCobranca>,
  ) {}

  async findByUnidade(unidade_id: string): Promise<ConfiguracaoCobranca> {
    let config = await this.configRepository.findOne({
      where: { unidade_id },
      relations: ['unidade'],
    });

    // Se não existir, criar com valores padrão
    if (!config) {
      config = this.configRepository.create({
        unidade_id,
        aceita_pix: true,
        aceita_cartao: true,
        aceita_boleto: true,
        aceita_dinheiro: true,
        aceita_transferencia: true,
        multa_atraso_percentual: 2.0,
        juros_diario_percentual: 0.033,
        dias_bloqueio_inadimplencia: 30,
        dia_vencimento_padrao: 10,
        faturas_vencidas_para_inadimplencia: 2,
        enviar_lembrete_vencimento: true,
        dias_antecedencia_lembrete: 3,
      });
      await this.configRepository.save(config);
    }

    return config;
  }

  async update(
    unidade_id: string,
    updateDto: Partial<ConfiguracaoCobranca>,
  ): Promise<ConfiguracaoCobranca> {
    let config = await this.findByUnidade(unidade_id);
    Object.assign(config, updateDto);
    return await this.configRepository.save(config);
  }
}
