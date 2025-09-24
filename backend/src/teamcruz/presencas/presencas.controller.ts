import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  UseGuards, 
  Req, 
  Param 
} from '@nestjs/common';
import { PresencasService } from './presencas.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { 
  CheckinDto, 
  CheckinManualDto, 
  CheckinQrCodeDto 
} from './dto/checkin.dto';

@UseGuards(JwtAuthGuard)
@Controller('teamcruz/presencas')
export class PresencasController {
  constructor(private readonly service: PresencasService) {}

  /**
   * RF-01: Registrar presença via tablet/app
   */
  @Post('checkin')
  async registrarPresenca(@Body() checkinDto: CheckinDto, @Req() req: any) {
    const enderecoIp = req.ip || req.connection?.remoteAddress;
    return this.service.registrarPresenca(checkinDto, enderecoIp);
  }

  /**
   * RF-02: Registrar presença manual para crianças
   */
  @Post('checkin/manual')
  async registrarPresencaManual(@Body() checkinManualDto: CheckinManualDto, @Req() req: any) {
    const enderecoIp = req.ip || req.connection?.remoteAddress;
    return this.service.registrarPresencaManual(checkinManualDto, enderecoIp);
  }

  /**
   * Registrar presença via QR Code
   */
  @Post('checkin/qrcode')
  async registrarPresencaQrCode(@Body() checkinQrDto: CheckinQrCodeDto, @Req() req: any) {
    const enderecoIp = req.ip || req.connection?.remoteAddress;
    return this.service.registrarPresencaQrCode(checkinQrDto, enderecoIp);
  }

  /**
   * RF-03: Obter progresso do aluno
   */
  @Get('progresso/:alunoId')
  async obterProgresso(@Param('alunoId') alunoId: string) {
    return this.service.calcularProgresso(alunoId);
  }

  /**
   * Buscar aluno por CPF ou telefone (para tablet)
   */
  @Get('buscar-aluno')
  async buscarAluno(@Query('cpfOuTelefone') cpfOuTelefone: string) {
    return this.service.buscarAlunoPorCpfOuTelefone(cpfOuTelefone);
  }

  /**
   * Gerar QR Code para unidade
   */
  @Post('qrcode/gerar/:unidadeId')
  async gerarQrCode(@Param('unidadeId') unidadeId: string) {
    return this.service.gerarQrCodeUnidade(unidadeId);
  }

  /**
   * Listar presenças
   */
  @Get()
  async listar(
    @Query('date') date?: string,
    @Query('unidadeId') unidadeId?: string
  ) {
    return this.service.listarPorData(date, unidadeId);
  }

  // Métodos legados (compatibilidade)
  @Get('../aulas/abertas')
  aulasAbertas() {
    return this.service.aulasAbertas();
  }

  @Post('../presencas/checkin')
  checkin(@Body() body: { alunoId: string }) {
    return this.service.checkin(body.alunoId);
  }
}
