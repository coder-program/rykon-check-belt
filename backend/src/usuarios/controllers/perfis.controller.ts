import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PerfisService } from '../services/perfis.service';
import { CreatePerfilDto } from '../dto/create-perfil.dto';

@Controller('perfis')
export class PerfisController {
  constructor(private readonly perfisService: PerfisService) {}

  @Post()
  create(@Body() createPerfilDto: CreatePerfilDto) {
    return this.perfisService.create(createPerfilDto);
  }

  @Get()
  findAll() {
    return this.perfisService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.perfisService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePerfilDto: Partial<CreatePerfilDto>,
  ) {
    return this.perfisService.update(id, updatePerfilDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.perfisService.remove(id);
  }

  @Post(':id/permissoes/:permissaoId')
  addPermissao(
    @Param('id') id: string,
    @Param('permissaoId') permissaoId: string,
  ) {
    return this.perfisService.addPermissao(id, permissaoId);
  }

  @Delete(':id/permissoes/:permissaoId')
  removePermissao(
    @Param('id') id: string,
    @Param('permissaoId') permissaoId: string,
  ) {
    return this.perfisService.removePermissao(id, permissaoId);
  }
}
