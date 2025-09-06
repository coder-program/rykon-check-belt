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
import { NiveisPermissaoService } from '../services/niveis-permissao.service';
import { CreateNivelPermissaoDto } from '../dto/create-nivel-permissao.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('niveis-permissao')
@UseGuards(JwtAuthGuard)
export class NiveisPermissaoController {
  constructor(
    private readonly niveisPermissaoService: NiveisPermissaoService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('admin.all')
  create(@Body() createNivelPermissaoDto: CreateNivelPermissaoDto) {
    return this.niveisPermissaoService.create(createNivelPermissaoDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('permissoes.read', 'admin.all')
  findAll() {
    return this.niveisPermissaoService.findAll();
  }

  @Get('ativos')
  @UseGuards(PermissionsGuard)
  @Permissions('permissoes.read', 'admin.all')
  findAtivos() {
    return this.niveisPermissaoService.findAtivos();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('permissoes.read', 'admin.all')
  findOne(@Param('id') id: string) {
    return this.niveisPermissaoService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('admin.all')
  update(
    @Param('id') id: string,
    @Body() updateNivelPermissaoDto: Partial<CreateNivelPermissaoDto>,
  ) {
    return this.niveisPermissaoService.update(id, updateNivelPermissaoDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('admin.all')
  remove(@Param('id') id: string) {
    return this.niveisPermissaoService.remove(id);
  }
}
