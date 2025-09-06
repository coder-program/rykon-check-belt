import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EnderecosService } from './enderecos.service';
import { FinalidadeEndereco, TipoDonoEndereco } from './enderecos.service';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateEnderecoDto,
  UpdateEnderecoDto,
  VincularEnderecoDto,
  DefinirPrincipalDto,
  ViaCepQueryDto,
} from './dtos';

@ApiTags('Endereços')
@Controller('enderecos')
export class EnderecosController {
  constructor(private readonly enderecosService: EnderecosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar endereço' })
  @ApiBody({ type: CreateEnderecoDto })
  async criar(@Body() dto: CreateEnderecoDto) {
    return this.enderecosService.criarEndereco(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter endereço por ID' })
  @ApiParam({ name: 'id', type: String })
  async obter(@Param('id') id: string) {
    return this.enderecosService.obterEndereco(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar endereço' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateEnderecoDto })
  async atualizar(@Param('id') id: string, @Body() dto: UpdateEnderecoDto) {
    return this.enderecosService.atualizarEndereco(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover endereço' })
  @ApiParam({ name: 'id', type: String })
  async remover(@Param('id') id: string) {
    return this.enderecosService.removerEndereco(id);
  }

  @Post(':id/vinculos')
  @ApiOperation({ summary: 'Vincular endereço a um dono (polimórfico)' })
  @ApiParam({ name: 'id', description: 'ID do endereço', type: String })
  @ApiBody({ type: VincularEnderecoDto })
  async vincular(
    @Param('id') endereco_id: string,
    @Body() body: VincularEnderecoDto,
  ) {
    return this.enderecosService.vincularEndereco({ endereco_id, ...body });
  }

  @Get('donos/:tipo_dono/:dono_id')
  @ApiOperation({ summary: 'Listar endereços por dono' })
  @ApiParam({
    name: 'tipo_dono',
    enum: ['ALUNO', 'PROFESSOR', 'UNIDADE', 'FRANQUEADO', 'FUNCIONARIO'],
  })
  @ApiParam({ name: 'dono_id', type: String })
  async listarPorDono(
    @Param('tipo_dono') tipo_dono: TipoDonoEndereco,
    @Param('dono_id') dono_id: string,
  ) {
    return this.enderecosService.listarPorDono(tipo_dono, dono_id);
  }

  @Post('donos/:tipo_dono/:dono_id/principal')
  @ApiOperation({ summary: 'Definir endereço principal por finalidade' })
  @ApiParam({
    name: 'tipo_dono',
    enum: ['ALUNO', 'PROFESSOR', 'UNIDADE', 'FRANQUEADO', 'FUNCIONARIO'],
  })
  @ApiParam({ name: 'dono_id', type: String })
  @ApiBody({ type: DefinirPrincipalDto })
  async definirPrincipal(
    @Param('tipo_dono') tipo_dono: TipoDonoEndereco,
    @Param('dono_id') dono_id: string,
    @Body() body: DefinirPrincipalDto,
  ) {
    return this.enderecosService.definirPrincipal(
      tipo_dono,
      dono_id,
      body.finalidade,
      body.endereco_id,
    );
  }

  @Get('viacep/buscar')
  @ApiOperation({ summary: 'Consultar CEP na ViaCEP' })
  @ApiQuery({ name: 'cep', type: String })
  async viacep(@Query() query: ViaCepQueryDto) {
    return this.enderecosService.viaCep(query.cep);
  }
}
