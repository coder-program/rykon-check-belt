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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { TimerService } from './timer.service';
import { CreateTimerDto } from './dto/create-timer.dto';

@ApiTags('⏱ Timer')
@Controller('timers')
export class TimerController {
  constructor(private readonly timerService: TimerService) {}

  // ──────────────── CRUD configs ────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar configuração de timer' })
  create(@Body() dto: CreateTimerDto) {
    return this.timerService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar configurações de timer' })
  @ApiQuery({ name: 'academiaId', required: false })
  findAll(@Query('academiaId') academiaId?: string) {
    return this.timerService.findAll(academiaId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar configuração de timer por ID' })
  findOne(@Param('id') id: string) {
    return this.timerService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar configuração de timer' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateTimerDto>) {
    return this.timerService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover configuração de timer' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.timerService.remove(id);
  }

  // ──────────────── State (público para TV) ────────────────

  @Get('public/:academyId/state')
  @Public()
  @ApiOperation({ summary: 'Estado atual do timer da academia (público)' })
  @ApiParam({ name: 'academyId', description: 'ID ou slug da academia' })
  getPublicState(@Param('academyId') academyId: string) {
    return this.timerService.getState(academyId) ?? { status: 'idle' };
  }

  // ──────────────── Controls ────────────────

  @Post(':academyId/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar timer' })
  @ApiParam({ name: 'academyId', description: 'ID da academia' })
  start(
    @Param('academyId') academyId: string,
    @Body() body: { configId: string },
  ) {
    return this.timerService.startTimer(body.configId, academyId);
  }

  @Post(':academyId/pause')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pausar timer' })
  @ApiParam({ name: 'academyId' })
  pause(@Param('academyId') academyId: string) {
    return this.timerService.pauseTimer(academyId);
  }

  @Post(':academyId/resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retomar timer pausado' })
  @ApiParam({ name: 'academyId' })
  resume(@Param('academyId') academyId: string) {
    return this.timerService.resumeTimer(academyId);
  }

  @Post(':academyId/reset')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resetar timer' })
  @ApiParam({ name: 'academyId' })
  reset(@Param('academyId') academyId: string) {
    return this.timerService.resetTimer(academyId);
  }
}
