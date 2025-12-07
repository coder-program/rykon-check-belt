import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AssinaturasService } from '../services/assinaturas.service';
import {
  CreateAssinaturaDto,
  UpdateAssinaturaDto,
  CancelarAssinaturaDto,
  AlterarPlanoDto,
} from '../dto/assinatura.dto';

@Controller('financeiro/assinaturas')
@UseGuards(JwtAuthGuard)
export class AssinaturasController {
  constructor(private readonly assinaturasService: AssinaturasService) {}

  @Post()
  create(@Body() createAssinaturaDto: CreateAssinaturaDto, @Request() req) {
    return this.assinaturasService.create(createAssinaturaDto, req.user);
  }

  @Get()
  async findAll(
    @Query('unidade_id') unidade_id?: string,
    @Query('status') status?: any,
    @Request() req?,
  ) {
    const assinaturas = await this.assinaturasService.findAll(
      unidade_id,
      status,
      req.user,
    );

    // Mapear para incluir campos derivados
    return assinaturas.map((assinatura) => ({
      ...assinatura,
      aluno_nome: assinatura.aluno?.nome_completo,
      plano_nome: assinatura.plano?.nome,
      valor_mensal: assinatura.valor,
    }));
  }

  @Get('aluno/:aluno_id')
  findByAluno(@Param('aluno_id') aluno_id: string) {
    return this.assinaturasService.findByAluno(aluno_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assinaturasService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssinaturaDto: UpdateAssinaturaDto,
  ) {
    return this.assinaturasService.update(id, updateAssinaturaDto);
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id') id: string,
    @Body() cancelarDto: CancelarAssinaturaDto,
    @Request() req,
  ) {
    return this.assinaturasService.cancelar(id, cancelarDto, req.user);
  }

  @Patch(':id/pausar')
  pausar(@Param('id') id: string) {
    return this.assinaturasService.pausar(id);
  }

  @Patch(':id/reativar')
  reativar(@Param('id') id: string) {
    return this.assinaturasService.reativar(id);
  }

  @Patch(':id/alterar-plano')
  alterarPlano(
    @Param('id') id: string,
    @Body() alterarPlanoDto: AlterarPlanoDto,
  ) {
    return this.assinaturasService.alterarPlano(id, alterarPlanoDto);
  }
}
