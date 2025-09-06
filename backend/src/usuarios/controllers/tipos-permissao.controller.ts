import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TiposPermissaoService } from '../services/tipos-permissao.service';
import { CreateTipoPermissaoDto } from '../dto/create-tipo-permissao.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('tipos-permissao')
@UseGuards(JwtAuthGuard)
export class TiposPermissaoController {
  constructor(private readonly tiposPermissaoService: TiposPermissaoService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('admin.all')
  create(@Body() createTipoPermissaoDto: CreateTipoPermissaoDto) {
    return this.tiposPermissaoService.create(createTipoPermissaoDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('permissoes.read', 'admin.all')
  findAll() {
    return this.tiposPermissaoService.findAll();
  }

  @Get('ativos')
  @UseGuards(PermissionsGuard)
  @Permissions('permissoes.read', 'admin.all')
  findAtivos() {
    return this.tiposPermissaoService.findAtivos();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('permissoes.read', 'admin.all')
  findOne(@Param('id') id: string) {
    return this.tiposPermissaoService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('admin.all')
  update(
    @Param('id') id: string,
    @Body() updateTipoPermissaoDto: Partial<CreateTipoPermissaoDto>,
  ) {
    return this.tiposPermissaoService.update(id, updateTipoPermissaoDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('admin.all')
  remove(@Param('id') id: string) {
    return this.tiposPermissaoService.remove(id);
  }
}
