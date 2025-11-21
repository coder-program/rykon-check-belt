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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AulaService } from './aula.service';
import { CreateAulaDto, UpdateAulaDto } from './dto/aula.dto';

@ApiTags('Aulas')
@Controller('aulas')
@UseGuards(JwtAuthGuard)
export class AulaController {
  constructor(private readonly aulaService: AulaService) {}

  /**
   * 🔒 Helper para extrair unidade_id do usuário autenticado
   * Verifica todos os perfis possíveis: ALUNO, PROFESSOR, GERENTE_UNIDADE, RECEPCIONISTA
   */
  private getUnidadeIdFromUser(req: any): string | null {
    const user = req?.user;

    if (!user) {
      return null;
    }

    // Prioridade 1: Aluno
    if (user.aluno?.unidade_id) {
      return user.aluno.unidade_id;
    }

    // Prioridade 2: Professor
    if (user.professor?.unidade_id) {
      return user.professor.unidade_id;
    }

    // Prioridade 3: Gerente de Unidade
    if (user.gerente_unidade?.unidade_id) {
      return user.gerente_unidade.unidade_id;
    }

    // Prioridade 4: Recepcionista
    if (user.recepcionista_unidade?.unidade_id) {
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
    // 🔒 SEGURANÇA: Extrair unidade_id do usuário autenticado
    const unidadeIdDoUsuario = this.getUnidadeIdFromUser(req);

    // 🔒 VALIDAÇÃO: Usuário DEVE ter uma unidade associada
    if (!unidadeIdDoUsuario) {
      throw new UnauthorizedException(
        'Usuário não possui unidade associada. Por favor, contate o administrador.',
      );
    }

    // 🔒 SEGURANÇA: Ignorar qualquer unidade_id passada via query parameter
    return this.aulaService.findAll({
      unidade_id: unidadeIdDoUsuario,
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
    // 🔒 SEGURANÇA: Extrair unidade_id do usuário autenticado
    const unidadeIdDoUsuario = this.getUnidadeIdFromUser(req);

    // 🔒 VALIDAÇÃO: Usuário DEVE ter uma unidade associada
    if (!unidadeIdDoUsuario) {
      throw new UnauthorizedException(
        'Usuário não possui unidade associada. Por favor, contate o administrador.',
      );
    }

    // 🔒 SEGURANÇA: Ignorar qualquer unidade_id passada via query parameter
    // Sempre usar a unidade do usuário autenticado
    return this.aulaService.findHorariosDisponiveis(unidadeIdDoUsuario);
  }

  @Get('hoje')
  @ApiOperation({ summary: 'Contar aulas de hoje' })
  @ApiResponse({ status: 200, description: 'Quantidade de aulas hoje' })
  async countHoje(
    @Query('unidade_id') unidade_id?: string,
    @Request() req?: any,
  ) {
    // 🔒 SEGURANÇA: Extrair unidade_id do usuário autenticado
    const unidadeIdDoUsuario = this.getUnidadeIdFromUser(req);

    // 🔒 VALIDAÇÃO: Usuário DEVE ter uma unidade associada
    if (!unidadeIdDoUsuario) {
      throw new UnauthorizedException(
        'Usuário não possui unidade associada. Por favor, contate o administrador.',
      );
    }

    // 🔒 SEGURANÇA: Ignorar qualquer unidade_id passada via query parameter
    const count = await this.aulaService.countHoje(unidadeIdDoUsuario);
    return { count, unidade_id: unidadeIdDoUsuario };
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
