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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DespesasService } from '../services/despesas.service';
import { AnexosService } from '../services/anexos.service';
import {
  CreateDespesaDto,
  UpdateDespesaDto,
  BaixarDespesaDto,
} from '../dto/despesa.dto';

@Controller('despesas')
@UseGuards(JwtAuthGuard)
export class DespesasController {
  constructor(
    private readonly despesasService: DespesasService,
    private readonly anexosService: AnexosService,
  ) {}

  @Post()
  create(@Body() createDespesaDto: CreateDespesaDto, @Request() req) {
    return this.despesasService.create(createDespesaDto, req.user);
  }

  @Get()
  findAll(
    @Query('unidade_id') unidade_id?: string,
    @Query('status') status?: any,
  ) {
    return this.despesasService.findAll(unidade_id, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.despesasService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDespesaDto: UpdateDespesaDto) {
    return this.despesasService.update(id, updateDespesaDto);
  }

  @Patch(':id/baixar')
  baixar(
    @Param('id') id: string,
    @Body() baixarDto: BaixarDespesaDto,
    @Request() req,
  ) {
    return this.despesasService.baixar(id, baixarDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.despesasService.remove(id);
  }

  @Get('resumo/pendentes')
  async resumoPendentes(@Query('unidade_id') unidade_id?: string) {
    const total = await this.despesasService.somarPendentes(unidade_id);
    return { total };
  }

  @Post(':id/anexar')
  @UseInterceptors(FileInterceptor('file'))
  async anexarComprovante(@Param('id') id: string, @UploadedFile() file: any) {
    return this.anexosService.anexarComprovanteDespesa(id, file);
  }

  @Delete(':id/anexo')
  async removerAnexo(@Param('id') id: string) {
    return this.anexosService.removerAnexoDespesa(id);
  }
}
