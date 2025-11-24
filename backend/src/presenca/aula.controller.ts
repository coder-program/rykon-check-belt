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
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AulaService } from './aula.service';
import { CreateAulaDto, UpdateAulaDto } from './dto/aula.dto';
import { DataSource } from 'typeorm';

@ApiTags('Aulas')
@Controller('aulas')
@UseGuards(JwtAuthGuard)
export class AulaController {
  constructor(
    private readonly aulaService: AulaService,
    @Inject(DataSource) private dataSource: DataSource,
  ) {}

  /**
   * 🔒 Helper para buscar unidades do franqueado
   */
  private async getUnidadesDoFranqueado(userId: string): Promise<string[]> {
    const franqueado = await this.dataSource.query(
      `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1`,
      [userId],
    );

    if (!franqueado || franqueado.length === 0) {
      return [];
    }

    const unidades = await this.dataSource.query(
      `SELECT id FROM teamcruz.unidades WHERE franqueado_id = $1`,
      [franqueado[0].id],
    );

    return unidades.map((u: any) => u.id);
  }

  /**
   * 🔒 Helper para extrair unidade_id(s) do usuário autenticado
   */
  private async getUnidadeIdsFromUser(
    req: any,
  ): Promise<string[] | string | null> {
    const user = req?.user;

    if (!user) {
      return null;
    }

    const perfisNormalizados = (user?.perfis || []).map((p: any) =>
      (typeof p === 'string' ? p : p?.nome || p)?.toLowerCase(),
    );

    console.log('🔍 [AULAS] Perfis:', perfisNormalizados);

    // FRANQUEADO - buscar todas as unidades dele
    if (perfisNormalizados.includes('franqueado')) {
      const unidades = await this.getUnidadesDoFranqueado(user.id);
      console.log('🏢 [AULAS] Unidades do franqueado:', unidades);
      return unidades;
    }

    // MASTER/ADMIN - sem restrição
    if (
      perfisNormalizados.includes('master') ||
      perfisNormalizados.includes('admin')
    ) {
      console.log('👑 [AULAS] Master/Admin - sem restrição');
      return null;
    }

    // ALUNO
    if (user.aluno?.unidade_id) {
      console.log('👤 [AULAS] Aluno - unidade:', user.aluno.unidade_id);
      return user.aluno.unidade_id;
    }

    // PROFESSOR
    if (user.professor?.unidade_id) {
      console.log('👨‍🏫 [AULAS] Professor - unidade:', user.professor.unidade_id);
      return user.professor.unidade_id;
    }

    // GERENTE DE UNIDADE
    if (user.gerente_unidade?.unidade_id) {
      console.log(
        '👔 [AULAS] Gerente - unidade:',
        user.gerente_unidade.unidade_id,
      );
      return user.gerente_unidade.unidade_id;
    }

    // RECEPCIONISTA
    if (user.recepcionista_unidade?.unidade_id) {
      console.log(
        '🧑‍💼 [AULAS] Recepcionista - unidade:',
        user.recepcionista_unidade.unidade_id,
      );
      return user.recepcionista_unidade.unidade_id;
    }

    return null;
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova aula' })
  @ApiResponse({ status: 201, description: 'Aula criada com sucesso' })
  async create(@Body() createAulaDto: CreateAulaDto, @Request() req) {
    // TODO: Verificar permissão de admin/professor
    return this.aulaService.create(createAulaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as aulas' })
  @ApiResponse({ status: 200, description: 'Lista de aulas' })
  async findAll(
    @Query('unidade_id') unidade_id?: string,
    @Query('ativo') ativo?: string,
    @Query('dia_semana') dia_semana?: string,
    @Request() req?: any,
  ) {
    console.log('📋 [AULAS] Listando aulas...');

    const unidadesDoUsuario = await this.getUnidadeIdsFromUser(req);

    console.log('📋 [AULAS] Unidades permitidas:', unidadesDoUsuario);

    // Se for array de unidades (franqueado), buscar aulas de todas
    if (Array.isArray(unidadesDoUsuario)) {
      const todasAulas = await this.aulaService.findAllByUnidades(
        unidadesDoUsuario,
        {
          ativo: ativo ? ativo === 'true' : undefined,
          dia_semana: dia_semana ? parseInt(dia_semana) : undefined,
        },
      );
      console.log('📋 [AULAS] Total de aulas encontradas:', todasAulas.length);
      return todasAulas;
    }

    // Se for string (unidade única)
    if (typeof unidadesDoUsuario === 'string') {
      return this.aulaService.findAll({
        unidade_id: unidadesDoUsuario,
        ativo: ativo ? ativo === 'true' : undefined,
        dia_semana: dia_semana ? parseInt(dia_semana) : undefined,
      });
    }

    // Se for null (master/admin), retornar todas
    return this.aulaService.findAll({
      ativo: ativo ? ativo === 'true' : undefined,
      dia_semana: dia_semana ? parseInt(dia_semana) : undefined,
    });
  }

  @Get('horarios')
  @ApiOperation({ summary: 'Listar horários disponíveis' })
  @ApiResponse({ status: 200, description: 'Horários disponíveis' })
  async findHorarios(
    @Query('unidade_id') unidade_id?: string,
    @Request() req?: any,
  ) {
    console.log('⏰ [AULAS HORARIOS] Listando horários...');

    const unidadesDoUsuario = await this.getUnidadeIdsFromUser(req);

    // Se for master/admin (null) ou não passou unidade_id, requer unidade no query
    if (
      unidadesDoUsuario === null ||
      Array.isArray(unidadesDoUsuario) ||
      !unidade_id
    ) {
      if (!unidade_id) {
        throw new UnauthorizedException(
          'É necessário especificar uma unidade para buscar horários.',
        );
      }
      // Master/admin/franqueado podem buscar qualquer unidade especificada
      return this.aulaService.findHorariosDisponiveis(unidade_id);
    }

    // Se for unidade única (gerente/professor/etc), usar a unidade do usuário
    return this.aulaService.findHorariosDisponiveis(
      unidadesDoUsuario as string,
    );
  }

  @Get('hoje')
  @ApiOperation({ summary: 'Contar aulas de hoje' })
  @ApiResponse({ status: 200, description: 'Quantidade de aulas hoje' })
  async countHoje(
    @Query('unidade_id') unidade_id?: string,
    @Request() req?: any,
  ) {
    const unidadesDoUsuario = await this.getUnidadeIdsFromUser(req);

    // Se for array (franqueado), pegar primeira unidade ou exigir unidade_id
    if (Array.isArray(unidadesDoUsuario)) {
      const unidadeFinal = unidade_id || unidadesDoUsuario[0];
      if (!unidadeFinal) {
        throw new UnauthorizedException(
          'É necessário especificar uma unidade.',
        );
      }
      const count = await this.aulaService.countHoje(unidadeFinal);
      return { count, unidade_id: unidadeFinal };
    }

    // Se for string (unidade única)
    if (typeof unidadesDoUsuario === 'string') {
      const count = await this.aulaService.countHoje(unidadesDoUsuario);
      return { count, unidade_id: unidadesDoUsuario };
    }

    // Se for null (master/admin), exigir unidade_id
    if (!unidade_id) {
      throw new UnauthorizedException('É necessário especificar uma unidade.');
    }

    const count = await this.aulaService.countHoje(unidade_id);
    return { count, unidade_id };
  }

  @Get('hoje/lista')
  @ApiOperation({ summary: 'Listar aulas de hoje' })
  @ApiResponse({ status: 200, description: 'Lista de aulas de hoje' })
  async findAulasHoje(
    @Query('unidade_id') unidade_id?: string,
    @Request() req?: any,
  ) {
    console.log('📅 [AULAS HOJE] Buscando aulas de hoje...');

    const unidadesDoUsuario = await this.getUnidadeIdsFromUser(req);
    console.log('📅 [AULAS HOJE] Unidades do usuário:', unidadesDoUsuario);
    console.log('📅 [AULAS HOJE] Unidade solicitada via query:', unidade_id);

    // FRANQUEADO - pode ver todas as suas unidades ou filtrar por uma específica
    if (Array.isArray(unidadesDoUsuario)) {
      if (unidade_id) {
        // Verifica se a unidade solicitada pertence ao franqueado
        if (!unidadesDoUsuario.includes(unidade_id)) {
          throw new UnauthorizedException(
            'Você não tem permissão para ver aulas desta unidade.',
          );
        }
        console.log(
          '📅 [AULAS HOJE] Franqueado filtrando por unidade:',
          unidade_id,
        );
        const aulas = await this.aulaService.findAulasHoje(unidade_id);
        console.log('📅 [AULAS HOJE] Aulas encontradas:', aulas.length);
        return aulas;
      } else {
        // Retorna aulas de todas as unidades do franqueado
        console.log(
          '📅 [AULAS HOJE] Franqueado - todas unidades:',
          unidadesDoUsuario,
        );
        const aulas = await this.aulaService.findAulasHoje(unidadesDoUsuario);
        console.log('📅 [AULAS HOJE] Aulas encontradas:', aulas.length);
        return aulas;
      }
    }

    // GERENTE/PROFESSOR/RECEPCIONISTA - apenas da sua unidade
    if (typeof unidadesDoUsuario === 'string') {
      console.log(
        '📅 [AULAS HOJE] Usuário com unidade única:',
        unidadesDoUsuario,
      );
      const aulas = await this.aulaService.findAulasHoje(unidadesDoUsuario);
      console.log('📅 [AULAS HOJE] Aulas encontradas:', aulas.length);
      return aulas;
    }

    // MASTER/ADMIN - precisa especificar unidade
    if (!unidade_id) {
      throw new UnauthorizedException('É necessário especificar uma unidade.');
    }

    console.log('📅 [AULAS HOJE] Admin/Master - unidade:', unidade_id);
    const aulas = await this.aulaService.findAulasHoje(unidade_id);
    console.log('📅 [AULAS HOJE] Aulas encontradas:', aulas.length);
    return aulas;
  }

  @Get('por-professor/ranking')
  @ApiOperation({ summary: 'Ranking de aulas por professor' })
  @ApiResponse({
    status: 200,
    description: 'Lista de professores com total de aulas',
  })
  async getAulasPorProfessor(
    @Query('unidade_id') unidade_id?: string,
    @Request() req?: any,
  ) {
    return this.aulaService.getAulasPorProfessor(req.user, unidade_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar aula por ID' })
  @ApiResponse({ status: 200, description: 'Aula encontrada' })
  @ApiResponse({ status: 404, description: 'Aula não encontrada' })
  async findOne(@Param('id') id: string) {
    return this.aulaService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar aula' })
  @ApiResponse({ status: 200, description: 'Aula atualizada' })
  async update(
    @Param('id') id: string,
    @Body() updateAulaDto: UpdateAulaDto,
    @Request() req,
  ) {
    // TODO: Verificar permissão de admin/professor
    return this.aulaService.update(id, updateAulaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover aula' })
  @ApiResponse({ status: 200, description: 'Aula removida' })
  async remove(@Param('id') id: string, @Request() req) {
    // TODO: Verificar permissão de admin
    await this.aulaService.remove(id);
    return { message: 'Aula removida com sucesso' };
  }
}
