import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConfiguracoesCobrancaService } from '../services/configuracoes-cobranca.service';
import { ConfiguracaoCobranca } from '../entities/configuracao-cobranca.entity';
import { DataSource } from 'typeorm';

@Controller('configuracoes-cobranca')
@UseGuards(JwtAuthGuard)
export class ConfiguracoesCobrancaController {
  constructor(
    private readonly configService: ConfiguracoesCobrancaService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('unidade/:unidade_id')
  async findByUnidade(
    @Param('unidade_id') unidade_id: string,
    @Request() req: any,
  ) {
    // Validar se franqueado tem acesso à unidade
    const user = req.user;
    const isFranqueado = user.perfis?.some((p: any) =>
      typeof p === 'string'
        ? p.toLowerCase() === 'franqueado'
        : p?.nome?.toLowerCase() === 'franqueado',
    );

    if (isFranqueado) {
      // Buscar franqueado_id
      const franqueadoResult = await this.dataSource.query(
        'SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1',
        [user.id],
      );

      if (franqueadoResult.length === 0) {
        console.error(
          '❌ [ConfigCobranca] Franqueado não encontrado para usuario_id:',
          user.id,
        );
        throw new UnauthorizedException('Franqueado não encontrado');
      }

      const franqueado_id = franqueadoResult[0].id;

      // Validar se a unidade pertence ao franqueado
      const unidadeResult = await this.dataSource.query(
        'SELECT id FROM teamcruz.unidades WHERE id = $1 AND franqueado_id = $2 LIMIT 1',
        [unidade_id, franqueado_id],
      );

      if (unidadeResult.length === 0) {
        console.error('❌ [ConfigCobranca] Franqueado sem acesso à unidade:', {
          franqueado_id,
          unidade_id,
        });
        throw new UnauthorizedException('Você não tem acesso a esta unidade');
      }

    }

    return this.configService.findByUnidade(unidade_id);
  }

  @Put('unidade/:unidade_id')
  async update(
    @Param('unidade_id') unidade_id: string,
    @Body() updateDto: Partial<ConfiguracaoCobranca>,
    @Request() req: any,
  ) {
    // Validar se franqueado tem acesso à unidade
    const user = req.user;
    const isFranqueado = user.perfis?.some((p: any) =>
      typeof p === 'string'
        ? p.toLowerCase() === 'franqueado'
        : p?.nome?.toLowerCase() === 'franqueado',
    );

    if (isFranqueado) {
      // Buscar franqueado_id
      const franqueadoResult = await this.dataSource.query(
        'SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1',
        [user.id],
      );

      if (franqueadoResult.length === 0) {
        console.error(
          '❌ [ConfigCobranca UPDATE] Franqueado não encontrado para usuario_id:',
          user.id,
        );
        throw new UnauthorizedException('Franqueado não encontrado');
      }

      const franqueado_id = franqueadoResult[0].id;

      // Validar se a unidade pertence ao franqueado
      const unidadeResult = await this.dataSource.query(
        'SELECT id FROM teamcruz.unidades WHERE id = $1 AND franqueado_id = $2 LIMIT 1',
        [unidade_id, franqueado_id],
      );

      if (unidadeResult.length === 0) {
        console.error(
          '❌ [ConfigCobranca UPDATE] Franqueado sem acesso à unidade:',
          { franqueado_id, unidade_id },
        );
        throw new UnauthorizedException('Você não tem acesso a esta unidade');
      }

    }
    return this.configService.update(unidade_id, updateDto);
  }
}
