import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GraduacaoParametrosService } from '../../graduacao/graduacao-parametros.service';
import { RecepcionistaUnidadesService } from '../services/recepcionista-unidades.service';
import {
  CreateGraduacaoParametroDto,
  UpdateGraduacaoParametroDto,
  AprovarGraduacaoDto,
  SolicitarGraduacaoDto,
} from '../dto/graduacao-parametro.dto';

@Controller('graduacao-parametros')
@UseGuards(JwtAuthGuard)
export class GraduacaoParametrosController {
  constructor(
    private readonly parametrosService: GraduacaoParametrosService,
    private readonly recepcionistaUnidadesService: RecepcionistaUnidadesService,
  ) {}

  // ============================================
  // CRUD de Parâmetros
  // ============================================

  @Post()
  async create(@Body() dto: CreateGraduacaoParametroDto, @Request() req) {
    return await this.parametrosService.create(dto, req.user.id);
  }

  @Get()
  async findAll(@Request() req, @Query('unidade_id') unidadeId?: string) {
    // Se não passou unidade_id, buscar pela do usuário
    if (!unidadeId && req.user) {
      const perfis = req.user.perfis?.map((p: any) => p.nome) || [];

      if (perfis.includes('recepcionista')) {
        // Buscar unidades do recepcionista
        const unidades =
          await this.recepcionistaUnidadesService.getUnidadesByRecepcionista(
            req.user.id,
          );
        if (unidades.length > 0) {
          unidadeId = unidades[0].unidade_id; // Pegar primeira unidade
        }
      } else if (perfis.includes('gerente_unidade')) {
        // Buscar unidade do gerente
        const result: any = await this.parametrosService.findAll();
        // Filtrar pela unidade do gerente (implementar lógica)
        return result;
      }
    }

    return await this.parametrosService.findAll(unidadeId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.parametrosService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGraduacaoParametroDto,
  ) {
    return await this.parametrosService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.parametrosService.remove(id);
  }

  // ============================================
  // Alunos Aptos para Graduação
  // ============================================

  @Get('alunos-aptos')
  async getAlunosAptosSemParametro(@Request() req) {
    return this.getAlunosAptosComParametro(undefined, req);
  }

  @Get('alunos-aptos/:parametro_id')
  async getAlunosAptosComParametro(
    @Param('parametro_id') parametroId: string | undefined,
    @Request() req,
  ) {
    console.log(
      '🎓 [getAlunosAptos] Usuário:',
      req.user?.id,
      'Perfis:',
      req.user?.perfis?.map((p: any) => p.nome),
    );

    const perfis = req.user.perfis?.map((p: any) => p.nome) || [];
    let unidadeIds: string[] | undefined;

    // Verificar perfil e buscar unidades permitidas
    if (perfis.includes('recepcionista')) {
      const unidades =
        await this.recepcionistaUnidadesService.getUnidadesByRecepcionista(
          req.user.id,
        );
      unidadeIds = unidades.map((u) => u.unidade_id);
      console.log('👤 Recepcionista - Unidades:', unidadeIds);
    } else if (perfis.includes('gerente_unidade')) {
      // Buscar unidade do gerente via responsavel_cpf
      // TODO: implementar método para buscar unidade do gerente
      console.log('👤 Gerente Unidade');
    } else if (perfis.includes('franqueado')) {
      // Buscar unidades do franqueado
      // TODO: implementar método para buscar unidades do franqueado
      console.log('👤 Franqueado');
    } else if (perfis.includes('master') || perfis.includes('admin')) {
      // Vê todas as unidades
      unidadeIds = undefined;
      console.log('👤 Admin/Master - Todas unidades');
    }

    return await this.parametrosService.getAlunosAptosGraduacao(
      parametroId !== 'undefined' && parametroId ? parametroId : undefined,
      unidadeIds,
    );
  }

  // ============================================
  // Solicitar e Aprovar Graduação
  // ============================================

  @Post('solicitar')
  async solicitar(@Body() dto: SolicitarGraduacaoDto, @Request() req) {
    return await this.parametrosService.solicitarGraduacao(dto, req.user.id);
  }

  @Post('aprovar')
  async aprovar(@Body() dto: AprovarGraduacaoDto, @Request() req) {
    return await this.parametrosService.aprovarGraduacao(dto, req.user.id);
  }

  @Post('reprovar/:id')
  async reprovar(
    @Param('id') id: string,
    @Body('observacao') observacao: string,
    @Request() req,
  ) {
    return await this.parametrosService.reprovarGraduacao(
      id,
      observacao,
      req.user.id,
    );
  }
}
