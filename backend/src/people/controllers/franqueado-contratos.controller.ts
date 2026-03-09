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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FranqueadoContratosService } from '../services/franqueado-contratos.service';
import {
  CreateFranqueadoContratoDto,
  UpdateFranqueadoContratoDto,
  ListFranqueadoContratosDto,
} from '../dto/franqueado-contratos.dto';

@ApiTags('Franqueado Contratos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('franqueado-contratos')
export class FranqueadoContratosController {
  constructor(private readonly service: FranqueadoContratosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar contrato comercial de franqueado' })
  async create(@Body() dto: CreateFranqueadoContratoDto) {
    return await this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contratos (filtrar por franqueado_id, status_contrato, status_implantacao)' })
  async findAll(@Query() query: ListFranqueadoContratosDto) {
    return await this.service.findAll(query);
  }

  @Get('franqueado/:franqueadoId')
  @ApiOperation({ summary: 'Listar contratos de um franqueado' })
  async findByFranqueado(@Param('franqueadoId', ParseUUIDPipe) franqueadoId: string) {
    return await this.service.findByFranqueado(franqueadoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar contrato por ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar contrato (inclui módulos)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFranqueadoContratoDto,
  ) {
    return await this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Encerrar contrato' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.remove(id);
  }
}
