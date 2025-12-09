import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlanosService } from '../services/planos.service';
import { CreatePlanoDto, UpdatePlanoDto } from '../dto/plano.dto';

@Controller('financeiro/planos')
@UseGuards(JwtAuthGuard)
export class PlanosController {
  constructor(
    private readonly planosService: PlanosService,
    @Inject(DataSource) private dataSource: DataSource,
  ) {}

  /**
   * Helper para buscar unidade_id do usuário (incluindo GERENTE_UNIDADE)
   */
  private async getUnidadeIdFromUser(user: any): Promise<string | null> {
    if (!user) return null;

    // Tentar pegar direto do user.unidade_id
    if (user.unidade_id) {
      return user.unidade_id;
    }

    const perfis =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) || [];

    // GERENTE_UNIDADE: buscar na tabela gerente_unidades
    if (perfis.includes('GERENTE_UNIDADE')) {
      const result = await this.dataSource.query(
        `SELECT unidade_id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (result && result.length > 0) {
        return result[0].unidade_id;
      }
    }

    // RECEPCIONISTA: buscar na tabela recepcionista_unidades
    if (perfis.includes('RECEPCIONISTA')) {
      const result = await this.dataSource.query(
        `SELECT unidade_id FROM teamcruz.recepcionista_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (result && result.length > 0) {
        return result[0].unidade_id;
      }
    }

    return null;
  }

  @Post()
  create(@Body() createPlanoDto: CreatePlanoDto, @Request() req) {
    return this.planosService.create(createPlanoDto);
  }

  @Get()
  async findAll(
    @Query('unidade_id') unidade_id?: string,
    @Request() req?: any,
  ) {
    // VALIDAÇÃO DE SEGURANÇA
    const user = req?.user;

    // Verificar se é franqueado
    const isFranqueado =
      user?.tipo_usuario === 'FRANQUEADO' ||
      user?.perfis?.some(
        (p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'FRANQUEADO',
      );

    const userUnidadeId = await this.getUnidadeIdFromUser(user);

    console.log('🔍 [PLANOS] Requisição recebida:', {
      usuario_id: user?.id,
      tipo_usuario: user?.tipo_usuario,
      unidade_id_usuario: userUnidadeId,
      filtro_unidade_id: unidade_id,
      isFranqueado,
      perfis: user?.perfis?.map((p: any) => p.nome || p),
    });

    if (!unidade_id) {
      if (isFranqueado) {
        console.log('⚠️ [PLANOS] Franqueado sem unidade_id - retornando vazio');
        return [];
      }
      if (userUnidadeId) {
        console.log('✅ [PLANOS] Aplicando unidade do usuário:', userUnidadeId);
        unidade_id = userUnidadeId;
      }
    } else {
      if (user && !isFranqueado && user.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && unidade_id !== userUnidadeId) {
          console.log('🚫 [PLANOS] ACESSO NEGADO:', {
            solicitada: unidade_id,
            usuario: userUnidadeId,
          });
          return [];
        }
      }
    }

    const planos = await this.planosService.findAll(unidade_id);

    // Mapear para incluir unidade_nome
    return planos.map((plano: any) => ({
      ...plano,
      unidade_nome: plano.unidade?.nome || null,
    }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planosService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updatePlanoDto: UpdatePlanoDto) {
    return this.planosService.update(id, updatePlanoDto);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() updatePlanoDto: UpdatePlanoDto) {
    return this.planosService.update(id, updatePlanoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planosService.remove(id);
  }

  @Get('tipo/:tipo')
  findByTipo(
    @Param('tipo') tipo: string,
    @Query('unidade_id') unidade_id?: string,
  ) {
    return this.planosService.findByTipo(tipo, unidade_id);
  }
}
