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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlanosService } from '../services/planos.service';
import { CreatePlanoDto, UpdatePlanoDto } from '../dto/plano.dto';

@Controller('financeiro/planos')
@UseGuards(JwtAuthGuard)
export class PlanosController {
  constructor(private readonly planosService: PlanosService) {}

  @Post()
  create(@Body() createPlanoDto: CreatePlanoDto, @Request() req) {
    return this.planosService.create(createPlanoDto);
  }

  @Get()
  async findAll(@Query('unidade_id') unidade_id?: string) {
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
