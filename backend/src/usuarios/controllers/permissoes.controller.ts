import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PermissoesService } from '../services/permissoes.service';
import { CreatePermissaoDto } from '../dto/create-permissao.dto';

@Controller('permissoes')
export class PermissoesController {
  constructor(private readonly permissoesService: PermissoesService) {}

  @Post()
  create(@Body() createPermissaoDto: CreatePermissaoDto) {
    return this.permissoesService.create(createPermissaoDto);
  }

  @Post('seed')
  seedDefaultPermissions() {
    return this.permissoesService.seedDefaultPermissions();
  }

  @Get()
  findAll() {
    return this.permissoesService.findAll();
  }

  @Get('modulo/:modulo')
  findByModulo(@Param('modulo') modulo: string) {
    return this.permissoesService.findByModulo(modulo);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissoesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePermissaoDto: Partial<CreatePermissaoDto>) {
    return this.permissoesService.update(id, updatePermissaoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.permissoesService.remove(id);
  }
}
