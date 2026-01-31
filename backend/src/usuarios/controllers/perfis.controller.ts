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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { PerfisService } from '../services/perfis.service';
import { CreatePerfilDto } from '../dto/create-perfil.dto';

@Controller('perfis')
@UseGuards(JwtAuthGuard)
export class PerfisController {
  constructor(private readonly perfisService: PerfisService) {}

  @Post()
  create(@Body() createPerfilDto: CreatePerfilDto) {
    return this.perfisService.create(createPerfilDto);
  }

  @Get()
  findAll() {
    // Retorna perfis SEM relations (otimizado para dropdowns)
    return this.perfisService.findAllSimple();
  }

  @Get('completo')
  findAllCompleto() {
    // Retorna perfis COM relations (apenas para admin de perfis)
    return this.perfisService.findAll();
  }

  @Get('publicos/registro')
  @Public() // Endpoint público para cadastro
  async findPublicos() {
    // Retorna apenas perfis públicos para cadastro (aluno e responsavel)
    // Query otimizada no service - apenas 2 registros sem relations
    return this.perfisService.findPublicos();
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
